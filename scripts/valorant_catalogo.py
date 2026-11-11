"""Every Valorant weapon skin, for the inventory's loadout builder: public/valorant/catalogo.json.

    python3 scripts/valorant_catalogo.py          # writes the catalogue (any machine; a few seconds)
    python3 scripts/valorant_catalogo.py --ver    # only says what changed

From valorant-api.com (English and Brazilian Portuguese): the weapons in the collection's order, and each skin with its
name in both languages, its collection (theme) and rarity, and its variants (chromas), each with whether it has a
swatch and the path of its showcase video on Riot's CDN. The pictures aren't copied: the site loads each render and
swatch from valorant-api.com's media CDN by Riot's id (lib/valorant-catalog.ts), which allows other sites to draw them
on a canvas, so the export works. Run it after a Valorant patch brings new skins; nothing else changes with it.
"""

import argparse
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "valorant" / "catalogo.json"
VIDEOS = "https://valorant.dyn.riotcdn.net/x/videos/"
# The in-game collection's groups, in its order; the melee has no shop category.
GROUPS = {"Pistols": "sidearms", "SMGs": "smgs", "Shotguns": "shotguns", "Rifles": "rifles",
          "Sniper Rifles": "snipers", "Heavy Weapons": "heavies"}
ORDER = list(GROUPS.values()) + ["melee"]


def get(path, language=None):
    url = f"https://valorant-api.com/v1/{path}" + (f"?language={language}" if language else "")
    request = urllib.request.Request(url, headers={"User-Agent": "muanlartins-site"})
    return json.load(urllib.request.urlopen(request, timeout=60))["data"]


def variant(chroma, index):
    """A variant's short name: "Blue" from "Elderflame Vandal Level 4\\n(Variant 2 Blue)", "Azul" from "(Variante 2
    Azul)"; the first is the skin before any variant, "Base"."""
    found = re.search(r"\(Variante? \d+ ([^)]+)\)", chroma["displayName"])
    return found.group(1).strip() if found and index else "Base"


def video(url):
    return url[len(VIDEOS):] if url and url.startswith(VIDEOS) else None


def build():
    version = get("version")["version"]
    weapons, weapons_pt = get("weapons"), get("weapons", "pt-BR")
    pt = {s["uuid"]: s for w in weapons_pt for s in w["skins"]}
    themes_pt = {t["uuid"]: t["displayName"] for t in get("themes", "pt-BR")}
    themes = {t["uuid"]: [t["displayName"], themes_pt.get(t["uuid"], t["displayName"])] for t in get("themes")}
    tiers = {t["uuid"]: {"nome": t["devName"], "cor": f"#{t['highlightColor'][:6].lower()}", "ordem": t["rank"]}
             for t in get("contenttiers")}

    rows = []
    for weapon in weapons:
        shop = weapon.get("shopData") or {}
        rows.append({"id": weapon["displayName"].lower(), "nome": weapon["displayName"],
                     "grupo": GROUPS.get(shop.get("category"), "melee"), "padrao": weapon["defaultSkinUuid"],
                     "_custo": shop.get("cost", 0), "_skins": weapon["skins"]})
    # As the collection lists them: by group, then price (Phantom before Vandal at the same price, as in the game).
    rows.sort(key=lambda r: (ORDER.index(r["grupo"]), r["_custo"], r["nome"]))

    skins, used_themes = {}, set()
    for row in rows:
        for skin in row.pop("_skins"):
            name = skin["displayName"].strip()
            if name == "Random Favorite Skin":
                continue
            other = pt.get(skin["uuid"], skin)
            last_video = next((l["streamedVideo"] for l in reversed(skin["levels"]) if l.get("streamedVideo")), None)
            chromas = []
            for index, chroma in enumerate(skin["chromas"]):
                entry = {"i": chroma["uuid"], "n": variant(chroma, index)}
                chroma_pt = next((c for c in other["chromas"] if c["uuid"] == chroma["uuid"]), chroma)
                if variant(chroma_pt, index) != entry["n"]:
                    entry["p"] = variant(chroma_pt, index)
                if chroma.get("swatch"):
                    entry["s"] = 1
                if video(chroma.get("streamedVideo")):
                    entry["v"] = video(chroma["streamedVideo"])
                chromas.append(entry)
            entry = {"a": row["id"], "n": name, "c": chromas}
            if other["displayName"].strip() != name:
                entry["p"] = other["displayName"].strip()
            if skin.get("themeUuid") in themes and skin["uuid"] != row["padrao"]:
                entry["t"] = skin["themeUuid"]
                used_themes.add(skin["themeUuid"])
            if skin.get("contentTierUuid") in tiers:
                entry["r"] = skin["contentTierUuid"]
            if video(last_video):
                entry["v"] = video(last_video)
            skins[skin["uuid"]] = entry
        row.pop("_custo")

    return {"versao": version, "armas": rows, "temas": {k: v for k, v in themes.items() if k in used_themes},
            "raridades": tiers, "skins": skins}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ver", action="store_true", help="only say what changed")
    args = parser.parse_args()
    catalogue = build()
    before = json.loads(OUT.read_text()) if OUT.exists() else {"skins": {}}
    new = sorted(set(catalogue["skins"]) - set(before["skins"]))
    gone = sorted(set(before["skins"]) - set(catalogue["skins"]))
    print(f'{catalogue["versao"]}: {len(catalogue["skins"])} skins, '
          f'{sum(len(s["c"]) for s in catalogue["skins"].values())} variantes; {len(new)} novas, {len(gone)} a menos')
    for skin_id in new[:20]:
        print("  +", catalogue["skins"][skin_id]["n"])
    if args.ver:
        return
    # One line per skin: small diffs when a patch adds a few, and still compact for the browser.
    lines = ",\n".join(f"{json.dumps(k)}:{json.dumps(v, ensure_ascii=False, separators=(',', ':'))}"
                       for k, v in catalogue["skins"].items())
    head = {k: v for k, v in catalogue.items() if k != "skins"}
    OUT.write_text(json.dumps(head, ensure_ascii=False, separators=(",", ":"))[:-1] + ',"skins":{\n' + lines + "\n}}\n")
    print(OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
