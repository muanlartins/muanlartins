"""A gata me deu sorte (2026-11-20): the roteiro's cuts as they were (Luan: "os cortes ficaram excelentes"), with
the three things he asked for on top (11-20: "colocar algo angelical tipo 'OOOOOH' na gata, como se ela fosse
abençoada... mais momento de tensão no momento que eu chuto a bola... mais comemoração ou festa quando estou
segurando a gata e fazendo 'champion champion champion'"):

- the teaser (the lift, live 9008.5-9010.35): the cat blessed. The camera's Klein background keyed out (unmixed
  at the edges) for a heaven (Gemini, `Partes\\gata\\ceu.png`), god rays turning behind her, a halo riding her head
  (her head found in every frame by colour: the fur is the low-saturation part that is neither the Klein nor skin),
  a warm glow on her fur, sparkles, the game's half lit from above; a choir's "OOOOOH" (voices on an "o", formants
  per harmonic), a harp's glissando as she goes up, a bell for the halo.
- the shot (his touch at 8987.35 to the explosion at 8990.42, its first frame): the game's half pushes in on the
  ball (tracked by hand every 0.2 s), the camera's on his face, both fading to grey in a closing vignette that
  pulses with a heartbeat speeding up from 75 to 150 bpm, a riser and a snare roll climbing; 40 ms of nothing, then
  the explosion: colour back saturated, a shock ring from the ball, a crash and the crowd.
- the same lift at the end (live 9005.5-9010.35): a party. He sings "CHAM-pion" on a grid (126 bpm: syllables at
  9005.85 + k·0.4745), so the beat is his: the Klein becomes a club (Gemini, `Partes\\gata\\festa.png`) with moving
  beams and disco dots, coloured light on him, confetti cannons, a crown on her, "CHAMPION" (the channel's plate,
  flashing to Klein on each CHAM) and the Champion I emblem bouncing on each syllable, a kick, claps and hats
  under him, air horn, party horns, applause.

Everything is synthesised here (no samples) but `palmas`, the stream's public-domain applause, from the roteiro.
"""
import json
import math
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HIT, G = 8987.35, 8990.42  # his touch that sends the ball; the goal's explosion (its first frame on the live)
SYL = [9005.85, 9006.31, 9006.82, 9007.27, 9007.77, 9008.23, 9008.69, 9009.18, 9009.63, 9010.12]  # his chant
CHAM = {9005.85, 9006.82, 9007.77}  # the "CHAM" of each "CHAM-pion"
BEAT = 0.4745
KEY = np.array((0, 46, 166), np.float32)  # the camera's Klein virtual background
FACE = (590, 500)  # his face in the camera's half, sitting
# the ball (live s, x, y in the game's half), read off frames every 0.2 s
BALL = [(8987.35, 567, 456), (8987.55, 594, 411), (8987.75, 567, 417), (8987.95, 550, 424), (8988.15, 544, 433),
        (8988.35, 541, 444), (8988.55, 526, 464), (8988.75, 520, 498), (8988.95, 522, 520), (8989.15, 524, 520),
        (8989.35, 526, 513), (8989.55, 526, 511), (8989.75, 522, 508), (8989.95, 528, 506), (8990.15, 528, 512),
        (8990.42, 528, 508)]
CONFETTI = [(255, 205, 60), (255, 80, 170), (60, 220, 255), (255, 255, 255), (140, 255, 90), (170, 90, 255),
            (255, 130, 40)]
LIGHTS = [(255, 60, 200), (40, 220, 255), (255, 200, 40), (130, 255, 80)]
S = {}  # what setup builds


# ---------------------------------------------------------------------------------------------------- helpers


def where(o, ctx):
    """(stretch, live second) of short second o."""
    st, sp = ctx.clock.starts, ctx.clock.spans
    k = max(i for i in range(len(sp)) if st[i] <= o + 1e-9) if o >= 0 else 0
    return k, sp[k][0] + (o - st[k])


def short(live, k, ctx):
    return ctx.clock.out(live, k)


def screen(base, light):
    """base and light float32 0-255: a screen blend."""
    return base + light * (1 - base / 255)


def warp(part, z, cx, cy, dx=0.0, dy=0.0):
    if abs(z - 1) < 1e-3 and not dx and not dy:
        return part
    m = np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])
    return cv2.warpAffine(part, m, (part.shape[1], part.shape[0]), flags=cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REFLECT101)


def cover(path, w, h):
    im = Image.open(path).convert("RGB")
    k = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return np.asarray(im.crop((x, y, x + w, y + h)), np.float32)


def matte(cam):
    """The background's share of each pixel of the camera's half (1 = Klein): how blue it is against the Klein's
    own blueness (an edge pixel is a linear mix), and, where the reference frame shows the background, how close it
    is to it (that takes the lattice and the virtual background's logo too)."""
    c = cam.astype(np.int16)
    bgk = c[..., 2] - np.maximum(c[..., 0], c[..., 1])
    a = np.clip((bgk - 15) / 90.0, 0, 1).astype(np.float32)
    d = np.abs(c - S["ref"]).max(axis=2)
    a = np.where(S["ref_bg"], np.maximum(a, np.clip((60 - d) / 35.0, 0, 1)), a)
    return cv2.GaussianBlur(a, (0, 0), 0.8)


def fur(cam):
    """The cat: the low-saturation light part that is neither the Klein nor skin (nor the logo)."""
    c = cam.astype(np.int16)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    m = ((b - np.maximum(r, g)) < 45) & ((r - b) < 12) & (c.max(axis=2) > 75)
    m &= ~(S["logo"] & (np.abs(c - S["ref"]).max(axis=2) < 45))
    return m


def composite(cam, a, bg):
    """The Klein swapped for bg: the plate (the reference frame's background, the Klein elsewhere) taken out of the
    edge pixels (motion-blurred fur), the blue that's left on him pulled down, then bg in."""
    f = cam.astype(np.float32)
    a3 = a[..., None]
    out = np.clip(f - a3 * S["plate"], 0, None)
    over = out[..., 2] - np.maximum(out[..., 0], out[..., 1]) - 8 * (1 - a)
    out[..., 2] -= np.clip(over, 0, None) * 0.7
    out += a3 * bg
    return np.where(a3 > 0.97, bg, out)


def layers(size, parts):
    """An RGBA sprite from (colour, alpha mask 0-1) layers, straight alpha, every pixel carrying a colour (so
    scaling it never pulls black into its edges)."""
    rgb = np.zeros(size + (3,), np.float32)
    alpha = np.zeros(size, np.float32)
    rgb[:] = parts[0][0]
    for color, m in parts:
        out_a = m + alpha * (1 - m)
        rgb = (np.array(color, np.float32) * m[..., None] + rgb * (alpha * (1 - m))[..., None]) / np.maximum(
            out_a, 1e-6)[..., None]
        rgb = np.where(out_a[..., None] > 1e-6, rgb, np.array(color, np.float32))
        alpha = out_a
    return np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)


def mask(size, draw, blur=0):
    im = Image.new("L", size[::-1], 0)
    draw(ImageDraw.Draw(im))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im, np.float32) / 255


def shrink(sprite, k):
    h, w = sprite.shape[:2]
    return cv2.resize(sprite, (w // k, h // k), interpolation=cv2.INTER_AREA)


def sprite_halo(w=230):
    """A golden ring with a glow, seen a little from below."""
    k = 4
    W_, H_, pad = w * k, int(w * 0.32) * k, 40 * k
    size = (H_ + 2 * pad, W_ + 2 * pad)
    box = (pad, pad, pad + W_, pad + H_)
    inner = (box[0] + 3 * k, box[1] + 2 * k, box[2] - 3 * k, box[3] - 4 * k)
    glow = mask(size, lambda d: d.ellipse(box, outline=255, width=26 * k), 14 * k) * 0.9
    ring = mask(size, lambda d: d.ellipse(box, outline=255, width=13 * k))
    shine = mask(size, lambda d: d.ellipse(inner, outline=255, width=4 * k))
    return shrink(layers(size, [((255, 214, 110), glow), ((255, 190, 50), ring), ((255, 250, 215), shine)]), k)


def sprite_star(size=64):
    """A four-pointed twinkle: a white core, gold glow."""
    k = 4
    s = size * k
    c, R, r = s / 2, s * 0.48, s * 0.07
    pts = [(c + (R if i % 2 == 0 else r) * math.cos(i * math.pi / 4 - math.pi / 2),
            c + (R if i % 2 == 0 else r) * math.sin(i * math.pi / 4 - math.pi / 2)) for i in range(8)]
    glow = mask((s, s), lambda d: d.polygon(pts, fill=255), 6 * k)
    core = mask((s, s), lambda d: (d.polygon(pts, fill=255), d.ellipse((c - 5 * k, c - 5 * k, c + 5 * k, c + 5 * k),
                                                                        fill=255)))
    return shrink(layers((s, s), [((255, 205, 80), glow), ((255, 255, 242), core)]), k)


def sprite_crown(w=170):
    """A gold crown, three points with pearls, a ruby and two sapphires on its band, a dark edge and a glow."""
    k = 4
    W_, H_, pad = w * k, int(w * 0.62) * k, 26 * k
    size = (H_ + 2 * pad, W_ + 2 * pad)
    P = lambda x, y: (pad + x * W_, pad + y * H_)
    body = [P(0, 1), P(0, 0.34), P(0.2, 0.62), P(0.33, 0.12), P(0.5, 0.56), P(0.67, 0.12), P(0.8, 0.62), P(1, 0.34),
            P(1, 1)]
    tips = [P(0, 0.34), P(0.33, 0.12), P(0.67, 0.12), P(1, 0.34)]
    r = 0.075 * W_ / 2 + 4 * k

    def pearls(d):
        for x, y in tips:
            d.ellipse((x - r, y - r, x + r, y + r), fill=255)
    glow = mask(size, lambda d: (d.polygon(body, fill=255), pearls(d)), 12 * k) * 0.8
    edge = mask(size, lambda d: (d.polygon(body, fill=255, outline=255, width=7 * k), pearls(d)))
    edge = cv2.dilate(edge, np.ones((5 * k, 5 * k), np.uint8))
    fill = mask(size, lambda d: d.polygon(body, fill=255))
    band = mask(size, lambda d: d.rectangle((*P(0, 0.72), *P(1, 1)), fill=255)) * fill
    shine = mask(size, lambda d: d.line([P(0.06, 0.8), P(0.94, 0.8)], fill=255, width=3 * k), 2 * k) * 0.7
    gems = []
    for x, color in ((0.5, (225, 30, 60)), (0.22, (40, 120, 255)), (0.78, (40, 120, 255))):
        cx, cy = P(x, 0.86)
        rr = (0.09 if x == 0.5 else 0.065) * H_
        gems.append((color, mask(size, lambda d, cx=cx, cy=cy, rr=rr: d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr),
                                                                                 fill=255))))
    pearl = mask(size, pearls)
    spark = mask(size, lambda d: [d.ellipse((x - r * 0.35 - r * 0.3, y - r * 0.35 - r * 0.3, x - r * 0.3 + r * 0.05,
                                             y - r * 0.3 + r * 0.05), fill=255) for x, y in tips])
    parts = [((255, 200, 70), glow), ((90, 45, 0), edge), ((255, 196, 40), fill), ((222, 140, 20), band),
             ((255, 240, 170), shine)] + gems + [((255, 248, 225), pearl), ((255, 255, 255), spark)]
    return shrink(layers(size, parts), k)


def sprite_champion(ctx, inverted=False, text="CHAMPION", size=118):
    """The chant's word in the channel's look (11-21, as the titles' second line): Space Grotesk Bold capitals,
    Klein on the Branco plate cut at 45°, a soft shadow; `inverted` (Branco on Klein, the flash of each CHAM)."""
    c = ctx.cores
    f = ctx.grotesk(size)
    l, t, r, b = f.getbbox(text)
    px, py, m = 40, int(size * 0.2), 40
    w, h = (r - l) + 2 * px, (b - t) + 2 * py
    img = Image.new("RGBA", (w + 2 * m, h + 2 * m))
    shadow = Image.new("RGBA", img.size)
    ctx.plate(ImageDraw.Draw(shadow), m + 6, m + 10, w, h, (0, 0, 0, 160))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(img)
    plate_c, text_c = (c["klein"], c["branco"]) if inverted else (c["branco"], c["klein"])
    ctx.plate(d, m, m, w, h, plate_c + (255,))
    d.text((m + px - l, m + py - t), text, font=f, fill=text_c)
    return np.asarray(img).copy()


def place_rot(frame, sprite, cx, cy, scale, alpha, angle=0.0):
    """ctx.place with a rotation (degrees)."""
    if angle:
        h, w = sprite.shape[:2]
        d = int(math.hypot(w, h)) + 4
        big = np.zeros((d, d, 4), np.uint8)
        big[(d - h) // 2:(d - h) // 2 + h, (d - w) // 2:(d - w) // 2 + w] = sprite
        m = cv2.getRotationMatrix2D((d / 2, d / 2), angle, 1.0)
        sprite = cv2.warpAffine(big, m, (d, d), flags=cv2.INTER_LINEAR)
    S["place"](frame, sprite, cx, cy, scale, alpha)


def env_syl(live):
    """The chant's pulse: each syllable a hit decaying (the CHAMs full, the rest 60%)."""
    v = 0.0
    for s in SYL:
        if s <= live:
            v = max(v, (1.0 if s in CHAM else 0.6) * math.exp(-(live - s) / 0.11))
    return v


def last_syl(live):
    past = [s for s in SYL if s <= live]
    return (past[-1], SYL.index(past[-1])) if past else (None, -1)


def heartbeats():
    """(lub second, interval) from just before his touch to just before the goal, 75 → 150 bpm."""
    out, t = [], HIT - 0.12
    while t < G - 0.3:
        p = (t - HIT) / (G - HIT)
        i = 0.8 - 0.4 * min(1, max(0, p)) ** 0.8
        out.append((t, i))
        t += i
    return out


def hb_env(live):
    v = 0.0
    for t, i in S["beats"]:
        gap = 0.26 * (i / 0.8) ** 0.6
        for at, w in ((t, 1.0), (t + gap, 0.7)):
            if at <= live:
                v = max(v, w * math.exp(-(live - at) / 0.08))
    return v


def ball(live):
    ts = [b[0] for b in BALL]
    return float(np.interp(live, ts, [b[1] for b in BALL])), float(np.interp(live, ts, [b[2] for b in BALL]))


# ---------------------------------------------------------------------------------------------------- setup


def frames_of(path, first, count, ctx, rows=None):
    """Frames [first, first+count) of the clean short (limpo.mp4), RGB, only `rows` of them."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf",
                          f"select=between(n\\,{first}\\,{first + count - 1})", "-vsync", "0", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    out = np.frombuffer(raw, np.uint8).reshape(-1, ctx.H, ctx.W, 3)
    return out[:, rows[0]:rows[1]] if rows else out


def track(ctx):
    """Her head in every frame of the closing stretch (the teaser replays its seconds): the top of the fur's biggest
    blob and the middle of its top 110 px, smoothed over ±3 frames. Cached by the stretch's frames."""
    st, sp = ctx.clock.starts, ctx.clock.spans
    first, count = round(st[2] * ctx.FPS), round((sp[2][1] - sp[2][0]) * ctx.FPS)
    cache = ctx.work / f"gata-gato-{first}-{count}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    cams = frames_of(ctx.work / "limpo.mp4", first, count, ctx, (0, ctx.CAM_H))
    raw = []
    for cam in cams:
        m = fur(cam).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
        if n <= 1:
            raw.append(raw[-1] if raw else [540, 200, 400, 700])
            continue
        i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        ys, xs = np.nonzero(lab == i)
        top = float(np.percentile(ys, 1))
        near = ys < top + 110
        raw.append([float(xs[near].mean()), top, float(np.percentile(xs, 3)), float(np.percentile(xs, 97))])
    raw = np.array(raw)
    k = np.exp(-0.5 * (np.arange(-3, 4) / 1.5) ** 2)
    k /= k.sum()
    smooth = np.stack([np.convolve(np.pad(raw[:, j], 3, mode="edge"), k, mode="valid") for j in range(4)], axis=1)
    out = {"live0": sp[2][0], "rows": smooth.round(1).tolist()}
    cache.write_text(json.dumps(out))
    return out


def head(live):
    t = S["track"]
    rows = t["rows"]
    x = (live - t["live0"]) * 60
    i = int(min(max(0, math.floor(x)), len(rows) - 2))
    u = min(max(x - i, 0), 1)
    return [a + (b - a) * u for a, b in zip(rows[i], rows[i + 1])]


def setup(ctx):
    S["place"] = ctx.place
    st, sp = ctx.clock.starts, ctx.clock.spans
    partes = ctx.VIDEOS / "Shorts" / "Partes" / "gata"
    # the logo on the virtual background, from a frame where he sits still and nothing covers it
    ref = frames_of(ctx.work / "limpo.mp4", round(short(8987.0, 1, ctx) * ctx.FPS), 1, ctx, (0, ctx.CAM_H))[0]
    c = ref.astype(np.int16)
    logo = np.zeros(c.shape[:2], bool)
    logo[170:265, 285:630] = (c[..., 2] - np.maximum(c[..., 0], c[..., 1]))[170:265, 285:630] < 100
    S["logo"] = cv2.dilate(logo.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    S["ref"] = c
    S["ref_bg"] = cv2.erode(((c[..., 2] - np.maximum(c[..., 0], c[..., 1])) > 80).astype(np.uint8),
                            np.ones((9, 9), np.uint8)) > 0
    S["ref_bg"] |= S["logo"]
    S["plate"] = np.where(S["ref_bg"][..., None], c.astype(np.float32), KEY)
    S["track"] = track(ctx)
    S["ceu"] = cover(partes / "ceu.png", ctx.W, ctx.CAM_H)
    S["festa"] = cover(partes / "festa.png", ctx.W, ctx.CAM_H)
    S["halo"] = sprite_halo()
    S["star"] = sprite_star(72)
    S["word"] = sprite_champion(ctx)
    S["word_inv"] = sprite_champion(ctx, inverted=True)
    S["crown"] = sprite_crown()
    emb = Image.open(ctx.ROOT / "brand" / "youtube" / "thumbnails" / "ranks" / "champion.png").convert("RGBA")
    emb = emb.resize((round(emb.width * 250 / emb.height), 250), Image.LANCZOS)
    S["emblem"] = np.asarray(emb).copy()
    # a sunburst behind the emblem
    n = 440
    yy, xx = np.mgrid[0:n, 0:n] - n / 2
    ang, rad = np.arctan2(yy, xx), np.hypot(xx, yy) / (n / 2)
    rays = (0.5 + 0.5 * np.cos(12 * ang)) ** 3 * np.clip(1 - rad, 0, 1) ** 1.5
    glow = np.exp(-(rad / 0.45) ** 2)
    a = np.clip(rays * 0.75 + glow * 0.6, 0, 1)
    S["burst"] = np.dstack([np.full((n, n), 255), np.full((n, n), 214), np.full((n, n), 90),
                            (a * 255)]).astype(np.uint8)
    S["beats"] = heartbeats()
    S["grid"] = np.mgrid[0:ctx.CAM_H // 4, 0:ctx.W // 4].astype(np.float32) * 4 + 2  # (y, x), quarter size
    gy, gx = np.mgrid[0:ctx.CAM_H, 0:ctx.W].astype(np.float32)
    S["vig_cam"] = np.clip((np.hypot((gx - FACE[0]) / 640, (gy - FACE[1]) / 560) - 0.35) / 0.75, 0, 1) ** 1.5
    gy, gx = np.mgrid[0:ctx.H - ctx.CAM_H, 0:ctx.W].astype(np.float32)
    S["vig_game"] = np.clip((np.hypot((gx - 528) / 640, (gy - 508) / 640) - 0.3) / 0.75, 0, 1) ** 1.5
    S["sky"] = (np.exp(-gy / 260) * 0.36).astype(np.float32)[..., None] * np.array((255, 222, 150), np.float32)

    rng = np.random.default_rng(20)
    # the teaser's sparkles: (birth, life, x, y, size, spin), born around her head, more as she goes up
    stars, t = [], 0.0
    while t < sp[0][1] - sp[0][0]:
        rate = 16 if t < 0.75 else 55 if t < 1.3 else 24
        t += rng.exponential(1 / rate)
        hx, top, x0, x1 = head(sp[0][0] + t)
        stars.append((t, rng.uniform(0.3, 0.6), rng.uniform(x0 - 60, x1 + 60), rng.uniform(top - 70, top + 260),
                      rng.uniform(26, 66), rng.uniform(-200, 200)))
    S["stars"] = stars
    # the party's confetti: simulated once, every particle's place, angle and flip per frame of the stretch
    o0, n_f = st[2], round((sp[2][1] - sp[2][0]) * ctx.FPS)
    parts = []
    for at, count, power in ((9005.85, 120, 1.0), (9007.77, 70, 0.85)):
        for side in (0, 1):
            for _ in range(count):
                th = math.radians(rng.uniform(58, 86))
                v = rng.uniform(2300, 3700) * power
                vx, vy = v * math.cos(th) * (1 if side == 0 else -1), -v * math.sin(th)
                parts.append([at, -10 if side == 0 else ctx.W + 10, ctx.CAM_H + rng.uniform(-30, 40), vx, vy])
    t = 9006.0
    while t < sp[2][1]:
        t += rng.exponential(1 / 22)
        parts.append([t, rng.uniform(0, ctx.W), -30, rng.uniform(-40, 40), rng.uniform(120, 260)])
    P = len(parts)
    born = np.array([p[0] for p in parts])
    pos = np.array([[p[1], p[2]] for p in parts], np.float64)
    vel = np.array([[p[3], p[4]] for p in parts], np.float64)
    drag = rng.uniform(2.6, 5.0, P)
    sway = rng.uniform(40, 120, P)
    sway_w = rng.uniform(3, 7, P)
    phase = rng.uniform(0, 2 * math.pi, P)
    spin = rng.uniform(-9, 9, P)
    flip = rng.uniform(5, 13, P)
    size = rng.uniform(11, 20, P)
    color = rng.integers(0, len(CONFETTI), P)
    states = []
    dt = 1 / ctx.FPS
    for j in range(n_f):
        live = sp[2][0] + j / ctx.FPS
        alive = born <= live
        age = np.maximum(0, live - born)
        vel[alive, 1] += 1100 * dt
        vel[alive] *= np.exp(-drag[alive] * dt)[:, None]
        pos[alive] += vel[alive] * dt
        sx = sway * np.sin(sway_w * age + phase) * np.clip(age * 2, 0, 1)
        states.append((alive.copy(), (pos[:, 0] + sx).copy(), pos[:, 1].copy(), spin * age + phase,
                       np.abs(np.cos(flip * age + phase))))
    S["confetti"] = (states, size, color, o0)


# ---------------------------------------------------------------------------------------------------- the frames


def transition(f, o, cut, ctx, strength=1.0):
    """destaque.py's "zoom" entrance, done here after the background is swapped (the camera's logo has to stay
    where the matte expects it)."""
    x = o - cut
    if not -0.12 <= x < 0.2:
        return f
    u = ((x + 0.12) / 0.12) ** 2 if x < 0 else (1 - x / 0.2) ** 2
    z = 1 + 0.2 * u
    f[:] = warp(f, z, ctx.W / 2, ctx.H / 2)
    k = 1 + int(24 * u)
    if k > 1:
        f[:] = cv2.blur(f, (k, k))
    a = min(1.0, 0.55 * strength) * math.exp(-abs(x) / (0.05 * strength))
    f[:] = (f.astype(np.float32) * (1 - a) + 255 * a).astype(np.uint8)
    return f


def teaser(f, o, live, ctx):
    H2 = ctx.CAM_H
    cam = f[:H2]
    hx, top, x0, x1 = head(live)
    hy = max(56.0, top - 36)
    lift = min(1.0, max(0.0, (o - 0.72) / 0.35))
    power = 0.55 + 0.45 * lift + 0.06 * math.sin(o * 9)
    # heaven, drifting in on its sun, with rays turning about her head
    bg = warp(S["ceu"], 1.03 + 0.05 * o / 1.85, 540, 270)
    gy, gx = S["grid"]
    ang = np.arctan2(gy - hy, gx - hx)
    rad = np.hypot(gx - hx, gy - hy)
    rays = (0.5 + 0.5 * np.cos(16 * ang + 0.9 * o)) ** 8 * 0.8 + (0.5 + 0.5 * np.cos(11 * ang - 0.7 * o + 1)) ** 10 * 0.6
    light = power * (rays * np.exp(-rad / 650) * (1 - np.exp(-rad / 50)) + 0.9 * np.exp(-(rad / 240) ** 2))
    light = cv2.resize(light.astype(np.float32), (ctx.W, H2), interpolation=cv2.INTER_LINEAR)
    bg = screen(bg, np.clip(light, 0, 1)[..., None] * np.array((255, 246, 222), np.float32))
    a = matte(cam)
    out = composite(cam, a, bg)
    # her fur glowing, and a dreamy bloom on the whole half
    m = fur(cam).astype(np.float32)
    small = cv2.resize(m, (ctx.W // 4, H2 // 4), interpolation=cv2.INTER_AREA)
    glow = cv2.resize(cv2.GaussianBlur(small, (0, 0), 7), (ctx.W, H2), interpolation=cv2.INTER_LINEAR)
    out = screen(out, (glow * (0.55 + 0.35 * lift))[..., None] * np.array((255, 232, 180), np.float32))
    out += m[..., None] * 0.10 * (255 - out)
    bright = np.clip(out - 170, 0, None)
    bright = cv2.resize(cv2.GaussianBlur(cv2.resize(bright, (ctx.W // 4, H2 // 4)), (0, 0), 5), (ctx.W, H2))
    out = screen(out, bright * 0.7)
    f[:H2] = np.clip(out, 0, 255).astype(np.uint8)
    # the halo, popping in at once and riding her head, tilting with her swing
    hx2, _, _, _ = head(live + 1 / 60)
    tilt = max(-14.0, min(14.0, -(hx2 - hx) * 0.8))
    x = o
    pop = 1.0 if x > 0.22 else 0.4 + 0.6 * ctx.ease(x / 0.16) + 0.12 * math.sin(min(1, x / 0.22) * math.pi)
    bob = 5 * math.sin(o * 7)
    place_rot(f, S["halo"], hx, hy + bob, pop * (1 + 0.04 * math.sin(o * 11)), 1.0, tilt)
    # sparkles where they were born
    for born, life, sx, sy, size, spin in S["stars"]:
        age = o - born
        if 0 <= age < life:
            k = math.sin(math.pi * age / life)
            place_rot(f, S["star"], sx, sy - 40 * age, size / 72 * (0.3 + 0.7 * k), min(1, 1.6 * k), spin * age)
    # the game's half lit from above
    game = f[H2:].astype(np.float32)
    f[H2:] = np.clip(screen(game, S["sky"] * (0.7 + 0.3 * lift)), 0, 255).astype(np.uint8)


def tension(f, o, live, ctx):
    H2 = ctx.CAM_H
    hb = hb_env(live)
    if live < G:
        p = min(1.0, max(0.0, (live - HIT) / (G - HIT)))
        zg = (1 + 0.75 * p ** 2) * (1 + 0.012 * hb)
        zc = (1 + 0.22 * p ** 1.6) * (1 + 0.012 * hb)
        bx, by = ball(live)
        f[H2:] = warp(f[H2:], zg, bx, by)
        f[:H2] = warp(f[:H2], zc, *FACE)
        x = f.astype(np.float32)
        gray = (x @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
        d = 0.85 * p ** 0.9
        x = x * (1 - d) + gray * d
        x = (x - 128) * (1 + 0.15 * p) + 128 - 12 * p
        v = 0.35 + 0.45 * p + 0.25 * hb
        for y0, y1, vig in ((0, H2, S["vig_cam"]), (H2, ctx.H, S["vig_game"])):
            part = x[y0:y1]
            part *= (1 - np.clip(v * vig, 0, 0.92))[..., None]
            part[..., 0] += 70 * hb * p * vig
        f[:] = np.clip(x, 0, 255).astype(np.uint8)
    else:
        e = live - G
        if e > 0.9:
            return
        x = f.astype(np.float32)
        gray = (x @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
        x = gray + (x - gray) * (1 + 0.5 * math.exp(-e / 0.35)) + 14 * math.exp(-e / 0.2)
        # the shock ring from the ball, on the game's half
        if e < 0.5:
            ring = np.zeros((ctx.H - H2, ctx.W), np.float32)
            bx, by = ball(G)
            r = int(30 + 1300 * (e / 0.5) ** 0.6)
            cv2.circle(ring, (int(bx), int(by)), r, 1.0, max(3, int(22 * (1 - e / 0.5))), lineType=cv2.LINE_AA)
            ring = cv2.GaussianBlur(ring, (0, 0), 3)
            x[H2:] = screen(x[H2:], ring[..., None] * 255 * 0.9 * (1 - e / 0.5) ** 2)
        f[:] = np.clip(x, 0, 255).astype(np.uint8)


def party(f, o, live, ctx):
    H2 = ctx.CAM_H
    cam = f[:H2]
    b = env_syl(live)
    s, k = last_syl(live)
    on = live >= SYL[0]
    beat_i = max(0, k)
    # the club: the picture pulsing, beams sweeping in the beat's colours, disco dots crossing it
    bg = S["festa"] * (0.62 + (0.5 * b if on else 0.0))
    gy, gx = S["grid"]
    light = np.zeros(gy.shape + (3,), np.float32)
    for i, ox in enumerate((140, 400, 680, 940)):
        aim = math.radians(90 + (1 if i % 2 else -1) * (18 + 26 * math.sin(1.9 * live + i * 1.7)))
        ang = np.arctan2(gy + 40, gx - ox)
        beam = np.exp(-((ang - aim) / 0.075) ** 2) * np.clip(1 - np.hypot(gx - ox, gy + 40) / 1300, 0, 1)
        col = np.array(LIGHTS[(i + beat_i) % 4], np.float32) / 255
        light += beam[..., None] * col * (0.55 + 0.45 * b)
    light = cv2.resize(light, (ctx.W, H2), interpolation=cv2.INTER_LINEAR)
    bg = screen(bg, np.clip(light, 0, 1) * 255)
    dots = np.zeros((H2 // 2, ctx.W // 2), np.float32)
    rng = np.random.default_rng(5)
    for _ in range(46):
        y, x0, v = rng.uniform(0, H2 / 2), rng.uniform(0, ctx.W / 2), rng.uniform(40, 110)
        cv2.circle(dots, (int((x0 + v * (live - 9005)) % (ctx.W / 2)), int(y)), 3, 1.0, -1, lineType=cv2.LINE_AA)
    dots = cv2.resize(cv2.GaussianBlur(dots, (0, 0), 1.5), (ctx.W, H2))
    bg = screen(bg, dots[..., None] * np.array((255, 250, 235), np.float32) * 0.9)
    if on and s in CHAM:  # a strobe on each CHAM
        bg = screen(bg, np.full_like(bg, 255) * 0.45 * math.exp(-(live - s) / 0.07))
    a = matte(cam)
    out = composite(cam, a, bg)
    # the lights on him and the cat
    if on:
        tint = np.array(LIGHTS[beat_i % 4], np.float32) / 255
        fg = (1 - a)[..., None]
        out = out * (1 - 0.2 * fg) + out * tint * 1.25 * 0.2 * fg
    f[:H2] = np.clip(out, 0, 255).astype(np.uint8)
    # a slow push and a bump on each syllable
    z = 1 + 0.07 * (live - 9005.5) / 4.85 + 0.03 * b
    f[:H2] = warp(f[:H2], z, 540, 430)
    if on:
        game = f[H2:].astype(np.float32)
        f[H2:] = np.clip(game * (1 + 0.12 * b), 0, 255).astype(np.uint8)


def antes(f, o, ctx):
    st = ctx.clock.starts
    k, live = where(o, ctx)
    if k == 0:
        teaser(f, o, live, ctx)
    elif k == 1 and HIT - 0.2 <= live <= G + 0.95:
        tension(f, o, live, ctx)
    elif k == 2:
        party(f, o, live, ctx)
    transition(f, o, st[1], ctx)
    transition(f, o, st[2], ctx, 1.4)
    return f


def draw_confetti(f, j, every=1):
    states, size, color, _ = S["confetti"]
    if not 0 <= j < len(states):
        return
    alive, xs, ys, rot, fl = states[j]
    idx = np.nonzero(alive & (ys > -40) & (ys < f.shape[0] + 40))[0][::every]
    for i in idx:
        w, h = size[i], size[i] * 0.55 * max(0.15, fl[i])
        c, s_ = math.cos(rot[i]), math.sin(rot[i])
        pts = np.array([[-w, -h], [w, -h], [w, h], [-w, h]], np.float32) / 2
        pts = pts @ np.array([[c, s_], [-s_, c]], np.float32) + (xs[i], ys[i])
        shade = 0.6 + 0.4 * fl[i]
        col = tuple(int(v * shade) for v in CONFETTI[color[i]])
        cv2.fillConvexPoly(f, pts.astype(np.int32), col, lineType=cv2.LINE_AA)


def depois(f, o, ctx):
    k, live = where(o, ctx)
    if k != 2:
        return f
    states, _, _, o0 = S["confetti"]
    j = round((o - o0) * ctx.FPS)
    draw_confetti(f, j)
    if live >= SYL[0]:
        x = live - SYL[0]
        pop = 1.0 if x > 0.3 else 0.2 + 0.8 * ctx.ease(x / 0.18) + 0.15 * math.sin(min(1, x / 0.3) * math.pi)
        b = env_syl(live)
        place_rot(f, S["burst"], 540, 1000, pop * (1.05 + 0.12 * b), 0.85, -40 * x)
        place_rot(f, S["emblem"], 540, 1000, pop * (1 + 0.1 * b), 1.0, 0)
        s, i = last_syl(live)
        e = live - s
        strong = s in CHAM
        amp = 0.34 if strong else 0.14
        scale = 1 + amp * math.exp(-e / 0.09) * math.cos(2 * math.pi * e / 0.24)
        tilt = (5 if i % 2 else -5) * math.exp(-e / 0.16) * (0.5 if strong else 1)
        lift = -34 * math.exp(-e / 0.08) * (1 if strong else 0.5)
        word = S["word_inv"] if strong and e < 0.13 else S["word"]  # each CHAM flashes the plate to Klein
        place_rot(f, word, 540, 1222 + lift, pop * scale, 1.0, tilt)
    if live >= SYL[0]:  # the champion's crown on her head
        hx, top, _, _ = head(live)
        hx2, _, _, _ = head(live + 1 / 60)
        tilt = max(-16.0, min(16.0, -(hx2 - hx) * 0.8))
        x = live - SYL[0]
        pop = 1.0 if x > 0.25 else 0.3 + 0.7 * ctx.ease(x / 0.15) + 0.15 * math.sin(min(1, x / 0.25) * math.pi)
        z = 1 + 0.07 * (live - 9005.5) / 4.85 + 0.03 * env_syl(live)  # the camera's push (party)
        cx, cy = 540 + (hx - 540) * z, 430 + (top - 430) * z
        h = S["crown"].shape[0]
        place_rot(f, S["crown"], cx, max(h * 0.45, cy - h * 0.32) - 6 * env_syl(live), pop * z, 1.0, tilt)
    draw_confetti(f, j, every=5)  # a few in front of the words
    return f


# ---------------------------------------------------------------------------------------------------- the sound

SR = 48000
RNG = np.random.default_rng(31)


def t_(d):
    return np.arange(int(d * SR)) / SR


def norm(x):
    return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def band(x, lo, hi):
    """A brick-ish FFT band-pass with soft edges."""
    n = len(x)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(fr)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(fr, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (fr / hi) ** 4)
    return np.fft.irfft(X * m, n).astype(np.float32)


def sweep(x, f0, f1, q=4.0, hop=256):
    """Noise through a band-pass gliding from f0 to f1 (an STFT mask per hop)."""
    n, w = len(x), 1024
    win = np.hanning(w).astype(np.float32)
    out = np.zeros(n + w, np.float32)
    norm_ = np.zeros(n + w, np.float32)
    fr = np.fft.rfftfreq(w, 1 / SR)
    xp = np.pad(x, (0, w))
    for i in range(0, n, hop):
        fc = f0 * (f1 / f0) ** (i / n)
        spec = np.fft.rfft(xp[i:i + w] * win)
        m = np.exp(-0.5 * (np.log2(np.maximum(fr, 1) / fc) * q) ** 2)
        out[i:i + w] += np.fft.irfft(spec * m, w).astype(np.float32) * win
        norm_[i:i + w] += win ** 2
    return out[:n] / np.maximum(norm_[:n], 1e-3)


def reverb(x, seconds=2.2, wet=0.35, damp=5000):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = RNG.standard_normal(n).astype(np.float32) * np.exp(-t * 6.9 / seconds)
    ir = band(ir, 200, damp)
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum()) + 1e-9
    m = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:m].astype(np.float32)
    dry = np.pad(x, (0, n))
    y *= np.abs(dry).max() / (np.abs(y).max() + 1e-9)
    return (dry * (1 - wet) + y * wet).astype(np.float32)


def voice(f0, t, formants, vib_rate, vib_seed, scoop=0.12, harmonics=5000):
    """One singer: a glottal tone (harmonics 1/k^1.1) shaped by formants per harmonic, a scoop up into the note and a
    vibrato that grows in."""
    rng = np.random.default_rng(vib_seed)
    vib = 1 + 0.007 * np.minimum(1, t / 0.5) * np.sin(2 * np.pi * vib_rate * t + rng.uniform(0, 6.28))
    pitch = f0 * vib * 2 ** (-0.4 / 12 * np.exp(-t / scoop)) * (1 + 0.002 * np.sin(2 * np.pi * 0.7 * t))
    ph = 2 * np.pi * np.cumsum(pitch) / SR + rng.uniform(0, 6.28)
    out = np.zeros_like(t)
    for k in range(1, int(harmonics / f0) + 1):
        fk = k * f0
        h = sum(a / (1 + ((fk - F) / (bw / 2)) ** 2) for F, bw, a in formants) + 0.02
        out += h / k ** 1.1 * np.sin(k * ph)
    return out


def choir(d=2.4):
    """"OOOOOH": a choir on an "o", D major from D3 to A5, three singers a note, a swell into the lift."""
    t = t_(d)
    oh = [(500, 120, 1.0), (950, 160, 0.7), (2900, 320, 0.3), (3400, 400, 0.15)]
    notes = [220.0, 293.66, 369.99, 440.0, 587.33, 739.99, 880.0, 1174.66]
    x = np.zeros_like(t)
    seed = 0
    for f0 in notes:
        for s in range(3):
            seed += 1
            g = 0.45 if f0 < 300 else 0.75 if f0 < 500 else 1.0
            x += g * voice(f0 * 2 ** ((s - 1) * 0.07 / 12), t, oh, 5.0 + 0.35 * s, seed)
    breath = band(RNG.standard_normal(len(t)).astype(np.float32), 350, 1200) * 0.6
    x = norm(x) + norm(breath) * 0.04
    swell = np.minimum(1, t / 0.3) * (0.62 + 0.38 * np.clip((t - 0.72) / 0.4, 0, 1)) * np.minimum(1, (d - t) / 0.55)
    return fade(norm(reverb(norm(x * swell), 1.5, 0.38)), 2.3, 2.9)


def fade(x, a, b):
    """Silent from b (s), fading from a: the teaser's sounds gone under his first words after the cut."""
    x = x[: int(b * SR)].copy()
    n = np.arange(len(x)) / SR
    return (x * np.clip((b - n) / (b - a), 0, 1)).astype(np.float32)


def harp(notes=(587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98, 1760.0, 1975.53, 2349.32),
         gap=0.045, d=2.0):
    t = t_(d)
    x = np.zeros_like(t)
    for i, f0 in enumerate(notes):
        at = int(i * gap * SR)
        tt = t[: len(t) - at]
        pl = sum((1 / k ** 1.6) * np.sin(2 * np.pi * k * f0 * tt) * np.exp(-tt * (1.8 + 1.1 * k)) for k in range(1, 7))
        x[at:] += pl * np.minimum(1, tt / 0.002) * (0.75 + 0.25 * i / len(notes))
    return fade(norm(reverb(norm(x), 1.6, 0.35)), 1.3, 2.0)


def bell(f0=1760.0, d=1.6):
    t = t_(d)
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * k)
            for r, a, k in ((1, 1.0, 2.2), (2.76, 0.45, 4.0), (5.40, 0.25, 7.0), (8.93, 0.12, 11.0)))
    return fade(norm(reverb(norm(x * np.minimum(1, t / 0.002)), 1.4, 0.3)), 1.6, 2.4)


def shimmer(d=1.2, count=12):
    t = t_(d)
    x = np.zeros_like(t)
    for _ in range(count):
        at = int(RNG.uniform(0, d - 0.4) * SR)
        f0 = RNG.choice([2349.3, 2959.96, 3520.0, 4698.6])
        tt = t[: len(t) - at]
        x[at:] += np.sin(2 * np.pi * f0 * tt) * np.exp(-tt * 14) * RNG.uniform(0.4, 1)
    return fade(norm(reverb(norm(x), 1.2, 0.4)), 1.0, 1.6)


def whoom(d=0.9):
    """The heaven opening: a soft low swell and an airy rush, no hard attack."""
    t = t_(d)
    body = np.sin(2 * np.pi * np.cumsum(55 + 70 * np.exp(-t * 6)) / SR) * np.exp(-t * 4) * np.minimum(1, t / 0.03)
    air = band(RNG.standard_normal(len(t)).astype(np.float32), 600, 6000) * np.exp(-t * 5) * np.minimum(1, t / 0.08)
    mid = np.sin(2 * np.pi * np.cumsum(180 + 120 * np.exp(-t * 8)) / SR) * np.exp(-t * 6) * np.minimum(1, t / 0.02)
    return norm(np.tanh(2.5 * body) + 0.6 * mid + 0.7 * norm(air))


def heartbeat(gain2=0.7, d=0.42):
    """lub (and dub, quieter, at `gap`): a pitch-dropping thump, saturated so a phone plays its harmonics."""
    t = t_(0.2)

    def thump(f_hi, f_lo):
        ph = 2 * np.pi * np.cumsum(f_lo + (f_hi - f_lo) * np.exp(-t / 0.03)) / SR
        body = np.sin(ph) * np.exp(-t / 0.075) * np.minimum(1, t / 0.004)
        upper = np.sin(2 * ph) * np.exp(-t / 0.05) * 0.9 + np.sin(3 * ph) * np.exp(-t / 0.035) * 0.5  # a phone plays these
        knock = band(RNG.standard_normal(len(t)).astype(np.float32), 150, 700) * np.exp(-t / 0.03)
        return np.tanh(3.0 * (0.6 * body + upper + 0.6 * norm(knock)))
    return norm(thump(140, 62)), norm(thump(160, 70)) * gain2


def riser(d):
    t = t_(d)
    p = t / d
    noise = sweep(RNG.standard_normal(len(t)).astype(np.float32), 400, 8000, 3.0)
    f = 220 * 4 ** p
    tone = sum(np.sin(2 * np.pi * np.cumsum(f * m) / SR) * w for m, w in ((1, 0.5), (2, 0.35), (4, 0.15)))
    trem = 1 - 0.45 * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(6 + 22 * p ** 2) / SR))
    x = (norm(noise) * 0.8 + norm(tone) * 0.5) * trem * p ** 2.2
    x[-int(0.005 * SR):] *= np.linspace(1, 0, int(0.005 * SR))
    return norm(x)


def snare_roll(d):
    t = t_(d)
    x = np.zeros_like(t)
    at = 0.0
    while at < d - 0.02:
        p = at / d
        i = int(at * SR)
        tt = t[: min(len(t) - i, int(0.12 * SR))]
        hit = (band(RNG.standard_normal(len(tt)).astype(np.float32), 1500, 7000) * np.exp(-tt / 0.035)
               + 0.6 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / 0.025))
        x[i:i + len(tt)] += hit * (0.25 + 0.75 * p ** 1.5)
        at += 1 / (8 + 20 * p ** 1.3)
    x[-int(0.005 * SR):] *= np.linspace(1, 0, int(0.005 * SR))
    return norm(x)


def crash(d=1.8):
    t = t_(d)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = band(metal.astype(np.float32), 4000, 12000) * 0.6 + band(RNG.standard_normal(len(t)).astype(np.float32),
                                                                 3000, 14000)
    return norm(x * np.exp(-t / 0.55) * np.minimum(1, t / 0.002))


def crowd(d=2.6):
    """A crowd going up: voices yelling on "ê" and "a" at many pitches, under a rush of noise."""
    t = t_(d)
    x = np.zeros_like(t)
    for i in range(40):
        f0 = RNG.uniform(170, 420)
        at = RNG.uniform(0, 0.25)
        glide = f0 * (1 + 0.25 * np.clip((t - at) / 0.3, 0, 1)) * (1 + 0.01 * np.sin(2 * np.pi * RNG.uniform(4, 7) * t))
        vowel = [(700, 130, 1.0), (1200, 150, 0.7), (2600, 250, 0.2)] if i % 2 else [(500, 120, 1.0),
                                                                                      (1900, 200, 0.8),
                                                                                      (2700, 250, 0.3)]
        ph = 2 * np.pi * np.cumsum(glide) / SR + RNG.uniform(0, 6.28)
        v = sum(sum(a / (1 + ((k * f0 - F) / (bw / 2)) ** 2) for F, bw, a in vowel) / k * np.sin(k * ph)
                for k in range(1, 14))
        env = np.clip((t - at) / 0.12, 0, 1) * np.exp(-np.maximum(0, t - at) / RNG.uniform(0.8, 1.8))
        x += v * env * RNG.uniform(0.5, 1)
    rush = band(RNG.standard_normal(len(t)).astype(np.float32), 400, 3500) * np.minimum(1, t / 0.1) * np.exp(-t / 1.4)
    return norm(reverb(norm(x) + 0.5 * norm(rush), 1.4, 0.3))


def kick():
    t = t_(0.32)
    ph = 2 * np.pi * np.cumsum(55 + 160 * np.exp(-t / 0.03)) / SR
    body = np.sin(ph) * np.exp(-t / 0.13) * np.minimum(1, t / 0.002)
    punch = np.sin(2 * ph) * np.exp(-t / 0.05) * 0.9 + np.sin(3 * ph) * np.exp(-t / 0.03) * 0.4
    click = band(RNG.standard_normal(len(t)).astype(np.float32), 2000, 8000) * np.exp(-t / 0.004) * 0.5
    return norm(np.tanh(3.0 * (0.6 * body + punch)) + click)


def clap():
    t = t_(0.35)
    noise = band(RNG.standard_normal(len(t)).astype(np.float32), 800, 3500)
    env = sum(np.exp(-np.maximum(0, t - a) / 0.012) * (t >= a) for a in (0, 0.011, 0.022))
    env += 0.4 * np.exp(-np.maximum(0, t - 0.03) / 0.09) * (t >= 0.03)
    return norm(noise * env)


def hat():
    t = t_(0.08)
    return norm(band(RNG.standard_normal(len(t)).astype(np.float32), 7000, 16000) * np.exp(-t / 0.018))


def air_horn(lengths=(0.17, 0.17, 0.55), gaps=(0.0, 0.2373, 0.4745)):
    """BWA BWA BWAAAA: three detuned saws and their fifth, driven hard, blasts on the eighths."""
    d = gaps[-1] + lengths[-1] + 0.05
    t = t_(d)
    x = np.zeros_like(t)
    for at, ln in zip(gaps, lengths):
        i, n = int(at * SR), int(ln * SR)
        tt = t[:n]
        drop = 1 - 0.03 * np.clip((tt - ln + 0.08) / 0.08, 0, 1)
        s = sum(((tt * f * drop) % 1) * 2 - 1 for f in (349.2, 351.0, 353.5, 523.3, 525.0))
        e = np.minimum(1, tt / 0.008) * np.minimum(1, (ln - tt) / 0.03)
        x[i:i + n] += np.tanh(2.5 * s / 5) * e
    return norm(band(x, 300, 4500))


def party_horn(f0=330.0, d=0.75):
    """A party blowout: a buzzy reed bending up, fluttering."""
    t = t_(d)
    f = f0 * (0.78 + 0.22 * np.minimum(1, t / 0.07)) * (1 - 0.06 * np.clip((t - d + 0.15) / 0.15, 0, 1))
    ph = np.cumsum(f) / SR
    pulse = ((ph % 1) < 0.22).astype(np.float32) * 2 - 1
    flutter = 1 - 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t))
    x = band(pulse, 500, 3000) * flutter * np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.06)
    return norm(x)


def swell(d=0.45):
    t = t_(d)
    x = sweep(RNG.standard_normal(len(t)).astype(np.float32), 300, 7000, 2.0) * (t / d) ** 2.5
    x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    return norm(x)


def sons(ctx):
    st, sp = ctx.clock.starts, ctx.clock.spans
    out = []
    # the teaser: heaven opens, the choir, the harp as she goes up, the halo's bell, sparkles
    out += [(0.0, whoom(), -14), (0.0, choir(), -8), (0.03, bell(1760.0), -19), (0.74, harp(), -15),
            (0.95, shimmer(), -21)]
    # the teaser's zoom out (destaque.py's "zoom" entrance, done in this module)
    out += [(st[1] - 0.26 * 0.62, "whoosh_curto", -12), (st[1], "hit", -12)]
    # the shot: the heart speeding up, the riser and the roll stopping 40 ms before the explosion
    g = short(G, 1, ctx)
    lub, dub = heartbeat()
    for t, i in S["beats"]:
        p = min(1, max(0, (t - HIT) / (G - HIT)))
        gain = -7 + 5 * p
        out += [(short(t, 1, ctx), lub, gain), (short(t + 0.26 * (i / 0.8) ** 0.6, 1, ctx), dub, gain)]
    out += [(g - 2.44, riser(2.4), -10), (g - 1.84, snare_roll(1.8), -15)]
    out += [(g, crash(), -13), (g, crowd(), -15)]
    # the party: a swell into the drop on his first CHAM, then his beat
    drop = short(SYL[0], 2, ctx)
    out += [(st[2] - 0.26 * 0.62, "whoosh_curto", -12), (st[2], "hit", -13), (drop - 0.45, swell(), -15)]
    out += [(drop, crash(), -12), (drop, air_horn(), -12), (drop + 0.02, party_horn(330), -16),
            (drop + 0.1, party_horn(392), -17), (drop, crowd(), -17)]
    k_, c_, h_ = kick(), clap(), hat()
    n = 0
    while True:
        b = SYL[0] + n * BEAT
        if b > sp[2][1] - 0.02:
            break
        o = short(b, 2, ctx)
        out.append((o, k_, -9))
        if n % 2:
            out.append((o, c_, -15))
        if b + BEAT / 2 < sp[2][1] - 0.02:
            out.append((short(b + BEAT / 2, 2, ctx), h_, -25))
        n += 1
    third = short(SYL[4], 2, ctx)
    out += [(third, crash(), -16), (third, party_horn(370), -16)]
    last = short(SYL[-1], 2, ctx)
    out += [(last, crash(), -14), (last, air_horn((0.6,), (0.0,)), -14)]
    return out
