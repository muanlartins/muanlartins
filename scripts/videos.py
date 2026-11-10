"""Files each live's material in Videos\\Lives\\<date>\\: OBS's recordings, named for when they started and what
they are, and a copy of each ranked match's replay, named for its number in the day and its result.

    python3 scripts/videos.py            # what it would do
    python3 scripts/videos.py --apply    # do it
    python3 scripts/videos.py 2026-11-09 --apply    # only that day's material
    scripts/.venv/bin/python scripts/videos.py --clean            # what it would delete, to free the disk
    scripts/.venv/bin/python scripts/videos.py --clean --apply    # delete it
    python3 scripts/videos.py --done <date>                        # that day's material is used up

OBS leaves "2026-11-05 14-10-55.mp4" (and the Source Record filters' "… câmera.mkv" and "… jogo.mkv") in
Videos; they become Lives\\2026-11-05\\14-10-55 Live.mp4, 14-10-56 Câmera.mkv and 14-10-56 Jogo.mp4 (the game
alone, no camera or overlays). The filter writes MKV, which survives OBS crashing or the disk filling up; the game's
is remuxed to MP4 (no re-encoding, the same pictures) because RLR's studio plays it in the browser. The start time
stays in the name: live.py reads it when the dock didn't log the recording. When OBS restarted mid-live (a crash,
a relaunch), the day has several recordings of a kind: they're joined end to end, still without re-encoding, under
the first one's name, and Lives\\<date>\\partes.json says where each piece starts, in the day's clock and in the
joined file (live.py places the chapters with it; the minutes OBS was down aren't in the file). The VAR's clips (OBS's Replay Buffer,
saved by the Efeitos dock: "Replay 2026-11-05 14-32-10.mp4") go to Lives\\<date>\\VAR\\14-32-10 VAR.mp4, material
for shorts like the Jogo recording. Replays stay in the game's folder (it lists them from there) and are copied to
Lives\\<date>\\Replays\\, matched to the dock's matches by score and time.

Lives come every day and an hour of them is tens of GB, so the material goes once it has done its job:
- the stream's recording (Live) once its YouTube video (content/lives/<date>.json) is processed and as long as
  the file (YouTube keeps it); a day without a Jogo recording keeps it as the studio's copy, like a Jogo;
- the Jogo and Câmera recordings and the VAR's clips once the day is marked done (--done, after its shorts and commented videos),
  or, oldest day first, when the disk would otherwise have less than FREE_GB free: kept as long as there's room.
Replays are small and stay. Deleting is for good (no Recycle Bin): --clean alone only lists.
"""

import argparse
import json
import re
import shutil
import struct
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from content import LIVES as PAGES, sessions
from windows import VIDEOS, home

TIME_ZONE = ZoneInfo("America/Sao_Paulo")

LIVES = VIDEOS / "Lives"
DEMOS = [home() / "OneDrive" / "Documents" / "My Games" / "Rocket League" / "TAGame" / folder for folder in ("DemosEpic", "Demos")]
LOOSE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}-\d{2}-\d{2})(?: (câmera|jogo))?\.(mp4|mkv|mov)$")
KINDS = {None: "Live", "câmera": "Câmera", "jogo": "Jogo"}
VAR_CLIP = re.compile(r"^Replay (\d{4}-\d{2}-\d{2}) (\d{2}-\d{2}-\d{2})\.(mp4|mkv|mov)$")
# What a live needs free before it starts (about 3 hours of the three recordings at ~50 GB/h, and a margin): the
# Jogo and Câmera recordings wait for their shorts and commented videos as long as this much stays free.
FREE_GB = 200
DONE = ".feito"
PIECES = "partes.json"
# How long OBS can be down between two pieces of one live (a crash, a relaunch).
RESTART = timedelta(minutes=15)


def recordings():
    """(file, where it goes) for each OBS recording still loose in Videos."""
    for file in sorted(VIDEOS.iterdir()):
        found = LOOSE.match(file.name)
        # Source Record leaves an empty file when OBS opens a scene after recording stops: those stay put.
        if file.is_file() and found and file.stat().st_size > 1_000_000:
            day, time, kind, ext = found.groups()
            yield file, LIVES / day / f"{time} {KINDS[kind]}.{ext}"
        clip = VAR_CLIP.match(file.name)
        if file.is_file() and clip:
            day, time, ext = clip.groups()
            yield file, LIVES / day / "VAR" / f"{time} VAR.{ext}"


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
                    if match.get("score") and goals == set(match["score"]) and min(abs(when - end) for when in whens) < timedelta(minutes=3)]
            if not fits:
                continue
            path = min(fits, key=lambda fit: fit[1])[0]
            result = {"win": "Vitória", "loss": "Derrota"}.get(match["result"], match["result"])
            name = f"Partida {number:02d} - {result} {match['score'][0]}-{match['score'][1]}{' (prorrogação)' if match.get('overtime') else ''}.replay"
            yield path, LIVES / day / "Replays" / name


def length(file):
    from windows import PROGRAMS, run, to_windows
    out = run(PROGRAMS / "ffmpeg" / "ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
              to_windows(file), capture_output=True, text=True).stdout
    return float(out.strip())


def expendable():
    """(file, why) for each recording that has done its job, or that has to go to keep FREE_GB free."""
    gone = []
    material = []  # (day, files) of the days not done, oldest first: what goes when space runs short
    for folder in sorted(LIVES.iterdir()) if LIVES.exists() else []:
        try:
            date.fromisoformat(folder.name)
        except ValueError:
            continue
        page = PAGES / f"{folder.name}.json"
        video = json.loads(page.read_text()).get("video") if page.exists() else None
        done = (folder / DONE).exists()
        # Before 11-06 there was no Jogo recording: the stream's is then the studio's only copy of the matches.
        alone = not any(folder.glob("??-??-?? Jogo.*"))
        kept = [*folder.glob("??-??-?? Jogo.*"), *folder.glob("??-??-?? Câmera.*"), *folder.glob("VAR/??-??-?? VAR.*")]
        for file in sorted(folder.glob("??-??-?? Live.*")):
            if not video:
                continue
            # Imported here: it needs the venv, and only this check does.
            from youtube import processed
            online = processed(video)
            if online is None:
                print(f"keep  {file.relative_to(VIDEOS)}: o vídeo {video} ainda não terminou de processar no YouTube")
            elif abs(online - length(file)) > 5:
                print(f"keep  {file.relative_to(VIDEOS)}: o vídeo {video} tem {online} s e o arquivo {length(file):.0f} s")
            elif alone and not done:
                kept.append(file)
            else:
                gone.append((file, f"no YouTube ({video})"))
        if done:
            gone += [(file, "dia marcado como feito") for file in sorted(kept)]
        elif kept:
            material.append((folder.name, sorted(kept)))
    yield from gone
    free = shutil.disk_usage(VIDEOS).free + sum(file.stat().st_size for file, _ in gone)
    while material and free < FREE_GB * 1e9:
        _, files = material.pop(0)
        for file in files:
            free += file.stat().st_size
            yield file, f"o mais antigo, para manter {FREE_GB} GB livres"
    if material:
        days = [day for day, _ in material]
        print(f"keep  o material de {len(days)} dia(s), {days[0]} a {days[-1]}: cabe com {FREE_GB} GB livres")


def clean(apply):
    freed = 0
    for file, why in expendable():
        size = file.stat().st_size
        freed += size
        print(f"{'delete' if apply else 'would delete'}  {file.relative_to(VIDEOS)}  ({size / 1e9:.1f} GB, {why})")
        if apply:
            file.unlink()
    print(f"{'Liberados' if apply else 'Liberaria'} {freed / 1e9:.1f} GB. Livre agora: {shutil.disk_usage(VIDEOS).free / 1e9:.0f} GB.")
    if not apply:
        print("(nada foi apagado: rode com --apply)")


def remux(source, target):
    """MKV to MP4 with the same streams (no re-encoding), the index up front for seeking; the MKV goes once the MP4
    is as long."""
    from windows import PROGRAMS, run, to_windows
    run(PROGRAMS / "ffmpeg" / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-i", to_windows(source),
        "-map", "0", "-c", "copy", "-movflags", "+faststart", to_windows(target))
    if abs(length(target) - length(source)) > 1:
        raise SystemExit(f"{target.name} saiu com {length(target):.0f} s e {source.name} tem {length(source):.0f} s: fiquei com os dois")
    source.unlink()


def started(file):
    """When OBS started a loose recording, from its name (local time, to the second)."""
    day, time = LOOSE.match(file.name).groups()[:2]
    return datetime.strptime(f"{day} {time}", "%Y-%m-%d %H-%M-%S")


def join(sources, target):
    """Several recordings of one kind end to end, with the same streams (no re-encoding: they come from the same OBS
    profile), into target; the pieces go once it's as long as all of them together. Each piece's start, in the
    day's clock (from its name) and in the joined file, goes into the day's PIECES under the kind."""
    from windows import PROGRAMS, TEMP, run, to_windows
    lengths = [length(source) for source in sources]
    listing = TEMP / f"muanlartins-{target.parent.name}-{target.stem.replace(' ', '_')}.txt"
    listing.write_text("".join(f"file '{to_windows(source).replace(chr(92), '/')}'\n" for source in sources), encoding="utf-8")
    try:
        run(PROGRAMS / "ffmpeg" / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
            "-i", to_windows(listing), "-map", "0", "-c", "copy", *(["-movflags", "+faststart"] if target.suffix == ".mp4" else []),
            to_windows(target))
    finally:
        listing.unlink(missing_ok=True)
    if abs(length(target) - sum(lengths)) > 2:
        raise SystemExit(f"{target.name} saiu com {length(target):.0f} s e as partes somam {sum(lengths):.0f} s: fiquei com tudo")
    pieces_file = target.parent / PIECES
    pieces = json.loads(pieces_file.read_text()) if pieces_file.exists() else {}
    kind = target.stem.split(" ", 1)[1]
    pieces[kind] = []
    at = 0.0
    for source, seconds in zip(sources, lengths):
        pieces[kind].append({"inicio": started(source).isoformat(), "em": round(at, 3), "segundos": round(seconds, 3)})
        at += seconds
    pieces_file.write_text(json.dumps(pieces, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for source in sources:
        source.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="move and copy, or delete (without it, only show)")
    parser.add_argument("--clean", action="store_true", help="delete recordings that have done their job")
    parser.add_argument("--done", metavar="DATE", help="mark a day's material as used up (its shorts and videos made)")
    parser.add_argument("day", nargs="?", help="YYYY-MM-DD: file only that day's material")
    args = parser.parse_args()

    if args.done:
        (LIVES / args.done).mkdir(parents=True, exist_ok=True)
        (LIVES / args.done / DONE).touch()
        print(f"{args.done} marcado como feito: as gravações dele saem no próximo --clean.")
        return
    if args.clean:
        clean(args.apply)
        return

    day_of = lambda target: target.parent.parent.name if target.parent.name == "VAR" else target.parent.name  # noqa: E731
    found = [(source, target) for source, target in recordings() if not args.day or day_of(target) == args.day]
    # A day's recordings of one kind, oldest first, each starting at most RESTART after the one before ended: the
    # pieces of one live that OBS restarted in the middle of (a test recorded hours before stays apart).
    kinds = {}
    for source, target in found:
        if target.parent.name != "VAR":
            kinds.setdefault((target.parent, target.stem.split(" ", 1)[1]), []).append((source, target))
    groups = []
    for pieces in kinds.values():
        if len(pieces) < 2:
            continue
        groups.append([pieces[0]])
        for previous, piece in zip(pieces, pieces[1:]):
            if started(piece[0]) - started(previous[0]) - timedelta(seconds=length(previous[0])) > RESTART:
                groups.append([])
            groups[-1].append(piece)
    for group in groups:
        if len(group) < 2:
            continue
        target = group[0][1].with_suffix(".mp4") if group[0][1].name.endswith(" Jogo.mkv") else group[0][1]
        print(f"join  {' + '.join(source.name for source, _ in group)}  →  {target.relative_to(VIDEOS)}")
        if args.apply:
            target.parent.mkdir(parents=True, exist_ok=True)
            join([source for source, _ in group], target)
    joined = {source for group in groups if len(group) > 1 for source, _ in group}

    for source, target in found:
        if source in joined:
            continue
        if target.name.endswith(" Jogo.mkv"):
            target = target.with_suffix(".mp4")
            print(f"remux {source.name}  →  {target.relative_to(VIDEOS)}")
            if args.apply:
                target.parent.mkdir(parents=True, exist_ok=True)
                remux(source, target)
            continue
        print(f"move  {source.name}  →  {target.relative_to(VIDEOS)}")
        if args.apply:
            target.parent.mkdir(parents=True, exist_ok=True)
            source.rename(target)
    for source, target in replays():
        if target.exists() or (args.day and target.parent.parent.name != args.day):
            continue
        print(f"copy  {source.name}  →  {target.relative_to(VIDEOS)}")
        if args.apply:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    if not args.apply:
        print("(nada mudou: rode com --apply)")


if __name__ == "__main__":
    main()
