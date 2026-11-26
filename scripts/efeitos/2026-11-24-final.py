"""Narrando a final (2026-11-24): the short's own effects, destaque.py's "extra".

Luan was out of his own 1v1 tournament, so he narrated the final (Evelin, a viewer who had just beaten him, against
Hearts, an ex-SSL) as a Brazilian TV commentator while spectating; JP co-commented on Discord. Luan's direction: "foco
no hype da torcida e do narrador, e edição de hype pras jogadas". So the short is a TV broadcast of a big final:

- the broadcast's dressing, in the channel's look: a scorebug (EVELIN × HEARTS, the score, the game's clock), an
  "AO VIVO" bug, the lower thirds ("NARRAÇÃO · LUAN MARTINS", "COMENTÁRIOS · JP"), JP's lines captioned as the
  commentator's, a "REPLAY" tag, a "kick-off" dictionary card, the final's result;
- his camera as the commentary booth: the Klein virtual background keyed out for a booth over a stadium at night
  (Gemini, `cabine-fundo.png`, no people), and a broadcast headset with a boom mic on him all along: a Gemini edit of
  his own frame (`eu-headset-ref.png`, live 8870) differenced against the frame for the headset alone, carried on his
  head by tracking (Lucas-Kanade on his face, a similarity per frame), his hands drawn back over the headband;
- on "puta que pariu, que bola, meus senhores" and "que bola, senhoras e senhores": a photoreal him in the booth
  with the headset (Gemini edits from his frame: `eu-grito.png`, `eu-senhores.png`) cutting in, punched, shaking;
- replay wipes: a Klein band with the lattice and the channel's Σ sweeping the game's half as the game's replay
  starts and ends; and the stretch changes swept the same way over the whole frame;
- slow motion into the double flip (the flick off her hood) and into the aerial's last touch: speed ramps of the
  game's half (fast, then 0.35-0.4×, then fast again), in step with the sound again on the goal;
- the goals: the game's flash pushed, a roar built from layered edge-tts "Gooool!" voices and noise, the score
  flipping with a "GOL" tab, the stand of the live (TORCIDA MUANLARTINS, its real fans, cut out of Live.mp4) rising
  at the foot of the game with every fan jumping, confetti; a crowd chanting "QUE BOLA!" (edge-tts voices ×2 each,
  ±2 semitones, claps, a stadium tail) after each "que bola";
- the end: the final whistle, the scorebug's "FIM DE JOGO", the result card, the stand applauding the winner.

Every sound but the voices is synthesised here.
"""
import json
import math
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PARTES = "Lives/2026-11-24/Shorts/Partes/final"
LIVE = "Lives/2026-11-24/15-15-16 Live.mp4"
S = {}
FACE_HOLE = (458, 440, 698, 640)  # the reference's face in the camera's half (x0, y0, x1, y1): never from the edit
DROP = 90  # he's moved this far down in the booth, so the scorebug fits over his head

# ------------------------------------------------------------------------------------------------ the beats (live s)
GOL1, GOL1R, GOL2, GOL2R = 8877.50, 8888.47, 9141.02, 9151.90  # the goals' flashes (live, replay)
REPLAYS = [(8880.98, 8891.30, 0), (9144.45, 9154.92, 2)]  # the game's replays (start, end, stretch)
# speed ramps of the game's half: (short-time knots as live seconds, source live seconds): piecewise linear
RAMPS = [
    ([8885.60, 8886.10, 8887.10, 8887.60], [8885.60, 8886.40, 8886.75, 8887.60], 0),  # the flick off her hood
    ([9149.90, 9150.30, 9151.30, 9151.70], [9149.90, 9150.60, 9151.00, 9151.70], 2),  # the aerial's last touch
]
CUTINS = [(8891.30, 8893.75, "grito", 0), (9159.08, 9161.05, "senhores", 2)]  # photoreal him, live s, stretch
CHANTS = [([8892.62, 8893.38, 8894.10], 0), ([9159.70, 9160.42, 9161.10], 2)]  # "QUE BOLA!", live s
TORCIDA = [(GOL1 + 0.15, 8880.85, 0, "yevelin_"), (8892.35, 8894.1, 0, "yevelin_"), (GOL2 + 0.15, 9144.3, 2, "yevelin_"),
           (9158.95, 9161.05, 2, "yevelin_"), (9260.25, 9263.96, 3, "hartz_ws")]
JP = [(8897.21, 8898.55, "COMO É QUE É", "ESSA DISPUTA?"), (8899.40, 8900.55, "EU SEMPRE", "ESQUEÇO O NOME")]
KICKOFF = 8901.15  # "É kick-off."
APITO_SAIDA = 8898.45  # the kick-off's whistle (the clock starts)
FIM = 9259.62  # the clock at 0:00: the final whistle
TITULO = (8877.55, 8880.30)

# the clock as the game shows it, and the score, per stretch
def placar(live, k):
    if k == 0:
        return (0, 1) if live < GOL1 else (1, 1), 240
    if k == 1:
        return (1, 1), 240 - max(0, math.ceil(live - 8898.55))
    if k == 2:
        return (2, 4) if live < GOL2 else (3, 4), max(79, 88 - math.floor(live - 9131.0))
    return (3, 5), 1 if live < FIM else 0


# ------------------------------------------------------------------------------------------------ helpers


def where(o, ctx):
    st, sp = ctx.clock.starts, ctx.clock.spans
    k = max([i for i in range(len(sp)) if st[i] <= o + 1e-9] or [0])
    return k, sp[k][0] + (o - st[k])


def T(live, k, ctx):
    return ctx.clock.out(live, k)


def ease_out(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def back(x, k=1.7):
    x = min(1.0, max(0.0, x))
    return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2


def over(f, spr, x, y, alpha=1.0):
    """A straight-alpha RGBA uint8 sprite onto f at its top-left (x, y), clipped."""
    if alpha <= 0.003:
        return
    h, w = spr.shape[:2]
    x, y = int(round(x)), int(round(y))
    X0, Y0, X1, Y1 = max(0, x), max(0, y), min(f.shape[1], x + w), min(f.shape[0], y + h)
    if X1 <= X0 or Y1 <= Y0:
        return
    s = spr[Y0 - y:Y1 - y, X0 - x:X1 - x].astype(np.float32)
    a = s[..., 3:4] / 255 * alpha
    roi = f[Y0:Y1, X0:X1].astype(np.float32)
    f[Y0:Y1, X0:X1] = (roi * (1 - a) + s[..., :3] * a).astype(np.uint8)


def centred(f, spr, cx, cy, scale=1.0, alpha=1.0, angle=0.0):
    if scale <= 0.01 or alpha <= 0.003:
        return
    if abs(scale - 1) > 1e-3 or angle:
        h, w = spr.shape[:2]
        m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, scale)
        c, s = abs(m[0, 0]), abs(m[0, 1])
        nw, nh = int(w * c + h * s) + 2, int(w * s + h * c) + 2
        m[0, 2] += nw / 2 - w / 2
        m[1, 2] += nh / 2 - h / 2
        spr = cv2.warpAffine(spr, m, (nw, nh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    over(f, spr, cx - spr.shape[1] / 2, cy - spr.shape[0] / 2, alpha)


def rgba(img):
    return np.array(img.convert("RGBA"))


def text_w(font, s):
    return font.getlength(s)


# ------------------------------------------------------------------------------------------------ the broadcast's dressing


def lattice(w, h, base=(0, 47, 167), step=36):
    y, x = np.mgrid[0:h, 0:w]
    img = np.zeros((h, w, 3), np.float32) + np.array(base, np.float32)
    glow = np.clip(1 - np.abs((x / max(w, 1)) - 0.5) * 1.4, 0.55, 1)[..., None]
    img *= glow
    lines = (((x + y) % step) < 2) | (((x - y) % step) < 2)
    img = np.where(lines[..., None], img * 0.82 + 255 * 0.18, img)
    return img.astype(np.uint8)


def sprite_bug(ctx):
    """"AO VIVO": the plate cut at 45° in Klein, a red dot (drawn per frame, pulsing), Branco letters."""
    f = ctx.grotesk(34)
    w = int(text_w(f, "AO VIVO")) + 88
    im = Image.new("RGBA", (w + 12, 70))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 6, 10, w, 54, (0, 0, 0, 90))
    im = im.filter(ImageFilter.GaussianBlur(4))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 4, w, 54, ctx.cores["klein"] + (255,))
    d.text((60, 11), "AO VIVO", font=f, fill=ctx.cores["branco"])
    return rgba(im), (32, 31)


def sprite_scorebug(ctx, score, clock_s, fim=False, gol=False):
    """The scorebug: EVELIN (blue) score × score HEARTS (orange), the clock under the score, in the channel's look."""
    c = ctx.cores
    name = ctx.grotesk(38)
    num = ctx.grotesk(50)
    small = ctx.grotesk(26)
    wn = 190
    w = wn * 2 + 168
    h = 72
    im = Image.new("RGBA", (w + 16, h + 50))
    sh = Image.new("RGBA", im.size)
    ctx.plate(ImageDraw.Draw(sh), 6, 8, w, h, (0, 0, 0, 120))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 0, w, h, c["klein_escuro"] + (255,))
    d.rectangle((0, 0, 9, h - 20), fill=(60, 140, 255))  # Evelin's team (blue)
    d.polygon([(w - 10, 20), (w, 20), (w, h), (w - 10, h)], fill=(255, 128, 32))  # Hearts' (orange)
    d.text(((wn - text_w(name, "EVELIN")) / 2 + 6, 13), "EVELIN", font=name, fill=c["branco"])
    d.text((w - wn + (wn - text_w(name, "HEARTS")) / 2 - 6, 13), "HEARTS", font=name, fill=c["branco"])
    d.rectangle((wn, 0, w - wn, h), fill=c["branco"])
    xw = text_w(num, "×")
    d.text((w / 2 - xw / 2 - 14 - text_w(num, str(score[0])), 4), str(score[0]), font=num, fill=c["klein"])
    d.text((w / 2 + xw / 2 + 14, 4), str(score[1]), font=num, fill=c["klein"])
    d.text((w / 2 - xw / 2, 2), "×", font=num, fill=c["klein_claro"])
    # the clock tab under the score
    tab = "GOL · EVELIN" if gol else "FIM DE JOGO" if fim else f"{clock_s // 60}:{clock_s % 60:02d}"
    tw = text_w(small, tab) + 34
    ctx.plate(d, w / 2 - tw / 2, h, tw, 38, ((255, 205, 60) if gol else c["klein"]) + (255,), cut=10)
    d.text((w / 2 - text_w(small, tab) / 2, h + 4), tab, font=small, fill=c["klein_escuro"] if gol else c["branco"])
    return rgba(im)


def sprite_gol_tab(ctx, who="EVELIN"):
    c = ctx.cores
    f = ctx.grotesk(40)
    t = f"GOL · {who}"
    w = int(text_w(f, t)) + 56
    im = Image.new("RGBA", (w + 8, 64))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 2, w, 58, (255, 205, 60, 255))
    d.text((28, 6), t, font=f, fill=c["klein_escuro"])
    return rgba(im)


def sprite_lower(ctx, role, name):
    """A lower third: the role on a small Klein plate, the name big in Branco on the dark plate."""
    c = ctx.cores
    fr, fn = ctx.grotesk(28), ctx.grotesk(52)
    wr, wn = int(text_w(fr, role)) + 40, int(text_w(fn, name)) + 64
    w = max(wr, wn) + 20
    im = Image.new("RGBA", (w + 16, 140))
    sh = Image.new("RGBA", im.size)
    ctx.plate(ImageDraw.Draw(sh), 6, 46, wn, 82, (0, 0, 0, 120))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 40, wn, 82, c["noite"] + (240,))
    d.rectangle((0, 40, 8, 122), fill=c["klein_claro"])
    d.text((32, 50), name, font=fn, fill=c["branco"])
    ctx.plate(d, 0, 0, wr, 46, c["klein"] + (255,), cut=12)
    d.text((20, 6), role, font=fr, fill=c["branco"])
    return rgba(im)


def sprite_replay(ctx):
    c = ctx.cores
    f = ctx.grotesk(34)
    w = int(text_w(f, "REPLAY")) + 76
    im = Image.new("RGBA", (w + 10, 64))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 4, w, 54, c["branco"] + (255,))
    d.polygon([(22, 18), (22, 44), (42, 31)], fill=c["klein"])
    d.text((52, 10), "REPLAY", font=f, fill=c["klein"])
    return rgba(im)


def sprite_caption_jp(ctx, words):
    """JP's line as the commentator's: Klein letters on the Branco plate, a "JP" tag on its corner."""
    c = ctx.cores
    f = ctx.grotesk(70)
    tag = ctx.grotesk(26)
    s = words.upper()
    w = int(text_w(f, s)) + 64
    im = Image.new("RGBA", (w + 20, 150))
    sh = Image.new("RGBA", im.size)
    ctx.plate(ImageDraw.Draw(sh), 6, 46, w, 96, (0, 0, 0, 120))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(7)))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 38, w, 98, c["branco"] + (250,))
    d.text((32, 50), s, font=f, fill=c["klein"])
    tw = text_w(tag, "JP · COMENTARISTA") + 30
    ctx.plate(d, 18, 10, tw, 38, c["klein"] + (255,), cut=10)
    d.text((33, 14), "JP · COMENTARISTA", font=tag, fill=c["branco"])
    return rgba(im)


def sprite_kickoff(ctx):
    """The dictionary card: KICK-OFF, its class, what it is."""
    c = ctx.cores
    big, small, tiny = ctx.grotesk(64), ctx.grotesk(34, 500), ctx.grotesk(26, 500)
    w = 640
    im = Image.new("RGBA", (w + 16, 220))
    sh = Image.new("RGBA", im.size)
    ctx.plate(ImageDraw.Draw(sh), 6, 10, w, 196, (0, 0, 0, 130))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(7)))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 0, w, 196, c["noite"] + (245,))
    d.rectangle((0, 0, w, 8), fill=c["klein_claro"])
    d.text((36, 26), "KICK-OFF", font=big, fill=c["branco"])
    d.text((36 + text_w(big, "KICK-OFF") + 18, 54), "s.m.", font=tiny, fill=c["klein_claro"])
    d.text((36, 110), "a saída de bola do", font=small, fill=c["branco"])
    d.text((36, 148), "Rocket League", font=small, fill=c["branco"])
    return rgba(im)


def sprite_resultado(ctx):
    c = ctx.cores
    f1, f2, f3 = ctx.grotesk(46), ctx.grotesk(104), ctx.grotesk(40)
    w = 760
    im = Image.new("RGBA", (w + 16, 330))
    sh = Image.new("RGBA", im.size)
    ctx.plate(ImageDraw.Draw(sh), 6, 10, w, 300, (0, 0, 0, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(im)
    ctx.plate(d, 0, 0, w, 300, c["klein_escuro"] + (248,))
    d.text((w / 2 - text_w(f1, "FIM DE JOGO") / 2, 22), "FIM DE JOGO", font=f1, fill=c["klein_claro"])
    s = "HEARTS 5 × 3 EVELIN"
    fs = f2 if text_w(f2, s) < w - 60 else ctx.grotesk(int(104 * (w - 60) / text_w(f2, s)))
    d.text((w / 2 - text_w(fs, s) / 2, 86), s, font=fs, fill=c["branco"])
    t = "HEARTS CAMPEÃO DO TORNEIO"
    tw = text_w(f3, t) + 50
    ctx.plate(d, w / 2 - tw / 2, 214, tw, 62, c["branco"] + (255,))
    d.text((w / 2 - text_w(f3, t) / 2, 222), t, font=f3, fill=c["klein"])
    return rgba(im)


def sprite_wipe(ctx, h):
    """The wipe: a Klein band with the lattice, cut at 45° on both sides (Klein claro edges), wide enough to cover the
    part it crosses for a moment, the channel's mark and "muanlartins" in its middle."""
    c = ctx.cores
    bw = ctx.W + h + 520  # wide enough to cover the whole part for a moment
    band = lattice(bw + h, h)
    a = np.zeros((h, bw + h), np.uint8)
    cv2.fillPoly(a, [np.array([[h, 0], [bw + h, 0], [bw, h], [0, h]], np.int32)], 255)
    edge = np.zeros_like(a)
    cv2.polylines(edge, [np.array([[h, 0], [0, h]], np.int32)], False, 255, 22)
    cv2.polylines(edge, [np.array([[bw + h, 0], [bw, h]], np.int32)], False, 255, 22)
    rgb = band.copy()
    rgb[edge > 0] = c["klein_claro"]
    im = Image.fromarray(np.dstack([rgb, a]))
    mark = Image.open(ctx.VIDEOS / PARTES / "marca-branca.png").convert("RGBA").resize((150, 150), Image.LANCZOS)
    f = ctx.grotesk(84)
    txt = "muanlartins"
    tw = 150 + 16 + text_w(f, txt)
    x0 = (bw + h) / 2 - tw / 2
    im.alpha_composite(mark, (int(x0), int(h / 2 - 75)))
    ImageDraw.Draw(im).text((x0 + 166, h / 2 - 58), txt, font=f, fill=c["branco"])
    return np.array(im)


def wipe(f, o, t0, y0, y1, ctx, dur=0.5):
    """The band crossing [y0, y1) from right to left, covering it whole on t0."""
    x = (o - t0) / dur + 0.5
    if not 0 <= x <= 1:
        return
    spr = S["wipe_full"] if y1 - y0 > 1100 else S["wipe_game"]
    w = spr.shape[1]
    v = 2 * x - 1
    u = 0.5 + 0.11 * v + 0.39 * v ** 3  # fast in, slow while it covers, fast out
    left = ctx.W + 40 - u * (ctx.W + w + 80)
    sub = f[y0:y1]
    if sub.shape[0] != spr.shape[0]:
        return
    over(sub, spr, left, 0)
    f[y0:y1] = sub


# ------------------------------------------------------------------------------------------------ the booth


def matte(cam):
    """The Klein virtual background's share of each pixel of the camera's half (1 = background)."""
    c = cam.astype(np.int16)
    bgk = c[..., 2] - np.maximum(c[..., 0], c[..., 1])
    a = np.clip((bgk - 40) / 70.0, 0, 1).astype(np.float32)
    # the virtual background's "muanlartins" logo (white and Klein claro, never skin)
    x0, y0, x1, y1 = 340, 125, 740, 225
    lg = c[y0:y1, x0:x1]
    logo = (lg[..., 2] > lg[..., 0] + 15) & (lg.max(axis=2) > 110)
    a[y0:y1, x0:x1] = np.maximum(a[y0:y1, x0:x1], cv2.dilate(logo.astype(np.uint8), np.ones((5, 5), np.uint8)))
    return cv2.GaussianBlur(a, (0, 0), 1.0)


def booth(cam, o):
    """The Klein swapped for the booth: him keyed (the background's blue taken out of his edges), moved down DROP px
    (his chest's foot leaves the frame), over the booth."""
    a = matte(cam)
    bg = S["cabine"]
    f = cam.astype(np.float32)
    a3 = a[..., None]
    fg = np.clip(f - a3 * np.array((0, 46, 166), np.float32), 0, None)
    over_b = fg[..., 2] - np.maximum(fg[..., 0], fg[..., 1]) - 6
    fg[..., 2] -= np.clip(over_b, 0, None) * 0.75
    alpha = 1 - a
    fg = np.roll(fg, DROP, axis=0)
    alpha = np.roll(alpha, DROP, axis=0)
    alpha[:DROP] = 0
    # fg holds colour times alpha already (the background taken out): out = fg + (1 - alpha) bg
    out = fg + (1 - alpha)[..., None] * bg
    out = np.where((alpha < 0.03)[..., None], bg, out)
    return np.clip(out, 0, 255).astype(np.uint8)


def flashing_bulbs(cam, o):
    """Camera flashes twinkling in the stadium behind the glass."""
    for x, y, t0, per in S["bulbs"]:
        ph = ((o - t0) % per) / per
        if ph < 0.06:
            k = 1 - ph / 0.06
            r = int(3 + 6 * k)
            cv2.circle(cam, (x, y), r, (255, 255, 255), -1, cv2.LINE_AA)


# ------------------------------------------------------------------------------------------------ the headset


def cam_frames(ctx, k, step=1):
    st, sp = ctx.clock.starts, ctx.clock.spans
    first, count = round(st[k] * ctx.FPS), round((sp[k][1] - sp[k][0]) * ctx.FPS)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{first / ctx.FPS:.4f}", "-i", str(ctx.work / "limpo.mp4"),
                          "-frames:v", str(count), "-vf", f"crop={ctx.W}:{ctx.CAM_H}:0:0,scale={ctx.W // 2}:{ctx.CAM_H // 2}",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, ctx.CAM_H // 2, ctx.W // 2), first


def to_half(img_1494):
    """A Câmera.mkv-sized picture (1494×840) into the camera's half (clipe.PALCO_RECORTE, 1080×840)."""
    im = cv2.resize(img_1494, (1280, 720), interpolation=cv2.INTER_AREA)
    x, y, w, h = 272, 56, 736, 572
    return cv2.resize(im[y:y + h, x:x + w], (1080, 840), interpolation=cv2.INTER_CUBIC)


def similarity(a, b):
    m, inl = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=2.0, maxIters=2000)
    return m, inl


def _sim_ok(m):
    if m is None:
        return False
    sc, rot = math.hypot(m[0, 0], m[1, 0]), math.degrees(math.atan2(m[1, 0], m[0, 0]))
    return 0.85 <= sc <= 1.22 and abs(rot) < 22


def track_stretch(ctx, k, ref_g, face_box):
    """The similarity ref → frame for every frame of stretch k (at half size) and how sure it is, cached. Each frame is
    matched against the reference itself (ORB, a ratio test, RANSAC: no drift); where that fails (hands over the
    face, motion blur), Lucas-Kanade carries the last good one; where that fails too, it holds and the headset fades."""
    cache = ctx.work / f"final-headset2-{k}-{ctx.clock.spans[k][0]:.2f}.json"
    if cache.exists():
        d = json.loads(cache.read_text())
        return np.array(d["m"]), np.array(d["c"])
    frames, _ = cam_frames(ctx, k)
    x0, y0, x1, y1 = face_box
    pad = 40
    orb = cv2.ORB_create(2000, scaleFactor=1.15, nlevels=10, fastThreshold=10)
    m0 = np.zeros_like(ref_g)
    m0[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = 255
    ka, da = orb.detectAndCompute(ref_g, m0)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    lk = dict(winSize=(21, 21), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
    box = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], np.float32)
    ms, conf = [], []
    M, prev = None, None
    for img in frames:
        good = None
        kb, db = orb.detectAndCompute(img, None)
        if db is not None and len(kb) > 10:
            pairs = bf.knnMatch(da, db, k=2)
            sel = [p[0] for p in pairs if len(p) == 2 and p[0].distance < 0.8 * p[1].distance]
            if len(sel) >= 10:
                A = np.float32([ka[q.queryIdx].pt for q in sel])
                B = np.float32([kb[q.trainIdx].pt for q in sel])
                if M is not None:  # matches near where the face was
                    pred = A @ M[:, :2].T + M[:, 2]
                    near = np.linalg.norm(pred - B, axis=1) < 60
                    A, B = A[near], B[near]
                if len(A) >= 10:
                    m, inl = cv2.estimateAffinePartial2D(A, B, method=cv2.RANSAC, ransacReprojThreshold=3.0)
                    if m is not None and inl.sum() >= 12 and _sim_ok(m):
                        good = m
        c = 1.0
        if good is None and M is not None and prev is not None:  # carried from the last frame
            pts = box @ M[:, :2].T + M[:, 2]
            mask = np.zeros_like(img)
            cv2.fillPoly(mask, [pts.astype(np.int32)], 255)
            p0 = cv2.goodFeaturesToTrack(prev, 120, 0.01, 5, mask=mask)
            if p0 is not None and len(p0) >= 10:
                p1, st, _ = cv2.calcOpticalFlowPyrLK(prev, img, p0, None, **lk)
                ok = st.ravel() == 1
                if ok.sum() >= 8:
                    dm, inl = cv2.estimateAffinePartial2D(p0.reshape(-1, 2)[ok], p1.reshape(-1, 2)[ok],
                                                          method=cv2.RANSAC, ransacReprojThreshold=2.0)
                    if dm is not None:
                        cand = (np.vstack([dm, [0, 0, 1]]) @ np.vstack([M, [0, 0, 1]]))[:2]
                        if _sim_ok(cand):
                            good, c = cand, 0.8
        if good is None:
            good, c = (M if M is not None else np.float32([[1, 0, 0], [0, 1, 0]])), 0.0
        M = good
        ms.append(M.ravel().copy())
        conf.append(c)
        prev = img
    arr = np.array(ms)
    conf = np.array(conf)
    # a 5-frame median (a bad match never lands), then a 5-frame mean
    pad2 = np.pad(arr, ((2, 2), (0, 0)), mode="edge")
    med = np.stack([np.median(pad2[i:i + 5], axis=0) for i in range(len(arr))])
    kern = np.ones(5) / 5
    sm = np.stack([np.convolve(np.pad(med[:, j], 2, mode="edge"), kern, mode="valid") for j in range(6)], 1)
    # sureness: no ORB/LK for a while fades it
    cs = np.convolve(np.pad(conf, 6, mode="edge"), np.ones(13) / 13, mode="valid")
    cache.write_text(json.dumps({"m": sm.round(5).tolist(), "c": cs.round(3).tolist()}))
    return sm, cs


def headset_layer(ctx):
    """The headset alone (RGBA, in the camera half's coordinates of the reference frame): where Gemini's edit differs
    from the frame it edited, cleaned to the parts of a headset."""
    base = cv2.cvtColor(cv2.imread(str(S["ref_path"])), cv2.COLOR_BGR2RGB)
    edit = np.array(Image.open(ctx.VIDEOS / PARTES / "eu-headset-ref.png").convert("RGB").resize((1494, 840),
                                                                                              Image.LANCZOS))
    b, e = to_half(base), to_half(edit)
    d = np.abs(b.astype(np.int16) - e.astype(np.int16)).max(axis=2)
    dark = e.max(axis=2) < 90  # the headset is black
    m = ((d > 38) & dark).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 400:
            keep[lab == i] = 1
    # the ear cups sit over his dark hair, so the difference misses them: the edit's black inside each cup's ellipse
    cups = np.zeros_like(keep)
    for (cx, cy), (ax, ay) in (((418, 525), (42, 142)), ((752, 535), (54, 138))):
        cv2.ellipse(cups, (cx, cy), (ax, ay), 0, 0, 360, 1, -1)
    keep |= (cups.astype(bool) & (e.max(axis=2) < 70)).astype(np.uint8)
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    keep = cv2.dilate(keep, np.ones((3, 3), np.uint8))
    keep[FACE_HOLE[1]:FACE_HOLE[3], FACE_HOLE[0]:FACE_HOLE[2]] = 0  # his glasses and brows, redrawn by the edit
    # the boom's arm, from the right cup's foot to the mic (too thin for the difference)
    arm = np.zeros_like(keep)
    cv2.line(arm, (742, 628), (662, 688), 1, 6, cv2.LINE_AA)
    e = e.copy()
    e[arm > 0] = (22, 22, 26)
    keep |= arm
    a = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 1.2)
    return np.dstack([e, (np.clip(a, 0, 1) * 255).astype(np.uint8)]), b


def draw_headset(cam, o, ctx):
    k, live = where(o, ctx)
    got = S["tracks"].get(k)
    if got is None:
        return
    tr, cs = got
    i = int(round((o - ctx.clock.starts[k]) * ctx.FPS))
    i = min(max(i, 0), len(tr) - 1)
    sure = float(np.clip((cs[i] - 0.25) / 0.45, 0, 1))
    if sure <= 0.01:
        return
    m = tr[i].reshape(2, 3).copy()
    # the transform was measured at half size: same rotation and scale, translation doubled
    m[:, 2] *= 2
    hs = S["headset"]
    warped = cv2.warpAffine(hs, m, (ctx.W, ctx.CAM_H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    a = warped[..., 3].astype(np.float32) / 255
    if a.max() < 0.01:
        return
    # his hands over the headband: skin where the reference had hair (above his brows)
    c = cam.astype(np.int16)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    skin = (r > 105) & (r - g > 14) & (r - b > 30) & (g > 50)
    top = cv2.warpAffine(S["band_zone"], m, (ctx.W, ctx.CAM_H), flags=cv2.INTER_NEAREST) > 0
    hand = (skin & top).astype(np.float32)
    hand = cv2.GaussianBlur(cv2.dilate(hand, np.ones((5, 5), np.uint8)), (0, 0), 2)
    a = a * (1 - np.clip(hand * 1.4, 0, 1)) * sure
    a3 = a[..., None]
    cam[:] = (cam.astype(np.float32) * (1 - a3) + warped[..., :3].astype(np.float32) * a3).astype(np.uint8)


# ------------------------------------------------------------------------------------------------ the stand


def stand_setup(ctx):
    """The live's stand (TORCIDA MUANLARTINS, 925×172 at (960, 900)), its fans cut out to jump on their own."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", "9136", "-i", str(ctx.VIDEOS / LIVE), "-frames:v", "1",
                          "-vf", "crop=926:172:960:900,format=rgb24", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    st = np.frombuffer(raw, np.uint8).reshape(172, -1, 3)[:, :925].copy()
    c = st.astype(np.int16)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    seat_light = (b > 200) & (b - r > 80)
    fanish = ((r > 45) | ((b - np.maximum(r, g)) < 55)) & ~seat_light
    rows = [((192, 348, 504, 660, 816), 2, 56, ("yevelin_", "lufe_0407", "lucca_30", "hartz_ws", "cqywo45")),
            ((35, 192, 348, 504, 660, 816), 76, 130, ("JeanFran", "JPMARTIN", "muanlartins", "leila_m_30", "o_jkxss",
                                                         "Woody_fdp"))]
    fans, hole = [], np.zeros(st.shape[:2], np.uint8)
    for xs, ya, yb, names in rows:
        for cx, name in zip(xs, names):
            xa, xb = max(0, cx - 36), min(925, cx + 38)
            m = np.zeros(st.shape[:2], np.uint8)
            m[ya:yb, xa:xb] = fanish[ya:yb, xa:xb]
            m[yb - 26:yb, xa:cx - 14] = 0  # the rank's emblem, left of the bust
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
            n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
            if n <= 1:
                continue
            i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            mm = (lab == i).astype(np.uint8)
            # holes filled, the navy outline taken in
            ff = mm.copy()
            cnts, _ = cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(ff, cnts, -1, 1, -1)
            ff = cv2.dilate(ff, np.ones((3, 3), np.uint8))
            ff[yb:, :] = 0
            ys, xs_ = np.nonzero(ff)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs_.min(), xs_.max() + 1
            spr = np.dstack([st[y0:y1, x0:x1], ff[y0:y1, x0:x1] * 255]).astype(np.uint8)
            fans.append({"spr": spr, "x": x0, "y": y0, "name": name, "base": yb})
            hole |= ff
    empty = cv2.inpaint(st, cv2.dilate(hole, np.ones((3, 3), np.uint8)), 5, cv2.INPAINT_TELEA)
    S["stand"] = (empty, fans)
    S["stand_k"] = ctx.W / 925


def draw_stand(f, o, t0, t1, star, ctx, y_base=1446):
    """The stand at the foot of the game, rising in, its fans jumping (the star of the goal highest), sliding out."""
    if not t0 - 0.05 <= o <= t1 + 0.35:
        return
    empty, fans = S["stand"]
    k = S["stand_k"]
    up = ease_out((o - t0) / 0.28) * (1 - ease_io((o - t1) / 0.32))
    if up <= 0.002:
        return
    cel = o - t0
    img = empty.copy()
    rng = S["rng_stand"]
    for j, fan in enumerate(fans):
        ph = S["fan_phase"][j]
        rate = 2.6 + (j % 3) * 0.35
        lift = 19 if fan["name"] == star else (12 if fan["base"] < 70 else 6)  # the front row stays off the names
        hop = abs(math.sin(math.pi * rate * cel + ph)) * lift * min(1, cel / 0.15)
        tilt = math.sin(2 * math.pi * 1.3 * cel + ph * 2) * 9
        spr = fan["spr"]
        h, w = spr.shape[:2]
        sq = 1 + 0.06 * math.sin(math.pi * rate * cel * 2 + ph)
        big = cv2.resize(spr, (w, max(1, int(h * sq))), interpolation=cv2.INTER_LINEAR)
        mrot = cv2.getRotationMatrix2D((w / 2, big.shape[0]), tilt, 1.0)
        big = cv2.warpAffine(big, mrot, (w, big.shape[0]), borderValue=(0, 0, 0, 0))
        over(img, big, fan["x"], fan["base"] - big.shape[0] - hop + (fan["y"] + h - fan["base"]))
    band = cv2.resize(img, (ctx.W, int(172 * k)), interpolation=cv2.INTER_CUBIC)
    shake = math.sin(o * 71) * 3 * min(1, cel / 0.2) * (1 - ease_io((o - t1) / 0.3))
    y = y_base + (1 - up) * (band.shape[0] + 230)
    # a dark fade above the stand so it sits on the picture
    yy = int(y) - 60
    if yy < 1920:
        g = np.linspace(0, 0.55, 60, dtype=np.float32)[:, None, None]
        y0c, y1c = max(840, yy), min(1920, yy + 60)
        if y1c > y0c:
            f[y0c:y1c] = (f[y0c:y1c].astype(np.float32) * (1 - g[y0c - yy:y1c - yy]) +
                          np.array((0, 20, 71), np.float32) * g[y0c - yy:y1c - yy]).astype(np.uint8)
    y0, y1 = int(y), min(1920, int(y) + band.shape[0])
    if y1 > y0:
        sub = band[: y1 - y0]
        xs = int(shake)
        f[y0:y1] = np.roll(sub, xs, axis=1)
        f[y1:1920] = (0, 20, 71) if y1 < 1920 and up > 0.98 else f[y1:1920]


# ------------------------------------------------------------------------------------------------ confetti


def confetti_plan(t0, ctx, n=170, seed=0):
    rng = np.random.default_rng(seed)
    return {"t0": t0, "x": rng.uniform(-40, ctx.W + 40, n), "y0": rng.uniform(-900, -20, n),
            "vy": rng.uniform(380, 720, n), "sway": rng.uniform(20, 70, n), "fr": rng.uniform(0.8, 2.2, n),
            "ph": rng.uniform(0, 6.3, n), "rot": rng.uniform(0, 6.3, n), "wr": rng.uniform(-9, 9, n),
            "size": rng.uniform(14, 28, n), "col": rng.integers(0, 5, n), "flip": rng.uniform(4, 11, n),
            "burst": rng.uniform(-1, 1, (n, 2))}


CONF_COLS = [(255, 255, 255), (133, 167, 255), (255, 205, 60), (0, 87, 255), (255, 128, 32)]


def draw_confetti(f, o, plan, dur=3.2):
    x = o - plan["t0"]
    if not 0 <= x <= dur:
        return
    fade = 1 - max(0.0, (x - dur + 0.5) / 0.5)
    ys = plan["y0"] + plan["vy"] * x
    xs = plan["x"] + plan["sway"] * np.sin(plan["fr"] * 2 * np.pi * x + plan["ph"])
    for i in np.nonzero((ys > -40) & (ys < f.shape[0] + 40))[0]:
        w = plan["size"][i]
        fl = math.cos(plan["flip"][i] * x + plan["ph"][i])
        h = w * 0.5 * max(0.15, abs(fl))
        a = plan["rot"][i] + plan["wr"][i] * x
        c, s = math.cos(a), math.sin(a)
        pts = np.array([[-w, -h], [w, -h], [w, h], [-w, h]], np.float32) / 2
        pts = pts @ np.array([[c, s], [-s, c]], np.float32) + (xs[i], ys[i])
        col = tuple(int(v * (0.65 + 0.35 * abs(fl)) * fade + 0 * (1 - fade)) for v in CONF_COLS[plan["col"][i]])
        cv2.fillConvexPoly(f, pts.astype(np.int32), col, lineType=cv2.LINE_AA)


# ------------------------------------------------------------------------------------------------ setup


def setup(ctx):
    W, CH = ctx.W, ctx.CAM_H
    S["ctx"] = ctx
    # the booth behind him: the Gemini picture, its pitch's centre circle painted over (a starball-like mark), framed
    cab = cv2.cvtColor(cv2.imread(str(ctx.VIDEOS / PARTES / "cabine-fundo.png")), cv2.COLOR_BGR2RGB)
    hh, ww = cab.shape[:2]
    m = np.zeros((hh, ww), np.uint8)
    cv2.ellipse(m, (int(ww * 0.5), int(hh * 0.707)), (int(ww * 0.06), int(hh * 0.03)), 0, 0, 360, 255, -1)
    cab = cv2.inpaint(cab, m, 9, cv2.INPAINT_TELEA)
    k = max(W / ww, CH / hh) * 1.12
    big = cv2.resize(cab, (int(ww * k), int(hh * k)), interpolation=cv2.INTER_CUBIC)
    x0 = (big.shape[1] - W) // 2
    y0 = int((big.shape[0] - CH) * 0.62)
    bg = big[y0:y0 + CH, x0:x0 + W].astype(np.float32)
    bg = cv2.GaussianBlur(bg, (0, 0), 1.6)  # a little out of focus, as behind a narrator
    S["cabine"] = bg * 0.92
    rng = np.random.default_rng(24)
    S["bulbs"] = [(int(rng.uniform(80, 1000)), int(rng.uniform(300, 470)), rng.uniform(0, 3), rng.uniform(1.1, 3.4))
                  for _ in range(16)]
    # the headset
    S["ref_path"] = ctx.work / "final-ref-8870.png"
    if not S["ref_path"].exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "8870", "-i",
                        str(ctx.VIDEOS / "Lives/2026-11-24/15-15-16 Câmera.mkv"), "-frames:v", "1",
                        str(S["ref_path"])], check=True)
    hs, ref = headset_layer(ctx)
    S["headset"] = hs
    ref_g = cv2.cvtColor(cv2.resize(ref, (W // 2, CH // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
    ys, xs = np.nonzero(hs[..., 3] > 60)
    # the face (glasses, brows, nose, moustache) at half size, for the tracker: inside the headset's ear cups
    fx0, fx1 = int(np.percentile(xs, 25) / 2), int(np.percentile(xs, 75) / 2)
    fy0, fy1 = int(np.percentile(ys, 20) / 2), int(np.percentile(ys, 85) / 2)
    band = np.zeros((CH, W), np.uint8)
    band[: int(np.percentile(ys, 30)), :] = 255  # the headband's part of the headset: hands may cover it
    S["band_zone"] = band
    S["tracks"] = {}
    for kk in range(len(ctx.clock.spans)):
        try:
            S["tracks"][kk] = track_stretch(ctx, kk, ref_g, (fx0, fy0, fx1, fy1))
        except Exception as e:  # a stretch the tracker can't hold: no headset there
            print(f"  headset: trecho {kk} sem rastreio ({e})")
    # the photoreal cut-ins: him (keyed) over the booth
    S["cutin"] = {}
    for name in ("grito", "senhores"):
        im = np.array(Image.open(ctx.VIDEOS / PARTES / f"eu-{name}.png").convert("RGBA"))
        im = cv2.resize(im, (1066, 600), interpolation=cv2.INTER_AREA)  # his mouth above the captions
        cols = im[..., 3][:, 390:676].max(axis=1) > 128  # his head's top, in the middle columns
        top = int(np.nonzero(cols)[0][0])
        canvas = S["cabine"].astype(np.uint8).copy()
        over(canvas, im, (W - im.shape[1]) / 2, 400 - top)
        canvas[min(CH, 400 - top + im.shape[0]):] = canvas[min(CH, 400 - top + im.shape[0]) - 1]
        S["cutin"][name] = canvas
    # the dressing
    S["bug"], S["dot"] = sprite_bug(ctx)
    S["replay"] = sprite_replay(ctx)
    S["lower_luan"] = sprite_lower(ctx, "NARRAÇÃO", "LUAN MARTINS")
    S["lower_jp"] = sprite_lower(ctx, "COMENTÁRIOS · NO DISCORD", "JP")
    S["gol_tab"] = sprite_gol_tab(ctx)
    S["kickoff"] = sprite_kickoff(ctx)
    S["resultado"] = sprite_resultado(ctx)
    S["jp"] = [(a, b, sprite_caption_jp(ctx, l1), sprite_caption_jp(ctx, l2)) for a, b, l1, l2 in JP]
    S["wipe_game"] = sprite_wipe(ctx, ctx.H - CH)
    S["wipe_full"] = sprite_wipe(ctx, ctx.H)
    S["bugs_cache"] = {}
    S["title"] = ctx.title_sprite(["VIREI NARRADOR", "NA FINAL"], 112)
    stand_setup(ctx)
    S["rng_stand"] = np.random.default_rng(3)
    S["fan_phase"] = np.random.default_rng(5).uniform(0, math.pi, 20)
    S["confetti"] = [confetti_plan(T(t0, kk, ctx), ctx, seed=i) for i, (t0, _, kk, _) in enumerate(TORCIDA)]
    # the ramps' source frames (the game's half of the clean short), read once
    S["ramps"] = []
    for knots, src, kk in RAMPS:
        a, b = min(src), max(src)
        first = int(math.floor(T(a, kk, ctx) * ctx.FPS)) - 1
        count = int(math.ceil((b - a) * ctx.FPS)) + 4
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{first / ctx.FPS:.4f}", "-i",
                              str(ctx.work / "limpo.mp4"), "-frames:v", str(count), "-vf",
                              f"crop={W}:{ctx.H - CH}:0:{CH}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                             capture_output=True, check=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, ctx.H - CH, W, 3)
        S["ramps"].append(([T(x, kk, ctx) for x in knots], [T(x, kk, ctx) for x in src], first, fr))


# ------------------------------------------------------------------------------------------------ per frame


def ramp(f, o, ctx):
    for knots, src, first, fr in S["ramps"]:
        if not knots[0] <= o <= knots[-1]:
            continue
        s = float(np.interp(o, knots, src))
        x = s * ctx.FPS - first
        i = int(math.floor(x))
        u = x - i
        i = min(max(i, 0), len(fr) - 2)
        g = fr[i].astype(np.float32) * (1 - u) + fr[i + 1].astype(np.float32) * u
        # the slow part: a push in, colour a little drained, a vignette
        slow = float(np.interp(o, [knots[1] - 0.1, knots[1] + 0.1, knots[2] - 0.15, knots[2] + 0.1], [0, 1, 1, 0]))
        if slow > 0.01:
            z = 1 + 0.12 * slow
            hh, ww = g.shape[:2]
            m = np.float32([[z, 0, (1 - z) * ww / 2], [0, z, (1 - z) * hh * 0.45]])
            g = cv2.warpAffine(g, m, (ww, hh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
            grey = g.mean(axis=2, keepdims=True)
            g = g * (1 - 0.35 * slow) + grey * 0.35 * slow
            g *= (1 - 0.45 * slow * S["vig"])[..., None]
        f[ctx.CAM_H:] = np.clip(g, 0, 255).astype(np.uint8)
        return slow
    return 0.0


def flash(part, a, color=(255, 255, 255)):
    if a > 0.003:
        part[:] = (part.astype(np.float32) * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)


def punch(part, z, cx, cy, dx=0.0, dy=0.0):
    if abs(z - 1) < 1e-3 and not dx and not dy:
        return
    m = np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])
    part[:] = cv2.warpAffine(part, m, (part.shape[1], part.shape[0]), flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_REFLECT101)


def antes(f, o, ctx):
    W, CH = ctx.W, ctx.CAM_H
    if "vig" not in S:
        y, x = np.mgrid[0:ctx.H - CH, 0:W].astype(np.float32)
        S["vig"] = np.clip(np.hypot((x - W / 2) / W, (y - (ctx.H - CH) / 2) / (ctx.H - CH)) * 1.7 - 0.35, 0, 1) ** 1.4
    k, live = where(o, ctx)
    # the game's half: slow motion
    ramp(f, o, ctx)
    # the camera's half: the booth, the headset; or the photoreal cut-in
    cam = f[:CH]
    cut = next(((a, b, n) for a, b, n, kk in CUTINS if kk == k and a <= live < b), None)
    if cut:
        a, b, n = cut
        pic = S["cutin"][n].copy()
        x = live - a
        z = 1.0 + 0.22 * math.exp(-x / 0.12) + 0.05 * x
        r = np.random.default_rng(int(o * 30))
        sh = 14 * math.exp(-x / 0.35)
        punch(pic, z, W / 2, CH * 0.45, r.uniform(-sh, sh), r.uniform(-sh, sh))
        cam[:] = pic
        flash(cam, 0.8 * math.exp(-x / 0.06))
    else:
        draw_headset(cam, o, ctx)
        cam[:] = booth(cam, o)
        flashing_bulbs(cam, o)
    # the goals: the game's own flash pushed further, a shake on everything
    for g, kk, strong in ((GOL1, 0, 1.0), (GOL1R, 0, 0.6), (GOL2, 2, 1.0), (GOL2R, 2, 0.7)):
        if kk != k:
            continue
        x = live - g
        if 0 <= x < 0.7:
            flash(f[CH:], 0.7 * strong * math.exp(-x / 0.14))
            d = 18 * strong * math.exp(-x / 0.13)
            punch(f, 1 + 0.03 * strong * math.exp(-x / 0.1) + d / 400, W / 2, ctx.H / 2,
                  d * math.sin(x * 120), d * math.cos(x * 95))
    # the build-up to the second goal: a slow push into the game
    if k == 2 and 9138.4 <= live < GOL2:
        z = 1 + 0.16 * ease_io((live - 9138.4) / (GOL2 - 9138.4))
        part = f[CH:]
        punch(part, z, W / 2, (ctx.H - CH) * 0.5)
    # "E que jogada!" and "Meu Deus!": punches on the camera (the booth already in)
    for t0, kk, z in ((9141.88, 2, 1.18), (9151.95, 2, 1.15), (8881.6, 0, 1.15)):
        x = live - t0
        if kk == k and 0 <= x < 0.75:
            zz = 1 + (z - 1) * (ease_out(x / 0.07) if x < 0.07 else 1 - ease_io((x - 0.45) / 0.3) if x > 0.45 else 1)
            punch(cam, zz, W / 2, CH * 0.42)
    return f


def scorebug(f, o, ctx, k, live):
    """[AO VIVO][scorebug] in one row over his head; on a goal the clock's tab turns "GOL · EVELIN" and the score pops."""
    score, clock_s = placar(live, k)
    fim = k == 3 and live >= FIM + 0.6
    gol = next((live - g for g, kk in ((GOL1, 0), (GOL2, 2)) if k == kk and g <= live < g + 3.0), None)
    blink = gol is not None and (gol > 0.9 or int(gol * 6) % 2 == 0)
    key = (score, clock_s, fim, blink)
    spr = S["bugs_cache"].get(key)
    if spr is None:
        spr = S["bugs_cache"][key] = sprite_scorebug(ctx, score, clock_s, fim, blink)
    bug = S["bug"]
    gap = 12
    total = bug.shape[1] + gap + spr.shape[1]
    sc = min(1.0, 768 / total)
    x0 = (ctx.W - total * sc) / 2
    pop = ease_out(o / 0.3) if o < 0.3 else 1.0
    y = S_BUG_Y - (1 - pop) * 40
    b = cv2.resize(bug, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    over(f, b, x0, y + 6 * sc, pop)
    pulse = 0.5 + 0.5 * math.cos(2 * math.pi * o / 1.2)
    cx, cy = int(x0 + S["dot"][0] * sc), int(y + (6 + S["dot"][1]) * sc)
    cv2.circle(f, (cx, cy), int(13 * sc), (90, 0, 10), -1, cv2.LINE_AA)
    cv2.circle(f, (cx, cy), int((8 + 3 * pulse) * sc), (235, 40, 40), -1, cv2.LINE_AA)
    pz = 1 + (0.12 * math.exp(-gol / 0.12) if gol is not None else 0)
    s2 = cv2.resize(spr, None, fx=sc * pz, fy=sc * pz, interpolation=cv2.INTER_AREA)
    sx = x0 + (bug.shape[1] + gap) * sc
    over(f, s2, sx - (s2.shape[1] - spr.shape[1] * sc) / 2, y - (s2.shape[0] - spr.shape[0] * sc) / 2, pop)


S_BUG_Y = 300  # the scorebug's top (the camera's half, inside the platforms' safe area)


def depois(f, o, ctx):
    W, CH = ctx.W, ctx.CAM_H
    k, live = where(o, ctx)
    # the stand, rising on the goals and the end
    for (t0, t1, kk, star), plan in zip(TORCIDA, S["confetti"]):
        if kk == k:
            draw_stand(f, o, T(t0, kk, ctx), T(t1, kk, ctx), star, ctx)
    # the replay tag
    for a, b, kk in REPLAYS:
        if kk == k and a + 0.2 <= live < b - 0.15:
            x = live - a - 0.2
            al = ease_out(x / 0.2) * (1 - ease_io((live - b + 0.35) / 0.2))
            over(f, S["replay"], W - 120 - S["replay"].shape[1] + (1 - al) * 60, CH + 84, al)
    # confetti over everything, from the goals and the end
    for (t0, t1, kk, star), plan in zip(TORCIDA, S["confetti"]):
        if kk == k:
            draw_confetti(f, o, plan)
    # the stretch changes: the channel's band over the whole frame (the stretches enter "seco"); the replays: over
    # the game's half as they start and end. Over the stand and the confetti, under the scorebug and the captions.
    for st in ctx.clock.starts[1:-1]:
        wipe(f, o, st, 0, ctx.H, ctx)
    for a, b, kk in REPLAYS:
        for t0 in (a, b):
            wipe(f, o, T(t0, kk, ctx), CH, ctx.H, ctx, 0.46)
    # the scorebug and AO VIVO
    scorebug(f, o, ctx, k, live)
    # the lower thirds
    for spr, a, b, kk in ((S["lower_luan"], 8879.1, 8884.6, 0), (S["lower_jp"], 8897.05, 8900.6, 1)):
        if kk == k and a <= live < b:
            x = live - a
            al = ease_out(x / 0.25) * (1 - ease_io((live - b + 0.3) / 0.3))
            over(f, spr, 120 - (1 - al) * 80, CH + 64, al)
    # JP's lines, the commentator's captions, on the seam
    if k == 1:
        for a, b, s1, s2 in S["jp"]:
            if a <= live < b + 0.25:
                x = live - a
                mid = a + (b - a) * 0.5
                spr = s1 if live < mid else s2
                pop = 1 + 0.08 * math.exp(-(live - (a if live < mid else mid)) / 0.06)
                centred(f, spr, W / 2, CH - 10, pop, min(1, x / 0.06) * (1 - ease_io((live - b) / 0.25)))
        if KICKOFF <= live:
            x = live - KICKOFF
            gone = 1 - ease_io((live - 8902.25) / 0.2)  # out before the stretch's wipe
            centred(f, S["kickoff"], W / 2, 1310, back(x / 0.25) * 0.9 + 0.1 * min(1, x / 0.25),
                    min(1, x / 0.1) * gone)
    # the hook's title
    if k == 0 and TITULO[0] <= live < TITULO[1] + 0.3:
        x = live - TITULO[0]
        sc = back(x / 0.22) if x < 0.22 else 1.0
        al = 1 - ease_io((live - TITULO[1]) / 0.3)
        centred(f, S["title"], W / 2, 1180, sc * (1 + 0.6 * math.exp(-x / 0.05)), al * min(1, x / 0.05))
    # the result
    if k == 3 and live >= FIM + 0.75:
        x = live - FIM - 0.75
        centred(f, S["resultado"], W / 2, 1065, back(x / 0.3), min(1, x / 0.12))
    return f


# ------------------------------------------------------------------------------------------------ sounds


def _filter(x, sr, lo=None, hi=None, order=4):
    n = len(x)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / sr)
    g = np.ones_like(fr)
    if lo:
        g /= np.sqrt(1 + (lo / np.maximum(fr, 1e-3)) ** (2 * order))
    if hi:
        g /= np.sqrt(1 + (fr / hi) ** (2 * order))
    return np.fft.irfft(X * g, n)


def _norm(x):
    return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def _load(path, sr):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    e = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, "same"))
    on = np.where(e > 0.02)[0]
    return x[max(0, on[0] - 240): on[-1] + 2400] if len(on) else x


def _reverb(x, sr, secs=1.8, wet=0.8, seed=1):
    rng = np.random.default_rng(seed)
    t = np.arange(int(secs * sr)) / sr
    ir = _filter(rng.standard_normal(len(t)) * np.exp(-t * 6.9 / secs), sr, lo=200, hi=5000)
    ir = np.concatenate([np.zeros(int(0.03 * sr)), ir])
    m = len(x) + len(ir)
    w = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[: len(x) + len(ir) // 2]
    out = np.zeros(len(w))
    out[: len(x)] += x
    return out * 0.6 + wet * w * (np.abs(x).max() / (np.abs(w).max() + 1e-9))


def crowd_voices(sr, files, starts, n_each=2, rng=None, spread=0.03, semis=2.0):
    voices = [_load(p, sr) for p in files]
    length = int((max(starts) + max(len(v) for v in voices) / sr * 1.3 + 0.5) * sr)
    dry = np.zeros(length)
    for s0 in starts:
        for i, x in enumerate(voices):
            g = 0.55 if i >= 24 else 1.0  # the last ones are women's
            for _ in range(n_each):
                r = 2 ** (rng.uniform(-semis, semis) / 12)
                y = np.interp(np.arange(0, len(x) - 1, r), np.arange(len(x)), x)
                i0 = max(0, int((s0 + rng.normal(0, spread)) * sr))
                y = y[: max(0, length - i0)]
                dry[i0:i0 + len(y)] += y * g * rng.uniform(0.55, 1.0)
    return _filter(np.tanh(1.6 * dry / (np.abs(dry).max() + 1e-9)), sr, lo=220, hi=4200)


def roar(sr, dur, seed=0, voices=None):
    """A stadium exploding: broadband crowd noise swelling and settling, whistles, the "Gooool!" of many voices."""
    rng = np.random.default_rng(seed)
    n = int(dur * sr)
    t = np.arange(n) / sr
    env = np.minimum(1, t / 0.12) * (0.65 + 0.35 * np.exp(-t / 0.8)) * np.minimum(1, (dur - t) / 0.9)
    noise = _filter(rng.standard_normal(n), sr, lo=250, hi=3200)
    am = 1 + 0.25 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t + 1)
    x = noise / np.abs(noise).max() * env * am * 0.55
    for _ in range(5):  # whistles in the stands
        t0 = rng.uniform(0.2, dur * 0.7)
        i0 = int(t0 * sr)
        d = int(rng.uniform(0.25, 0.6) * sr)
        tt = np.arange(d) / sr
        f0 = rng.uniform(2300, 3200)
        w = np.sin(2 * np.pi * np.cumsum(f0 + 120 * np.sin(2 * np.pi * 25 * tt)) / sr) * np.minimum(1, tt / 0.02) \
            * np.minimum(1, (tt[-1] - tt) / 0.05)
        x[i0:i0 + d] += 0.06 * w[: len(x) - i0]
    if voices is not None:
        v = voices[:n] if len(voices) >= n else np.pad(voices, (0, n - len(voices)))
        x += 0.75 * v / (np.abs(v).max() + 1e-9) * env
    return _norm(_reverb(x, sr, 1.6, 0.55, seed)[:n])


def chant(sr, files, starts, seed=7):
    """The stadium answering "QUE BOLA!": every voice twice per chant, claps on the two syllables, a stadium's tail."""
    rng = np.random.default_rng(seed)
    dry = crowd_voices(sr, files, starts, 2, rng)
    n = len(dry)
    claps = np.zeros(n)
    tc = np.arange(int(0.05 * sr)) / sr
    for s0 in starts:
        for beat in (0.0, 0.22):
            for _ in range(26):
                i0 = int((s0 + beat + rng.normal(0, 0.015)) * sr)
                if 0 <= i0 < n - len(tc):
                    claps[i0:i0 + len(tc)] += rng.standard_normal(len(tc)) * np.exp(-tc / rng.uniform(0.006, 0.014))
    claps = _filter(claps, sr, lo=800, hi=4500)
    claps *= 0.3 * np.abs(dry).max() / (np.abs(claps).max() + 1e-9)
    t = np.arange(n) / sr
    bed = _filter(rng.standard_normal(n), sr, lo=300, hi=2200)
    bed *= 0.25 * np.abs(dry).max() / (np.abs(bed).max() + 1e-9)
    mix = dry + claps + bed * np.minimum(1, t / 0.2)
    out = _reverb(mix, sr, 1.8, 0.8, seed)
    tail = np.minimum(1, np.maximum(0, (len(out) / sr - np.arange(len(out)) / sr)) / 0.6)
    return _norm(out * tail)


def whistle(sr, durs=(0.22, 0.22, 0.9), gap=0.16):
    """A referee's whistle (the pea's trill: two partials, a fast flutter), blown len(durs) times."""
    out = []
    rng = np.random.default_rng(9)
    for d in durs:
        t = np.arange(int(d * sr)) / sr
        flutter = 1 + 0.45 * (np.sin(2 * np.pi * 34 * t + rng.uniform(0, 6)) > 0)
        f0 = 3050 * (1 + 0.004 * np.sin(2 * np.pi * 6 * t))
        x = (np.sin(2 * np.pi * np.cumsum(f0) / sr) + 0.35 * np.sin(2 * np.pi * np.cumsum(f0 * 1.07) / sr)) * flutter
        x += 0.25 * _filter(rng.standard_normal(len(t)), sr, lo=2000, hi=7000)
        env = np.minimum(1, t / 0.015) * np.minimum(1, (d - t) / 0.04)
        out += [x * env, np.zeros(int(gap * sr))]
    return _norm(_reverb(np.concatenate(out), sr, 1.2, 0.35, 4))


def slow_down(sr, d=0.55):
    """Time slowing: a whoosh whose pitch falls, a deep "bwom" under it."""
    rng = np.random.default_rng(12)
    n = int(d * sr)
    t = np.arange(n) / sr
    from edicao import svf_bandpass
    centre = 2600 * (180 / 2600) ** (t / d)
    nz = svf_bandpass(rng.standard_normal(n).astype(np.float32), centre.astype(np.float32), 3.0)
    tone = np.sin(2 * np.pi * np.cumsum(220 * (55 / 220) ** (t / d)) / sr)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.2)
    return _norm(np.tanh((0.8 * nz / (np.abs(nz).max() + 1e-9) + 0.6 * tone) * env * 1.4))


def speed_up(sr, d=0.35):
    rng = np.random.default_rng(13)
    n = int(d * sr)
    t = np.arange(n) / sr
    from edicao import svf_bandpass
    centre = 300 * (3000 / 300) ** (t / d)
    nz = svf_bandpass(rng.standard_normal(n).astype(np.float32), centre.astype(np.float32), 3.0)
    env = np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.03)
    return _norm(nz * env)


def sting(sr):
    """The replay wipe's swish: a fast airy sweep with a bright shimmer on top."""
    rng = np.random.default_rng(14)
    d = 0.5
    n = int(d * sr)
    t = np.arange(n) / sr
    from edicao import svf_bandpass
    centre = 500 * (5000 / 500) ** np.sin(np.pi * t / d / 2) ** 2
    nz = svf_bandpass(rng.standard_normal(n).astype(np.float32), centre.astype(np.float32), 2.0)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    shim = sum(np.sin(2 * np.pi * f0 * t) for f0 in (2093, 2637, 3136)) * np.exp(-np.abs(t - d / 2) / 0.08) * 0.15
    return _norm(nz / (np.abs(nz).max() + 1e-9) * env + shim)


def sons(ctx):
    sr = ctx.SR
    folder = ctx.VIDEOS / PARTES / "coro"
    gols = sorted(folder.glob("gol*.mp3"))
    qbs = sorted(folder.glob("qb*.mp3"))
    rng = np.random.default_rng(1)
    gooool = crowd_voices(sr, gols, [0.08], 1, rng, spread=0.06)
    out = []
    t = lambda live, k: T(live, k, ctx)  # noqa: E731
    # the goals
    for g, k, dur, gain in ((GOL1, 0, 4.2, 0), (GOL2, 2, 4.0, -2), (GOL1R, 0, 2.4, -10), (GOL2R, 2, 2.4, -10)):
        out.append((t(g, k) - 0.03, roar(sr, dur, int(g), gooool), gain))
        out.append((t(g, k), "impact-boom", -6 if gain > -5 else -10))
    r = ctx.sound("riser")
    out.append((t(GOL2, 2) - len(r) / sr, r, -8))  # ending on the goal
    # "QUE BOLA!"
    for starts, k in CHANTS:
        s0 = t(starts[0], k)
        x = chant(sr, qbs, [t(s, k) - s0 for s in starts], seed=int(s0))
        # it ends with the stretch: faded over the next one's first half second
        end = ctx.clock.cut_after(s0) + 0.5 - s0
        tt = np.arange(len(x)) / sr
        x = (x * np.clip((end - tt) / 0.6, 0, 1)).astype(np.float32)
        out.append((s0, x, -4))
    # the cut-ins: a punch
    for a, b, n, k in CUTINS:
        out.append((t(a, k), "impact-boom", -12))
        out.append((t(a, k), "whoosh_curto", -14))
    # the slow motions
    for knots, src, k in RAMPS:
        out.append((t(knots[0], k), speed_up(sr, 0.4), -16))
        out.append((t(knots[1], k) - 0.05, slow_down(sr, 0.7), -10))
        out.append((t(knots[2], k) - 0.05, speed_up(sr, 0.4), -14))
    # the wipes
    for a, b, k in REPLAYS:
        for x in (a, b):
            out.append((t(x, k) - 0.25, sting(sr), -14))
    for st in ctx.clock.starts[1:]:
        out.append((st - 0.25, sting(sr), -13))
    # the kick-off: its whistle, the dictionary's ding
    out.append((t(APITO_SAIDA, 1), whistle(sr, (0.55,)), -16))
    out.append((t(KICKOFF + 0.05, 1), "ding", -11))
    # the end: the final whistle, applause, the stand
    out.append((t(FIM, 3), whistle(sr), -6))
    out.append((t(FIM + 0.7, 3), "palmas", -9))
    out.append((t(FIM + 0.7, 3), roar(sr, 3.6, 77), -10))
    return out

