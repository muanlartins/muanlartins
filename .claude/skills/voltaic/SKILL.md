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
- **Names come from three places**, since the database has only ids (`CsLevel.Lowgravity56.VT Twosh.RUKTDF`): the
  replay headers, but Aimlabs keeps the replays of only its **last 50 plays** (100 files, `.json` + `.avro`), two
  or three days of training; then the copies Aimlabs keeps of tasks (`CreatorStudio\Levels\*\level.es3`,
  `CreatorStudio\content.es3`, `SaveFile.es3`: Easy Save files, which are JSON, `label` by `id`); then Aimlabs'
  public GraphQL API, `aimlab { task(slug: "<task id>") { name } }` at `https://api.aimlab.gg/graphql`, all the
  missing ones in one request with aliases, no sign-in, only the tasks' public ids sent (never his Aimlabs id).
  Found 2026-11-15, when a week run once on Sunday had 81 plays named `VT Twosh`, `VT Midra`…: the copies named 28,
  the API the rest (and agreed with all 68 names the replays gave). A name guessed from the id (its third part) is
  only the last resort, and a later run that finds the name replaces it in place. Aimlabs' per-user queries
  (`plays_agg`) need a sign-in since; the per-task one doesn't. If the API stops answering, the script says how many
  tasks kept a cut name and goes on.
- **Paused attempts don't count** (Luan, 2026-11-15, as Voltaic doesn't count them: his 446 on Frogshot was paused
  2.6 s by his cat on the screen, so the 434 counts). The script writes `pause` (seconds) on a paused play: exactly
  from the replay header's `pauseDuration` (ms), or, once the replay is gone, the wall time past the task's length
  (the replays' `duration`, else the time most of that task's plays took; 2 s or more, as the database has whole
  seconds: 11-08's Shifttrack 1710 took 114 s of a 60 s task). `lib/voltaic.ts` leaves paused plays out of the
  benchmark (the best, the 12-scenario count) and of each day's best in the calendar, which still lists them
  ("· 1 com pausa"; a task whose only attempts were paused shows its score struck through). Every play stays in the
  files: Luan wants it transparent ("acho que faz parte, vamos ser transparentes").
- `lib/voltaic.ts` finds the benchmarks (a day with at least 12 of a level's 18 scenarios; each scenario's best that
  day) and scores them with Voltaic S3's formula, ported line by line from aimlab-stats.com: energy per scenario,
  the best per subcategory, the harmonic mean of the nine, "Complete" when every scenario reached the rank.
- `content/voltaic-s3.json` is the benchmark itself: each level's scenario ids, names, subcategories and thresholds.

## What he trains: VDIM S3, and when to move up

Researched on 2026-11-08 by the Windows-side session (it read the Voltaic Discord's #resources and the ~30 guides it
links); the whole digest is the "Voltaic Field Manual", Luan's private artifact
https://claude.ai/artifact/W58CiUvaUEi3wjBnfXhWYG (read it with the Artifact tool). What matters here:

- **Three benchmark tiers, six training levels.** The benchmark is Novice (Iron–Gold, energy capped at 499),
  Intermediate (Platinum–Master), Advanced (Grandmaster–Celestial): move to Intermediate's playlist once Gold.
  The daily training is **VDIM S3** (Voltaic Daily Improvement Method, by LG56 and 4rK): a playlist per weekday,
  `VDIM S3 <Day> <Level> by LG56`, played in order, ending on that day's benchmark scenarios:

  | VDIM level | S3 rank |
  | --- | --- |
  | Entry | Unranked → Bronze |
  | Novice | Bronze Complete → Gold |
  | Adept | Gold Complete → Diamond |
  | Intermediate | Diamond Complete → Master |
  | Advanced | Master Complete → Nova |
  | Elite | Astra+ |

- **The gate is "Complete", not the overall energy**: Bronze Complete means Bronze on all 18 scenarios. Overall
  Silver (300) isn't a gate: the harmonic mean takes each subcategory's better scenario, so he can be Silver with a
  scenario still under Bronze. The guide lets him move up early if it's easy or stay if the jump feels big.
- **The week**: Mon Clicking I (static), Tue Clicking II (dynamic), Wed Tracking I (precise/smooth), Thu Tracking II
  (reactive), Fri Switching I (speed), Sat Switching II (evasive); Sunday is free (Benchmark Focus S3 for the weak
  spots, a redo, or rest), which is when he plays the benchmark.
- **No pausing**: the guide says pausing during a benchmark run breaks the rules (hence `pause` above).
- Since 2026-11-08 he's on **VDIM Entry** (his routine's tasks end in "Entry"). To answer "when do I move up?",
  list the latest benchmark's scenarios under the next gate's rank (each `ScenarioResult.thresholds` is
  Iron/Bronze/Silver/Gold) with what each lacks.

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
| 2026-11-15 | Novice | Iron | 190 (+58) | Precise 94 (Frogshot 434: the 446 was paused) |

Add a line each Sunday: it's the quick answer to "como estou indo?" without building the site.

## When things change

- **He moves up a level** (Gold in Novice → Intermediate): nothing to do; the site picks the highest level with 12+
  scenarios played that day. The chart and ranks span levels (100 energy per rank, Iron 100 … Celestial 1200).
- **A new Voltaic season**: a new `content/voltaic-<season>.json` with its ids and thresholds (aimlab-stats.com's
  benchmark page bundles them in its JS; Voltaic's own sheet has them too), point `lib/voltaic.ts` at it and keep
  S3's for the old Sundays. Check the energy formula didn't change.
- **Aimlabs changes its database**: `TaskData`'s columns (`taskName` is the id, `score`, `startedAt`, `endedAt`,
  `performance` JSON with `accTotal`, `playId`) are what the script reads.
