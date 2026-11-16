---
name: voltaic
description: Publishing Luan's aim training (Voltaic's routine and Sunday benchmark in Aimlabs) to the Valorant aim page, /conteudo/valorant/aim. Use after he trains or benchmarks ("fiz o benchmark", "treinei a mira"), or when the aim page, its ranks or the benchmark's season change.
---

# Aim training with Voltaic

Luan trains aim every day with Voltaic's Valorant routine in Aimlabs and plays Voltaic's **Season 3 benchmark**
every Sunday (Novice for now: Aimlabs playlist `3266803489`). The page `/conteudo/valorant/aim` shows it.

**The weekly ritual** (Luan, 2026-11-15: "toda semana a gente pegue os melhores placares do aimlabs do treinamento da
semana, e também a rotina de treino, pra gente poder acompanhar a jornada"): every Sunday, once he's played the
benchmark, the week goes on the site, both halves of it, and the page already draws both from the same files:

- **the benchmark**: rank, energy, the change since last Sunday, the radar, each scenario's best through its ranks;
- **the routine**: each day of the week in the "Treino" calendar, which opens every task played that day with how
  many times and its best score (Voltaic's routine changes the tasks day by day).

Nothing to write by hand: run the steps below, and the page follows.

Everything is deterministic: a script copies, the site computes.

- `scripts/voltaic.py` reads Aimlabs' own SQLite (`%USERPROFILE%\AppData\LocalLow\Statespace\aimlab_tb\Users\<id>\LocalDB\Klutch.bytes`,
  table `TaskData`, copied before reading) and the replay headers beside it (`Replay\<play>.json`, for the tasks'
  names), and writes one file per day (Brasília time) in `content/voltaic/<date>.json`: every play's start, task id,
  name, score, accuracy and seconds. Files only grow: plays are never removed, so an emptied Aimlabs loses nothing.
- **Names need the script to run every few days.** The database has no task names, only ids
  (`CsLevel.Lowgravity56.VT Twosh.RUKTDF`), and Aimlabs keeps the replays of only its **last 50 plays** (100 files,
  `.json` + `.avro`): two or three days of training. Run once a week, Monday to Friday lose their names (found
  2026-11-15: 81 of the week's plays came out as `VT Twosh`, `VT Midra`…). So the script also reads the copies
  Aimlabs keeps of tasks (`CreatorStudio\Levels\*\level.es3`, `CreatorStudio\content.es3`, `SaveFile.es3`: Easy
  Save files, which are JSON, `label` by `id`), which named 28 of them; the other 53 stayed cut (Aimlabs kept no
  copy, the Steam Workshop folder `steamapps\workshop\content\714010` only repeats those copies, and Aimlabs'
  GraphQL API answers task names only per user, which would mean sending his Aimlabs id: not without asking). That's
  why `depois-da-live` runs it after each live too: a later run with the name upgrades a cut one in place.
- `lib/voltaic.ts` finds the benchmarks (a day with at least 12 of a level's 18 scenarios; each scenario's best that
  day) and scores them with Voltaic S3's formula, ported line by line from aimlab-stats.com: energy per scenario,
  the best per subcategory, the harmonic mean of the nine, "Complete" when every scenario reached the rank.
- `content/voltaic-s3.json` is the benchmark itself: each level's scenario ids, names, subcategories and thresholds.

## After a training or a benchmark

1. Check he isn't live (`node scripts/obs.mjs`); the script is light, the builds aren't.
2. `git pull --ff-only`, then `python3 scripts/voltaic.py` shows the days that change, then
   `python3 scripts/voltaic.py --apply`. A Sunday should show about 18+ plays; if a benchmark day shows fewer than
   12 of the scenarios, it won't count as a benchmark: ask him whether he skipped some. Count the plays still named
   by a cut id (`name` equal to the id's third part) and say so if there are any.
3. Tell him the week in a few lines, from `lib/voltaic.ts` itself (not by hand): the rank and energy, the change
   since last Sunday, the energy to the next rank, the weakest subcategory (the page's "Onde focar"), the scenarios
   that moved most, and the week's routine (days trained, minutes, the streak). To get the numbers:
   `JITI_ALIAS='{"@/":"'$PWD'/"}' node_modules/.bin/jiti <script>.ts` with a script in the repo's root that reads
   `content/voltaic/*.json` and calls `summarizeVoltaic` (delete it after; it isn't committed).
4. `pnpm lint`, `pnpm build`, look at `/conteudo/valorant/aim` (and Valorant's home card), delete `out/`.
5. Commit (`content/voltaic/`, plus the script or this skill when they changed), ask Luan before pushing: a push to
   `main` is a release. The week's data isn't a roadmap entry (like the ranked sessions); a new feature of the page is.

## The weeks so far

| Sunday | Level | Rank | Energy | Weakest |
| --- | --- | --- | --- | --- |
| 2026-11-08 | Novice | Iron | 132 | Control 83 |
| 2026-11-15 | Novice | Iron | 190 (+58) | Precise 94 |

Add a line each Sunday: it's the quick answer to "como estou indo?" without building the site.

## When things change

- **He moves up a level** (Gold in Novice → Intermediate): nothing to do; the site picks the highest level with 12+
  scenarios played that day. The chart and ranks span levels (100 energy per rank, Iron 100 … Celestial 1200).
- **A new Voltaic season**: a new `content/voltaic-<season>.json` with its ids and thresholds (aimlab-stats.com's
  benchmark page bundles them in its JS; Voltaic's own sheet has them too), point `lib/voltaic.ts` at it and keep
  S3's for the old Sundays. Check the energy formula didn't change.
- **Aimlabs changes its database**: `TaskData`'s columns (`taskName` is the id, `score`, `startedAt`, `endedAt`,
  `performance` JSON with `accTotal`, `playId`) are what the script reads.
