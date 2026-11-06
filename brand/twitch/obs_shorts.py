"""OBS's "Shorts" profile and scene collection: shorts recorded with RLR's studio, 1080×1920.

    python3 brand/twitch/obs_shorts.py            # what it writes
    python3 brand/twitch/obs_shorts.py --apply    # writes them into Windows' OBS (close OBS first)

The studio (RLR, full screen in the browser) puts the play in the screen's top left corner, 1080×1056 of the screen's
own pixels; OBS captures the screen as it is, so that corner is the short's top, and Luan's camera covers the rest,
1080×864 under it, with a Klein line between them. Sound: the microphone (with the live's compressor and limiter) and
the browser's (the game, low); tracks 1 Tudo, 2 Microfone, 3 Estúdio, so the edit can caption from the microphone
alone. The studio's "Record a short" switches OBS to this profile and back (never while live); see the `estudio`
skill. Files go to Videos\\Shorts, named "<date> <time> short.mp4", one chapter per play.

The live's own profile and collection (obs.py) are left alone. Nothing secret is written: the profile has no stream
service or accounts.
"""
import json
import sys
import uuid
from pathlib import Path

CAMERA = "Camera (NVIDIA Broadcast):"
MIC = "{0.0.1.00000000}.{1bd84196-0816-4f00-8c22-a2b3950b995a}"
# The main monitor (1920×1080 at 0,0; the other one is portrait). Without it OBS captures nothing.
MONITOR = "\\\\?\\DISPLAY#GSM5D24#5&23b6c223&0&UID37120#{e6f07b5f-ee97-4a90-b076-33f57bf4eaa7}"
W, H = 1080, 1920
STAGE = 1056  # the studio's picture (RLR's STAGE in src/app.tsx)
LINE = 6
TRACK_ALL, TRACK_MIC, TRACK_STUDIO = 1, 2, 4
OBS = Path("/mnt/c/Users/muanl/AppData/Roaming/obs-studio/basic")
FOLDER = "C:\\\\Users\\\\muanl\\\\Videos\\\\Shorts"
BOUNDS_NONE, BOUNDS_SCALE_OUTER = 0, 3
TOP_LEFT = 5


def source(kind, name, settings, mixers=TRACK_ALL, **extra):
    return {"id": kind, "versioned_id": kind, "name": name, "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, f"shorts:{name}")),
            "settings": settings, "enabled": True, "flags": 0, "mixers": mixers, "volume": 1.0, "balance": 0.5,
            "muted": False, "monitoring_type": 0, "sync": 0, "hotkeys": {}, "private_settings": {}, **extra}


def item(src, i, pos=(0, 0), bounds=None, canvas=(W, H)):
    x, y = pos
    w, h = bounds or (0, 0)
    half = canvas[1] / 2
    return {"name": src["name"], "source_uuid": src["uuid"], "id": i, "visible": True, "locked": True,
            "pos": {"x": x, "y": y}, "pos_rel": {"x": (x - canvas[0] / 2) / half, "y": (y - half) / half},
            "rot": 0.0, "scale": {"x": 1.0, "y": 1.0}, "scale_rel": {"x": 1.0, "y": 1.0},
            "scale_ref": {"x": canvas[0], "y": canvas[1]},
            "align": TOP_LEFT, "bounds_type": BOUNDS_SCALE_OUTER if bounds else BOUNDS_NONE, "bounds_align": 0,
            "bounds_crop": bool(bounds), "bounds": {"x": w, "y": h}, "bounds_rel": {"x": w / half, "y": h / half},
            "crop_left": 0, "crop_top": 0, "crop_right": 0, "crop_bottom": 0, "scale_filter": "disable",
            "blend_method": "default", "blend_type": "normal", "private_settings": {}}


# The screen as it is, at 1:1 from its top left corner: what's past the canvas (the studio's controls) is cut off.
screen = source("monitor_capture", "Tela", {"capture_cursor": False, "method": 0, "monitor_id": MONITOR})
camera = source("dshow_input", "Câmera", {"video_device_id": CAMERA, "last_video_device_id": CAMERA,
                                         "deactivate_when_not_showing": False})
# Klein (#002FA7) as OBS writes colours: 0xAABBGGRR.
line = source("color_source_v3", "Linha", {"color": 0xFFA72F00, "width": W, "height": LINE})
browser = source("wasapi_process_output_capture", "Estúdio", {"window": "RLR:Chrome_WidgetWin_1:msedge.exe", "priority": 2},
                 mixers=TRACK_ALL | TRACK_STUDIO)
mic = source("wasapi_input_capture", "Microfone", {"device_id": MIC}, mixers=TRACK_ALL | TRACK_MIC, filters=[
    source("compressor_filter", "Compressor", {"ratio": 4.0, "threshold": -18.0, "attack_time": 6, "release_time": 60,
                                               "output_gain": 0.0}),
    source("limiter_filter", "Limitador", {"threshold": -1.0, "release_time": 60}),
])
items = [item(screen, 1), item(camera, 2, (0, STAGE), (W, H - STAGE)), item(line, 3, (0, STAGE - LINE // 2)),
         item(browser, 4)]
short = source("scene", "Short", {"id_counter": len(items), "custom_size": False, "items": items})

collection = {
    "name": "Shorts", "current_scene": "Short", "current_program_scene": "Short", "scene_order": [{"name": "Short"}],
    "sources": [short, screen, camera, line, browser], "groups": [], "AuxAudioDevice1": mic, "transitions": [],
    "current_transition": "Fade", "transition_duration": 300, "quick_transitions": [], "saved_projectors": [],
    "preview_locked": False, "scaling_enabled": False, "modules": {}, "resolution": {"x": W, "y": H}, "version": 2,
}

PROFILE = f"""[General]
Name=Shorts

[Output]
Mode=Advanced
FilenameFormatting=%CCYY-%MM-%DD %hh-%mm-%ss short

[AdvOut]
RecType=Standard
RecFilePath={FOLDER}
RecFormat2=hybrid_mp4
RecEncoder=obs_nvenc_h264_tex
RecTracks=7
RecAudioEncoder=ffmpeg_aac
Track1Bitrate=192
Track2Bitrate=192
Track3Bitrate=192
Track1Name=Tudo
Track2Name=Microfone
Track3Name=Estúdio
Encoder=obs_nvenc_h264_tex

[Video]
BaseCX={W}
BaseCY={H}
OutputCX={W}
OutputCY={H}
FPSType=0
FPSCommon=60
ScaleType=bicubic
ColorFormat=NV12
ColorSpace=709
ColorRange=Partial

[Audio]
SampleRate=48000
ChannelSetup=Stereo
"""
# CQP 18: a take is a minute, and the edit encodes it again.
ENCODER = {"rate_control": "CQP", "cqp": 18, "keyint_sec": 2, "preset2": "p5", "profile": "high", "tune": "hq",
           "multipass": "qres", "bf": 2}

if __name__ == "__main__":
    if "--apply" not in sys.argv:
        print(PROFILE)
        print(json.dumps(collection, ensure_ascii=False, indent=2)[:1500], "…")
        print("(nada foi escrito: rode com --apply, com o OBS fechado)")
        sys.exit()
    profile = OBS / "profiles" / "Shorts"
    profile.mkdir(parents=True, exist_ok=True)
    (profile / "basic.ini").write_text(PROFILE, encoding="utf-8")
    (profile / "recordEncoder.json").write_text(json.dumps(ENCODER), encoding="utf-8")
    (OBS / "scenes" / "Shorts.json").write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding="utf-8")
    Path("/mnt/c/Users/muanl/Videos/Shorts").mkdir(exist_ok=True)
    print(f"Perfil e cenas Shorts escritos em {OBS}; gravações em Videos\\Shorts.")
