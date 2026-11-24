---
name: depois-da-live
description: The routine after one of Luan's Twitch lives - file the recordings and replays, write the live's page and transcript, cut three videos of its matches, schedule the YouTube VOD after them, release. Use when he says the live ended or asks to process a live's VOD.
---

# After a live

The detailed history and the YouTube API setup are in `handoff/README.md` ("3. After each live"); this is
the routine. Talk to Luan in pt-BR. `<date>` is the live's day, `YYYY-MM-DD`.

## A day of another game ("Jogos diversos", since 2026-11-21)

Any game besides Rocket League and Valorant (Celeste first; the OBS scene "Diversos + chat") is on the site at
`/conteudo/diversos`, each game with its page, its lives, hours and goal, from `content/diversos.json` (`lib/diversos.ts`).
Luan, 2026-11-21: "a ideia é deixar tudo que eu for jogar registrado". What changes in the routine:

- **The game is in the list.** Before step 2, `content/diversos.json` must have it: `id` (its URL, and the live's
  `game`; never changed once a live has it), `name`, `category` (Twitch's name), `categoryId` (Twitch's category id:
  the agenda's `games` in `GET /agenda` has it, and the cover comes from Twitch's CDN by it), `line` (Luan's words;
  a `TODO` isn't shown), an optional `goal` (a title and groups of items with `done`) and `notes`. A new game: add it
  with `line` as a TODO and ask Luan for the line and the goal.
- **No session, no replays, no teammates.** Step 0's session check and steps 1b and 1c don't apply; `videos.py` files the
  recordings as usual (the Diversos capture records `Jogo.mp4` too).
- **Step 2:** `live.py <date>` finds the game in the agenda's live that day by its Twitch category (or pass
  `--game <id>`; it stops and says so when the agenda's game isn't in the list). It writes a "Começo" chapter and a
  summary draft with the hours (`Celeste ao vivo por 2h41. Meta: 100%.`). Then, from the transcript, write the
  chapters by hand at the game's milestones (Celeste: each chapter of the game, "Capítulo 3: Celestial Resort"), and
  the summary as a draft for Luan. A live that switched games mid-way gets a chapter with `"game": "<id>"` where the
  other one starts (`{ "at": "1:30:00", "game": "rocket-league", "title": {…} }`): the site counts each game's hours
  from those, and lists the live under both.
- **The progress comes from the game's save, never by hand** (Luan, 2026-11-21: deterministic). On a Celeste day, after
  step 2 (so the live's page exists) and before the release (step 5), with the game closed (Steam writes its stats then):

  ```sh
  python3 scripts/celeste.py            # what changed in the save: the facts done or undone, the totals
  python3 scripts/celeste.py --apply    # writes content/celeste-save.json, which goes in the release
  ```

  It reads Steam's `Celeste/Saves/<slot>.celeste` (only reads it; his run is slot 1, the menu's second file, from zero
  since 2026-11-22; if the script can't find `1.celeste`, he picked another file or hasn't started: ask) and Steam's
  stats for the 1UP! and PICO-8, writes the facts Celeste's roadmap names (`content/celeste.ts`), dates what turned
  done and links it to that day's live, and keeps each side's deaths, time and strawberries. Off-stream sessions count
  too: run it any day he played. The save's `Name` is a person's name: never print or commit it (slot 0 isn't his run).
- **The fundamentals' cuts** (Luan, 2026-11-22: "recortes da live nos tópicos"): from the transcript and the recording,
  the moments he tried or got one of `content/celeste.ts`'s fundamentals go to `content/celeste-recortes.json` as
  `{ "topic", "title", "live", "from", "to" }` (the live's clock), with `"learned": true` on the first where it came
  out right. Show him the list before the release: which ones count is his call. What he set by hand on the page
  (the profile API's `/celeste`) wins over both: never set or clear it for him.
  Any game that later gets a reader of its own (`scripts/<jogo>.py`, the same shape: dry run, `--apply`, `save` keys
  on the items) is run at this same point. A game without one: mark the items by hand from his word, with `date`
  and `live`.
- **2b** works the same (his line from the live as the hook). The title template is only "<Jogo> ao vivo": write one
  from the day's story for him to approve.
- **2c doesn't apply** (no ranked matches): no match videos, so the VOD isn't held back (no `youtube.publish_at`)
  unless Luan asks for cuts. Celeste has its own: a video per chapter, the VOD after them ("A Celeste day", 10).
- **Step 3:** `youtube.py` dresses any game of the list like the two (`game_of`): "<Jogo> ao vivo" as the title and
  the playlist (made the first time), its page on the site among the links, its tags and hashtags.
- **Step 4:** mark the day `--done` after the thumbnail (Celeste's days excepted: below).

### A Celeste day, in order (first run 2026-11-22)

What the first one taught, on top of the list above:

1. **It's over:** OBS and the game closed (`tasklist.exe | grep -i -E "obs64|celeste"`; a `Celeste.exe` outside Steam's
   folder is a TAS capture of another session, on saves of its own). OBS's log of the day has each scene switch:
   second 0 is `==== Recording Start`. A switch away from the game's scene and back cuts `Jogo` in pieces
   (`videos.py` joins them; `partes.json` says where each starts).
2. **`live.py`, then the chapters by hand.** A chapter starts at the postcard after "Escalar" on the map (a few
   seconds before he names it): find it on frames every 2 s around where the transcript names it. Names as the
   lives before them have it (`Capítulo 1: Forsaken City`). Also mark where he starts talking when the recording opens silent (11-22: the microphone
   was muted until 6:56) and where he explains the plan. The summary's numbers come from the save (`celeste.py`'s
   dry run), never from the transcript.
3. **`celeste.py --apply`, with the page written.** `start` in `content/celeste-save.json` is the day the run began
   from zero, so the first read gets its date and live too. Two days or more after the live, pass `--date <date>`: what's done takes
   its date only once.
   **A chapter he finished gets its page of the story** (`components/site/celeste/historia/`, AGENTS.md): the build
   makes it as soon as the save has the chapter's A-side, so write its file before this release, from its dossier in
   `~/.local/share/muanlartins/celeste-lore/` (research it first, with the dossiers' brief, when there's none yet), and
   keep the sections about secrets behind `needs`. A heart, cassette or Celeste Classic he found opens its section by
   itself. The copy is a draft: tell Luan.
4. **Watch the recording before it goes public** (a live in a game's own window shows more than a match does): a
   sheet of the whole Live.mp4 every 10 s, then closer (every 1–3 s) wherever one of these shows, and give Luan the
   times before he uploads. Covering, cutting or leaving is his call (11-22, the filter's drops and the file
   select: "Vai como está, fica em paz!", so give the times short and don't push covering).
   - the "Browser" capture he turns on by hand: tabs, addresses, anything signed in, unreleased pages;
   - the game's file select: the other files' names (slot 0 isn't his). Never in a thumbnail or a text of ours;
   - the filter letting go (he turns, bends down, drinks, leaves the chair): for a second or more the plain camera
     is on the stream;
   - the sound: track 1 against 2 + 3 + 4 (nothing of track 5 leaked), and where the microphone is silent.
5. **The game's music is in the recording** (the soundtrack is the game's sound, tracks 1 and 3; only the stream's
   music stays on track 5), and Celeste's has had Content ID claims before. Luan waits for Studio's copyright check
   on the private upload; only then step 3 makes it public.
6. **The thumbnail wears the filter.** `Câmera.mkv` has none, so never thumb or cut from it as it is on such a day.
   `thumb.py <date> --da-live x,y,w,h` takes him from the stream, and is saved with the pick (`--refazer` keeps it).
   The boxes, inside their frames: Conversa `80,82,994,540` (sharp: the best source), Celeste + chat · Diversos
   `26,786,268,244` (small: only a close face). For the sheet give that scene's stretch:
   `--da-live 26,786,268,244 --trecho 25:20-1:57:20`. Look at each draft's cutout.
7. **Don't free it.** Luan keeps the Celeste days' recordings (Live, Jogo, Câmera) for the produced videos of his
   trajectory (his call, 2026-11-22). So no `--done` for a Celeste day and none of its files in a `--clean`, which
   doesn't know this: read its list before `--apply`.
8. **Release only with the video's id** in the live's page (`live.py <date> --video <id>`): without it the page
   embeds an empty player. Push only the day's commits: check `git log origin/main..main` for others waiting his OK.
9. **What he said on the air about the channel's things** (the filter, the overlay, the site, ideas) goes in the
   report to him with its time, and so does what the frames show broken. It's his to decide what becomes work.
10. **A video per chapter, then the live** (Luan, 2026-11-22: "quebrar por capítulo pro youtube", "só depois a live
   vem publicada"). `scripts/capitulos.py scripts/roteiros/capitulos/<date>-capitulo-<n>.json` plans, `--apply`
   renders: the intro, the chapter whole, the outro, as 2c. The Prologue goes with chapter 1. Edges: in a pause of
   his microphone, from after the file select (its names stay out), each video up to where he moves on to the next
   chapter, the ad break left to the VOD. Marks: the chapter's story moments, checked on frames. Titles: his line as
   the hook. Thumbnails as 2c's, with the filter (`--folha capitulo-<n> --da-live 26,786,268,244`), picking is his.
   Schedule as 2c's, and the live's `youtube.publish_at` at least a day after the last one.
11. **No shorts from a Celeste live** (Luan, 2026-11-22, said twice): he records Celeste's shorts by hand, about the
   game's concepts. Don't scan the live for moments and don't make a candidates reel.

## 0. Make sure it's over

- `node scripts/obs.mjs` says `live: no` (or OBS is closed). Until then, nothing heavy (see `antes-da-live`).
- The session is published: `git pull` and look for `content/matches/<date>-*.json` and `.events.json`. If
  it's missing, ask Luan to press "Publicar sessões" in the Partidas dock (he forgot once).
- One session per live. Since 11-17 a stream back on within 15 min of its end (OBS or the PC down mid-live)
  continues the dock's session, as `videos.py` joins its recordings; before that each restart opened a new one
  (11-09 Valorant, 11-17 Rocket League: the cat at the PC). Two sessions of one live, published: join them into the
  first (outputs, matches and ranks end to end, its `end` the second's, the events' matches too; keep the dock's
  formats: `JSON.stringify(v, null, 2)` for the session, one event per line for `.events.json`) and delete the
  second's files. A recording restarted just before the stream lands in the first session with no `end`: give it its
  start plus its piece's length. The dock still holds the second session: Luan shouldn't edit those matches there
  (it would publish it again).
- Matches played off the stream (since 11-20) publish sessions of their own on the same day, without `outputs`
  (`rocket_league.py`, `valorant.py`): `live.py` and `partidas.py` take the live's session as the one with OBS's
  recording and leave them out (11-20 had an off-stream 1v1 session at 00:40 beside the live's).
- Replays are saved: `ls "/mnt/c/Users/muanl/OneDrive/Documents/My Games/Rocket League/TAGame/DemosEpic"`
  (`Demos` holds only old ones). One per match is the goal.

## 1. File the material

```sh
python3 scripts/videos.py            # shows what it'll do
python3 scripts/videos.py --apply
```

OBS's loose `2026-11-05 14-10-55.mp4`, `… câmera.mkv` and `… jogo.mkv` become `Videos\Lives\<date>\14-10-55 Live.mp4`,
`14-10-56 Câmera.mkv` and `14-10-56 Jogo.mp4` (the game alone, from 11-06 on, remuxed from OBS's MKV without
re-encoding so the studio can play it in the browser; the start time stays in the name:
`live.py` reads it). When OBS restarted mid-live (crash, relaunch), the day's pieces of each kind that start within
15 min of the previous one's end are **joined** end to end without re-encoding under the first one's name (11-09:
three pieces → `20-07-37 Live.mp4`, 2h06), and `Lives\<date>\partes.json` keeps where each piece starts, which
`live.py` uses to place the chapters (the minutes OBS was down aren't in the file). `videos.py <date> --apply`
files only that day. Each match's replay is **copied**
(the game lists them from its own folder) to `Videos\Lives\<date>\Replays\Partida NN - Vitória 5-4.replay`,
matched to the dock's matches by score and save time. The VAR's clips of the lives until 2026-11-24, when it was
retired (loose as `Replay 2026-11-05 14-32-10.mp4`, the stream from OBS's Replay Buffer, and `Replay 2026-11-05
14-32-10 jogo.mkv`, the game alone from Source Record's, since 11-12), go to `Videos\Lives\<date>\VAR\14-32-10 VAR.mp4`
and `14-32-10 VAR jogo.mkv`: shots for a short (the game one is clean, without overlays). If Luan has a recording open in a browser (RLR's
studio), moving it breaks that page's copy: tell him to add it again from the new place.

## 1b. Who played with him (Rocket League days)

The site names the torcedores who played with him (the ranked page's "Eu e os torcedores que jogaram comigo" and each
match), but the dock only tags those already in `public/stream/aliados.json` while the match is played. A friend who
shows up mid-live goes untagged: on 11-12 Exponja and Edu played 10 and 12 of the 14 matches and the site didn't say
so (Luan: "essa identificação tinha que fazer parte"). So, once the replays are filed:

```sh
scripts/.venv/bin/python scripts/aliados.py <date>      # his teammates in each match, from the replays
```

It lists each match's teammates by in-game name (with their Twitch login when they're in the list), then who played
two matches or more with him, then the day's watchers by minutes from the Σ API (while it's still the latest live).

1. Anyone who played two matches or more and isn't in the list: ask Luan who they are, their Twitch login (the
   watchers list usually gives it away: on 11-12 Exponja was `exp0nja` and Edu `eduzeras07`, the two who watched
   longest, both for the first time), and
   whether they agreed to be named. Never add anyone he hasn't confirmed.
2. `aliados.py <date> --aliado "<in-game name>=<twitch login>" --apply` adds them to `aliados.json` (from then on the dock tags
   them live) and writes each named teammate's `login` into the session's matches (`content/matches/<id>.json`),
   found by the numbers both keep. Without new names, `--apply` alone tags the known ones a match missed.
3. Name the friends who played most of the day in the live's summary too, by what Luan calls them (11-12: "3v3
   ranqueado com o Exponja e o Edu: …"); it's also the YouTube description's first line.
4. It goes out with the release (step 5). The dock republishes a session only when it changes; if it ever does
   after this, run it again.

The in-game names stay out of everything but `aliados.json` (the repo is public). Valorant has no replays: there the
dock tags only viewers with a `riot` Riot ID in `aliados.json`.

## 1c. The replays on the site (Rocket League days)

Since 2026-11-21 each ranked match with a replay has "Assistir no RLR" on the ranked page and on the live's chapters,
opening RLR on the site with that replay. Once `videos.py` has filed them (and not while live: the upload competes
with the stream):

```sh
python3 scripts/replays.py <date>            # which file is which match
python3 scripts/replays.py <date> --apply
```

It matches each `Replays\Partida NN - ….replay` to its match (the replay's MatchGUID is the dock's id), uploads it as
`<date>-NN.replay` to the GitHub prerelease `replays-<date>` ("Replays dd/mm"; the files are too big for git) and
writes `replay` (`/replays/<date>/<date>-NN.replay`) into the session's matches. Publishing the release runs
`.github/workflows/replays.yml`, which copies the files to the site's bucket (`/replays/<date>/`): check it with
`gh run list --workflow replays.yml`, or run it with `gh workflow run replays.yml -f tag=replays-<date>`. The session
goes out with the release (step 5). Luan's decision (2026-11-21): the replays go as they are, the players' names inside
included; it's the one exception, for these files only. If the dock republishes the session later, run it again.

## 2. The live's page, transcript and thumbnail

```sh
scripts/.venv/bin/python scripts/live.py <date>
```

The day's game is the one whose session the dock published for the live (`content/matches/` for Rocket League,
`content/valorant/` for its Valorant tab, since 11-09), else the agenda's live that day (any other game: above),
else `--game <id>`; the chapters, summary and thumbnail's plate follow it. The page also keeps the recording's
length (`length`), from which the site counts hours.
Transcribes the Microfone track (Windows whisper.cpp on CUDA), cleans it (hallucinations and repeats; names
stay as said: Luan ended the blanking of names on 2026-11-08, "mostrar tudo sempre"), writes `content/lives/<date>.json` (chapters from
the dock, a draft summary **for Luan to rewrite**: the copy is his) and `.transcript.json`, adds the day to
`brand/build.py` and draws the thumbnail. `--force` redoes existing files.

## 2b. The thumbnail and the title: made to be clicked

Since 2026-11-12 the lives are **public** and dressed like any YouTube video (Luan: "estou tentando captar mais
pessoas… vamos ter que jogar o jogo"). Until then they were unlisted with a plain plate ("Live" and the date) and
got 0 to 3 views each, while the public shorts got hundreds: unlisted videos never show in search or
recommendations, so nothing else mattered.

```sh
scripts/.venv/bin/python scripts/thumb.py <date>        # the candidates sheet: Videos\Lives\<date>\Thumb\candidatos.jpg
```

Make the sheet **before freeing the disk** (step 4): it reads his microphone off `Live.mp4`, and a day without
`partes.json` also needs the file to place the camera's frames. `videos.py --clean` keeps a `Live.mp4` until the
day is marked `--done`, which comes after the thumbnail and the shorts.

The sheet is his twelve strongest reactions (the microphone track's loudest moments, the transcript's "meu Deus",
"que isso", "golaço", laughs, his goals from the dock, the VAR's plays), three camera frames each (`7a`, `7b`, `7c`)
with what he said there. **Picking is Luan's** (judgment only where it beats a rule):

1. Render two or three drafts with `--saida "Videos\Lives\<date>\Thumb\rascunho A.jpg"`, look at each, and ask him
   which, with the title, in one question (the drafts' paths in the question: the dialog hides the rest). Favour a
   big, readable emotion (laughing, an arm up after a goal, hands on the head, a hand over the mouth) over a
   talking face or one looking down.
2. The hook is 2 to 4 words, uppercase, `LINHA 1|LINHA 2` (the second on the Branco plate): the day's story (`SUBI
   PRO|DIAMANTE 3` with `--emblema` when it climbed) or **his own line from the live** (`VÃO HUMILHAR|A GENTE`, said at
   15:43 on 11-11). Never a teammate's or opponent's name.
3. `thumb.py <date> --quadro 3a --texto "VÃO HUMILHAR|A GENTE" [--emblema] [--fundo mm:ss]` writes
   `brand/youtube/thumbnails/live-<date>.jpg` and keeps the pick in `content/lives/<date>.json` (`youtube.thumb`), so
   `--refazer` makes it again without the sheet.

What it does on its own, and why: his cutout from the camera recording (its background is already the brand's Klein,
so the blue is keyed out, no model; the lockup and specks go), a Branco outline and a shadow, on the right half and
never under the hook; behind him the game at that moment from `Jogo.mp4`, blurred so no player's name can be read
(the in-game "X MARCOU" banner was legible at a lighter blur), darkened to Klein on the left; "AO VIVO · dd/mm" on a
Klein plate. A fist raised past the camera's top edge goes out through the thumbnail's top too (it used to end in a
straight cut outlined in Branco); then his arm may pass under the hook, which is fine while his face stays clear.
Look at the result before uploading. `--refazer` needs the day's recordings (Câmera, Jogo, and `Live.mp4` when
there's no `partes.json`).

**What worked so far** (Luan on the first two, 2026-11-12: "ficaram excelentes"): keep the style, vary the moment.

| Live | Frame | Hook | Title |
| --- | --- | --- | --- |
| 11-12 RL | laughing (11a) | `SUBI PRO\|DIAMANTE 3` + emblem | Subi pro Diamante 3! 10 vitórias em 14 jogos |
| 11-11 Valorant | laughing (3a) | his line `VÃO HUMILHAR\|A GENTE` | Esses caras vão humilhar a gente… |
| 11-10 RL | arm up after his goal (3a) | `SUBI PRO\|DIAMANTE 2` + emblem | Subi pro Diamante 2! 7 vitórias em 10 jogos |
| 11-09 Valorant | laughing after a play (1b) | his line `DEU CERTO,\|DEU CERTO` | Deu certo, deu certo! 2 vitórias em 2 jogos |

The pattern: a laugh or a celebration; the climb when the day had one, otherwise his own line from that moment. The
lives before 11-09 (10-28, 11-05, 11-06) keep the plain plate: their camera recordings are gone.

**The title** (`youtube.title` in `content/lives/<date>.json`, else a template in `youtube.py`): what happened first,
the game after, under 70 characters, no date (it's in the description and on the thumbnail): `Subi pro Diamante 3! 10
vitórias em 14 jogos | Rocket League ao vivo`; on a day without a climb, the hook line works better than the score
(`Esses caras vão humilhar a gente… | Valorant ao vivo`). The template only covers a climb or the record: write one
for him to approve when the day has a better story.

## 2c. The videos of the matches (since 11-17)

Luan's plan from 11-17 (he'd said it on stream that day too: "só vídeos normais de 20 minutos"): the full VOD is held
back and three videos of about 20 minutes go out first, each with three **whole** matches of the live, the intro and
the outro, and the live's own transition between them. `scripts/partidas.py` does the edit; what takes judgment is a
small roteiro per video in `scripts/roteiros/partidas/<date>-<nome>.json` (its docstring has the format).

**No editing beyond that.** The first version (11-17) had a cold open of three best moments, only the intro's first
sentence, hard cuts and a card where the PC went down. Luan, 11-18: "os cortes ficaram HORRÍVEIS hahaha é
impressionante como você não é bom nisso. Até a intro sofreu e ficou cortada coitada." What he asked for instead:
the matches, the whole intro and the outro, "uma transição como a da live entre as partidas". He pointed to
ApparentlyJack and Retals on YouTube as styles to learn from someday; until he says otherwise, don't add montages,
zooms, cards or effects. The research of 11-17 (`pesquisa-videos-longos.md` beside this file) still holds for titles,
schedule and policy; its editing advice was overruled by him.

1. **Pick (Claude), approve (Luan).** `partidas.py <date>` lists the matches (where in Live.mp4, score, goals).
   Read the transcript with the matches and goals marked in (it's what tells the story: on 11-17 the cats turning
   the PC off mid-match, "muito perto do Champion"). Three groups of three matches in order, no match in two videos,
   ~16–21 min each: the best stories, not just the wins. Leftovers stay in the VOD. A standalone hook for each title
   (never "Parte 1"), the roteiro's `titulo`; partidas.py adds the game, the mode and the rank going into the first
   match, which Luan wants in every title (11-18), and "(corte da live)" (11-19: what's cut from a live says so in the
   title, the thumbnail's plate and the playlist, so the videos made for YouTube stand apart from the lives' replays):
   `Minha gata desligou o PC no meio da ranqueada | Rocket League 3v3 Diamante 3 (corte da live)`. So the hook doesn't
   say the rank again.
2. **Plan, then render**: `partidas.py <roteiro>` prints each match's edges (with his mic's level there: all should be
   pauses, ≤ -60 dB; `!` lines say where none was found) and the chapters; then `--apply`: ~5 min per video (NVENC),
   ~4 GB, `Videos\Partidas\<date> <nome>.mp4`, and `content/videos/<date>-<nome>.json` for YouTube (id empty,
   description with the chapters, Epic's disclaimer and links, `publish_at` from the roteiro's `publicar`), and its
   captions beside the video (`<date> <nome>.srt`: the live's transcript in each match's piece, the intro's and
   outro's words; `--legendas` writes only them for a video already made). Each match
   starts just after the recording's own stinger into the game and ends at his first pause after the cut to Conversa;
   the stinger (transicao.webm) covers every join, as on the stream. Check a frame on each side of each join and the
   loudness (-14 to -16 LUFS).
3. **Thumbnails**, as in 2b but per video: `thumb.py <date> --folha <nome> --trecho <first match start>-<last
   match end>` makes a sheet of that stretch; drafts with `--folha <nome> --quadro 7b --texto "…" --saida
   "Videos\Lives\<date>\Thumb\rascunho <nome> A.jpg"` (the plate says CORTE DA LIVE · dd/mm by itself with
   `--folha`; a Live.mp4 second works as `--quadro` too, and a frame from elsewhere in the live is fine when it
   tells the story better: 11-17's cat video uses the cat in his lap from match 12); the pick goes to `brand/youtube/thumbnails/<date>-<nome>.jpg`. Picking is Luan's.
4. **Publish**: Luan uploads the three files in Studio (private) and the ids go into the records; since 11-20 two or
   three a day at different hours, from the day after the live (Luan: "dado o ritmo de produção… 2 ou 3 vídeos por
   dia dos cortes, em horários diferentes", with more shorts too and his produced videos, the analyses, starting;
   11-20's: Sat 15:00 and 19:00, Sun 12:00; before that one a day at 12:00), the VOD at least a day after the last
   (`youtube.publish_at` in `content/lives/<date>.json`: `youtube.py live` schedules it, and the site keeps that live
   off its pages until a build after that moment, so its page never embeds a private video; the hourly
   `.github/workflows/lives-agendadas.yml` runs that build once the moment passes). Then
   `youtube.py video content/videos/<date>-<nome>.json --dry-run`, show him, apply (it makes the playlist "Rocket
   League: cortes da live" the first time, and uploads the captions as the lives' are). The end screen (last 10 s,
   over the outro) is set in Studio by hand: the API can't. A slot that passes before he uploads (11-18: the noon
   slot went by; he picked 21:00 the same day) is his call: change `publicar` and `publish_at`. Once a video is out,
   running `youtube.py` again leaves its status alone (a `publish_at` already past is skipped, since setting it
   would make the video private).
5. Mark the day `--done` (step 4) only once the three are uploaded; the files in `Videos\Partidas` go by themselves
   with `videos.py --clean` once YouTube has each whole.

What 11-17 taught: the recording's track 1 is quiet (-41 LUFS, peaks at -17 dBFS), so each part is levelled by
loudnorm, not one gain; a jump in the recording (the PC went down) is listed in `"saltos"` (the piece before ends at
its last real frame, a second before the join, and the stinger covers it); a match the dock caught late needs its
start (`"inicio"`); the talk after a match ends at his first pause past the scoreboard unless `"fim"` keeps a line
worth it ("estamos muito perto do Champion"). The dock's switch to the game comes 4–10 s before its recorded start,
with a stinger; to Conversa 5.5 s after the end. Rocket League's **Streamer Safe Music** is on (Luan, 11-20): a
claimed song in the VOD would come back in every video cut from it. When the stream stayed on Conversa while a match
was played (11-20, match 3: the dock didn't switch and he switched by hand 68 s in), `"jogo"` lays the game recording
over that stretch, ending where the live's own stinger into the game covers the screen (OBS's log has the switch;
plus 0.6 s); Luan picked that over leaving it or starting the match late.

## 3. YouTube

1. Luan uploads `Videos\Lives\<date>\<hh-mm-ss> Live.mp4` in YouTube Studio (the API can't: unverified apps'
   uploads are locked private). He may not give the id: it's the newest upload titled like the file (`14 39 04 Live`),
   private and processing; the uploads playlist through the API finds it.
2. `scripts/.venv/bin/python scripts/live.py <date> --video <id>`
3. Wait until YouTube has processed it (a 50 GB upload takes a while after the upload ends), then
   `scripts/.venv/bin/python scripts/youtube.py live <date> --dry-run`, show Luan, then without `--dry-run`:
   title, description (his summary, the game's line, Twitch first among the links and the Discord right after, chapters, the date, three
   hashtags), tags (the game's, plus mode, rank, agents and maps played), thumbnail (thumb.py's `.jpg` over
   build.py's `.png`), **public** (`PRIVACY`; scheduled instead when `youtube.publish_at` holds it back, 2c), the game's playlist ("Rocket League ao vivo", "Valorant ao vivo":
   made the first time it's missing, kept as public as the videos), captions. Per game in `GAMES` in `youtube.py`
   (any other game: `game_of`, from `content/diversos.json`).
   `--no-captions` when only the metadata changed (captions cost 400+ of the 10,000 daily quota units).

**The public test** (agreed 2026-11-12; Luan feared public VODs would hurt the channel): YouTube judges each video by
its own audience, so a long VOD few click just gets fewer impressions. Baseline that day: the six lives had 0 to 3
views each; the shorts 52 to 1,282. Around 2026-11-26, compare in Studio (Analytics → each live's impressions and
click-through rate, and the shorts' reach against the two weeks before); if the shorts' reach dropped, set `PRIVACY`
back to `"unlisted"` and run `youtube.py live <date> --no-captions` for each live.

## 4. Free the disk

Luan streams daily and an hour is tens of GB (11-05: the stream's recording 35 GB/h, the camera 5 GB/h), so
material goes once it has done its job: his rule, "deletar sempre que uploadarmos o que for necessário, ou
utilizarmos".

```sh
scripts/.venv/bin/python scripts/videos.py --clean            # lists what goes, and why
scripts/.venv/bin/python scripts/videos.py --clean --apply    # deletes it, for good
python3 scripts/videos.py --done <date>                        # after that day's thumbnail, match videos and shorts
```

- A day's `Live.mp4`, `Jogo`, `Câmera` and `VAR` clips go together when the day is marked `--done`; otherwise they
  stay as long as there's room, and only when the disk would have less than 200 GB free (`FREE_GB`, what a live
  needs) the oldest days go first.
- `Live.mp4` waits for the day too (Luan, 2026-11-12: "vamos esperar os shorts"): thumb.py reads his microphone off
  it (step 2b), the shorts' tools take it as their clock (`clipe.py`, `cortes.py`, `destaque.py`: the `estudio`
  skill), and before 11-06 it's the studio's only copy of the matches. It never goes before its YouTube video is
  processed and as long as the file (checked through the API), not even for space.
- Replays stay (a few MB). Show Luan the list before `--apply`: nothing comes back.
- Free space under ~150 GB before a live: tell him. The rest of the Videos folder (shorts' candidates, OBS's
  stubs, the match videos) is in the `faxina` skill.

## 4b. Valorant's skins (Valorant days)

`python3 scripts/valorant_catalogo.py --ver` says whether a patch brought skins since the catalogue was made. If it
lists new ones, run it without `--ver`: `public/valorant/catalogo.json` goes in the release commit, so the
inventory's builder has them. The inventory itself needs nothing: `valorant.py` sent the game's reading to the site
during the live (its log, `~/.cache/muanlartins/valorant.log`, says "inventário no site").

## 5. Release

`pnpm lint`, `pnpm build` and `pnpm build:en`, delete `out/` (on a Celeste day, `celeste.py --apply` first: "A day
of another game"). Commit (imperative, short, no names) and **ask Luan before pushing**: a push to `main` is a release. Then `gh run watch` and check the page live.

## Things to keep in mind

- Copyright: music on the stream is on track 5 only, so it isn't in the recording. If a recording may have caught
  some (a source routed to all tracks for a while), measure before cutting: per-second levels of track 1 against
  2 + 3 with ffmpeg's `astats`. On 11-05 the suspect stretch turned out silent: nothing to mute.
- The repo is public: no other players' names or ids, no replays in git (the prereleases of step 1c are Luan's one exception, 2026-11-21), teammates stay nameless, no tokens. The one exception is the viewers in `public/stream/aliados.json`, who agreed to be named: the dock tags them by Twitch login. A new one goes there only when Luan says they agreed.
- For shorts and commented videos from the material, see the `estudio` skill.
