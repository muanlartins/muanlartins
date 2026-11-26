"""Videos of a game's chapters cut from a live, published before its full VOD (Luan, 2026-11-22, on Celeste: "talvez
quebrar por capítulo pro youtube… só depois a live vem publicada"). For the games of content/diversos.json, what
partidas.py is for the ranked matches, and the same edit by the same code: the intro, whole, the stretch of the live,
whole, the outro, joined by the live's own transition. Nothing else is added (his rule of 2026-11-18).

    scripts/.venv/bin/python scripts/capitulos.py scripts/roteiros/capitulos/<date>-<nome>.json             # the plan
    scripts/.venv/bin/python scripts/capitulos.py scripts/roteiros/capitulos/<date>-<nome>.json --apply     # render
    scripts/.venv/bin/python scripts/capitulos.py scripts/roteiros/capitulos/<date>-<nome>.json --legendas  # captions

The roteiro holds what takes judgment, picked by Claude from the transcript and the frames, approved by Luan:

    {
      "data": "2026-11-22",
      "nome": "capitulo-1",                      # the files' names
      "capitulo": 1,                             # the game's chapter, said in the title
      "de": "26:24.2", "ate": "51:19.85",        # Live.mp4's seconds: both in a pause of his microphone
      "marcas": [["26:24.2", "Prólogo"], …],     # YouTube's chapters inside it, the first at "de"
      "titulo": "Achei o coração secreto",       # the hook; " | Celeste Capítulo 1 (corte da live)" is added
      "descricao": "…",                          # the description's first paragraph
      "publicar": "2026-11-23T15:00:00-03:00"    # when YouTube publishes it
    }

The plan stops on an edge that cuts his speech or a mark out of order. With --apply it writes
Videos\\Lives\\<date>\\Cortes\\<date> <nome>.mp4 and .srt (so videos.py --clean frees them as it does the matches') and, when it's
missing, the YouTube record content/videos/<date>-<nome>.json. Nothing is deleted.
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import partidas  # noqa: E402
from content import LIVES, ROOT, other_games  # noqa: E402
from partidas import INTRO, MARK, OUTRO, QUIET, clock, duration, level_at, seconds, stamp  # noqa: E402
from windows import cortes_dir  # noqa: E402
from youtube import SITE, srt  # noqa: E402

# The line each game's videos end their description with.
CREDITS = {"celeste": "Celeste é um jogo da Maddy Makes Games, com trilha de Lena Raine. Vídeo de fã, sem vínculo com a "
                      "equipe do jogo."}


def game_of(date, at=0.0):
    """The game of content/diversos.json the live was playing at `at` (a Live.mp4 second): the live's own, or the one
    its last chapter with a "game" before `at` switched to (11-24: Rocket League, then Celeste's chapter 4)."""
    live = json.loads((LIVES / f"{date}.json").read_text())
    game_id = live.get("game")
    for chapter in sorted(live.get("chapters", []), key=lambda c: seconds(c["at"])):
        if chapter.get("game") and seconds(chapter["at"]) <= at:
            game_id = chapter["game"]
    game = next((g for g in other_games() if g["id"] == game_id), None)
    if not game:
        sys.exit(f"A live de {date} não é de um jogo de content/diversos.json: pras partidas, partidas.py.")
    return game


def plan(roteiro):
    date, start, end = roteiro["data"], seconds(roteiro["de"]), seconds(roteiro["ate"])
    problems = []
    for name, t in (("de", start), ("ate", end)):
        if level_at(date, t) >= QUIET:
            near = [(a, b) for a, b in partidas.pauses(date) if a < t + 3 and b > t - 3]
            problems.append(f'"{name}" ({stamp(t)}) corta a fala. Pausas perto: '
                            + (", ".join(f"{stamp(a)}-{stamp(b)}" for a, b in near) or "nenhuma"))
    marks = [(seconds(t), name) for t, name in roteiro["marcas"]]
    if not marks or abs(marks[0][0] - start) > 0.01:
        problems.append('a primeira marca não está no "de"')
    if any(b <= a for (a, _), (b, _) in zip(marks, marks[1:])) or any(not start <= t < end for t, _ in marks):
        problems.append("marcas fora de ordem ou fora do trecho")
    # "partida" is what partidas.py's render and captions take for a stretch of the live.
    parts = [{"kind": "intro", "from": 0.0, "to": duration(INTRO)},
             {"kind": "partida", "from": start, "to": end},
             {"kind": "outro", "from": 0.0, "to": duration(OUTRO)}]
    intro, body = parts[0]["to"], end - start
    listed = [(0.0, "Intro"), *((intro + t - start, name) for t, name in marks), (intro + body, "Até a próxima")]
    total = intro + body + parts[2]["to"]
    for (t, name), (after, _) in zip(listed, [*listed[1:], (total, "")]):
        if after - t < 10:
            problems.append(f"capítulo com menos de 10 s: {name}")
    return parts, listed, total, problems


def title(roteiro, game):
    return f"{roteiro['titulo']} | {game['name']} Capítulo {roteiro['capitulo']} {MARK}"


def youtube_record(roteiro, game, listed):
    date, name = roteiro["data"], game["name"]
    low, tag = name.lower(), re.sub(r"[^0-9A-Za-z]", "", unicodedata.normalize("NFKD", name))
    lines = [roteiro["descricao"], "",
             f"Corte da live de {date[8:10]}/{date[5:7]}. Todas as lives: {SITE}/canal/lives",
             f"Minha meta no {name}, com o progresso: {SITE}/conteudo/diversos/{game['id']}",
             "Ao vivo na Twitch: https://www.twitch.tv/muanlartins",
             "A comunidade no Discord: https://discord.gg/q5qxT7Pw2E",
             "", *[f"{clock(t)} {label}" for t, label in listed]]
    if game["id"] in CREDITS:
        lines += ["", CREDITS[game["id"]]]
    lines += ["", f"#{tag} #Capítulo{roteiro['capitulo']} #PTBR"]
    tags = [low, f"{low} capítulo {roteiro['capitulo']}", f"{low} gameplay", f"{low} pt-br", f"{low} brasil",
            f"{low} português", "corte da live", "muanlartins"]
    return {"id": "", "title": title(roteiro, game), "description": "\n".join(lines), "tags": tags,
            "thumbnail": f"brand/youtube/thumbnails/{date}-{roteiro['nome']}.jpg",
            "playlist": f"{name}: cortes da live", "captions": f"Lives/{date}/Cortes/{date} {roteiro['nome']}.srt",
            **({"publish_at": roteiro["publicar"]} if roteiro.get("publicar") else {})}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("roteiro")
    parser.add_argument("--apply", action="store_true", help="render the video and write its captions")
    parser.add_argument("--legendas", action="store_true", help="only write the captions")
    args = parser.parse_args()
    roteiro = json.loads(Path(args.roteiro).read_text())
    date, nome = roteiro["data"], roteiro["nome"]
    game = game_of(date, seconds(roteiro["de"]))
    parts, listed, total, problems = plan(roteiro)
    start, end = parts[1]["from"], parts[1]["to"]
    heading = title(roteiro, game)
    print(f"{heading}  ({len(heading)} caracteres)")
    print(f"live {stamp(start)}–{stamp(end)}  mic {level_at(date, start):.0f}/{level_at(date, end):.0f} dB  "
          f"total {clock(total)}")
    for t, name in listed:
        print(f"{clock(t)} {name}")
    if problems:
        sys.exit("\n".join(f"! {p}" for p in problems))
    out = cortes_dir(date) / f"{date} {nome}.mp4"
    if not (args.apply or args.legendas):
        print(f"→ {out} (nada foi feito: rode com --apply)")
        return
    if args.apply:
        partidas.render(roteiro, parts, out)
        print(f"feito: {out} ({duration(out) / 60:.1f} min)")
    else:
        out.parent.mkdir(parents=True, exist_ok=True)
    lines = partidas.captions(roteiro, parts)
    out.with_suffix(".srt").write_text(srt(lines), encoding="utf-8")
    print(f"legendas: {len(lines)} falas")
    if args.apply:
        record = ROOT / "content" / "videos" / f"{date}-{nome}.json"
        if not record.exists():
            record.write_text(json.dumps(youtube_record(roteiro, game, listed), indent=2, ensure_ascii=False) + "\n")
            print(f"registro do YouTube: {record.relative_to(ROOT)} (id vazio até ele subir)")


if __name__ == "__main__":
    main()
