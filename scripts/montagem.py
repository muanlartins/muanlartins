"""The edited outros: the parts Luan records once and every commented video and short ends with.

    python3 scripts/montagem.py            # what it would make
    python3 scripts/montagem.py --apply    # make them (again, over the old ones)

Luan records the parts in OBS (brand/twitch/obs_video.py's scene "Intro e outro", obs_shorts.py's "Final"); they live
in Videos\\Comentados\\Partes and Videos\\Shorts\\Partes, the raws as "… (bruto).mp4". This adds what's on screen, the
same way every time:

- **The live's tech, in motion:** a few seconds of a live's own recording (the crowd jumping at one of Luan's goals,
  the GOOOL! banner with its speed, the live captions over the stand, him celebrating on camera), cut from
  `CLIPS`, each cropped to where it happens. The stand's fans' names are blurred and the crops leave out the
  game's player names and the chat: nobody else's name goes in a video.
- **Long outro** (1920×1080): the montage as a framed picture beside him while he says "um monte de tecnologia",
  its own sound low under his voice; "twitch.tv/muanlartins" as he says "dá uma conferida lá", "muanlartins.com.br"
  as he says "acessa meu site".
- **Shorts' outro** (1080×1920): cut from the raw to 0.6 s before he speaks, so it never starts on dead air; the
  montage fills the top, opening on the goal with its sound up and a synthesised hit, then ducked under his voice
  (sidechain) and back a little on the smile; "ao vivo na Twitch" and a big "muanlartins.com.br" card as he says it.
  The camera's crop cuts the background's logo to "anlartins": the full wordmark covers it.

Callouts are ASS subtitles in Space Grotesk (brand/fonts), drawn by Windows' ffmpeg like shorts.py's captions, in
Klein, Klein claro and Branco. The timings are each part's own, measured once with whisper (-ml 1): a new recording
of a part means new timings here.
"""

import argparse
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from live import FFMPEG
from windows import TEMP, VIDEOS, run, to_windows

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "brand" / "fonts" / "SpaceGrotesk.ttf"
LOCKUP = ROOT / "brand" / "logo" / "lockup.svg"
PARTS = VIDEOS / "Comentados" / "Partes"
SHORT_PARTS = VIDEOS / "Shorts" / "Partes"

# ASS colours are &HAABBGGRR.
KLEIN, CLARO, BRANCO = "&H00A72F00", "&H00FFA785", "&H00F7F5F4"
KLEIN_HEX = "0x002FA7"


@dataclass
class Clip:
    """A moment of a live's recording: from `at` (seconds into it), cropped to `crop` (x, y, w, h, 16:9), with the
    stand's names (`names`, x, y, w, h, inside the crop) blurred."""

    live: Path
    at: float
    crop: tuple[int, int, int, int]
    names: tuple[int, int, int, int] | None


LIVE_1106 = VIDEOS / "Lives" / "2026-11-06" / "14-28-56 Live.mp4"
# 11-06, the overtime aerial goal the chat called "melhor gol da carreira" (match EFD492, goal at 7108.4 s).
CLIPS = [
    # The goal: the ball in, GOOOL! 79 km/h on the stand, the crowd jumping, Luan celebrating on camera. Its sound
    # (the explosion, the live) opens the shorts' outro.
    Clip(LIVE_1106, 7108.25, (180, 250, 1440, 810), (540, 708, 720, 44)),
    # Just before it, the live captions writing themselves over the stand: "Tá, dois passaram, só tem um na
    # defesa." Close on them and the stand; at most 1.35 s, before a player's name tag comes in (7106.4).
    Clip(LIVE_1106, 7105.0, (600, 630, 800, 450), (120, 328, 680, 44)),
    # The win: arms up on camera, the rank card (Diamante I, Hoje 10V · 3D), the captions.
    Clip(LIVE_1106, 7121.3, (0, 180, 1600, 900), (720, 778, 720, 44)),
]


def ass_time(seconds: float) -> str:
    cs = round(seconds * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def ass(width: int, height: int, events: list[str]) -> str:
    # Box styles (BorderStyle 3): the box is the outline's colour, sized to the text; Outline is its padding.
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Rotulo,Space Grotesk,30,{KLEIN},{KLEIN},{CLARO},{CLARO},-1,0,0,0,100,100,2,0,3,10,0,7,0,0,0,1
Style: Grande,Space Grotesk,64,{BRANCO},{BRANCO},{KLEIN},{KLEIN},-1,0,0,0,100,100,0,0,3,18,0,7,0,0,0,1
Style: Cartao,Space Grotesk,88,{KLEIN},{KLEIN},{BRANCO},{BRANCO},-1,0,0,0,100,100,0,0,3,24,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"


def event(start: float, end: float, style: str, text: str, tags: str, layer: int = 0) -> str:
    return f"Dialogue: {layer},{ass_time(start)},{ass_time(end)},{style},,0,0,0,,{{{tags}}}{text}"


def lower_third(start: float, end: float, label: str, text: str, x: int, y: int) -> list[str]:
    """A label over a big line, sliding in from the left and fading out."""
    move = lambda dy: f"\\move({x - 1100},{y + dy},{x},{y + dy},0,280)\\fad(120,220)"
    return [event(start, end, "Rotulo", label.upper(), move(0) + "\\fs38", 1),
            event(start + 0.06, end, "Grande", text, move(78) + "\\fs88", 1)]


def clips_graph(clips: list[tuple[Clip, float]], size: tuple[int, int], frame: int, first: int) -> tuple[str, str]:
    """Filters turning inputs first… (one per clip, already cut to its length) into one framed montage [m] and its
    sound [ma]."""
    parts, labels = [], []
    for i, (clip, _) in enumerate(clips):
        n = first + i
        x, y, w, h = clip.crop
        chain = f"[{n}:v]crop={w}:{h}:{x}:{y}"
        if clip.names:
            bx, by, bw, bh = clip.names
            parts.append(f"{chain},split[c{i}a][c{i}b]")
            parts.append(f"[c{i}b]crop={bw}:{bh}:{bx}:{by},boxblur=luma_radius=10:luma_power=2:chroma_radius=5[c{i}n]")
            parts.append(f"[c{i}a][c{i}n]overlay={bx}:{by},scale={size[0]}:{size[1]}:flags=lanczos,setsar=1,fps=60[c{i}]")
        else:
            parts.append(f"{chain},scale={size[0]}:{size[1]}:flags=lanczos,setsar=1,fps=60[c{i}]")
        parts.append(f"[{n}:a:0]aformat=sample_rates=48000:channel_layouts=stereo[c{i}s]")
        labels.append(f"[c{i}][c{i}s]")
    parts.append(f"{''.join(labels)}concat=n={len(clips)}:v=1:a=1[mv][ma]")
    parts.append(f"[mv]pad={size[0] + 2 * frame}:{size[1] + 2 * frame}:{frame}:{frame}:color={KLEIN_HEX}[m]")
    return ";".join(parts), "[m]"


def clip_inputs(clips: list[tuple[Clip, float]]) -> list[str]:
    args = []
    for clip, length in clips:
        args += ["-ss", f"{clip.at:.3f}", "-t", f"{length:.3f}", "-i", to_windows(clip.live)]
    return args


def work_dir() -> tuple[Path, str]:
    """A folder under Windows' temp with the font, and its path as ffmpeg's subtitles filter wants it (relative to C:)."""
    work = TEMP / "muanlartins-montagem"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir()
    shutil.copy(FONT, work / FONT.name)
    return work, to_windows(work).split(":\\", 1)[1].replace("\\", "/")


def encode(out: Path) -> list[str]:
    return ["-map_metadata", "-1", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", "60",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", to_windows(out)]


def silences(video: Path, track: int) -> list[tuple[float, float]]:
    out = run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-nostats", "-i", to_windows(video), "-map", f"0:a:{track}", "-af",
              "silencedetect=n=-40dB:d=0.4", "-f", "null", "-", capture_output=True, text=True).stderr
    starts = [float(s) for s in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(e) for e in re.findall(r"silence_end: ([\d.]+)", out)]
    return list(zip(starts, ends + [float("inf")] * (len(starts) - len(ends))))


# --- The long outro --------------------------------------------------------------------------------------------

LONG_IN, LONG_OUT = PARTS / "outro.mp4", PARTS / "outro-editado.mp4"
# Its words (whisper on outro.mp4): "Curtiu?" 0.34–0.78 · "Eu faço live na Twitch com um monte de tecnologia que
# você nunca viu igual." 0.78–4.80 · "Dá uma conferida lá." 5.34–6.22 · "Acessa meu site também que tem tudo
# organizadinho." 6.78–8.98 · "Vou estar te esperando." 9.42–10.04 · smiling to 12.0.
LONG_MONTAGE = (1.0, 5.0)
LONG_TWITCH = (5.2, 6.6)
LONG_SITE = (6.7, 10.4)
PIP, PIP_AT, FRAME = (640, 360), (30, 290), 6  # left of him: his head starts at x≈700


def long_outro():
    start, end = LONG_MONTAGE
    length = end - start
    each = [1.4, 1.3, length - 2.7]
    clips = list(zip(CLIPS, each))
    work, rel = work_dir()
    x, y = PIP_AT
    events = [*lower_third(start + 0.05, end, "na live", "", x, y - 64)[:1],
              *lower_third(*LONG_TWITCH, "ao vivo na Twitch", "twitch.tv/muanlartins", 64, 800),
              *lower_third(*LONG_SITE, "tudo organizado em", "muanlartins.com.br", 64, 800)]
    (work / "outro.ass").write_text(ass(1920, 1080, events), encoding="utf-8")
    graph, montage = clips_graph(clips, PIP, FRAME, 1)
    slide = f"if(lt(t-{start},0.3),{x}-pow(1-(t-{start})/0.3,3)*700,{x})"
    graph += (f";{montage}format=yuva420p,fade=t=in:st=0:d=0.15:alpha=1,fade=t=out:st={length - 0.2:.2f}:d=0.2:alpha=1,"
              f"setpts=PTS-STARTPTS+{start}/TB[pip]"
              f";[0:v][pip]overlay=x='{slide}':y={y}:eof_action=pass[v1]"
              f";[v1]subtitles={rel}/outro.ass:fontsdir={rel}[v]"
              # The montage's own sound, low under his voice.
              f";[ma]volume=0.16,afade=t=in:d=0.25,afade=t=out:st={length - 0.4:.2f}:d=0.4,"
              f"adelay={int(start * 1000)}:all=1[bed]"
              f";[0:a:0][bed]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84,volume=-1dB[a]")
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-i", to_windows(LONG_IN), *clip_inputs(clips),
        "-filter_complex", graph, "-map", "[v]", "-map", "[a]", *encode(LONG_OUT))
    shutil.rmtree(work)


# --- The shorts' outro -----------------------------------------------------------------------------------------

SHORT_RAW = SHORT_PARTS / "2026-11-06 18-31-52 outro (bruto).mp4"
SHORT_OUT = SHORT_PARTS / "outro-editado.mp4"
MIC = 1  # the raw's tracks: 1 Tudo, 2 Microfone, 3 Estúdio
BEFORE = 0.6  # of the glasses push before he speaks
SMILE = 1.3  # after he stops
STAGE = 1056  # the top, plain Klein in the "Final" scene
MONTAGE, MONTAGE_AT = (1000, 563), (34, 190)
LOGO_AT = (0, 1104)  # over the camera's cut "anlartins"


def short_outro():
    quiet = silences(SHORT_RAW, MIC)
    speech = quiet[0][1]  # the first silence ends where he starts
    stops = next(s for s, _ in reversed(quiet) if s > speech)
    cut_from, cut_to = speech - BEFORE, stops + SMILE
    length = cut_to - cut_from
    talking = (BEFORE, stops - cut_from)
    each = [1.5, 1.35, length - 2.85]
    clips = list(zip(CLIPS, each))
    work, rel = work_dir()
    subprocess.run(["resvg", "-w", "330", str(LOCKUP), str(work / "lockup.png")], check=True)
    events = [
        event(0, length, "Rotulo", "● AO VIVO NA TWITCH", "\\an8\\pos(540,92)\\fs40\\fad(0,0)", 1),
        event(talking[0] + 0.1, length, "Cartao", "muanlartins.com.br",
              "\\an5\\pos(540,880)\\fscx70\\fscy70\\t(0,180,\\fscx104\\fscy104)\\t(180,280,\\fscx100\\fscy100)\\fad(100,0)", 1),
        event(talking[0] + 0.1, length, "Rotulo", "TUDO NO SITE", "\\an2\\pos(540,800)\\fs34\\fad(150,0)", 1),
    ]
    (work / "final.ass").write_text(ass(1080, 1920, events), encoding="utf-8")
    graph, montage = clips_graph(clips, MONTAGE, FRAME, 1)
    logo = 1 + len(clips)
    hit = (f"sine=f=52:d=0.5,volume='0.9*exp(-9*t)':eval=frame[h1];"
           f"anoisesrc=d=0.35:c=pink:a=0.6,lowpass=f=2400,volume='if(lt(t,0.02),t/0.02,exp(-14*(t-0.02)))':eval=frame[h2];"
           f"[h1][h2]amix=inputs=2:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[hit]")
    graph += (f";[0:v][{montage[1:-1]}]overlay={MONTAGE_AT[0]}:{MONTAGE_AT[1]}[v1]"
              # The full wordmark on a Klein plate, over the cut one.
              f";color=c={KLEIN_HEX}:s=360x96:d={length:.3f},format=yuva420p[plate]"
              f";[v1][plate]overlay={LOGO_AT[0]}:{LOGO_AT[1]}[v2]"
              f";[v2][{logo}:v]overlay={LOGO_AT[0] + 4}:{LOGO_AT[1] - 3}[v3]"
              f";[v3]subtitles={rel}/final.ass:fontsdir={rel}[v]"
              f";[0:a:{MIC}]loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,"
              f"afade=t=out:st={length - 0.3:.2f}:d=0.3,asplit[voice][key]"
              # The goal's sound up before he speaks, then under him (and back, a little, on the smile).
              f";[ma]volume='if(lt(t,{BEFORE - 0.05}),1.8,0.6)':eval=frame,afade=t=out:st={length - 0.4:.2f}:d=0.4[bedv]"
              f";[bedv][key]sidechaincompress=threshold=0.015:ratio=14:attack=12:release=380[bed]"
              f";{hit};[voice][bed][hit]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.84,volume=-1.9dB[a]")
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", f"{cut_from:.3f}", "-to", f"{cut_to:.3f}", "-i", to_windows(SHORT_RAW), *clip_inputs(clips),
        "-i", to_windows(work / "lockup.png"),
        "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-t", f"{length:.3f}", *encode(SHORT_OUT))
    shutil.rmtree(work)
    return cut_from, cut_to


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="make them (without it, only show)")
    args = parser.parse_args()
    for source, out in [(LONG_IN, LONG_OUT), (SHORT_RAW, SHORT_OUT)]:
        print(f"{'ok   ' if source.exists() else 'falta'} {source.name}  →  {out.parent.parent.name}\\{out.parent.name}\\{out.name}")
    for clip in CLIPS:
        print(f"clip  {clip.live.parent.name} {clip.live.name} {clip.at:.2f} s{'' if clip.live.exists() else '  (falta)'}")
    if not args.apply:
        print("(nada feito: rode com --apply)")
        return
    long_outro()
    print(f"feito {LONG_OUT.name}")
    cut_from, cut_to = short_outro()
    print(f"feito {SHORT_OUT.name} ({cut_from:.2f}–{cut_to:.2f} s do bruto)")


if __name__ == "__main__":
    main()
