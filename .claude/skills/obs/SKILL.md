---
name: obs
description: Reading and changing OBS on the stream PC from WSL through obs-websocket - status, stats, scenes, audio tracks - without leaking its password. Use whenever OBS needs to be checked or changed.
---

# OBS from WSL

```sh
node scripts/obs.mjs                    # live? recording? scene, fps, skipped frames, CPU
node scripts/obs.mjs '[["GetSceneList", {}], ["GetInputList", {}]]'
```

- It reaches Windows at WSL's default route (`OBS_HOST` overrides) on port 4455, and reads the password
  from OBS's own config (`…\obs-studio\plugin_config\obs-websocket\config.json`). **Never print the password**
  or put it in a file, command line or the repo; the script masks the overlay keys (`#chave=`, `#obs=`) in what
  it prints. The Σ key and the Twitch Alerts Box URL are secrets too.
- Reading is always fine. **Changing** OBS (scenes, inputs, filters, audio tracks, output settings,
  starting/stopping the recording or stream) is Luan's call: ask first, and while he's live only make the change
  he asked for. Never restart or close OBS while he's live.
- Audio tracks are a bitmask per input (`SetInputAudioTracks` with `{"1": true, …, "6": false}`): 1 Tudo,
  2 Microfone, 3 Jogo, 4 Discord go to the recording; 5 "Live" is the stream's only. Music (the "Spotify" source)
  is on 5 alone.
- The main recording: Hybrid MP4, NVENC CQP 22 (`recordEncoder.json` in the profile; 18 until 11-06, measured
  under 1 VMAF point apart and ~40% smaller). Change it only with OBS closed.
- Source Record filters write files of their own while OBS records: "Gravar câmera" on Câmera (`… câmera.mkv`)
  and "Gravar jogo" on Rocket League (`… jogo.mkv`, the game without camera or overlays, CQP 22, its own sound;
  added 2026-11-05). `videos.py` files both.
- Shorts have their own profile and scene collection, "Shorts" (1080×1920; `brand/twitch/obs_shorts.py --apply`
  with OBS closed), and so do commented videos, "Vídeo" (1920×1080, folder `profiles\Video`;
  `brand/twitch/obs_video.py --apply`). RLR's studio switches to them to record and back; never switch while live.
- Luan's choice: Discord is hidden in Jogo, Jogo + chat and Conversa, and the browser in the game scenes.
- Effects (2026-11-07): scenes "Lance ruim" (cut in; the Efeitos dock zooms the camera and returns) and "Terapia"
  (fade in), media sources "Som · …" (`public/stream/sons.js`, rendered by `brand/twitch/sons.mjs`). Hotkeys are on the
  F-row (Rocket League binds F1 and F10): F2 Lance ruim, F3 Terapia, F4 Jogo + chat, sounds on F5–F9, F11, F12. `obs.py --apply` refuses a key OBS already uses.
  `brand/twitch/obs.py --apply [--dry-run]` adds what's missing to the live collection without touching the rest.
- Changes made by hand or by websocket should also land in `brand/twitch/obs.py`, which generates the scene
  collection (`python3 brand/twitch/obs.py [stinger path] [alerts URL] > muanlartins.json`; the alerts URL is a
  secret: pass it on the command line, never commit it).
- Useful requests: `GetStats` (fps, `renderSkippedFrames`, `outputSkippedFrames`, CPU), `GetStreamStatus`
  (`outputSkippedFrames`, `outputCongestion`), `GetRecordStatus`, `GetSceneItemList`, `CreateRecordChapter`
  (Hybrid MP4, OBS 30.2+).
