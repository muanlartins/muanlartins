"""The chat bot's commands on StreamElements, and the Twitch panel's text, from public/stream/comandos.json: the one
list of every way to take part in the live from the chat (the site's /canal/comandos shows it too).

    python3 scripts/comandos.py            # what StreamElements has against the list: what --apply would change
    python3 scripts/comandos.py --apply    # create what's missing, update what differs
    python3 scripts/comandos.py --painel   # the "Comandos" panel's text, to paste under its picture on Twitch

Only the list's commands with a `resposta` are the bot's (the stand's are the overlay's). Each becomes
a StreamElements custom command: its name and `apelidos` without the "!", the answer as it is (${...} are
StreamElements' variables: customapi shows the Σ and profile APIs' plain-text answers, GET /sigma.txt and
GET /agenda.txt), open to everyone, `espera` as the cooldowns [per person, for everyone] in seconds. A command
StreamElements has that the list doesn't is listed and left alone: this never deletes.

Reading needs nothing (StreamElements' public list of the channel's commands); --apply needs the channel's JWT
token, from https://streamelements.com/dashboard/account/channels ("Show secrets"), saved as the only line of
%USERPROFILE%\\.config\\muanlartins\\streamelements-jwt.txt. It is never printed.

The panel's picture is brand/twitch/paineis/comandos.png (brand/build.py).
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content import ROOT  # noqa: E402

LIST = ROOT / "public" / "stream" / "comandos.json"
API = "https://api.streamelements.com/kappa/v2"
CHANNEL = "muanlartins"
# Twitch's limit for a panel's description.
PANEL_MAX = 1000


def token():
    from windows import CONFIG

    path = CONFIG / "streamelements-jwt.txt"
    if not path.exists():
        sys.exit(f"Sem o token do StreamElements: salve o JWT (streamelements.com/dashboard/account/channels, \"Show secrets\") em {path}")
    return path.read_text().strip()


def call(method, path, body=None, jwt=None):
    headers = {"Accept": "application/json", "User-Agent": "comandos.py"}
    if jwt:
        headers["Authorization"] = f"Bearer {jwt}"
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(f"{API}{path}", method=method, headers=headers,
                                     data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read() or "null")
    except urllib.error.HTTPError as e:
        sys.exit(f"StreamElements: {method} {path.split('?')[0]} → {e.code} {e.read()[:300].decode(errors='replace')}")


def wanted():
    """The bot's commands as StreamElements keeps them, by name."""
    commands = {}
    for group in json.loads(LIST.read_text())["grupos"]:
        for c in group["comandos"]:
            if "resposta" not in c:
                continue
            user, everyone = c.get("espera", [15, 5])
            name = c["comando"].removeprefix("!")
            commands[name] = {
                "command": name,
                "reply": c["resposta"],
                "aliases": [a.removeprefix("!") for a in c.get("apelidos", [])],
                "cooldown": {"user": user, "global": everyone},
                "accessLevel": 100,
                "type": "say",
                "enabled": True,
                "enabledOnline": True,
                "enabledOffline": True,
                "hidden": False,
            }
    return commands


# The fields this script sets; anything else on a command (its count, cost, keywords) stays as StreamElements has it.
FIELDS = ("reply", "aliases", "cooldown", "accessLevel", "type", "enabled", "enabledOnline", "enabledOffline", "hidden")


def differences(have, want):
    out = []
    for field in FIELDS:
        a, b = have.get(field), want[field]
        if field == "aliases":
            a, b = sorted(a or []), sorted(b)
        if field == "cooldown":
            a = {"user": (a or {}).get("user"), "global": (a or {}).get("global")}
        if a != b:
            out.append((field, a, b))
    return out


def panel():
    data = json.loads(LIST.read_text())
    lines = []
    for group in data["grupos"]:
        shown = " · ".join(c.get("uso", c["comando"]) for c in group["comandos"] if c["comando"] != "!comandos")
        lines.append(f"**{group['titulo']}**\n{shown}")
    reward = data["recompensas"]
    lines.append(f"**{reward['titulo']}**\n" + " · ".join(r["nome"] for r in reward["itens"]))
    lines.append(f"O que cada um faz, e como ganhar Σ: {data['pagina'].removeprefix('https://')}")
    text = "\n\n".join(lines)
    if len(text) > PANEL_MAX:
        sys.exit(f"O texto do painel passou de {PANEL_MAX} caracteres ({len(text)}): encurte a lista.")
    return text


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--apply", action="store_true", help="create and update the commands on StreamElements")
    parser.add_argument("--painel", action="store_true", help="print the Twitch panel's text")
    args = parser.parse_args()

    if args.painel:
        print(panel())
        return

    want = wanted()
    jwt = token() if args.apply else None
    if jwt:
        channel = call("GET", "/channels/me", jwt=jwt)["_id"]
        have = {c["command"]: c for c in call("GET", f"/bot/commands/{channel}", jwt=jwt)}
    else:
        channel = call("GET", f"/channels/{CHANNEL}")["_id"]
        # The public list has only the enabled ones: a disabled command there would show as missing (--apply sees it).
        have = {c["command"]: c for c in call("GET", f"/bot/commands/{channel}/public")}

    changes = 0
    for name, command in want.items():
        current = have.get(name)
        if not current:
            print(f"+ !{name}: {command['reply']}")
            changes += 1
            if args.apply:
                call("POST", f"/bot/commands/{channel}", command, jwt)
            continue
        diff = differences(current, command)
        if not diff:
            print(f"= !{name}")
            continue
        changes += 1
        print(f"~ !{name}")
        for field, a, b in diff:
            print(f"    {field}: {json.dumps(a, ensure_ascii=False)} → {json.dumps(b, ensure_ascii=False)}")
        if args.apply:
            call("PUT", f"/bot/commands/{channel}/{current['_id']}", {**{k: current[k] for k in current if k not in ("_id", "createdAt", "updatedAt")}, **command}, jwt)
    for name in sorted(set(have) - set(want)):
        print(f"? !{name}: no StreamElements, fora da lista (fica como está)")

    if not changes:
        print("\nO StreamElements já está igual à lista.")
    elif args.apply:
        print(f"\n{changes} comando(s) criados ou atualizados no StreamElements.")
    else:
        print(f"\n{changes} mudança(s). Rode com --apply para aplicar.")


if __name__ == "__main__":
    main()
