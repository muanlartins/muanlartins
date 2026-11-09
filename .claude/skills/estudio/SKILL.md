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
  3 Jogo, 4 Discord), `<hh-mm-ss> Câmera.mkv` (the webcam alone), `<hh-mm-ss> Jogo.mp4` (the game alone, from
  11-06 on: what the studio plays for shorts and commented videos, so Luan's camera goes on top only once) and `Replays\Partida NN - ….replay`.
- They don't last: `Live.mp4` goes once it's on YouTube; `Jogo`/`Câmera` when the day is marked done or, oldest
  first, when the disk runs short (`depois-da-live`, "Free the disk"). After a day's shorts and commented videos,
  `python3 scripts/videos.py --done <date>`.
- The session: `content/matches/<id>.json` (`outputs`: when the recording started; each match's `start` and
  `at`) and `<id>.events.json` (each match's log: kickoffs, goals with km/h, shots, saves, demos, touches; players
  as roles `me`, `mate1`, `opp2`).
- A match's place in the recording: `match.start − record start`, plus an event's `t`. `Jogo.mp4` starts later
  (Source Record opens it when the game is first on screen: 83 s after the recording on 11-06); RLR takes its start
  from its name plus half a second (`forRecording` in `src/studio/sync.ts`). OBS's log has it to the millisecond
  (`[ffmpeg muxer: 'Gravar jogo'] Writing file`). Checked on 11-05: a goal
  the dock logged at 25:41.6 shows its explosion at 25:41.6 in the recording.

## RLR's studio (`~/repos/rlr`, `src/studio/`)

Published at muanlartins.com.br/rlr (also locally: `./run.sh` in `~/repos/rlr`, port 5180). Luan's way in:
**"Open a lives folder…"** on RLR's first page, pointed once at `Videos\Lives` (the browser remembers it; each visit is
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

## Shorts (the "modo short")

One take = one short; Luan only picks the play and talks. Everything else runs the same way every time:

1. **The plays** (`src/studio/plays.ts`, deterministic): Luan's goals (more for km/h, aerial, long, bicycle,
   flip reset, overtime), assists, epic saves, saves, flip resets and shots off the bar, from the dock's events,
   plus points for excited lines in the live's transcript at that moment ("que golaço"). Each loops from the
   kickoff or up to 9 s before to 2.5 s after. The transcript comes from the site, so the live's page must be
   published (`depois-da-live`) for those points.
2. **Recording:** in RLR, "Shorts" on a day of the lives list opens the best play: the picture is fixed at the
   screen's top left, 1080×1056 of the screen's own pixels (the game cut to the middle, V for the 3D in the same
   frame), the list and controls beside it. "Full screen", then "Connect OBS" and **"Record a short"**: the
   studio switches OBS to the **Shorts profile and scene collection** (`brand/twitch/obs_shorts.py --apply`, OBS
   closed: 1080×1920, the screen captured 1:1 from its corner, his camera 1080×864 under it, mic tracks 1 and 2,
   the browser's sound on 3), refusing while live, and every play shown while recording becomes a chapter named
   for it. "Back to the live's OBS" puts the live's profile back (`node scripts/obs.mjs` warns if it stayed on
   Shorts). Takes land in `Videos\Shorts`.
3. **The edit:** `scripts/.venv/bin/python scripts/shorts.py --apply` makes each chapter of each new take a
   short in `Videos\Shorts\prontos`: cut to his speech (silence on the mic track), captions word by word from
   whisper on the seam between play and camera (three words, the one being said in Klein claro, names as said:
   nothing is blanked), H.264/AAC for Instagram and YouTube Shorts. Over 60 s is reported, not cut. Luan reviews and posts.
   Whisper mishears brands and some words: read the transcript first and fix them with `--troca "ERRADA=CERTA"`
   (one word, case-insensitive, punctuation kept; 11-08: `Enlabs=Aimlabs`, `COVAX=KovaaK's`, `portaria=porcaria`,
   `Thiago=Tiago` from the handle on screen). A single word that is one of whisper's stock phrases ("obrigado") is
   kept; only a whole piece that is one goes.

## Shorts about the channel

Luan talks over his site and the lives' material (the crowd, the Live Pix, the studio, the dock's matches, the site's
history): Shorts collection, scene **"Navegador"**. Brave in full screen (F11) on the portrait monitor (1440×2560),
the site zoomed to 250 % so it takes its phone layout; OBS shows that monitor's middle 1440×1408 (where a video in
full screen lands; a page shows its middle) where the play goes,
his camera under it, Brave's sound on track 3. Tabs switch with Ctrl+Tab or Ctrl+1…9. Clips of the lives (the
crowd's goal, a Pix alert) are cut to `Videos\Shorts\Partes\clipes` or opened on the live's YouTube VOD at their
second. One take per short; `scripts/.venv/bin/python scripts/shorts.py --apply --sem-barras [--gancho "…"]` (a page
that sits still must not be read as browser bars). `--topo "0-39=live-pix.mp4@3"` puts a clip (from
`clipes`, from its second 3) in the top from take second 0 to 39, over the tab switching, while his camera and voice go
on; `"39-41=@45"` shows the take's own top from a later second. It applies to every short of that run: run it when
only that take is new.

### The run, as done on 11-07 and 11-08

1. `node scripts/obs.mjs`: not live (and Valorant's bridge, `curl -s 127.0.0.1:8792`, not in `"partida"`).
2. Watch which takes are new in `Videos\Shorts`, transcribe them (`words()` in shorts.py) and look at a few frames:
   Luan sometimes records a short twice; ask which take, delete the other.
3. A take without chapters (the channel's shorts) needs `--nome "<hh-mm-ss>=<Assunto>"`, the file's name in
   `prontos`; pass the same `--nome` on later runs too, or `plan()` sees it as not made. Takes of other days whose
   shorts exist under another name: delete them before running, or they're made again as "Short 1".
4. 11-08: `scripts/.venv/bin/python scripts/shorts.py --apply --sem-barras --nome "20-57-31=Afiliado"
   --nome "21-03-43=Mira no Valorant" --troca "Thiago=Tiago" --troca "Enlabs=Aimlabs" --troca "COVAX=KovaaK's"
   --troca "portaria=porcaria"`. 11-07 also used `--topo "12-56-21:0-39=live-pix.mp4@3"`.
5. To redo a short, delete its .mp4 in `prontos` and run again.

## Publishing shorts (YouTube and Instagram)

- **Schedule:** at most one or two a day, spread out; Luan approves the table first. No audience data behind it yet:
  late afternoon/evening for Brazil, and a game's short on the day of that game's live, a few hours before
  (11-09: Valorant's aim short Mon 18:00, before the 21:00 Valorant live; affiliate Tue 18:00). Times in Brasília.
- **YouTube:** the upload is Luan's, in Studio, as private (an unverified app's uploads stay locked private). He
  gives the ids; each short has `content/videos/<date>-<slug>.json` (id, title ending in the game's hashtag,
  description with the site page of the subject, Twitch and the site, tags, `publish_at` ISO with -03:00), then
  `scripts/.venv/bin/python scripts/youtube.py video content/videos/<file>.json --dry-run`, then without
  `--dry-run`: it sets the metadata and schedules; YouTube publishes by itself.
- **Instagram:** the Windows session with a browser schedules them in Meta Business Suite, Luan logged in. The
  handoff is a file in `C:\Users\muanl\Downloads\handoff-instagram-<…>.md` (file, caption with "link na bio"
  instead of URLs, date and time, "show Luan before confirming each one"), plus a one-line message Luan pastes in
  that session. Same times as YouTube.
- If something here is missing, the long-running Claude session named `muanlartins` (see `ListAgents`) has the
  history of these routines: ask it with `SendMessage`, then write the answer here.

## Commented videos

Luan opens a match from the lives list (its `Jogo.mp4`, the game alone, and the replay, in step), clicks
**"Full screen"**, **"Connect OBS"** and **"Record a video"**: the studio switches OBS to the **Vídeo profile and
scene collection** (`brand/twitch/obs_video.py --apply`, OBS closed: 1920×1080, the whole screen as it is, his
camera 480×270 at the bottom left in a Klein frame as on the lives, mic tracks 1 and 2, the browser's sound on 3),
refusing while live. In full screen the studio's controls fade unless the mouse is in the bottom 30% of the
screen, so he drives it with the keys (V, space, I/O, L, M) and turns the 3D camera without them showing; M marks
become chapters. "Back to the live's OBS" afterwards. Recordings land in `Videos\Comentados`
(`<date> <time> comentado.mp4`, CQP 20). The edit: `python3 scripts/comentado.py "<take>" --gancho 17:14.6-17:22.2
[--bip a-b] [--capitulo "17:15 O gol"]` (dry run first, then `--apply`) puts Luan's hook, the intro, the take trimmed
to his speech and the outro together in `Videos\Comentados\prontos`, at -14 LUFS, and prints the chapters for the
description. Luan picks the hook; the upload is his, in Studio.

Luan runs the studio in **Brave** (OBS's "Estúdio" sound source captures brave.exe since 11-06; before that it
pointed at Edge and the first takes came out without the game). If a take's track 3 is silent anyway,
`scripts/.venv/bin/python scripts/som_do_jogo.py "<take>" --partida N --apply` rebuilds it from the day's
`Jogo.mp4` (frame matching, the studio's speeds and pauses) as "<take> (com jogo).mp4", which `shorts.py` and
`comentado.py` use instead. Ask him to press the studio's "Full screen" before recording: on 11-06 the short was
taken with Brave's bars and the taskbar on screen (`shorts.py` cuts them now, at the cost of a 10 % zoom).

**Intro and outro** (Luan's plan, 11-06): recorded once each in the Vídeo collection's scene "Intro e outro" (the
camera filling the frame) and put on every video: the match's strongest 5–10 s first, then the intro (15–20 s: the
channel's idea, the series), the commentary, the outro (the lives, the site) with ~20 s at the end for YouTube's end
screen. Nothing that ages (no "today", rank or dates). Shorts get no intro, only a 3–5 s outro of their own, recorded in the Shorts collection's scene "Final" (the camera where "Short" has it, the top plain Klein: the edit fills it with the lives' tech in motion). Luan
records them and writes the words; Claude edits: trims the silences, levels to −14 LUFS, and adds what's on
screen (callouts, the tech, the hooks). The parts live in `Videos\Comentados\Partes` (`intro.mp4`, `outro.mp4`, raws
kept as `… (bruto).mp4`). The outros' edit is `scripts/montagem.py --apply` (its docstring has the recipe; a re-recorded part
needs its word timings measured again with whisper `-ml 1`, `POSES` picks his poses from a live's `Câmera.mkv`
and `SITE` is the shorts' list of what's on the site, Luan's to edit).

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

1. Test the Shorts and Vídeo profiles through the studio (OBS side checked 11-06: both capture the main monitor and
   the camera; `Tela` needs `monitor_id`, there are two monitors): the browser's sound and switching back.
2. A script joining a commented take with the intro and outro.
