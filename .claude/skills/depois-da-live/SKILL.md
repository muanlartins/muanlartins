---
name: depois-da-live
description: The routine after one of Luan's Twitch lives - file the recordings and replays, write the live's page and transcript, cut three videos of its matches, schedule the YouTube VOD after them, release. Use when he says the live ended or asks to process a live's VOD.
---

# After a live

The detailed history and the YouTube API setup are in `handoff/README.md` ("3. After each live"); this is
the routine. Talk to Luan in pt-BR. `<date>` is the live's day, `YYYY-MM-DD`.

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
matched to the dock's matches by score and save time. The VAR's clips (loose as
`Replay 2026-11-05 14-32-10.mp4`, the stream from OBS's Replay Buffer, and `Replay 2026-11-05 14-32-10 jogo.mkv`, the
game alone from Source Record's, since 11-12) go to `Videos\Lives\<date>\VAR\14-32-10 VAR.mp4` and
`14-32-10 VAR jogo.mkv`: shots for a short (the game one is clean, without overlays). `replay.py` keeps its MP4 copies
in `~/.cache/muanlartins/replays` for two days on its own. If Luan has a recording open in a browser (RLR's
studio), moving it breaks that page's copy: tell him to add it again from the new place.

## 1b. Who played with him (Rocket League days)

The site names the viewers who played with him (the ranked page's "Eu e os viewers que jogaram comigo" and each
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

## 2. The live's page, transcript and thumbnail

```sh
scripts/.venv/bin/python scripts/live.py <date>
```

The day's game is the one whose session the dock published (`content/matches/` for Rocket League,
`content/valorant/` for its Valorant tab, since 11-09), and the chapters, summary and thumbnail's plate follow it.
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
   ~16–21 min each: the best stories, not just the wins. Leftovers stay in the VOD. A standalone hook title for each
   (never "Parte 1"): `Minha gata desligou o PC no meio da ranqueada | Rocket League`.
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
   match end>` makes a sheet of that stretch; drafts with `--folha <nome> --quadro 7b --texto "…" --etiqueta "3V3
   RANQUEADO" --saida "Videos\Lives\<date>\Thumb\rascunho <nome> A.jpg"` (a Live.mp4 second works as `--quadro` too,
   and a frame from elsewhere in the live is fine when it tells the story better: 11-17's cat video uses the cat in
   his lap from match 12); the pick goes to `brand/youtube/thumbnails/<date>-<nome>.jpg`. Picking is Luan's.
4. **Publish**: Luan uploads the three files in Studio (private) and the ids go into the records; one a day from the
   day after the live, 12:00 BRT (until Studio has audience data), the VOD at least a day after the last
   (`youtube.publish_at` in `content/lives/<date>.json`: `youtube.py live` schedules it, and the site keeps that live
   off its pages until a build after that moment, so its page never embeds a private video). Then
   `youtube.py video content/videos/<date>-<nome>.json --dry-run`, show him, apply (it makes the playlist "Rocket
   League: partidas da live" the first time, and uploads the captions as the lives' are). The end screen (last 10 s,
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
with a stinger; to Conversa 5.5 s after the end. Check with Luan that Rocket League's **Streamer Safe Music** is on:
a claimed song in the VOD comes back in every video cut from it.

## 3. YouTube

1. Luan uploads `Videos\Lives\<date>\<hh-mm-ss> Live.mp4` in YouTube Studio (the API can't: unverified apps'
   uploads are locked private). He may not give the id: it's the newest upload titled like the file (`14 39 04 Live`),
   private and processing; the uploads playlist through the API finds it.
2. `scripts/.venv/bin/python scripts/live.py <date> --video <id>`
3. Wait until YouTube has processed it (a 50 GB upload takes a while after the upload ends), then
   `scripts/.venv/bin/python scripts/youtube.py live <date> --dry-run`, show Luan, then without `--dry-run`:
   title, description (his summary, the game's line, Twitch first among the links, chapters, the date, three
   hashtags), tags (the game's, plus mode, rank, agents and maps played), thumbnail (thumb.py's `.jpg` over
   build.py's `.png`), **public** (`PRIVACY`; scheduled instead when `youtube.publish_at` holds it back, 2c), the game's playlist ("Rocket League ao vivo", "Valorant ao vivo":
   made the first time it's missing, kept as public as the videos), captions. Per game in `GAMES` in `youtube.py`.
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

`pnpm lint`, `pnpm build` and `pnpm build:en`, delete `out/`. Commit (imperative, short, no names) and **ask
Luan before pushing**: a push to `main` is a release. Then `gh run watch` and check the page live.

## Things to keep in mind

- Copyright: music on the stream is on track 5 only, so it isn't in the recording. If a recording may have caught
  some (a source routed to all tracks for a while), measure before cutting: per-second levels of track 1 against
  2 + 3 with ffmpeg's `astats`. On 11-05 the suspect stretch turned out silent: nothing to mute.
- The repo is public: no other players' names or ids, no replays, teammates stay nameless, no tokens. The one exception is the viewers in `public/stream/aliados.json`, who agreed to be named: the dock tags them by Twitch login. A new one goes there only when Luan says they agreed.
- For shorts and commented videos from the material, see the `estudio` skill.
