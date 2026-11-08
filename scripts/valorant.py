"""Valorant on the stream: where Luan's game is and each round's result, read from the Riot Client on this PC.

    python3 scripts/valorant.py           # the service (Windows starts it at login, like legenda.py)
    python3 scripts/valorant.py --ver     # prints what it reads, to try it with the game open

Every 2 s it asks the Riot Client's local API (the port and password in its lockfile, %LOCALAPPDATA%\\Riot Games\\
Riot Client\\Config\\lockfile, never printed) for Luan's own presence, the same one his friends list shows: whether he
is in the menus, in agent select or in a match, the map, the queue, the match's score and his rank. From the score's
changes it tells the stand (public/stream/torcida.html with ?jogo=valorant) each round won or lost, and the match's
end. When a match ends it asks Valorant's own match history (with the tokens the Riot Client hands out, kept in memory
only) for its summary: result, score, map, agent, Luan's kills, deaths, assists, combat score, shots by body part,
damage and first kills, the RR it won or lost and the rank after, and his teammates' numbers without their names
(but for the viewers in public/stream/aliados.json who agreed to be named, by their Riot ID). The "Partidas" dock
keeps those as the Valorant session and publishes it to content/valorant/, which the site reads. Nothing touches the
game itself; the Riot Client's local API and Valorant's are unofficial, so a patch can change them. The Riot Client
only answers most of this while Valorant is open.

    GET /eventos     server-sent events: {"tipo": "fase", "fase": "menu" | "selecao" | "partida", "mapa", "fila", "aberto"},
                     {"tipo": "rodada", "nosso", "placar"}, {"tipo": "partida", "vitoria", "placar"},
                     {"tipo": "ranque", "tier", "rr"} (Riot's competitive tier: 9 is Silver 1; the RR in it, or
                     null until known: the presence has no RR, so it comes from Valorant's competitive history when
                     the game opens and after each competitive match),
                     {"tipo": "resumo", "partida": {...}} (a match's summary, a little after it ends)
    GET /resumos     the summaries since it started, for a dock that opens late
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
import urllib.request
from datetime import datetime, timezone
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
# Valorant's servers by the account's region: Brazil and Latin America play on North America's.
SHARDS = {"br": "na", "latam": "na", "na": "na", "pbe": "pbe", "eu": "eu", "ap": "ap", "kr": "kr"}
ALIADOS = Path(__file__).resolve().parent.parent / "public" / "stream" / "aliados.json"
summaries: list[dict] = []

listeners: set[queue.Queue] = set()
listeners_lock = threading.Lock()
now = {"fase": None, "mapa": None, "fila": None, "placar": None, "tier": None, "rr": None, "aberto": False}


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


def rank_event():
    return {"tipo": "ranque", "tier": now["tier"], "rr": now["rr"]}


def set_rr(tier, rr):
    """The RR from Valorant's competitive history, for the tier it belongs to (the presence's may have moved on)."""
    if rr is None or tier != now["tier"]:
        return
    if rr != now["rr"]:
        now["rr"] = rr
        send(rank_event())


def fetch_rr():
    """Luan's RR now, from his last competitive update."""
    try:
        found = client()
        if not found:
            return
        puuid, get = valorant_api(found)
        updates = get(f"/mmr/v1/players/{puuid}/competitiveupdates?startIndex=0&endIndex=1&queue=competitive")["Matches"]
        if updates:
            set_rr(updates[0].get("TierAfterUpdate"), updates[0].get("RankedRatingAfterUpdate"))
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        print(time.strftime("%H:%M:%S"), "RR ainda não:", type(error).__name__, flush=True)


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
            open_ = True
        except (LookupError, OSError, ValueError, subprocess.SubprocessError):
            phase, queue_id, score, tier, open_ = "menu", None, None, now["tier"], False

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
            threading.Thread(target=summarize_latest, daemon=True).start()
        if phase != "partida":
            last_score = None

        map_name = ((match.get("matchMap") or "").rsplit("/", 1)[-1] or None) if phase != "menu" else None
        if phase != now["fase"] or open_ != now["aberto"]:
            send({"tipo": "fase", "fase": phase, "mapa": map_name, "fila": queue_id, "aberto": open_})
        opened = open_ and not now["aberto"]
        if tier and tier != now["tier"]:
            # A new tier's RR isn't the old one's: unknown until the match's summary (or the history) says.
            now.update(tier=tier, rr=None)
            send(rank_event())
        now.update(fase=phase, mapa=map_name, fila=queue_id, placar=score, tier=tier, aberto=open_)
        if opened:
            threading.Thread(target=fetch_rr, daemon=True).start()
        time.sleep(EVERY)


# --- A match's summary, from Valorant's match history -------------------------------------------------------------

_names: dict = {}


def names():
    """Maps' and agents' names by Riot's ids (valorant-api.com), fetched once."""
    if not _names:
        get = lambda path: json.load(urllib.request.urlopen(f"https://valorant-api.com/v1/{path}", timeout=15))["data"]
        _names["maps"] = {m["mapUrl"]: m["displayName"] for m in get("maps")}
        _names["agents"] = {a["uuid"].lower(): a["displayName"] for a in get("agents?isPlayableCharacter=true")}
        _names["version"] = get("version")["riotClientVersion"]
    return _names


def valorant_api(found):
    """GET on Valorant's own servers, as the game does, with the Riot Client's tokens (never kept or printed)."""
    tokens = ask(found, "/entitlements/v1/token")
    region = ask(found, "/riotclient/region-locale").get("region", "br").lower()
    platform = base64.b64encode(json.dumps({"platformType": "PC", "platformOS": "Windows",
                                            "platformOSVersion": "10.0.19042.1.256.64bit", "platformChipset": "Unknown"}).encode()).decode()
    headers = {"Authorization": f"Bearer {tokens['accessToken']}", "X-Riot-Entitlements-JWT": tokens["token"],
               "X-Riot-ClientVersion": names()["version"], "X-Riot-ClientPlatform": platform,
               # As the game identifies itself: Cloudflare, in front of these servers, turns away Python's own (1010).
               "User-Agent": "ShooterGame/13 Windows/10.0.19043.1.256.64bit"}
    host = f"https://pd.{SHARDS.get(region, 'na')}.a.pvp.net"

    def get(path):
        return json.load(urllib.request.urlopen(urllib.request.Request(host + path, headers=headers), timeout=15))
    return tokens["subject"], get


def allies():
    """Riot IDs ("name#tag", lowercase) of the viewers who agreed to be named → their Twitch login."""
    try:
        return {riot.lower(): a["login"] for a in json.loads(ALIADOS.read_text())["aliados"] for riot in a.get("riot", [])}
    except (OSError, ValueError, KeyError):
        return {}


def iso(millis):
    return datetime.fromtimestamp(millis / 1000, timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def summary(details, puuid, updates):
    """The match as the site keeps it: Luan's numbers, his teammates' without names, never the opponents'."""
    info = details["matchInfo"]
    me = next(p for p in details["players"] if p["subject"] == puuid)
    team = me["teamId"]
    teams = {t["teamId"]: t for t in details["teams"]}
    ours = teams.get(team, {}).get("roundsWon", 0)
    theirs = max((t["roundsWon"] for t in details["teams"] if t["teamId"] != team), default=0)
    shots = {"headshots": 0, "bodyshots": 0, "legshots": 0, "damage": 0}
    first_kills = 0
    for round_ in details.get("roundResults", []):
        for stats in round_.get("playerStats", []):
            if stats["subject"] == puuid:
                for hit in stats.get("damage", []):
                    for key in shots:
                        shots[key] += hit.get(key, 0)
        kills = [k for stats in round_.get("playerStats", []) for k in stats.get("kills", [])]
        if kills and min(kills, key=lambda k: k.get("roundTime", 0)).get("killer") == puuid:
            first_kills += 1
    stats = me["stats"]
    named = allies()
    mates = []
    for p in details["players"]:
        if p["teamId"] != team or p["subject"] == puuid:
            continue
        mate = {"agent": names()["agents"].get(p["characterId"].lower(), "?"), "kills": p["stats"]["kills"],
                "deaths": p["stats"]["deaths"], "assists": p["stats"]["assists"], "score": p["stats"]["score"]}
        login = named.get(f"{p.get('gameName', '')}#{p.get('tagLine', '')}".lower())
        if login:
            mate["login"] = login
        mates.append(mate)
    update = next((u for u in updates if u.get("MatchID") == info["matchId"]), None)
    result = "draw" if ours == theirs else "win" if ours > theirs else "loss"
    match = {
        "id": info["matchId"],
        "start": iso(info["gameStartMillis"]),
        "at": iso(info["gameStartMillis"] + info.get("gameLengthMillis", 0)),
        "queue": info.get("queueID", ""),
        "map": names()["maps"].get(info["mapId"], info["mapId"].rsplit("/", 1)[-1]),
        "agent": names()["agents"].get(me["characterId"].lower(), "?"),
        "result": result,
        "score": [ours, theirs],
        "rounds": stats.get("roundsPlayed", ours + theirs),
        "me": {"kills": stats["kills"], "deaths": stats["deaths"], "assists": stats["assists"], "score": stats["score"],
               **shots, "firstKills": first_kills},
        "mates": mates,
    }
    if update:
        match["rr"] = update.get("RankedRatingEarned")
        match["rank"] = {"tier": update.get("TierAfterUpdate"), "rr": update.get("RankedRatingAfterUpdate")}
    return match


def summarize_latest(tries=12, wait=15, newer_than_h=2):
    """The match that just ended, once Valorant's history has it (it takes a moment): told to the dock."""
    done = {s["id"] for s in summaries}
    for _ in range(tries):
        time.sleep(wait)
        try:
            found = client()
            if not found:
                continue
            puuid, get = valorant_api(found)
            history = get(f"/match-history/v1/history/{puuid}?startIndex=0&endIndex=1")["History"]
            if not history or history[0]["MatchID"] in done:
                continue
            # A match that started over 2 hours ago is an older one: the one that just ended isn't in the history yet.
            if time.time() * 1000 - history[0]["GameStartTime"] > newer_than_h * 3600 * 1000:
                continue
            details = get(f"/match-details/v1/matches/{history[0]['MatchID']}")
            updates = []
            if details["matchInfo"].get("queueID") == "competitive":
                updates = get(f"/mmr/v1/players/{puuid}/competitiveupdates?startIndex=0&endIndex=3&queue=competitive")["Matches"]
            match = summary(details, puuid, updates)
            summaries.append(match)
            del summaries[:-30]
            send({"tipo": "resumo", "partida": match}, show=False)
            if match.get("rank"):
                set_rr(match["rank"]["tier"], match["rank"]["rr"])
            print(time.strftime("%H:%M:%S"), "resumo", match["map"], match["agent"], match["result"],
                  "-".join(map(str, match["score"])), match.get("rr"), flush=True)
            return
        except (OSError, ValueError, KeyError, StopIteration, subprocess.SubprocessError) as error:
            print(time.strftime("%H:%M:%S"), "resumo ainda não:", type(error).__name__, flush=True)


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
        if self.path == "/resumos":
            self.headers_for(200, "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(summaries, ensure_ascii=False).encode())
            return
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
            event = {"tipo": "fase", "fase": now["fase"], "mapa": now["mapa"], "fila": now["fila"], "aberto": now["aberto"]}
            mine.put(f"data: {json.dumps(event)}\n\n".encode())
            if now["tier"]:
                mine.put(f"data: {json.dumps(rank_event())}\n\n".encode())
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
    parser.add_argument("--resumo", action="store_true", help="print the last match's summary (Valorant open) and stop")
    args = parser.parse_args()
    if args.resumo:
        summaries.clear()
        send_original = globals()["send"]
        globals()["send"] = lambda event, show=True: print(json.dumps(event["partida"], ensure_ascii=False, indent=2))
        summarize_latest(tries=1, wait=0, newer_than_h=24 * 365)
        globals()["send"] = send_original
        return
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
