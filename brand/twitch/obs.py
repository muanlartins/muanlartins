"""Writes the OBS scene collection for the stream: the overlays in public/stream/ as browser sources,
laid out with the camera and the game, and transicao.webm as the stinger.

    python3 brand/twitch/obs.py [stinger path] > muanlartins.json

The stinger path is where transicao.webm sits on the streaming machine (OBS plays stingers from local
files only). Import with Scene Collection → Import. Devices and the canvas below are Luan's OBS setup.
"""
import json
import sys
import uuid

SITE = "https://muanlartins.com.br/stream"
STINGER = sys.argv[1] if len(sys.argv) > 1 else "C:/Users/muanl/Documents/muanlartins-obs/transicao.webm"
# Rocket League's window, matched by executable (priority 2) so a title change doesn't lose it.
ROCKET_LEAGUE = "Rocket League (64-bit, DX11, Cooked):LaunchUnrealUWindowsClient:RocketLeague.exe"
CAMERA = "Camera (NVIDIA Broadcast):"
MIC = "{0.0.1.00000000}.{1bd84196-0816-4f00-8c22-a2b3950b995a}"
# OBS's base canvas. The overlays are laid out at 1920×1080 and scale themselves to it.
CANVAS = (2560, 1440)
K = CANVAS[0] / 1920

# OBS enums: alignment flags (left 1, right 2, top 4, bottom 8) and bounds types.
TOP_LEFT = 5
BOUNDS_NONE, BOUNDS_SCALE_INNER, BOUNDS_SCALE_OUTER = 0, 2, 3


def source(kind, name, settings, **extra):
    return {"id": kind, "versioned_id": kind, "name": name, "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, name)),
            "settings": settings, "enabled": True, "flags": 0, "mixers": 255, "volume": 1.0, "balance": 0.5,
            "muted": False, "monitoring_type": 0, "sync": 0, "hotkeys": {}, "private_settings": {}, **extra}


def browser(name, page, restart=False):
    return source("browser_source", name, {"url": f"{SITE}/{page}", "width": CANVAS[0], "height": CANVAS[1], "fps_custom": True,
                                            "fps": 60, "restart_when_active": restart, "shutdown": False, "css": ""})


def item(src, i, pos=(0, 0), bounds=None):
    """A scene item at `pos`; with `bounds`, the source is scaled to fill that box and cropped to it.
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
            "crop_left": 0, "crop_top": 0, "crop_right": 0, "crop_bottom": 0, "scale_filter": "disable",
            "blend_method": "default", "blend_type": "normal", "private_settings": {}}


def scene(name, *items):
    return source("scene", name, {"id_counter": len(items), "custom_size": False,
                                  "items": [item(src, i + 1, **opts) for i, (src, opts) in enumerate(items)]})


game = source("game_capture", "Rocket League", {"capture_mode": "window", "window": ROCKET_LEAGUE, "priority": 2,
                                                "capture_cursor": False, "allow_transparency": False})
# Stays on between scenes, so switching to one with the camera doesn't wait for it to start.
camera = source("dshow_input", "Câmera", {"video_device_id": CAMERA, "last_video_device_id": CAMERA,
                                         "deactivate_when_not_showing": False})
game_overlay = browser("Overlay · Jogo", "jogo.html")
game_chat_overlay = browser("Overlay · Jogo + chat", "jogo.html?chat=1")
chat_overlay = browser("Overlay · Conversa", "conversa.html")
# Restarts when shown, so the countdown starts over each time the scene goes live.
starting = browser("Tela · Começando", "intervalo.html?tela=comecando&minutos=5", restart=True)
back = browser("Tela · Já volto", "intervalo.html?tela=volto")
end = browser("Tela · Fim", "intervalo.html?tela=fim")

# Hole positions match jogo.html and conversa.html.
scenes = [
    scene("Começando", (starting, {})),
    scene("Jogo", (game, {"bounds": (1920, 1080)}), (camera, {"pos": (44, 740), "bounds": (480, 270)}), (game_overlay, {})),
    scene("Jogo + chat", (game, {"bounds": (1920, 1080)}), (camera, {"pos": (44, 740), "bounds": (480, 270)}),
          (game_chat_overlay, {})),
    scene("Conversa", (camera, {"pos": (64, 64), "bounds": (1280, 720)}), (chat_overlay, {})),
    scene("Já volto", (back, {})),
    scene("Fim", (end, {})),
]
# The game fills the screen keeping its aspect ratio rather than cropping.
for captured in (scenes[1], scenes[2]):
    captured["settings"]["items"][0]["bounds_type"] = BOUNDS_SCALE_INNER
    captured["settings"]["items"][0]["bounds_crop"] = False

# Software decoding: hardware VP9 decoders drop the alpha channel.
stinger = {"id": "obs_stinger_transition", "name": "muanlartins", "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "stinger")),
           "settings": {"path": STINGER, "tp_type": 0, "transition_point": 600, "hw_decode": False}}

collection = {
    "name": "muanlartins",
    "current_scene": "Começando",
    "current_program_scene": "Começando",
    "scene_order": [{"name": s["name"]} for s in scenes],
    "sources": scenes + [game, camera, game_overlay, game_chat_overlay, chat_overlay, starting, back, end],
    "groups": [],
    "DesktopAudioDevice1": source("wasapi_output_capture", "Áudio do computador", {"device_id": "default"}),
    "AuxAudioDevice1": source("wasapi_input_capture", "Microfone", {"device_id": MIC}),
    "transitions": [stinger],
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

json.dump(collection, sys.stdout, ensure_ascii=False, indent=2)
print()
