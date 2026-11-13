"""A live's markers for its highlights, in Live.mp4's seconds (the transcript's clock): where to look before the
candidates reel.

    scripts/.venv/bin/python scripts/momentos.py 2026-11-12
    scripts/.venv/bin/python scripts/momentos.py 2026-11-12 --eventos ../muanlartins-live/content/matches/2026-11-12-1437.events.json \
        --falas ../muanlartins-live/content/lives/2026-11-12.transcript.json

Prints, in order:
- OBS's own log: the scene changes that are moments (Terapia, Lance ruim, VAR, Conversa, Fim) and each VAR save
  (the replay buffer: Luan asked for a review there, his "chama o VAR"). The VAR's clips are also loose files in
  `Videos\\Lives\\<date>\\VAR`.
- Rocket League: every goal (ours or theirs, overtime, aerial, long, backwards, hat trick), his demolitions and epic
  saves, each match's end, from the dock's events (`content/matches/<date>-*.events.json`; pass `--eventos` when the
  file is only on another branch or worktree). Valorant has no such file: `valorant_kills.py <date>` gives his kills.
- The transcript's lines with a reaction or a bit (`REACOES`): his "meu deus", "golaço", the VAR and the Terapia, the
  camera filters' words (bang, flecha, drone, octane, fennec, "cara de").

Everything else stays judgment: the candidates come from reading these with the transcript, then a sheet of frames
at the chosen seconds, then `candidatos.py <date> lista.json`.
"""
import argparse
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cortes import local, parts  # noqa: E402
from windows import VIDEOS, home  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OBS_LOGS = home() / "AppData" / "Roaming" / "obs-studio" / "logs"
CENAS = ("Terapia", "Lance ruim", "VAR", "Conversa", "Fim")
GOAL_FLAGS = ("OvertimeGoal", "AerialGoal", "LongGoal", "BackwardsGoal", "HatTrick", "BicycleGoal", "TurtleGoal")
REACOES = re.compile(
    r"meu deus|nossa senhora|que isso|o que é isso|golaço|pelo chute|que chute|que jogada|que passe|caralho|"
    r"puta que|var\b|terapia|veredito|demoli|explod|flip|bang|flecha|drone|coruja|ult\b|octane|fenec|fennec|cara de|"
    r"filtro|câmera|perdão|desculpa|pior .* da história|humilha|ridículo|vergonh|craque|conseguimos|subimos|"
    r"diamante|prata|bronze|ouro\b|vitória|derrota", re.I)


def mmss(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:04.1f}" if t >= 3600 else f"{int(t // 60)}:{t % 60:04.1f}"


def obs_markers(date, table, total):
    """[(live second, text)] from OBS's logs of the day (and the one before, for a log opened before midnight)."""
    day = datetime.fromisoformat(date)
    first = datetime.fromisoformat(table["Live"][0]["inicio"]).timestamp()
    found = []
    for log in sorted(OBS_LOGS.glob("*.txt")):
        try:
            opened = datetime.strptime(log.stem, "%Y-%m-%d %H-%M-%S")
        except ValueError:
            continue
        if not timedelta(days=-1) <= opened - day <= timedelta(days=1):
            continue
        clock, last = opened, None
        for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"(\d\d):(\d\d):(\d\d)\.(\d{3}): (.*)", line)
            if not m:
                continue
            h, mi, s, ms, text = int(m[1]), int(m[2]), int(m[3]), int(m[4]), m[5]
            at = clock.replace(hour=h, minute=mi, second=s, microsecond=ms * 1000)
            if last and at < last:  # past midnight
                clock += timedelta(days=1)
                at += timedelta(days=1)
            last = at
            if (scene := re.match(r"User switched to scene '(.*)'", text)) and scene[1].startswith(CENAS):
                what = f"cena {scene[1]}"
            elif "Wrote replay buffer" in text:
                what = "VAR salvo (" + text.rsplit("Replay ", 1)[-1].rstrip("'") + ")"
            else:
                continue
            if at.timestamp() < first:
                continue
            t = local(table, "Live", at.timestamp())
            if t <= total:
                found.append((t, what))
    return sorted(set(found))


def rl_markers(path, table, total):
    """[(live second, text)] from the dock's events: goals, his demos and epic saves, each match's end."""
    found = []
    for n, match in enumerate(json.loads(path.read_text())["matches"], 1):
        start = datetime.fromisoformat(match["start"].replace("Z", "+00:00")).timestamp()
        flags = {}
        for e in match["log"]:
            if e["type"] == "stat" and e.get("name") in GOAL_FLAGS:
                flags.setdefault(round(e["t"], 1), []).append(e["name"].replace("Goal", "").lower() or e["name"])
        won = any(e["type"] == "stat" and e.get("name") == "Win" and e.get("by") == "me" for e in match["log"])
        for e in match["log"]:
            t = local(table, "Live", start + e["t"])
            if not 0 <= t <= total:
                continue
            who = e.get("by", "")
            if e["type"] == "stat" and e.get("name") == "Goal":
                side = "ELE" if who == "me" else "time" if who.startswith("mate") else "adversário"
                extra = flags.get(round(e["t"], 1), [])
                found.append((t, f"P{n:02d} gol {side} ({who})" + (f" [{', '.join(extra)}]" if extra else "")))
            elif e["type"] == "stat" and who == "me" and e.get("name") in ("Demolish", "EpicSave"):
                found.append((t, f"P{n:02d} {'demolição dele' if e['name'] == 'Demolish' else 'defesa épica dele'}"))
            elif e["type"] == "end":
                found.append((t, f"P{n:02d} fim: {'VITÓRIA' if won else 'derrota'}"))
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("data")
    parser.add_argument("--eventos", type=Path, help="the dock's events file, when it isn't in content/matches here")
    parser.add_argument("--falas", type=Path, help="the transcript, when it isn't in content/lives here")
    parser.add_argument("--sem-falas", action="store_true", help="leave the transcript out")
    args = parser.parse_args()
    folder = VIDEOS / "Lives" / args.data
    table = parts(folder)
    total = sum(p["segundos"] for p in table["Live"])
    rows = [(t, "OBS", x) for t, x in obs_markers(args.data, table, total)]
    events = [args.eventos] if args.eventos else sorted((ROOT / "content" / "matches").glob(f"{args.data}-*.events.json"))
    for path in events:
        rows += [(t, "RL", x) for t, x in rl_markers(path, table, total)]
    transcript = args.falas or ROOT / "content" / "lives" / f"{args.data}.transcript.json"
    if not args.sem_falas:
        if transcript.exists():
            rows += [(float(t), "fala", x) for t, x in json.loads(transcript.read_text()) if REACOES.search(x)]
        else:
            print(f"(sem {transcript}: rode live.py antes, ou passe --falas com a do worktree do pós-live)")
    for t, kind, text in sorted(rows):
        print(f"{mmss(t):>10}  {t:7.1f}  {kind:4}  {text}")


if __name__ == "__main__":
    main()
