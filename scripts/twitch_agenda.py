"""Puts the lives' schedule (content/agenda.json) on the Twitch channel's calendar.

    python3 scripts/twitch_agenda.py            # what would change
    python3 scripts/twitch_agenda.py --apply    # change it

Each slot becomes one weekly segment per weekday, with its game's title and category (agenda.json's twitch).
Weekly segments that the agenda no longer has (that day, time, length and game) are
removed; one-off segments are left alone. The first run signs in with a code on twitch.tv/activate
(the site's Twitch app, scope channel:manage:schedule); the token lives outside the repository, in
%USERPROFILE%\\.config\\muanlartins\\twitch-agenda.json. Never commit or print it.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from content import ROOT
from windows import CONFIG

CLIENT_ID = "dploislenvijye1obbcm5dqxcxu5y1"  # lib/profile.ts
SCOPES = "channel:manage:schedule"
TOKEN = CONFIG / "twitch-agenda.json"
AGENDA = json.loads((ROOT / "content" / "agenda.json").read_text())


def post_form(url, **fields):
    request = urllib.request.Request(url, data=urllib.parse.urlencode(fields).encode())
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def sign_in():
    device = post_form("https://id.twitch.tv/oauth2/device", client_id=CLIENT_ID, scopes=SCOPES)
    print(f"Abra {device['verification_uri']} e autorize (código {device['user_code']}).")
    while True:
        time.sleep(device["interval"])
        try:
            return post_form("https://id.twitch.tv/oauth2/token", client_id=CLIENT_ID, scopes=SCOPES,
                             device_code=device["device_code"],
                             grant_type="urn:ietf:params:oauth:grant-type:device_code")
        except urllib.error.HTTPError as error:
            if "authorization_pending" not in error.read().decode():
                raise


def token():
    saved = json.loads(TOKEN.read_text()) if TOKEN.exists() else None
    if saved:
        try:
            saved = post_form("https://id.twitch.tv/oauth2/token", client_id=CLIENT_ID,
                              grant_type="refresh_token", refresh_token=saved["refresh_token"])
        except urllib.error.HTTPError:
            saved = None  # a public client's refresh token lasts 30 days
    saved = saved or sign_in()
    TOKEN.parent.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(json.dumps(saved))
    return saved["access_token"]


def helix(method, path, access, body=None, **query):
    url = f"https://api.twitch.tv/helix/{path}?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None,
                                     headers={"Client-Id": CLIENT_ID, "Authorization": f"Bearer {access}",
                                              "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read() or b"null")
    except urllib.error.HTTPError as error:
        if error.code == 404 and method == "GET":
            return None  # no schedule yet
        sys.exit(f"Twitch: {method} {path} → {error.code} {error.read().decode()}")


def wanted():
    """(ISO weekday, "HH:MM", minutes, game) for each segment the agenda asks for."""
    for slot in AGENDA["slots"]:
        start, end = (datetime.strptime(t, "%H:%M") for t in (slot["start"], slot["end"]))
        for day in slot["days"]:
            yield day, slot["start"], int((end - start).total_seconds() // 60), slot["game"]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="change the calendar (without it, only show)")
    args = parser.parse_args()

    zone = ZoneInfo(AGENDA["timeZone"])
    access = token()
    me = json.load(urllib.request.urlopen(urllib.request.Request(
        "https://id.twitch.tv/oauth2/validate", headers={"Authorization": f"OAuth {access}"})))
    broadcaster = me["user_id"]

    schedule = helix("GET", "schedule", access, broadcaster_id=broadcaster, first=25)
    segments = [s for s in ((schedule or {}).get("data", {}).get("segments") or []) if s["is_recurring"]]

    def key(segment):
        start = datetime.fromisoformat(segment["start_time"].replace("Z", "+00:00")).astimezone(zone)
        end = datetime.fromisoformat(segment["end_time"].replace("Z", "+00:00")).astimezone(zone)
        # The game by its category, so a slot that changes game is replaced.
        category = (segment.get("category") or {}).get("id")
        game = next((g for g, t in AGENDA["twitch"].items() if t["category"] == category), category)
        return start.isoweekday(), start.strftime("%H:%M"), int((end - start).total_seconds() // 60), game

    have = {key(segment): segment for segment in segments}
    want = set(wanted())
    names = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"]
    show = lambda k: f"{names[k[0]]} {k[1]} ({k[2]} min) {k[3]}"

    for k in sorted(have.keys() & want):
        print("mantém", show(k))
    for k in sorted(want - have.keys()):
        print("cria  ", show(k))
    for k in sorted(have.keys() - want):
        print("remove", show(k))
    if not args.apply:
        print("(nada mudou: rode com --apply)")
        return

    since = max(date.today() + timedelta(days=1), date.fromisoformat(AGENDA["since"]))
    for day, start, minutes, game in sorted(want - have.keys()):
        first = since + timedelta(days=(day - since.isoweekday()) % 7)
        at = datetime.combine(first, datetime.strptime(start, "%H:%M").time(), zone)
        helix("POST", "schedule/segment", access, broadcaster_id=broadcaster, body={
            "start_time": at.isoformat(), "timezone": AGENDA["timeZone"], "duration": str(minutes),
            "is_recurring": True, "category_id": AGENDA["twitch"][game]["category"], "title": AGENDA["twitch"][game]["title"],
        })
    for k in have.keys() - want:
        helix("DELETE", "schedule/segment", access, broadcaster_id=broadcaster, id=have[k]["id"])
    print("Agenda da Twitch atualizada.")


if __name__ == "__main__":
    main()
