"""Videos of whole matches cut from a live, published before its full VOD (Luan, 2026-11-17: hold the VOD back and
post first three videos of about 20 minutes with three matches each, the intro and the outro).

    scripts/.venv/bin/python scripts/partidas.py <date>                     # the day's matches: where, score, goals
    scripts/.venv/bin/python scripts/partidas.py scripts/roteiros/partidas/<date>-<nome>.json           # the plan
    scripts/.venv/bin/python scripts/partidas.py scripts/roteiros/partidas/<date>-<nome>.json --apply   # render it
    scripts/.venv/bin/python scripts/partidas.py scripts/roteiros/partidas/<date>-<nome>.json --legendas  # captions only

The roteiro holds what takes judgment (which matches, their chapter names), picked by Claude from the transcript and
the dock's events and approved by Luan; everything else is fixed here:

    {
      "data": "2026-11-17",
      "nome": "gata",                                    # the files' names
      "partidas": [8, 9, 10],                            # the live's matches, numbered as on the site, in order
      "capitulos": {"9": "A gata desligou o PC"},        # each match's chapter name (default "Partida N")
      "inicio": {"9": "1:08:52"},                        # a match's start, when the dock caught it late
      "fim": {"10": "1:21:18"},                          # a match's end, when the talk after it is worth keeping
      "saltos": ["1:10:24.512"]                          # where the recording jumps (OBS or the PC went down)
    }

The video is the intro, the matches and the outro, each joined to the next by **the live's own transition**
(transicao.webm, the stinger OBS plays between scenes: 1.32 s, the screen covered at 0.6 s), so it looks like the
stream changing scene. Nothing else is added: no cold open, no cards, no zooms. Luan, 2026-11-18, on the first
version (a montage of best moments, the intro's first sentence only, hard cuts, a card where the PC went down):
"os cortes ficaram HORRÍVEIS… até a intro sofreu e ficou cortada"; he asked for the matches with the intro and the
outro, and a transition like the live's between them.

1. **The intro**, whole (Videos\\Comentados\\Partes\\intro.mp4).
2. **The matches**, whole, from Live.mp4 (the stream as it went out: game, camera, chat, the crowd). Each starts just
   after the stinger the recording itself has when the dock switched to the game (found by the Klein covering the
   screen, 4 to 10 s before the dock's start), at a pause of his microphone, so the countdown and the kickoff are
   there and no sentence is cut (his rule since the 11-12 shorts); without one, at a pause just before the dock's
   start. Each ends at his first pause at least `CONVERSA` s after the dock's cut to Conversa (5.5 s after the end,
   with the stinger), so his reaction on camera stays and two stingers never come back to back. A jump in the recording ("saltos") ends the first piece at its last real frame and gets the
   transition too.
3. **The outro** (Partes\\outro-editado.mp4, by montagem.py): the Twitch and the site, room for the end screen.

Sound: Live.mp4's track 1 (everything: game, his voice, Discord; never the music, which is on track 5 only), each
part levelled to -14 LUFS like the intro and outro (loudnorm, as comentado.py). The recording itself is quiet: on
11-17 track 1 measured -41 LUFS with peaks at -17 dBFS, so one gain for the whole video would have meant +27 dB
and 10 dB of limiting on every explosion. Picture: 1080p60 as recorded, NVENC on Windows. Writes
Videos\\Partidas\\<date> <nome>.mp4 and prints the chapters (YouTube needs each at least 10 s). With --apply it also
writes the YouTube record, content/videos/<date>-<nome>.json, when it's missing (never over one), and the captions
beside the video, <date> <nome>.srt (the live's transcript inside each match's piece, and the intro's and outro's
words; out of the repository, since they have the other players' names as said), which youtube.py video uploads as
the lives' are. Nothing is deleted.
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content import LIVES, ROOT  # noqa: E402
from live import FFMPEG  # noqa: E402
from youtube import srt  # noqa: E402
from thumb import STEP, TIME_ZONE, in_file, loudness, recording  # noqa: E402
from windows import TEMP, VIDEOS, home, run, to_windows  # noqa: E402

OUT = VIDEOS / "Partidas"
PARTS = VIDEOS / "Comentados" / "Partes"
INTRO, OUTRO = PARTS / "intro.mp4", PARTS / "outro-editado.mp4"
# The live's stinger (brand/twitch/obs.py: transition_point 600 ms), VP9 with transparency at 2560×1440.
STINGER = home() / "Documents" / "muanlartins-obs" / "transicao.webm"
STINGER_POINT = 0.6  # s: where it covers the screen, so where the cut goes under it
ALL = 0  # Live.mp4's audio streams, from 0: 0 Tudo, 1 Microfone, 2 Jogo, 3 Discord
LEVEL = "loudnorm=I=-14:TP=-1.5:LRA=11"  # as the intro and outro (comentado.py's)
QUIET = -60.0  # dBFS: his microphone below this is a pause (NVIDIA Broadcast gates it to digital silence)
PAUSE = 0.5  # s: the shortest pause an edge may sit on
KLEIN = (0, 47, 167)  # the stinger's colour: covered = 95% of the frame within this of it (Conversa is ~80%)
FPS = 60
CONVERSA = 3.0  # s: the least of Conversa kept after a match, between the recording's stinger and the join's

# What the intro and the outro say, in their own seconds: the intro's from whisper on the first commented video, placed
# by the intro's own pauses (speech starts at 0.3 s); the outro's as montagem.py has them (outro-editado is outro.mp4's
# first 10.64 s).
INTRO_WORDS = [(0.3, 1.4, "Sejam muito bem-vindos!"),
               (1.54, 4.22, "Meu nome é Luan Martins e aqui nós estudamos os jogos."),
               (4.68, 7.64, "O que você vai ver são análises das minhas próprias partidas"),
               (7.64, 9.36, "em busca de evoluir a minha gameplay."),
               (10.4, 12.54, "Papel e caneta na mão e bons estudos!")]
OUTRO_WORDS = [(0.34, 0.78, "Curtiu?"),
               (0.78, 4.80, "Eu faço live na Twitch com um monte de tecnologia que você nunca viu igual."),
               (5.34, 6.22, "Dá uma conferida lá."),
               (6.78, 8.98, "Acessa meu site também que tem tudo organizadinho."),
               (9.42, 10.04, "Vou estar te esperando.")]

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


# --- Edges: his pauses, the recording's stingers, its jumps ------------------------------------------------

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


def edge_out(gaps, target, lo, hi):
    """Where a part may end: just after he stops talking, at the first pause from `target` on in [lo, hi]."""
    spots = [min(b - 0.1, a + 0.3) for a, b in gaps if a < hi and b > lo]
    spots = [s for s in (min(max(s, lo), hi) for s in spots) if s >= target]
    return min(spots) if spots else None


def level_at(date, t):
    """His microphone's loudness (dBFS) at an edge: the reading that holds it."""
    levels = loudness(date)
    return float(levels[min(int(t / STEP), len(levels) - 1)])


def stinger_end(live, a, b):
    """When the recording's own stinger (the scene changing to the game) has uncovered the screen, if one plays in
    Live.mp4's [a, b]: the last frame covered by Klein, plus what's left of the stinger."""
    raw = run(FFMPEG / "ffmpeg.exe", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", to_windows(live),
              "-vf", "fps=10,scale=64:36", "-f", "rawvideo", "-pix_fmt", "rgb24", "-", capture_output=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, 36, 64, 3).astype(int)
    covered = (np.abs(frames - np.array(KLEIN)).sum(axis=3) < 90).mean(axis=(1, 2)) >= 0.95
    hits = np.flatnonzero(covered)
    return a + hits[-1] / 10 + 0.5 if len(hits) else None


def last_frame(live, jump):
    """The end of the last real frame before a jump in the recording (the piece before a restart often stops a second
    early: 11-17's last frame came 0.97 s before the join)."""
    out = subprocess.run([str(FFMPEG / "ffprobe.exe"), "-v", "error", "-select_streams", "v", "-read_intervals",
                          f"{jump - 3:.3f}%{jump + 0.2:.3f}", "-show_entries", "frame=pts_time", "-of", "csv=p=0",
                          to_windows(live)], capture_output=True, text=True, check=True, cwd="/mnt/c").stdout
    times = [float(t) for t in out.split() if t.strip() and float(t) < jump - 0.001]
    return (max(times) + 1 / FPS) if times else jump


# --- The plan ----------------------------------------------------------------------------------------------

def plan(roteiro):
    date = roteiro["data"]
    live = recording(date, "Live")
    gaps = pauses(date)
    day = {p["n"]: p for p in matches(date)}
    parts, problems = [{"kind": "intro", "label": "intro", "from": 0.0, "to": duration(INTRO)}], []
    jumps = [seconds(t) for t in roteiro.get("saltos", [])]
    for n in roteiro["partidas"]:
        p = day[n]
        start = seconds(roteiro["inicio"][str(n)]) if str(n) in roteiro.get("inicio", {}) else p["start"]
        if start is None or p["end"] is None:
            sys.exit(f"A partida {n} não está inteira no Live.mp4: diga o começo em \"inicio\".")
        shown = stinger_end(live, start - 15, start + 3)
        if shown is not None:
            a = edge_in(gaps, shown, shown, max(start + 3, shown + 6))
        else:
            a = edge_in(gaps, start - 1.5, start - 8, start + 3)
        if str(n) in roteiro.get("fim", {}):
            wanted = seconds(roteiro["fim"][str(n)])
            b = edge_out(gaps, wanted - 2, wanted - 2, wanted + 2)
        else:
            # The dock cuts to Conversa ~5.5 s after the end, with the stinger: his reaction on camera stays, at least
            # CONVERSA s of it, so that stinger and the next one (the join's) never come back to back.
            conversa = stinger_end(live, p["end"] + 2, p["end"] + 12) or p["end"] + 7
            b = edge_out(gaps, conversa + CONVERSA, conversa + CONVERSA, conversa + 30)
        if a is None:
            problems.append(f"partida {n}: sem pausa no microfone no começo; começa {stamp(shown or start - 1.5)}")
            a = shown or start - 1.5
        if b is None:
            problems.append(f"partida {n}: sem pausa no microfone depois do placar; acaba {stamp(p['end'] + 9)}")
            b = p["end"] + 9
        title = roteiro.get("capitulos", {}).get(str(n), f"Partida {n}")
        cuts = [t for t in sorted(jumps) if a < t < b]
        edges = [a, *cuts, b]
        for i in range(len(edges) - 1):
            end = last_frame(live, edges[i + 1]) if i < len(cuts) else edges[i + 1]
            parts.append({"kind": "partida", "label": f"partida {n}", "n": n, "title": title if i == 0 else None,
                          "from": edges[i], "to": end, "result": result(p["match"])})
    parts.append({"kind": "outro", "label": "outro", "from": 0.0, "to": duration(OUTRO)})
    return parts, problems


def duration(file):
    out = run(FFMPEG / "ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "json",
              to_windows(file), capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def chapters(roteiro, parts):
    """[(video second, title)]: the intro, each match, the outro."""
    out, at = [], 0.0
    for part in parts:
        if part["kind"] == "intro":
            out.append((at, "Intro"))
        elif part["kind"] == "partida" and part.get("title"):
            out.append((at, part["title"]))
        elif part["kind"] == "outro":
            out.append((at, "Até a próxima"))
        at += part["to"] - part["from"]
    return out, at


def captions(roteiro, parts):
    """[start, text, end] in the video's seconds: the intro's and outro's words, and the live's transcript
    (content/lives/<date>.transcript.json, in Live.mp4's seconds) inside each match's piece."""
    said = json.loads((LIVES / f"{roteiro['data']}.transcript.json").read_text())
    lines, at = [], 0.0
    for p in parts:
        length = p["to"] - p["from"]
        if p["kind"] == "partida":
            # The transcript's lines start on whole seconds (cut down), so up to a second early: one that starts half
            # a second before the piece is its first, and one starting in its last half second belongs to the next.
            words = [(max(t - p["from"], 0.0), None, text) for t, text in said if p["from"] - 0.5 <= t < p["to"] - 0.5]
        else:
            words = INTRO_WORDS if p["kind"] == "intro" else OUTRO_WORDS
        for i, (start, end, text) in enumerate(words):
            following = words[i + 1][0] if i + 1 < len(words) else length
            lines.append([round(at + start, 2), text, round(at + min(end or start + 6, following, length), 2)])
        at += length
    return lines


# --- Rendering ---------------------------------------------------------------------------------------------

def render(roteiro, parts, out):
    live = recording(roteiro["data"], "Live")
    args, graph, labels = [], [], []
    video = f"fps={FPS},scale=1920:1080,setsar=1,format=yuv420p"
    audio = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
    n = 0  # the next input's index
    for i, p in enumerate(parts):
        length = p["to"] - p["from"]
        # Every part exactly `length` long, picture and sound alike: concat waits for a part's longer stream, and a few
        # milliseconds over in each part would add up and pull the transitions off their cuts.
        fit_v = f"trim=duration={length:.3f}"
        fit_a = f"apad,atrim=duration={length:.3f},afade=t=in:d=0.03,afade=t=out:st={length - 0.03:.3f}:d=0.03"
        if p["kind"] == "partida":
            args += ["-ss", f"{p['from']:.3f}", "-t", f"{length:.3f}", "-i", to_windows(live)]
            graph.append(f"[{n}:v]setpts=PTS-STARTPTS,{video},{fit_v}[v{i}]")
            graph.append(f"[{n}:a:{ALL}]asetpts=PTS-STARTPTS,{audio},{LEVEL},{fit_a}[a{i}]")
        else:
            source = INTRO if p["kind"] == "intro" else OUTRO
            args += ["-t", f"{length:.3f}", "-i", to_windows(source)]
            graph.append(f"[{n}:v]setpts=PTS-STARTPTS,{video},{fit_v}[v{i}]")
            graph.append(f"[{n}:a]asetpts=PTS-STARTPTS,{audio},{fit_a}[a{i}]")
        n += 1
        # The live's stinger over each join, in two halves anchored to the parts on either side: the first covers this
        # part's last STINGER_POINT s, the rest uncovers the next part's start.
        label = f"v{i}"
        if i > 0:
            args += ["-c:v", "libvpx-vp9", "-ss", f"{STINGER_POINT}", "-i", to_windows(STINGER)]
            graph.append(f"[{n}:v]scale=1920:1080,format=yuva420p,setpts=PTS-STARTPTS[si{i}]")
            graph.append(f"[{label}][si{i}]overlay=eof_action=pass[v{i}i]")
            label, n = f"v{i}i", n + 1
        if i < len(parts) - 1:
            start = length - STINGER_POINT
            args += ["-c:v", "libvpx-vp9", "-t", f"{STINGER_POINT}", "-i", to_windows(STINGER)]
            graph.append(f"[{n}:v]scale=1920:1080,format=yuva420p,setpts=PTS-STARTPTS+{start:.3f}/TB[so{i}]")
            graph.append(f"[{label}][so{i}]overlay=eof_action=pass:enable='gte(t,{start:.3f})'[v{i}o]")
            label, n = f"v{i}o", n + 1
        labels.append(f"[{label}][a{i}]")
    graph.append(f"{''.join(labels)}concat=n={len(parts)}:v=1:a=1[c0][c]")
    graph.append("[c0]format=yuv420p[v]")
    graph.append("[c]alimiter=limit=0.89:level=false[a]")  # a last guard for the peaks (-1 dBTP)
    script = TEMP / "partidas-grafo.txt"
    script.write_text(";\n".join(graph), encoding="utf-8")
    OUT.mkdir(exist_ok=True)
    temp = out.with_name(out.stem + " (renderizando).mp4")
    run(FFMPEG / "ffmpeg.exe", "-hide_banner", "-loglevel", "error", "-stats", "-y", *args,
        "-/filter_complex", to_windows(script), "-map", "[v]", "-map", "[a]",
        "-c:v", "h264_nvenc", "-preset", "p5", "-tune", "hq", "-rc", "vbr", "-cq", "22", "-b:v", "0",
        "-maxrate", "30M", "-bufsize", "60M", "-profile:v", "high", "-g", "120", "-bf", "3", "-spatial-aq", "1",
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
              "captions": f"Partidas/{date} {roteiro['nome']}.srt",
              **({"publish_at": roteiro["publicar"]} if roteiro.get("publicar") else {})}
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("what", help="a date (YYYY-MM-DD: its matches) or a roteiro (.json)")
    parser.add_argument("--apply", action="store_true", help="render the video (and write its captions)")
    parser.add_argument("--legendas", action="store_true", help="only write the captions of a video already made")
    args = parser.parse_args()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.what):
        overview(args.what)
        return
    roteiro = json.loads(Path(args.what).read_text())
    parts, problems = plan(roteiro)
    for p in parts:
        length = p["to"] - p["from"]
        if p["kind"] == "partida":
            edges = f"{stamp(p['from'])}–{stamp(p['to'])}  mic {level_at(roteiro['data'], p['from']):5.0f}/" \
                    f"{level_at(roteiro['data'], p['to']):4.0f} dB"
            extra = f"  {p['result']}" if p.get("title") else ""
            print(f"{p['label']:12} {length:7.1f} s  {edges}{extra}")
        else:
            print(f"{p['label']:12} {length:7.1f} s")
    marks, total = chapters(roteiro, parts)
    print(f"\ntotal {clock(total)} ({len(parts) - 1} transições)\n\nCapítulos:")
    for t, name in marks:
        print(f"{clock(t)} {name}")
    short = [name for (t, name), (u, _) in zip(marks, [*marks[1:], (total, "")]) if u - t < 10]
    for problem in problems + [f"capítulo com menos de 10 s: {name}" for name in short]:
        print(f"! {problem}")
    out = OUT / f"{roteiro['data']} {roteiro['nome']}.mp4"
    subtitles = out.with_suffix(".srt")
    if args.legendas:
        lines = captions(roteiro, parts)
        subtitles.write_text(srt(lines), encoding="utf-8")
        print(f"\nlegendas: Videos\\Partidas\\{subtitles.name} ({len(lines)} falas)")
        return
    if not args.apply:
        print(f"\n→ Videos\\Partidas\\{out.name} (nada foi feito: rode com --apply)")
        return
    render(roteiro, parts, out)
    print(f"feito: Videos\\Partidas\\{out.name} ({duration(out) / 60:.1f} min)")
    subtitles.write_text(srt(captions(roteiro, parts)), encoding="utf-8")
    print(f"legendas: Videos\\Partidas\\{subtitles.name}")
    record = ROOT / "content" / "videos" / f"{roteiro['data']}-{roteiro['nome']}.json"
    if not record.exists():
        youtube_record(roteiro, marks, record)
        print(f"registro do YouTube: {record.relative_to(ROOT)} (id vazio até ele subir)")


if __name__ == "__main__":
    main()
