"""Jogando com um ex-SSL (2026-11-24): the ex-SSL ("Hearts", in game absolutyog) on Luan's team, his two plays Luan
picked (#4, #5) with Luan's awe, as a hype edit (Luan, 11-26: "Quando for foco na jogada, fazer uma edição de hype, e
o mesmo para minhas reações se elas forem empolgadas").

- The hook (stretch 0, "O que é isso? Leva de volta pro inferno, capeta. O que foi isso, Hearts?"): hell. The
  camera's Klein keyed out for fire drawn here (noise flames rising, embers), Luan lit red from below; the game's half
  is the ex-SSL's wall carry and flick from the goal replay, slowed to ~0.4×, graded like embers with flames along its
  foot; a fire burst on "inferno", and the Supersonic Legend emblem (public/ranks, the site's copy) slamming in with
  devil horns on "capeta".
- #4 (stretch 1): Luan calmly explaining Roblox while the replay starts; the "EX-SSL" tag on the replay; slow motion
  into the flick (0.4× for 1.5 s, the game catching up under a white flash) as he breaks off ("Nossa Senhora, agora
  que eu vi o chute!"), a punch on his hands over his mouth; the ball's flight as tension (push-in, heartbeat
  vignette, riser) and the goal as a hellfire portal; "Enterra? Enterra?" as two shovel thuds throwing dirt.
- #5 (stretch 2): the save zoomed in (the roteiro's punch); "obra-prima" hangs the save, looping, in a gilded frame on
  a museum wall with its plaque; "matasse a bola aqui no peito" punches on his hand on his chest; "botasse ela pra
  dormir" puts the game to night with the ball tucked into bed (nightcap, Zzz) and a music box playing Brahms'
  lullaby (public domain, synthesised here).

Everything here is drawn and synthesised (no samples, no generated pictures: Gemini's credits were out on 11-26).
"""
import math
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

TEASER, CHUTE, DEFESA = 0, 1, 2
# live seconds, read off the live and the mic (2026-11-26)
FLICK_REPLAY = (5154.30, 5156.60)  # the replay: the wall carry and the flick (teaser's game half)
INFERNO, CAPETA = 5168.83, 5169.29  # his words in the hook
REPLAY_START = 5152.25  # the goal replay's first frame
SLOW = (5155.25, 0.4, 1.5)  # slow motion: from live s, at speed, for output s (the game then skips ahead)
SOCO_CHUTE = 5156.2  # "agora que eu vi o chute"
GOAL = 5161.40  # the replay's end: the ball in the net
ENTERRA = (5162.98, 5163.73)
SAVE_LOOP = (5243.95, 5245.45)  # the save, looped in the museum's frame
OBRA = (5249.30, 5253.05)  # "Cara, o que eu tô vendo aqui é obra-prima"
DORMIR = 5267.93  # "botasse ela pra dormir" → to the end
SAVE_CENTER = (520.0, 500.0)  # the goal in the game's half at the save (x, y in the half)

KLEIN_KEY = np.array((0, 46, 166), np.float32)
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


def screen(base, light):
    return base + light * (1 - base / 255)


def warp(part, z, cx, cy, dx=0.0, dy=0.0):
    if abs(z - 1) < 1e-3 and not dx and not dy:
        return part
    m = np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])
    return cv2.warpAffine(part, m, (part.shape[1], part.shape[0]), flags=cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REFLECT101)


def place_rgba(frame, sprite, cx, cy, scale=1.0, alpha=1.0, angle=0.0):
    if scale <= 0.01 or alpha <= 0.01:
        return
    h, w = sprite.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, scale)
    m[0, 2] += cx - w / 2
    m[1, 2] += cy - h / 2
    x0, y0 = int(max(0, cx - w * scale)), int(max(0, cy - h * scale))
    x1, y1 = int(min(frame.shape[1], cx + w * scale)), int(min(frame.shape[0], cy + h * scale))
    if x1 <= x0 or y1 <= y0:
        return
    m[0, 2] -= x0
    m[1, 2] -= y0
    out = cv2.warpAffine(sprite, m, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                         borderValue=(0, 0, 0, 0)).astype(np.float32)
    a = out[..., 3:4] / 255 * alpha
    part = frame[y0:y1, x0:x1].astype(np.float32)
    frame[y0:y1, x0:x1] = np.clip(part * (1 - a) + out[..., :3] * a, 0, 255).astype(np.uint8)


def read_frames(ctx, live_a, live_b, k, rows):
    """limpo.mp4's frames for live [a, b] of stretch k, only `rows`, JPEG-compressed in memory. → (first n, list)."""
    a = int(round(ctx.clock.out(live_a, k) * ctx.FPS))
    b = int(round(ctx.clock.out(live_b, k) * ctx.FPS))
    y0, y1 = rows
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a / ctx.FPS:.4f}", "-i", "limpo.mp4", "-frames:v",
                          str(b - a + 1), "-vf", f"crop={ctx.W}:{y1 - y0}:0:{y0}", "-f", "rawvideo", "-pix_fmt",
                          "rgb24", "-"], capture_output=True, check=True, cwd=ctx.work).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, y1 - y0, ctx.W, 3)
    return a, [cv2.imencode(".jpg", x[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 93])[1] for x in arr]


def frame_live(store, live, ctx, k):
    """The stored frame nearest to live second `live` of stretch k (with a blend between neighbours)."""
    first, frames = store
    pos = ctx.clock.out(live, k) * ctx.FPS - first
    i = int(math.floor(pos))
    i = min(max(i, 0), len(frames) - 1)
    j = min(i + 1, len(frames) - 1)
    u = min(max(pos - i, 0.0), 1.0)
    a = cv2.imdecode(frames[i], cv2.IMREAD_COLOR)[..., ::-1]
    if j == i or u < 0.15:
        return a.copy()
    b = cv2.imdecode(frames[j], cv2.IMREAD_COLOR)[..., ::-1]
    if u > 0.85:
        return b.copy()
    return cv2.addWeighted(a, 1 - u, b, u, 0)


# ---------------------------------------------------------------------------------------------------- fire


def noise_tile(size, seed, octaves=((8, 1.0), (16, 0.55), (32, 0.3), (64, 0.15))):
    rng = np.random.default_rng(seed)
    out = np.zeros((size, size), np.float32)
    for cells, amp in octaves:
        base = rng.random((cells, cells)).astype(np.float32)
        base = np.tile(base, (3, 3))
        up = cv2.resize(base, (size * 3, size * 3), interpolation=cv2.INTER_CUBIC)[size:2 * size, size:2 * size]
        out += amp * up
    out -= out.min()
    return out / out.max()


def fire_lut():
    stops = [(0.0, (0, 0, 0)), (0.18, (40, 2, 0)), (0.38, (140, 14, 0)), (0.58, (225, 70, 6)),
             (0.78, (255, 160, 30)), (0.92, (255, 230, 120)), (1.0, (255, 255, 230))]
    lut = np.zeros((256, 3), np.float32)
    for i in range(256):
        x = i / 255
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= x <= b:
                u = (x - a) / (b - a)
                lut[i] = np.array(ca) * (1 - u) + np.array(cb) * u
    return lut


def fire_field(w, h, t, rise=1.0, strength=1.0, seed_tile="n1"):
    """Flames rising from the bottom of a w×h field at time t: heat 0..1 (low resolution; resize after)."""
    tile = S[seed_tile]
    n = tile.shape[0]
    ys, xs = S.setdefault(("grid", w, h), np.mgrid[0:h, 0:w].astype(np.float32))
    # two layers of noise scrolling up at different speeds, warped sideways
    u1 = (xs * 1.6 + 7 * np.sin(ys * 0.06 + t * 2.1)) % n
    v1 = (ys * 1.3 + t * 140 * rise) % n
    u2 = (xs * 3.1 + 31) % n
    v2 = (ys * 2.6 + t * 260 * rise) % n
    a = cv2.remap(tile, u1, v1, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    b = cv2.remap(tile, u2, v2, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    height = (ys / h) ** 1.4  # hotter at the bottom
    heat = (0.65 * a + 0.45 * b) * (0.35 + 1.15 * height) * strength - 0.35 * (1 - height)
    return np.clip(heat, 0, 1)


def colorize(heat, size):
    idx = np.clip(heat * 255, 0, 255).astype(np.uint8)
    rgb = S["lut"][idx]
    return cv2.resize(rgb, size, interpolation=cv2.INTER_CUBIC)


# ---------------------------------------------------------------------------------------------------- sprites


def emblem_sprite(ctx, horns=False):
    """The Supersonic Legend emblem with a glow, and the tag "EX-SSL / HEARTS" on the channel's plates beside it."""
    em = Image.open(ctx.ROOT / "public" / "ranks" / "supersonic-legend.webp").convert("RGBA").resize((210, 210),
                                                                                                     Image.LANCZOS)
    c = ctx.cores
    big, small = ctx.grotesk(96), ctx.grotesk(46)
    t1, t2 = "EX-SSL", "HEARTS"
    w1, w2 = big.getlength(t1), small.getlength(t2)
    W_, H_ = int(230 + max(w1 + 70, w2 + 60) + 60), 300
    img = Image.new("RGBA", (W_, H_))
    glow = Image.new("RGBA", (W_, H_))
    dg = ImageDraw.Draw(glow)
    dg.ellipse((20, 35, 250, 265), fill=(200, 60, 255, 150) if not horns else (255, 60, 20, 170))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(28)))
    if horns:  # two devil horns curving up from the emblem's top
        dh = ImageDraw.Draw(img)
        for side in (-1, 1):
            cx = 135 + side * 62
            pts = [(cx - side * 26, 92), (cx + side * 4, 70), (cx + side * 26, 40), (cx + side * 34, 6),
                   (cx + side * 18, 34), (cx - side * 2, 58), (cx - side * 30, 78)]
            dh.polygon(pts, fill=(205, 20, 20, 255), outline=(90, 0, 0, 255))
            dh.line([(cx + side * 26, 40), (cx + side * 34, 6)], fill=(255, 120, 90, 255), width=3)
    img.alpha_composite(em, (30, 45))
    d = ImageDraw.Draw(img)
    x0 = 250
    sh = Image.new("RGBA", (W_, H_))
    ds = ImageDraw.Draw(sh)
    ctx.plate(ds, x0 + 6, 70 + 8, w1 + 70, 122, (0, 0, 0, 140))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(img)
    ctx.plate(d, x0, 70, w1 + 70, 122, c["branco"] + (255,))
    b = big.getbbox(t1)
    d.text((x0 + 35 - b[0], 70 + (122 - (b[3] - b[1])) / 2 - b[1]), t1, font=big, fill=c["klein"])
    ctx.plate(d, x0 + 14, 200, w2 + 60, 64, c["klein"] + (240,), cut=16)
    b = small.getbbox(t2)
    d.text((x0 + 44 - b[0], 200 + (64 - (b[3] - b[1])) / 2 - b[1]), t2, font=small, fill=c["branco"])
    return np.array(img)


def gilded_frame(iw, ih, border=64):
    """A gilded baroque frame (RGBA) around an iw×ih hole, drawn in bands of gold with beads and corner rosettes."""
    w, h = iw + 2 * border, ih + 2 * border
    img = Image.new("RGBA", (w + 40, h + 40))
    sh = Image.new("RGBA", img.size)
    ImageDraw.Draw(sh).rectangle((26, 30, w + 26, h + 30), fill=(0, 0, 0, 170))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(img)
    golds = [(92, 58, 12), (196, 142, 40), (250, 214, 112), (160, 108, 24), (232, 186, 72), (120, 78, 16),
             (255, 232, 150), (176, 122, 30)]
    steps = len(golds)
    for i, col in enumerate(golds):
        m = int(i * border / steps)
        d.rectangle((20 + m, 20 + m, 20 + w - m, 20 + h - m), fill=col + (255,))
    # beads along the inner band
    m = int(border * 0.62)
    for x in range(20 + m, 20 + w - m, 18):
        for y in (20 + m, 20 + h - m):
            d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(255, 226, 140, 255), outline=(120, 80, 20, 255))
    for y in range(20 + m, 20 + h - m, 18):
        for x in (20 + m, 20 + w - m):
            d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(255, 226, 140, 255), outline=(120, 80, 20, 255))
    for cx, cy in ((20, 20), (20 + w, 20), (20, 20 + h), (20 + w, 20 + h)):  # rosettes
        for r, col in ((46, (150, 100, 22)), (38, (240, 200, 96)), (26, (180, 124, 30)), (14, (255, 236, 160))):
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col + (255,))
    for cx in (20 + w // 2,):  # a crest top and bottom
        for cy in (20, 20 + h):
            d.ellipse((cx - 54, cy - 26, cx + 54, cy + 26), fill=(214, 164, 58, 255), outline=(110, 72, 14, 255),
                      width=4)
            d.ellipse((cx - 22, cy - 12, cx + 22, cy + 12), fill=(255, 236, 160, 255))
    d.rectangle((20 + border, 20 + border, 20 + border + iw, 20 + border + ih), fill=(0, 0, 0, 0))
    d.rectangle((20 + border - 4, 20 + border - 4, 20 + border + iw + 4, 20 + border + ih + 4),
                outline=(70, 44, 8, 255), width=5)
    return np.array(img), (20 + border, 20 + border)


def plaque(ctx):
    c = ctx.cores
    f1, f2 = ctx.grotesk(46), ctx.grotesk(28, 500)
    t1, t2 = "OBRA-PRIMA", "HEARTS, 2026 · CARRO SOBRE GRAMA"
    w = int(max(f1.getlength(t1), f2.getlength(t2)) + 70)
    img = Image.new("RGBA", (w + 20, 140))
    d = ImageDraw.Draw(img)
    ctx.plate(d, 10, 10, w, 120, (28, 22, 16, 240), cut=18)
    ctx.plate(d, 16, 16, w - 12, 108, (0, 0, 0, 0), cut=14)
    d.rectangle((14, 14, w + 6, 126), outline=(214, 170, 80, 255), width=3)
    b = f1.getbbox(t1)
    d.text(((w + 20 - (b[2] - b[0])) / 2 - b[0], 26 - b[1]), t1, font=f1, fill=(255, 226, 150))
    b = f2.getbbox(t2)
    d.text(((w + 20 - (b[2] - b[0])) / 2 - b[0], 88 - b[1]), t2, font=f2, fill=c["branco"])
    return np.array(img)


def museum_wall(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np.array((88, 18, 30), np.float32)
    stripes = 1 + 0.06 * (np.sin(x / 9) > 0.6)
    spot = np.exp(-(((x - w / 2) / (w * 0.42)) ** 2 + ((y - h * 0.42) / (h * 0.55)) ** 2))
    wall = base * (0.35 + 1.1 * spot)[..., None] * stripes[..., None]
    floor = y > h * 0.9
    wall[floor] = np.array((40, 26, 18), np.float32) * (0.6 + 0.4 * spot[floor])[..., None]
    wall[(y > h * 0.9 - 6) & (y <= h * 0.9)] = (150, 110, 60)
    return np.clip(wall, 0, 255)


def sleeping_ball(size=420):
    """The ball tucked into bed: a grey sphere with dark plates and a blue ring, eyes shut, a nightcap, a blanket."""
    W_, H_ = int(size * 1.9), int(size * 1.6)
    img = Image.new("RGBA", (W_, H_))
    cx, cy, r = W_ / 2, H_ * 0.42, size / 2
    # the bed's head and pillow
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((cx - r * 1.75, cy - r * 0.55, cx + r * 1.75, cy + r * 1.9), radius=40, fill=(90, 58, 34, 255))
    d.rounded_rectangle((cx - r * 1.45, cy + r * 0.05, cx + r * 1.45, cy + r * 1.05), radius=60,
                        fill=(244, 245, 247, 255))
    # the sphere, shaded
    ball = np.zeros((int(2 * r), int(2 * r), 4), np.float32)
    yy, xx = np.mgrid[0:2 * r, 0:2 * r].astype(np.float32)
    nx, ny = (xx - r) / r, (yy - r) / r
    inside = nx ** 2 + ny ** 2 <= 1
    nz = np.sqrt(np.clip(1 - nx ** 2 - ny ** 2, 0, 1))
    light = np.clip(0.25 + 0.75 * (nx * -0.4 + ny * -0.5 + nz * 0.77), 0, 1)
    shade = 70 + 150 * light
    ball[..., :3] = shade[..., None] * np.array((0.95, 0.97, 1.0))
    # dark hexagon-ish plates: cells of a grid on the sphere
    u, v = np.arctan2(nx, nz), np.arcsin(np.clip(ny, -1, 1))
    cell = ((np.floor(u * 1.7 + 0.3) + np.floor(v * 1.7 + 0.2)) % 2 == 0) & (np.abs(np.sin(u * 5.34 + 0.5)) > 0.22) & \
        (np.abs(np.sin(v * 5.34 + 0.3)) > 0.22)
    ball[cell, :3] *= 0.55
    ring = np.abs(v + 0.05) < 0.035
    ball[ring, :3] = (120, 220, 255)
    spec = np.exp(-(((nx + 0.38) / 0.18) ** 2 + ((ny + 0.45) / 0.14) ** 2)) * 160
    ball[..., :3] += spec[..., None]
    ball[..., 3] = inside * 255
    bi = Image.fromarray(np.clip(ball, 0, 255).astype(np.uint8), "RGBA")
    db = ImageDraw.Draw(bi)
    for ex in (-0.36, 0.36):  # closed eyes and a smile
        x0 = r + ex * r
        db.arc((x0 - r * 0.2, r * 0.82 - r * 0.12, x0 + r * 0.2, r * 0.82 + r * 0.12), 10, 170, fill=(20, 24, 40, 255),
               width=max(5, int(r * 0.05)))
    db.arc((r - r * 0.22, r * 1.08, r + r * 0.22, r * 1.32), 15, 165, fill=(20, 24, 40, 255), width=max(4, int(r * 0.04)))
    for ex in (-0.55, 0.55):  # rosy cheeks
        db.ellipse((r + ex * r - r * 0.1, r * 1.08, r + ex * r + r * 0.1, r * 1.2), fill=(255, 140, 150, 120))
    img.alpha_composite(bi, (int(cx - r), int(cy - r)))
    d = ImageDraw.Draw(img)
    # the nightcap, flopping to the right: Klein with Branco dots, a Branco brim and a pompom at its tip
    cap = [(cx - r * 0.86, cy - r * 0.5), (cx - r * 0.5, cy - r * 1.02), (cx + r * 0.2, cy - r * 1.28),
           (cx + r * 0.9, cy - r * 1.08), (cx + r * 1.32, cy - r * 0.55), (cx + r * 1.42, cy + r * 0.02),
           (cx + r * 1.12, cy - r * 0.42), (cx + r * 0.82, cy - r * 0.6)]
    d.polygon(cap, fill=(0, 47, 167, 255))
    for px, py in ((-0.35, -0.85), (0.15, -1.05), (0.6, -0.9), (1.0, -0.62), (-0.05, -0.7), (0.45, -0.68)):
        d.ellipse((cx + r * px - 9, cy + r * py - 9, cx + r * px + 9, cy + r * py + 9), fill=(244, 245, 247, 255))
    d.rounded_rectangle((cx - r * 0.95, cy - r * 0.66, cx + r * 0.9, cy - r * 0.4), radius=22,
                        fill=(244, 245, 247, 255))
    d.ellipse((cx + r * 1.22, cy - r * 0.1, cx + r * 1.6, cy + r * 0.28), fill=(244, 245, 247, 255))
    # the blanket over its lower half
    d.rounded_rectangle((cx - r * 1.65, cy + r * 0.45, cx + r * 1.65, cy + r * 1.95), radius=50, fill=(70, 110, 220, 255))
    d.rounded_rectangle((cx - r * 1.65, cy + r * 0.45, cx + r * 1.65, cy + r * 0.72), radius=30, fill=(133, 167, 255, 255))
    for k in range(5):
        x = cx - r * 1.3 + k * r * 0.65
        d.line([(x, cy + r * 0.85), (x + r * 0.15, cy + r * 1.8)], fill=(50, 86, 190, 255), width=6)
    return np.array(img)


def zzz_sprite(ctx, size):
    f = ctx.grotesk(size)
    img = Image.new("RGBA", (int(size * 1.2), int(size * 1.4)))
    d = ImageDraw.Draw(img)
    d.text((8, 8), "Z", font=f, fill=(244, 245, 247, 255), stroke_width=max(3, size // 14), stroke_fill=(0, 22, 84, 255))
    return np.array(img)


# ---------------------------------------------------------------------------------------------------- setup


def setup(ctx):
    W, H, CAM_H = ctx.W, ctx.H, ctx.CAM_H
    S["n1"] = noise_tile(256, 3)
    S["n2"] = noise_tile(256, 9)
    S["lut"] = fire_lut()
    rows_game = (CAM_H, H)
    S["flick"] = read_frames(ctx, FLICK_REPLAY[0], FLICK_REPLAY[1], CHUTE, rows_game)
    S["save"] = read_frames(ctx, SAVE_LOOP[0] - 0.05, SAVE_LOOP[1] + 0.05, DEFESA, rows_game)
    S["emblem"] = emblem_sprite(ctx)
    S["emblem_horns"] = emblem_sprite(ctx, horns=True)
    S["frame"], S["frame_hole"] = gilded_frame(640, 400)
    S["plaque"] = plaque(ctx)
    # Luan kneeling in worship (Gemini's edit of his own camera frame at live 5170, keyed): before the painting
    kn = Image.open(ctx.VIDEOS / "Lives/2026-11-24/Shorts/Partes/capeta/joelhos.png").convert("RGBA")
    kh = 610
    kn = np.array(kn.resize((round(kn.width * kh / kn.height), kh), Image.LANCZOS)).astype(np.float32)
    kn[..., :3] = np.clip(kn[..., :3] * np.array((1.06, 0.97, 0.9), np.float32), 0, 255)  # the museum's warm light
    S["joelhos"] = kn.astype(np.uint8)
    S["wall"] = museum_wall(W, H - CAM_H)
    S["bed"] = sleeping_ball(380)
    S["zzz"] = [zzz_sprite(ctx, s) for s in (70, 96, 124)]
    rng = np.random.default_rng(24)
    S["embers"] = [(rng.uniform(0, W), rng.uniform(0, 1), rng.uniform(60, 220), rng.uniform(2, 6), rng.uniform(0, 6.3))
                   for _ in range(70)]
    S["stars"] = [(rng.uniform(30, W - 30), rng.uniform(CAM_H + 30, CAM_H + 420), rng.uniform(2, 5),
                   rng.uniform(0, 6.3)) for _ in range(46)]
    S["dirt"] = [(rng.uniform(-1, 1), rng.uniform(0.6, 1.4), rng.uniform(5, 16), rng.uniform(0, 1)) for _ in range(90)]
    # the camera's logo on the virtual background ("S muanlartins"): found once on the hook's first frame
    first = int(round(ctx.clock.starts[TEASER] * ctx.FPS))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{first / ctx.FPS:.4f}", "-i", "limpo.mp4", "-frames:v", "1",
                          "-vf", f"crop={W}:{CAM_H}:0:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True, cwd=ctx.work).stdout
    cam = np.frombuffer(raw, np.uint8).reshape(CAM_H, W, 3).astype(np.int16)
    bright = (cam.min(axis=2) > 105)
    bright[int(CAM_H * 0.45):] = False  # his face and shirt sit lower
    S["logo"] = cv2.dilate(bright.astype(np.uint8), np.ones((19, 19), np.uint8)) > 0


# ---------------------------------------------------------------------------------------------------- the hook


def matte(cam):
    c = cam.astype(np.int16)
    bgk = c[..., 2] - np.maximum(c[..., 0], c[..., 1])
    a = np.clip((bgk - 25) / 70.0, 0, 1).astype(np.float32)
    a[S["logo"]] = 1.0
    return cv2.GaussianBlur(a, (0, 0), 1.0)


def hell_camera(f, o, live, ctx):
    W, CAM_H = ctx.W, ctx.CAM_H
    cam = f[:CAM_H].astype(np.float32)
    a = matte(f[:CAM_H])[..., None]
    burst = kick(live - INFERNO, 1.0, 0.35)
    heat = fire_field(W // 4, CAM_H // 4, o, 1.0, 1.0 + 0.6 * burst)
    bg = colorize(heat, (W, CAM_H))
    ambient = np.linspace(0.0, 1.0, CAM_H, dtype=np.float32)[:, None, None] * np.array((60, 6, 0), np.float32)
    bg = np.maximum(bg, ambient + 18)
    # him: warm, lit from below by the fire, the Klein spill pulled down
    fg = cam.copy()
    over = fg[..., 2] - np.maximum(fg[..., 0], fg[..., 1])
    fg[..., 2] -= np.clip(over, 0, None) * 0.85
    lum = fg.mean(axis=2, keepdims=True)
    fg = fg * 0.55 + lum * np.array((0.75, 0.38, 0.22), np.float32) * 1.15
    rim = np.linspace(0.0, 1.0, CAM_H, dtype=np.float32)[:, None, None] ** 2 * \
        np.array((120, 40, 0), np.float32) * (0.8 + 0.2 * math.sin(o * 23) + 0.8 * burst)
    fg = screen(np.clip(fg, 0, 255), np.clip(rim, 0, 255))
    out = fg * (1 - a) + bg * a
    # embers drifting up over everything
    for x0, y0, v, s, ph in S["embers"]:
        y = (y0 * CAM_H - v * o) % (CAM_H + 40) - 20
        x = x0 + 18 * math.sin(o * 2 + ph)
        b = 0.6 + 0.4 * math.sin(o * 9 + ph)
        cv2.circle(out, (int(x), int(y)), int(s), (255 * b, 150 * b, 40 * b), -1, lineType=cv2.LINE_AA)
    out = screen(out, np.full_like(out, 255) * np.array((1.0, 0.55, 0.2), np.float32) * 0.5 * burst)
    f[:CAM_H] = np.clip(out, 0, 255).astype(np.uint8)


def hell_game(f, o, live, ctx):
    W, H, CAM_H = ctx.W, ctx.H, ctx.CAM_H
    t0, t1 = ctx.clock.starts[TEASER], ctx.clock.starts[TEASER + 1]
    u = (o - t0) / (t1 - t0)
    g_live = FLICK_REPLAY[0] + (FLICK_REPLAY[1] - FLICK_REPLAY[0]) * u
    g = frame_live(S["flick"], g_live, ctx, CHUTE).astype(np.float32)
    gh = H - CAM_H
    z = 1.06 + 0.06 * u
    g = warp(g, z, W / 2, gh * 0.45).astype(np.float32)
    lum = g @ np.array([0.3, 0.55, 0.15], np.float32)
    duo = np.stack([np.clip(lum * 1.25 + 30, 0, 255), np.clip(lum * 0.62, 0, 255), np.clip(lum * 0.3, 0, 255)], -1)
    g = g * 0.35 + duo * 0.65
    burst = kick(live - INFERNO, 1.0, 0.35)
    heat = fire_field(W // 4, gh // 4, o + 3.7, 1.2, 0.85 + 0.7 * burst, "n2")
    heat *= np.clip((np.arange(gh // 4, dtype=np.float32)[:, None] / (gh // 4) - 0.35) / 0.65, 0, 1) ** 1.2
    flames = colorize(heat, (W, gh))
    g = screen(g, flames)
    vig = S.setdefault("vig_game", None)
    if vig is None:
        yy, xx = np.mgrid[0:gh, 0:W].astype(np.float32)
        vig = S["vig_game"] = (1 - 0.55 * np.clip(np.hypot((xx - W / 2) / W, (yy - gh / 2) / gh) * 1.7 - 0.3, 0, 1))
    g *= vig[..., None]
    f[CAM_H:] = np.clip(g, 0, 255).astype(np.uint8)


def zoom_cut(f, o, cut, ctx):
    """destaque's "zoom" entrance, redone over a frame this module replaced (the game's rows only when part)."""
    x = o - cut
    if not -0.12 <= x < 0.2:
        return
    u = ((x + 0.12) / 0.12) ** 2 if x < 0 else (1 - x / 0.2) ** 2
    z = 1 + 0.2 * u
    f[:] = warp(f, z, ctx.W / 2, ctx.H / 2)
    k = 1 + int(24 * u)
    if k > 1:
        f[:] = cv2.blur(f, (k, k))
    a = 0.55 * math.exp(-abs(x) / 0.05)
    f[:] = (f.astype(np.float32) * (1 - a) + 255 * a).astype(np.uint8)


# ---------------------------------------------------------------------------------------------------- #4


def chute(f, o, live, ctx):
    W, H, CAM_H = ctx.W, ctx.H, ctx.CAM_H
    gh = H - CAM_H
    s_live, speed, dur = SLOW
    s_o = ctx.clock.out(s_live, CHUTE)
    x = o - s_o
    if 0 <= x < dur:  # slow motion into the flick: the game's half from the stored replay at `speed`
        g = frame_live(S["flick"], s_live + speed * x, ctx, CHUTE).astype(np.float32)
        z = 1 + 0.18 * ease(x / 0.5)
        g = warp(g, z, W / 2, gh * 0.48).astype(np.float32)
        lum = (g @ np.array([0.3, 0.55, 0.15], np.float32))[..., None]
        d = 0.35 * ease(x / 0.4)
        g = g * (1 - d) + lum * d
        yy = S.setdefault("yy_game", np.mgrid[0:gh, 0:W].astype(np.float32))
        v = np.clip(np.hypot((yy[1] - W / 2) / W, (yy[0] - gh / 2) / gh) * 1.8 - 0.35, 0, 1)
        g *= (1 - 0.6 * v * ease(x / 0.4))[..., None]
        f[CAM_H:] = np.clip(g, 0, 255).astype(np.uint8)
        return
    # the ball's flight after the flick: a push-in with a heartbeat on the vignette, until the net
    a = s_o + dur
    b = ctx.clock.out(GOAL, CHUTE)
    if a <= o < b:
        p = (o - a) / (b - a)
        bpm = 90 + 70 * p
        beat = (o - a) * bpm / 60
        hb = math.exp(-((beat % 1) / 0.08)) + 0.6 * math.exp(-(((beat - 0.28) % 1) / 0.08))
        z = (1 + 0.16 * p ** 1.3) * (1 + 0.01 * hb)
        g = warp(f[CAM_H:], z, W / 2, gh * 0.45).astype(np.float32)
        yy = S.setdefault("yy_game", np.mgrid[0:gh, 0:W].astype(np.float32))
        v = np.clip(np.hypot((yy[1] - W / 2) / W, (yy[0] - gh / 2) / gh) * 1.8 - 0.3, 0, 1)
        g *= (1 - np.clip((0.25 + 0.35 * p + 0.2 * hb) * v, 0, 0.85))[..., None]
        g[..., 0] += 50 * hb * p * v
        f[CAM_H:] = np.clip(g, 0, 255).astype(np.uint8)
        return
    e = o - b
    if 0 <= e < 1.1:  # the net: a hellfire portal bursting out of the middle of the game's half
        g = f[CAM_H:].astype(np.float32)
        yy = S.setdefault("yy_game", np.mgrid[0:gh, 0:W].astype(np.float32))
        r = np.hypot(yy[1] - W / 2, (yy[0] - gh * 0.45) * 1.1)
        radius = 80 + 900 * (1 - math.exp(-e / 0.18))
        heat_small = fire_field(W // 4, gh // 4, o * 1.3, 2.0, 1.4, "n2")
        heat = cv2.resize(heat_small, (W, gh), interpolation=cv2.INTER_LINEAR)
        ring = np.exp(-((r - radius) / (60 + 120 * e)) ** 2) + np.clip(1 - r / radius, 0, 1) ** 0.6 * 0.9
        fade = math.exp(-max(0, e - 0.35) / 0.25)
        heatm = np.clip(ring * (0.45 + 0.8 * heat) * fade, 0, 1)
        fire = S["lut"][np.clip(heatm * 255, 0, 255).astype(np.uint8)]
        g = screen(g * (1 - 0.5 * fade), fire)
        f[CAM_H:] = np.clip(g, 0, 255).astype(np.uint8)
    for t_ in ENTERRA:  # "Enterra?": the half thumped down, dirt thrown up from its foot
        e = live - t_
        if 0 <= e < 0.7:
            dy = 38 * math.exp(-e / 0.08) * math.cos(e * 40)
            f[CAM_H:] = warp(f[CAM_H:], 1.02, W / 2, gh, 0, dy)
            # the dirt mound swelling at the foot, clods flying up and falling back
            mound = int(130 * math.sin(min(1.0, e / 0.5) * math.pi * 0.5) * (1 - max(0, e - 0.45) / 0.25))
            if mound > 0:
                pts = np.array([[0, H], [0, H - mound // 3]] + [[x, int(H - mound * (0.55 + 0.45 * math.sin(
                    x / 90 + t_)))] for x in range(0, W + 1, 60)] + [[W, H - mound // 3], [W, H]], np.int32)
                cv2.fillPoly(f, [pts], (92, 62, 34), lineType=cv2.LINE_AA)
            for dx, vy, size, ph in S["dirt"]:
                tt = e
                x = W / 2 + dx * 560 + dx * 420 * tt
                y = H - 40 - (vy * 2100 * tt - 3800 * tt * tt)
                if CAM_H < y < H:
                    col = (70 + 45 * ph, 46 + 26 * ph, 24 + 10 * ph)
                    cv2.circle(f, (int(x), int(y)), int(size * 2.2), col, -1, lineType=cv2.LINE_AA)


def chute_tag(f, o, live, ctx):
    """The EX-SSL tag sliding in over the replay's start, out before the flick."""
    W, CAM_H = ctx.W, ctx.CAM_H
    a, b = REPLAY_START + 0.1, SLOW[0] - 0.1
    if not a <= live < b:
        return
    x = live - a
    inn = 1 - (1 - min(1.0, x / 0.18)) ** 3
    out = ease((x - (b - a - 0.18)) / 0.18) if x > b - a - 0.18 else 0.0
    sp = S["emblem"]
    cx = -sp.shape[1] / 2 + (W / 2 + sp.shape[1] / 2) * inn + W * out
    scale = 0.8
    place_rgba(f, sp, cx, CAM_H + 175, scale, 1.0)


# ---------------------------------------------------------------------------------------------------- #5


def museum(f, o, live, ctx):
    W, H, CAM_H = ctx.W, ctx.H, ctx.CAM_H
    gh = H - CAM_H
    a, b = OBRA
    x = live - a
    inn = ease(x / 0.22)
    out = ease((live - (b - 0.22)) / 0.22)
    vis = inn * (1 - out)
    wall = S["wall"]
    loop = SAVE_LOOP[1] - SAVE_LOOP[0]
    g_live = SAVE_LOOP[0] + ((x * 0.7) % loop)
    shot = frame_live(S["save"], g_live, ctx, DEFESA)
    cx, cy = SAVE_CENTER
    z = 1.9
    shot = warp(shot, z, cx, cy)
    # crop the painting around the zoomed save, as oil: smoothed, a little more colour
    hole_w, hole_h = 640, 400
    x0 = int(min(max(cx - hole_w / 2, 0), W - hole_w))
    y0 = int(min(max(cy - hole_h / 2, 0), gh - hole_h))
    paint = shot[y0:y0 + hole_h, x0:x0 + hole_w]
    paint = cv2.bilateralFilter(paint, 7, 40, 7).astype(np.float32)
    lum = paint.mean(axis=2, keepdims=True)
    paint = np.clip(lum + (paint - lum) * 1.25, 0, 255) * np.array((1.04, 1.0, 0.9), np.float32)
    canvas = wall.copy()
    fr, (hx, hy) = S["frame"], S["frame_hole"]
    fx0 = int(W / 2 - fr.shape[1] / 2 + 125)  # right of the middle: Luan kneels on the left
    fy0 = int(gh * 0.43 - fr.shape[0] / 2)
    canvas[fy0 + hy:fy0 + hy + hole_h, fx0 + hx:fx0 + hx + hole_w] = paint
    fa = fr[..., 3:4].astype(np.float32) / 255
    reg = canvas[fy0:fy0 + fr.shape[0], fx0:fx0 + fr.shape[1]]
    canvas[fy0:fy0 + fr.shape[0], fx0:fx0 + fr.shape[1]] = reg * (1 - fa) + fr[..., :3] * fa
    # the gilt catching the spotlight: a glint sweeping across
    sweep = (x * 0.8) % 1.6 - 0.3
    gx = fx0 + sweep * fr.shape[1]
    yy, xx = np.mgrid[0:fr.shape[0], 0:fr.shape[1]].astype(np.float32)
    glint = np.exp(-(((xx + fx0) - gx + (yy - fr.shape[0] / 2) * 0.5) / 30) ** 2) * fa[..., 0] * 120
    canvas[fy0:fy0 + fr.shape[0], fx0:fx0 + fr.shape[1]] += glint[..., None]
    canvas = np.clip(canvas, 0, 255).astype(np.uint8)
    pl = S["plaque"]
    place_rgba(canvas, pl, fx0 + fr.shape[1] / 2, fy0 + fr.shape[0] + 70, 1.0, 1.0)
    kn = S["joelhos"]
    slide = 1 - (1 - min(1.0, max(0.0, (x - 0.1) / 0.3))) ** 3
    bow = 2.5 * math.sin(x * 4.5)  # rocking in worship
    floor = gh * 0.9 + 40
    shadow = np.zeros((60, 360, 4), np.uint8)
    cv2.ellipse(shadow, (180, 30), (160, 22), 0, 0, 360, (0, 0, 0, 150), -1, lineType=cv2.LINE_AA)
    shadow = cv2.GaussianBlur(shadow, (0, 0), 8)
    kx = -260 + (210 + 260) * slide
    place_rgba(canvas, shadow, kx + 20, floor - 8, 1.0, slide)
    place_rgba(canvas, kn, kx, floor - kn.shape[0] / 2, 1.0, 1.0, bow)
    # in: the painting drops onto the wall with a bounce; the whole half fades through
    drop = (1 - inn) * -120 + 14 * math.sin(min(1.0, x / 0.4) * math.pi) * (x < 0.4)
    canvas = warp(canvas, 1.0, W / 2, gh / 2, 0, drop) if abs(drop) > 0.5 else canvas
    f[CAM_H:] = (f[CAM_H:].astype(np.float32) * (1 - vis) + canvas.astype(np.float32) * vis).astype(np.uint8)


def night(f, o, live, ctx):
    W, H, CAM_H = ctx.W, ctx.H, ctx.CAM_H
    x = live - DORMIR
    gh = H - CAM_H
    d = ease(x / 0.5)
    g = f[CAM_H:].astype(np.float32)
    lum = g.mean(axis=2, keepdims=True)
    nightc = lum * np.array((0.18, 0.24, 0.55), np.float32) + np.array((2, 6, 28), np.float32)
    g = g * (1 - d) + nightc * d
    f[CAM_H:] = np.clip(g, 0, 255).astype(np.uint8)
    cam = f[:CAM_H].astype(np.float32)
    f[:CAM_H] = np.clip(cam * (1 - 0.35 * d) + cam.mean(axis=2, keepdims=True) * np.array((0.2, 0.26, 0.5)) * 0.35 * d,
                        0, 255).astype(np.uint8)
    for sx, sy, s, ph in S["stars"]:
        b = d * (0.55 + 0.45 * math.sin(o * 3 + ph))
        if b < 0.3:
            continue
        x0, y0 = int(sx), int(sy)
        part = f[y0 - 6:y0 + 7, x0 - 6:x0 + 7].astype(np.float32)
        dot = np.zeros(part.shape[:2], np.float32)
        cv2.circle(dot, (6, 6), int(s), 1.0, -1, lineType=cv2.LINE_AA)
        f[y0 - 6:y0 + 7, x0 - 6:x0 + 7] = np.clip(part + dot[..., None] * b * np.array((255, 250, 215)), 0, 255)
    # a crescent moon
    if d > 0:
        mx, my = 190, CAM_H + 170
        moon = np.zeros((200, 200, 4), np.uint8)
        cv2.circle(moon, (100, 100), 70, (255, 240, 190, 255), -1, lineType=cv2.LINE_AA)
        cv2.circle(moon, (130, 82), 62, (0, 0, 0, 0), -1, lineType=cv2.LINE_AA)
        place_rgba(f, moon, mx, my, 1.0, d)
    # the ball tucked in: rises in from below with a bounce, rocking gently
    if x >= 0.15:
        y = x - 0.15
        pop = 1 - (1 - min(1.0, y / 0.35)) ** 3
        bob = 4 * math.sin(o * 2.2)
        place_rgba(f, S["bed"], W / 2, CAM_H + 640 + (1 - pop) * 500 + bob, 0.95, 1.0, 2.5 * math.sin(o * 1.6))
        for k, sp in enumerate(S["zzz"]):  # Zzz rising one after another
            t = (y - 0.4 - 0.45 * k) % 1.8
            if y - 0.4 - 0.45 * k < 0:
                continue
            place_rgba(f, sp, W / 2 + 230 + 60 * k + 25 * math.sin(t * 3), CAM_H + 430 - 140 * k - 90 * t,
                       0.7 + 0.3 * t, min(1.0, t / 0.2) * (1 - max(0, t - 1.3) / 0.5))


# ---------------------------------------------------------------------------------------------------- hooks


def antes(f, o, ctx):
    k, live = where(o, ctx)
    st = ctx.clock.starts
    if k == TEASER:
        hell_game(f, o, live, ctx)
        hell_camera(f, o, live, ctx)
        zoom_cut(f, o, st[1], ctx)
    elif k == CHUTE:
        chute(f, o, live, ctx)
        if o - st[1] < 0.2:
            zoom_cut(f, o, st[1], ctx)
    elif k == DEFESA:
        if OBRA[0] <= live < OBRA[1]:
            museum(f, o, live, ctx)
        if live >= DORMIR:
            night(f, o, live, ctx)
    return f


def depois(f, o, ctx):
    k, live = where(o, ctx)
    if k == TEASER and live >= CAPETA - 0.02:
        x = live - CAPETA
        sc = 1 + 0.6 * (1 - ease(x / 0.12)) if x < 0.12 else 1 + 0.04 * math.exp(-(x - 0.12) * 10) * \
            math.cos((x - 0.12) * 40)
        place_rgba(f, S["emblem_horns"], ctx.W / 2, ctx.CAM_H + 330, 0.95 * sc, min(1.0, x / 0.05))
    elif k == CHUTE:
        chute_tag(f, o, live, ctx)
    return f


# ---------------------------------------------------------------------------------------------------- sounds


def t_(d, SR):
    return np.arange(int(d * SR)) / SR


def norm(x):
    return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def band(x, lo, hi, SR):
    n = len(x)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(fr)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(fr, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (fr / hi) ** 4)
    return np.fft.irfft(X * m, n).astype(np.float32)


def hell_drone(d, SR):
    """A dark choir-ish drone (low minor cluster, slow swell, growl) with fire crackle: the hook's bed."""
    t = t_(d, SR)
    rng = np.random.default_rng(1)
    x = np.zeros_like(t)
    for f0 in (55.0, 65.41, 82.41, 110.0, 116.54):
        for det in (-0.004, 0.0, 0.005):
            ph = 2 * np.pi * np.cumsum(np.full(len(t), f0 * (1 + det)) * (1 + 0.003 * np.sin(2 * np.pi * 4.7 * t))) / SR
            x += sum(np.sin(k * ph) / k ** 1.2 for k in range(1, 12))
    x = band(np.tanh(0.25 * x), 70, 2400, SR)
    crackle = rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.004) * 4
    crackle = band(crackle.astype(np.float32), 1500, 9000, SR)
    roar = band(rng.standard_normal(len(t)).astype(np.float32), 120, 900, SR)
    env = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.12)
    return norm((norm(x) * 0.9 + norm(crackle) * 0.45 + norm(roar) * 0.35) * env)


def fire_boom(SR, d=1.4):
    t = t_(d, SR)
    rng = np.random.default_rng(2)
    sub = np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-t / 0.07)) / SR) * np.exp(-t / 0.45)
    grit = band(np.tanh(6 * sub).astype(np.float32), 150, 2500, SR)
    whoosh = band(rng.standard_normal(len(t)).astype(np.float32), 300, 5000, SR) * np.minimum(1, t / 0.02) * \
        np.exp(-t / 0.35)
    click = band(rng.standard_normal(len(t)).astype(np.float32), 1500, 6000, SR) * np.exp(-t / 0.006)
    return norm(np.tanh(1.3 * (norm(sub) + 0.8 * norm(grit) + 0.7 * norm(whoosh) + 0.5 * norm(click))))


def slow_down(SR, d=0.7):
    """Time slowing: a tone and noise sweeping down (the 'tape stop' of slow motion)."""
    t = t_(d, SR)
    f = 900 * (60 / 900) ** (t / d)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    rng = np.random.default_rng(5)
    noise = band(rng.standard_normal(len(t)).astype(np.float32), 200, 3000, SR)
    return norm((tone * 0.7 + 0.4 * norm(noise)) * np.minimum(1, t / 0.02) * np.exp(-t / (d * 0.6)))


def heartbeat_bed(d, SR, bpm0=90, bpm1=160):
    t = t_(d, SR)
    out = np.zeros_like(t)
    beat, tt = 0.0, 0.0
    while tt < d:
        for off, g in ((0.0, 1.0), (0.28 * 60 / (bpm0 + (bpm1 - bpm0) * tt / d), 0.65)):
            i = int((tt + off) * SR)
            n = int(0.25 * SR)
            if i + n < len(out):
                s = np.arange(n) / SR
                th = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-s / 0.05) + 45) / SR) * np.exp(-s / 0.07)
                out[i:i + n] += g * (np.tanh(3 * th) * 0.8 + band(np.tanh(6 * th).astype(np.float32), 150, 1200, SR) * 0.6)
        tt += 60 / (bpm0 + (bpm1 - bpm0) * tt / d)
        beat += 1
    return norm(out)


def riser(d, SR):
    t = t_(d, SR)
    u = t / d
    f = 160 * (1400 / 160) ** (u ** 1.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    rng = np.random.default_rng(6)
    hiss = band(rng.standard_normal(len(t)).astype(np.float32), 2000, 9000, SR)
    return norm((0.6 * tone + 0.7 * norm(hiss) * u) * u ** 2)


def thud(SR, d=0.4):
    t = t_(d, SR)
    rng = np.random.default_rng(7)
    body = np.sin(2 * np.pi * np.cumsum(55 + 110 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.09)
    dirt = band(rng.standard_normal(len(t)).astype(np.float32), 400, 4000, SR) * np.exp(-t / 0.05)
    clank = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, dd in ((1350, 0.08), (2210, 0.05), (3120, 0.03)))
    return norm(np.tanh(2 * norm(body)) + 0.7 * norm(dirt) + 0.35 * norm(clank * (t < 0.3)))


def music_box(SR, d):
    """Brahms' Wiegenlied (public domain), its opening phrase, as a music box: bell-like plucks with a soft bass."""
    # E E G | E E G | E G C' B A A G | D E F D E F | D F B A G B C'
    beat = 0.36
    mel = [("E5", 0.5), ("E5", 0.5), ("G5", 2), ("E5", 0.5), ("E5", 0.5), ("G5", 2), ("E5", 0.5), ("G5", 0.5),
           ("C6", 1), ("B5", 1.5), ("A5", 0.5), ("A5", 1), ("G5", 1)]
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

    def hz(n):
        return 440 * 2 ** ((names[n[0]] + 12 * (int(n[1]) + 1) - 69) / 12)

    t = t_(d, SR)
    out = np.zeros_like(t)
    tt = 0.0
    for n, dur in mel:
        i = int(tt * SR)
        if i >= len(out):
            break
        s = np.arange(min(int(1.6 * SR), len(out) - i)) / SR
        f0 = hz(n)
        tone = sum(a * np.sin(2 * np.pi * f0 * r * s) * np.exp(-s / dd)
                   for r, a, dd in ((1, 1.0, 0.7), (2.76, 0.35, 0.25), (5.4, 0.15, 0.1), (8.9, 0.06, 0.05)))
        out[i:i + len(s)] += tone * np.minimum(1, s / 0.002)
        tt += dur * beat
    # a soft bass under each bar
    for k, n in enumerate(("C4", "C4", "G3", "C4", "F3", "C4")):
        i = int(k * 3 * beat * SR / 1.5)
        if i >= len(out):
            break
        s = np.arange(min(int(1.2 * SR), len(out) - i)) / SR
        out[i:i + len(s)] += 0.35 * np.sin(2 * np.pi * hz(n) * s) * np.exp(-s / 0.6) * np.minimum(1, s / 0.01)
    out *= np.minimum(1, (d - t) / 0.25)
    return norm(out)


def chime(SR):
    t = t_(1.6, SR)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, a, dd in
            ((1568, 1.0, 0.8), (2349, 0.5, 0.5), (3136, 0.3, 0.3), (4186, 0.15, 0.2)))
    return norm(x * np.minimum(1, t / 0.003))


def sons(ctx):
    SR, clock = ctx.SR, ctx.clock
    st = clock.starts
    out = []
    # the hook: hell's drone under all of it, the burst on "inferno", the emblem's slam on "capeta"
    out.append((st[TEASER], hell_drone(st[1] - st[TEASER] + 0.05, SR), -17))
    out.append((st[TEASER], fire_boom(SR), -13))
    out.append((clock.out(INFERNO, TEASER), fire_boom(SR, 1.6), -11))
    out.append((clock.out(CAPETA, TEASER), "impact-boom", -12))
    # #4: the tag's swoosh, the slow motion, the release, the flight's heartbeat and riser, the portal
    out.append((clock.out(REPLAY_START + 0.1, CHUTE) - 0.1, "whoosh_curto", -16))
    s_o = clock.out(SLOW[0], CHUTE)
    out.append((s_o, slow_down(SR), -14))
    out.append((s_o + SLOW[2], "impact-boom", -10))
    a, b = s_o + SLOW[2], clock.out(GOAL, CHUTE)
    out.append((a, heartbeat_bed(b - a, SR), -15))
    out.append((a, riser(b - a, SR), -19))
    out.append((b, fire_boom(SR, 1.8), -9))
    for t in ENTERRA:
        out.append((clock.out(t, CHUTE), thud(SR), -11))
    # #5: the museum's chime and choir, the chest, the lullaby
    out.append((clock.out(OBRA[0], DEFESA), chime(SR), -16))
    out.append((clock.out(DORMIR, DEFESA), music_box(SR, clock.length - clock.out(DORMIR, DEFESA)), -14))
    return out
