"""Valorant's art for the site: each agent's portrait and head, each map's banner, from valorant-api.com.

    python3 scripts/valorant_assets.py           # downloads what's missing, then writes the list
    python3 scripts/valorant_assets.py --todos   # downloads everything again

Riot's art (fan content under Riot's "Legal Jibber Jabber", credited under Valorant's pages), as valorant-api.com
mirrors it from the game: agents' fullPortrait (the corner of every Valorant page, 900 px tall) and displayIcon (their
head, for lists, 96 px), maps' listViewIcon (a wide banner, for match rows, 360 px wide). WebP, in public/valorant/,
named by a slug of the name (KAY/O → kayo). content/valorant-assets.json lists them for the site. A new agent or map
is one run away.
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "valorant"
LIST = ROOT / "content" / "valorant-assets.json"
FFMPEG = "ffmpeg"


def get(path):
    return json.load(urllib.request.urlopen(f"https://valorant-api.com/v1/{path}", timeout=30))["data"]


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def webp(url: str, target: Path, scale: str, again: bool):
    """The image at `url`, scaled by ffmpeg's `scale` filter, as WebP at `target`."""
    if target.exists() and not again:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".png") as raw:
        raw.write(urllib.request.urlopen(url, timeout=60).read())
        raw.flush()
        subprocess.run([FFMPEG, "-loglevel", "error", "-y", "-i", raw.name, "-vf", f"scale={scale}:flags=lanczos",
                        "-c:v", "libwebp", "-quality", "82", "-compression_level", "6", str(target)], check=True)
    print("  ", target.relative_to(ROOT), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--todos", action="store_true", help="download everything again")
    args = parser.parse_args()

    agents = []
    for agent in sorted(get("agents?isPlayableCharacter=true"), key=lambda a: a["displayName"]):
        name, id_ = agent["displayName"], slug(agent["displayName"])
        webp(agent["displayIcon"], OUT / "agentes" / f"{id_}.webp", "96:-1", args.todos)
        if agent.get("fullPortrait"):
            webp(agent["fullPortrait"], OUT / "agentes" / f"{id_}-retrato.webp", "-1:900", args.todos)
        agents.append({"name": name, "id": id_, "portrait": bool(agent.get("fullPortrait")),
                       "role": (agent.get("role") or {}).get("displayName")})

    maps = []
    for map_ in sorted(get("maps"), key=lambda m: m["displayName"]):
        if not map_.get("listViewIcon"):
            continue
        name, id_ = map_["displayName"], slug(map_["displayName"])
        webp(map_["listViewIcon"], OUT / "mapas" / f"{id_}.webp", "360:-1", args.todos)
        maps.append({"name": name, "id": id_, "code": map_["mapUrl"].rsplit("/", 1)[-1]})

    LIST.write_text(json.dumps({"agents": agents, "maps": maps}, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(agents)} agentes, {len(maps)} mapas → {LIST.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
