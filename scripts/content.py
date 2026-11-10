"""The repository's content the scripts share: ranked sessions (content/matches/ for Rocket League,
content/valorant/ for Valorant) and lives (content/lives/)."""

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MATCHES = ROOT / "content" / "matches"
LIVES = ROOT / "content" / "lives"
# Each game's sessions, by its id in content/projects.ts.
SESSIONS = {"rocket-league": MATCHES, "valorant": ROOT / "content" / "valorant"}


def sessions(date="", game="rocket-league"):
    """A game's published sessions, oldest first; with `date` (YYYY-MM-DD), only that day's."""
    return [json.loads(path.read_text()) for path in sorted(SESSIONS[game].glob(f"{date}*.json"))
            if not path.name.endswith(".events.json")]


def matches_by_id():
    """Every game's matches by id (Rocket League's from the dock, Valorant's are Riot's ids)."""
    return {match["id"]: match for game in SESSIONS for session in sessions(game=game) for match in session["matches"]}


def seconds(at: str) -> int:
    """"1:02:22" → 3742."""
    total = 0
    for part in at.split(":"):
        total = total * 60 + int(part)
    return total


def clock(total: float) -> str:
    """3742 → "1:02:22", 125 → "2:05"."""
    h, rest = divmod(int(total), 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def brand_tables():
    """RANKS and LIVES from brand/build.py, read without running it: titles say what the thumbnails show."""
    tables = {}
    for node in ast.parse((ROOT / "brand" / "build.py").read_text()).body:
        if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "") in ("RANKS", "LIVES"):
            tables[node.targets[0].id] = ast.literal_eval(node.value)
    return tables["RANKS"], tables["LIVES"]
