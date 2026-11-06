"""Shorts from the takes Luan records with RLR's studio (OBS's "Shorts" profile, brand/twitch/obs_shorts.py):

    scripts/.venv/bin/python scripts/shorts.py            # what it would make
    scripts/.venv/bin/python scripts/shorts.py --apply    # make them

A take is Videos\\Shorts\\<date> <time> short.mp4, 1080×1920: the play on top, his camera under it; tracks 1 Tudo,
2 Microfone, 3 Estúdio; one chapter per play, named by the studio ("Match 2 · Goal · 113 km/h"). Each chapter
becomes a short, the same way every time:

- cut from just before he starts talking to just after he stops (silence on the microphone's track);
- captioned word by word from whisper (the microphone alone), three words at a time, the one being said in Klein
  claro, on the line between the play and the camera; friends' names come out as in the lives' transcripts;
- encoded for Instagram and YouTube Shorts (H.264, AAC, the index up front) as
  Videos\\Shorts\\prontos\\<date> <time> - <play>.mp4. Over 60 s is said, not cut.

Shorts already made are skipped; the takes stay until Luan has posted them.
"""

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path

from live import FFMPEG, HALLUCINATIONS, WHISPER, names
from windows import TEMP, VIDEOS, run, to_windows

SHORTS = VIDEOS / "Shorts"
READY = SHORTS / "prontos"
TAKE = re.compile(r"^(\d{4}-\d{2}-\d{2}) (\d{2}-\d{2}-\d{2}) short\.mp4$")
FONT = Path(__file__).resolve().parent.parent / "brand" / "fonts" / "SpaceGrotesk.ttf"
# Where the captions sit: the line between the play and the camera (obs_shorts.py's STAGE).
SEAM = 1056
MIC, ALL = 1, 0  # audio streams, from 0
WORDS_SHOWN = 3


def probe(file, *args):
    out = run(FFMPEG / "ffprobe.exe", "-v", "error", *args, "-of", "json", to_windows(file), capture_output=True, text=True).stdout
    return json.loads(out)


def chapters(file):
    """[(start, end, title)]: the plays of the take, or the whole take when it has no chapters."""
    found = probe(file, "-show_chapters")["chapters"]
    if found:
        return [(float(c["start_time"]), float(c["end_time"]), c.get("tags", {}).get("title", "")) for c in found]
    length = float(probe(file, "-show_entries", "format=duration")["format"]["duration"])
    return [(0.0, length, "")]


def speech(file, start, end):
    """When he talks within [start, end]: from the end of the first silence to the start of the last."""
    out = run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-nostats", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i",
              to_windows(file), "-map", f"0:a:{MIC}", "-af", "silencedetect=noise=-40dB:d=0.7", "-f", "null", "-",
              capture_output=True, text=True).stderr
    silences, opened = [], None
    for line in out.splitlines():
        if m := re.search(r"silence_start: (-?[\d.]+)", line):
            opened = max(0.0, float(m[1]))
        elif (m := re.search(r"silence_end: ([\d.]+)", line)) and opened is not None:
            silences.append((opened, float(m[1])))
            opened = None
    if opened is not None:
        silences.append((opened, end - start))
    talk_from = silences[0][1] if silences and silences[0][0] < 0.1 else 0.0
    talk_to = silences[-1][0] if silences and silences[-1][1] >= end - start - 0.1 else end - start
    if talk_to <= talk_from:
        return None
    return start + max(0.0, talk_from - 0.3), start + min(end - start, talk_to + 0.6)


def words(file, start, end):
    """[(from, to, word)] said in [start, end], in seconds from `start`."""
    stem = TEMP / f"muanlartins-short-{file.stem.replace(' ', '_')}-{start:.0f}"
    wav = stem.with_suffix(".wav")
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}",
        "-i", to_windows(file), "-map", f"0:a:{MIC}", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", to_windows(wav))
    # One word per segment (-ml 1 -sow) for its timing; -mc 0 against loops on silence, as for the lives.
    run(WHISPER / "whisper-cli.exe", "-m", to_windows(WHISPER / "models" / "ggml-large-v3-turbo-q5_0.bin"),
        "-l", "pt", "-mc", "0", "-ml", "1", "-sow", "-oj", "-of", to_windows(stem), "-np", to_windows(wav),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    result = json.loads(stem.with_suffix(".json").read_text(encoding="utf-8"))
    wav.unlink()
    stem.with_suffix(".json").unlink()
    friends = names()
    said = []
    for s in result["transcription"]:
        word = s["text"].strip()
        if not word or HALLUCINATIONS.match(word):
            continue
        if friends:
            word = friends.sub("—", word)
        said.append((s["offsets"]["from"] / 1000, s["offsets"]["to"] / 1000, word))
    return said


def ass_time(seconds):
    cs = round(seconds * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def captions(said):
    """An ASS subtitle file: three words at a time, the one being said in Klein claro, centred on the seam."""
    groups, group = [], []
    for word in said:
        # A new line every three words, and after a pause or the end of a sentence.
        if group and (len(group) == WORDS_SHOWN or word[0] - group[-1][1] > 0.6 or group[-1][2][-1] in ".?!"):
            groups.append(group)
            group = []
        group.append(word)
    if group:
        groups.append(group)
    events = []
    for group in groups:
        for i, (start, end, _) in enumerate(group):
            # Each word holds until the next one starts, so the line doesn't blink between words.
            until = group[i + 1][0] if i + 1 < len(group) else end + 0.25
            text = " ".join(("{\\c&HFFA785&}" + w + "{\\c&HF7F5F4&}") if j == i else w for j, (_, _, w) in enumerate(group))
            events.append(f"Dialogue: 0,{ass_time(start)},{ass_time(max(until, start + 0.05))},Legenda,,0,0,0,,{{\\pos(540,{SEAM})}}{text}")
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,Space Grotesk,78,&H00F7F5F4,&H00F7F5F4,&H00A72F00,&H00A72F00,-1,0,0,0,100,100,0,0,3,18,0,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"


def plan():
    """(take, start, end, title, output) for each play of each take not made yet."""
    for take in sorted(SHORTS.glob("*.mp4")) if SHORTS.exists() else []:
        found = TAKE.match(take.name)
        if not found:
            continue
        for n, (start, end, title) in enumerate(chapters(take), 1):
            name = re.sub(r'[<>:"/\\|?*]', "", title.replace(" · ", " - ")).strip() or f"Short {n}"
            yield take, start, end, title, READY / f"{found[1]} {found[2]} - {name}.mp4"


def make(take, start, end, out):
    cut = speech(take, start, end)
    if not cut:
        print("      sem fala no microfone: pulado")
        return
    start, end = cut
    said = words(take, start, end)
    # The subtitles filter takes paths relative to C:\ (run's working directory), sparing ffmpeg's escaping of "C:".
    work = TEMP / "muanlartins-short"
    work.mkdir(exist_ok=True)
    shutil.copy(FONT, work / FONT.name)
    (work / "legenda.ass").write_text(captions(said), encoding="utf-8")
    rel = to_windows(work).split(":\\", 1)[1].replace("\\", "/")
    READY.mkdir(parents=True, exist_ok=True)
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}",
        "-i", to_windows(take), "-vf", f"subtitles={rel}/legenda.ass:fontsdir={rel}", "-map", "0:v:0", "-map",
        f"0:a:{ALL}", "-map_chapters", "-1", "-map_metadata", "-1", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "60",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", to_windows(out))
    shutil.rmtree(work)
    length = end - start
    print(f"      {length:.0f} s, {len(said)} palavras{'  (passou de 60 s)' if length > 60 else ''}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="make the shorts (without it, only show)")
    args = parser.parse_args()
    todo = [each for each in plan() if not each[4].exists()]
    for take, start, end, title, out in todo:
        print(f"short  {take.name} {start:.0f}–{end:.0f} s ({title or 'sem capítulo'})  →  prontos\\{out.name}")
        if args.apply:
            make(take, start, end, out)
    if not todo:
        print("Nenhum take novo em Videos\\Shorts.")
    elif not args.apply:
        print("(nada foi feito: rode com --apply)")


if __name__ == "__main__":
    main()
