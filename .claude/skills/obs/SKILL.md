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
- Camera filters (`public/stream/filtros.html`): switched from the "Filtros" dock
  (`filtros-painel.html`, served from localhost:8126 too; `obs.py --apply` adds it with OBS closed), never by
  gestures (Luan, 2026-11-10). The dock lists Phoenix and the ball (`FILTROS` there; Pop and the lens stay in the
  page, off the dock) and tells the page with obs-browser's emit_event `muanlartins-filtro`
  (`{"filtro": "bola" | "phoenix" | "nenhum"}`, `{"acao": "flash"}`), which `scripts/obs.mjs` can send as well
  (`CallVendorRequest`). A new filter is a line in the dock's `FILTROS` and its id in the page's `MODES`. One browser
  source "Filtros", full screen and just above Câmera in RL + chat, Valorant + chat, Conversa and
  Terapia (page permission 2, so it can ask for the scene; the page draws in that scene's camera box and stays clear
  with no filter). It loads `http://localhost:8126/stream/filtros.html`, served from this working copy by
  "Filtros muanlartins.vbs" in Startup (log `~/.cache/muanlartins/filtros.log`), because Phoenix's model
  (`public/stream/privado/`, gitignored) must never reach the site. OBS has to start with
  `--enable-media-stream --use-fake-ui-for-media-stream` (set on the Public Desktop shortcut and a user Start Menu
  one, "OBS Studio (filtros)", and since 2026-11-09 the system Start Menu one too, edited elevated with Luan's UAC OK;
  an OBS update may recreate it without them), or the page's camera is refused (the page then retries every 5 s and
  logs `câmera NotAllowedError`; its HUD shows only with `?debug`). To debug,
  add `?debug` to the source's URL: the HUD shows fps, model times and why it's idle; its console errors land in
  OBS's log as `[obs-browser: 'Filtros']`.
- The camera's framing is OBS's, not NVIDIA Broadcast's: auto frame is off (Luan, 2026-11-08; the virtual
  background stays on) and a "Enquadramento" crop filter, first on Câmera in all three collections (Live, Shorts,
  Vídeo), crops him at about 1.75× (`CAMERA_CROP` in `brand/twitch/obs_shorts.py`). If he moves the camera, retune
  it there and on the three sources (SetSourceFilterSettings, switching collections while he's not live).
- Source Record filters write files of their own while OBS records: "Gravar câmera" on Câmera (`… câmera.mkv`)
  and "Gravar jogo" on Rocket League (`… jogo.mkv`, the game without camera or overlays, CQP 22, its own sound;
  added 2026-11-05). `videos.py` files both.
- Shorts have their own profile and scene collection, "Shorts" (1080×1920; `brand/twitch/obs_shorts.py --apply`
  with OBS closed), and so do commented videos, "Vídeo" (1920×1080, folder `profiles\Video`;
  `brand/twitch/obs_video.py --apply`). RLR's studio switches to them to record and back; never switch while live.
- Luan's choice: Discord is hidden in the game scenes and Conversa, and the browser in the game scenes. One scene
  per game, always with the chat: "RL + chat" and "Valorant + chat" (2026-11-10: he dropped the ones without it,
  "Jogo" and "Valorant", and "Jogo + chat" became "RL + chat"; the docks and pages go by these names).
- Effects (2026-11-07): scenes "Lance ruim" (cut in; the Efeitos dock zooms the camera and returns) and "Terapia"
  (fade in), and the sounds: the browser source "Sons" (`public/stream/tocador.html`) plays them when the dock hears a
  hotkey restart its trigger, a media source "Som · …" with a silent file (media sources play once when OBS loads, so
  real sounds there went off all at once). Hotkeys are on the F-row (Rocket League binds F1 and F10): F2 Lance ruim,
  F3 Terapia, F4 back to the game, F5 palmas, F6 uuuh, F7 tambor. F2 and F4 are triggers too ("Gatilho · …", since
  2026-11-08), so the dock picks the game's scene; Lance ruim is only ever fired by hand.
- Valorant (2026-11-08): scenes "Valorant + chat" and "Lance ruim · Valorant", Rocket League's with their
  own capture "Captura · Valorant" (with "Gravar jogo"), "Overlay · Valorant [+ chat]" and "Torcida · Valorant"; the
  camera at (44, 44), over the minimap. Pix is the same source; pix.html moves its corner by the scene's name. `obs.py --apply` refuses a key OBS already uses. OBS's own
  cut and fade have names in its language ("Cortar", "Esmaecer"); the dock finds them by kind.
  `brand/twitch/obs.py --apply [--dry-run]` adds what's missing to the live collection without touching the rest.
- Changes made by hand or by websocket should also land in `brand/twitch/obs.py`, which generates the scene
  collection (`python3 brand/twitch/obs.py [stinger path] [alerts URL] > muanlartins.json`; the alerts URL is a
  secret: pass it on the command line, never commit it).
- Useful requests: `GetStats` (fps, `renderSkippedFrames`, `outputSkippedFrames`, CPU), `GetStreamStatus`
  (`outputSkippedFrames`, `outputCongestion`), `GetRecordStatus`, `GetSceneItemList`, `CreateRecordChapter`
  (Hybrid MP4, OBS 30.2+).
