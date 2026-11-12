"""A live's YouTube thumbnail made to be clicked: Luan's face from the camera, cut out big over a moment of the game,
with a hook of two to four words. YouTube decides what to show people by who clicks, and the brand's plain plate
("Live" and the date) gave nobody a reason to (Luan, 2026-11-12: "vamos ter que jogar o jogo").

    scripts/.venv/bin/python scripts/thumb.py <date>                     # the candidates sheet, for Luan to pick
    scripts/.venv/bin/python scripts/thumb.py <date> --quadro 7b --texto "SUBI PRO|DIAMANTE 3"
    scripts/.venv/bin/python scripts/thumb.py <date> --quadro 7b --texto "..." --fundo 56:20 --emblema
    scripts/.venv/bin/python scripts/thumb.py <date> --refazer          # again, from the live's youtube.thumb

The candidates are his strongest reactions, where the microphone's own track (Live.mp4's second audio) was loudest,
the transcript's exclamations ("meu Deus", "que isso", "golaço", laughs), his goals (the dock's event log) and the
VAR's plays. Each gets three frames of the camera recording (a, b, c: 0.6 s apart) on a numbered sheet,
Videos\\Lives\\<date>\\Thumb\\candidatos.jpg, with what he said there. Luan picks a frame and the hook; picking is
his (the `depois-da-live` skill), the rest is fixed:

- The camera recording already has the brand's Klein background in place of the room, so he's cut out by keying
  the blue (no model), with a Branco outline and a shadow, his head about a third of the height, on the right.
- Behind him, the game at that moment from the Jogo recording (or `--fundo`), blurred enough that no player's name
  can be read, more saturated, and darkened to Klein on the left where the hook goes.
- The hook in Space Grotesk Bold, uppercase, Branco with a dark Klein outline; a second line (after `|`) on the
  brand's Branco plate cut at 45°. `--emblema`: the rank reached (LIVES in brand/build.py) glowing by the hook.
- A small "AO VIVO" plate with the day, top left: every live's thumbnail is recognisable as one.

Writes brand/youtube/thumbnails/live-<date>.jpg (JPEG: YouTube takes 2 MB at most), which youtube.py prefers over
build.py's plain live-<date>.png. Never deletes anything.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content import LIVES, ROOT  # noqa: E402
from live import write_live  # noqa: E402
from windows import VIDEOS, to_windows  # noqa: E402

W, H = 1280, 720
TIME_ZONE = ZoneInfo("America/Sao_Paulo")
KLEIN, KLEIN_DARK, PAPER, KLEIN_LIGHT = (0, 47, 167), (0, 22, 84), (244, 245, 247), (133, 167, 255)
FONT = ROOT / "brand" / "fonts" / "SpaceGrotesk.ttf"
THUMBS = ROOT / "brand" / "youtube" / "thumbnails"
# What he says when something happens (lowercase, accents as whisper writes them).
EXCLAIM = re.compile(r"k{3,}|haha|ahah|risos|caralho|meu deus|n[ãa]o acredito|que isso|golaço|absurdo|ridícul|"
                     r"socorro|nossa senhora|mano do céu|para tudo|olha isso", re.I)
RATE = 8000
STEP = 0.25  # seconds per loudness reading
FRAMES = (-0.6, 0.0, 0.6)  # a, b, c around each moment
CANDIDATES = 12
APART = 40  # seconds between two candidates


def folder(date):
    return VIDEOS / "Lives" / date


def pieces(date, kind):
    """[(wall clock start, second in the file, length)] of a recording kind ("Live", "Câmera", "Jogo")."""
    listing = folder(date) / "partes.json"
    if listing.exists():
        return [(datetime.fromisoformat(p["inicio"]), p["em"], p["segundos"])
                for p in json.loads(listing.read_text())[kind]]
    file = next(folder(date).glob(f"* {kind}.*"))
    return [(datetime.fromisoformat(f"{date}T{file.name[:8].replace('-', ':')}"), 0.0, 1e9)]


def wall(date, live_second):
    for start, at, length in pieces(date, "Live"):
        if at <= live_second < at + length:
            return start + timedelta(seconds=live_second - at)
    raise ValueError(f"{live_second} s não está no Live.mp4")


def in_file(date, kind, when):
    """The second of `kind`'s file showing wall clock `when`, or None if it wasn't recording then."""
    for start, at, length in pieces(date, kind):
        offset = (when - start).total_seconds()
        if 0 <= offset < length:
            return at + offset
    return None


def recording(date, kind):
    return next(folder(date).glob(f"* {kind}.*"))


def frame(file, second, width=None):
    """One picture of a recording (Windows' ffmpeg, which reads across the drive ten times faster than WSL's)."""
    scale = ["-vf", f"scale={width}:-2"] if width else []
    out = subprocess.run(["ffmpeg.exe", "-v", "error", "-ss", f"{max(second, 0):.3f}", "-i", to_windows(file),
                          "-frames:v", "1", *scale, "-f", "image2pipe", "-c:v", "png", "-"],
                         capture_output=True, check=True).stdout
    return Image.open(BytesIO(out)).convert("RGB")


def loudness(date):
    """The microphone's loudness (dBFS) every STEP seconds of Live.mp4, cached next to the live's material."""
    cache = folder(date) / "Thumb" / "microfone.npy"
    if cache.exists():
        return np.load(cache)
    raw = subprocess.run(["ffmpeg.exe", "-v", "error", "-i", to_windows(recording(date, "Live")), "-map", "0:a:1",
                          "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    pcm = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    size = int(RATE * STEP)
    pcm = pcm[: len(pcm) // size * size].reshape(-1, size)
    levels = 20 * np.log10(np.sqrt((pcm ** 2).mean(axis=1)) + 1e-6)
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache, levels)
    return levels


def candidates(date):
    """[(Live second, why)] of his strongest reactions, loudest first."""
    levels = loudness(date)
    # The loudest second around each reading: a shout or a laugh, not a single click.
    smooth = np.convolve(levels, np.ones(4) / 4, mode="same")
    total = len(levels) * STEP
    loud_at = lambda s: float(smooth[max(0, int((s - 1) / STEP)): int((s + 3) / STEP) + 1].max())  # noqa: E731
    found = []
    for s, text in json.loads((LIVES / f"{date}.transcript.json").read_text()):
        if EXCLAIM.search(text):
            found.append((s, f"“{text}”"))
    # His goals, from the dock's event log (Rocket League).
    for events in (ROOT / "content" / "matches").glob(f"{date}-*.events.json"):
        live_start = pieces(date, "Live")[0][0]
        for match in json.loads(events.read_text())["matches"]:
            start = datetime.fromisoformat(match["start"].replace("Z", "+00:00")).astimezone(TIME_ZONE).replace(tzinfo=None)
            for e in match["log"]:
                if e["type"] == "goal" and e.get("by") == "me":
                    found.append(((start - live_start).total_seconds() + e["t"], f"gol meu ({e.get('kmh', '?')} km/h)"))
    # The VAR's plays: the clip ends when it was saved, the play is in its last seconds.
    for clip in (folder(date) / "VAR").glob("* VAR.mp4"):
        saved = datetime.fromisoformat(f"{date}T{clip.name[:8].replace('-', ':')}")
        live_second = in_file(date, "Live", saved)
        if live_second:
            found.append((live_second - 5, "VAR"))
    # The loudest stretches, whatever was said.
    order = np.argsort(smooth)[::-1]
    for i in order[:400]:
        found.append((i * STEP, "grito"))
    lines = json.loads((LIVES / f"{date}.transcript.json").read_text())
    said = lambda s: next((f"“{t}”" for at, t in sorted(lines, key=lambda l: abs(l[0] - s)) if abs(at - s) <= 6), "")  # noqa: E731
    found = [(s, why if why.startswith("“") else f"{why} {said(s)}".strip()) for s, why in found]
    kept = []
    for s, why in sorted(found, key=lambda c: -loud_at(c[0])):
        if 120 < s < total - 120 and all(abs(s - k[0]) > APART for k in kept):
            kept.append((s, why, loud_at(s)))
        if len(kept) == CANDIDATES:
            break
    return sorted(kept)


def mmss(s):
    s = int(s)
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def font(size, weight=700):
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_axes([weight])
    return f


def peak(date, live_second):
    """The loudest moment within a second and a half of a candidate, so the frames catch the face mid-reaction."""
    levels = loudness(date)
    a, b = max(0, int((live_second - 0.5) / STEP)), int((live_second + 2.5) / STEP) + 1
    return (a + int(np.argmax(levels[a:b]))) * STEP


def sheet(date):
    camera = recording(date, "Câmera")
    found = candidates(date)
    cell_w, cell_h, label = 256, 144, 54
    cols = 2
    block_w = cell_w * 3 + 24
    rows = (len(found) + cols - 1) // cols
    out = Image.new("RGB", (block_w * cols + 24, rows * (cell_h + label + 18) + 24), KLEIN_DARK)
    draw = ImageDraw.Draw(out)
    picks = {}
    for n, (s, why, level) in enumerate(found, 1):
        at = peak(date, s)
        x0 = 24 + (n - 1) % cols * block_w
        y0 = 24 + (n - 1) // cols * (cell_h + label + 18)
        for k, dt in enumerate(FRAMES):
            cam = in_file(date, "Câmera", wall(date, at + dt))
            picture = frame(camera, cam, width=cell_w) if cam is not None else Image.new("RGB", (cell_w, cell_h))
            out.paste(picture.resize((cell_w, cell_h)), (x0 + k * cell_w, y0))
            draw.text((x0 + k * cell_w + 8, y0 + 4), f"{n}{'abc'[k]}", font=font(30), fill=PAPER,
                      stroke_width=3, stroke_fill=KLEIN_DARK)
            picks[f"{n}{'abc'[k]}"] = round(at + dt, 2)
        text = f"{mmss(at)} · {why}"
        draw.text((x0, y0 + cell_h + 6), text[:80], font=font(19, 500), fill=PAPER)
        if len(text) > 80:
            draw.text((x0, y0 + cell_h + 28), text[80:160], font=font(19, 500), fill=KLEIN_LIGHT)
        print(f"{n:2d}  {mmss(at):>8}  {level:6.1f} dB  {why[:90]}")
    target = folder(date) / "Thumb"
    target.mkdir(parents=True, exist_ok=True)
    out.save(target / "candidatos.jpg", quality=88)
    (target / "candidatos.json").write_text(json.dumps(picks, indent=1))
    print(target / "candidatos.jpg")


# --- The thumbnail -------------------------------------------------------------------------------------------

def cutout(picture):
    """Luan without the camera's Klein background: an alpha mask from how blue each pixel is."""
    rgb = np.asarray(picture).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    blue = (b - np.maximum(r, g)).clip(0, 255)
    # Klein and its lattice are ~100+ bluer than red/green; skin, hair, headphones and a white shirt are not.
    alpha = ((110 - blue) * (255 / 70)).clip(0, 255).astype(np.uint8)
    # The camera's background carries the lockup at the top centre, in Branco and Klein claro: off, but not his
    # hands when he raises them over it (skin is never a neutral white).
    hh, ww = alpha.shape
    zone = (slice(int(hh * 0.05), int(hh * 0.19)), slice(int(ww * 0.37), int(ww * 0.64)))
    zr, zg, zb = r[zone], g[zone], b[zone]
    lockup = ((np.minimum(np.minimum(zr, zg), zb) > 150) & (np.maximum(np.maximum(zr, zg), zb) - np.minimum(np.minimum(zr, zg), zb) < 45)) | (zb > np.maximum(zr, zg) + 45)
    alpha[zone][lockup] = 0
    alpha = connected(alpha)
    mask = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    solid = np.asarray(mask) > 128
    ys, xs = np.nonzero(solid)
    person = picture.convert("RGBA")
    person.putalpha(mask)
    # Undo the blue fringe on the edges: pull the edge pixels' blue toward their red/green.
    data = np.asarray(person).astype(np.int16).copy()
    edge = (data[..., 3] > 0) & (data[..., 3] < 250)
    data[..., 2][edge] = np.minimum(data[..., 2][edge], np.maximum(data[..., 0][edge], data[..., 1][edge]) + 20)
    person = Image.fromarray(data.astype(np.uint8), "RGBA")
    return person.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)) if len(xs) else person


def connected(alpha):
    """Only what touches the frame's bottom edge (him, in his chair): specks and leftovers of the lockup go.
    Flood-filled at a quarter of the size, which is plenty for connectivity and fast in pure Python."""
    small = Image.fromarray(((alpha > 100) * 255).astype(np.uint8)).resize((alpha.shape[1] // 4, alpha.shape[0] // 4),
                                                                           Image.BILINEAR).point(lambda v: 255 if v > 60 else 0)
    bottom = np.asarray(small)[-1]
    for x in np.nonzero(bottom == 255)[0]:
        if small.getpixel((int(x), small.height - 1)) == 255:
            ImageDraw.floodfill(small, (int(x), small.height - 1), 128)
    keep = Image.fromarray((np.asarray(small) == 128).astype(np.uint8) * 255)
    keep = keep.filter(ImageFilter.MaxFilter(5)).resize((alpha.shape[1], alpha.shape[0]), Image.BILINEAR)
    return np.minimum(alpha, np.asarray(keep))


def outlined(person, width=9):
    """The cutout with a Branco outline and a soft shadow, on a canvas big enough for both."""
    pad = width * 4
    canvas = Image.new("RGBA", (person.width + pad * 2, person.height + pad * 2))
    alpha = Image.new("L", canvas.size)
    alpha.paste(person.getchannel("A"), (pad, pad))
    ring = alpha.filter(ImageFilter.MaxFilter(width * 2 + 1)).filter(ImageFilter.GaussianBlur(1))
    shadow = ring.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.65))
    canvas.paste(Image.new("RGBA", canvas.size, (0, 10, 40, 255)), (10, 14), shadow)
    canvas.paste(Image.new("RGBA", canvas.size, PAPER + (255,)), (0, 0), ring)
    canvas.alpha_composite(person, (pad, pad))
    return canvas


def background(picture):
    """The game behind him: covering the frame, blurred past reading any name, livelier, Klein on the left."""
    scale = max(W / picture.width, H / picture.height)
    picture = picture.resize((round(picture.width * scale), round(picture.height * scale)), Image.LANCZOS)
    left, top = (picture.width - W) // 2, (picture.height - H) // 2
    picture = picture.crop((left, top, left + W, top + H)).filter(ImageFilter.GaussianBlur(12))
    picture = ImageEnhance.Contrast(ImageEnhance.Color(picture).enhance(1.35)).enhance(1.12)
    shade = np.zeros((H, W), np.float32)
    x = np.linspace(0, 1, W)[None, :]
    shade[:] = np.clip(0.92 - x * 1.25, 0.18, 0.92)  # Klein over the left, where the hook is
    y = np.linspace(-1, 1, H)[:, None]
    shade = np.clip(shade + 0.25 * y ** 2, 0, 0.95)  # and a little at the top and bottom
    tint = Image.new("RGB", (W, H), KLEIN_DARK)
    return Image.composite(tint, picture, Image.fromarray((shade * 255).astype(np.uint8))).convert("RGBA")


def plate(draw, x, y, w, h, fill, cut=None):
    """The brand's plate: a rectangle with two opposite corners cut at 45°, as the stream's camera frame."""
    c = cut or h * 0.28
    draw.polygon([(x + c, y), (x + w, y), (x + w, y + h - c), (x + w - c, y + h), (x, y + h), (x, y + c)], fill=fill)


def fitted(text, width, start, weight=700):
    size = start
    while size > 40 and font(size, weight).getlength(text) > width:
        size -= 4
    return font(size, weight)


def compose(date, pick, hook, fundo=None, emblem=False, out=None, at=None):
    sheet_file = folder(date) / "Thumb" / "candidatos.json"
    picks = json.loads(sheet_file.read_text()) if sheet_file.exists() else {}
    at = at if at is not None else picks[pick] if pick in picks else float(pick)
    when = wall(date, at)
    camera = frame(recording(date, "Câmera"), in_file(date, "Câmera", when))
    back_at = wall(date, parse_time(fundo)) if fundo else when
    game_second = in_file(date, "Jogo", back_at)
    game = (frame(recording(date, "Jogo"), game_second) if game_second is not None
            else frame(recording(date, "Live"), (back_at - pieces(date, "Live")[0][0]).total_seconds()))

    thumb = background(game)
    person = cutout(camera)
    # On the right half: big (his head about half the height), never wider than 62% of the frame, so the hook
    # on the left never covers his face.
    scale = min(H * 0.95 / person.height, W * 0.62 / person.width)
    person = person.resize((round(person.width * scale), round(person.height * scale)), Image.LANCZOS)
    person = outlined(person)
    thumb.alpha_composite(person, (W - person.width + 24, H - person.height + 36))

    draw = ImageDraw.Draw(thumb)
    lines = [line.strip().upper() for line in hook.split("|")]
    margin, width = 56, 600
    first = fitted(lines[0], width, 140)
    box1 = first.getbbox(lines[0])
    second = fitted(lines[1], width - 48, 100) if len(lines) > 1 else None
    box2 = second.getbbox(lines[1]) if second else None
    rank = brand_rank(date) if emblem else None
    side = 150
    height = (box1[3] - box1[1]) + (28 + box2[3] - box2[1] + 40 if second else 0) + (side + 24 if rank else 0)
    top = 150 + (H - 150 - 40 - height) / 2  # centred under the tag
    y = top - box1[1]
    shadow = Image.new("RGBA", thumb.size)
    ImageDraw.Draw(shadow).text((margin + 6, y + 8), lines[0], font=first, fill=(0, 0, 0, 170), stroke_width=10,
                                stroke_fill=(0, 0, 0, 170))
    thumb.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(8)))
    draw.text((margin, y), lines[0], font=first, fill=PAPER, stroke_width=10, stroke_fill=KLEIN_DARK)
    y = top + box1[3] - box1[1] + 28
    if second:
        ph = box2[3] - box2[1] + 40
        plate(draw, margin, y, box2[2] + 48, ph, PAPER)
        draw.text((margin + 24, y + 20 - box2[1]), lines[1], font=second, fill=KLEIN)
        y += ph + 24
    if rank:
        image = Image.open(THUMBS / "ranks" / f"{rank[0]}-{rank[1]}.png").convert("RGBA")
        image = image.resize((side, round(image.height * side / image.width)), Image.LANCZOS)
        spot = (margin, round(y))
        glow = Image.new("RGBA", thumb.size)
        glow.paste(Image.new("RGBA", image.size, (120, 200, 255, 255)), spot, image)
        thumb.alpha_composite(glow.filter(ImageFilter.GaussianBlur(26)))
        thumb.alpha_composite(image, spot)

    # The live's tag, top left: AO VIVO and the day.
    tag = font(34, 700)
    day = f"AO VIVO · {date[8:10]}/{date[5:7]}"
    tw = tag.getlength(day)
    plate(draw, margin, 52, tw + 44, 60, KLEIN)
    draw.text((margin + 22, 61), day, font=tag, fill=PAPER)

    target = out or THUMBS / f"live-{date}.jpg"
    thumb.convert("RGB").save(target, quality=90, optimize=True)
    print(f"{target}  ({target.stat().st_size // 1024} KB)")
    if not out:
        # What was picked, in the live's record (youtube.thumb), so the thumbnail can be made again without the sheet.
        page = LIVES / f"{date}.json"
        live = json.loads(page.read_text())
        live.setdefault("youtube", {})["thumb"] = {"quadro": pick, "segundo": at, "texto": hook, "emblema": emblem,
                                                   **({"fundo": fundo} if fundo else {})}
        write_live(page, live)
    return target


def brand_rank(date):
    text = (ROOT / "brand" / "build.py").read_text()
    found = re.search(rf'"{date}": \("(\w[\w-]*)", (\d)\)', text)
    return (found.group(1), int(found.group(2))) if found else None


def parse_time(text):
    seconds = 0.0
    for part in text.split(":"):
        seconds = seconds * 60 + float(part)
    return seconds


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("date")
    parser.add_argument("--quadro", help="the frame Luan picked on the sheet (7b), or a Live.mp4 second")
    parser.add_argument("--texto", help="the hook, 2 to 4 words; a second line after |")
    parser.add_argument("--fundo", help="the game behind him from another moment (Live.mp4's mm:ss or h:mm:ss)")
    parser.add_argument("--emblema", action="store_true", help="the rank reached, glowing by the hook")
    parser.add_argument("--saida", help="write elsewhere (a draft) instead of brand/youtube/thumbnails/")
    parser.add_argument("--refazer", action="store_true", help="make it again from the live's youtube.thumb")
    args = parser.parse_args()
    if args.refazer:
        picked = json.loads((LIVES / f"{args.date}.json").read_text())["youtube"]["thumb"]
        compose(args.date, picked["quadro"], picked["texto"], picked.get("fundo"), picked["emblema"],
                Path(args.saida) if args.saida else None, at=picked["segundo"])
    elif not args.quadro:
        sheet(args.date)
    else:
        compose(args.date, args.quadro, args.texto or "", args.fundo, args.emblema,
                Path(args.saida) if args.saida else None)


if __name__ == "__main__":
    main()
