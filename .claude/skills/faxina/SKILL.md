---
name: faxina
description: Cleaning Luan's Videos folder on the stream PC (C:\Users\muanl\Videos) - what each folder holds, what stays for good, what goes and when, and how to delete safely. Use when he asks to free space, clean or scan Videos, or when the disk runs short before a live.
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
3. `scripts/.venv/bin/python scripts/videos.py --clean` lists what goes from `Lives` and `Partidas` and why (it
   checks on YouTube that each video is processed and as long as its file before letting a file go). Days whose
   thumbnail, match videos and shorts are done get `python3 scripts/videos.py --done <date>` first.
4. Everything else by the table below. Deleting is for good (no Recycle Bin from WSL): show Luan the list with sizes
   unless he already asked for this cleaning in so many words (11-17: "tudo que não for mais ser utilizado e
   deletar"), and even then ask about anything the table doesn't cover.
5. `rm -v -- "<exact path>"` per file, never `rm -rf` on a variable or a pattern you haven't listed; scripts never
   delete except `videos.py --clean --apply` and the steps that delete after a verified copy.
6. Tell him the free space after (`df -h /mnt/c`); under ~150 GB before a live is a warning.

## What each folder holds

| Where | What | Stays / goes |
| --- | --- | --- |
| `Lives\<date>\` `… Live.mp4` | the stream's recording (VOD source, the shorts' clock, thumb.py's mic) | goes with the day (`--done`, or oldest first under 200 GB free), and only once its YouTube video is processed whole: `videos.py` checks |
| `Lives\<date>\` `… Jogo.mp4`, `… Câmera.mkv`, `VAR\` | the game alone, the camera alone, the VAR's clips: shorts and thumbnails | go with the day, as above |
| `Lives\<date>\Replays\`, `Thumb\`, `partes.json`, `.feito` | replays (MB), thumbnail sheets and drafts, where the pieces join | stay (small; the studio lists days from the replays) |
| `Partidas\<date> <nome>.mp4` | the videos of a live's matches (`partidas.py`), ~5 GB each | go once uploaded and processed whole: `videos.py --clean` checks the id in `content/videos/` |
| `Comentados\Partes\`, `Shorts\Partes\` | the intro, outros and their raws, clips reused by shorts | **stay**: every video uses them |
| `Comentados\prontos\`, `Shorts\prontos\` | finished, published videos and covers | stay unless Luan says otherwise (his backup) |
| `Shorts\candidatos\` | numbered reels for him to pick moments | go once the shorts from them are made |
| `Shorts\` loose takes | studio takes (`shorts.py`) | `shorts.py --apply` deletes a take once its shorts exist; others: ask |
| loose `2026-… .mp4/.mkv` in `Videos\` | OBS's files before `videos.py` files them | never delete a recent one: `videos.py` joins and files them. Stubs of a few KB from a recording that failed to start (11-12 16-45-28: 734 B and 111 KB) can go once checked with ffprobe (no duration) |
| `NVIDIA\`, `Captures\` | GeForce/Xbox game clips, not the channel's | Luan's: ask (11-17: a June Chameleon clip, 0.6 GB, left) |

Outside Videos, but on C: too: WSL's `~/.cache/muanlartins` (edicao caches, replay copies; small, `replay.py` clears
its own after two days). WSL's disk image doesn't shrink by itself, so deleting there frees little on C:.

## 11-17, for reference

Days 11-09 to 11-13 marked done (all on YouTube, thumbnails and shorts made): 336 GB of Live/Jogo/Câmera/VAR; the
two candidates reels of 11-11 and 11-12 (0.5 GB); two OBS stubs of 11-12. C: went from 130 to 443 GB free.
