"""Videos of whole matches cut from a live, published before its full VOD (Luan, 2026-11-17: hold the VOD back three
days and post first three videos of about 20 minutes with two or three matches each, a cold open of the best moments,
the intro and the outro).

    scripts/.venv/bin/python scripts/partidas.py <date>                     # the day's matches: where, score, goals
    scripts/.venv/bin/python scripts/partidas.py scripts/roteiros/partidas/<date>-<nome>.json           # the plan
    scripts/.venv/bin/python scripts/partidas.py scripts/roteiros/partidas/<date>-<nome>.json --apply   # render it

The roteiro holds what takes judgment (which matches, which moments open the video), picked by Claude from the
transcript and the dock's events and approved by Luan; everything else is fixed here:

    {
      "data": "2026-11-17",
      "nome": "gata",                                    # the files' names
      "partidas": [7, 9, 10],                            # the live's matches, numbered as on the site, in order
      "capitulos": {"9": "A gata desligou o PC"},        # each match's chapter name (default "Partida N")
      "abertura": ["1:10:34-1:10:43", "1:16:06-1:16:20@camera"],   # the cold open's moments, Live.mp4 times;
                                                         # @camera zooms into his camera's box (a cat on it)
      "cartelas": {"1:10:24.512": "A gata desligou o PC"},  # a card where the recording jumps (a live restarted)
      "inicio": {"9": "1:08:58"},                        # a match's start, when the dock caught it late
      "fim": {"12": "1:35:20"}                           # a match's end, when the talk after it is worth keeping
    }

The video, in order:

1. **The cold open**: each moment of "abertura" played whole, its edges moved onto the nearest pause of his
   microphone (never in the middle of a sentence: Luan's rule since the 11-12 shorts), hard cuts, the last one
   flashing to white. "@camera" zooms 2.4× into the camera's box at the bottom left (`CAMERA`), for what only the
   camera shows: the stream's box is small.
2. **The intro**: its first sentence only (Videos\\Comentados\\Partes\\intro.mp4, 0 to `INTRO_END` s: "Sejam muito
   bem-vindos! Meu nome é Luan Martins e aqui nós estudamos os jogos."); the rest presents the commented videos.
3. **The matches**, whole, from Live.mp4 (the stream as it went out: game, camera, chat, the crowd): each from just
   before the dock saw it start (the scene switching to the game and the countdown) to his first pause after the
   scoreboard (the dock cuts to Conversa 6 s after the end, so his reaction on camera stays). The minutes between
   matches (queue, menus) go. A card covers a jump in the recording ("cartelas").
4. **The outro** (Partes\\outro-editado.mp4, by montagem.py): the Twitch and the site, room for the end screen.

Sound: Live.mp4's track 1 (everything: game, his voice, Discord; never the music, which is on track 5 only), each
part levelled to -14 LUFS like the intro and outro (loudnorm, as comentado.py). The recording itself is quiet: on
11-17 track 1 measured -41 LUFS with peaks at -17 dBFS, so one gain for the whole video would have meant +27 dB
and 10 dB of limiting on every explosion. Picture: 1080p60 as
recorded, NVENC on Windows. Writes Videos\\Partidas\\<date> <nome>.mp4 and prints the chapters (YouTube needs each
at least 10 s; the cold open and the intro share the first). With --apply it also writes the YouTube record,
content/videos/<date>-<nome>.json, when it's missing (never over one). Nothing is deleted.
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content import ROOT  # noqa: E402
from live import FFMPEG  # noqa: E402
from thumb import STEP, TIME_ZONE, font, in_file, loudness, pieces, recording  # noqa: E402
from windows import TEMP, VIDEOS, run, to_windows  # noqa: E402

OUT = VIDEOS / "Partidas"
PARTS = VIDEOS / "Comentados" / "Partes"
INTRO, OUTRO = PARTS / "intro.mp4", PARTS / "outro-editado.mp4"
INTRO_END = 4.45  # the intro's first sentence ends at 4.22 s; its pause runs 4.34–4.70 (whisper -ml 1, silencedetect)
ALL = 0  # Live.mp4's audio streams, from 0: 0 Tudo, 1 Microfone, 2 Jogo, 3 Discord
LEVEL = "loudnorm=I=-14:TP=-1.5:LRA=11"  # as the intro and outro (comentado.py's)
QUIET = -60.0  # dBFS: his microphone below this is a pause (NVIDIA Broadcast gates it to digital silence)
PAUSE = 0.5  # s: the shortest pause an edge may sit on
FLASH = 0.12  # s: the cold open's last frames fade to white
CARD = 2.5  # s: a card's length
FPS = 60
# The camera's box in the RL + chat scene, bottom left, with a margin: 800×450 from (0, 630) of the 1920×1080 stream.
CAMERA = "crop=800:450:0:630"
KLEIN_DARK, PAPER = (0, 22, 84), (244, 245, 247)

PLAYLIST = "Rocket League: partidas da live"
# Epic's Fan Content Policy (1.10) asks for this line on videos of its games that may carry ads.
EPIC = ("Portions of the materials used are trademarks and/or copyrighted works of Epic Games, Inc. All rights reserved "
        "by Epic. This material is not official and is not endorsed by Epic.")
TAGS = ["rocket league", "rocket league 3v3", "rocket league ranked", "rocket league ranqueada", "rocket league pt-br",
        "rocket league brasil", "rocket league gameplay", "3v3 ranqueado", "muanlartins"]


def seconds(text: str) -> float:
    """"1:10:34.5", "12:30" or "754.2"."""
    total = 0.0
    for part in str(text).split(":"):
        total = total * 60 + float(part)
    return total


def clock(t: float) -> str:
    t = int(t)
    return f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}" if t >= 3600 else f"{t // 60}:{t % 60:02d}"


def stamp(t: float) -> str:
    return f"{clock(t)}.{int(round(t % 1 * 10)) % 10}"


# --- The day's matches -------------------------------------------------------------------------------------

def session(date):
    files = sorted((ROOT / "content" / "matches").glob(f"{date}-*.json"))
    days = [f for f in files if not f.name.endswith(".events.json")]
    if len(days) != 1:
        sys.exit(f"Esperava uma sessão de {date} em content/matches/, achei {len(days)}.")
    record = json.loads(days[0].read_text())
    events_file = days[0].with_name(days[0].stem + ".events.json")
    events = {m["id"]: m["log"] for m in json.loads(events_file.read_text())["matches"]} if events_file.exists() else {}
    return record, events


def live_second(date, iso):
    """Live.mp4's second showing the dock's UTC time `iso`, or None if it wasn't recording then."""
    when = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(TIME_ZONE).replace(tzinfo=None)
    return in_file(date, "Live", when)


def goals(log):
    """[(t, who, km/h)] of a match's goals, without the ones its goal replays log again."""
    found, replaying = [], False
    for e in log:
        if e["type"] == "replay":
            replaying = True
        elif e["type"] == "replay-end":
            replaying = False
        elif e["type"] == "goal" and not replaying and e.get("kmh"):
            found.append((e["t"], e["by"], e["kmh"]))
    return found


def matches(date):
    """[{n, match, start, end, goals}] with start/end as Live.mp4 seconds."""
    record, events = session(date)
    out = []
    for n, m in enumerate(record["matches"], 1):
        out.append({"n": n, "match": m, "start": live_second(date, m["start"]), "end": live_second(date, m["at"]),
                    "goals": goals(events.get(m["id"], []))})
    return out


def result(m):
    word = {"win": "Vitória", "loss": "Derrota"}.get(m["result"], m["result"])
    return f"{word} {m['score'][0]}-{m['score'][1]}{' na prorrogação' if m.get('overtime') else ''}"


def overview(date):
    for p in matches(date):
        m = p["match"]
        where = f"{clock(p['start'])}–{clock(p['end'])} ({(p['end'] - p['start']) / 60:.1f} min)" \
            if p["start"] is not None and p["end"] is not None else "fora da gravação"
        scored = "; ".join(f"{clock(t)} {who} {kmh}" for t, who, kmh in p["goals"])
        print(f"{p['n']:2d}  {result(m):28}  {where:26}  {scored}")


# --- Edges on his pauses -----------------------------------------------------------------------------------

def pauses(date):
    """[(from, to)] Live.mp4 seconds where his microphone is quiet for PAUSE s or more."""
    quiet = loudness(date) < QUIET
    found, start = [], None
    for i, q in enumerate(np.append(quiet, False)):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if (i - start) * STEP >= PAUSE:
                found.append((start * STEP, i * STEP))
            start = None
    return found


def edge_in(gaps, target, lo, hi):
    """Where a part may start near `target`: just before he speaks again after a pause in [lo, hi]."""
    spots = [max(a + 0.1, b - 0.25) for a, b in gaps if a < hi and b > lo]
    spots = [min(max(s, lo), hi) for s in spots]
    return min(spots, key=lambda s: abs(s - target)) if spots else None


def edge_out(gaps, target, lo, hi, first=False):
    """Where a part may end near `target` (or at the first pause from `target` on): just after he stops talking."""
    spots = [min(b - 0.1, a + 0.3) for a, b in gaps if a < hi and b > lo]
    spots = [min(max(s, lo), hi) for s in spots]
    if first:
        later = [s for s in spots if s >= target]
        return min(later) if later else None
    return min(spots, key=lambda s: abs(s - target)) if spots else None


def level_at(date, t):
    """His microphone's loudness (dBFS) at an edge: the reading that holds it."""
    return float(loudness(date)[min(int(t / STEP), len(loudness(date)) - 1)])


# --- The plan ----------------------------------------------------------------------------------------------

def plan(roteiro):
    date = roteiro["data"]
    gaps = pauses(date)
    day = {p["n"]: p for p in matches(date)}
    parts, problems = [], []

    for k, text in enumerate(roteiro.get("abertura", [])):
        span, _, zoom = text.partition("@")
        a, b = (seconds(x) for x in span.split("-"))
        start = edge_in(gaps, a, a - 1.5, a + 1.0)
        end = edge_out(gaps, b, b - 1.0, b + 1.5)
        if start is None or end is None:
            problems.append(f"abertura {text}: sem pausa no microfone perto da {'entrada' if start is None else 'saída'}")
        parts.append({"kind": "abertura", "label": f"momento {k + 1}", "from": start or a, "to": end or b,
                      "camera": zoom == "camera"})

    parts.append({"kind": "intro", "label": "intro", "from": 0.0, "to": INTRO_END})

    cards = {seconds(t): text for t, text in roteiro.get("cartelas", {}).items()}
    for n in roteiro["partidas"]:
        p = day[n]
        start = seconds(roteiro["inicio"][str(n)]) if str(n) in roteiro.get("inicio", {}) else p["start"]
        if start is None or p["end"] is None:
            sys.exit(f"A partida {n} não está inteira no Live.mp4: diga o começo em \"inicio\".")
        a = edge_in(gaps, start - 1.5, start - 8, start + 3)
        if str(n) in roteiro.get("fim", {}):
            wanted = seconds(roteiro["fim"][str(n)])
            b = edge_out(gaps, wanted, wanted - 2, wanted + 2)
        else:
            b = edge_out(gaps, p["end"] + 7, p["end"] + 7, p["end"] + 30, first=True)
        if a is None:
            problems.append(f"partida {n}: sem pausa no microfone antes do começo; começa {stamp(start - 1.5)}")
        if b is None:
            problems.append(f"partida {n}: sem pausa no microfone depois do placar; acaba {stamp(p['end'] + 9)}")
        a, b = a if a is not None else start - 1.5, b if b is not None else p["end"] + 9
        title = roteiro.get("capitulos", {}).get(str(n), f"Partida {n}")
        # A card where the recording jumps splits the match in two.
        cuts = [t for t in sorted(cards) if a < t < b]
        edges = [a, *cuts, b]
        for i in range(len(edges) - 1):
            parts.append({"kind": "partida", "label": f"partida {n}", "n": n, "title": title if i == 0 else None,
                          "from": edges[i], "to": edges[i + 1], "result": result(p["match"])})
            if i < len(cuts):
                parts.append({"kind": "cartela", "label": "cartela", "text": cards[cuts[i]], "from": 0.0, "to": CARD})

    parts.append({"kind": "outro", "label": "outro", "from": 0.0, "to": duration(OUTRO)})
    return parts, problems


def duration(file):
    out = run(FFMPEG / "ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "json",
              to_windows(file), capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def chapters(roteiro, parts):
    """[(video second, title)]: the cold open and intro as one, each match, the outro."""
    out, at = [(0.0, roteiro.get("capitulo_abertura", "Os melhores momentos"))], 0.0
    for part in parts:
        if part["kind"] == "partida" and part.get("title"):
            out.append((at, part["title"]))
        if part["kind"] == "outro":
            out.append((at, "Até a próxima"))
        at += part["to"] - part["from"]
    return out, at


# --- Rendering ---------------------------------------------------------------------------------------------

def card_image(text, path):
    """A card for a jump in the recording: the screen gone dark, as it did, and what happened."""
    image = Image.new("RGB", (1920, 1080), (4, 6, 14))
    draw = ImageDraw.Draw(image)
    big = font(96)
    box = draw.textbbox((0, 0), text, font=big)
    draw.text(((1920 - (box[2] - box[0])) / 2, (1080 - (box[3] - box[1])) / 2 - box[1]), text, font=big, fill=PAPER)
    image.save(path)


def render(roteiro, parts, out):
    date = roteiro["data"]
    live = recording(date, "Live")
    args, graph, labels = [], [], []
    video = f"fps={FPS},scale=1920:1080,setsar=1,format=yuv420p"
    audio = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
    last_open = max((i for i, p in enumerate(parts) if p["kind"] == "abertura"), default=None)
    n = 0
    for i, p in enumerate(parts):
        length = p["to"] - p["from"]
        fades = f"afade=t=in:d=0.03,afade=t=out:st={length - 0.03:.3f}:d=0.03"
        if p["kind"] in ("abertura", "partida"):
            args += ["-ss", f"{p['from']:.3f}", "-t", f"{length:.3f}", "-i", to_windows(live)]
            v = f"[{n}:v]setpts=PTS-STARTPTS,{CAMERA + ',' if p.get('camera') else ''}{video}"
            if i == last_open:
                v += f",fade=t=out:st={length - FLASH:.3f}:d={FLASH}:color=white"
            graph.append(f"{v}[v{i}]")
            graph.append(f"[{n}:a:{ALL}]asetpts=PTS-STARTPTS,{audio},{LEVEL},{fades}[a{i}]")
            n += 1
        elif p["kind"] in ("intro", "outro"):
            source = INTRO if p["kind"] == "intro" else OUTRO
            args += ["-t", f"{length:.3f}", "-i", to_windows(source)]
            graph.append(f"[{n}:v]setpts=PTS-STARTPTS,{video}[v{i}]")
            fade = f",afade=t=out:st={length - 0.12:.3f}:d=0.12" if p["kind"] == "intro" else ""
            graph.append(f"[{n}:a]asetpts=PTS-STARTPTS,{audio}{fade}[a{i}]")
            n += 1
        else:  # a card: a still and silence
            picture = TEMP / f"partidas-cartela-{i}.png"
            card_image(p["text"], picture)
            args += ["-loop", "1", "-framerate", str(FPS), "-t", f"{length:.3f}", "-i", to_windows(picture),
                     "-f", "lavfi", "-t", f"{length:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            graph.append(f"[{n}:v]{video},fade=t=in:d=0.15,fade=t=out:st={length - 0.2:.3f}:d=0.2[v{i}]")
            graph.append(f"[{n + 1}:a]{audio}[a{i}]")
            n += 2
        labels.append(f"[v{i}][a{i}]")
    graph.append(f"{''.join(labels)}concat=n={len(parts)}:v=1:a=1[v][c]")
    graph.append("[c]alimiter=limit=0.89:level=false[a]")  # a last guard for the peaks (-1 dBTP)
    script = TEMP / "partidas-grafo.txt"
    script.write_text(";\n".join(graph), encoding="utf-8")
    OUT.mkdir(exist_ok=True)
    temp = out.with_name(out.stem + " (renderizando).mp4")
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-stats", "-y", *args,
        "-/filter_complex", to_windows(script), "-map", "[v]", "-map", "[a]",
        "-c:v", "h264_nvenc", "-preset", "p5", "-tune", "hq", "-rc", "vbr", "-cq", "21", "-b:v", "0",
        "-maxrate", "40M", "-bufsize", "80M", "-profile:v", "high", "-g", "120", "-bf", "3", "-spatial-aq", "1",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", to_windows(temp))
    temp.replace(out)


def youtube_record(roteiro, marks, path):
    """A first YouTube record for youtube.py video (the id comes after Luan uploads it)."""
    date = roteiro["data"]
    day = f"{date[8:10]}/{date[5:7]}"
    lines = [roteiro.get("descricao", ""), "",
             f"Partidas inteiras da live de {day}. Todas as lives: https://muanlartins.com.br/canal/lives",
             "Minhas ranqueadas: https://muanlartins.com.br/conteudo/rocket-league/ranked",
             "Ao vivo na Twitch: https://www.twitch.tv/muanlartins", "", *[f"{clock(t)} {name}" for t, name in marks],
             "", EPIC, "", "#RocketLeague #RocketLeagueBrasil #3v3"]
    record = {"id": "", "title": roteiro.get("titulo", ""), "description": "\n".join(lines).strip(), "tags": TAGS,
              "thumbnail": f"brand/youtube/thumbnails/{date}-{roteiro['nome']}.jpg", "playlist": PLAYLIST,
              **({"publish_at": roteiro["publicar"]} if roteiro.get("publicar") else {})}
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("what", help="a date (YYYY-MM-DD: its matches) or a roteiro (.json)")
    parser.add_argument("--apply", action="store_true", help="render the video")
    args = parser.parse_args()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.what):
        overview(args.what)
        return
    roteiro = json.loads(Path(args.what).read_text())
    parts, problems = plan(roteiro)
    for p in parts:
        length = p["to"] - p["from"]
        if p["kind"] in ("abertura", "partida"):
            edges = f"{stamp(p['from'])}–{stamp(p['to'])}  mic {level_at(roteiro['data'], p['from']):5.0f}/" \
                    f"{level_at(roteiro['data'], p['to']):4.0f} dB"
            extra = f"  {p['result']}" if p.get("title") else ""
            print(f"{p['label']:12} {length:7.1f} s  {edges}{extra}")
        else:
            print(f"{p['label']:12} {length:7.1f} s  {p.get('text', '')}")
    marks, total = chapters(roteiro, parts)
    print(f"\ntotal {clock(total)}\n\nCapítulos:")
    for t, name in marks:
        print(f"{clock(t)} {name}")
    short = [name for (t, name), (u, _) in zip(marks, [*marks[1:], (total, "")]) if u - t < 10]
    for problem in problems + [f"capítulo com menos de 10 s: {name}" for name in short]:
        print(f"! {problem}")
    out = OUT / f"{roteiro['data']} {roteiro['nome']}.mp4"
    if not args.apply:
        print(f"\n→ Videos\\Partidas\\{out.name} (nada foi feito: rode com --apply)")
        return
    render(roteiro, parts, out)
    print(f"feito: Videos\\Partidas\\{out.name} ({duration(out) / 60:.1f} min)")
    record = ROOT / "content" / "videos" / f"{roteiro['data']}-{roteiro['nome']}.json"
    if not record.exists():
        youtube_record(roteiro, marks, record)
        print(f"registro do YouTube: {record.relative_to(ROOT)} (id vazio até ele subir)")


if __name__ == "__main__":
    main()
