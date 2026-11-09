---
name: voltaic
description: Publishing Luan's aim training (Voltaic's routine and Sunday benchmark in Aimlabs) to the Valorant aim page, /conteudo/valorant/aim. Use after he trains or benchmarks ("fiz o benchmark", "treinei a mira"), or when the aim page, its ranks or the benchmark's season change.
---

# Aim training with Voltaic

Luan trains aim every day with Voltaic's Valorant routine in Aimlabs and plays Voltaic's **Season 3 benchmark**
every Sunday (Novice for now: Aimlabs playlist `3266803489`). The page `/conteudo/valorant/aim` shows it.

Everything is deterministic: a script copies, the site computes.

- `scripts/voltaic.py` reads Aimlabs' own SQLite (`%USERPROFILE%\AppData\LocalLow\Statespace\aimlab_tb\Users\<id>\LocalDB\Klutch.bytes`,
  table `TaskData`, copied before reading) and the replay headers beside it (`Replay\<play>.json`, for the tasks'
  names), and writes one file per day (Brasília time) in `content/voltaic/<date>.json`: every play's start, task id,
  name, score, accuracy and seconds. Files only grow: plays are never removed, so an emptied Aimlabs loses nothing.
- `lib/voltaic.ts` finds the benchmarks (a day with at least 12 of a level's 18 scenarios; each scenario's best that
  day) and scores them with Voltaic S3's formula, ported line by line from aimlab-stats.com: energy per scenario,
  the best per subcategory, the harmonic mean of the nine, "Complete" when every scenario reached the rank.
- `content/voltaic-s3.json` is the benchmark itself: each level's scenario ids, names, subcategories and thresholds.

## After a training or a benchmark

1. Check he isn't live (`node scripts/obs.mjs`); the script is light, the builds aren't.
2. `python3 scripts/voltaic.py` shows the days that change, then `python3 scripts/voltaic.py --apply`.
   A Sunday should show about 18+ plays; if a benchmark day shows fewer than 12 of the scenarios, it won't count
   as a benchmark: ask him whether he skipped some.
3. Tell him the result in a line: the rank and energy, the change since last Sunday, the weakest subcategory
   (the page's "Onde focar").
4. `pnpm lint`, `pnpm build`, look at `/conteudo/valorant/aim` (and Valorant's home card), delete `out/`.
5. Commit (`content/voltaic/` only), ask Luan before pushing: a push to `main` is a release.

## When things change

- **He moves up a level** (Gold in Novice → Intermediate): nothing to do; the site picks the highest level with 12+
  scenarios played that day. The chart and ranks span levels (100 energy per rank, Iron 100 … Celestial 1200).
- **A new Voltaic season**: a new `content/voltaic-<season>.json` with its ids and thresholds (aimlab-stats.com's
  benchmark page bundles them in its JS; Voltaic's own sheet has them too), point `lib/voltaic.ts` at it and keep
  S3's for the old Sundays. Check the energy formula didn't change.
- **Aimlabs changes its database**: `TaskData`'s columns (`taskName` is the id, `score`, `startedAt`, `endedAt`,
  `performance` JSON with `accTotal`, `playId`) are what the script reads.
