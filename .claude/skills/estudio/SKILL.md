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

## Two kinds of short (Luan, 2026-11-11)

Keep them apart: they're found, chosen and edited differently.

| | **Highlights da live** | **Intencionais (de conteúdo)** |
|---|---|---|
| What | The live's best moments as they happened: his clowning first (the camera filters' bang, lines in character, the rage and the Terapia), the good plays second | Something Luan sets out to show: a play's reading in the studio, a feature of the channel or the site ("Jogar o replay", the Live Pix), his aim training |
| Who chooses | Claude finds candidates (transcript, kills, the camera box scan), sends a numbered candidates reel, **Luan picks by number**, before any edit | Luan: he decides the subject and records the take; his line is the hook |
| Shape | **One situation per short**, played almost whole (40-57 s), camera on top and game below, hard cuts only, the live's own sound: the stream-clip style of fcyacr's reels, Luan's model (11-11) | One take, one short |
| Tool | `scripts/destaque.py` (the edit turned up, Luan's ask of 11-12) or `scripts/clipe.py` (the plain stream clip), each with a JSON roteiro (the sections below) | `edicao.py` from a roteiro over his take ("Edição caprichada"), or the `short-editing` skill (Melvynx's engine, made for talking heads); `shorts.py`'s straight cut only for a first look or when he asks |
| Material | Live.mp4 (the clock, his camera with the filters), Jogo.mp4, Câmera.mkv (sharp camera) | The take in `Videos\Shorts` (studio's Shorts profile or the Navegador scene) |

Luan (11-11) wants the editing, visuals and sound raised across the board. For the highlights that first meant
less: the effects-heavy reel (`cortes.py`, below) was "horrível... edição caótica, efeitos visuais cafonas", and his
model became fcyacr's reels, nearly raw stream clips ("O foco são as palhaçadas mesmo"). Then (11-12), on the plain
clip: "ficou bem melhor, áudio não tá desencontrado", but no hook, not grabbing; he asked for "alta dopamina, bem
viciante, legendas brilhantes e animadas e efeitos sonoros e visuais que chamam a atenção". So the effects came back
on top of what worked: the moments whole and in sync, one stable layout, few cuts ("Destaque da live" below).

**Style from a reference, measured** (the `steal` skill, from Melvynx/video-agent-skills, installed 11-11 with
`short-editing`, `clips`, `editing` and `studio-setup`; origin in `.claude/skills/short-editing/ORIGEM.txt`): when
Luan points at reels he likes, measure them (cuts per second, layout, captions, sound, zooms, loudness) into
`video-agent/styles/<name>/STYLE.md` before editing, and compare the copy against them. Never invent a style.

## Where things are

- The live's folder (after `depois-da-live`): `C:\Users\muanl\Videos\Lives\<date>\` with
  `<hh-mm-ss> Live.mp4` (1080p60, webcam and overlays baked in at the bottom-left, tracks 1 Tudo, 2 Microfone,
  3 Jogo, 4 Discord), `<hh-mm-ss> Câmera.mkv` (the webcam alone), `<hh-mm-ss> Jogo.mp4` (the game alone, from
  11-06 on: what the studio plays for shorts and commented videos, so Luan's camera goes on top only once) and `Replays\Partida NN - ….replay`.
- They don't last: `Live.mp4` (once it's on YouTube), `Jogo` and `Câmera` go when the day is marked done or, oldest
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
   (one word, case-insensitive, punctuation kept; 11-08: `Enlabs=Aimlabs`, `COVAX=KovaaK's`,
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
   --nome "21-03-43=Mira no Valorant" --troca "Thiago=Tiago" --troca "Enlabs=Aimlabs" --troca "COVAX=KovaaK's"`.
   Ask Luan before "fixing" a word that sounds odd: "portaria do prata" was what he said. 11-07 also used `--topo "12-56-21:0-39=live-pix.mp4@3"`.
5. To redo a short, delete its .mp4 in `prontos` and run again.

## Edição caprichada: `scripts/edicao.py` (since 2026-11-11)

For the shorts worth more than `shorts.py`'s straight cut (Luan, 11-10: "efeitos visuais e sonoros, hook, dinamismo,
bons cortes"). It re-edits a take **frame by frame from a roteiro** (a beat sheet, `scripts/roteiros/<date>-<slug>.py`):
the top re-cut into shots from any moment of the take (forwards, rewound, slowed, sped up with motion blur, frozen),
each zoomed on what matters with a blurred copy behind; jump cuts on every pause; the camera alternating framings at
the cuts; impacts (shake, flash, zoom kick), a VHS rewind look, crisp brand overlays (comment card, chips, a stamp, a
ring that follows the picture); synthesised sound effects plus the stream's own (`brand/twitch/sons`); `shorts.py`'s
seam captions with the roteiro's key words bigger and Klein claro. First one: "Jogar o replay" (take 2026-11-10
23-20-03, 42.7 s → 37.5 s, no outro); its roteiro is the template, read it before writing a new one. Luan's verdict
on it (11-11): "o sem outro ficou EXCELENTE. A edição ficou EXCELENTE": the rules below and the roteiro's sound gains
are the approved baseline.

**The split:** choosing the moments (which footage under which words, where the hook is, which effect) is judgment,
Claude's with Luan; everything after is deterministic. The run:

1. Not live (`node scripts/obs.mjs status`): a render is ~6 min of all 12 cores. Never during a live.
2. `scripts/.venv/bin/python scripts/edicao.py scripts/roteiros/<file>.py --palavras` (with a stub roteiro: TAKE,
   NOME, TROCAS, and `roteiro(at)` returning one shot) prints each word with its second in the short and in the take.
   Map the take's screen too: grids of the stage every 0.3 s with timestamps (OpenCV, crop `PALCO`) show what's on
   screen when: the moments the beats need (11-11: the goal at 27.0, the menu click at 31.05, "Defendeu!" at 39.08).
3. Write the roteiro: `at("palavra")` (`#2` the second time, `>` its end, `|` the middle of the pause after it,
   where cuts go), `at(12.5)` a take second, `("fonte", 31.0)` the moment a shot shows take second 31.0 (for clicks
   and impacts on what's on screen). Shots cut on pauses; camera framings change on the same pauses.
4. `--quadros 0.3,4.0,…` writes stills (no captions) to `~/.cache/muanlartins/edicao/<take>/quadros`; look at a
   sheet of them, fix framing, then render without flags. `--ate 8 --rapido` is a quick look at the start.
5. Output: `prontos\<date> <time> - <NOME>.mp4`, ending on the payoff with no outro (`--outro` also writes
   `… (com outro).mp4`, not wanted so far). For Instagram's cover, save a frame of the payoff with his reaction as
   `… (capa).jpg` next to it (`ffmpeg -ss <s> -i <short> -frames:v 1 -q:v 2`). `shorts.py` would remake the take
   as "Short 1": run it with `--nome "<hh-mm-ss>=<NOME>"`, and delete the take and its cache folder once Luan
   approves the short (until then they stay for a second pass).

**What we found (11-11), as rules for the next roteiros:**
- **Hook:** frame 0 already in motion, never a still page; open on the payoff or its setup (here: the goal against
  sped in with a boom → rewound like a tape on "voltar" → him in control, frozen right before the touch on "erro?").
  The picture, his line and the captions point at the same thing, and it reads with the sound off.
- **Pace:** pauses over 0.2 s shrink to 0.12 s (0.22 s after a sentence): ~12 % shorter with nothing lost; a new
  shot every 1.5-3 s; the camera jumps 1.0 ↔ 1.10-1.12 on the cuts and pushes in slowly on the hook question and
  the ending.
- **Framing:** gameplay at zoom ~1.85-2.0 with the tool's UI cut off (`recorte`), the picture sitting at the top of
  the frame (`cy` = `TOPO`) so the blurred copy lies under it, behind the captions, and the car stays above them;
  UI moments zoom on the element. Small text doesn't survive the zoom: draw it again crisp as an overlay (RLR's
  title, the .replay file chip, "Jogando como muanlartins") instead of upscaling it.
- **One emphasis per moment:** slow motion on the miss, a red flash on the goal against, slow motion and a hit on
  the save's touch, the stamp and applause on "Defendeu!"; never all at once.
- **Sound:** effects 12-18 dB under the voice. Whoosh only at beat changes, not on every cut; pop on cards and chips;
  click on UI clicks; boom/hit on impacts; a riser into the payoff; ding + applause (`palmas`) on it; `uuuh` on the
  goal against. Loudness in two passes: −14.7 LUFS (the true-peak limit keeps the last 0.7 dB).
- **Safe zones (1080×1920):** YouTube Shorts covers the top 288 px, the bottom 672 px and the right 192 px; Reels
  and TikTok about the same. Overlays go in x 120-888, y 288-1248; the seam captions (y ~960-1040) are safe.
- **Credit on screen:** the suggestion's real comment as a card, read through `youtube.py`'s client
  (`comments().list(part="snippet", id=<lc id from the changelog's link>)`), quoted as written, the key part in Klein.

**For the takes (tell Luan before he records):**
- The zooms are soft because the Navegador take had RLR in a 1920-wide window shrunk to 1080: a 2× zoom upscales a
  picture already at 56 %. Record the browser at its own size (RLR's short mode, or full-screen Brave captured 1:1)
  and the same zooms stay sharp.
- Open with the hook line in one breath, keep the talk in the order of what's on screen, and end on the payoff
  line while the payoff is on screen ("e defender meu gol" with "Defendeu!").

**Open, Luan's call:**
- ~~Outro or not~~: decided 11-11, no outro (the research agrees: ~5 % of top clips have one, end ≤ 1 s after the
  payoff). What to watch instead: Studio's "viewed vs. swiped away" and average % viewed of the caprichados against
  the straight-cut shorts (no official thresholds: ~70-80 % viewed and 70-90 % average are community numbers).
- Music: none yet (most top clips have none). If wanted: a YouTube Audio Library track 18-24 dB under the voice with
  ducking (not built), or Instagram's trending audio added in the app at low volume.
- The effects are synthesised and Claude can't hear them: Luan heard the first short's and approved (11-11); keep
  its gains as the reference and ask him again only for a new kind of sound.
- His face sits at y ~1400-1750, under the platforms' title and buttons on all three: a layout question for
  `obs_shorts.py` (smaller camera, or higher).
- A loop: a last line that runs into the first, so replays look seamless (every replay counts as a view since 2025).

Sources (11-11 research): YouTube on Shorts views and the "viewed vs. swiped" metric
(support.google.com/youtube/answer/12220281, /answer/12942217), safe zones (support.google.com/google-ads/answer/9128498),
Jenny Hoyos' hooks (vidiq.com/blog/post/how-jenny-hoyos-gets-10m-views-per-youtube-short), Paddy Galloway's 5,400
Shorts (threadreaderapp.com/thread/1646898356419981315.html), YouTube's −14 LUFS
(productionadvice.co.uk/stats-for-nerds). Most editing advice (cut rate, SFX, caption style) is practitioners'
folklore with no data behind it: treat it as defaults to test, not facts.

## Highlights da live: `scripts/clipe.py` (since 2026-11-11)

The style is fcyacr's (`video-agent/styles/fcyacr/STYLE.md`, measured from the three reels Luan sent): one situation
per short, played almost whole, his camera on top (1080×840) and the game's middle square below (1080×1080), hard
cuts only to drop dead time, no captions on the plays, no effects, no sound effects, no music, the live's own sound
at -15 LUFS. `scripts/roteiros/2026-11-09-bang-clipe.json` is the template ("quer que faça a bang? Puf!" on the big
camera under the hook line, then Lotus' last round with the bang on the camera and in the game, VICTORY: two
stretches, 42.7 s).

- **The hook (Luan, 11-11, on the first test in this style):** "ficou bem melhor, áudio não tá desencontrado, ainda
  não tá com o fator hook e não está exatamente chamando a atenção". What he asked: open on the gag itself with a
  hook line over it ("Bangando de Phoenix IRL") while it plays, then cut to the play. So the stretches play in the
  roteiro's order, not the live's (the payoff first, the play after it), and a stretch can carry `"texto"`: the line
  in white Space Grotesk Bold 112 px with a dark outline, two balanced lines centred on the seam, from the first
  frame (until `"texto_ate"` or the stretch's end). That is the one thing on screen that isn't the live's; the rest
  of the style holds. The camera stays split, never whole-screen: his 720p camera cut to 9:16 is a soft face blown
  up 2.7×.

- **Sync: Live.mp4 is the clock.** Its picture and sound are in step (Luan checked the VOD; his lips against his
  voice put it at -60 ms, the natural lead of the mouth over the sound, 2026-11-11). The Source Record files are
  not: when OBS's audio buffering jumped ("Max audio buffering reached!", set off by the effects' trigger sources
  playing a silent WAV; 11-09 and 11-10; fixed 11-11, see the `obs` skill and `antes-da-live`), their sound came
  ~0.93 s late behind their own picture. So Jogo.mp4 is placed by the game's sound (`cortes.offset`) and then moved
  by the game's picture (`cortes.picture_lag`), and Câmera.mkv likewise by the mic (`camera_sound`) and his head
  (`camera_lag`). Never shift Live.mp4's picture. From 11-12 on the Source Record files should stay in step; the
  picture match still runs and would show ~0.
- **The mistake to not repeat (11-09 cuts):** I took Jogo.mp4 and Câmera.mkv as in step and Live.mp4 as late, and
  shifted Live.mp4's picture by ~0.97 s, which put his face and the game ~1 s ahead of his voice in every cut. Luan
  saw it three times. Check sync against a reference he can confirm (Live.mp4, the VOD, a clap), never against a
  Source Record file, and verify the output: `clipe.py`'s output was checked frame by frame against Live.mp4 (camera,
  game and sound at 0 ms).
- **Camera:** in the game scenes the live's box is only 480×270, so the camera comes from Câmera.mkv (1280×720),
  with the filter's costume, flash and fire laid over it from the box wherever the two differ (a difference mask);
  his face stays sharp. The box's rank plate is kept out of the mask (`PLATE`). In the camera scenes (Conversa) the
  live already has 1280×720 with the filter. A roteiro stretch says which (`"camera": "jogo" | "conversa"`); a camera
  scene takes its part's game sync (the live shows neither the game's picture nor its sound there).
- **Material to improve:** the filter only exists in the live's small box during games. Recording the Filtros
  browser source at 1280×720 (Source Record on it, or a scene with camera + Filtros) would give the costume sharp
  too. Luan's call.
- **The markers first** (since 11-12): `scripts/momentos.py <date>` prints in Live.mp4's seconds what a live marks by
  itself: OBS's log (Terapia, Lance ruim, Conversa, Fim, and each VAR save: Luan's own "chama o VAR", the clip also
  in `Lives\<date>\VAR`), Rocket League's goals (his, the team's, theirs; overtime, aerial, long), his demolitions and
  epic saves and each match's end from the dock's events, and the transcript's lines with a reaction or a filter's
  word. The transcript and the events can be on the post-live branch only (`../muanlartins-live`): pass `--falas`
  and `--eventos`. Then a sheet of single frames at the seconds you're weighing (what the camera shows: Conversa's
  big camera with the filter, a cat, the Terapia) before the list. On 11-12 the Lance ruim scene was a celebration
  (his winner, the promotion to Diamond 3, "shhh"), not a bad play.
- **Lives in one piece** have no `partes.json` (videos.py writes it only when it joins pieces): `cortes.parts`
  then takes each file's start from its name and its length from ffprobe, so the scripts work on them too.
- **Finding the moments:** the transcript (`content/lives/<date>.transcript.json`) for his reactions ("meu Deus",
  "que isso", lines in character); `scripts/valorant_kills.py <date>` for his kills in live time, from his entries
  in the killfeed (his name on the killer's side; 18/18 and 19/19 on 11-09 after it stopped counting his deaths;
  Valorant's kill banner varies by kill, so it doesn't work); `scripts/candidatos.py <date> --camera`, a scan of
  Live.mp4's camera box at 10 fps for the filter's flash (warm glare over half the box for ~1.5 s), its fire (flat
  orange) and the "Lance ruim"/Terapia scenes (the Pix QR gone): 92 flashes, 21 fires, 20 scenes on 11-09. The
  glare and fire tests are Phoenix's: Sova (bow, Recon Bolt, owl) and the cars (Octane, Fennec, the ball, flips,
  "explode a cabeça") don't show in them, so for those lives the transcript and `momentos.py` lead.
- **Luan picks the moments before any edit** (11-11): a candidates reel cut raw from Live.mp4, numbered with a
  one-line label each (`scripts/candidatos.py <date> lista.json` → `Videos\Shorts\candidatos\<date> live -
  candidatos.mp4`), and the list in the message; he answers with numbers. Keep the list in
  `~/.cache/muanlartins/edicao/candidatos-<date>.json` (the scratchpad dies with WSL) and each window a few seconds
  before the play, so he sees what the reaction is about. His picks from 21 on 11-09: the bang in the
  game and on the camera at once followed by a kill (40:03), the bang on the camera + in the game at Lotus' last
  round (58:31), "quer que faça a bang?" on the big camera (59:17), the rage into the Terapia (73:04), and two kills in
  a row into the zoomed camera (90:10). Shots alone and lines without a picture didn't make it: the highlight is a gag
  he can see. In this style each pick that holds a whole situation is its own short (58:31 and 59:17 are one).
- **Run:** write the roteiro (stretches in Live.mp4 seconds, from the transcript and the sheets), `clipe.py`, then
  sheets of the output and the sync check against Live.mp4 before showing it.

## Destaque da live: `scripts/destaque.py` (since 2026-11-12)

The high-dopamine highlight: clipe.py's picture (his sharp camera with the filter's costume on top, the game's
square below, Live.mp4 the clock) with the edit turned up. First one: "a bang do Phoenix",
`scripts/roteiros/2026-11-09-phoenix.json` (the template; its docstring-like keys are in `destaque.py`'s header):
Luan's picks 7, 12, 13, 15 and 21 in ten stretches, 33.5 s, `prontos\2026-11-09 destaque - a bang do Phoenix.mp4`.

- **Shape:** the hook first (the IRL bang, "Quer que faça a bang? Puf!", under the title "BANGANDO DE PHOENIX IRL"
  slammed in on the game's half), then the moments in the live's order, each whole enough to read (2-5 s, a
  stretch never chopped into beats): the bang in the game and on the camera at once and the kill, "olha o bang" and
  the flash, VICTORY, the rage ("Ai, sai, sai, filha da… Perdão, perdão"), the Terapia, two kills, "shhh" in Lance
  ruim, and "Watch your eyes" with the flash going white, which loops into the hook.
- **Captions:** word by word on the seam (y 840), three words / 13 characters at most, never across a cut; Archivo
  Black capitals 92 px (short-editing's fonts), black edge 9, soft shadow; the word being said pops in (132% → 100%
  in 110 ms) gold with a fire glow, then stays white; `destaques` stay fire and 12% bigger. ASS, burnt by libass.
  Whisper's words are pulled out of the mic's pauses (`edicao.snap`), words it put on one instant are spread over
  the time they took, and `corrigir` / `palavras` fix what it heard wrong ("alabangip" was "olha o bang", the
  "shhh" came out "A cidade no Brasil").
- **Effects** (in short-editing's restraint, one emphasis per beat): a full-frame warm flash with a shake and a
  zoom kick on each of the filter's flashes (it extends the camera's flash over the game); a white flash and a kick
  on the game's half on each kill; slow pushes (1.1-1.3) into a reaction or a kill; a kick on "Perdão".
- **Sound:** the live's mix at -20 dBFS with short-editing's `impact-boom` on the flashes, `riser` into the first
  and the last, `zhhh` at the moment changes, edicao's `hit` on kills, `pop` on "Perdão", `ding` into the Terapia,
  the stream's `uuuh` on "filha da…" and `palmas` on VICTORY, 7-18 dB under the voice. -15.2 LUFS, peak -2.6 dBFS.
- **Sync, checked on the output** (camera, game and sound against Live.mp4 per stretch, 0 ms everywhere): a game
  stretch's sync is measured over 24 s around it, never over itself (a 2 s stretch on VICTORY measured the game
  83 ms off, 3 s of kills put the camera 67 ms off); the part's median sound offset and picture lag for every
  stretch; the camera's lag per stretch. Every stretch is a whole number of frames (`-frames:v`): pieces cut by
  seconds lost a frame here and there and the picture ended 0.13 s ahead of the sound.
- **Camera composite** (clipe.py's `hd_camera`, shared): difference threshold 22 and a 12 px blur keep the
  costume's dark hair whole over his own (38 and 5 left holes); the box's rank plate is zeroed after the blur
  (`geq`) or it ghosts in at the top. The Terapia scene's box (64, 64, 560, 315) slides in for ~0.5 s: the
  stretch takes only Câmera.mkv until it settles (`filtro_de`), under a white flash. Its page below is cropped
  around "Respira." and the breathing circle, with the box covered by the page's own background from the right.
- **Caches** are named by their recipe (a changed stretch or filter is a new file): never delete to redo; the
  folder goes with the live's material once Luan approves the short.
- **Any scene, any game (11-12, for the Sova and Diamante destaques):** the roteiro's `"jogo"` picks the game
  scenes' camera box (Valorant's at (44, 44), Rocket League's at (44, 740)); a stretch's `"camera"` is the scene the
  live showed (`jogo`, `conversa` for Conversa and Fim, `terapia`, `var`, `lance`) and its `"baixo"` the lower half:
  `jogo` (Jogo.mp4's square), `palco` (the live's Klein with its lattice, for moments with no game: the
  filters' showcase, a bit in Conversa, with `"rotulos"` naming what happens: "FLECHA DE CHOQUE", "BANG") or a part of
  the live's screen `[x, y, w, h]` fitted in (the VAR's monitor `[64, 136, 1216, 684]` in Valorant's VAR scene, the VAR
  panel `[1220, 28, 676, 668]` over Rocket League's game, the credits column `[1370, 60, 520, 1020]` in Fim). Every
  camera but `lance` is now Câmera.mkv with the filter's costume over it, Conversa too (the live's own camera there is
  the filter page's copy at ~22 new frames a second, Câmera.mkv ~27). Where a car or a costume hides his face the
  camera's picture can't be matched (`camera_lag` quality ~0.01 all through 11-12's cars): the roteiro's best match
  or `camera_lag` (0.017 s, measured clean in 11-11's VAR scene) stands in; Source Record is in step since OBS's fix.
- **The cover** (11-12, Luan on the lives' new thumbnails: "ficaram excelentes... dá pra gente se inspirar pra thumb
  do shorts também, no mesmo estilo"): `scripts/capa.py` draws it standing up, 1080×1920, with thumb.py's own pieces
  (his cutout keyed off the camera's Klein, Branco outline, the blurred game, the hook's two lines with the second on
  the plate, a Klein tag "DA LIVE · dd/mm", a rank's emblem glowing). The roteiro's `"capa"` object says the face's
  second and source (`camera` = Câmera.mkv; `conversa` = the live's big camera, with the filter's costume), the
  background's second and the hook; destaque.py calls it at the end (a plain number is still a frame of the short). A
  blue car's face is keyed out with the background: no Octane covers. Same hooks rule as the thumbnails: two to four
  words that say what happened.
- **Whisper on short windows:** each stretch is heard alone, so words at its edges get lost or misheard; widen the
  stretch by a few tenths, check `--palavras`, and fix with `trocas`/`corrigir`/`palavras` (corrigir keys are the
  snapped starts, before words on one instant are spread). It also completes clichés the mic never had: 11-12's
  "caramba, eu tenho um amigo [silence]" came out "…amigo no trânsito". Check the mic track (`0:a:1`) when a line
  ends a bit.
- **Verdict and what's next (11-12):** "ficou legal"; published as "Bangando de Phoenix IRL 💥 #Valorant"
  (sL8qIIJ5tX8, Fri 11-13 12:00). He found the start "um pouco travado, mas isso é natural". Measured: not the light
  (NVIDIA Broadcast's log has the C922 in and its output at a steady 30.0 fps through the live); Câmera.mkv has ~25-27
  new frames a second, unevenly paced (OBS's capture drops a few), and with Phoenix on, the live's face is drawn by
  the filter page, which ran ~17-18 fps during Valorant. The hook's `conversa` stretches crop Live.mp4, so they are the
  choppiest part. Next time build `conversa` stretches with `hd_camera` too (Câmera.mkv under the filter's mask), as
  the `jogo` stretches already are.
- **One moment per short, ~40 s (Luan, 11-12, after the Sova and Diamante reels, 70 and 78 s with 8 moments
  each):** "a gente tenta tenta e não fica muito bom... precisamos de algo menor". The ace's cut was "decente"; the
  Rocket League ones were funny only because "o fim da frase sempre cortava", which made them confusing. Measured
  after: 17 of the Diamante's 20 edges (11 of the Sova's) fell while his mic was at speech level; the ace held because
  he was silent through it. His rules since: under a minute, about 40 s; sound and visual effects to grab attention
  at the start (he wants them: "DEVE!"), then the stretches play whole; the transitions between stretches animated,
  with sound; the shorts' outro ("acessa meu site") back at the end. The picks of that round became two shorts:
  the ace (`2026-11-11-ace.json`: the five kills in three stretches, then, zoomed in, the Sova filter's showcase in
  Conversa: the recon arrow drawn with his hands and "I am the hunter"; 11-13, Luan: the "mira mal afiada… vai ser
  feio" joke after the ace "não fez muito sentido", and "o ace de sheriff é feio mas é um ace de sheriff"; then discarded: "o conteúdo não foi bom". Editing doesn't save a
  weak moment: a play has to be good to watch on its own before it's worth a short) and the Diamante 3 game
  (`2026-11-12-diamante-3.json`: "isso é o que um covarde faria, mas Luan Martins… tirei o cara do gol… se não tem
  defensor, não tem defesa", the forfeit win, the "shhh" in Lance ruim, the promotion screen).
- **Edges on the mic's pauses (`bordas`, since 11-12):** before anything else, every stretch's start moves back to
  where his speech began and its end forward to where it stops (a pause is 0.25 s under edicao's -52 dBFS on the
  mic track `0:a:1`; 0.2 s of quiet kept before, 0.3 s after, never within 0.1 s of the speech on the other side; up to 2.5 s). No pause near enough stops the run
  ("cortes no meio da fala"): change the stretch, end it at an earlier pause, or join it to the next. `"seco": "de" |
  "ate" | true` keeps an edge as written, for two stretches that follow each other in the live (a scene switch:
  the forfeit win and Lance ruim) or a cut on the game alone. Put such a seam on the frame where Live.mp4 switches,
  from a sheet of frames 0.05 s apart: OBS's log said 7375.6 for that Lance ruim, the picture switched at 7375.23
  (a stretch past it showed the next scene's blue in the camera's box for a moment). It prints every edge it moved; `--palavras`
  shows the words that came in with it.
- **Transitions (since 11-12):** each stretch after the first comes in with its `"entrada"`: `whip` (default: the
  frame swept left with motion blur, 0.12 s out and 0.2 s in, and a whoosh peaking on the cut), `zoom` (punched in
  and out with a white flash, a short whoosh and a hit: into the punchline), `flash` (with a pop) or `seco`. They
  sit on the whole frame, under the captions.
- **The outro:** `Videos\Shorts\Partes\outro-editado.mp4` (montagem.py, 4.3 s) is joined after the short unless the
  roteiro says `"outro": false`. The levelled sound is written whole (`som.wav`) before the join: muxed with the video
  under `-shortest`, loudnorm's ~3 s lookahead was dropped and the last 3 s before the outro came out silent (11-12).
  Check the end's level on every render with an outro.
- **How editors cut (`pesquisa-cortes.md`, beside this file, researched 11-12 when Luan asked for "algo que te
  ensine a fazer esses cortes"):** sourced rules with how strong each source is (little real data: Galloway's 5,400
  Shorts, Hoyos's and Colin & Samir's analytics), a YAML block of defaults and the hard gates before showing anything.
  Taken so far: edges on the mic (0.2 s before his speech, 0.3 s after, never within 0.1 s of the next), the
  transition zoom at 1.2, frame 0 on the payoff (the Diamante short opens on "Diamante 3!" from the promotion
  screen, 1.3 s, then the play from its start). Where it disagrees with Luan, Luan wins: it says no outro (Hoyos
  cut one second off an ending and retention went 83% → 88%) and at most 3 designed transitions; he asked for the
  outro back and for animated transitions. Its references (Tixinha, Cortes do Gaules, tarik, Lethamyr, ckeyz…)
  were read from titles, never watched: measure one with the `steal` skill before copying it.
- **One play, made intense (11-18, "4K de Sage", `2026-11-18-4k.json`):** Luan asked for a 4K "com os efeitos
  sonoros e visuais adequados pra dar uma intensidade pra jogada", the outro, and research on good reels:
  `pesquisa-reel-jogada.md` beside this file (an addendum to `pesquisa-cortes.md`). What it changed: Valorant already
  builds a multi-kill (the kill sound climbs a note per kill, the top bar counts who's alive), so kills 1-3 get
  nothing added (no counter, no stamps, no SFX, no shake) and the last kill is the one designed moment: a punch on the
  game's half only (`"soco"`: 1.10 at the crosshair, in over 5 frames, held 0.4 s, out over 15), a white flash on
  that half for two frames (`"flash_tau": 0.03`, `"onde": "jogo"`) and an impact in layers that a phone can play
  (`impact-boom` + `hit` + `click` on the kill's frame). The hook opens 1-1.5 s before the first kill with one hit and
  2-4 words (count + the unusual fact: a healer with four kills) on the camera's foot (`"y": 770`), above the game's
  top bar; never a teaser of the last kill (the count would restart). Riot's own 4K Shorts run 11-26 s: about 20-30 s
  of play, at most two internal cuts (hard, `"entrada": "seco"`, right after a kill), never cutting the wait before
  the last kill under 3 s. Kill frames from the kill banner's first frame (white skull under the crosshair at
  ~(960, 850) in the game), not from the killfeed scan (~0.1 s late). He was silent and stone-faced through it, so no
  captions (`sem_legenda`).
- **A live not filed yet (11-18):** `"arquivos"` names the loose recordings in Videos (OBS's names), so a short needn't
  wait for `videos.py`. That day two game recordings ran at once (the Diversos scene's, black once he left it, and
  Valorant's): `videos.py` would join them end to end, wrongly. Câmera.mkv has been 854×480 since 11-13 (OBS crops it, "Enquadramento", before "Gravar câmera"; taken at 1280×720 by
  `hd_camera` and `camera_lag`). No camera filter that day: `"filtro": false` (Câmera.mkv alone on top) and
  `"camera_recorte"` frames his head.
- **The meme gag (11-19, approved: "ficou muito interessante, até que tu tem um bom senso de humor!!"):** Luan asked
  to mock his mouth moving while he concentrates, the way meme edits pop a picture that looks like the person on
  screen with a sound effect. Strips of his mouth every 0.2 s (Câmera.mkv cropped around it) showed an "O" on kills
  2, 3 and 4, so: a goldfish with his round glasses, curly hair and moustache, drawn by Gemini's image model
  (`gemini-3.1-flash-image`, his key in `%USERPROFILE%\.config\muanlartins\gemini-chave.txt`; a text prompt only,
  no photo of him; then the same image with the mouth closed; on flat green, keyed with a white sticker outline into
  `Videos\Shorts\Partes\figurinhas\`). Each beat: a `"soco"` on the camera (1.7 about a `"centro"` that lands his
  mouth on the left), the sticker on the right (`"figurinhas"`, swapping to the open mouth over the ranges his mouth
  is open), a `bloop` per opening; on the last kill this replaces the game's punch (never both halves moving). Stock
  meme pictures are someone's copyright: draw our own. The cover takes the sticker too (`capa.figurinha`).
- **Four reels from one live (11-20, Champion I), the fish's line turned up:** Luan picked seven candidates and asked
  for "estilo dopamina de reels, bons efeitos visuais e sonoros": the fish reel was the bar ("ainda dava pra aumentar
  um pouquinho nos efeitos e cortes"), "talvez todos os momentos do champion mereçam ficar num reels só", and a cycle of
  feedback to tune these instructions. Made: `2026-11-20-champion.json` (the rollercoaster, 29.6 s: the promotion
  screen's flash as the hook, "eu não sei se eu sequer já fui campeão", the first Champion match's goal against and
  "isso aqui é um choque de realidade" electrocuted, "a gente caiu" with a falling whistle on the live's Klein, "subiu
  pro Champion de volta", "alegria de pobre dura pouco" with a rimshot), `-gata.json` (the overtime goal with the cat
  on the desk: a teaser of the cat held up, then the stretch whole from "Nossa, muito perto. Não, filha, agora não"
  through the goal to "um belo exemplar de gato", then him singing "Champion" holding her), `-hat-trick.json` (three
  goals in two minutes, "hoje eu acordei diferente" with laser eyes, and an owl asleep in the goal's corner on "como o
  JP diz, onde a coruja dorme") and `-formiguinhas.json` (two demolitions and JK's goal, "limpei as formiguinhas do
  campo" with a broom, his goal, and the Octane filter flipping on his head: "toma flip do Octane na cabeça", bonk).
  The cat first closed the rollercoaster: it ran past a minute, so it got its own reel. Shape of each: a 1.3-1.9 s
  teaser of the payoff line under the title, then the play in order, each beat whole, one emphasis per beat.
  - **Stickers, all in the fish's style:** one base drawn from a text prompt (him electrocuted: curly hair standing,
    round glasses, moustache), then every other one as an edit of it (the same picture as an X-ray skeleton, with a
    broom, with laser eyes, an owl in its style), so they match; on flat green, keyed (green minus max(r, b), despill)
    into `Videos\Shorts\Partes\figurinhas\`. The electrocution swaps the two pictures every 0.12 s with `"choque"`
    flickering the camera's half and a `zap`.
  - **Names on screen:** I blurred the opponents' rows, the goal cards and the notices; Luan, 11-20: "não precisa
    omitir os jogadores do outro time igual você fez não! Esquece isso." The game's own screens stay as they are in
    shorts (`borrar` is still there for something that really must go).
  - **His verdict (11-20):** the drawn stickers of him ("esses diagramas meus cabeludos… ficou horrível", "odiei o meu
    desenho") are out; the ideas around them were right (the shock's sound, flicker and swapping picture:
    "excelente"). He wants current memes, the stickers and formats people use on Reels/TikTok (deal-with-it glasses,
    the square-jawed sigma, a cat for everything), effects that tell the moment (the Champion emblem shattering into
    Diamond and evolving back), and each short worked on with full attention: one agent per short, in parallel.
    The gata's cuts were "excelentes"; the hat-trick's edit "tá bem boa". The outro is gone from shorts.
  - **Captions read whole before showing:** whisper on a short window heard "Alegria de pau de Turafogo" for "alegria
    de pobre dura pouco", and a half-applied fix made it "pau dura". `corrigir` keys are the snapped starts *before*
    `spread` (the raw cache in the work folder shows them); a word that appears once is safer fixed in `trocas`.
  - **A teaser replays a later stretch's seconds**, so every time in it went to the teaser: the laser sticker meant
    for the end stayed on the whole short, the cat's closing title showed twice at the start. `"trecho"` places an
    effect in its own stretch.
- **The second round (11-20/21): one agent per short, an `"extra"` module each** (`scripts/efeitos/2026-11-20-*.py`,
  the shared brief in `~/.cache/muanlartins/ferramentas/brief-shorts-2026-11-20.md`; memes:
  `pesquisa-memes.md` beside this file, with sources to check on the day, picks by situation and the Content ID traps).
  What each became, and the techniques worth reusing:
  - *montanha-russa*: Diamond III filling with light and bursting into Champion I on the game's own flash; a meme cat
    (Gemini, X-ray frame from the same picture so the swap lines up) for the shock; the Champion emblem cracking on each
    "caiu" and shattering into Diamond (cracks as jagged radials + bowed rings, shards cut from the gaps with
    `cv2.connectedComponents`, tumbling as rotation × cos φ with a darker back); a Pokémon-style evolution dialog
    ("O quê? DIAMANTE III está evoluindo!", swaps accelerating 2.5 → 17 Hz with the riser on the same curve); party cat
    → record scratch, grey freeze → crying cat thumbs-up with a sad trombone. Where a stretch runs into the live's
    stinger, freeze the last clean camera frame (`hold_camera`).
  - *gata*: the Klein background swapped for heaven (rays, halo found on the cat each frame: not Klein, not skin,
    light, biggest blob, top of it, ±3 frames smoothing), a synthesized choir; the shot as tension (push-in on the
    ball up to 1.75×, desaturation, vignette pulsing with a heartbeat 75 → 150 bpm, riser + snare roll, 40 ms of
    silence) released on the explosion's first frame; the lift as a club (beams, strobe on each "CHAM", confetti,
    crown, emblem, "CHAMPION" bouncing on his syllables at his own 126 bpm). Swap the background before zooms and
    transitions (those stretches `"entrada": "seco"`, the module redoes them). A preview script that runs frames
    through the module without a full render: ~50 s a try instead of ~4.5 min.
  - *hoje eu acordei diferente*: a black-and-white Gigachad of him (Gemini edit of his own frame; asking it to
    remove the glasses keeps it aligned pixel for pixel) with pixel deal-with-it shades (24×8 sprite) as the hook and
    the ending; on "onde a coruja dorme" the Gigachad cuts in; at the end the costume goes (`"filtro": false`) and the
    shades slide onto his real eyes, tracked with Lucas-Kanade on the glasses' and brows' corners (forward-backward
    < 0.7 px, RANSAC similarity, re-seed under 25 points, 5-frame average), then a synthesized 808 drop.
  - *formiguinhas*: a real 3D broom (three.js headless, 420 straw ribbons recomputed each frame, two 1080×620 tiles,
    ~1 s a frame) sweeping orange Octanes (`public/models/octane.glb`) like ants, its handle reaching his chest so the
    sweep is his; the demolished cars splat on the screen like bugs; ants circling his head after the flip. The scene
    writes a JSON per frame (broom tip, contacts, hits) and the sounds are built from it; exact beats from
    `content/matches/<id>.events.json`.
  - Sounds on phones: pure sub is inaudible; saturate thumps, add 2nd/3rd harmonics and a mid "growl", cut < 40 Hz.
  - `antes` runs after the transitions: a picture replacing a half has to redo the transition itself.
- **Round 3 (11-21), after "NOSSA SENHORA eu estou IMPRESSIONADO… eu dou as ideias, você executa, e a gente vai
  reiterando":** the captions and titles moved to the channel's look in destaque.py (`Legendas`, `title_sprite`),
  and the modules' own texts with them (ctx.grotesk, ctx.plate, ctx.cores). Photoreal edits of HIM from his own frame
  are what he loves (the Gigachad "GENIAL… MUITO ENGRAÇADO"); a pose change keeps the face when the prompt only asks
  for the pose ("same man, same light, now does X"). What changed: the Gigachad's ending cycles bodybuilding poses
  on the 808s; the goal labels are a Klein band with a hat-trick meter filling a slot per goal (a chime a note higher
  each); the sweep has its own 3D stage (a Klein floor with the lattice, rendered once from the scene's camera, the
  moving objects over it) behind a 45° wipe; his goal got a film-style build (colour draining, focus lines, a
  speedometer ticking up, heartbeat 83 → 180 bpm, a freeze-frame hit) before "110 KM/H" stamps in the thumbnails'
  style; the promotion got a stadium chanting "É campeão!" made from 11 edge-tts voices × 2 (44 layers per chant,
  ±2 semitones, σ 30 ms, 220-4200 Hz, claps, 1.8 s echo; no recordings); the shock is a photoreal him electrocuted
  ↔ X-ray; "alegria de pobre dura pouco" is him ostentando (crown, chains, money rain) → record scratch, grey →
  him drenched and sad in the rain. A bouncing on-brand text swaps two pre-drawn plates (Branco, Klein) per beat.
- **Still open:** music (none yet); the outro's effect on retention once a few shorts have their numbers.

**The effects-heavy edit (`scripts/cortes.py`, rejected 11-11):** five picks chopped into 14 stretches in 34 s,
freezes, stamps, title cards, a sound effect on most beats, all ~1 s out of sync from the mistake above (its sync
is fixed now: `camera` 0, `jogo` by picture). Luan: "cortes desconexos, sem noção, edição caótica, efeitos visuais
cafonas, efeitos sonoros mais ou menos". It stays for a short that really calls for keyed zooms and effects, and
only when he asks. Still true from that round: whisper gets names and slang wrong (TROCAS: loucão→Lucão,
Palma→fama, InLabs→Aimlabs) and invents "Transcrição e Legendas por…" in silences; Windows ffmpeg's GPU decode
shears frames when the crop width is odd.

## Publishing shorts (YouTube and Instagram)

- **Schedule:** two or three a day since 11-20 (Luan wants more shorts, with produced videos starting), spread out and
  apart from the long videos' hours; Luan approves the table first. No audience data behind it yet:
  late afternoon/evening for Brazil, and a game's short on the day of that game's live, a few hours before
  (11-09: Valorant's aim short Mon 18:00, before the 21:00 Valorant live; affiliate Tue 18:00; 11-12: RLR's "Jogar o
  replay" Thu 12:00, before the 14:30 Rocket League live, at lunch). Times in Brasília.
- **YouTube:** the upload is Luan's, in Studio, as private (an unverified app's uploads stay locked private). He
  gives the ids; each short has `content/videos/<date>-<slug>.json` (id, title ending in the game's hashtag,
  description with the site page of the subject, Twitch and the site, tags, `publish_at` ISO with -03:00), then
  `scripts/.venv/bin/python scripts/youtube.py video content/videos/<file>.json --dry-run`, then without
  `--dry-run`: it sets the metadata and schedules; YouTube publishes by itself.
- **Instagram:** scheduled in Meta Business Suite in Luan's own browser (Brave, signed in). Since 11-12 that needs
  no handoff: from WSL, run the Windows Claude Code headless with only the Claude in Chrome tools,
  `cd /mnt/c/Users/muanl && ./.local/bin/claude.exe -p --chrome --permission-mode bypassPermissions --tools ""
  --output-format text "<task>"` (from a Windows folder; the permission mode lets it answer the extension's site
  prompts as his interactive sessions do, and `--tools ""` leaves it nothing but the browser). Tell it to close the
  tabs it opens and to **stop before the final button** (Agendar, Compartilhar, Publicar) and report; the click is
  Luan's OK. Caption with "link na bio" instead of URLs, same times as YouTube. The same route reads YouTube Studio
  (checked 11-12: the scheduled short, signed in). The old handoff files (`Downloads\handoff-instagram-<…>.md`,
  `Videos\Shorts\prontos\para-postar.md`) hold the steps if a session in Windows does it instead.
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
