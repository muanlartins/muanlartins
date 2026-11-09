import definition from "@/content/voltaic-s3.json"
import type { L10n } from "@/lib/site"

/**
 * Luan's aim training with Voltaic (voltaic.gg), the aim community: its daily routine in Aimlabs, and its benchmark
 * every Sunday. scripts/voltaic.py copies every play from Aimlabs' own records into content/voltaic/<date>.json;
 * this finds the benchmarks among them and scores them as Voltaic does.
 *
 * Voltaic's Season 3 benchmark (content/voltaic-s3.json) is 18 scenarios in three levels (Novice, Intermediate,
 * Advanced), each scenario in one of nine subcategories (Clicking: Dynamic, Static, Linear; Tracking: Precise,
 * Reactive, Control; Switching: Speed, Evasive, Stability). A score becomes **energy**: 100 per rank's threshold
 * crossed, plus the way to the next one (Novice: Iron at 100, Bronze 200, Silver 300, Gold 400, up to 499 past Gold).
 * A subcategory's energy is its best scenario's, and the overall energy is the harmonic mean of the nine, so the
 * weakest weighs most and a subcategory never played makes it 0. The overall rank is the overall energy's; it's
 * "Complete" when every scenario reached it too. This is aimlab-stats.com's code for Voltaic S3, line by line.
 *
 * A day counts as a benchmark when it played at least BENCHMARK_MIN of a level's 18 scenarios; its score on each is
 * the day's best. Voltaic's own sheet keeps the best ever, but here each Sunday stands alone, so the weeks compare.
 */

export interface VoltaicPlay {
  /** When it started, UTC. */
  at: string
  /** Aimlabs' task id. */
  task: string
  name: string
  score: number
  accuracy?: number
  seconds: number
}

export interface VoltaicDay {
  /** YYYY-MM-DD in Brasília's time. */
  date: string
  plays: VoltaicPlay[]
}

export type LevelId = "novice" | "intermediate" | "advanced"

interface Scenario {
  id: string
  name: string
  category: string
  subcategory: string
  /** The floor energy counts from, then each rank's threshold. */
  scores: number[]
}

interface Level {
  id: LevelId
  name: L10n
  /** Energy at each of `scores`. */
  points: number[]
  /** The most energy a scenario gives at this level (Advanced has no cap past Celestial). */
  max: number
  /** The ranks starting at points[1] … points[4]. */
  ranks: string[]
  scenarios: Scenario[]
}

export const LEVELS = definition.levels as Level[]

/** At least this many of a level's 18 scenarios in a day make it a benchmark. */
export const BENCHMARK_MIN = 12

/** Voltaic's ranks, lowest first, in colours legible on the site's ground. Names stay Voltaic's, so they never read as Valorant's. */
export const RANKS = [
  { id: "iron", name: "Iron", color: "#5f6672" },
  { id: "bronze", name: "Bronze", color: "#a0602d" },
  { id: "silver", name: "Silver", color: "#6f7f96" },
  { id: "gold", name: "Gold", color: "#a8820f" },
  { id: "platinum", name: "Platinum", color: "#178f8a" },
  { id: "diamond", name: "Diamond", color: "#2f6fd0" },
  { id: "jade", name: "Jade", color: "#12895a" },
  { id: "master", name: "Master", color: "#a8369b" },
  { id: "grandmaster", name: "Grandmaster", color: "#b9770f" },
  { id: "nova", name: "Nova", color: "#7341cf" },
  { id: "astra", name: "Astra", color: "#cc3a73" },
  { id: "celestial", name: "Celestial", color: "#0c86a6" },
] as const

export type VoltaicRank = (typeof RANKS)[number]

export const rankById = (id: string | null | undefined) => RANKS.find((rank) => rank.id === id)

/** The three categories and their subcategories, in the benchmark's order. */
export const CATEGORIES = [
  { id: "Clicking", name: { pt: "Clicking", en: "Clicking" }, subcategories: ["Dynamic", "Static", "Linear"] },
  { id: "Tracking", name: { pt: "Tracking", en: "Tracking" }, subcategories: ["Precise", "Reactive", "Control"] },
  { id: "Switching", name: { pt: "Switching", en: "Switching" }, subcategories: ["Speed", "Evasive", "Stability"] },
]

/** A scenario's energy for a score (Voltaic S3's formula; uncapped, as Advanced's overall needs it). */
function energyOf(scenario: Scenario, score: number, level: Level) {
  const { scores } = scenario
  const { points } = level
  if (level.id !== "novice" && score <= scores[0]) return Math.floor((score / scores[0]) * points[0])
  if (score >= scores[4]) {
    const past = Math.floor(((score - scores[4]) / (scores[4] - scores[3])) * 100)
    return points[4] + (level.id === "advanced" ? past : Math.min(past, 99))
  }
  let at = 0
  scores.forEach((threshold, index) => {
    if (score > threshold) at = index
  })
  return points[at] + Math.floor(((score - scores[at]) * 100) / (scores[at + 1] - scores[at]))
}

/** The rank this much energy is at this level, or none below its first. */
function rankAt(energy: number, level: Level) {
  const capped = level.id === "advanced" ? Math.min(energy, level.points[4]) : energy
  if (capped < level.points[1]) return null
  return level.ranks[Math.min(Math.floor((capped - level.points[1]) / 100), 3)]
}

export interface ScenarioResult {
  id: string
  name: string
  category: string
  subcategory: string
  /** The rank thresholds, from the first rank (Iron) to the last of the level. */
  thresholds: number[]
  /** The day's best, or null when it wasn't played. */
  score: number | null
  accuracy?: number
  energy: number
  rank: string | null
  plays: number
}

export interface Benchmark {
  date: string
  level: LevelId
  scenarios: ScenarioResult[]
  /** In CATEGORIES' order. */
  subcategories: { category: string; name: string; energy: number }[]
  energy: number
  rank: string | null
  complete: boolean
  minutes: number
}

/** One day's benchmark at this level: each scenario's best that day, scored. */
function score(day: VoltaicDay, level: Level): Benchmark {
  const scenarios = level.scenarios.map((scenario): ScenarioResult => {
    const plays = day.plays.filter((play) => play.task === scenario.id)
    const best = plays.reduce<VoltaicPlay | undefined>((top, play) => (!top || play.score > top.score ? play : top), undefined)
    const raw = best ? energyOf(scenario, best.score, level) : 0
    const energy = level.id === "advanced" ? Math.min(raw, level.points[4]) : raw
    return {
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      subcategory: scenario.subcategory,
      thresholds: scenario.scores.slice(1),
      score: best ? best.score : null,
      accuracy: best?.accuracy,
      energy,
      rank: best ? rankAt(energy, level) : null,
      plays: plays.length,
    }
  })
  const subcategories = CATEGORIES.flatMap((category) =>
    category.subcategories.map((name) => ({
      category: category.id,
      name,
      energy: Math.max(0, ...scenarios.filter((s) => s.subcategory === name).map((s) => s.energy)),
    })),
  )
  const harmonic = (values: number[]) => Math.floor(values.length / values.reduce((sum, v) => sum + 1 / v, 0) + 1e-9)
  let energy = harmonic(subcategories.map((s) => s.energy))
  if (level.id === "advanced" && energy >= level.points[4]) {
    // Past Celestial, Advanced counts each subcategory's energy uncapped.
    energy = harmonic(
      subcategories.map((sub) =>
        Math.max(
          0,
          ...level.scenarios
            .filter((s) => s.subcategory === sub.name)
            .map((s) => {
              const best = Math.max(0, ...day.plays.filter((p) => p.task === s.id).map((p) => p.score))
              return best ? energyOf(s, best, level) : 0
            }),
        ),
      ),
    )
  }
  const rank = rankAt(energy, level)
  const lowest = Math.min(...scenarios.map((s) => s.energy))
  const minutes = Math.round(
    day.plays.filter((play) => level.scenarios.some((s) => s.id === play.task)).reduce((sum, play) => sum + play.seconds, 0) / 60,
  )
  return { date: day.date, level: level.id, scenarios, subcategories, energy, rank, complete: rank !== null && rankAt(lowest, level) === rank, minutes }
}

export interface TrainingDay {
  date: string
  minutes: number
  plays: number
  /** Each task played, in the order first played, with its best score. */
  tasks: { name: string; plays: number; best: number; accuracy?: number }[]
  /** The level benchmarked that day, if any. */
  benchmark?: LevelId
}

export interface VoltaicSummary {
  /** Oldest first. */
  benchmarks: Benchmark[]
  /** Every day with a play, oldest first. */
  days: TrainingDay[]
  totalMinutes: number
  totalPlays: number
  /** Days in a row with a play, up to the last one. */
  streak: number
  longestStreak: number
  /** The last day trained. */
  lastDay?: string
}

const nextDay = (date: string) => {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}

export function summarizeVoltaic(files: VoltaicDay[]): VoltaicSummary {
  const sorted = [...files].sort((a, b) => a.date.localeCompare(b.date)).filter((day) => day.plays.length > 0)
  const benchmarks: Benchmark[] = []
  const days = sorted.map((day): TrainingDay => {
    // The highest level the day played enough of.
    const level = [...LEVELS].reverse().find((level) => level.scenarios.filter((s) => day.plays.some((p) => p.task === s.id)).length >= BENCHMARK_MIN)
    if (level) benchmarks.push(score(day, level))
    const tasks = new Map<string, TrainingDay["tasks"][number]>()
    for (const play of [...day.plays].sort((a, b) => a.at.localeCompare(b.at))) {
      const task = tasks.get(play.name) ?? { name: play.name, plays: 0, best: play.score, accuracy: play.accuracy }
      task.plays++
      if (play.score >= task.best) {
        task.best = play.score
        task.accuracy = play.accuracy
      }
      tasks.set(play.name, task)
    }
    return {
      date: day.date,
      minutes: Math.round(day.plays.reduce((sum, play) => sum + play.seconds, 0) / 60),
      plays: day.plays.length,
      tasks: [...tasks.values()],
      benchmark: level?.id,
    }
  })

  let streak = 0
  let longestStreak = 0
  days.forEach((day, index) => {
    streak = index > 0 && nextDay(days[index - 1].date) === day.date ? streak + 1 : 1
    longestStreak = Math.max(longestStreak, streak)
  })

  return {
    benchmarks,
    days,
    totalMinutes: days.reduce((sum, day) => sum + day.minutes, 0),
    totalPlays: days.reduce((sum, day) => sum + day.plays, 0),
    streak,
    longestStreak,
    lastDay: days.at(-1)?.date,
  }
}

/** Where this energy sits: its rank, and the next rank with the energy it starts at (none past the top). */
export function standingOf(energy: number) {
  const index = Math.floor(energy / 100) - 1
  const rank = index >= 0 ? RANKS[Math.min(index, RANKS.length - 1)] : undefined
  const next = index + 1 < RANKS.length ? { rank: RANKS[index + 1], at: (index + 2) * 100 } : undefined
  return { rank, next, from: Math.max(0, (index + 1) * 100) }
}
