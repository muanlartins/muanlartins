---
name: estudio
description: Making Luan's shorts and commented-match videos from a live's material with RLR's studio (the recording and the replay's 3D in step) - who does what, where the files are, how sync works, how to check it. Use for shorts, "vídeo comentado", the studio, or VOD/replay sync.
---

# The studio: shorts and commented videos

## The deal with Luan

- **Luan brings the analysis**, the content itself: his reading of plays, right or wrong (mistakes are as good
  as goals). **Claude does all the tech**: finding plays, preparing material, the studio, recording setup,
  editing, cuts. Don't automate the analysis away.
- Two formats:
  - **Short:** the reading of one play from one of his matches.
  - **Commented video** ("2v2/3v3 comentado"): the reading of one or more whole matches.
- Material comes from the lives: the recording, the dock's session (events by wall clock) and the saved
  replays. Old VODs without replays (before 11-05) are out: Luan wants the crowd and the 3D, so use lives from
  2026-11-05 on.

## Where things are

- The live's folder (after `depois-da-live`): `C:\Users\muanl\Videos\Lives\<date>\` with
  `<hh-mm-ss> Live.mp4` (1080p60, webcam and overlays baked in at the bottom-left, tracks 1 Tudo, 2 Microfone,
  3 Jogo, 4 Discord), `<hh-mm-ss> Câmera.mkv` (the webcam alone) and `Replays\Partida NN - ….replay`.
- The session: `content/matches/<id>.json` (`outputs`: when the recording started; each match's `start` and
  `at`) and `<id>.events.json` (each match's log: kickoffs, goals with km/h, shots, saves, demos, touches; players
  as roles `me`, `mate1`, `opp2`).
- A match's place in the recording: `match.start − record start`, plus an event's `t`. Checked on 11-05: a goal
  the dock logged at 25:41.6 shows its explosion at 25:41.6 in the recording.

## RLR's studio (`~/repos/rlr`, `src/studio/`)

Published at muanlartins.com.br/rlr (also locally: `./run.sh` in `~/repos/rlr`, port 5180). Luan's way in:
**"Open a lives folder…"** on RLR's first page, pointed once at `Videos\Lives` (Edge remembers it; each visit is
one click, "Open Lives", to allow reading it). It lists each day's matches from the `Replays` names; a click
opens that match's replay, the day's recording and the studio, already in step, and ‹ › go to the day's other
matches. So `depois-da-live` filing the folder is what makes a live show up there. (Opening a replay and adding
a recording by hand still works for anything else.)

- **Sync:** it fetches the sessions near the replay's date from GitHub's API, recognises the match by its
  kickoffs and goals (replay ids and the dock's ids differ), and lines up each stretch between goals on its
  own: in play a replay runs with the wall clock, but across each goal replay the game shows it loses ~2 s. The
  ±0.1 s/±1 s nudge is kept per session.
- Keys: **V** swaps recording/3D (the other sits in the corner), **I/O** mark a play, **L** loops it, **M**
  marks a moment. Marks also become **chapters in OBS's recording** when "Connect OBS" is on and it's recording
  (Hybrid MP4); "Save marks" downloads them. Yellow ticks on the timeline are Luan's own shots, saves and goals
  from the dock. The recording's sound: full / low / off.
- Reading the chapters back from a studio recording:
  `ffmpeg -i "<file>.mp4" 2>&1 | grep -A2 Chapter` (or `ffprobe -show_chapters`).

## Checking studio changes

- Headless Chromium in WSL decodes **no video at all** (Format error even for VP8). Test the logic with a
  stand-in clock on `HTMLMediaElement` (an init script overriding `currentTime`, `paused`, `play`, `pause`,
  `playbackRate`); the replay's 3D still needs `--use-angle=swiftshader --enable-unsafe-swiftshader` and
  viewports of 1000×600 or smaller (bigger screenshots time out).
- Testing in Windows' Edge would need a debugging port open to WSL, which pops a firewall prompt on Luan's
  screen: don't.
- RLR's own rules are in `~/repos/rlr/AGENTS.md`; `pnpm exec tsc` and `pnpm build` there. Pushing RLR publishes
  it: ask Luan first.

## Still to build (in this order unless Luan says otherwise)

1. An OBS scene "Estúdio" (browser window, mic, camera) for recording the commentary: ask before touching OBS.
2. The cutting pipeline: from the studio recording's chapters and marks to shorts (vertical) and the
   commented video.
