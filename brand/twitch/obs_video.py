"""OBS's "Vídeo" profile and scene collection: commented matches recorded with RLR's studio, 1920×1080.

    python3 brand/twitch/obs_video.py            # what it writes
    python3 brand/twitch/obs_video.py --apply    # writes them into Windows' OBS (close OBS first)

The studio (RLR, full screen in the browser) fills the screen with the match: the game's own recording (Jogo.mp4,
without camera or overlays) or the replay's 3D, V to swap, the other in its corner at the top right; its controls
hide while the mouse rests. OBS captures the screen as it is and puts Luan's camera once, at the bottom left where
the live has it, in a Klein frame. Sound: the microphone (with the live's compressor and limiter) and the
browser's; tracks 1 Tudo, 2 Microfone, 3 Estúdio. The studio's "Record a video" switches OBS to this profile and
back (never while live), like "Record a short" does with obs_shorts.py's. Files go to Videos\\Comentados, named
"<date> <time> comentado.mp4", with the studio's marks as chapters.

The live's own profile and collection (obs.py) are left alone. Nothing secret is written.
"""
import json
import sys
from pathlib import Path

from obs_shorts import CAMERA, MIC, OBS, TRACK_ALL, TRACK_MIC, TRACK_STUDIO, item, source

W, H = 1920, 1080
CANVAS = (W, H)
FOLDER = "C:\\\\Users\\\\muanl\\\\Videos\\\\Comentados"
# The live's camera hole (obs.py, jogo.html), so the videos look like the lives.
CAMERA_AT, CAMERA_SIZE = (44, 740), (480, 270)
FRAME = 6

screen = source("monitor_capture", "Tela", {"capture_cursor": False, "method": 0})
camera = source("dshow_input", "Câmera", {"video_device_id": CAMERA, "last_video_device_id": CAMERA,
                                         "deactivate_when_not_showing": False})
frame = source("color_source_v3", "Moldura", {"color": 0xFFA72F00, "width": CAMERA_SIZE[0] + 2 * FRAME,
                                              "height": CAMERA_SIZE[1] + 2 * FRAME})
browser = source("wasapi_process_output_capture", "Estúdio", {"window": "RLR:Chrome_WidgetWin_1:msedge.exe", "priority": 2},
                 mixers=TRACK_ALL | TRACK_STUDIO)
mic = source("wasapi_input_capture", "Microfone", {"device_id": MIC}, mixers=TRACK_ALL | TRACK_MIC, filters=[
    source("compressor_filter", "Compressor", {"ratio": 4.0, "threshold": -18.0, "attack_time": 6, "release_time": 60,
                                               "output_gain": 0.0}),
    source("limiter_filter", "Limitador", {"threshold": -1.0, "release_time": 60}),
])
items = [item(screen, 1, canvas=CANVAS),
         item(frame, 2, (CAMERA_AT[0] - FRAME, CAMERA_AT[1] - FRAME), canvas=CANVAS),
         item(camera, 3, CAMERA_AT, CAMERA_SIZE, canvas=CANVAS),
         item(browser, 4, canvas=CANVAS)]
commented = source("scene", "Comentado", {"id_counter": len(items), "custom_size": False, "items": items})

collection = {
    "name": "Vídeo", "current_scene": "Comentado", "current_program_scene": "Comentado",
    "scene_order": [{"name": "Comentado"}], "sources": [commented, screen, frame, camera, browser], "groups": [],
    "AuxAudioDevice1": mic, "transitions": [], "current_transition": "Fade", "transition_duration": 300,
    "quick_transitions": [], "saved_projectors": [], "preview_locked": False, "scaling_enabled": False, "modules": {},
    "resolution": {"x": W, "y": H}, "version": 2,
}

PROFILE = f"""[General]
Name=Vídeo

[Output]
Mode=Advanced
FilenameFormatting=%CCYY-%MM-%DD %hh-%mm-%ss comentado

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
# CQP 20: a video is long, and YouTube encodes it again.
ENCODER = {"rate_control": "CQP", "cqp": 20, "keyint_sec": 2, "preset2": "p5", "profile": "high", "tune": "hq",
           "multipass": "qres", "bf": 2}

if __name__ == "__main__":
    if "--apply" not in sys.argv:
        print(PROFILE)
        print(json.dumps(collection, ensure_ascii=False, indent=2)[:1500], "…")
        print("(nada foi escrito: rode com --apply, com o OBS fechado)")
        sys.exit()
    profile = OBS / "profiles" / "Video"
    profile.mkdir(parents=True, exist_ok=True)
    (profile / "basic.ini").write_text(PROFILE, encoding="utf-8")
    (profile / "recordEncoder.json").write_text(json.dumps(ENCODER), encoding="utf-8")
    (OBS / "scenes" / "Video.json").write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding="utf-8")
    Path("/mnt/c/Users/muanl/Videos/Comentados").mkdir(exist_ok=True)
    print(f"Perfil e cenas Vídeo escritos em {OBS}; gravações em Videos\\Comentados.")
