"""Luan's kills in a Valorant live, from the game's own recording: when his entries appear in the killfeed.

    scripts/.venv/bin/python scripts/valorant_kills.py 2026-11-09                    # the whole Jogo.mp4
    scripts/.venv/bin/python scripts/valorant_kills.py 2026-11-09 --de 40:00 --ate 50:00   # live time

Prints each kill in the live's time (the sound's clock: Live.mp4's tracks, the transcript's and the cortes'), grouped
by fight with his deaths beside them, and keeps them in ~/.cache/muanlartins/edicao/kills-<date>.json
({"kills": [...], "mortes": [...]}), with each frame's counts beside it (`--recontar` counts again from those, no
decoding). The Range's bots count too (warming up in the queue). On 11-09 it found 36 of his 37 kills.

His entries are the ones with "muanlartins" on the killer's side (left, in an entry with a yellow border; his name
at the right edge is his death): valorant-killfeed-nome.png, cut from one at 1080p (cut it again if his Riot name or
the HUD changes). Jogo.mp4 is decoded on the GPU by Windows' ffmpeg, 10 frames a second of the killfeed's corner,
four stretches at a time (~5 min for a two-hour live). The kill banner at the bottom centre doesn't work for this:
it changes with each kill of a round. Valorant's match details (valorant.py's API, the Riot Client signed in) have
every kill exactly, when they can be fetched.
"""
import argparse
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cortes import local, offset, parts, wall  # noqa: E402
from edicao import WORK  # noqa: E402
from windows import VIDEOS, to_windows  # noqa: E402

TEMPLATE = Path(__file__).resolve().parent / "valorant-killfeed-nome.png"
# The killfeed's corner at 1080p; the width even, or the GPU's frames come out sheared.
X, Y, CW, CH = 1400, 70, 516, 360
RATE = 10
VICTIM_X = 380  # his name ending right of this (in the crop) is on the victim's side


def clock(text):
    parts_ = [float(x) for x in text.split(":")]
    return sum(v * 60 ** i for i, v in enumerate(reversed(parts_)))


def hms(s):
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"


def scan(game, start, length, tpl):
    """[(jogo second, his kills on screen, his deaths on screen)] every 1/RATE s. Entries are right-aligned, killer on
    the left: his name ending well left of the corner's right edge is a kill of his (that entry has a yellow border),
    at the right edge (x ~343 of the crop) it's his death."""
    proc = subprocess.Popen(["ffmpeg.exe", "-v", "error", "-hwaccel", "cuda", "-ss", f"{start:.2f}", "-i", game,
                             "-t", f"{length:.2f}", "-vf", f"fps={RATE},crop={CW}:{CH}:{X}:{Y}", "-pix_fmt", "rgb24",
                             "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    out, i, size = [], 0, CW * CH * 3
    while (buf := proc.stdout.read(size)) and len(buf) == size:
        res = cv2.matchTemplate(np.frombuffer(buf, np.uint8).reshape(CH, CW, 3), tpl, cv2.TM_CCOEFF_NORMED)
        kills = deaths = 0
        while True:
            _, v, _, (x, y) = cv2.minMaxLoc(res)
            if v < 0.8:
                break
            if x + tpl.shape[1] < VICTIM_X:
                kills += 1
            else:
                deaths += 1
            res[max(0, y - 20):y + 20, :] = -1
        out.append((start + i / RATE, kills, deaths))
        i += 1
    proc.wait()
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("data")
    parser.add_argument("--de", help="from this live time (mm:ss or h:mm:ss)")
    parser.add_argument("--ate", help="up to this live time")
    parser.add_argument("--recontar", action="store_true", help="count again from the frames kept by the last scan")
    args = parser.parse_args()
    folder = VIDEOS / "Lives" / args.data
    live, game = next(folder.glob("* Live.mp4")), next(folder.glob("* Jogo.mp4"))
    table = parts(folder)
    tpl = cv2.cvtColor(cv2.imread(str(TEMPLATE)), cv2.COLOR_BGR2RGB)
    # Each part of Jogo.mp4 has its own offset from Live.mp4, measured by the game's sound at a few places in it
    # (the best match wins; menus and silence match nothing).
    shifts = []
    for p in table["Jogo"]:
        tries = []
        for f in (0.2, 0.4, 0.6, 0.8):
            t = local(table, "Live", wall(table, "Jogo", p["em"] + p["segundos"] * f))
            tries.append(offset(live, game, table, t))
        shift, corr = max(tries, key=lambda x: x[1])
        shifts.append((p["em"], p["em"] + p["segundos"], shift, corr))
        print(f"parte de {hms(p['em'])} no Jogo.mp4: jogo = live {shift:+.3f} s (corr {corr:.2f})")
    total = table["Jogo"][-1]["em"] + table["Jogo"][-1]["segundos"]

    def to_game(t):
        j = local(table, "Jogo", wall(table, "Live", t))
        return t + next((s for a, b, s, _ in shifts if a <= j < b), shifts[-1][2])
    first = max(0.0, to_game(clock(args.de))) if args.de else 0.0
    last = min(total, to_game(clock(args.ate))) if args.ate else total
    stretch = f"-{int(first)}-{int(last)}" if args.de or args.ate else ""
    frames = WORK / f"kills-{args.data}{stretch}-quadros.json"
    if args.recontar:
        rows = [tuple(r) for r in json.loads(frames.read_text())]
    else:
        step = (last - first) / 4
        with ThreadPoolExecutor(4) as pool:
            rows = sum(pool.map(lambda k: scan(to_windows(game), first + k * step, step, tpl), range(4)), [])
        rows.sort()
        if not rows:
            sys.exit("nada lido do Jogo.mp4 nesse trecho")
        frames.parent.mkdir(parents=True, exist_ok=True)
        frames.write_text(json.dumps(rows))  # so the counting can change without decoding the live again
    def onsets(column, hold):
        # An entry flickers while it slides in or out (the agent's icon covers part of his name): a median of 3
        # frames, then each count held for `hold` s, and every rise is one more. On 11-09 that found 36 of his 37
        # kills (hold 1 s; longer holds hide a kill that comes as another entry leaves) and slightly too many deaths.
        counts = np.array([r[column] for r in rows], np.float32)
        counts = np.median(np.lib.stride_tricks.sliding_window_view(np.pad(counts, 1, mode="edge"), 3), axis=1)
        w = int(hold * RATE)
        held = np.max(np.lib.stride_tricks.sliding_window_view(np.pad(counts, (w, 0), mode="edge"), w + 1), axis=1)
        found, prev = [], 0
        for (j, *_), v in zip(rows, held):
            for _ in range(int(max(0, v - prev))):
                shift = next((s for a, b, s, _ in shifts if a <= j < b), shifts[-1][2])
                found.append(round(j - shift, 2))
            prev = v
        return found
    kills, deaths = onsets(1, 1.0), onsets(2, 3.0)
    # A stretch (--de/--ate) gets its own files, so trying one never overwrites the whole live's.
    out = WORK / f"kills-{args.data}{stretch}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"kills": kills, "mortes": deaths}))
    groups = []
    for k in kills:
        if groups and k - groups[-1][-1] <= 20:
            groups[-1].append(k)
        else:
            groups.append([k])
    print(f"{len(kills)} kills, {len(deaths)} mortes (live time; a fight is kills under 20 s apart; the Range's bots"
          f" count too):")
    for g in groups:
        died = [d for d in deaths if g[0] - 10 <= d <= g[-1] + 3]
        print(f"  {len(g)}k  " + "  ".join(f"{hms(k)} ({k:.1f})" for k in g)
              + (f"   morreu {' '.join(f'{d:.1f}' for d in died)}" if died else ""))
    print(out)


if __name__ == "__main__":
    main()
