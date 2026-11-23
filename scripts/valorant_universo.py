"""The game's own words on each agent and map, for the site's Universo Valorant, from valorant-api.com (which mirrors
the game's files): content/valorant-universo/jogo.json.

    python3 scripts/valorant_universo.py        # after a patch that brings an agent or a map

Per agent, in the Brazilian client's Portuguese and in English: the role, the official bio, each ability's name and
description by its key, and the game's internal name for the agent (`developerName`: Raze is Clay). Per map: its
names, the coordinates its loading screen shows and its internal name (from its path: Bind is Duality). Everything
here is the game's, so the page seals it "No jogo". The rest of an agent's facts (real name, origin, voices) are
the research's, in content/valorant-universo/fichas.ts, each with its source.
"""

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "valorant-universo" / "jogo.json"
KEYS = {"Ability1": "Q", "Ability2": "E", "Grenade": "C", "Ultimate": "X", "Passive": "Passiva"}


def get(path, lang):
    url = f"https://valorant-api.com/v1/{path}{'&' if '?' in path else '?'}language={lang}"
    return json.load(urllib.request.urlopen(url, timeout=30))["data"]


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def main():
    version = json.load(urllib.request.urlopen("https://valorant-api.com/v1/version", timeout=30))["data"]["version"]
    pt = {a["uuid"]: a for a in get("agents?isPlayableCharacter=true", "pt-BR")}
    en = {a["uuid"]: a for a in get("agents?isPlayableCharacter=true", "en-US")}
    agents = []
    for uuid, a in sorted(pt.items(), key=lambda kv: en[kv[0]]["displayName"]):
        e = en[uuid]
        abilities = []
        for slot_pt, slot_en in zip(a["abilities"], e["abilities"]):
            abilities.append({
                "tecla": KEYS.get(slot_pt["slot"], slot_pt["slot"]),
                "pt": {"nome": slot_pt["displayName"], "texto": slot_pt["description"]},
                "en": {"nome": slot_en["displayName"], "texto": slot_en["description"]},
            })
        order = ["C", "Q", "E", "X", "Passiva"]
        abilities.sort(key=lambda x: order.index(x["tecla"]) if x["tecla"] in order else 9)
        agents.append({
            "id": slug(e["displayName"]),
            "nome": e["displayName"],
            "codinome": a["developerName"],
            "funcao": {"pt": a["role"]["displayName"], "en": e["role"]["displayName"]},
            "bio": {"pt": a["description"], "en": e["description"]},
            "habilidades": abilities,
        })
    maps_pt = {m["uuid"]: m for m in get("maps", "pt-BR")}
    maps = []
    for m in get("maps", "en-US"):
        if not m.get("coordinates") or not m.get("tacticalDescription"):
            continue  # only the competitive and the range-like maps with a loading screen place
        internal = m["mapUrl"].rstrip("/").split("/")[-1]
        maps.append({
            "id": slug(m["displayName"]),
            "nome": {"pt": maps_pt[m["uuid"]]["displayName"], "en": m["displayName"]},
            "codinome": internal,
            "coordenadas": m["coordinates"],
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"versao": version, "agentes": agents, "mapas": sorted(maps, key=lambda m: m["nome"]["en"])}, ensure_ascii=False, indent=1) + "\n")
    print(f"{OUT.relative_to(ROOT)}: {len(agents)} agents, {len(maps)} maps ({version})")


if __name__ == "__main__":
    main()
