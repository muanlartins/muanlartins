"""Valorant on the stream: where Luan's game is and each round's result, read from the Riot Client on this PC.

    python3 scripts/valorant.py           # the service (to start with Windows, like legenda.py)
    python3 scripts/valorant.py --ver     # prints what it reads, to try it with the game open

Every 2 s it asks the Riot Client's local API (the port and password in its lockfile, %LOCALAPPDATA%\\Riot Games\\
Riot Client\\Config\\lockfile, never printed) for Luan's own presence, the same one his friends list shows: whether he
is in the menus, in agent select or in a match, the map, the queue, the match's score and his rank. From the score's
changes it tells the stand (public/stream/torcida.html with ?jogo=valorant) each round won or lost, and the match's
end. It reads nothing about anyone else in the match: only what Luan's own presence already shows his friends.
Nothing touches the game itself; the Riot Client's local API is unofficial, so a patch can change it.

    GET /eventos     server-sent events: {"tipo": "fase", "fase": "menu" | "selecao" | "partida", "mapa", "fila"},
                     {"tipo": "rodada", "nosso", "placar"}, {"tipo": "partida", "vitoria", "placar"},
                     {"tipo": "ranque", "tier"} (Riot's competitive tier: 9 is Silver 1)
    GET /            what it knows now

WSL reaches the Riot Client through curl.exe (on Windows, 127.0.0.1 is the client's own), and Windows reaches this
server at 127.0.0.1 through WSL's port forwarding, as for the narrator and the captions.
"""

import argparse
import base64
import json
import queue
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from windows import home  # noqa: E402

PORT = 8792
CURL = "/mnt/c/Windows/System32/curl.exe"
LOCKFILE = home() / "AppData" / "Local" / "Riot Games" / "Riot Client" / "Config" / "lockfile"
EVERY = 2.0
ORIGINS = {"https://muanlartins.com.br", "https://muanlartins.com", "http://localhost:3000", "http://localhost:8130"}
# Queues whose score counts rounds; deathmatch and its kin count kills.
ROUNDS = {"competitive", "unrated", "swiftplay", "premier", "spikerush", "newmap", ""}
PHASES = {"MENUS": "menu", "PREGAME": "selecao", "INGAME": "partida"}

listeners: set[queue.Queue] = set()
listeners_lock = threading.Lock()
now = {"fase": None, "mapa": None, "fila": None, "placar": None, "tier": None}


def send(event: dict, show=True):
    data = f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode()
    with listeners_lock:
        for each in listeners:
            each.put(data)
    if show:
        print(time.strftime("%H:%M:%S"), json.dumps(event, ensure_ascii=False), flush=True)


def client():
    """The Riot Client's port and authorization, from its lockfile; None while it's closed."""
    try:
        _name, _pid, port, password, _protocol = LOCKFILE.read_text().split(":")
    except (OSError, ValueError):
        return None
    return port, "Basic " + base64.b64encode(f"riot:{password}".encode()).decode()


def ask(found, path):
    port, auth = found
    out = subprocess.run([CURL, "-sk", "--max-time", "4", "-H", f"Authorization: {auth}", f"https://127.0.0.1:{port}{path}"],
                         capture_output=True, text=True, timeout=8).stdout
    return json.loads(out)


def presence(found, puuid):
    """Luan's Valorant presence, decoded; None when he isn't in Valorant."""
    for each in ask(found, "/chat/v4/presences").get("presences", []):
        if each.get("puuid") == puuid and each.get("product") == "valorant" and each.get("private"):
            return json.loads(base64.b64decode(each["private"]))
    return None


def watch():
    puuid = None
    last_score = None  # (ours, theirs) during the match being played
    while True:
        match = {}
        try:
            found = client()
            if not found:
                puuid = None
                raise LookupError
            puuid = puuid or ask(found, "/chat/v1/session").get("puuid")
            private = presence(found, puuid)
            if not private:
                raise LookupError
            match = private.get("matchPresenceData", {})
            phase = PHASES.get(match.get("sessionLoopState"), "menu")
            queue_id = match.get("queueId", "")
            score = (private.get("partyOwnerMatchScoreAllyTeam", 0), private.get("partyOwnerMatchScoreEnemyTeam", 0))
            tier = private.get("playerPresenceData", {}).get("competitiveTier")
        except (LookupError, OSError, ValueError, subprocess.SubprocessError):
            phase, queue_id, score, tier = "menu", None, None, now["tier"]

        counts_rounds = queue_id in ROUNDS
        # As a match ends, the presence zeroes the score a few seconds before it leaves the match: a score that
        # goes down is that, and the last one stays the match's.
        if phase == "partida" and last_score and score and sum(score) < sum(last_score):
            score = last_score
        if phase == "partida" and counts_rounds and score:
            if last_score and score != last_score:
                # One event per round, in order, even if two went by between looks.
                ours, theirs = last_score
                while (ours, theirs) != score and ours <= score[0] and theirs <= score[1]:
                    nosso = ours < score[0]
                    ours, theirs = (ours + 1, theirs) if nosso else (ours, theirs + 1)
                    send({"tipo": "rodada", "nosso": nosso, "placar": f"{ours}–{theirs}"})
            last_score = score
        if now["fase"] == "partida" and phase != "partida" and last_score and last_score[0] != last_score[1]:
            ours, theirs = last_score
            send({"tipo": "partida", "vitoria": ours > theirs, "placar": f"{ours}–{theirs}"})
        if phase != "partida":
            last_score = None

        map_name = ((match.get("matchMap") or "").rsplit("/", 1)[-1] or None) if phase != "menu" else None
        if phase != now["fase"]:
            send({"tipo": "fase", "fase": phase, "mapa": map_name, "fila": queue_id})
        if tier and tier != now["tier"]:
            send({"tipo": "ranque", "tier": tier})
        now.update(fase=phase, mapa=map_name, fila=queue_id, placar=score, tier=tier)
        time.sleep(EVERY)


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
        if self.path != "/eventos":
            self.headers_for(200, "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(now).encode())
            return
        self.headers_for(200, "text/event-stream")
        self.send_header("cache-control", "no-store")
        self.end_headers()
        mine = queue.Queue()
        # A stand that opens mid-match learns where the game is at once.
        if now["fase"]:
            mine.put(f"data: {json.dumps({'tipo': 'fase', 'fase': now['fase'], 'mapa': now['mapa'], 'fila': now['fila']})}\n\n".encode())
        with listeners_lock:
            listeners.add(mine)
        try:
            while True:
                try:
                    self.wfile.write(mine.get(timeout=15))
                except queue.Empty:
                    self.wfile.write(b": ainda aqui\n\n")
                self.wfile.flush()
        except OSError:
            pass
        finally:
            with listeners_lock:
                listeners.discard(mine)

    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ver", action="store_true", help="only print what it reads, without serving")
    args = parser.parse_args()
    if args.ver:
        watch()
        return
    # Taking the port first: a second copy (started again at login) stops here.
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Request)
    server.daemon_threads = True
    threading.Thread(target=watch, daemon=True).start()
    print(f"Valorant em http://127.0.0.1:{PORT}/eventos", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
