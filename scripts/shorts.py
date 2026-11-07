"""Shorts from the takes Luan records with RLR's studio (OBS's "Shorts" profile, brand/twitch/obs_shorts.py):

    scripts/.venv/bin/python scripts/shorts.py            # what it would make
    scripts/.venv/bin/python scripts/shorts.py --apply    # make them

A take is Videos\\Shorts\\<date> <time> short.mp4, 1080×1920: the play on top, his camera under it; tracks 1 Tudo,
2 Microfone, 3 Estúdio; one chapter per play, named by the studio ("Match 2 · Goal · 113 km/h"). Each chapter
becomes a short, the same way every time:

- cut from just before he starts talking to just after he stops (silence on the microphone's track);
- the game's picture freed of the browser's bars when the studio wasn't in full screen (rows that never change
  at the top and bottom of the play are cut, the rest scaled back up to fill it; --sem-barras for the takes of the
  "Navegador" scene, where the site itself sits still);
- the full wordmark over the camera's cut "anlartins" (NVIDIA Broadcast's background, cropped);
- a hook line on top for its first seconds when --gancho gives one (what the chat said, say);
- captioned word by word from whisper (the microphone alone): blocks of up to two lines sitting on the line between
  the play and the camera, each word appearing as it's said, in Klein claro with a glow while it's the one being said,
  then white; a pause or the end of a sentence starts the next block, and a block's layout is set once, so words don't
  shift as they come in; friends' names come out as in the lives' transcripts;
- levelled to -14 LUFS, the shorts' outro (Videos\\Shorts\\Partes\\outro-editado.mp4, montagem.py) after it;
- encoded for Instagram and YouTube Shorts (H.264, AAC, the index up front) as
  Videos\\Shorts\\prontos\\<date> <time> - <play>.mp4. Over 60 s is said, not cut.

Shorts already made are skipped; the takes stay until Luan has posted them. A take's "(com jogo)" copy (the
game's sound put back by som_do_jogo.py) is used instead of it when there is one.
"""

import argparse
import array
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
STAGE = (1080, 1056)
OUTRO = SHORTS / "Partes" / "outro-editado.mp4"
LOCKUP = Path(__file__).resolve().parent.parent / "brand" / "logo" / "lockup.svg"
LOGO_AT = (0, 1104)  # montagem.py's: over the camera's cut "anlartins"
KLEIN = "0x002FA7"
MIC, ALL = 1, 0  # audio streams, from 0
BLOCK_CHARS = 34  # about two lines at the captions' size


def probe(file, *args):
    out = run(FFMPEG / "ffprobe.exe", "-v", "error", *args, "-of", "json", to_windows(file), capture_output=True, text=True).stdout
    return json.loads(out)


def bars(file, start, end):
    """(top, bottom) of the game's picture within the stage: rows that stay the same through the play (the browser's
    tabs and address bar, the taskbar) are not the game. The whole stage when nothing is found."""
    rows = []
    for i in range(8):
        at = start + (end - start) * (i + 0.5) / 8
        raw = run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-ss", f"{at:.3f}", "-i", to_windows(file),
                  "-frames:v", "1", "-vf", f"crop={STAGE[0]}:{STAGE[1]}:0:0,scale=270:{STAGE[1]},format=gray",
                  "-f", "rawvideo", "-", capture_output=True).stdout
        pixels = array.array("B", raw)
        rows.append([sum(pixels[y * 270:(y + 1) * 270]) / 270 for y in range(STAGE[1])])
    moving = [max(r[y] for r in rows) - min(r[y] for r in rows) > 1.5 for y in range(STAGE[1])]
    top = next((y for y, m in enumerate(moving) if m), 0)
    bottom = STAGE[1] - next((y for y, m in enumerate(reversed(moving)) if m), 0)
    # Only bands worth cutting, and never most of the picture (a play paused all along moves nowhere).
    top = top if 20 <= top < STAGE[1] // 4 else 0
    bottom = bottom if STAGE[1] * 3 // 4 < bottom <= STAGE[1] - 20 else STAGE[1]
    return top, bottom


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


def captions(said, hook=None):
    """An ASS subtitle file: blocks of up to two lines, built word by word as he says them, just above the seam."""
    blocks, block = [], []
    for word in said:
        if block and (len(" ".join(w for _, _, w in block + [word])) > BLOCK_CHARS
                      or word[0] - block[-1][1] > 0.6 or block[-1][2][-1] in ".?!"):
            blocks.append(block)
            block = []
        block.append(word)
    if block:
        blocks.append(block)
    hidden = "{\\alpha&HFF&}"  # there but invisible, so the block's lines are laid out once
    white = "{\\alpha&H00&\\c&HF7F5F4&}"
    klein_claro = "{\\alpha&H00&\\c&HFFA785&}"
    # The glow: only the word being said, its outline wide, blurred and half seen, flaring as it comes in.
    glow = "{\\alpha&HFF&\\3a&H70&\\3c&HFFA785&\\bord22\\blur10\\t(0,160,\\bord14)}"
    events = []
    for n, block in enumerate(blocks):
        # The block ends when the next one starts at the latest, so two blocks never share the seam.
        last = block[-1][1] + 0.4
        if n + 1 < len(blocks):
            last = min(last, blocks[n + 1][0][0])
        for i, (start, end, _) in enumerate(block):
            until = block[i + 1][0] if i + 1 < len(block) else last
            at = f"{ass_time(start)},{ass_time(max(until, start + 0.05))}"
            behind = " ".join((glow if j == i else "{\\alpha&HFF&\\3a&HFF&}") + w for j, (_, _, w) in enumerate(block))
            text = " ".join((white if j < i else klein_claro if j == i else hidden) + w for j, (_, _, w) in enumerate(block))
            # Sitting on the seam from above: the camera's corner (the wordmark) stays clear.
            events.append(f"Dialogue: 0,{at},Legenda,,0,0,0,,{{\\an2\\pos(540,{SEAM - 18})}}{behind}")
            events.append(f"Dialogue: 1,{at},Legenda,,0,0,0,,{{\\an2\\pos(540,{SEAM - 18})}}{text}")
    if hook:
        events.append(f"Dialogue: 1,{ass_time(0)},{ass_time(2.4)},Gancho,,0,0,0,,{{\\pos(540,330)\\fad(0,200)}}{hook}")
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,Space Grotesk,70,&H00F7F5F4,&H00F7F5F4,&H00A72F00,&H00A72F00,-1,0,0,0,100,100,0,0,1,9,0,5,70,70,0,1
Style: Gancho,Space Grotesk,58,&H00F7F5F4,&H00F7F5F4,&H00A72F00,&H00A72F00,-1,0,0,0,100,100,0,0,3,24,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"


def plan():
    """(take, start, end, title, output) for each play of each take not made yet."""
    for take in sorted(SHORTS.glob("*.mp4")) if SHORTS.exists() else []:
        found = TAKE.match(take.name)
        if not found:
            continue
        with_game = take.with_name(f"{take.stem} (com jogo).mp4")
        take = with_game if with_game.exists() else take
        for n, (start, end, title) in enumerate(chapters(take), 1):
            name = re.sub(r'[<>:"/\\|?*]', "", title.replace(" · ", " - ")).strip() or f"Short {n}"
            yield take, start, end, title, READY / f"{found[1]} {found[2]} - {name}.mp4"


def make(take, start, end, out, hook=None, cut_bars=True):
    cut = speech(take, start, end)
    if not cut:
        print("      sem fala no microfone: pulado")
        return
    start, end = cut
    said = words(take, start, end)
    # A page that sits still (the "Navegador" scene) would read as bars: those takes skip it.
    top, bottom = bars(take, start, end) if cut_bars else (0, STAGE[1])
    # The subtitles filter takes paths relative to C:\\ (run's working directory), sparing ffmpeg's escaping of "C:".
    work = TEMP / "muanlartins-short"
    work.mkdir(exist_ok=True)
    shutil.copy(FONT, work / FONT.name)
    (work / "legenda.ass").write_text(captions(said, hook), encoding="utf-8")
    subprocess.run(["resvg", "-w", "330", str(LOCKUP), str(work / "lockup.png")], check=True)
    rel = to_windows(work).split(":\\", 1)[1].replace("\\", "/")
    length = end - start
    w, h = STAGE
    graph = [
        f"[0:v]split[base][g]",
        f"[g]crop={w}:{bottom - top}:0:{top},scale=-2:{h}:flags=lanczos,crop={w}:{h}[game]",
        "[base][game]overlay=0:0[v1]",
        f"color=c={KLEIN}:s=360x96:d={length:.3f}[plate]",
        f"[v1][plate]overlay={LOGO_AT[0]}:{LOGO_AT[1]}[v2]",
        f"[v2][2:v]overlay={LOGO_AT[0] + 4}:{LOGO_AT[1] - 3}[v3]",
        f"[v3]subtitles={rel}/legenda.ass:fontsdir={rel},fps=60,format=yuv420p,setsar=1[pv]",
        f"[0:a:{ALL}]loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
        f"afade=t=out:st={length - 0.05:.3f}:d=0.05[pa]",
        "[1:v]fps=60,format=yuv420p,setsar=1[ov]",
        "[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[oa]",
        "[pv][pa][ov][oa]concat=n=2:v=1:a=1[v][a]",
    ]
    READY.mkdir(parents=True, exist_ok=True)
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}",
        "-i", to_windows(take), "-i", to_windows(OUTRO), "-i", to_windows(work / "lockup.png"),
        "-filter_complex", ";".join(graph), "-map", "[v]", "-map", "[a]", "-map_chapters", "-1", "-map_metadata", "-1",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "60",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", to_windows(out))
    shutil.rmtree(work)
    if top or bottom < STAGE[1]:
        print(f"      barras do navegador cortadas: jogo entre y {top} e {bottom}")
    print(f"      {length:.0f} s + outro, {len(said)} palavras{'  (passou de 60 s)' if length > 60 else ''}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="make the shorts (without it, only show)")
    parser.add_argument("--gancho", help="a line on top for the first seconds (each short made in this run)")
    parser.add_argument("--sem-barras", action="store_true",
                        help="don't look for browser bars (takes from the \"Navegador\" scene: the site, still)")
    args = parser.parse_args()
    todo = [each for each in plan() if not each[4].exists()]
    for take, start, end, title, out in todo:
        print(f"short  {take.name} {start:.0f}–{end:.0f} s ({title or 'sem capítulo'})  →  prontos\\{out.name}")
        if args.apply:
            make(take, start, end, out, args.gancho, not args.sem_barras)
    if not todo:
        print("Nenhum take novo em Videos\\Shorts.")
    elif not args.apply:
        print("(nada foi feito: rode com --apply)")


if __name__ == "__main__":
    main()
