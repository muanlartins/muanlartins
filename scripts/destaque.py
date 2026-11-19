"""Destaque da live: a live's moments made one vertical short with the edit turned up (Luan, 2026-11-12: "alta
dopamina, bem viciante, legendas brilhantes e animadas e efeitos sonoros e visuais que chamam a atenção"), on top of
clipe.py's picture: his camera on top (sharp, with the filter's costume and flashes), the game's middle square below,
Live.mp4 as the clock.

    scripts/.venv/bin/python scripts/destaque.py scripts/roteiros/<file>.json --palavras   # his words, in live s
    scripts/.venv/bin/python scripts/destaque.py scripts/roteiros/<file>.json             # the short, in prontos

The roteiro is JSON and every time in it is a Live.mp4 second:
- "jogo": "valorant" (default) or "rocket-league": where the game scenes put his camera's box.
- "trechos": [{"de", "ate", "camera", "baixo", "entrada", "seco"}], played in order, each edge moved onto a pause of
  his mic first (`bordas`: "seco" keeps one as written) and each after the first coming in with its "entrada"
  (`transitions`: "whip", the default, "zoom", "flash" or "seco"). "camera" says which scene the live showed, so
  where his camera was: "jogo" (the game scenes' small box), "conversa" (Conversa or Fim: big), "terapia" (the
  Terapia scene's box), "var" (the VAR scene's box, top right) or "lance" (Lance ruim: the live's zoomed camera,
  taken as it is). All but "lance" are his sharp camera (Câmera.mkv) with the filter's costume laid over it from the
  live (clipe.hd_camera): the live's own camera is the filter page's copy, ~22 new frames a second against
  Câmera.mkv's ~27, choppier (the Phoenix destaque's start, 11-12). "baixo" is the lower half: "jogo" (the game's
  middle square from Jogo.mp4; the default), "terapia" (the page's "Respira." and breathing circle; the default for
  "terapia"), "palco" (the live's Klein with its lattice: for moments with no game, where "rotulos" say what's
  happening) or [x, y, w, h] (that part of the live's screen, fitted in on the dark blue: the VAR's monitor, the
  credits).
- "camera_lag": Câmera.mkv's picture ahead of its sound, used where his face can't be matched in the live (a car or a
  costume over it): 0.017 s measured on 11-11 in the VAR scene; Source Record is in step since OBS's buffering fix.
- "trocas" (whisper's words fixed), "destaques" (key words: fire-coloured, bigger), "sem_legenda" ([[a, b]]).
- "titulo": {"linhas": [...], "de", "ate", "y", "tamanho"}: the hook's title, slammed in over the game's half (or
  centred on "y": 770 sits it on the camera's foot, above the game's top bar; 11-18), 118 px unless "tamanho".
- "rotulos": [{"linhas": [...], "de", "ate"}]: more titles the same way (an ability's name, the punchline).
- "impactos": [{"em", "flash": "quente" | "branco", "forca": 0-1, "flash_tau": its decay in s (0.16), "tremor": px,
  "chute": zoom kick, "soco": {"z", "entra" (frames), "segura" (s), "sai" (frames)}: a punch-in that holds, "onde":
  "camera" | "jogo" | "tudo" (where the kick, the punch and the flash go)}].
- "zoom": [{"de", "ate", "onde", "z", "centro": [x, y]}]: a slow push from 1 to z over the range, back at its end.
- "sons": [[t, name, dB] or [t, name, dB, "fim"] (ending at t)]: short-editing's files (impact-boom, riser, zhhh,
  pop-back, glass-shatter) or edicao.sfx's (hit, pop, ding, whoosh…, and the stream's palmas, uuuh, boing…).
- "figurinhas": [{"arquivo" (a PNG with alpha, under Videos), "de", "ate", "x", "y", "altura", "trocas": [[from, to,
  "other.png"]]}]: a sticker popping in at (x, y) of the short, breathing a little, swapped for another picture over
  each "trocas" range (a meme's mouth opening with his, 11-19). A "soco" can take "centro": [x, y], the point it zooms
  about (a point off his mouth puts the mouth where the zoom lands: p = (m' - z·m) / (1 - z)).
- "sons" also take "bloop" (a bubble, synthesised).
- "capa": the cover's second (a frame of the short), or the cover drawn in the lives' thumbnail style, as
  capa.py takes it ({"quadro", "origem", "fundo", "texto", "emblema"}).

- "arquivos": {"live", "jogo", "camera"} (paths under Videos) for a live not filed yet; "filtro": false for a live
  without the camera filters (the top is Câmera.mkv alone); "camera_recorte": [x, y, w, h], the camera's part (in
  1280×720, 1080:840 in shape) that fills the top (default clipe.CAM_CROP).
- "outro": false leaves out the shorts' outro (the site's call, Partes\\outro-editado.mp4), joined after it by default.

The sound is the live's mix (what the VOD plays) at -20 dBFS with the effects over it, then -14 LUFS.
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import clipe  # noqa: E402
from clipe import BOX, CAM_CROP, CAM_H, CONVERSA, GAME_H, H, W, ffmpeg, hd_camera, part_of  # noqa: E402
from cortes import camera_lag, camera_sound, material, offset, picture_lag  # noqa: E402
from edicao import FPS, SR, WORK, animate, ass_time, ease, pauses, place, plain, snap  # noqa: E402
from edicao import sfx as synth  # noqa: E402
from windows import VIDEOS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / ".claude" / "skills" / "short-editing" / "engine" / "fonts"
SFX = ROOT / ".claude" / "skills" / "short-editing" / "assets" / "sfx"
HEAVY = FONTS / "ArchivoBlack.ttf"
TERAPIA_BOX = (64, 64, 560, 315)  # his camera in the Terapia scene (matched against Câmera.mkv, 2026-11-12)
TERAPIA_PAGE = (286, 20, 890, 890)  # centred on "Respira." and the breathing circle, left of the chat
TERAPIA_HIDE = (0, 0, 360, 400)  # in that crop: his camera's box and the site's bar, covered
TERAPIA_FILL = 1000  # …with the live's background from x 1000 (between the text and the chat)
LANCE = (476, 0, 1389, 1080)  # Lance ruim's zoomed camera on the live, around his face
BOXES = {"valorant": BOX, "rocket-league": (44, 740, 480, 270)}  # the game scenes' camera box (brand/twitch/obs.py)
CONVERSA_BOX = (*CONVERSA, 1280, 720)  # Conversa and Fim
VAR_BOX = (1344, 136, 512, 288)  # the VAR scenes
ESCURO = "0x001447"  # the live's dark blue (the booths' fill): behind a part of the live's screen
CAMERA_LAG = 0.017
PAUSA = 0.25  # the shortest pause of his mic a stretch may start or end in
FOLGA = (0.2, 0.3)  # the quiet kept before his first word and after his last (editors: 150-250 ms in, 250-400 out)
LONGE = 0.1  # and an edge never closer than this to the speech on its other side
AJUSTE = 2.5  # how far an edge may move to reach a pause
TRANSICAO = (0.12, 0.2)  # a transition's seconds before and after its cut
OUTRO = VIDEOS / "Shorts" / "Partes" / "outro-editado.mp4"  # the site's call (montagem.py), after the short
OURO, FOGO, BRANCO = (255, 201, 60), (255, 106, 26), (255, 255, 255)
TITLE_Y = 1150  # the hook's title, on the game's half, above Shorts' bottom bar (y > 1248)


def frames(t):
    return int(round((t["ate"] - t["de"]) * FPS))


def bgr(c):
    return f"&H00{c[2]:02X}{c[1]:02X}{c[0]:02X}&"


# ---------------------------------------------------------------------------------------------------- the clock


class Clock:
    """Live seconds ↔ the short's, through the stretches played in order."""

    def __init__(self, trechos):
        # each stretch a whole number of frames, so the picture's pieces and the sound add up to the same length
        self.spans = [(t["de"], t["de"] + frames(t) / FPS) for t in trechos]
        self.starts = np.cumsum([0] + [b - a for a, b in self.spans]).tolist()
        self.length = self.starts[-1]

    def out(self, t):
        """The first stretch holding live second t (a teaser replaying a later stretch's seconds takes them)."""
        for (a, b), o in zip(self.spans, self.starts):
            if a - 0.02 <= t <= b + 0.02:  # a stretch's end as the roteiro wrote it, before rounding to frames
                return o + min(max(t, a), b) - a
        raise SystemExit(f"roteiro: {t} não está em nenhum trecho")

    def cut_after(self, o):
        """The first cut after short second o."""
        return next((s for s in self.starts[1:] if s > o + 1e-6), self.length)


# ---------------------------------------------------------------------------------------------------- sync, picture


def lower(t):
    return t.get("baixo", "terapia" if t["camera"] == "terapia" else "jogo")


def bordas(live, trechos):
    """Every stretch's edges moved onto a pause of his mic (Luan, 2026-11-12, on the diamante: "o fim da frase sempre
    cortava": 17 of its 20 edges, picked from whisper's word times, fell while he spoke). A start inside his speech
    moves back to where that speech began, an end forward to where it stops, up to AJUSTE s, keeping FOLGA of quiet;
    an edge already in a pause keeps at least that much, and LONGE from the speech on its other side. "seco": "de" | "ate" | true keeps an edge as written (a cut
    on the game alone). No pause near enough stops the run: the stretch has to change."""
    out, wrong = [], []
    for t in trechos:
        seco = t.get("seco", False)
        a0 = t["de"] - AJUSTE - 1
        quiet = [(p + a0, q + a0) for p, q in pauses(pcm(live, a0, t["ate"] - t["de"] + 2 * AJUSTE + 2,
                                                         stream="0:a:1", channels=1)[:, 0], shortest=PAUSA)]
        de, ate = t["de"], t["ate"]
        if seco not in (True, "de"):
            inside = next(((p, q) for p, q in quiet if p <= de <= q), None)
            if not inside:
                before = [(p, q) for p, q in quiet if q < de and de - q <= AJUSTE]
                inside = before[-1] if before else None
            if inside:
                p, q = inside
                de = min(max(min(de, q - FOLGA[0]), p + LONGE), q - min(LONGE, (q - p) / 2))
            else:
                wrong.append(f"{t['de']:.2f}: começa na fala, sem pausa {AJUSTE} s antes")
        if seco not in (True, "ate"):
            inside = next(((p, q) for p, q in quiet if p <= ate <= q), None)
            if not inside:
                after = [(p, q) for p, q in quiet if p > ate and p - ate <= AJUSTE]
                inside = after[0] if after else None
            if inside:
                p, q = inside
                ate = max(min(max(ate, p + FOLGA[1]), q - LONGE), p + min(LONGE, (q - p) / 2))
            else:
                wrong.append(f"{t['ate']:.2f}: termina na fala, sem pausa {AJUSTE} s depois")
        de, ate = round(de, 2), round(ate, 2)
        if (de, ate) != (t["de"], t["ate"]):
            print(f"  bordas na pausa: {t['de']:.2f}–{t['ate']:.2f} → {de:.2f}–{ate:.2f}")
        out.append(dict(t, de=de, ate=ate))
    if wrong:
        raise SystemExit("cortes no meio da fala:\n  " + "\n  ".join(wrong))
    return out


def synced(live, game, camera, table, trechos, work, fallback=CAMERA_LAG):
    """[(Jogo.mp4 second or None, Câmera.mkv second or None)] at each stretch's start, kept in sincronia.json.

    The game: measured on each stretch where the live shows it ("jogo"), over 24 s around it (from 8 s before), not
    over itself: a 2 s stretch on the VICTORY screen measured the game's picture 83 ms off, and 3 s of kills put the
    camera 67 ms off (2026-11-12). The game's sound offset and picture lag hold for a whole part of the recording (OBS's
    buffering), so every stretch with the game below takes its part's median.

    The camera: Câmera.mkv's sound against the live's mic places it (`camera_sound`, per stretch), then his head in the
    live against Câmera.mkv's gives the picture's lag (`camera_lag`, any of the scenes' boxes). Where that match is
    poor (a car or a costume over his head: every Rocket League stretch on 11-12), the best match of the roteiro's
    stretches stands in, or else `fallback` (0.017 s, measured on 11-11 in the VAR scene, q 0.998)."""
    cache = work / "sincronia.json"
    known = json.loads(cache.read_text()) if cache.exists() else {}
    measured = {}
    for t in trechos:
        if t["camera"] != "jogo" or lower(t) != "jogo":  # the game scene with the game closed (a browser, the menu)
            continue
        a, part = t["de"], part_of(table, t["de"])
        key = f"{a:.2f}-jogo"
        if key not in known:
            m = a - 8 if part_of(table, a - 8) == part else a
            shift, corr = offset(live, game, table, max(0.0, m - 10), 40)
            lag, q = picture_lag(live, game, m, shift, 24.0) if corr >= 0.3 else (0.0, 0.0)
            # a menu or a score screen can't be matched: the part's other stretches stand in for it
            known[key] = [shift, lag] if corr >= 0.3 and q >= 0.4 else None
            if known[key] is None:
                print(f"  {a:8.2f} jogo sem medida (som {corr:.2f}, imagem {q:.2f}): fica a da parte")
        if known[key]:
            measured.setdefault(part, []).append(tuple(known[key][:2]))
    sync = {part: tuple(np.median(np.array(v), axis=0)) for part, v in measured.items()}
    cams = {}
    for t in trechos:
        if t["camera"] == "lance" and lower(t) != "palco":
            continue
        a = t["de"]
        key = f"{a:.2f}-camera"
        if key not in known:
            sound = camera_sound(live, camera, table, a)
            if sound is None:
                sys.exit(f"{a:.1f}: o som da câmera não bateu com o microfone da live")
            late, q = camera_lag(live, camera, table, a, min(8.0, t["ate"] - a + 4))
            known[key] = [sound, late, q]
        cams[a] = known[key]
    good = [(q, late) for _, late, q in cams.values() if late is not None and q >= 0.3]
    stand_in = max(good)[1] if good else fallback
    at = []
    for t in trechos:
        a, kind, part = t["de"], t["camera"], part_of(table, t["de"])
        j = c = None
        note = ""
        if lower(t) == "jogo":
            if part not in sync:
                sys.exit(f"{a}: nenhum trecho de jogo na mesma parte da gravação para sincronizar")
            shift, lag = sync[part]
            j = a + shift - lag
            note += f"jogo {shift:+.3f} − {lag:.3f}"
        if a in cams:
            sound, late, q = cams[a]
            used = late if late is not None and q >= 0.3 else stand_in
            c = a + sound - used
            note += f"  câmera {sound:+.3f} − {used:.3f}" + ("" if used == late else f" (rosto {q:.2f}: emprestado)")
        at.append((j, c))
        print(f"  {a:8.2f} {kind:8s} {lower(t) if isinstance(lower(t), str) else 'tela':8s} {note}")
    cache.write_text(json.dumps(known, indent=1))
    return at


def palco():
    """The lower half where there's no game: Klein brighter in the middle, darker at the edges, with the faint diagonal
    lattice of the live's backgrounds."""
    out = WORK / "palco-1080.png"
    if not out.exists():
        y, x = np.mgrid[0:GAME_H, 0:GAME_H].astype(np.float32) / GAME_H - 0.5
        glow = np.clip(1 - np.sqrt(x ** 2 + (y * 1.2) ** 2) * 1.5, 0, 1)[..., None]
        dark, klein = np.array((0, 20, 71), np.float32), np.array((0, 47, 167), np.float32)
        img = dark * (1 - glow) + klein * glow
        k = np.mgrid[0:GAME_H, 0:GAME_H]
        lattice = (((k[0] + k[1]) % 44 < 2) | ((k[0] - k[1]) % 44 < 2))[..., None]
        img = np.where(lattice, img * 0.9 + 255 * 0.1, img)
        Image.fromarray(img.astype(np.uint8)).save(out)
    return out


def piece(live, game, camera, t, jogo_at, cam_at, box, filtro=True, recorte=CAM_CROP):
    """ffmpeg's arguments (but the output) for one stretch's clean picture, 1080×1920 at 60 fps, no effects."""
    a, kind, below = t["de"], t["camera"], lower(t)
    n = frames(t) / FPS + 0.25  # read a little more, keep exactly frames(t)
    inputs = ["-ss", f"{a:.3f}", "-t", f"{n:.3f}", "-i", str(live)]
    uses = {"live": [], "cam": []}
    if cam_at is not None:
        inputs += ["-ss", f"{cam_at:.3f}", "-t", f"{n:.3f}", "-i", str(camera)]
    if below == "jogo":
        inputs += ["-ss", f"{jogo_at:.3f}", "-t", f"{n:.3f}", "-i", str(game)]
    cam_in = "1:v" if cam_at is not None else None
    game_in = f"{inputs.count('-i') - 1}:v" if below == "jogo" else None
    graph = []
    if kind == "lance":
        lx, ly, lw, lh = LANCE
        uses["live"].append(f"crop={lw}:{lh}:{lx}:{ly},scale={W}:{CAM_H}:flags=lanczos[cam]")
    else:
        boxes = {"jogo": box, "conversa": CONVERSA_BOX, "terapia": TERAPIA_BOX, "var": VAR_BOX}
        if kind not in boxes:
            sys.exit(f"câmera desconhecida: {kind}")
        uses["live"].append(None)  # hd_camera's own input
        uses["cam"].append(None)
    if below == "jogo":
        graph.append(f"[{game_in}]crop={GAME_H}:{GAME_H}:{(1920 - GAME_H) // 2}:0[game]")
    elif below == "terapia":
        px, py, pw, ph = TERAPIA_PAGE
        hx, hy, hw, hh = TERAPIA_HIDE
        # the box's edge covered with plain background from the right of "Respira." (stripes, no text)
        uses["live"].append(f"split[l3][l4];[l3]crop={pw}:{ph}:{px}:{py}[p1];[l4]crop={hw}:{hh}:{TERAPIA_FILL}:"
                            f"{py + hy}[pb];[p1][pb]overlay={hx}:{hy},scale={GAME_H}:{GAME_H}:flags=lanczos[game]")
    elif below == "palco":
        # the live's Klein with its lattice, for the titles (his blurred camera there read as a ghost of his face)
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{n:.3f}", "-i", str(palco())]
        graph.append(f"[{inputs.count('-i') - 1}:v]format=yuv420p[game]")
    else:
        x, y, w, h = below
        k = min(GAME_H / w, GAME_H / h)
        sw, sh = int(w * k) // 2 * 2, int(h * k) // 2 * 2
        uses["live"].append(f"crop={w}:{h}:{x}:{y},scale={sw}:{sh}:flags=lanczos[shot];"
                            f"color=c={ESCURO}:s={GAME_H}x{GAME_H}:r={FPS}[bg];"
                            f"[bg][shot]overlay={(GAME_H - sw) // 2}:{(GAME_H - sh) // 2}:shortest=1[game]")
    # each input split as many ways as it's used
    for name, src in (("live", "0:v"), ("cam", cam_in)):
        if not uses[name]:
            continue
        labels = [f"{name}{i}" for i in range(len(uses[name]))]
        graph.append(f"[{src}]" + (f"split={len(labels)}" + "".join(f"[{x}]" for x in labels) if len(labels) > 1
                                   else f"null[{labels[0]}]"))
        for label, use in zip(labels, uses[name]):
            if use is not None:
                graph.append(f"[{label}]{use}")
    if kind != "lance":
        graph.append(hd_camera(boxes[kind], live="live0", camera="cam0", start=t.get("filtro_de", 0.0),
                                filtro=filtro, recorte=recorte).rstrip(";"))
    graph.append("[cam][game]vstack,fps=60,format=yuv420p[v]")
    return [*inputs, "-filter_complex", ";".join(graph), "-map", "[v]", "-frames:v", str(frames(t)), "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "16"]


# ---------------------------------------------------------------------------------------------------- words, captions


def transcribe(live, trechos, work, roteiro):
    """Per stretch, [(live from, live to, word)] said inside it: each stretch heard on its own (cached), the words
    pulled out of the mic's pauses (whisper stretches a first word back over the silence), then the roteiro's
    fixes: "trocas" (a word everywhere), "corrigir" ([[start, text]], the start as --palavras prints it: one word,
    "" drops it) and "palavras" ([[from, to, text]]: words whisper missed)."""
    from shorts import words
    fixes, skip = roteiro.get("trocas", {}), roteiro.get("sem_legenda", [])
    fix_at = roteiro.get("corrigir", [])
    added = roteiro.get("palavras", [])
    out = []
    for t in trechos:
        a, b = t["de"] - 0.6, t["ate"] + 0.6
        cache = work / f"palavras-{a:.2f}-{b:.2f}.json"
        if cache.exists():
            said = json.loads(cache.read_text(encoding="utf-8"))
        else:
            said = [(x + a, y + a, w) for x, y, w in words(live, a, b)]
            cache.write_text(json.dumps(said, ensure_ascii=False), encoding="utf-8")
        quiet = [(p + a, q + a) for p, q in pauses(pcm(live, a, b - a, stream="0:a:1", channels=1)[:, 0])]
        fixed = []
        for x, y, w in snap(said, quiet):
            hit = next((text for at, text in fix_at if abs(at - x) < 0.015), None)
            if hit is not None:
                w = hit
            lead, core, tail = re.fullmatch(r"(\W*)(.*?)(\W*)", w).groups()
            for wrong, right in fixes.items():
                if core.casefold() == wrong.casefold():
                    w = lead + right + tail
            if w:
                fixed.append((x, y, w))
        fixed += [tuple(p) for p in added if a <= p[0] < b]
        out.append(spread(sorted((x, y, w) for x, y, w in fixed
                                 if t["de"] <= x < t["ate"] and not any(p <= x < q for p, q in skip))))
    return out


def spread(said):
    """Words whisper put on (almost) the same instant, spread over the time they took, by their length."""
    out, i = list(said), 0
    while i < len(out):
        j = i
        while j + 1 < len(out) and out[j + 1][0] - out[j][0] < 0.07:
            j += 1
        if j > i:
            start = out[i][0]
            end = out[j + 1][0] if j + 1 < len(out) else max(y for _, y, _ in out[i:j + 1])
            end = max(end, start + 0.12 * (j - i + 1))
            sizes = [len(w) + 1 for _, _, w in out[i:j + 1]]
            at = start
            for k, size in zip(range(i, j + 1), sizes):
                d = (end - start) * size / sum(sizes)
                out[k] = (at, at + d, out[k][2])
                at += d
        i = j + 1
    return out


def captions(said, keys, clock):
    """Word by word on the seam, three words at most: each word pops in gold with a fire glow when said, then stays
    white (key words fire and 12% bigger). Heavy capitals, a black edge and a soft shadow. Never across a cut."""
    groups, group = [], []
    for w in said:
        if group and (len(group) >= 3 or len(" ".join(x[2] for x in group + [w])) > 13 or w[0] - group[-1][1] > 0.35
                      or group[-1][2][-1] in ".?!,…" or clock.cut_after(group[0][0]) <= w[0]):
            groups.append(group)
            group = []
        group.append(w)
    if group:
        groups.append(group)
    events = []
    for n, group in enumerate(groups):
        end = min(group[-1][1] + 0.35, clock.cut_after(group[0][0]))
        if n + 1 < len(groups):
            end = min(end, groups[n + 1][0][0])
        key = [plain(w) in keys for _, _, w in group]
        for i, (start, _, _) in enumerate(group):
            until = group[i + 1][0] if i + 1 < len(group) else end
            if until - start < 0.02:
                continue
            at = f"{ass_time(start)},{ass_time(until)}"
            glow, face = [], []
            for j, (_, _, w) in enumerate(group):
                size = 112 if key[j] else 100
                pop = f"\\fscx{size * 1.32:.0f}\\fscy{size * 1.32:.0f}\\t(0,110,\\fscx{size}\\fscy{size})"
                still = f"\\fscx{size}\\fscy{size}"
                word = w.upper()
                if j == i:
                    glow.append(f"{{\\1a&HFF&\\3a&H40&\\4a&HFF&\\3c{bgr(FOGO)}\\bord22\\blur14{pop}}}{word}")
                    face.append(f"{{\\alpha&H00&\\c{bgr(OURO)}{pop}}}{word}")
                else:
                    glow.append(f"{{\\alpha&HFF&{still}}}{word}")
                    color = bgr(FOGO) if key[j] else bgr(BRANCO)
                    face.append(f"{{\\alpha&H{'00' if j < i else 'FF'}&\\c{color}{still}}}{word}")
            pos = f"{{\\an5\\pos({W // 2},{CAM_H})}}"
            events.append(f"Dialogue: 0,{at},Legenda,,0,0,0,,{pos}{' '.join(glow)}")
            events.append(f"Dialogue: 1,{at},Legenda,,0,0,0,,{pos}{' '.join(face)}")
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,Archivo Black,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H70000000,0,0,0,0,100,100,0,0,1,9,5,5,30,30,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n"


def title_sprite(lines, size=118):
    """The hook's title: heavy capitals, the first line white, the rest gold into fire, a black edge, a fire glow."""
    f = ImageFont.truetype(str(HEAVY), size)
    probe = ImageDraw.Draw(Image.new("L", (1, 1)))
    widths = [probe.textlength(line, font=f) for line in lines]
    if max(widths) > W - 120:  # a long line: the size that fits, never past the frame's edges
        return title_sprite(lines, int(size * (W - 120) / max(widths)))
    edge, pad, lh = 11, 60, int(size * 1.08)
    w, h = int(max(widths)) + 2 * pad, lh * len(lines) + 2 * pad
    shape = Image.new("L", (w, h))
    fill = Image.new("L", (w, h))
    ds, df = ImageDraw.Draw(shape), ImageDraw.Draw(fill)
    for n, line in enumerate(lines):
        x, y = (w - widths[n]) / 2, pad + n * lh
        ds.text((x, y), line, font=f, fill=255, stroke_width=edge, stroke_fill=255)
        df.text((x, y), line, font=f, fill=255)
    glow = Image.new("RGBA", (w, h), FOGO + (0,))
    glow.putalpha(shape.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.85)))
    out = Image.alpha_composite(Image.new("RGBA", (w, h)), glow)
    out = Image.alpha_composite(out, Image.merge("RGBA", (*[Image.new("L", (w, h), 0)] * 3, shape)))
    ramp = np.zeros((h, w, 3), np.float32)
    first = pad + lh
    ys = np.clip((np.arange(h) - first) / max(1, h - pad - first), 0, 1)[:, None]
    ramp[:] = np.where(np.arange(h)[:, None, None] < first, np.array(BRANCO, np.float32),
                       (np.array(OURO) * (1 - ys) + np.array(FOGO) * ys)[:, None, :])
    color = Image.fromarray(ramp.astype(np.uint8))
    color.putalpha(fill)
    return np.array(Image.alpha_composite(out, color))


# ---------------------------------------------------------------------------------------------------- the effects


def transitions(trechos, clock):
    """[(short second of the cut, kind)]: each stretch's "entrada" ("whip", the default: the frame swept sideways
    with motion blur, out and back in; "zoom": punched in and out with a white flash; "flash"; "seco": a plain cut)."""
    return [(o, t.get("entrada", "whip")) for o, t in zip(clock.starts[1:], trechos[1:])
            if t.get("entrada", "whip") != "seco"]


def transition_sounds(cuts):
    """Their sounds, by short second: a whoosh peaking on the cut (synth's peaks 62% into it), a hit on a zoom's."""
    out = []
    for o, kind in cuts:
        if kind == "whip":
            out.append((o - 0.42 * 0.62, "whoosh", -10))
        elif kind == "zoom":
            out += [(o - 0.26 * 0.62, "whoosh_curto", -12), (o, "hit", -12)]
        else:
            out.append((o, "pop", -14))
    return out


class Effects:
    def __init__(self, roteiro, clock, trechos=()):
        o = clock.out
        self.cuts = transitions(trechos, clock) if trechos else []
        self.impacts = [dict(i, em=o(i["em"])) for i in roteiro.get("impactos", [])]
        self.zooms = [dict(z, de=o(z["de"]), ate=o(z["ate"])) for z in roteiro.get("zoom", [])]
        self.titles = [{"de": o(t["de"]), "ate": o(t["ate"]), "anim": "slam", "y": t.get("y", TITLE_Y),
                        "sprite": title_sprite(t["linhas"], t.get("tamanho", 118))}
                       for t in ([roteiro["titulo"]] if roteiro.get("titulo") else []) + roteiro.get("rotulos", [])]
        self.stickers = []
        for st in roteiro.get("figurinhas", []):
            def load(path, h=st["altura"]):
                im = np.array(Image.open(VIDEOS / path).convert("RGBA"))
                return cv2.resize(im, None, fx=h / im.shape[0], fy=h / im.shape[0], interpolation=cv2.INTER_AREA)
            self.stickers.append({"de": o(st["de"]), "ate": o(st["ate"]), "anim": "pop", "x": st["x"], "y": st["y"],
                                  "base": load(st["arquivo"]),
                                  "trocas": [(o(a), o(b), load(path)) for a, b, path in st.get("trocas", [])]})

    def zoom(self, o, where):
        z, center = 1.0, ((W / 2, CAM_H * 0.45) if where == "camera" else (W / 2, GAME_H / 2))
        for p in self.zooms:
            if p["onde"] == where and p["de"] <= o < p["ate"]:
                z = 1 + (p["z"] - 1) * ease((o - p["de"]) / (p["ate"] - p["de"]))
                center = tuple(p.get("centro", center))
        for i in self.impacts:
            if i.get("chute") and i.get("onde", "tudo") in (where, "tudo") and o >= i["em"]:
                z *= 1 + i["chute"] * math.exp(-(o - i["em"]) / 0.09)
            punch = i.get("soco")
            if punch and i.get("onde", "tudo") in (where, "tudo"):
                x = o - i["em"]
                up, hold, down = punch.get("entra", 5) / FPS, punch.get("segura", 0.4), punch.get("sai", 15) / FPS
                k = (ease(x / up) if 0 <= x < up else 1.0 if up <= x < up + hold
                     else 1 - ease((x - up - hold) / down) if up + hold <= x < up + hold + down else 0.0)
                z *= 1 + (punch["z"] - 1) * k
                if k > 0 and punch.get("centro"):
                    center = tuple(punch["centro"])
        return z, center

    def shake(self, o):
        dx = dy = 0.0
        for i in self.impacts:
            x = o - i["em"]
            if 0 <= x < 0.6 and i.get("tremor"):
                a = i["tremor"] * math.exp(-x / 0.12)
                dx += a * math.sin(2 * math.pi * 19 * x + 1.3)
                dy += a * math.cos(2 * math.pi * 23 * x)
        return dx, dy

    def flash(self, o, where):
        color, alpha = (255, 255, 255), 0.0
        for i in self.impacts:
            x = o - i["em"]
            if i.get("flash") and 0 <= x < 0.9 and i.get("onde", "tudo") in (where, "tudo"):
                a = i.get("forca", 0.5) * min(1, x / 0.03 + 0.4) * math.exp(-x / i.get("flash_tau", 0.16))
                if a > alpha:
                    color = (255, 236, 205) if i["flash"] == "quente" else (255, 255, 255)
                    alpha = a
        return color, alpha

    def transition(self, f, o):
        """The cut's sweep: u climbs to 1 at the cut (accelerating out) and falls back to 0 after (easing in)."""
        before, after = TRANSICAO
        for c, kind in self.cuts:
            x = o - c
            if not -before <= x < after:
                continue
            u = ((x + before) / before) ** 2 if x < 0 else (1 - x / after) ** 2
            if kind == "whip":
                dx = -0.5 * W * u if x < 0 else 0.5 * W * u  # out to the left, in from the right
                m = np.float32([[1, 0, dx], [0, 1, 0]])
                f[:] = cv2.warpAffine(f, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
                k = 1 + int(140 * u)
                if k > 1:
                    f[:] = cv2.blur(f, (k, 1))
            elif kind == "zoom":
                z = 1 + 0.2 * u
                m = np.float32([[z, 0, (1 - z) * W / 2], [0, z, (1 - z) * H / 2]])
                f[:] = cv2.warpAffine(f, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
                k = 1 + int(24 * u)
                if k > 1:
                    f[:] = cv2.blur(f, (k, k))
            if kind in ("zoom", "flash"):
                a = (0.55 if kind == "zoom" else 0.85) * math.exp(-abs(x) / 0.05)
                f[:] = (f.astype(np.float32) * (1 - a) + 255 * a).astype(np.uint8)
        return f

    def frame(self, f, o):
        self.transition(f, o)
        dx, dy = self.shake(o)
        for y0, y1, where in ((0, CAM_H, "camera"), (CAM_H, H, "jogo")):
            z, (cx, cy) = self.zoom(o, where)
            if abs(z - 1) > 1e-3 or dx or dy:
                z *= 1 + (abs(dx) + abs(dy)) / 400  # the shake never shows the frame's edge
                m = np.float32([[z, 0, (1 - z) * cx + dx], [0, z, (1 - z) * cy + dy]])
                f[y0:y1] = cv2.warpAffine(f[y0:y1], m, (W, y1 - y0), flags=cv2.INTER_LINEAR,
                                          borderMode=cv2.BORDER_REFLECT101)
        for y0, y1, where in ((0, CAM_H, "camera"), (CAM_H, H, "jogo")):
            color, a = self.flash(o, where)
            if a > 0.004:
                f[y0:y1] = (f[y0:y1].astype(np.float32) * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)
        for st in self.stickers:
            if st["de"] - 0.1 <= o <= st["ate"] + 0.5:
                scale, alpha, lift = animate(st, o)
                sprite, bump = st["base"], 1.0
                for a, b, im in st["trocas"]:
                    if a <= o < b:  # the other picture, popping a little as it comes in
                        sprite, bump = im, 1 + 0.1 * math.exp(-(o - a) / 0.05)
                breathe = 1 + 0.025 * math.sin(2 * math.pi * 2.5 * (o - st["de"]))
                place(f, sprite, st["x"], st["y"] + lift, scale * bump * breathe, alpha)
        for title in self.titles:
            if title["de"] - 0.1 <= o <= title["ate"] + 0.5:
                scale, alpha, lift = animate(title, o)
                place(f, title["sprite"], W / 2, title["y"] + lift, scale, alpha)
        return f


# ---------------------------------------------------------------------------------------------------- the sound


def pcm(path, a=None, n=None, stream="0:a:0", channels=2):
    args = ["ffmpeg", "-v", "error"] + (["-ss", f"{a:.3f}", "-t", f"{n:.3f}"] if a is not None else [])
    raw = subprocess.run(args + ["-i", str(path), "-map", stream, "-ac", str(channels), "-ar", str(SR), "-f", "f32le",
                                 "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, channels).copy()


def sound(name):
    if name == "bloop":  # a bubble: a short sine gliding up, for a fish's mouth (11-19)
        t = np.arange(int(0.11 * SR)) / SR
        x = np.sin(2 * np.pi * np.cumsum(260 * (1100 / 260) ** np.minimum(1, t / 0.07)) / SR)
        return (x * np.minimum(1, t / 0.003) * np.exp(-t * 32)).astype(np.float32)
    path = SFX / f"{name}.mp3"
    if path.exists():
        x = pcm(path, stream="0:a:0", channels=1)[:, 0]
        return x / (np.abs(x).max() + 1e-9)
    return synth(name)


def mixdown(live, trechos, clock, sons, extra=()):
    """The live's mix per stretch (15 ms fades at the cuts), its loud parts at -20 dBFS, the effects over it ("sons"
    by live second, `extra` by the short's: the transitions')."""
    chunks = []
    for a, b in clock.spans:
        n = int(round((b - a) * SR))
        x = pcm(live, a, b - a)[:n]
        x = np.pad(x, ((0, n - len(x)), (0, 0)))
        f = int(0.015 * SR)
        ramp = np.linspace(0, 1, f, dtype=np.float32)[:, None]
        x[:f] *= ramp
        x[-f:] *= ramp[::-1]
        chunks.append(x)
    mix = np.concatenate(chunks)
    win = int(0.05 * SR)
    rms = np.sqrt((mix.mean(axis=1)[: len(mix) // win * win].reshape(-1, win) ** 2).mean(axis=1))
    mix *= 0.1 / (np.percentile(rms, 90) + 1e-9)
    peak = 0.1 * 2.8  # speech's typical peak at that level: the effects' gains are set against it, as in edicao.py
    placed = [(clock.out(t), name, gain, *how) for t, name, gain, *how in sons] + list(extra)
    for o, name, gain, *how in placed:
        s = sound(name) * peak * 10 ** (gain / 20)
        o -= len(s) / SR if how and how[0] == "fim" else 0
        i = int(round(o * SR))
        if i < 0:
            s, i = s[-i:], 0
        s = s[: len(mix) - i]
        mix[i:i + len(s)] += s[:, None]
    return mix


# ---------------------------------------------------------------------------------------------------- the run


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roteiro")
    ap.add_argument("--palavras", action="store_true")
    args = ap.parse_args()
    roteiro = json.loads(Path(args.roteiro).read_text(encoding="utf-8"))
    live, game, camera, table = material(roteiro)
    work = WORK / f"destaque-{Path(args.roteiro).stem}"
    work.mkdir(parents=True, exist_ok=True)
    trechos = bordas(live, roteiro["trechos"])
    clock = Clock(trechos)
    heard = transcribe(live, trechos, work, roteiro)
    if args.palavras:
        for t, said, (a, _), start in zip(trechos, heard, clock.spans, clock.starts):
            print(f"— {t['de']}–{t['ate']} ({t['camera']})")
            for x, y, w in said:
                print(f"  {x:8.2f} {y:8.2f}  [{start + x - a:6.2f}]  {w}")
        return
    print("sincronia (o Live.mp4 é o relógio):")
    at = synced(live, game, camera, table, trechos, work, roteiro.get("camera_lag", CAMERA_LAG))
    box = BOXES[roteiro.get("jogo", "valorant")]
    pieces = []
    for t, (j, c) in zip(trechos, at):
        args = piece(live, game, camera, t, j, c, box, roteiro.get("filtro", True),
                     tuple(roteiro.get("camera_recorte", CAM_CROP)))
        # named by its recipe: a changed stretch, sync or filter is a new file, so nothing needs deleting
        out = work / f"{t['camera']}-{t['de']:.2f}-{hashlib.sha1(repr(args).encode()).hexdigest()[:8]}.mp4"
        if not out.exists():  # written aside and renamed, so a failed render never leaves a broken piece
            ffmpeg(*args, str(out.with_suffix(".tmp.mp4")))
            out.with_suffix(".tmp.mp4").rename(out)
        pieces.append(out)
    (work / "lista.txt").write_text("".join(f"file '{p.name}'\n" for p in pieces))
    ffmpeg("-f", "concat", "-safe", "0", "-i", "lista.txt", "-c", "copy", "limpo.mp4", cwd=work)

    # each word placed in its own stretch: a stretch may replay the live's seconds of another (the hook's teaser)
    said = [(o, min(o + y - x, clock.cut_after(o)), w)
            for (a, _), start, s in zip(clock.spans, clock.starts, heard) for x, y, w in s
            for o in [start + x - a]]
    (work / "legendas.ass").write_text(captions(said, {plain(k) for k in roteiro.get("destaques", [])}, clock),
                                       encoding="utf-8")
    fx = Effects(roteiro, clock, trechos)
    frames = int(round(clock.length * FPS))
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", "limpo.mp4", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, cwd=work)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-vf", f"ass=legendas.ass:fontsdir={FONTS}", "-c:v", "libx264",
                            "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "video.mp4"],
                           stdin=subprocess.PIPE, cwd=work)
    n, size = 0, W * H * 3
    while n < frames and len(buf := dec.stdout.read(size)) == size:
        enc.stdin.write(fx.frame(np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy(), n / FPS).tobytes())
        n += 1
    enc.stdin.close()
    enc.wait()
    dec.kill()
    print(f"  {n} quadros, {n / FPS:.2f} s")

    mix = mixdown(live, trechos, clock, roteiro.get("sons", []), transition_sounds(fx.cuts))
    (work / "som-cru.f32").write_bytes(mix.astype(np.float32).tobytes())
    raw = ["-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "som-cru.f32"]
    probe = subprocess.run(["ffmpeg", "-hide_banner", *raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
                            "-f", "null", "-"], capture_output=True, text=True, cwd=work).stderr
    m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
    norm = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
            f"linear=true,aresample=192000,alimiter=limit=0.7:attack=1:release=80:level=false,aresample=48000")
    out = VIDEOS / "Shorts" / "prontos" / f"{roteiro['live']} destaque - {roteiro['nome']}.mp4"
    if roteiro.get("outro", True):  # the site's call after it (Luan, 2026-11-12: "trazer de volta a outro")
        # the levelled sound written whole first: loudnorm holds ~3 s back, and muxing it with the video under
        # -shortest dropped them (11-12: the Diamante's and the ace's last 3 s before the outro came out silent)
        ffmpeg("-y", *raw, "-af", norm, "-c:a", "pcm_s16le", "som.wav", cwd=work)
        ffmpeg("-y", "-i", "video.mp4", "-i", "som.wav", "-i", str(OUTRO), "-filter_complex",
               f"[0:v]fps={FPS},format=yuv420p,setsar=1[a];[2:v]fps={FPS},format=yuv420p,setsar=1[b];"
               f"[1:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo,"
               f"apad,atrim=0:{n / FPS:.6f}[x];"
               f"[2:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo[y];"
               "[a][x][b][y]concat=n=2:v=1:a=1[v][o]", "-map", "[v]", "-map", "[o]", "-c:v", "libx264", "-preset",
               "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags",
               "+faststart", str(out), cwd=work)
    else:
        ffmpeg("-i", "video.mp4", *raw, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", norm, "-c:a", "aac",
               "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out), cwd=work)
    if isinstance(roteiro.get("capa"), dict):  # drawn in the lives' thumbnail style (capa.py)
        import capa
        capa.compose(roteiro)
    else:  # a frame of the short
        cover = clock.out(roteiro["capa"]) if "capa" in roteiro else 0
        ffmpeg("-ss", f"{cover:.3f}", "-i", str(out), "-frames:v", "1", "-q:v", "2",
               str(out.with_name(out.stem + " (capa).jpg")))
    print(out)


if __name__ == "__main__":
    main()
