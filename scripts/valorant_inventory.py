"""Luan's Valorant inventory on the site: the skin on each weapon now and every skin and variant he owns.

    python3 scripts/valorant_inventory.py         # reads the game (Riot Client open, on the stream PC) and sends it
    python3 scripts/valorant_inventory.py --ver   # only prints what it read

With the Riot Client open it asks Valorant's own servers, with the tokens the client hands out (scripts/valorant.py,
kept in memory only), for his loadout (the skin and variant on each weapon) and what he owns (skin levels and
variants), and sends that to the profile API (infra/perfil, POST /canal/jogo) with the stream's key, the Σ key in
%USERPROFILE%\\.config\\muanlartins\\sigma-chave.txt. The inventory page reads it from there on every visit, so nothing
is committed. valorant.py does the same by itself when Valorant opens and after each match (`sync`).

The collection Luan is building isn't here: it's his dream loadout, which he edits on the inventory page signed in
with Twitch as the channel. The skins' names and art come from public/valorant/catalogo.json (valorant_catalogo.py).
"""

import argparse
import json
import os
import subprocess
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

from valorant import client, valorant_api
from windows import home

PROFILE_API = os.environ.get("PROFILE_API", "https://wtpv8afsak.execute-api.us-east-1.amazonaws.com")
SKIN_LEVELS = "e7c63390-eda7-46e0-bb7a-a6abdacd2433"
CHROMAS = "3ad1b2b2-acdb-4524-852f-954a76ddae0a"
REFRESH = 12 * 3600

_weapons: dict = {}
_last_sent: dict = {}
_one_at_a_time = threading.Lock()


def weapons():
    """Valorant's weapons by Riot's id, and each skin level's skin (valorant-api.com), fetched again twice a day."""
    if not _weapons or time.time() - _weapons["at"] > REFRESH:
        request = urllib.request.Request("https://valorant-api.com/v1/weapons", headers={"User-Agent": "muanlartins-site"})
        data = json.load(urllib.request.urlopen(request, timeout=60))["data"]
        _weapons.update(
            at=time.time(),
            ids={w["uuid"]: w["displayName"].lower() for w in data},
            levels={l["uuid"]: s["uuid"] for w in data for s in w["skins"] for l in s["levels"]},
        )
    return _weapons


def read_game():
    """Luan's loadout and what he owns, as the site keeps it; None when the Riot Client isn't open here."""
    found = client()
    if not found:
        return None
    puuid, ask = valorant_api(found)
    guns = ask(f"/personalization/v3/players/{puuid}/playerloadout")["Guns"]
    owned = lambda kind: {e["ItemID"].lower() for e in ask(f"/store/v1/entitlements/{puuid}/{kind}")["Entitlements"]}
    known = weapons()
    return {
        "lido": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "equipado": {known["ids"][g["ID"].lower()]: {"skin": g["SkinID"].lower(), "chroma": g["ChromaID"].lower()}
                     for g in guns if g["ID"].lower() in known["ids"]},
        "skins": sorted({known["levels"][level] for level in owned(SKIN_LEVELS) if level in known["levels"]}),
        "chromas": sorted(owned(CHROMAS)),
    }


def send(reading):
    key = (home() / ".config" / "muanlartins" / "sigma-chave.txt").read_text().strip()
    request = urllib.request.Request(f"{PROFILE_API}/canal/jogo", data=json.dumps(reading).encode(), method="POST",
                                     headers={"content-type": "application/json", "x-chave": key})
    return json.load(urllib.request.urlopen(request, timeout=20))


def sync(log=print):
    """Reads the game and sends it when something changed since the last time; quiet when Valorant isn't open."""
    if not _one_at_a_time.acquire(blocking=False):
        return
    try:
        reading = read_game()
        if not reading:
            return
        same = {k: v for k, v in reading.items() if k != "lido"}
        if same == _last_sent:
            return
        answer = send(reading)
        _last_sent.clear()
        _last_sent.update(same)
        log(f"inventário no site: {answer['armas']} armas, {answer['skins']} skins, {answer['chromas']} variantes")
    except (OSError, ValueError, KeyError, subprocess.SubprocessError, urllib.error.URLError) as error:
        log(f"inventário ainda não: {type(error).__name__}")
    finally:
        _one_at_a_time.release()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ver", action="store_true", help="only print what it read")
    args = parser.parse_args()
    try:
        reading = read_game()
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        raise SystemExit(f"O jogo não respondeu ({type(error).__name__}): abra o Valorant e tente de novo.")
    if not reading:
        raise SystemExit("O Riot Client não está aberto aqui: abra o Valorant.")
    if args.ver:
        print(json.dumps(reading, indent=1))
        return
    answer = send(reading)
    print(f"No site: {answer['armas']} armas, {answer['skins']} skins e {answer['chromas']} variantes, lido em {reading['lido']}.")


if __name__ == "__main__":
    main()
