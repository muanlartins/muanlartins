---
name: depois-da-live
description: The routine after one of Luan's Twitch lives - file the recordings and replays, write the live's page and transcript, set the YouTube VOD, release. Use when he says the live ended or asks to process a live's VOD.
---

# After a live

The detailed history and the YouTube API setup are in `handoff/README.md` ("3. After each live"); this is
the routine. Talk to Luan in pt-BR. `<date>` is the live's day, `YYYY-MM-DD`.

## 0. Make sure it's over

- `node scripts/obs.mjs` says `live: no` (or OBS is closed). Until then, nothing heavy (see `antes-da-live`).
- The session is published: `git pull` and look for `content/matches/<date>-*.json` and `.events.json`. If
  it's missing, ask Luan to press "Publicar sessões" in the Partidas dock (he forgot once).
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
live's `youtube.thumb` exists.

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

## 3. YouTube

1. Luan uploads `Videos\Lives\<date>\<hh-mm-ss> Live.mp4` in YouTube Studio (the API can't: unverified apps'
   uploads are locked private). He may not give the id: it's the newest upload titled like the file (`14 39 04 Live`),
   private and processing; the uploads playlist through the API finds it.
2. `scripts/.venv/bin/python scripts/live.py <date> --video <id>`
3. Wait until YouTube has processed it (a 50 GB upload takes a while after the upload ends), then
   `scripts/.venv/bin/python scripts/youtube.py live <date> --dry-run`, show Luan, then without `--dry-run`:
   title, description (his summary, the game's line, Twitch first among the links, chapters, the date, three
   hashtags), tags (the game's, plus mode, rank, agents and maps played), thumbnail (thumb.py's `.jpg` over
   build.py's `.png`), **public** (`PRIVACY`), the game's playlist ("Rocket League ao vivo", "Valorant ao vivo":
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
python3 scripts/videos.py --done <date>                        # after that day's shorts and commented videos
```

- `Live.mp4` goes once its YouTube video is processed and as long as the file (checked through the API), and the
  thumbnail is picked (`youtube.thumb`, step 2b). A day without a Jogo recording (11-05 and before) keeps it like a
  Jogo: it's the studio's only copy of the matches.
- `Live.mp4` is also the shorts' clock (`clipe.py`, `cortes.py`, `destaque.py`: the `estudio` skill). `--apply`
  deletes every day's at once, so when a day's shorts are still being picked, ask Luan first (2026-11-12: only 11-09
  and 11-10 went; 11-11 and 11-12 stayed for their shorts).
- `Jogo`, `Câmera` and the `VAR` clips go when the day is marked `--done`; otherwise they stay as long as there's room, and only
  when the disk would have less than 200 GB free (`FREE_GB`, what a live needs) the oldest days go first.
- Replays stay (a few MB). Show Luan the list before `--apply`: nothing comes back.
- Free space under ~150 GB before a live: tell him.

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
