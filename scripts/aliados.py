"""Who played with Luan in a live's Rocket League matches, read from the day's replays, and the viewers among them
named on the site.

    scripts/.venv/bin/python scripts/aliados.py <date>                          # who played with him, match by match
    scripts/.venv/bin/python scripts/aliados.py <date> --apply                  # tag the known viewers in the session
    scripts/.venv/bin/python scripts/aliados.py <date> --aliado "<in-game name>=<twitch login>" --apply   # a new one

The dock keeps teammates as numbers (the repository is public), but for the viewers who agreed to be named,
public/stream/aliados.json (in-game names to Twitch login): it tags them while the match is played. A friend who
joins mid-live and isn't in the list yet goes untagged (2026-11-12: Exponja and Edu played 10 and 12 of the 14
matches with him and the site didn't say so). This reads each match's replay, copied by videos.py to
Videos\\Lives\\<date>\\Replays\\Partida NN - ….replay, for the players' names and numbers, and:

- lists his teammates in each match, the ones who played two matches or more first, with their Twitch login when
  they're in aliados.json, and the day's watchers by minutes from the Σ API (while it's the latest live), so Luan can
  say who's who;
- with --aliado "<in-game name>=<twitch login>" (only when Luan says they agreed), adds them to aliados.json, so the
  dock also tags them live from then on;
- with --apply, writes each named teammate's `login` into the session's match (content/matches/<id>.json), found by
  the numbers both keep (score, goals, assists, saves, shots). The site then shows them on the ranked page, in
  "Eu e os viewers que jogaram comigo" and on each match.

The dock republishes a session only when it changes (a new match): if it ever does after this, run it again.
Never prints anything private (the replays' platform ids stay in the file) and never deletes.
"""

import argparse
import json
import struct
import sys
import urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content import MATCHES, ROOT  # noqa: E402
from videos import LIVES as RECORDINGS, TIME_ZONE  # noqa: E402

ALLIES = ROOT / "public" / "stream" / "aliados.json"
SIGMA_API = "https://p1rblei1o9.execute-api.us-east-1.amazonaws.com"  # lib/profile.ts's SIGMA_API
ME = "muanlartins"
NUMBERS = ("score", "goals", "assists", "saves", "shots")


def properties(path):
    """The replay header's properties (the format boxcars reads: name, kind, size, value, until "None")."""
    data = Path(path).read_bytes()
    pos = 0

    def i32():
        nonlocal pos
        pos += 4
        return struct.unpack_from("<i", data, pos - 4)[0]

    def text():
        nonlocal pos
        size = i32()
        if size < 0:  # UTF-16, for names outside Latin-1
            pos += -size * 2
            return data[pos + size * 2:pos].decode("utf-16-le").rstrip("\0")
        pos += size
        return data[pos - size:pos].decode("latin-1").rstrip("\0")

    def fields():
        nonlocal pos
        out = {}
        while (name := text()) != "None":
            kind = text()
            pos += 8  # the value's size, which the game doesn't always get right
            if kind == "IntProperty":
                value = i32()
            elif kind in ("StrProperty", "NameProperty"):
                value = text()
            elif kind == "FloatProperty":
                value = struct.unpack_from("<f", data, pos)[0]
                pos += 4
            elif kind == "BoolProperty":
                value = data[pos] == 1
                pos += 1
            elif kind == "QWordProperty":
                value = struct.unpack_from("<Q", data, pos)[0]
                pos += 8
            elif kind == "ByteProperty":
                key = text()
                if key == "None":
                    pos += 1
                    continue
                value = (key, text())
            elif kind == "ArrayProperty":
                value = [fields() for _ in range(i32())]
            elif kind == "StructProperty":
                text()
                value = fields()
            else:
                raise ValueError(f"{path.name}: propriedade {kind} desconhecida")
            out[name] = value
        return out

    i32(), i32()  # header size, CRC
    major, minor = i32(), i32()
    if major >= 868 and minor >= 18:
        i32()  # net version
    text()  # TAGame.Replay_Soccar_TA
    return fields()


def read(path):
    """A replay's players [(name, team, numbers)] and the two teams' goals {0: …, 1: …}."""
    header = properties(path)
    people = [(p.get("Name", ""), p.get("Team"), tuple(p.get(k.capitalize(), 0) for k in NUMBERS))
              for p in header.get("PlayerStats", []) if not p.get("bBot")]
    return people, {0: header.get("Team0Score", 0), 1: header.get("Team1Score", 0)}


def day_matches(date):
    """{session file: session} and [(session file, match)] of the day, the matches numbered like videos.py names
    the replays (by start, from 1)."""
    loaded, found = {}, []
    for file in sorted(MATCHES.glob("*.json")):
        if file.name.endswith(".events.json"):
            continue
        loaded[file] = json.loads(file.read_text())
        for match in loaded[file]["matches"]:
            start = datetime.fromisoformat((match.get("start") or match["at"]).replace("Z", "+00:00"))
            if start.astimezone(TIME_ZONE).date().isoformat() == date:
                found.append((file, match))
    return loaded, sorted(found, key=lambda fm: fm[1].get("start") or fm[1]["at"])


def allies():
    """{in-game name, lowercase: Twitch login}, as the dock reads it."""
    return {name.lower(): a["login"] for a in json.loads(ALLIES.read_text())["aliados"] for name in a["jogo"]}


def add_ally(name, login):
    listing = json.loads(ALLIES.read_text())
    entry = next((a for a in listing["aliados"] if a["login"] == login), None)
    if entry is None:
        listing["aliados"].append({"login": login, "jogo": [name]})
    elif name not in entry["jogo"]:
        entry["jogo"].append(name)
    else:
        return
    # One viewer per line, like the file was written by hand.
    lines = ["    { " + ", ".join(f'"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in a.items()) + " }"
             for a in listing["aliados"]]
    ALLIES.write_text('{\n  "aliados": [\n' + ",\n".join(lines) + "\n  ]\n}\n")


def watchers(date):
    """[(login, minutes)] of who watched the live, from the Σ API, while it's still the latest one."""
    try:
        with urllib.request.urlopen(f"{SIGMA_API}/live", timeout=15) as response:
            day = json.load(response)
    except OSError:
        return []
    if day.get("dia") != date:
        return []
    rows = next((v for v in day.values() if isinstance(v, list)), [])
    return sorted(((r["login"], r.get("minutosLive", 0)) for r in rows), key=lambda r: -r[1])


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("date", help="YYYY-MM-DD, the live's day")
    parser.add_argument("--aliado", action="append", default=[], metavar="NOME=LOGIN",
                        help="a viewer who agreed to be named: their in-game name and Twitch login (Luan says so)")
    parser.add_argument("--apply", action="store_true", help="write aliados.json and the session (without it, only show)")
    args = parser.parse_args()

    new = dict(item.split("=", 1) for item in args.aliado)
    if args.apply:
        for name, login in new.items():
            add_ally(name, login)
    known = allies() | {name.lower(): login for name, login in new.items()}

    folder = RECORDINGS / args.date / "Replays"
    replays = {int(p.name.split()[1]): p for p in folder.glob("Partida *.replay")} if folder.exists() else {}
    loaded, matches = day_matches(args.date)
    if not matches:
        raise SystemExit(f"Nenhuma partida publicada em {args.date} (content/matches/).")
    together = Counter()
    changed = set()
    for number, (file, match) in enumerate(matches, 1):
        replay = replays.get(number)
        result = {"win": "Vitória", "loss": "Derrota"}.get(match["result"], match["result"])
        title = f"Partida {number:02d}  {result} {match['score'][0]}-{match['score'][1]}"
        if replay is None:
            print(f"{title}: sem replay")
            continue
        people, goals = read(replay)
        team = next((t for n, t, _ in people if n == ME), None)
        if team is None or [goals[team], goals[1 - team]] != match["score"]:
            print(f"{title}: o replay não é desta partida (placar ou jogadores), pulei")
            continue
        mates = [(n, nums) for n, t, nums in people if t == team and n != ME]
        names = []
        for name, nums in mates:
            together[name] += 1
            login = known.get(name.lower())
            names.append(f"{name} ({login})" if login else name)
            if not login:
                continue
            spots = [m for m in match.get("mates", []) if tuple(m.get(k, 0) for k in NUMBERS) == nums]
            if len(spots) != 1:
                print(f"{title}: não achei {name} entre os companheiros da sessão pelos números")
                continue
            if spots[0].get("login") != login:
                spots[0]["login"] = login
                changed.add(file)
        print(f"{title}: {', '.join(names)}")
    print()
    for name, count in together.most_common():
        if count < 2:
            break
        login = known.get(name.lower())
        print(f"{name}: {count} partidas com você — {f'no site como {login}' if login else 'não está no aliados.json'}")
    seen = watchers(args.date)
    if seen:
        print("\nNa live (Σ API, minutos): " + ", ".join(f"{login} {minutes}" for login, minutes in seen))
    if args.apply:
        for file in sorted(changed):
            # As the dock writes it (JSON.stringify with two spaces).
            file.write_text(json.dumps(loaded[file], ensure_ascii=False, indent=2) + "\n")
            print(f"Marcados em {file.relative_to(ROOT)}")
        if not changed:
            print("Nada a marcar.")
    elif changed:
        print("\n(nada foi gravado: rode com --apply)")


if __name__ == "__main__":
    main()
