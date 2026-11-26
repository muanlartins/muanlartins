"""Puts John Rocket League (Luan's alter ego, named by Exponja; the art posted by john_rocket_league in the Discord
server on 2026-11-26) into the camera filters' John (public/stream/filtros/john/): the picture as retrato.webp, its
face's 478 points (MediaPipe's Face Landmarker, the same model the page tracks him with) as retrato.json, and
mascaras.png, what the page animates on the still:

  R  the fire: the purple flames round the emblem and his hand (not the emblem, not him)
  G  the emblem: the white Champion diamond and its wings
  B  him: the body, the hair, the arm and hand (MediaPipe's selfie segmenter, multiclass)

No alpha: a browser can drop the colour of a pixel whose alpha is 0, so the aura round him is drawn from B's blurred
mipmaps on the page. retrato.json also says where the emblem's middle is (`emblema`, x and y from the top-left).

  uv run -q -p 3.12 --with "mediapipe==0.10.14" --with pillow --with numpy python scripts/john_retrato.py <john.jpg>

The art is photoreal, 4:3 (2400x1792), his face on the right third, the emblem floating over his raised hand on the
left; the page frames it to fill the camera's 16:9 box (its top kept). mediapipe is held at 0.10.14: newer wheels need
libGLESv2, which WSL lacks. It refuses a picture where it finds no face.
"""

import json
import sys
import urllib.request
from pathlib import Path

import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from PIL import Image, ImageDraw, ImageFilter

AQUI = Path(__file__).resolve().parent.parent / "public" / "stream" / "filtros" / "john"
MODELOS = Path.home() / ".cache" / "muanlartins" / "modelos"
URLS = {
    "face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    "selfie_multiclass_256x256.tflite": "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
}
# The width the page gets: past the box's 1280 even when the moment fills a 1920 screen at 1.12. The masks are soft,
# so half of it does.
LARGURA = 2160
LARGURA_MASCARAS = 1080
# Where things are on this art, as fractions of its width and height (the segmenter takes the fire for a person, and
# the emblem's whites run into his lit hand): the emblem's box, the fire's two ellipses (round the emblem, along the
# forearm), his arm and hand as a polygon, and the line right of which the segmenter alone is him.
EMBLEMA = (0.23, 0.147, 0.475, 0.477)
FOGO = ((0.35, 0.33, 0.25, 0.37), (0.36, 0.72, 0.15, 0.27))
BRACO = [(0.235, 0.479), (0.30, 0.462), (0.365, 0.488), (0.425, 0.526), (0.45, 0.536), (0.475, 1.0), (0.32, 1.0),
         (0.315, 0.804), (0.33, 0.697), (0.30, 0.623), (0.25, 0.549)]
TRONCO_X = 0.44


def modelo(nome: str) -> str:
    caminho = MODELOS / nome
    if not caminho.exists():
        MODELOS.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URLS[nome], caminho)
    return str(caminho)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    origem = Path(sys.argv[1])
    imagem = Image.open(origem).convert("RGB")
    w, h = imagem.size
    figura = mp.Image.create_from_file(str(origem))

    opcoes = vision.FaceLandmarkerOptions(base_options=mp_python.BaseOptions(model_asset_path=modelo("face_landmarker.task")), num_faces=1)
    with vision.FaceLandmarker.create_from_options(opcoes) as marcador:
        r = marcador.detect(figura)
    if not r.face_landmarks:
        sys.exit(f"Nenhum rosto em {origem}.")
    pontos = [[round(p.x, 5), round(p.y, 5)] for p in r.face_landmarks[0]]

    # Him: every class but the background (hair, body skin, face skin, clothes, others).
    seg = vision.ImageSegmenterOptions(base_options=mp_python.BaseOptions(model_asset_path=modelo("selfie_multiclass_256x256.tflite")), output_confidence_masks=True)
    with vision.ImageSegmenter.create_from_options(seg) as segmentador:
        mascaras = segmentador.segment(figura).confidence_masks
    corpo = 1.0 - mascaras[0].numpy_view().astype(np.float32)
    corpo = np.clip((corpo - 0.35) / 0.3, 0, 1)
    braco = Image.new("L", (w, h), 0)
    ImageDraw.Draw(braco).polygon([(x * w, y * h) for x, y in BRACO], fill=255)
    braco = np.asarray(braco.filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255

    rgb = np.asarray(imagem).astype(np.float32) / 255
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    ys, xs = np.mgrid[0:h, 0:w]
    u, v = xs / w, ys / h
    corpo = np.where(u > TRONCO_X, corpo, corpo * braco)
    # The emblem: bright and nearly white, inside its box; specks taken out (a min filter before the max).
    x0, y0, x1, y1 = EMBLEMA
    caixa = (u > x0) & (u < x1) & (v > y0) & (v < y1)
    emblema = np.clip((mx - 0.72) / 0.12, 0, 1) * np.clip((0.55 - sat) / 0.25, 0, 1) * caixa
    emblema = Image.fromarray((emblema * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(13))
    emblema = np.asarray(emblema.filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
    # The fire: lit purple (blue and red over green, and bright) inside its ellipses, outside him and the emblem.
    roxo = np.clip(((rgb[..., 2] + rgb[..., 0]) / 2 - rgb[..., 1] - 0.06) / 0.18, 0, 1) * np.clip((mx - 0.3) / 0.25, 0, 1)
    zona = np.zeros((h, w), np.float32)
    for cx, cy, rx, ry in FOGO:
        d = np.sqrt(((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2)
        zona = np.maximum(zona, np.clip((1.1 - d) / 0.3, 0, 1))
    fogo = roxo * zona * (1 - emblema) * (1 - 0.7 * corpo)
    fogo = np.asarray(Image.fromarray((np.clip(fogo, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    fogo = np.clip(fogo * 1.6, 0, 1)

    tamanho = (LARGURA, round(h * LARGURA / w))
    menor = (LARGURA_MASCARAS, round(h * LARGURA_MASCARAS / w))
    corpo_img = Image.fromarray((corpo * 255).astype(np.uint8)).resize(menor, Image.BILINEAR)
    canais = [Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8)).resize(menor, Image.BILINEAR) for c in (fogo, emblema)]
    AQUI.mkdir(parents=True, exist_ok=True)
    Image.merge("RGB", (*canais, corpo_img)).save(AQUI / "mascaras.png", optimize=True)
    imagem.resize(tamanho, Image.LANCZOS).save(AQUI / "retrato.webp", quality=88, method=6)
    peso = emblema.sum()
    centro = [round(float((emblema * u).sum() / peso), 4), round(float((emblema * v).sum() / peso), 4)]
    dados = {"w": tamanho[0], "h": tamanho[1], "emblema": centro, "pontos": pontos}
    (AQUI / "retrato.json").write_text(json.dumps(dados, separators=(",", ":")) + "\n")
    olhos = [((pontos[a][0] + pontos[b][0]) / 2, (pontos[a][1] + pontos[b][1]) / 2) for a, b in ((33, 133), (362, 263))]
    print(f"emblema em {centro[0]:.3f},{centro[1]:.3f}")
    print(f"{len(pontos)} pontos; olhos em {olhos[0][0]:.3f},{olhos[0][1]:.3f} e {olhos[1][0]:.3f},{olhos[1][1]:.3f}")
    for nome in ("retrato.webp", "mascaras.png", "retrato.json"):
        print(f"{AQUI / nome} ({(AQUI / nome).stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
