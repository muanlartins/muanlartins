"""Palhaçadas da live (2026-11-24): a best-of of the live's clowning, four gags, each with the camera on stage, a
photoreal edit of HIM (or his cat) from his own frames and a scenario in the lower half (Luan, 11-26: "Quando for
palhaçada, foco na câmera e na edição com um filtro ou uma brincadeira… dá pra colocar filtros assim em mim e um
cenário embaixo").

- **A gorducha campeã** (9412-9444): "quem realmente ganhou [o X1] foi a minha gorducha": the camera's Klein becomes a
  gold ceremony (spotlights, confetti), the lower half his cat crowned on the podium (Gemini, from her own frame),
  a fanfare; "esse arranhão que você me dá": three claw slashes tear across the camera.
- **Usain Bolt nunca correu comigo** (9452-9485): the camera in a stadium at night, the lower half a results board
  where Bolt's world record gets "*NUNCA CORREU COMIGO"; "o homem mais rápido do mundo, só se todo mundo correr
  junto": photoreal him at the starting blocks, the pistol on "correr junto".
- **Esqueci de tapar a boca** (12155-12192): a cereal ad with a mouth cam ("CROC! CROC!"), Evelin's own chat
  messages ("pega nao", "credo", "para") slammed in big as she sent them, a censor mosaic on his mouth, "péssima
  propaganda": the ad goes to an old TV and gets the red stamp.
- **O fenômeno do psiu em Minas** (12357-12393): the camera in Belo Horizonte, his own "psiu" echoing over the
  skyline in sound rings, photoreal him turning round confused as he mimes it, and a chart of how far each sound
  carries where the mineiro psiu runs off the scale.

Transitions are done here, last (the roteiro's are all "seco"), so the scenarios swept in with the cut.
Shared helpers (keying, confetti, stamps, sounds) are imported by 2026-11-24-claude.py.
"""
import math
from types import SimpleNamespace

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import destaque as D

PARTES = "Lives/2026-11-24/Shorts/Partes/palhacadas"
S = {}

# the cuts' transitions, by stretch (the roteiro's own are all "seco")
CORTES = {1: "zoom", 3: "whip", 5: "whip", 7: "flash", 9: "whip", 10: "seco"}
# live seconds
GORDUCHA = 9416.77  # "minha gorducha": the reveal
GANHOU = 9415.47  # "quem realmente ganhou"
ARRANHAO = 9438.39
LIVRE = 9443.33
BOLT_CORREU = 9459.47
BOLT_HOMEM = 9479.68
BOLT_JUNTO = 9483.10
CROC = (9999.0,)
EVELIN = ()  # filled from the measured message times below


# ---------------------------------------------------------------------------------------------------- helpers


def T(live, k=None):
    return S["ctx"].clock.out(live, k)


def load(name, folder=PARTES, mode="RGB"):
    return np.array(Image.open(S["ctx"].VIDEOS / folder / name).convert(mode))


def cover(im, w, h, fx=0.5, fy=0.5):
    """im (numpy) scaled to cover w×h and cropped about (fx, fy)."""
    k = max(w / im.shape[1], h / im.shape[0])
    big = cv2.resize(im, (math.ceil(im.shape[1] * k), math.ceil(im.shape[0] * k)), interpolation=cv2.INTER_AREA)
    x = int((big.shape[1] - w) * fx)
    y = int((big.shape[0] - h) * fy)
    return big[y:y + h, x:x + w].copy()


def warp(img, z, cx, cy, dx=0.0, dy=0.0, angle=0.0):
    if abs(z - 1) < 1e-4 and not dx and not dy and not angle:
        return img
    m = cv2.getRotationMatrix2D((cx, cy), angle, z)
    m[0, 2] += dx
    m[1, 2] += dy
    return cv2.warpAffine(img, m, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REFLECT101)


def ease_out(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def back(x, k=1.7):
    """Ease out with an overshoot."""
    x = min(1.0, max(0.0, x))
    return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2


def kick(x, size, tau):
    return size * math.exp(-x / tau) if x >= 0 else 0.0


def mix(a, b, k):
    return (a.astype(np.float32) * (1 - k) + b.astype(np.float32) * k).astype(np.uint8)


def flash(img, a, color=(255, 255, 255)):
    if a > 0.004:
        img[:] = (img.astype(np.float32) * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)


def blit(f, spr, cx, cy, scale=1.0, alpha=1.0, angle=0.0):
    """An RGBA sprite on f (RGB) centred at (cx, cy), scaled, rotated (degrees), faded."""
    if alpha <= 0.003 or scale <= 0.01:
        return
    h, w = spr.shape[:2]
    if angle:
        m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, scale)
        cos, sin = abs(m[0, 0]), abs(m[0, 1])
        nw, nh = int(h * sin + w * cos) + 2, int(h * cos + w * sin) + 2
        m[0, 2] += nw / 2 - w / 2
        m[1, 2] += nh / 2 - h / 2
        spr = cv2.warpAffine(spr, m, (nw, nh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                             borderValue=(0, 0, 0, 0))
    elif abs(scale - 1) > 1e-3:
        spr = cv2.resize(spr, (max(1, int(w * scale)), max(1, int(h * scale))),
                         interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR)
    h, w = spr.shape[:2]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    fx0, fy0, fx1, fy1 = max(0, x0), max(0, y0), min(f.shape[1], x0 + w), min(f.shape[0], y0 + h)
    if fx1 <= fx0 or fy1 <= fy0:
        return
    part = spr[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0].astype(np.float32)
    a = part[..., 3:4] / 255 * alpha
    dst = f[fy0:fy1, fx0:fx1].astype(np.float32)
    f[fy0:fy1, fx0:fx1] = (dst * (1 - a) + part[..., :3] * a).astype(np.uint8)


def pil_rgba(w, h):
    im = Image.new("RGBA", (w, h))
    return im, ImageDraw.Draw(im)


def text_w(font, s):
    b = font.getbbox(s)
    return b[2] - b[0]


def outlined(d, xy, s, font, fill, edge, ew, anchor="la"):
    d.text(xy, s, font=font, fill=fill, stroke_width=ew, stroke_fill=edge, anchor=anchor)


def shadowed(img):
    """An RGBA PIL image with a soft drop shadow under it."""
    pad = 30
    out = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad))
    sh = Image.new("RGBA", out.size)
    alpha = img.split()[3].point(lambda v: v * 0.55)
    sh.paste((0, 0, 0, 255), (pad + 6, pad + 10), alpha)
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    out.alpha_composite(img, (pad, pad))
    return out


# ---------------------------------------------------------------------------------------------------- the camera's key


LOGO = {"conversa": (290, 170, 340, 95), "jogo": (340, 120, 400, 110)}  # the camera's "muanlartins" logo (x y w h)


def matte(top, kind="conversa"):
    """His (and the cat's) alpha on the camera's Klein virtual background (with its lattice and logo)."""
    small = cv2.resize(top, (top.shape[1] // 2, top.shape[0] // 2), interpolation=cv2.INTER_AREA).astype(np.int16)
    r, g, b = small[..., 0], small[..., 1], small[..., 2]
    dom = b - np.maximum(r, g)
    a = np.clip((78 - dom) / 34.0, 0, 1).astype(np.float32)
    x, y, w, h = LOGO[kind]
    a[y // 2:(y + h) // 2, x // 2:(x + w) // 2] = 0
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    return cv2.resize(a, (top.shape[1], top.shape[0]), interpolation=cv2.INTER_LINEAR)


def over_bg(top, bg, kind="conversa", wrap=0.0):
    """The camera's picture over a new background (both RGB, same size)."""
    a = matte(top, kind)[..., None]
    fg = top.astype(np.float32)
    # despill: the Klein left in the hair's edge
    m = np.maximum(fg[..., 0], fg[..., 1])
    fg[..., 2] = np.where(a[..., 0] < 0.98, np.minimum(fg[..., 2], m + 22), fg[..., 2])
    out = fg * a + bg.astype(np.float32) * (1 - a)
    if wrap:
        glow = cv2.GaussianBlur(bg.astype(np.float32), (0, 0), 14)
        edge = np.clip(a * (1 - a) * 4, 0, 1)
        out = out + glow * edge * wrap
    return np.clip(out, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------------------------------- confetti, stamps


CONFETES = [(255, 205, 60), (255, 80, 170), (60, 220, 255), (255, 255, 255), (140, 255, 90), (255, 130, 40),
            (133, 167, 255)]


def confetti_plan(rng, n, t0, x0, x1, y0, burst=False, cores=CONFETES):
    out = []
    for _ in range(n):
        if burst:  # thrown up from the bottom centre
            ang = rng.uniform(-2.4, -0.75)
            sp = rng.uniform(900, 2200)
            out.append(dict(t=t0 + rng.uniform(0, 0.08), x=rng.uniform(x0, x1), y=y0, vx=math.cos(ang) * sp,
                            vy=math.sin(ang) * sp, rot=rng.uniform(0, 6.3), vr=rng.uniform(-14, 14),
                            w=rng.uniform(10, 20), h=rng.uniform(5, 10), c=cores[rng.integers(len(cores))]))
        else:  # falling from above
            out.append(dict(t=t0 + rng.uniform(0, 2.5), x=rng.uniform(x0, x1), y=y0 - rng.uniform(0, 200),
                            vx=rng.uniform(-60, 60), vy=rng.uniform(260, 460), rot=rng.uniform(0, 6.3),
                            vr=rng.uniform(-9, 9), w=rng.uniform(10, 18), h=rng.uniform(5, 9),
                            c=cores[rng.integers(len(cores))]))
    return out


def draw_confetti(f, o, plan, y_min=0, y_max=None, alpha=1.0, gravity=1400, drag=1.6):
    y_max = f.shape[0] if y_max is None else y_max
    over = f.copy() if alpha < 1 else f
    for p in plan:
        x = o - p["t"]
        if x < 0:
            continue
        # velocity decays (air), gravity pulls; flutter sideways
        k = (1 - math.exp(-drag * x)) / drag
        px = p["x"] + p["vx"] * k + 30 * math.sin(x * 5 + p["rot"])
        py = p["y"] + p["vy"] * k + 0.5 * gravity * x * x * (0.35 if p["vy"] > 0 else 1.0)
        if py > y_max + 30 or py < y_min - 200:
            continue
        r = p["rot"] + p["vr"] * x
        cw = p["w"] / 2
        ch = p["h"] / 2 * abs(math.cos(r * 1.7))  # a little flip
        c, s = math.cos(r), math.sin(r)
        pts = np.array([[px + c * dx - s * dy, py + s * dx + c * dy] for dx, dy in
                        ((-cw, -ch), (cw, -ch), (cw, ch), (-cw, ch))], np.int32)
        cv2.fillConvexPoly(over, pts, p["c"], lineType=cv2.LINE_AA)
    if alpha < 1:
        f[:] = mix(f, over, alpha)


def stamp_sprite(lines, color=(214, 32, 40), size=96, angle=-8):
    """A rubber stamp: capital letters in a double frame, worn a little."""
    font = S["ctx"].grotesk(size)
    small = S["ctx"].grotesk(int(size * 0.55))
    fonts = [font] + [small] * (len(lines) - 1)
    ws = [text_w(fo, s) for fo, s in zip(fonts, lines)]
    hs = [fo.getbbox(s)[3] - fo.getbbox(s)[1] for fo, s in zip(fonts, lines)]
    pad, gap = 34, 14
    w = max(ws) + 2 * pad
    h = sum(hs) + gap * (len(lines) - 1) + 2 * pad
    im, d = pil_rgba(w + 20, h + 20)
    col = color + (255,)
    d.rounded_rectangle((10, 10, w + 10, h + 10), 18, outline=col, width=10)
    d.rounded_rectangle((24, 24, w - 4, h - 4), 10, outline=col, width=4)
    y = 10 + pad
    for fo, s, tw, th in zip(fonts, lines, ws, hs):
        b = fo.getbbox(s)
        d.text((10 + (w - tw) / 2 - b[0], y - b[1]), s, font=fo, fill=col)
        y += th + gap
    arr = np.array(im)
    rng = np.random.default_rng(len("".join(lines)))
    worn = (rng.random(arr.shape[:2]) > 0.13).astype(np.float32)
    worn = cv2.GaussianBlur(worn, (0, 0), 1.1)
    arr[..., 3] = (arr[..., 3] * np.clip(worn * 1.3, 0, 1)).astype(np.uint8)
    out = Image.fromarray(arr).rotate(angle, expand=True, resample=Image.BICUBIC)
    return np.array(out)


def stamp_in(f, spr, cx, cy, o, t0, size=1.0):
    """A stamp slamming down at t0: from 2.2× to 1 in 0.1 s with a little bounce."""
    x = o - t0
    if x < 0:
        return
    sc = size * (2.2 - 1.2 * ease_out(x / 0.1)) if x < 0.1 else size * (1 + 0.04 * math.exp(-(x - 0.1) * 14) *
                                                                     math.cos((x - 0.1) * 50))
    blit(f, spr, cx, cy, sc, min(1.0, x / 0.05 + 0.3))


def label_plate(text, size=58, fill=None, ink=None):
    """Branco plates cut at 45° with Klein capitals (the thumbnails' second line), one per "|"-separated line,
    stacked and centred, never wider than the safe area."""
    c = S["ctx"].cores
    fill = fill or c["branco"]
    ink = ink or c["klein"]
    lines = text.split("|")
    font = S["ctx"].grotesk(size)
    widest = max(font.getbbox(x)[2] - font.getbbox(x)[0] for x in lines)
    if widest + 64 > 760:  # inside the safe area (x 120-888)
        return label_plate(text, int(size * 690 / widest), fill, ink)
    plates = []
    for line in lines:
        b = font.getbbox(line)
        tw, th = b[2] - b[0], font.getbbox("ÃQ")[3] - font.getbbox("ÃQ")[1]
        w, h = tw + 64, th + int(size * 0.62)
        im, d = pil_rgba(w, h)
        S["ctx"].plate(d, 0, 0, w, h, fill + (255,))
        d.text((32 - b[0], h / 2), line, font=font, fill=ink, anchor="lm")
        plates.append(im)
    gap = 10
    W_ = max(p.width for p in plates)
    H_ = sum(p.height for p in plates) + gap * (len(plates) - 1)
    out = Image.new("RGBA", (W_, H_))
    y = 0
    for p in plates:
        out.alpha_composite(p, ((W_ - p.width) // 2, y))
        y += p.height + gap
    return np.array(shadowed(out))


# ---------------------------------------------------------------------------------------------------- transitions


def transitions(f, o):
    """The cuts' sweeps (destaque's own), on the whole frame with everything drawn on it."""
    D.Effects.transition(SimpleNamespace(cuts=S["cortes"]), f, o)


def cuts(ctx, cortes):
    return [(ctx.clock.starts[k], kind) for k, kind in cortes.items() if kind != "seco"]


# ---------------------------------------------------------------------------------------------------- sounds


SR = 48000


def peak1(x):
    return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def env(t, attack, tau):
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / tau)


def band(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(fr)
    if lo:
        g *= np.clip(np.log2(np.maximum(fr, 1) / (lo / 2)), 0, 1) ** 2
    if hi:
        g *= np.clip(np.log2(hi * 2 / np.maximum(fr, 1)), 0, 1) ** 2
    return np.fft.irfft(X * g, len(x)).astype(np.float32)


def tone(f0, d, harm=((1, 1.0),), attack=0.01, tau=0.3, vib=0.0):
    t = np.arange(int(d * SR)) / SR
    ph = 2 * np.pi * np.cumsum(f0 * (1 + vib * np.sin(2 * np.pi * 5.5 * t))) / SR
    x = sum(a * np.sin(k * ph) for k, a in harm)
    return (x * env(t, attack, tau)).astype(np.float32)


def brass(f0, d, tau=0.5):
    """A brass-like note: a band-limited saw through a low-pass that opens with the attack."""
    t = np.arange(int(d * SR)) / SR
    x = np.zeros_like(t)
    for det in (-0.004, 0.0, 0.005):
        ph = 2 * np.pi * np.cumsum(np.full(len(t), f0 * (1 + det))) / SR
        x += sum(np.sin(k * ph) / k for k in range(1, 14))
    cut = 500 + 2600 * np.exp(-t / 0.18)
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    e = np.minimum(1, t / 0.03) * np.minimum(1, np.maximum(0, d - t) / 0.08) * (0.75 + 0.25 * np.exp(-t / tau))
    return peak1(np.tanh(1.6 * peak1(y)) * e)


def place_in(out, x, at):
    i = int(at * SR)
    if i >= len(out):
        return
    n = min(len(x), len(out) - i)
    out[i:i + n] += x[:n]


def fanfare():
    """A short victory fanfare: G C E G… C, brass in two voices, a cymbal."""
    notes = [(0.0, 392.0, 0.14), (0.15, 523.25, 0.14), (0.30, 659.25, 0.14), (0.45, 783.99, 0.34),
             (0.80, 659.25, 0.14), (0.95, 783.99, 0.9)]
    out = np.zeros(int(2.1 * SR), np.float32)
    for at, f0, d in notes:
        place_in(out, brass(f0, d), at)
        place_in(out, 0.55 * brass(f0 / 2, d), at)
    t = np.arange(int(1.6 * SR)) / SR
    cym = band(np.random.default_rng(2).standard_normal(len(t)), 4000, None) * env(t, 0.002, 0.5)
    place_in(out, 0.35 * peak1(cym), 0.95)
    return peak1(out)


def crowd(d=2.5, seed=4):
    """A crowd cheering: shaped noise in vowel bands, swelling and fading."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(d * SR)) / SR
    n = rng.standard_normal(len(t)).astype(np.float32)
    x = band(n, 300, 900) + 0.7 * band(n, 1000, 2800) + 0.25 * band(n, 3000, 7000)
    flutter = 1 + 0.25 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t)
    e = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.9)
    return peak1(x * flutter * e)


def pops(n=6, d=0.6, seed=5):
    """Confetti cannons: a few soft pops."""
    rng = np.random.default_rng(seed)
    out = np.zeros(int(d * SR), np.float32)
    t = np.arange(int(0.08 * SR)) / SR
    for i in range(n):
        p = band(rng.standard_normal(len(t)), 600, 4000) * env(t, 0.001, 0.012)
        place_in(out, p * rng.uniform(0.5, 1), rng.uniform(0, d - 0.1))
    return peak1(out)


def slash(d=0.32, seed=7):
    """A claw slash: three fast tearing swishes."""
    rng = np.random.default_rng(seed)
    out = np.zeros(int(d * SR), np.float32)
    for i in range(3):
        t = np.arange(int(0.12 * SR)) / SR
        n = rng.standard_normal(len(t))
        sw = band(n, 1800, 9000) * np.sin(np.pi * np.minimum(1, t / 0.12)) ** 2
        tear = band(n, 300, 1500) * (rng.random(len(t)) < 0.15) * env(t, 0.002, 0.04)
        place_in(out, sw + 0.6 * tear, i * 0.07)
    return peak1(out)


def buzzer(d=0.55):
    """A game show's wrong answer: two square tones, low."""
    t = np.arange(int(d * SR)) / SR
    x = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 155.5 * t)) * 0.5
    x = band(x.astype(np.float32), None, 3000) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.05)
    return peak1(np.tanh(1.5 * x))


def ding(f0=1568.0, d=1.0):
    t = np.arange(int(d * SR)) / SR
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / dd)
            for r, a, dd in ((1, 1.0, 0.4), (2.0, 0.4, 0.2), (3.01, 0.25, 0.1), (4.2, 0.1, 0.06)))
    return peak1(x * np.minimum(1, t / 0.002))


def ping():
    """A chat message arriving: two quick notes."""
    out = np.zeros(int(0.35 * SR), np.float32)
    place_in(out, ding(1318.5, 0.25), 0.0)
    place_in(out, ding(1975.5, 0.3), 0.06)
    return peak1(out)


def pistol():
    """A starting pistol: a crack and a short room."""
    t = np.arange(int(0.7 * SR)) / SR
    n = np.random.default_rng(9).standard_normal(len(t)).astype(np.float32)
    crack = band(n, 500, None) * env(t, 0.0005, 0.01)
    body = band(n, 120, 900) * env(t, 0.001, 0.08)
    tail = band(n, 300, 3000) * env(t, 0.01, 0.25) * 0.25
    thump = np.sin(2 * np.pi * np.cumsum(60 + 90 * np.exp(-t / 0.02)) / SR) * env(t, 0.001, 0.06)
    return peak1(np.tanh(2.0 * (crack + 0.7 * body + tail + 0.8 * thump)))


def whoosh(d=0.5, up=True):
    t = np.arange(int(d * SR)) / SR
    n = np.random.default_rng(13).standard_normal(len(t)).astype(np.float32)
    u = t / d
    x = band(n, 400, 6000) * (np.sin(np.pi * u) ** 2)
    return peak1(x)


def crunch(seed=1, d=0.22):
    """A crunch: a burst of crackles (cereal)."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(d * SR)) / SR
    n = rng.standard_normal(len(t)).astype(np.float32)
    clicks = (rng.random(len(t)) < 0.03).astype(np.float32) * rng.uniform(0.3, 1, len(t))
    x = band(n * clicks, 800, 8000) * 3 + band(n, 1500, 5000) * 0.3
    return peak1(x * env(t, 0.003, 0.07))


def scratch():
    """A record scratch: noise through a band swept down and up fast."""
    t = np.arange(int(0.45 * SR)) / SR
    n = np.random.default_rng(21).standard_normal(len(t))
    f = 600 + 2400 * np.abs(np.sin(2 * np.pi * 3.2 * t))
    out = np.zeros_like(t)
    low = bp = 0.0
    for i in range(len(t)):
        g = 2 * math.sin(math.pi * f[i] / SR)
        high = n[i] - low - 0.35 * bp
        bp += g * high
        low += g * bp
        out[i] = bp
    return peak1(out * np.minimum(1, t / 0.005) * np.minimum(1, (0.45 - t) / 0.05))


def boing(d=0.6):
    t = np.arange(int(d * SR)) / SR
    f = 220 + 160 * np.exp(-t / 0.25) * np.cos(2 * np.pi * 9 * t)
    return peak1(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.005, 0.25))


def question():
    """A rising "hm?": a sine gliding up twice."""
    out = np.zeros(int(0.5 * SR), np.float32)
    for at, f0 in ((0.0, 420), (0.18, 560)):
        t = np.arange(int(0.16 * SR)) / SR
        x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * t / 0.16)) / SR) * np.sin(np.pi * t / 0.16)
        place_in(out, x.astype(np.float32), at)
    return peak1(out)


def echo(x, delays=(0.28, 0.56, 0.84, 1.12, 1.4), gains=(0.6, 0.42, 0.3, 0.2, 0.13), hi=6000):
    """Copies of x later and softer, each a little darker (a sound carrying over a valley)."""
    out = np.zeros(len(x) + int((delays[-1] + 0.1) * SR), np.float32)
    for dl, g in zip(delays, gains):
        place_in(out, g * band(x, 300, hi * (1 - dl * 0.4)), dl)
    return out


def mic(a, b):
    """The live's mic track (his own voice) from a to b, live seconds."""
    live = S["ctx"].VIDEOS / "Lives" / "2026-11-24" / "15-15-16 Live.mp4"
    return D.pcm(live, a, b - a, stream="0:a:1", channels=1)[:, 0].astype(np.float32)


# ====================================================================================================== the gags


def setup(ctx):
    S.clear()
    S["ctx"] = ctx
    S["cortes"] = cuts(ctx, CORTES)
    W, CAM_H, GAME_H = ctx.W, ctx.CAM_H, ctx.GAME_H
    rng = np.random.default_rng(1124)
    # --- the cat
    S["podio"] = cover(load("gata-podio.png"), GAME_H, GAME_H)
    S["ouro_bg"] = ouro_bg(W, CAM_H)
    S["confete_top"] = confetti_plan(rng, 140, T(GORDUCHA), -40, W + 40, -30)
    S["confete_burst"] = confetti_plan(rng, 170, T(GORDUCHA), 200, 880, CAM_H + 1000, burst=True)
    S["gata_titulo"] = label_plate("A VERDADEIRA|CAMPEÃ DO X1", 66)
    S["gata_pergunta"] = ctx.title_sprite(["QUEM GANHOU", "O X1 DE VERDADE?"], 104)
    S["garras"] = claws(W, CAM_H)
    # --- Bolt
    lg = load("largada.png")
    S["estadio"] = cv2.GaussianBlur(cover(lg[:560, :400], W, CAM_H, 0.5, 0.3), (0, 0), 5)
    S["placar"] = placar(GAME_H)
    S["placar_nota"] = placar_nota()
    S["largada"] = cover(load("largada-real.png"), GAME_H, GAME_H)  # his real face put back (rosto_real.py, frame 9481.0)
    S["bolt_titulo"] = label_plate("USAIN BOLT NUNCA|CORREU COMIGO", 66)
    S["junto_titulo"] = label_plate("SÓ SE TODO MUNDO|CORRER JUNTO", 66)
    S["linhas"] = rng.uniform(0, 1, (90, 3))
    # --- Nescau
    S["comercial"] = comercial(GAME_H)
    S["croc"] = [croc_sprite(s, i) for i, s in enumerate(("CROC!", "CROC!"))]
    S["evelin"] = [chat_sprite("yevelin_", m) for m in EVELIN_MSGS]
    S["pessima"] = stamp_sprite(["PÉSSIMA", "PROPAGANDA"], size=110, angle=-9)
    S["nescau_titulo"] = label_plate("NESCAU COM IOGURTE?!", 62)
    S["rec"] = rec_badge()
    S["censura"] = label_plate("CENSURADO", 90, fill=(10, 10, 10), ink=(255, 255, 255))
    S["novo"] = stamp_sprite(["NOVO!"], color=(214, 32, 40), size=90, angle=0)
    S["produto"] = produto(ctx)
    S["noite"] = noite_bg(GAME_H)
    # --- psiu
    bh = load("psiu-virada.png")[:, 680:]
    S["bh_top"] = cv2.GaussianBlur(cover(bh, W, CAM_H, 0.5, 0.35), (0, 0), 5)
    S["bh"] = skyline(GAME_H)
    rua = load("psiu-virada.png")[:, 680:]  # the street's right side (no one in it)
    S["rua"] = cv2.GaussianBlur(cover(np.hstack([rua[:, ::-1], rua]), GAME_H, GAME_H, 0.5, 0.4), (0, 0), 3)
    S["psiu_spr"] = psiu_sprite()
    S["psiu_titulo"] = label_plate("O FENÔMENO DO|PSIU EM MINAS", 66)
    S["interroga"] = interroga_sprite()
    S["grafico"] = grafico_base(GAME_H)
    S["sotaque"] = label_plate("É O SOTAQUE|MINEIRO", 66)


# ---------------------------------------------------------------------------------------------------- the cat


def ouro_bg(w, h):
    """A gold ceremony behind him: a warm dark gradient with spotlight beams from above."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np.zeros((h, w, 3), np.float32)
    glow = np.clip(1 - np.hypot((x - w / 2) / w, (y - h * 0.55) / h) * 1.5, 0, 1)[..., None]
    base += np.array((40, 22, 6), np.float32) * (1 - glow) + np.array((190, 130, 40), np.float32) * glow
    for sx, ang in ((0.15, 0.35), (0.5, 0.0), (0.85, -0.35), (0.32, 0.15), (0.68, -0.15)):
        cx = sx * w
        d = np.abs((x - cx) - (y + 60) * math.tan(ang)) / (40 + y * 0.35)
        beam = np.clip(1 - d, 0, 1) ** 2 * np.clip(1 - y / h * 0.6, 0, 1)
        base += beam[..., None] * np.array((255, 225, 150), np.float32) * 0.45
    return np.clip(base, 0, 255).astype(np.uint8)


def claws(w, h):
    """Three claw gashes across the camera, RGBA: dark red cuts with a pale torn edge."""
    im, d = pil_rgba(w, h)
    for i in range(3):
        x0, y0 = 170 + i * 150, 120 + i * 20
        x1, y1 = x0 + 520, y0 + 560
        pts = []
        for k in range(41):
            u = k / 40
            wd = 34 * math.sin(math.pi * u) ** 0.8 + 2
            px, py = x0 + (x1 - x0) * u + 30 * math.sin(u * 3), y0 + (y1 - y0) * u
            pts.append((px, py, wd))
        left = [(px - wd * 0.7, py + wd * 0.5) for px, py, wd in pts]
        right = [(px + wd * 0.7, py - wd * 0.5) for px, py, wd in pts]
        d.polygon(left + right[::-1], fill=(250, 235, 230, 235))
        left = [(px - wd * 0.42, py + wd * 0.3) for px, py, wd in pts]
        right = [(px + wd * 0.42, py - wd * 0.3) for px, py, wd in pts]
        d.polygon(left + right[::-1], fill=(120, 0, 10, 255))
    return np.array(im.filter(ImageFilter.GaussianBlur(1.2)))


def gata(f, o, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    st = ctx.clock.starts
    if not (0 <= o < st[3]):
        return
    top = f[:CAM_H]
    g = T(GORDUCHA)
    # the camera: Klein → gold ceremony from "ganhou", lights coming up
    a0 = T(GANHOU)
    if o >= a0:
        k = ease_out((o - a0) / 0.5)
        bg = S["ouro_bg"]
        top[:] = over_bg(top, bg if k >= 1 else mix(np.zeros_like(bg), bg, k), "conversa", wrap=0.25)
    # the lower half: the arena in the dark until the reveal, then the cat on the podium
    pod = S["podio"]
    if o < g:
        dark = (pod.astype(np.float32) * 0.18).astype(np.uint8)
        low = cv2.GaussianBlur(dark, (0, 0), 18)
        z = 1.0 + 0.04 * o / max(g, 1e-3)
        low = warp(low, z, 540, 540)
        sweep = 0.5 + 0.5 * math.sin(o * 2.2)
        y, x = np.mgrid[0:1080:4, 0:1080:4].astype(np.float32)
        spot = np.clip(1 - np.hypot(x - (300 + 480 * sweep), y - 600) / 260, 0, 1) ** 2
        spot = cv2.resize(spot, (1080, 1080))[..., None]
        low = np.clip(low + spot * np.array((90, 80, 60), np.float32), 0, 255).astype(np.uint8)
        f[CAM_H:] = low
    else:
        x = o - g
        z = 1.12 - 0.1 * ease_out(x / 0.5) + 0.03 * min(1, x / 6)
        low = warp(pod, z, 540, 470, 0, 110)
        flash(low, kick(x, 0.9, 0.08))
        f[CAM_H:] = low
    # confetti over everything after the reveal (until the scratch stretch's end)
    if o >= g:
        draw_confetti(f, o, S["confete_burst"], gravity=1500)
        draw_confetti(f, o, S["confete_top"], y_max=f.shape[0])
    # the scratch: claw gashes ripping in on "arranhão", fading by "você tá livre"
    s = T(ARRANHAO)
    if o >= s:
        x = o - s
        spr = S["garras"].copy()
        reveal = min(1.0, x / 0.12)
        if reveal < 1:  # drawn in from the top left along the slash
            yy, xx = np.mgrid[0:CAM_H, 0:W]
            spr[..., 3] = np.where(xx * 0.55 + yy < reveal * 1400, spr[..., 3], 0)
        fade = 1.0 - max(0.0, min(1.0, (o - T(LIVRE)) / 0.4))
        dx = kick(x, 14, 0.08) * math.sin(x * 110)
        blit(f, spr, W / 2 + dx, CAM_H / 2, 1.0, 0.95 * fade)
        if x < 0.15:
            flash(f[:CAM_H], kick(x, 0.35, 0.04), (255, 60, 60))


def gata_depois(f, o, ctx):
    g = T(GORDUCHA)
    st = ctx.clock.starts
    if o < g:
        sc = back(o / 0.25) if o < 0.25 else 1.0 + 0.01 * math.sin(o * 4)
        blit(f, S["gata_pergunta"], ctx.W / 2, ctx.CAM_H + 560, sc, min(1.0, (g - o) / 0.08))
    if g <= o < st[3] - 0.05:
        x = o - g
        sc = back(x / 0.22) if x < 0.22 else 1.0
        blit(f, S["gata_titulo"], ctx.W / 2, ctx.CAM_H + 180, sc, min(1.0, x / 0.06))


# ---------------------------------------------------------------------------------------------------- Bolt


def placar(size):
    """A stadium results board, the channel's Klein with the lattice: 100 m, two lanes."""
    c = S["ctx"].cores
    im = Image.new("RGB", (size, size), (6, 10, 30))
    d = ImageDraw.Draw(im)
    for k in range(-size, 2 * size, 44):
        d.line([(k, 0), (k + size, size)], fill=(14, 22, 60), width=2)
        d.line([(k + size, 0), (k, size)], fill=(14, 22, 60), width=2)
    x0, y0, x1, y1 = 60, 310, size - 60, 800
    d.rounded_rectangle((x0 - 10, y0 - 10, x1 + 10, y1 + 10), 26, fill=(40, 44, 60))
    d.rounded_rectangle((x0, y0, x1, y1), 20, fill=(4, 6, 14))
    big, mid, sm = S["ctx"].grotesk(60), S["ctx"].grotesk(50), S["ctx"].grotesk(34)
    amber = (255, 190, 60)
    d.text((x0 + 40, y0 + 34), "100 M RASOS · FINAL", font=big, fill=amber)
    d.line([(x0 + 30, y0 + 120), (x1 - 30, y0 + 120)], fill=(60, 60, 70), width=3)
    rows = [("4", "LUAN MARTINS", "—"), ("5", "USAIN BOLT", "9.58*")]
    for i, (lane, name, time) in enumerate(rows):
        y = y0 + 160 + i * 130
        d.rounded_rectangle((x0 + 30, y, x0 + 110, y + 90), 12, fill=c["klein"])
        d.text((x0 + 70, y + 45), lane, font=big, fill=(255, 255, 255), anchor="mm")
        d.text((x0 + 140, y + 45), name, font=mid, fill=(240, 240, 240), anchor="lm")
        d.text((x1 - 40, y + 45), time, font=big, fill=amber, anchor="rm")
    d.text((x0 + 40, y0 + 420), "*RECORDE MUNDIAL", font=sm, fill=(150, 150, 160))
    return np.array(im)


def placar_nota():
    font = S["ctx"].grotesk(58)
    s = "*NUNCA CORREU COMIGO"
    w = text_w(font, s) + 60
    im, d = pil_rgba(w, 110)
    d.rounded_rectangle((0, 0, w - 1, 109), 14, fill=(214, 32, 40, 255))
    d.text((w / 2, 55), s, font=font, fill=(255, 255, 255), anchor="mm")
    return np.array(shadowed(im))


def speed_lines(img, o, strength, cx=540, cy=560):
    """Anime speed lines rushing at (cx, cy)."""
    h, w = img.shape[:2]
    over = img.copy()
    for a, r0, ph in S["linhas"]:
        ang = a * 2 * math.pi
        r1 = 260 + 300 * ((ph + o * 3.0) % 1.0)
        r2 = r1 + 700
        p1 = (int(cx + math.cos(ang) * r1), int(cy + math.sin(ang) * r1))
        p2 = (int(cx + math.cos(ang) * r2), int(cy + math.sin(ang) * r2))
        cv2.line(over, p1, p2, (255, 255, 255), 3 + int(r0 * 6), cv2.LINE_AA)
    img[:] = mix(img, over, 0.55 * strength)


def bolt(f, o, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    st = ctx.clock.starts
    if not (st[3] <= o < st[5]):
        return
    top = f[:CAM_H]
    top[:] = over_bg(top, S["estadio"], "conversa", wrap=0.2)
    if o < st[4] or o < T(BOLT_HOMEM):
        low = S["placar"].copy()
        c = T(BOLT_CORREU)
        if o >= c:  # Bolt's record gets its asterisk
            x = o - c
            # strike through the time
            k = min(1.0, x / 0.12)
            cv2.line(low, (760, 605), (760 + int(220 * k), 585), (214, 32, 40), 9, cv2.LINE_AA)
            f[CAM_H:] = low
            blit(f, S["placar_nota"], W / 2, CAM_H + 720, back(x / 0.2) if x < 0.2 else 1.0, min(1.0, x / 0.05))
            return
        f[CAM_H:] = low
    else:  # the starting blocks
        h0 = T(BOLT_HOMEM)
        x = o - h0
        j = T(BOLT_JUNTO)
        z = 1.08 + 0.06 * min(1.0, x / 3.0)
        dx = 0.0
        if o >= j:  # the pistol: he goes
            y = o - j
            z += 0.5 * ease_out(y / 0.5)
        low = warp(S["largada"], z, 540, 600, dx)
        if x < 0.25:
            board = S["placar"].copy()
            cv2.line(board, (760, 605), (980, 585), (214, 32, 40), 9, cv2.LINE_AA)
            blit(board, S["placar_nota"], W / 2, 720, 1.0, 1.0)
            low = mix(board, low, ease_out(x / 0.25))
        if o >= j:
            speed_lines(low, o, min(1.0, (o - j) / 0.15))
            flash(low, kick(o - j, 0.85, 0.06))
        f[CAM_H:] = low


def bolt_depois(f, o, ctx):
    st = ctx.clock.starts
    W, CAM_H = ctx.W, ctx.CAM_H
    if st[3] <= o < st[4]:
        x = o - st[3]
        blit(f, S["bolt_titulo"], W / 2, CAM_H + 180, back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))
    h0 = T(BOLT_HOMEM)
    if h0 <= o < st[5]:
        x = o - h0
        blit(f, S["junto_titulo"], W / 2, CAM_H + 180, back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))


# ---------------------------------------------------------------------------------------------------- Nescau


EVELIN_MSGS = ["pega nao", "credo", "para"]


def comercial(size):
    """A cereal ad's set: warm sunburst rays, a sale burst."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    ang = np.arctan2(y - size * 0.55, x - size / 2)
    rays = (np.sin(ang * 14) > 0).astype(np.float32)
    a = np.array((255, 196, 40), np.float32)
    b = np.array((255, 150, 30), np.float32)
    img = a * rays[..., None] + b * (1 - rays[..., None])
    glow = np.clip(1 - np.hypot(x - size / 2, y - size * 0.55) / (size * 0.75), 0, 1)[..., None]
    img = img * (0.75 + 0.25 * glow) + 40 * glow
    return np.clip(img, 0, 255).astype(np.uint8)


def croc_sprite(s, i):
    font = S["ctx"].grotesk(120)
    w = text_w(font, s) + 80
    im, d = pil_rgba(w, 200)
    d.text((w / 2, 100), s, font=font, fill=(255, 236, 80), anchor="mm", stroke_width=12, stroke_fill=(120, 40, 0))
    return np.array(shadowed(im.rotate(-10 if i == 0 else 9, expand=True, resample=Image.BICUBIC)))


def chat_sprite(user, msg):
    """One of the live's chat messages, big: the dark Klein plate, the login in Klein claro, the message in white."""
    c = S["ctx"].cores
    fu, fm = S["ctx"].grotesk(40), S["ctx"].grotesk(74)
    w = max(text_w(fu, user), text_w(fm, msg)) + 110
    h = 172
    im, d = pil_rgba(w, h)
    S["ctx"].plate(d, 0, 0, w, h, c["noite"] + (245,), cut=40)
    d.line([(40, 6), (w - 8, 6)], fill=c["klein_claro"] + (255,), width=5)
    d.text((48, 28), user, font=fu, fill=c["klein_claro"])
    d.text((48, 70), msg, font=fm, fill=c["branco"])
    return np.array(shadowed(im))


# live seconds of the Nescau gag
CROCS = (12166.82, 12167.02)  # "croc, croc"
MASTIGA = (12167.35, 12167.75, 12168.15, 12168.55)  # chewing after it, open-mouthed
EVELIN_T = (12178.62, 12179.62, 12181.18)  # her messages, as they arrived in the live's chat
TAPAR = 12185.12  # "Não, esqueci de tapar a boca"
PESSIMA = 12191.12


def track(ctx, a, b, ref, box, search=90):
    """Where the patch `box` (x, y, w, h) of the picture `ref` (RGB, the camera's half) is in each frame of short
    seconds [a, b) of the clean picture: {frame: (dx, dy)}, its shift from `ref`, by template matching (his glasses
    are the patch), smoothed. Cached by the stretch's place."""
    import hashlib, json, subprocess
    FPS, W, CAM_H = ctx.FPS, ctx.W, ctx.CAM_H
    i0, i1 = int(round(a * FPS)), int(round(b * FPS))
    limpo = getattr(ctx, "limpo", None) or (ctx.work / "limpo.mp4")
    key = hashlib.sha1(repr((i0, i1, box, ctx.clock.spans, float(ref.mean()))).encode()).hexdigest()[:10]
    cache = ctx.work / f"palhacadas-trilha-{key}.json"
    if cache.exists():
        return {int(k): v for k, v in json.loads(cache.read_text()).items()}
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{i0 / FPS:.4f}", "-i", str(limpo), "-frames:v",
                          str(i1 - i0), "-vf", f"crop={W}:{CAM_H}:0:0,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    gray = np.frombuffer(raw, np.uint8).reshape(-1, CAM_H, W)
    x, y, w, h = box
    tpl = cv2.cvtColor(ref, cv2.COLOR_RGB2GRAY)[y:y + h, x:x + w]
    px, py = x, y
    found = []
    for g in gray:
        x0, y0 = max(0, px - search), max(0, py - search)
        x1, y1 = min(W, px + w + search), min(CAM_H, py + h + search)
        r = cv2.matchTemplate(g[y0:y1, x0:x1], tpl, cv2.TM_CCOEFF_NORMED)
        _, best, _, (mx, my) = cv2.minMaxLoc(r)
        if best > 0.35:
            px, py = x0 + mx, y0 + my
        found.append((px - x, py - y))
    arr = np.array(found, np.float32)
    sm = np.array([arr[max(0, i - 3):i + 4].mean(axis=0) for i in range(len(arr))])
    out = {i0 + k: sm[k].tolist() for k in range(len(sm))}
    cache.write_text(json.dumps(out))
    return out


def rec_badge():
    font = S["ctx"].grotesk(40)
    im, d = pil_rgba(330, 70)
    S["ctx"].plate(d, 0, 0, 330, 70, (214, 32, 40, 255), cut=16)
    d.ellipse((22, 23, 46, 47), fill=(255, 255, 255, 255))
    d.text((62, 35), "BOCA CAM", font=font, fill=(255, 255, 255), anchor="lm")
    return np.array(im)


def old_tv(img, o):
    """An old TV: washed colour, scanlines, a vignette and a roll of noise."""
    g = img.astype(np.float32)
    grey = g.mean(axis=2, keepdims=True)
    g = g * 0.45 + grey * 0.55
    g = g * np.array((1.05, 1.0, 0.85), np.float32)
    h, w = img.shape[:2]
    g[::3] *= 0.72
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    vig = np.clip(1.25 - np.hypot((x - w / 2) / w, (y - h / 2) / h) * 1.4, 0.2, 1)[..., None]
    g *= vig
    rng = np.random.default_rng(int(o * 60))
    g += rng.normal(0, 12, (h // 2, w // 2, 1)).repeat(2, 0).repeat(2, 1)[:h, :w]
    band = int((o * 500) % (h + 200)) - 100
    g[max(0, band):max(0, band + 40)] += 25
    return np.clip(g, 0, 255).astype(np.uint8)


def noite_bg(size):
    c = S["ctx"].cores
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size - 0.5
    glow = np.clip(1 - np.sqrt(x ** 2 + (y * 1.2) ** 2) * 1.5, 0, 1)[..., None]
    img = np.array(c["noite"], np.float32) * (1 - glow) + np.array(c["klein"], np.float32) * glow
    k = np.mgrid[0:size, 0:size]
    lattice = (((k[0] + k[1]) % 44 < 2) | ((k[0] - k[1]) % 44 < 2))[..., None]
    return np.where(lattice, img * 0.9 + 25, img).astype(np.uint8)


def produto(ctx):
    """The ad's product shot: the bowl he shows the camera (cereal with yogurt), cut round from the clean picture."""
    import subprocess
    t = T(12159.35)
    limpo = getattr(ctx, "limpo", None) or (ctx.work / "limpo.mp4")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(limpo), "-frames:v", "1", "-vf",
                          f"crop={ctx.W}:{ctx.CAM_H}:0:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    top = np.frombuffer(raw, np.uint8).reshape(ctx.CAM_H, ctx.W, 3)
    cx, cy, r = PRODUTO
    crop = cv2.resize(top[cy - r:cy + r, cx - r:cx + r], (520, 520), interpolation=cv2.INTER_CUBIC)
    a = np.zeros((520, 520), np.uint8)
    cv2.circle(a, (260, 260), 252, 255, -1, cv2.LINE_AA)
    out = np.dstack([crop, a])
    cv2.circle(out, (260, 260), 252, (255, 255, 255, 255), 14, cv2.LINE_AA)
    return np.array(shadowed(Image.fromarray(out)))


PRODUTO = (335, 660, 180)  # the bowl in the camera's half at 12159.35 (centre, radius)
CENSURA = (12179.62, 12180.75)  # Evelin's "credo" until he covers his mouth himself


def nescau(f, o, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    st = ctx.clock.starts
    if not (st[5] <= o < st[9]):
        return
    top = f[:CAM_H]
    low = S["comercial"].copy()
    e = T(EVELIN_T[0])
    x = o - st[5]
    z = 1.0
    for c in CROCS:  # the product punches on each crunch
        if o >= T(c):
            z = 1 + kick(o - T(c), 0.1, 0.07)
    if o < e:
        blit(low, S["produto"], 540, 620, (back(x / 0.3) if x < 0.3 else 1 + 0.015 * math.sin(x * 3)) * z)
        blit(low, S["novo"], 800, 390, 1 + 0.06 * math.sin(x * 8), 1.0, angle=14)
    else:  # the chat takes over: the ad dims
        k = ease_out((o - e) / 0.3)
        blit(low, S["produto"], 540, 620, 1.0)
        low = mix(low, S["noite"], k)
    f[CAM_H:] = low
    a, b = T(CENSURA[0]), T(CENSURA[1])
    if a <= o < b:  # the whole camera censored, TV style
        small = cv2.resize(top, (W // 30, CAM_H // 30), interpolation=cv2.INTER_AREA)
        top[:] = cv2.resize(small, (W, CAM_H), interpolation=cv2.INTER_NEAREST)
    p = T(PESSIMA)
    if o >= p:
        top[:] = old_tv(top, o)
        f[CAM_H:] = old_tv(f[CAM_H:], o + 0.3)


def nescau_depois(f, o, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    st = ctx.clock.starts
    if not (st[5] <= o < st[9]):
        return
    if o < T(EVELIN_T[0]):
        x = o - st[5]
        blit(f, S["nescau_titulo"], W / 2, CAM_H + 180, back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))
    # CROC! by the mouth cam on each crunch
    for i, c in enumerate(CROCS):
        x = o - T(c)
        if 0 <= x < 1.4:
            sc = back(x / 0.12) if x < 0.12 else 1.0
            a = min(1.0, (1.4 - x) / 0.2)
            blit(f, S["croc"][i], 230 if i == 0 else 850, 560 - i * 90, sc, a)
    # Evelin's messages, as they came in
    for i, (t, spr) in enumerate(zip(EVELIN_T, S["evelin"])):
        x = o - T(t)
        if x >= 0:
            sc = back(x / 0.16) if x < 0.16 else 1.0
            blit(f, spr, W / 2 - 120 + i * 120, CAM_H + 320 + i * 205, sc, min(1.0, x / 0.05))
    a, b = T(CENSURA[0]), T(CENSURA[1])
    if a <= o < b:
        x = o - a
        blit(f, S["censura"], W / 2, CAM_H / 2 + 60, back(x / 0.15) if x < 0.15 else 1.0, 1.0, angle=-4)
    p = T(PESSIMA)
    if o >= p:
        stamp_in(f, S["pessima"], W / 2, CAM_H + 560, o, p, 1.0)


# ---------------------------------------------------------------------------------------------------- psiu


def psiu_sprite():
    font = S["ctx"].grotesk(230)
    s = "PSIU!"
    w = text_w(font, s) + 120
    im, d = pil_rgba(w, 330)
    d.text((w / 2, 165), s, font=font, fill=(255, 255, 255), anchor="mm", stroke_width=16,
           stroke_fill=S["ctx"].cores["klein_escuro"])
    return np.array(shadowed(im))


def interroga_sprite():
    font = S["ctx"].grotesk(170)
    im, d = pil_rgba(180, 230)
    d.text((90, 115), "?", font=font, fill=(255, 220, 60), anchor="mm", stroke_width=10, stroke_fill=(60, 30, 0))
    return np.array(shadowed(im))


PSIU1 = (12367.9, 12369.85)  # his first "psiu" (a run of them)
VIRA = 12371.55  # he mimes turning round
PSSTS = (12377.65, 12378.2, 12378.43)  # "você anda no shopping e psst, psst, psst"
GRAF = 12378.69  # "E aí eu percebi que pelo sotaque das pessoas"
PSIU2 = (12388.95, 12389.55)  # "você consegue escutar esse [psiu] de muito mais longe"
ORIGEM = (880, 420)  # where the psiu comes from in the skyline (the lower half's own coordinates)
INTERROGA = [(-170, -330, 0.0, -14), (40, -400, 0.12, 8), (220, -300, 0.24, 18)]  # "?" over his head in the photo


def skyline(size):
    """Belo Horizonte at dusk, drawn: the sky from night blue to orange, the Serra do Curral's ridge, towers with
    lit windows. A little wider than the half, to pan."""
    w, h = size + 120, size
    rng = np.random.default_rng(31)
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    top, mid, low = np.array((12, 24, 70.0)), np.array((70, 60, 140.0)), np.array((255, 150, 70.0))
    sky = np.where(y[..., None] < 0.45, top + (mid - top) * (y[..., None] / 0.45),
                   mid + (low - mid) * np.clip((y[..., None] - 0.45) / 0.3, 0, 1))
    img = np.broadcast_to(sky, (h, w, 3)).copy()
    # stars
    for _ in range(80):
        cv2.circle(img, (int(rng.uniform(0, w)), int(rng.uniform(0, h * 0.35))), 1, (230, 230, 255), -1)
    # the ridge
    xs = np.arange(w)
    ridge = 560 + 40 * np.sin(xs / 140) + 25 * np.sin(xs / 47 + 1) + 12 * np.sin(xs / 13)
    for x in xs:
        img[int(ridge[x]):, x] = img[int(ridge[x]):, x] * 0.25 + np.array((40, 40, 90.0)) * 0.75
    # towers, back row then front
    for row, (base, hmin, hmax, shade) in enumerate(((760, 120, 300, (30, 30, 62)), (h, 220, 470, (14, 14, 34)))):
        x = -20
        while x < w:
            bw = int(rng.uniform(60, 140))
            bh = int(rng.uniform(hmin, hmax))
            y0 = base - bh - (0 if row == 0 else 160)
            y1 = base if row == 0 else h
            cv2.rectangle(img, (x, y0), (x + bw, y1), shade, -1)
            for wy in range(y0 + 14, y1 - 10, 22):
                for wx in range(x + 10, x + bw - 10, 18):
                    if rng.random() < 0.35:
                        c = (255, 210, 120) if rng.random() < 0.8 else (200, 230, 255)
                        cv2.rectangle(img, (wx, wy), (wx + 7, wy + 10), c, -1)
            if rng.random() < 0.3:
                cv2.line(img, (x + bw // 2, y0), (x + bw // 2, y0 - 50), shade, 4)
                cv2.circle(img, (x + bw // 2, y0 - 52), 5, (255, 60, 60), -1)
            x += bw + int(rng.uniform(0, 12))
    return np.clip(img, 0, 255).astype(np.uint8)


def grafico_base(size):
    """'ALCANCE DO SOM': the chart's frame, on the channel's dark Klein with the lattice."""
    c = S["ctx"].cores
    im = Image.new("RGB", (size, size), c["noite"])
    d = ImageDraw.Draw(im)
    for k in range(-size, 2 * size, 44):
        d.line([(k, 0), (k + size, size)], fill=(10, 34, 100), width=2)
        d.line([(k + size, 0), (k, size)], fill=(10, 34, 100), width=2)
    big, mid = S["ctx"].grotesk(84), S["ctx"].grotesk(58)
    d.text((70, 300), "ALCANCE DO SOM", font=big, fill=c["branco"])
    for i, name in enumerate(("CONVERSA", "GRITO", "PSIU MINEIRO")):
        d.text((70, 420 + i * 140), name, font=mid, fill=c["klein_claro"] if i < 2 else (255, 220, 60))
    return np.array(im)


def bar(img, y, length, color, label, alpha=1.0):
    c = S["ctx"].cores
    x0 = 70
    if length > 4:
        over = img.copy()
        cv2.rectangle(over, (x0, y), (x0 + int(length), y + 64), color, -1)
        img[:] = mix(img, over, alpha)
    font = S["ctx"].grotesk(64)
    im, d = pil_rgba(320, 64)
    d.text((0, 32), label, font=font, fill=c["branco"] if length < 900 else S["ctx"].cores["klein_escuro"],
           anchor="lm")
    spr = np.array(im)
    blit(img, spr, min(x0 + length + 30 + 160, 1080 - 170), y + 32, 1.0, alpha)


def rings(img, o, t0, cx, cy, every=0.33, life=1.3, color=(255, 255, 255)):
    """Sound rings spreading from (cx, cy), one every `every` s from t0."""
    over = img.copy()
    k = 0
    while t0 + k * every <= o:
        x = o - (t0 + k * every)
        if x < life:
            r = int(40 + 900 * ease_out(x / life))
            a = (1 - x / life)
            cv2.circle(over, (int(cx), int(cy)), r, color, max(2, int(16 * a)), cv2.LINE_AA)
        k += 1
    img[:] = mix(img, over, 0.8)


RUA = 1.7  # his camera's half scaled into the lower half, its foot on the frame's foot: his head about 440 px down


def na_rua(raw, x):
    """The lower half: his real camera (raw, the camera's half before any key) keyed off the Klein and laid big over
    the street, pushing in a little."""
    a = matte(raw, "conversa")
    fg = raw.astype(np.float32)
    m = np.maximum(fg[..., 0], fg[..., 1])
    fg[..., 2] = np.where(a < 0.98, np.minimum(fg[..., 2], m + 22), fg[..., 2])
    k = RUA * (1.04 - 0.04 * ease_out(x / 0.4) + 0.02 * min(1.0, x / 6))
    w, h = int(raw.shape[1] * k), int(raw.shape[0] * k)
    fg = cv2.resize(fg, (w, h), interpolation=cv2.INTER_LINEAR)
    a = cv2.resize(a, (w, h), interpolation=cv2.INTER_LINEAR)[..., None]
    x0, y0 = (w - 1080) // 2, h - 1080
    fg, a = fg[y0:y0 + 1080, x0:x0 + 1080], a[y0:y0 + 1080, x0:x0 + 1080]
    out = fg * a + S["rua"].astype(np.float32) * (1 - a)
    low = np.clip(out, 0, 255).astype(np.uint8)
    flash(low, kick(x, 0.6, 0.06))
    return low


def psiu(f, o, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    st = ctx.clock.starts
    if not (o >= st[9]):
        return
    top = f[:CAM_H]
    raw = top.copy()
    top[:] = over_bg(top, S["bh_top"], "conversa", wrap=0.2)
    v, g = T(VIRA), T(GRAF)
    if o < v:
        pan = 120 * min(1.0, (o - st[9]) / 14)
        low = S["bh"][:, int(pan):int(pan) + 1080].copy()
        a, b = T(PSIU1[0]), T(PSIU1[1])
        if o >= a:
            rings(low, min(o, b + 1.2), a, ORIGEM[0] - pan, ORIGEM[1])
        f[CAM_H:] = low
    elif o < g:  # his real camera keyed into the street, big, as he turns round; the city above
        x = o - v
        f[CAM_H:] = na_rua(raw, x)
        pan = 80 + 40 * min(1.0, x / 6)
        sky = S["bh"][120:120 + CAM_H, int(pan):int(pan) + W].copy()
        flash(sky, kick(x, 0.5, 0.06))
        top[:] = sky
    else:
        low = S["grafico"].copy()
        x = o - g
        for i, (length, label) in enumerate(((150, "5 m"), (380, "50 m"))):
            u = ease_out((x - 0.15 - 0.25 * i) / 0.4)
            if u > 0:
                bar(low, 480 + i * 140, length * u, S["ctx"].cores["klein_claro"], label, min(1.0, u * 3))
        p2 = T(PSIU2[0])
        if o < p2:
            if x > 0.8:
                bar(low, 480 + 2 * 140, 0, (255, 220, 60), "?", 1.0)
        else:
            y = o - p2
            length = 2400 * ease_out(y / 0.5)
            bar(low, 480 + 2 * 140, length, (255, 200, 40), "3 KM", 1.0)
            dx = kick(y, 18, 0.1) * math.sin(y * 90)
            low = warp(low, 1.0, 540, 540, dx)
            rings(low, min(o, T(PSIU2[1]) + 1.0), p2, 1000, 805, every=0.2, life=1.0, color=(255, 220, 60))
        f[CAM_H:] = low


def psiu_depois(f, o, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    st = ctx.clock.starts
    if not (o >= st[9]):
        return
    v, g = T(VIRA), T(GRAF)
    if o < T(PSIU1[0]):
        x = o - st[9]
        blit(f, S["psiu_titulo"], W / 2, CAM_H + 180, back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))
    a, b = T(PSIU1[0]), T(PSIU1[1])
    if a <= o < v:  # PSIU! from far away in the skyline to huge
        x = o - a
        pan = 120 * min(1.0, (o - st[9]) / 14)
        u = ease_out(x / 0.9)
        cx = (ORIGEM[0] - pan) * (1 - u) + 540 * u
        cy = CAM_H + ORIGEM[1] * (1 - u) + 560 * u
        wob = 1 + 0.06 * math.sin(x * 40) * math.exp(-x * 1.5)
        alpha = min(1.0, (v - o) / 0.15)
        blit(f, S["psiu_spr"], cx, cy, (0.15 + 0.95 * u) * wob, alpha, angle=-6 + 6 * u)
    if v <= o < g:  # "?" over his head in the photo
        for dx, dy, d0, ang in INTERROGA:
            x = o - v - d0
            if x >= 0:
                sc = back(x / 0.15) if x < 0.15 else 1 + 0.04 * math.sin(x * 6 + d0 * 20)
                blit(f, S["interroga"], 540 + dx * 1.4, CAM_H + 560 + dy, sc * 0.9, min(1.0, x / 0.05), angle=ang)
        for i, t in enumerate(PSSTS):  # small psst bubbles in the shopping
            x = o - T(t)
            if 0 <= x < 0.9:
                blit(f, S["psiu_spr"], 250 + i * 110, CAM_H + 300 + (i % 2) * 120,
                     0.35 * (back(x / 0.12) if x < 0.12 else 1), min(1.0, (0.9 - x) / 0.2))
    if o >= g and o < st[11]:
        x = o - g
        blit(f, S["sotaque"], W / 2, CAM_H + 180, back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))
    p2 = T(PSIU2[0])
    if p2 <= o < p2 + 1.6:
        x = o - p2
        blit(f, S["psiu_spr"], 860, CAM_H + 335, 0.42 * (back(x / 0.15) if x < 0.15 else 1.0),
             min(1.0, (p2 + 1.6 - o) / 0.25), angle=-8)


# ---------------------------------------------------------------------------------------------------- hooks


def antes(f, o, ctx):
    gata(f, o, ctx)
    bolt(f, o, ctx)
    nescau(f, o, ctx)
    psiu(f, o, ctx)
    return f


def depois(f, o, ctx):
    gata_depois(f, o, ctx)
    bolt_depois(f, o, ctx)
    nescau_depois(f, o, ctx)
    psiu_depois(f, o, ctx)
    transitions(f, o)
    return f


def sons(ctx):
    out = list(D.transition_sounds(S["cortes"]))
    g = T(GORDUCHA)
    out += [(g - 0.02, fanfare(), -11), (g, pops(), -14), (g + 0.1, crowd(2.6), -17),
            (T(ARRANHAO) + 0.02, slash(), -9),
            (T(BOLT_CORREU) + 0.05, buzzer(), -16),
            (T(BOLT_JUNTO), pistol(), -9), (T(BOLT_JUNTO) + 0.05, crowd(2.0, 8), -16)]
    out += [(T(c), crunch(i + 1), -10) for i, c in enumerate(CROCS)]
    out += [(T(t), ping(), -12) for t in EVELIN_T]
    out += [(T(CENSURA[0]), tone(1000.0, T(CENSURA[1]) - T(CENSURA[0]), attack=0.005, tau=9), -22),
            (T(PESSIMA), buzzer(), -11), (T(PESSIMA), D.sound("impact-boom"), -16)]
    a, b = PSIU1
    out += [(T(b) + 0.05, echo(peak1(mic(a, b))), -10)]
    out += [(T(VIRA), question(), -12), (T(GRAF), whoosh(0.4), -18)]
    a, b = PSIU2
    out += [(T(a), whoosh(0.5), -14), (T(b) + 0.05, echo(peak1(mic(a, b))), -8), (T(a) + 0.4, ding(2093.0, 1.0), -16)]
    return out
