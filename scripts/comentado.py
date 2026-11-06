"""A commented video, ready for YouTube, from a take Luan recorded with RLR's studio (OBS's "Vídeo" profile):

    python3 scripts/comentado.py "<take>.mp4" --gancho 17:15.0-17:21.8             # what it would make
    python3 scripts/comentado.py "<take>.mp4" --gancho 17:15.0-17:21.8 --apply     # make it

The take is Videos\\Comentados\\<date> <time> comentado.mp4 (or its "(com jogo)" copy, with the game's sound put
back by som_do_jogo.py, which is preferred when it exists). The video is, in order:

1. the hook: the strongest few seconds, picked by Luan (--gancho, in the take's time), ending on a quick flash;
2. the intro, recorded once (Videos\\Comentados\\Partes\\intro.mp4);
3. the commentary: the whole take, trimmed to just before his first word and just after his last (the microphone's
   silence), so the start of the take (setting up the studio) and the end (stopping OBS) go;
4. the outro, recorded once and edited by montagem.py (Partes\\outro-editado.mp4), which leaves room for YouTube's
   end screen.

Sound: track 1 (his voice and, in the "(com jogo)" copy, the game under it), levelled to -14 LUFS; --bip covers a
word with a tone. Encoded with NVENC on Windows (it's long) as Videos\\Comentados\\prontos\\<take>.mp4, with the
chapters it was given (--capitulo "17:15 O gol", take time) moved to the video's time and printed for YouTube's
description. Nothing is deleted.
"""

import argparse
import json
import re
import subprocess
from pathlib import Path

from live import FFMPEG
from windows import TEMP, VIDEOS, run, to_windows

COMMENTED = VIDEOS / "Comentados"
PARTS = COMMENTED / "Partes"
READY = COMMENTED / "prontos"
INTRO = PARTS / "intro.mp4"
OUTRO = PARTS / "outro-editado.mp4"
MIC, ALL = 1, 0  # audio streams, from 0
PAD = 0.35  # kept around his first and last words
FLASH = 0.12  # the hook's last frames fade to white


def seconds(text: str) -> float:
    """"17:15.2", "1:02:03" or "1035.2"."""
    total = 0.0
    for part in text.split(":"):
        total = total * 60 + float(part)
    return total


def clock(t: float) -> str:
    t = int(t)
    return f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}" if t >= 3600 else f"{t // 60}:{t % 60:02d}"


def duration(file: Path) -> float:
    out = run(FFMPEG / "ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "json",
              to_windows(file), capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def speech(file: Path) -> tuple[float, float]:
    """From his first word to his last, by silence on the microphone's track."""
    log = run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-i", to_windows(file), "-map", f"0:a:{MIC}",
              "-af", "silencedetect=n=-40dB:d=0.6", "-f", "null", "-", capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    length = duration(file)
    first = ends[0] if starts and starts[0] < 0.05 and ends else 0.0
    last = starts[-1] if starts and (len(ends) < len(starts) or ends[-1] >= length - 0.05) else length
    return max(0.0, first - PAD), min(length, last + PAD)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("take", type=Path)
    parser.add_argument("--gancho", required=True, help="the hook, in the take's time: 17:15.0-17:21.8")
    parser.add_argument("--bip", action="append", default=[], help="a word to cover, take time: 17:18.3-17:19.2")
    parser.add_argument("--capitulo", action="append", default=[], help='"17:15 O gol" (take time)')
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    take = args.take if args.take.is_absolute() else COMMENTED / args.take
    with_game = take.with_name(f"{take.stem} (com jogo).mp4")
    if with_game.exists():
        take = with_game
    hook = [seconds(x) for x in args.gancho.split("-")]
    beeps = [[seconds(x) for x in b.split("-")] for b in args.bip]
    start, end = speech(take)
    intro, outro = duration(INTRO), duration(OUTRO)
    lead = (hook[1] - hook[0]) + intro  # where the take's `start` lands in the video
    total = lead + (end - start) + outro

    print(f"take     {take.name}")
    print(f"gancho   {clock(hook[0])}–{clock(hook[1])} ({hook[1] - hook[0]:.1f} s)")
    print(f"intro    {intro:.1f} s")
    print(f"análise  {clock(start)}–{clock(end)} ({(end - start) / 60:.1f} min)")
    print(f"outro    {outro:.1f} s")
    print(f"total    {clock(total)}")
    chapters = [(0.0, "Gancho"), (hook[1] - hook[0], "Intro")]
    for chapter in args.capitulo:
        when, name = chapter.split(" ", 1)
        chapters.append((lead + seconds(when) - start, name))
    chapters.append((lead + end - start, "Até a próxima"))
    print("\nCapítulos (descrição do YouTube; o primeiro tem que ser 0:00):")
    for when, name in sorted(chapters):
        print(f"{clock(when)} {name}")

    out = READY / take.name.replace(" (com jogo)", "")
    if not args.apply:
        print(f"\n→ prontos\\{out.name} (nada foi feito: rode com --apply)")
        return
    READY.mkdir(exist_ok=True)

    def beeped(n, label, offset):
        """Input n's track 1 (the take from `offset`), with --bip's words covered by a tone."""
        if not beeps:
            return f"[{n}:a:{ALL}]"
        cover = "+".join(f"between(t+{offset},{a},{b})" for a, b in beeps)
        return (f"[{n}:a:{ALL}]volume=enable='{cover}':volume=0[{label}m];"
                f"sine=f=1000:r=48000,volume=0.2,aformat=channel_layouts=stereo,"
                f"volume=enable='not({cover})':volume=0[{label}t];[{label}m][{label}t]amix=2:duration=first:normalize=0")

    video = "scale=1920:1080,fps=60,format=yuv420p,setsar=1"
    audio = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
    level = "loudnorm=I=-14:TP=-1.5:LRA=11"
    h0, h1 = hook
    # Each part is its own input, seeked to where it starts: one input split two ways would hold every frame from the
    # take's start until the later part is reached.
    graph = ";".join([
        f"[0:v]{video},fade=t=out:st={h1 - h0 - FLASH}:d={FLASH}:color=white[hv]",
        f"{beeped(0, 'h', h0)},{level},{audio},afade=t=in:d=0.05,afade=t=out:st={h1 - h0 - 0.08}:d=0.08[ha]",
        f"[1:v]{video}[iv]", f"[1:a]{audio}[ia]",
        f"[2:v]{video}[bv]",
        f"{beeped(2, 'b', start)},{level},{audio},afade=t=in:d=0.1[ba]",
        f"[3:v]{video}[ov]", f"[3:a]{audio}[oa]",
        "[hv][ha][iv][ia][bv][ba][ov][oa]concat=n=4:v=1:a=1[c][a]", "[c]format=yuv420p[v]",
    ])
    # The tone's sine has no end: amix stops with the take's track.
    temp = TEMP / "comentado.mp4"
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-stats", "-y",
        "-ss", f"{h0:.3f}", "-to", f"{h1:.3f}", "-i", to_windows(take), "-i", to_windows(INTRO),
        "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", to_windows(take), "-i", to_windows(OUTRO),
        "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-map_chapters", "-1", "-map_metadata", "-1",
        "-c:v", "h264_nvenc", "-pix_fmt", "yuv420p", "-preset", "p6", "-tune", "hq", "-rc", "vbr", "-cq", "19", "-b:v", "0",
        "-profile:v", "high", "-bf", "2", "-g", "120", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        to_windows(temp))
    temp.replace(out)
    print(f"\n{out}  {duration(out) / 60:.1f} min")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(f"ffmpeg falhou ({error.returncode})")
