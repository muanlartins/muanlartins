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
`14-10-56 Câmera.mkv` and `14-10-56 Jogo.mkv` (the game alone, from 11-06 on; the start time stays in the name:
`live.py` reads it). Each match's replay is **copied**
(the game lists them from its own folder) to `Videos\Lives\<date>\Replays\Partida NN - Vitória 5-4.replay`,
matched to the dock's matches by score and save time. If Luan has a recording open in a browser (RLR's
studio), moving it breaks that page's copy: tell him to add it again from the new place.

## 2. The live's page, transcript and thumbnail

```sh
scripts/.venv/bin/python scripts/live.py <date>
```

Transcribes the Microfone track (Windows whisper.cpp on CUDA), cleans it (friends' names from
`%USERPROFILE%\.config\muanlartins\nomes.txt` become "—"), writes `content/lives/<date>.json` (chapters from
the dock, a draft summary **for Luan to rewrite**: the copy is his) and `.transcript.json`, adds the day to
`brand/build.py` and draws the thumbnail. `--force` redoes existing files.

## 3. YouTube

1. Luan uploads `Videos\Lives\<date>\<hh-mm-ss> Live.mp4` in YouTube Studio (the API can't: unverified apps'
   uploads are locked private) and gives the video id.
2. `scripts/.venv/bin/python scripts/live.py <date> --video <id>`
3. `scripts/.venv/bin/python scripts/youtube.py live <date> --dry-run`, show Luan, then without `--dry-run`:
   title, description with chapters, tags, thumbnail, the unlisted playlist "Rocket League ao vivo", captions.

## 4. Free the disk

Luan streams daily and an hour is tens of GB (11-05: the stream's recording 35 GB/h, the camera 5 GB/h), so
material goes once it has done its job: his rule, "deletar sempre que uploadarmos o que for necessário, ou
utilizarmos".

```sh
scripts/.venv/bin/python scripts/videos.py --clean            # lists what goes, and why
scripts/.venv/bin/python scripts/videos.py --clean --apply    # deletes it, for good
python3 scripts/videos.py --done <date>                        # after that day's shorts and commented videos
```

- `Live.mp4` goes once its YouTube video is processed and as long as the file (checked through the API).
- `Jogo.mkv` and `Câmera.mkv` go when the day is marked `--done`, or 7 days after the live (`KEEP_DAYS`).
- Replays stay (a few MB). Show Luan the list before `--apply`: nothing comes back.
- Free space under ~150 GB before a live: tell him.

## 5. Release

`pnpm lint`, `pnpm build` and `pnpm build:en`, delete `out/`. Commit (imperative, short, no names) and **ask
Luan before pushing**: a push to `main` is a release. Then `gh run watch` and check the page live.

## Things to keep in mind

- Copyright: music on the stream is on track 5 only, so it isn't in the recording. If a recording may have caught
  some (a source routed to all tracks for a while), measure before cutting: per-second levels of track 1 against
  2 + 3 with ffmpeg's `astats`. On 11-05 the suspect stretch turned out silent: nothing to mute.
- The repo is public: no other players' names or ids, no replays, teammates stay nameless, no tokens.
- For shorts and commented videos from the material, see the `estudio` skill.
