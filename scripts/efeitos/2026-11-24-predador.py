"""Vítima de um predador (2026-11-24): after the 1v1 semifinal Evelin (a viewer who had played modestly, then
flip-reset him out of the tournament) is the predator and Luan the prey. Luan's direction (11-26): "Quando for
palhaçada, foco na câmera e na edição com um filtro ou uma brincadeira (coveiro, vítima, Jack Estripador, dá pra colocar
filtros assim em mim e um cenário embaixo). Quando for foco na jogada, fazer uma edição de hype."

Four beats, each a filter on HIM (his camera keyed off its Klein virtual background, or a photoreal edit of his own
frame) over a scenario in the lower half. Evelin is never pictured: she is the lioness, her car, the silhouette.

- O predador (stretch 0, "ela tá claramente só brincando comigo, como um predador que só… acaricia sua presa"): a
  nature documentary. He sits in a golden savanna (warm grade, grain, a documentary card "LUAN MARTINS · presa");
  below, a lioness toying with a tiny rabbit (Gemini; her raised arm cut out and turned about the elbow here, so it
  sways and then pats the rabbit on "acaricia sua presa"), her card "EVELIN · predadora". On "acaricia" the camera
  cuts to him with rabbit ears under a lioness's paw (Gemini, from his own frame), trembling. Savanna ambience, a
  purr.
- A aula (stretch 1): the hype first. "Ela tá aquecida… flip reset na boca do gol. Delayed ainda." plays the game's
  own replay of her goal (Jogo.mp4) in the lower half, ramped: 1× into "que que é isso?", slow motion through the reset
  touch on "Flip" (a punch, a flash, "FLIP RESET"), back up to speed for the delayed flip ("DELAYED") and the goal's
  white. Then the cringe: the lower half is a chalkboard where "Prof. Luan" writes his lesson on Rocket League's
  techniques as he says it; on "você já sabia tudo" a red stamp "ELA JÁ SABIA TUDO" slams across it and every line
  gets a check; on "por que você me deixou falar?" the lights go down to a spotlight and he shrinks (a slide whistle),
  blushing; on "extremamente vergonhoso" he shrinks further, bright red (his real camera all through: round 2).
- A reverência (stretch 2): "Que que é isso? O que que é isso?" pushes into the sky where her ball is, with focus
  lines; then "não, eu não vou nem tocar na bola" turns the lower half into her car's winner celebration (the game's,
  after the semifinal) in slow motion, golden, with rays and sparkles and a choir, and he sits in the same gold; on
  "me desculpa por respirar o mesmo ar que você" he bows, his real camera dipping on each word like "we're not worthy".
- Jack, a estripadora (stretch 3): a horror film. He sits in foggy Victorian London (cold grade, drifting fog, a
  flicker); below, the fog hides a street until lightning on "Jack, o Estripador" shows a top-hat silhouette with a
  blade ("EVELIN, A ESTRIPADORA"). On "ela vem" his car (cut out of the game) rolls into the street, "corta" and
  "partes" slash it, and in his pause after "é isso" it falls apart in three pieces. On "vítima de um predador" his own frame with
  his hands on his face (from "Jack, o Estripador") freezes, keyed into the street, under a stinger.

The stretches come in with this module's own whip (the roteiro's "entrada" is "seco": the scenes replace whole halves
after destaque's transitions would have run). Every sound is synthesised here, but the stream's uuuh and palmas and
destaque's riser, impact-boom, hit, whoosh, apito and coro.
"""
import hashlib
import math
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PARTES = "Lives/2026-11-24/Shorts/Partes/predador"
JOGO = "Lives/2026-11-24/15-15-16 Jogo.mp4"
J_OFF = -0.2215  # Jogo.mp4's second = the live's + this (sincronia.json's median for the live's first part)
DOC, AULA, MUSTY, JACK = range(4)

# O predador (live s, from --palavras and the mic's pauses)
LUAN_TAG = (8354.60, 8362.62)  # "ela tá claramente…" → his card, until the cut
EVELYN_TAG = (8359.18, 8364.10)  # "como um predador" → hers
PATS = (8362.62, 8363.08, 8363.38)  # "acaricia", "sua", "presa": the paw comes down, the last one stays
PRESA = 8362.62  # the cut to him petted
# A aula
REPLAY = [(8433.27, 8425.6), (8436.27, 8428.6), (8437.30, 8429.0), (8439.10, 8429.65), (8440.55, 8431.15)]
FLIP, DELAYED, GOL = 8437.30, 8440.02, 8440.49  # the reset touch, the delayed flip, the goal's white (live s)
LICAO = 8440.55  # the lower half becomes the chalkboard
LOUSA_LINHAS = [  # (live s, text, size, x, y in the 1080² board): written as he says it
    (8441.14, "AULA DO PROF. LUAN", 70, 150, 150),
    (8443.10, "Técnicas do Rocket League:", 54, 150, 290),
    (8443.84, "1. flip reset (difícil!)", 50, 190, 410),
    (8444.30, "2. delayed (avançado!)", 50, 190, 520),
    (8444.75, "3. não sei o quê...", 50, 190, 630),
]
JA_SABIA = 8446.09  # "já sabia tudo": the stamp
CHECKS = (8446.30, 8446.50, 8446.70)
ENCOLHE = (8447.26, 8448.22)  # "por que você me deixou falar?": lights down, he shrinks
VERGONHA = 8448.49  # "extremamente vergonhoso": hiding in his shirt
# A reverência
OQUE = (8471.29, 8473.94)  # "que que é isso? o que que é isso? não, não": into the sky
TRONO = 8478.93  # "não, eu não vou nem tocar na bola": her shrine
DESCULPA = 8480.20  # "me desculpa…": the bow
BOWS = (8480.20, 8480.76, 8481.33, 8481.78)  # "desculpa", "respirar", "mesmo", "você": a bob each
CELEB_J = (8609.75, 8611.45)  # her car's winner celebration, in Jogo.mp4's seconds
# Jack
JACK_T = 8619.53  # "Jack": lightning, the silhouette
VEM = 8621.48  # "ela vem": his car rolls in
CORTES = (8622.31, 8623.51)  # "corta", "partes": the slashes
CAI = 8624.95  # in the pause after "é isso": the pieces fall
VITIMA = 8628.16  # "vítima": the scream

LOGO = (330, 120, 750, 230)  # the camera's background mark (x0, y0, x1, y1 in the camera's half): always background
S = {}


# ---------------------------------------------------------------------------------------------------- helpers


def where(o, ctx):
    st, sp = ctx.clock.starts, ctx.clock.spans
    k = max(i for i in range(len(sp)) if st[i] <= o + 1e-9) if o >= 0 else 0
    return k, sp[k][0] + (o - st[k])


def ease(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def kick(x, size, tau):
    return size * math.exp(-x / tau) if x >= 0 else 0.0


def load(ctx, name, mode="RGB"):
    return np.array(Image.open(ctx.VIDEOS / PARTES / name).convert(mode))


def cover(img, w, h, z=1.0, cx=0.5, cy=0.5, interp=cv2.INTER_LINEAR):
    """img scaled to cover w×h, then zoomed by z about (cx, cy) (fractions of img), that point kept where it falls."""
    ih, iw = img.shape[:2]
    k = max(w / iw, h / ih) * z
    # the point (cx, cy) of the picture lands at the same fraction of the output as it would unzoomed, clamped
    px, py = cx * iw, cy * ih
    ox = w / 2 - px * k + (px * k - w / 2) * 0  # centred on the point
    oy = h / 2 - py * k
    ox = min(0.0, max(w - iw * k, ox))
    oy = min(0.0, max(h - ih * k, oy))
    m = np.float32([[k, 0, ox], [0, k, oy]])
    return cv2.warpAffine(img, m, (w, h), flags=interp, borderMode=cv2.BORDER_REFLECT101)


def zoom(img, z, center, dx=0.0, dy=0.0):
    if abs(z - 1) < 1e-3 and not dx and not dy:
        return img
    cx, cy = center
    m = np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])
    return cv2.warpAffine(img, m, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REFLECT101)


def blend(dst, src, a):
    """dst·(1−a) + src·a, a a float or an HxW(x1) array, uint8 out."""
    if isinstance(a, np.ndarray) and a.ndim == 2:
        a = a[..., None]
    return (dst.astype(np.float32) * (1 - a) + src.astype(np.float32) * a).astype(np.uint8)


def flash(img, a, color=(255, 255, 255)):
    if a > 0.004:
        img[:] = blend(img, np.full_like(img, color), min(1.0, a))


def grain(img, rng, amount):
    noise = rng.normal(0, amount, (img.shape[0] // 2, img.shape[1] // 2)).astype(np.float32)
    noise = cv2.resize(noise, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)[..., None]
    return np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def grade(img, mul=(1, 1, 1), add=(0, 0, 0), sat=1.0, contrast=1.0):
    x = img.astype(np.float32)
    if sat != 1.0:
        g = x.mean(axis=2, keepdims=True)
        x = g + (x - g) * sat
    if contrast != 1.0:
        x = (x - 128) * contrast + 128
    x = x * np.array(mul, np.float32) + np.array(add, np.float32)
    return np.clip(x, 0, 255).astype(np.uint8)


def vignette(h, w, cx, cy, strength, size=1.0):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.hypot((x - cx) / w, (y - cy) / h) / size
    return (1 - strength * np.clip(r * 1.6 - 0.35, 0, 1) ** 1.6).astype(np.float32)


def chave(top, logo=True):
    """His camera keyed off its Klein virtual background: (alpha HxW float32, the picture despilled)."""
    x = top.astype(np.float32)
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    d = b - np.maximum(r, g)
    a = np.clip((75 - d) / 35, 0, 1)
    if logo:
        x0, y0, x1, y1 = LOGO
        a[y0:y1, x0:x1] = 0
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    lim = np.maximum(r, g) + 12
    x[..., 2] = np.where(b > lim, lim + (b - lim) * 0.25, b)
    return a, x


def over(bg, fg, a):
    return (bg.astype(np.float32) * (1 - a[..., None]) + fg * a[..., None]).astype(np.uint8)


def piecewise(t, pts):
    """Linear through [(x, y)], held past the ends."""
    if t <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if t <= x1:
            return y0 + (y1 - y0) * (t - x0) / (x1 - x0)
    return pts[-1][1]


def frames_of(ctx, name, j0, j1):
    """Jogo.mp4's middle square (1080²) from j0 to j1 s as JPEG files in the work folder (cached): (folder, count)."""
    key = hashlib.sha1(repr((j0, j1)).encode()).hexdigest()[:8]
    folder = ctx.work / f"predador-{name}-{key}"
    if not (folder / "pronto").exists():
        folder.mkdir(exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{j0:.3f}", "-i", str(ctx.VIDEOS / JOGO), "-t",
                        f"{j1 - j0:.3f}", "-vf", "crop=1080:1080:420:0", "-q:v", "2", str(folder / "q%04d.jpg")],
                       check=True)
        (folder / "pronto").write_text("ok")
    return folder, len(list(folder.glob("q*.jpg")))


def frame_at(folder, count, j0, j):
    """The square at Jogo second j, blended between its two nearest frames (smooth slow motion)."""
    x = (j - j0) * 60
    i = int(math.floor(x))
    u = x - i
    i = min(max(i, 0), count - 1)
    a = cv2.cvtColor(cv2.imread(str(folder / f"q{i + 1:04d}.jpg")), cv2.COLOR_BGR2RGB)
    if u < 0.05 or i + 1 >= count:
        return a
    b = cv2.cvtColor(cv2.imread(str(folder / f"q{i + 2:04d}.jpg")), cv2.COLOR_BGR2RGB)
    return blend(a, b, u)


# ---------------------------------------------------------------------------------------------------- texts


def card(ctx, name, role):
    """A documentary lower third in the channel's look: the name Branco on a Klein plate cut at 45°, the role under
    it in Klein claro on the dark plate, a Klein claro bar on the left."""
    c = ctx.cores
    big, small = ctx.grotesk(58), ctx.grotesk(36, 500)
    nb, rb = big.getbbox(name), small.getbbox(role)
    w = max(nb[2] - nb[0], rb[2] - rb[0]) + 80
    h1, h2 = 86, 58
    img = Image.new("RGBA", (w + 40, h1 + h2 + 40))
    sh = Image.new("RGBA", img.size)
    ctx.plate(ImageDraw.Draw(sh), 14, 18, w, h1 + h2, (0, 0, 0, 130))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(img)
    ctx.plate(d, 10, 10, w, h1, c["klein"] + (245,), cut=22)
    d.rectangle([10, 10 + h1, 10 + w - 60, 10 + h1 + h2], fill=c["noite"] + (235,))
    d.rectangle([10, 10, 18, 10 + h1 + h2], fill=c["klein_claro"] + (255,))
    d.text((40 - nb[0], 10 + (h1 - (nb[3] - nb[1])) / 2 - nb[1]), name, font=big, fill=c["branco"])
    d.text((40 - rb[0], 10 + h1 + (h2 - (rb[3] - rb[1])) / 2 - rb[1]), role, font=small, fill=c["klein_claro"])
    return np.array(img)


def slam_label(ctx, text, size=150):
    """A play's label: Branco with a dark Klein edge on a Klein band cut at 45° (the hat-trick's goals' look)."""
    c = ctx.cores
    f = ctx.grotesk(size)
    b = f.getbbox(text)
    tw, th = b[2] - b[0], b[3] - b[1]
    edge, pad = 10, 34
    w, h = tw + 2 * pad + 2 * edge + 60, th + 2 * pad + 2 * edge
    img = Image.new("RGBA", (w + 40, h + 40))
    sh = Image.new("RGBA", img.size)
    ctx.plate(ImageDraw.Draw(sh), 26, 30, w, h, (0, 0, 0, 150), cut=40)
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(img)
    ctx.plate(d, 20, 20, w, h, c["klein"] + (240,), cut=40)
    d.line([(60, 22), (20 + w, 22)], fill=c["klein_claro"] + (255,), width=5)
    d.text((20 + 30 + pad + edge - b[0], 20 + pad + edge - b[1]), text, font=f, fill=c["branco"], stroke_width=edge,
           stroke_fill=c["klein_escuro"])
    return np.array(img)


def chalk_text(ctx, text, size):
    """White chalk on the board: Space Grotesk at a light weight, broken up by grain and softened (RGBA)."""
    f = ctx.grotesk(size, 500)
    b = f.getbbox(text)
    w, h = b[2] - b[0] + 20, b[3] - b[1] + 24
    m = Image.new("L", (w, h))
    ImageDraw.Draw(m).text((10 - b[0], 12 - b[1]), text, font=f, fill=255)
    a = np.array(m).astype(np.float32) / 255
    rng = np.random.default_rng(len(text) * 7 + size)
    tex = np.clip(rng.normal(0.85, 0.3, a.shape), 0, 1).astype(np.float32)
    tex = cv2.GaussianBlur(tex, (0, 0), 0.6)
    a = cv2.GaussianBlur(a, (0, 0), 0.7) * tex
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = (238, 240, 232)
    rgba[..., 3] = np.clip(a * 235, 0, 255).astype(np.uint8)
    return rgba


def stamp(ctx, lines):
    """A rubber stamp: red capitals in a double frame, worn (the joke is another look)."""
    red = (214, 32, 38)
    f = ctx.grotesk(104)
    widths = [f.getbbox(t)[2] - f.getbbox(t)[0] for t in lines]
    lh = 116
    w, h = max(widths) + 110, lh * len(lines) + 90
    m = Image.new("L", (w, h))
    d = ImageDraw.Draw(m)
    d.rectangle([6, 6, w - 7, h - 7], outline=255, width=12)
    d.rectangle([26, 26, w - 27, h - 27], outline=255, width=5)
    for i, (t, tw) in enumerate(zip(lines, widths)):
        bb = f.getbbox(t)
        d.text(((w - tw) / 2 - bb[0], 45 + i * lh - bb[1] + 4), t, font=f, fill=255)
    a = np.array(m).astype(np.float32) / 255
    rng = np.random.default_rng(42)
    worn = cv2.GaussianBlur(rng.random(a.shape).astype(np.float32), (0, 0), 1.4)
    a = a * np.clip((worn - 0.2) * 4, 0.55, 1)
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = red
    rgba[..., 3] = np.clip(a * 250, 0, 255).astype(np.uint8)
    return rgba


def check_mark():
    img = Image.new("RGBA", (120, 110))
    ImageDraw.Draw(img).line([(12, 58), (44, 92), (108, 14)], fill=(214, 32, 38, 235), width=16, joint="curve")
    return np.array(img.filter(ImageFilter.GaussianBlur(0.8)))


def paste(dst, sprite, x, y, alpha=1.0, scale=1.0, angle=0.0):
    """sprite (RGBA) onto dst (RGB, in place) with its top-left at (x, y), or centred there when scaled/turned."""
    if scale != 1.0 or angle:
        h, w = sprite.shape[:2]
        m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, scale)
        c, s_ = abs(m[0, 0]), abs(m[0, 1])
        nw, nh = int(h * s_ + w * c) + 2, int(h * c + w * s_) + 2
        m[0, 2] += nw / 2 - w / 2
        m[1, 2] += nh / 2 - h / 2
        sprite = cv2.warpAffine(sprite, m, (nw, nh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        x, y = x - nw / 2, y - nh / 2
    x, y = int(round(x)), int(round(y))
    h, w = sprite.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = sprite[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    a = s[..., 3:4] / 255 * alpha
    part = dst[y0:y1, x0:x1].astype(np.float32)
    dst[y0:y1, x0:x1] = (part * (1 - a) + s[..., :3] * a).astype(np.uint8)


def slam(dst, sprite, cx, cy, x, dur, scale=1.0):
    """A label slamming in at x=0 (1.8 → 1 in 0.12 s with a wobble) and leaving to the right over its last 0.14 s."""
    if not 0 <= x < dur:
        return
    sc = 1 + 0.8 * (1 - ease(x / 0.12)) if x < 0.12 else 1 + 0.04 * math.exp(-(x - 0.12) * 12) * math.cos(
        (x - 0.12) * 40)
    out = ease((x - (dur - 0.14)) / 0.14) if x > dur - 0.14 else 0.0
    paste(dst, sprite, cx + 1080 * out, cy, alpha=min(1.0, x / 0.05), scale=sc * scale)


# ---------------------------------------------------------------------------------------------------- setup


def setup(ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    S["rng"] = np.random.default_rng(24)
    # O predador
    sav = load(ctx, "savana.png")
    S["sav_base"] = load(ctx, "savana-sem-pata.png")
    S["sav_braco"] = load(ctx, "savana-pata.png", "RGBA")
    S["sav_cam"] = grade(cv2.GaussianBlur(cover(sav[0:520, 380:1024], W, CAM_H), (0, 0), 16), (1.04, 0.98, 0.9))
    S["presa"] = cover(load(ctx, "presa.png"), W, CAM_H, interp=cv2.INTER_AREA)
    S["card_luan"] = card(ctx, "LUAN MARTINS", "presa · espécie em perigo")
    S["card_evelyn"] = card(ctx, "EVELIN", "predadora · topo da cadeia alimentar")
    S["vin_cam"] = vignette(CAM_H, W, W / 2, CAM_H * 0.62, 0.55)
    S["vin_bot"] = vignette(1080, W, W / 2, 560, 0.5)
    # A aula
    j0, j1 = REPLAY[0][1] - 0.1, REPLAY[-1][1] + 0.1
    S["replay"] = (*frames_of(ctx, "replay", j0, j1), j0)
    S["lbl_flip"] = slam_label(ctx, "FLIP RESET")
    S["lbl_delayed"] = slam_label(ctx, "DELAYED")
    S["lousa"] = cover(load(ctx, "lousa.png")[40:900, 60:964], W, 1080, interp=cv2.INTER_AREA)
    S["giz"] = [(t, chalk_text(ctx, text, size), x, y) for t, text, size, x, y in LOUSA_LINHAS]
    S["sublinha"] = chalk_text(ctx, "_" * 17, 70)
    S["carimbo"] = stamp(ctx, ["ELA JÁ SABIA", "TUDO"])
    S["check"] = check_mark()
    S["spot"] = spotlight(W, CAM_H)
    # A reverência
    S["celeb"] = (*frames_of(ctx, "celebracao", CELEB_J[0] - 0.05, CELEB_J[1] + 0.05), CELEB_J[0] - 0.05)
    S["ouro_cam"] = gold_bg(W, CAM_H)
    S["linhas"] = focus_lines(W, 1080)
    S["brilhos"] = [(S["rng"].uniform(80, 1000), S["rng"].uniform(60, 1000), S["rng"].uniform(0, 3),
                     S["rng"].uniform(4, 11)) for _ in range(40)]
    # Jack
    lon = load(ctx, "londres.png")
    S["lon"] = cover(lon, W, 1080, z=1.0, interp=cv2.INTER_AREA)
    S["lon_cam"] = grade(cv2.GaussianBlur(cover(lon[0:640, 0:1024], W, CAM_H), (0, 0), 5), sat=0.6)
    # the scream: his own frame with his hands on his face (Câmera.mkv 8620.0, "Jack, o Estripador"), keyed into the street
    S["vitima"] = chave(load(ctx, "vitima-real.png"))
    S["neblina"] = fog_texture(S["rng"], 1600, 1400)
    S["lbl_jack"] = card(ctx, "EVELIN, A ESTRIPADORA", "Londres, 1888 · Rocket League, 2026")
    S["carro"] = car_pieces(ctx)
    S["vin_horror"] = vignette(1080, W, W / 2, 520, 0.75)
    y, x = np.mgrid[0:1080, 0:W].astype(np.float32)
    S["banco"] = np.exp(-(((x - 545) / 210) ** 2 + ((y - 600) / 420) ** 2) * 1.2).astype(np.float32)


def spotlight(w, h):
    """The stage of shame: the dark night, a cone of light from above landing on him."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    cone = np.clip(1 - np.abs(x - w / 2) / (120 + y * 0.42), 0, 1) ** 1.5
    pool = np.clip(1 - np.hypot((x - w / 2) / 330, (y - h + 40) / 110), 0, 1)
    light = np.clip(0.55 * cone + 0.8 * pool, 0, 1)[..., None]
    night = np.array((4, 10, 34), np.float32)
    warm = np.array((255, 238, 200), np.float32)
    return (night * (1 - light) + warm * light * 0.55 + night * light * 0.45).astype(np.uint8)


def gold_bg(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.hypot((x - w / 2) / w, (y - h * 0.35) / h)
    g = np.clip(1 - r * 1.4, 0, 1)[..., None]
    dark, gold = np.array((60, 28, 6), np.float32), np.array((255, 196, 80), np.float32)
    return (dark * (1 - g) + gold * g).astype(np.uint8)


def rays(w, h, cx, cy, t, n=14, strength=0.35):
    """Soft god rays turning slowly about (cx, cy): an additive mask 0..1."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    ang = np.arctan2(y - cy, x - cx)
    m = (0.5 + 0.5 * np.cos(ang * n + t * 0.6)) ** 6
    fall = np.clip(1 - np.hypot(x - cx, y - cy) / (1.3 * max(w, h)), 0, 1)
    return (m * fall * strength).astype(np.float32)


def focus_lines(w, h):
    """Manga focus lines around the middle: an alpha mask with thin wedges, clear in the centre."""
    img = Image.new("L", (w, h))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(5)
    cx, cy = w / 2, h * 0.32
    for _ in range(90):
        a = rng.uniform(0, 2 * math.pi)
        r0 = rng.uniform(260, 420)
        width = rng.uniform(0.006, 0.02)
        p = [(cx + r0 * math.cos(a), cy + r0 * math.sin(a)),
             (cx + 1600 * math.cos(a - width), cy + 1600 * math.sin(a - width)),
             (cx + 1600 * math.cos(a + width), cy + 1600 * math.sin(a + width))]
        d.polygon(p, fill=int(rng.uniform(140, 230)))
    return np.array(img).astype(np.float32) / 255


def fog_texture(rng, w, h):
    """Soft fog: noise at a few scales, blurred and summed (0..1)."""
    out = np.zeros((h, w), np.float32)
    for scale, weight in ((24, 0.5), (60, 0.35), (140, 0.25)):
        n = rng.random((h // scale + 2, w // scale + 2)).astype(np.float32)
        out += cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC) * weight
    out = cv2.GaussianBlur(out, (0, 0), 12)
    return np.clip((out - out.min()) / (out.max() - out.min()), 0, 1)


def fog_at(t, w, h, speed=(40, -6)):
    tex = S["neblina"]
    x = int(t * speed[0]) % (tex.shape[1] - w)
    y = int(abs(t * speed[1])) % (tex.shape[0] - h)
    return tex[y:y + h, x:x + w]


def car_pieces(ctx):
    """His car (cut out of the game) at the street's size, and the three pieces two slashes make of it: each piece's
    RGBA in the car's box and the normal it flies along."""
    car = load(ctx, "carro-dele.png", "RGBA")
    w = 520
    car = cv2.resize(car, (w, int(car.shape[0] * w / car.shape[1])), interpolation=cv2.INTER_AREA)
    h = car.shape[0]
    # the slashes as lines through the car: (point, direction)
    lines = [((w * 0.62, h * 0.5), (0.55, -1.0)), ((w * 0.30, h * 0.5), (-0.8, -1.0))]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    sides = []
    for (px, py), (dx, dy) in lines:
        n = np.array((-dy, dx)) / math.hypot(dx, dy)
        sides.append(((x - px) * n[0] + (y - py) * n[1]) > 0)
    masks = [~sides[1], sides[1] & ~sides[0], sides[0]]  # left of the first cut, between, right of the second
    pieces = []
    for m, push in zip(masks, ((-1.0, -0.2), (0.0, -0.6), (1.0, -0.3))):
        p = car.copy()
        p[..., 3] = (p[..., 3] * m).astype(np.uint8)
        pieces.append((p, push))
    return {"car": car, "pieces": pieces, "lines": lines, "w": w, "h": h}


# ---------------------------------------------------------------------------------------------------- the beats


def beat_doc(f, o, t, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    rng = S["rng"]
    x0 = ctx.clock.starts[DOC]
    # the camera: him in the savanna, or him petted
    if t < PRESA:
        a, fg = chave(f[:CAM_H])
        fg = grade(fg.astype(np.uint8), (1.07, 0.99, 0.86), (6, 2, -6), contrast=1.04)
        bg = zoom(S["sav_cam"], 1.04 + 0.02 * math.sin(o * 0.4), (W / 2, CAM_H / 2), dx=8 * math.sin(o * 0.3))
        top = over(bg, fg.astype(np.float32), a)
        top = zoom(top, 1 + 0.035 * (o - x0) / 9.3, (W / 2, CAM_H * 0.62))
    else:
        x = t - PRESA
        z = 1.0 + kick(x, 0.14, 0.08) + 0.03 * min(1, x / 1.4)
        top = zoom(S["presa"], z, (W * 0.58, CAM_H * 0.62), dx=3 * math.sin(x * 115), dy=2 * math.cos(x * 97))
        flash(top, kick(x, 0.45, 0.05))
    top = (top.astype(np.float32) * S["vin_cam"][..., None]).astype(np.uint8)
    top = grain(top, rng, 6)
    if LUAN_TAG[0] <= t < LUAN_TAG[1]:
        x = t - LUAN_TAG[0]
        slide = (1 - ease(x / 0.25)) * -500
        paste(top, S["card_luan"], 100 + slide, 560)
    f[:CAM_H] = top
    # the lower half: the lioness and the rabbit
    ang = 3.5 * math.sin(2 * math.pi * 0.55 * (t - 8353.3))  # idle: her paw swaying over it
    for i, p in enumerate(PATS):
        x = t - p
        if x < 0:
            continue
        last = i == len(PATS) - 1
        if x < 0.09:
            down = 34 * ease(x / 0.09)
        elif last:
            down = 34 + 2.5 * math.sin(x * 14)  # stays on its head, rubbing
        elif x < 0.16:
            down = 34
        else:
            down = 34 - 20 * ease((x - 0.16) / 0.14)
        ang = max(ang, down) if x < 0.3 or last else ang
    m = cv2.getRotationMatrix2D((535.0, 640.0), -ang, 1.0)
    arm = cv2.warpAffine(S["sav_braco"], m, (1024, 1024), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    scene = blend(S["sav_base"], arm[..., :3], arm[..., 3].astype(np.float32) / 255)
    push = 1.0 + 0.07 * (o - x0) / 10.7 + kick(t - PATS[0], 0.05, 0.1)
    bot = cover(scene, W, 1080, z=push * 1.16, cx=0.56, cy=0.55)
    bot = grade(bot, (1.03, 1.0, 0.94), contrast=1.03)
    bot = (bot.astype(np.float32) * S["vin_bot"][..., None]).astype(np.uint8)
    bot = grain(bot, rng, 6)
    if EVELYN_TAG[0] <= t < EVELYN_TAG[1]:
        x = t - EVELYN_TAG[0]
        paste(bot, S["card_evelyn"], 100 + (1 - ease(x / 0.25)) * -700, 590)
    f[CAM_H:] = bot


def beat_aula(f, o, t, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    rng = S["rng"]
    if t < LICAO:
        # the hype: the game's replay, ramped into the reset touch
        j = piecewise(t, REPLAY)
        folder, count, j0 = S["replay"]
        sq = frame_at(folder, count, j0, j)
        slow = REPLAY[2][0] <= t < REPLAY[3][0]
        z = 1.0 + 0.06 * ease((t - REPLAY[1][0]) / 1.0) + kick(t - FLIP, 0.16, 0.12) + kick(t - DELAYED, 0.08, 0.1)
        if slow:
            z += 0.1 * ease((t - FLIP) / 0.4)
        sq = zoom(sq, z, (540, 470))
        if slow:  # the slow motion's look: a little colder, a vignette
            sq = grade(sq, (0.95, 1.0, 1.08), sat=0.85)
            sq = (sq.astype(np.float32) * S["vin_bot"][..., None]).astype(np.uint8)
        flash(sq, kick(t - FLIP, 0.7, 0.04))
        slam(sq, S["lbl_flip"], W / 2, 210, t - FLIP, 1.6, 0.8)
        slam(sq, S["lbl_delayed"], W / 2, 210, t - DELAYED, 0.95, 0.8)
        f[CAM_H:] = sq
        # his camera: a push on "que que é isso?"
        zc = 1 + 0.1 * ease((t - 8436.39) / 0.3) * (t < LICAO) + kick(t - FLIP, 0.06, 0.1)
        f[:CAM_H] = zoom(f[:CAM_H], zc, (560, 560))
        if GOL - 0.02 <= t:
            flash(f, kick(t - GOL, 0.8, 0.07))
        return
    # the lesson on the board
    board = S["lousa"].copy()
    for i, (tt, sprite, x, y) in enumerate(S["giz"]):
        x_ = t - tt
        if x_ < 0:
            continue
        # written left to right over ~0.35 s
        reveal = min(1.0, x_ / 0.35)
        cut = int(sprite.shape[1] * reveal)
        if cut > 2:
            paste(board, sprite[:, :cut], x, y)
        if i == 0 and x_ > 0.35:
            u = min(1.0, (x_ - 0.35) / 0.25)
            sl = S["sublinha"]
            paste(board, sl[:, :max(2, int(sl.shape[1] * u))], x - 6, y + 40)
    for k, tt in enumerate(CHECKS):
        x_ = t - tt
        if x_ >= 0:
            paste(board, S["check"], 830, LOUSA_LINHAS[2 + k][4] + 40, alpha=min(1, x_ / 0.05),
                  scale=1 + 0.6 * (1 - ease(x_ / 0.1)))
    x_ = t - JA_SABIA
    shake = (kick(x_, 14, 0.08) * math.sin(x_ * 90), kick(x_, 14, 0.08) * math.cos(x_ * 77))
    if x_ >= 0:
        sc = 1 + 1.4 * (1 - ease(x_ / 0.09)) if x_ < 0.09 else 1.0
        paste(board, S["carimbo"], 540 + shake[0], 640 + shake[1], alpha=min(1, x_ / 0.04), scale=sc * 1.1,
              angle=11)
    board = zoom(board, 1 + 0.02 * (t - LICAO) / 10 + kick(x_, 0.04, 0.08), (540, 540), *shake)
    flash(board, kick(t - LICAO, 0.7, 0.08))
    f[CAM_H:] = grain(board, rng, 4)
    # his camera: normal, then the lights go down and he shrinks, blushing; then hiding in his shirt
    if t < ENCOLHE[0]:
        return
    u = ease((t - ENCOLHE[0]) / (ENCOLHE[1] - ENCOLHE[0]))
    dim = ease((t - ENCOLHE[0]) / 0.18)
    if True:  # his real camera all through (round 2: the hiding-in-the-shirt picture is out)
        a, fg = chave(f[:CAM_H])
        late = ease((t - VERGONHA) / 0.5) if t >= VERGONHA else 0.0
        blush = 0.6 * u + 0.4 * late
        fgu = fg
        skin = (fg[..., 0] > fg[..., 2] + 25) & (fg[..., 0] > 90)
        fgu = fg.copy()
        fgu[..., 0] = np.where(skin, np.minimum(255, fg[..., 0] * (1 + 0.45 * blush) + 30 * blush), fg[..., 0])
        fgu[..., 1] = np.where(skin, fg[..., 1] * (1 - 0.45 * blush), fg[..., 1])
        fgu[..., 2] = np.where(skin, fg[..., 2] * (1 - 0.45 * blush), fg[..., 2])
        s = 1 - 0.42 * u - 0.12 * ease((t - VERGONHA) / 1.6) * (t >= VERGONHA)
        s *= 1 + kick(t - VERGONHA, 0.05, 0.06)
        person, alpha = fgu, a
    m = np.float32([[s, 0, (1 - s) * W / 2], [0, s, (1 - s) * CAM_H]])
    tremble = (2.5 * math.sin(t * 120), 1.5 * math.cos(t * 95)) if t >= VERGONHA else (0, 0)
    m[0, 2] += tremble[0]
    m[1, 2] += tremble[1]
    pw = cv2.warpAffine(person, m, (W, CAM_H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    pa = cv2.warpAffine(alpha, m, (W, CAM_H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    klein = f[:CAM_H].astype(np.float32)
    bg = (klein * (1 - dim) + S["spot"].astype(np.float32) * dim)
    if True:  # the camera's own background where he no longer is: keep its Klein until the lights go
        a0 = a
        bg = bg * (1 - a0[..., None]) + (S["spot"].astype(np.float32) * dim + klein * (1 - dim) * 0.0 +
                                         np.array((0, 46, 166), np.float32) * (1 - dim)) * a0[..., None]
    lit = 0.65 + 0.35 * dim  # he stays lit by the spot
    top = (bg * (1 - pa[..., None]) + pw * lit * pa[..., None] + pw * (1 - lit) * pa[..., None] * 0.6)
    f[:CAM_H] = np.clip(top, 0, 255).astype(np.uint8)


def beat_musty(f, o, t, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    rng = S["rng"]
    if t < TRONO:
        a, b = OQUE
        if a <= t < b + 0.4:
            x = t - a
            k = ease(x / 0.25) * (1 - ease((t - b) / 0.4))
            z = 1 + 0.32 * k + kick(t - 8472.58, 0.07, 0.08) + kick(t - 8473.49, 0.06, 0.08)
            sq = zoom(f[CAM_H:].copy(), z, (560, 300))
            lines = S["linhas"] * (0.75 * k) * (0.85 + 0.15 * math.sin(t * 60))
            sq = (sq.astype(np.float32) * (1 - lines[..., None]) + 255 * lines[..., None]).astype(np.uint8)
            f[CAM_H:] = sq
            f[:CAM_H] = zoom(f[:CAM_H], 1 + 0.08 * k, (560, 560))
        return
    # her shrine: the winner celebration, slow, golden
    x = t - TRONO
    folder, count, j0 = S["celeb"]
    span = ctx.clock.spans[MUSTY][1] - TRONO
    j = CELEB_J[0] + (CELEB_J[1] - CELEB_J[0]) * min(1.0, x / span)
    sq = frame_at(folder, count, j0, j)
    sq = grade(sq, (1.06, 0.98, 0.74), (10, 4, -6), sat=0.95, contrast=1.08)
    sq = np.minimum(sq, 236).astype(np.uint8)  # the game's white burst stays gold, not blown out
    r = rays(W, 1080, W / 2, 330, x, n=12, strength=0.26)
    sq = np.clip(sq.astype(np.float32) + r[..., None] * np.array((255, 214, 130), np.float32), 0, 255)
    for bx, by, ph, sz in S["brilhos"]:  # sparkles twinkling
        tw = max(0.0, math.sin(x * 3.2 + ph * 2.1)) ** 6
        if tw > 0.05:
            yy = by - x * 25
            yy = 60 + (yy - 60) % 940
            cv2.circle(sq, (int(bx), int(yy)), int(sz * tw), (255, 245, 210), -1, cv2.LINE_AA)
    sq = np.clip(sq, 0, 255).astype(np.uint8)
    sq = zoom(sq, 1.04 + 0.03 * x / span + kick(x, 0.08, 0.1), (540, 480))
    flash(sq, kick(x, 0.8, 0.09), (255, 236, 190))
    f[CAM_H:] = sq
    # him: in the same gold, then bowing
    if t < DESCULPA:
        a, fg = chave(f[:CAM_H])
        fg = grade(fg.astype(np.uint8), (1.1, 1.0, 0.82), (10, 4, -8)).astype(np.float32)
        top = over(S["ouro_cam"], fg, a)
    else:
        # round 2: the bow on his real camera: on each word he dips (down, squashed, a little bigger: leaning in)
        a, fg = chave(f[:CAM_H])
        fg = grade(fg.astype(np.uint8), (1.1, 1.0, 0.82), (10, 4, -8)).astype(np.float32)
        k = 0.0
        for bt in BOWS:
            xb = t - bt
            if 0 <= xb < 0.5:
                k = max(k, math.sin(math.pi * xb / 0.5))
        sx, sy = 1 + 0.06 * k, 1 - 0.1 * k
        m = np.float32([[sx, 0, (1 - sx) * W / 2], [0, sy, (1 - sy) * CAM_H + 150 * k]])
        fg = cv2.warpAffine(fg, m, (W, CAM_H), borderMode=cv2.BORDER_REPLICATE)
        a = cv2.warpAffine(a, m, (W, CAM_H), borderMode=cv2.BORDER_CONSTANT)
        top = over(S["ouro_cam"], fg, a)
        flash(top, kick(t - DESCULPA, 0.4, 0.06), (255, 236, 190))
    r = rays(W, CAM_H, W / 2, -80, x, n=10, strength=0.22)
    top = np.clip(top.astype(np.float32) + r[..., None] * np.array((255, 220, 150), np.float32), 0, 255)
    f[:CAM_H] = top.astype(np.uint8)


def beat_jack(f, o, t, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    rng = S["rng"]
    lightning = 0.0
    for d, a in ((0.0, 1.0), (0.13, 0.55), (0.32, 0.3)):  # a strike flickers
        lightning = max(lightning, kick(t - JACK_T - d, a, 0.05))
    flicker = 1.0 + 0.04 * math.sin(t * 37) * math.sin(t * 13.3)
    # the camera: him in foggy London, or the scream
    if t < VITIMA:
        a, fg = chave(f[:CAM_H])
        fg = grade(fg.astype(np.uint8), (0.88, 0.97, 1.12), (-4, 2, 10), sat=0.45, contrast=1.12).astype(np.float32)
        bg = zoom(S["lon_cam"], 1.03 + 0.01 * math.sin(o * 0.5), (W / 2, CAM_H / 2))
        fog = fog_at(t, W, CAM_H, (55, -8))
        bg = blend(bg, np.full_like(bg, (150, 170, 190)), fog * 0.5)
        top = over(bg, fg * flicker, a)
        top = zoom(top, 1 + 0.03 * (t - 8614.0) / 14, (W / 2, CAM_H * 0.6))
    else:
        x = t - VITIMA
        va, vfg = S["vitima"]
        vfg = grade(vfg.astype(np.uint8), (0.88, 0.97, 1.12), (-4, 2, 10), sat=0.45, contrast=1.15).astype(np.float32)
        bg = blend(S["lon_cam"], np.full_like(S["lon_cam"], (150, 170, 190)), fog_at(t, W, CAM_H, (55, -8)) * 0.4)
        top = over(bg, vfg, va)
        z = 1.12 + kick(x, 0.2, 0.08) + 0.08 * min(1, x / 1.8)
        amp = kick(x, 14, 0.12) + 2.0
        top = zoom(top, z, (W * 0.55, CAM_H * 0.62), amp * math.sin(x * 110), amp * math.cos(x * 93))
        red = 0.25 * (0.5 + 0.5 * math.sin(x * 9)) * min(1, x / 0.1)
        v = 1 - S["vin_cam"]
        top = np.clip(top.astype(np.float32) * (1 - v[..., None] * red * 2) +
                      np.array((150, 0, 0), np.float32) * v[..., None] * red * 2, 0, 255).astype(np.uint8)
        flash(top, kick(x, 0.6, 0.05))
    top = grain(top, rng, 8)
    flash(top, lightning * 0.8, (220, 235, 255))
    f[:CAM_H] = top
    # the lower half: the street under the fog, the lightning showing who's there
    z = 1.04 + (0.08 * ease((t - JACK_T) / 6.0) if t >= JACK_T else 0.0)
    if t >= VITIMA:
        z += 0.12 * ease((t - VITIMA) / 1.6)
    scene = zoom(S["lon"], z, (540, 560))
    scene = grade(scene, sat=0.75, contrast=1.05)
    fog = fog_at(t, W, 1080, (35, -5))
    thin = np.clip(fog * 1.3 - 0.1, 0, 1) * 0.32 + 0.08
    # before the lightning a bank of fog stands where the figure is: the street shows, not who's in it
    thick = np.clip(thin + S["banco"] * (0.75 + 0.25 * fog), 0, 0.97)
    clear = ease((t - JACK_T) / 0.25) if t >= JACK_T else 0.0
    scene = blend(scene, np.full_like(scene, (96, 112, 134)), thick * (1 - clear) + thin * clear)
    # his car: rolling in on "ela vem", slashed, falling apart
    c = S["carro"]
    if t >= VEM:
        x = t - VEM
        cx = -300 + (330 + 300) * ease(min(1, x / 0.6))  # the car's left edge
        cy = 1080 - 300 - c["h"]  # its top, on the street, above the platforms' bar (y < 1650 in the short)
        if t < CAI:
            paste(scene, c["car"], cx, cy)
        else:
            y = t - CAI
            for k, (p, (px, py)) in enumerate(c["pieces"]):
                sep = 110 * ease(min(1, y / 0.35))
                fall = 0.5 * 2600 * max(0.0, y - 0.25) ** 2
                land = 80 if k != 1 else 55
                fall = min(fall, land)
                ang = (k - 1) * 28 * ease(min(1, y / 0.6)) + (12 if k == 1 else 0) * ease(min(1, y / 0.6))
                h, w = p.shape[:2]
                paste(scene, p, cx + w / 2 + px * sep, cy + h / 2 + py * sep * 0.5 + fall - 30 * ease(min(1, y / 0.2)),
                      angle=-ang)
        for i, ct in enumerate(CORTES):  # the slashes: a white blade-line drawn fast, glowing, fading
            xs = t - ct
            if 0 <= xs < 0.6:
                (px, py), (dx, dy) = c["lines"][i]
                n = math.hypot(dx, dy)
                dx, dy = dx / n, dy / n
                L = 420
                ax, ay = cx + px - dx * L, cy + py - dy * L
                bx, by = cx + px + dx * L, cy + py + dy * L
                u = min(1.0, xs / 0.07)
                ex, ey = ax + (bx - ax) * u, ay + (by - ay) * u
                glow = np.zeros(scene.shape[:2], np.float32)
                cv2.line(glow, (int(ax), int(ay)), (int(ex), int(ey)), 1.0, 9, cv2.LINE_AA)
                glow = cv2.GaussianBlur(glow, (0, 0), 6) * 1.6 + cv2.GaussianBlur(glow, (0, 0), 1.0)
                fade = 1 - ease((xs - 0.12) / 0.45) if xs > 0.12 else 1.0
                scene = np.clip(scene.astype(np.float32) + glow[..., None] * fade * 255, 0, 255).astype(np.uint8)
                flash(scene, kick(xs, 0.3, 0.03))
    scene = (scene.astype(np.float32) * S["vin_horror"][..., None] * flicker).clip(0, 255).astype(np.uint8)
    if t >= VITIMA:
        x = t - VITIMA
        red = 0.35 * (0.5 + 0.5 * math.sin(x * 9))
        scene = blend(scene, np.full_like(scene, (120, 0, 0)), (1 - S["vin_horror"]) * red * 1.5)
    if t >= JACK_T:
        x = t - JACK_T - 0.25
        if 0 <= x < 3.0:
            paste(scene, S["lbl_jack"], 80 + (1 - ease(x / 0.25)) * -900, 150)
    scene = grain(scene, rng, 8)
    flash(scene, lightning, (230, 240, 255))
    f[CAM_H:] = scene


# ---------------------------------------------------------------------------------------------------- the frame


def whip(f, o, ctx):
    """destaque's whip at each cut (the roteiro's entrances are "seco"): out to the left with a motion blur, in from
    the right."""
    W, H = ctx.W, ctx.H
    before, after = 0.12, 0.2
    for c in ctx.clock.starts[1:-1]:  # the cuts between stretches (not the short's end)
        x = o - c
        if not -before <= x < after:
            continue
        u = ((x + before) / before) ** 2 if x < 0 else (1 - x / after) ** 2
        dx = -0.5 * W * u if x < 0 else 0.5 * W * u
        f[:] = cv2.warpAffine(f, np.float32([[1, 0, dx], [0, 1, 0]]), (W, H), flags=cv2.INTER_LINEAR,
                              borderMode=cv2.BORDER_REFLECT101)
        k = 1 + int(140 * u)
        if k > 1:
            f[:] = cv2.blur(f, (k, 1))
    return f


def antes(f, o, ctx):
    k, t = where(o, ctx)
    {DOC: beat_doc, AULA: beat_aula, MUSTY: beat_musty, JACK: beat_jack}[k](f, o, t, ctx)
    return whip(f, o, ctx)


# ---------------------------------------------------------------------------------------------------- the sound


def _t(SR, d):
    return np.arange(int(d * SR)) / SR


def peak1(x):
    return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def band(x, lo=None, hi=None, SR=48000):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(fr)
    if lo:
        g *= np.clip(np.log2(np.maximum(fr, 1) / (lo / 2)), 0, 1) ** 2
    if hi:
        g *= np.clip(np.log2(hi * 2 / np.maximum(fr, 1)), 0, 1) ** 2
    return np.fft.irfft(X * g, len(x)).astype(np.float32)


def savanna(SR, d):
    """Savanna at dusk: wind in the grass, crickets, a few distant birds."""
    t = _t(SR, d)
    rng = np.random.default_rng(31)
    wind = band(rng.standard_normal(len(t)), 150, 900, SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t + 1))
    crick = np.zeros_like(t)
    for f0, rate, ph in ((4300, 14, 0.0), (3800, 11, 1.3), (4700, 17, 2.1)):
        gate = (np.sin(2 * np.pi * rate * t + ph) > 0.3) * (np.sin(2 * np.pi * 0.6 * t + ph * 3) > -0.2)
        crick += np.sin(2 * np.pi * f0 * t) * gate * 0.3
    crick = band(crick, 2500, 7000, SR)
    birds = np.zeros_like(t)
    for at in (0.8, 3.1, 3.4, 6.2, 8.9):
        i = int(at * SR)
        tt = _t(SR, 0.18)
        chirp = np.sin(2 * np.pi * np.cumsum(2600 + 1400 * np.sin(np.pi * tt / 0.18)) / SR) * np.sin(np.pi * tt / 0.18)
        birds[i:i + len(tt)] += chirp[:max(0, len(t) - i)] * 0.5
    fade = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
    return peak1((peak1(wind) * 0.7 + peak1(crick) * 0.35 + birds * 0.6) * fade)


def pad(SR, d, notes, bright=900):
    """A soft string pad (detuned saws through a low-pass), fading in and out."""
    t = _t(SR, d)
    x = np.zeros_like(t)
    for f0 in notes:
        for det in (-0.004, 0.0, 0.005):
            ph = 2 * np.pi * f0 * (1 + det) * t
            x += sum(np.sin(k * ph) / k for k in range(1, 10))
    x = band(x, 80, bright, SR)
    env = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 0.6)
    return peak1(x * env)


def purr(SR, d=1.3):
    """A big cat's purr-growl: low noise pulsing ~24 times a second, with a mid layer a phone can play."""
    t = _t(SR, d)
    rng = np.random.default_rng(7)
    n = rng.standard_normal(len(t))
    am = (0.55 + 0.45 * np.sin(2 * np.pi * 24 * t)) ** 2
    low = band(n, 60, 260, SR) * am
    mid = band(np.tanh(3 * peak1(low)), 250, 1400, SR)
    env = np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.35)
    return peak1((peak1(low) + 0.6 * peak1(mid)) * env)


def thump(SR, f0=110, d=0.18):
    t = _t(SR, d)
    body = np.sin(2 * np.pi * np.cumsum(f0 + 80 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.05)
    click = band(np.random.default_rng(3).standard_normal(len(t)), 800, 4000, SR) * np.exp(-t / 0.006)
    return peak1(np.tanh(1.5 * body) + 0.4 * peak1(click))


def chalk(SR, d):
    """Chalk on a board: scratchy bursts, a stroke every ~0.12 s."""
    t = _t(SR, d)
    rng = np.random.default_rng(int(d * 1000))
    n = band(rng.standard_normal(len(t)), 1800, 7000, SR)
    strokes = np.clip(np.sin(2 * np.pi * 8.3 * t + rng.uniform(0, 3)) + rng.uniform(-0.2, 0.4), 0, 1) ** 0.5
    grit = 0.6 + 0.4 * (rng.random(len(t)) > 0.5)
    env = np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
    return peak1(n * strokes * grit * env)


def stamp_hit(SR):
    t = _t(SR, 0.35)
    low = np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-t / 0.015)) / SR) * np.exp(-t / 0.08)
    slap = band(np.random.default_rng(9).standard_normal(len(t)), 500, 5000, SR) * np.exp(-t / 0.02)
    return peak1(np.tanh(2 * low) + 0.8 * peak1(slap))


def switch_off(SR):
    """A big stage light switched off: a clunk and a falling hum."""
    t = _t(SR, 0.7)
    clunk = thump(SR, 80, 0.25)
    hum = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t / 0.3) + 30) / SR) * np.exp(-t / 0.25) * 0.4
    out = hum.copy()
    out[:len(clunk)] += clunk
    return peak1(out)


def swoosh_down(SR, d=0.7):
    """Slow motion coming in: a whoosh falling in pitch."""
    t = _t(SR, d)
    n = np.random.default_rng(14).standard_normal(len(t))
    f = 2400 * (180 / 2400) ** (t / d)
    low = bp = 0.0
    out = np.zeros_like(t)
    for i in range(len(t)):
        g = 2 * math.sin(math.pi * f[i] / SR)
        hp = n[i] - low - 0.5 * bp
        bp += g * hp
        low += g * bp
        out[i] = bp
    env = np.sin(np.pi * np.minimum(1, t / d)) ** 1.5
    return peak1(out * env)


def shimmer(SR, d=1.6):
    """A harp-like glissando of bells going up (the shrine)."""
    t = _t(SR, d)
    out = np.zeros_like(t)
    notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0, 2093.0]
    for i, f0 in enumerate(notes):
        tt = t - i * 0.06
        on = tt >= 0
        tt = np.maximum(tt, 0)
        out += on * (np.sin(2 * np.pi * f0 * tt) + 0.3 * np.sin(2 * np.pi * 2 * f0 * tt)) * np.exp(-tt / 0.6) * \
            np.minimum(1, tt / 0.003)
    return peak1(out)


def thunder(SR, d=3.0):
    """A close strike: a crack, then a long rumble."""
    t = _t(SR, d)
    rng = np.random.default_rng(21)
    crack = band(rng.standard_normal(len(t)), 600, 9000, SR) * np.exp(-t / 0.04)
    rumble = band(rng.standard_normal(len(t)), 30, 300, SR)
    rumble *= (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 2.3 * t + 3 * np.sin(2 * np.pi * 0.7 * t)))) * \
        np.minimum(1, t / 0.08) * np.exp(-t / 1.1)
    growl = band(np.tanh(4 * peak1(rumble)), 120, 900, SR)
    return peak1(1.2 * peak1(crack) + peak1(rumble) + 0.5 * peak1(growl))


def drone(SR, d):
    """Horror under the voice: a low cluster beating, wind, a high whine creeping in."""
    t = _t(SR, d)
    x = np.zeros_like(t)
    for f0 in (55.0, 58.3, 82.4, 87.3):
        x += np.sin(2 * np.pi * f0 * t + np.sin(2 * np.pi * 0.1 * t))
    rng = np.random.default_rng(17)
    wind = band(rng.standard_normal(len(t)), 300, 1200, SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t))
    whine = np.sin(2 * np.pi * (1900 + 30 * np.sin(2 * np.pi * 5 * t)) * t) * np.minimum(1, t / d) ** 2 * 0.15
    growl = band(np.tanh(3 * peak1(x)), 110, 700, SR)
    env = np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 0.4)
    return peak1((0.6 * peak1(x) + 0.5 * growl + 0.5 * peak1(wind) + whine) * env)


def shing(SR):
    """A blade drawn and slashing: a metallic ring (inharmonic partials) with a scrape."""
    t = _t(SR, 0.8)
    ring = sum(a * np.sin(2 * np.pi * f0 * t) * np.exp(-t / dd)
               for f0, a, dd in ((2350, 1.0, 0.35), (3890, 0.6, 0.25), (5210, 0.45, 0.18), (6930, 0.3, 0.12)))
    rng = np.random.default_rng(23)
    scrape = band(rng.standard_normal(len(t)), 3000, 11000, SR) * np.exp(-t / 0.05)
    swish = band(rng.standard_normal(len(t)), 800, 4000, SR) * np.exp(-((t - 0.02) / 0.03) ** 2)
    return peak1(peak1(ring) * np.minimum(1, t / 0.004) + 0.7 * peak1(scrape) + 0.8 * peak1(swish))


def clank(SR, f0=420.0):
    t = _t(SR, 0.5)
    tone = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / dd)
               for r, a, dd in ((1, 1.0, 0.12), (2.76, 0.6, 0.08), (5.4, 0.4, 0.05), (8.9, 0.2, 0.03)))
    knock = band(np.random.default_rng(int(f0)).standard_normal(len(t)), 300, 3000, SR) * np.exp(-t / 0.01)
    return peak1(peak1(tone) + 0.7 * peak1(knock))


def stinger(SR, d=2.2):
    """The scream's sting: a dissonant string cluster stabbing in and swelling, a boom under it."""
    t = _t(SR, d)
    x = np.zeros_like(t)
    for f0 in (466.16, 493.88, 523.25, 554.37, 987.77, 1046.5):
        vib = 1 + 0.01 * np.sin(2 * np.pi * 7 * t)
        ph = 2 * np.pi * np.cumsum(f0 * vib) / SR
        x += sum(np.sin(k * ph) / k for k in range(1, 8))
    x = band(x, 300, 6000, SR)
    env = (np.minimum(1, t / 0.01) * (0.6 + 0.4 * np.exp(-t / 0.15))) * np.minimum(1, (d - t) / 0.5)
    boom = np.sin(2 * np.pi * np.cumsum(50 + 70 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.5)
    hit = band(np.random.default_rng(29).standard_normal(len(t)), 1000, 8000, SR) * np.exp(-t / 0.02)
    return peak1(np.tanh(1.4 * (peak1(x) * env + 0.9 * boom + 0.5 * peak1(hit))))


def sons(ctx):
    SR, clock = ctx.SR, ctx.clock
    out = lambda live, k: clock.out(live, k)  # noqa: E731
    s0, s1 = clock.starts[DOC], clock.starts[AULA]
    s3, end = clock.starts[JACK], clock.length
    res = [(c - 0.42 * 0.62, "whoosh", -11) for c in clock.starts[1:-1]]  # the whips
    res += [
        # O predador
        (s0, "impact-boom", -12),
        (s0, savanna(SR, s1 - s0), -21),
        (s0, pad(SR, s1 - s0, (110.0, 164.81, 220.0, 261.63)), -26),
        (out(PRESA, DOC) - 0.05, purr(SR, 1.4), -11),
    ] + [(out(p, DOC), thump(SR, 140, 0.12), -19) for p in PATS] + [
        # A aula: the replay
        (out(FLIP, AULA) - len(ctx.sound("riser")) / SR, "riser", -15),
        (out(FLIP, AULA), "impact-boom", -8),
        (out(FLIP, AULA), "hit", -12),
        (out(FLIP, AULA) + 0.02, swoosh_down(SR), -14),
        (out(DELAYED, AULA), "hit", -11),
        (out(DELAYED, AULA) - 0.12, "whoosh_curto", -13),
        (out(GOL, AULA), "impact-boom", -10),
        (out(GOL, AULA) + 0.05, "uuuh", -14),
        # the lesson
        (out(JA_SABIA, AULA), stamp_hit(SR), -8),
        (out(ENCOLHE[0], AULA), switch_off(SR), -12),
        (out(ENCOLHE[0], AULA) + 0.05, "apito", -12),
        (out(VERGONHA, AULA), thump(SR, 90, 0.2), -16),
    ] + [(out(tt, AULA), chalk(SR, 0.38), -21) for tt, *_ in LOUSA_LINHAS] + [
        (out(tt, AULA), thump(SR, 200, 0.08), -20) for tt in CHECKS] + [
        # A reverência
        (out(OQUE[0], MUSTY) - 0.1, "whoosh_curto", -13),
        (out(TRONO, MUSTY), "coro", -11),
        (out(TRONO, MUSTY), shimmer(SR), -16),
        (out(DESCULPA, MUSTY), shimmer(SR, 1.2), -20),
        # Jack
        (s3, drone(SR, end - s3), -21),
        (out(JACK_T, JACK) - 0.02, thunder(SR), -7),
        (out(VEM, JACK), "whoosh_curto", -16),
    ] + [(out(ct, JACK), shing(SR), -9) for ct in CORTES] + [
        (out(CAI, JACK) + d, clank(SR, f0), -9) for d, f0 in ((0.48, 380.0), (0.52, 520.0), (0.6, 300.0))] + [
        (out(CAI, JACK), shing(SR), -16),
        (out(VITIMA, JACK) - 0.01, stinger(SR, min(2.2, end - out(VITIMA, JACK))), -7),
        (out(VITIMA, JACK), "impact-boom", -10),
    ]
    return res
