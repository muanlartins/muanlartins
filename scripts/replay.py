"""The VAR's clips for the pages: serves the replays OBS saves in Videos to var.html and the Efeitos dock, which play
them in a <video> (speed, slow motion, seeking, the mini player), on 127.0.0.1:8794.

    python3 scripts/replay.py           # the service (Windows starts it at login, like valorant.py)
    python3 scripts/replay.py --ver     # lists today's clips and stops
    python3 scripts/replay.py --pasta <folder>   # serves another folder's clips (a test)

Two kinds of clip land in Videos while OBS runs (the dock saves both on each F8):
- "Replay 2026-11-12 22-10-05 jogo.mkv": the game alone, from the Source Record replay buffer on the game capture's
  "Gravar jogo" filter (brand/twitch/obs.py turns it on), with the game's sound only. This is the one the VAR plays.
- "Replay 2026-11-12 22-10-05.mp4": OBS's own Replay Buffer, the stream as it went out (overlays, camera, chat). Only
  when the game's isn't there (the game wasn't on screen since OBS opened); its third audio track (the game alone)
  is the one kept.
Each clip is remuxed to MP4 (the streams copied, about a second) into ~/.cache/muanlartins/replays, in one of 12
slots that new clips overwrite in turn: the cache stays at a dozen clips and nothing is ever deleted.

    GET /replays                       today's clips, newest first: [{"nome", "fonte": "jogo" | "live", "fim" (epoch ms,
                                       when it was saved), "tamanho"}]
    GET /novo?desde=<epoch ms>         waits (up to ?espera= s, default 6) for a clip saved after `desde` and ready to
                                       play, the game's first: {"nome", "fonte", "fim", "duracao" (s), "url"}; 404 if none
    GET /pronto?nome=<file>            the same for a clip already in the list (the dock reopening one)
    GET /video/<file>.mp4              the clip, with byte ranges (a <video> seeks with them)

Windows reaches it at 127.0.0.1 through WSL's port forwarding, as for valorant.py, the narrator and the captions.
It never deletes anything: videos.py files the clips in Videos after the live.
"""

import argparse
import json
import re
import subprocess
import sys
import threading
import time
import urllib.parse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from windows import VIDEOS  # noqa: E402

PORT = 8794
ORIGINS = {"https://muanlartins.com.br", "https://muanlartins.com", "http://localhost:3000", "http://localhost:8130",
           "http://localhost:8126", "http://127.0.0.1:8139", "http://localhost:8139"}
CACHE = Path.home() / ".cache" / "muanlartins" / "replays"
SLOTS = 12
INDEX = CACHE / "indice.json"
CLIP = re.compile(r"^Replay (\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})( jogo)?\.(mp4|mkv)$")
FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"
remuxing = threading.Lock()


def clips(day=None):
    """Today's clips (or `day`'s), newest first."""
    day = day or datetime.now().strftime("%Y-%m-%d")
    found = []
    for path in VIDEOS.glob(f"Replay {day} *"):
        match = CLIP.match(path.name)
        if not match:
            continue
        stat = path.stat()
        found.append({"nome": path.name, "fonte": "jogo" if match[5] else "live", "fim": int(stat.st_mtime * 1000),
                      "tamanho": stat.st_size})
    return sorted(found, key=lambda c: c["fim"], reverse=True)


def settled(path, quiet=0.4):
    """Whether OBS has finished writing the file: its size holds for `quiet` seconds."""
    try:
        size = path.stat().st_size
        time.sleep(quiet)
        return size > 0 and path.stat().st_size == size
    except OSError:
        return False


def playable(name):
    """The clip as an MP4 a <video> plays, in its cache slot: the next slot is overwritten when a new clip comes."""
    source = VIDEOS / name
    if source.suffix == ".mp4" and not name.endswith(" jogo.mp4"):
        # OBS's own buffer: the stream's four tracks; the game alone (the third) is the one kept, so Luan's voice, Discord
        # and any music stay out of the replay.
        audio = ["-map", "0:a:2?"]
    else:
        audio = ["-map", "0:a:0?"]
    with remuxing:
        CACHE.mkdir(parents=True, exist_ok=True)
        try:
            index = json.loads(INDEX.read_text())
        except (OSError, ValueError):
            index = {"proximo": 0, "clips": {}}
        mtime = source.stat().st_mtime
        known = index["clips"].get(name)
        if known and known["mtime"] == mtime and (CACHE / known["arquivo"]).exists():
            return CACHE / known["arquivo"]
        slot = index["proximo"] % SLOTS
        index["proximo"] = slot + 1
        target = CACHE / f"vaga-{slot:02d}.mp4"
        index["clips"] = {k: v for k, v in index["clips"].items() if v["arquivo"] != target.name}
        partial = CACHE / f"vaga-{slot:02d}.parcial.mp4"
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(source), "-map", "0:v:0", *audio, "-c", "copy",
                        "-movflags", "+faststart", str(partial)], check=True, timeout=60)
        partial.replace(target)
        index["clips"][name] = {"arquivo": target.name, "mtime": mtime}
        INDEX.write_text(json.dumps(index, ensure_ascii=False))
    return target


def duration(path):
    out = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, timeout=15).stdout.strip()
    return round(float(out), 3) if out else None


def ready(clip):
    path = playable(clip["nome"])
    # The clip's name in the URL too: a slot holds another clip later, and the pages reload when the URL changes.
    return {**clip, "duracao": duration(path),
            "url": f"http://127.0.0.1:{PORT}/video/{path.name}?de={urllib.parse.quote(clip['nome'])}"}


def newest_after(since, wait):
    """The first clip saved after `since` (epoch ms) that OBS finished writing: the game's if it comes within the wait,
    else the stream's."""
    deadline = time.time() + wait
    fallback = None
    while time.time() < deadline:
        fresh = [c for c in clips() if c["fim"] >= since - 1000]
        game = next((c for c in fresh if c["fonte"] == "jogo"), None)
        if game and settled(VIDEOS / game["nome"]):
            return ready(game)
        fallback = next((c for c in fresh if c["fonte"] == "live"), None) or fallback
        # The stream's buffer is there and the game's isn't coming (Source Record answers within a second or two).
        if fallback and not game and time.time() > deadline - wait / 2 and settled(VIDEOS / fallback["nome"]):
            return ready(fallback)
        time.sleep(0.15)
    if fallback and settled(VIDEOS / fallback["nome"]):
        return ready(fallback)
    return None


class Request(BaseHTTPRequestHandler):
    def headers_for(self, code, kind=None, length=None):
        self.send_response(code)
        origin = self.headers.get("origin")
        if origin in ORIGINS:
            self.send_header("access-control-allow-origin", origin)
            self.send_header("access-control-allow-private-network", "true")
            self.send_header("access-control-expose-headers", "content-range, content-length")
        if kind:
            self.send_header("content-type", kind)
        if length is not None:
            self.send_header("content-length", str(length))

    def json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.headers_for(code, "application/json", len(body))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.headers_for(204)
        self.send_header("access-control-allow-methods", "GET")
        self.send_header("access-control-allow-headers", "range")
        self.end_headers()

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(url.query)
        try:
            if url.path == "/replays":
                return self.json(clips())
            if url.path == "/novo":
                since = int(query.get("desde", ["0"])[0])
                clip = newest_after(since, min(15.0, float(query.get("espera", ["6"])[0])))
                return self.json(clip) if clip else self.json({"erro": "nenhum replay novo"}, 404)
            if url.path == "/pronto":
                name = query.get("nome", [""])[0]
                clip = next((c for c in clips(name[7:17]) if c["nome"] == name), None)
                return self.json(ready(clip)) if clip else self.json({"erro": "não achei"}, 404)
            if url.path.startswith("/video/"):
                return self.video(urllib.parse.unquote(url.path[len("/video/"):]))
            return self.json({"replays": f"http://127.0.0.1:{PORT}/replays"})
        except (OSError, subprocess.SubprocessError, ValueError) as error:
            print(time.strftime("%H:%M:%S"), "erro", self.path, type(error).__name__, error, flush=True)
            return self.json({"erro": type(error).__name__}, 500)

    def video(self, name):
        path = CACHE / name
        if not re.fullmatch(r"vaga-\d{2}\.mp4", name) or not path.is_file():
            return self.json({"erro": "não achei"}, 404)
        size = path.stat().st_size
        start, end = 0, size - 1
        wanted = re.match(r"bytes=(\d*)-(\d*)$", self.headers.get("range", ""))
        if wanted and (wanted[1] or wanted[2]):
            if wanted[1]:
                start, end = int(wanted[1]), min(int(wanted[2]) if wanted[2] else size - 1, size - 1)
            else:
                start = max(0, size - int(wanted[2]))
            self.headers_for(206, "video/mp4", end - start + 1)
            self.send_header("content-range", f"bytes {start}-{end}/{size}")
        else:
            self.headers_for(200, "video/mp4", size)
        self.send_header("accept-ranges", "bytes")
        self.send_header("cache-control", "no-store")
        self.end_headers()
        with path.open("rb") as file:
            file.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = file.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except OSError:
                pass  # the <video> closed the connection (a seek): normal

    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ver", action="store_true", help="list today's clips and stop")
    parser.add_argument("--pasta", type=Path, help="serve this folder's clips instead of Videos (a test)")
    args = parser.parse_args()
    if args.pasta:
        global VIDEOS
        VIDEOS = args.pasta
    if args.ver:
        for clip in clips():
            print(datetime.fromtimestamp(clip["fim"] / 1000).strftime("%H:%M:%S"), clip["fonte"], clip["nome"])
        return
    # Taking the port first: a second copy (started again at login) stops here.
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Request)
    server.daemon_threads = True
    print(f"Replays em http://127.0.0.1:{PORT}/replays", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
