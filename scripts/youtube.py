"""The channel's YouTube, through the Data API: everything after the upload, which stays in Studio
(Google locks videos uploaded by an unverified app as private). See "After each live" in handoff/README.md.

    scripts/.venv/bin/python scripts/youtube.py auth             # once: signs in through the browser
    scripts/.venv/bin/python scripts/youtube.py playlists        # the channel's playlists and their ids
    scripts/.venv/bin/python scripts/youtube.py live <date>      # a live's video: see live()
    scripts/.venv/bin/python scripts/youtube.py live <date> --dry-run
    scripts/.venv/bin/python scripts/youtube.py video content/videos/<name>.json [--dry-run]   # a commented video or short

The OAuth client and the token live outside the repository, in %USERPROFILE%\\.config\\muanlartins
(youtube-client.json, youtube-token.json). Never commit or print them.
"""

import argparse
import json
import re
import sys
from pathlib import Path
import webbrowser
from io import BytesIO

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload

from content import LIVES, ROOT, brand_tables, clock, matches_by_id, seconds
from windows import CONFIG, VIDEOS

# Valorant's rank names by tier (3 is Iron 1), as live.py writes them.
VALORANT_TIERS = ["Ferro", "Bronze", "Prata", "Ouro", "Platina", "Diamante", "Ascendente", "Imortal"]

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]


CLIENT = CONFIG / "youtube-client.json"
TOKEN = CONFIG / "youtube-token.json"


def credentials(interactive=False) -> Credentials:
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES) if TOKEN.exists() else None
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    elif interactive:
        # In WSL, the sign-in page opens in Windows' browser; its redirect to localhost reaches us.
        webbrowser.register("windows", None, webbrowser.GenericBrowser(
            ["powershell.exe", "-NoProfile", "-Command", "Start-Process '%s'"]), preferred=True)
        flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT), SCOPES)
        creds = flow.run_local_server(port=0, authorization_prompt_message="Se o navegador não abrir, entre em: {url}",
                                      success_message="Pronto: pode fechar esta aba.")
    else:
        sys.exit("Sem token do YouTube: rode `youtube.py auth` uma vez.")
    TOKEN.write_text(creds.to_json())
    return creds


def youtube():
    return build("youtube", "v3", credentials=credentials(), cache_discovery=False)


def processed(video_id):
    """The video's length in seconds once YouTube has it whole (processed, on the channel); None before that."""
    items = youtube().videos().list(part="contentDetails,processingDetails,status", id=video_id).execute()["items"]
    if not items or items[0]["status"].get("uploadStatus") != "processed":
        return None
    if items[0].get("processingDetails", {}).get("processingStatus", "succeeded") != "succeeded":
        return None
    # ISO 8601, like PT2H17M13S.
    found = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", items[0]["contentDetails"]["duration"])
    d, h, m, s = (int(part or 0) for part in found.groups())
    return ((d * 24 + h) * 60 + m) * 60 + s


def auth(_):
    credentials(interactive=True)
    channel = youtube().channels().list(part="snippet", mine=True).execute()["items"][0]
    print(f"Conectado ao canal {channel['snippet']['title']}.")


def playlists(_):
    for item in all_playlists(youtube()):
        print(f"{item['id']}  {item['status']['privacyStatus']:<8} {item['contentDetails']['itemCount']:>3}  "
              f"{item['snippet']['title']}")


# --- A live's video ---------------------------------------------------------------------------------

SITE = "https://muanlartins.com.br"
THIS_LIVE = ("Esta live no site, com cada partida e a transcrição", f"{SITE}/canal/lives/{{date}}")
TWITCH = ("Ao vivo na Twitch", "https://www.twitch.tv/muanlartins")
# Each game's lives (content/lives/<date>.json's "game"): the name in the title, the line that says what the channel
# is, the links (Twitch first: the VOD is there to bring people to the next live), the playlist (made when it's
# missing), its privacy, the tags (YouTube weighs them little; they catch spellings and searches like "rocket league
# ao vivo") and three hashtags (YouTube shows the first three over the title).
GAMES = {
    "rocket-league": {
        "name": "Rocket League",
        "pitch": "Rocket League ranqueado ao vivo, em português, subindo de rank com método: cada partida medida e "
                 "explicada no site.",
        "links": [TWITCH,
                  THIS_LIVE,
                  ("Minhas ranqueadas", f"{SITE}/conteudo/rocket-league/ranked"),
                  ("Os fundamentos, organizados por rank", f"{SITE}/conteudo/rocket-league/fundamentals"),
                  ("Os fundamentos em vídeo", "https://www.youtube.com/playlist?list=PLPogzmM3roPc")],
        "playlist": "Rocket League ao vivo",
        "tags": ["rocket league", "rocket league ao vivo", "live de rocket league", "rocket league ranqueada",
                 "rocket league brasil", "rocket league pt-br", "rl ao vivo", "subindo de rank", "muanlartins"],
        "hashtags": "#RocketLeague #RocketLeagueBrasil #AoVivo",
    },
    "valorant": {
        "name": "Valorant",
        "pitch": "Valorant ao vivo, em português, aprendendo do Prata com método: cada partida medida no site, mira "
                 "treinada todo dia.",
        "links": [TWITCH,
                  THIS_LIVE,
                  ("Minhas competitivas", f"{SITE}/conteudo/valorant/ranked"),
                  ("Meu treino de mira", f"{SITE}/conteudo/valorant/aim")],
        "playlist": "Valorant ao vivo",
        "tags": ["valorant", "valorant ao vivo", "live de valorant", "valorant competitivo", "valorant brasil",
                 "valorant pt-br", "subindo de elo", "muanlartins"],
        "hashtags": "#Valorant #ValorantBrasil #AoVivo",
    },
}
# The lives' privacy on YouTube, and their playlists'. Unlisted until 2026-11-12 (0 to 3 views each: unlisted videos
# never show up in search or recommendations); public since, as a test Luan agreed to. YouTube judges each video by
# its own audience, so a long VOD few click gets fewer impressions without holding the shorts back; if the shorts'
# reach drops anyway, "unlisted" here and `youtube.py live <date>` for each live undoes it.
PRIVACY = "public"
GAMING = "20"
CAPTION_NAME = "Português (transcrição)"


def chapter_title(chapter, matches):
    if "title" in chapter:
        return chapter["title"]["pt"]
    match = matches[chapter["match"]]
    result = {"win": "Vitória", "loss": "Derrota"}.get(match["result"], "Empate")
    score = f" {match['score'][0]}–{match['score'][1]}" if match.get("score") else ""
    if "queue" in match:  # Valorant's: the map, and the RR in Competitivo
        rr = match.get("rr")
        rr = f" ({'+' if rr > 0 else '−'}{abs(rr)} RR)" if rr else ""
        return f"{result}{score} em {match['map']}{rr}" if match.get("map") else f"{result}{score}{rr}"
    overtime = " na prorrogação" if match.get("overtime") else ""
    points = match.get("points")
    points = f" ({'+' if points > 0 else '−'}{abs(points)})" if points else ""
    return f"{result}{score}{overtime} no {match['mode']}{points}"


def chapters(live, matches):
    """YouTube's rules: the first at 0:00, at least three, each at least 10 s long. Otherwise none."""
    listed = [(seconds(c["at"]), chapter_title(c, matches)) for c in live["chapters"]]
    kept = []
    for at, title in listed:
        if kept and at - kept[-1][0] < 10:
            kept[-1] = (kept[-1][0], title)
        else:
            kept.append((at, title))
    if len(kept) < 3 or kept[0][0] != 0:
        return []
    return [f"{clock(at)} {title}" for at, title in kept]


def record(live, matches):
    """The day's ranked or competitive matches, as (wins, losses)."""
    played = [matches[c["match"]] for c in live["chapters"] if "match" in c and c["match"] in matches]
    return sum(m["result"] == "win" for m in played), sum(m["result"] == "loss" for m in played), played


def default_title(live, game, rank_name, wins, losses):
    """A title that says what happened, when Luan hasn't written one (content/lives/<date>.json, youtube.title):
    the climb or the record first, the game after (front-loaded, under 70 characters)."""
    total = wins + losses
    if rank_name:
        return f"Subi pro {rank_name}! {wins} vitórias em {total} jogos | {game['name']} ao vivo"
    if total:
        queue = "competitivo" if game["name"] == "Valorant" else "ranqueado"
        return f"{wins} vitórias e {losses} derrotas no {queue} | {game['name']} ao vivo"
    return f"{game['name']} ao vivo"


def describe(date):
    """Title, description and tags of a live's video, from content/lives/<date>.json and brand/build.py."""
    live = json.loads((LIVES / f"{date}.json").read_text())
    ranks, lives = brand_tables()
    rank, tier = lives.get(date, (None, None))
    year, month, day = date.split("-")
    game = GAMES[live.get("game", "rocket-league")]
    matches = matches_by_id()
    wins, losses, played = record(live, matches)
    rank_name = f"{ranks[rank][0]} {tier}" if rank else None
    title = live.get("youtube", {}).get("title") or default_title(live, game, rank_name, wins, losses)

    marks = chapters(live, matches)
    lines = [live["summary"]["pt"], game["pitch"], ""]
    lines += [f"▶ {label}: {url.format(date=date)}" for label, url in game["links"]]
    if marks:
        lines += ["", "Capítulos", *marks]
    lines += ["", f"Live de {day}/{month}/{year}.", game["hashtags"]]

    # Rocket League's modes played: the matches', and any the summary names (a live without match chapters).
    modes = {m.get("mode") for m in played} - {None}
    modes = sorted(modes | set(re.findall(r"\b[1-4]v[1-4]\b", live["summary"]["pt"])))
    name = game["name"].lower()
    extra = [f"{name} {mode}" for mode in modes]
    if rank:
        extra += [f"{name} {ranks[rank][0].lower()}", f"{name} {ranks[rank][0].lower()} {tier}"]
    # Valorant's: the rank it ended at, and the agents and maps played, as people search them.
    last = next((m["rank"]["tier"] for m in reversed(played) if "queue" in m and isinstance(m.get("rank"), dict)), None)
    if last and last >= 3:
        extra.append(f"{name} {VALORANT_TIERS[min((last - 3) // 3, 7)].lower()}")
    extra += sorted({f"{name} {m[k].lower()}" for m in played for k in ("agent", "map") if m.get(k)})
    tags = game["tags"][:4] + extra + game["tags"][4:]
    # YouTube takes 500 characters of tags at most.
    while len(",".join(tags)) > 480:
        tags.pop(-2)
    return live, title, "\n".join(lines), tags


def srt(lines):
    """The transcript as SRT: each line lasts until the next, at most 6 s."""
    def stamp(t):
        ms = round(t * 1000)
        h, ms = divmod(ms, 3_600_000)
        m, ms = divmod(ms, 60_000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    blocks = []
    for i, (start, text) in enumerate(lines):
        end = min(lines[i + 1][0] if i + 1 < len(lines) else start + 4, start + 6)
        blocks.append(f"{i + 1}\n{stamp(start)} --> {stamp(max(end, start + 0.5))}\n{text}\n")
    return "\n".join(blocks)


def live(args):
    """Sets a live's video as the routine says: title, description with links and chapters, tags, Gaming,
    pt-BR, PRIVACY, not for kids, no altered content; the thumbnail from brand/; the playlist; and the
    whisper transcript as pt-BR captions."""
    record, title, description, tags = describe(args.date)
    video_id = record["video"]
    # thumb.py's (a frame of Luan and the hook) over build.py's plain plate.
    folder = ROOT / "brand" / "youtube" / "thumbnails"
    thumbnail = next((f for f in (folder / f"live-{args.date}.jpg", folder / f"live-{args.date}.png") if f.exists()),
                     folder / f"live-{args.date}.png")
    transcript = LIVES / f"{args.date}.transcript.json"
    print(f"Vídeo {video_id}  ({PRIVACY})\n\n{title}  ({len(title)} caracteres)\n\n{description}\n\n"
          f"Tags: {', '.join(tags)}\nThumbnail: {thumbnail.relative_to(ROOT)}\n"
          f"Playlist: {GAMES[record.get('game', 'rocket-league')]['playlist']} ({PRIVACY}, criada se faltar)\n")
    if args.dry_run:
        return

    api = youtube()
    items = api.videos().list(part="snippet,status", id=video_id).execute()["items"]
    if not items:
        sys.exit(f"O vídeo {video_id} não está no canal.")
    video = items[0]
    snippet = {**video["snippet"], "title": title, "description": description, "tags": tags, "categoryId": GAMING,
               "defaultLanguage": "pt-BR", "defaultAudioLanguage": "pt-BR"}
    snippet.pop("thumbnails", None)
    snippet.pop("localized", None)
    # An update replaces the whole part, so the status keeps what's there and changes only these.
    status = {key: value for key, value in video["status"].items()
              if key in ("embeddable", "license", "publicStatsViewable", "publishAt")}
    status.update(privacyStatus=PRIVACY, selfDeclaredMadeForKids=False, containsSyntheticMedia=False)
    api.videos().update(part="snippet,status", body={"id": video_id, "snippet": snippet, "status": status}).execute()
    print("Título, descrição, tags e status: ok")

    if thumbnail.exists():
        kind = "image/jpeg" if thumbnail.suffix == ".jpg" else "image/png"
        api.thumbnails().set(videoId=video_id, media_body=MediaFileUpload(str(thumbnail), mimetype=kind)).execute()
        print(f"Thumbnail: ok ({thumbnail.name})")
    else:
        print(f"Thumbnail: falta {thumbnail.relative_to(ROOT)} (rode brand/build.py)")

    name = GAMES[record.get("game", "rocket-league")]["playlist"]
    playlist = next((p for p in all_playlists(api) if p["snippet"]["title"] == name), None)
    if not playlist:
        # The lives kept whole, in pt-BR, as visible as the videos.
        playlist = api.playlists().insert(part="snippet,status", body={
            "snippet": {"title": name, "defaultLanguage": "pt-BR"}, "status": {"privacyStatus": PRIVACY}}).execute()
        print(f"Playlist “{name}”: criada ({PRIVACY})")
        # Just made, it's empty, and listing it right away answers 404 (YouTube takes a moment to find it).
        inside = []
    else:
        if playlist["status"]["privacyStatus"] != PRIVACY:
            api.playlists().update(part="snippet,status", body={
                "id": playlist["id"], "snippet": {k: v for k, v in playlist["snippet"].items()
                                                  if k in ("title", "description", "defaultLanguage")},
                "status": {"privacyStatus": PRIVACY}}).execute()
            print(f"Playlist “{name}”: agora {PRIVACY}")
        inside = api.playlistItems().list(part="id", playlistId=playlist["id"], videoId=video_id).execute()["items"]
    if not inside:
        api.playlistItems().insert(part="snippet", body={"snippet": {
            "playlistId": playlist["id"], "resourceId": {"kind": "youtube#video", "videoId": video_id}}}).execute()
    print(f"Playlist “{name}”: ok")

    if transcript.exists() and not args.no_captions:
        body = srt(json.loads(transcript.read_text())).encode()
        media = in_memory(body)
        existing = [c for c in api.captions().list(part="snippet", videoId=video_id).execute()["items"]
                    if c["snippet"]["name"] == CAPTION_NAME]
        if existing:
            api.captions().update(part="snippet", body={"id": existing[0]["id"], "snippet": existing[0]["snippet"]},
                                  media_body=media).execute()
        else:
            api.captions().insert(part="snippet", body={"snippet": {
                "videoId": video_id, "language": "pt-BR", "name": CAPTION_NAME, "isDraft": False}},
                media_body=media).execute()
        print("Legendas: ok")


def video(args):
    """Sets a commented video or a short from its record in content/videos/ (id, title, description, tags, and
    optionally thumbnail, playlist, privacy, and captions: an .srt under Videos, kept out of the repository since it
    has what he says, other players' names included): Gaming, pt-BR, not for kids, no altered content. Privacy stays
    as it is unless the record says otherwise."""
    record = json.loads(Path(args.record).read_text())
    video_id, tags = record["id"], record["tags"]
    when = f"agendado para {record['publish_at']}" if record.get("publish_at") else record.get("privacy", "privacidade como está")
    print(f"Vídeo {video_id}  ({when})\n\n{record['title']}\n\n"
          f"{record['description']}\n\nTags: {', '.join(tags)}\n")
    thumbnail = ROOT / record["thumbnail"] if record.get("thumbnail") else None
    captions_file = VIDEOS / record["captions"] if record.get("captions") else Path("/nonexistent")
    if args.dry_run:
        print(f"Thumbnail: {record.get('thumbnail', '—')} · playlist: {record.get('playlist', '—')} · "
              f"legendas: {captions_file.name if captions_file.exists() else '—'}")
        return
    api = youtube()
    items = api.videos().list(part="snippet,status", id=video_id).execute()["items"]
    if not items:
        sys.exit(f"O vídeo {video_id} não está no canal.")
    current = items[0]
    snippet = {**current["snippet"], "title": record["title"], "description": record["description"], "tags": tags,
               "categoryId": GAMING, "defaultLanguage": "pt-BR", "defaultAudioLanguage": "pt-BR"}
    snippet.pop("thumbnails", None)
    snippet.pop("localized", None)
    status = {key: value for key, value in current["status"].items()
              if key in ("embeddable", "license", "publicStatsViewable", "publishAt", "privacyStatus")}
    status.update(selfDeclaredMadeForKids=False, containsSyntheticMedia=False)
    if record.get("privacy"):
        status["privacyStatus"] = record["privacy"]
    # Scheduled: private until publish_at (ISO with offset, e.g. "2026-11-07T18:00:00-03:00"), then YouTube publishes it.
    if record.get("publish_at"):
        status.update(privacyStatus="private", publishAt=record["publish_at"])
    api.videos().update(part="snippet,status", body={"id": video_id, "snippet": snippet, "status": status}).execute()
    print("Título, descrição, tags e status: ok")
    if thumbnail:
        kind = "image/jpeg" if thumbnail.suffix == ".jpg" else "image/png"
        api.thumbnails().set(videoId=video_id, media_body=MediaFileUpload(str(thumbnail), mimetype=kind)).execute()
        print(f"Thumbnail: ok ({thumbnail.name})")
    if record.get("playlist"):
        playlist = next((p for p in all_playlists(api) if p["snippet"]["title"] == record["playlist"]), None)
        if not playlist:
            print(f"Playlist: não achei “{record['playlist']}”")
        else:
            inside = api.playlistItems().list(part="id", playlistId=playlist["id"], videoId=video_id).execute()["items"]
            if not inside:
                api.playlistItems().insert(part="snippet", body={"snippet": {
                    "playlistId": playlist["id"], "resourceId": {"kind": "youtube#video", "videoId": video_id}}}).execute()
            print(f"Playlist “{record['playlist']}”: ok")
    if captions_file.exists():
        media = in_memory(captions_file.read_bytes())
        existing = [c for c in api.captions().list(part="snippet", videoId=video_id).execute()["items"]
                    if c["snippet"]["name"] == CAPTION_NAME]
        if existing:
            api.captions().update(part="snippet", body={"id": existing[0]["id"], "snippet": existing[0]["snippet"]},
                                  media_body=media).execute()
        else:
            api.captions().insert(part="snippet", body={"snippet": {
                "videoId": video_id, "language": "pt-BR", "name": CAPTION_NAME, "isDraft": False}},
                media_body=media).execute()
        print("Legendas: ok")


def in_memory(data: bytes):
    return MediaIoBaseUpload(BytesIO(data), mimetype="application/octet-stream", resumable=False)


def all_playlists(api):
    request = api.playlists().list(part="snippet,status,contentDetails", mine=True, maxResults=50)
    while request:
        page = request.execute()
        yield from page["items"]
        request = api.playlists().list_next(request, page)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(required=True)
    commands.add_parser("auth").set_defaults(run=auth)
    commands.add_parser("playlists").set_defaults(run=playlists)
    command = commands.add_parser("live")
    command.add_argument("date", help="YYYY-MM-DD, as in content/lives/")
    command.add_argument("--dry-run", action="store_true", help="only show what would be set")
    command.add_argument("--no-captions", action="store_true")
    command.set_defaults(run=live)
    command = commands.add_parser("video")
    command.add_argument("record", help="content/videos/<name>.json")
    command.add_argument("--dry-run", action="store_true", help="only show what would be set")
    command.set_defaults(run=video)
    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
