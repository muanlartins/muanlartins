---
name: antes-da-live
description: Before and during one of Luan's Twitch lives on the stream PC: what he does, what to check in OBS, and what Claude must not run while he's on air. Use when he says he's about to go live, is live, or the stream stutters.
---

# Before and during a live

Luan streams on Twitch from this PC (Windows + WSL), on the agenda he edits at `/canal/agenda` (the profile API's
`GET /agenda`, the `agenda` skill; Rocket League in the afternoons, Valorant at night). Talk to him in pt-BR.

The opening runs itself from the Anúncios dock (`abertura.js`): up to 90 min before a scheduled live it sets the
channel's Twitch title and category from the agenda, and 30 s after the stream of a scheduled live opens it has the
Discord server's bot post "Ao vivo agora" in #lives, pinging "Avisos de live" (once per stream; an unscheduled
stream, like an OBS test, pings nobody). Its section "Abertura" says what it did ("Aviso no Discord"). The Instagram
story Luan posts by hand (the automatic one was dropped on 2026-11-19).

## While he's live, Claude stays light

WSL shares the CPU with the game and OBS. On 2026-11-05 headless WebGL (swiftshader) tests plus dev servers
made his stream stutter: OBS skipped hundreds of frames and he felt it in the game and "even the network".

The render scripts check by themselves since 2026-11-26 (`fora_do_ar()` in `scripts/publicar.py`, called at the
start of destaque, clipe, cortes, edicao, candidatos, and of partidas, capitulos, comentado, montagem and shorts with
`--apply`): with OBS streaming they exit before rendering. On 2026-11-26 a reel agent read `live: yes` and rendered
anyway, twice, into his live (OBS: 14% of frames skipped to encoding lag). A new script that renders calls it too.

- First check: `node scripts/obs.mjs` (prints live/recording, fps, skipped frames, CPU, and the profile: it
  warns when OBS stayed on the studio's Shorts or Vídeo profile, which would stream the wrong thing). If `live: yes`:
  - only code edits, `tsc`, lint and light reads;
  - no swiftshader/Playwright, no ffmpeg over recordings, no `pnpm build`, no dev servers, no whisper;
  - queue those for after the stream and say so.
- Never stop `scripts/narrador.py`: it's part of the live (the goal narrator and the Pix voices).
- Live captions (`scripts/legenda.py`, started at login like the narrator, log `~/.cache/muanlartins/legenda.log`):
  on only while the dock's "Legendas ao vivo" is ticked, then they hear the mic and run whisper on the GPU every
  second (~0.2 s each, ~1 GB VRAM). If the stream stutters with them on, untick it first; it frees the GPU at once.
  whisper-server's own output from its last start is in `~/.cache/muanlartins/whisper-server.log`; it takes ~17 s to
  load idle and over 30 s while OBS is opening (it waits up to 120 s, and retries 5 s after a failure).
  With the dock's "Falo" and "Legenda em" on different languages, each line is also translated by Gemma 4 E4B
  on llama-server (~3 GB more VRAM, GPU use about the same as whisper's), started only then: the first lines go out
  untranslated while it loads, and its output is in `~/.cache/muanlartins/tradutor.log`. Same languages again
  stops it.
- Valorant (`scripts/valorant.py`, started at login too, log `~/.cache/muanlartins/valorant.log`): reads Luan's
  own presence from the Riot Client every 2 s (two `curl.exe` calls, negligible) for the Valorant scene's stand and
  rank plate. `http://127.0.0.1:8792/` shows what it knows; if the plate or the rounds stop, check that first.
- After WSL restarts (`uptime` of minutes; on 2026-11-14 it had, and nothing said so), the five helpers that Windows'
  Startup launches are all down: filters (:8126), narrator (:8788), captions (:8790), Valorant (:8792), replays
  (:8794). Check them with `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:<port>/` (200 each) and relaunch
  the missing ones with `wscript.exe "C:\Users\muanl\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\<Filtros|Narrador|Legendas|Replay|Valorant> muanlartins.vbs"`.
- The keyboard and the mouse beside the camera (`scripts/teclas.ps1`, "Teclas muanlartins.vbs" in Startup) run on
  Windows itself, on its loopback, which WSL can't reach: check with `curl.exe -sN --max-time 3 http://127.0.0.1:8796/`
  (one `data:` line; `"foco":false` while the terminal is in front, as it should). Its box shows only while a game is
  the window in front, so an empty corner while he's on the desktop is right.
  An OBS that opened meanwhile has the "Filtros" source and dock on an error page: refresh the source
  (`PressInputPropertiesButton` `refreshnocache` on "Filtros") and have Luan reload the dock (or reopen OBS).
- The camera is off while OBS is neither streaming nor recording (the Efeitos dock turns it on when the stream starts,
  in a second or two, under Começando). A black camera on the air means the dock isn't connected: check it says "OBS
  conectado", or press "Ativar" in the Câmera source's properties.
- Never restart or close OBS, or change scenes/inputs, while he's live unless he asks for that change.
- The same goes, more mildly, whenever OBS is open: a 9-minute ffmpeg encode on 11-05 left OBS with 35% of its
  render frames skipped while it sat idle.

## If the stream stutters

1. `node scripts/obs.mjs`, twice ~10 s apart. Growing "render skipped" = the GPU/CPU is starved (look for
   Claude's own jobs first: `ps aux --sort=-%cpu | head`); growing "encode skipped" = the encoder can't keep up;
   "stream skipped"/congestion = the network.
2. Stop Claude's heavy jobs (not the narrator), check again, and tell Luan what it was with the numbers.
3. The game freezing and the camera dropping late in a live (2026-11-27's diagnosis, not the GPU) is C: filling: the
   Kingston NV2 falls to ~20 MB/s at 100% busy. Read it on Windows:
   `Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'"` (`PercentIdleTime`,
   `DiskWriteBytesPersec`) and `df -h /mnt/c`. Suspend (never kill) Claude's ffmpeg/remux jobs with ntdll's
   `NtSuspendProcess` on the Windows PID, and resume them with `NtResumeProcess` after the live.

## Before he goes live: free space

At least 300 GB free plus what the live will write (Luan, 2026-11-27): ~420 GB with the AV1 recordings. Less: tell
him before he starts, and run the faxina skill. No remux, render or copy on C: while he's live.

## Before he goes live: OBS's audio buffering

Look at OBS's current log (the newest in `%APPDATA%\obs-studio\logs`) for `Max audio buffering reached!`. If it's
there, the Source Record files (`Câmera.mkv`, `Jogo.mp4`) will get their sound ~0.93 s late behind their picture
until OBS is closed (the stream and Live.mp4 stay in step: measured 2026-11-11 by his lips, and the VOD), which costs
the shorts their sync: ask Luan to restart OBS before going live. A source whose audio comes back with stale
timestamps does it (the log names it); the effects' triggers did it until 2026-11-11, when they got a file with no
sound (`gatilho.webm`, see the `obs` skill). It only ever goes up within a session.

## Luan's side (remind him when useful)

- Rocket League's streamer-safe music on (or the game's music at 0): Content ID claimed the licensed soundtrack
  on early VODs.
- The "Partidas" dock (OBS custom dock, `public/stream/partidas.html` from the site) open: it logs each match and
  its events. At the end, **"Publicar sessões"**: that writes `content/matches/<id>.json` and `.events.json`,
  which the after-live routine and RLR's studio need. Rocket League's points fill themselves in from
  `scripts/rocket_league.py` (started at login, log `~/.cache/muanlartins/rocket-league.log`), which reads them off
  the end-of-match scoreboard; a match left without points can still be typed. Off the stream nothing is opened:
  that script and `valorant.py` publish the ranked matches by themselves.
- **Rocket League's Stats API is on** before the game starts: `PacketSendRate=10` in
  `C:\Program Files\Epic Games\rocketleague\TAGame\Config\DefaultStatsAPI.ini`. Game updates reset it to 0
  (11-05), and then the dock sees no match. `node scripts/obs.mjs` warns when it's off; fix it, then restart the
  game (it reads the file at start).
- The "Efeitos" dock open: without it F2 (Lance ruim), F4 and the sounds do nothing. Lance ruim's Sigma comes from
  the "Filtros" source (localhost:8126, `scripts/servidor_filtros.py`), so that server must be up too. The VAR (F8)
  and OBS's replay buffers were retired on 2026-11-24: nothing to check for them.
- **Open in "Começando"** and stay until its clock ends (about 4 min): Twitch runs the live's opening ad break a
  minute in, and the "Anúncios" dock warns (and beeps) if the stream starts in another scene. That dock open and
  connected to Twitch (its first sign-in: Conectar, then the code at twitch.tv/activate) runs the hour's break between
  matches; without it Twitch runs it on the hour, wherever he is.
- The "Efeitos" dock **connected to Twitch** too: it collects the day's follows, subs, gifts, bits and raids for the
  credits that roll in "Fim" at the end. If its "Créditos de hoje" line asks to connect again (a sign-in from before
  2026-11-10 lacks the scopes), Luan clicks Conectar there and types the code at twitch.tv/activate. To end the live,
  "Fim" and let the credits roll to the closing card (about a minute, longer with a bigger audience).
- **Save the replay after each match** (they land in `Documents\My Games\Rocket League\TAGame\DemosEpic`).
- Music for the stream (StreamBeats) plays through the "Spotify" source, which goes to **track 5 only**: the
  stream hears it, the recording (tracks 1–4) doesn't, so YouTube stays free of claims.

## OBS facts

- OBS 33, profile "Live" ("Untitled" until 11-06), Advanced output. Recording: Hybrid MP4 (survives a crash, takes chapter marks),
  NVENC, tracks 1–4 (1 Tudo, 2 Microfone, 3 Jogo, 4 Discord); track 5 "Live" is the stream's. The camera also
  records to its own `… câmera.mkv` (Source Record filter "Gravar câmera").
- Scenes (since 2026-11-24): Começando, Conversa, Jogo, Lance ruim, VAR, Terapia, Já volto, Fim. Jogo is every game:
  pick the day's under "Jogo na cena" in the Efeitos dock (Rocket League, Celeste, Outro jogo; Outro's capture takes
  whatever game is fullscreen or borderless in front) before going live. Valorant is archived (the `obs` skill). `brand/twitch/obs.py` generates the scene
  collection; anything added by hand in OBS (like the Spotify source) should also go there.
- The sources Luan must hear (Alertas, Sons, Pix, Filtros) are on "Monitorar e enviar" (`monitoring_type` 2):
  Alertas was found off on 11-10, 11-19 and 11-24 (every OBS log from 11-18 to 11-24 loads it without
  monitoring), so he missed the follows' and subs' sounds while the live had them. Check it
  (`scripts/obs.mjs '[["GetInputAudioMonitorType", {"inputName": "Alertas"}]]'`) before a live; OBS saves a change
  made through obs-websocket when it closes, so confirm `monitoring_type` 2 in `Live.json` after the next restart.
- See the `obs` skill for talking to OBS from WSL.
