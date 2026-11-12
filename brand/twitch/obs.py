"""Writes the OBS scene collection for the stream: the overlays in public/stream/ as browser sources,
laid out with the camera and the game, and transicao.webm as the stinger.

    python3 brand/twitch/obs.py [stinger path] [alerts URL] > muanlartins.json
    python3 brand/twitch/obs.py --apply --dry-run    # what --apply would add
    python3 brand/twitch/obs.py --apply              # adds what's new to Windows' OBS (close OBS first)

The stinger path is where transicao.webm sits on the streaming machine (OBS plays stingers from local
files only). The alerts URL is the Twitch Alerts Box's browser source (Creator Dashboard → Alerts →
Copy); it carries a token, so it is passed in rather than kept here, and without it the scenes have no
alerts. Import with Scene Collection → Import. Devices and the canvas below are Luan's OBS setup.

--apply merges instead of replacing: it adds to the collection OBS already has (and its secrets: the alerts URL,
the overlays' keys) only what's missing here — sources, scenes, items in existing scenes, transitions, hotkeys
not yet bound — and never changes or removes anything, but for the hotkeys in RETIRED, which it unbinds, the items in
RETIRED_ITEMS, which it takes out, and the settings in FILTER_SETTINGS and SOURCE_SETTINGS, which it makes sure of. It also copies the sound effects (brand/twitch/sons/) next
to the stinger and adds the "Efeitos", "Filtros" and "Anúncios" docks (and takes out the ones in RETIRED_DOCKS). OBS must
be closed: it rewrites these files when it exits.
"""
import json
import re
import shutil
import subprocess
import sys
import time
import uuid
import wave
from pathlib import Path

from obs_shorts import camera_framing

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
SITE = "https://muanlartins.com.br/stream"
FOLDER = "C:/Users/muanl/Documents/muanlartins-obs"
STINGER = ARGS[0] if ARGS else f"{FOLDER}/transicao.webm"
# With --apply, the alerts are the source OBS already has (its URL stays there): the new scenes just place it.
FROM_OBS = "(o do OBS)"
ALERTS = ARGS[1] if len(ARGS) > 1 else FROM_OBS if "--apply" in sys.argv else None
# The sounds' triggers play a silent file from here, next to the stinger (`--apply` writes it).
SOUNDS = f"{FOLDER}/sons"
# Rocket League's window, matched by executable (priority 2) so a title change doesn't lose it.
ROCKET_LEAGUE = "Rocket League (64-bit, DX11, Cooked):LaunchUnrealUWindowsClient:RocketLeague.exe"
VALORANT = "VALORANT  :UnrealWindow:VALORANT-Win64-Shipping.exe"
CAMERA = "Camera (NVIDIA Broadcast):"
MIC = "{0.0.1.00000000}.{1bd84196-0816-4f00-8c22-a2b3950b995a}"
# OBS's base canvas, the size of Luan's monitor and of the stream. The overlays are laid out at 1920×1080 and
# scale themselves to it.
CANVAS = (1920, 1080)
K = CANVAS[0] / 1920

# OBS enums: alignment flags (left 1, right 2, top 4, bottom 8) and bounds types.
TOP_LEFT = 5
# Audio tracks, recorded side by side for editing: everything, the microphone alone, the game alone, Discord alone.
# Track 5, "Live", is what the stream sends: everything plus the goal narrator, which stays out of the recording.
# (The profile streams track 5 and records 1 to 4: Settings → Output → Streaming/Recording.)
TRACK_ALL, TRACK_MIC, TRACK_GAME, TRACK_DISCORD, TRACK_LIVE = 1, 2, 4, 8, 16
EVERYWHERE = TRACK_ALL | TRACK_LIVE
MONITOR_AND_OUTPUT = 2
BOUNDS_NONE, BOUNDS_SCALE_INNER, BOUNDS_SCALE_OUTER = 0, 2, 3


def source(kind, name, settings, **extra):
    return {"id": kind, "versioned_id": kind, "name": name, "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, name)),
            "settings": settings, "enabled": True, "flags": 0, "mixers": EVERYWHERE, "volume": 1.0, "balance": 0.5,
            "muted": False, "monitoring_type": 0, "sync": 0, "hotkeys": {}, "private_settings": {}, **extra}


def browser(name, page, restart=False):
    return source("browser_source", name, {"url": f"{SITE}/{page}", "width": CANVAS[0], "height": CANVAS[1], "fps_custom": True,
                                            "fps": 60, "restart_when_active": restart, "shutdown": False, "css": ""})


def item(src, i, pos=(0, 0), bounds=None, crop=(0, 0, 0, 0)):
    """A scene item at `pos`; with `bounds`, the source is scaled to fill that box and cropped to it;
    `crop` (left, top, right, bottom) cuts the source first.
    Both are in the overlays' 1920×1080 pixels. OBS 31+ reads the *_rel fields (relative to the canvas,
    in units of half its height, from its centre); the absolute ones are written too, for older versions."""
    (x, y), (w, h) = [v * K for v in pos], [v * K for v in bounds or (0, 0)]
    half = CANVAS[1] / 2
    return {"name": src["name"], "source_uuid": src["uuid"], "id": i, "visible": True, "locked": False,
            "pos": {"x": x, "y": y}, "pos_rel": {"x": (x - CANVAS[0] / 2) / half, "y": (y - half) / half},
            "rot": 0.0, "scale": {"x": 1.0, "y": 1.0}, "scale_rel": {"x": 1.0, "y": 1.0},
            "scale_ref": {"x": CANVAS[0], "y": CANVAS[1]}, "align": TOP_LEFT,
            "bounds_type": BOUNDS_SCALE_OUTER if bounds else BOUNDS_NONE, "bounds_align": 0, "bounds_crop": bool(bounds),
            "bounds": {"x": w, "y": h}, "bounds_rel": {"x": w / half, "y": h / half},
            "crop_left": round(crop[0] * K), "crop_top": round(crop[1] * K), "crop_right": round(crop[2] * K),
            "crop_bottom": round(crop[3] * K),
            "scale_filter": "disable",
            "blend_method": "default", "blend_type": "normal", "private_settings": {}}


def scene(name, *items):
    return source("scene", name, {"id_counter": len(items), "custom_size": False,
                                  "items": [item(src, i + 1, **opts) for i, (src, opts) in enumerate(items)]})


# The VAR's replay: Source Record also keeps the game alone in a replay buffer (the last 20 s, through the same encoder
# as the game's file, so no encoder more), which the Efeitos dock saves on F8 as "Replay <date> <time> jogo.mkv" and
# scripts/replay.py serves to var.html. It runs once the game has been on screen since OBS opened.
REPLAY_JOGO = {"replay_buffer": True, "replay_duration": 20,
               "replay_filename_formatting": "Replay %CCYY-%MM-%DD %hh-%mm-%ss jogo"}


# The game also goes to a file of its own while recording, without camera or overlays (the Source Record plugin), for
# vertical shorts and commented videos; with its own sound. CQP 22: it's material for cuts, and space adds up daily.
def capture(name, window):
    return source("game_capture", name, {"capture_mode": "window", "window": window, "priority": 2, "capture_cursor": False,
                                         "allow_transparency": False, "capture_audio": True},
                  mixers=EVERYWHERE | TRACK_GAME, filters=[
        source("source_record_filter", "Gravar jogo", {
            "record_mode": 3, "path": "C:\\Users\\muanl\\Videos", "filename_formatting": "%CCYY-%MM-%DD %hh-%mm-%ss jogo",
            "rec_format": "mkv", "encoder": "nvenc", "rate_control": "CQP", "cqp": 22, "keyint_sec": 2, "preset2": "p5",
            "profile": "high", "different_audio": False, **REPLAY_JOGO}),
    ])


game = capture("Rocket League", ROCKET_LEAGUE)
# Valorant's scenes have their own capture (a source can't share a scene's name, hence not just "Valorant"), overlays
# and crowd, with ?jogo=valorant (the record from scripts/valorant.py, the chat under the killfeed); the camera goes
# on top, over the minimap (Luan's choice), so its frame is ?altura=cima. Made by hand on 2026-11-08, as here.
valorant = capture("Captura · Valorant", VALORANT)
# Stays on between scenes, so switching to one with the camera doesn't wait for it to start.
# It also goes to a file of its own at native resolution while recording (the Source Record plugin), with the
# microphone for syncing it to the main recording.
camera = source("dshow_input", "Câmera", {"video_device_id": CAMERA, "last_video_device_id": CAMERA,
                                         "deactivate_when_not_showing": False}, filters=[
    camera_framing(source),
    source("source_record_filter", "Gravar câmera", {
        "record_mode": 3, "path": "C:\\Users\\muanl\\Videos", "filename_formatting": "%CCYY-%MM-%DD %hh-%mm-%ss câmera",
        "rec_format": "mkv", "encoder": "nvenc", "rate_control": "CQP", "cqp": 18, "keyint_sec": 2, "preset2": "p5",
        "profile": "high", "different_audio": True, "audio_source": "Microfone"}),
])
# One scene per game, always with the chat (Luan, 2026-11-10: the scenes without it, "Jogo" and "Valorant", are gone,
# and Rocket League's is "RL + chat"). The overlays' sources keep the names they had.
game_chat_overlay = browser("Overlay · Jogo + chat", "jogo.html?chat=1")
chat_overlay = browser("Overlay · Conversa", "conversa.html")
valorant_chat_overlay = browser("Overlay · Valorant + chat", "jogo.html?chat=1&jogo=valorant&altura=cima")
# The crowd, over the game overlay; the dock sends it the goals and saves. Its sound is the goal narrator: on the
# stream only, and in Luan's headphones.
crowd = browser("Torcida", "torcida.html")
crowd["settings"]["reroute_audio"] = True
crowd.update(mixers=TRACK_LIVE, monitoring_type=MONITOR_AND_OUTPUT)
valorant_crowd = browser("Torcida · Valorant", "torcida.html?jogo=valorant")
valorant_crowd["settings"]["reroute_audio"] = True
valorant_crowd.update(mixers=TRACK_LIVE, monitoring_type=MONITOR_AND_OUTPUT)
# Live Pix: the band and the goal, over everything; its sound is the Pix voices, like the crowd's. One source in
# every scene that has the game or the talk, so an alert never plays twice: in Conversa (where a Pix "entre partidas"
# usually plays) it's cropped to the band and set on the camera's lower third. In Valorant's scenes the page moves its
# call and goal under the camera by itself (it knows the scene's name).
pix = browser("Pix", "pix.html")
pix["settings"]["reroute_audio"] = True
pix.update(mixers=TRACK_LIVE, monitoring_type=MONITOR_AND_OUTPUT)
# Where the talk scenes show pix.html: only its alert band (top: 132, centred), from x 410, where the call and the
# goal at its top left have ended (from 320 their edge showed as a sliver).
PIX_BAND = (410, 110, 410, 660)
pix_in_talk = (pix, {"pos": (154, 548), "crop": PIX_BAND})
# Restarts when shown, so its drawing starts over each time the scene goes live. No countdown (Luan, 2026-11-06).
starting = browser("Tela · Começando", "intervalo.html?tela=comecando", restart=True)
back = browser("Tela · Já volto", "intervalo.html?tela=volto")
# The end of the live: the credits rolling beside the camera, where Conversa has it, over the stand of everyone who
# watched (creditos.html, 2026-11-10; it was intervalo.html?tela=fim). Starts over each time it goes on air.
end = browser("Tela · Créditos", "creditos.html", restart=True)
# Twitch's Alerts Box, drawn by brand/twitch/alertas/: a band 168 px tall, centred in the source.
ALERTS_SIZE = (1100, 200)
alerts = ALERTS and source("browser_source", "Alertas", {"url": ALERTS, "width": ALERTS_SIZE[0], "height": ALERTS_SIZE[1],
                                                         "fps_custom": True, "fps": 60, "restart_when_active": False,
                                                         "shutdown": False, "css": "", "reroute_audio": True},
                                                monitoring_type=MONITOR_AND_OUTPUT)
# In the game, centred under the scoreboard; in Conversa, under the camera.
alerts_in_game = [(alerts, {"pos": (410, 130), "bounds": ALERTS_SIZE})] if alerts else []
alerts_in_talk = [(alerts, {"pos": (154, 800), "bounds": ALERTS_SIZE})] if alerts else []

# The game's sound comes with its capture. The rest of the computer is captured app by app, not as desktop audio,
# which would carry the game a second time; each has its own fader.
apps = [source("wasapi_process_output_capture", name, {"window": window, "priority": 2}, mixers=mixers)
        for name, window, mixers in (("Discord", "Discord:Chrome_WidgetWin_1:Discord.exe", EVERYWHERE | TRACK_DISCORD),
                                     ("Navegador", "Brave:Chrome_WidgetWin_1:brave.exe", EVERYWHERE))]
# Music (StreamBeats, cleared for Twitch and YouTube) goes to the stream only, never to the recording that becomes the
# YouTube VOD. Spotify's window is titled after the song, so it's matched by executable.
apps.append(source("wasapi_process_output_capture", "Spotify", {"window": "Spotify:Chrome_WidgetWin_1:Spotify.exe",
                                                                "priority": 2}, mixers=TRACK_LIVE))
mic = source("wasapi_input_capture", "Microfone", {"device_id": MIC}, mixers=EVERYWHERE | TRACK_MIC, filters=[
    # Noise is already removed by NVIDIA Broadcast, which the microphone goes through.
    source("compressor_filter", "Compressor", {"ratio": 4.0, "threshold": -18.0, "attack_time": 6, "release_time": 60,
                                               "output_gain": 0.0}),
    source("limiter_filter", "Limitador", {"threshold": -1.0, "release_time": 60}),
])

# --- Effects (the "Efeitos" dock, public/stream/efeitos.html) ---------------------------------------------------
# Hotkeys are OBS's own, so they work with the game focused: the F-row, which Rocket League leaves free but for F1
# (its console) and F10 (its stat graphs). F2 "Lance ruim", F3 "Terapia", F4 back to the scene before; the sounds
# palmas, uuuh and tambor on F5, F6 and F7, the VAR on F8. `--apply` refuses a key that OBS already uses for something else.
# F2 and F4 are triggers, so the dock picks the game's scene (Rocket League's or Valorant's); they were the scenes'
# own hotkeys until 2026-11-08, which RETIRED unbinds.
HOTKEYS = {"Terapia": "OBS_KEY_F3"}
RETIRED = {("Lance ruim", "OBSBasic.SelectScene", "OBS_KEY_F2"), ("Jogo + chat", "OBSBasic.SelectScene", "OBS_KEY_F4")}
# Sources taken out of a scene (and out of the collection, once no scene has them): the old end screen gave its place
# to the credits on 2026-11-10; the VAR's media source to var.html's own player on 2026-11-12.
RETIRED_ITEMS = {("Fim", "Tela · Fim"), ("VAR · Rocket League", "VAR · replay"), ("VAR · Valorant", "VAR · replay")}
# Settings `--apply` makes sure of on filters the collection already has (it only adds otherwise): the game's replay
# buffer for the VAR, on each capture's "Gravar jogo". Never change them while OBS records (the obs skill).
FILTER_SETTINGS = {("Rocket League", "Gravar jogo"): REPLAY_JOGO, ("Captura · Valorant", "Gravar jogo"): REPLAY_JOGO}
# And on sources it already has: the VAR's page plays the clip's sound since 2026-11-12, through OBS, in his headphones.
SOURCE_SETTINGS = {"Efeito · VAR": ({"reroute_audio": True}, {"monitoring_type": MONITOR_AND_OUTPUT})}


def trigger(name, key):
    """A hotkey the Efeitos dock answers: a media source playing a silent file, which `key` restarts. The dock hears the
    restart and plays the sound (the "Sons" browser source) or picks the scene. OBS plays every media source once when it
    loads it, so sounds kept in media sources all went off at once; this way that's silence."""
    return source("ffmpeg_source", name, {"local_file": f"{SOUNDS}/silencio.wav", "is_local_file": True, "looping": False,
                                          "restart_on_activate": False, "close_when_inactive": False,
                                          "clear_on_media_end": True, "hw_decode": False},
                  muted=True, hotkeys={"MediaSource.Restart": [{"key": key}]})


# tocador.html plays the sounds (public/stream/sons/), on every track and in Luan's headphones.
player = browser("Sons", "tocador.html")
player["settings"].update(width=64, height=64, fps=30, reroute_audio=True)
player.update(monitoring_type=MONITOR_AND_OUTPUT, volume=0.7)
sounds = [player] + [trigger(f"Som · {label}", key) for label, key in (
    ("Palmas", "OBS_KEY_F5"), ("Uuuh", "OBS_KEY_F6"), ("Tambor", "OBS_KEY_F7"))] + [
    trigger("Gatilho · Lance ruim", "OBS_KEY_F2"), trigger("Gatilho · Voltar ao jogo", "OBS_KEY_F4"),
    trigger("Gatilho · VAR", "OBS_KEY_F8")]
# "Lance ruim": the game's scene with the camera on top, which the dock zooms; the bars play each time, and the dock
# has "Sons" play the sting.
bad_play = browser("Efeito · Lance ruim", "lance.html", restart=True)
# "Terapia": water, breathing and music made by the page (so on every track, and in Luan's headphones); it starts
# over each time and stops off screen.
calm = browser("Tela · Terapia", "terapia.html", restart=True)
calm["settings"].update(reroute_audio=True, shutdown=True)
calm.update(monitoring_type=MONITOR_AND_OUTPUT)
# The VAR: var.html plays the clip the dock had OBS save (the game alone, REPLAY_JOGO above) in its own <video>, in the
# booth (the game's VAR scene, around the live camera) or as a mini player over the game scene, top right, where the
# chat is; its sound on the stream and in Luan's headphones (tracks 1 and 5, not the game's own track). The stand in
# referee kit is the game's own crowd source, so it keeps its people.
booth = browser("Efeito · VAR", "var.html")
booth["settings"]["reroute_audio"] = True
booth.update(monitoring_type=MONITOR_AND_OUTPUT)
in_var_camera = {"pos": (1344, 136), "bounds": (512, 288)}

# Hole positions match jogo.html and conversa.html.
# The camera filters (public/stream/filtros.html): one full-screen source just above the camera in every scene with
# it; the page reads the scene and draws the filtered camera in that scene's box (BOXES there mirrors these
# positions), clear while no filter is on. Served from WSL on localhost by "Filtros muanlartins.vbs" at login, since
# Phoenix's model stays off the site. OBS must start with --enable-media-stream for a page to open the camera.
filters = browser("Filtros", "filtros.html")
# Page permission 2 (read user information) lets it ask for the current scene when it loads, not only hear changes.
filters["settings"].update(url="http://localhost:8126/stream/filtros.html", fps=30, webpage_control_level=2)
# The abilities' sounds (sfx.js) go through OBS, to the stream and Luan's headphones like the Sons source's.
filters["settings"]["reroute_audio"] = True
filters.update(monitoring_type=MONITOR_AND_OUTPUT)
in_rocket_league = {"pos": (44, 740), "bounds": (480, 270)}
in_valorant = {"pos": (44, 44), "bounds": (480, 270)}
scenes = [
    scene("Começando", (starting, {})),
    scene("RL + chat", (game, {"bounds": (1920, 1080)}), (camera, in_rocket_league), (filters, {}),
          (game_chat_overlay, {}), (crowd, {}), *alerts_in_game, (pix, {}), (booth, {})),
    scene("Valorant + chat", (valorant, {"bounds": (1920, 1080)}), (camera, in_valorant), (filters, {}),
          (valorant_chat_overlay, {}), (valorant_crowd, {}), *alerts_in_game, (pix, {}), (booth, {})),
    scene("Conversa", (camera, {"pos": (64, 64), "bounds": (1280, 720)}), (filters, {}), (chat_overlay, {}), *alerts_in_talk, pix_in_talk),
    scene("Lance ruim", (game, {"bounds": (1920, 1080)}), (game_chat_overlay, {}), (crowd, {}), *alerts_in_game, (pix, {}),
          (camera, in_rocket_league), (bad_play, {})),
    scene("Lance ruim · Valorant", (valorant, {"bounds": (1920, 1080)}), (valorant_chat_overlay, {}), (valorant_crowd, {}),
          *alerts_in_game, (pix, {}), (camera, in_valorant), (bad_play, {})),
    scene("VAR · Rocket League", (camera, in_var_camera), (booth, {}), (crowd, {}), *alerts_in_game, (pix, {})),
    scene("VAR · Valorant", (camera, in_var_camera), (booth, {}), (valorant_crowd, {}), *alerts_in_game, (pix, {})),
    scene("Terapia", (camera, {"pos": (64, 64), "bounds": (560, 315)}), (filters, {}), (calm, {}), *alerts_in_talk,
          (pix, {"pos": (154, 760), "crop": PIX_BAND})),
    scene("Já volto", (back, {})),
    scene("Fim", (camera, {"pos": (64, 64), "bounds": (1280, 720)}), (filters, {}), (end, {})),
]
# Luan's choice: Discord stays out of the game and talk scenes (and so out of the recording's track 4 there), and the
# browser out of the game scenes; they're kept as hidden items, ready to switch on.
HIDDEN = {"RL + chat": {"Discord", "Navegador"}, "Conversa": {"Discord"},
          "Lance ruim": {"Discord", "Navegador"}, "Terapia": {"Discord"},
          "Valorant + chat": {"Discord", "Navegador"}, "Lance ruim · Valorant": {"Discord", "Navegador"},
          "VAR · Rocket League": {"Discord", "Navegador"}, "VAR · Valorant": {"Discord", "Navegador"}}
BREAKS = {"Começando", "Já volto", "Fim"}
for each in scenes:
    extra = apps + ([] if each["name"] in BREAKS else sounds)
    added = [item(app, each["settings"]["id_counter"] + n + 1) for n, app in enumerate(extra)]
    for one in added:
        one["visible"] = one["name"] not in HIDDEN.get(each["name"], set())
    each["settings"]["items"] += added
    each["settings"]["id_counter"] += len(extra)
    if each["name"] in HOTKEYS:
        each["hotkeys"] = {"OBSBasic.SelectScene": [{"key": HOTKEYS[each["name"]]}]}
# The game fills the screen keeping its aspect ratio rather than cropping.
for captured in scenes:
    if captured["settings"]["items"][0]["name"] not in (game["name"], valorant["name"]):
        continue
    captured["settings"]["items"][0]["bounds_type"] = BOUNDS_SCALE_INNER
    captured["settings"]["items"][0]["bounds_crop"] = False

# Software decoding: hardware VP9 decoders drop the alpha channel.
stinger = {"id": "obs_stinger_transition", "name": "muanlartins", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "stinger")),
           "settings": {"path": STINGER, "tp_type": 0, "transition_point": 600, "hw_decode": False}}
# The VAR's own stinger (public/stream/transicao-var.html, rendered to .webm by transicao.mjs; `--apply` copies it
# next to the other): the Efeitos dock sets it as the VAR scenes' override, in and out, by this name.
var_stinger = {"id": "obs_stinger_transition", "name": "VAR", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "stinger-var")),
               "settings": {"path": f"{FOLDER}/transicao-var.webm", "tp_type": 0, "transition_point": 600, "hw_decode": False}}
# "Lance ruim" comes in on a cut (its first frame is the game scene's) and "Terapia" on a slow fade: OBS's own cut
# and fade, which it names in its language and won't take from a collection, so the Efeitos dock finds them by kind
# and sets the two scenes' transition overrides each time it connects.

collection = {
    "name": "muanlartins",
    "current_scene": "Começando",
    "current_program_scene": "Começando",
    "scene_order": [{"name": s["name"]} for s in scenes],
    "sources": scenes + [game, valorant, camera, filters, game_chat_overlay, valorant_chat_overlay,
                         chat_overlay, crowd, valorant_crowd, pix, starting, back, end, bad_play, calm, booth] + apps + sounds
               + ([alerts] if alerts else []),
    "groups": [],
    "AuxAudioDevice1": mic,
    "transitions": [stinger, var_stinger],
    "current_transition": "muanlartins",
    "transition_duration": 1300,
    "quick_transitions": [],
    "saved_projectors": [],
    "preview_locked": False,
    "scaling_enabled": False,
    "modules": {},
    "resolution": {"x": CANVAS[0], "y": CANVAS[1]},
    "version": 2,
}

OBS = Path("/mnt/c/Users/muanl/AppData/Roaming/obs-studio")
# The collection OBS has open (Luan renamed it "Live" on 11-07), from its user.ini.
LIVE = OBS / "basic/scenes" / re.search(r"^SceneCollectionFile=(.+)$", (OBS / "user.ini").read_text(encoding="utf-8-sig"), re.M)[1].strip()
# The docks this adds: Efeitos and Anúncios (Twitch's ad breaks), from the site, and Filtros (the camera filters'
# switches), served from this working copy like filtros.html itself.
DOCKS = [
    ("Efeitos", f"{SITE}/efeitos.html"),
    ("Filtros", "http://localhost:8126/stream/filtros-painel.html"),
    ("Anúncios", f"{SITE}/anuncios.html"),
]
# Docks this takes out: "Ads", a local PowerShell server's page that Anúncios replaced (2026-11-11).
RETIRED_DOCKS = ["Ads"]


# Fields of sources OBS already has that `--apply` brings up to date (the rest stays as Luan left it): the camera
# filters' sound through OBS (2026-11-12).
SYNC = {"Filtros": {"settings": ["reroute_audio"], "fields": ["monitoring_type"]}}


def merge(live, new):
    """Adds to `live` what `new` has and it lacks; returns what was added, to print."""
    added = []
    by_name = {s["name"]: s for s in live["sources"]}
    ours = {s["name"]: s for s in new["sources"]}
    for name, what in SYNC.items():
        mine, want = by_name.get(name), ours.get(name)
        if not mine or not want:
            continue
        for key in what.get("settings", []):
            if mine["settings"].get(key) != want["settings"].get(key):
                mine["settings"][key] = want["settings"][key]
                added.append(f"{name}: {key}")
        for key in what.get("fields", []):
            if mine.get(key) != want.get(key):
                mine[key] = want[key]
                added.append(f"{name}: {key}")
    for name, action, key in RETIRED:
        hotkeys = (by_name.get(name) or {}).get("hotkeys") or {}
        if any(b.get("key") == key for b in hotkeys.get(action) or []):
            hotkeys[action] = [b for b in hotkeys[action] if b.get("key") != key]
            added.append(f"atalho {key.removeprefix('OBS_KEY_')} tirado de {name}")
    for s in new["sources"]:
        if s["name"] not in by_name:
            if s["settings"].get("url") == FROM_OBS:
                raise SystemExit("O OBS não tem a fonte Alertas: rode obs.py com a URL dos alertas para gerar a coleção inteira.")
            live["sources"].append(s)
            by_name[s["name"]] = s
            added.append(f"fonte {s['name']}")
    for scene_name, item_name in RETIRED_ITEMS:
        mine = by_name.get(scene_name)
        items = (mine or {}).get("settings", {}).get("items", [])
        if any(i["name"] == item_name for i in items):
            mine["settings"]["items"] = [i for i in items if i["name"] != item_name]
            added.append(f"{item_name} tirado da cena {scene_name}")
        used = any(i["name"] == item_name for s in live["sources"] if s["id"] == "scene" for i in s["settings"].get("items", []))
        if not used and item_name in by_name and item_name not in {s["name"] for s in new["sources"]}:
            live["sources"] = [s for s in live["sources"] if s["name"] != item_name]
            del by_name[item_name]
            added.append(f"fonte {item_name} removida")
    for (source_name, filter_name), wanted in FILTER_SETTINGS.items():
        for f in (by_name.get(source_name) or {}).get("filters") or []:
            if f["name"] != filter_name:
                continue
            for key, value in wanted.items():
                if f["settings"].get(key) != value:
                    f["settings"][key] = value
                    added.append(f"{source_name} · {filter_name}: {key} = {value}")
    for source_name, (settings, fields) in SOURCE_SETTINGS.items():
        mine = by_name.get(source_name)
        if not mine:
            continue
        for key, value in settings.items():
            if mine["settings"].get(key) != value:
                mine["settings"][key] = value
                added.append(f"{source_name}: {key} = {value}")
        for key, value in fields.items():
            if mine.get(key) != value:
                mine[key] = value
                added.append(f"{source_name}: {key} = {value}")
    uuids = {name: s["uuid"] for name, s in by_name.items()}
    for s in new["sources"]:
        if s["id"] != "scene":
            continue
        mine = by_name[s["name"]]
        items = mine["settings"].setdefault("items", [])
        for it in s["settings"]["items"]:
            it["source_uuid"] = uuids[it["name"]]
            if mine is s or any(i["name"] == it["name"] for i in items):
                continue
            mine["settings"]["id_counter"] = mine["settings"].get("id_counter", len(items)) + 1
            items.append({**it, "id": mine["settings"]["id_counter"]})
            added.append(f"{it['name']} na cena {s['name']}")
    for s in new["sources"]:
        for action, binding in (s.get("hotkeys") or {}).items():
            mine = by_name[s["name"]].setdefault("hotkeys", {})
            if not mine.get(action):
                mine[action] = binding
                added.append(f"atalho {binding[0]['key'].removeprefix('OBS_KEY_')} → {s['name']}")
        if s["id"] == "scene" and s.get("private_settings", {}).get("transition"):
            by_name[s["name"]].setdefault("private_settings", {}).setdefault("transition", s["private_settings"]["transition"])
            by_name[s["name"]]["private_settings"].setdefault("transition_duration", s["private_settings"]["transition_duration"])
    names = {t["name"] for t in live.get("transitions", [])}
    for t in new["transitions"]:
        if t["name"] not in names:
            live.setdefault("transitions", []).append(t)
            added.append(f"transição {t['name']}")
    order = {o["name"] for o in live.get("scene_order", [])}
    live["scene_order"] += [o for o in new["scene_order"] if o["name"] not in order]
    return added


def add_docks():
    """Our docks in OBS's custom browser docks, each with the websocket password in its URL (never printed).
    Returns what it changed."""
    ini = OBS / "user.ini"
    text = ini.read_text(encoding="utf-8-sig")
    line = re.search(r"^ExtraBrowserDocks=(.*)$", text, re.M)
    docks = json.loads(line.group(1)) if line else []
    retired = [d for d in docks if d.get("title") in RETIRED_DOCKS]
    docks = [d for d in docks if d not in retired]
    missing = [d for d in DOCKS if not any(have.get("title") == d[0] for have in docks)]
    if not missing and not retired:
        return []
    password = json.loads((OBS / "plugin_config/obs-websocket/config.json").read_text())["server_password"]
    docks += [{"title": title, "url": f"{url}#obs={password}", "uuid": str(uuid.uuid4())} for title, url in missing]
    value = "ExtraBrowserDocks=" + json.dumps(docks, ensure_ascii=False, separators=(",", ":"))
    # A function as the replacement, so re.sub leaves the value's backslashes alone.
    text = re.sub(r"^ExtraBrowserDocks=.*$", lambda _: value, text, count=1, flags=re.M) if line else text.replace("[BasicWindow]\n", f"[BasicWindow]\n{value}\n", 1)
    ini.write_text(text, encoding="utf-8")
    return [title for title, _ in missing] + [f"{d['title']} (tirado)" for d in retired]


def clashes(live):
    """Our hotkeys that OBS already gives to something else: a source in the collection or the profiles' own
    (start recording and the like, in each profile's basic.ini, read for its OBS_KEY_ lines only)."""
    ours = {b[0]["key"]: s["name"] for s in collection["sources"] for b in (s.get("hotkeys") or {}).values() if b}
    taken = []
    for s in live["sources"]:
        for action, binding in (s.get("hotkeys") or {}).items():
            for b in binding or []:
                if (s["name"], action, b.get("key")) in RETIRED:
                    continue
                if b.get("key") in ours and ours[b["key"]] != s["name"]:
                    taken.append(f"{b['key'].removeprefix('OBS_KEY_')}: {ours[b['key']]} × {s['name']} ({action})")
    for ini in sorted((OBS / "basic/profiles").glob("*/basic.ini")):
        for line in ini.read_text(encoding="utf-8-sig", errors="replace").splitlines():
            action = line.split("=", 1)[0]
            for key in re.findall(r'"key":\s*"(OBS_KEY_[A-Z0-9]+)"', line):
                if key in ours:
                    taken.append(f"{key.removeprefix('OBS_KEY_')}: {ours[key]} × {action} (perfil {ini.parent.name})")
    return taken


def apply(dry=False):
    live = json.loads(LIVE.read_text(encoding="utf-8"))
    if taken := clashes(live):
        raise SystemExit("Atalhos que o OBS já usa:\n" + "\n".join(taken) + "\nTroque as teclas em obs.py e rode de novo.")
    if dry:
        print("\n".join(merge(json.loads(LIVE.read_text(encoding="utf-8")), collection)) or "nada novo na coleção")
        print("(nada foi escrito: --dry-run)")
        return
    running = subprocess.run(["tasklist.exe", "/FI", "IMAGENAME eq obs64.exe"], capture_output=True, encoding="cp850").stdout
    if "obs64.exe" in running:
        raise SystemExit("O OBS está aberto: feche e rode de novo (ele reescreve esses arquivos ao sair).")
    stamp = time.strftime("%Y%m%d-%H%M%S")
    shutil.copy(LIVE, LIVE.with_name(f"{LIVE.name}.antes-{stamp}"))
    shutil.copy(OBS / "user.ini", OBS / f"user.ini.antes-{stamp}")
    live = json.loads(LIVE.read_text(encoding="utf-8"))
    added = merge(live, collection)
    LIVE.write_text(json.dumps(live, ensure_ascii=False, indent=4), encoding="utf-8")
    sons = Path("/mnt/c/Users/muanl/Documents/muanlartins-obs/sons")
    sons.mkdir(parents=True, exist_ok=True)
    with wave.open(str(sons / "silencio.wav"), "wb") as silence:  # the triggers' file: a tenth of a second
        silence.setnchannels(1), silence.setsampwidth(2), silence.setframerate(48000)
        silence.writeframes(bytes(2 * 4800))
    print("\n".join(added) or "nada novo na coleção")
    print(f"silêncio dos gatilhos em {sons}")
    var_webm = Path(__file__).resolve().parents[2] / "public/stream/transicao-var.webm"
    if var_webm.exists():
        shutil.copy(var_webm, sons.parent / var_webm.name)
        print(f"stinger do VAR copiado para {sons.parent}")
    print(f"docks: {', '.join(docks)}" if (docks := add_docks()) else "os docks já estavam lá")
    print(f"cópias de antes: {LIVE.name}.antes-{stamp}, user.ini.antes-{stamp}")


if "--apply" in sys.argv:
    apply(dry="--dry-run" in sys.argv)
else:
    json.dump(collection, sys.stdout, ensure_ascii=False, indent=2)
    print()
