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
