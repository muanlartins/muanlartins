"""Files each live's material in Videos\\Lives\\<date>\\: OBS's recordings, named for when they started and what
they are, and a copy of each ranked match's replay, named for its number in the day and its result.

    python3 scripts/videos.py            # what it would do
    python3 scripts/videos.py --apply    # do it

OBS leaves "2026-11-05 14-10-55.mp4" (and the camera's "… câmera.mkv") in Videos; they become
Lives\\2026-11-05\\14-10-55 Live.mp4 and 14-10-56 Câmera.mkv. The start time stays in the name: live.py
reads it when the dock didn't log the recording. Replays stay in the game's folder (it lists them from
there) and are copied to Lives\\<date>\\Replays\\, matched to the dock's matches by score and time.
"""

import argparse
import re
import shutil
import struct
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from content import sessions
from windows import VIDEOS, home

TIME_ZONE = ZoneInfo("America/Sao_Paulo")

LIVES = VIDEOS / "Lives"
DEMOS = [home() / "OneDrive" / "Documents" / "My Games" / "Rocket League" / "TAGame" / folder for folder in ("DemosEpic", "Demos")]
LOOSE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}-\d{2}-\d{2})( câmera)?\.(mp4|mkv|mov)$")


def recordings():
    """(file, where it goes) for each OBS recording still loose in Videos."""
    for file in sorted(VIDEOS.iterdir()):
        found = LOOSE.match(file.name)
        if file.is_file() and found:
            date, time, camera, ext = found.groups()
            yield file, LIVES / date / f"{time} {'Câmera' if camera else 'Live'}.{ext}"


def header(path):
    """The replay's Date and the two teams' goals, from its header."""
    data = path.read_bytes()[:30000]

    def prop(name, kind):
        at = data.find(name.encode() + b"\0")
        if at < 0:
            return None
        at = data.find(kind.encode() + b"\0", at) + len(kind) + 1 + 8
        if kind == "IntProperty":
            return struct.unpack_from("<i", data, at)[0]
        size = struct.unpack_from("<i", data, at)[0]
        return data[at + 4:at + 3 + size].decode(errors="replace")

    return prop("Date", "StrProperty"), {prop("Team0Score", "IntProperty") or 0, prop("Team1Score", "IntProperty") or 0}


def matches_by_day():
    """The dock's matches, by the local day they were played."""
    days = {}
    for session in sessions():
        for match in session["matches"]:
            day = datetime.fromisoformat((match.get("start") or match["at"]).replace("Z", "+00:00")).astimezone(TIME_ZONE).date().isoformat()
            days.setdefault(day, []).append(match)
    return days


def replays():
    """(replay, where its copy goes) for each match the dock logged that has a replay saved."""
    saved = []
    for folder in DEMOS:
        for path in folder.glob("*.replay") if folder.exists() else []:
            date, goals = header(path)
            if not date:
                continue
            # The game writes the date in local time or in UTC, depending on how the replay was saved.
            clock = datetime.strptime(date, "%Y-%m-%d %H-%M-%S")
            saved.append((path, [clock.replace(tzinfo=TIME_ZONE), clock.replace(tzinfo=timezone.utc)], goals))
    for day, matches in matches_by_day().items():
        for number, match in enumerate(sorted(matches, key=lambda m: m.get("start") or m["at"]), 1):
            end = datetime.fromisoformat(match["at"].replace("Z", "+00:00"))
            fits = [(path, min(abs(when - end) for when in whens)) for path, whens, goals in saved
                    if goals == set(match["score"]) and min(abs(when - end) for when in whens) < timedelta(minutes=3)]
            if not fits:
                continue
            path = min(fits, key=lambda fit: fit[1])[0]
            result = {"win": "Vitória", "loss": "Derrota"}.get(match["result"], match["result"])
            name = f"Partida {number:02d} - {result} {match['score'][0]}-{match['score'][1]}{' (prorrogação)' if match.get('overtime') else ''}.replay"
            yield path, LIVES / day / "Replays" / name


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="move and copy (without it, only show)")
    args = parser.parse_args()

    for source, target in recordings():
        print(f"move  {source.name}  →  {target.relative_to(VIDEOS)}")
        if args.apply:
            target.parent.mkdir(parents=True, exist_ok=True)
            source.rename(target)
    for source, target in replays():
        if target.exists():
            continue
        print(f"copy  {source.name}  →  {target.relative_to(VIDEOS)}")
        if args.apply:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    if not args.apply:
        print("(nada mudou: rode com --apply)")


if __name__ == "__main__":
    main()
