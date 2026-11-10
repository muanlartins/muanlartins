---
name: antes-da-live
description: Before and during one of Luan's Twitch lives on the stream PC: what he does, what to check in OBS, and what Claude must not run while he's on air. Use when he says he's about to go live, is live, or the stream stutters.
---

# Before and during a live

Luan streams Rocket League ranked on Twitch from this PC (Windows + WSL), on the schedule in
`content/agenda.json` (weekdays 14:30–16:30, Brasília). Talk to him in pt-BR.

## While he's live, Claude stays light

WSL shares the CPU with the game and OBS. On 2026-11-05 headless WebGL (swiftshader) tests plus dev servers
made his stream stutter: OBS skipped hundreds of frames and he felt it in the game and "even the network".

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
- Valorant (`scripts/valorant.py`, started at login too, log `~/.cache/muanlartins/valorant.log`): reads Luan's
  own presence from the Riot Client every 2 s (two `curl.exe` calls, negligible) for the Valorant scene's stand and
  rank plate. `http://127.0.0.1:8792/` shows what it knows; if the plate or the rounds stop, check that first.
- Never restart or close OBS, or change scenes/inputs, while he's live unless he asks for that change.
- The same goes, more mildly, whenever OBS is open: a 9-minute ffmpeg encode on 11-05 left OBS with 35% of its
  render frames skipped while it sat idle.

## If the stream stutters

1. `node scripts/obs.mjs`, twice ~10 s apart. Growing "render skipped" = the GPU/CPU is starved (look for
   Claude's own jobs first: `ps aux --sort=-%cpu | head`); growing "encode skipped" = the encoder can't keep up;
   "stream skipped"/congestion = the network.
2. Stop Claude's heavy jobs (not the narrator), check again, and tell Luan what it was with the numbers.

## Luan's side (remind him when useful)

- Rocket League's streamer-safe music on (or the game's music at 0): Content ID claimed the licensed soundtrack
  on early VODs.
- The "Partidas" dock (OBS custom dock, `public/stream/partidas.html` from the site) open: it logs each match and
  its events. At the end, **"Publicar sessões"**: that writes `content/matches/<id>.json` and `.events.json`,
  which the after-live routine and RLR's studio need.
- **Rocket League's Stats API is on** before the game starts: `PacketSendRate=10` in
  `C:\Program Files\Epic Games\rocketleague\TAGame\Config\DefaultStatsAPI.ini`. Game updates reset it to 0
  (11-05), and then the dock sees no match. `node scripts/obs.mjs` warns when it's off; fix it, then restart the
  game (it reads the file at start).
- The "Efeitos" dock open, for the VAR above all: it starts OBS's Replay Buffer with the stream or the recording
  and its "Replay Buffer" line says when it's off in Settings (Output → Replay Buffer, ~20 s). Without the dock, F8
  does nothing.
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
- Scenes: Começando, RL + chat, Valorant + chat, Conversa, Já volto, Fim (and the effects' own). `brand/twitch/obs.py` generates the scene
  collection; anything added by hand in OBS (like the Spotify source) should also go there.
- See the `obs` skill for talking to OBS from WSL.
