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
RETIRED_ITEMS, the scenes in RETIRED_SCENES, the sources in RETIRED_SOURCES and the transitions in RETIRED_TRANSITIONS,
which it takes out, the settings in FILTER_SETTINGS, SOURCE_SETTINGS and SYNC, which it makes sure of, the place of the
items in PLACED in each scene, and "Lance ruim", which it makes a layer once (`layer`). It also turns the profiles'
Replay Buffer off, copies the sound effects (brand/twitch/sons/) next to the stinger and adds the "Efeitos", "Filtros" and "Anúncios" docks (and takes out the ones in RETIRED_DOCKS). OBS must
be closed: it rewrites these files when it exits.
"""
import json
import re
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

from obs_shorts import camera_framing

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
SITE = "https://muanlartins.com.br/stream"
FOLDER = "C:/Users/muanl/Documents/muanlartins-obs"
STINGER = ARGS[0] if ARGS else f"{FOLDER}/transicao.webm"
# With --apply, the alerts are the source OBS already has (its URL stays there): the new scenes just place it.
FROM_OBS = "(o do OBS)"
ALERTS = ARGS[1] if len(ARGS) > 1 else FROM_OBS if "--apply" in sys.argv else None
# The sounds' triggers play a file with no sound from here, next to the stinger (`--apply` copies it).
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


def item(src, i, pos=(0, 0), bounds=None, crop=(0, 0, 0, 0), scale_filter="disable", visible=True):
    """A scene item at `pos`; with `bounds`, the source is scaled to fill that box and cropped to it;
    `crop` (left, top, right, bottom) cuts the source first; `scale_filter` is OBS's (area, bicubic…); `visible`
    False keeps it hidden until something shows it.
    Both are in the overlays' 1920×1080 pixels. OBS 31+ reads the *_rel fields (relative to the canvas,
    in units of half its height, from its centre); the absolute ones are written too, for older versions."""
    (x, y), (w, h) = [v * K for v in pos], [v * K for v in bounds or (0, 0)]
    half = CANVAS[1] / 2
    return {"name": src["name"], "source_uuid": src["uuid"], "id": i, "visible": visible, "locked": False,
            "pos": {"x": x, "y": y}, "pos_rel": {"x": (x - CANVAS[0] / 2) / half, "y": (y - half) / half},
            "rot": 0.0, "scale": {"x": 1.0, "y": 1.0}, "scale_rel": {"x": 1.0, "y": 1.0},
            "scale_ref": {"x": CANVAS[0], "y": CANVAS[1]}, "align": TOP_LEFT,
            "bounds_type": BOUNDS_SCALE_OUTER if bounds else BOUNDS_NONE, "bounds_align": 0, "bounds_crop": bool(bounds),
            "bounds": {"x": w, "y": h}, "bounds_rel": {"x": w / half, "y": h / half},
            "crop_left": round(crop[0] * K), "crop_top": round(crop[1] * K), "crop_right": round(crop[2] * K),
            "crop_bottom": round(crop[3] * K),
            "scale_filter": scale_filter,
            "blend_method": "default", "blend_type": "normal", "private_settings": {}}


def scene(name, *items):
    return source("scene", name, {"id_counter": len(items), "custom_size": False,
                                  "items": [item(src, i + 1, **opts) for i, (src, opts) in enumerate(items)]})


# No replay buffer on the game's file since 2026-11-24: it kept the last 20 s for the VAR, which Luan retired then
# ("não acho que ele esteja funcionando bem"), with OBS's own Replay Buffer (`apply` turns it off in the profiles).
SEM_REPLAY = {"replay_buffer": False}
# The Source Record files' encoder, light (2026-11-18): the RTX 4070 has one video encoder, and each 1080p60 encode at
# OBS's default p5 took ~21-24% of it; with the stream, the recording, two "Gravar jogo" and the camera's, the live lost
# 26.7% of its frames to encoding lag. Measured per 1080p60 encode (ffmpeg's h264_nvenc, CQP 22): p5 21%, p4 13%,
# p3 8%, p1/p2 6%. At CQP the passes, the look-ahead and AQ buy little (they steer a bitrate there isn't), so these go
# p4, single pass; the stream keeps p5 with its passes. OBS's NVENC (obs_nvenc_*_tex) reads "preset" and
# "adaptive_quantization": the old encoder's "preset2" and "psycho_aq" were never read, so p5 was only the default.
ENCODER_LEVE = {"preset": "p4", "multipass": "disabled", "lookahead": False, "adaptive_quantization": False}


# The game's file in AV1 since 2026-11-27 (the main recording too, the profile's RecEncoder): a 3h live wrote ~200 GB in
# H.264 and C:'s SSD slowed to ~20 MB/s as it filled, freezing the game late in the lives. Measured on a live's
# Rocket League: NVENC AV1 at the same CQP (OBS multiplies AV1's by 4) 56% of the size, the encoder's load the same
# (~17% at p4). The RLR studio plays it in the browser (HEVC it might not). The camera's stays H.264 (8 GB a live).
SOURCE_RECORD_AV1 = {"encoder": "nvenc_av1", "profile": "main"}


# The game also goes to a file of its own while recording, without camera or overlays (the Source Record plugin), for
# vertical shorts and commented videos; with its own sound. CQP 22: it's material for cuts, and space adds up daily.
def capture(name, window=None):
    """A game's window, or (no `window`) whatever game is fullscreen in front: OBS's "any fullscreen application"."""
    what = {"capture_mode": "window", "window": window, "priority": 2} if window else {"capture_mode": "any_fullscreen"}
    return source("game_capture", name, {**what, "capture_cursor": False, "allow_transparency": False, "capture_audio": True},
                  mixers=EVERYWHERE | TRACK_GAME, filters=[
        source("source_record_filter", "Gravar jogo", {
            "record_mode": 3, "path": "C:\\Users\\muanl\\Videos", "filename_formatting": "%CCYY-%MM-%DD %hh-%mm-%ss jogo",
            "rec_format": "mkv", "rate_control": "CQP", "cqp": 22, "keyint_sec": 2,
            "different_audio": False, **SOURCE_RECORD_AV1, **ENCODER_LEVE, **SEM_REPLAY}),
    ])


game = capture("Rocket League", ROCKET_LEAGUE)
# Valorant's scenes have their own capture (a source can't share a scene's name, hence not just "Valorant"), overlays
# and crowd, with ?jogo=valorant (the record from scripts/valorant.py, the chat under the killfeed); the camera goes
# on top, over the minimap (Luan's choice), so its frame is ?altura=cima. Made by hand on 2026-11-08, as here.
valorant = capture("Captura · Valorant", VALORANT)
# Any other game (Luan, 2026-11-14): one scene for them all, "Diversos + chat", with nothing of a game's own: no rank
# or record (palco.html?jogo=diversos) and a stand that cheers no goals or rounds (?jogo=diversos).
# Its capture takes whatever game is fullscreen or borderless in front, so a new game needs no setup (a windowed one
# is picked in the capture's properties).
# Celeste needs nothing more here: its overlay (jogo=diversos) shows the chapter and its numbers by itself while the
# game's mod is connected (celeste.js, scripts/celeste-mod/), and the Filtros dock's "Celeste" follows the game.
various = capture("Captura · Diversos")
# Stays on between scenes, so switching to one with the camera doesn't wait for it to start. Off the air it's off
# altogether since 2026-11-20: the Efeitos dock presses its Activate/Deactivate button as the stream and the recording
# start and stop (cameraSoNoAr in efeitos.html), so OBS left open doesn't keep the webcam and its lamp on.
# It also goes to a file of its own at native resolution while recording (the Source Record plugin), with the
# microphone for syncing it to the main recording.
camera = source("dshow_input", "Câmera", {"video_device_id": CAMERA, "last_video_device_id": CAMERA,
                                         "deactivate_when_not_showing": False}, filters=[
    camera_framing(source),
    source("source_record_filter", "Gravar câmera", {
        "record_mode": 3, "path": "C:\\Users\\muanl\\Videos", "filename_formatting": "%CCYY-%MM-%DD %hh-%mm-%ss câmera",
        "rec_format": "mkv", "encoder": "nvenc", "rate_control": "CQP", "cqp": 18, "keyint_sec": 2, "profile": "high",
        "different_audio": True, "audio_source": "Microfone", **ENCODER_LEVE}),
])
# One scene per game, always with the chat (Luan, 2026-11-10: the scenes without it, "Jogo" and "Valorant", are gone,
# and Rocket League's is "RL + chat"). The overlays' sources keep the names they had.
# Every game is framed since 2026-11-23, as Celeste's scene was the day before (Luan: "copiar isso pros outros jogos",
# one layout, and room for the stand): the game shrunk to 1600×900 at (320, 0), and palco.html the Klein ground around
# it, with a column on the left (Pix's call and goal, the chat, the keyboard and the mouse, the camera) and a band under
# the game (the game's plate and numbers, the stand). Nothing over the game but the moments. Until then the camera, the
# chat and the stand sat over the game (jogo.html, which the commented videos keep), Valorant's camera on its minimap.
# The keyboard and the mouse (?teclas=1, from scripts/teclas.ps1; ErikMD's idea, 2026-11-20) are over the camera;
# ?jogo= picks the game's keys and its plate.
game_chat_overlay = browser("Overlay · Jogo + chat", "palco.html?teclas=1")
chat_overlay = browser("Overlay · Conversa", "conversa.html")
valorant_chat_overlay = browser("Overlay · Valorant + chat", "palco.html?jogo=valorant&teclas=1")
various_chat_overlay = browser("Overlay · Diversos + chat", "palco.html?jogo=diversos&teclas=1")


def stand(name, page):
    """The crowd, over the game overlay; the dock sends it the goals and saves. Its sound is the goal narrator: on the
    stream only, and in Luan's headphones."""
    crowd = browser(name, page)
    crowd["settings"]["reroute_audio"] = True
    crowd.update(mixers=TRACK_LIVE, monitoring_type=MONITOR_AND_OUTPUT)
    return crowd


crowd = stand("Torcida", "torcida.html")
valorant_crowd = stand("Torcida · Valorant", "torcida.html?jogo=valorant")
various_crowd = stand("Torcida · Diversos", "torcida.html?jogo=diversos")
# Celeste's overlay (Luan, 2026-11-22, made during its first live), the first framed one: Celeste's 320×180 five
# screen pixels to each in the 1600×900 (OBS's Area filter keeps them whole from a 1920×1080 window too: six to five).
# Diversos' without the keyboard. It had its own scene, "Celeste + chat · Diversos", until 2026-11-24; now it's
# Celeste in Jogo (below), on Diversos' capture.
celeste_overlay = browser("Overlay · Celeste + chat", "palco.html?jogo=celeste")
# Where the game scenes put the game, the stand (its page draws it from 596 to 1556: moved 348 px right, it's 944 to
# 1904, in palco.html's band beside the game's plate and numbers) and the camera, as tall as the old 480×270, so Luan
# is as big, cropped at the sides.
GAME_AT = {"pos": (320, 0), "bounds": (1600, 900), "scale_filter": "area"}
STAND_AT = {"pos": (348, 0)}
in_frame = {"pos": (16, 774), "bounds": (288, 270)}
# Live Pix: the band and the goal, over everything; its sound is the Pix voices, like the crowd's. One source in
# every scene that has the game or the talk, so an alert never plays twice: in Conversa (where a Pix "entre partidas"
# usually plays) it's cropped to the band and set on the camera's lower third, shrunk to its width (1024 since
# 2026-11-20). In the game scenes the page moves its call and goal into palco.html's column by itself (it knows the
# scene's name).
pix = browser("Pix", "pix.html")
pix["settings"]["reroute_audio"] = True
# Page permission 2 (read user information), so pix.html asks OBS for the scene on screen when it loads: with OBS's
# default it learned it only from the next scene change, and until then put its corner outside the game scenes' column
# (wider, over the game and the chat's top; seen 2026-11-24).
pix["settings"]["webpage_control_level"] = 2
pix.update(mixers=TRACK_LIVE, monitoring_type=MONITOR_AND_OUTPUT)
# Where the talk scenes show pix.html: only its alert band (top: 132, centred), from x 410, where the call and the
# goal at its top left have ended (from 320 their edge showed as a sliver).
PIX_BAND = (410, 110, 410, 660)
pix_in_talk = (pix, {"pos": (64, 360), "crop": PIX_BAND, "bounds": (1024, 289)})
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
# In the game, centred under the scoreboard (the framed game's centre is x 1120); in Conversa, on the camera's top
# third, shrunk to its width (under the camera until 2026-11-20, where the topic and the minigames are now), clear of
# the Pix band on its lower third.
alerts_in_frame = [(alerts, {"pos": (570, 130), "bounds": ALERTS_SIZE})] if alerts else []
alerts_in_talk = [(alerts, {"pos": (64, 70), "bounds": (1024, 186)})] if alerts else []
# In Terapia, centred at the bottom (over the step's word while one plays), like its Pix band.
alerts_in_calm = [(alerts, {"pos": (410, 830), "bounds": ALERTS_SIZE})] if alerts else []
PIX_IN_CALM = {"pos": (410, 740), "crop": PIX_BAND}

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
# palmas, uuuh and tambor on F5, F6 and F7 (F8 was the VAR's until 2026-11-24). `--apply` refuses a key that OBS already
# uses for something else. F2 and F4 are triggers, so the dock decides what they do; they were the scenes' own hotkeys
# until 2026-11-08, which RETIRED unbinds.
HOTKEYS = {"Terapia": "OBS_KEY_F3"}
RETIRED = {("Lance ruim", "OBSBasic.SelectScene", "OBS_KEY_F2"), ("Jogo + chat", "OBSBasic.SelectScene", "OBS_KEY_F4")}
# Sources taken out of a scene (and out of the collection, once no scene has them): the old end screen gave its place
# to the credits on 2026-11-10; the VAR's media source to var.html's own player on 2026-11-12.
# On 2026-11-20 the duel left the game scenes and the race its own source: both play in Conversa's overlay, taking turns.
RETIRED_ITEMS = {("Fim", "Tela · Fim"), ("RL + chat", "Duelo"), ("Valorant + chat", "Duelo"), ("Diversos + chat", "Duelo"),
                 ("Conversa", "Corrida")}
# Whole scenes, sources and transitions taken out: the VAR (2026-11-24, retired by Luan) with its booth, var.html, F8's
# trigger and its stinger.
RETIRED_SCENES = {"VAR"}
RETIRED_SOURCES = {"Efeito · VAR", "Gatilho · VAR", "VAR · replay"}
RETIRED_TRANSITIONS = {"VAR"}
# Settings `--apply` makes sure of on filters the collection already has (it only adds otherwise): no replay buffer on
# each capture's "Gravar jogo" (the VAR's, until 2026-11-24), and the light encoder on every Source Record filter. Never
# change them while OBS records (the obs skill). Which "Gravar jogo" is on is the Efeitos dock's: only the game on screen's.
FILTER_SETTINGS = {(name, "Gravar jogo"): {**SOURCE_RECORD_AV1, **ENCODER_LEVE, **SEM_REPLAY}
                   for name in ("Rocket League", "Captura · Valorant", "Captura · Diversos")}
FILTER_SETTINGS[("Câmera", "Gravar câmera")] = ENCODER_LEVE
# And on sources it already has: the game overlays' URLs (no key in them): the keyboard and the mouse since 2026-11-20
# (the chat under the ball duel, ?duelo=1, from 2026-11-15 until then).
SOURCE_SETTINGS = {"Pix": ({"webpage_control_level": 2}, {}),
                   **{overlay["name"]: ({"url": overlay["settings"]["url"]}, {}) for overlay in
                      (game_chat_overlay, various_chat_overlay, valorant_chat_overlay, celeste_overlay)}}


def trigger(name, key):
    """A hotkey the Efeitos dock answers: a media source playing gatilho.webm, which `key` restarts. The dock hears the
    restart and plays the sound (the "Sons" browser source) or picks the scene. OBS plays every media source once when it
    loads it, so sounds kept in media sources all went off at once; this way that's nothing. The file has no sound at
    all, only a tenth of a second of a transparent 16×16 picture: the silent WAV the triggers had until 2026-11-11
    came back with stale timestamps after minutes unplayed, and OBS raised its audio buffering to the maximum
    ("Max audio buffering reached!" in its log), which left the Source Record files' sound (Câmera.mkv, Jogo.mp4)
    ~0.93 s late behind their picture until OBS was closed; the stream and the recording stayed in step."""
    return source("ffmpeg_source", name, {"local_file": f"{SOUNDS}/gatilho.webm", "is_local_file": True, "looping": False,
                                          "restart_on_activate": False, "close_when_inactive": False,
                                          "clear_on_media_end": True, "hw_decode": False},
                  muted=True, hotkeys={"MediaSource.Restart": [{"key": key}]})


# tocador.html plays the sounds (public/stream/sons/), on every track and in Luan's headphones.
player = browser("Sons", "tocador.html")
player["settings"].update(width=64, height=64, fps=30, reroute_audio=True)
player.update(monitoring_type=MONITOR_AND_OUTPUT, volume=0.7)
sounds = [player] + [trigger(f"Som · {label}", key) for label, key in (
    ("Palmas", "OBS_KEY_F5"), ("Uuuh", "OBS_KEY_F6"), ("Tambor", "OBS_KEY_F7"))] + [
    trigger("Gatilho · Lance ruim", "OBS_KEY_F2"), trigger("Gatilho · Voltar ao jogo", "OBS_KEY_F4")]
# "Lance ruim": a layer hidden at the top of Jogo (below), the camera and its filters in their frame with lance.html's
# bars over them; the dock shows it, zooms that camera to the whole screen while the filters make Luan Sigma, and hides
# it. The bars play each time it comes on, and the dock has "Sons" play the sting.
bad_play = browser("Efeito · Lance ruim", "lance.html", restart=True)
# "Terapia": water, breathing and music made by the page (so on every track, and in Luan's headphones); it starts
# over each time and stops off screen. Laid out around the middle since 2026-11-14 (a short's centre cut keeps it):
# the camera under the page, seen through the breathing circle (centre 960, 500), its face on the circle's centre.
calm = browser("Tela · Terapia", "terapia.html", restart=True)
calm["settings"].update(reroute_audio=True, shutdown=True)
calm.update(monitoring_type=MONITOR_AND_OUTPUT)
# The ball duel (duelo.html, 2026-11-15) and the marble race (corrida.html, 2026-11-17), Lucca's ideas: since
# 2026-11-20 (Luan: the game scenes were getting crowded) both play in Conversa, taking turns in one box under the
# camera, inside its overlay (conversa.html holds each in an iframe); until then the duel had a source of its own in the
# game scenes' top right corner and the race one in Conversa ("Duelo", "Corrida", RETIRED_ITEMS). They record each
# fight and race shown while the stream is on (the Σ API's POST /duelo and /corrida) with the stand's Σ key, which
# Conversa's overlay now carries in its URL (#chave=…) and hands them.
# Sources OBS got before they needed the stand's Σ key, and the stand's page they take it from (never printed).
NEEDS_KEY = {"Overlay · Conversa": "torcida.html"}

# Hole positions match palco.html and conversa.html.
# The camera filters (public/stream/filtros.html): the filtered camera at the camera's own 1280×720, clear while no
# filter is on, one source just above the camera in every scene with it and placed over it like the camera itself
# (filters_at), so during a transition each scene shows it in its own box. (Until 2026-11-13 it was full screen and
# the page moved its box when OBS said the scene changed, which OBS says only once a transition ends: right after the
# stinger the game scene showed the filter in the talk scene's box.) Served from WSL on localhost by "Filtros
# muanlartins.vbs" at login, since Phoenix's model stays off the site. OBS must start with --enable-media-stream for a
# page to open the camera.
filters = browser("Filtros", "filtros.html")
# Page permission 2 (read user information), kept from when the page asked for the current scene.
# At 60 fps like the camera (at 30 until 2026-11-12, the filtered camera stepped beside OBS's own).
filters["settings"].update(url="http://localhost:8126/stream/filtros.html", width=1280, height=720, fps=60,
                           webpage_control_level=2)
# The abilities' sounds (sfx.js) go through OBS, to the stream and Luan's headphones like the Sons source's.
filters["settings"]["reroute_audio"] = True
filters.update(monitoring_type=MONITOR_AND_OUTPUT)
in_talk = {"pos": (64, 64), "bounds": (1024, 576)}
# The end credits keep Conversa's old camera, 1280×720 (creditos.html is laid out round it).
in_end = {"pos": (64, 64), "bounds": (1280, 720)}
in_calm = {"pos": (336, 76), "bounds": (1248, 702)}
# The filters over the camera, shrunk with OBS's Area filter (made for scaling down: the 3D's edges stay smooth).
filters_at = {name: {**box, "scale_filter": "area"} for name, box in
              {"game": in_frame, "talk": in_talk, "end": in_end, "calm": in_calm}.items()}
# The game scenes: one of each for every game since 2026-11-24 (Luan: "organiza as cenas", the day Valorant was
# archived). "Jogo" holds every game's capture and overlay, and the game on screen is whichever's items are on: the
# Efeitos dock's "Jogo na cena" (JOGOS in efeitos.html) or their eyes in OBS, Rocket League's by default. "Lance ruim"
# was a scene with Jogo inside it, under the camera the dock zooms, and "VAR" the booth; since that evening Lance ruim
# is a layer hidden at the top of Jogo (Luan: "um momento de enfoque na câmera", with Sigma) and the VAR is gone. Celeste
# and any other game share Diversos' capture and the one stand (it cheers nothing a game doesn't send). Until then each
# game had three scenes of its own ("RL + chat", "Lance ruim · RL", "VAR · Rocket League", the same for Valorant and
# Diversos, and Celeste's "Celeste + chat · Diversos"): OBS's scene collection "Valorant (arquivo)" keeps them as they
# were, and Valorant's sources above stay defined for when it comes back (a capture and an overlay more in Jogo).
ARCHIVED = (valorant, valorant_chat_overlay, valorant_crowd, various_crowd)
bad_play_layer = scene("Lance ruim", (camera, in_frame), (filters, filters_at["game"]), (bad_play, {}))
jogo = scene("Jogo", (game, GAME_AT), (various, GAME_AT), (camera, in_frame), (filters, filters_at["game"]),
             (game_chat_overlay, {}), (various_chat_overlay, {}), (celeste_overlay, {}), (crowd, STAND_AT),
             *alerts_in_frame, (pix, {}), (bad_play_layer, {}))
# Off until picked: the other games' capture and overlays; and the Lance ruim layer, until the dock shows it.
for each in jogo["settings"]["items"]:
    each["visible"] = each["name"] not in (various["name"], various_chat_overlay["name"], celeste_overlay["name"],
                                           bad_play_layer["name"])
scenes = [
    scene("Começando", (starting, {})),
    scene("Conversa", (camera, in_talk), (filters, filters_at["talk"]), (chat_overlay, {}), *alerts_in_talk, pix_in_talk),
    jogo,
    bad_play_layer,
    scene("Terapia", (camera, in_calm), (filters, filters_at["calm"]), (calm, {}), *alerts_in_calm,
          (pix, PIX_IN_CALM)),
    scene("Já volto", (back, {})),
    scene("Fim", (camera, in_end), (filters, filters_at["end"]), (end, {})),
]
# Luan's choice: Discord stays out of the game and talk scenes (and so out of the recording's track 4 there), and the
# browser out of the game scenes; they're kept as hidden items, ready to switch on.
HIDDEN = {"Jogo": {"Discord", "Navegador"}, "Conversa": {"Discord"}, "Terapia": {"Discord"}}
BREAKS = {"Começando", "Já volto", "Fim"}
for each in scenes:
    if each is bad_play_layer:
        continue  # a layer in Jogo, which has the sounds
    extra = apps + ([] if each["name"] in BREAKS else sounds)
    added = [item(app, each["settings"]["id_counter"] + n + 1) for n, app in enumerate(extra)]
    for one in added:
        one["visible"] = one["name"] not in HIDDEN.get(each["name"], set())
    each["settings"]["items"] += added
    each["settings"]["id_counter"] += len(extra)
    if each["name"] in HOTKEYS:
        each["hotkeys"] = {"OBSBasic.SelectScene": [{"key": HOTKEYS[each["name"]]}]}
# The games fill their box keeping their aspect ratio rather than cropping.
for captured in scenes:
    for each in captured["settings"]["items"]:
        if each["name"] in (game["name"], valorant["name"], various["name"]):
            each["bounds_type"] = BOUNDS_SCALE_INNER
            each["bounds_crop"] = False

# Software decoding: hardware VP9 decoders drop the alpha channel.
stinger = {"id": "obs_stinger_transition", "name": "muanlartins", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "stinger")),
           "settings": {"path": STINGER, "tp_type": 0, "transition_point": 600, "hw_decode": False}}
# Terapia's own stinger, "Água" (public/stream/transicao-terapia.html, rendered the same way; `--apply` copies it),
# in and out of Terapia in place of the fade it had until 2026-11-14 (the Efeitos dock sets it as Terapia's override).
water_stinger = {"id": "obs_stinger_transition", "name": "Água", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "stinger-agua")),
                 "settings": {"path": f"{FOLDER}/transicao-terapia.webm", "tp_type": 0, "transition_point": 500, "hw_decode": False}}
# The Efeitos dock sets Terapia's transition override ("Água") each time it connects.

collection = {
    "name": "muanlartins",
    "current_scene": "Começando",
    "current_program_scene": "Começando",
    "scene_order": [{"name": s["name"]} for s in scenes],
    "sources": scenes + [game, various, camera, filters, game_chat_overlay,
                         various_chat_overlay, celeste_overlay, chat_overlay, crowd, pix, starting, back, end, bad_play, calm] + apps + sounds
               + ([alerts] if alerts else []),
    "groups": [],
    "AuxAudioDevice1": mic,
    "transitions": [stinger, water_stinger],
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
# filters' sound through OBS (2026-11-12) and their size (2026-11-13).
SYNC = {"Filtros": {"settings": ["reroute_audio", "width", "height"], "fields": ["monitoring_type"]}}
# Scene items OBS already has whose place `--apply` brings up to date: by name in every scene, or (scene, name) in
# one. The camera filters over each scene's camera (2026-11-13; full screen before); Terapia laid out around the
# middle (2026-11-14); Conversa's smaller camera with the minigames under it (2026-11-20); the game scenes framed
# (2026-11-23): the game, the camera, the stand, Pix and the alerts.
PLACED = {"Filtros", ("Terapia", "Câmera"), ("Terapia", "Pix"), ("Terapia", "Alertas"), ("Conversa", "Câmera"),
          ("Conversa", "Pix"), ("Conversa", "Alertas")} | {
    ("Jogo", item_name) for item_name in (game["name"], various["name"], "Câmera", crowd["name"], "Pix", "Alertas")} | {
    ("Lance ruim", "Câmera")}
PLACE_FIELDS = ["pos", "pos_rel", "scale", "scale_rel", "scale_ref", "align", "bounds_type", "bounds_align",
                "bounds_crop", "bounds", "bounds_rel", "crop_left", "crop_top", "crop_right", "crop_bottom", "rot",
                "scale_filter"]


def same(a, b):
    """Equal, but for the float32 rounding OBS saves numbers with (pos_rel and the like)."""
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(same(a[k], b[k]) for k in a)
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return abs(a - b) < 1e-4
    return a == b


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
            # A new copy of a page OBS already has with a key (the stand's Σ key, #chave=) takes that key along.
            twin = keyed(live, s)
            if twin:
                s = {**s, "settings": {**s["settings"], "url": f"{s['settings']['url']}#{twin[1]}"}}
            live["sources"].append(s)
            by_name[s["name"]] = s
            added.append(f"fonte {s['name']}" + (f" (com a chave de {twin[0]})" if twin else ""))
    for name, page in NEEDS_KEY.items():
        mine = by_name.get(name)
        url = (mine or {}).get("settings", {}).get("url", "")
        if not mine or "#" in url:
            continue
        key = next((s["settings"]["url"].split("#", 1)[1] for s in live["sources"]
                    if s.get("id") == "browser_source" and "#" in s["settings"].get("url", "")
                    and s["settings"]["url"].split("#")[0].split("?")[0].endswith("/" + page)), None)
        if key:
            mine["settings"]["url"] = f"{url}#{key}"
            added.append(f"{name}: com a chave de {page}")
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
    added += layer(live, by_name)
    uuids = {name: s["uuid"] for name, s in by_name.items()}
    for s in new["sources"]:
        if s["id"] != "scene":
            continue
        mine = by_name[s["name"]]
        items = mine["settings"].setdefault("items", [])
        for it in s["settings"]["items"]:
            it["source_uuid"] = uuids[it["name"]]
            if mine is not s and (it["name"] in PLACED or (s["name"], it["name"]) in PLACED):
                for there in (i for i in items if i["name"] == it["name"]):
                    if any(not same(there.get(k), it[k]) for k in PLACE_FIELDS):
                        there.update({k: it[k] for k in PLACE_FIELDS})
                        added.append(f"{it['name']} reposicionado na cena {s['name']}")
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
    added += retire(live, by_name)
    names = {t["name"] for t in live.get("transitions", [])}
    for t in new["transitions"]:
        if t["name"] not in names:
            live.setdefault("transitions", []).append(t)
            added.append(f"transição {t['name']}")
    # A new scene goes after the one before it here (Diversos + chat after Valorant + chat), else last.
    order = live.setdefault("scene_order", [])
    for i, o in enumerate(new["scene_order"]):
        names = [have["name"] for have in order]
        if o["name"] in names:
            continue
        before = next((n["name"] for n in reversed(new["scene_order"][:i]) if n["name"] in names), None)
        order.insert(names.index(before) + 1 if before else len(order), {"name": o["name"]})
    return added


def layer(live, by_name):
    """Makes "Lance ruim" a layer (2026-11-24) in a collection where it's still a scene with Jogo inside it: it keeps
    its camera and lance.html, gets the filters (placed as Jogo's) between them, and loses Jogo, the apps and the
    sounds (Jogo has them); the new hidden item at the top of Jogo comes with the rest. Returns what it did."""
    mine = by_name.get(bad_play_layer["name"])
    items = (mine or {}).get("settings", {}).get("items", [])
    if not any(i["name"] == jogo["name"] for i in items):
        return []
    keep = [i for i in items if i["name"] in (camera["name"], bad_play["name"])]
    jogo_items = by_name.get(jogo["name"], {}).get("settings", {}).get("items", [])
    filters_there = next((i for i in jogo_items if i["name"] == filters["name"]), None)
    new_filters = item(filters, mine["settings"].get("id_counter", len(items)) + 1, **filters_at["game"])
    new_filters["source_uuid"] = by_name[filters["name"]]["uuid"]
    if filters_there:
        new_filters.update({k: filters_there[k] for k in PLACE_FIELDS if k in filters_there})
    mine["settings"]["id_counter"] = new_filters["id"]
    mine["settings"]["items"] = [i for i in keep if i["name"] == camera["name"]] + [new_filters] + \
                                [i for i in keep if i["name"] == bad_play["name"]]
    for i in mine["settings"]["items"]:
        i["visible"] = True
    gone = [i["name"] for i in items if i not in keep]
    return [f"Lance ruim virou camada: {', '.join(gone)} saíram, Filtros entrou"]


def retire(live, by_name):
    """Takes out RETIRED_SCENES (with their place in the scene order), RETIRED_SOURCES (from every scene too) and
    RETIRED_TRANSITIONS. Returns what it took out."""
    done = []
    for name in sorted(RETIRED_SCENES | RETIRED_SOURCES):
        if name not in by_name:
            continue
        live["sources"] = [s for s in live["sources"] if s["name"] != name]
        del by_name[name]
        done.append(f"{'cena' if name in RETIRED_SCENES else 'fonte'} {name} removida")
    for s in live["sources"]:
        if s.get("id") == "scene":
            s["settings"]["items"] = [i for i in s["settings"].get("items", []) if i["name"] not in RETIRED_SCENES | RETIRED_SOURCES]
    live["scene_order"] = [o for o in live.get("scene_order", []) if o["name"] not in RETIRED_SCENES]
    for t in [t for t in live.get("transitions", []) if t["name"] in RETIRED_TRANSITIONS]:
        live["transitions"].remove(t)
        done.append(f"transição {t['name']} removida")
    if live.get("current_transition") in RETIRED_TRANSITIONS:
        live["current_transition"] = "muanlartins"
    return done


def replay_buffer_off():
    """OBS's own Replay Buffer off in each profile ([AdvOut] and [SimpleOutput] RecRB): it only kept 20 s for the VAR.
    Returns the profiles it changed."""
    changed = []
    for ini in sorted((OBS / "basic/profiles").glob("*/basic.ini")):
        text = ini.read_text(encoding="utf-8-sig")
        new = re.sub(r"^RecRB=true$", "RecRB=false", text, flags=re.M)
        if new != text:
            shutil.copy(ini, ini.with_name(f"basic.ini.antes-{time.strftime('%Y%m%d-%H%M%S')}"))
            ini.write_text(new, encoding="utf-8")
            changed.append(ini.parent.name)
    return changed


def keyed(live, new):
    """The (name, fragment) of a browser source in `live` showing `new`'s page with a #fragment (a key), if any."""
    url = new["settings"].get("url", "")
    if new["id"] != "browser_source" or "#" in url:
        return None
    page = url.split("?")[0]
    return next(((s["name"], s["settings"]["url"].split("#", 1)[1]) for s in live["sources"]
                 if s.get("id") == "browser_source" and "#" in s["settings"].get("url", "")
                 and s["settings"]["url"].split("#")[0].split("?")[0] == page), None)


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
    shutil.copy(Path(__file__).resolve().parent / "gatilho.webm", sons / "gatilho.webm")  # the triggers' file
    print("\n".join(added) or "nada novo na coleção")
    print(f"arquivo dos gatilhos em {sons}")
    for name in ("transicao-terapia.webm",):
        webm = Path(__file__).resolve().parents[2] / "public/stream" / name
        if webm.exists():
            shutil.copy(webm, sons.parent / webm.name)
            print(f"{name} copiado para {sons.parent}")
    print(f"docks: {', '.join(docks)}" if (docks := add_docks()) else "os docks já estavam lá")
    print(f"Replay Buffer desligado no perfil {', '.join(off)}" if (off := replay_buffer_off()) else "Replay Buffer já estava desligado")
    print(f"cópias de antes: {LIVE.name}.antes-{stamp}, user.ini.antes-{stamp}")


if "--apply" in sys.argv:
    apply(dry="--dry-run" in sys.argv)
else:
    json.dump(collection, sys.stdout, ensure_ascii=False, indent=2)
    print()
