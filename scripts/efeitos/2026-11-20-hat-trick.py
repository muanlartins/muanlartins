"""Hat-trick (2026-11-20, "hoje eu acordei diferente"): the reel's memes, after Luan's verdict on the first cut
("esses memezinhos que você inventou não tão legais… colocar um óculos escuros do turn down 4 what em mim, ou talvez
um meme do cara com o queixo quadrado alfa male sigma").

- The Gigachad: a black-and-white, square-jawed version of HIM (Gemini's edit of his own camera frame at live
  1588.8, `Partes/hat-trick/gigachad.png`), with film grain and a vignette, filling the camera's half.
  - On "como o JP diz, onde a coruja dorme" (calling the top corner before scoring there): it cuts in on "onde" with a
    punch, a flash and a cinematic sting, and cuts back out after "dorme".
- "Deal with it": after the three "Meu Deus", the Octane costume goes (the last stretch is Câmera.mkv alone, a flash
  and a poof), the camera pushes in on his face and pixel sunglasses, drawn here, slide down from the top onto his
  eyes (tracked frame by frame: Lucas-Kanade on his own glasses and brows, a similarity transform from the stretch's
  first frame) while he says "hoje eu acordei diferente", under a riser.
- The drop: as they settle, a synthesised 808 bass drop ("turn down for what" style, no song) cuts to the Gigachad
  wearing the shades, then (round 3, Luan: "se você conseguir diferentes poses… como se fosse um bodybuilder
  demonstrando os músculos") through his bodybuilding routine, one pose per 808: front double biceps, side chest,
  most muscular, and a kiss to his own muscle (with a "mwah"). Each pose is a Gemini edit of the Gigachad picture
  (same face, same light), framed and graded here, the shades drawn on its eyes. The teaser opens on the first
  picture, so the reel loops.
- The goals (round 3, Luan: "a legenda '1º gol, 2º gol'… um pouco melhor visualmente pra dar mais impacto", in the
  channel's look): a Klein band with the live's lattice wipes across the game, "GOL" slams in Branco with a dark
  Klein edge beside the count on a Branco plate cut at 45°, and a hat-trick meter under it fills one slot per goal,
  its chime climbing a note per goal; the third fills it.
"""
import hashlib
import json
import math
import subprocess

import cv2
import numpy as np
from PIL import Image

PARTES = "Shorts/Partes/hat-trick"
TEASER, GOL1, FIM = 0, 1, 4  # the stretches (the teaser replays the end's seconds)
CORUJA = (1448.36, 1449.62)  # live s: the Gigachad cut in on "onde a coruja dorme"
REVEAL = 1586.70  # the last stretch's first frame: the costume's gone
SLIDE = (1586.80, 1587.74)  # the shades sliding down
DROP = 1588.0  # …the bass drop, onto the Gigachad
HITS = (0.0, 0.4, 0.8, 1.2, 1.6)  # the drop's 808s after DROP, one pose each (the last holds to the end)
GOLS = ((1453.5, 1), (1556.1, 2), (1581.5, 3))  # live s of each goal's frame, and its stretch
GOL_DUR = 1.6  # the goal's label on screen
GOL_Y = 1478  # its middle (the band: ~1350-1610, clear of the platforms' bottom 270 px)
OLHOS_REF = (497.0, 578.0, 205.0)  # his glasses in the stretch's first frame (centre x, y, width), measured 11-20
GIGA_ESCALA, GIGA_X0 = 1.2, 408  # gigachad.png (1376×768) scaled and cropped into the 1080×840 half
GIGA_OLHOS = (790.0, 276.0, 300.0, 2.0)  # gigachad-sem-oculos.png (the same picture without his glasses, for
# the shades): the eyes' middle, the shades' width, their tilt (degrees)
# the bodybuilding routine after the first pose: (picture, scale, the subject's middle x, eyes' middle x, y, the
# eyes' distance, tilt, where the eyes go in the half), all in the 1376×768 picture; the fists stay in, the elbows
# may leave
POSES = [
    ("gigachad-biceps.png", 1.0, 700, 699, 204, 102, 1.4, 330),         # front double biceps
    ("gigachad-peitoral.png", 1.0, 744, 718, 142, 78, 6.3, 300),        # side chest
    ("gigachad-most-muscular.png", 0.9, 700, 691, 101, 117, 1.2, 280),  # most muscular (the fists at the foot)
    ("gigachad-beijo.png", 1.0, 690, 850, 262, None, None, 380),        # kissing his own muscle: eyes closed, no shades
]
OLHO_LARGURA = 2.35  # the shades' width against the eyes' distance (the first picture's 300 / 130 × 1.02)

# deal-with-it shades, one character a pixel: the bar with the temples, two lenses stepping in at the bottom, the
# white glints in the top left of each lens
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
LENTES = 4.3  # where the eyes go, in pixels from the top (the lenses' middle, a little up)
COBRE = 1.18  # the shades' width against his glasses' (the lenses cover his own round frames)


def setup(ctx):
    W, CAM_H, clock = ctx.W, ctx.CAM_H, ctx.clock
    s = ctx.__dict__
    s["fx_oculos"] = sprite_oculos()
    y, x = np.mgrid[0:CAM_H, 0:W].astype(np.float32)
    cx, cy = GIGA_OLHOS[0] * GIGA_ESCALA - GIGA_X0, GIGA_OLHOS[1] * GIGA_ESCALA
    vignette = 1 - 0.55 * np.clip(np.hypot((x - cx) / W, (y - cy) / CAM_H * 0.8) * 1.6 - 0.25, 0, 1) ** 1.5

    def graded(name):
        giga = np.array(Image.open(ctx.VIDEOS / PARTES / name).convert("RGB").resize((1376, 768), Image.LANCZOS))
        big = cv2.resize(giga, None, fx=GIGA_ESCALA, fy=GIGA_ESCALA, interpolation=cv2.INTER_CUBIC)
        gray = big[:CAM_H, GIGA_X0:GIGA_X0 + W].astype(np.float32).mean(axis=2, keepdims=True)
        gray = np.clip((gray - 128) * 1.12 + 128, 0, 255)  # a little more contrast: the meme's hard light
        return np.repeat(gray * vignette[..., None], 3, axis=2).astype(np.uint8)

    s["fx_giga"] = graded("gigachad.png")  # with his own glasses: recognisably him
    shaded = graded("gigachad-sem-oculos.png")
    gx, gy, gw, ga = GIGA_OLHOS
    draw_oculos(shaded, s["fx_oculos"], gx * GIGA_ESCALA - GIGA_X0, gy * GIGA_ESCALA, gw * GIGA_ESCALA, ga)
    s["fx_giga_oculos"] = shaded
    s["fx_giga_centro"] = (cx, cy)
    s["fx_poses"] = [(shaded, (cx, cy))] + [pose_picture(ctx, *p) for p in POSES]
    s["fx_gol"] = gol_sprites(ctx)
    s["fx_pose"] = poses(ctx)
    s["fx_rng"] = np.random.default_rng(20)


def sprite_oculos(cell=24):
    """The shades as an RGBA picture, `cell` px a pixel (crisp edges, drawn big and scaled down)."""
    h, w = len(OCULOS), len(OCULOS[0])
    out = np.zeros((h * cell, w * cell, 4), np.uint8)
    for r, row in enumerate(OCULOS):
        for c, ch in enumerate(row):
            if ch in "#o":
                out[r * cell:(r + 1) * cell, c * cell:(c + 1) * cell] = (255, 255, 255, 255) if ch == "o" else \
                    (8, 8, 10, 255)
    return out


def draw_oculos(top, sprite, cx, cy, width, angle):
    """The shades on `top` (RGB, edited in place) with the lenses' middle at (cx, cy), `width` px wide, tilted."""
    h, w = sprite.shape[:2]
    k = width / w
    a = math.radians(angle)
    ca, sa = math.cos(a) * k, math.sin(a) * k
    ax, ay = w / 2, LENTES / len(OCULOS) * h  # the sprite's anchor
    m = np.float32([[ca, -sa, cx - (ca * ax - sa * ay)], [sa, ca, cy - (sa * ax + ca * ay)]])
    x0, y0 = max(0, int(cx - width)), max(0, int(cy - width))
    x1, y1 = min(top.shape[1], int(cx + width)), min(top.shape[0], int(cy + width))
    if x1 <= x0 or y1 <= y0:
        return
    m[0, 2] -= x0
    m[1, 2] -= y0
    warped = cv2.warpAffine(sprite, m, (x1 - x0, y1 - y0), flags=cv2.INTER_AREA if k < 1 else cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0)).astype(np.float32)
    alpha = warped[..., 3:4] / 255
    part = top[y0:y1, x0:x1].astype(np.float32)
    top[y0:y1, x0:x1] = (part * (1 - alpha) + warped[..., :3] * alpha).astype(np.uint8)


def pose_picture(ctx, name, k, subject_x, ex, ey, ed, tilt, eyes_y):
    """A pose for the camera's half: the picture scaled by k, centred on the subject, its eyes at eyes_y (never
    leaving a gap at the half's foot), its top edge melting into the black above it, graded like the first one; the
    shades on its eyes. → (picture, eyes)."""
    W, CAM_H = ctx.W, ctx.CAM_H
    im = np.array(Image.open(ctx.VIDEOS / PARTES / name).convert("L").resize((1376, 768), Image.LANCZOS),
                  np.float32)
    small = cv2.resize(im, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    h, w = small.shape
    ox, oy = int(round(W / 2 - subject_x * k)), max(CAM_H - h, int(round(eyes_y - ey * k)))
    fade = np.clip(np.arange(h, dtype=np.float32) / 60, 0, 1)[:, None]  # its top 60 px into black
    canvas = np.zeros((CAM_H, W), np.float32)
    x0, x1 = max(0, ox), min(W, ox + w)
    canvas[oy:, x0:x1] = (small * fade)[:CAM_H - oy, x0 - ox:x1 - ox]
    eyes = (ex * k + ox, ey * k + oy)
    y, x = np.mgrid[0:CAM_H, 0:W].astype(np.float32)
    vignette = 1 - 0.5 * np.clip(np.hypot((x - eyes[0]) / W, (y - eyes[1]) / CAM_H * 0.8) * 1.5 - 0.3, 0, 1) ** 1.5
    gray = np.clip((canvas - 128) * 1.12 + 128, 0, 255) * vignette
    out = np.repeat(gray[..., None], 3, axis=2).astype(np.uint8)
    if ed is not None:
        draw_oculos(out, sprite_oculos(), eyes[0], eyes[1], ed * k * OLHO_LARGURA, tilt)
    return out, eyes


# ---------------------------------------------------------------------------------------------------- the goals


def gol_sprites(ctx):
    """The goals' pieces, in the channel's look: the band (Klein, the live's lattice, cut at 45°), each "Nº GOL" (the
    count Klein on a Branco plate, "GOL" Branco with a dark Klein edge) and the hat-trick meter at each fill."""
    from PIL import ImageDraw, ImageFilter
    W = ctx.W
    c = ctx.cores
    klein, escuro, claro, branco, noite = c["klein"], c["klein_escuro"], c["klein_claro"], c["branco"], c["noite"]
    out = {}
    bw, bh = W + 80, 262
    band = Image.new("RGBA", (bw, bh + 30))
    d = ImageDraw.Draw(band)
    ctx.plate(d, 0, 10, bw, bh, (0, 0, 0, 110), cut=70)
    band = band.filter(ImageFilter.GaussianBlur(9))
    d = ImageDraw.Draw(band)
    ctx.plate(d, 0, 0, bw, bh, klein + (238,), cut=70)
    lattice = Image.new("RGBA", band.size)
    dl = ImageDraw.Draw(lattice)
    for k in range(-bh, bw + bh, 44):  # the live's diagonal lattice, faint
        dl.line([(k, 0), (k + bh, bh)], fill=(255, 255, 255, 22), width=2)
        dl.line([(k + bh, 0), (k, bh)], fill=(255, 255, 255, 22), width=2)
    mask = Image.new("L", band.size)
    ctx.plate(ImageDraw.Draw(mask), 0, 0, bw, bh, 255, cut=70)
    band.paste(lattice, (0, 0), Image.composite(lattice, Image.new("RGBA", band.size), mask))
    d = ImageDraw.Draw(band)
    d.line([(70, 2), (bw, 2)], fill=claro + (255,), width=5)  # a Klein claro edge on top
    out["band"] = np.array(band)
    big, num = ctx.grotesk(176), ctx.grotesk(104)
    for n in (1, 2, 3):
        word, count = "GOL", f"{n}º"
        b = big.getbbox(word)
        gw, gh = b[2] - b[0], b[3] - b[1]
        nb = num.getbbox(count)
        pw, ph = (nb[2] - nb[0]) + 52, gh + 6
        gap, edge, pad = 26, 11, 30
        w, h = pw + gap + gw + 2 * pad + 2 * edge, gh + 2 * pad + 2 * edge
        img = Image.new("RGBA", (w, h))
        sh = Image.new("RGBA", (w, h))
        ds = ImageDraw.Draw(sh)
        ctx.plate(ds, pad + 6, (h - ph) / 2 + 9, pw, ph, (0, 0, 0, 150))
        ds.text((pad + pw + gap + edge - b[0] + 6, pad + edge - b[1] + 9), word, font=big, fill=(0, 0, 0, 160),
                stroke_width=edge, stroke_fill=(0, 0, 0, 160))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
        d = ImageDraw.Draw(img)
        ctx.plate(d, pad, (h - ph) / 2, pw, ph, branco + (255,))
        d.text((pad + 26 - nb[0], (h - ph) / 2 + (ph - (nb[3] - nb[1])) / 2 - nb[1]), count, font=num, fill=klein)
        d.text((pad + pw + gap + edge - b[0], pad + edge - b[1]), word, font=big, fill=branco, stroke_width=edge,
               stroke_fill=escuro)
        out[f"texto{n}"] = np.array(img)
    small = ctx.grotesk(40)
    for filled in range(4):  # the meter with 0-3 slots filled
        label = "HAT-TRICK"
        lb = small.getbbox(label)
        sw, sh_, sgap = 104, 38, 16
        lw = lb[2] - lb[0] + 24  # letter-spaced below
        w, h = lw + 22 + 3 * sw + 2 * sgap + 40, sh_ + 40
        img = Image.new("RGBA", (w, h))
        d = ImageDraw.Draw(img)
        x = 20
        for ch in label:  # tracked out a little
            d.text((x, 20 + (sh_ - (lb[3] - lb[1])) / 2 - lb[1]), ch, font=small, fill=branco)
            x += small.getlength(ch) + 24 / len(label)
        x = 20 + lw + 22
        for k in range(3):
            if k < filled:
                ctx.plate(d, x, 20, sw, sh_, branco + (255,), cut=10)
            else:
                ctx.plate(d, x, 20, sw, sh_, claro + (255,), cut=10)
                ctx.plate(d, x + 3, 23, sw - 6, sh_ - 6, noite + (255,), cut=8)
            x += sw + sgap
        out[f"medidor{filled}"] = np.array(img)
        out["slot_x"] = [20 + lw + 22 + k * (sw + sgap) + sw / 2 - w / 2 for k in range(3)]  # from the meter's middle
    ring = Image.new("RGBA", (140, 80))
    d = ImageDraw.Draw(ring)
    ctx.plate(d, 4, 4, 132, 72, branco + (255,), cut=14)
    ctx.plate(d, 10, 10, 120, 60, (0, 0, 0, 0), cut=12)
    out["anel"] = np.array(ring)
    return out


def gol_label(f, o, ctx):
    """The goal's label at short second o, if one is on: the band wiping in from the left, "Nº GOL" slamming, the
    meter popping in and its slot filling with a ring, then everything wiping out to the right."""
    W, clock, s = ctx.W, ctx.clock, ctx.__dict__
    g = s["fx_gol"]
    for live, k in GOLS:
        t0 = clock.out(live, k)
        x = o - t0
        if not 0 <= x < GOL_DUR:
            continue
        n = GOLS.index((live, k)) + 1
        out_u = ctx.ease((x - (GOL_DUR - 0.14)) / 0.14) if x > GOL_DUR - 0.14 else 0.0
        dx = W * out_u  # leaving to the right
        shake = 7 * math.exp(-x / 0.1) * math.sin(x * 140) if x < 0.4 else 0.0
        inn = 1 - (1 - min(1.0, x / 0.1)) ** 3  # the band, in from the left
        bx = -W + W * inn  # its left edge, from -W to 0
        band = g["band"]
        ctx.place(f, band, bx - 40 + band.shape[1] / 2 + dx, GOL_Y + band.shape[0] / 2 - 131 + shake, 1.0, 1.0)
        if x >= 0.04:  # "Nº GOL" slams
            y = x - 0.04
            sc = 1 + 0.9 * (1 - ctx.ease(y / 0.12)) if y < 0.12 else 1 + 0.05 * math.exp(-(y - 0.12) * 12) * \
                math.cos((y - 0.12) * 40)
            ctx.place(f, g[f"texto{n}"], W / 2 + dx, GOL_Y - 38 + shake, sc, min(1.0, y / 0.05))
        if x >= 0.16:  # the meter, then its slot filling
            y = x - 0.16
            fill_at = 0.12
            filled = n if y >= fill_at else n - 1
            if n == 3 and y >= fill_at + 0.25:  # the third: the whole meter blinking Branco/Klein claro
                filled = 3 if int((y - fill_at - 0.25) / 0.08) % 2 == 0 else 0
                filled = 3 if y > fill_at + 0.25 + 0.48 else filled
            sc = 1 + 0.25 * (1 - ctx.ease(y / 0.1)) if y < 0.1 else 1.0
            my = GOL_Y + 82 + shake
            ctx.place(f, g[f"medidor{filled}"], W / 2 + dx, my, sc, min(1.0, y / 0.06))
            z = y - fill_at
            if 0 <= z < 0.25:  # the ring flying off the slot as it fills
                ctx.place(f, g["anel"], W / 2 + g["slot_x"][n - 1] + dx, my, 0.8 + 1.4 * z / 0.25, 1 - z / 0.25)
        return f
    return f


def depois(f, o, ctx):
    return gol_label(f, o, ctx)


# ---------------------------------------------------------------------------------------------------- tracking


def poses(ctx):
    """His glasses (x, y, width, angle) in each frame of the last stretch up to the drop, from the clean picture
    (limpo.mp4, so the very pixels the short shows), cached by the stretch's place in the short."""
    W, CAM_H, FPS = ctx.W, ctx.CAM_H, ctx.FPS
    a = round(ctx.clock.out(REVEAL, FIM) * FPS)
    b = round(ctx.clock.out(DROP + 0.1, FIM) * FPS)
    key = hashlib.sha1(repr((a, b, OLHOS_REF, ctx.clock.spans)).encode()).hexdigest()[:8]
    cache = ctx.work / f"hat-trick-olhos-{key}.json"
    if cache.exists():
        return {int(k): v for k, v in json.loads(cache.read_text()).items()}
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a / FPS:.4f}", "-i", "limpo.mp4", "-frames:v", str(b - a),
                          "-vf", f"crop={W}:{CAM_H}:0:0,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True, cwd=ctx.work).stdout
    gray = list(np.frombuffer(raw, np.uint8).reshape(-1, CAM_H, W))
    # the measured glasses, found again in this render's first frame (the camera's sync may move it a pixel)
    ref = cv2.imread(str(ctx.VIDEOS / PARTES / "olhos-ref.png"), cv2.IMREAD_GRAYSCALE)
    rx, ry, rw = OLHOS_REF
    x0, y0 = int(rx - ref.shape[1] / 2), int(ry - ref.shape[0] / 2)
    pad = 40
    area = gray[0][y0 - pad:y0 + ref.shape[0] + pad, x0 - pad:x0 + ref.shape[1] + pad]
    score = cv2.matchTemplate(area, ref, cv2.TM_CCOEFF_NORMED)
    _, best, _, (mx, my) = cv2.minMaxLoc(score)
    if best < 0.6:
        raise SystemExit(f"hat-trick: os óculos dele não foram achados no trecho final ({best:.2f})")
    start = (rx + mx - pad, ry + my - pad, rw)
    ms = track(gray, (int(start[0] - 120), int(start[1] - 63), int(start[0] + 123), int(start[1] + 62)))
    out = []
    for m in ms:
        c = cv2.transform(np.float32([[start[:2]]]), m)[0, 0]
        out.append([float(c[0]), float(c[1]), rw * math.hypot(m[0, 0], m[1, 0]),
                    math.degrees(math.atan2(m[1, 0], m[0, 0]))])
    arr = np.array(out)
    k = 5  # a light moving average: LK's last-pixel jitter
    smooth = np.array([arr[max(0, i - k // 2):i + k // 2 + 1].mean(axis=0) for i in range(len(arr))])
    result = {a + i: smooth[i].tolist() for i in range(len(smooth))}
    cache.write_text(json.dumps(result))
    print(f"  hat-trick: óculos seguidos em {len(result)} quadros (achado {best:.2f})")
    return result


def track(gray, region):
    """Similarity transforms taking the first frame's points to each frame's: corners in `region` (his glasses and
    brows, not the mouth, which talks) followed by Lucas-Kanade with a forward-backward check, re-seeded when few."""
    x0, y0, x1, y1 = region
    mask = np.zeros_like(gray[0])
    mask[y0:y1, x0:x1] = 255
    lk = dict(winSize=(31, 31), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
    pts = cv2.goodFeaturesToTrack(gray[0], 120, 0.01, 6, mask=mask)
    ref = pts.copy()
    out = [np.float32([[1, 0, 0], [0, 1, 0]])]
    for i in range(1, len(gray)):
        p1, st, _ = cv2.calcOpticalFlowPyrLK(gray[i - 1], gray[i], pts, None, **lk)
        pb, st2, _ = cv2.calcOpticalFlowPyrLK(gray[i], gray[i - 1], p1, None, **lk)
        ok = (st[:, 0] == 1) & (st2[:, 0] == 1) & (np.linalg.norm((pb - pts)[:, 0], axis=1) < 0.7)
        pts, ref = p1[ok], ref[ok]
        m, _ = cv2.estimateAffinePartial2D(ref, pts, method=cv2.RANSAC, ransacReprojThreshold=2.0)
        out.append(m if m is not None else out[-1])
        if len(pts) < 25:
            c = cv2.transform(np.float32([[[x0, y0]], [[x1, y1]]]), out[-1])[:, 0]
            mask = np.zeros_like(gray[i])
            mask[int(c[0, 1]):int(c[1, 1]), int(c[0, 0]):int(c[1, 0])] = 255
            pts = cv2.goodFeaturesToTrack(gray[i], 120, 0.01, 6, mask=mask)
            ref = cv2.transform(pts, cv2.invertAffineTransform(out[-1]))
    return out


# ---------------------------------------------------------------------------------------------------- the frames


def zoom_top(top, z, center, dx=0.0, dy=0.0):
    if abs(z - 1) < 1e-3 and not dx and not dy:
        return top
    cx, cy = center
    m = np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])
    return cv2.warpAffine(top, m, (top.shape[1], top.shape[0]), flags=cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REFLECT101)


def grain(top, rng, amount=9.0):
    noise = rng.normal(0, amount, top.shape[:2]).astype(np.float32)[..., None]
    return np.clip(top.astype(np.float32) + noise, 0, 255).astype(np.uint8)


def flash(top, a, color=(255, 255, 255)):
    if a > 0.004:
        top[:] = (top.astype(np.float32) * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)


def kick(x, size, tau):
    return size * math.exp(-x / tau) if x >= 0 else 0.0


def redo_transition(f, top, o, ctx):
    """The roteiro's transitions were applied to the frame before this hook; a picture put in their window gets the
    same sweep (destaque.Effects.transition, the camera's half only; the rows the zoom fills from the game's half
    keep what it drew)."""
    W, H, CAM_H = ctx.W, ctx.H, ctx.CAM_H
    before, after = 0.12, 0.2
    for c, t in zip(ctx.clock.starts[1:], ctx.roteiro["trechos"][1:]):
        kind, x = t.get("entrada", "whip"), o - c
        if kind == "seco" or not -before <= x < after:
            continue
        u = ((x + before) / before) ** 2 if x < 0 else (1 - x / after) ** 2
        rows = CAM_H
        if kind == "whip":
            dx = -0.5 * W * u if x < 0 else 0.5 * W * u
            top = cv2.warpAffine(top, np.float32([[1, 0, dx], [0, 1, 0]]), (W, CAM_H), flags=cv2.INTER_LINEAR,
                                 borderMode=cv2.BORDER_REFLECT101)
            k = 1 + int(140 * u)
            if k > 1:
                top = cv2.blur(top, (k, 1))
        elif kind == "zoom":
            z = 1 + 0.2 * u
            canvas = np.zeros((H, W, 3), np.uint8)
            canvas[:CAM_H] = top
            m = np.float32([[z, 0, (1 - z) * W / 2], [0, z, (1 - z) * H / 2]])
            canvas = cv2.warpAffine(canvas, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
            k = 1 + int(24 * u)
            if k > 1:
                canvas = cv2.blur(canvas, (k, k))
            rows = int(H / 2 - (H / 2 - CAM_H) * z) - 1
            top = canvas[:CAM_H]
        if kind in ("zoom", "flash"):
            flash(top, (0.55 if kind == "zoom" else 0.85) * math.exp(-abs(x) / 0.05))
        f[:rows] = top[:rows]
        return True
    return False


def antes(f, o, ctx):
    W, CAM_H, clock, FPS = ctx.W, ctx.CAM_H, ctx.clock, ctx.FPS
    s = ctx.__dict__
    rng = s["fx_rng"]
    t0, t1 = clock.starts[TEASER], clock.starts[TEASER + 1]
    if t0 <= o < t1:  # the hook: the Gigachad in the shades, kicking in with the drop's first hit
        x = o - t0
        z = 1 + 0.06 * min(1, x / (t1 - t0)) + kick(x, 0.14, 0.09)
        dx, dy = kick(x, 9, 0.1) * math.sin(x * 120), kick(x, 9, 0.1) * math.cos(x * 95)
        top = grain(zoom_top(s["fx_giga_oculos"], z, s["fx_giga_centro"], dx, dy), rng)
        if not redo_transition(f, top, o, ctx):
            f[:CAM_H] = top
        return f
    a, b = clock.out(CORUJA[0], GOL1), clock.out(CORUJA[1], GOL1)
    if a <= o < b:  # calling the top corner: the Gigachad cuts in
        x = o - a
        z = 1 + 0.05 * x / (b - a) + kick(x, 0.16, 0.08)
        top = grain(zoom_top(s["fx_giga"], z, s["fx_giga_centro"]), rng)
        flash(top, kick(x, 0.4, 0.05))
        f[:CAM_H] = top
        return f
    r, d = clock.out(REVEAL, FIM), clock.out(DROP, FIM)
    if r <= o < d:  # deal with it: his face, the shades sliding down, the camera pushing in
        top = f[:CAM_H].copy()
        n = int(round(o * FPS))
        pose = s["fx_pose"].get(n) or s["fx_pose"][max(k for k in s["fx_pose"] if k <= n)]
        px, py, pw, pa = pose
        sa, sb = clock.out(SLIDE[0], FIM), clock.out(SLIDE[1], FIM)
        u = min(1, max(0, (o - sa) / (sb - sa)))
        u = u if u < 0.85 else 0.85 + (1 - (1 - (u - 0.85) / 0.15) ** 2) * 0.15  # steady, settling at the end
        start_y = -0.4 * pw
        if o >= sa:
            draw_oculos(top, s["fx_oculos"], px, start_y + (py - start_y) * u, pw * COBRE, pa * u)
        e = ctx.ease((o - r) / (d - r))
        z = 1 + 0.32 * e
        # the push's centre lands his eyes a little above the half's middle at full zoom: p = (m' - z·m) / (1 - z)
        zf = 1.32
        m0, m1 = np.array(OLHOS_REF[:2]), np.array((W / 2, 470.0))
        center = tuple((m1 - zf * m0) / (1 - zf))
        center = (center[0], min(center[1], CAM_H))
        top = zoom_top(top, z, center)
        flash(top, kick(o - r, 0.85, 0.07))
        f[:CAM_H] = top
        return f
    if o >= d:  # the drop: the Gigachad in the shades, then a bodybuilding pose on every 808
        x = o - d
        k = max(i for i, h in enumerate(HITS) if x >= h)
        h = HITS[k]
        picture, eyes = s["fx_poses"][k]
        z = 1 + 0.04 * min(1, (x - h) / 0.4) + kick(x - h, 0.3 if k == 0 else 0.13, 0.08)
        amp = kick(x - h, 14 if k == 0 else 9, 0.09)
        dx, dy = amp * math.sin((x - h) * 130 + h), amp * math.cos((x - h) * 105 + h)
        top = grain(zoom_top(picture, z, eyes, dx, dy), rng)
        flash(top, kick(x, 0.9, 0.06) if k == 0 else kick(x - h, 0.35, 0.04))
        f[:CAM_H] = top
        return f
    return f


# ---------------------------------------------------------------------------------------------------- the sound


def _env(t, attack, tau):
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / tau)


def peak1(x):
    return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def band(x, lo=None, hi=None, SR=48000):
    """x through a gentle band (FFT, raised-cosine edges an octave wide): no scipy here."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= np.clip(np.log2(np.maximum(f, 1) / (lo / 2)), 0, 1) ** 2
    if hi:
        g *= np.clip(np.log2(hi * 2 / np.maximum(f, 1)), 0, 1) ** 2
    return np.fft.irfft(X * g, len(x)).astype(np.float32)


def kick808(SR, length=0.9, drive=2.2, f_end=55.0):
    """A distorted 808: a sine falling 170 → ~55 Hz with a long tail, plus what a phone can play: its growl (the
    same sine clipped hard, 180 Hz-2.5 kHz) and a knock on the attack."""
    t = np.arange(int(length * SR)) / SR
    f = f_end + (170 - f_end) * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(t, 0.002, length / 2.2)
    growl = band(np.tanh(7 * body), 180, 2500, SR)
    knock = band(np.random.default_rng(3).standard_normal(len(t)), 1200, 6000, SR) * np.exp(-t / 0.006)
    return peak1(np.tanh(drive * body) + 1.7 * peak1(growl) * np.exp(-t / (length / 3)) + 0.6 * peak1(knock))


def drop(SR, length):
    """The bass drop: the big 808 with a clap and a crash, then 808s on the beat (HITS),
    `length` s long (to the short's end) with a short fade, so nothing is cut off mid-tail."""
    n = int(length * SR)
    out = np.zeros(n, np.float32)
    t = np.arange(int(1.4 * SR)) / SR
    rng = np.random.default_rng(8)
    clap = np.zeros_like(t)
    for k, delay in enumerate((0.0, 0.011, 0.023)):  # a clap is a few bursts
        i = int(delay * SR)
        clap[i:] += rng.standard_normal(len(t) - i) * np.exp(-t[:len(t) - i] / (0.012 if k < 2 else 0.1))
    clap = band(clap, 900, 5000, SR)
    crash = band(rng.standard_normal(len(t)), 3000, None, SR) * _env(t, 0.001, 0.35)
    big = np.tanh(1.4 * kick808(SR, 1.4, 2.6)) + 0.55 * peak1(clap) + 0.3 * peak1(crash)
    out[:min(n, len(big))] += big[:n]
    for h in HITS[1:]:
        k = kick808(SR, 0.45, 2.0) * 0.75
        i = int(h * SR)
        if i < n:
            out[i:i + len(k)] += k[:n - i]
    f = int(0.08 * SR)
    out[-f:] *= np.linspace(1, 0, f)
    # no sub under 40 Hz: it only ate the headroom (destaque's loudnorm went dynamic and its limiter pumped on it,
    # and the AAC encoder overshot to +1.5 dBTP there, 11-20)
    return peak1(band(out, 40, None, SR))


def sting(SR):
    """The Gigachad's sting: a deep boom under a dark brass chord swelling and falling (a cinematic "braaam"), the
    brass where a phone plays it (D minor from D2 to A3)."""
    t = np.arange(int(1.6 * SR)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(52 + 60 * np.exp(-t / 0.08)) / SR) * _env(t, 0.003, 0.4)
    chord = np.zeros_like(t)
    for f0 in (73.42, 110.0, 146.83, 174.61, 220.0):
        for d in (-0.006, 0.0, 0.007):
            ph = 2 * np.pi * np.cumsum(np.full(len(t), f0 * (1 + d))) / SR
            chord += sum(np.sin(k * ph) / k for k in range(1, 16))  # a saw, band-limited
    # a one-pole low-pass opening and closing: the brass's "waah"
    cut = 400 + 2200 * np.exp(-((t - 0.15) / 0.3) ** 2)
    a = np.exp(-2 * np.pi * cut / SR)
    y, acc = np.zeros_like(chord), 0.0
    for i in range(len(chord)):
        acc = (1 - a[i]) * chord[i] + a[i] * acc
        y[i] = acc
    brass = peak1(np.tanh(2.0 * peak1(y))) * np.minimum(1, t / 0.05) * np.exp(-t / 0.75)
    hit = band(np.random.default_rng(5).standard_normal(len(t)), 800, 8000, SR) * np.exp(-t / 0.012)
    return peak1(np.tanh(1.2 * (0.9 * boom + 1.0 * brass + 0.6 * peak1(hit))))


def poof(SR):
    """The costume going: a puff of noise falling in pitch, with a soft thump."""
    t = np.arange(int(0.45 * SR)) / SR
    rng = np.random.default_rng(12)
    noise = rng.standard_normal(len(t))
    # a moving band: noise through a resonant filter swept down (state-variable, per sample)
    f = 3200 * (350 / 3200) ** (t / 0.45)
    low = band = 0.0
    out = np.zeros_like(t)
    for i in range(len(t)):
        g = 2 * math.sin(math.pi * f[i] / SR)
        high = noise[i] - low - 0.6 * band
        band += g * high
        low += g * band
        out[i] = band
    thump = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t / 0.05) + 50) / SR) * np.exp(-t / 0.06)
    return peak1(peak1(out) * _env(t, 0.006, 0.12) + 0.6 * thump)


def mwah(SR):
    """A cartoon kiss: the lips' squeak gliding up, then the smack."""
    t = np.arange(int(0.3 * SR)) / SR
    squeak = np.sin(2 * np.pi * np.cumsum(850 + 1100 * np.minimum(1, t / 0.07)) / SR) * \
        np.minimum(1, t / 0.01) * np.clip((0.09 - t) / 0.03, 0, 1)
    smack = band(np.random.default_rng(9).standard_normal(len(t)), 1400, 5000, SR)
    smack = np.roll(smack * np.exp(-t / 0.012), int(0.085 * SR))
    smack[:int(0.085 * SR)] = 0
    pop = np.sin(2 * np.pi * np.cumsum(420 * np.exp(-np.maximum(0, t - 0.085) / 0.02) + 180) / SR) * \
        (t >= 0.085) * np.exp(-np.maximum(0, t - 0.085) / 0.03)
    return peak1(0.6 * squeak + 1.0 * peak1(smack) + 0.5 * pop)


def chime(SR, notes):
    """The meter's chime: bell notes one after another (a goal's slot: one note more each goal)."""
    t = np.arange(int((0.07 * len(notes) + 0.7) * SR)) / SR
    out = np.zeros_like(t)
    for i, f0 in enumerate(notes):
        tt = t - 0.07 * i
        on = tt >= 0
        tt = np.maximum(tt, 0)
        bell = sum(a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt / d)
                   for r, a, d in ((1, 1.0, 0.35), (2.0, 0.45, 0.2), (3.01, 0.25, 0.12), (4.2, 0.12, 0.07)))
        out += bell * on * np.minimum(1, tt / 0.002)
    return peak1(out)


def riser(SR, length):
    """Into the drop: noise and a tone rising together, swelling to the hit."""
    t = np.arange(int(length * SR)) / SR
    u = t / length
    f = 180 * (1100 / 180) ** (u ** 1.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    rng = np.random.default_rng(4)
    noise = rng.standard_normal(len(t))
    hp = noise - np.convolve(noise, np.ones(12) / 12, mode="same")  # the hiss's top
    return peak1((0.6 * tone + 0.8 * peak1(hp) * u) * u ** 2.2)


def sons(ctx):
    SR, clock = ctx.SR, ctx.clock
    r, d = clock.out(REVEAL, FIM), clock.out(DROP, FIM)
    hook = kick808(SR, 0.7, 2.4)
    return [
        (clock.starts[TEASER], hook, -11),
        (clock.out(CORUJA[0], GOL1) - 0.004, sting(SR), -13),
        (clock.out(CORUJA[0], GOL1), "impact-boom", -13),
        (r - 0.02, poof(SR), -13),
        (clock.out(SLIDE[0], FIM), riser(SR, d - clock.out(SLIDE[0], FIM)), -16),
        (d, drop(SR, clock.length - d), -10),
        (d, "impact-boom", -10),
        (d + 0.02, "buzina", -15),  # the MLG air horn on the landing
        (d + HITS[-1] + 0.02, mwah(SR), -9),  # the kiss to his own muscle
    ] + [(clock.out(live, k) + 0.28, chime(SR, (1046.5, 1318.5, 1568.0, 2093.0)[:n + (n == 3)]), -15)
         for n, (live, k) in enumerate(GOLS, 1)]
