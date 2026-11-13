"""Highlights da live, before any edit: what the live's camera did, and the numbered candidates reel Luan picks from.

    scripts/.venv/bin/python scripts/candidatos.py 2026-11-09 --camera            # the camera box, whole live
    scripts/.venv/bin/python scripts/candidatos.py 2026-11-09 lista.json          # the candidates reel

`--camera` reads Live.mp4's camera box at 10 frames a second (Windows' ffmpeg on the GPU, four stretches at a time,
~5 min for two hours) and prints when the camera filter flashed (warm glare over half the box for ~1.5 s: Phoenix's
bang), when it showed fire (flat orange) and when the live cut to a camera scene (Lance ruim, Terapia, Conversa: the
Pix QR code gone), in Live.mp4's picture seconds; the frames' numbers stay in ~/.cache/muanlartins/edicao/
camera-<date>.json. With the transcript and `valorant_kills.py` that's where the candidates come from.

The list is JSON, `[[n, start, end, "label"], ...]` in Live.mp4 seconds. Each candidate is cut raw from Live.mp4,
picture and sound together as they are (Live.mp4 is in step), with its number top right and "mm:ss · label" bottom
right, 1280×720, into `Videos\\Shorts\\candidatos\\<date> live - candidatos.mp4`. The pieces are named by their
recipe in ~/.cache/muanlartins/edicao/candidatos-<date>/, so a rerun with a changed list cuts only what changed (keep
the list at ~/.cache/muanlartins/edicao/candidatos-<date>.json). Luan answers with numbers; then
one short per pick with `clipe.py` (the `estudio` skill, "Highlights da live").
"""
import argparse
import hashlib
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cortes import parts  # noqa: E402
from edicao import FFMPEG, WORK  # noqa: E402
from windows import VIDEOS, to_windows  # noqa: E402

RATE, WW, HH = 10, 480, 270


def scan(live, start, length):
    """[(picture second, glare, fire, camera scene)] of the camera box (the game scenes' 480×270 box at a quarter)."""
    proc = subprocess.Popen(["ffmpeg.exe", "-v", "error", "-hwaccel", "cuda", "-ss", f"{start:.2f}", "-i", live,
                             "-t", f"{length:.2f}", "-an", "-vf", f"fps={RATE},scale={WW}:{HH}", "-pix_fmt", "rgb24",
                             "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    rows, i, size = [], 0, WW * HH * 3
    while (buf := proc.stdout.read(size)) and len(buf) == size:
        f = np.frombuffer(buf, np.uint8).reshape(HH, WW, 3).astype(np.int16)
        box = f[16:74, 12:131]  # cortes.CAM_RECT at a quarter
        r, g, b = box[..., 0], box[..., 1], box[..., 2]
        glare = float(((r > 215) & (g > 170)).mean())
        fire = float(((r > 200) & (g > 50) & (g < 170) & (b < 110)).mean())
        scene = float((f[99:126, 10:39].min(axis=2) > 200).mean()) < 0.12  # the Pix QR code gone
        rows.append((round(start + i / RATE, 2), round(glare, 3), round(fire, 3), int(scene)))
        i += 1
    proc.wait()
    return rows


def runs(rows, test, shortest):
    """[(from, to)] where test(row) holds for `shortest` s or more (gaps under 0.3 s bridged)."""
    found, start, last = [], None, None
    for row in rows:
        if test(row):
            if start is None or row[0] - last > 0.3:
                if start is not None and last - start >= shortest:
                    found.append((start, last))
                start = row[0]
            last = row[0]
    if start is not None and last - start >= shortest:
        found.append((start, last))
    return found


def camera(date, folder):
    live = next(folder.glob("* Live.mp4"))
    total = sum(p["segundos"] for p in parts(folder)["Live"])
    out = WORK / f"camera-{date}.json"
    if out.exists():
        rows = [tuple(r) for r in json.loads(out.read_text())]
    else:
        step = total / 4
        with ThreadPoolExecutor(4) as pool:
            rows = sorted(sum(pool.map(lambda k: scan(to_windows(live), k * step, step), range(4)), []))
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(rows))
    mmss = lambda s: f"{int(s // 60)}:{int(s % 60):02d}"  # noqa: E731
    for name, test, shortest in (("flash", lambda r: r[1] > 0.5, 0.8), ("fogo", lambda r: r[2] > 0.02, 0.5),
                                 ("cena da câmera", lambda r: r[3], 2.0)):
        found = runs(rows, test, shortest)
        print(f"{name}: {len(found)}")
        print("  " + "  ".join(f"{mmss(a)} ({a:.1f}, {b - a:.1f} s)" for a, b in found))
    print(f"(segundos da imagem do Live.mp4; o som vem até ~1 s antes) {out}")


def reel(date, folder, items):
    live = next(folder.glob("* Live.mp4"))
    work = WORK / f"candidatos-{date}"
    work.mkdir(parents=True, exist_ok=True)
    fonts = Path(__file__).resolve().parents[1] / "public" / "fonts"
    pieces = []
    for n, a, b, label in items:
        ass = work / f"{n:02d}.ass"
        ass.write_text(
            "[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\n\n[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
            "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, "
            "MarginR, MarginV, Encoding\n"
            "Style: N,Arial,64,&H00FFFFFF,&H00FFFFFF,&H00A72F00,&H00A72F00,-1,0,0,0,100,100,0,0,3,10,0,9,24,24,20,1\n"
            "Style: L,Arial,30,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,3,8,0,3,24,24,24,1\n\n"
            "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
            f"Dialogue: 0,0:00:00.00,9:00:00.00,N,,0,0,0,,{n}\n"
            f"Dialogue: 0,0:00:00.00,9:00:00.00,L,,0,0,0,,{int(a // 60)}:{int(a % 60):02d} · {label}\n",
            encoding="utf-8")
        piece = work / f"{n:02d}-{hashlib.sha1(json.dumps([a, b, label]).encode()).hexdigest()[:8]}.mp4"
        if piece.exists():  # named by its recipe: a changed window or label is a new file
            pieces.append(piece)
            print(f"{n:2d}  {b - a:4.1f} s  {label}  (já cortado)")
            continue
        subprocess.run([str(FFMPEG), "-v", "error", "-y", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i",
                        str(live), "-map", "0:v", "-map", "0:a:0", "-vf", f"scale=1280:720,subtitles={ass.name}:fontsdir={fonts},fade=in:0:6",
                        "-af", "afade=in:0:d=0.1", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-r", "30",
                        "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", piece.name], check=True, cwd=work)
        pieces.append(piece)
        print(f"{n:2d}  {b - a:4.1f} s  {label}")
    (work / "lista.txt").write_text("".join(f"file '{p.name}'\n" for p in pieces))
    out = VIDEOS / "Shorts" / "candidatos" / f"{date} live - candidatos.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(FFMPEG), "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "lista.txt", "-c", "copy",
                    "-movflags", "+faststart", str(out)], check=True, cwd=work)
    print(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("data")
    parser.add_argument("lista", nargs="?", type=Path, help="the candidates, [[n, start, end, label], ...]")
    parser.add_argument("--camera", action="store_true", help="scan the live's camera box")
    args = parser.parse_args()
    folder = VIDEOS / "Lives" / args.data
    if args.camera:
        camera(args.data, folder)
    elif args.lista:
        reel(args.data, folder, json.loads(args.lista.read_text(encoding="utf-8")))
    else:
        parser.error("--camera ou uma lista")


if __name__ == "__main__":
    main()
