"""Valorant's inventory for the site: the skin on each weapon now, which of the ideal collection Luan owns, and the art.

    python3 scripts/valorant_inventory.py          # reads the game (Riot Client open, on the stream PC) and the art
    python3 scripts/valorant_inventory.py --arte   # only the art, keeping the last reading (any machine)
    python3 scripts/valorant_inventory.py --todos  # downloads the art again

content/valorant-ideal.json is the collection Luan is building: each weapon's skin, by its name in the game, and the
variants he'd use, the first preferred ("Base" is the skin before any variant). With the Riot Client open it asks
Valorant's own servers, with the tokens the client hands out (scripts/valorant.py, kept in memory only), for his
loadout (the skin and variant on each weapon) and what he owns (skin levels and variants). The art comes from
valorant-api.com: each variant's render (up to 720 px wide) and swatch as WebP in public/valorant/skins/, named by Riot's
id, and the link to Riot's showcase video, which the page plays from Riot's own CDN. content/valorant-inventory.json
is what the site reads (lib/valorant-inventory.ts). A new skin in the ideal list is one run with --arte away.
"""

import argparse
import json
import re
import shutil
import subprocess
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from valorant import client, valorant_api

ROOT = Path(__file__).resolve().parent.parent
IDEAL = ROOT / "content" / "valorant-ideal.json"
OUT = ROOT / "content" / "valorant-inventory.json"
ART = ROOT / "public" / "valorant" / "skins"
SKIN_LEVELS = "e7c63390-eda7-46e0-bb7a-a6abdacd2433"
CHROMAS = "3ad1b2b2-acdb-4524-852f-954a76ddae0a"
# The in-game collection's groups, in its order.
CATEGORIES = {"Pistols": "sidearms", "SMGs": "smgs", "Shotguns": "shotguns", "Rifles": "rifles",
              "Sniper Rifles": "snipers", "Heavy Weapons": "heavies"}


def get(path):
    return json.load(urllib.request.urlopen(f"https://valorant-api.com/v1/{path}", timeout=30))["data"]


def webp(url, target: Path, width: int, again: bool):
    """The image at `url` as WebP at `target`, at most `width` px wide (never enlarged): ImageMagick where it's
    installed (macOS's ffmpeg has no WebP encoder), ffmpeg otherwise."""
    if target.exists() and not again:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".png") as raw:
        raw.write(urllib.request.urlopen(url, timeout=60).read())
        raw.flush()
        if shutil.which("magick"):
            command = ["magick", raw.name, "-resize", f"{width}x>", "-quality", "82", str(target)]
        else:
            command = ["ffmpeg", "-loglevel", "error", "-y", "-i", raw.name, "-vf", f"scale='min(iw,{width})':-1:flags=lanczos",
                       "-c:v", "libwebp", "-quality", "82", "-compression_level", "6", str(target)]
        subprocess.run(command, check=True)
    print("  ", target.relative_to(ROOT), flush=True)


def variant(chroma, index):
    """A variant's short name: "Blue" from "Elderflame Vandal Level 4\\n(Variant 2 Blue)"; the first is "Base"."""
    found = re.search(r"\(Variant \d+ ([^)]+)\)", chroma["displayName"])
    return found.group(1).strip() if found and index else "Base"


def read_game():
    """Luan's loadout and what he owns, from Valorant's servers; None when the Riot Client isn't open here."""
    found = client()
    if not found:
        return None
    puuid, ask = valorant_api(found)
    loadout = ask(f"/personalization/v3/players/{puuid}/playerloadout")["Guns"]
    owned = lambda kind: {e["ItemID"].lower() for e in ask(f"/store/v1/entitlements/{puuid}/{kind}")["Entitlements"]}
    return {
        "equipped": {g["ID"].lower(): {"skin": g["SkinID"].lower(), "chroma": g["ChromaID"].lower()} for g in loadout},
        "levels": owned(SKIN_LEVELS),
        "chromas": owned(CHROMAS),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--arte", action="store_true", help="only the art, keeping the last reading of the game")
    parser.add_argument("--todos", action="store_true", help="download the art again")
    args = parser.parse_args()

    ideal = json.loads(IDEAL.read_text())
    previous = json.loads(OUT.read_text()) if OUT.exists() else {}
    weapons = get("weapons")
    tiers = {t["uuid"]: {"name": t["devName"], "color": f"#{t['highlightColor'][:6]}"} for t in get("contenttiers")}
    by_skin = {s["uuid"]: (w, s) for w in weapons for s in w["skins"]}
    by_level = {l["uuid"]: s["uuid"] for w in weapons for s in w["skins"] for l in s["levels"]}

    game = None
    if not args.arte:
        try:
            game = read_game()
        except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
            raise SystemExit(f"O jogo não respondeu ({type(error).__name__}): com o Valorant aberto, ou use --arte.")
        if not game:
            raise SystemExit("O Riot Client não está aberto aqui: abra o Valorant, ou use --arte para só baixar a arte.")

    # The ideal collection, by skin id, each variant checked against the game's names.
    wanted = {}
    for weapon in weapons:
        pick = ideal.get(weapon["displayName"].lower())
        if not pick:
            continue
        skin = next((s for s in weapon["skins"] if s["displayName"].strip() == pick["skin"]), None)
        if not skin:
            raise SystemExit(f'{weapon["displayName"]}: não existe a skin "{pick["skin"]}".')
        names = [variant(c, i) for i, c in enumerate(skin["chromas"])]
        for name in pick["variants"]:
            if name not in names:
                raise SystemExit(f'{pick["skin"]}: não tem a variante "{name}" (tem {", ".join(names)}).')
        wanted[weapon["uuid"]] = {"skin": skin["uuid"], "variants": pick["variants"]}

    if game:
        # Only the ideal collection's skins and variants matter to the page.
        ideal_skins = {w["skin"] for w in wanted.values()}
        ideal_chromas = {c["uuid"] for s in ideal_skins for c in by_skin[s][1]["chromas"]}
        equipped = game["equipped"]
        owned = {"skins": sorted({by_level.get(level) for level in game["levels"]} & ideal_skins),
                 "chromas": sorted(game["chromas"] & ideal_chromas)}
        read = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    else:
        weapon_ids = {w["displayName"].lower(): w["uuid"] for w in weapons}
        equipped = {weapon_ids[w["id"]]: {"skin": w["skin"], "chroma": w["chroma"]} for w in previous.get("weapons", [])}
        owned = previous.get("owned", {"skins": [], "chromas": []})
        read = previous.get("read")

    skins, rows = {}, []
    for weapon in weapons:
        default = weapon["defaultSkinUuid"]
        on = equipped.get(weapon["uuid"], {"skin": default, "chroma": by_skin[default][1]["chromas"][0]["uuid"]})
        shown = {default, on["skin"]} | ({wanted[weapon["uuid"]]["skin"]} if weapon["uuid"] in wanted else set())
        for skin_id in shown:
            _, skin = by_skin[skin_id]
            last_video = next((l["streamedVideo"] for l in reversed(skin["levels"]) if l.get("streamedVideo")), None)
            chromas = []
            for index, chroma in enumerate(skin["chromas"]):
                image = chroma.get("fullRender") or chroma.get("displayIcon") or skin.get("displayIcon")
                entry = {"id": chroma["uuid"], "name": variant(chroma, index), "image": None, "swatch": None,
                         "video": chroma.get("streamedVideo") or last_video}
                if image:
                    webp(image, ART / f"{chroma['uuid']}.webp", 720, args.todos)
                    entry["image"] = f"/valorant/skins/{chroma['uuid']}.webp"
                if chroma.get("swatch"):
                    webp(chroma["swatch"], ART / f"{chroma['uuid']}-amostra.webp", 48, args.todos)
                    entry["swatch"] = f"/valorant/skins/{chroma['uuid']}-amostra.webp"
                chromas.append(entry)
            skins[skin_id] = {"name": skin["displayName"].strip(), "standard": skin_id == default,
                              "tier": tiers.get(skin.get("contentTierUuid")), "chromas": chromas}
        rows.append({
            "id": weapon["displayName"].lower(),
            "name": weapon["displayName"],
            "category": CATEGORIES.get((weapon.get("shopData") or {}).get("category"), "melee"),
            "cost": (weapon.get("shopData") or {}).get("cost", 0),
            "skin": on["skin"],
            "chroma": on["chroma"],
            "ideal": wanted.get(weapon["uuid"]),
        })

    # As the collection lists them: by group, then price (Phantom before Vandal at the same price, as in the game).
    rows.sort(key=lambda r: ((list(CATEGORIES.values()) + ["melee"]).index(r["category"]), r["cost"], r["name"]))
    for row in rows:
        row.pop("cost")
    OUT.write_text(json.dumps({"read": read, "weapons": rows, "owned": owned, "skins": skins}, ensure_ascii=False, indent=1) + "\n")
    print(f"{OUT.relative_to(ROOT)}: {len(rows)} armas, {len(skins)} skins" + (f", lido do jogo em {read}" if game else ""))


if __name__ == "__main__":
    main()
