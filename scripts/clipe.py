"""Highlights da live, stream-clip style (measured from fcyacr's reels): his camera on top, the game below, hard cuts
only, the live's own sound. One situation per short, played almost whole, opened by its hook.

    scripts/.venv/bin/python scripts/clipe.py scripts/roteiros/2026-11-09-bang-clipe.json

The roteiro is JSON: {"live": "2026-11-09", "nome": "...", "trechos": [{"de": s, "ate": s, "camera": "jogo" |
"conversa"}, ...]} in Live.mp4 seconds, played in the roteiro's order (the hook can come first and the play after it).
"jogo" = the live showed the game with his camera in the small box: the camera comes from Câmera.mkv (1280×720,
sharp) with the Filtros page's costume and flashes laid over it from the box; "conversa" = the live showed his camera
big (1280×720 at 64, 64): taken straight from Live.mp4. Optional per trecho: "texto" = the hook's line, over the
stretch on the seam (white, bold, dark outline), and "texto_ate" = seconds from the stretch's start when it goes away
(default: the whole stretch). No whole-screen camera: his 720p camera cut to 9:16 is a blown-up, soft face.

Sync (measured 2026-11-11 by his lips against his voice): Live.mp4 is in step, picture and sound, and it is the clock.
The Source Record files are not: OBS's audio buffering (the "Max audio buffering reached" of 11-09 and 11-10) delayed
their sound ~0.9 s behind their own picture. So Jogo.mp4 and Câmera.mkv are first placed by their sound
(`cortes.offset`, `cortes.camera_sound`) and then moved by how far their picture sits from the live's picture
(`cortes.picture_lag`, `cortes.camera_lag`). Never shift Live.mp4's picture.

Layout: 1080×1920, camera 1080×840 on top, the game's middle square 1080×1080 (native pixels, HUD included) below.
No captions on the plays, no effects, no sound effects: the reaction is the content. Sound: the live's mix (track 1,
what the VOD plays), -14 LUFS, true peak under -1.5 dBFS. Out: Videos\\Shorts\\prontos\\<live> clipe - <nome>.mp4.
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cortes import camera_lag, camera_sound, material, offset, picture_lag  # noqa: E402
from edicao import BRANCO, WORK, font  # noqa: E402
from windows import VIDEOS  # noqa: E402

W, H, CAM_H, GAME_H = 1080, 1920, 840, 1080
CAM_CROP = (270, 0, 870, 676)  # in Câmera.mkv's 1280×720: around his head and the costume, above the box's site bar
BOX = (44, 44, 480, 270)  # the game scenes' camera box on the live (the whole camera at ×0.375)
CONVERSA = (64, 64)  # the camera scenes: the whole camera at ×1
PLATE = 72  # the box's rank plate over the camera's top rows (in camera pixels): never taken from the box


def ffmpeg(*args, **kw):
    return subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True, **kw)


def part_of(table, t):
    return next(i for i, p in reversed(list(enumerate(table["Live"]))) if t >= p["em"])


def sync(live, game, camera, table, a, b, kind, lags):
    """(Jogo.mp4 second, Câmera.mkv second or None) showing Live.mp4's second a, by picture. `lags` keeps the game's
    (sound offset, picture lag) per part of the recording: a camera scene has neither the game's picture nor its
    sound on the live, so it takes its part's (both hold for the whole part)."""
    part = part_of(table, a)
    if kind == "jogo":
        shift, corr = offset(live, game, table, max(0.0, a - 10), 40)
        if corr < 0.3:
            sys.exit(f"{a:.1f}: o som do jogo não bateu com o da live (corr {corr:.2f})")
        lag, q = picture_lag(live, game, a, shift, min(30.0, b - a))
        if q < 0.4:
            sys.exit(f"{a:.1f}: a imagem do jogo não bateu com a da live ({q:.2f})")
        lags[part] = shift, lag
    elif part in lags:
        shift, lag = lags[part]
    else:
        sys.exit(f"{a:.1f}: cena de câmera sem um trecho de jogo na mesma parte da gravação")
    cam = None
    if kind == "jogo":
        sound = camera_sound(live, camera, table, a)
        late, quality = camera_lag(live, camera, table, a, min(15.0, b - a))
        if sound is None or late is None or quality < 0.05:
            sys.exit(f"{a:.1f}: não achei o rosto do Câmera.mkv na caixa da live")
        cam = a + sound - late
    print(f"  {a:7.1f}–{b:7.1f}  jogo {shift:+.3f} − {lag:.3f} s de imagem"
          + (f", câmera {cam - a:+.3f}" if cam is not None else ""))
    return a + shift - lag, cam


def wrap(draw, text, f, width):
    """One line if it fits, else the two-line split with the shortest longest line."""
    if draw.textlength(text, font=f) <= width:
        return [text]
    words = text.split()
    splits = [(" ".join(words[:i]), " ".join(words[i:])) for i in range(1, len(words))]
    return list(min(splits, key=lambda s: max(draw.textlength(x, font=f) for x in s)))


def caption(text, out, y):
    """The hook's line as a 1080×1920 overlay: white, bold, a dark outline and a soft shadow, centred on y."""
    f = font(112, "Bold")
    img = Image.new("RGBA", (W, H))
    lines = wrap(ImageDraw.Draw(img), text, f, W - 140)
    step = 128
    top = y - step * (len(lines) - 1) / 2
    shadow = Image.new("RGBA", (W, H))
    sd = ImageDraw.Draw(shadow)
    for i, line in enumerate(lines):
        sd.text((W / 2, top + i * step + 6), line, font=f, anchor="mm", fill=(0, 0, 0, 160), stroke_width=12,
                stroke_fill=(0, 0, 0, 160))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        d.text((W / 2, top + i * step), line, font=f, anchor="mm", fill=BRANCO, stroke_width=7,
               stroke_fill=(16, 16, 20))
    img.save(out)


def hd_camera(box, live="0:v", camera="2:v", start=0.0, filtro=True, recorte=CAM_CROP):
    """The filter from the live (its camera in `box`, at a small size, with the filter's costume and flashes) and
    Câmera.mkv (1280×720, sharp, without them) to [cam], 1080×840: the box blown up to the camera's size; where it
    differs from Câmera.mkv (the costume, the flash, the fire) it goes over the sharp picture, elsewhere his face
    stays sharp. The costume's dark hair over his own differs little from it: a low threshold and a wide blur keep
    it whole (2026-11-12; 38 and 5 left holes). `start`: seconds before the box is in place (a scene sliding in): until then, only Câmera.mkv.
    Câmera.mkv is taken at 1280×720 whatever it came at (854×480 on 11-18). `filtro=False` (a live without the camera
    filters, 11-18): Câmera.mkv alone, the live's box left out (the overlay's edges and compression would show through
    the mask). `recorte`: the part of the camera (in 1280×720) that fills the top, 1080:840 in shape."""
    bx, by, bw, bh = box
    x, y, w, h = recorte
    hd = f"[{camera}]scale=1280:720:flags=lanczos,format=yuv420p"
    if not filtro:
        return f"[{live}]nullsink;{hd},crop={w}:{h}:{x}:{y},scale={W}:{CAM_H}:flags=lanczos[cam];"
    enable = f":enable='gte(t\\,{start})'" if start else ""
    return (f"[{live}]crop={bw}:{bh}:{bx}:{by},scale=1280:720,format=yuv420p,split[box1][box2];"
            f"{hd},split[hd1][hd2];"
            f"[box1][hd1]blend=all_mode=difference,format=gray,lut=y='if(gt(val\\,22)\\,255\\,0)',"
            f"drawbox=x=0:y=0:w=1280:h={PLATE}:color=black:t=fill,gblur=sigma=12,"
            f"lut=y='if(lt(val\\,12)\\,0\\,min(255\\,val*5))',"  # drawbox's black is 16, not 0
            f"geq=lum='if(lt(Y\\,{PLATE - 16})\\,0\\,lum(X\\,Y))'[mask];"  # the blur creeps back up into the plate
            f"[box2][mask]alphamerge[fx];[hd2][fx]overlay=format=auto{enable},"
            f"crop={w}:{h}:{x}:{y},scale={W}:{CAM_H}:flags=lanczos[cam];")


def piece(live, game, camera, out, t, jogo_at, cam_at):
    """One stretch, video only, 1080×1920."""
    a, b, kind = t["de"], t["ate"], t["camera"]
    n = b - a
    inputs = ["-ss", f"{a:.3f}", "-t", f"{n:.3f}", "-i", str(live),
              "-ss", f"{jogo_at:.3f}", "-t", f"{n:.3f}", "-i", str(game)]
    x, y, w, h = CAM_CROP
    if kind == "jogo":
        inputs += ["-ss", f"{cam_at:.3f}", "-t", f"{n:.3f}", "-i", str(camera)]
        cam = hd_camera(BOX)
    else:
        cx, cy = CONVERSA
        cam = f"[0:v]crop={w}:{h}:{x + cx}:{y + cy},scale={W}:{CAM_H}:flags=lanczos[cam];"
    graph = (cam + f"[1:v]crop={GAME_H}:{GAME_H}:{(1920 - GAME_H) // 2}:0[game];"
             f"[cam][game]vstack,fps=60[v0];")
    if t.get("texto"):
        png = out.with_suffix(".png")
        caption(t["texto"], png, CAM_H)
        until = t.get("texto_ate")
        enable = f":enable='lt(t\\,{until})'" if until else ""
        graph += f"[v0][{inputs.count('-i')}:v]overlay=0:0{enable},format=yuv420p[v]"
        inputs += ["-i", str(png)]
    else:
        graph += "[v0]format=yuv420p[v]"
    ffmpeg(*inputs, "-filter_complex", graph, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium",
           "-crf", "17", str(out))


def main():
    roteiro = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    live, game, camera, table = material(roteiro)
    work = WORK / f"clipe-{roteiro['live']}-{Path(sys.argv[1]).stem}"
    work.mkdir(parents=True, exist_ok=True)
    trechos = roteiro["trechos"]
    print("sincronia (o Live.mp4 é o relógio):")
    at, lags = {}, {}
    # the game's stretches first: a camera scene takes its part's sync from them, even when it plays before them
    for i in sorted(range(len(trechos)), key=lambda i: trechos[i]["camera"] != "jogo"):
        t = trechos[i]
        at[i] = sync(live, game, camera, table, t["de"], t["ate"], t["camera"], lags)
    pieces = []
    for i, t in enumerate(trechos):
        out = work / f"{i:02d}.mp4"
        piece(live, game, camera, out, t, *at[i])
        pieces.append(out)
    (work / "lista.txt").write_text("".join(f"file '{p.name}'\n" for p in pieces))
    ffmpeg("-f", "concat", "-safe", "0", "-i", "lista.txt", "-c", "copy", "video.mp4", cwd=work)
    # the live's mix, each stretch with 15 ms fades at the cuts, then -14 LUFS / -1.5 dBTP (two passes)
    cuts = [(t["de"], t["ate"]) for t in trechos]
    trims = "".join(f"[0:a:0]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=in:d=0.015,"
                    f"afade=out:st={b - a - 0.015:.3f}:d=0.015[a{i}];" for i, (a, b) in enumerate(cuts))
    ffmpeg("-i", str(live), "-filter_complex", trims + "".join(f"[a{i}]" for i in range(len(cuts)))
           + f"concat=n={len(cuts)}:v=0:a=1[a]", "-map", "[a]", "-ar", "48000", "som-cru.wav", cwd=work)
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", "som-cru.wav", "-af",
                            "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True, cwd=work).stderr
    m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
    norm = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
            f"linear=true,aresample=192000,alimiter=limit=0.7:attack=1:release=80:level=false,aresample=48000")
    out = VIDEOS / "Shorts" / "prontos" / f"{roteiro['live']} clipe - {roteiro['nome']}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg("-i", "video.mp4", "-i", "som-cru.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", norm,
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out), cwd=work)
    # the cover: the first frame, the hook's line over his face
    ffmpeg("-i", str(out), "-frames:v", "1", "-q:v", "2", str(out.with_name(out.stem + " (capa).jpg")))
    print(out)


if __name__ == "__main__":
    main()
