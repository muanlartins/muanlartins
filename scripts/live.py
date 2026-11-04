"""After a live, its page on the site: content/lives/<date>.json and <date>.transcript.json, and its thumbnail.
See "After each live" in handoff/README.md.

    scripts/.venv/bin/python scripts/live.py <date>                 # transcript, chapters, summary, thumbnail
    scripts/.venv/bin/python scripts/live.py <date> --video <id>    # once it's on YouTube: the video's id
    scripts/.venv/bin/python scripts/youtube.py live <date>         # then the video itself

- The recording is the one the "Partidas" dock saw OBS make that day (the session's `outputs`), or else the
  largest in Videos named for that day. Its start is second 0 of the VOD.
- The transcript is whisper (Windows, CUDA, with VAD) on the microphone's own track, cleaned: no hallucinations,
  no repeats, and no names: friends' (one per line in %USERPROFILE%\\.config\\muanlartins\\nomes.txt, kept out of
  this public repo) and anything that looks like a username (letters with digits, like xx_gamer99) become "—".
- Chapters: each ranked match from its start, a "Começo" before the first and a "Fim" after the last.
- The summary is a draft from the numbers, for Luan to rewrite.
- The thumbnail: the rank reached, if the day climbed, goes into LIVES in brand/build.py, and the PNG is drawn.

Files already there are kept; --force writes them again.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from content import LIVES, ROOT, clock, sessions
from windows import CONFIG, PROGRAMS, TEMP, VIDEOS, run, to_windows

TIME_ZONE = ZoneInfo("America/Sao_Paulo")
WHISPER = PROGRAMS / "whisper"
FFMPEG = PROGRAMS / "ffmpeg"
NAMES = CONFIG / "nomes.txt"
# The recording's audio tracks: 1 Tudo, 2 Microfone, 3 Jogo, 4 Discord.
MIC_TRACK = 1

TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "champion", "grand-champion"]
ORDER = ["unranked", *(f"{tier}-{n}" for tier in TIERS for n in (1, 2, 3)), "supersonic-legend"]
TIER_NAMES = {
    "unranked": ("Sem ranque", "Unranked"), "bronze": ("Bronze", "Bronze"), "silver": ("Prata", "Silver"),
    "gold": ("Ouro", "Gold"), "platinum": ("Platina", "Platinum"), "diamond": ("Diamante", "Diamond"),
    "champion": ("Campeão", "Champion"), "grand-champion": ("Grão-Campeão", "Grand Champion"),
    "supersonic-legend": ("Lenda Supersônica", "Supersonic Legend"),
}
DIVISIONS = ["I", "II", "III", "IV"]


# --- The recording ------------------------------------------------------------------------------------

def recording(date, day):
    """(file, start) of the day's recording: the longest the dock logged, or the largest file for that day."""
    logged = [o for s in day for o in s.get("outputs", []) if o["kind"] == "record" and o.get("file") and o.get("end")]
    if logged:
        longest = max(logged, key=lambda o: datetime.fromisoformat(o["end"]) - datetime.fromisoformat(o["start"]))
        return VIDEOS / longest["file"], datetime.fromisoformat(longest["start"].replace("Z", "+00:00"))
    files = [f for f in VIDEOS.glob(f"{date} ??-??-??.*") if f.suffix in (".mkv", ".mp4")]
    if not files:
        sys.exit(f"Nenhuma gravação de {date} em {VIDEOS}.")
    file = max(files, key=lambda f: f.stat().st_size)
    # OBS names the file for the local time it started.
    start = datetime.strptime(file.stem, "%Y-%m-%d %H-%M-%S").replace(tzinfo=TIME_ZONE)
    print(f"O dock não registrou a gravação: uso {file.name}, começando às {start:%H:%M:%S}.")
    return file, start


def duration(file):
    out = run(FFMPEG / "ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
              to_windows(file), capture_output=True, text=True).stdout
    return float(out.strip())


# --- The transcript -----------------------------------------------------------------------------------

# Whisper's stock phrases on silence and noise: whole lines.
HALLUCINATIONS = re.compile(
    r"^(e aí\.?|obrigad[oa]\.?( por assistir.*)?|tchau\.?|legendas? .*|.*inscreva.*|.*amara\.org.*|\[.*\]|\(.*\)|\.+|♪.*)$",
    re.IGNORECASE)
# A word or a short phrase said three or more times in a row: kept once.
REPEATS = re.compile(r"\b(.{1,40}?)(?:[\s,.!?]+\1\b){2,}", re.IGNORECASE)
# Usernames: letters followed by digits (xx_gamer99), not 2v2 or ps5.
HANDLES = re.compile(r"\b[A-Za-z_][A-Za-z_]{2,}\d+\w*(?:\.\d+)?\b")


def names():
    if not NAMES.exists():
        NAMES.parent.mkdir(parents=True, exist_ok=True)
        NAMES.write_text("# Nomes de amigos que não vão para as transcrições do site: um por linha.\n")
    lines = [line.strip() for line in NAMES.read_text(encoding="utf-8").splitlines()]
    words = [line for line in lines if line and not line.startswith("#")]
    return re.compile(r"\b(" + "|".join(map(re.escape, words)) + r")\b", re.IGNORECASE) if words else None


def clean(segments):
    """[(start, end, text)] → [[seconds, text]], without hallucinations, repeats or names."""
    friends = names()
    lines = []
    for start, end, text in segments:
        text = " ".join(text.split())
        # No length limit: with the VAD, a long segment is speech with pauses cut out, not whisper over music.
        if not text or HALLUCINATIONS.match(text):
            continue
        text = REPEATS.sub(r"\1", text)
        text = HANDLES.sub("—", text)
        if friends:
            text = friends.sub("—", text)
        if lines and text.lower() == lines[-1][1].lower():
            continue
        lines.append([int(start), text])
    return lines


def transcribe(file):
    stem = TEMP / f"muanlartins-{file.stem.replace(' ', '_')}-mic"
    wav = stem.with_suffix(".wav")
    print("Extraindo o microfone…")
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-i", to_windows(file),
        "-map", f"0:a:{MIC_TRACK}", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", to_windows(wav))
    print("Transcrevendo (whisper na GPU)…")
    # -mc 0: without it, whisper loops on silence ("Se inscreva no canal…"). The VAD skips the silence outright.
    run(WHISPER / "whisper-cli.exe", "-m", to_windows(WHISPER / "models" / "ggml-large-v3-turbo-q5_0.bin"),
        "-l", "pt", "-mc", "0", "--vad", "-vm", to_windows(WHISPER / "models" / "ggml-silero-v5.1.2.bin"),
        "-oj", "-of", to_windows(stem), "-np", to_windows(wav), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    result = json.loads(stem.with_suffix(".json").read_text(encoding="utf-8"))
    wav.unlink()
    stem.with_suffix(".json").unlink()
    return [(s["offsets"]["from"] / 1000, s["offsets"]["to"] / 1000, s["text"]) for s in result["transcription"]]


# --- Chapters, summary, thumbnail ---------------------------------------------------------------------

def when(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def chapters(day, start, length):
    """Each ranked match from its start, in seconds of the VOD."""
    matches = sorted((m for s in day for m in s["matches"]), key=lambda m: m["at"])
    found = []
    previous_end = None
    for match in matches:
        # Older matches have only their end: they start where the previous one ended, or 7 min before it.
        begin = when(match["start"]) if match.get("start") else previous_end or when(match["at"]) - timedelta(minutes=7)
        previous_end = when(match["at"])
        at = (begin - start).total_seconds()
        if 0 <= at < length:
            found.append((at, {"match": match["id"]}, (previous_end - start).total_seconds()))
    chapters = []
    if not found or found[0][0] >= 10:
        chapters.append({"at": "0:00", "title": {"pt": "Começo", "en": "Start"}})
    chapters += [{"at": clock(at), **chapter} for at, chapter, _ in found]
    if found and length - found[-1][2] > 60:
        chapters.append({"at": clock(found[-1][2] + 5), "title": {"pt": "Fim", "en": "The end"}})
    return chapters


def standings(day, mode):
    """The rank going in and coming out, in a mode: {tier, division, mmr}. Going in is the first match's rank,
    which is what was on screen when it started; ranks set before it can be misclicks being fixed."""
    played = [m for s in day for m in s["matches"] if m["mode"] == mode and m.get("rank")]
    changes = [r for s in day for r in s["ranks"] if r["mode"] == mode]
    first = played[0]["rank"] if played else next(
        (s["startRanks"][mode] for s in day if s.get("startRanks", {}).get(mode)), changes[0] if changes else None)
    return first, (changes[-1] if changes else first)


def rank_name(standing, language):
    tier = standing["tier"]
    base, _, number = tier.rpartition("-") if tier[-1].isdigit() else (tier, "", "")
    name = TIER_NAMES[base][language] + (f" {number}" if number else "")
    if standing.get("division"):
        name += f" {DIVISIONS[standing['division'] - 1]}"
    return name


def summary(day):
    """A draft from the numbers: per mode, the record and the rank going in and out."""
    parts = {"pt": [], "en": []}
    for mode in sorted({m["mode"] for s in day for m in s["matches"]}):
        played = [m for s in day for m in s["matches"] if m["mode"] == mode]
        wins = sum(m["result"] == "win" for m in played)
        losses = len(played) - wins
        first, last = standings(day, mode)
        pt = f"{mode} ranqueado: {wins} vitória{'s' * (wins != 1)} e {losses} derrota{'s' * (losses != 1)}"
        en = f"Ranked {mode}: {wins} win{'s' * (wins != 1)} and {losses} loss{'es' * (losses != 1)}"
        if first and last:
            points = lambda s: f" ({s['mmr']})" if s.get("mmr") is not None else ""
            pt += f", de {rank_name(first, 0)}{points(first)} a {rank_name(last, 0)}{points(last)}"
            en += f", from {rank_name(first, 1)}{points(first)} to {rank_name(last, 1)}{points(last)}"
        parts["pt"].append(pt + ".")
        parts["en"].append(en + ".")
    if not parts["pt"]:
        return {"pt": "Sem ranqueadas.", "en": "No ranked matches."}
    return {language: " ".join(lines) for language, lines in parts.items()}


def reached(day):
    """(rank, tier) for the thumbnail, if any mode climbed a tier; the highest reached."""
    best = None
    for mode in {m["mode"] for s in day for m in s["matches"]}:
        first, last = standings(day, mode)
        if first and last and ORDER.index(last["tier"]) > ORDER.index(first["tier"]):
            if not best or ORDER.index(last["tier"]) > ORDER.index(best):
                best = last["tier"]
    if not best or not best[-1].isdigit():
        return None, None
    rank, _, tier = best.rpartition("-")
    return rank, int(tier)


def thumbnail(date, rank, tier):
    """Adds the day to LIVES in brand/build.py and draws its thumbnail."""
    build = ROOT / "brand" / "build.py"
    text = build.read_text()
    if f'"{date}":' not in text:
        block = re.search(r"\nLIVES = \{\n(.*?)\n\}\n", text, re.S)
        entry = f'    "{date}": ({rank!r}, {tier!r}),'.replace("'", '"')
        text = text[:block.end(1)] + "\n" + entry + text[block.end(1):]
        build.write_text(text)
    python = ROOT / "brand" / ".venv" / "bin" / "python"
    subprocess.run([str(python), "-c", (
        "import build\n"
        f"rank, tier = build.LIVES[{date!r}]\n"
        f"build.write('youtube/thumbnails/live-{date}.svg', build.live_thumbnail('{date[8:]}/{date[5:7]}', rank, tier))\n"
        f"build.png('youtube/thumbnails/live-{date}.svg', 'youtube/thumbnails/live-{date}.png', 1280)\n"
    )], cwd=ROOT / "brand", check=True)


# --- The page --------------------------------------------------------------------------------------------

def write_live(path, live):
    """The same layout as the hand-written ones: a chapter per line."""
    head = {key: value for key, value in live.items() if key != "chapters"}
    text = json.dumps(head, ensure_ascii=False, indent=2)[:-2]
    # Spaced inside the braces, as Prettier writes them.
    spaced = lambda c: json.dumps(c, ensure_ascii=False).replace("{", "{ ").replace("}", " }")
    rows = ",\n".join(f"    {spaced(c)}" for c in live["chapters"])
    path.write_text(f'{text},\n  "chapters": [\n{rows}\n  ]\n}}\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("date", help="YYYY-MM-DD, the day of the live")
    parser.add_argument("--video", help="the YouTube video's id, once uploaded")
    parser.add_argument("--force", action="store_true", help="write again what's already there")
    args = parser.parse_args()

    page = LIVES / f"{args.date}.json"
    transcript = LIVES / f"{args.date}.transcript.json"
    if args.video and page.exists() and not args.force:
        live = json.loads(page.read_text())
        live["video"] = args.video
        write_live(page, live)
        print(f"Vídeo {args.video} em {page.relative_to(ROOT)}. Agora: scripts/youtube.py live {args.date}")
        return

    day = sessions(args.date)
    file, start = recording(args.date, day)
    length = duration(file)
    print(f"Gravação: {file.name}, {clock(length)}.")

    if transcript.exists() and not args.force:
        print(f"{transcript.relative_to(ROOT)} já existe: mantida.")
    else:
        lines = clean(transcribe(file))
        transcript.write_text(json.dumps(lines, ensure_ascii=False, separators=(",", ":")) + "\n")
        print(f"Transcrição: {len(lines)} falas em {transcript.relative_to(ROOT)}.")

    if page.exists() and not args.force:
        print(f"{page.relative_to(ROOT)} já existe: mantida.")
    else:
        # The lives are Rocket League's for now; a live of another game sets its id by hand.
        live = {"date": args.date, "game": "rocket-league", "video": args.video or "", "summary": summary(day),
                "chapters": chapters(day, start, length)}
        write_live(page, live)
        print(f"Página: {len(live['chapters'])} capítulos em {page.relative_to(ROOT)}. O resumo é um rascunho.")

    rank, tier = reached(day)
    thumbnail(args.date, rank, tier)
    print(f"Thumbnail: brand/youtube/thumbnails/live-{args.date}.png" + (f" ({rank} {tier})" if rank else ""))
    if not args.video:
        print(f"Depois de subir no Studio: scripts/live.py {args.date} --video <id>")


if __name__ == "__main__":
    main()
