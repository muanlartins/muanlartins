"""Luan's aim training with Voltaic, from Aimlabs' own records on the stream PC, into content/voltaic/<date>.json:
every task he played each day (the daily routine and the Sunday benchmark alike), with its score.

    python3 scripts/voltaic.py            # what it would write
    python3 scripts/voltaic.py --apply    # write it

Aimlabs keeps each play in a SQLite file in AppData\\LocalLow\\Statespace\\aimlab_tb\\Users\\<id>\\LocalDB\\Klutch.bytes
(TaskData: the task's id, score, start and end, and its stats as JSON), and each play's replay header beside it
(Replay\\<play>.json) with the task's name, which the database lacks. The file is copied before reading, as Aimlabs
may hold it open.

A day's file keeps what it had: plays are added, never removed, so a reinstalled Aimlabs (an empty database) or a
replay Aimlabs cleaned up loses nothing already published. A play is known by when it started. Nothing about other
players, and no Steam or Aimlabs ids: the task, its score, the accuracy and how long it took.

The site (lib/voltaic.ts) finds the benchmarks among the plays by their task ids (content/voltaic-s3.json) and turns
their scores into Voltaic's ranks and energy; this script only copies.
"""

import argparse
import json
import shutil
import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from windows import home

TIME_ZONE = ZoneInfo("America/Sao_Paulo")
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "voltaic"
BENCHMARK = ROOT / "content" / "voltaic-s3.json"
AIMLABS = home() / "AppData" / "LocalLow" / "Statespace" / "aimlab_tb" / "Users"


def profiles():
    """Each Aimlabs profile's folder that has a database (one per Steam account that played)."""
    if not AIMLABS.exists():
        raise SystemExit(f"Aimlabs has no profiles at {AIMLABS}: is it installed on this PC?")
    return [folder for folder in sorted(AIMLABS.iterdir()) if (folder / "LocalDB" / "Klutch.bytes").exists()]


def known_names():
    """Task id → name for the benchmark's scenarios, for plays whose replay header is gone."""
    data = json.loads(BENCHMARK.read_text())
    return {s["id"]: f'{s["name"]} {level["name"]["en"]} S3' for level in data["levels"] for s in level["scenarios"]}


def utc(text: str) -> datetime:
    """Aimlabs' "2026-11-08 15:13:04", which is UTC."""
    return datetime.strptime(text, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def plays(folder: Path, names: dict[str, str]):
    """Every play in this profile's database, oldest first."""
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / "klutch.db"
        shutil.copyfile(folder / "LocalDB" / "Klutch.bytes", copy)
        db = sqlite3.connect(copy)
        rows = db.execute(
            "select taskName, score, startedAt, endedAt, createDate, performance, playId from TaskData order by startedAt"
        ).fetchall()
        db.close()
    for task, score, started, ended, created, performance, play in rows:
        start = utc(started or created)
        end = utc(ended or created)
        header = folder / "Replay" / f"{play}.json"
        name = None
        if play and header.exists():
            try:
                name = json.loads(header.read_text()).get("taskName")
            except (OSError, json.JSONDecodeError):
                pass
        # The id's third part is the name's start ("CsLevel.VT Lowgravity56.VT Regen.RX52TZ" → "VT Regen").
        name = name or names.get(task) or (task.split(".")[2] if task.count(".") >= 3 else task)
        stats = json.loads(performance) if performance else {}
        accuracy = stats.get("accTotal")
        yield {
            "at": start.isoformat().replace("+00:00", "Z"),
            "task": task,
            "name": name,
            "score": score,
            **({"accuracy": round(accuracy, 1)} if isinstance(accuracy, (int, float)) else {}),
            "seconds": max(0, round((end - start).total_seconds())),
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write the files (otherwise only list what changes)")
    args = parser.parse_args()

    names = known_names()
    days: dict[str, dict[str, dict]] = {}
    for folder in profiles():
        for play in plays(folder, names):
            day = datetime.fromisoformat(play["at"].replace("Z", "+00:00")).astimezone(TIME_ZONE).date().isoformat()
            days.setdefault(day, {})[play["at"]] = play

    changed = 0
    for day, found in sorted(days.items()):
        path = OUT / f"{day}.json"
        kept = {play["at"]: play for play in json.loads(path.read_text())["plays"]} if path.exists() else {}
        merged = {**found, **kept}
        # A name read from a replay beats one guessed from the id.
        for at, play in merged.items():
            if at in found and found[at]["name"] != play["name"] and play["name"] in found[at]["name"]:
                play["name"] = found[at]["name"]
        new = sorted(merged.values(), key=lambda play: play["at"])
        if path.exists() and json.loads(path.read_text())["plays"] == new:
            continue
        changed += 1
        minutes = round(sum(play["seconds"] for play in new) / 60)
        print(f"{day}: {len(new)} plays ({len(new) - len(kept):+d}), {minutes} min")
        if args.apply:
            OUT.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({"date": day, "plays": new}, ensure_ascii=False, indent=1) + "\n")
    if not changed:
        print("Nothing new.")
    elif not args.apply:
        print("(dry run: --apply writes them)")


if __name__ == "__main__":
    main()
