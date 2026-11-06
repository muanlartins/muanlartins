"""The edited outros: the parts Luan records once and every commented video and short ends with.

    python3 scripts/montagem.py            # what it would make
    python3 scripts/montagem.py --apply    # make them (again, over the old ones)

Luan records the parts in OBS (brand/twitch/obs_video.py's scene "Intro e outro", obs_shorts.py's "Final"); they live
in Videos\\Comentados\\Partes and Videos\\Shorts\\Partes, the raws as "… (bruto).mp4". This adds what's on screen, the
same way every time:

- **Long outro** (1920×1080): his voice alone; "twitch.tv/muanlartins" as he says "dá uma conferida lá",
  "muanlartins.com.br" as he says "acessa meu site", sliding in as lower thirds. It ends `TAIL` s after his last
  word, fading out picture and sound (no frozen smile).
- **Shorts' outro** (1080×1920): cut from the raw to `BEFORE` s before he speaks, so it never starts on dead air. The
  top, plain Klein in the "Final" scene, gets:
  - his poses from a live, flashing: `POSES`, ~0.5 s of real motion each from the camera's own recording, hard cuts
    with a white flash and a small scale punch, inside the live's camera frame (public/stream/stream.js's frame():
    the Klein band cut at two corners, the lattice, the Klein claro inner line, the streaks running round, the
    glint) with its plate, "muanlartins.com.br", on the bottom edge (plate(), ".com.br" in Klein claro);
  - under it, `SITE`, what's on the site, popping in one by one across his line;
  - the "● AO VIVO NA TWITCH" chip at the top, and the full wordmark over the camera's cut "anlartins".
  Sound: his voice, a synthesised hit on the first frame and a light tick on each cut. Nothing from the game.

The long outro's callouts are ASS subtitles in Space Grotesk, drawn by Windows' ffmpeg like shorts.py's captions.
The shorts' top is SVG, one per frame, drawn with the brand's own text outlines (brand/build.py's wordmark(), from
brand/.venv) and rendered by resvg. The timings are each part's own, measured once with whisper (-ml 1): a new
recording of a part means new timings here.
"""

import argparse
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

from live import FFMPEG
from windows import TEMP, VIDEOS, run, to_windows

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "brand" / "fonts" / "SpaceGrotesk.ttf"
LOCKUP = ROOT / "brand" / "logo" / "lockup.svg"
MARK = ROOT / "public" / "brand" / "mark-small-clear.svg"
PARTS = VIDEOS / "Comentados" / "Partes"
SHORT_PARTS = VIDEOS / "Shorts" / "Partes"

KLEIN, CLARO, BRANCO = "#002fa7", "#85a7ff", "#f4f5f7"
# On a Klein ground the live's frame darkens its band to navy (frame()'s `fill`), so it still reads as a frame.
NAVY = "#001447"
# ASS colours are &HAABBGGRR.
ASS_KLEIN, ASS_CLARO, ASS_BRANCO = "&H00A72F00", "&H00FFA785", "&H00F7F5F4"

# What's on the site, in the shorts' outro: Luan's to rename, reorder, add to or cut.
SITE = ["Lives ao vivo", "Vídeos comentados", "Ranked ao vivo", "Sua torcida na live"]

CAMERA_1106 = VIDEOS / "Lives" / "2026-11-06" / "14-28-56 Câmera.mkv"
# His poses, flashing in the shorts' outro: (camera file, second it starts, pose). The camera's file runs on the
# live's clock (Live.mp4's second, within a few frames). From 11-06, picked on 10 fps contact sheets: sharp faces.
POSES = [
    (CAMERA_1106, 7121.95, "braços para cima: a vitória do gol da carreira"),
    (CAMERA_1106, 4353.00, "gargalhada"),
    (CAMERA_1106, 2083.20, "punho na testa, rindo (gol)"),
    (CAMERA_1106, 2709.95, "mão na boca, surpreso"),
    (CAMERA_1106, 4131.85, "palmas sobre a cabeça (gol)"),
    (CAMERA_1106, 4355.90, "mãos na cabeça, sem acreditar"),
    (CAMERA_1106, 5947.45, "punho para cima, rindo (gol)"),
    (CAMERA_1106, 5315.95, "braços para cima (gol)"),
]


def ass_time(seconds: float) -> str:
    cs = round(seconds * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


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
# organizadinho." 6.78–8.98 · "Vou estar te esperando." 9.42–10.04.
LAST_WORD = 10.04
TAIL, FADE = 0.6, 0.35
LONG_TWITCH = (5.2, 6.6)
LONG_SITE = (6.7, LAST_WORD + TAIL)


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
Style: Rotulo,Space Grotesk,38,{ASS_KLEIN},{ASS_KLEIN},{ASS_CLARO},{ASS_CLARO},-1,0,0,0,100,100,2,0,3,10,0,7,0,0,0,1
Style: Grande,Space Grotesk,88,{ASS_BRANCO},{ASS_BRANCO},{ASS_KLEIN},{ASS_KLEIN},-1,0,0,0,100,100,0,0,3,18,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"


def lower_third(start: float, end: float, label: str, text: str, x: int, y: int) -> list[str]:
    """A label over a big line, sliding in from the left and fading out."""
    def line(at, style, words, dy):
        tags = f"\\move({x - 1100},{y + dy},{x},{y + dy},0,280)\\fad(120,220)"
        return f"Dialogue: 1,{ass_time(at)},{ass_time(end)},{style},,0,0,0,,{{{tags}}}{words}"
    return [line(start, "Rotulo", label.upper(), 0), line(start + 0.06, "Grande", text, 78)]


def long_outro():
    length = LAST_WORD + TAIL
    work, rel = work_dir()
    events = [*lower_third(*LONG_TWITCH, "ao vivo na Twitch", "twitch.tv/muanlartins", 64, 800),
              *lower_third(*LONG_SITE, "tudo organizado em", "muanlartins.com.br", 64, 800)]
    (work / "outro.ass").write_text(ass(1920, 1080, events), encoding="utf-8")
    fade = length - FADE
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y", "-t", f"{length:.3f}", "-i", to_windows(LONG_IN),
        "-vf", f"subtitles={rel}/outro.ass:fontsdir={rel},fade=t=out:st={fade:.3f}:d={FADE}",
        "-af", f"afade=t=out:st={fade:.3f}:d={FADE}", *encode(LONG_OUT))
    shutil.rmtree(work)


# --- The shorts' outro -----------------------------------------------------------------------------------------

SHORT_RAW = SHORT_PARTS / "2026-11-06 18-31-52 outro (bruto).mp4"
SHORT_OUT = SHORT_PARTS / "outro-editado.mp4"
MIC = 1  # the raw's tracks: 1 Tudo, 2 Microfone, 3 Estúdio
BEFORE = 0.6  # of the glasses push before he speaks
SMILE = 1.3  # after he stops
FPS = 60
TOP = (1080, 1056)  # the plain Klein of the "Final" scene, over the camera
S = 1.5  # the live's frame is drawn for a 480×270 camera; this one is 720×405
HOLE = (180, 150, 720, 405)  # where the poses play
BAND = round(12 * S)
LIST_AT = (162, 668)  # the list's heading baseline; items under it
LOGO_AT = (0, 1104)  # over the camera's cut "anlartins"


def outlines(texts: list[tuple[str, int, float]]) -> list[dict]:
    """Each (text, weight, size) as brand/build.py outlines the wordmark: SVG path data (baseline at 0), width."""
    code = ("import json, sys, build\n"
            "out = []\n"
            "for text, weight, size in json.loads(sys.argv[1]):\n"
            "    d, w, xh, asc = build.wordmark(text, weight, size)\n"
            "    out.append({'d': d, 'w': w})\n"
            "print(json.dumps(out))")
    brand = ROOT / "brand"
    result = subprocess.run([str(brand / ".venv" / "bin" / "python"), "-c", code, json.dumps(texts)], cwd=brand,
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def ease(p: float, x1=0.65, y1=0.0, x2=0.35, y2=1.0) -> float:
    """CSS's cubic-bezier(x1, y1, x2, y2) at progress p (the live's --ease)."""
    if p <= 0 or p >= 1:
        return min(max(p, 0.0), 1.0)
    bez = lambda t, a, b: 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if bez(mid, x1, x2) < p else (lo, mid)
    return bez((lo + hi) / 2, y1, y2)


def out_cubic(p: float) -> float:
    p = min(max(p, 0.0), 1.0)
    return 1 - (1 - p) ** 3


def octagon(x0, y0, x1, y1, c):
    return f"M{x0 + c:.2f} {y0:.2f}H{x1:.2f}V{y1 - c:.2f}L{x1 - c:.2f} {y1:.2f}H{x0:.2f}V{y0 + c:.2f}Z"


class Top:
    """The shorts' outro's top, frame by frame: chip, the camera frame and its plate, the site's list."""

    def __init__(self, length: float, cuts: list[float], talking: tuple[float, float]):
        self.length, self.cuts = length, cuts
        x, y, w, h = HOLE
        t = BAND
        self.cut = 2 * t
        self.inner_cut = t * math.sqrt(2)
        self.outer = octagon(-t, -t, w + t, h + t, self.cut)
        self.inner = octagon(0, 0, w, h, self.inner_cut)
        mc = (self.cut + self.inner_cut) / 2
        self.middle = octagon(-t / 2, -t / 2, w + t / 2, h + t / 2, mc)
        # The middle octagon's length, for the streaks' dashes (the live's are in pathLength="1000").
        self.lap = 2 * (w + t) + 2 * (h + t) - 4 * mc + 2 * mc * math.sqrt(2)
        texts = [("muanlartins", 500, 24 * S), (".com.br", 500, 24 * S), ("AO VIVO NA TWITCH", 600, 30),
                 ("NO SITE", 600, 28)] + [(f"{i + 1:02d}", 600, 28) for i in range(len(SITE))] + [(s, 500, 46) for s in SITE]
        shapes = outlines(texts)
        self.name, self.domain, self.chip, self.heading = shapes[:4]
        self.numbers = shapes[4:4 + len(SITE)]
        self.items = shapes[4 + len(SITE):]
        mark = MARK.read_text()
        self.mark = mark[mark.index(">") + 1:mark.rindex("</svg>")]
        # The list pops in across his line, the heading first.
        start, end = talking[0] + 0.1, max(talking[1] - 0.7, talking[0] + 0.6)
        step = (end - start) / max(1, len(SITE) - 1)
        self.heading_at = start - 0.1
        self.items_at = [start + 0.05 + i * step for i in range(len(SITE))]

    def frame_svg(self, now: float) -> str:
        x, y, w, h = HOLE
        t = BAND
        parts = []
        # The chip.
        cw = self.chip["w"] + 34 + 40
        cx = (TOP[0] - cw) / 2
        parts.append(f'<rect x="{cx:.1f}" y="44" width="{cw:.1f}" height="52" fill="{CLARO}"/>'
                     f'<circle cx="{cx + 26:.1f}" cy="70" r="7" fill="{KLEIN}"/>'
                     f'<path transform="translate({cx + 46:.1f} 81)" d="{self.chip["d"]}" fill="{KLEIN}"/>')
        # The camera frame: the band, its lattice, two streaks a lap apart, the glint, the inner line.
        streaks = []
        lap_seconds = 4.5
        for color, start in ((BRANCO, 0), (CLARO, -500)):
            for length, opacity in ((70, 1), (180, 0.45), (340, 0.15)):
                frm = start + length - 70
                offset = (frm - 1000 * (now / lap_seconds)) * self.lap / 1000
                dash = length * self.lap / 1000
                streaks.append(f'<path d="{self.middle}" fill="none" stroke="{color}" stroke-opacity="{opacity}" '
                               f'stroke-width="{t * 0.34:.2f}" stroke-dasharray="{dash:.2f} {self.lap - dash:.2f}" '
                               f'stroke-dashoffset="{offset:.2f}"/>')
        sheen = 90 * S
        reach = w + h + 4 * t
        g_from, g_to = -sheen - t, (w + h) / 2 + t
        glint = g_from
        for at in (0.25, 2.7):  # it crosses the band twice
            if at <= now <= at + 1.3:
                glint = g_from + (g_to - g_from) * ease((now - at) / 1.3)
        flash = 0.0
        for c in self.cuts:
            frame_no = round((now - c) * FPS)
            if frame_no == 0:
                flash = 0.75
            elif frame_no == 1:
                flash = 0.35
        parts.append(f'''<g transform="translate({x} {y})">
  <defs>
    <pattern id="l" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0L12 12M0 12L12 0" stroke="{CLARO}" stroke-opacity="0.3" stroke-width="1"/></pattern>
    <clipPath id="c"><path d="{self.outer}{self.inner}" clip-rule="evenodd"/></clipPath>
    <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{sheen}" y2="{sheen}">
      <stop offset="0" stop-color="{BRANCO}" stop-opacity="0"/><stop offset="0.5" stop-color="{BRANCO}" stop-opacity="0.9"/><stop offset="1" stop-color="{BRANCO}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  {f'<path d="{self.inner}" fill="#ffffff" fill-opacity="{flash}"/>' if flash else ''}
  <path d="{self.outer}{self.inner}" fill="{NAVY}" fill-rule="evenodd"/>
  <g clip-path="url(#c)">
    <rect x="{-t}" y="{-t}" width="{w + 2 * t}" height="{h + 2 * t}" fill="url(#l)"/>
    {''.join(streaks)}
    <rect transform="translate({glint:.2f} {glint:.2f})" x="{-reach}" y="{-reach}" width="{2 * reach}" height="{2 * reach}" fill="url(#g)"/>
  </g>
  <path d="{self.inner}" fill="none" stroke="{CLARO}" stroke-opacity="0.7" stroke-width="{1.5 * S:.2f}"/>
</g>''')
        # The plate, straddling the bottom edge flush with the frame's left, wiping in along its cut.
        ph, mark, pad_l, gap, pad_r = 52 * S, 40 * S, 14 * S, 12 * S, 72 * S
        pw = pad_l + mark + gap + self.name["w"] + self.domain["w"] + pad_r
        px, py = x - t, y + h + t - ph / 2
        p = ease((now - 0.1) / 0.8)
        if p > 0:
            base = py + ph / 2 + 0.36 * 24 * S
            tx = px + pad_l + mark + gap
            parts.append(f'''<clipPath id="p"><polygon points="0,0 {pw * p:.1f},0 {pw * p - ph:.1f},{ph} 0,{ph}"/></clipPath>
<g transform="translate({px:.1f} {py:.1f})" clip-path="url(#p)"><polygon points="0,0 {pw:.1f},0 {pw - ph:.1f},{ph} 0,{ph}" fill="{NAVY}"/></g>
<g transform="translate({px:.1f} {py:.1f})"><g clip-path="url(#p)">
  <svg x="{pad_l}" y="{(ph - mark) / 2}" width="{mark}" height="{mark}" viewBox="0 0 256 256">{self.mark}</svg>
  <path transform="translate({tx - px:.1f} {base - py:.1f})" d="{self.name["d"]}" fill="{BRANCO}"/>
  <path transform="translate({tx - px + self.name["w"]:.1f} {base - py:.1f})" d="{self.domain["d"]}" fill="{CLARO}"/>
</g></g>''')
        # The list: what's on the site.
        lx, ly = LIST_AT
        q = out_cubic((now - self.heading_at) / 0.3)
        if q > 0:
            parts.append(f'<path transform="translate({lx - 30 * (1 - q):.1f} {ly})" d="{self.heading["d"]}" fill="{CLARO}" fill-opacity="{q:.3f}"/>')
        for i, at in enumerate(self.items_at):
            q = out_cubic((now - at) / 0.32)
            if q <= 0:
                continue
            iy = ly + 22 + i * 84
            ix = lx - 60 * (1 - q)
            num, item = self.numbers[i], self.items[i]
            parts.append(f'''<g opacity="{q:.3f}" transform="translate({ix:.1f} {iy})">
  <rect width="62" height="62" fill="{CLARO}"/>
  <path transform="translate({(62 - num["w"]) / 2:.1f} 41)" d="{num["d"]}" fill="{KLEIN}"/>
  <path transform="translate(84 47)" d="{item["d"]}" fill="{BRANCO}"/>
</g>''')
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{TOP[0]}" height="{TOP[1]}" '
                f'viewBox="0 0 {TOP[0]} {TOP[1]}">{"".join(parts)}</svg>')


def short_outro():
    quiet = silences(SHORT_RAW, MIC)
    speech = quiet[0][1]  # the first silence ends where he starts
    stops = next(s for s, _ in reversed(quiet) if s > speech)
    cut_from, cut_to = speech - BEFORE, stops + SMILE
    length = cut_to - cut_from
    # Cuts on whole frames, so the flashes, the ticks and the poses' joins fall on the same frame.
    marks = [round(i * length / len(POSES) * FPS) for i in range(len(POSES) + 1)]
    cuts = [m / FPS for m in marks[:-1]]
    counts = [b - a for a, b in zip(marks, marks[1:])]
    work, _ = work_dir()
    frames = work / "topo"
    frames.mkdir()
    top = Top(length, cuts, (BEFORE, stops - cut_from))
    for n in range(math.ceil(length * FPS)):
        svg = frames / "f.svg"
        svg.write_text(top.frame_svg(n / FPS), encoding="utf-8")
        subprocess.run(["resvg", str(svg), str(frames / f"{n:04d}.png")], check=True)
    subprocess.run(["resvg", "-w", "330", str(LOCKUP), str(work / "lockup.png")], check=True)

    x, y, w, h = HOLE
    graph = []
    for i in range(len(POSES)):
        # A small punch on each cut: 6 % bigger, back in 0.15 s.
        graph.append(f"[{1 + i}:v]fps={FPS},trim=end_frame={counts[i]},setpts=PTS-STARTPTS,scale={w}:{h}:flags=lanczos,setsar=1,"
                     f"scale=w='trunc({w}*(1+0.06*max(0,1-t/0.15))/2)*2':h=-2:eval=frame,crop={w}:{h}[p{i}]")
    graph.append(f"{''.join(f'[p{i}]' for i in range(len(POSES)))}concat=n={len(POSES)}:v=1:a=0[poses]")
    seq, logo = 1 + len(POSES), 2 + len(POSES)
    graph.append(f"[0:v][poses]overlay={x}:{y}:eof_action=pass[v1]")
    graph.append(f"[v1][{seq}:v]overlay=0:0:eof_action=pass[v2]")
    graph.append(f"color=c={KLEIN.replace('#', '0x')}:s=360x96:d={length:.3f}[plate]")
    graph.append(f"[v2][plate]overlay={LOGO_AT[0]}:{LOGO_AT[1]}[v3]")
    graph.append(f"[v3][{logo}:v]overlay={LOGO_AT[0] + 4}:{LOGO_AT[1] - 3}[v]")
    # Sound: his voice, the hit on the first frame, a tick on each later cut.
    graph.append(f"[0:a:{MIC}]loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,"
                 f"afade=t=out:st={length - 0.3:.2f}:d=0.3[voice]")
    graph.append("sine=f=52:d=0.5,volume='0.9*exp(-9*t)':eval=frame[h1]")
    graph.append("anoisesrc=d=0.35:c=pink:a=0.6,lowpass=f=2400,volume='if(lt(t,0.02),t/0.02,exp(-14*(t-0.02)))':eval=frame[h2]")
    graph.append("[h1][h2]amix=inputs=2:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[hit]")
    later = cuts[1:]
    graph.append(f"anoisesrc=d=0.12:c=white:a=0.5,highpass=f=2800,lowpass=f=9000,"
                 f"volume='0.22*if(lt(t,0.004),t/0.004,exp(-38*(t-0.004)))':eval=frame,"
                 f"aformat=sample_rates=48000:channel_layouts=stereo,asplit={len(later)}"
                 + "".join(f"[k{i}]" for i in range(len(later))))
    for i, c in enumerate(later):
        graph.append(f"[k{i}]adelay={round(c * 1000)}:all=1[t{i}]")
    mix = "[voice][hit]" + "".join(f"[t{i}]" for i in range(len(later)))
    graph.append(f"{mix}amix=inputs={2 + len(later)}:normalize=0:duration=first,alimiter=limit=0.8,volume=-1.6dB[a]")

    inputs = []
    for camera, at, _ in POSES:
        inputs += ["-ss", f"{at:.3f}", "-t", f"{length / len(POSES) + 0.2:.3f}", "-i", to_windows(camera)]
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", f"{cut_from:.3f}", "-to", f"{cut_to:.3f}", "-i", to_windows(SHORT_RAW), *inputs,
        "-framerate", str(FPS), "-i", to_windows(frames / "%04d.png"), "-i", to_windows(work / "lockup.png"),
        "-filter_complex", ";".join(graph), "-map", "[v]", "-map", "[a]", "-t", f"{length:.3f}", *encode(SHORT_OUT))
    shutil.rmtree(work)
    return cut_from, cut_to, [(c, camera, at, pose) for c, (camera, at, pose) in zip(cuts, POSES)]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="make them (without it, only show)")
    args = parser.parse_args()
    for source, out in [(LONG_IN, LONG_OUT), (SHORT_RAW, SHORT_OUT)]:
        print(f"{'ok   ' if source.exists() else 'falta'} {source.name}  →  {out.parent.parent.name}\\{out.parent.name}\\{out.name}")
    for camera, at, pose in POSES:
        print(f"pose  {camera.parent.name} {at:8.2f} s  {pose}{'' if camera.exists() else '  (falta o arquivo)'}")
    if not args.apply:
        print("(nada feito: rode com --apply)")
        return
    long_outro()
    print(f"feito {LONG_OUT.name}")
    cut_from, cut_to, flashes = short_outro()
    print(f"feito {SHORT_OUT.name} ({cut_from:.2f}–{cut_to:.2f} s do bruto)")
    for c, _, at, pose in flashes:
        print(f"  {c:5.2f} s  câmera {at:8.2f} s  {pose}")


if __name__ == "__main__":
    main()
