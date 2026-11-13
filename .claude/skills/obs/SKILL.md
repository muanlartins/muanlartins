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
  gestures (Luan, 2026-11-10). The dock (2026-11-12) has a dropdown with every filter by game (`FILTROS` there:
  Valorant's Phoenix, Sage and Sova with their faces from `public/valorant/agentes/`, then Rocket League's Octane,
  Fennec and the ball) and a power button beside it; picking one turns it on, the button turns the picked one off
  and on; under them, the one that's on's one-offs (each agent's abilities with their keys, the cars' Demolição and
  Flip), its switches and its gestures (Pop and the lens stay in the page, off the dock). Making a new one: the
  filtros skill. It tells the page with obs-browser's emit_event `muanlartins-filtro`
  (`{"filtro": "phoenix" | "sage" | "sova" | "bola" | "octane" | "fennec" | "nenhum", "opcoes": {"patrulha": true}}`, and the one-offs `{"acao": ...}`:
  Phoenix's `blaze`, `flash`, `molotov`, `ult`; Sage's `barreira`, `lentidao`, `cura`, `ult`; Sova's `recon`, `choque`, `drone`, `ult`; the cars' `demo`, `flip`),
  which `scripts/obs.mjs` can send as well (`CallVendorRequest`). Phoenix's, Sova's and Sage's effects are drawn by `vfx.js` from the game's textures
  and values (`vfx-phoenix.js`, `vfx-sova.js`, `vfx-sage.js`, textures in `privado/valorant/`), and Sova's bow, arrows
  and Owl Drone and Sage's orb and wall are the game's models from there too; without them their abilities do nothing
  but Phoenix's flash. Sage's look is her character-select model (Luan's download, `privado/sage.glb`).
  One gesture per agent stays on purpose (Luan, 2026-11-11: one signature ability each): Phoenix's flash (a snap),
  Sova's drone (both palms open to the camera) and Sage's barrier (forearms crossed in an X in front of the chest, then opened), besides Sova's bow (one fist against the other opens it, pulling the hands
  apart draws it, opening a hand shoots the Recon Bolt). Luan's call: a gesture needn't mimic its ability, it should
  be easy to do. Sova's look has a switch in the dock, "Coruja sobrevoando" (`opcoes.patrulha`, kept in the dock):
  the drone flies behind him all the while, and the drone ability is then that drone. The abilities have the
  games' own sounds (2026-11-12, `sfx.js`): cues made by `scripts/filtros_sons.py` into `privado/sons/` from
  `~/.local/share/valorant-extract/sons.sh phoenix|sova|sage` and `~/.local/share/rl-extract/run.sh` (re-run all three
  after a patch); the dock's "Sons dos filtros" (`opcoes.mudo`) turns them off for every filter. They reach the
  stream only because "Filtros" has "Control audio via OBS" on (`reroute_audio`, monitored like Sons, so Luan hears
  them; set by hand in Live.json and Shorts.json on 2026-11-12 and kept by `obs.py`'s `SYNC`); without it the page
  plays them straight to Windows' speakers. One browser
  source "Filtros", full screen and just above Câmera in RL + chat, Valorant + chat, Conversa and
  Terapia (page permission 2, so it can ask for the scene; the page draws in that scene's camera box and stays clear
  with no filter). It loads `http://localhost:8126/stream/filtros.html`, served from this working copy by
  "Filtros muanlartins.vbs" in Startup (log `~/.cache/muanlartins/filtros.log`), because Phoenix's and Sova's models
  and the game's extracted effects (`public/stream/privado/`, gitignored) must never reach the site. OBS has to start with
  `--enable-media-stream --use-fake-ui-for-media-stream` (set on the Public Desktop shortcut and a user Start Menu
  one, "OBS Studio (filtros)", and since 2026-11-09 the system Start Menu one too, edited elevated with Luan's UAC OK;
  an OBS update may recreate it without them), or the page's camera is refused (the page then retries every 5 s and
  logs `câmera NotAllowedError`; its HUD shows only with `?debug`). To debug,
  add `?debug` to the source's URL: the HUD shows fps, model times and why it's idle; its console errors land in
  OBS's log as `[obs-browser: 'Filtros']`.
  To see a filter without OBS (not while he's live): headless Chrome with `--use-fake-device-for-media-stream
  --use-fake-ui-for-media-stream --use-file-for-fake-video-capture=<clip>.y4m` (a few seconds of a live's
  `Câmera.mkv` through ffmpeg, already framed, so add `?zoom=1`); `?debug` also exposes `window.filtros` (state,
  uniforms, `acao`). Swiftshader runs it at well under 1 fps: `scripts/filtros_teste.py` (the filtros skill) runs a
  filter's one-offs on a clock that moves 1/30 s per frame and screenshots them at the seconds wanted.
  With an agent on, Luan's hair around the agent's is painted over with the camera's background:
  `public/stream/camera-fundo.png` (NVIDIA Broadcast's virtual background, from `brand/build.py`) plus what the
  page has seen behind him since it loaded; if he changes the virtual background, rebuild it (the page checks it
  against the frame and stops erasing while they don't match: `?debug` shows "fundo ok" or "não bate"). For a
  headless test with a framed clip, pass `?fundo=` a copy cropped like Enquadramento.
- The camera's framing is OBS's, not NVIDIA Broadcast's: auto frame is off (Luan, 2026-11-08; the virtual
  background stays on) and a "Enquadramento" crop filter, first on Câmera in all three collections (Live, Shorts,
  Vídeo), crops him at about 1.75× (`CAMERA_CROP` in `brand/twitch/obs_shorts.py`). If he moves the camera, retune
  it there and on the three sources (SetSourceFilterSettings, switching collections while he's not live).
- The end of the live, "Fim" (2026-11-10): the credits (`public/stream/creditos.html`, source "Tela · Créditos",
  restart when active) over Câmera at (64, 64) 1280×720, as in Conversa, with Filtros between them (its box for Fim is
  Conversa's). The old "Tela · Fim" (`intervalo.html?tela=fim`) left the collection through `RETIRED_ITEMS` in
  `obs.py`. Follows, subs, gifts, bits and raids reach the credits only from the Efeitos dock signed in to Twitch with
  the credits' scopes (its "Créditos de hoje" line says when it needs Conectar again) and open during the live: it
  keeps the day and sends it as `muanlartins-creditos`. Viewers, Pix, the score and the next live come without it.
- Ad breaks (2026-11-11): the "Anúncios" dock (`public/stream/anuncios.html`, from the site; `obs.py --apply` adds it
  and takes out the old "Ads" dock, a PowerShell server on localhost:17563 from a Windows session, retired). Twitch's
  Ads Manager keeps the schedule (Manual, 3 min every 60 min, the least that keeps pre-rolls off for incoming viewers;
  First Ad Delay 1 min; Auto Snooze off; subs ad-free; chat countdown on). The dock signs in to Twitch itself (device
  flow, the site's app, scopes `channel:read:ads channel:manage:ads channel:edit:commercial`), runs the hour's break
  between matches (Conversa, Já volto, Valorant's menus from `valorant.py`) from 5 min before, snoozes it mid-match,
  beeps in Luan's headset only, and sends `muanlartins-anuncios` to the sources: Começando's clock
  (`intervalo.html?tela=comecando` without `?minutos`) counts down to the end of the opening break. Its header has the
  rules. The first break it runs by hand checks whether Twitch restarts its timer; if not, the dock turns the
  between-matches break off for good (its storage, `reinicia`).
- When F2/F4/F8 or the sounds do nothing, check the docks first: OBS's log should show 4 websocket clients from
  127.0.0.1 within seconds of "Startup complete" (Partidas, Efeitos, Filtros, Anúncios). A dock that never connects
  died loading: open its URL with `#obs=x` in headless Chrome and look for a page error (on 11-10/11 Efeitos' top-level
  `const history` shadowed window.history, so the `#obs=` handling threw and F2/F4/F8 were dead until fb3ab5f). Then
  fire the trigger yourself (`TriggerMediaInputAction` RESTART on "Gatilho · …") and watch `CurrentProgramSceneChanged`.
- obs-browser's `emit_event` goes through OBS's own data format, which keeps **only arrays of objects**: an array of
  strings or numbers in `event_data` reaches the pages empty (obs-websocket's `obs_data_set_json_array` skips every
  non-object). On 11-11 the VAR's booth showed the question and the clock but no options, votes or line. Send such
  state as JSON text (`{ estado: JSON.stringify(...) }`, read with `varDe()` in `stream.js`), and when testing a page,
  pass the event through that rule rather than dispatching it raw. (BroadcastCustomEvent, dock to dock, stays JSON.)
- The VAR plays its clip in `var.html`'s own `<video>` since 11-12 (the media source "VAR · replay" is retired:
  `obs.py --apply` takes it out). The clip is the game alone: Source Record's replay buffer on each capture's
  "Gravar jogo" (`REPLAY_JOGO` in `obs.py`: 20 s, `Replay <date> <time> jogo.mkv`, the same encoder as the game's
  file), saved by the dock with `CallVendorRequest` `source-record` / `replay_buffer_save` `{ source: "<capture>" }`.
  Source Record 0.4.8 sends no "saved" event, so `scripts/replay.py` (127.0.0.1:8794) watches Videos, remuxes the MKV
  to MP4 (about a second) and serves it with byte ranges to the page and the dock. "Efeito · VAR" is also in "RL +
  chat" and "Valorant + chat" (the mini player), with "controlar áudio pelo OBS" on. Turning Source Record's replay
  on or changing its duration is a filter change: only with OBS closed (`obs.py --apply`), never while it records.
- OBS must always be started from a shortcut (all three carry `--enable-media-stream --use-fake-ui-for-media-stream`),
  never `obs64.exe` bare: on 2026-11-11 a Windows session restarted it bare and the camera filters lost the camera
  (`câmera NotAllowedError` every 5 s in the log). From WSL: `cmd.exe /c start "" "C:\Users\Public\Desktop\OBS Studio.lnk"`;
  check the log's "Command Line Arguments" line. The current transition is the stinger "muanlartins"; it had been
  left on "Cortar" since 11-08/11-10 (the Efeitos dock before d0aaa3f set OBS's current transition), and was set back
  on 2026-11-11.
- Twitch's alerts ("Alertas", the Alerts Box) are on tracks 1 and 5 and on "Monitorar e enviar", like Pix and
  Sons, so Luan hears them too: the installed source had monitoring off until 2026-11-10 (the stream heard the subs,
  he didn't). The page's "AlertsFeatureLaunchFlags: unauthenticated" GraphQL error on load is in every log since
  11-08 and harmless.
- Don't change Câmera's settings or its filters while OBS records: on 11-09 at 21:29, during the live, websocket
  clients from WSL changed the camera twice in 4 s (the second time its device settings); Source Record stopped the
  camera's file ("Gravar câmera") and OBS crashed tearing it down (`Crash 2026-11-09 21-29-43.txt`,
  `video_output_disconnect2`), so the live came out in pieces.
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
  F3 Terapia, F4 back to the scene before (from an effect, the scene it came from; from Conversa or Já volto, the
  last scene before it; nothing in a game scene; never a fixed scene, Luan 2026-11-10), F5 palmas, F6 uuuh, F7 tambor.
  F2 and F4 are triggers too ("Gatilho · …", since 2026-11-08), so the dock picks the scene; it reads the game from the
  scene names on screen, never a remembered one, and shows under its buttons where F4 would go. Lance ruim is only
  ever fired by hand. OBS's log lists every switch ("User switched to scene"), the dock's too: the place to see what
  F2/F4 did during a live.
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
