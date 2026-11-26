"""Vou me casar com o Claude (2026-11-24): the Cláudio pair, one continuous scene of the live (Luan calls Claude
"Cláudio"): the Sigma filter Claude made came out ugly, "parece que eu tô com caxumba… nunca mais eu confio no
Cláudio", and a minute later "se eu pudesse me casar com o Cláudio…". Luan, 11-26: "edição comigo com filtro de
esposa com o Claude do lado quando falar a palhaçada".

- the hook: the save, then the live's own Sigma (Lance ruim) on the camera, taken from Live.mp4 as it aired, under
  the title; "isso ficou horrível": its ugliest frame frozen in the lower half with a red stamp.
- "eu pedi pro Cláudio fazer um filtro de Sigma": Claude, drawn here (an orange spark with a face; no logo), pops up
  proud; "parece que eu tô com caxumba": photoreal him with mumps (Gemini, from his own frame: cheeks swollen, an ice
  pack tied with a bandage, a thermometer) cuts in on the camera, and the lower half is the medical report.
- "nunca mais eu confio no Cláudio, vou ter que inspecionar o trabalho dele": Claude sweating under a magnifying
  glass, "REPROVADO".
- "ele é o cara… se eu pudesse me casar com o Cláudio": the bride filter on him (the veil, tiara and bouquet of a
  Gemini edit of his own frame, cut out and laid on the live camera, following his face), Claude beside him in a top
  hat and bow tie, the lower half a chapel with bells; "pode anotar aí": the marriage certificate, stamped; "eu não
  vivo sem ele": hearts.
- "é brincadeira, tá, Cláudio? Não vem me cobrar daqui a 20 anos": a record scratch, the veil gone, the chapel grey,
  Claude sad; "20 ANOS DEPOIS…", and old Claude with a sign: "E O CASAMENTO?".

Shared helpers come from 2026-11-24-palhacadas.py.
"""
import importlib.util
import math
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

_spec = importlib.util.spec_from_file_location("palhacadas_comum", Path(__file__).with_name("2026-11-24-palhacadas.py"))
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)
D = P.D
S = P.S  # the shared state (P's helpers read S["ctx"])

PARTES = "Lives/2026-11-24/Shorts/Partes/claude"
CORTES = {1: "seco", 2: "whip", 3: "zoom", 4: "seco"}
CORAL = (217, 119, 87)

# live seconds
LANCE = (10906.1, 10909.8)  # the live's Lance ruim (Sigma) on the camera
FEIO = 10908.95  # its ugliest frame
HORRIVEL = 10912.44
PEDI = 10916.68
CAXUMBA = 10919.94
CAXUMBA_FIM = 10922.2
CONFIO = 10946.81
INSPECIONAR = 10949.25
TRABALHO = 10950.72
CARA = 10960.23
CASAR = 10962.54
ANOTAR = 10976.45
VIVO = 10979.97
BRINCADEIRA = 10988.85  # the last stretch's first frame
ANOS = 10993.73  # "daqui a 20 anos"


# ---------------------------------------------------------------------------------------------------- Claude, drawn


def claude_sprite(size=520, face="feliz", hat=False, bow=False, old=False, sign=None):
    """Claude as a character: an orange spark (rounded rays round a disc) with a face. RGBA, drawn at 2× and halved."""
    k = 2
    s = size * k
    im = Image.new("RGBA", (s, s))
    d = ImageDraw.Draw(im)
    cx, cy = s / 2, s * 0.55
    R, r0 = s * 0.36, s * 0.2
    coral = CORAL + (255,)
    dark = (168, 78, 52, 255)
    rng = np.random.default_rng(7)
    for i in range(12):
        a = i / 12 * 2 * math.pi + 0.13
        L = R * (0.82 + 0.25 * rng.random())
        wdt = s * 0.052
        x1, y1 = cx + math.cos(a) * L, cy + math.sin(a) * L
        # a capsule: a thick line with round ends, outlined
        d.line([(cx, cy), (x1, y1)], fill=dark, width=int(wdt * 2 + 10))
        d.ellipse((x1 - wdt - 5, y1 - wdt - 5, x1 + wdt + 5, y1 + wdt + 5), fill=dark)
    rng = np.random.default_rng(7)
    for i in range(12):
        a = i / 12 * 2 * math.pi + 0.13
        L = R * (0.82 + 0.25 * rng.random())
        wdt = s * 0.052
        x1, y1 = cx + math.cos(a) * L, cy + math.sin(a) * L
        d.line([(cx, cy), (x1, y1)], fill=coral, width=int(wdt * 2))
        d.ellipse((x1 - wdt, y1 - wdt, x1 + wdt, y1 + wdt), fill=coral)
    d.ellipse((cx - r0 - 5, cy - r0 - 5, cx + r0 + 5, cy + r0 + 5), fill=dark)
    d.ellipse((cx - r0, cy - r0, cx + r0, cy + r0), fill=coral)
    # face
    ex, ey, er = r0 * 0.42, cy - r0 * 0.12, r0 * 0.2
    black, white = (20, 16, 24, 255), (255, 255, 255, 255)
    if face == "apaixonado":
        for sx in (-1, 1):
            hx = cx + sx * ex
            heart(d, hx, ey, er * 1.25, (230, 30, 70, 255))
    elif face == "triste":
        for sx in (-1, 1):
            hx = cx + sx * ex
            d.ellipse((hx - er * 0.7, ey - er * 0.6, hx + er * 0.7, ey + er * 0.9), fill=black)
            d.line([(hx - er, ey - er * 1.3 + sx * 0), (hx + er, ey - er * 1.3 - sx * er * 0.6)], fill=black,
                   width=int(s * 0.012))
        d.ellipse((cx + ex - er * 0.3, ey + er * 1.1, cx + ex + er * 0.3, ey + er * 2.0), fill=(120, 190, 255, 255))
    else:
        for sx in (-1, 1):
            hx = cx + sx * ex
            d.ellipse((hx - er * 0.75, ey - er, hx + er * 0.75, ey + er), fill=black)
            d.ellipse((hx - er * 0.35, ey - er * 0.7, hx + er * 0.05, ey - er * 0.25), fill=white)
    my = cy + r0 * 0.38
    mw = r0 * 0.42
    if face in ("feliz", "apaixonado"):
        d.arc((cx - mw, my - mw * 0.7, cx + mw, my + mw * 0.7), 15, 165, fill=black, width=int(s * 0.016))
    elif face == "suando":
        pts = [(cx - mw + i * mw / 3, my + (8 if i % 2 else -8) * k) for i in range(7)]
        d.line(pts, fill=black, width=int(s * 0.012))
        d.polygon([(cx + r0 * 0.95, cy - r0 * 0.75), (cx + r0 * 0.82, cy - r0 * 0.38), (cx + r0 * 1.08, cy - r0 * 0.38)],
                  fill=(140, 210, 255, 255))
        d.ellipse((cx + r0 * 0.8, cy - r0 * 0.55, cx + r0 * 1.1, cy - r0 * 0.25), fill=(140, 210, 255, 255))
    elif face == "triste":
        d.arc((cx - mw, my, cx + mw, my + mw * 1.2), 200, 340, fill=black, width=int(s * 0.016))
    if face == "apaixonado":
        for sx in (-1, 1):
            bx = cx + sx * r0 * 0.68
            d.ellipse((bx - r0 * 0.18, my - r0 * 0.12, bx + r0 * 0.18, my + r0 * 0.06), fill=(255, 120, 130, 200))
    if old:
        grey = (235, 235, 235, 255)
        for sx in (-1, 1):  # bushy brows
            hx = cx + sx * ex
            d.ellipse((hx - er * 1.2, ey - er * 1.9, hx + er * 1.2, ey - er * 1.1), fill=grey)
        d.ellipse((cx - mw * 1.3, my - r0 * 0.08, cx + mw * 1.3, my + r0 * 0.5), fill=grey)  # moustache/beard
        for sx in (-1, 1):  # round glasses
            hx = cx + sx * ex
            d.ellipse((hx - er * 1.3, ey - er * 1.3, hx + er * 1.3, ey + er * 1.3), outline=black, width=int(s * 0.01))
        # a cane
        d.line([(cx + R * 0.95, cy - R * 0.1), (cx + R * 1.0, s * 0.98)], fill=(110, 70, 40, 255), width=int(s * 0.03))
        d.arc((cx + R * 0.75, cy - R * 0.32, cx + R * 1.15, cy + R * 0.08), 180, 360, fill=(110, 70, 40, 255),
              width=int(s * 0.03))
    if hat:
        hw, hh = r0 * 1.15, r0 * 1.25
        top = cy - R * 0.62
        d.rectangle((cx - hw * 0.62, top - hh, cx + hw * 0.62, top), fill=(18, 18, 22, 255))
        d.rectangle((cx - hw * 0.62, top - hh * 0.32, cx + hw * 0.62, top - hh * 0.12), fill=(200, 30, 60, 255))
        d.ellipse((cx - hw, top - hh * 0.12, cx + hw, top + hh * 0.16), fill=(18, 18, 22, 255))
    if bow:
        by, bw2 = cy + R * 0.66, r0 * 0.55
        d.polygon([(cx, by), (cx - bw2, by - bw2 * 0.55), (cx - bw2, by + bw2 * 0.55)], fill=(18, 18, 22, 255))
        d.polygon([(cx, by), (cx + bw2, by - bw2 * 0.55), (cx + bw2, by + bw2 * 0.55)], fill=(18, 18, 22, 255))
        d.ellipse((cx - bw2 * 0.22, by - bw2 * 0.22, cx + bw2 * 0.22, by + bw2 * 0.22), fill=(40, 40, 46, 255))
    if sign:
        font = S["ctx"].grotesk(int(s * 0.1))
        sw, sh = s * 0.96, s * 0.22
        sx0, sy0 = cx - sw / 2, s * 0.03
        d.line([(cx - sw * 0.3, sy0 + sh), (cx - R * 0.5, cy)], fill=(110, 70, 40, 255), width=int(s * 0.02))
        d.rectangle((sx0, sy0, sx0 + sw, sy0 + sh), fill=(250, 244, 228, 255), outline=(110, 70, 40, 255),
                    width=int(s * 0.012))
        d.text((cx, sy0 + sh / 2), sign, font=font, fill=(30, 30, 40), anchor="mm")
    out = im.resize((size, size), Image.LANCZOS)
    return np.array(P.shadowed(out))


def heart(d, x, y, r, fill):
    d.ellipse((x - r, y - r * 0.9, x, y + r * 0.1), fill=fill)
    d.ellipse((x, y - r * 0.9, x + r, y + r * 0.1), fill=fill)
    d.polygon([(x - r * 0.97, y - r * 0.25), (x + r * 0.97, y - r * 0.25), (x, y + r * 1.0)], fill=fill)


def heart_sprite(size=90, color=(235, 40, 80)):
    im, d = P.pil_rgba(size, size)
    heart(d, size / 2, size * 0.45, size * 0.42, color + (255,))
    return np.array(im)


def lupa_sprite(r=170):
    """A magnifying glass, RGBA, the lens's middle at (r + 20, r + 20)."""
    s = int(r * 3.4)
    im, d = P.pil_rgba(s, s)
    c = r + 20
    d.line([(c + r * 0.7, c + r * 0.7), (c + r * 1.9, c + r * 1.9)], fill=(60, 40, 20, 255), width=int(r * 0.32))
    d.ellipse((c - r - 14, c - r - 14, c + r + 14, c + r + 14), outline=(40, 40, 46, 255), width=26)
    d.ellipse((c - r, c - r, c + r, c + r), outline=(200, 200, 210, 255), width=6)
    return np.array(im), c


# ---------------------------------------------------------------------------------------------------- cards


def laudo(size, foto):
    """The medical report: a white card, the photo (the Sigma's ugliest frame), CAXUMBA."""
    c = S["ctx"].cores
    im = Image.new("RGB", (size, size), (225, 236, 240))
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = 70, 300, size - 70, size - 230
    d.rounded_rectangle((x0 + 8, y0 + 12, x1 + 8, y1 + 12), 26, fill=(170, 185, 195))
    d.rounded_rectangle((x0, y0, x1, y1), 26, fill=(255, 255, 255))
    d.rounded_rectangle((x0, y0, x1, y0 + 110), 26, fill=(214, 40, 46))
    d.rectangle((x0, y0 + 60, x1, y0 + 110), fill=(214, 40, 46))
    big, mid, sm = S["ctx"].grotesk(64), S["ctx"].grotesk(44), S["ctx"].grotesk(34)
    cxr, cyr = x0 + 70, y0 + 55
    d.rectangle((cxr - 12, cyr - 34, cxr + 12, cyr + 34), fill=(255, 255, 255))
    d.rectangle((cxr - 34, cyr - 12, cxr + 34, cyr + 12), fill=(255, 255, 255))
    d.text((x0 + 130, y0 + 55), "LAUDO MÉDICO", font=big, fill=(255, 255, 255), anchor="lm")
    ph = Image.fromarray(foto).resize((300, 300), Image.LANCZOS)
    im.paste(ph, (x0 + 40, y0 + 150))
    d.rectangle((x0 + 40, y0 + 150, x0 + 340, y0 + 450), outline=(40, 40, 50), width=4)
    tx = x0 + 380
    d.text((tx, y0 + 160), "PACIENTE", font=sm, fill=(120, 120, 130))
    d.text((tx, y0 + 200), "LUAN MARTINS", font=mid, fill=(20, 20, 30))
    d.text((tx, y0 + 290), "CAUSA", font=sm, fill=(120, 120, 130))
    d.text((tx, y0 + 330), "FILTRO SIGMA", font=mid, fill=(20, 20, 30))
    d.text((tx, y0 + 385), "DO CLÁUDIO", font=mid, fill=(20, 20, 30))
    d.text((x0 + 40, y0 + 470), "DIAGNÓSTICO", font=sm, fill=(120, 120, 130))
    return np.array(im)


def certidao():
    """The marriage certificate, RGBA."""
    w, h = 900, 640
    im, d = P.pil_rgba(w, h)
    d.rectangle((0, 0, w - 1, h - 1), fill=(250, 243, 222, 255))
    d.rectangle((18, 18, w - 19, h - 19), outline=(170, 130, 60, 255), width=6)
    d.rectangle((34, 34, w - 35, h - 35), outline=(170, 130, 60, 255), width=2)
    t, big, mid, sm = (S["ctx"].grotesk(52), S["ctx"].grotesk(64), S["ctx"].grotesk(40), S["ctx"].grotesk(30))
    ink = (60, 40, 20)
    d.text((w / 2, 95), "CERTIDÃO DE CASAMENTO", font=t, fill=ink, anchor="mm")
    d.line([(150, 140), (w - 150, 140)], fill=(170, 130, 60), width=3)
    d.text((w / 2, 230), "LUAN MARTINS", font=big, fill=(20, 20, 30), anchor="mm")
    heart(d, w / 2, 300, 26, (220, 40, 80, 255))
    d.text((w / 2, 380), "CLÁUDIO (A IA)", font=big, fill=(20, 20, 30), anchor="mm")
    d.text((w / 2, 470), "o 1º casamento entre humanos e máquinas", font=sm, fill=ink, anchor="mm")
    d.text((w / 2, 520), "24/11/2026 · pode anotar aí", font=sm, fill=(120, 100, 80), anchor="mm")
    # signatures
    for x0 in (90, w - 330):
        d.line([(x0, h - 70), (x0 + 240, h - 70)], fill=ink, width=2)
    pts = [(110 + i * 9, h - 90 + 14 * math.sin(i * 0.9)) for i in range(22)]
    d.line(pts, fill=(30, 40, 120), width=4)
    return np.array(P.shadowed(im))


def capela(size):
    """A chapel decorated for a wedding, drawn: warm light, two arched windows, an arch of roses, the aisle."""
    w = h = size
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np.array((252, 236, 222), np.float32)
    deep = np.array((214, 168, 150), np.float32)
    glow = np.clip(1 - np.hypot((x - w / 2) / w, (y - h * 0.35) / h) * 1.3, 0, 1)[..., None]
    img = deep * (1 - glow) + base * glow
    img = img.astype(np.uint8).copy()
    im = Image.fromarray(img)
    d = ImageDraw.Draw(im)
    for cx in (200, w - 200):  # windows with light
        d.rounded_rectangle((cx - 80, 330, cx + 80, 720), 80, fill=(255, 250, 225))
        d.line([(cx, 330), (cx, 720)], fill=(220, 200, 170), width=6)
        d.line([(cx - 80, 520), (cx + 80, 520)], fill=(220, 200, 170), width=6)
    # aisle in perspective, petals
    d.polygon([(w / 2 - 70, 760), (w / 2 + 70, 760), (w / 2 + 330, h), (w / 2 - 330, h)], fill=(196, 40, 60))
    d.polygon([(w / 2 - 50, 760), (w / 2 + 50, 760), (w / 2 + 280, h), (w / 2 - 280, h)], fill=(232, 228, 222))
    rng = np.random.default_rng(3)
    for _ in range(70):
        px, py = rng.uniform(w / 2 - 300, w / 2 + 300), rng.uniform(780, h)
        d.ellipse((px - 7, py - 4, px + 7, py + 4), fill=(255, 150, 170))
    # chairs with ribbons
    for row in range(5):
        yy = 800 + row * 60
        sp = 120 + row * 60
        for sx in (-1, 1):
            for j in range(2):
                xx = w / 2 + sx * (sp + 40 + j * 80 + row * 20)
                d.rounded_rectangle((xx - 30, yy - 50, xx + 30, yy + 10), 8, fill=(255, 255, 255), outline=(200, 190, 180))
                d.ellipse((xx - 10, yy - 40, xx + 10, yy - 22), fill=(255, 170, 190))
    # the arch of roses
    for i in range(70):
        a = math.pi * (i / 69)
        r = 330
        px, py = w / 2 - math.cos(a) * r, 760 - math.sin(a) * r * 1.25
        for k in range(2):
            ox, oy = rng.uniform(-30, 30), rng.uniform(-30, 30)
            d.ellipse((px + ox - 34, py + oy - 22, px + ox + 34, py + oy + 22), fill=(80, 140, 70))
        col = (255, 255, 255) if i % 3 else (255, 190, 205)
        d.ellipse((px - 26, py - 26, px + 26, py + 26), fill=col, outline=(230, 220, 215))
    return np.array(im)


def sino_sprite(size=150):
    im, d = P.pil_rgba(size, size)
    gold, dark = (240, 190, 60, 255), (170, 120, 30, 255)
    d.polygon([(size * 0.5, size * 0.08), (size * 0.78, size * 0.3), (size * 0.9, size * 0.82), (size * 0.1, size * 0.82),
               (size * 0.22, size * 0.3)], fill=gold, outline=dark)
    d.ellipse((size * 0.06, size * 0.75, size * 0.94, size * 0.9), fill=dark)
    d.ellipse((size * 0.42, size * 0.84, size * 0.58, size * 0.98), fill=dark)
    d.ellipse((size * 0.3, size * 0.25, size * 0.4, size * 0.6), fill=(255, 235, 150, 255))
    return np.array(im)


def anos_card():
    """"20 ANOS DEPOIS…", the time card, in the channel's look."""
    c = S["ctx"].cores
    im = Image.new("RGB", (1080, 1080), c["klein"])
    d = ImageDraw.Draw(im)
    for k in range(-1080, 2160, 44):
        d.line([(k, 0), (k + 1080, 1080)], fill=(20, 70, 190), width=2)
        d.line([(k + 1080, 0), (k, 1080)], fill=(20, 70, 190), width=2)
    big = S["ctx"].grotesk(150)
    d.text((540, 480), "20 ANOS", font=big, fill=c["branco"], anchor="mm", stroke_width=8, stroke_fill=c["klein_escuro"])
    d.text((540, 650), "DEPOIS…", font=big, fill=(255, 220, 60), anchor="mm", stroke_width=8,
           stroke_fill=c["klein_escuro"])
    return np.array(im)


def fundo_klein(size):
    c = S["ctx"].cores
    y, x = np.mgrid[0:size, 0:size].astype(np.float32) / size - 0.5
    glow = np.clip(1 - np.sqrt(x ** 2 + (y * 1.2) ** 2) * 1.5, 0, 1)[..., None]
    img = np.array(c["noite"], np.float32) * (1 - glow) + np.array(c["klein"], np.float32) * glow
    k = np.mgrid[0:size, 0:size]
    lattice = (((k[0] + k[1]) % 44 < 2) | ((k[0] - k[1]) % 44 < 2))[..., None]
    return np.where(lattice, img * 0.9 + 25, img).astype(np.uint8)


# ---------------------------------------------------------------------------------------------------- the live's Sigma


class Fonte:
    """Frames of Live.mp4 (cropped round his face, 1080×840) read in order through one ffmpeg."""
    CROP = (502, 25, 1157, 900)

    def __init__(self, ctx, a, b):
        self.live = ctx.VIDEOS / "Lives" / "2026-11-24" / "15-15-16 Live.mp4"
        self.a, self.b, self.fps, self.proc, self.n, self.last = a, b, ctx.FPS, None, -1, None

    def get(self, t):
        i = int(round((t - self.a) * self.fps))
        if self.proc is None or i < self.n or i > self.n + 30:
            if self.proc:
                self.proc.kill()
            x, y, w, h = self.CROP
            self.proc = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{self.a + i / self.fps:.4f}", "-i",
                                          str(self.live), "-vf", f"fps={self.fps},crop={w}:{h}:{x}:{y},scale=1080:840",
                                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
            self.n = i - 1
        while self.n < i:
            buf = self.proc.stdout.read(1080 * 840 * 3)
            if len(buf) < 1080 * 840 * 3:
                break
            self.last = np.frombuffer(buf, np.uint8).reshape(840, 1080, 3)
            self.n += 1
        return self.last


def still(ctx, t):
    x, y, w, h = Fonte.CROP
    live = ctx.VIDEOS / "Lives" / "2026-11-24" / "15-15-16 Live.mp4"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(live), "-frames:v", "1", "-vf",
                          f"crop={w}:{h}:{x}:{y},scale=1080:840", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(840, 1080, 3).copy()


# ---------------------------------------------------------------------------------------------------- the bride


def veu(ctx):
    """The bride's costume cut out of the Gemini edit: where it differs from his frame (veil, tiara, bouquet), as
    alpha; and his face in the reference (Haar), to lay it on each frame."""
    edit = np.array(Image.open(ctx.VIDEOS / PARTES / "noiva.png").convert("RGB").resize((1080, 840), Image.LANCZOS))
    ref = np.array(Image.open(ctx.VIDEOS / PARTES / "noiva-ref.png").convert("RGB").resize((1080, 840), Image.LANCZOS))
    lab_e = cv2.cvtColor(edit, cv2.COLOR_RGB2LAB).astype(np.float32)
    lab_r = cv2.cvtColor(ref, cv2.COLOR_RGB2LAB).astype(np.float32)
    diff = np.linalg.norm(cv2.GaussianBlur(lab_e, (0, 0), 2) - cv2.GaussianBlur(lab_r, (0, 0), 2), axis=2)
    a = np.clip((diff - 10) / 30, 0, 1)
    # whitish things only (veil, tiara, roses) plus the bouquet's leaves at the foot
    bright = np.clip((edit.astype(np.float32).mean(axis=2) - 95) / 50, 0, 1)
    foot = np.zeros_like(a)
    foot[560:, 330:760] = 1
    a = np.maximum(a * bright, a * foot)
    # not his face: an ellipse round it stays his own
    face = np.zeros_like(a)
    cv2.ellipse(face, ROSTO[:2], ROSTO[2:], 0, 0, 360, 1, -1)
    face = cv2.GaussianBlur(face, (0, 0), 12)
    a = a * (1 - face)
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 1.5)
    return np.dstack([edit, (a * 255).astype(np.uint8)]), ref


ROSTO = (673, 595, 150, 215)  # his face in noiva-ref.png (centre, half axes): kept his own
OCULOS = (530, 480, 290, 120)  # his glasses there: the patch followed frame by frame


def lay(top, costume, shift):
    """The costume (RGBA, in the reference's frame) moved by his glasses' shift in this frame."""
    dx, dy = shift
    m = np.float32([[1, 0, dx], [0, 1, dy]])
    warped = cv2.warpAffine(costume, m, (top.shape[1], top.shape[0]), flags=cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0)).astype(np.float32)
    a = warped[..., 3:4] / 255
    top[:] = (top.astype(np.float32) * (1 - a) + warped[..., :3] * a).astype(np.uint8)


def shift_at(o):
    fr = S["c_trilha"]
    n = int(round(o * S["ctx"].FPS))
    if n not in fr:
        n = min(fr, key=lambda q: abs(q - n))
    return fr[n]


# ---------------------------------------------------------------------------------------------------- setup


def setup(ctx):
    S.clear()
    S["ctx"] = ctx
    S["cortes"] = P.cuts(ctx, CORTES)
    T = P.T
    G = ctx.GAME_H
    S["fonte"] = Fonte(ctx, LANCE[0] - 0.1, LANCE[1] + 0.2)
    feio = still(ctx, FEIO)
    rosto = feio[130:810, 250:930]  # the Sigma's face, without the camera's logo
    S["feio"] = cv2.resize(rosto, (G, G), interpolation=cv2.INTER_CUBIC)
    S["horrivel"] = P.stamp_sprite(["HORRÍVEL"], size=130, angle=-10)
    S["caxumba"] = np.array(Image.open(ctx.VIDEOS / PARTES / "caxumba.png").convert("RGB").resize((1080, 840),
                                                                                                  Image.LANCZOS))
    S["laudo"] = laudo(G, cv2.resize(rosto, (300, 300), interpolation=cv2.INTER_AREA))
    S["caxumba_stamp"] = P.stamp_sprite(["CAXUMBA"], size=120, angle=-6)
    S["klein"] = fundo_klein(G)
    S["c_feliz"] = claude_sprite(560, "feliz")
    S["c_suando"] = claude_sprite(560, "suando")
    S["c_noivo"] = claude_sprite(330, "apaixonado", hat=True, bow=True)
    S["c_noivo_triste"] = claude_sprite(330, "triste", hat=True, bow=True)
    S["c_amor"] = claude_sprite(560, "apaixonado")
    S["c_velho"] = claude_sprite(640, "feliz", old=True, sign="E O CASAMENTO?")
    S["lupa"], S["lupa_c"] = lupa_sprite(170)
    S["reprovado"] = P.stamp_sprite(["REPROVADO"], size=110, angle=-9)
    S["casados"] = P.stamp_sprite(["CASADOS"], color=(200, 30, 80), size=80, angle=-12)
    S["certidao"] = certidao()
    S["capela"] = capela(G)
    S["sino"] = sino_sprite(170)
    S["coracao"] = heart_sprite(90)
    S["anos"] = anos_card()
    S["t_claudio"] = P.label_plate("CLÁUDIO = O CLAUDE,|A IA", 62)
    S["t_confio"] = P.label_plate("NUNCA MAIS CONFIO|NO CLÁUDIO", 66)
    S["t_cara"] = P.label_plate("ELE É O CARA", 72)
    S["t_casar"] = P.label_plate("VOU ME CASAR|COM O CLÁUDIO", 66)
    S["t_brinc"] = P.label_plate("É BRINCADEIRA,|CLÁUDIO", 66)
    S["costume"], ref = veu(ctx)
    S["c_trilha"] = P.track(ctx, T(CASAR) - 0.3, ctx.clock.starts[4], ref, OCULOS)
    rng = np.random.default_rng(14)
    S["hearts"] = [(rng.uniform(80, 1000), rng.uniform(0, 1), rng.uniform(0.5, 1.1), rng.uniform(-1, 1))
                   for _ in range(26)]
    S["burst"] = [(rng.uniform(0, 2 * math.pi), rng.uniform(250, 700), rng.uniform(0.6, 1.2)) for _ in range(24)]


# ---------------------------------------------------------------------------------------------------- frames


def antes(f, o, ctx):
    T = P.T
    W, CAM_H, G = ctx.W, ctx.CAM_H, ctx.GAME_H
    st = ctx.clock.starts
    top = f[:CAM_H]
    # the hook: the live's own Sigma on the camera
    a, b = T(LANCE[0]), T(LANCE[1])
    if a <= o < b:
        fr = S["fonte"].get(LANCE[0] + (o - a))
        if fr is not None:
            top[:] = fr
            P.flash(top, P.kick(o - a, 0.7, 0.06))
    # "isso ficou horrível": the ugliest frame frozen below
    h = T(HORRIVEL)
    if h <= o < st[1]:
        x = o - h
        low = P.warp(S["feio"], 1.15 - 0.1 * P.ease_out(x / 0.3) + 0.02 * x, 540, 480)
        if x < 0.2:
            low = P.mix(f[CAM_H:], low, P.ease_out(x / 0.2))
        f[CAM_H:] = low
    # "eu pedi pro Cláudio": Claude pops up, proud
    if st[1] <= o < st[2]:
        low = S["klein"].copy()
        p, c = T(PEDI), T(CAXUMBA)
        if o < c:
            x = o - p
            if x >= 0:
                sc = P.back(x / 0.25) if x < 0.25 else 1 + 0.03 * math.sin(x * 5)
                P.blit(low, S["c_feliz"], 540, 600, sc, 1.0)
            f[CAM_H:] = low
        else:  # mumps: photoreal him, the report below
            x = o - c
            z = 1.18 - 0.14 * P.ease_out(x / 0.25) + 0.02 * x
            topi = P.warp(S["caxumba"], z, 540, 520, P.kick(x, 10, 0.08) * math.sin(x * 120))
            P.flash(topi, P.kick(x, 0.8, 0.06))
            top[:] = topi
            lowi = S["laudo"].copy()
            if x < 0.2:
                lowi = P.mix(low, lowi, P.ease_out(x / 0.2))
            f[CAM_H:] = lowi
    # "nunca mais eu confio no Cláudio… inspecionar o trabalho dele"
    if st[2] <= o < st[3]:
        low = S["klein"].copy()
        x = o - st[2]
        P.blit(low, S["c_suando"], 540, 560, 1 + 0.02 * math.sin(x * 14), 1.0)
        i0 = T(INSPECIONAR)
        if o >= i0:  # the lens sweeps over him, magnifying
            y = o - i0
            lx = 300 + 480 * (0.5 + 0.5 * math.sin(y * 3.0 - 1.2))
            ly = 540 + 60 * math.sin(y * 4.4)
            r = 170
            x0, y0 = int(lx - r), int(ly - r)
            if 0 <= x0 and x0 + 2 * r < G and 0 <= y0 and y0 + 2 * r < G:
                patch = low[y0:y0 + 2 * r, x0:x0 + 2 * r].copy()
                mag = cv2.resize(patch[r // 2:r // 2 + r, r // 2:r // 2 + r], (2 * r, 2 * r))
                m = np.zeros((2 * r, 2 * r), np.uint8)
                cv2.circle(m, (r, r), r, 255, -1, cv2.LINE_AA)
                mf = (m[..., None] / 255.0)
                low[y0:y0 + 2 * r, x0:x0 + 2 * r] = (patch * (1 - mf) + mag * mf).astype(np.uint8)
            c = S["lupa_c"]
            spr = S["lupa"]
            P.blit(low, spr, lx - c + spr.shape[1] / 2, ly - c + spr.shape[0] / 2, 1.0, 1.0)
        f[CAM_H:] = low
    # the wedding
    if st[3] <= o < st[4]:
        x = o - st[3]
        c0 = T(CASAR)
        if o < c0:  # "ele é o cara": Claude in love
            low = S["klein"].copy()
            sc = P.back(x / 0.25) if x < 0.25 else 1 + 0.04 * math.sin(x * 7)
            P.blit(low, S["c_amor"], 540, 620, sc, 1.0)
            hearts(low, o, st[3], 0.0)
            f[CAM_H:] = low
        else:
            y = o - c0
            low = S["capela"].copy()
            # bells swinging over the arch
            for bx, ph in ((330, 0.0), (750, 1.2)):
                ang = 22 * math.sin(y * 7 + ph) * math.exp(-y * 0.15)
                P.blit(low, S["sino"], bx, 300, 1.0, 1.0, angle=ang)
            n = T(ANOTAR)
            if o >= n:  # the certificate
                z = o - n
                yy = 1500 - 1000 * P.ease_out(z / 0.35)
                P.blit(low, S["certidao"], 540, yy, 1.0, 1.0, angle=-3)
                if z > 0.55:
                    P.stamp_in(low, S["casados"], 760, 700, o, n + 0.55)
            hearts(low, o, c0, 0.0)
            P.flash(low, P.kick(y, 0.8, 0.08))
            f[CAM_H:] = low
            # the bride filter on him
            costume = S["costume"]
            lay(top, costume if y >= 0.2 else _fade(costume, y / 0.2), shift_at(o))
            P.flash(top, P.kick(y, 0.6, 0.07))
            # Claude beside him, the groom
            P.blit(top, S["c_noivo"], 905, 600 + 8 * math.sin(y * 3), P.back(y / 0.3) if y < 0.3 else 1.0, 1.0)
    # "é brincadeira, tá, Cláudio?": the wedding greys, Claude sad; then 20 years later
    if o >= st[4]:
        x = o - st[4]
        an = T(ANOS)
        if o < an:
            low = S["capela"].copy()
            g = low.astype(np.float32).mean(axis=2, keepdims=True)
            k = P.ease_out(x / 0.25)
            low = (low * (1 - 0.85 * k) + g * 0.85 * k).astype(np.uint8)
            P.blit(low, S["c_noivo_triste"], 540, 560, 1.5, 1.0)
            f[CAM_H:] = low
            if x < 0.15:
                P.flash(top, 0.5 * (1 - x / 0.15))
        else:
            y = o - an
            if y < 0.55:
                low = S["anos"].copy()
                P.flash(low, P.kick(y, 0.7, 0.06))
            else:
                low = S["klein"].copy()
                z = y - 0.55
                P.blit(low, S["c_velho"], 540, 560, P.back(z / 0.3) if z < 0.3 else 1.0, 1.0)
            f[CAM_H:] = low
    return f


def _fade(spr, k):
    out = spr.copy()
    out[..., 3] = (out[..., 3] * k).astype(np.uint8)
    return out


def hearts(img, o, t0, _):
    for hx, ph, sc, wob in S["hearts"]:
        x = o - t0 - ph * 1.5
        if x < 0:
            continue
        y = 1100 - (x * 260 % 1250)
        P.blit(img, S["coracao"], hx + 30 * math.sin(x * 2 + wob * 3), y, sc, 0.85)


def depois(f, o, ctx):
    T = P.T
    W, CAM_H = ctx.W, ctx.CAM_H
    st = ctx.clock.starts
    h = T(HORRIVEL)
    if h <= o < st[1]:
        P.stamp_in(f, S["horrivel"], W / 2, CAM_H + 560, o, h + 0.15)
    p, c = T(PEDI), T(CAXUMBA)
    if p <= o < c:
        x = o - p
        P.blit(f, S["t_claudio"], W / 2, CAM_H + 180, P.back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))
    if c <= o < st[2]:
        P.stamp_in(f, S["caxumba_stamp"], W / 2 + 120, CAM_H + 745, o, c + 0.25)
    if st[2] <= o < st[3]:
        x = o - st[2]
        P.blit(f, S["t_confio"], W / 2, CAM_H + 180, P.back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))
        P.stamp_in(f, S["reprovado"], W / 2, CAM_H + 720, o, T(TRABALHO))
    if st[3] <= o < st[4]:
        c0 = T(CASAR)
        x = o - st[3]
        spr = S["t_cara"] if o < c0 else S["t_casar"]
        t0 = st[3] if o < c0 else c0
        y = o - t0
        P.blit(f, spr, W / 2, CAM_H + 180, P.back(y / 0.22) if y < 0.22 else 1.0, min(1.0, y / 0.06))
        v = T(VIVO)
        if o >= v:  # hearts bursting round him
            z = o - v
            for ang, dist, sc in S["burst"]:
                d = dist * P.ease_out(z / 0.6)
                P.blit(f, S["coracao"], 540 + math.cos(ang) * d, 430 + math.sin(ang) * d * 0.8, sc,
                       max(0.0, 1 - z / 1.2))
    if o >= st[4] and o < T(ANOS):
        x = o - st[4]
        P.blit(f, S["t_brinc"], W / 2, CAM_H + 180, P.back(x / 0.22) if x < 0.22 else 1.0, min(1.0, x / 0.06))
    P.transitions(f, o)
    return f


# ---------------------------------------------------------------------------------------------------- sounds


def bells(d=2.6):
    """Wedding bells: two bells pealing in turn, a major third apart."""
    out = np.zeros(int(d * P.SR), np.float32)
    k = 0
    at = 0.0
    while at < d - 0.5:
        f0 = 880.0 if k % 2 == 0 else 698.46
        t = np.arange(int(1.6 * P.SR)) / P.SR
        x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / dd)
                for r, a, dd in ((0.5, 0.6, 1.2), (1, 1.0, 0.9), (1.19, 0.5, 0.6), (1.5, 0.35, 0.5), (2.0, 0.3, 0.4),
                                 (2.74, 0.15, 0.25)))
        P.place_in(out, (x * np.minimum(1, t / 0.003)).astype(np.float32), at)
        at += 0.36
        k += 1
    return P.peak1(out)


def jingle():
    """A little time-card jingle: three bright notes and a hit (ours)."""
    out = np.zeros(int(1.0 * P.SR), np.float32)
    for at, f0 in ((0.0, 523.25), (0.14, 659.25), (0.28, 783.99)):
        P.place_in(out, P.brass(f0, 0.16), at)
    P.place_in(out, P.brass(1046.5, 0.5), 0.42)
    return P.peak1(out)


def scribble():
    t = np.arange(int(0.5 * P.SR)) / P.SR
    n = np.random.default_rng(3).standard_normal(len(t)).astype(np.float32)
    mod = (np.sin(2 * np.pi * 11 * t) > 0).astype(np.float32) * 0.8 + 0.2
    return P.peak1(P.band(n, 2500, 9000) * mod * np.minimum(1, (0.5 - t) / 0.05))


def sad():
    """A sad trombone: wah-wah-wah-waaah, falling."""
    out = np.zeros(int(2.0 * P.SR), np.float32)
    for i, (at, f0, d) in enumerate(((0.0, 311.13, 0.32), (0.34, 293.66, 0.32), (0.68, 277.18, 0.32),
                                     (1.02, 261.63, 0.9))):
        x = P.brass(f0, d, tau=0.3)
        if i == 3:
            t = np.arange(len(x)) / P.SR
            x = x * (1 + 0.25 * np.sin(2 * np.pi * 6 * t))
        P.place_in(out, x, at)
    return P.peak1(P.band(out, None, 2500))


def abaixa(ctx, a, b, db=-6.0, fade=0.2):
    """The live's own mix turned down by `db` between short seconds a and b: its laugh into the mic and the Lance's
    sting under the Sigma peak 20 dB over his speech, and destaque's limiter then left the short at -15.3 LUFS. Done
    as a negative copy of that stretch of the mix (scaled as destaque.mixdown scales it), so nothing else changes."""
    live = ctx.VIDEOS / "Lives" / "2026-11-24" / "15-15-16 Live.mp4"
    chunks = []
    for x0, x1 in ctx.clock.spans:  # the same level destaque.mixdown computes
        n = int(round((x1 - x0) * P.SR))
        x = D.pcm(live, x0, x1 - x0)[:n]
        chunks.append(np.pad(x, ((0, n - len(x)), (0, 0))))
    mix = np.concatenate(chunks)
    win = int(0.05 * P.SR)
    rms = np.sqrt((mix.mean(axis=1)[: len(mix) // win * win].reshape(-1, win) ** 2).mean(axis=1))
    g = 0.1 / (np.percentile(rms, 90) + 1e-9)
    i0, i1 = int((a - fade) * P.SR), int((b + fade) * P.SR)
    seg = mix[i0:i1].mean(axis=1) * g
    t = np.arange(len(seg)) / P.SR
    k = np.clip(np.minimum(t / fade, (t[-1] - t) / fade), 0, 1)
    k = 0.5 - 0.5 * np.cos(np.pi * k)
    cut = (1 - 10 ** (db / 20)) * k
    return a - fade, (-cut * seg / (0.1 * 2.8)).astype(np.float32)


def sons(ctx):
    T = P.T
    st = ctx.clock.starts
    out = list(D.transition_sounds(S["cortes"]))
    at, duck = abaixa(ctx, T(10906.1), T(10913.7), -6.0)
    out.append((at, duck, 0.0))
    out += [(T(HORRIVEL) + 0.15, P.buzzer(), -15),
            (T(PEDI), P.ding(1318.5, 0.8), -16),
            (T(CAXUMBA), P.boing(), -12), (T(CAXUMBA) + 0.25, D.sound("impact-boom"), -14),
            (T(INSPECIONAR), P.whoosh(0.5), -16), (T(TRABALHO), D.sound("impact-boom"), -12),
            (T(TRABALHO), P.buzzer(0.4), -16),
            (st[3] + 0.02, P.ding(1760.0, 1.2), -15),
            (T(CASAR), bells(3.0), -13), (T(CASAR), D.sound("coro"), -17),
            (T(ANOTAR) + 0.1, scribble(), -18), (T(ANOTAR) + 0.55, D.sound("impact-boom"), -14),
            (T(VIVO), P.pops(5, 0.5, 3), -15),
            (st[4], P.scratch(), -12), (st[4] + 0.4, sad(), -15),
            (T(ANOS), jingle(), -11), (T(ANOS) + 0.55, P.boing(), -14)]
    return out
