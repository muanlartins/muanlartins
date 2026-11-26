"""Shorts caprichados: a take re-edited from a roteiro (a beat sheet), frame by frame.

    scripts/.venv/bin/python scripts/edicao.py scripts/roteiros/<roteiro>.py                  # the whole short
    scripts/.venv/bin/python scripts/edicao.py scripts/roteiros/<roteiro>.py --quadros 0.5,3  # stills to check
    scripts/.venv/bin/python scripts/edicao.py scripts/roteiros/<roteiro>.py --ate 8 --rapido # a quick look

shorts.py makes a short the same way every time (cut to his speech, captions, outro). This goes further for the
shorts that deserve it, with what keeps people watching (docs: the `estudio` skill, "Edição caprichada"):

- **Jump cuts:** every pause over `PAUSA_MIN` s on the microphone shrinks to `PAUSA` s (`PAUSA_FRASE` after a
  sentence), so the talk never sags; the camera alternates between two framings at the roteiro's cuts (a punch-in
  of 10-15%) so a cut reads as a new shot, and pushes in slowly where the roteiro asks.
- **The top is re-cut:** the play area stops being one long take of the screen and becomes shots taken from any
  moment of the take (forwards, backwards, slowed, sped up with motion blur, frozen), each framed and zoomed on
  what matters, a blurred copy behind where the zoom leaves room, the hook first (the payoff, not the setup).
- **Effects:** a punch on entering a shot, screen shake, flash and zoom kick on impacts, a VHS rewind look,
  overlays drawn crisp in the brand (cards, chips, a stamp, a ring following the picture), synthesised sound
  effects (whoosh, boom, hit, pop, click, ding, riser, rewind) and the stream's own sounds (brand/twitch/sons).
- **Captions** like shorts.py's (word by word on the seam, Klein claro and a glow on the word being said), with the
  roteiro's key words bigger and staying Klein claro.

The roteiro is a Python file (scripts/roteiros/): the take, its name, whisper's fixes, the key words and a function
`roteiro(at)` returning the shots, camera, impacts, overlays and sounds in seconds of the short. `at("palavra")` is
when he starts saying a word in the short ("palavra#2" the second time, "palavra>" when he ends it, "palavra|" the
middle of the pause after it, the place to cut), and `at(12.5)` a second of the take. Choosing the moments is
judgment (Claude's, with Luan); everything from there is the same every time.

Output: Videos\\Shorts\\prontos\\<date> <time> - <name>.mp4, ending on the payoff with no outro (Luan, 11-11: the
first one without it was "EXCELENTE"); --outro also writes "(com outro)" with the shorts' outro after it. Runs in
WSL with Linux ffmpeg (~/.local/bin) on a copy of the take; the words come from Windows' whisper (shorts.words) and
are cached.
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
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "brand" / "fonts" / "SpaceGrotesk.ttf"
SONS = ROOT / "brand" / "twitch" / "sons"
FFMPEG = Path.home() / ".local" / "bin" / "ffmpeg"
WORK = Path.home() / ".cache" / "muanlartins" / "edicao"

FPS, W, H, TOP = 60, 1080, 1920, 1056
CAM_H = H - TOP
SR = 48000
KLEIN, CLARO, BRANCO = (0, 47, 167), (133, 167, 255), (244, 245, 247)
VITORIA, DERROTA, FUNDO_RLR = (0, 118, 69), (181, 48, 49), (5, 10, 26)

PAUSA_MIN, PAUSA, PAUSA_FRASE = 0.2, 0.12, 0.22
SILENCIO_DB = -52  # the mic's quiet, from its own spread (NVIDIA Broadcast leaves almost nothing between words)
BLOCK_CHARS = 34


# ---------------------------------------------------------------------------------------------------- the take


def ffmpeg(*args, **kw):
    return subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", *args], check=True, **kw)


def duration(path):
    out = subprocess.run([str(FFMPEG), "-i", str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def mic(path, stream):
    raw = ffmpeg("-i", str(path), "-map", f"0:a:{stream}", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-",
                 capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def pauses(audio, threshold=SILENCIO_DB, shortest=0.15):
    """[(from, to)] in seconds where the mic is quiet for `shortest` s or more."""
    hop = SR // 100
    power = np.convolve(audio ** 2, np.ones(2 * hop) / (2 * hop), "same")[::hop]
    quiet = 10 * np.log10(power + 1e-12) < threshold
    found, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if i - start >= shortest * 100:
                found.append((start / 100, i / 100))
            start = None
    if start is not None:
        found.append((start / 100, len(quiet) / 100))
    return found


def snap(words, quiet):
    """Whisper's word times pulled out of the quiet: a word starting in a pause starts when it ends, one ending in
    a pause ends when it starts (whisper stretches the first word back to 0, and some ends into the next pause)."""
    out = []
    for a, b, w in words:
        for q0, q1 in quiet:
            if q0 <= a and b <= q1:  # all of it in a pause: said as the pause ends
                a, b = q1, q1 + min(0.3, b - a)
            if q0 <= a < q1 and q1 < b:
                a = q1
            if q0 < b <= q1 and q0 > a:
                b = q0
        if out:
            a = max(a, out[-1][0] + 0.03)
        out.append((a, max(b, a + 0.05), w))
    return out


def keeps(words, quiet, length, tail):
    """The take's stretches kept: from the first word to `tail` s after the last, every pause between shrunk."""
    first, last = words[0][0], words[-1][1]
    spans, start = [], max(0.0, first - 0.04)
    for q0, q1 in quiet:
        if q1 - q0 < PAUSA_MIN or q0 < first or q1 > last:
            continue
        before = [w for w in words if w[1] <= q0 + 0.05]
        keep = PAUSA_FRASE if before and before[-1][2][-1] in ".?!" else PAUSA
        spans.append((start, q0 + keep / 2))
        start = q1 - keep / 2
    spans.append((start, min(length, last + tail)))
    return spans


class Clock:
    """Take seconds ↔ short seconds through the kept stretches."""

    def __init__(self, spans):
        self.spans = spans
        self.starts = np.cumsum([0] + [b - a for a, b in spans])
        self.length = float(self.starts[-1])

    def out(self, t):
        for (a, b), o in zip(self.spans, self.starts):
            if t < a:
                return float(o)
            if t <= b:
                return float(o + t - a)
        return self.length

    def take(self, o):
        for (a, b), s in zip(self.spans, self.starts):
            if o <= s + (b - a):
                return a + max(0.0, o - s)
        return self.spans[-1][1]


class Stage:
    """Every frame of the take's play area, kept as JPEG in memory so shots can jump anywhere in it."""

    def __init__(self, path, rect, length):
        x, y, w, h = rect
        self.w, self.h = w, h
        proc = subprocess.Popen([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(path), "-vf",
                                 f"crop={w}:{h}:{x}:{y}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                                stdout=subprocess.PIPE)
        self.frames, size = [], w * h * 3
        while chunk := proc.stdout.read(size):
            if len(chunk) < size:
                break
            frame = np.frombuffer(chunk, np.uint8).reshape(h, w, 3)
            self.frames.append(cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])[1])
        proc.wait()
        self.cache = {}

    def at(self, i):
        i = min(max(0, i), len(self.frames) - 1)
        if i not in self.cache:
            if len(self.cache) > 48:
                self.cache.pop(next(iter(self.cache)))
            self.cache[i] = cv2.imdecode(self.frames[i], cv2.IMREAD_UNCHANGED)
        return self.cache[i]

    def frame(self, s, ds):
        """The picture at take second `s`; when the shot runs fast (`ds` take seconds per frame of the short),
        the frames it skips over are blended: motion blur, so speed reads as speed."""
        n = int(min(8, max(1, round(abs(ds) * FPS))))
        if n == 1:
            return self.at(round(s * FPS))
        acc = np.zeros((self.h, self.w, 3), np.float32)
        for k in range(n):
            acc += self.at(round((s + ds * k / n) * FPS))
        return (acc / n).astype(np.uint8)


class Camera:
    """The camera's part of the take, read forwards only (the short's clock never runs the take backwards)."""

    def __init__(self, path):
        self.proc = subprocess.Popen([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(path), "-vf",
                                      f"crop={W}:{CAM_H}:0:{TOP}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                                     stdout=subprocess.PIPE)
        self.index, self.last = -1, np.zeros((CAM_H, W, 3), np.uint8)

    def at(self, i):
        while self.index < i:
            chunk = self.proc.stdout.read(W * CAM_H * 3)
            if len(chunk) < W * CAM_H * 3:
                break
            self.last = np.frombuffer(chunk, np.uint8).reshape(CAM_H, W, 3)
            self.index += 1
        return self.last


# ------------------------------------------------------------------------------------------------- the roteiro


def plain(word):
    return re.sub(r"[^\w]", "", word).casefold()


def resolver(words, clock):
    """at("palavra"), at("palavra#2"), at("palavra>"), at("palavra|"), at(12.5): seconds of the short."""

    def at(anchor):
        if isinstance(anchor, (int, float)):
            return clock.out(anchor)
        m = re.fullmatch(r"(.+?)(?:#(\d+))?([>|]?)", anchor)
        name, nth, edge = plain(m[1]), int(m[2] or 1), m[3]
        hits = [i for i, w in enumerate(words) if plain(w[2]) == name]
        if len(hits) < nth:
            raise SystemExit(f"roteiro: \"{anchor}\" não foi dita ({len(hits)} vezes)")
        i = hits[nth - 1]
        if edge == ">":
            return clock.out(words[i][1])
        if edge == "|":
            after = clock.out(words[i][1])
            following = clock.out(words[i + 1][0]) if i + 1 < len(words) else clock.length
            return (after + following) / 2
        return clock.out(words[i][0])

    return at


def ease(x):
    x = min(1.0, max(0.0, x))
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def keyed(keys, t):
    """Values eased between keyframes [(t, v1, v2, …)], held before the first and after the last."""
    if t <= keys[0][0]:
        return keys[0][1:]
    for k0, k1 in zip(keys, keys[1:]):
        if t <= k1[0]:
            e = ease((t - k0[0]) / (k1[0] - k0[0])) if k1[0] > k0[0] else 1
            return tuple(a + (b - a) * e for a, b in zip(k0[1:], k1[1:]))
    return keys[-1][1:]


class Shot:
    def __init__(self, spec, end):
        self.start, self.end = spec["de"], end
        self.src = spec["fonte"]  # [(short s, take s)], linear between, `depois` take-s per s after the last
        self.after = spec.get("depois", 1.0)
        self.view = spec.get("quadro", [(self.start, 540, 282, 1.0)])  # [(short s, cx, cy, zoom)] in stage px
        self.fx = set(spec.get("fx", []))
        self.entry = spec.get("entrada", "punch")
        self.crop = spec.get("recorte")  # (x0, y0, x1, y1) of the stage worth showing; the rest is the blurred copy

    def source(self, t):
        k = self.src
        if t <= k[0][0]:
            return k[0][1] + (t - k[0][0])
        for (o0, s0), (o1, s1) in zip(k, k[1:]):
            if t <= o1:
                return s1 if o1 == o0 else s0 + (s1 - s0) * (t - o0) / (o1 - o0)
        return k[-1][1] + (t - k[-1][0]) * self.after


# ------------------------------------------------------------------------------------------------ the pictures


def font(size, weight="Bold"):
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_name(weight)
    return f


def rounded(size, radius, fill, outline=None, width=0):
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=fill, outline=outline,
                                         width=width)
    return im


def shadowed(card, blur=18, offset=8, alpha=110):
    pad = blur * 2
    out = Image.new("RGBA", (card.width + 2 * pad, card.height + 2 * pad), (0, 0, 0, 0))
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    mask = card.split()[3].point(lambda a: a * alpha // 255)
    shadow.paste((0, 0, 20, 255), (pad, pad + offset), mask)
    out = Image.alpha_composite(out, shadow.filter(ImageFilter.GaussianBlur(blur)))
    out.alpha_composite(card, (pad, pad))
    return out


def wrap(draw, runs, width, fnt, bold):
    """Lines of (text, highlighted) runs, wrapped at spaces to `width` px."""
    lines, line, x = [], [], 0
    for text, hi in runs:
        for word in re.findall(r"\s*\S+\s*", text):
            f = bold if hi else fnt
            word = word if line else word.lstrip()
            w = draw.textlength(word, font=f)
            if x + draw.textlength(word.rstrip(), font=f) > width and line:
                lines.append(line)
                line, x, word = [], 0, word.lstrip()
                w = draw.textlength(word, font=f)
            line.append((word, hi))
            x += w
    if line:
        lines.append(line)
    return lines


def sprite_comentario(p):
    """A YouTube comment as a card: who, where, the words (a part of them in Klein, bold)."""
    w, pad = 900, 40
    fnt, bold, small = font(38, "Regular"), font(38, "Bold"), font(29, "Regular")
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    lines = wrap(probe, p["texto"], w - 2 * pad, fnt, bold)
    height = pad + 72 + 22 + len(lines) * 52 + pad
    card = rounded((w, height), 30, BRANCO + (255,))
    d = ImageDraw.Draw(card)
    d.ellipse([pad, pad, pad + 72, pad + 72], fill=KLEIN)
    d.text((pad + 36, pad + 36), p["inicial"], font=font(38), fill=BRANCO, anchor="mm")
    d.text((pad + 92, pad + 6), p["autor"], font=font(34), fill=(15, 15, 15))
    d.text((pad + 92, pad + 46), p["onde"], font=small, fill=(96, 96, 96))
    y = pad + 72 + 22
    for line in lines:
        x = pad
        for word, hi in line:
            d.text((x, y), word, font=bold if hi else fnt, fill=KLEIN if hi else (25, 25, 25))
            x += d.textlength(word, font=bold if hi else fnt)
        y += 52
    return shadowed(card)


def sprite_rlr(p):
    """RLR's own title (R, L in Klein claro, R; "ROCKET LEAGUE REPLAY"), sharp, on the page's own ground."""
    w, h = 760, 330
    card = Image.new("RGBA", (w, h), FUNDO_RLR + (255,))
    d = ImageDraw.Draw(card)
    big = font(190, "Medium")
    parts = [("R", BRANCO), ("L", CLARO), ("R", BRANCO)]
    total = sum(d.textlength(t, font=big) for t, _ in parts) - 2 * 6
    x = (w - total) / 2
    for t, c in parts:
        d.text((x, 30), t, font=big, fill=c)
        x += d.textlength(t, font=big) - 6
    sub, label = font(36, "Regular"), "ROCKET LEAGUE REPLAY"
    spaced = sum(d.textlength(ch, font=sub) for ch in label) + 0.2 * 36 * (len(label) - 1)
    x = (w - spaced) / 2
    for ch in label:
        d.text((x, 248), ch, font=sub, fill=(244, 245, 247, 110))
        x += d.textlength(ch, font=sub) + 0.2 * 36
    # Soft edges, so it sits in the page rather than on it.
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], 60, fill=255)
    card.putalpha(mask.filter(ImageFilter.GaussianBlur(14)))
    return card


def sprite_chip(p):
    """A pill: Klein (or `fundo`), text in Branco with a tail in Klein claro, an optional icon before it."""
    fnt = font(p.get("tamanho", 40))
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    text, tail = p["texto"], p.get("cauda", "")
    icon = p.get("icone")
    tw = probe.textlength(text + tail, font=fnt)
    ih = p.get("tamanho", 40) + 34
    iw = ih - 14 if icon else 0
    w = int(tw + 2 * 34 + (iw + 14 if icon else 0))
    fill = p.get("fundo", KLEIN)
    ink = p.get("tinta", BRANCO)
    card = rounded((w, ih), ih // 2, fill + (p.get("opacidade", 255),))
    d = ImageDraw.Draw(card)
    x = 34
    if icon == "arquivo":
        s = iw * 0.62
        x0, y0 = x + 4, (ih - s * 1.25) / 2
        fold = s * 0.32
        d.polygon([(x0, y0), (x0 + s - fold, y0), (x0 + s, y0 + fold), (x0 + s, y0 + s * 1.25), (x0, y0 + s * 1.25)],
                  fill=p.get("cor_icone", KLEIN))
        d.polygon([(x0 + s - fold, y0), (x0 + s - fold, y0 + fold), (x0 + s, y0 + fold)], fill=CLARO)
        x += iw + 14
    elif icon == "globo":
        r = iw * 0.36
        cx, cy = x + iw / 2, ih / 2
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=CLARO, width=4)
        d.ellipse([cx - r * 0.45, cy - r, cx + r * 0.45, cy + r], outline=CLARO, width=3)
        d.line([cx - r, cy, cx + r, cy], fill=CLARO, width=3)
        x += iw + 14
    elif icon == "ponto":
        r = 9
        d.ellipse([x + 4, ih / 2 - r, x + 4 + 2 * r, ih / 2 + r], fill=(59, 130, 246))
        x += 2 * r + 18
        w = w  # the dot is narrower than an icon; the pill keeps the room
    d.text((x, ih / 2), text, font=fnt, fill=ink, anchor="lm")
    if tail:
        d.text((x + d.textlength(text, font=fnt), ih / 2), tail, font=fnt, fill=p.get("cor_cauda", CLARO), anchor="lm")
    return shadowed(card, 12, 6, 90)


def sprite_rebobinar(p):
    """A VCR's on-screen ◀◀ with its word, white with a hard shadow."""
    fnt = font(66)
    text = p.get("texto", "VOLTANDO")
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(150 + probe.textlength(text, font=fnt)) + 30
    im = Image.new("RGBA", (w, 110), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for dx, color in ((5, (0, 0, 0, 170)), (0, BRANCO + (255,))):
        for k in range(2):
            x = 10 + dx + k * 52
            d.polygon([(x + 52, 22 + dx), (x + 52, 88 + dx), (x, 55 + dx)], fill=color)
        d.text((140 + dx, 55 + dx), text, font=fnt, fill=color, anchor="lm")
    return im


def sprite_carimbo(p):
    """The stamp: a word on a plate, turned a little, slammed on."""
    fnt = font(p.get("tamanho", 132))
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    text = p["texto"]
    tw = probe.textlength(text, font=fnt)
    w, h = int(tw + 90), int(p.get("tamanho", 132) * 1.45)
    card = rounded((w, h), 26, p.get("fundo", VITORIA) + (255,), outline=BRANCO + (255,), width=8)
    d = ImageDraw.Draw(card)
    d.text((w / 2, h / 2 + 4), text, font=fnt, fill=BRANCO, anchor="mm")
    card = card.rotate(p.get("giro", -5), resample=Image.BICUBIC, expand=True)
    return shadowed(card, 16, 10, 140)


SPRITES = {"comentario": sprite_comentario, "rlr": sprite_rlr, "chip": sprite_chip, "rebobinar": sprite_rebobinar,
           "carimbo": sprite_carimbo}


def place(frame, sprite, cx, cy, scale, alpha):
    """Alpha-composites an RGBA sprite (numpy) centred on (cx, cy), scaled, at an opacity, onto an RGB frame."""
    if alpha <= 0.01 or scale <= 0.01:
        return
    if abs(scale - 1) > 0.002:
        sprite = cv2.resize(sprite, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
    h, w = sprite.shape[:2]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    fx0, fy0, fx1, fy1 = max(0, x0), max(0, y0), min(frame.shape[1], x0 + w), min(frame.shape[0], y0 + h)
    if fx1 <= fx0 or fy1 <= fy0:
        return
    part = sprite[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0].astype(np.float32)
    a = part[..., 3:4] / 255 * alpha
    region = frame[fy0:fy1, fx0:fx1].astype(np.float32)
    frame[fy0:fy1, fx0:fx1] = (region * (1 - a) + part[..., :3] * a).astype(np.uint8)


def animate(o, t):
    """(scale, alpha, dy) of an overlay at short second `t`."""
    a, b = o["de"], o["ate"]
    if t < a or t > b:
        return 0, 0, 0
    kind = o.get("anim", "pop")
    x = t - a
    if kind == "slam":
        d = 0.14
        scale = 1 + 0.8 * (1 - ease(x / d)) if x < d else 1 + 0.04 * math.exp(-(x - d) * 14) * math.cos((x - d) * 40)
        alpha = min(1, x / 0.06)
    elif kind == "slide":
        scale, alpha = 1, min(1, x / 0.18)
    elif kind == "corte":
        scale, alpha = 1, 1
    else:  # pop: overshoot then settle
        d = 0.24
        scale = 0.6 + 0.4 * ease(x / d) + 0.07 * math.sin(min(1, x / d) * math.pi) if x < d else 1
        alpha = min(1, x / 0.08)
    dy = 40 * (1 - ease(x / 0.22)) if kind == "slide" else 0
    out = b - t
    if out < 0.14 and o.get("saida", "fade") == "fade":
        alpha *= out / 0.14
        scale *= 0.96 + 0.04 * out / 0.14
    return scale, alpha, dy


# ---------------------------------------------------------------------------------------------------- the sound


def svf_bandpass(x, freqs, q=1.0):
    """A state-variable band-pass whose centre moves sample by sample (a whoosh is noise swept through one)."""
    low = band = 0.0
    out = np.empty_like(x)
    damp = 1 / q
    for i in range(len(x)):
        f = 2 * math.sin(math.pi * min(freqs[i], SR / 6) / SR)
        high = x[i] - low - damp * band
        band += f * high
        low += f * band
        out[i] = band
    return out


def lowpass(x, cutoff):
    a = math.exp(-2 * math.pi * cutoff / SR)
    out, y = np.empty_like(x), 0.0
    for i in range(len(x)):
        y = (1 - a) * x[i] + a * y
        out[i] = y
    return out


RNG = np.random.default_rng(7)


def sfx(name, length=None):
    """A sound effect, synthesised the same way every time; mono, peak 1."""
    if name in ("uuuh", "palmas", "badumtss", "boing", "buzina", "lance", "suspense", "tambor"):
        with wave.open(str(SONS / f"{name}.wav")) as f:
            raw = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
            raw = raw.reshape(-1, f.getnchannels()).mean(axis=1)
            if f.getframerate() != SR:
                raw = np.interp(np.arange(0, len(raw), f.getframerate() / SR), np.arange(len(raw)), raw)
    else:
        d = length or {"whoosh": 0.42, "whoosh_curto": 0.26, "boom": 1.1, "hit": 0.45, "pop": 0.11, "click": 0.05,
                       "ding": 1.4, "riser": 1.4, "rebobinar": 1.8, "freio": 0.5}[name]
        n = int(d * SR)
        t = np.arange(n) / SR
        if name in ("whoosh", "whoosh_curto"):
            noise = RNG.standard_normal(n).astype(np.float32)
            freqs = np.geomspace(350, 3800, n) if name == "whoosh" else np.geomspace(600, 5000, n)
            peak = 0.62
            env = np.where(t / d < peak, (t / d / peak) ** 2, ((1 - t / d) / (1 - peak)) ** 1.5)
            raw = svf_bandpass(noise, freqs, 1.6) * env
        elif name == "freio":  # the freeze: a whoosh swept down, quick
            noise = RNG.standard_normal(n).astype(np.float32)
            raw = svf_bandpass(noise, np.geomspace(4000, 250, n), 2.0) * np.exp(-t * 5) * np.minimum(1, t / 0.01)
        elif name == "boom":
            phase = 2 * np.pi * np.cumsum(38 + 110 * np.exp(-t * 16)) / SR
            body = np.sin(phase) * np.exp(-t * 3.6)
            click = lowpass(RNG.standard_normal(n).astype(np.float32), 2500) * np.exp(-t * 90) * 2.5
            rumble = lowpass(RNG.standard_normal(n).astype(np.float32), 180) * np.exp(-t * 4) * 3
            raw = np.tanh(1.6 * (body + click + rumble))
        elif name == "hit":
            phase = 2 * np.pi * np.cumsum(70 + 160 * np.exp(-t * 30)) / SR
            body = np.sin(phase) * np.exp(-t * 9)
            snap_ = svf_bandpass(RNG.standard_normal(n).astype(np.float32), np.full(n, 1800.0), 0.8) * np.exp(-t * 45)
            raw = np.tanh(1.4 * (body + 1.2 * snap_))
        elif name == "pop":
            phase = 2 * np.pi * np.cumsum(np.geomspace(480, 1500, n)) / SR
            raw = np.sin(phase) * np.exp(-t * 38) * np.minimum(1, t / 0.002)
        elif name == "click":
            raw = (svf_bandpass(RNG.standard_normal(n).astype(np.float32), np.full(n, 3200.0), 1.2) * np.exp(-t * 260)
                   + 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 180))
        elif name == "ding":
            raw = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k)
                      for f, a, k in ((1318.5, 1.0, 2.6), (2637, 0.35, 4.5), (3951, 0.16, 7), (1975.5, 0.5, 3.4)))
            raw = raw * np.minimum(1, t / 0.003)
        elif name == "riser":
            noise = RNG.standard_normal(n).astype(np.float32)
            env = (t / d) ** 2.2
            tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(180, 880, n)) / SR) * 0.35
            raw = (svf_bandpass(noise, np.geomspace(300, 6000, n), 2.2) + tone) * env
            raw[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
        elif name == "rebobinar":  # a tape rewinding: chattering hiss, a whine climbing, wobbling
            noise = RNG.standard_normal(n).astype(np.float32)
            chatter = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * (26 + 6 * t) * t))
            hiss = svf_bandpass(noise, 2600 + 900 * np.sin(2 * np.pi * 3.1 * t), 1.4) * chatter
            whine = np.sin(2 * np.pi * np.cumsum(900 + 500 * t / d + 40 * np.sin(2 * np.pi * 7 * t)) / SR) * 0.18
            env = np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.12)
            raw = (hiss + whine) * env
        raw = raw.astype(np.float32)
    return raw / (np.abs(raw).max() + 1e-9)


def mixdown(voice_take, clock, sounds, length):
    """His voice cut to the kept stretches (4 ms fades at each seam), levelled, the effects under it."""
    out = np.zeros(int(length * SR) + SR, np.float32)
    fade = int(0.004 * SR)
    for (a, b), o in zip(clock.spans, clock.starts):
        piece = voice_take[int(a * SR):int(b * SR)].copy()
        if len(piece) > 2 * fade:
            piece[:fade] *= np.linspace(0, 1, fade)
            piece[-fade:] *= np.linspace(1, 0, fade)
        out[int(o * SR):int(o * SR) + len(piece)] += piece
    hop = SR // 50
    frames = out[:len(out) // hop * hop].reshape(-1, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    speech = rms[rms > 10 ** (-50 / 20)]
    level = 20 * np.log10(np.sqrt((speech ** 2).mean()) + 1e-9) if len(speech) else -30
    out *= 10 ** ((-20 - level) / 20)  # speech at -20 dBFS RMS; effects are set against that
    voice_peak = 10 ** (-20 / 20) * 2.8  # speech's typical peak at that RMS
    for at, name, gain, *size in sounds:
        s = sfx(name, *size) * voice_peak * 10 ** (gain / 20)
        i = int(max(0, at) * SR)
        out[i:i + len(s)] += s[:len(out) - i]
    return out[:int(length * SR)]


# ---------------------------------------------------------------------------------------------------- captions


def ass_time(seconds):
    cs = round(seconds * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def captions(said, keys):
    """shorts.py's captions (blocks of up to two lines built word by word on the seam), the key words 18% bigger
    and staying Klein claro once said."""
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

            def size(j):
                return big if key[j] else "\\fscx100\\fscy100"

            behind = " ".join(
                ("{\\alpha&HFF&\\3a&H70&\\3c&HFFA785&\\bord22\\blur10\\t(0,160,\\bord14)" + size(j) + "}" if j == i
                 else "{\\alpha&HFF&\\3a&HFF&" + size(j) + "}") + w for j, (_, _, w) in enumerate(block))
            parts = []
            for j, (_, _, w) in enumerate(block):
                if j < i:
                    color = "\\alpha&H00&\\c&HFFA785&" if key[j] else "\\alpha&H00&\\c&HF7F5F4&"
                elif j == i:
                    color = "\\alpha&H00&\\c&HFFA785&"
                else:
                    color = "\\alpha&HFF&"
                parts.append("{" + color + size(j) + "}" + w)
            events.append(f"Dialogue: 0,{at},Legenda,,0,0,0,,{{\\an2\\pos(540,{TOP - 18})}}{behind}")
            events.append(f"Dialogue: 1,{at},Legenda,,0,0,0,,{{\\an2\\pos(540,{TOP - 18})}}{' '.join(parts)}")
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


# -------------------------------------------------------------------------------------------------- the render


class Edit:
    def __init__(self, roteiro_path, fast=False):
        spec = importlib.util.spec_from_file_location("roteiro", roteiro_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.mod, self.fast = mod, fast
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from windows import VIDEOS
        self.videos = VIDEOS
        self.source = VIDEOS / "Shorts" / mod.TAKE
        self.work = WORK / Path(mod.TAKE).stem.replace(" ", "_")
        self.work.mkdir(parents=True, exist_ok=True)
        self.take = self.work / "take.mp4"
        if not self.take.exists() or self.take.stat().st_size != self.source.stat().st_size:
            shutil.copy(self.source, self.take)
        self.length = duration(self.take)
        self.voice = mic(self.take, getattr(mod, "MIC", 1))
        self.quiet = pauses(self.voice)
        self.words = snap(self.transcribe(), self.quiet)
        self.clock = Clock(keeps(self.words, self.quiet, self.length, getattr(mod, "CAUDA", 0.3)))
        self.at = resolver(self.words, self.clock)
        r = mod.roteiro(self.at)
        self.end = r.get("fim", self.clock.length)
        shots = sorted(r["cenas"], key=lambda s: s["de"])
        self.shots = [Shot(s, (shots[i + 1]["de"] if i + 1 < len(shots) else self.end)) for i, s in enumerate(shots)]
        self.camera = r.get("camera", [(0, 1.0)])
        self.cam_center = r.get("centro_camera", (540, 470))
        self.impacts = r.get("impactos", [])
        self.overlays = r.get("sobreposicoes", [])
        self.sounds = []
        for at, name, gain, *length in r.get("sons", []):
            self.sounds.append((self.when(at) if isinstance(at, tuple) else at, name, gain, *length))
        for o in self.overlays:
            if isinstance(o.get("de"), tuple):
                o["de"] = self.when(o["de"])
            if o["tipo"] in SPRITES:
                o["sprite"] = np.array(SPRITES[o["tipo"]](o).convert("RGBA"))
        for i in self.impacts:
            if isinstance(i["em"], tuple):
                i["em"] = self.when(i["em"])
        self.stage_rect = getattr(mod, "PALCO", (0, 258, 1080, 564))
        self.keys = {plain(k) for k in getattr(mod, "DESTAQUES", [])}

    def transcribe(self):
        cache = self.work / "palavras.json"
        if cache.exists():
            said = json.loads(cache.read_text(encoding="utf-8"))
        else:
            from shorts import words
            # From when he starts talking: whisper stretches a first word back over the silence before it.
            onset = self.quiet[0][1] - 0.1 if self.quiet and self.quiet[0][0] < 0.05 else 0.0
            said = [(a + onset, b + onset, w) for a, b, w in words(self.source, onset, self.length)]
            cache.write_text(json.dumps(said, ensure_ascii=False), encoding="utf-8")
        fixes = getattr(self.mod, "TROCAS", {})
        out = []
        for a, b, w in said:
            lead, core, tail = re.fullmatch(r"(\W*)(.*?)(\W*)", w).groups()
            for wrong, right in fixes.items():
                if core.casefold() == wrong.casefold():
                    w = lead + right + tail
            out.append((a, b, w))
        return out

    def when(self, anchor):
        """("fonte", 31.0): the short's second when its shot shows take second 31.0 (("fonte", 31.0, -1.4): 1.4 s
        before that)."""
        _, target, *shift = anchor
        return self.first_showing(target) + (shift[0] if shift else 0)

    def first_showing(self, target):
        for shot in self.shots:
            t, step = shot.start, 1 / FPS
            prev = shot.source(t)
            while t < shot.end:
                now = shot.source(t + step)
                if min(prev, now) <= target <= max(prev, now):
                    return t + step
                prev, t = now, t + step
        raise SystemExit(f"roteiro: nenhuma cena mostra o segundo {target} do take")

    def shot_at(self, t):
        for s in self.shots:
            if s.start <= t < s.end:
                return s
        return self.shots[-1]

    def view(self, shot, t):
        cx, cy, z = keyed(shot.view, t)
        rel = t - shot.start
        if shot.entry == "punch" and rel < 0.16:
            z *= 1 + 0.07 * (1 - rel / 0.16) ** 2
        for i in self.impacts:
            if t >= i["em"]:
                z *= 1 + i.get("chute", 0.06) * math.exp(-(t - i["em"]) / 0.09)
        x0, y0, x1, y1 = shot.crop or (0, 0, self.stage_rect[2], self.stage_rect[3])
        # Never past the picture's edges when it covers the top; never off it when it doesn't (then cy=999 sits it
        # at the top, the blurred copy under it, behind the captions).
        for lo, hi, name in ((x0 + 540 / z, x1 - 540 / z, "x"), (y0 + 528 / z, y1 - 528 / z, "y")):
            lo, hi = min(lo, hi), max(lo, hi)
            if name == "x":
                cx = min(max(cx, lo), hi)
            else:
                cy = min(max(cy, lo), hi)
        return cx, cy, z

    def to_screen(self, shot, t, x, y):
        cx, cy, z = self.view(shot, t)
        dx, dy = self.shake(t)
        return 540 + (x - cx) * z + dx, 528 + (y - cy) * z + dy, z

    def shake(self, t):
        dx = dy = 0.0
        for i in self.impacts:
            x = t - i["em"]
            if 0 <= x < 0.6 and i.get("tremor"):
                a = i["tremor"] * math.exp(-x / 0.12)
                dx += a * math.sin(2 * math.pi * 19 * x + 1.3)
                dy += a * math.cos(2 * math.pi * 23 * x)
        return dx, dy

    def top(self, t, stage):
        shot = self.shot_at(t)
        s = shot.source(t)
        ds = shot.source(t + 1 / FPS) - s
        pic = stage.frame(s, ds)
        sw, sh = stage.w, stage.h
        cx, cy, z = self.view(shot, t)
        dx, dy = self.shake(t)
        # Behind: the same picture, blurred and darkened, covering the whole top.
        small = cv2.resize(pic, (sw // 8, sh // 8), interpolation=cv2.INTER_AREA)
        cover = max(W / sw, TOP / sh)
        cw, ch = W / cover / 8, TOP / cover / 8
        x0 = (small.shape[1] - cw) / 2
        y0 = (small.shape[0] - ch) / 2
        crop = small[int(y0):int(y0 + ch) + 1, int(x0):int(x0 + cw) + 1]
        back = cv2.GaussianBlur(cv2.resize(crop, (W // 4, TOP // 4)), (0, 0), 6)
        back = cv2.resize(back, (W, TOP), interpolation=cv2.INTER_LINEAR)
        back = (back.astype(np.float32) * 0.45 + np.array(KLEIN, np.float32) * 0.12).astype(np.uint8)
        m = np.float32([[z, 0, 540 - cx * z + dx], [0, z, 528 - cy * z + dy]])
        fg = cv2.warpAffine(pic, m, (W, TOP), flags=cv2.INTER_LINEAR if self.fast else cv2.INTER_CUBIC,
                            borderMode=cv2.BORDER_REPLICATE)
        if z > 1.15 and not self.fast:
            blur = cv2.GaussianBlur(fg, (0, 0), 1.2)
            fg = cv2.addWeighted(fg, 1.45, blur, -0.45, 0)
        c0, c1, c2, c3 = shot.crop or (0, 0, sw, sh)
        rx0, ry0 = max(0, int(math.ceil(540 + (c0 - cx) * z + dx))), max(0, int(math.ceil(528 + (c1 - cy) * z + dy)))
        rx1, ry1 = min(W, int(540 + (c2 - cx) * z + dx)), min(TOP, int(528 + (c3 - cy) * z + dy))
        out = back
        out[ry0:ry1, rx0:rx1] = fg[ry0:ry1, rx0:rx1]
        if "vhs" in shot.fx:
            out = self.vhs(out, t)
        if "congela" in shot.fx and abs(ds) < 1e-6:
            gray = cv2.cvtColor(out, cv2.COLOR_RGB2GRAY)[..., None].astype(np.float32)
            out = (out.astype(np.float32) * 0.55 + gray * 0.45).astype(np.uint8)
        for i in self.impacts:
            x = t - i["em"]
            if 0 <= x < 0.4 and i.get("flash"):
                r, g, b, a = i["flash"]
                k = a * math.exp(-x / 0.07)
                out = (out.astype(np.float32) * (1 - k) + np.array((r, g, b), np.float32) * k).astype(np.uint8)
        return out, shot

    def vhs(self, img, t):
        f = img.astype(np.int16)
        out = f.copy()
        out[:, 6:, 0] = f[:, :-6, 0]
        out[:, :-6, 2] = f[:, 6:, 2]
        out[::4] = out[::4] * 0.78
        out[1::4] = out[1::4] * 0.88
        band = int((t * 1400) % (TOP + 120)) - 60
        if 0 <= band < TOP - 50:
            out[band:band + 50] = np.roll(out[band:band + 50], 22, axis=1) + 25
        noise = RNG.integers(-14, 15, (TOP // 2, W // 2, 1), dtype=np.int16)
        out += cv2.resize(noise, (W, TOP), interpolation=cv2.INTER_NEAREST)[..., None]
        gray = out.mean(axis=2, keepdims=True)
        out = out * 0.8 + gray * 0.2
        return np.clip(out, 0, 255).astype(np.uint8)

    def cam(self, t, camera):
        pic = camera.at(round(self.clock.take(t) * FPS))
        z = self.cam_zoom(t)
        if abs(z - 1) < 1e-3:
            return pic.copy()
        cx, cy = self.cam_center
        m = np.float32([[z, 0, cx - cx * z], [0, z, cy - cy * z]])
        return cv2.warpAffine(pic, m, (W, CAM_H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    def cam_zoom(self, t):
        """camera: [(s, zoom)] jumps at s (a jump cut), [(s, zoom, "suave")] eases from the previous key to it."""
        z, prev_t, prev_z = 1.0, 0.0, 1.0
        for key in self.camera:
            at, value = key[0], key[1]
            smooth = len(key) > 2
            if t < at:
                if smooth:
                    return prev_z + (value - prev_z) * ease((t - prev_t) / max(1e-6, at - prev_t))
                return z
            z = value
            prev_t, prev_z = at, value
        return z

    def frame(self, t, stage, camera):
        top, shot = self.top(t, stage)
        img = np.empty((H, W, 3), np.uint8)
        img[:TOP] = top
        img[TOP:] = self.cam(t, camera)
        for o in self.overlays:
            if not o["de"] <= t <= o["ate"]:
                continue
            if o["tipo"] == "anel":
                self.ring(img, o, t, shot)
                continue
            scale, alpha, dy = animate(o, t)
            x, y = o.get("x", 540), o.get("y", 528)
            if "ancora" in o:  # a point of the picture: the overlay follows the zoom and the shake
                x, y, _ = self.to_screen(shot, t, *o["ancora"])
                x, y = x + o.get("desloc", (0, 0))[0], y + o.get("desloc", (0, 0))[1]
            place(img, o["sprite"], x, y + dy, scale * o.get("escala", 1), alpha)
        return img

    def ring(self, img, o, t, shot):
        x0, y0, x1, y1 = o["caixa"]
        ax, ay, z = self.to_screen(shot, t, x0, y0)
        bx, by, _ = self.to_screen(shot, t, x1, y1)
        grow = 1 + 0.08 * math.sin((t - o["de"]) * 2 * math.pi * 2.2)
        pad = 10 * grow
        _, alpha, _ = animate({**o, "anim": "slide"}, t)
        layer = img.copy()
        cv2.rectangle(layer, (int(ax - pad), int(ay - pad)), (int(bx + pad), int(by + pad)), CLARO, 7, cv2.LINE_AA)
        cv2.addWeighted(layer, alpha, img, 1 - alpha, 0, img)

    def stills(self, times, folder):
        stage = Stage(self.take, self.stage_rect, self.length)
        for t in sorted(times):
            camera = Camera(self.take)
            img = self.frame(t, stage, camera)
            camera.proc.kill()
            out = folder / f"quadro-{t:06.2f}.png"
            cv2.imwrite(str(out), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
            print(out)

    def render(self, until=None):
        end = min(self.end, until) if until else self.end
        print(f"take {self.length:.1f} s → short {end:.1f} s ({len(self.shots)} cenas)")
        audio = mixdown(self.voice, self.clock, self.sounds, end)
        wav = self.work / "som.wav"
        with wave.open(str(wav), "wb") as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(SR)
            peak = np.abs(audio).max()
            f.writeframes((audio / max(1.0, peak / 0.97) * 32767).astype(np.int16).tobytes())
        said = [(self.clock.out(a), self.clock.out(b), w) for a, b, w in self.words if self.clock.out(a) < end]
        (self.work / "legenda.ass").write_text(captions(said, self.keys), encoding="utf-8")
        shutil.copy(FONT, self.work / FONT.name)
        # Two passes: measured first, then a plain gain to -14 LUFS (one pass undershoots a short clip by ~1 LU).
        log = subprocess.run([str(FFMPEG), "-hide_banner", "-i", str(wav), "-af",
                              "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        m = json.loads(log[log.rindex("{"):log.rindex("}") + 1])
        level = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
                 f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
                 "linear=true")
        main = self.work / "principal.mp4"
        enc = subprocess.Popen(
            [str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s",
             f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", str(wav), "-filter_complex",
             f"[0:v]subtitles=legenda.ass:fontsdir=.,format=yuv420p,setsar=1[v];"
             f"[1:a]{level},aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo[a]",
             "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast" if self.fast else "slow",
             "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-movflags",
             "+faststart", "-shortest", str(main)], stdin=subprocess.PIPE, cwd=self.work)
        print("lendo o take…")
        stage = Stage(self.take, self.stage_rect, self.length)
        camera = Camera(self.take)
        frames = int(round(end * FPS))
        began = time.time()
        for i in range(frames):
            enc.stdin.write(self.frame(i / FPS, stage, camera).tobytes())
            if i % 300 == 0:
                print(f"  {i / FPS:5.1f} s  ({time.time() - began:.0f} s)")
        enc.stdin.close()
        enc.wait()
        camera.proc.kill()
        return main

    def finish(self, main, with_outro=False):
        ready = self.videos / "Shorts" / "prontos"
        date, clock = re.match(r"(\d{4}-\d{2}-\d{2}) (\d{2}-\d{2}-\d{2})", self.mod.TAKE).groups()
        bare = ready / f"{date} {clock} - {self.mod.NOME}.mp4"
        ready.mkdir(parents=True, exist_ok=True)
        shutil.copy(main, bare)
        print(f"prontos\\{bare.name}")
        if not with_outro:
            return
        full = ready / f"{date} {clock} - {self.mod.NOME} (com outro).mp4"
        outro = self.work / "outro.mp4"
        shutil.copy(self.videos / "Partes" / "Shorts" / "outro-editado.mp4", outro)
        joined = self.work / "com-outro.mp4"
        ffmpeg("-y", "-i", str(main), "-i", str(outro), "-filter_complex",
               "[0:v]fps=60,format=yuv420p,setsar=1[a];[1:v]fps=60,format=yuv420p,setsar=1[b];"
               f"[0:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo[x];"
               f"[1:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo[y];"
               "[a][x][b][y]concat=n=2:v=1:a=1[v][o]", "-map", "[v]", "-map", "[o]", "-c:v", "libx264", "-preset",
               "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
               str(joined))
        shutil.copy(joined, full)
        print(f"prontos\\{full.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("roteiro", type=Path)
    parser.add_argument("--quadros", help="only stills at these seconds of the short (comma-separated), to check")
    parser.add_argument("--ate", type=float, help="render only up to this second (a look, not saved to prontos)")
    parser.add_argument("--rapido", action="store_true", help="faster, softer render (a look)")
    parser.add_argument("--palavras", action="store_true", help="print the words with their seconds in the short")
    parser.add_argument("--outro", action="store_true", help="also write a copy with the shorts' outro after it")
    args = parser.parse_args()
    edit = Edit(args.roteiro, fast=args.rapido)
    if args.palavras:
        for a, b, w in edit.words:
            print(f"{edit.clock.out(a):6.2f} {edit.clock.out(b):6.2f}  take {a:6.2f}  {w}")
        print(f"short: {edit.clock.length:.2f} s; cortes: {edit.clock.spans}")
        return
    if args.quadros:
        folder = edit.work / "quadros"
        folder.mkdir(exist_ok=True)
        edit.stills([float(x) for x in args.quadros.split(",")], folder)
        return
    main_file = edit.render(args.ate)
    if args.ate or args.rapido:
        print(main_file)
        return
    edit.finish(main_file, args.outro)


if __name__ == "__main__":
    main()
