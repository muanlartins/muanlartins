---
name: faxina
description: Luan's Videos folder on the stream PC (C:\Users\muanl\Videos) - its map (one folder per live: recordings, Cortes, Shorts, Thumb), what each folder holds, what stays for good, what goes and when, and how to delete safely. Use to know where a live's files go, when he asks to free space, clean or scan Videos, or when the disk runs short before a live.
---

# Cleaning the Videos folder

Luan's rule (2026-11-05, again 11-07 and 11-17): material goes once it has done its job ("deletar sempre que
uploadarmos o que for necessário, ou utilizarmos"; "vamos sempre limpar a cozinha"). A live is ~50 GB/h across its
recordings and C: is 931 GB, so this runs after every after-live (`depois-da-live`, step 4) and whenever he asks.
Talk to him in pt-BR.

## How to run it

1. `node scripts/obs.mjs`: not live, not recording (a file OBS is writing must not be touched).
2. `du -sh /mnt/c/Users/muanl/Videos/*/` and a listing of every file in each folder (size, date): look at all of
   them, not only what the scripts know about.
3. `scripts/.venv/bin/python scripts/videos.py --clean` lists what goes from `Lives` (recordings and `Cortes`) and why (it
   checks on YouTube that each video is processed and as long as its file before letting a file go). Days whose
   thumbnail, match videos and shorts are done get `python3 scripts/videos.py --done <date>` first.
   A Celeste day stays whole (Live, Jogo, Câmera): Luan keeps them for the produced videos (his call, 2026-11-22). The
   script doesn't know, so look for one in its list before `--apply` (`depois-da-live`, "A Celeste day"). A day
   that was another game before Celeste keeps only the Celeste part of each file, cut once the rest has done its job
   (11-24: 124 GB down to ~13 GB; the steps are "A Celeste day", 7).
4. Everything else by the table below. Deleting is for good (no Recycle Bin from WSL): show Luan the list with sizes
   unless he already asked for this cleaning in so many words (11-17: "tudo que não for mais ser utilizado e
   deletar"), and even then ask about anything the table doesn't cover.
5. `rm -v -- "<exact path>"` per file, never `rm -rf` on a variable or a pattern you haven't listed; scripts never
   delete except `videos.py --clean --apply` and the steps that delete after a verified copy.
6. Tell him the free space after (`df -h /mnt/c`). **Luan's rule (2026-11-27): before a live, at least 300 GB free
   plus what the live will write** (~115 GB for 3h since the recordings went AV1 that day; ~200 GB in H.264), so
   ~420 GB; less is a warning. Why: C: is a Kingston NV2 (DRAM-less), and as it filled during the lives its writes
   fell to ~20 MB/s at 100% busy, which froze the game and dropped the camera in the second half of the lives.

## The map: one folder per live (since 2026-11-26)

Luan, 2026-11-26: "a organização da pasta vídeos não deveria ser melhor e ser por live? … a gente se perde". So
everything a live produces sits in its folder, and the top level has only four things of the channel's:

```
Videos\
├── Lives\<date>\                 one live, everything of it
│   ├── <hh-mm-ss> Live.mp4 · Jogo.mp4 · Câmera.mkv · partes.json · .feito    the recordings (videos.py)
│   ├── Replays\ · VAR\ · Legendas\                                         the game's replays, VAR clips, captions
│   ├── Thumb\                     thumbnail sheets, drafts and the chosen ones (thumb.py)
│   ├── Cortes\                    the long videos cut from it, <date> <nome>.mp4 + .srt (partidas.py, capitulos.py)
│   └── Shorts\                    its reels and covers (destaque.py, clipe.py, capa.py), the candidates reel
│       └── Partes\<reel>\         each reel's own pictures, 3D renders, voices (the effects module's ctx.partes)
├── Partes\                       what every video reuses
│   ├── Vídeos\                    intro, outro (and raws, scripts) of the long videos (comentado.py, partidas.py)
│   └── Shorts\                    the shorts' outro, figurinhas, clipes
├── Shorts\                       only the studio's takes (OBS's Shorts profile records here) and prontos\, their edits
├── Comentados\                   only the studio's commented takes and prontos\, their edits
└── NVIDIA\, Captures\            Windows' and GeForce's own, not the channel's
```

The paths are in one place, `scripts/windows.py` (`LIVES`, `PARTES`, `live_dir`, `cortes_dir`, `shorts_dir`,
`reel_parts`): a new script takes them from there, never writes `VIDEOS / "…"` by hand. `videos.py --apply` also
files anything still in the old places (Videos\Partidas, the live reels in Shorts\prontos, Shorts\candidatos,
Shorts\Partes, Comentados\Partes), leaving alone what changed in the last ten minutes, so a branch with the old
scripts can't scatter things again for long. Roteiros name pictures relative to Videos
(`"arquivo": "Lives/2026-11-20/Shorts/Partes/gata/aureola.png"`, `"Partes/Shorts/figurinhas/…"`).

## What each folder holds

| Where | What | Stays / goes |
| --- | --- | --- |
| `Lives\<date>\` `… Live.mp4` | the stream's recording (VOD source, the shorts' clock, thumb.py's mic) | goes with the day (`--done`, or oldest first under 200 GB free), and only once its YouTube video is processed whole: `videos.py` checks |
| `Lives\<date>\` `… Jogo.mp4`, `… Câmera.mkv`, `VAR\` | the game alone, the camera alone, the VAR's clips: shorts and thumbnails | go with the day, as above |
| `Lives\<date>\Replays\`, `Thumb\`, `Legendas\`, `partes.json`, `.feito` | replays (MB), thumbnail sheets and drafts, where the pieces join | stay (small; the studio lists days from the replays) |
| `Lives\<date>\Cortes\<date> <nome>.mp4` | the videos of a live's matches and Celeste chapters, ~4 GB each | go once uploaded and processed whole: `videos.py --clean` checks the id in `content/videos/` |
| `Lives\<date>\Cortes\<date> <nome>.srt` | their captions (KB), uploaded by `youtube.py video` | stay: small, and a re-upload of the captions needs them |
| `Lives\<date>\Shorts\` reels and `(capa).jpg` | the live's finished reels | stay unless Luan says otherwise (his backup) |
| `Lives\<date>\Shorts\<date> live - candidatos.mp4` | the numbered reel he picks moments from | goes once the reels from it are made |
| `Lives\<date>\Shorts\Partes\<reel>\` | a reel's generated pictures (some paid: Gemini), renders, voices | stay while the reel may be redone; the 3D frame sequences (`3d-*`) can go once it's published |
| `Partes\Vídeos\`, `Partes\Shorts\` | the intro, outros and their raws, stickers, clips | **stay**: every video uses them |
| `Comentados\prontos\`, `Shorts\prontos\` | the studio's finished videos and shorts | stay unless Luan says otherwise |
| `Shorts\` loose takes | studio takes (`shorts.py`) | `shorts.py --apply` deletes a take once its shorts exist; others: ask |
| loose `2026-… .mp4/.mkv` in `Videos\` | OBS's files before `videos.py` files them | never delete a recent one: `videos.py` joins and files them. Stubs of a few KB from a recording that failed to start (11-12 16-45-28: 734 B and 111 KB) can go once checked with ffprobe (no duration) |
| `%LOCALAPPDATA%\VALORANT\Saved\Demos\*.vrf` (outside Videos) | Valorant's replays, 50–100 MB each, downloaded after each match by `mira_auto.py` for the aim page | a match's file can go once `content/mira-ranked/` on main has its id (or `mira_ranked.py` skipped it as another account's); one a patch kept out (`mira-auto.json` says `patch`) stays until vrfkit reads it. Ask before deleting |
| `NVIDIA\`, `Captures\` | GeForce/Xbox game clips, not the channel's | Luan's: ask (11-17: a June Chameleon clip, 0.6 GB, left) |

Outside Videos, but on C: too: WSL's `~/.cache/muanlartins` (edicao caches, replay copies; small, `replay.py` clears
its own after two days). WSL's disk image doesn't shrink by itself, so deleting there frees little on C:.

## 11-17, for reference

Days 11-09 to 11-13 marked done (all on YouTube, thumbnails and shorts made): 336 GB of Live/Jogo/Câmera/VAR; the
two candidates reels of 11-11 and 11-12 (0.5 GB); two OBS stubs of 11-12. C: went from 130 to 443 GB free.
