"""Rocket League on and off the stream: every ranked match, with the points the game shows, without typing anything.

    uv run --no-project -q --with rapidocr-onnxruntime python3 scripts/rocket_league.py          # the service
    uv run --no-project -q --with rapidocr-onnxruntime python3 scripts/rocket_league.py --placar Partida.png …
    uv run --no-project -q --with rapidocr-onnxruntime python3 scripts/rocket_league.py --ver    # no publishing

Windows starts the service at login ("Rocket League muanlartins.vbs" in Startup; log ~/.cache/muanlartins/
rocket-league.log), like valorant.py. Rocket League's Stats API (PacketSendRate above 0 in TAGame\\Config\\
DefaultStatsAPI.ini) listens on Windows' own loopback, which WSL can't reach, so scripts/statsapi.ps1 relays it through
powershell.exe: its TCP port (49123), JSON messages back to back, while the Partidas dock keeps the WebSocket (49124),
so neither takes the other's place. From it this follows each match as the Partidas dock does (partidas.html: the roster, the player
found by whom the camera follows, the playlists, a ranked match left early counted as a loss).

The points: the game doesn't send them, but its end-of-match scoreboard shows each player's total and what it moved
("+9 1033" left of the name) and the rank under it ("Diamante III", "Divisão II"). When a ranked match ends,
scripts/tela.ps1 (kept open, so a capture costs no PowerShell start) takes those two parts of the screen (PNG on
stdout, never written to disk) as fast as they're read while the scoreboard is up, and RapidOCR (PaddleOCR's models,
local, on the CPU) reads them. Only Luan's own total, gain, rank and division are kept; the other players' names and
numbers live in memory for that second and nowhere else. The total is what counts: one reading that moves the last
total in that mode (kept here from every match, live or not) the way the result says is enough; otherwise two
readings must agree, and one over 60 points away is left out rather than guessed. The points are the difference to
the last total when it's near the gain read (the OCR takes 9 for 6), else the gain read with the result's sign (a win
always gains, and the minus often doesn't read). The scoreboard is up for about a minute ("Saindo em 60") and Luan
often queues again sooner: a match whose scoreboard wasn't read gets its points from the next one's (its total minus
the gain), and the dock is told then.

On the stream the Partidas dock keeps the session as it always did and fills each match's points from here (server-
sent events on 127.0.0.1:8795), so nothing is typed. Off the stream (OBS not streaming, asked through scripts/obs.mjs)
the ranked matches go into a session of its own, published to content/matches/ like the dock's (with no outputs, so
the site shows no "na live" link) when the game has been closed for two minutes or 45 minutes after the last match.
State in ~/.cache/muanlartins/rocket-league.json (the last rank in each mode, the session not yet published).

    GET /eventos   server-sent events: {"tipo": "pontos", "partida": <the match's guid>, "modo": "2v2", "mmr": 1033,
                   "pontos": 9 (or null), "tier": "diamond-3", "divisao": 2}
"""
import argparse
import base64
import json
import os
import queue
import re
import subprocess
import sys
import threading
import time
import unicodedata
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo

os.environ.setdefault("OMP_NUM_THREADS", "2")  # the OCR stays light while the game runs

sys.path.insert(0, str(Path(__file__).resolve().parent))
import publicar  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
# By its full path: started by Windows at login, WSL's PATH has no Windows folders.
POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
PORT = 8795
STATE = Path.home() / ".cache" / "muanlartins" / "rocket-league.json"
ALIADOS = ROOT / "public" / "stream" / "aliados.json"
TZ = ZoneInfo("America/Sao_Paulo")
ORIGINS = {"https://muanlartins.com.br", "https://muanlartins.com", "http://localhost:3000", "http://localhost:8130"}
# Rocket League's playlist ids, as the dock has them; the ranked ones count.
PLAYLISTS = {1: "Casual 1v1", 2: "Casual 2v2", 3: "Casual 3v3", 4: "Casual 4v4", 6: "Partida privada", 10: "1v1",
             11: "2v2", 13: "3v3", 61: "4v4", 27: "Hoops", 28: "Rumble", 29: "Dropshot", 30: "Snow Day", 34: "Torneio",
             63: "Heatseeker"}
RANKED = {10, 11, 13, 61, 27, 28, 29, 30}
# The scoreboard's left half (each player's gain and total beside their name) and the rank under it, as fractions of
# the screen (Rocket League fills it, 16:9).
REGIONS = [(0.156, 0.139, 0.417, 0.56), (0.40, 0.79, 0.28, 0.1)]
TIERS = [("SEM CLASSIFIC", "unranked"), ("GRANDE CAMPEAO", "grand-champion"), ("LENDA SUPERSONICA", "supersonic-legend"), ("CAMPEAO", "champion"),
         ("DIAMANTE", "diamond"), ("PLATINA", "platinum"), ("OURO", "gold"), ("PRATA", "silver"), ("BRONZE", "bronze")]
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4}
SCOREBOARD_AFTER = 6  # seconds from the match's end to the first capture (the scoreboard comes ~10 s after the end)
SCOREBOARD_FOR = 60  # it leaves by itself a minute after it shows
TOO_FAR = 60  # points from the last total: a misreading
GAIN_MAX = 25  # more than one match ever moves (a difference past it spans a match not read)
IDLE_PUBLISH = 45 * 60
CLOSED_PUBLISH = 120

listeners: set[queue.Queue] = set()
listeners_lock = threading.Lock()
state_lock = threading.RLock()
_ocr = None
DEBUG: Path | None = None  # --depurar: each capture saved there, for checking the reading (never on the service)


def log(*parts):
    print(time.strftime("%H:%M:%S"), *parts, flush=True)


def send(event: dict):
    data = f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode()
    with listeners_lock:
        for each in listeners:
            each.put(data)


def load_state() -> dict:
    try:
        return json.loads(STATE.read_text())
    except (OSError, ValueError):
        return {"ranks": {}, "me": None, "sessao": None}


def save_state(state: dict):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=1))
    tmp.replace(STATE)


def iso(t: float | None = None) -> str:
    return datetime.fromtimestamp(t if t is not None else time.time(), timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def session_id(t: float) -> str:
    return datetime.fromtimestamp(t, TZ).strftime("%Y-%m-%d-%H%M")


def allies() -> dict:
    """In-game names (lowercase) of the viewers who agreed to be named → their Twitch login."""
    try:
        return {name.lower(): a["login"] for a in json.loads(ALIADOS.read_text())["aliados"] for name in a.get("jogo", [])}
    except (OSError, ValueError, KeyError):
        return {}


# --- Reading the scoreboard ---------------------------------------------------------------------------------------

def ocr():
    global _ocr
    if _ocr is None:
        from rapidocr_onnxruntime import RapidOCR
        _ocr = RapidOCR()
    return _ocr


_screen = None
_screen_lock = threading.Lock()


def capture() -> list:
    """The REGIONS of the screen as images (numpy, BGR), from tela.ps1, started once and kept open."""
    global _screen
    import select
    import cv2
    import numpy as np
    with _screen_lock:
        if _screen is None or _screen.poll() is not None:
            script = (Path(__file__).resolve().parent / "tela.ps1").read_text(encoding="utf-8")
            regions = ";".join(",".join(f"{v:.4f}" for v in r) for r in REGIONS)
            script = script.replace("param([string]$regioes)", f"$regioes = '{regions}'")
            command = base64.b64encode(script.encode("utf-16-le")).decode()
            _screen = subprocess.Popen([POWERSHELL, "-NoProfile", "-NonInteractive", "-EncodedCommand", command],
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, cwd="/mnt/c")
        try:
            _screen.stdin.write(b"\n")
            _screen.stdin.flush()
            ready = select.select([_screen.stdout], [], [], 20)[0]
            line = _screen.stdout.readline() if ready else b""
        except OSError:
            line = b""
        if not line.strip():
            _screen.kill()
            _screen = None
            raise OSError("tela.ps1 não respondeu")
    parts = line.decode("ascii", "ignore").strip().split(",")
    return [cv2.imdecode(np.frombuffer(base64.b64decode(part), np.uint8), cv2.IMREAD_COLOR) for part in parts]


def plain(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().upper()


def read_points(board, name: str) -> dict | None:
    """Luan's gain and total from the scoreboard's left half: the text on his row, left of his name. The gain is in a
    small, dim font: when it reads 6 or 9 (the OCR takes one for the other) or doesn't read, the board is read again at
    twice the size, which gets those right and is worse at the rest."""
    first = row_points(board, name)
    if first and first["ganho"] in (None, 6, 9):
        import cv2
        again = row_points(cv2.resize(board, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC), name)
        if again and again["mmr"] == first["mmr"] and again["ganho"] is not None:
            return again
    return first


def row_points(board, name: str) -> dict | None:
    found = ocr()(board)[0] or []
    target = name.lower()
    mine = [b for b in found if target in b[1].lower()]
    if not mine:
        return None
    box = max(mine, key=lambda b: b[0][0][0])[0]
    top, bottom, left = min(p[1] for p in box), max(p[1] for p in box), min(p[0] for p in box)
    middle, height = (top + bottom) / 2, bottom - top
    row = sorted((b for b in found if b[0][1][0] < left and abs((b[0][0][1] + b[0][2][1]) / 2 - middle) < height * 0.8),
                 key=lambda b: b[0][0][0])
    found = split_points(" ".join(b[1] for b in row))
    return {"mmr": found[1], "ganho": found[0]} if found else None


def split_points(text: str) -> tuple[int | None, int] | None:
    """(gain, total) from the text left of his name: "+10 1067", or the two run together as the OCR often reads them
    ("+101067", "+13642"): the total is the last four digits when they make one, else the last three."""
    groups = re.findall(r"\d+", text)
    total_ok = lambda g: not g.startswith("0") and 100 <= int(g) <= 3000  # noqa: E731
    gain_ok = lambda g: 1 <= len(g) <= 2 and 0 < int(g) <= 40  # noqa: E731
    for i, g in enumerate(groups):
        if 3 <= len(g) <= 4 and total_ok(g):
            gains = [x for x in groups[:i] if gain_ok(x)]
            return (int(gains[-1]) if gains else None, int(g))
        if 4 <= len(g) <= 6:
            for n in (4, 3):
                if total_ok(g[-n:]) and gain_ok(g[:-n]):
                    return (int(g[:-n]), int(g[-n:]))
    return None


def read_rank(strip) -> dict:
    """The rank under the scoreboard: "DIAMANTE III" and "DIVISÃO II" (not "DIVISÃO PARA CIMA"). The OCR's model reads
    Chinese too and sometimes takes III for 三: those are put back. A tier whose number didn't read comes as its family
    alone ("familia": "diamond"), never a guessed number."""
    found = " ".join(b[1] for b in (ocr()(strip)[0] or []))
    text = plain(found.translate(str.maketrans({"三": "III", "川": "III", "Ⅲ": "III", "二": "II", "ニ": "II", "Ⅱ": "II",
                                               "一": "I", "|": "I", "l": "I"})))
    # A 1 next to an I is one too ("DIVISAO1I").
    text = re.sub(r"(?<=[I\s])1|1(?=I)", "I", text)
    out = {}
    for words, tier in TIERS:
        m = re.search(words.replace(" ", r"\s*") + r"\w*(?:\s*(III|II|I)(?![A-Z]))?", text) if tier == "unranked" else \
            re.search(words.replace(" ", r"\s*") + r"(?:\s*(III|II|I)(?![A-Z]))?", text)
        if m:
            if tier in ("supersonic-legend", "unranked"):
                # No divisions (the placement matches show "Sem classificação · 5 de 10 partidas jogadas").
                out.update(tier=tier, divisao=1)
            elif m.group(1):
                out["tier"] = f"{tier}-{ROMAN[m.group(1)]}"
            else:
                out["familia"] = tier
            break
    m = re.search(r"DIVIS(?:AO|A|O)?\s*(IV|III|II|I)(?![A-Z])", text)
    if m and "divisao" not in out:
        out["divisao"] = ROMAN[m.group(1)]
    return out


def fits(total: int, result: str | None, before: int | None) -> bool:
    """Whether a total moves the last one in its mode the way the match's result says, and not too far."""
    if before is None or result is None:
        return False
    diff = total - before
    return 0 < abs(diff) <= TOO_FAR and (diff > 0) == (result == "win")


def read_scoreboard(name: str, frames=None, result: str | None = None, before: int | None = None) -> dict | None:
    """Reads the scoreboard until a reading fits the last total, or two agree, or it's gone: {mmr, ganho, tier,
    divisao, leituras}."""
    readings = []
    deadline = time.time() + SCOREBOARD_AFTER + SCOREBOARD_FOR
    if frames is None:
        time.sleep(SCOREBOARD_AFTER)
    while frames or (frames is None and time.time() < deadline):
        try:
            board, strip = frames.pop(0) if frames else capture()
            points = read_points(board, name)
            if DEBUG:
                import cv2
                n = len(list(DEBUG.glob("placar-*.png")))
                cv2.imwrite(str(DEBUG / f"placar-{n:02d}.png"), board)
                cv2.imwrite(str(DEBUG / f"ranque-{n:02d}.png"), strip)
                log("leitura", n, points, read_rank(strip))
        except (OSError, ValueError, subprocess.SubprocessError, IndexError) as error:
            log("leitura do placar falhou:", type(error).__name__)
            points = None
            strip = None
        if points:
            readings.append({**points, **(read_rank(strip) if strip is not None else {})})
            same = [r for r in readings if r["mmr"] == points["mmr"]]
            if len(same) >= 2 or fits(points["mmr"], result, before):
                gains = [r["ganho"] for r in same if r["ganho"] is not None]
                rank = next((r for r in reversed(same) if r.get("tier")), None) or next((r for r in reversed(same) if r.get("familia")), {})
                division = next((r["divisao"] for r in reversed(same) if r.get("divisao")), None)
                # Readings that saw both a 6 and a 9 don't know which: the gain is left to the totals.
                gain = None if not gains or {6, 9} <= set(gains) else max(set(gains), key=gains.count)
                return {"mmr": points["mmr"], "ganho": gain,
                        "tier": rank.get("tier"), "familia": rank.get("familia"), "divisao": division,
                        "leituras": max(len(same), 2 if fits(points["mmr"], result, before) else 1)}
        if frames is None:
            time.sleep(0.5)
    if readings:
        last = readings[-1]
        return {**last, "leituras": 1}
    return None


FAMILIES = ["bronze", "silver", "gold", "platinum", "diamond", "champion", "grand-champion", "supersonic-legend"]


def ladder(tier: str | None) -> int | None:
    """A tier's place on the ladder (bronze-1 is 0), or None for unranked and the unknown."""
    if not tier or tier == "unranked":
        return None
    if tier == "supersonic-legend":
        return FAMILIES.index(tier) * 3
    family, _, n = tier.rpartition("-")
    return FAMILIES.index(family) * 3 + int(n) - 1 if family in FAMILIES and n.isdigit() else None


def tier_after(got: dict, old: str | None, result: str | None = None) -> str:
    """The tier after a match: the one read, or, when only its family read, the known one if it's the same family, else
    where a single match lands (one tier at a time: up into the family's I, down into its III). A tier read more than
    one away, or against the result (down after a win, up after a loss), is a misreading (11-20: DIAMANTE III read as
    II after a win): only its family counts."""
    tier = got.get("tier")
    if tier and result and ladder(tier) is not None and ladder(old) is not None:
        step = ladder(tier) - ladder(old)
        if abs(step) > 1 or (step < 0 and result == "win") or (step > 0 and result == "loss"):
            got = {"familia": tier.rpartition("-")[0]}
            tier = None
    if tier:
        return tier
    family = got.get("familia")
    if not family or not old or old == "unranked":
        return old or "unranked"
    old_family = old.rsplit("-", 1)[0] if old != "supersonic-legend" else old
    if family == old_family:
        return old
    return f"{family}-1" if FAMILIES.index(family) > FAMILIES.index(old_family) else f"{family}-3"


def settle(reading: dict | None, result: str, before: int | None) -> dict:
    """The match's points and total from a reading and the last total in its mode, or nothing when it doesn't add up."""
    if not reading:
        return {}
    total, gain = reading["mmr"], reading.get("ganho")
    sign = 1 if result == "win" else -1
    diff = total - before if before is not None else None
    plausible = diff is not None and abs(diff) <= TOO_FAR and (diff > 0 if result == "win" else diff < 0)
    # One reading alone has to agree with what came before; two that agree stand on their own.
    if reading.get("leituras", 1) < 2 and not plausible:
        return {}
    if before is not None and abs(diff) > TOO_FAR and reading.get("leituras", 1) < 2:
        return {}
    if gain is not None and plausible and abs(abs(diff) - gain) <= 3:
        points = diff  # the totals agree with the gain read, give or take the OCR's 9 for 6
    elif gain is not None and gain not in (6, 9):
        points = sign * gain  # the last total may be from before a match not read
    elif gain is None and plausible and abs(diff) <= GAIN_MAX:
        points = diff
    else:
        points = None  # a 6 or a 9 that the totals can't confirm: no number rather than a wrong one
    return {"points": points, "mmr": total, "tier": reading.get("tier"), "familia": reading.get("familia"),
            "division": reading.get("divisao")}


# --- Following the game -------------------------------------------------------------------------------------------

class Game:
    def __init__(self, publish=True):
        self.state = load_state()
        self.state.setdefault("ranks", {})
        self.publish_on = publish
        self.match = None
        self.finished: set[str] = set()
        self.closed_at: float | None = None
        self.unread: dict[str, dict | None] = {}  # each mode's last match, while its points are unknown

    def player_key(self, p):
        return p.get("PrimaryId") or p.get("Name")

    def me(self):
        m = self.match
        known = self.state.get("me") and next((p for p in m["players"] if self.player_key(p) == self.state["me"]["key"]), None)
        if known:
            return known
        if not m["votes"]:
            return None
        key = max(m["votes"], key=m["votes"].get)
        voted = next((p for p in m["players"] if self.player_key(p) == key), None)
        if voted:
            with state_lock:
                self.state["me"] = {"key": key, "name": voted.get("Name")}
                save_state(self.state)
        return voted

    def on_message(self, message):
        if isinstance(message, str):
            try:
                message = json.loads(message)
            except ValueError:
                return
        event = message.get("Event")
        data = message.get("Data") or {}
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except ValueError:
                data = {}
        guid = data.get("MatchGuid")
        if guid and guid in self.finished:
            return
        if guid and (not self.match or self.match["guid"] != guid):
            self.match = {"guid": guid, "votes": {}, "players": [], "roster": {}, "teams": [], "started": False,
                          "start": None, "playlist": None, "overtime": False}
        m = self.match
        if event == "UpdateState" and m:
            game = data.get("Game") or {}
            if isinstance(data.get("Players"), list):
                m["players"] = data["Players"]
                for p in data["Players"]:
                    m["roster"][self.player_key(p)] = p
            if isinstance(game.get("Teams"), list):
                m["teams"] = game["Teams"]
            if int(game.get("PlaylistId") or 0) > 0:
                m["playlist"] = int(game["PlaylistId"])
            m["overtime"] = bool(game.get("bOvertime"))
            target = game.get("bHasTarget") and not game.get("bReplay") and game.get("Target")
            if target:
                seen = next((p for p in m["players"] if p.get("Name") == target.get("Name") and p.get("TeamNum") == target.get("TeamNum")), None)
                if seen:
                    k = self.player_key(seen)
                    m["votes"][k] = m["votes"].get(k, 0) + 1
        elif event in ("RoundStarted", "CountdownBegin") and m:
            m["started"] = True
            m["start"] = m["start"] or time.time()
        elif event == "MatchEnded" and m:
            self.finish(data.get("WinnerTeamNum"))
        elif event == "MatchDestroyed" and m:
            if m["started"] and m["playlist"] in RANKED:
                self.finish(None)
            self.match = None

    def finish(self, winner):
        m = self.match
        me = self.me()
        if not me or m["playlist"] not in RANKED:
            return
        team = me.get("TeamNum")
        everyone = list(m["roster"].values())
        size = max([sum(1 for p in everyone if p.get("TeamNum") == n) for n in (0, 1)] + [0])
        mode = PLAYLISTS.get(m["playlist"]) or f"{size}v{size}"
        left = winner not in (0, 1)
        if not left:
            self.finished.add(m["guid"])
        goals = lambda n: next((t.get("Score", 0) for t in m["teams"] if t.get("TeamNum") == n), 0)  # noqa: E731
        stats = lambda p: {"score": p.get("Score"), "goals": p.get("Goals"), "assists": p.get("Assists"),  # noqa: E731
                           "saves": p.get("Saves"), "shots": p.get("Shots"), "touches": p.get("Touches"), "demos": p.get("Demos")}
        named = allies()
        mates = []
        for p in everyone:
            if p.get("TeamNum") == team and self.player_key(p) != self.player_key(me):
                login = named.get(str(p.get("Name", "")).lower())
                mates.append({**stats(p), "login": login} if login else stats(p))
        with state_lock:
            if mode not in self.state["ranks"]:
                self.refresh_ranks()
            before = self.state["ranks"].get(mode)
        entry = {
            "id": m["guid"],
            "start": iso(m["start"]) if m["start"] else None,
            "at": iso(),
            "mode": mode,
            "playlist": m["playlist"],
            "ranked": True,
            "result": "win" if not left and winner == team else "loss",
            "left": left,
            "score": [goals(team), goals(1 - team)],
            "overtime": m["overtime"],
            "me": stats(me),
            "mates": mates,
            "rank": dict(before) if before else None,
        }
        live = publicar.ao_vivo()
        log("partida", mode, entry["result"], "-".join(map(str, entry["score"])), "(na live)" if live else "(fora da live)")
        threading.Thread(target=self.settle_points, args=(entry, me.get("Name") or "", live), daemon=True).start()

    def settle_points(self, entry: dict, name: str, live: bool):
        mode = entry["mode"]
        before = (entry["rank"] or {}).get("mmr")
        # A match left early shows no scoreboard.
        got = {} if entry["left"] else settle(read_scoreboard(name, result=entry["result"], before=before), entry["result"], before)
        entry["points"], entry["mmr"] = got.get("points"), got.get("mmr")
        log("pontos", mode, got.get("points"), got.get("mmr"), got.get("tier") or "", got.get("division") or "")
        # A match left early (no scoreboard) still moved the total: the next one tells by how much.
        missed, self.unread[mode] = self.unread.get(mode), None if got.get("mmr") is not None else entry
        with state_lock:
            session = self.state.get("sessao")
            if not live and not session:
                # The ranks as they were before this match: its own mode's from before it.
                start = {**self.state["ranks"], **({mode: entry["rank"]} if entry["rank"] else {})}
                session = self.state["sessao"] = {"id": session_id(time.time()), "start": entry["start"] or entry["at"],
                                                  "startRanks": start, "matches": [], "ranks": []}
            if got.get("mmr") is not None and got.get("points") is not None and missed:
                self.fill_missed(missed, got["mmr"] - got["points"], live)
            if got.get("mmr") is not None:
                old = self.state["ranks"].get(mode) or {}
                rank = {"tier": tier_after(got, old.get("tier"), entry["result"]),
                        "division": got.get("division") or old.get("division") or 1, "mmr": got["mmr"]}
                self.state["ranks"][mode] = rank
                send({"tipo": "pontos", "partida": entry["id"], "modo": mode, "mmr": rank["mmr"], "pontos": got.get("points"),
                      "tier": rank["tier"], "divisao": rank["division"]})
            if not live:
                session["matches"].append(entry)
                if got.get("mmr") is not None:
                    session["ranks"].append({"at": iso(), "mode": mode, **self.state["ranks"][mode]})
            save_state(self.state)

    def fill_missed(self, entry: dict, total: int, live: bool):
        """A match whose scoreboard wasn't read, from the next one's: its total is the next one's before that match's
        gain. Only when it moves the total before it the way its result says."""
        before = (entry["rank"] or {}).get("mmr")
        if not fits(total, entry["result"], before):
            return
        entry["points"], entry["mmr"] = total - before, total
        log("pontos (pela seguinte)", entry["mode"], entry["points"], total)
        old = self.state["ranks"].get(entry["mode"]) or {}
        send({"tipo": "pontos", "partida": entry["id"], "modo": entry["mode"], "mmr": total, "pontos": entry["points"],
              "tier": old.get("tier"), "divisao": old.get("division")})
        if not live and self.state.get("sessao"):
            for m in self.state["sessao"]["matches"]:
                if m["id"] == entry["id"]:
                    m["points"], m["mmr"] = entry["points"], total

    def refresh_ranks(self):
        """The last rank in each mode from the latest published session, for the modes this hasn't seen yet."""
        try:
            names = sorted(n for n in publicar.listar("content/matches") if n.endswith(".json") and not n.endswith(".events.json"))
            latest = json.loads(publicar.ler(f"content/matches/{names[-1]}") or "{}") if names else {}
        except (OSError, ValueError) as error:
            log("sem a última sessão:", error)
            return
        found = dict(latest.get("startRanks") or {})
        for r in latest.get("ranks") or []:
            found[r["mode"]] = {"tier": r.get("tier"), "division": r.get("division"), "mmr": r.get("mmr")}
        for mode, rank in found.items():
            self.state["ranks"].setdefault(mode, rank)

    def publish(self, why: str):
        with state_lock:
            session = self.state.get("sessao")
            if not session or not session["matches"]:
                self.state["sessao"] = None
                save_state(self.state)
                return
            body = {"id": session["id"], "start": session["start"], "end": session["matches"][-1]["at"],
                    "startRanks": session["startRanks"], "outputs": [], "matches": session["matches"], "ranks": session["ranks"]}
        if not self.publish_on:
            log("publicaria", body["id"], len(body["matches"]), "partidas (--ver)")
            return
        try:
            publicar.por(f"content/matches/{body['id']}.json", body, f"Record the ranked session of {body['id'][:10]} (off stream)")
        except OSError as error:
            log("não deu para publicar:", error)
            return
        log("publicada", body["id"], len(body["matches"]), "partidas,", why)
        with state_lock:
            if self.state.get("sessao") and self.state["sessao"]["id"] == body["id"]:
                self.state["sessao"] = None
            save_state(self.state)

    def tick(self):
        """Publishes the session once the game has been closed a while, or long after its last match."""
        session = self.state.get("sessao")
        if not session or not session["matches"]:
            return
        last = datetime.fromisoformat(session["matches"][-1]["at"].replace("Z", "+00:00")).timestamp()
        if self.closed_at and time.time() - self.closed_at > CLOSED_PUBLISH:
            self.publish("o jogo fechou")
        elif time.time() - last > IDLE_PUBLISH:
            self.publish("45 minutos sem partida")


def split_messages(buffer: str):
    """The complete JSON messages and markers at the start of `buffer`, and what's left of it (a message still
    arriving). The game's TCP port sends its messages back to back, with nothing between them."""
    decoder = json.JSONDecoder()
    found = []
    i = 0
    while True:
        while i < len(buffer) and buffer[i] in " \t\r\n\ufeff":
            i += 1
        if i >= len(buffer):
            return found, ""
        if buffer[i] == "#":
            end = buffer.find("\n", i)
            if end < 0:
                return found, buffer[i:]
            found.append(buffer[i:end].strip())
            i = end + 1
        elif buffer[i] == "{":
            try:
                message, end = decoder.raw_decode(buffer, i)
            except ValueError:
                # Most likely still arriving: wait for the rest. Past a megabyte it's broken: skip to the next one.
                if len(buffer) - i < 1_000_000:
                    return found, buffer[i:]
                nxt = buffer.find("{", i + 1)
                if nxt < 0:
                    return found, ""
                i = nxt
                continue
            found.append(message)
            i = end
        else:
            nxt = buffer.find("{", i)
            if nxt < 0:
                return found, ""
            i = nxt


def relay(game: Game, show=False):
    """statsapi.ps1 through powershell.exe, restarted if it ever stops."""
    import codecs
    script = (Path(__file__).resolve().parent / "statsapi.ps1").read_text(encoding="utf-8")
    command = base64.b64encode(script.encode("utf-16-le")).decode()
    while True:
        proc = subprocess.Popen([POWERSHELL, "-NoProfile", "-NonInteractive", "-EncodedCommand", command],
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, cwd="/mnt/c")
        decode = codecs.getincrementaldecoder("utf-8")("replace")
        buffer = ""
        while chunk := proc.stdout.read1(65536):
            messages, buffer = split_messages(buffer + decode.decode(chunk))
            for message in messages:
                if message == "#aberto":
                    game.closed_at = None
                    log("Rocket League aberto")
                elif message == "#fechado":
                    game.closed_at = time.time()
                    game.match = None
                    buffer = ""
                    log("Rocket League fechado")
                elif isinstance(message, dict):
                    if show:
                        log("evento", message.get("Event"))
                    try:
                        game.on_message(message)
                    except Exception as error:  # one bad message never stops the service
                        log("mensagem não lida:", type(error).__name__, error)
        proc.wait()
        log("o repasse da Stats API parou; de novo em 5 s")
        time.sleep(5)


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
            self.headers_for(404)
            self.end_headers()
            return
        self.headers_for(200, "text/event-stream")
        self.send_header("cache-control", "no-store")
        self.end_headers()
        mine = queue.Queue()
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
    parser.add_argument("--placar", nargs="+", metavar="PNG", help="read the points off saved full-screen pictures and stop")
    parser.add_argument("--nome", default="muanlartins", help="the in-game name to look for (--placar)")
    parser.add_argument("--ver", action="store_true", help="print the game's messages, and don't publish")
    parser.add_argument("--depurar", metavar="PASTA", help="save each scoreboard capture there and log each reading")
    args = parser.parse_args()
    global DEBUG
    if args.depurar:
        DEBUG = Path(args.depurar)
        DEBUG.mkdir(parents=True, exist_ok=True)
    if args.placar:
        import cv2
        for path in args.placar:
            image = cv2.imread(path)
            h, w = image.shape[:2]
            parts = [image[int(y * h):int((y + hh) * h), int(x * w):int((x + ww) * w)] for x, y, ww, hh in REGIONS]
            points = read_points(parts[0], args.nome)
            print(Path(path).name, points, read_rank(parts[1]))
        return
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Request)  # a second copy stops here
    server.daemon_threads = True
    game = Game(publish=not args.ver)
    ocr()

    def warm():
        try:
            capture()  # tela.ps1 started now, so the first scoreboard doesn't wait for PowerShell
        except Exception as error:
            log("tela.ps1:", type(error).__name__, error)

    threading.Thread(target=warm, daemon=True).start()
    threading.Thread(target=relay, args=(game, args.ver), daemon=True).start()

    def ticking():
        while True:
            time.sleep(60)
            try:
                game.tick()
            except Exception as error:
                log("tick:", type(error).__name__, error)

    threading.Thread(target=ticking, daemon=True).start()
    log(f"Rocket League em http://127.0.0.1:{PORT}/eventos")
    server.serve_forever()


if __name__ == "__main__":
    main()
