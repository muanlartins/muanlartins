"""8 vitórias seguidas (2026-11-26): three of Luan's own plays from the day he started losing ("eu só tô caindo com
smurf hoje": three losses in the first four matches) and then won eight in a row. No Jogo.mp4 that day: the game is
the live's own picture (palco.html frames it at (320, 0), 1600×900; its middle 900×900, ×1.2, is the lower half).

Round 2 (Luan, 11-28): only his plays (JK's golden goal and the Champion 2 talk out), #7 as the closing moment, no
split John ("ficou bugado": his face twice).

- Hook (stretch 0): his aerial goal of #8 and "Caralho, que golaço!", "8 VITÓRIAS SEGUIDAS" slammed in between the
  game's scoreboard and its "MUANLARTINS MARCOU!" banner.
- Each moment opens with a small plate naming the match (2v2 com Duolingo, 3v3 com JK e Duolingo).
- #5 (stretches 1, 2): his pass, Duolingo's goal, "Meu Deus, que passe!" praising his own pass; "Toma essa aqui,
  então" and F2: the live's camera as Lance ruim showed it (his face on the John portrait, eyes glowing, lightning)
  on top; below, while the live has no game (from the F2 scene's first frame to the game's return), the 11-20
  hat-trick's Gigachad of him in purple light: the deal-with-it shades sliding on, then his poses swapping on the
  John sound's hits with punches and flashes (round 3, Luan: the frozen game "fica congelado (e bugado)"); then
  "É o John Rocket League" on his real camera with the title.
- #8 (stretch 3) and #7 (stretches 4, 5): the roteiro's push, riser, flash and punches on his goals; #7 ends on
  "Nossa senhora" over the replay, and the day's record fills to eight wins: "8 VITÓRIAS SEGUIDAS".

Everything here is drawn and synthesised; the John picture is the live's own frames.
"""
import math
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

TEASER, PASSE, JOHN, GOL8, GOL7, FIM = range(6)

# live seconds, read off the live (sheets 0.05 s apart; the dock's events run ~0.04 s late)
GOAL5 = 8383.45
MONTAGE = (8396.125, 8402.095)  # the live's game unusable: from the first frame with the F2 scene's blue rectangle
# (8396.14) to the last before the game is back clean (8402.10); sheets 0.05 s apart at both edges
JOHN_FULL = 8397.45  # the portrait fills the live's screen
JOHN_OFF = 8401.45  # the zoom back out begins: his real camera again
JOHN_GRAB = (JOHN_FULL, JOHN_OFF + 0.05)
# the Gigachad montage under it (round 3, Luan: "aquela montagem de imagens minhas de óculos escuros todo fortão"):
# the 11-20 hat-trick's pictures, copied to this reel's Partes; the poses swap on john.wav's hits (it starts at
# 8396.26 in the live; its swells at ~1.15, 2.6 and 4.2 s), the kiss as the filter goes
SHADES_SLIDE = (8396.40, 8397.25)
SWAPS = (8397.41, 8398.86, 8400.46, JOHN_OFF)
# (picture, the subject's middle x, eyes' x, y, the shades' width, tilt), in the 1376×768 pictures (hat-trick's POSES)
POSES = [
    ("gigachad-sem-oculos.png", 790, 790, 276, 300, 2.0),
    ("gigachad-biceps.png", 700, 699, 204, 102 * 2.35, 1.4),
    ("gigachad-peitoral.png", 744, 718, 142, 78 * 2.35, 6.3),
    ("gigachad-most-muscular.png", 700, 691, 101, 117 * 2.35, 1.2),
    ("gigachad-beijo.png", 690, None, None, None, None),
]
# deal-with-it shades, one character a pixel (the hat-trick's): the bar, the lenses, the glints
OCULOS = [
    "########################",
    ".######################.",
    ".##oo##########oo######.",
    ".###oo#####..###oo#####.",
    ".##########..##########.",
    "..#########..#########..",
    "...#######....#######...",
    ".....####......####.....",
]
LENTES = 4.3  # the eyes' line, in sprite pixels from the top
TOP_CROP = (920, 0, 1000, 778)  # the live's full screen during Lance ruim: his face on the portrait, 1080:840
GOAL8, GOAL7 = 9942.08, 9260.25
NOSSA = 9270.39
CLOSE = 9271.3  # mid "Nossa senhora", the replay's goal still under it: the record fills

DAY = "DDVDVVVVVVVV"  # the day's ranked matches in order: L L W L, then the eight
WIN = (0, 118, 69)  # --color-win
LOSS = (181, 48, 49)  # --color-loss
CHIPS = [  # (stretch, live second, the match)
    (PASSE, 8380.25, "2V2 · COM DUOLINGO"),
    (GOL8, 9939.45, "3V3 · COM JK E DUOLINGO"),
    (GOL7, 9253.65, "2V2 · COM DUOLINGO"),
]
CHIP_LEN, CHIP_Y = 2.2, 700
LABELS = [  # one line on the plate, between the game's scoreboard and its "X MARCOU!" banner
    (PASSE, 8384.25, 8386.9, "ELOGIANDO O PRÓPRIO PASSE"),
    (GOL8, 9942.45, 9944.6, "GOL AÉREO · 95 KM/H"),
    (GOL7, 9260.7, 9262.8, "AÉREO DE NOVO"),
]
LABEL_Y = 1010

S = {}


# ---------------------------------------------------------------------------------------------------- helpers


def where(o, ctx):
    st, sp = ctx.clock.starts, ctx.clock.spans
    k = max(i for i in range(len(sp)) if st[i] <= o + 1e-9) if o >= 0 else 0
    return k, sp[k][0] + (o - st[k])


def clamp(x, a=0.0, b=1.0):
    return min(b, max(a, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def grab(path, a, b, crop, size):
    """Live.mp4's frames from a to b (60 fps), cropped and scaled, JPEG-compressed in memory."""
    x, y, w, h = crop
    n = int(round((b - a) * 60)) + 1
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-i", str(path), "-frames:v", str(n), "-vf",
                          f"crop={w}:{h}:{x}:{y},scale={size[0]}:{size[1]}:flags=lanczos", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, size[1], size[0], 3)
    return [cv2.imencode(".jpg", f[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 94])[1] for f in arr]


def grabbed(store, live, start):
    i = int(round((live - start) * 60))
    i = min(max(i, 0), len(store) - 1)
    return cv2.imdecode(store[i], cv2.IMREAD_COLOR)[..., ::-1].copy()


def flash(part, a, color=(255, 255, 255)):
    if a > 0.004:
        part[:] = (part.astype(np.float32) * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)


def plate_sprite(ctx, text, size, fill, ink, weight=700, padx=32, pady=17):
    """A line on the brand's plate cut at 45°, with a soft shadow."""
    f = ctx.grotesk(size, weight)
    box = f.getbbox(text)
    tw, th = box[2] - box[0], box[3] - box[1]
    pw, ph = tw + 2 * padx, th + 2 * pady
    img = Image.new("RGBA", (pw + 40, ph + 40))
    sh = Image.new("RGBA", img.size)
    ctx.plate(ImageDraw.Draw(sh), 25, 28, pw, ph, (0, 0, 0, 150))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9)))
    d = ImageDraw.Draw(img)
    ctx.plate(d, 20, 20, pw, ph, fill)
    d.text((20 + padx - box[0], 20 + pady - box[1]), text, font=f, fill=ink)
    return np.array(img)


# ---------------------------------------------------------------------------------------------------- the record


def square(size, color, lit=1.0, glow=0.0):
    """One match of the day as the site draws it: a rounded square in the result's colour (PIL RGBA)."""
    m = 24
    img = Image.new("RGBA", (size + 2 * m, size + 2 * m))
    if glow > 0:
        g = Image.new("RGBA", img.size)
        ImageDraw.Draw(g).rounded_rectangle((m - 8, m - 8, m + size + 8, m + size + 8), 14,
                                            fill=(120, 255, 190, int(230 * glow)))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(img)
    if lit >= 1:
        d.rounded_rectangle((m, m, m + size, m + size), 10, fill=color + (255,))
    else:  # still to come: an outline on the night
        d.rounded_rectangle((m, m, m + size, m + size), 10, outline=(133, 167, 255, 150), width=3)
    return img


def paste(dst, src, cx, cy, scale=1.0, alpha=1.0):
    if abs(scale - 1) > 0.01:
        src = src.resize((max(1, int(src.width * scale)), max(1, int(src.height * scale))), Image.BICUBIC)
    if alpha < 1:
        a = src.getchannel("A").point(lambda v: int(v * alpha))
        src = src.copy()
        src.putalpha(a)
    dst.alpha_composite(src, (int(round(cx - src.width / 2)), int(round(cy - src.height / 2))))


def record_card(ctx, wins, now):
    """The closing card: "8 VITÓRIAS SEGUIDAS", the day as twelve squares (the four before the streak and the
    eight), `wins` of the streak lit, the last one popping (now: seconds since it lit)."""
    c = ctx.cores
    n_sq, size, gap = 12, 52, 12
    row = n_sq * size + (n_sq - 1) * gap
    w, h = row + 2 * 44, 262
    img = Image.new("RGBA", (w + 60, h + 60))
    sh = Image.new("RGBA", img.size)
    ctx.plate(ImageDraw.Draw(sh), 30, 38, w, h, (0, 0, 0, 130))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(img)
    ctx.plate(d, 30, 30, w, h, c["noite"] + (236,))
    d.text((30 + 44, 30 + 24), "8 VITÓRIAS SEGUIDAS", font=ctx.grotesk(58), fill=c["branco"])
    d.text((30 + 44, 30 + 200), "DEPOIS DE 3 DERROTAS NAS 4 PRIMEIRAS", font=ctx.grotesk(30, 600),
           fill=c["klein_claro"])
    y = 30 + 154
    for i, r in enumerate(DAY):
        x = 30 + 44 + i * (size + gap) + size / 2
        streak_i = i - 4  # 0..7 in the streak
        if streak_i < 0:
            paste(img, square(size, LOSS if r == "D" else WIN), x, y, 1.0, 0.85)
            continue
        lit = streak_i < wins
        scale, glow = 1.0, 0.0
        if lit and streak_i == wins - 1 and now < 0.8:
            scale = 1 + 0.45 * math.exp(-now / 0.09) * math.cos(now * 30)
            glow = math.exp(-now / 0.4)
        paste(img, square(size, WIN, 1.0 if lit else 0.0, glow), x, y, scale)
    return np.array(img)


# ---------------------------------------------------------------------------------------------------- setup


def setup(ctx):
    live = ctx.VIDEOS / ctx.roteiro["arquivos"]["live"]
    S["top"] = grab(live, *JOHN_GRAB, TOP_CROP, (ctx.W, ctx.CAM_H))
    S["chips"] = [plate_sprite(ctx, text, 52, ctx.cores["noite"] + (236,), ctx.cores["branco"], 700, 30, 16)
                  for *_, text in CHIPS]
    S["labels"] = [plate_sprite(ctx, text, 66, ctx.cores["branco"], ctx.cores["klein"]) for *_, text in LABELS]
    y, x = np.mgrid[0:ctx.GAME_H, 0:ctx.GAME_H].astype(np.float32) / ctx.GAME_H - 0.5
    S["vig"] = np.clip((np.sqrt(x ** 2 + y ** 2) - 0.25) / 0.5, 0, 1)[..., None]
    S["oculos"] = sprite_oculos()
    S["poses"] = [graded_pose(ctx, *p, shades=i > 0) for i, p in enumerate(POSES)]
    S["rng"] = np.random.default_rng(26)


# ---------------------------------------------------------------------------------------------------- frames


def sprite_oculos(cell=24):
    h, w = len(OCULOS), len(OCULOS[0])
    out = np.zeros((h * cell, w * cell, 4), np.uint8)
    for r, row in enumerate(OCULOS):
        for c, ch in enumerate(row):
            if ch in "#o":
                out[r * cell:(r + 1) * cell, c * cell:(c + 1) * cell] = (255, 255, 255, 255) if ch == "o" else \
                    (8, 8, 10, 255)
    return out


def draw_oculos(img, sprite, cx, cy, width, angle):
    """The shades on `img` (RGB, in place), the lenses' middle at (cx, cy), `width` px wide, tilted (hat-trick's)."""
    h, w = sprite.shape[:2]
    k = width / w
    a = math.radians(angle)
    ca, sa = math.cos(a) * k, math.sin(a) * k
    ax, ay = w / 2, LENTES / len(OCULOS) * h
    m = np.float32([[ca, -sa, cx - (ca * ax - sa * ay)], [sa, ca, cy - (sa * ax + ca * ay)]])
    x0, y0 = max(0, int(cx - width)), max(0, int(cy - width))
    x1, y1 = min(img.shape[1], int(cx + width)), min(img.shape[0], int(cy + width))
    if x1 <= x0 or y1 <= y0:
        return
    m[0, 2] -= x0
    m[1, 2] -= y0
    warped = cv2.warpAffine(sprite, m, (x1 - x0, y1 - y0), flags=cv2.INTER_AREA if k < 1 else cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0)).astype(np.float32)
    alpha = warped[..., 3:4] / 255
    part = img[y0:y1, x0:x1].astype(np.float32)
    img[y0:y1, x0:x1] = (part * (1 - alpha) + warped[..., :3] * alpha).astype(np.uint8)


def graded_pose(ctx, name, subject_x, ex, ey, width, tilt, shades=True):
    """A pose filling the lower half (1080×1080, the picture's height): black and white with hard light, its
    highlights glowing in the John portrait's purple and its edges sinking into a purple dark, the shades on."""
    g = ctx.GAME_H
    k = g / 768
    im = np.array(Image.open(ctx.partes / name).convert("L").resize((1376, 768), Image.LANCZOS), np.float32)
    big = cv2.resize(im, None, fx=k, fy=k, interpolation=cv2.INTER_CUBIC)
    x0 = int(round(subject_x * k - g / 2))
    x0 = min(max(x0, 0), big.shape[1] - g)
    v = np.clip((big[:g, x0:x0 + g] / 255 - 0.5) * 1.18 + 0.5, 0, 1)[..., None]
    dark, light = np.array((12, 3, 28), np.float32), np.array((246, 238, 255), np.float32)
    img = dark + (light - dark) * v
    bright = cv2.GaussianBlur(np.clip((v[..., 0] - 0.55) / 0.45, 0, 1), (0, 0), 22)[..., None]
    img = img + (255 - img) * bright * 0.55 * np.array((0.72, 0.38, 1.0), np.float32)  # the purple glow (screen)
    img = img * (1 - 0.6 * S["vig"]) + np.array((70, 12, 130), np.float32) * 0.6 * S["vig"]
    out = np.clip(img, 0, 255).astype(np.uint8)
    eyes = None if ex is None else (ex * k - x0, ey * k)
    if shades and eyes:
        draw_oculos(out, S["oculos"], eyes[0], eyes[1], width * k, tilt)
    return out, eyes, (None if width is None else width * k), tilt


def kick(x, size, tau):
    return size * math.exp(-x / tau) if x >= 0 else 0.0


def montage(f, o, live, ctx):
    """The lower half while the live had no game: the Gigachad in the shades, then his poses on John's hits."""
    g = ctx.GAME_H
    k = sum(1 for t in SWAPS if live >= t)  # 0: the first picture (the shades sliding on), then a pose per hit
    picture, eyes, width, tilt = S["poses"][k]
    since = live - (SWAPS[k - 1] if k else MONTAGE[0])
    if k == 0:
        picture = picture.copy()
        u = clamp((live - SHADES_SLIDE[0]) / (SHADES_SLIDE[1] - SHADES_SLIDE[0]))
        u = u if u < 0.85 else 0.85 + (1 - (1 - (u - 0.85) / 0.15) ** 2) * 0.15
        if live >= SHADES_SLIDE[0]:
            start = -0.4 * width
            draw_oculos(picture, S["oculos"], eyes[0], start + (eyes[1] - start) * u, width, tilt * u)
    centre = eyes or (g / 2, g * 0.4)
    z = 1 + 0.05 * clamp(since / 1.5) + kick(since, 0.12 if k else 0.0, 0.08)
    land = live - SHADES_SLIDE[1]
    if k == 0:
        z += kick(land, 0.05, 0.07)
    amp = kick(since, 10, 0.09) if k else kick(land, 6, 0.08)
    dx, dy = amp * math.sin(since * 130 + k), amp * math.cos(since * 105 + k)
    m = np.float32([[z, 0, (1 - z) * centre[0] + dx], [0, z, (1 - z) * centre[1] + dy]])
    part = cv2.warpAffine(picture, m, (g, g), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
    noise = S["rng"].normal(0, 8, (g // 2, g // 2)).astype(np.float32)
    part = np.clip(part.astype(np.float32) + cv2.resize(noise, (g, g))[..., None], 0, 255).astype(np.uint8)
    f[ctx.CAM_H:] = part
    flash(f[ctx.CAM_H:], kick(since, 0.75, 0.06) if k else kick(live - MONTAGE[0], 0.8, 0.07), (235, 205, 255))


def antes(f, o, ctx):
    k, live = where(o, ctx)
    if k == JOHN:
        if MONTAGE[0] <= live < MONTAGE[1]:
            montage(f, o, live, ctx)
        if JOHN_FULL <= live < JOHN_OFF:
            f[:ctx.CAM_H] = grabbed(S["top"], live, JOHN_GRAB[0])
            full = ctx.clock.out(JOHN_FULL, JOHN)
            flash(f[:ctx.CAM_H], 0.85 * math.exp(-(o - full) / 0.12), (235, 200, 255))
        off = ctx.clock.out(JOHN_OFF, JOHN)
        if 0 <= o - off < 0.4:
            flash(f[:ctx.CAM_H], 0.6 * math.exp(-(o - off) / 0.1))
    return f


def depois(f, o, ctx):
    k, live = where(o, ctx)
    for (kk, a, b, _), sprite in zip(LABELS, S["labels"]):
        if k == kk:
            item = {"de": ctx.clock.out(a, kk), "ate": ctx.clock.out(b, kk), "anim": "slam"}
            scale, alpha, _ = ctx.animate(item, o)
            ctx.place(f, sprite, ctx.W / 2, LABEL_Y, scale, alpha)
    for (kk, at, _), sprite in zip(CHIPS, S["chips"]):
        if k == kk:
            x = o - ctx.clock.out(at, kk)
            if 0 <= x < CHIP_LEN:
                a = clamp(x / 0.1) * (1 - smooth((x - CHIP_LEN + 0.2) / 0.2))
                ctx.place(f, sprite, ctx.W / 2, CHIP_Y + 24 * (1 - smooth(x / 0.2)), 1.0, a)
    if k == FIM and live >= CLOSE:
        x = o - ctx.clock.out(CLOSE, FIM)
        lit = min(8, int(x / 0.07) + 1)
        card = record_card(ctx, lit, x - (lit - 1) * 0.07)
        a = clamp(x / 0.12)
        ctx.place(f, card, ctx.W / 2, ctx.CAM_H + 300, 1.12 * (0.95 + 0.05 * a), a)
    return f


# ---------------------------------------------------------------------------------------------------- sounds


def chime(SR, f0):
    t = np.arange(int(0.7 * SR)) / SR
    x = sum(np.sin(2 * np.pi * f0 * m * t) * a * np.exp(-t * d) for m, a, d in ((1, 1, 6), (2, 0.5, 9),
                                                                                   (3.01, 0.25, 13), (4.2, 0.12, 18)))
    return (x * np.minimum(1, t / 0.003)).astype(np.float32)


def thump(SR):
    t = np.arange(int(0.5 * SR)) / SR
    x = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 9) + 45) / SR) * np.exp(-t * 7)
    x = np.tanh(3 * x) + 0.4 * np.sin(2 * np.pi * 220 * t) * np.exp(-t * 25)  # the mid that phones play
    return x.astype(np.float32)


def sons(ctx):
    SR, clock = ctx.SR, ctx.clock
    out = [(0.0, thump(SR), -14)]
    # the montage: a whoosh as the shades slide, a thump on each pose (on John's own hits)
    out.append((clock.out(SHADES_SLIDE[0], JOHN), "whoosh_curto", -17))
    out.append((clock.out(SHADES_SLIDE[1], JOHN), "click", -16))
    for t in SWAPS:
        out.append((clock.out(t, JOHN), thump(SR), -14))
    out.append((clock.out(JOHN_OFF, JOHN) - 0.1, "whoosh_curto", -15))
    for k, at, _ in CHIPS:
        out.append((clock.out(at, k), "whoosh_curto", -19))
    # the record filling: eight notes climbing and the choir
    end_at = clock.out(CLOSE, FIM)
    for i, f0 in enumerate((523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5)):
        out.append((end_at + i * 0.07, chime(SR, f0), -19))
    out.append((end_at, "coro", -18))
    return out
