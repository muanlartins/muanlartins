"""Highlights da live: moments of a live made one vertical short, frame by frame, from a roteiro.

    scripts/.venv/bin/python scripts/cortes.py scripts/roteiros/<file>.py --palavras    # what he says, in live s
    scripts/.venv/bin/python scripts/cortes.py scripts/roteiros/<file>.py --quadros 0.5,3.2   # stills, to check
    scripts/.venv/bin/python scripts/cortes.py scripts/roteiros/<file>.py --ate 8 --rapido    # a quick look
    scripts/.venv/bin/python scripts/cortes.py scripts/roteiros/<file>.py               # the short, in prontos

The sources are the live's folder (Videos\\Lives\\<date>, see the `estudio` skill): Live.mp4 for his camera as the
live showed it (the 480×270 box at the top left, with the camera filters drawn on it, which Câmera.mkv doesn't have)
and its tracks (2 Microfone, 3 Jogo, 4 Discord), and Jogo.mp4 for the game at its own 1920×1080, without overlays.
partes.json places each file's parts on the clock to the second. Live.mp4 is the clock: its picture and sound are in
step (his lips against his voice, and the VOD, 2026-11-11). Jogo.mp4 and Câmera.mkv (Source Record) are not: OBS's
audio buffering ("Max audio buffering reached", 11-09 and 11-10) delayed their sound ~0.93 s behind their own
picture. So the game's sound places Jogo.mp4 (`offset`) and the game's picture moves it the rest (`picture_lag`); his
camera is taken from Live.mp4 as it is. The roteiro's stretches can come from anywhere in the live: each moment (stretches under GAP s apart)
is synced, heard and transcribed on its own.

The frame: the game behind everything, its crosshair line at a fixed height, zoomed and moved by keys; his camera
over the top of it down to a seam that moves (low for the action, high when his face is the joke); a blurred copy
of the game where the game doesn't reach. The roteiro (scripts/roteiros/) is a Python file: LIVE (the date), NOME,
TRECHOS (the live's stretches kept, in live seconds: (a, b) as they were, (a, b, d) played in d seconds, slow or
fast, (t, t, d) frozen), TROCAS and DESTAQUES as in edicao.py, and `roteiro(at)` returning the keys, impacts,
overlays and sounds in seconds of the short (`at("palavra")`, `at(2512.3)` for a live second). Its sound: his voice
at -20 dBFS, the game under it and up when he's quiet, Discord under both; slowed stretches keep only the game,
pitched down; sped and frozen ones are silent but for their effects.
"""

import argparse
import importlib.util
import json
import math
import re
import shutil
import subprocess
import sys
import time
import wave
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from edicao import (BLOCK_CHARS, BRANCO, CLARO, FFMPEG, FONT, FPS, H, KLEIN, RNG, SPRITES, SR, W, WORK, animate,
                    ass_time, ease, ffmpeg, font, keyed, pauses, place, plain, shadowed, sfx, snap)

CAM_RECT = (46, 62, 476, 236)  # the camera inside the live's box: under the rank plate, above the site's bar
CAPTION_LOW = 1380  # the captions' lowest line: below it Shorts puts its title and buttons
GAP = 30.0  # the short's stretches closer than this in the live are one moment (one sync, one transcription)
FULL = (1920, 1080)  # the live's whole frame: his camera where the live showed it bigger, or the live's own screen


def camera_only(frame):
    """Whether a frame of the live (at FULL) shows only his camera: the game scenes have the Pix QR code at the
    left (black and white squares), the camera's scenes don't."""
    qr = frame[395:504, 40:156]
    return float((qr.min(axis=2) > 200).mean()) < 0.12
MIRA_Y = 1000  # where the crosshair line sits on screen at zoom 1 (game y 540)
VOZ_DB, JOGO_DB, DISCORD_DB = -20, -23, -27  # speech RMS targets; the game ducks under his voice
DUCK_DB = -10


# ------------------------------------------------------------------------------------------------- the sources


def parts(folder):
    """Where each piece of the day's Live, Câmera and Jogo starts: videos.py's partes.json when OBS was restarted and
    the pieces were joined, else one piece per file, started at the time in its name ("21-04-55 Live.mp4")."""
    listing = folder / "partes.json"
    # It lists only the kinds that came in pieces (11-20: the game's, not the stream's); the rest are one piece each.
    table = json.loads(listing.read_text()) if listing.exists() else {}
    for kind in ("Live", "Câmera", "Jogo"):
        found = sorted(folder.glob(f"??-??-?? {kind}.*"))
        if kind in table or not found:
            continue
        seconds = float(subprocess.run([str(Path.home() / ".local" / "bin" / "ffprobe"), "-v", "error",
                                        "-show_entries", "format=duration", "-of", "csv=p=0", str(found[0])],
                                       capture_output=True, text=True, check=True).stdout)
        table[kind] = [{"inicio": f"{folder.name}T{found[0].name[:8].replace('-', ':')}", "em": 0.0,
                        "segundos": seconds}]
    return table


LOOSE_START = re.compile(r" (\d{2})-(\d{2})-(\d{2})")  # OBS's own name: "2026-11-18 20-24-35 jogo.mkv"


def material(roteiro):
    from windows import VIDEOS
    """(Live.mp4, the game's recording, the camera's, their parts table) for a roteiro: the live's folder
    (Videos\\Lives\\<date>, filed by videos.py), or the roteiro's "arquivos" ({"live", "jogo", "camera"}: paths under
    Videos) for a live not filed yet, each one piece started at the time in its name. On 11-18 two game recordings ran
    at once (the Diversos scene's, black once it was left, and Valorant's): "arquivos" names the right one."""
    files = roteiro.get("arquivos")
    if not files:
        folder = VIDEOS / "Lives" / roteiro["live"]
        return (next(folder.glob("* Live.mp4")), next(folder.glob("* Jogo.mp4")), next(folder.glob("* Câmera.mkv")),
                parts(folder))
    paths, table = [], {}
    for key, kind in (("live", "Live"), ("jogo", "Jogo"), ("camera", "Câmera")):
        path = VIDEOS / files[key]
        h, m, s = LOOSE_START.search(path.name).groups()
        seconds = float(subprocess.run([str(Path.home() / ".local" / "bin" / "ffprobe"), "-v", "error",
                                        "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                       capture_output=True, text=True, check=True).stdout)
        table[kind] = [{"inicio": f"{roteiro['live']}T{h}:{m}:{s}", "em": 0.0, "segundos": seconds}]
        paths.append(path)
    return (*paths, table)


def wall(table, kind, t):
    from datetime import datetime
    for p in reversed(table[kind]):
        if t >= p["em"]:
            return datetime.fromisoformat(p["inicio"]).timestamp() + (t - p["em"])
    p = table[kind][0]
    return datetime.fromisoformat(p["inicio"]).timestamp() + (t - p["em"])


def local(table, kind, w):
    from datetime import datetime
    for p in reversed(table[kind]):
        start = datetime.fromisoformat(p["inicio"]).timestamp()
        if w >= start:
            return p["em"] + (w - start)
    return table[kind][0]["em"]


def pcm(path, start, length, stream, rate=SR):
    raw = ffmpeg("-ss", f"{start:.3f}", "-i", str(path), "-t", f"{length:.3f}", "-map", f"0:a:{stream}", "-ac", "1",
                 "-ar", str(rate), "-f", "f32le", "-", capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def offset(live, game, table, t, length=40.0):
    """Jogo.mp4's second showing Live.mp4's second t: partes.json's guess, corrected by cross-correlating the game's
    sound in both (Live's track 3) at 4 kHz."""
    guess = local(table, "Jogo", wall(table, "Live", t))
    rate = 4000
    a = pcm(live, t, length, 2, rate)
    b = pcm(game, guess - 3, length + 6, 0, rate)
    a, b = (a - a.mean()) / (a.std() + 1e-6), (b - b.mean()) / (b.std() + 1e-6)
    n = len(b)
    corr = np.fft.irfft(np.fft.rfft(b, 2 * n) * np.conj(np.fft.rfft(a, 2 * n)))[:n]
    k = int(np.argmax(corr))
    return guess - 3 + k / rate - t, float(corr[k] / len(a))


def motion(path, start, length):
    """How much the game moves frame to frame (60 a second), in the middle of the picture, away from the live's
    overlays (camera box, QR code, plates)."""
    raw = ffmpeg("-ss", f"{start:.3f}", "-i", str(path), "-t", f"{length:.3f}", "-an", "-vf",
                 "fps=60,scale=160:90,format=gray", "-f", "rawvideo", "-", capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, 90, 160).astype(np.float32)[:, 30:85, 60:150]
    return np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))


def picture_lag(live, game, t, shift, length=30.0):
    """How far Jogo.mp4's picture sits ahead of where its sound puts it, at live second t (`shift` from `offset`):
    the Jogo.mp4 second showing Live.mp4's second t is t + shift - lag. Live.mp4 is in step; Source Record files lose
    step when OBS's audio buffering jumps (~0.93 s on 2026-11-09, "Max audio buffering reached" in its log: the
    effects' old "Gatilho" sources playing a silent WAV did it), which delays their sound behind their picture. The
    game's motion in both files lines them up. Returns (lag, corr)."""
    a = motion(live, t, length)
    b = motion(game, t + shift - 2, length + 4)
    a, b = (a - a.mean()) / (a.std() + 1e-6), (b - b.mean()) / (b.std() + 1e-6)
    scores = [float(np.dot(a, b[k:k + len(a)])) / len(a) for k in range(len(b) - len(a))]
    k = int(np.argmax(scores))
    return shift - (shift - 2 + k / FPS), scores[k]


# Where the live put Câmera.mkv's picture (OBS's scenes on the 1920×1080 canvas, brand/twitch/obs.py): Valorant's
# game scenes' box at (44, 44) ×0.375, Rocket League's at (44, 740) ×0.375, the camera scenes (Conversa, Fim) at
# (64, 64) ×1, the VAR scenes' at (1344, 136) ×0.4; and his head in Câmera.mkv (1280×720, framed by OBS's crop).
CAM_PLACES = ((44, 44, 0.375), (44, 740, 0.375), (64, 64, 1.0), (1344, 136, 0.4))
CAM_HEAD = (560, 200, 400, 420)


def heads(path, start, length, x, y, w, h, scale=""):
    """His head, 48×48 grey, 60 frames a second, each frame normalised (so brightness doesn't count). `scale` first
    (Câmera.mkv to the 1280×720 the places are measured in: 854×480 since 11-13: OBS crops it before recording)."""
    raw = ffmpeg("-ss", f"{start:.3f}", "-i", str(path), "-t", f"{length:.3f}", "-an", "-vf",
                 (f"scale={scale}," if scale else "") + f"fps=60,crop={round(w)}:{round(h)}:{round(x)}:{round(y)},scale=48:48,format=gray",
                 "-f", "rawvideo", "-", capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, 48, 48).astype(np.float32)
    f = f - f.mean(axis=(1, 2), keepdims=True)
    return f / (f.std(axis=(1, 2), keepdims=True) + 1e-6)


def camera_sound(live, camera, table, t):
    """Câmera.mkv's second minus Live.mp4's, by the mic in both (Live's track 2, Câmera's only one): at t, or else
    elsewhere in the same part of the live, since it holds through a part (Câmera's sound has silent stretches:
    2026-11-09 around 1:30:00)."""
    rate = 4000
    part = next(p for p in reversed(table["Live"]) if t >= p["em"])
    for at in (t, *(part["em"] + part["segundos"] * f for f in (0.5, 0.25, 0.75, 0.1, 0.9))):
        guess = local(table, "Câmera", wall(table, "Live", at))
        a = pcm(live, at, 40, 1, rate)
        b = pcm(camera, guess - 3, 46, 0, rate)
        a, b = (a - a.mean()) / (a.std() + 1e-6), (b - b.mean()) / (b.std() + 1e-6)
        n = len(b)
        c = np.fft.irfft(np.fft.rfft(b, 2 * n) * np.conj(np.fft.rfft(a, 2 * n)))[:n]
        k = int(np.argmax(c))
        if c[k] / len(a) >= 0.5:
            return guess - 3 + k / rate - at
    return None


def camera_lag(live, camera, table, t, length=15.0):
    """How far Câmera.mkv's picture sits ahead of where its sound puts it, at live second t: the Câmera.mkv second
    showing Live.mp4's second t is t + camera_sound(...) - lag. Like Jogo.mp4 (`picture_lag`), its sound came late
    behind its picture once OBS's audio buffering jumped (0.917-0.983 s on 2026-11-09). The mic lines the two files up
    (Live's track 2 with Câmera's), then his head in the live (the game scenes' box or the camera scenes' frame,
    whichever matches) is matched frame by frame to Câmera's. Returns (lag, quality): how far the best match stands
    out, 1 - its error / the median error (0 = no match)."""
    sound = camera_sound(live, camera, table, t)  # Câmera's second = live's + sound
    if sound is None:
        return None, 0.0
    lo, hi = -0.3, 1.6
    x, y, w, h = CAM_HEAD
    ref = heads(camera, t + sound - hi, length + hi - lo, x, y, w, h, scale="1280:720")
    best = (None, 0.0)
    for ox, oy, s in CAM_PLACES:
        got = heads(live, t, length, ox + x * s, oy + y * s, w * s, h * s)
        errs = [float(((got - ref[i:i + len(got)]) ** 2).mean()) for i in range(len(ref) - len(got) + 1)]
        i = int(np.argmin(errs))
        q = 1 - errs[i] / float(np.median(errs))
        if q > best[1]:
            best = (hi - i / FPS, q)
    return best


class Frames:
    """The stretches of a video the short uses, decoded once into JPEGs in memory (60 fps, by absolute frame number),
    so the short can run them at any speed, back over them, or hold them; fast stretches blend the frames they skip
    (motion blur)."""

    def __init__(self, path, ranges, crop=None, quality=92, size=None, probe=None):
        vf = [f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]}"] if crop else []
        if size:
            vf.append(f"scale={size[0]}:{size[1]}")
        self.w, self.h = size or ((crop[2], crop[3]) if crop else (1920, 1080))
        self.frames, self.flags = {}, {}
        for a, b in ranges:
            first = round(max(0, a) * FPS)
            proc = subprocess.Popen([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-ss", f"{first / FPS:.4f}",
                                     "-i", str(path), "-t", f"{b - first / FPS:.3f}", "-an",
                                     "-vf", ",".join(vf + ["fps=60"]), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                                    stdout=subprocess.PIPE)
            n, size_ = first, self.w * self.h * 3
            while chunk := proc.stdout.read(size_):
                if len(chunk) < size_:
                    break
                frame = np.frombuffer(chunk, np.uint8).reshape(self.h, self.w, 3)
                self.frames[n] = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])[1]
                if probe:
                    self.flags[n] = probe(frame)
                n += 1
            proc.wait()
        self.keys = np.array(sorted(self.frames))
        self.cache = {}

    def nearest(self, n):
        i = int(np.clip(np.searchsorted(self.keys, n), 0, len(self.keys) - 1))
        if i > 0 and abs(self.keys[i - 1] - n) <= abs(self.keys[i] - n):
            i -= 1
        return int(self.keys[i])

    def at(self, n):
        n = self.nearest(n)
        if n not in self.cache:
            if len(self.cache) > 32:
                self.cache.pop(next(iter(self.cache)))
            self.cache[n] = cv2.imdecode(self.frames[n], cv2.IMREAD_UNCHANGED)
        return self.cache[n]

    def flag(self, s):
        return self.flags.get(self.nearest(round(s * FPS)), False) if self.flags else False

    def frame(self, s, ds):
        """The picture at the file's second s; ds is how far the short moves in the file per frame."""
        n = int(min(8, max(1, round(abs(ds) * FPS))))
        if n == 1:
            return self.at(round(s * FPS))
        acc = np.zeros((self.h, self.w, 3), np.float32)
        for k in range(n):
            acc += self.at(round((s + ds * k / n) * FPS))
        return (acc / n).astype(np.uint8)


# --------------------------------------------------------------------------------------------------- the clock


class Clock:
    """Live seconds ↔ the short's seconds through TRECHOS: (a, b) as it was, (a, b, d) in d seconds, (t, t, d)
    held. A live second shown twice (a replay) maps to its first showing."""

    def __init__(self, trechos):
        self.spans, self.opts = [], []
        for s in trechos:
            opts = s[-1] if isinstance(s[-1], dict) else {}
            s = [x for x in s if not isinstance(x, dict)]
            self.spans.append((float(s[0]), float(s[1]), float(s[2]) if len(s) > 2 else float(s[1] - s[0])))
            self.opts.append(opts)
        self.starts = np.cumsum([0] + [d for _, _, d in self.spans])
        self.length = float(self.starts[-1])

    def speed(self, i):
        a, b, d = self.spans[i]
        return (b - a) / d if d else 0.0

    def index(self, o):
        for i, s in enumerate(self.starts[1:]):
            if o < s:
                return i
        return len(self.spans) - 1

    def live(self, o):
        i = self.index(o)
        a, b, d = self.spans[i]
        return a + (b - a) * min(1.0, max(0.0, (o - self.starts[i]) / d if d else 0.0))

    def out(self, t, nth=1):
        """The short's second showing live second t (its nth showing, for a moment shown twice)."""
        seen = 0
        for (a, b, d), o in zip(self.spans, self.starts):
            if a <= t <= b and b > a:
                seen += 1
                if seen == nth:
                    return float(o + (t - a) / (b - a) * d)
        later = [o for (a, b, d), o in zip(self.spans, self.starts) if a > t and b > a]
        return float(min(later)) if later else self.length

    def heard(self):
        """[(i, a, b, start)]: the stretches played at their own speed with his voice on."""
        return [(i, a, b, o) for i, ((a, b, d), o) in enumerate(zip(self.spans, self.starts))
                if d and abs((b - a) / d - 1) < 0.02 and self.opts[i].get("voz", True)]

    def normal(self, t):
        """Whether live second t is heard at its own speed somewhere in the short (its words get captions)."""
        return any(a <= t < b for _, a, b, _ in self.heard())


def resolver(words, clock):
    """at("palavra") (#2 the second time he says it, > its end, | the middle of the pause after it, @2 its second
    showing in the short), at(2512.3) a live second, at((2512.3, 2)) its second showing."""
    def at(anchor):
        if isinstance(anchor, (int, float)):
            return clock.out(anchor)
        if isinstance(anchor, tuple):
            return clock.out(*anchor)
        m = re.fullmatch(r"(.+?)(?:#(\d+))?([>|]?)(?:@(\d+))?", anchor)
        name, nth, edge, show = plain(m[1]), int(m[2] or 1), m[3], int(m[4] or 1)
        hits = [i for i, w in enumerate(words) if plain(w[2]) == name]
        if len(hits) < nth:
            raise SystemExit(f"roteiro: \"{anchor}\" não foi dita ({len(hits)} vezes)")
        i = hits[nth - 1]
        if edge == ">":
            return clock.out(words[i][1], show)
        if edge == "|":
            nxt = clock.out(words[i + 1][0], show) if i + 1 < len(words) else clock.length
            return (clock.out(words[i][1], show) + nxt) / 2
        return clock.out(words[i][0], show)
    return at


# ------------------------------------------------------------------------------------------------ the pictures


def sprite_titulo(p):
    """The hook's words: big capitals in Branco with a thick Klein edge and a shadow, one part in Klein claro."""
    size = p.get("tamanho", 92)
    fnt = font(size)
    lines = p["linhas"]  # [[(text, highlighted), …], …]
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    widths = [sum(probe.textlength(t, font=fnt) for t, _ in line) for line in lines]
    edge = max(8, size // 9)
    w, lh = int(max(widths) + 4 * edge), int(size * 1.12)
    im = Image.new("RGBA", (w, lh * len(lines) + 4 * edge), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for n, line in enumerate(lines):
        x = (w - widths[n]) / 2
        y = 2 * edge + n * lh
        for text, hi in line:
            d.text((x, y), text, font=fnt, fill=(CLARO if hi else BRANCO) + (255,), stroke_width=edge,
                   stroke_fill=KLEIN + (255,))
            x += d.textlength(text, font=fnt)
    return shadowed(im, 14, 8, 150)


SPRITES = {**SPRITES, "titulo": sprite_titulo}


# ---------------------------------------------------------------------------------------------------- captions


def captions(said, keys, seam):
    """edicao.py's captions (word by word, key words bigger and Klein claro), hung just under the seam: each word's
    line goes where the seam is when it's said."""
    blocks, block = [], []
    for word in said:
        if block and (len(" ".join(w for _, _, w in block + [word])) > BLOCK_CHARS
                      or word[0] - block[-1][1] > 0.45 or block[-1][2][-1] in ".?!"):
            blocks.append(block)
            block = []
        block.append(word)
    if block:
        blocks.append(block)
    big = "\\fscx118\\fscy118"
    events = []
    for n, block in enumerate(blocks):
        last = block[-1][1] + 0.4
        if n + 1 < len(blocks):
            last = min(last, blocks[n + 1][0][0])
        key = [plain(w) in keys for _, _, w in block]
        for i, (start, end, _) in enumerate(block):
            until = block[i + 1][0] if i + 1 < len(block) else last
            at = f"{ass_time(start)},{ass_time(max(until, start + 0.05))}"
            y = min(int(seam(start)) + 26, CAPTION_LOW)  # a full-screen camera (seam at the bottom): over him

            def size(j):
                return big if key[j] else "\\fscx100\\fscy100"

            behind = " ".join(
                ("{\\alpha&HFF&\\3a&H70&\\3c&HFFA785&\\bord22\\blur10\\t(0,160,\\bord14)" + size(j) + "}" if j == i
                 else "{\\alpha&HFF&\\3a&HFF&" + size(j) + "}") + w for j, (_, _, w) in enumerate(block))
            parts_ = []
            for j, (_, _, w) in enumerate(block):
                color = ("\\alpha&H00&\\c&HFFA785&" if key[j] else "\\alpha&H00&\\c&HF7F5F4&") if j < i else \
                    "\\alpha&H00&\\c&HFFA785&" if j == i else "\\alpha&HFF&"
                parts_.append("{" + color + size(j) + "}" + w)
            events.append(f"Dialogue: 0,{at},Legenda,,0,0,0,,{{\\an8\\pos(540,{y})}}{behind}")
            events.append(f"Dialogue: 1,{at},Legenda,,0,0,0,,{{\\an8\\pos(540,{y})}}{' '.join(parts_)}")
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,Space Grotesk,70,&H00F7F5F4,&H00F7F5F4,&H00A72F00,&H00A72F00,-1,0,0,0,100,100,0,0,1,9,0,5,70,70,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"


# ---------------------------------------------------------------------------------------------------- the sound


def level(x, target, floor=-50):
    """x scaled so its active parts (20 ms windows above `floor` dBFS) have `target` dBFS RMS."""
    hop = SR // 50
    frames = x[:len(x) // hop * hop].reshape(-1, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    active = rms[rms > 10 ** (floor / 20)]
    if not len(active):
        return x
    now = 20 * np.log10(np.sqrt((active ** 2).mean()) + 1e-9)
    return x * 10 ** ((target - now) / 20)


def soft(x, ceiling_db):
    """Peaks rounded off under a ceiling (tanh above half of it): gunshots are 25 dB over the game's average, and
    left alone they set the short's loudness instead of his voice."""
    c = 10 ** (ceiling_db / 20)
    k = c / 2
    m = np.abs(x)
    return np.where(m <= k, x, np.sign(x) * (k + k * np.tanh((m - k) / k))).astype(np.float32)


def envelope(x, attack=0.02, release=0.3, threshold=-42):
    """0..1, how much his voice is on (for ducking), smoothed."""
    hop = SR // 100
    frames = x[:len(x) // hop * hop].reshape(-1, hop)
    on = (20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9) > threshold).astype(np.float32)
    out, v = np.empty_like(on), 0.0
    ka, kr = 1 - math.exp(-0.01 / attack), 1 - math.exp(-0.01 / release)
    for i, o in enumerate(on):
        v += (o - v) * (ka if o > v else kr)
        out[i] = v
    if not len(out):
        return np.zeros(len(x), np.float32)
    env = np.repeat(out, hop)
    return np.pad(env, (0, max(0, len(x) - len(env))), mode="edge")[:len(x)]


def efeito(name, length=None):
    """edicao.py's sound effects, plus fire: a roar (low noise swelling) with crackles."""
    if name != "fogo":
        return sfx(name, length)
    d = length or 2.0
    n = int(d * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(11)
    noise = rng.standard_normal(n).astype(np.float32)
    roar = np.convolve(noise, np.ones(40) / 40, "same") * 3
    roar = np.convolve(roar, np.ones(12) / 12, "same")
    env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.6) * (0.8 + 0.2 * np.sin(2 * np.pi * 3.3 * t))
    crackle = np.zeros(n, np.float32)
    for at in rng.uniform(0, d - 0.05, int(d * 28)):
        i = int(at * SR)
        k = min(n - i, int(0.012 * SR))
        crackle[i:i + k] += rng.standard_normal(k) * np.exp(-np.arange(k) / (0.002 * SR)) * rng.uniform(0.3, 1)
    raw = (roar * env + 0.5 * crackle * env).astype(np.float32)
    return raw / (np.abs(raw).max() + 1e-9)


# -------------------------------------------------------------------------------------------------- the render


class Corte:
    def __init__(self, roteiro_path, fast=False):
        spec = importlib.util.spec_from_file_location("roteiro", roteiro_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.mod, self.fast = mod, fast
        from windows import VIDEOS
        self.videos = VIDEOS
        self.folder = VIDEOS / "Lives" / mod.LIVE
        self.live = next(self.folder.glob("* Live.mp4"))
        self.game_file = next(self.folder.glob("* Jogo.mp4"))
        self.camera_file = next(self.folder.glob("* Câmera.mkv"), None)
        self.table = parts(self.folder)
        self.work = WORK / f"corte-{Path(roteiro_path).stem}"
        self.work.mkdir(parents=True, exist_ok=True)
        self.clock = Clock(mod.TRECHOS)
        # The moments of the live the short takes (stretches under GAP s apart are one), each decoded, heard,
        # transcribed and synced on its own: a reel of the live's best moments spans hours and the recording's parts.
        moments = []
        for a, b in sorted((min(a, b), max(a, b)) for a, b, _ in self.clock.spans):
            if moments and a - moments[-1][1] < GAP:
                moments[-1][1] = max(moments[-1][1], b)
            else:
                moments.append([a, b])
        self.moments = [(a - 1.0, b + 1.5) for a, b in moments]  # live seconds decoded and heard
        self.sync = [self.synced(m) for m in self.moments]
        self.tracks = [{"voz": pcm(self.live, a, b - a, 1)} for a, b in self.moments]
        self.quiet = [(x + a, y + a) for (a, _), tr in zip(self.moments, self.tracks) for x, y in pauses(tr["voz"])]
        self.words = snap(self.transcribe(), self.quiet)
        self.at = resolver(self.words, self.clock)
        r = mod.roteiro(self.at)
        self.end = r.get("fim", self.clock.length)
        self.seam_keys = r.get("costura", [(0, 640)])
        self.game_keys = [k if len(k) > 4 else (*k, MIRA_Y) for k in r.get("jogo", [(0, 960, 540, 1.0)])]
        self.cam_keys = r.get("camera", [(0, 238, 118, 1.0)])
        self.impacts = r.get("impactos", [])
        self.overlays = r.get("sobreposicoes", [])
        self.sounds = r.get("sons", [])
        self.fx = r.get("efeitos", [])  # [(from, to, "vhs" | "congela" | "cinza" | "live")]
        # [(from, to, (x, y, w, h))]: where the live had his camera, on its 1920×1080 frame, in a scene that put it
        # elsewhere (Conversa (64, 64, 1280, 720), Terapia (64, 64, 560, 315)); the camera keys are then relative
        # to it as to the box (238, 118 its middle).
        self.cam_rects = r.get("quadro_camera", [])
        for o in self.overlays:
            if o["tipo"] in SPRITES:
                o["sprite"] = np.array(SPRITES[o["tipo"]](o).convert("RGBA"))
        self.keys = {plain(k) for k in getattr(mod, "DESTAQUES", [])}

    def moment(self, t):
        """The moment (its index) holding live second t, or the nearest."""
        return min(range(len(self.moments)), key=lambda i: max(self.moments[i][0] - t, t - self.moments[i][1], 0))

    def synced(self, moment):
        """The moment's sync, kept in sincronia.json by its live seconds. Live.mp4 is the clock (picture and sound in
        step), so `camera` is 0; `jogo` is the Jogo.mp4 second minus Live's second it shows, by picture: placed by the
        game's sound (`offset`), then moved by how far Source Record's picture sits ahead of its sound (`picture_lag`).
        Caches from before 2026-11-11 shifted the camera instead (wrong) and are measured again."""
        a, b = moment
        cache = self.work / "sincronia.json"
        every = json.loads(cache.read_text()) if cache.exists() else {}
        if "jogo" in every or any("imagem" not in v for v in every.values()):
            every = {}
        key = f"{a:.1f}-{b:.1f}"
        data = every.get(key, {})
        if "imagem" not in data:
            shift, corr = offset(self.live, self.game_file, self.table, max(0, a - 10), 40)
            if corr < 0.3:
                raise SystemExit(f"sincronia fraca ({corr:.2f}) em {a:.0f} s: confira o som do jogo nos dois arquivos")
            length = min(30.0, b - a)
            lag, q = max((picture_lag(self.live, self.game_file, t, shift, length) for t in (a, (a + b - length) / 2)),
                         key=lambda x: x[1])
            if q < 0.4:
                raise SystemExit(f"a imagem do jogo não casou com a da live em {a:.0f} s ({q:.2f})")
            data = {"jogo": shift - lag, "som_do_jogo": shift, "imagem": lag, "corr": corr, "imagem_q": q,
                    "camera": 0.0}
        every[key] = data
        cache.write_text(json.dumps(every, indent=1))
        return data

    def transcribe(self):
        said = []
        for a, b in self.moments:
            cache = self.work / f"palavras-{a:.1f}-{b:.1f}.json"
            if cache.exists():
                said += json.loads(cache.read_text(encoding="utf-8"))
            else:
                from shorts import words
                part = [(x + a, y + a, w) for x, y, w in words(self.live, a, b)]
                cache.write_text(json.dumps(part, ensure_ascii=False), encoding="utf-8")
                said += part
        fixes = getattr(self.mod, "TROCAS", {})
        out = []
        # Whisper invents lines in long silences ("Transcrição e Legendas por…"): SEM_LEGENDA drops a live range.
        said = [x for x in said if not any(a <= x[0] < b for a, b in getattr(self.mod, "SEM_LEGENDA", []))]
        for a, b, w in said:
            lead, core, tail = re.fullmatch(r"(\W*)(.*?)(\W*)", w).groups()
            for wrong, right in fixes.items():
                if core.casefold() == wrong.casefold():
                    w = lead + right + tail
            out.append((a, b, w))
        return out

    # ---- the layout

    def seam(self, t):
        return float(keyed(self.seam_keys, t)[0])

    def kick(self, t):
        z = 1.0
        for i in self.impacts:
            if t >= i["em"]:
                z *= 1 + i.get("chute", 0.05) * math.exp(-(t - i["em"]) / 0.09)
        return z

    def shake(self, t):
        dx = dy = 0.0
        for i in self.impacts:
            x = t - i["em"]
            if 0 <= x < 0.6 and i.get("tremor"):
                a = i["tremor"] * math.exp(-x / 0.12)
                dx += a * math.sin(2 * math.pi * 19 * x + 1.3)
                dy += a * math.cos(2 * math.pi * 23 * x)
        return dx, dy

    def game_view(self, t):
        cx, cy, z, y = keyed(self.game_keys, t)
        return cx, cy, z * self.kick(t), y

    def game_to_screen(self, t, gx, gy):
        cx, cy, z, y = self.game_view(t)
        dx, dy = self.shake(t)
        return 540 + (gx - cx) * z + dx, y + (gy - cy) * z + dy

    def compose(self, t, game, cam):
        src = self.clock.live(t)
        ds = self.clock.live(t + 1 / FPS) - src
        sync = self.sync[self.moment(src)]
        csrc = src + sync["camera"]  # 0: Live.mp4 is in step
        if any(a <= t < b and kind == "live" for a, b, kind in self.fx):
            g = cam.full.frame(csrc, ds)  # what the live showed (an effect's screen) in place of the game
        else:
            g = game.frame(src + sync["jogo"], ds)
        c = cam.frame(csrc, ds)
        seam = int(round(self.seam(t)))
        dx, dy = self.shake(t)
        # Behind: the game blurred and darkened, covering the frame.
        small = cv2.resize(g, (240, 135), interpolation=cv2.INTER_AREA)
        cover = small[:, int(120 - 135 * W / H / 2):int(120 + 135 * W / H / 2)]
        back = cv2.GaussianBlur(cv2.resize(cover, (W // 6, H // 6)), (0, 0), 5)
        img = cv2.resize(back, (W, H), interpolation=cv2.INTER_LINEAR)
        img = (img.astype(np.float32) * 0.42 + np.array(KLEIN, np.float32) * 0.1).astype(np.uint8)
        # The game, its point (cx, cy) at (540, y).
        cx, cy, z, y = self.game_view(t)
        m = np.float32([[z, 0, 540 - cx * z + dx], [0, z, y - cy * z + dy]])
        x0, y0 = max(0, int(math.ceil(540 - cx * z + dx))), max(0, int(math.ceil(y - cy * z + dy)))
        x1, y1 = min(W, int(540 + (1920 - cx) * z + dx)), min(H, int(y + (1080 - cy) * z + dy))
        if x1 > x0 and y1 > y0:
            fg = cv2.warpAffine(g, m, (W, H), flags=cv2.INTER_LINEAR if self.fast else cv2.INTER_CUBIC)
            if z > 1.12 and not self.fast:
                fg = cv2.addWeighted(fg, 1.4, cv2.GaussianBlur(fg, (0, 0), 1.2), -0.4, 0)
            img[y0:y1, x0:x1] = fg[y0:y1, x0:x1]
        for a, b, kind in self.fx:
            if a <= t < b and kind in ("cinza", "congela") and (kind == "cinza" or abs(ds) < 1e-6):
                gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)[..., None].astype(np.float32)
                img = (img.astype(np.float32) * 0.5 + gray * 0.5).astype(np.uint8)
        # His camera over the top, down to the seam: cover-fit, then the keys' zoom around (ccx, ccy).
        if seam > 2:
            ccx, ccy, cz = keyed(self.cam_keys, t)
            cw, ch = CAM_RECT[2], CAM_RECT[3]
            rect = next((r for a, b, r in self.cam_rects if a <= t < b), None)
            if rect:  # the live had his camera elsewhere: that part of its frame
                x, y, cw, ch = rect
                c = cam.full.frame(csrc, ds)[y:y + ch, x:x + cw]
                ccx, ccy = ccx / CAM_RECT[2] * cw, ccy / CAM_RECT[3] * ch
            elif cam.full.flag(csrc):  # the live showed his camera alone, bigger: that picture, centred on him
                c = cam.full.frame(csrc, ds)
                cw, ch = FULL
                ccx, ccy = FULL[0] / 2, FULL[1] * 0.42
            s = max(W / cw, seam / ch) * cz
            ccx = min(max(ccx, W / s / 2), cw - W / s / 2)
            ccy = min(max(ccy, seam / s / 2), ch - seam / s / 2)
            mc = np.float32([[s, 0, 540 - ccx * s], [0, s, seam / 2 - ccy * s]])
            band = cv2.warpAffine(c, mc, (W, seam), flags=cv2.INTER_LANCZOS4 if not self.fast else cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_REPLICATE)
            if not self.fast:
                band = cv2.addWeighted(band, 1.5, cv2.GaussianBlur(band, (0, 0), 1.8), -0.5, 0)
            img[:seam] = band
            img[max(0, seam - 3):seam + 3] = KLEIN
        for a, b, kind in self.fx:
            if a <= t < b and kind == "vhs":
                img = self.vhs(img, t)
        for i in self.impacts:
            x = t - i["em"]
            if 0 <= x < 0.4 and i.get("flash"):
                r, gg, bb, a = i["flash"]
                k = a * math.exp(-x / 0.07)
                img = (img.astype(np.float32) * (1 - k) + np.array((r, gg, bb), np.float32) * k).astype(np.uint8)
        for o in self.overlays:
            if not o["de"] <= t <= o["ate"]:
                continue
            scale, alpha, ddy = animate(o, t)
            x, yy = o.get("x", 540), o.get("y", 760)
            if o.get("na_costura"):
                yy = seam + o.get("desloc", 0)
            if "ancora" in o:  # a point of the game: follows its zoom and the shake
                x, yy = self.game_to_screen(t, *o["ancora"])
            place(img, o["sprite"], x, yy + ddy, scale * o.get("escala", 1), alpha)
        return img

    def vhs(self, img, t):
        f = img.astype(np.int16)
        out = f.copy()
        out[:, 6:, 0] = f[:, :-6, 0]
        out[:, :-6, 2] = f[:, 6:, 2]
        out[::4] = out[::4] * 0.78
        out[1::4] = out[1::4] * 0.88
        band = int((t * 1400) % (H + 120)) - 60
        if 0 <= band < H - 50:
            out[band:band + 50] = np.roll(out[band:band + 50], 22, axis=1) + 25
        noise = RNG.integers(-14, 15, (H // 2, W // 2, 1), dtype=np.int16)
        out += cv2.resize(noise, (W, H), interpolation=cv2.INTER_NEAREST)[..., None]
        return np.clip(out * 0.8 + out.mean(axis=2, keepdims=True) * 0.2, 0, 255).astype(np.uint8)

    # ---- the sound

    def mixdown(self, length):
        for tr, (a0, a1) in zip(self.tracks, self.moments):
            if "jogo" not in tr:
                tr.update(jogo=pcm(self.live, a0, a1 - a0, 2), discord=pcm(self.live, a0, a1 - a0, 3))
        n = int(length * SR) + SR
        out = {k: np.zeros(n, np.float32) for k in ("voz", "jogo", "discord")}
        fade = int(0.004 * SR)
        for i, ((a, b, d), o) in enumerate(zip(self.clock.spans, self.clock.starts)):
            v = self.clock.speed(i)
            start, size = int(o * SR), int(d * SR)
            if size <= 0 or v <= 0 or v > 1.05:
                continue
            m = self.moment(min(a, b))
            a0 = self.moments[m][0]
            for k, x in self.tracks[m].items():
                if k != "jogo" and not self.clock.opts[i].get("voz", True):
                    continue
                if abs(v - 1) < 0.02:
                    piece = x[int((a - a0) * SR):int((a - a0) * SR) + size].copy()
                elif k == "jogo":  # slowed: the game's sound stretched and pitched down with it
                    src = np.arange(size) * v + (a - a0) * SR
                    piece = np.interp(src, np.arange(len(x)), x).astype(np.float32)
                else:
                    continue
                if len(piece) > 2 * fade:
                    piece[:fade] *= np.linspace(0, 1, fade)
                    piece[-fade:] *= np.linspace(1, 0, fade)
                out[k][start:start + len(piece)] += piece[:n - start]
        voice = level(out["voz"], VOZ_DB)
        duck = envelope(voice)
        game = level(out["jogo"], JOGO_DB + getattr(self.mod, "JOGO_DB", 0), floor=-60) * 10 ** (DUCK_DB * duck / 20)
        talk = level(out["discord"], DISCORD_DB + getattr(self.mod, "DISCORD_DB", 0)) * 10 ** (DUCK_DB * 0.6 * duck / 20)
        mix = soft(voice, -5) + soft(game, -11 + getattr(self.mod, "JOGO_DB", 0)) + soft(talk, -12)
        peak = 10 ** (VOZ_DB / 20) * 2.8
        for at, name, gain, *size in self.sounds:
            s = efeito(name, *size) * peak * 10 ** (gain / 20)
            i = int(max(0, at) * SR)
            mix[i:i + len(s)] += s[:len(mix) - i]
        return soft(mix[:int(length * SR)], -3)

    # ---- output

    def sources(self):
        # Only what the short shows: each stretch with half a second around it, the close ones merged; a rewind
        # (or anything over 10×) only around its ends, since it blurs through the rest.
        spans = []
        for a, b, d in self.clock.spans:
            if d and abs(b - a) / d > 10:
                spans += [(a - 0.5, a + 0.5), (b - 0.5, b + 0.5)]
            else:
                spans.append((min(a, b) - 0.5, max(a, b) + 0.5))
        spans.sort()
        ranges = []
        for a, b in spans:
            if ranges and a <= ranges[-1][1] + 2.0:
                ranges[-1] = (ranges[-1][0], max(ranges[-1][1], b))
            else:
                ranges.append((a, b))
        print(f"lendo {sum(b - a for a, b in ranges):.1f} s da live…")
        syncs = [self.sync[self.moment((a + b) / 2)] for a, b in ranges]
        game = Frames(self.game_file, [(a + s["jogo"], b + s["jogo"]) for (a, b), s in zip(ranges, syncs)], quality=90)
        late = [(a + s["camera"], b + s["camera"]) for (a, b), s in zip(ranges, syncs)]
        cam = Frames(self.live, late, crop=CAM_RECT, quality=95)
        cam.full = Frames(self.live, late, quality=88, probe=camera_only)
        shown = sum(cam.full.flags.values())
        if shown:
            print(f"  câmera em tela cheia na live: {shown / FPS:.1f} s")
        return game, cam

    def stills(self, times, folder):
        game, cam = self.sources()
        for t in sorted(times):
            out = folder / f"quadro-{t:06.2f}.png"
            cv2.imwrite(str(out), cv2.cvtColor(self.compose(t, game, cam), cv2.COLOR_RGB2BGR))
            print(out)

    def sound(self, end):
        """The mix as som.wav and the captions as legenda.ass; returns the filter that sets it at -14 LUFS: the
        gain measured, then a limiter at -2 dBFS for the peaks it pushes up (loudnorm's linear mode undershot)."""
        audio = self.mixdown(end)
        wav = self.work / "som.wav"
        # Stereo, the same in both ears at full level (a mono file upmixed later loses 3 dB to the pan law).
        with wave.open(str(wav), "wb") as f:
            f.setnchannels(2)
            f.setsampwidth(2)
            f.setframerate(SR)
            peak = np.abs(audio).max()
            pcm16 = (audio / max(1.0, peak / 0.97) * 32767).astype(np.int16)
            f.writeframes(np.repeat(pcm16, 2).tobytes())
        said = sorted((o + wa - a, o + min(wb, b) - a, w) for _, a, b, o in self.clock.heard()
                      for wa, wb, w in self.words if a <= wa < b and o + wa - a < end)
        (self.work / "legenda.ass").write_text(captions(said, self.keys, self.seam), encoding="utf-8")
        shutil.copy(FONT, self.work / FONT.name)
        # A gentle compressor first (3:1 over -20 dBFS): gunshots and effects over speech leave ~17 dB between
        # peak and loudness, more than -14 LUFS under a -1.5 dB ceiling allows.
        squeeze = "acompressor=threshold=0.1:ratio=3:attack=5:release=120"
        log = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(wav), "-af",
                              f"{squeeze},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        m = json.loads(log[log.rindex("{"):log.rindex("}") + 1])
        gain = -14 - float(m["input_i"])
        # The limiter at 4× the rate: at 48 kHz it let peaks between samples through (+0.8 dBFS true peak on 11-11).
        return wav, (f"{squeeze},volume={gain:.2f}dB,aresample=192000,alimiter=limit=0.8:attack=1:release=80:level=false,"
                     f"aresample={SR}")

    def remix(self):
        """Only the sound again, under the video already rendered (the captions are burnt in: those need render)."""
        main = self.work / "principal.mp4"
        wav, loud = self.sound(self.end)
        out = self.work / "principal-som.mp4"
        ffmpeg("-y", "-i", str(main), "-i", str(wav), "-filter_complex",
               f"[1:a]{loud},aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo[a]", "-map", "0:v",
               "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest",
               str(out))
        out.replace(main)
        return main

    def render(self, until=None):
        end = min(self.end, until) if until else self.end
        print(f"{self.clock.length:.1f} s de live → short {end:.1f} s")
        self.print_sync()
        wav, loud = self.sound(end)
        main = self.work / "principal.mp4"
        game, cam = self.sources()
        enc = subprocess.Popen(
            [str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s",
             f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", str(wav), "-filter_complex",
             f"[0:v]subtitles=legenda.ass:fontsdir=.,format=yuv420p,setsar=1[v];"
             f"[1:a]{loud},aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo[a]",
             "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast" if self.fast else "slow",
             "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-movflags",
             "+faststart", "-shortest", str(main)], stdin=subprocess.PIPE, cwd=self.work)
        frames, began = int(round(end * FPS)), time.time()
        for i in range(frames):
            enc.stdin.write(self.compose(i / FPS, game, cam).tobytes())
            if i % 300 == 0:
                print(f"  {i / FPS:5.1f} s  ({time.time() - began:.0f} s)")
        enc.stdin.close()
        enc.wait()
        return main

    def print_sync(self):
        for (a, b), s in zip(self.moments, self.sync):
            print(f"  live {a:7.1f}–{b:7.1f}: jogo {s['som_do_jogo']:+.3f} s pelo som (corr {s['corr']:.2f}) "
                  f"− {s['imagem']:.3f} s pela imagem ({s['imagem_q']:.2f}); câmera do Live.mp4 como está")

    def finish(self, main):
        ready = self.videos / "Shorts" / "prontos"
        ready.mkdir(parents=True, exist_ok=True)
        out = ready / f"{self.mod.LIVE} live - {self.mod.NOME}.mp4"
        shutil.copy(main, out)
        print(f"prontos\\{out.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("roteiro", type=Path)
    parser.add_argument("--quadros", help="only stills at these seconds of the short (comma-separated)")
    parser.add_argument("--ate", type=float, help="render only up to this second (a look, not saved to prontos)")
    parser.add_argument("--rapido", action="store_true", help="faster, softer render (a look)")
    parser.add_argument("--palavras", action="store_true", help="print the words with their live and short seconds")
    parser.add_argument("--som", action="store_true", help="only the sound again, under the last render")
    args = parser.parse_args()
    corte = Corte(args.roteiro, fast=args.rapido)
    if args.palavras:
        for a, b, w in corte.words:
            mark = f"{corte.clock.out(a):6.2f}" if corte.clock.normal(a) else "     —"
            print(f"live {a:8.2f} {b:8.2f}  short {mark}  {w}")
        print(f"short: {corte.clock.length:.2f} s")
        corte.print_sync()
        return
    if args.quadros:
        folder = corte.work / "quadros"
        folder.mkdir(exist_ok=True)
        corte.stills([float(x) for x in args.quadros.split(",")], folder)
        return
    main_file = corte.remix() if args.som else corte.render(args.ate)
    if args.ate or args.rapido:
        print(main_file)
        return
    corte.finish(main_file)


if __name__ == "__main__":
    main()
