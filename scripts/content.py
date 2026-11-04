"""The repository's content the scripts share: ranked sessions (content/matches/) and lives (content/lives/)."""

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MATCHES = ROOT / "content" / "matches"
LIVES = ROOT / "content" / "lives"


def sessions(date=""):
    """Published sessions, oldest first; with `date` (YYYY-MM-DD), only that day's."""
    return [json.loads(path.read_text()) for path in sorted(MATCHES.glob(f"{date}*.json"))
            if not path.name.endswith(".events.json")]


def matches_by_id():
    return {match["id"]: match for session in sessions() for match in session["matches"]}


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
