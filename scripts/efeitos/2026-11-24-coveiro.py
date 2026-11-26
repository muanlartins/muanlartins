"""Se fazendo de morta (2026-11-24): Evelin ("EVLINN." in the game) played modestly all afternoon, then destroyed Luan in
the live's 1v1 semifinal with flip resets. Luan's direction (11-26): "quando for palhaçada, foco na câmera e na edição
com um filtro ou uma brincadeira (coveiro…) e um cenário embaixo; quando for foco na jogada, edição de hype".

The stretches (roteiro): 0 the hook (the goal going in and "DEUS! MEU DEUS!"), 1 the private match hours before ("você
tava se fazendo de morta pra comer o cu do coveiro, é isso?"), 2 before the semi ("olha o nick dela… Evelyn ponto no
final"), 3 the kickoff ("eu acho que eu vou tomar…"), 4 the goal's replay and "Ô Evelyn, tu é muito sacana. Tu
literalmente tava se fazendo de morto pra comer a porra do cu do coveiro", 5 "Foram três flip-resets. E ela jogou a bola
pra mim como quem joga, tipo, catarro no lixo".

- Clowning (1 and the end of 4): his camera's Klein keyed out for a moonlit cemetery (three.js, `Partes/…/3d`), him
  graded to moonlight with a lantern's warm side, mist in front; below, the cemetery: her car (the Octane in black with
  cyan neon edges, as hers) belly up on her own grave, "AQUI JAZ EVLINN.", lilies on it, a wheel twitching; its
  headlights blink on at "coveiro" (a wink). In 4 the same, then it flips onto its wheels at "comer", eyes on, and a
  tombstone "AQUI JAZ LUAN" falls out of the sky at "coveiro"; his half gets a shovel and "O COVEIRO".
- Hype (4 and 5): the replay (her car's camera) re-timed: real speed into each touch, slow motion through it (frames
  interpolated to 240 fps, `replay-240.mp4`), each touch marked with a punch, a flash, a shock ring and the counter
  "FLIP RESET 1/2/3" in the channel's look (a chime a note higher each), the goal at speed; in 5 the three touches again
  in a row as he says "três flip-resets", the shot in slow motion, then a steel trash can with LUAN on it taking the ball
  like snot (3D), the lid clanging shut.
- The nick (2): the semifinal's own screens (Jogo.mp4) held: "SEMIFINAL · JOGO 1/1", then "MUANLARTINS X EVLINN."
  pushed in to the nick and its dot circled on "ponto no final".

Every transition is drawn here (the roteiro's stretches are all "seco"), after the halves are swapped.
"""
import hashlib
import json
import math
import os
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SLUG = "2026-11-24-coveiro"
JOGO = "Lives/2026-11-24/15-15-16 Jogo.mp4"
HOOK, COVA, NICK, KICK, REPLAY, RECAP = range(6)  # the stretches
KEY_KLEIN = (0, 46, 166)

# --- the replay (Jogo.mp4's own seconds: the replay is a picture of its own, re-timed here)
R0 = 8246.4  # replay-240.mp4's first frame
TOUCH = (8248.70, 8249.95, 8250.30)  # her touches under the ball (read off frames: the ball's size turning, wheels up)
SHOT, GOAL = 8250.65, 8251.0  # the flip into it, the goal's first frame
CONTACT = (530, 675)  # where car meets ball in the replay's square, all three
# the re-timing: (from, to, speed) in replay seconds, smoothed; the stretch starts at R_START
R_START = 8246.95
SPEEDS = [(8246.95, 8248.40, 1.0), (8248.40, 8248.95, 0.33), (8248.95, 8249.75, 1.15), (8249.75, 8250.45, 0.4),
          (8250.45, 8251.0, 0.6), (8251.0, 8256.0, 1.0)]
CEMITERIO_4 = 8251.75  # live s: the cemetery comes in (after "sacana.")
# --- live seconds of his words that things land on
MORTA, COVEIRO1 = 6453.30, 6455.69
COMER, COVEIRO2 = 8255.75, 8257.03
REVELA = 8255.58  # live s: the gravedigger cuts in ("pra comer…")
OLHA, PONTO = 8166.50, 8171.78
TRES = (8281.30, 8281.90, 8282.50)  # the three touches again, from "Foram" (each 0.6 s)
TRES_STAMP = 8283.10
JOGOU = 8284.40  # the shot again, slow, to the goal
LIXO0, CATARRO, LIXO = 8286.50, 8289.19, 8290.00  # the trash can: comes in, the flick, the ball drops in
# the semifinal's screens in Jogo.mp4
SEMI_CARD, BANNER = 8219.2, 8222.6
DOT = (832, 549)  # the nick's dot in the banner's square
NICK_BOX = (652, 521, 839, 557)


def Pt(*a):
    return np.array(a, np.float32)


# ---------------------------------------------------------------------------------------------------- helpers


def where(o, ctx):
    st, sp = ctx.clock.starts, ctx.clock.spans
    k = max(i for i in range(len(sp)) if st[i] <= o + 1e-9) if o >= 0 else 0
    return k, sp[k][0] + (o - st[k])


def kick(x, size, tau):
    return size * math.exp(-x / tau) if x >= 0 else 0.0


def smooth(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def warp(img, z, cx, cy, dx=0.0, dy=0.0):
    if abs(z - 1) < 1e-3 and not dx and not dy:
        return img
    m = np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])
    return cv2.warpAffine(img, m, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)


def flash(img, a, color=(255, 255, 255)):
    if a > 0.004:
        img[:] = (img.astype(np.float32) * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)


def blend(f, im, x, y, alpha=1.0):
    """An RGBA sprite over the RGB frame with its top left at (x, y), clipped."""
    h, w = im.shape[:2]
    x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(0, x), max(0, y), min(f.shape[1], x + w), min(f.shape[0], y + h)
    if x1 <= x0 or y1 <= y0 or alpha <= 0.004:
        return
    sub = im[y0 - y:y1 - y, x0 - x:x1 - x]
    a = sub[..., 3:4].astype(np.float32) * (alpha / 255)
    reg = f[y0:y1, x0:x1].astype(np.float32)
    f[y0:y1, x0:x1] = (reg + (sub[..., :3].astype(np.float32) - reg) * a + 0.5).astype(np.uint8)


def rgba(path):
    im = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    return cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA) if im.shape[2] == 4 else cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


class Frames:
    """A PNG sequence at 30 fps (the 3D), read on demand, a few kept."""

    def __init__(self, folder, prefix):
        self.paths = sorted(Path(folder).glob(f"{prefix}-*.png"))
        self.cache = {}

    def at(self, t):
        i = min(len(self.paths) - 1, max(0, int(t * 30)))
        if i not in self.cache:
            if len(self.cache) > 6:
                self.cache.pop(next(iter(self.cache)))
            self.cache[i] = cv2.cvtColor(cv2.imread(str(self.paths[i])), cv2.COLOR_BGR2RGB)
        return self.cache[i]


class Replay:
    """replay-240.mp4 read forwards (a seek only when going back), by replay second."""

    def __init__(self, path):
        self.path = str(path)
        self.cap = None
        self.i = -1
        self.img = None
        self.n = int(cv2.VideoCapture(self.path).get(cv2.CAP_PROP_FRAME_COUNT))

    def at(self, t):
        i = min(self.n - 1, max(0, int(round((t - R0) * 240))))
        if self.cap is None or i < self.i:
            self.cap = cv2.VideoCapture(self.path)
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            self.i = i - 1
        while self.i < i:
            ok, im = self.cap.read()
            if not ok:
                break
            self.i += 1
            self.img = im
        return cv2.cvtColor(self.img, cv2.COLOR_BGR2RGB)


def retime():
    """The replay's re-timing: [(window second, replay second)] from the smoothed speeds."""
    dc = 1 / 1000
    cs = np.arange(SPEEDS[0][0], SPEEDS[-1][1], dc)
    sp = np.array([next(s for a, b, s in SPEEDS if a <= c < b + 1e-9) for c in cs])
    k = int(0.12 / dc)
    sp = np.convolve(np.pad(sp, k, mode="edge"), np.ones(2 * k + 1) / (2 * k + 1), mode="valid")
    w = np.concatenate([[0], np.cumsum(dc / sp[:-1])])
    return w, cs


# ---------------------------------------------------------------------------------------------------- assets


def partes(ctx):
    p = ctx.VIDEOS / "Lives/2026-11-24/Shorts/Partes/coveiro"
    p.mkdir(parents=True, exist_ok=True)
    return p


def interpolated(ctx):
    out = partes(ctx) / "replay-240.mp4"
    if not out.exists():
        print("  coveiro: o replay a 240 fps…", flush=True)
        tmp = ctx.work / "replay-240.tmp.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{R0}", "-i", str(ctx.VIDEOS / JOGO), "-t", "6.2", "-an",
                        "-vf", "crop=1080:1080:420:0,minterpolate=fps=240:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:"
                        "vsbmc=1", "-c:v", "libx264", "-crf", "14", "-preset", "fast", str(tmp)], check=True)
        subprocess.run(["cp", str(tmp), str(out)], check=True)
    return out


def render3d(ctx, cues):
    """The 3D (cemetery, tombstones, trash can), rendered by headless Chromium from Partes/…/3d/cena.html, cached by
    the page's and the cues' hash."""
    src = partes(ctx) / "3d"
    page = (src / "cena.html").read_text(encoding="utf-8")
    key = hashlib.sha1((page + json.dumps(cues, sort_keys=True)).encode()).hexdigest()[:8]
    out = partes(ctx) / f"3d-{key}"
    if (out / "pronto.txt").exists():
        return out
    root = Path.home() / "repos" / "muanlartins" / "node_modules"
    fonts = ctx.work / "fontes-3d"
    fonts.mkdir(exist_ok=True)
    for f in (ctx.ROOT / ".claude/skills/short-editing/engine/fonts/InstrumentSerif-Regular.ttf",
              ctx.ROOT / "brand/fonts/SpaceGrotesk.ttf"):
        if not (fonts / f.name).exists():
            (fonts / f.name).write_bytes(f.read_bytes())
    env = dict(os.environ, PW_DIR=str(root), THREE_DIR=str(root / "three"), MODELS_DIR=str(ctx.ROOT / "public/models"),
               FONTS_DIR=str(fonts))
    work = ctx.work / f"3d-{key}"
    work.mkdir(exist_ok=True)
    (work / "cena.html").write_text(page, encoding="utf-8")
    (work / "driver.mjs").write_text((src / "driver.mjs").read_text(encoding="utf-8"), encoding="utf-8")
    for args in [{"modo": "fundo"}, {"modo": "pa"}] + cues:
        print(f"  coveiro 3D: {args['modo']}…", flush=True)
        subprocess.run(["node", str(work / "driver.mjs"), str(work / "cena.html"), str(work / "png"), json.dumps(args)],
                       env=env, cwd=work, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["cp", "-r", str(work / "png"), str(out)], check=True)
    (out / "pronto.txt").write_text(key)
    return out


# ---------------------------------------------------------------------------------------------------- sprites


def counter_sprites(ctx):
    """FLIP RESET and the count: the count Klein on a Branco plate cut at 45°, the words Branco with a dark Klein edge,
    on a Klein band with the live's lattice; 1, 2, 3 and the big "3 FLIP RESETS"."""
    c = ctx.cores
    klein, escuro, claro, branco = c["klein"], c["klein_escuro"], c["klein_claro"], c["branco"]
    out = {}
    word, num = ctx.grotesk(84), ctx.grotesk(112)
    for n in (1, 2, 3):
        wb = word.getbbox("FLIP RESET")
        nb = num.getbbox(str(n))
        pw, ph = nb[2] - nb[0] + 60, 128
        gap, edge, pad = 24, 8, 26
        w = pw + gap + (wb[2] - wb[0]) + 2 * pad + 2 * edge
        h = ph + 2 * pad
        img = Image.new("RGBA", (w, h))
        sh = Image.new("RGBA", (w, h))
        ds = ImageDraw.Draw(sh)
        ctx.plate(ds, 6, 10, w - 12, h - 14, (0, 0, 0, 150), cut=30)
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
        d = ImageDraw.Draw(img)
        ctx.plate(d, 0, 4, w - 6, h - 12, klein + (240,), cut=30)
        for k in range(-h, w + h, 34):  # the lattice, faint
            d.line([(k, 4), (k + h, h - 8)], fill=(255, 255, 255, 18), width=2)
        ctx.plate(d, pad, (h - ph) / 2, pw, ph - 8, branco + (255,), cut=26)
        d.text((pad + pw / 2 - (nb[2] - nb[0]) / 2 - nb[0], (h - ph) / 2 + (ph - 8 - (nb[3] - nb[1])) / 2 - nb[1]),
               str(n), font=num, fill=klein)
        d.text((pad + pw + gap + edge - wb[0], h / 2 - (wb[3] - wb[1]) / 2 - wb[1]), "FLIP RESET", font=word,
               fill=branco, stroke_width=edge, stroke_fill=escuro)
        out[n] = np.array(img)
    out["tres"] = ctx.title_sprite(["3 FLIP", "RESETS"], 150)
    ring = Image.new("RGBA", (300, 300))
    d = ImageDraw.Draw(ring)
    d.ellipse((10, 10, 290, 290), outline=branco + (255,), width=14)
    out["anel"] = np.array(ring.filter(ImageFilter.GaussianBlur(1.2)))
    ring2 = Image.new("RGBA", (300, 300))
    d = ImageDraw.Draw(ring2)
    d.ellipse((10, 10, 290, 290), outline=claro + (255,), width=8)
    out["anel2"] = np.array(ring2)
    return out


def label_sprite(ctx, text, size=64, arrow=None):
    """A small label in the channel's look: Branco plate, Klein letters; an arrow under it pointing down-left."""
    c = ctx.cores
    f = ctx.grotesk(size)
    b = f.getbbox(text)
    w, h = b[2] - b[0] + 64, b[3] - b[1] + 44
    extra = 120 if arrow else 0
    img = Image.new("RGBA", (w + 20, h + 20 + extra))
    sh = Image.new("RGBA", img.size)
    ctx.plate(ImageDraw.Draw(sh), 8, 12, w, h, (0, 0, 0, 160))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(7)))
    d = ImageDraw.Draw(img)
    ctx.plate(d, 0, 0, w, h, c["branco"] + (255,))
    d.text((32 - b[0], 22 - b[1]), text, font=f, fill=c["klein"])
    if arrow:  # a thick arrow from under the plate down and to the left
        x0, y0 = w * 0.3, h + 6
        x1, y1 = x0 - 70, y0 + extra - 16
        d.line([(x0, y0), (x1, y1)], fill=c["branco"] + (255,), width=14)
        ang = math.atan2(y1 - y0, x1 - x0)
        for s in (-1, 1):
            a = ang + math.pi + s * 0.5
            d.line([(x1, y1), (x1 + 44 * math.cos(a), y1 + 44 * math.sin(a))], fill=c["branco"] + (255,), width=14)
    return np.array(img)


def circle_sprite(r, width, color, u):
    """A hand-drawn circle (a little more than a turn, wobbly), drawn up to u (0-1) of its length."""
    size = int(2 * r + 4 * width)
    img = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(img)
    n = 90
    pts = []
    for i in range(int(n * u) + 1):
        a = -1.9 + 2 * math.pi * 1.12 * i / n
        rr = r * (1 + 0.06 * math.sin(3 * a + 1) + 0.04 * i / n)
        pts.append((size / 2 + rr * math.cos(a), size / 2 + rr * 0.86 * math.sin(a)))
    if len(pts) > 1:
        d.line(pts, fill=color + (255,), width=width, joint="curve")
    return np.array(img)


# ---------------------------------------------------------------------------------------------------- the cut-out


def matte(top):
    """The Klein background's share of each pixel (1 = background): how blue against the Klein, the logo too."""
    c = top.astype(np.int16)
    bgk = c[..., 2] - np.maximum(c[..., 0], c[..., 1])
    a = np.clip((bgk - 30) / 70.0, 0, 1).astype(np.float32)
    return cv2.GaussianBlur(a, (0, 0), 1.0)


def moonlit(top, bg, mist, t, logo):
    """Him in the cemetery: the Klein swapped for the night (unmixed at the edges), graded to moonlight with the
    lantern's warm light on his left, mist drifting in front."""
    a = matte(top)
    a = np.maximum(a, logo)
    f = top.astype(np.float32)
    plate = np.array(KEY_KLEIN, np.float32)
    fg = np.clip(f - a[..., None] * plate, 0, None) / np.maximum(1 - a[..., None], 0.08)
    fg = np.clip(fg, 0, 255)
    over = fg[..., 2] - np.maximum(fg[..., 0], fg[..., 1])  # blue spill on the hair's edge
    fg[..., 2] -= np.clip(over, 0, None) * 0.8
    gray = fg.mean(axis=2, keepdims=True)
    fg = (fg * 0.55 + gray * 0.45) * np.array([0.72, 0.84, 1.08], np.float32) * 0.82
    W = top.shape[1]
    warm = np.clip(1 - np.arange(W, dtype=np.float32) / (W * 0.55), 0, 1)[None, :, None] ** 1.6
    flick = 0.9 + 0.1 * math.sin(t * 13.1) * math.sin(t * 7.3 + 1)
    fg = fg + warm * np.array([70, 34, 6], np.float32) * flick * (fg.mean(axis=2, keepdims=True) / 140)
    out = fg * (1 - a[..., None]) + bg * a[..., None]
    # mist: two layers sliding at different speeds over the bottom third
    h = out.shape[0]
    for sp, alpha in ((22, 0.30), (-14, 0.22)):
        m = np.roll(mist, int(t * sp), axis=1)
        out = out + m[..., None] * alpha * np.array([150, 170, 215], np.float32)
    return np.clip(out, 0, 255).astype(np.uint8)


def mist_layer(W, H, seed=3):
    rng = np.random.default_rng(seed)
    small = rng.random((H // 40 + 2, W // 40 + 2)).astype(np.float32)
    m = cv2.resize(small, (W, H), interpolation=cv2.INTER_CUBIC)
    m = cv2.GaussianBlur(m, (0, 0), 30)
    m = (m - m.min()) / (m.max() - m.min())
    fade = np.clip((np.arange(H, dtype=np.float32) - H * 0.45) / (H * 0.55), 0, 1)[:, None] ** 1.5
    return m * fade


# ---------------------------------------------------------------------------------------------------- setup


def setup(ctx):
    s = ctx.__dict__
    clock = ctx.clock
    sp = clock.spans
    # the 3D's cues, in each scene's own seconds
    cova_t0 = sp[COVA][0]
    lev_t0 = CEMITERIO_4
    cues = [
        {"modo": "cova", "dur": round(sp[COVA][1] - cova_t0 + 0.1, 3),
         "cues": {"twitch": round(MORTA + 0.6 - cova_t0, 3), "on": round(COVEIRO1 - cova_t0, 3)}},
        {"modo": "levanta", "dur": round(sp[REPLAY][1] - lev_t0 + 0.1, 3),
         "cues": {"flip": round(COMER - lev_t0, 3), "slam": round(COVEIRO2 - lev_t0, 3)}},
        {"modo": "lixo", "dur": round(sp[RECAP][1] - LIXO0 + 0.1, 3),
         "cues": {"flick": round(CATARRO - LIXO0, 3), "land": round(LIXO - LIXO0, 3)}},
    ]
    d3 = render3d(ctx, cues)
    s["fx_cova"] = Frames(d3, "cova")
    s["fx_lev"] = Frames(d3, "levanta")
    s["fx_lixo"] = Frames(d3, "lixo")
    s["fx_fundo"] = cv2.cvtColor(cv2.imread(str(d3 / "fundo.png")), cv2.COLOR_BGR2RGB).astype(np.float32)
    pa = rgba(d3 / "pa.png")
    ys, xs = np.nonzero(pa[..., 3] > 4)
    pa = cv2.resize(pa[ys.min():ys.max() + 1, xs.min():xs.max() + 1], None, fx=0.62, fy=0.62,
                    interpolation=cv2.INTER_AREA).astype(np.float32)
    g = pa[..., :3].mean(axis=2, keepdims=True)
    pa[..., :3] = np.clip((pa[..., :3] * 0.5 + g * 0.5) * np.array([0.8, 0.85, 1.05], np.float32) * 0.85, 0, 255)
    s["fx_pa"] = pa.astype(np.uint8)
    s["fx_mist"] = mist_layer(ctx.W, ctx.CAM_H)
    cov = Image.open(partes(ctx) / "coveiro.png").convert("RGB").resize((ctx.W, ctx.CAM_H), Image.LANCZOS)
    s["fx_cov_img"] = np.array(cov)
    s["fx_replay"] = Replay(interpolated(ctx))
    s["fx_retime"] = retime()
    s["fx_count"] = counter_sprites(ctx)
    s["fx_coveiro"] = label_sprite(ctx, "O COVEIRO", 66, arrow=True)
    s["fx_antes"] = label_sprite(ctx, "HORAS ANTES", 54)
    s["fx_semi"] = cv2.cvtColor(read_frame(ctx.VIDEOS / JOGO, SEMI_CARD), cv2.COLOR_BGR2RGB)[:, 420:1500]
    s["fx_banner"] = cv2.cvtColor(read_frame(ctx.VIDEOS / JOGO, BANNER), cv2.COLOR_BGR2RGB)[:, 420:1500]
    s["fx_logo"] = None
    w, c = s["fx_retime"]
    goal_w = float(np.interp(GOAL, c, w))
    print(f"  coveiro: no replay o gol cai em {goal_w:.2f} s do trecho (live {sp[REPLAY][0] + goal_w:.2f})")


def read_frame(path, t):
    cap = cv2.VideoCapture(str(path))
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, im = cap.read()
    return im


def logo_mask(ctx, top):
    """The virtual background's "muanlartins" logo (white, in the blue above his head), from the first frame keyed:
    keyed out with the Klein."""
    s = ctx.__dict__
    if s["fx_logo"] is None:
        c = top.astype(np.int16)
        white = (c.min(axis=2) > 95) & (c[..., 2] - c[..., 0] < 120) & (np.arange(top.shape[0])[:, None] < top.shape[0] * 0.3)
        m = cv2.dilate(white.astype(np.uint8), np.ones((15, 15), np.uint8))
        s["fx_logo"] = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2)
    return s["fx_logo"]


# ---------------------------------------------------------------------------------------------------- the halves


def game_replay(ctx, c, tw):
    """The replay's square at replay second c, with each touch's punch, flash and ring (tw: seconds since each touch
    in the short's time, for the decays)."""
    img = ctx.__dict__["fx_replay"].at(c).copy()
    z, fl = 1.0, 0.0
    for x in tw:
        z *= 1 + kick(x, 0.09, 0.12)
        fl = max(fl, kick(x, 0.55, 0.05))
    img = warp(img, z, *CONTACT)
    flash(img, fl)
    return img


def rings(f, ctx, tw, y0):
    cnt = ctx.__dict__["fx_count"]
    for x in tw:
        if 0 <= x < 0.35:
            u = x / 0.35
            ctx.place(f, cnt["anel"], CONTACT[0], y0 + CONTACT[1], 0.4 + 1.6 * u, (1 - u) ** 1.5)
            ctx.place(f, cnt["anel2"], CONTACT[0], y0 + CONTACT[1], 0.25 + 1.1 * u, (1 - u))


def counter(f, ctx, n, x, y):
    """The count n, slammed in x seconds ago."""
    cnt = ctx.__dict__["fx_count"][n]
    sc = 1 + 0.6 * (1 - smooth(x / 0.1)) if x < 0.1 else 1 + 0.06 * math.exp(-(x - 0.1) * 10) * math.cos((x - 0.1) * 40)
    ctx.place(f, cnt, ctx.W / 2, y, sc, min(1.0, x / 0.04 + 0.2))


def antes(f, o, ctx):
    s = ctx.__dict__
    W, CAM_H = ctx.W, ctx.CAM_H
    k, L = where(o, ctx)
    sp = ctx.clock.spans
    if k == COVA:
        top = f[:CAM_H]
        s["fx_t"] = L
        f[:CAM_H] = moonlit(top, s["fx_fundo"], s["fx_mist"], L, logo_mask(ctx, top))
        f[CAM_H:] = s["fx_cova"].at(L - sp[COVA][0])
        x = L - sp[COVA][0]
        if 0.25 < x < 2.6:  # "hours before"
            a = min(1.0, (x - 0.25) / 0.12) * min(1.0, (2.6 - x) / 0.2)
            blend(f, s["fx_antes"], 70, CAM_H + 60, a)
    elif k == NICK:
        g = s["fx_semi"] if L < OLHA else s["fx_banner"]
        if L < OLHA:
            z = 1 + 0.06 * (L - sp[NICK][0]) / (OLHA - sp[NICK][0])
            img = warp(g, z, 540, 540)
        else:
            # pushed in to the nick, then closer to the dot on "ponto"
            nx, ny = (NICK_BOX[0] + NICK_BOX[2]) / 2, (NICK_BOX[1] + NICK_BOX[3]) / 2
            u = smooth((L - OLHA) / 0.6)
            v = smooth((L - (PONTO - 0.1)) / 0.4)
            z = 1 + 1.0 * u + 0.45 * v
            cx, cy = nx + (DOT[0] - nx) * v, ny + (DOT[1] - ny) * v
            # the point lands at the square's middle: p = (m' - z·m) / (1 - z)
            tx, ty = 540, 520
            px, py = (tx - z * cx) / (1 - z), (ty - z * cy) / (1 - z)
            img = warp(g, z, px, py)
            if L >= PONTO:  # the dot circled
                u2 = min(1.0, (L - PONTO) / 0.35)
                circ = circle_sprite(52, 9, (255, 70, 60), u2)
                img = img.copy()
                dx, dy = tx + (DOT[0] - cx) * z, ty + (DOT[1] - cy) * z
                blend(img, circ, dx - circ.shape[1] / 2, dy - circ.shape[0] / 2)
            if L > PONTO - 0.1:  # suspicion: the edges darken
                vg = s.setdefault("fx_vin", vignette(1080, 1080))
                img = (img.astype(np.float32) * (1 - 0.55 * smooth((L - PONTO + 0.1) / 0.5) * vg[..., None])).astype(
                    np.uint8)
        f[CAM_H:] = img
    elif k == REPLAY:
        w0 = o - ctx.clock.starts[REPLAY]
        if L < CEMITERIO_4:
            wt, ct = s["fx_retime"]
            c = float(np.interp(w0, wt, ct))
            touch_w = [float(np.interp(t, ct, wt)) for t in TOUCH]
            tw = [w0 - x for x in touch_w]
            img = game_replay(ctx, c, tw)
            goal_w = float(np.interp(GOAL, ct, wt))
            flash(img, kick(w0 - goal_w, 0.85, 0.09))
            f[CAM_H:] = img
            rings(f, ctx, tw, CAM_H)
            n = sum(1 for x in tw if x >= 0)
            if n and w0 < goal_w + 0.6:
                counter(f, ctx, n, tw[n - 1], CAM_H + 120)
        else:
            top = f[:CAM_H]
            f[:CAM_H] = moonlit(top, s["fx_fundo"], s["fx_mist"], L, logo_mask(ctx, top))
            f[CAM_H:] = s["fx_lev"].at(L - CEMITERIO_4)
            x = L - REVELA
            if x >= 0:  # the gravedigger: him, photoreal (Gemini's edit of his own frame), cutting in
                z = 1 + 0.05 * min(1.0, x / 2.2) + kick(x, 0.14, 0.08)
                amp = kick(x, 10, 0.09)
                top = warp(s["fx_cov_img"], z, 540, 330, amp * math.sin(x * 120), amp * math.cos(x * 95))
                top = top.astype(np.float32)
                top += (np.random.default_rng(int(x * 60)).normal(0, 7, top.shape[:2]))[..., None]
                top *= 0.92 + 0.08 * math.sin(L * 13.1) * math.sin(L * 7.3 + 1)
                top = np.clip(top, 0, 255).astype(np.uint8)
                flash(top, kick(x, 0.8, 0.06))
                f[:CAM_H] = top
            x = L - COVEIRO2
            if x >= 0:  # "O COVEIRO", pointing at him
                lab = s["fx_coveiro"]
                sc = 1 + 0.5 * (1 - smooth(x / 0.1)) if x < 0.1 else 1.0
                ctx.place(f, lab, 800, 210 + lab.shape[0] / 2, sc, min(1.0, x / 0.05 + 0.3))
    elif k == RECAP:
        if L < LIXO0:
            if L < TRES_STAMP:
                i = min(2, max(0, int((L - TRES[0]) / 0.6)))
                x = L - TRES[i]
                c = TOUCH[i] + 0.4 * (min(x, 0.6) - 0.12)
                tw = [L - (TRES[j] + 0.12) for j in range(3) if j <= i]
                img = game_replay(ctx, c, [tw[-1]])
                f[CAM_H:] = img
                rings(f, ctx, [tw[-1]], CAM_H)
                n = sum(1 for x in tw if x >= 0)
                if n:
                    counter(f, ctx, n, tw[n - 1], CAM_H + 120)
            elif L < JOGOU:
                img = game_replay(ctx, TOUCH[2] + 0.12, [])
                img = (img.astype(np.float32) * 0.6).astype(np.uint8)
                f[CAM_H:] = img
                x = L - TRES_STAMP
                cnt = s["fx_count"]["tres"]
                sc = 1 + 0.7 * (1 - smooth(x / 0.12)) if x < 0.12 else 1.0
                ctx.place(f, cnt, W / 2, CAM_H + 540, sc, min(1.0, x / 0.05 + 0.2))
            else:  # the shot, slow, to the goal
                c = 8250.40 + (L - JOGOU) * 0.34
                img = game_replay(ctx, min(c, 8251.25), [])
                gw = JOGOU + (GOAL - 8250.40) / 0.34
                flash(img, kick(L - gw, 0.8, 0.09))
                f[CAM_H:] = img
        else:
            f[CAM_H:] = s["fx_lixo"].at(L - LIXO0)
    transition(f, o, ctx)
    return f


def vignette(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2))
    return np.clip((d - 0.45) / 0.8, 0, 1) ** 1.3


# ---------------------------------------------------------------------------------------------------- transitions

ENTRADAS = {COVA: "zoom", NICK: "whip", KICK: "whip", REPLAY: "zoom", RECAP: "whip"}


def transition(f, o, ctx):
    """destaque's transitions (Effects.transition), redone here over the swapped halves."""
    W, H = ctx.W, ctx.H
    before, after = 0.12, 0.2
    for k, kind in ENTRADAS.items():
        c = ctx.clock.starts[k]
        x = o - c
        if not -before <= x < after:
            continue
        u = ((x + before) / before) ** 2 if x < 0 else (1 - x / after) ** 2
        if kind == "whip":
            dx = -0.5 * W * u if x < 0 else 0.5 * W * u
            f[:] = cv2.warpAffine(f, np.float32([[1, 0, dx], [0, 1, 0]]), (W, H), flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_REFLECT101)
            kk = 1 + int(140 * u)
            if kk > 1:
                f[:] = cv2.blur(f, (kk, 1))
        else:
            z = 1 + 0.2 * u
            f[:] = cv2.warpAffine(f, np.float32([[z, 0, (1 - z) * W / 2], [0, z, (1 - z) * H / 2]]), (W, H),
                                  flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
            kk = 1 + int(24 * u)
            if kk > 1:
                f[:] = cv2.blur(f, (kk, kk))
            a = 0.55 * math.exp(-abs(x) / 0.05)
            f[:] = (f.astype(np.float32) * (1 - a) + 255 * a).astype(np.uint8)
    return f


# ---------------------------------------------------------------------------------------------------- the sound


def _env(t, attack, tau):
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / tau)


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


def impact(SR, size=1.0):
    """A hit that a phone plays: a sub falling, its saturated copy high-passed, a click on the frame."""
    t = np.arange(int(0.6 * SR)) / SR
    sub = np.sin(2 * np.pi * np.cumsum(48 + 110 * np.exp(-t / 0.03)) / SR) * _env(t, 0.002, 0.18 * size)
    mid = band(np.tanh(6 * sub), 150, 2500, SR)
    click = band(np.random.default_rng(1).standard_normal(len(t)), 1200, 6000, SR) * np.exp(-t / 0.004)
    return peak1(sub + 1.2 * peak1(mid) * np.exp(-t / 0.08) + 0.7 * peak1(click))


def chime(SR, notes):
    t = np.arange(int((0.06 * len(notes) + 0.8) * SR)) / SR
    out = np.zeros_like(t)
    for i, f0 in enumerate(notes):
        tt = np.maximum(t - 0.06 * i, 0)
        bell = sum(a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt / d)
                   for r, a, d in ((1, 1.0, 0.4), (2.0, 0.45, 0.22), (3.01, 0.25, 0.12), (4.2, 0.12, 0.07)))
        out += bell * (t >= 0.06 * i) * np.minimum(1, tt / 0.002)
    return peak1(out)


def whoom(SR, length=0.7):
    """Into slow motion: a whoosh falling in pitch, a tape slowing."""
    t = np.arange(int(length * SR)) / SR
    rng = np.random.default_rng(4)
    noise = rng.standard_normal(len(t))
    f = 2600 * (180 / 2600) ** (t / length)
    low = bp = 0.0
    out = np.zeros_like(t)
    for i in range(len(t)):
        g = 2 * math.sin(math.pi * f[i] / SR)
        hp = noise[i] - low - 0.5 * bp
        bp += g * hp
        low += g * bp
        out[i] = bp
    tone = np.sin(2 * np.pi * np.cumsum(220 * (60 / 220) ** (t / length)) / SR)
    return peak1((peak1(out) + 0.4 * tone) * _env(t, 0.05, length / 2.5))


def riser(SR, length):
    t = np.arange(int(length * SR)) / SR
    u = t / length
    f = 160 * (1200 / 160) ** (u ** 1.5)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    noise = np.random.default_rng(6).standard_normal(len(t))
    hp = noise - np.convolve(noise, np.ones(12) / 12, mode="same")
    return peak1((0.6 * tone + 0.8 * peak1(hp) * u) * u ** 2.2)


def wind(SR, length, seed=2):
    """Night wind: noise through a slowly wandering band, swelling and fading."""
    t = np.arange(int(length * SR)) / SR
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(len(t))
    f = 500 + 350 * np.sin(2 * np.pi * 0.23 * t + 1) + 180 * np.sin(2 * np.pi * 0.61 * t)
    low = bp = 0.0
    out = np.zeros_like(t)
    for i in range(len(t)):
        g = 2 * math.sin(math.pi * f[i] / SR)
        hp = noise[i] - low - 0.25 * bp
        bp += g * hp
        low += g * bp
        out[i] = bp
    env = np.minimum(1, t / 0.6) * np.minimum(1, (length - t) / 0.6) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.3 * t))
    return peak1(out * env)


def owl(SR):
    """An owl's hoot, twice."""
    out = np.zeros(int(1.1 * SR))
    for start, f0, ln in ((0.0, 420, 0.28), (0.45, 400, 0.5)):
        t = np.arange(int(ln * SR)) / SR
        f = f0 * (1 + 0.05 * np.sin(np.pi * t / ln)) * (1 - 0.06 * t / ln)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.15 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        x *= np.sin(np.pi * np.minimum(1, t / ln)) ** 0.8
        i = int(start * SR)
        out[i:i + len(x)] += x
    return peak1(out)


def bell(SR):
    """A distant church bell tolling once."""
    t = np.arange(int(3.0 * SR)) / SR
    f0 = 196.0
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / d)
            for r, a, d in ((0.5, 0.6, 2.2), (1, 1.0, 1.6), (1.19, 0.5, 1.1), (1.5, 0.35, 0.9), (2.0, 0.4, 0.7),
                            (2.74, 0.2, 0.4)))
    return peak1(x * np.minimum(1, t / 0.004))


def chirp(SR):
    """A car's lock chirp: the wink."""
    out = np.zeros(int(0.42 * SR))
    for start in (0.0, 0.2):
        t = np.arange(int(0.13 * SR)) / SR
        x = np.sign(np.sin(2 * np.pi * 1900 * t)) * 0.5 + np.sin(2 * np.pi * 3800 * t) * 0.3
        x *= np.minimum(1, t / 0.005) * np.minimum(1, (0.13 - t) / 0.02)
        i = int(start * SR)
        out[i:i + len(x)] += band(x.astype(np.float32), 600, 6000, SR)
    return peak1(out)


def organ(SR, notes, durs):
    """A church organ (drawbars: 16', 8', 4', 2 2/3', 2'), a little tremulant: the horror toccata's motif (Bach,
    public domain), played here."""
    total = sum(durs) + 1.2
    t_all = np.arange(int(total * SR)) / SR
    out = np.zeros_like(t_all)
    at = 0.0
    for chord, d in zip(notes, durs):
        n = int((d + 1.0) * SR)
        t = np.arange(n) / SR
        x = np.zeros(n)
        for f0 in chord:
            for r, a in ((0.5, 0.7), (1, 1.0), (2, 0.6), (3, 0.35), (4, 0.3)):
                x += a * np.sin(2 * np.pi * f0 * r * t * (1 + 0.002 * np.sin(2 * np.pi * 6 * t)))
        env = np.minimum(1, t / 0.015) * np.where(t < d, 1.0, np.exp(-(t - d) / 0.35))
        i = int(at * SR)
        out[i:i + n] += (x * env)[:len(out) - i]
        at += d
    # a room
    wet = np.zeros_like(out)
    for dl, g in ((0.031, 0.5), (0.057, 0.4), (0.089, 0.33), (0.13, 0.25), (0.21, 0.18)):
        j = int(dl * SR)
        wet[j:] += out[:-j] * g
    return peak1(np.tanh(0.8 * peak1(out + wet)))


def stone(SR):
    """A heavy stone slab slamming into earth: a deep thud, a gritty crunch and dirt raining."""
    t = np.arange(int(1.4 * SR)) / SR
    rng = np.random.default_rng(9)
    thud = np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-t / 0.04)) / SR) * _env(t, 0.002, 0.25)
    growl = band(np.tanh(5 * thud), 120, 1800, SR)
    crunch = band(rng.standard_normal(len(t)), 300, 4000, SR) * np.exp(-t / 0.07)
    rain = band(rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.004), 1500, 8000, SR) * np.exp(-t / 0.5)
    return peak1(thud + 1.1 * peak1(growl) * np.exp(-t / 0.12) + 0.8 * peak1(crunch) + 0.4 * peak1(rain))


def rev(SR):
    """An engine waking: a growl rising and settling."""
    t = np.arange(int(1.0 * SR)) / SR
    f = 55 + 70 * np.sin(np.pi * np.minimum(1, t / 0.6)) ** 2
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 12)) * (1 + 0.3 * np.sign(np.sin(ph * 0.5)))
    return peak1(band(np.tanh(2 * x), 60, 3000, SR) * _env(t, 0.03, 0.45))


def spit(SR):
    """A "ptui": the lips' pop and a wet hiss."""
    t = np.arange(int(0.35 * SR)) / SR
    rng = np.random.default_rng(13)
    pop = np.sin(2 * np.pi * np.cumsum(300 + 900 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.02)
    hiss = band(rng.standard_normal(len(t)), 2500, 9000, SR) * _env(t, 0.01, 0.06)
    return peak1(pop + 0.8 * peak1(hiss))


def clang(SR):
    """A steel lid clanging shut, with a hollow ring."""
    t = np.arange(int(1.2 * SR)) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d)
            for f, a, d in ((523, 1.0, 0.35), (1187, 0.7, 0.22), (1873, 0.5, 0.15), (2961, 0.35, 0.09), (317, 0.6, 0.4)))
    hit = band(np.random.default_rng(14).standard_normal(len(t)), 1500, 9000, SR) * np.exp(-t / 0.006)
    thud = np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.08)
    return peak1(x * np.minimum(1, t / 0.001) + 0.8 * peak1(hit) + 0.7 * thud)


def marker(SR, length=0.35):
    """A marker squeaking round the circle."""
    t = np.arange(int(length * SR)) / SR
    f = 2200 + 600 * np.sin(2 * np.pi * 7 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
    noise = band(np.random.default_rng(15).standard_normal(len(t)), 3000, 9000, SR)
    return peak1((0.4 * x + peak1(noise)) * np.minimum(1, t / 0.02) * np.minimum(1, (length - t) / 0.05))


def suspense(SR):
    """Three low brass stabs: dun, dun, DUN."""
    out = np.zeros(int(2.0 * SR))
    for start, f0, ln, g in ((0.0, 73.4, 0.18, 0.7), (0.24, 69.3, 0.18, 0.7), (0.5, 65.4, 1.2, 1.0)):
        t = np.arange(int(ln * SR)) / SR
        ph = 2 * np.pi * f0 * t
        x = sum(np.sin(k * ph) / k for k in range(1, 18))
        x = np.tanh(1.5 * x) * np.minimum(1, t / 0.01) * np.exp(-t / (0.08 if ln < 0.5 else 0.5))
        i = int(start * SR)
        out[i:i + len(x)] += g * x
    return peak1(band(out.astype(np.float32), 50, 3000, SR))


def sons(ctx):
    SR, clock = ctx.SR, ctx.clock
    st, sp = clock.starts, clock.spans
    s = ctx.__dict__
    out = []
    # transitions' sounds (destaque's own, redone since the stretches are "seco")
    for k, kind in ENTRADAS.items():
        o = st[k]
        if kind == "whip":
            out.append((o - 0.42 * 0.62, "whoosh", -10))
        else:
            out += [(o - 0.26 * 0.62, "whoosh_curto", -12), (o, "hit", -12)]

    def at(live, k):
        return clock.out(live, k)
    # the hook: the goal going in
    out += [(0.0, "whoosh_curto", -16), (at(8242.47, HOOK), impact(SR, 1.3), -9), (at(8242.47, HOOK), "impact-boom", -13)]
    # the cemetery (1): wind, an owl, the bell on "morta", the wink at "coveiro", a sting on "é isso?"
    out.append((st[COVA], wind(SR, sp[COVA][1] - sp[COVA][0]), -24))
    out.append((st[COVA] + 0.6, owl(SR), -22))
    out.append((at(MORTA, COVA), bell(SR), -20))
    out.append((at(COVEIRO1, COVA), chirp(SR), -18))
    # the nick: the push, the marker round the dot, three low stabs
    out.append((at(OLHA, NICK) - 0.1, "whoosh_curto", -16))
    out.append((at(PONTO, NICK), marker(SR), -18))
    out.append((at(PONTO, NICK) + 0.05, suspense(SR), -15))
    # the replay: a riser into the first touch, the slow-motion whoom, a hit and a chime a note higher per touch
    wt, ct = s["fx_retime"]
    t0 = st[REPLAY]
    touch_o = [t0 + float(np.interp(t, ct, wt)) for t in TOUCH]
    goal_o = t0 + float(np.interp(GOAL, ct, wt))
    out.append((t0 + 0.1, riser(SR, touch_o[0] - t0 - 0.1), -17))
    notes = (1046.5, 1318.5, 1568.0, 2093.0)
    for i, o in enumerate(touch_o):
        out += [(o, impact(SR, 0.8), -11), (o + 0.02, chime(SR, notes[:i + 2]), -16)]
        if i != 2:
            out.append((o - 0.15, whoom(SR, 0.6), -19))
    out += [(goal_o, impact(SR, 1.4), -8), (goal_o, "impact-boom", -12), (goal_o + 0.05, "uuuh", -18)]
    # the cemetery (4): wind, the engine at "comer", the stone slamming at "coveiro" with the organ
    lev = at(CEMITERIO_4, REPLAY)
    out.append((lev, wind(SR, sp[REPLAY][1] - CEMITERIO_4 + 0.5, 5), -24))
    out.append((at(REVELA, REPLAY), impact(SR, 0.9), -14))
    out.append((at(COMER, REPLAY), rev(SR), -16))
    out.append((at(COMER, REPLAY) + 0.5, chirp(SR), -20))
    out.append((at(COVEIRO2, REPLAY), stone(SR), -10))
    out.append((at(COVEIRO2, REPLAY) - 0.02, organ(SR, [(440.0, 880.0), (392.0, 784.0), (440.0, 880.0),
                                                          (293.66, 349.23, 440.0, 587.33)],
                                                     [0.09, 0.09, 0.32, 0.9]), -17))
    # the recap: a hit and the chime for each touch, the stamp, the shot's goal
    for i, live in enumerate(TRES):
        out += [(at(live + 0.12, RECAP), impact(SR, 0.7), -13), (at(live + 0.12, RECAP), chime(SR, notes[:i + 2]), -17)]
    out += [(at(TRES_STAMP, RECAP), impact(SR, 1.2), -10), (at(TRES_STAMP, RECAP), "palmas", -18)]
    gw = JOGOU + (GOAL - 8250.40) / 0.34
    if gw < LIXO0:
        out.append((at(gw, RECAP), impact(SR, 1.0), -14))
    out.append((at(JOGOU, RECAP) - 0.1, whoom(SR, 0.6), -19))
    # the trash can: the spit as the ball flies, the lid clanging
    out.append((at(CATARRO, RECAP), spit(SR), -14))
    out.append((at(LIXO + 0.08, RECAP), clang(SR), -13))
    return out
