"""Montanha-russa do Champion (2026-11-20): the short's own effects, destaque.py's "extra".

Luan, round 1 (11-20): the shock's idea was excellent (the zap, the flicker, the picture swapping) but no drawings of
him; the demotion as the Champion emblem breaking into Diamond, then evolving back. Round 2 (11-21): "NOSSA SENHORA eu
estou IMPRESSIONADO"; the Pokémon evolution and the rain with the sad sound stay; the cats weren't at the level of the
other reels (his real cat made angelic, the photoreal Gigachad of him): photoreal edits of HIM instead; a crowd
singing "É campeão" under the promotion.

- the promotion (hook): a stadium crowd chanting "É campeão!" from the game's flash (2505.4); Diamond III charging on
  the game's half and bursting into Champion I with rays on that flash;
- "choque de realidade": his camera swaps with a photoreal him electrocuted (hair on end, arcs) and its X-ray
  skeleton, and back to the live's own flickering frame, every 0.27 s, shaking; smoke off his head after;
- "a gente caiu": Champion I on the live's Klein, cracking on each "caiu" and shattering (shards, glints) into
  Diamond III;
- "subiu pro Champion de volta": the evolution meme: a game dialog ("O quê? DIAMANTE III está evoluindo!"),
  the two silhouettes swapping faster and faster over a rising chiptune, Champion I bursting out;
- "alegria de pobre dura pouco": "alegria": photoreal him "ostentando" (crown, gold chains, shades, a fan of notes)
  under a rain of money, ka-ching; "dura": a record scratch, everything stops and greys; the money rain turns into
  real rain; "é bom lembrar disso": him drenched, sad, one soggy note, over the sad trombone.

The pictures of him are Gemini edits of his own Câmera.mkv frames (Luan OK'd it), in Videos\Shorts\Partes\champion\
(eu-*.png); the chant's voices are edge-tts's (coro\, 11 voices × 2), layered here. Every other sound is synthesised.
"""
import math

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from edicao import svf_bandpass

S = {}  # everything setup builds: pictures, shards, the beats' short seconds
PARTES = "Lives/2026-11-20/Shorts/Partes/champion"
PIXEL = ".claude/skills/short-editing/engine/fonts/GeistPixel-Square.woff2"
ROXO, CIANO = (0.72, 0.45, 1.0), (0.35, 0.85, 1.0)


# ---------------------------------------------------------------------------------------------------- pictures


def premul(im):
    """uint8 RGBA → float32 RGBA in 0..1, colour premultiplied by alpha (no dark fringes when warped)."""
    x = im.astype(np.float32) / 255
    x[..., :3] *= x[..., 3:4]
    return x


def fit(im, h):
    return cv2.resize(im, (max(1, round(im.shape[1] * h / im.shape[0])), h), interpolation=cv2.INTER_AREA)


def blit(f, spr, cx, cy, scale=1.0, angle=0.0, alpha=1.0, sx=1.0, add=False):
    """A premultiplied RGBA sprite onto the RGB frame, centred on (cx, cy): scaled, rotated (degrees), squashed along
    its own x by sx (negative mirrors: a shard turning over), over (or added to) what's there."""
    if alpha <= 0.004 or scale <= 0.01 or abs(sx) < 0.02:
        return
    h, w = spr.shape[:2]
    c, s = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    A = np.array([[c, -s], [s, c]]) @ np.diag([scale * sx, scale])
    corners = np.array([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) @ A.T + [cx, cy]
    x0, y0 = np.floor(corners.min(0)).astype(int) - 1
    x1, y1 = np.ceil(corners.max(0)).astype(int) + 1
    X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(f.shape[1], x1), min(f.shape[0], y1)
    if X1 <= X0 or Y1 <= Y0:
        return
    t = np.array([cx - X0, cy - Y0]) - A @ np.array([w / 2, h / 2])
    M = np.hstack([A, t[:, None]]).astype(np.float32)
    out = cv2.warpAffine(spr, M, (X1 - X0, Y1 - Y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                         borderValue=(0, 0, 0, 0))
    roi = f[Y0:Y1, X0:X1].astype(np.float32) / 255
    if add:
        roi = roi + out[..., :3] * alpha
    else:
        roi = roi * (1 - out[..., 3:4] * alpha) + out[..., :3] * alpha
    f[Y0:Y1, X0:X1] = (np.clip(roi, 0, 1) * 255 + 0.5).astype(np.uint8)


def silhouette(em, color, glow=26):
    """The emblem's shape in white with a coloured glow around it (premultiplied): the evolution's flashing form."""
    a = np.clip((em[..., 3] - 0.3) / 0.4, 0, 1)
    pad = glow * 2
    a = np.pad(a, pad)
    halo = cv2.GaussianBlur(a, (0, 0), glow) * 1.6
    out = np.zeros(a.shape + (4,), np.float32)
    out[..., :3] = np.array(color, np.float32) * np.clip(halo, 0, 1)[..., None] * (1 - a[..., None])
    out[..., :3] += a[..., None]
    out[..., 3] = np.clip(a + np.clip(halo, 0, 1) * 0.85, 0, 1)
    return out


def radial(size, color, power=2.0):
    """A soft round glow (premultiplied), for behind an emblem and the shatter's burst."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / (size - 1) * 2 - 1
    a = np.clip(1 - np.sqrt(x ** 2 + y ** 2), 0, 1) ** power
    out = np.zeros((size, size, 4), np.float32)
    out[..., :3] = np.array(color, np.float32) * a[..., None]
    out[..., 3] = a
    return out


def rays(size, color, n=14):
    """Light rays from the centre, soft wedges fading out (premultiplied, drawn added)."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / (size - 1) * 2 - 1
    r, th = np.sqrt(x ** 2 + y ** 2), np.arctan2(y, x)
    wedge = np.clip((np.cos(th * n) - 0.55) / 0.45, 0, 1) ** 1.5
    a = wedge * np.clip(1 - r, 0, 1) ** 1.2 * np.clip(r / 0.18, 0, 1)
    out = np.zeros((size, size, 4), np.float32)
    out[..., :3] = np.array(color, np.float32) * a[..., None]
    out[..., 3] = a
    return out


def star(size=96):
    """A four-pointed sparkle with a glow (premultiplied, drawn added)."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / (size - 1) * 2 - 1
    core = np.clip(1 - (np.abs(x) ** 0.5 + np.abs(y) ** 0.5) / 0.9, 0, 1) ** 1.3
    glow = np.clip(1 - np.sqrt(x ** 2 + y ** 2), 0, 1) ** 3 * 0.6
    a = np.clip(core * 1.6 + glow, 0, 1)
    out = np.zeros((size, size, 4), np.float32)
    out[..., :3] = a[..., None]
    out[..., 2] = np.clip(a * 1.0 + glow * 0.3, 0, 1)
    out[..., 3] = a
    return out


def ease_out(x):
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def back(x, k=1.9):
    """Ease out with an overshoot (a pop)."""
    x = min(1.0, max(0.0, x))
    return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2


def desaturate(f, k, tint=(0.9, 0.97, 1.12), dark=0.1):
    """Towards a cold grey: "a alegria acabou"."""
    if k <= 0.004:
        return
    x = f.astype(np.float32)
    g = x @ np.array([0.299, 0.587, 0.114], np.float32)
    grey = g[..., None] * np.array(tint, np.float32) * (1 - dark)
    f[:] = np.clip(x * (1 - k) + grey * k, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------------------------------- the shards


def shatter_plan(em, impact, rng):
    """Champion I cracked like struck glass: jagged radial cracks out of the impact and concentric ones bowing between
    them (a spider web), the shards being the cells they cut. Returns the shards (sprite, centre, a darker back side for
    when one turns over), the cracks as drawn lines and each pixel's distance from the impact (they spread from it)."""
    h, w = em.shape[:2]
    imp = np.array(impact, np.float64)
    n_rad = 9
    base = (np.arange(n_rad) + rng.uniform(-0.28, 0.28, n_rad)) * 2 * math.pi / n_rad + rng.uniform(0, 2 * math.pi)
    radials = []
    for th in base:
        pts, r = [imp.copy()], 0.0
        while r < 460:
            r += rng.uniform(14, 28)
            th += rng.normal(0, 0.085)
            pts.append(imp + r * np.array([math.cos(th), math.sin(th)]))
        radials.append(np.array(pts))
    segments = list(radials)
    for j, ring in enumerate((38, 92, 160, 238, 320)):
        on = []
        for rad in radials:
            d = np.linalg.norm(rad - imp, axis=1)
            on.append(rad[np.argmin(np.abs(d - ring * rng.uniform(0.85, 1.15)))])
        for k in range(n_rad):
            if j == 0 or rng.random() < 0.82:
                a, b = on[k], on[(k + 1) % n_rad]
                mid = (a + b) / 2
                mid = mid + (imp - mid) * rng.uniform(0.0, 0.12)  # bowed in a little, as glass does
                segments.append(np.array([a, mid, b]))
    cut = np.zeros((h, w), np.uint8)
    drawn = np.zeros((h, w), np.float32)
    for seg in segments:
        cv2.polylines(cut, [np.round(seg).astype(np.int32)], False, 1, 2, cv2.LINE_8)
        cv2.polylines(drawn, [np.round(seg * 4).astype(np.int32)], False, 1.0, 3, cv2.LINE_AA, shift=2)
    alpha = em[..., 3]
    inside = ((alpha > 0.03) & (cut == 0)).astype(np.uint8)
    n, label = cv2.connectedComponents(inside, connectivity=4)
    shards = []
    for i in range(1, n):
        m = label == i
        if m.sum() < 40:
            continue
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        mask = cv2.dilate(m[y0:y1, x0:x1].astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
        spr = em[y0:y1, x0:x1] * mask[..., None]
        edge = mask - cv2.erode(mask, np.ones((3, 3), np.uint8))
        lit = np.clip(edge * (alpha[y0:y1, x0:x1] > 0.3), 0, 1)[..., None] * 0.85
        spr[..., :3] = spr[..., :3] * (1 - lit) + lit * spr[..., 3:4]  # a bright glass edge
        spr = np.pad(spr, ((2, 2), (2, 2), (0, 0)))
        dark = spr.copy()
        dark[..., :3] *= 0.55
        c = np.array([(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2], np.float32)
        shards.append({"spr": spr, "dark": dark, "c": c})
    lines = drawn * np.clip((alpha - 0.25) / 0.2, 0, 1)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dist = np.sqrt((xx - impact[0]) ** 2 + (yy - impact[1]) ** 2)
    # flight: out from the impact (the small shards by it fastest), a kick up, spinning and turning over
    out = np.array(impact, np.float32) - np.array([w / 2, h / 2], np.float32)
    for s in shards:
        v = s["c"] - out
        near = np.linalg.norm(v)
        v = v / (near + 1e-3) + rng.normal(0, 0.3, 2)
        speed = rng.uniform(300, 800) * (1.5 - 0.6 * min(1.0, near / 200))
        s["v"] = v / (np.linalg.norm(v) + 1e-3) * speed + np.array([0, -rng.uniform(250, 700)])
        s["w"] = rng.choice([-1, 1]) * rng.uniform(140, 620)
        s["a0"] = rng.uniform(-10, 10)
        s["wf"] = rng.choice([-1, 1]) * rng.uniform(5, 14)
        s["phi"] = rng.uniform(0, 0.4)
    return shards, lines, dist


# ---------------------------------------------------------------------------------------------------- setup


def setup(ctx):
    T = ctx.clock.out
    rng = np.random.default_rng(2011)
    ranks = ctx.ROOT / "brand" / "youtube" / "thumbnails" / "ranks"
    champion = np.array(Image.open(ranks / "champion.png").convert("RGBA"))
    diamond = np.array(Image.open(ranks / "diamond-3.png").convert("RGBA"))
    eu = {n: np.array(Image.open(ctx.VIDEOS / PARTES / f"eu-{n}.png").convert("RGB").resize((1080, 1080),
                                                                                           Image.LANCZOS))
          for n in ("choque", "raiox", "rico", "molhado")}
    S.update(
        # the beats, as short seconds (live seconds through the clock)
        promo_in=T(2504.62), promo_burst=T(2505.4), promo_out=T(2508.95),
        shock_in=T(2980.85), shock_x=T(2980.97), shock_end=T(2981.95), shock_out=T(2982.85),
        fall_in=T(3553.9), crack1=T(3554.42), crack2=T(3555.44), shatter=T(3555.8), fall_end=T(3558.43),
        evo_in=T(7947.26), evo_white=T(7947.45), evo_flick=T(7947.66), evo_reveal=T(7949.54), evo_end=T(7951.4),
        text1=T(7947.33), text2=T(7949.66), hold=T(7950.1),
        party=T(7976.32), dura=T(7978.14), sad=T(7979.16), party_end=T(7981.86),
    )
    # the promotion: on the game's half, under the title
    S["p_dia"] = premul(fit(diamond, 290))
    S["p_dia_w"] = silhouette(premul(fit(diamond, 290)), CIANO, 18)
    S["p_cha"] = premul(fit(champion, 330))
    # the demotion, on the live's Klein
    big = premul(fit(champion, 500))
    S["f_cha"] = big
    S["f_dia"] = premul(fit(diamond, 440))
    S["f_cha_w"] = silhouette(big, ROXO, 20)
    impact = (big.shape[1] * 0.5 + 18, big.shape[0] * 0.42)
    S["shards"], S["cracks"], S["dist"] = shatter_plan(big, impact, rng)
    S["impact"] = impact
    # the evolution
    S["e_dia"] = premul(fit(diamond, 380))
    S["e_cha"] = premul(fit(champion, 410))
    S["e_dia_w"] = silhouette(S["e_dia"], CIANO)
    S["e_cha_w"] = silhouette(S["e_cha"], ROXO)
    S["glow_roxo"] = radial(700, ROXO, 2.2)
    S["glow_ciano"] = radial(700, CIANO, 2.2)
    S["glow_branco"] = radial(900, (1, 1, 1), 1.6)
    S["sombra"] = radial(700, (0.0, 0.02, 0.1), 1.3)
    S["rays"] = rays(1000, (0.85, 0.7, 1.0))
    S["star"] = star()
    # his camera's half (1080×840) cut from the square edits around his face; the game's half takes them whole
    S["eu_choque"], S["eu_raiox"] = eu["choque"][150:990].copy(), eu["raiox"][150:990].copy()
    S["eu_rico"], S["eu_molhado"] = eu["rico"], eu["molhado"]
    S["fumaca"] = radial(256, (0.82, 0.82, 0.85), 1.1)
    # glints flying out of the shatter, the promotion's burst and the evolution's reveal
    S["glints"] = [(rng.uniform(0, 2 * math.pi), rng.uniform(500, 1700), rng.uniform(0.35, 0.95), rng.uniform(0.12, 0.42),
                    rng.uniform(-60, 60), rng.uniform(-60, 60)) for _ in range(70)]
    S["twinkles"] = [(rng.uniform(-330, 330), rng.uniform(-250, 250), rng.uniform(0, 1), rng.uniform(0.25, 0.6))
                     for _ in range(14)]
    S["inward"] = [(rng.uniform(0, 2 * math.pi), rng.uniform(330, 520), rng.uniform(0, 1)) for _ in range(36)]
    S["money"] = money_plan(rng, S["party"], S["dura"], S["party_end"], ctx.FPS)
    S["bill"] = bill_sprite()
    S["rain"] = (rng.uniform(-300, 1180, 340), rng.uniform(0, 2300, 340), rng.uniform(1900, 2800, 340),
                 rng.uniform(36, 80, 340), rng.uniform(0.35, 1.0, 340))
    S["puffs"] = [(rng.uniform(-70, 70), rng.uniform(0, 0.55), rng.uniform(0.7, 1.1), rng.uniform(-40, 40))
                  for _ in range(12)]
    S["coro"] = sorted((ctx.VIDEOS / PARTES / "coro").glob("v*.mp3"))
    S["font"] = ImageFont.truetype(str(ctx.ROOT / PIXEL), 56)


# ---------------------------------------------------------------------------------------------------- money, rain


def bill_sprite():
    """A banknote, generic (no real note's design): green paper, a darker frame, a pale oval with a portrait's shadow."""
    w, h = 96, 44
    im = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 4, fill=(122, 168, 104, 255))
    d.rounded_rectangle((4, 4, w - 5, h - 5), 3, outline=(64, 104, 62, 255), width=2)
    d.ellipse((w / 2 - 15, 9, w / 2 + 15, h - 9), fill=(196, 222, 176, 255))
    d.ellipse((w / 2 - 8, 13, w / 2 + 8, h - 13), fill=(110, 150, 96, 255))
    d.rectangle((10, h / 2 - 3, 24, h / 2 + 3), fill=(80, 124, 74, 255))
    d.rectangle((w - 24, h / 2 - 3, w - 10, h / 2 + 3), fill=(80, 124, 74, 255))
    return premul(np.array(im))


def money_plan(rng, start, freeze, end, fps):
    """A rain of money from the top over the whole frame (paper: drag, flutter); it hangs in the air on the record
    scratch, then drops dead, heavy."""
    n = 110
    pos = np.stack([rng.uniform(-30, 1110, n), rng.uniform(-350, 1850, n)], 1)  # a storm at once, over the whole frame
    vel = np.stack([rng.normal(0, 70, n), rng.uniform(250, 520, n)], 1)
    delay = rng.uniform(0, 0.35, n)
    piece = {"a0": rng.uniform(-40, 40, n), "w_rot": rng.uniform(-160, 160, n), "w_flip": rng.uniform(3, 8, n),
             "sway": rng.uniform(0.8, 1.8, n), "phase": rng.uniform(0, 2 * math.pi, n), "size": rng.uniform(0.8, 1.25, n),
             "delay": delay}
    frames, dt, t = [], 1 / fps, start
    p, v = pos.copy(), vel.copy()
    stop = 0.3  # the scratch: everything hangs for a moment
    while t <= end + dt:
        live = (t - start - delay > 0)[:, None]
        if freeze <= t < freeze + stop:
            pass
        elif t >= freeze + stop:
            v[:, 1] += 3200 * dt
            p += v * dt * live
        else:
            v[:, 1] += 900 * dt * live[:, 0]
            v -= v * (2.2 * dt) * live  # paper: ~400 px/s falling at most
            sway = np.sin((t - start) * piece["sway"] * 2 * math.pi + piece["phase"]) * 120
            p += (v * dt + np.stack([sway * dt, np.zeros(n)], 1)) * live
        frames.append(p.copy())
        t += dt
    piece.update(frames=frames, start=start, fps=fps, stop=stop)
    return piece


def draw_money(f, o):
    c = S["money"]
    i = int(round((o - c["start"]) * c["fps"]))
    if i < 0 or i >= len(c["frames"]):
        return
    x = o - c["start"]
    frozen = min(x, S["dura"] - c["start"])
    spin_t = frozen + max(0.0, x - (S["dura"] - c["start"]) - c["stop"]) * 0.4
    for k, (cx, cy) in enumerate(c["frames"][i]):
        if x < c["delay"][k] or not (-60 < cx < 1140 and -60 < cy < 1980):
            continue
        flip = math.cos(c["w_flip"][k] * spin_t + c["phase"][k])
        pop = min(1.0, (x - c["delay"][k]) / 0.12)
        gone = 1 - min(1.0, max(0.0, o - S["dura"] - c["stop"]) / 0.45)  # turning into the rain as they drop
        blit(f, S["bill"], cx, cy, scale=c["size"][k] * (0.6 + 0.4 * pop), angle=c["a0"][k] + c["w_rot"][k] * spin_t,
             sx=flip if abs(flip) > 0.08 else 0.08, alpha=pop * gone)


def draw_rain(f, o, k):
    """Rain over the whole frame: thin streaks falling fast with a little wind, added as light."""
    if k <= 0.01:
        return
    xs, ys, vs, ls, al = S["rain"]
    layer = np.zeros(f.shape[:2], np.uint8)
    t = o - S["dura"]
    for x0, y0, v, ln, a in zip(xs, ys, vs, ls, al):
        y = (y0 + v * t) % 2300 - 150
        x = x0 + 0.14 * y
        cv2.line(layer, (int(x), int(y)), (int(x - 0.14 * ln), int(y - ln)), int(150 * a), 2, cv2.LINE_AA)
    add = cv2.GaussianBlur(layer, (3, 3), 0).astype(np.float32)[..., None] * (k / 255) * np.array((0.8, 0.86, 1.0))
    f[:] = np.clip(f.astype(np.float32) + add * 255 * 0.75, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------------------------------- the beats


def glints(f, o, t0, cx, cy, n=70, speed=1.0, color=(1.0, 0.9, 1.0)):
    """Glints thrown out of (cx, cy) at t0: fast, slowing, falling a little, fading."""
    x = o - t0
    if x < 0 or x > 1.2:
        return
    for ang, v, life, size, ox, oy in S["glints"][:n]:
        if x > life:
            continue
        d = v * speed * (1 - math.exp(-x * 3.2)) / 3.2
        px, py = cx + ox + math.cos(ang) * d, cy + oy + math.sin(ang) * d + 300 * x * x
        fade = 1 - x / life
        blit(f, S["star"], px, py, scale=size * (0.6 + 0.4 * fade), angle=ang * 30, alpha=fade, add=True)


def promo(f, o):
    """Diamond III shaking and filling with light, then Champion I bursting out on the game's flash (2505.4)."""
    a, b, out = S["promo_in"], S["promo_burst"], S["promo_out"]
    if not a <= o < out + 0.3:
        return
    cx, cy = 540, 1468
    if o < b:
        x = (o - a) / (b - a)
        pop = back((o - a) / 0.22)
        jitter = 9 * x ** 2
        dx, dy = math.sin(o * 97) * jitter, math.cos(o * 83) * jitter
        blit(f, S["sombra"], cx, cy, scale=0.85 * pop, alpha=0.75)
        blit(f, S["glow_ciano"], cx, cy, scale=0.55 + 0.25 * x, alpha=0.35 + 0.4 * x, add=True)
        blit(f, S["p_dia"], cx + dx, cy + dy, scale=pop)
        blit(f, S["p_dia_w"], cx + dx, cy + dy, scale=pop, alpha=0.9 * x ** 1.6)
        return
    x = o - b
    leave = ease_out((o - out) / 0.25) if o > out else 0
    s = (1 + 0.75 * (1 - ease_out(x / 0.16))) if x < 0.16 else 1 + 0.035 * math.exp(-(x - 0.16) * 9) * math.cos((x - 0.16) * 38)
    s *= 1 - leave
    float_y = math.sin(x * 2 * math.pi * 0.9) * 7
    ray_a = (0.95 * math.exp(-x / 0.35) + 0.5) * (1 - leave)
    blit(f, S["sombra"], cx, cy, scale=0.9 * (1 - leave), alpha=0.75)
    blit(f, S["rays"], cx, cy + float_y, scale=0.62 * (1 - leave * 0.5), angle=x * 28, alpha=ray_a, add=True)
    blit(f, S["glow_roxo"], cx, cy + float_y, scale=0.7, alpha=0.75 * (1 - leave), add=True)
    blit(f, S["p_cha"], cx, cy + float_y, scale=s)
    if x < 0.35:  # the burst's light over it, fading
        blit(f, S["glow_branco"], cx, cy, scale=0.45 + x * 1.4, alpha=1 - x / 0.35, add=True)
    glints(f, o, b, cx, cy, n=40, speed=0.75)


def shock(f, o):
    """His camera's half swapping, every 0.27 s, between a photoreal him electrocuted, its X-ray and the live's own
    frame (flickering negative from the roteiro's "choque"), jolting; then smoke rising off his head."""
    a, end = S["shock_in"], S["shock_end"]
    if a <= o < end:
        ph = (o - a) % 0.27
        if ph < 0.2:
            pic = S["eu_choque"] if ph < 0.1 else S["eu_raiox"]
            r = np.random.default_rng(int(o * 30))  # a new jolt every two frames
            z, dx, dy = 1.06, r.uniform(-16, 16), r.uniform(-12, 12)
            m = np.float32([[z, 0, (1 - z) * 540 + dx], [0, z, (1 - z) * 420 + dy]])
            top = cv2.warpAffine(pic, m, (1080, 840), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
            if ph < 0.1 and int(o * 60) // 2 % 2:  # the glare of the arcs
                top = np.clip(top.astype(np.float32) * 1.25 + np.array((10, 40, 90), np.float32), 0, 255).astype(np.uint8)
            f[:840] = top
        return
    x = o - end
    if 0 <= x < 1.2:  # smoke off the top of his head
        for ox, t0, size, drift in S["puffs"]:
            u = x - t0
            if 0 <= u < 0.65:
                blit(f, S["fumaca"], 540 + ox + drift * u, 200 - 190 * u, scale=size * (0.5 + 1.3 * u),
                     alpha=0.8 * (1 - u / 0.65))


def fall(f, o):
    """Champion I cracking on each "caiu" and shattering into Diamond III."""
    a, c1, c2, sh, end = S["fall_in"], S["crack1"], S["crack2"], S["shatter"], S["fall_end"]
    if not a <= o < end:
        return
    cx, cy = 540, 1405
    em = S["f_cha"]
    h, w = em.shape[:2]
    if o < sh:
        pop = back((o - a) / 0.25)
        bob = math.sin((o - a) * 2 * math.pi * 0.8) * 8
        jolt = sum(14 * math.exp(-(o - t) / 0.07) * math.sin((o - t) * 90) for t in (c1, c2) if o >= t)
        dying = 1.0 - 0.3 * (o >= c1) - 0.25 * (o >= c2)
        blit(f, S["glow_roxo"], cx, cy + bob, scale=0.9, alpha=0.75 * dying, add=True)
        spr = em.copy()
        # the cracks, spreading from the impact on each "caiu"
        r = 0.0
        if o >= c1:
            r = 135 * ease_out((o - c1) / 0.09)
        if o >= c2:
            r = 135 + 400 * ease_out((o - c2) / 0.12)
        if o >= sh - 0.12:
            r = 600
        if r > 0:
            lines = S["cracks"] * np.clip((r - S["dist"]) / 12, 0, 1)
            shadow = np.clip(np.roll(np.roll(lines, 2, 0), 1, 1) - lines, 0, 1)
            spr[..., :3] = spr[..., :3] * (1 - 0.7 * shadow[..., None])
            spr[..., :3] = spr[..., :3] * (1 - lines[..., None]) + lines[..., None] * spr[..., 3:4]
        kick = 1 + sum(0.05 * math.exp(-(o - t) / 0.06) for t in (c1, c2) if o >= t)
        blit(f, spr, cx + jolt, cy + bob, scale=pop * kick)
        for t in (c1, c2):  # the glass lighting up as it cracks
            if t <= o < t + 0.25:
                blit(f, S["f_cha_w"], cx + jolt, cy + bob, scale=pop * kick, alpha=0.75 * math.exp(-(o - t) / 0.05))
                ix, iy = S["impact"]
                blit(f, S["glow_branco"], cx + ix - w / 2, cy + iy - h / 2, scale=0.3, alpha=1 - (o - t) / 0.25, add=True)
        return
    x = o - sh
    # Diamond III where it stood: popping up out of the burst, then sinking a little, sad
    grow = back(x / 0.32, 1.4)
    sink = 26 * ease_out((x - 0.4) / 1.6) if x > 0.4 else 0
    blit(f, S["glow_ciano"], cx, cy + sink, scale=0.75, alpha=0.55 * min(1, x / 0.3), add=True)
    blit(f, S["f_dia"], cx, cy + 15 + sink, scale=0.35 + 0.65 * grow, angle=-4 * ease_out((x - 0.4) / 1.6) if x > 0.4 else 0)
    if x < 0.4:
        blit(f, S["glow_branco"], cx, cy, scale=0.5 + 1.2 * x, alpha=1 - x / 0.4, add=True)
    for s in S["shards"]:
        px = cx + s["c"][0] + s["v"][0] * x
        py = cy + s["c"][1] + s["v"][1] * x + 0.5 * 2100 * x * x
        if py > 2100:
            continue
        sx = math.cos(s["phi"] + s["wf"] * x)
        spr = s["spr"] if sx >= 0 else s["dark"]
        fade = 1 - max(0.0, (x - 0.9) / 0.5)
        blit(f, spr, px, py, angle=s["a0"] + s["w"] * x, sx=sx, alpha=fade)
    glints(f, o, sh, cx, cy - 20, n=70)


def evolution(f, o):
    """The evolution: Diamond III turning white, the two forms swapping faster and faster, Champion I bursting out."""
    a, wt, fl, rv, end = S["evo_in"], S["evo_white"], S["evo_flick"], S["evo_reveal"], S["evo_end"]
    if not a <= o < end:
        return
    cx, cy = 540, 1300
    dim = 0.62 * ease_out((o - a) / 0.3)
    y0 = 840
    f[y0:] = (f[y0:].astype(np.float32) * (1 - dim)).astype(np.uint8)
    if o < rv:
        pop = back((o - a) / 0.24)
        if o < fl:
            white = ease_out((o - wt) / (fl - wt)) if o >= wt else 0
            blit(f, S["glow_ciano"], cx, cy, scale=0.8, alpha=0.5, add=True)
            blit(f, S["e_dia"], cx, cy, scale=pop)
            blit(f, S["e_dia_w"], cx, cy, scale=pop, alpha=white)
            return
        # the swap: 2.5 → 17 Hz, exponentially
        T, f0, f1 = rv - fl, 2.5, 17.0
        u = (o - fl) / T
        phase = f0 * T / math.log(f1 / f0) * ((f1 / f0) ** u - 1)
        champ = int(phase * 2) % 2 == 1
        bump = 1 + 0.05 * math.exp(-((phase * 2) % 1) * 4)
        col_a = 0.5 + 0.4 * u
        blit(f, S["glow_roxo" if champ else "glow_ciano"], cx, cy, scale=0.8 + 0.3 * u, alpha=col_a, add=True)
        blit(f, S["e_cha_w" if champ else "e_dia_w"], cx, cy, scale=bump)
        for ang, r0, ph in S["inward"]:  # light drawn in towards it
            k = ((o - fl) * 1.6 + ph) % 1
            r = r0 * (1 - ease_out(k))
            blit(f, S["star"], cx + math.cos(ang) * r, cy + math.sin(ang) * r * 0.9, scale=0.18 + 0.2 * k,
                 alpha=min(1, k * 3) * (0.6 + 0.4 * u), add=True)
        return
    x = o - rv
    s = 1 + 0.3 * (1 - ease_out(x / 0.25))
    float_y = math.sin(x * 2 * math.pi * 0.9) * 7
    blit(f, S["rays"], cx, cy + float_y, scale=0.85, angle=x * 25, alpha=0.95 * math.exp(-x / 0.5) + 0.55, add=True)
    blit(f, S["glow_roxo"], cx, cy + float_y, scale=0.9, alpha=0.8, add=True)
    blit(f, S["e_cha"], cx, cy + float_y, scale=s)
    for px, py, ph, size in S["twinkles"]:
        tw = max(0.0, math.sin((x * 1.7 + ph) * 2 * math.pi))
        if x > 0.15:
            blit(f, S["star"], cx + px, cy + py, scale=size * tw, angle=x * 90, alpha=tw, add=True)
    if x < 0.45:  # the burst: white over the game's half, fading
        k = 1 - x / 0.45
        f[y0:] = np.clip(f[y0:].astype(np.float32) + 255 * 0.85 * k ** 2, 0, 255).astype(np.uint8)
        blit(f, S["glow_branco"], cx, cy, scale=0.6 + x * 2, alpha=k, add=True)
    glints(f, o, rv, cx, cy, n=60, speed=1.1)


def alegria(f, o):
    """"Alegria": the game's half becomes photoreal him "ostentando" under a rain of money. "dura": the record
    scratches, everything stops (the picture's push-in too) and greys. "é bom lembrar disso": him drenched and sad."""
    a, d, sad, end = S["party"], S["dura"], S["sad"], S["party_end"]
    if not a <= o < end + 0.05:
        return
    y0 = 840
    if o < sad + 0.12:  # (under the drenched one as it fades in)
        x = min(o, d) - a  # frozen from "dura"
        z = (1 + 0.1 * (1 - ease_out((o - a) / 0.16))) * (1 + 0.05 * x / (d - a))
        m = np.float32([[z, 0, (1 - z) * 540], [0, z, (1 - z) * 500]])
        f[y0:] = cv2.warpAffine(S["eu_rico"], m, (1080, 1080), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
        if o - a < 0.18:  # in on a flash
            k = 1 - (o - a) / 0.18
            f[y0:] = np.clip(f[y0:].astype(np.float32) + 255 * 0.8 * k ** 2, 0, 255).astype(np.uint8)
        if o < d:
            for px, py, ph, size in S["twinkles"]:  # bling
                tw = max(0.0, math.sin(((o - a) * 1.6 + ph) * 2 * math.pi))
                blit(f, S["star"], 540 + px * 1.3, 1340 + py * 1.5, scale=size * tw * 0.8, angle=o * 90, alpha=tw,
                     add=True)
    draw_money(f, o)
    grey = 0.85 * ease_out((o - d) / 0.22) if o >= d else 0.0
    desaturate(f, grey)
    if o >= sad:
        x = o - sad
        z = 1 + 0.05 * x / (end - sad)
        m = np.float32([[z, 0, (1 - z) * 540], [0, z, (1 - z) * 480]])
        wet = cv2.warpAffine(S["eu_molhado"], m, (1080, 1080), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
        k = min(1.0, x / 0.12)
        f[y0:] = (f[y0:].astype(np.float32) * (1 - k) + wet.astype(np.float32) * k).astype(np.uint8)


def dialog(f, o):
    """The evolution's game dialog at the foot of the game's half, typed out."""
    t1, t2, rv, end = S["text1"], S["text2"], S["evo_reveal"], S["evo_end"]
    if not t1 <= o < end:
        return
    if o < rv + 0.05:
        lines, t0 = ["O quê? DIAMANTE III", "está evoluindo!"], t1
    elif o >= t2:
        lines, t0 = ["Parabéns! Seu DIAMANTE III", "evoluiu para CHAMPION I!"], t2
    else:
        lines, t0 = None, t2
    x0, y0, x1, y1 = 52, 1466, 948, 1642
    slide = ease_out((o - t1) / 0.14)
    img = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = img.size
    d.rounded_rectangle((0, 0, w - 1, h - 1), 22, fill=(54, 62, 86, 255))
    d.rounded_rectangle((7, 7, w - 8, h - 8), 16, fill=(110, 168, 236, 255))
    d.rounded_rectangle((12, 12, w - 13, h - 13), 12, fill=(250, 250, 248, 255))
    if lines:
        n = int((o - t0) * (52 if t0 == t1 else 72))
        left = n
        for i, line in enumerate(lines):
            part = line[:max(0, left)]
            left -= len(line)
            yy = 22 + i * 68
            d.text((38 + 3, yy + 3), part, font=S["font"], fill=(196, 196, 204, 255))
            d.text((38, yy), part, font=S["font"], fill=(64, 64, 72, 255))
        if left > 0 and int(o * 3) % 2 == 0:  # done: the blinking arrow
            d.polygon([(w - 52, h - 44), (w - 30, h - 44), (w - 41, h - 30)], fill=(220, 70, 70, 255))
    spr = premul(np.array(img))
    blit(f, spr, (x0 + x1) / 2, (y0 + y1) / 2 + 40 * (1 - slide), alpha=slide)


def hold_camera(f, o, ctx):
    """The second added after "de volta" to hold the evolution: from 7950.15 the live's stinger to Conversa wipes his
    camera box and leaves it empty Klein. His last clean frame (7950.1) is kept and pushed in slowly instead, and
    swept out with the cut's whip (the transition already drew on the empty one)."""
    h, cut = S["hold"], ctx.clock.starts[6]
    if not h <= o < cut:
        return
    if "held" not in S:  # frames come in order: this is the first one at or after 7950.1
        S["held"] = f[:ctx.CAM_H].copy()
    x = (o - h) / (cut - h)
    z = 1 + 0.06 * ctx.ease(x)
    cx, cy = ctx.W / 2, ctx.CAM_H * 0.45
    m = np.float32([[z, 0, (1 - z) * cx], [0, z, (1 - z) * cy]])
    top = cv2.warpAffine(S["held"], m, (ctx.W, ctx.CAM_H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
    w = o - cut  # the whip out (destaque.transition's: 0.12 s, accelerating left, blurred)
    if w >= -0.12:
        u = ((w + 0.12) / 0.12) ** 2
        top = cv2.warpAffine(top, np.float32([[1, 0, -0.5 * ctx.W * u], [0, 1, 0]]), (ctx.W, ctx.CAM_H),
                             flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
        k = 1 + int(140 * u)
        if k > 1:
            top = cv2.blur(top, (k, 1))
    f[:ctx.CAM_H] = top


def antes(f, o, ctx):
    hold_camera(f, o, ctx)
    promo(f, o)
    shock(f, o)
    fall(f, o)
    evolution(f, o)
    alegria(f, o)
    return f


def depois(f, o, ctx):
    dialog(f, o)
    rain_from = S["dura"] + S["money"]["stop"]
    if rain_from <= o < S["party_end"] + 0.05:  # the money rain turned into rain
        draw_rain(f, o, ease_out((o - rain_from) / 0.35))
    return f


# ---------------------------------------------------------------------------------------------------- sounds


def _filter(x, sr, lo=None, hi=None, order=4):
    """A static band by FFT: smooth magnitude roll-offs, no phase smear worth hearing in these."""
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


def crack(sr, seed):
    """Glass cracking: a snap, high rings, a dull knock under it and a short crackle running on."""
    rng = np.random.default_rng(seed)
    n = int(0.5 * sr)
    t = np.arange(n) / sr
    snap = _filter(rng.standard_normal(n) * np.exp(-t / 0.0035), sr, lo=1800)
    ring = sum(rng.uniform(0.2, 0.6) * np.sin(2 * np.pi * rng.uniform(2300, 9500) * t + rng.uniform(0, 6.3))
               * np.exp(-t / rng.uniform(0.008, 0.05)) for _ in range(12))
    knock = np.sin(2 * np.pi * np.cumsum(170 * np.exp(-t * 9) + 70) / sr) * np.exp(-t / 0.05)
    clicks = (rng.random(n) < 0.006 * np.exp(-t / 0.1)) * rng.standard_normal(n) * 4
    clicks = _filter(clicks, sr, lo=1500)
    return _norm(np.tanh(1.4 * snap + 0.45 * ring + 0.8 * knock + 0.9 * clicks))


def tinkle(sr, seed, dur=1.5, count=55):
    """Shards landing and ringing: many small glass pings, thick at first, thinning out."""
    rng = np.random.default_rng(seed)
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    for _ in range(count):
        t0 = min(dur - 0.15, rng.exponential(0.3))
        amp = rng.uniform(0.3, 1.0) * math.exp(-t0 / 0.6)
        i0 = int(t0 * sr)
        tt = t[: n - i0]
        for _ in range(2):
            x[i0:] += amp * np.sin(2 * np.pi * rng.uniform(2800, 9000) * tt) * np.exp(-tt / rng.uniform(0.015, 0.07))
    return _norm(x)


def thud(sr):
    """Something landing heavily: a low knock gliding down."""
    t = np.arange(int(0.35 * sr)) / sr
    x = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 6) + 42) / sr) * np.exp(-t / 0.12)
    click = _filter(np.random.default_rng(5).standard_normal(len(t)) * np.exp(-t / 0.004), sr, hi=2500)
    return _norm(np.tanh(1.6 * x + 0.5 * click))


def sparkle(sr, seed, dur=0.9, count=26):
    """Bright chimes, a twinkle."""
    rng = np.random.default_rng(seed)
    n = int(dur * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    for _ in range(count):
        t0 = rng.uniform(0, dur * 0.6)
        i0 = int(t0 * sr)
        tt = t[: n - i0]
        f0 = rng.choice([1567.98, 2093.0, 2637.0, 3136.0, 4186.0]) * rng.choice([1, 1, 2])
        x[i0:] += rng.uniform(0.3, 1) * (np.sin(2 * np.pi * f0 * tt) + 0.3 * np.sin(2 * np.pi * f0 * 2.76 * tt)) \
            * np.exp(-tt / rng.uniform(0.05, 0.18))
    return _norm(x)


def rise(sr, dur, f0=2.5, f1=17.0):
    """The evolution's build: a chiptune pulse wave climbing two octaves, gated at the silhouettes' swap rate, with a
    shimmer of noise rising under it. Ours, no melody from anywhere."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    u = t / dur
    pitch = 220 * 4 ** (u ** 1.3)
    ph = np.cumsum(pitch) / sr
    pulse = np.where(ph % 1 < 0.25, 1.0, -1.0) + 0.5 * np.where((ph * 1.5) % 1 < 0.5, 1.0, -1.0)
    rate_ph = f0 * dur / math.log(f1 / f0) * ((f1 / f0) ** u - 1)
    gate = 0.55 + 0.45 * (np.sin(2 * np.pi * rate_ph * 2) > -0.3)
    tone = _filter(pulse * gate, sr, hi=4500)
    noise = svf_bandpass(np.random.default_rng(3).standard_normal(n).astype(np.float32),
                         (1800 * 4 ** u).astype(np.float32), 6.0)
    noise = _filter(noise, sr, lo=1200, hi=9000)
    noise *= 0.35 * np.abs(tone).max() / (np.abs(noise).max() + 1e-9)
    env = (0.35 + 0.65 * u ** 1.2) * np.minimum(1, t / 0.04)
    return _norm((tone + noise) * env)


def reveal(sr):
    """Champion back: a bright major chord, chip and bell together, ringing out, with chimes."""
    n = int(1.6 * sr)
    t = np.arange(n) / sr
    x = np.zeros(n)
    for f0 in (523.25, 659.25, 783.99, 1046.5):
        chip = sum(np.sign(np.sin(2 * np.pi * f0 * k * t)) / k for k in (1, 3)) * 0.35
        bell = np.sin(2 * np.pi * f0 * t) + 0.4 * np.sin(2 * np.pi * f0 * 2.0 * t) * np.exp(-t / 0.3)
        x += (chip * np.exp(-t / 0.35) + bell * np.exp(-t / 0.7))
    x = _filter(x, sr, hi=6000) * np.minimum(1, t / 0.005)
    s = sparkle(sr, 9, 1.2, 30)
    x[: len(s)] += 1.2 * s * np.abs(x).max() / 1.0
    return _norm(x)


def kaching(sr):
    """A cash register: the drawer's clack and a bright bell, rung twice."""
    rng = np.random.default_rng(31)
    n = int(1.1 * sr)
    t = np.arange(n) / sr
    clack = _filter(rng.standard_normal(n) * np.exp(-t / 0.012), sr, lo=900, hi=5000) \
        + 0.6 * np.sin(2 * np.pi * 150 * t) * np.exp(-t / 0.03)
    bell = np.zeros(n)
    for at, amp in ((0.06, 1.0), (0.16, 0.8)):
        tt = np.clip(t - at, 0, None)
        on = (t >= at).astype(np.float64)
        for ratio, a, d in ((1.0, 1.0, 0.5), (2.0, 0.5, 0.35), (2.76, 0.4, 0.2), (5.4, 0.25, 0.08)):
            bell += on * amp * a * np.sin(2 * np.pi * 2093 * ratio * tt) * np.exp(-tt / d)
    return _norm(0.8 * clack + 0.5 * bell)


def chuva(sr, dur):
    """Rain: a soft hiss and drops ticking on things, in and out gently."""
    rng = np.random.default_rng(41)
    n = int(dur * sr)
    t = np.arange(n) / sr
    hiss = _filter(rng.standard_normal(n), sr, lo=500, hi=7000) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.6 * t))
    drops = (rng.random(n) < 0.0025) * rng.standard_normal(n) * 6
    drops = _filter(np.convolve(drops, np.exp(-np.arange(200) / 30), "same"), sr, lo=1500, hi=9000)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.1)
    return _norm((hiss + 0.6 * drops) * env)


def coro(sr, files, starts, end, seed=5):
    """A stadium chanting "É campeão!": each of edge-tts's voices twice per chant, ±2 semitones, ±30 ms, pushed and
    band-limited like a crowd far off, a crowd's claps on the beats, the stand's roar under it, a stadium's tail.
    Starts at the short's 0; ends at `end` (the cut)."""
    import subprocess
    rng = np.random.default_rng(seed)
    n = int((end + 0.1) * sr)

    def load(path):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        e = np.sqrt(np.convolve(x ** 2, np.ones(480) / 480, "same"))
        on = np.where(e > 0.02)[0]
        return x[max(0, on[0] - 480): on[-1] + 2400]

    voices = [(load(path), 0.5 if i >= 16 else 1.0) for i, path in enumerate(files)]  # the last six are women's
    dry = np.zeros(n)
    for s0 in starts:
        for x, g in voices:
            for _ in range(2):
                r = 2 ** (rng.uniform(-2.0, 2.0) / 12)
                y = np.interp(np.arange(0, len(x) - 1, r), np.arange(len(x)), x)
                i0 = int((s0 + rng.normal(0, 0.03)) * sr)
                if i0 < 0:
                    y, i0 = y[-i0:], 0
                y = y[: max(0, n - i0)]
                dry[i0:i0 + len(y)] += y * g * rng.uniform(0.6, 1.0)
    dry = _filter(np.tanh(1.5 * dry / (np.abs(dry).max() + 1e-9)), sr, lo=220, hi=4200)
    claps = np.zeros(n)
    tc = np.arange(int(0.05 * sr)) / sr
    for s0 in starts:
        for beat in (0.0, 0.24, 0.48):
            for _ in range(28):
                i0 = int((s0 + beat + rng.normal(0, 0.016)) * sr)
                if 0 <= i0 < n - len(tc):
                    claps[i0:i0 + len(tc)] += rng.standard_normal(len(tc)) * np.exp(-tc / rng.uniform(0.006, 0.014)) \
                        * rng.uniform(0.4, 1.0)
    claps = _filter(claps, sr, lo=800, hi=4500)
    claps *= 0.35 * np.abs(dry).max() / (np.abs(claps).max() + 1e-9)
    t = np.arange(n) / sr
    roar = _filter(rng.standard_normal(n), sr, lo=300, hi=2200)
    roar *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t + 1) * np.sin(2 * np.pi * 0.23 * t)) / (np.abs(roar).max() + 1e-9) * 0.35
    mix = dry + claps + roar
    ir_t = np.arange(int(1.8 * sr)) / sr
    ir = _filter(rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 6.9 / 1.8), sr, lo=200, hi=5000)
    ir = np.concatenate([np.zeros(int(0.035 * sr)), ir])
    m = len(mix) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(mix, m) * np.fft.rfft(ir, m), m)[: len(mix)]
    out = 0.55 * mix + 0.9 * wet * (np.abs(mix).max() / (np.abs(wet).max() + 1e-9))
    out *= np.clip((end - t) / 0.06, 0, 1) * np.clip((t - starts[0] + 0.15) / 0.15, 0, 1)
    return _norm(out)


def scratch(sr):
    """A record scratch: a bright chord on the "record", pushed forward and yanked back under a hand (the position a
    skewed sine, so the pitch swoops through zero as it turns round), then dragged to a stop."""
    rng = np.random.default_rng(21)
    m = int(2.0 * sr)
    tm = np.arange(m) / sr
    record = sum(2 * ((f * tm) % 1) - 1 for f in (110, 164.8, 220, 277.2)) / 4
    record = _filter(record, sr, hi=5000) + 0.2 * _filter(rng.standard_normal(m), sr, lo=300, hi=7000)
    dur = 0.34
    t = np.arange(int(dur * sr)) / sr
    f0 = 1.5 / 0.26  # a cycle and a half
    u = np.minimum(t, 0.26)
    pos_s = 0.075 * np.sin(2 * np.pi * f0 * u - 0.6 * np.sin(2 * np.pi * f0 * u))
    tail = np.clip((t - 0.26) / 0.08, 0, 1)
    pos_s = pos_s + 0.03 * (1 - (1 - tail) ** 2)  # the drag to a stop: slower and slower
    pos = 0.6 * sr + pos_s * sr
    x = np.interp(pos, np.arange(m), record)
    rate = np.abs(np.gradient(pos_s) * sr)
    x *= np.clip(rate / 0.8, 0, 1) ** 0.6  # quiet where the hand turns round
    x = _filter(x, sr, lo=200, hi=6000)
    return _norm(np.tanh(1.6 * x) * np.minimum(1, (dur - t) / 0.015))


def trombone(sr):
    """The sad trombone: four notes falling by semitones, the plunger opening on each ("wah"), the last one long with
    a vibrato and a droop."""
    notes = [(293.66, 0.37), (277.18, 0.37), (261.63, 0.37), (246.94, 1.35)]
    out = []
    for i, (f0, d) in enumerate(notes):
        n = int(d * sr)
        t = np.arange(n) / sr
        last = i == len(notes) - 1
        scoop = 1 - 0.035 * np.exp(-t / 0.04)
        vib = 1 + (0.025 * np.minimum(1, t / 0.5) * np.sin(2 * np.pi * 5.2 * t) if last else 0)
        droop = (1 - 0.07 * np.clip((t - (d - 0.35)) / 0.35, 0, 1) ** 2) if last else 1
        pitch = f0 * scoop * vib * droop
        ph = np.cumsum(pitch) / sr
        tone = (2 * (ph % 1) - 1) + 0.6 * (2 * ((ph * 1.003) % 1) - 1)
        opening = np.sin(np.pi * np.clip(t / (d * (0.75 if last else 0.9)), 0, 1)) ** 0.8
        centre = 380 + 1250 * opening
        wah = svf_bandpass(tone.astype(np.float32), centre.astype(np.float32), 2.2)
        body = _filter(tone, sr, hi=900)
        env = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / (0.25 if last else 0.06))
        out.append((1.2 * wah + 0.35 * body) * env)
        out.append(np.zeros(int(0.025 * sr)))
    x = np.concatenate(out)
    x = np.tanh(0.8 * x / (np.abs(x).max() + 1e-9) * 1.5)
    return _norm(_filter(x, sr, lo=90, hi=3200))


def sons(ctx):
    sr = ctx.SR
    rv, fl = S["evo_reveal"], S["evo_flick"]
    beat = 1.0
    chant = [S["promo_burst"] + 0.02 + k * beat for k in range(4)]
    rain_from = S["dura"] + S["money"]["stop"]
    return [
        # the promotion: the stand sings
        (0.0, coro(sr, S["coro"], chant, ctx.clock.starts[1] - 0.04), -5),
        (S["promo_burst"] - 0.02, sparkle(sr, 4), -15),
        # the demotion
        (S["crack1"], crack(sr, 1), -5),
        (S["crack2"], crack(sr, 2), -4),
        (S["shatter"], "glass-shatter", -6),
        (S["shatter"] + 0.03, tinkle(sr, 7), -11),
        (S["shatter"] + 0.28, thud(sr), -11),
        (S["shatter"] + 0.15, "uuuh", -11),
        # the evolution (he's quiet through the build)
        (fl - 0.05, rise(sr, rv - fl + 0.05), -4),
        (rv, reveal(sr), -8),
        (rv, "impact-boom", -16),
        # alegria de pobre
        (S["party"] - 0.01, kaching(sr), -9),
        (S["party"] + 0.08, sparkle(sr, 6), -15),
        (S["dura"] - 0.3, scratch(sr), -8),
        (rain_from, chuva(sr, S["party_end"] - rain_from), -17),
        (S["sad"] + 0.02, trombone(sr), -7),
    ]
