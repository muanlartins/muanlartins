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
not yet bound — and never changes or removes anything. It also copies the sound effects (brand/twitch/sons/) next
to the stinger and adds the "Efeitos" dock. OBS must be closed: it rewrites these files when it exits.
"""
import json
import re
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
SITE = "https://muanlartins.com.br/stream"
FOLDER = "C:/Users/muanl/Documents/muanlartins-obs"
STINGER = ARGS[0] if ARGS else f"{FOLDER}/transicao.webm"
# With --apply, the alerts are the source OBS already has (its URL stays there): the new scenes just place it.
FROM_OBS = "(o do OBS)"
ALERTS = ARGS[1] if len(ARGS) > 1 else FROM_OBS if "--apply" in sys.argv else None
# The sound effects (public/stream/sons.js, rendered by brand/twitch/sons.mjs), next to the stinger.
SOUNDS = f"{FOLDER}/sons"
# Rocket League's window, matched by executable (priority 2) so a title change doesn't lose it.
ROCKET_LEAGUE = "Rocket League (64-bit, DX11, Cooked):LaunchUnrealUWindowsClient:RocketLeague.exe"
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


# The game also goes to a file of its own while recording, without camera or overlays (the Source Record plugin), for
# vertical shorts and commented videos; with its own sound. CQP 22: it's material for cuts, and space adds up daily.
game = source("game_capture", "Rocket League", {"capture_mode": "window", "window": ROCKET_LEAGUE, "priority": 2,
                                                "capture_cursor": False, "allow_transparency": False,
                                                "capture_audio": True}, mixers=EVERYWHERE | TRACK_GAME, filters=[
    source("source_record_filter", "Gravar jogo", {
        "record_mode": 3, "path": "C:\\Users\\muanl\\Videos", "filename_formatting": "%CCYY-%MM-%DD %hh-%mm-%ss jogo",
        "rec_format": "mkv", "encoder": "nvenc", "rate_control": "CQP", "cqp": 22, "keyint_sec": 2, "preset2": "p5",
        "profile": "high", "different_audio": False}),
])
# Stays on between scenes, so switching to one with the camera doesn't wait for it to start.
# It also goes to a file of its own at native resolution while recording (the Source Record plugin), with the
# microphone for syncing it to the main recording.
camera = source("dshow_input", "Câmera", {"video_device_id": CAMERA, "last_video_device_id": CAMERA,
                                         "deactivate_when_not_showing": False}, filters=[
    source("source_record_filter", "Gravar câmera", {
        "record_mode": 3, "path": "C:\\Users\\muanl\\Videos", "filename_formatting": "%CCYY-%MM-%DD %hh-%mm-%ss câmera",
        "rec_format": "mkv", "encoder": "nvenc", "rate_control": "CQP", "cqp": 18, "keyint_sec": 2, "preset2": "p5",
        "profile": "high", "different_audio": True, "audio_source": "Microfone"}),
])
game_overlay = browser("Overlay · Jogo", "jogo.html")
game_chat_overlay = browser("Overlay · Jogo + chat", "jogo.html?chat=1")
chat_overlay = browser("Overlay · Conversa", "conversa.html")
# The crowd, over the game overlay; the dock sends it the goals and saves. Its sound is the goal narrator: on the
# stream only, and in Luan's headphones.
crowd = browser("Torcida", "torcida.html")
crowd["settings"]["reroute_audio"] = True
crowd.update(mixers=TRACK_LIVE, monitoring_type=MONITOR_AND_OUTPUT)
# Live Pix: the band and the goal, over everything; its sound is the Pix voices, like the crowd's. One source in
# every scene that has the game or the talk, so an alert never plays twice: in Conversa (where a Pix "entre partidas"
# usually plays) it's cropped to the band and set on the camera's lower third.
pix = browser("Pix", "pix.html")
pix["settings"]["reroute_audio"] = True
pix.update(mixers=TRACK_LIVE, monitoring_type=MONITOR_AND_OUTPUT)
pix_in_talk = (pix, {"pos": (64, 548), "crop": (320, 110, 320, 660)})
# Restarts when shown, so its drawing starts over each time the scene goes live. No countdown (Luan, 2026-11-06).
starting = browser("Tela · Começando", "intervalo.html?tela=comecando", restart=True)
back = browser("Tela · Já volto", "intervalo.html?tela=volto")
end = browser("Tela · Fim", "intervalo.html?tela=fim")
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
# Hotkeys are OBS's own, so they work with the game focused: the numeric keypad (Num Lock on), which Rocket League
# doesn't use. Num 1 "Lance ruim", Num 5 "Terapia", Num 0 back to the main game scene; the sounds around them.
HOTKEYS = {"Lance ruim": "OBS_KEY_NUM1", "Terapia": "OBS_KEY_NUM5", "Jogo + chat": "OBS_KEY_NUM0"}


def sound(name, file, key=None, restart=False):
    """A sound effect as a media source: `key` restarts it (hotkey); `restart` plays it whenever its scene goes live.
    It plays once when OBS loads it, silently unless its scene is on: so the sounds stay out of the break screens,
    where OBS usually opens."""
    return source("ffmpeg_source", name, {"local_file": f"{SOUNDS}/{file}.wav", "is_local_file": True, "looping": False,
                                          "restart_on_activate": restart, "close_when_inactive": False,
                                          "clear_on_media_end": True, "hw_decode": False},
                  volume=0.7, monitoring_type=MONITOR_AND_OUTPUT,
                  hotkeys={"MediaSource.Restart": [{"key": key}]} if key else {})


sounds = [sound(f"Som · {label}", file, key) for label, file, key in (
    ("Palmas", "palmas", "OBS_KEY_NUM7"), ("Uuuh", "uuuh", "OBS_KEY_NUM8"), ("Buzina", "buzina", "OBS_KEY_NUM9"),
    ("Suspense", "suspense", "OBS_KEY_NUM4"), ("Tambor", "tambor", "OBS_KEY_NUM6"),
    ("Ba-dum-tss", "badumtss", "OBS_KEY_NUM2"), ("Boing", "boing", "OBS_KEY_NUM3"))]
# "Lance ruim": the game's scene with the camera on top, which the dock zooms; the bars and the sting play each time.
bad_play = browser("Efeito · Lance ruim", "lance.html", restart=True)
sting = sound("Som · Lance ruim", "lance", restart=True)
# "Terapia": water, breathing and music made by the page (so on every track, and in Luan's headphones); it starts
# over each time and stops off screen.
calm = browser("Tela · Terapia", "terapia.html", restart=True)
calm["settings"].update(reroute_audio=True, shutdown=True)
calm.update(monitoring_type=MONITOR_AND_OUTPUT)

# Hole positions match jogo.html and conversa.html.
scenes = [
    scene("Começando", (starting, {})),
    scene("Jogo", (game, {"bounds": (1920, 1080)}), (camera, {"pos": (44, 740), "bounds": (480, 270)}), (game_overlay, {}),
          (crowd, {}), *alerts_in_game, (pix, {})),
    scene("Jogo + chat", (game, {"bounds": (1920, 1080)}), (camera, {"pos": (44, 740), "bounds": (480, 270)}),
          (game_chat_overlay, {}), (crowd, {}), *alerts_in_game, (pix, {})),
    scene("Conversa", (camera, {"pos": (64, 64), "bounds": (1280, 720)}), (chat_overlay, {}), *alerts_in_talk, pix_in_talk),
    scene("Lance ruim", (game, {"bounds": (1920, 1080)}), (game_chat_overlay, {}), (crowd, {}), *alerts_in_game, (pix, {}),
          (camera, {"pos": (44, 740), "bounds": (480, 270)}), (bad_play, {}), (sting, {})),
    scene("Terapia", (camera, {"pos": (64, 64), "bounds": (560, 315)}), (calm, {}), *alerts_in_talk,
          (pix, {"pos": (64, 760), "crop": (320, 110, 320, 660)})),
    scene("Já volto", (back, {})),
    scene("Fim", (end, {})),
]
# Luan's choice: Discord stays out of the game and talk scenes (and so out of the recording's track 4 there), and the
# browser out of the game scenes; they're kept as hidden items, ready to switch on.
HIDDEN = {"Jogo": {"Discord", "Navegador"}, "Jogo + chat": {"Discord", "Navegador"}, "Conversa": {"Discord"},
          "Lance ruim": {"Discord", "Navegador"}, "Terapia": {"Discord"}}
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
for captured in (scenes[1], scenes[2], scenes[4]):
    captured["settings"]["items"][0]["bounds_type"] = BOUNDS_SCALE_INNER
    captured["settings"]["items"][0]["bounds_crop"] = False

# Software decoding: hardware VP9 decoders drop the alpha channel.
stinger = {"id": "obs_stinger_transition", "name": "muanlartins", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "stinger")),
           "settings": {"path": STINGER, "tp_type": 0, "transition_point": 600, "hw_decode": False}}
# The effects' own: "Lance ruim" comes in on a cut (its first frame is the game scene's), "Terapia" on a slow fade.
cut = {"id": "cut_transition", "name": "Corte", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "corte")), "settings": {}}
fade = {"id": "fade_transition", "name": "Fade", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "fade")), "settings": {}}
for each, (transition, ms) in ((scenes[4], ("Corte", 0)), (scenes[5], ("Fade", 1500))):
    each["private_settings"] = {"transition": transition, "transition_duration": ms}

collection = {
    "name": "muanlartins",
    "current_scene": "Começando",
    "current_program_scene": "Começando",
    "scene_order": [{"name": s["name"]} for s in scenes],
    "sources": scenes + [game, camera, game_overlay, game_chat_overlay, chat_overlay, crowd, pix, starting, back, end,
                         bad_play, sting, calm] + apps + sounds + ([alerts] if alerts else []),
    "groups": [],
    "AuxAudioDevice1": mic,
    "transitions": [stinger, cut, fade],
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
LIVE = OBS / "basic/scenes/muanlartins.json"
DOCK = ("Efeitos", f"{SITE}/efeitos.html")


def merge(live, new):
    """Adds to `live` what `new` has and it lacks; returns what was added, to print."""
    added = []
    by_name = {s["name"]: s for s in live["sources"]}
    for s in new["sources"]:
        if s["name"] not in by_name:
            if s["settings"].get("url") == FROM_OBS:
                raise SystemExit("O OBS não tem a fonte Alertas: rode obs.py com a URL dos alertas para gerar a coleção inteira.")
            live["sources"].append(s)
            by_name[s["name"]] = s
            added.append(f"fonte {s['name']}")
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


def add_dock():
    """The Efeitos dock in OBS's custom browser docks, with the websocket password in its URL (never printed)."""
    ini = OBS / "user.ini"
    text = ini.read_text(encoding="utf-8-sig")
    line = re.search(r"^ExtraBrowserDocks=(.*)$", text, re.M)
    docks = json.loads(line.group(1)) if line else []
    if any(d.get("title") == DOCK[0] for d in docks):
        return False
    password = json.loads((OBS / "plugin_config/obs-websocket/config.json").read_text())["server_password"]
    docks.append({"title": DOCK[0], "url": f"{DOCK[1]}#obs={password}", "uuid": str(uuid.uuid4())})
    value = "ExtraBrowserDocks=" + json.dumps(docks, ensure_ascii=False, separators=(",", ":"))
    text = text.replace(line.group(0), value) if line else text.replace("[BasicWindow]\n", f"[BasicWindow]\n{value}\n", 1)
    ini.write_text(text, encoding="utf-8")
    return True


def apply(dry=False):
    if dry:
        print("\n".join(merge(json.loads(LIVE.read_text(encoding="utf-8")), collection)) or "nada novo na coleção")
        print("(nada foi escrito: --dry-run)")
        return
    running = subprocess.run(["tasklist.exe", "/FI", "IMAGENAME eq obs64.exe"], capture_output=True, text=True).stdout
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
    for wav in sorted((Path(__file__).parent / "sons").glob("*.wav")):
        shutil.copy(wav, sons / wav.name)
    print("\n".join(added) or "nada novo na coleção")
    print(f"sons copiados para {sons}")
    print("dock Efeitos adicionado" if add_dock() else "dock Efeitos já estava lá")
    print(f"cópias de antes: {LIVE.name}.antes-{stamp}, user.ini.antes-{stamp}")


if "--apply" in sys.argv:
    apply(dry="--dry-run" in sys.argv)
else:
    json.dump(collection, sys.stdout, ensure_ascii=False, indent=2)
    print()
