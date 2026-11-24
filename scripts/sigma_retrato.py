"""Puts a picture of Luan as Gigachad into the camera filters' Sigma (public/stream/filtros/sigma/): the picture as
retrato.webp and its face's 478 points (MediaPipe's Face Landmarker, the same model the page tracks him with) as
retrato.json, which the Lance ruim's transformation morphs his live face onto.

  uv run -q -p 3.12 --with "mediapipe==0.10.14" --with pillow python scripts/sigma_retrato.py <picture.png>

The picture: black and white, landscape (3:2 is what the image models make), head and shoulders, facing the camera,
on a plain dark background, the face in the middle (the page frames it to fill the camera's box, eyes at 40% from the
top). The one on 2026-11-24 was made by OpenAI's image model through Codex (`codex exec -i <frame>`) from a frame of
his camera, with his OK, and picked by him out of four. It refuses a picture where it finds no face. mediapipe is held
at 0.10.14: newer wheels need libGLESv2, which WSL lacks.
"""

import json
import sys
import urllib.request
from pathlib import Path

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from PIL import Image

AQUI = Path(__file__).resolve().parent.parent / "public" / "stream" / "filtros" / "sigma"
MODELO = Path.home() / ".cache" / "muanlartins" / "modelos" / "face_landmarker.task"
URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    origem = Path(sys.argv[1])
    if not MODELO.exists():
        MODELO.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, MODELO)
    imagem = Image.open(origem).convert("RGB")
    w, h = imagem.size
    opcoes = vision.FaceLandmarkerOptions(base_options=mp_python.BaseOptions(model_asset_path=str(MODELO)), num_faces=1)
    with vision.FaceLandmarker.create_from_options(opcoes) as marcador:
        r = marcador.detect(mp.Image.create_from_file(str(origem)))
    if not r.face_landmarks:
        sys.exit(f"Nenhum rosto em {origem}.")
    pontos = [[round(p.x, 5), round(p.y, 5)] for p in r.face_landmarks[0]]
    AQUI.mkdir(parents=True, exist_ok=True)
    imagem.save(AQUI / "retrato.webp", quality=86, method=6)
    (AQUI / "retrato.json").write_text(json.dumps({"w": w, "h": h, "pontos": pontos}, separators=(",", ":")) + "\n")
    olhos = [((pontos[a][0] + pontos[b][0]) / 2, (pontos[a][1] + pontos[b][1]) / 2) for a, b in ((33, 133), (362, 263))]
    print(f"{len(pontos)} pontos; olhos em {olhos[0][0]:.3f},{olhos[0][1]:.3f} e {olhos[1][0]:.3f},{olhos[1][1]:.3f}")
    print(f"{AQUI / 'retrato.webp'} ({(AQUI / 'retrato.webp').stat().st_size // 1024} KB), {AQUI / 'retrato.json'}")


if __name__ == "__main__":
    main()
