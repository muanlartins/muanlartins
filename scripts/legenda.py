"""Live captions: what Luan says, on the stream, a second or so after he says it, in his language or translated.

    python3 scripts/legenda.py                                  # the service (Windows starts it at login)
    python3 scripts/legenda.py --arquivo "<Live.mp4>" 47:50     # the same, from a recording's microphone track

It waits, doing nothing, until the stand (public/stream/torcida.html) asks for captions: the "Partidas" dock's
"Legendas ao vivo" switches them on there. Then it listens to the microphone (Windows' ffmpeg, the NVIDIA
Broadcast mic, already clean) and every half second sends what was said since the current line began to whisper.cpp on
the GPU (whisper-server, Windows side, the lives' model kept loaded), and the text to the stand. A line ends at a
pause or after 8 s; the next one starts from there. When the last stand lets go (captions off, OBS closed), it
stops listening and frees the GPU. Nothing is kept: no audio, no text.

The dock also says which language he's speaking and which the captions are in (`LANGUAGES`). The same: whisper
transcribes, as always. Different: whisper transcribes in the language he speaks, and each line, as it grows and once
it ends, goes to Gemma 4 E4B (Q4, told it's a gaming live) on llama-server (llama.cpp) on the GPU, Windows side,
started the first time a line needs it (~3 GB of VRAM, freed when the languages match again or captions stop). While
it loads, and if it fails, the stand gets the line untranslated. A line being said is translated once a second at
most, the latest first (one still waiting is dropped when a newer one comes); an ended line always is, at once.

    GET /legendas?fala=pt&em=en     the captions, as server-sent events: {"texto", "final"}; the newest stand's
                                    languages are the ones used (both default to pt)
    GET /                           says it's up

Setup of the translator, once: llama.cpp's Windows CUDA 12.4 build (github.com/ggml-org/llama.cpp releases,
llama-<build>-bin-win-cuda-12.4-x64.zip; b12259 on 2026-11-10) unzipped in %LOCALAPPDATA%\\Programs\\llama, with
whisper's cudart64_12, cublas64_12 and cublasLt64_12 DLLs copied beside it, and gemma-4-E4B-it-Q4_K_M.gguf from
huggingface.co/unsloth/gemma-4-E4B-it-GGUF in its models\\.

WSL reaches Windows' whisper-server and llama-server through curl.exe (it runs on Windows, so 127.0.0.1 is Windows' own), and
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
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from windows import PROGRAMS, to_windows  # noqa: E402

PORT = 8790
# By full path: started at login (bash -lc from Windows), WSL's PATH may lack Windows' folders.
CURL = "/mnt/c/Windows/System32/curl.exe"
TASKKILL = "/mnt/c/Windows/System32/taskkill.exe"
WHISPER_PORT = 8791
WHISPER_LOG = Path.home() / ".cache" / "muanlartins" / "whisper-server.log"  # the last start's output
WHISPER = PROGRAMS / "whisper"
TRANSLATOR_PORT = 8793
TRANSLATOR_LOG = Path.home() / ".cache" / "muanlartins" / "tradutor.log"  # the last start's output
LLAMA = PROGRAMS / "llama"  # llama.cpp's Windows CUDA 12.4 build, and the model in models\
# Measured on 40 lines of his lives (2026-11-10), each ~0.25–0.3 s on the 4070: TranslateGemma 4B embellished and lost
# the games' terms, Gemma 4 E2B went word for word ("não mandei mal" → "didn't send badly"), Qwen3 4B Instruct was
# close; Gemma 4 E4B (unsloth's Q4_K_M) got the slang ("I didn't play badly"; "Bora! Foi um flip reset limpo.").
TRANSLATOR_MODEL = LLAMA / "models" / "gemma-4-E4B-it-Q4_K_M.gguf"
# What he may speak and caption in: whisper's code → the name the translator's prompt gives it.
LANGUAGES = {"pt": "Brazilian Portuguese", "en": "English"}
FFMPEG = PROGRAMS / "ffmpeg" / "ffmpeg.exe"
MICROPHONE = "Microphone (NVIDIA Broadcast)"
RATE = 16000
STEP = 0.5  # seconds between transcriptions of the line so far
LONGEST = 8.0  # a line ends after this long even without a pause
PAUSE = 0.5  # this much quiet at the end of the line ends it…
SHORTEST = 1.0  # …once it's at least this long
QUIET = 500  # RMS of 16-bit samples: NVIDIA Broadcast leaves silence near 0
TRANSLATE_EVERY = 1.0  # seconds between translations of a line still being said (an ended line goes at once)
# The overlays are served by the site; Chrome asks before a public page reaches a local address.
ORIGINS = {"https://muanlartins.com.br", "https://muanlartins.com", "http://localhost:3000", "http://localhost:8130"}
# Whisper's inventions on near-silence (live.py's, and "Tchau, tchau." on a line's first breath), and its English ones.
INVENTED = re.compile(
    r"^(e aí\.?|obrigad[oa]\.?( por assistir.*)?|(tchau[,.!]? ?)+|legendas? .*|.*inscreva.*|.*amara\.org.*|\[.*\]|\(.*\)|\.+|♪.*"
    r"|you\.?|thank you\.?|thanks for watching.*|(bye[,.!]? ?)+|subtitles .*|.*subscribe.*)$",
    re.IGNORECASE)

listeners: set[queue.Queue] = set()
listeners_lock = threading.Lock()
wanted = threading.Event()  # someone wants captions
languages = ("pt", "pt")  # (spoken, captions), from the newest stand


def say(texto: str, final: bool, ms: int, original: str | None = None):
    event = f"data: {json.dumps({'texto': texto, 'final': final}, ensure_ascii=False)}\n\n".encode()
    with listeners_lock:
        for each in listeners:
            each.put(event)
    print(f"{'■' if final else '·'} {ms:4d} ms  {texto}" + (f"  ← {original}" if original else ""), flush=True)


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


def transcribe(pcm: bytes, language: str) -> str:
    result = subprocess.run(
        [CURL, "-s", "--max-time", "5", "-F", "file=@-;filename=linha.wav", "-F", "response_format=json",
         "-F", "temperature=0", "-F", f"language={language}", f"http://127.0.0.1:{WHISPER_PORT}/inference"],
        input=as_wav(pcm), capture_output=True, cwd="/mnt/c")
    try:
        text = " ".join(json.loads(result.stdout.decode("utf-8"))["text"].split())
    except (ValueError, KeyError):
        return ""
    return "" if INVENTED.match(text) else text


def start_whisper():
    # One left behind by a copy of this that died (Windows' children outlive WSL's processes) would hold the port.
    subprocess.run([TASKKILL, "/f", "/im", "whisper-server.exe"], capture_output=True, cwd="/mnt/c")
    with WHISPER_LOG.open("wb") as log:
        server = subprocess.Popen(
            [str(WHISPER / "whisper-server.exe"), "-m", to_windows(WHISPER / "models" / "ggml-large-v3-turbo-q5_0.bin"),
             "--host", "127.0.0.1", "--port", str(WHISPER_PORT), "-l", "pt", "-nt", "-sns", "-mc", "0"],
            stdout=log, stderr=subprocess.STDOUT, cwd="/mnt/c")
    wait_up(server, f"http://127.0.0.1:{WHISPER_PORT}/", WHISPER_LOG, "whisper-server")
    return server


def wait_up(server, url: str, log: Path, name: str):
    """Until the server answers 200 at that address; it loads its model first."""
    # The model loads in a few seconds, but much slower while OBS is starting up beside it (GPU and disk busy):
    # on 2026-11-09 opening OBS took whisper past 30 s.
    began = time.monotonic()
    while time.monotonic() - began < 120:
        up = subprocess.run([CURL, "-s", "-o", "NUL", "-w", "%{http_code}", url],
                            capture_output=True, text=True, cwd="/mnt/c").stdout
        if up == "200":
            print(f"{name} pronto em {time.monotonic() - began:.1f} s", flush=True)
            return
        if server.poll() is not None:
            raise RuntimeError(f"{name} saiu com código {server.returncode} (veja {log})")
        time.sleep(0.5)
    stop(server)
    raise RuntimeError(f"{name} não respondeu em 120 s (veja {log})")


TRANSLATION_PROMPT = (
    "You translate the live captions of muanlartins, a Brazilian streamer playing Rocket League or Valorant on "
    "Twitch, from {source} to {target}, for viewers who don't speak {source}. Each message is one line as speech "
    "recognition heard it: casual talk to the chat or to himself, often a fragment cut mid-sentence. Translate only "
    "what is there, as casually and briefly as he said it; a fragment stays a fragment: never complete, explain or "
    "comment. Translate the meaning, not word for word: slang and idioms become what a {target} speaker would say "
    "(in Rocket League, rodar is to rotate). Keep normal capitalization and punctuation. Keep names, and the games' "
    "terms as players say them in {target} (ranqueada = ranked; Platina, Diamante, Campeão = Platinum, Diamond, "
    "Champion; terms Brazilians say in English, like flip reset, double commit, whiff, boost, clutch, stay in "
    "English). Answer with the translation only.")


def start_translator():
    subprocess.run([TASKKILL, "/f", "/im", "llama-server.exe"], capture_output=True, cwd="/mnt/c")
    with TRANSLATOR_LOG.open("wb") as log:
        server = subprocess.Popen(
            [str(LLAMA / "llama-server.exe"), "-m", to_windows(TRANSLATOR_MODEL), "--host", "127.0.0.1",
             "--port", str(TRANSLATOR_PORT), "-ngl", "99", "-c", "2048", "-np", "1", "--no-webui"],
            stdout=log, stderr=subprocess.STDOUT, cwd="/mnt/c")
    wait_up(server, f"http://127.0.0.1:{TRANSLATOR_PORT}/health", TRANSLATOR_LOG, "tradutor")
    return server


def translate(text: str, source: str, target: str) -> str:
    system = TRANSLATION_PROMPT.format(source=LANGUAGES[source], target=LANGUAGES[target])
    # cache_prompt: the instructions are the same every time, so only the line itself is read anew.
    body = {"messages": [{"role": "system", "content": system}, {"role": "user", "content": text}],
            "max_tokens": 128, "temperature": 0, "cache_prompt": True,
            "chat_template_kwargs": {"enable_thinking": False}}
    result = subprocess.run(
        [CURL, "-s", "--max-time", "5", "-H", "content-type: application/json", "--data-binary", "@-",
         f"http://127.0.0.1:{TRANSLATOR_PORT}/v1/chat/completions"],
        input=json.dumps(body).encode(), capture_output=True, cwd="/mnt/c")
    said = json.loads(result.stdout.decode("utf-8"))["choices"][0]["message"]["content"]
    return " ".join(said.split()).strip('"“”')


class Translator(threading.Thread):
    """Lines in one language, said in another: owns llama-server, starting it when a line first needs it."""

    def __init__(self):
        super().__init__(daemon=True)
        self.lines = []  # (text, final, source, target, whisper's ms) waiting
        self.changed = threading.Condition()
        self.wanted = False
        self.ready = False
        self.last_partial = 0.0  # when a line being said was last let through, to halve the GPU's share
        self.start()

    def put(self, text, final, source, target, ms):
        with self.changed:
            self.wanted = True
            if not self.ready:  # loading, or it failed: the line as said, rather than nothing
                say(text, final, ms)
            elif final or time.monotonic() - self.last_partial >= TRANSLATE_EVERY:
                if not final:
                    self.last_partial = time.monotonic()
                # A line being said that's still waiting is outdated by this one.
                self.lines = [line for line in self.lines if line[1]] + [(text, final, source, target, ms)]
            self.changed.notify()

    def drop(self):
        with self.changed:
            self.wanted = False
            self.lines = []
            self.changed.notify()

    def run(self):
        server = None
        while True:
            with self.changed:
                self.changed.wait_for(lambda: self.lines or self.wanted != (server is not None))
                wanted, lines, self.lines = self.wanted, self.lines, []
            if not wanted:
                self.ready = False
                stop(server)
                server = None
                print("tradutor parado", flush=True)
                continue
            if server is None:
                try:
                    server = start_translator()
                    self.ready = True
                except Exception as error:
                    print(f"erro no tradutor: {error}", flush=True)
                    time.sleep(60)  # the lines go untranslated meanwhile
                continue
            for text, final, source, target, ms in lines:
                began = time.monotonic()
                try:
                    said = translate(text, source, target)
                except (ValueError, KeyError, IndexError):  # it died or timed out: start it again
                    print("tradutor não respondeu", flush=True)
                    self.ready = False
                    stop(server)
                    server = None
                    said = ""
                if said:
                    say(said, final, ms + round((time.monotonic() - began) * 1000), text)
                else:
                    say(text, final, ms)


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
    translator = Translator()
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
                spoken, shown = languages
                if spoken == shown:
                    translator.drop()  # frees its VRAM; a no-op when it isn't running
                began = time.monotonic()
                text = transcribe(line, spoken)
                ended = (seconds >= SHORTEST and rms(line[-int(PAUSE * RATE) * 2:]) < QUIET) or seconds >= LONGEST
                ms = round((time.monotonic() - began) * 1000)
                if text and spoken == shown:
                    say(text, ended, ms)
                elif text:
                    translator.put(text, ended, spoken, shown, ms)
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
            translator.drop()
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
        global languages
        url = urlsplit(self.path)
        if url.path != "/legendas":
            self.headers_for(200, "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return
        query = parse_qs(url.query)
        chosen = tuple(query.get(key, ["pt"])[0] for key in ("fala", "em"))
        if not all(code in LANGUAGES for code in chosen):
            self.headers_for(400)
            self.end_headers()
            return
        if chosen != languages:
            print(f"fala {chosen[0]}, legenda em {chosen[1]}", flush=True)
            languages = chosen
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
