"""After a live, its page on the site: content/lives/<date>.json and <date>.transcript.json, and its thumbnail.
See "After each live" in handoff/README.md.

    scripts/.venv/bin/python scripts/live.py <date>                 # transcript, chapters, summary, thumbnail
    scripts/.venv/bin/python scripts/live.py <date> --video <id>    # once it's on YouTube: the video's id
    scripts/.venv/bin/python scripts/youtube.py live <date>         # then the video itself

- The game is the one whose session the dock published that day: Rocket League (content/matches/) or Valorant
  (content/valorant/), and so are the chapters and the summary.
- The recording is the one the "Partidas" dock saw OBS make that day (the session's `outputs`), or else the
  largest in Videos named for that day. Its start is second 0 of the VOD.
- The transcript is whisper (Windows, CUDA, with VAD) on the microphone's own track, cleaned of hallucinations and
  repeats. Names stay as said: nothing is blanked (Luan's call, 2026-11-08).
- Chapters: each ranked match from its start, a "Começo" before the first and a "Fim" after the last.
- The summary is a draft from the numbers, for Luan to rewrite.
- The thumbnail: the rank reached, if the day climbed, goes into LIVES in brand/build.py, and the plain PNG is drawn
  (the fallback: the one YouTube gets is thumb.py's, from a frame Luan picks).

Files already there are kept; --force writes them again.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from content import LIVES, ROOT, SESSIONS, clock, sessions
from windows import PROGRAMS, TEMP, VIDEOS, run, to_windows

TIME_ZONE = ZoneInfo("America/Sao_Paulo")
WHISPER = PROGRAMS / "whisper"
FFMPEG = PROGRAMS / "ffmpeg"
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
# Valorant's ranks by Riot's tier number: 3 Ferro 1 … 26 Imortal 3, 27 Radiante (as lib/valorant.ts).
VALORANT_TIERS = [("Ferro", "Iron"), ("Bronze", "Bronze"), ("Prata", "Silver"), ("Ouro", "Gold"),
                  ("Platina", "Platinum"), ("Diamante", "Diamond"), ("Ascendente", "Ascendant"), ("Imortal", "Immortal")]
VALORANT_QUEUES = {"competitive": ("Competitivo", "Competitive"), "unrated": ("Sem classificação", "Unrated"),
                   "swiftplay": ("Frenético", "Swiftplay"), "spikerush": ("Disparada", "Spike Rush"),
                   "deathmatch": ("Mata-mata", "Deathmatch"), "hurm": ("Mata-mata em equipe", "Team Deathmatch")}
# The thumbnail's plate names the game.
GAME_NAMES = {"rocket-league": "Rocket League", "valorant": "Valorant"}


# --- The recording ------------------------------------------------------------------------------------

def recording(date, day):
    """(file, start) of the day's recording: the longest the dock logged, or the largest file for that day."""
    logged = [o for s in day for o in s.get("outputs", []) if o["kind"] == "record" and o.get("file") and o.get("end")]
    # OBS leaves "<date> <hh-mm-ss>.mp4" in Videos; scripts/videos.py files it as Lives\<date>\<hh-mm-ss> Live.mp4.
    organized = VIDEOS / "Lives" / date
    if logged:
        longest = max(logged, key=lambda o: datetime.fromisoformat(o["end"]) - datetime.fromisoformat(o["start"]))
        file = VIDEOS / longest["file"]
        if not file.exists():
            file = organized / f"{file.stem.split(' ')[-1]} Live{file.suffix}"
        return file, datetime.fromisoformat(longest["start"].replace("Z", "+00:00"))
    files = [f for f in [*VIDEOS.glob(f"{date} ??-??-??.*"), *organized.glob("??-??-?? Live.*")] if f.suffix in (".mkv", ".mp4")]
    if not files:
        sys.exit(f"Nenhuma gravação de {date} em {VIDEOS} nem em {organized}.")
    file = max(files, key=lambda f: f.stat().st_size)
    # OBS names the file for the local time it started.
    start = datetime.strptime(f"{date} {file.stem[-8:] if file.parent == VIDEOS else file.stem[:8]}", "%Y-%m-%d %H-%M-%S").replace(tzinfo=TIME_ZONE)
    # The dock may have logged the recording's start without its file: that start is exact, the name only to the second.
    near = [when(o["start"]) for s in day for o in s.get("outputs", [])
            if o["kind"] == "record" and abs((when(o["start"]) - start).total_seconds()) < 5]
    if near:
        return file, near[0]
    print(f"O dock não registrou a gravação: uso {file.name}, começando às {start:%H:%M:%S}.")
    return file, start


def placer(file, start):
    """datetime → seconds of the VOD. A recording joined from pieces (videos.py, when OBS restarted mid-live) has
    Lives\\<date>\\partes.json: each moment is placed in its own piece; the minutes between pieces aren't in the file,
    and a moment there goes to the next piece's start."""
    pieces_file = file.parent / "partes.json"
    kind = file.stem.split(" ", 1)[-1]
    pieces = json.loads(pieces_file.read_text()).get(kind, []) if pieces_file.exists() else []
    if not pieces:
        return lambda moment: (moment - start).total_seconds()
    # The first piece's start may be the dock's exact one; the others are from their names, to the second.
    starts = [start] + [datetime.fromisoformat(p["inicio"]).replace(tzinfo=TIME_ZONE) for p in pieces[1:]]

    def place(moment):
        at = (moment - start).total_seconds()
        for piece, begin in zip(pieces[1:], starts[1:]):
            if moment < begin:
                return min(at, piece["em"])
            at = piece["em"] + (moment - begin).total_seconds()
        return at
    return place


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


def clean(segments):
    """[(start, end, text)] → [[seconds, text]], without hallucinations or repeats."""
    lines = []
    for start, end, text in segments:
        text = " ".join(text.split())
        # No length limit: with the VAD, a long segment is speech with pauses cut out, not whisper over music.
        if not text or HALLUCINATIONS.match(text):
            continue
        text = REPEATS.sub(r"\1", text)
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


def chapters(day, place, length):
    """Each ranked match from its start, in seconds of the VOD (place: datetime → seconds)."""
    matches = sorted((m for s in day for m in s["matches"]), key=lambda m: m["at"])
    found = []
    previous_end = None
    for match in matches:
        # Older matches have only their end: they start where the previous one ended, or 7 min before it.
        begin = when(match["start"]) if match.get("start") else previous_end or when(match["at"]) - timedelta(minutes=7)
        previous_end = when(match["at"])
        at = place(begin)
        if 0 <= at < length:
            found.append((at, {"match": match["id"]}, place(previous_end)))
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


def valorant_rank(rank, language):
    tier = rank["tier"]
    name = ("Radiante", "Radiant")[language] if tier >= 27 else f"{VALORANT_TIERS[(tier - 3) // 3][language]} {(tier - 3) % 3 + 1}"
    return f"{name} ({rank['rr']} RR)"


def valorant_summary(day):
    """A draft from the numbers: per queue, the record; in Competitivo, the RR won or lost and the rank at the end."""
    parts = {"pt": [], "en": []}
    played = sorted((m for s in day for m in s["matches"]), key=lambda m: m["at"])
    for queue in dict.fromkeys(m["queue"] for m in played):
        these = [m for m in played if m["queue"] == queue]
        wins = sum(m["result"] == "win" for m in these)
        losses = sum(m["result"] == "loss" for m in these)
        draws = len(these) - wins - losses
        name = VALORANT_QUEUES.get(queue, (queue, queue))
        pt = f"{name[0]}: {wins} vitória{'s' * (wins != 1)} e {losses} derrota{'s' * (losses != 1)}"
        en = f"{name[1]}: {wins} win{'s' * (wins != 1)} and {losses} loss{'es' * (losses != 1)}"
        if draws:
            pt += f" e {draws} empate{'s' * (draws != 1)}"
            en += f" and {draws} draw{'s' * (draws != 1)}"
        rated = [m for m in these if m.get("rank")]
        if queue == "competitive" and rated:
            rr = sum(m.get("rr") or 0 for m in these)
            pt += f" ({'+' if rr >= 0 else '−'}{abs(rr)} RR), terminando em {valorant_rank(rated[-1]['rank'], 0)}"
            en += f" ({'+' if rr >= 0 else '−'}{abs(rr)} RR), ending at {valorant_rank(rated[-1]['rank'], 1)}"
        parts["pt"].append(pt + ".")
        parts["en"].append(en + ".")
    if not parts["pt"]:
        return {"pt": "Sem partidas registradas.", "en": "No matches recorded."}
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


def thumbnail(date, rank, tier, game):
    """Adds the day to LIVES in brand/build.py (and to LIVE_GAMES when it isn't Rocket League) and draws its
    thumbnail."""
    build = ROOT / "brand" / "build.py"
    text = build.read_text()
    for table, entry in (("LIVES", f'    "{date}": ({rank!r}, {tier!r}),'.replace("'", '"')),
                         ("LIVE_GAMES", f'    "{date}": "{GAME_NAMES[game]}",' if game != "rocket-league" else None)):
        block = re.search(rf"\n{table} = \{{\n(.*?)\n?\}}\n", text, re.S)
        if entry and f'"{date}":' not in block.group(1):
            text = text[:block.end(1)] + (f"\n{entry}" if block.group(1) else f"{entry}\n") + text[block.end(1):]
    build.write_text(text)
    python = ROOT / "brand" / ".venv" / "bin" / "python"
    subprocess.run([str(python), "-c", (
        "import build\n"
        f"rank, tier = build.LIVES[{date!r}]\n"
        f"build.write('youtube/thumbnails/live-{date}.svg', build.live_thumbnail('{date[8:]}/{date[5:7]}', rank, tier, "
        f"build.LIVE_GAMES.get({date!r}, 'Rocket League')))\n"
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

    # The day's game: the one whose dock published a session that day (Rocket League's Partidas, or its Valorant tab).
    game = next((g for g in SESSIONS if sessions(args.date, g)), "rocket-league")
    day = sessions(args.date, game)
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
        live = {"date": args.date, "game": game, "video": args.video or "",
                "summary": valorant_summary(day) if game == "valorant" else summary(day),
                "chapters": chapters(day, placer(file, start), length)}
        write_live(page, live)
        print(f"Página: {len(live['chapters'])} capítulos em {page.relative_to(ROOT)}. O resumo é um rascunho.")

    # A climb shows on the thumbnail with Rocket League's emblems; Valorant's lives get the plain one for now.
    rank, tier = reached(day) if game == "rocket-league" else (None, None)
    thumbnail(args.date, rank, tier, game)
    print(f"Thumbnail: brand/youtube/thumbnails/live-{args.date}.png" + (f" ({rank} {tier})" if rank else ""))
    print(f"A thumb de clicar: scripts/thumb.py {args.date} (folha de reações para o Luan escolher)")
    if not args.video:
        print(f"Depois de subir no Studio: scripts/live.py {args.date} --video <id>")


if __name__ == "__main__":
    main()
