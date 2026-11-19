"""A short's cover in the lives' thumbnail style (thumb.py, 2026-11-12, Luan: "ficaram excelentes... dá pra gente se
inspirar pra thumb do shorts também, no mesmo estilo"), standing up: 1080×1920.

    scripts/.venv/bin/python scripts/capa.py scripts/roteiros/<file>.json

The roteiro's "capa" says what goes in it, every time a Live.mp4 second:
    {"quadro": 7385.2, "origem": "camera" | "conversa", "fundo": 7384.0, "texto": "SUBI PRO|DIAMANTE 3",
     "emblema": "diamond-3", "etiqueta": "DA LIVE · 12/11"}
- "quadro": his face. "origem": "camera" takes it from Câmera.mkv (sharp, no filter: the game scenes' camera is a
  480×270 box), "conversa" from the live's big camera in Conversa or Fim (1280×720, with the filter's costume).
  Either way he's cut out by keying the camera's Klein background (thumb.cutout): a blue car (the Octane) is keyed
  out with it, so a car's face can't be a cover.
- "fundo": the game behind him at that second (Jogo.mp4), or "live" for the live's own screen there; blurred past
  reading any name, livelier, darkened to Klein where the hook goes. Default: the quadro's second.
- "texto": the hook, as in the thumbnails: the first line in Branco with a dark Klein outline, the second (after |)
  on the Branco plate cut at 45°. Centred, in the upper half, clear of Shorts' buttons and title at the bottom.
- "emblema": a rank's picture from brand/youtube/thumbnails/ranks/ (e.g. "diamond-3"), glowing under the hook.
- "etiqueta": the small Klein plate at the top (default "DA LIVE · dd/mm").

Writes Videos\\Shorts\\prontos\\<live> destaque - <nome> (capa).jpg next to the short (destaque.py calls it when the
roteiro has a "capa" like this), for Instagram's cover and YouTube's thumbnail.
"""
import argparse
import json
import subprocess
import sys
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cortes import camera_sound, material, offset  # noqa: E402
from windows import VIDEOS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
import thumb  # noqa: E402  the thumbnails' own drawing: the cutout, the outline, the plate, the type
RANKS = ROOT / "brand" / "youtube" / "thumbnails" / "ranks"
W, H = 1080, 1920
KLEIN, KLEIN_DARK, PAPER = thumb.KLEIN, thumb.KLEIN_DARK, thumb.PAPER
CONVERSA = (64, 64, 1280, 720)


def grab(path, second, crop=None):
    vf = ["-vf", f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]}"] if crop else []
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{second:.3f}", "-i", str(path), "-frames:v", "1", *vf,
                          "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True).stdout
    return Image.open(BytesIO(raw)).convert("RGB")


def backdrop(picture):
    """The game covering the frame, blurred and livelier, Klein over the top half where the hook is."""
    scale = max(W / picture.width, H / picture.height)
    picture = picture.resize((round(picture.width * scale), round(picture.height * scale)), Image.LANCZOS)
    left, top = (picture.width - W) // 2, (picture.height - H) // 2
    picture = picture.crop((left, top, left + W, top + H)).filter(ImageFilter.GaussianBlur(22))
    picture = ImageEnhance.Contrast(ImageEnhance.Color(picture).enhance(1.35)).enhance(1.12)
    y = np.linspace(0, 1, H)[:, None]
    shade = np.clip(0.9 - y * 1.1, 0.25, 0.9) + 0.3 * np.clip(y - 0.8, 0, 1)  # Klein above, a little at the foot
    shade = np.repeat(np.clip(shade, 0, 0.95), W, axis=1)
    tint = Image.new("RGB", (W, H), KLEIN_DARK)
    return Image.composite(tint, picture, Image.fromarray((shade * 255).astype(np.uint8))).convert("RGBA")


def compose(roteiro, out=None):
    spec = roteiro["capa"]
    date = roteiro["live"]
    live, game, camera, table = material(roteiro)
    t = spec["quadro"]
    if spec.get("origem", "camera") == "conversa":
        face = grab(live, t, CONVERSA)
    else:
        sound = camera_sound(live, camera, table, t)  # Câmera.mkv's picture is in step with its sound since 11-11
        face = grab(camera, t + (sound or 0.0))
    fundo = spec.get("fundo", t)
    if fundo == "live":
        back = grab(live, t)
    else:
        shift, corr = offset(live, game, table, max(0.0, fundo - 10), 40)
        back = grab(game, fundo + shift) if corr >= 0.3 else grab(live, fundo)

    cover = backdrop(back)
    person, out_top = thumb.cutout(face)
    # big: about two thirds of the height, never wider than the frame; his feet (the chair) at the bottom edge
    scale = min(H * 0.68 / person.height, W * 1.08 / person.width)
    person = person.resize((round(person.width * scale), round(person.height * scale)), Image.LANCZOS)
    person = thumb.outlined(person)
    pad = thumb.OUTLINE * 4
    cover.alpha_composite(person, ((W - person.width) // 2, H - person.height + pad))

    draw = ImageDraw.Draw(cover)
    lines = [line.strip().upper() for line in spec["texto"].split("|")]
    width = W - 2 * 70
    first = thumb.fitted(lines[0], width, 150)
    box1 = first.getbbox(lines[0])
    second = thumb.fitted(lines[1], width - 60, 112) if len(lines) > 1 else None
    box2 = second.getbbox(lines[1]) if second else None
    emblem = None
    if spec.get("emblema"):
        emblem = Image.open(RANKS / f"{spec['emblema']}.png").convert("RGBA")
        side = 190
        emblem = emblem.resize((side, round(emblem.height * side / emblem.width)), Image.LANCZOS)
    y = 330 - box1[1]
    x = (W - (box1[2] - box1[0])) / 2 - box1[0]
    shadow = Image.new("RGBA", cover.size)
    ImageDraw.Draw(shadow).text((x + 6, y + 8), lines[0], font=first, fill=(0, 0, 0, 170), stroke_width=11,
                                stroke_fill=(0, 0, 0, 170))
    cover.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(9)))
    draw.text((x, y), lines[0], font=first, fill=PAPER, stroke_width=11, stroke_fill=KLEIN_DARK)
    y = 330 + box1[3] - box1[1] + 32
    if second:
        pw, ph = box2[2] + 60, box2[3] - box2[1] + 44
        px = (W - pw) / 2
        thumb.plate(draw, px, y, pw, ph, PAPER)
        draw.text((px + 30, y + 22 - box2[1]), lines[1], font=second, fill=KLEIN)
        y += ph + 36
    if emblem is not None:
        spot = ((W - emblem.width) // 2, round(y))
        glow = Image.new("RGBA", cover.size)
        glow.paste(Image.new("RGBA", emblem.size, (120, 200, 255, 255)), spot, emblem)
        cover.alpha_composite(glow.filter(ImageFilter.GaussianBlur(30)))
        cover.alpha_composite(emblem, spot)

    tag = thumb.font(40, 700)
    label = spec.get("etiqueta", f"DA LIVE · {date[8:10]}/{date[5:7]}")
    tw = tag.getlength(label)
    thumb.plate(draw, (W - tw - 52) / 2, 150, tw + 52, 70, KLEIN)
    draw.text(((W - tw) / 2, 160), label, font=tag, fill=PAPER)

    target = out or VIDEOS / "Shorts" / "prontos" / f"{date} destaque - {roteiro['nome']} (capa).jpg"
    cover.convert("RGB").save(target, quality=90, optimize=True)
    print(target)
    return target


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("roteiro")
    ap.add_argument("--saida", type=Path, help="write it here instead (a draft)")
    args = ap.parse_args()
    compose(json.loads(Path(args.roteiro).read_text(encoding="utf-8")), args.saida)


if __name__ == "__main__":
    main()
