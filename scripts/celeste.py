"""Celeste's progress on the site, read from the game's own save: nobody ticks the 100% by hand.

    python3 scripts/celeste.py                      # what would change (a dry run)
    python3 scripts/celeste.py --apply              # writes it into content/diversos.json
    python3 scripts/celeste.py --date 2026-11-21    # credit the changes to that day (default below)

Run it after a Celeste live, before the release (the `depois-da-live` skill), or any day he played.

- The save is Steam's `Celeste/Saves/<slot>.celeste`, an XML `SaveData`. Which slot is Luan's run is Celeste's
  `save.slot` in content/diversos.json; while it's unset (null), this says so and does nothing. The save is only
  read, never written. Its `Name` (a person's name: slot 0 isn't his) is never printed or kept, nor anything else
  of the file but the numbers below.
- Each item of the goal with a `save` key is filled by the save, by the area's ID there (0 Prologue, 1–7 the
  chapters, 8 Epilogue, 9 Core, 10 Farewell) and what in it:
    "<area>/A", "<area>/B", "<area>/C"   that side's `Completed` (Farewell's "Terminar" is "10/A")
    "<area>/heart"                       the A side's `HeartGem` (the crystal heart)
    "<area>/cassette"                    the area's `Cassette`
    "<area>/berries/<n>"                 the A side's `TotalStrawberries` at least n
  The save is the truth for those items: one it says isn't done goes back to not done. Items without `save` are
  left as they are.
- An item that turns done gets `date` (the day credited) and, when Celeste had a live that day
  (content/lives/<date>.json with `game` "celeste", or a chapter switching to it), `live`: its chip links that live.
  The day credited is --date, else Celeste's newest live if it's from today or yesterday (a live past midnight),
  else today, in Brasília. On a slot's first read (no `save.read` yet) what's already done gets no date: it was
  done before the site watched.
- `save.totals` keeps the page's numbers: strawberries, deaths and the time played (seconds), and `save.read` the
  day it was read.
"""

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from content import DIVERSOS, LIVES

GAME = "celeste"
SAVES = Path("/mnt/c/Program Files (x86)/Steam/steamapps/common/Celeste/Saves")
TIME_ZONE = ZoneInfo("America/Sao_Paulo")
SIDES = {"A": 0, "B": 1, "C": 2}
TICKS = 10_000_000  # the save's times are .NET ticks, 100 ns each


def read_save(file):
    """The numbers of a save, nothing else: {area: {cassette, sides: [{completed, heart, berries}]}} and totals."""
    root = ET.parse(file).getroot()
    if root.tag != "SaveData":
        sys.exit(f"{file.name} não é um save do Celeste.")
    flag = lambda value: value == "true"
    areas = {}
    for area in root.iter("AreaStats"):
        sides = [{"completed": flag(mode.get("Completed")), "heart": flag(mode.get("HeartGem")),
                  "berries": int(mode.get("TotalStrawberries", 0))} for mode in area.find("Modes")]
        areas[int(area.get("ID"))] = {"cassette": flag(area.get("Cassette")), "sides": sides}
    number = lambda tag: int(root.findtext(tag) or 0)
    totals = {"strawberries": number("TotalStrawberries"), "deaths": number("TotalDeaths"),
              "seconds": number("Time") // TICKS}
    return areas, totals


def is_done(key, areas):
    """What the save says about an item's `save` key."""
    area, what, *rest = key.split("/")
    stats = areas.get(int(area))
    if not stats:
        return False
    if what in SIDES:
        return stats["sides"][SIDES[what]]["completed"]
    if what == "heart":
        return stats["sides"][0]["heart"]
    if what == "cassette":
        return stats["cassette"]
    if what == "berries":
        return stats["sides"][0]["berries"] >= int(rest[0])
    sys.exit(f"Chave de save desconhecida: {key!r}")


def lives_of_game():
    """The dates of Celeste's lives, oldest first."""
    found = []
    for path in sorted(LIVES.glob("????-??-??.json")):
        live = json.loads(path.read_text())
        if live.get("game") == GAME or any(chapter.get("game") == GAME for chapter in live.get("chapters", [])):
            found.append(live["date"])
    return found


def credited_day(chosen):
    """(the day, its live's date or None): --date, else the newest live if from today or yesterday, else today."""
    played = lives_of_game()
    if chosen:
        return chosen, chosen if chosen in played else None
    today = datetime.now(TIME_ZONE).date()
    recent = [d for d in played if date.fromisoformat(d) >= today - timedelta(days=1)]
    if recent:
        return recent[-1], recent[-1]
    return today.isoformat(), None


def dump(value, indent=0):
    """content/diversos.json as it's written by hand: two spaces, each goal item on one line."""
    pad, inner = "  " * indent, "  " * (indent + 1)
    if isinstance(value, dict) and value:
        rows = []
        for key, item in value.items():
            if key == "items" and isinstance(item, list) and item and all(isinstance(i, dict) for i in item):
                text = ",\n".join(inner + "  " + one_line(i) for i in item)
                rows.append(f'{inner}"items": [\n{text}\n{inner}]')
            else:
                rows.append(f"{inner}{json.dumps(key)}: {dump(item, indent + 1)}")
        return "{\n" + ",\n".join(rows) + f"\n{pad}}}"
    if isinstance(value, list) and value:
        return "[\n" + ",\n".join(inner + dump(item, indent + 1) for item in value) + f"\n{pad}]"
    return json.dumps(value, ensure_ascii=False)


def one_line(item):
    return "{ " + ", ".join(f"{json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}" for k, v in item.items()) + " }"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write content/diversos.json (otherwise only show)")
    parser.add_argument("--date", help="the day to credit what turned done (YYYY-MM-DD)")
    parser.add_argument("--slot", type=int, help="read this slot instead of save.slot (a test); with --apply it "
                                                 "becomes save.slot, so never on a slot that isn't his")
    parser.add_argument("--saves", type=Path, default=SAVES, help="the Saves folder")
    args = parser.parse_args()

    data = json.loads(DIVERSOS.read_text())
    game = next((g for g in data["games"] if g["id"] == GAME), None)
    if not game or not game.get("goal"):
        sys.exit("O Celeste não está em content/diversos.json, ou está sem meta.")
    save = game.setdefault("save", {"slot": None})
    slot = args.slot if args.slot is not None else save.get("slot")
    if slot is None:
        print("Nenhum slot de save definido: o Celeste fica como está. Põe o número do slot da run do Luan em "
              "content/diversos.json (save.slot do Celeste) e roda de novo.")
        return
    file = args.saves / f"{slot}.celeste"
    if not file.exists():
        sys.exit(f"Não achei o save do slot {slot} em {args.saves}.")
    areas, totals = read_save(file)
    first = not save.get("read")
    day, live = credited_day(args.date)

    changes = []
    for group in game["goal"]["groups"]:
        for item in group["items"]:
            if "save" not in item:
                continue
            now, was = is_done(item["save"], areas), bool(item.get("done"))
            if now == was:
                continue
            label = f"{group.get('title', '')}: {item['text']}".lstrip(": ")
            item["done"] = now
            item.pop("date", None)
            item.pop("live", None)
            if now and not first:
                item["date"] = day
                if live:
                    item["live"] = live
            changes.append(f"  {'feito' if now else 'desfeito'}: {label}"
                           + (f" ({item['date']}{', na live' if live else ''})" if item.get("date") else ""))

    done = sum(bool(i.get("done")) for g in game["goal"]["groups"] for i in g["items"])
    total = sum(len(g["items"]) for g in game["goal"]["groups"])
    print(f"Save do slot {slot}: {totals['strawberries']} morangos, {totals['deaths']} mortes, "
          f"{totals['seconds'] // 3600}h{totals['seconds'] % 3600 // 60:02d} de jogo.")
    print(f"Meta {game['goal']['title']}: {done} de {total} feitos"
          + (" (primeira leitura: o que já estava feito fica sem data)" if first and changes else "") + ".")
    print("\n".join(changes) if changes else "  Nada mudou na meta.")
    if save.get("totals") != totals:
        print(f"  totais: {save.get('totals')} → {totals}")

    if not args.apply:
        print("Simulação: nada escrito. --apply escreve content/diversos.json.")
        return
    save.update(slot=save.get("slot") if args.slot is None else args.slot, read=day, totals=totals)
    DIVERSOS.write_text(dump(data) + "\n")
    print(f"Escrito em {DIVERSOS.relative_to(DIVERSOS.parent.parent)}.")


if __name__ == "__main__":
    main()
