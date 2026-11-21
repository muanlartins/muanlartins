"""A live's Rocket League replays on the site, for RLR: each ranked match that has one gets "Ver no RLR" on the ranked
record and on the live's page, opening muanlartins.com.br/rlr/?replay=/replays/<date>/<date>-NN.replay.

    python3 scripts/replays.py 2026-11-20            # what it would do
    python3 scripts/replays.py 2026-11-20 --apply    # do it
    python3 scripts/replays.py --todos --apply       # every day in Videos\\Lives with replays

videos.py --apply copies each match's replay to Videos\\Lives\\<date>\\Replays\\Partida NN - Vitória 5-4.replay. This
finds which of the day's matches each copy is (the replay's MatchGUID is the dock's match id; without it, videos.py's
way: the same goals, saved within 3 minutes of the end), numbered as videos.py numbers them, and with --apply:

- uploads it as <date>-NN.replay to the repository's prerelease `replays-<date>` ("Replays dd/mm"), made the first
  time as a draft and published once its files are up (they're too big for git: 20–35 MB a live). A file already
  there with the same content stays; a different one is replaced. The notes list each file and its match;
- writes `replay`, its path on the site (/replays/<date>/<date>-NN.replay), into the match in its session
  (content/matches/<id>.json), as the dock writes it; it goes out with the release.

Publishing the release, or its notes changing as files come in, runs .github/workflows/replays.yml, which copies the
files to the site's bucket under pt/replays/<date>/, served at https://muanlartins.com.br/replays/<date>/: RLR's own
origin, so RLR reads them without CORS. A release whose tag was made before that workflow was on main doesn't run it
(GitHub reads the workflow at the tag): then `gh workflow run replays.yml -f tag=replays-<date>`. Only CI touches S3.

Luan's decision (2026-11-21): the replays go out as they are, with the players' names inside, an exception to "no
other players' names" for these files only. The dock republishes a session only when it changes (a new match): if it
ever does after this, run it again. Never while live (the upload would compete with the stream), never deletes
anything in Videos, never prints the token.
"""

import argparse
import hashlib
import json
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aliados import day_matches, properties  # noqa: E402
from content import ROOT  # noqa: E402
from publicar import REPO, ao_vivo  # noqa: E402
from videos import LIVES, replay_of, saved_replay  # noqa: E402

SITE = "/replays"
RESULT = {"win": "Vitória", "loss": "Derrota"}


def gh(*args, body=None, check=True, paginate=False):
    """`gh api` with the CLI's sign-in; `body` goes as JSON. The answer as JSON (or its text with --jq), None when
    empty or, without `check`, on failure."""
    binary = shutil.which("gh") or str(Path.home() / ".local" / "bin" / "gh")
    command = [binary, "api", *(["--paginate"] if paginate else []), *args, *(["--input", "-"] if body is not None else [])]
    r = subprocess.run(command, input=json.dumps(body) if body is not None else None, capture_output=True, text=True, timeout=300)
    if r.returncode:
        if check:
            raise SystemExit(f"gh api {args[-1]}: {r.stderr.strip()[:300]}")
        return None
    if "--jq" in args:
        return r.stdout
    return json.loads(r.stdout) if r.stdout.strip() else None


def guid(path):
    """The match's id as the game wrote it in the replay (the dock keeps the same one), or None."""
    try:
        return properties(path).get("MatchGUID")
    except (ValueError, struct.error, UnicodeDecodeError, IndexError):
        return None


def label(number, match):
    a, b = match.get("score") or ("–", "–")
    return f"Partida {number:02d} · {RESULT.get(match['result'], match['result'])} {a}–{b}{' (prorrogação)' if match.get('overtime') else ''}"


def asset_name(date, number):
    return f"{date}-{number:02d}.replay"


def plan(date):
    """[(number, session file, match, its filed replay or None)] for the day's matches, numbered as videos.py names
    the replays; the session files as loaded; the filed replays that are no match's."""
    folder = LIVES / date / "Replays"
    files = sorted(folder.glob("*.replay")) if folder.exists() else []
    loaded, matches = day_matches(date)
    ids = {match["id"] for _, match in matches}
    guids = {path: guid(path) for path in files}
    by_id = {g: path for path, g in guids.items() if g in ids}
    found = {number: by_id[match["id"]] for number, (_, match) in enumerate(matches, 1) if match["id"] in by_id}
    # The rest the way videos.py filed them (a match the dock gave an id of its own, a replay that doesn't read).
    loose = [s for path in files if path not in found.values() and (s := saved_replay(path))]
    for number, (_, match) in enumerate(matches, 1):
        if number not in found and (path := replay_of(match, [s for s in loose if s[0] not in found.values()])):
            found[number] = path
    rows = [(number, file, match, found.get(number)) for number, (file, match) in enumerate(matches, 1)]
    return rows, loaded, [path for path in files if path not in found.values()]


def release(tag):
    """The release with this tag, a draft too (GitHub's tags endpoint skips drafts), or None."""
    found = gh(f"repos/{REPO}/releases/tags/{tag}", check=False)
    if found:
        return found
    ids = gh(f"repos/{REPO}/releases?per_page=100", "--jq", f'.[] | select(.tag_name == "{tag}") | .id', paginate=True).split()
    return gh(f"repos/{REPO}/releases/{ids[0]}") if ids else None


def notes(date, listed):
    """The release's notes: what it is, then each file with its match and the start of its sha256 (so a replaced
    file changes the notes too, and that edit runs the workflow)."""
    lines = [f"Os replays das partidas ranqueadas da live de {date[8:10]}/{date[5:7]}, como o jogo os salvou, pro RLR. "
             f"O site serve cada um em `{SITE}/{date}/` (`.github/workflows/replays.yml` copia daqui), e as partidas "
             f"no site abrem com \"Ver no RLR\". Feito por `scripts/replays.py`.", ""]
    lines += [f"- `{name}` · {text} · `{digest[:12]}`" for name, text, digest in listed]
    return "\n".join(lines) + "\n"


def publish(date, rows):
    """Uploads the day's replays to its prerelease, made and published when needed."""
    tag, name = f"replays-{date}", f"Replays {date[8:10]}/{date[5:7]}"
    current = release(tag)
    if current is None:
        current = gh("-X", "POST", f"repos/{REPO}/releases",
                     body={"tag_name": tag, "target_commitish": "main", "name": name, "body": "", "draft": True, "prerelease": True})
        print(f"release {tag}: rascunho criado")
    assets = {asset["name"]: asset for asset in current.get("assets", [])}
    listed, changed = [], False
    for number, _, match, path in rows:
        if not path:
            continue
        asset = asset_name(date, number)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        listed.append((asset, label(number, match), digest))
        there = assets.get(asset)
        if there and (there.get("digest") == f"sha256:{digest}" or (not there.get("digest") and there["size"] == path.stat().st_size)):
            continue
        if there:
            gh("-X", "DELETE", f"repos/{REPO}/releases/assets/{there['id']}")
            print(f"replace {asset}: outro conteúdo")
        gh("-X", "POST", f"https://uploads.github.com/repos/{REPO}/releases/{current['id']}/assets?name={asset}",
           "-H", "Content-Type: application/octet-stream", "--input", str(path))
        print(f"upload  {path.name}  →  {tag}/{asset}")
        changed = True
    body = notes(date, listed)
    if current.get("draft") or changed or current.get("body") != body or current.get("name") != name:
        # Publishing it (a draft until now) or changing its notes runs replays.yml, which copies the files to the site.
        gh("-X", "PATCH", f"repos/{REPO}/releases/{current['id']}", body={"name": name, "body": body, "draft": False, "prerelease": True})
        print(f"release {tag}: {'publicado' if current.get('draft') else 'notas atualizadas'}, {len(listed)} replays")
    else:
        print(f"release {tag}: já tinha os {len(listed)} replays")


def day(date, apply):
    rows, loaded, strays = plan(date)
    if not rows:
        print(f"{date}: nenhuma partida da live publicada (content/matches/)")
        return
    print(f"{date}:")
    for number, _, match, path in rows:
        target = f"{SITE}/{date}/{asset_name(date, number)}"
        if not path:
            print(f"  {label(number, match)}: sem replay")
            continue
        named = re.match(r"Partida (\d+)", path.name)
        odd = "" if named and int(named.group(1)) == number else f" (o arquivo diz {named.group(0) if named else path.name})"
        print(f"  {label(number, match)}: {path.name} → {target}{'' if match.get('replay') != target else ' (já na sessão)'}{odd}")
    for path in strays:
        print(f"  {path.name}: não é de nenhuma partida da sessão, fica de fora")
    if not apply or not any(path for *_, path in rows):
        return
    publish(date, rows)
    touched = set()
    for number, file, match, path in rows:
        target = f"{SITE}/{date}/{asset_name(date, number)}"
        if path and match.get("replay") != target:
            match["replay"] = target
            touched.add(file)
    for file in sorted(touched):
        # As the dock writes it (JSON.stringify with two spaces).
        file.write_text(json.dumps(loaded[file], ensure_ascii=False, indent=2) + "\n")
        print(f"  gravado {file.relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("date", nargs="?", help="YYYY-MM-DD, the live's day")
    parser.add_argument("--todos", action="store_true", help="every day in Videos\\Lives with a Replays folder")
    parser.add_argument("--apply", action="store_true", help="upload and write the sessions (without it, only show)")
    args = parser.parse_args()
    if bool(args.date) == args.todos:
        parser.error("um dia (YYYY-MM-DD) ou --todos")
    if args.apply and ao_vivo():
        raise SystemExit("O OBS está transmitindo: o upload disputaria a banda com a live. Roda depois.")
    days = sorted(p.parent.name for p in LIVES.glob("????-??-??/Replays")) if args.todos else [args.date]
    for date in days:
        day(date, args.apply)
    if not args.apply:
        print("\n(nada mudou: rode com --apply)")
    else:
        print("\nO site recebe os arquivos pelo workflow replays.yml (no publish ou na edição do release). Pra rodar à mão:"
              f"\n  gh workflow run replays.yml -f tag=replays-<data>")


if __name__ == "__main__":
    main()
