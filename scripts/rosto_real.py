"""Luan's real face back on a picture an image model made of him, so a meme pose or costume keeps his own face.

    uv run -q -p 3.12 --with "mediapipe==0.10.14" --with opencv-python-headless --with pillow --with scipy \\
        python scripts/rosto_real.py <gerada.png> <quadro.png> <saida.png> [--boca] [--sem-cor]
    ... python scripts/rosto_real.py --procurar "<Câmera.mkv>" <de> <ate> <pasta>   # his frames, by expression

Luan, 2026-11-26, on the first reels with photoreal edits of him: "o meu rosto fica visivelmente deformado em relação
ao eu de verdade. Fotos realistas transformando o rosto geralmente não funcionam bem." Image models redraw the face
even when told to keep it. This takes the face from a real frame of his (Câmera.mkv, the live's camera: the same
expression and about the same angle as the pose; `--procurar` lists the window's frames with the mouth's opening,
the head's turn and the eyes', so the right one is picked) and lays it over the made picture's: both faces' 478 points
(MediaPipe's Face Landmarker, as sigma_retrato.py and the camera filters use), the frame's face warped onto the made
one triangle by triangle (Delaunay over the points), its colour matched to the made picture's skin (LAB mean and
spread inside the face, unless --sem-cor), then blended over a feathered mask of the face's oval, a little inside it,
so the made hair, ears, headset or veil stay. `--boca` keeps the made picture's mouth (a scream the frame lacks): a
mask with the lips cut out. It refuses when either picture has no face, or when the two heads turn too differently
(more than ~25° apart: a warped profile is worse than the made face; pick another frame or another gag).

mediapipe is held at 0.10.14 (newer wheels need libGLESv2, which WSL lacks), so it runs under uv, not the venv.
"""

import argparse
import subprocess
import sys
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from scipy.spatial import Delaunay

MODELO = Path.home() / ".cache" / "muanlartins" / "modelos" / "face_landmarker.task"
URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
# MediaPipe's face oval and lips (its FACEMESH_FACE_OVAL / FACEMESH_LIPS outer ring), in order around
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149,
        150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
MAX_TURN = 25.0


def landmarker():
    if not MODELO.exists():
        MODELO.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, MODELO)
    opcoes = vision.FaceLandmarkerOptions(base_options=mp_python.BaseOptions(model_asset_path=str(MODELO)),
                                          num_faces=1, output_facial_transformation_matrixes=True)
    return vision.FaceLandmarker.create_from_options(opcoes)


def face(marcador, rgb):
    """(points [478, 2] in pixels, yaw, pitch in degrees) or None."""
    r = marcador.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
    if not r.face_landmarks:
        return None
    h, w = rgb.shape[:2]
    pts = np.array([(p.x * w, p.y * h) for p in r.face_landmarks[0]], np.float32)
    m = np.array(r.facial_transformation_matrixes[0])[:3, :3]
    yaw = np.degrees(np.arctan2(-m[2, 0], np.hypot(m[2, 1], m[2, 2])))
    pitch = np.degrees(np.arctan2(m[2, 1], m[2, 2]))
    return pts, yaw, pitch


def warp(src, src_pts, dst_shape, dst_pts):
    """src warped onto dst's geometry, triangle by triangle (Delaunay on dst's points)."""
    h, w = dst_shape[:2]
    out = np.zeros((h, w, 3), np.float32)
    for ids in Delaunay(dst_pts).simplices:
        a, b = np.float32(src_pts[ids]), np.float32(dst_pts[ids])
        x, y, bw, bh = cv2.boundingRect(b)
        if bw <= 0 or bh <= 0:
            continue
        m = cv2.getAffineTransform(a, np.float32(b - [x, y]))
        patch = cv2.warpAffine(src, m, (bw, bh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
        mask = np.zeros((bh, bw), np.float32)
        cv2.fillConvexPoly(mask, np.int32(b - [x, y]), 1.0, cv2.LINE_AA)
        region = out[y:y + bh, x:x + bw]
        region[:] = region * (1 - mask[..., None]) + patch * mask[..., None]
    return out


def match_colour(face_img, target, mask):
    """face_img's LAB mean and spread inside mask made the target's."""
    a = cv2.cvtColor(np.clip(face_img, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    b = cv2.cvtColor(target, cv2.COLOR_RGB2LAB).astype(np.float32)
    m = mask > 0.5
    for c in range(3):
        sa, sb = a[..., c][m], b[..., c][m]
        matched = (a[..., c] - sa.mean()) * (sb.std() / max(sa.std(), 1e-3)) + sb.mean()
        # lightness all the way (the made picture's light), colour halfway (his own skin stays his)
        a[..., c] = matched if c == 0 else 0.5 * matched + 0.5 * (a[..., c] - sa.mean() + sb.mean())
    return cv2.cvtColor(np.clip(a, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)


def transplant(made_path, frame_path, out_path, keep_mouth=False, colour=True):
    made = cv2.cvtColor(cv2.imread(str(made_path), cv2.IMREAD_UNCHANGED)[..., :3], cv2.COLOR_BGR2RGB)
    alpha = cv2.imread(str(made_path), cv2.IMREAD_UNCHANGED)
    alpha = alpha[..., 3] if alpha.ndim == 3 and alpha.shape[2] == 4 else None
    frame = cv2.cvtColor(cv2.imread(str(frame_path)), cv2.COLOR_BGR2RGB)
    with landmarker() as marcador:
        fm, ff = face(marcador, made), face(marcador, frame)
    if fm is None or ff is None:
        sys.exit(f"Sem rosto em {'a imagem gerada' if fm is None else 'o quadro'}.")
    (dst, yaw_m, pitch_m), (src, yaw_f, pitch_f) = fm, ff
    turn = max(abs(yaw_m - yaw_f), abs(pitch_m - pitch_f))
    print(f"rosto gerado: giro {yaw_m:+.0f}° inclinação {pitch_m:+.0f}° · quadro: {yaw_f:+.0f}° {pitch_f:+.0f}°")
    if turn > MAX_TURN:
        sys.exit(f"As cabeças viram diferente demais ({turn:.0f}°): escolha outro quadro (--procurar) ou outra piada.")
    warped = warp(frame.astype(np.float32), src, made.shape, dst)
    h, w = made.shape[:2]
    mask = np.zeros((h, w), np.float32)
    # a little inside the oval: the jaw and forehead edge blend into the made picture's
    centre = dst[OVAL].mean(axis=0)
    oval = centre + (dst[OVAL] - centre) * 0.93
    cv2.fillPoly(mask, [np.int32(oval)], 1.0, cv2.LINE_AA)
    if keep_mouth:
        lips = dst[LIPS].mean(axis=0) + (dst[LIPS] - dst[LIPS].mean(axis=0)) * 1.15
        cv2.fillPoly(mask, [np.int32(lips)], 0.0, cv2.LINE_AA)
    size = max(3, int(np.ptp(dst[OVAL][:, 0]) * 0.06) | 1)
    soft = cv2.GaussianBlur(mask, (size * 2 + 1, size * 2 + 1), size / 2)
    if colour:
        warped = match_colour(warped, made, mask)
    out = made.astype(np.float32) * (1 - soft[..., None]) + warped * soft[..., None]
    out = np.clip(out, 0, 255).astype(np.uint8)
    if alpha is not None:
        cv2.imwrite(str(out_path), cv2.cvtColor(np.dstack([out, alpha]), cv2.COLOR_RGBA2BGRA))
    else:
        cv2.imwrite(str(out_path), cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
    print(f"→ {out_path}")


def search(video, start, end, folder):
    """Every 0.2 s of the window: a frame saved with its mouth opening, yaw and pitch, to pick the reference."""
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(end - start), "-i", str(video),
                          "-vf", "fps=5,scale=1280:-2", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                            "-of", "csv=p=0", str(video)], capture_output=True, text=True, check=True).stdout
    w0, h0 = map(int, probe.strip().split(","))
    w, h = 1280, round(1280 * h0 / w0 / 2) * 2
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    with landmarker() as marcador:
        for i, rgb in enumerate(frames):
            t = start + i / 5
            f = face(marcador, rgb)
            if f is None:
                continue
            pts, yaw, pitch = f
            mouth = np.linalg.norm(pts[13] - pts[14]) / max(np.linalg.norm(pts[33] - pts[263]), 1)
            name = folder / f"{t:.1f}.png"
            cv2.imwrite(str(name), cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
            print(f"{t:8.1f}  boca {mouth:.2f}  giro {yaw:+4.0f}°  inclinação {pitch:+4.0f}°  {name.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("args", nargs="*")
    parser.add_argument("--boca", action="store_true", help="keep the made picture's mouth (a scream)")
    parser.add_argument("--sem-cor", action="store_true", help="don't match the frame's colour to the made picture")
    parser.add_argument("--procurar", nargs=4, metavar=("VIDEO", "DE", "ATE", "PASTA"))
    a = parser.parse_args()
    if a.procurar:
        video, de, ate, pasta = a.procurar
        search(video, float(de), float(ate), pasta)
    elif len(a.args) == 3:
        transplant(*a.args, keep_mouth=a.boca, colour=not a.sem_cor)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
