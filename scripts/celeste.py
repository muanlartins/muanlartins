"""Celeste's trajectory on the site, read from the game's own files: nobody ticks the roadmap by hand.

    python3 scripts/celeste.py                      # what would change (a dry run)
    python3 scripts/celeste.py --apply              # writes content/celeste-save.json
    python3 scripts/celeste.py --date 2026-11-22    # credit the changes to that day (default below)

Run it after a Celeste live, before the release (the `depois-da-live` skill), or any day he played.

- It reads two things of the game's and writes to neither:
  - the save, Steam's `Celeste/Saves/<slot>.celeste` (an XML `SaveData`), whose slot is `slot` in
    content/celeste-save.json. Its `Name` is a person's name (slot 0 isn't Luan's run): never printed or kept, nor
    anything else of the file but the numbers below. Only the game's own chapters count (`Areas`), never a mod's
    (Everest keeps those under `LevelSets`).
  - Steam's local stats of the game (`appcache/stats/UserGameStats_<account>_504230.bin`), for the two things a save
    doesn't keep: the 1UP! achievement (counts if unlocked since `start`) and PICO-8 beaten (counts past
    `baseline.picoCompletes`, since that achievement was on the account before this run).
- It writes facts, by key, and the roadmap (content/celeste.ts) only names the keys. `<area>` is the save's id:
  0 Prologue, 1-7 the chapters, 8 Epilogue, 9 chapter 8 (Core), 10 chapter 9 (Farewell).
    "<area>/A", "<area>/B", "<area>/C"   that side finished
    "<area>/heart", "<area>/cassette"    the A side's crystal heart, the area's cassette
    "<area>/berries"                     every red strawberry of the chapter (goldens never count for it)
    "<area>/fullclear"                   the game's Full Clear: from the start, everything in one visit
    "<area>/<side>/golden"               that side's golden strawberry
    "1/winged", "10/moon"                the winged golden one, the moon berry
    "10/door"                            past chapter 9's heart door (its next checkpoint reached)
    "steam/ONEUP", "steam/PICO8"         from Steam's stats
  and which of the 32 achievements this run has earned, by the game's own rules (SaveData's and AreaComplete's).
  The strawberries' ids and how many each chapter has come from the game's maps (Content/Maps, 1.4.0.0): 175 red,
  25 golden, 1 winged golden, 1 moon, the 202.
- A fact that turns true gets `date` (the day credited) and, when Celeste had a live that day
  (content/lives/<date>.json with `game` "celeste", or a chapter switching to it), `live`. The day credited is
  --date, else Celeste's newest live if it's from today or yesterday (a live past midnight), else today, in Brasília.
  The run starts from zero, so the first read is credited like any other. The save is the truth: a fact it no longer
  has goes away, and a save with less time than the last read is a run started over.
- `sides` keeps each side's deaths, seconds and red strawberries, `totals` the page's numbers, `history` the totals
  by the day read (what each day added), `seen` the chapters reached (the page hides the others' names).
"""

import argparse
import json
import struct
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from content import LIVES, ROOT

GAME = "celeste"
STATE = ROOT / "content" / "celeste-save.json"
STEAM = Path("/mnt/c/Program Files (x86)/Steam")
SAVES = STEAM / "steamapps/common/Celeste/Saves"
STATS = STEAM / "appcache/stats"
TIME_ZONE = ZoneInfo("America/Sao_Paulo")
TICKS = 10_000_000  # the save's times are .NET ticks, 100 ns each
SIDES = "ABC"
CHAPTERS = (1, 2, 3, 4, 5, 6, 7, 9)  # the eight with sides, hearts and cassettes

# From the game's maps: how many red strawberries, and the other strawberries' ids ("room:entity").
RED = {1: 20, 2: 18, 3: 25, 4: 29, 5: 31, 6: 0, 7: 47, 9: 5}
GOLDEN = {
    "1/A": "1:12", "1/B": "00:25", "1/C": "00:50",
    "2/A": "start:5", "2/B": "start:5", "2/C": "00:6",
    "3/A": "s0:7", "3/B": "00:2", "3/C": "00:86",
    "4/A": "a-00:13", "4/B": "a-00:41", "4/C": "00:1",
    "5/A": "a-00b:3", "5/B": "start:3", "5/C": "00:25",
    "6/A": "00:51", "6/B": "a-00:137", "6/C": "00:3",
    "7/A": "a-00:57", "7/B": "a-00:102", "7/C": "01:334",
    "9/A": "a-00:19", "9/B": "a-00:22", "9/C": "00:93",
    "10/A": "a-00:449",
}
WINGED = ("1/A", "end:4")
MOON = ("10/A", "j-19:9")
AFTER_DOOR = {"h-00b", "i-00", "j-00", "j-16"}  # chapter 9's checkpoints past its door

# Steam's ids for the game's stats (UserGameStatsSchema_504230.bin).
ACHIEVEMENTS_STAT, ONEUP_BIT, PICO_COMPLETES_STAT = "1", 11, "7"


def read_save(file):
    """The numbers of a save, nothing else: each side played, and each area's cassette."""
    root = ET.parse(file).getroot()
    if root.tag != "SaveData":
        sys.exit(f"{file.name} não é um save do Celeste.")
    yes = lambda value: value == "true"
    sides, cassettes = {}, set()
    for area in root.findall("Areas/AreaStats"):  # not iter(): Everest's LevelSets have AreaStats too
        id = int(area.get("ID"))
        if id > 10:
            continue
        if yes(area.get("Cassette")):
            cassettes.add(id)
        for side, mode in zip(SIDES, area.findall("Modes/AreaModeStats")):
            berries = {entity.get("Key") for entity in mode.findall("Strawberries/EntityID")}
            stats = {
                "completed": yes(mode.get("Completed")),
                "heart": yes(mode.get("HeartGem")),
                "fullClear": yes(mode.get("FullClear")),
                "deaths": int(mode.get("Deaths", 0)),
                "seconds": int(mode.get("TimePlayed", 0)) // TICKS,
                "berries": berries,
                "checkpoints": {point.text for point in mode.findall("Checkpoints/string")},
            }
            if stats["completed"] or stats["seconds"] or stats["deaths"] or berries:
                sides[f"{id}/{side}"] = stats
    return {
        "sides": sides,
        "cassettes": cassettes,
        "unlocked": int(root.findtext("UnlockedAreas") or 0),
        "dashes": int(root.findtext("TotalDashes") or 0),
        "assist": yes(root.findtext("AssistMode")),
        "variants": yes(root.findtext("VariantMode")),
    }


def vdf(data):
    """Valve's binary KeyValues, as a dict."""
    at = 0

    def text():
        nonlocal at
        end = data.index(b"\0", at)
        found, at = data[at:end].decode("utf8", "replace"), end + 1
        return found

    def node():
        nonlocal at
        found = {}
        while at < len(data):
            kind = data[at]
            at += 1
            if kind == 8:
                break
            key = text()
            if kind == 0:
                found[key] = node()
            elif kind == 1:
                found[key] = text()
            elif kind in (2, 3):
                found[key] = struct.unpack_from("<i" if kind == 2 else "<f", data, at)[0]
                at += 4
            elif kind == 7:
                found[key] = struct.unpack_from("<Q", data, at)[0]
                at += 8
            else:
                raise ValueError(f"tipo {kind}")
        return found

    return node()


def read_steam(folder, state):
    """{key: the day, or None} of the two facts only Steam has. None altogether when Steam's file can't be read."""
    files = sorted(folder.glob("UserGameStats_*_504230.bin"), key=lambda path: path.stat().st_mtime)
    if not files:
        return None
    try:
        cache = vdf(files[-1].read_bytes())["cache"]
    except (OSError, ValueError, KeyError, struct.error) as error:
        print(f"Não li as estatísticas da Steam ({error}): 1UP! e PICO-8 ficam como estavam.")
        return None
    found = {}
    unlocked = cache.get(ACHIEVEMENTS_STAT, {}).get("AchievementTimes", {}).get(str(ONEUP_BIT))
    if unlocked:
        day = datetime.fromtimestamp(unlocked, TIME_ZONE).date().isoformat()
        if day >= state["start"]:
            found["steam/ONEUP"] = day
    if cache.get(PICO_COMPLETES_STAT, {}).get("data", 0) > state["baseline"]["picoCompletes"]:
        found["steam/PICO8"] = None
    return found


def red_of(key, stats):
    others = {GOLDEN.get(key), *(id for side, id in (WINGED, MOON) if side == key)}
    return len(stats["berries"] - others)


def facts_of(save):
    """Every key the save makes true."""
    sides, facts = save["sides"], set()
    for key, stats in sides.items():
        area, side = key.split("/")
        if stats["completed"]:
            facts.add(key)
        if key in GOLDEN and GOLDEN[key] in stats["berries"]:
            facts.add(f"{key}/golden")
        if side != "A" or int(area) not in CHAPTERS:
            continue
        if stats["heart"]:
            facts.add(f"{area}/heart")
        if stats["fullClear"]:
            facts.add(f"{area}/fullclear")
        if RED[int(area)] and red_of(key, stats) >= RED[int(area)]:
            facts.add(f"{area}/berries")
    facts |= {f"{area}/cassette" for area in save["cassettes"] if area in CHAPTERS}
    for fact, (key, id) in (("1/winged", WINGED), ("10/moon", MOON)):
        if key in sides and id in sides[key]["berries"]:
            facts.add(fact)
    farewell = sides.get("10/A")
    if farewell and (farewell["completed"] or farewell["checkpoints"] & AFTER_DOOR):
        facts.add("10/door")
    return facts


def totals_of(save):
    sides = save["sides"]
    total = lambda what: sum(stats[what] for stats in sides.values())
    return {
        "deaths": total("deaths"),
        "seconds": total("seconds"),
        "dashes": save["dashes"],
        "strawberries": sum(len(stats["berries"]) for stats in sides.values()),
        "red": sum(red_of(key, stats) for key, stats in sides.items()),
        "golden": sum(f"{key}/golden" in facts_of(save) for key in GOLDEN) + ("1/winged" in facts_of(save)),
        "hearts": sum(stats["heart"] for key, stats in sides.items() if int(key.split("/")[0]) in CHAPTERS),
        "cassettes": len(save["cassettes"] & set(CHAPTERS)),
    }


def achievements_of(facts, save, totals):
    """The achievements this run has earned, by the game's rules, in Steam's order of ids."""
    sides = save["sides"]
    number = lambda area: 8 if area == 9 else area
    earned = [f"CH{area}" for area in range(1, 8) if f"{area}/A" in facts]
    earned += [f"HEART{number(area)}" for area in CHAPTERS if f"{area}/heart" in facts]
    earned += [f"BSIDE{number(area)}" for area in CHAPTERS if sides.get(f"{area}/B", {}).get("heart")]
    # The game counts every strawberry for these three, goldens too.
    earned += [f"STRB{n}" for n, least in enumerate((30, 80, 175), 1) if totals["strawberries"] >= least]
    for id, done in (
        ("CASS", totals["cassettes"] > 0),
        ("CSIDES", totals["hearts"] >= 24),
        ("FAREWELL", "10/A" in facts),
        ("WOW", "10/moon" in facts),
        ("ONEUP", "steam/ONEUP" in facts),
        ("PICO8", "steam/PICO8" in facts),
    ):
        if done:
            earned.append(id)
    return earned


def seen_of(save):
    """The chapters reached: the first two always, then what the game unlocked or he played."""
    played = {int(key.split("/")[0]) for key in save["sides"]}
    return sorted({0, 1} | played | set(range(min(save["unlocked"], 10) + 1)))


def lives_of_game():
    """The dates of Celeste's lives, oldest first."""
    found = []
    for path in sorted(LIVES.glob("????-??-??.json")):
        live = json.loads(path.read_text())
        if live.get("game") == GAME or any(chapter.get("game") == GAME for chapter in live.get("chapters", [])):
            found.append(live["date"])
    return found


def credited_day(chosen, played):
    """--date, else the newest live if from today or yesterday, else today."""
    if chosen:
        return date.fromisoformat(chosen).isoformat()
    today = datetime.now(TIME_ZONE).date()
    recent = [day for day in played if date.fromisoformat(day) >= today - timedelta(days=1)]
    return recent[-1] if recent else today.isoformat()


def dump(state):
    """The file with a fact, a side or a day on each line, so a live's diff reads as what happened in it."""
    line = lambda value: json.dumps(value, ensure_ascii=False)
    rows = []
    for key, value in state.items():
        if key in ("done", "sides", "history") and value:
            if isinstance(value, dict):
                inner = [f"    {line(name)}: {line(each)}" for name, each in value.items()]
                rows.append(f'  "{key}": {{\n' + ",\n".join(inner) + "\n  }")
            else:
                rows.append(f'  "{key}": [\n' + ",\n".join(f"    {line(each)}" for each in value) + "\n  ]")
        else:
            rows.append(f'  "{key}": {line(value)}')
    return "{\n" + ",\n".join(rows) + "\n}\n"


def in_order(key):
    head, *rest = key.split("/")
    return (0, int(head), rest) if head.isdigit() else (1, 0, [head, *rest])


def update(state, save, steam, day, played):
    """The new state, what changed as lines, and whether the run started over."""
    totals, was = totals_of(save), state.get("totals")
    again = bool(was) and totals["seconds"] < was["seconds"]
    old = {key: value for key, value in state["done"].items() if not (again and not key.startswith("steam/"))}

    facts = facts_of(save)
    if steam is None:
        facts |= {key for key in old if key.startswith("steam/")}
    else:
        facts |= set(steam)

    done, changes = {}, []
    for key in sorted(facts, key=in_order):
        if key in old:
            done[key] = old[key]
            continue
        when = (steam or {}).get(key) or day
        done[key] = {"date": when, **({"live": when} if when in played else {})}
        changes.append(f"  feito: {key} ({when}{', na live' if when in played else ''})")
    changes += [f"  desfeito: {key}" for key in state["done"] if key not in done]

    history = [] if again else [row for row in state["history"] if row["date"] != day]
    row = {"date": day, "deaths": totals["deaths"], "seconds": totals["seconds"], "strawberries": totals["strawberries"]}
    last = history[-1] if history else None
    if not last or any(last[key] != row[key] for key in row if key != "date"):
        history = sorted([*history, row], key=lambda each: each["date"])

    new = {
        **state,
        "read": day,
        "assist": save["assist"],
        "variants": save["variants"],
        "seen": seen_of(save),
        "totals": totals,
        "achievements": achievements_of(facts, save, totals),
        "sides": {
            key: {"deaths": stats["deaths"], "seconds": stats["seconds"], "red": red_of(key, stats)}
            for key, stats in sorted(save["sides"].items(), key=lambda pair: in_order(pair[0]))
        },
        "done": done,
        "history": history,
    }
    return new, changes, again


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write content/celeste-save.json (otherwise only show)")
    parser.add_argument("--date", help="the day to credit what turned done (YYYY-MM-DD)")
    parser.add_argument("--slot", type=int, help="read this slot instead of the state's (a test); with --apply it "
                                                 "becomes the run's, so never on a slot that isn't his")
    parser.add_argument("--saves", type=Path, default=SAVES, help="the Saves folder")
    parser.add_argument("--stats", type=Path, default=STATS, help="Steam's appcache/stats folder")
    parser.add_argument("--state", type=Path, default=STATE, help="the file it keeps (tests use a copy)")
    args = parser.parse_args()

    state = json.loads(args.state.read_text())
    slot = args.slot if args.slot is not None else state.get("slot")
    if slot is None:
        print("Nenhum slot de save definido: o Celeste fica como está.")
        return
    file = args.saves / f"{slot}.celeste"
    if not file.exists():
        print(f"O slot {slot} ainda não tem save em {args.saves}: a página fica como está.")
        return
    save = read_save(file)
    played = lives_of_game()
    new, changes, again = update(state, save, read_steam(args.stats, state), credited_day(args.date, played), played)
    new["slot"] = slot

    totals = new["totals"]
    print(f"Save do slot {slot}: {totals['deaths']} mortes, {totals['seconds'] // 3600}h{totals['seconds'] % 3600 // 60:02d}, "
          f"{totals['strawberries']}/202 morangos, {totals['hearts']}/24 corações, {totals['cassettes']}/8 fitas, "
          f"{len(new['achievements'])}/32 conquistas nesta run.")
    if again:
        print("O save tem menos tempo que na última leitura: run recomeçada, o histórico zera.")
    if save["assist"] or save["variants"]:
        print("Atenção: o save está com modo assistência ou variantes, e a página avisa.")
    print("\n".join(changes) if changes else "  Nada mudou no roteiro.")

    if not args.apply:
        print("Simulação: nada escrito. --apply escreve content/celeste-save.json.")
        return
    args.state.write_text(dump(new))
    print(f"Escrito em {args.state}.")


if __name__ == "__main__":
    main()
