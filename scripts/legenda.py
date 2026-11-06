"""Live captions: what Luan says, on the stream, a second or so after he says it.

    python3 scripts/legenda.py                                  # the service (Windows starts it at login)
    python3 scripts/legenda.py --arquivo "<Live.mp4>" 47:50     # the same, from a recording's microphone track

It waits, doing nothing, until the stand (public/stream/torcida.html) asks for captions: the "Partidas" dock's
"Legendas ao vivo" switches them on there. Then it listens to the microphone (Windows' ffmpeg, the NVIDIA
Broadcast mic, already clean) and every half second sends what was said since the current line began to whisper.cpp on
the GPU (whisper-server, Windows side, the lives' model kept loaded), and the text to the stand. A line ends at a
pause or after 8 s; the next one starts from there. When the last stand lets go (captions off, OBS closed), it
stops listening and frees the GPU. Nothing is kept: no audio, no text.

    GET /legendas     the captions, as server-sent events: {"texto", "final"}
    GET /             says it's up

WSL reaches Windows' whisper-server through curl.exe (it runs on Windows, so 127.0.0.1 is Windows' own), and
Windows reaches this server at 127.0.0.1 through WSL's port forwarding, as for the narrator: no firewall rule.
"""

import argparse
import io
import json
import queue
import re
import subprocess
import sys
import threading
import time
import wave
from array import array
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from windows import PROGRAMS, to_windows  # noqa: E402

PORT = 8790
# By full path: started at login (bash -lc from Windows), WSL's PATH may lack Windows' folders.
CURL = "/mnt/c/Windows/System32/curl.exe"
TASKKILL = "/mnt/c/Windows/System32/taskkill.exe"
WHISPER_PORT = 8791
WHISPER = PROGRAMS / "whisper"
FFMPEG = PROGRAMS / "ffmpeg" / "ffmpeg.exe"
MICROPHONE = "Microphone (NVIDIA Broadcast)"
RATE = 16000
STEP = 0.5  # seconds between transcriptions of the line so far
LONGEST = 8.0  # a line ends after this long even without a pause
PAUSE = 0.5  # this much quiet at the end of the line ends it…
SHORTEST = 1.0  # …once it's at least this long
QUIET = 500  # RMS of 16-bit samples: NVIDIA Broadcast leaves silence near 0
# The overlays are served by the site; Chrome asks before a public page reaches a local address.
ORIGINS = {"https://muanlartins.com.br", "https://muanlartins.com", "http://localhost:3000", "http://localhost:8130"}
# Whisper's inventions on near-silence (live.py's, and "Tchau, tchau." on a line's first breath).
INVENTED = re.compile(
    r"^(e aí\.?|obrigad[oa]\.?( por assistir.*)?|(tchau[,.!]? ?)+|legendas? .*|.*inscreva.*|.*amara\.org.*|\[.*\]|\(.*\)|\.+|♪.*)$",
    re.IGNORECASE)

listeners: set[queue.Queue] = set()
listeners_lock = threading.Lock()
wanted = threading.Event()  # someone wants captions


def say(texto: str, final: bool, ms: int):
    event = f"data: {json.dumps({'texto': texto, 'final': final}, ensure_ascii=False)}\n\n".encode()
    with listeners_lock:
        for each in listeners:
            each.put(event)
    print(f"{'■' if final else '·'} {ms:4d} ms  {texto}", flush=True)


def rms(pcm: bytes) -> float:
    samples = array("h", pcm[: len(pcm) // 2 * 2])
    return (sum(s * s for s in samples) / max(1, len(samples))) ** 0.5


def as_wav(pcm: bytes) -> bytes:
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm)
    return out.getvalue()


def transcribe(pcm: bytes) -> str:
    result = subprocess.run(
        [CURL, "-s", "--max-time", "5", "-F", "file=@-;filename=linha.wav", "-F", "response_format=json",
         "-F", "temperature=0", f"http://127.0.0.1:{WHISPER_PORT}/inference"],
        input=as_wav(pcm), capture_output=True, cwd="/mnt/c")
    try:
        text = " ".join(json.loads(result.stdout.decode("utf-8"))["text"].split())
    except (ValueError, KeyError):
        return ""
    return "" if INVENTED.match(text) else text


def start_whisper():
    # One left behind by a copy of this that died (Windows' children outlive WSL's processes) would hold the port.
    subprocess.run([TASKKILL, "/f", "/im", "whisper-server.exe"], capture_output=True, cwd="/mnt/c")
    server = subprocess.Popen(
        [str(WHISPER / "whisper-server.exe"), "-m", to_windows(WHISPER / "models" / "ggml-large-v3-turbo-q5_0.bin"),
         "--host", "127.0.0.1", "--port", str(WHISPER_PORT), "-l", "pt", "-nt", "-sns", "-mc", "0"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd="/mnt/c")
    for _ in range(60):  # the model loads in a few seconds
        up = subprocess.run([CURL, "-s", "-o", "NUL", "-w", "%{http_code}", f"http://127.0.0.1:{WHISPER_PORT}/"],
                            capture_output=True, text=True, cwd="/mnt/c").stdout
        if up == "200":
            return server
        if server.poll() is not None:
            break
        time.sleep(0.5)
    stop(server)
    raise RuntimeError("whisper-server didn't start")


def listen(test):
    """ffmpeg reading the microphone (or a recording's, in real time) as 16 kHz mono PCM on stdout."""
    if test:
        source = ["-re", "-ss", test[1], "-i", to_windows(Path(test[0])), "-map", "0:a:1"]
    else:
        source = ["-f", "dshow", "-audio_buffer_size", "50", "-i", f"audio={MICROPHONE}"]
    return subprocess.Popen([str(FFMPEG), "-hide_banner", "-loglevel", "error", *source, "-ac", "1", "-ar", str(RATE),
                             "-f", "s16le", "-"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, cwd="/mnt/c")


def stop(process):
    if process and process.poll() is None:
        process.kill()
        process.wait()


def caption(test):
    """While someone wants captions: listen, transcribe the line so far every second, end lines at pauses."""
    while True:
        wanted.wait()
        whisper = microphone = None
        try:
            whisper = start_whisper()
            microphone = listen(test)
            heard = bytearray()
            reader = threading.Thread(target=lambda: [heard.extend(chunk) for chunk in iter(lambda: microphone.stdout.read(3200), b"")],
                                      daemon=True)
            reader.start()
            print("ouvindo", flush=True)
            line_start = 0
            while wanted.is_set() and reader.is_alive():
                time.sleep(STEP)
                line = bytes(heard[line_start:])
                seconds = len(line) / 2 / RATE
                if seconds < 0.5:
                    continue
                if rms(line) < QUIET:  # nothing said: the line starts over from here
                    line_start += len(line)
                    continue
                began = time.monotonic()
                text = transcribe(line)
                ended = (seconds >= SHORTEST and rms(line[-int(PAUSE * RATE) * 2:]) < QUIET) or seconds >= LONGEST
                if text:
                    say(text, ended, round((time.monotonic() - began) * 1000))
                if ended or not text:
                    line_start += len(line)
            if test and not reader.is_alive():
                wanted.clear()
        except Exception as error:  # captions failing mustn't take anything else down
            print(f"erro: {error}", flush=True)
            time.sleep(5)
        finally:
            stop(microphone)
            stop(whisper)
            print("parado", flush=True)


class Request(BaseHTTPRequestHandler):
    def headers_for(self, code, kind=None):
        self.send_response(code)
        origin = self.headers.get("origin")
        if origin in ORIGINS:
            self.send_header("access-control-allow-origin", origin)
            self.send_header("access-control-allow-private-network", "true")
        if kind:
            self.send_header("content-type", kind)

    def do_OPTIONS(self):
        self.headers_for(204)
        self.end_headers()

    def do_GET(self):
        if self.path != "/legendas":
            self.headers_for(200, "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return
        self.headers_for(200, "text/event-stream")
        self.send_header("cache-control", "no-store")
        self.end_headers()
        mine = queue.Queue()
        with listeners_lock:
            listeners.add(mine)
            wanted.set()
        try:
            while True:
                try:
                    self.wfile.write(mine.get(timeout=15))
                except queue.Empty:
                    self.wfile.write(b": ainda aqui\n\n")  # also how a closed stand is noticed
                self.wfile.flush()
        except OSError:
            pass
        finally:
            with listeners_lock:
                listeners.discard(mine)
                if not listeners:
                    wanted.clear()

    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--arquivo", nargs=2, metavar=("VIDEO", "INICIO"), help="a recording's microphone track instead")
    args = parser.parse_args()
    # Taking the port first: a second copy (started again at login) stops here.
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Request)
    server.daemon_threads = True
    threading.Thread(target=caption, args=(args.arquivo,), daemon=True).start()
    print(f"Legendas em http://127.0.0.1:{PORT}/legendas", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
