/**
 * Ranked matches as the stream's "Partidas" dock records them
 * (public/stream/partidas.html): one file per session in content/matches/,
 * published from the dock at the end of a stream. Points are the game's
 * MMR, typed in after each match; the rest comes from Rocket League's
 * Stats API. Teammates are kept without their names.
 */

export const MODES = ["1v1", "2v2", "3v3"] as const
export type Mode = (typeof MODES)[number]

/** Days are counted in Luan's time, wherever the site is built. */
export const TIME_ZONE = "America/Sao_Paulo"

/** A rank: `tier` is an emblem in public/ranks ("diamond-2"), `division` 1–4. */
export interface Standing {
  tier: string
  division?: number
  mmr?: number | null
}

export interface PlayerStats {
  score: number
  goals: number
  assists: number
  saves: number
  shots: number
  touches: number
  demos: number
}

export interface Match {
  id: string
  at: string
  mode: string
  result: "win" | "loss"
  /** Left before the end: counted as a loss. */
  left?: boolean
  /** Goals, ours first. Missing on matches added by hand. */
  score?: [number, number]
  overtime?: boolean
  me?: PlayerStats
  mates?: PlayerStats[]
  /** The rank going into the match. */
  rank?: Standing | null
  /** Points won or lost, and the total after. */
  points?: number | null
  mmr?: number | null
}

export interface Session {
  id: string
  start: string
  end: string
  startRanks: Partial<Record<string, Standing>>
  matches: Match[]
  /** Every rank set in the dock during the session. */
  ranks: (Standing & { at: string; mode: string })[]
}

export interface Day extends DayRecord {
  /** YYYY-MM-DD in TIME_ZONE. */
  date: string
  end?: Standing
}

export interface Summary {
  matches: Match[]
  wins: number
  losses: number
  /** Positive: wins in a row at the end; negative: losses. */
  streak: number
  bestStreak: number
  /** Average points per win and per loss. */
  winPoints?: number
  lossPoints?: number
  /** The latest rank and the first points on record. */
  standing?: Standing
  first?: { at: string; mmr: number }
  /** The points line: the total before the first match, then after each one. */
  series: { at: string; mmr: number; match?: Match }[]
  days: Day[]
  /** Averages per match: mine, and one teammate's. */
  averages?: { me: PlayerStats; mates?: PlayerStats; matches: number }
}

export const STATS: (keyof PlayerStats)[] = ["score", "goals", "assists", "saves", "shots", "touches", "demos"]

/** The day (YYYY-MM-DD) a moment falls on in Luan's time. */
export const dayOf = (at: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(at),
  )

export interface DayRecord {
  wins: number
  losses: number
  /** Net points from the matches that have them. */
  points: number
}

/** A day's ranked matches in every mode: wins, losses and net points. */
export function dayRecord(sessions: Session[], date: string): DayRecord {
  const matches = sessions.flatMap((session) => session.matches).filter((match) => dayOf(match.at) === date)
  return {
    wins: matches.filter((match) => match.result === "win").length,
    losses: matches.filter((match) => match.result === "loss").length,
    points: matches.reduce((total, match) => total + (match.points ?? 0), 0),
  }
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined)

function averageStats(lines: PlayerStats[]): PlayerStats | undefined {
  if (lines.length === 0) return undefined
  return Object.fromEntries(STATS.map((stat) => [stat, mean(lines.map((line) => line[stat]))])) as unknown as PlayerStats
}

export function summarize(sessions: Session[], mode: Mode): Summary {
  const matches = sessions
    .flatMap((session) => session.matches)
    .filter((match) => match.mode === mode)
    .sort((a, b) => a.at.localeCompare(b.at))

  // Ranks set in the dock, and the ones each match records, in time order.
  const standings = [
    ...sessions.flatMap((session) => {
      const start = session.startRanks[mode]
      return [
        ...(start ? [{ ...start, at: session.start }] : []),
        ...session.ranks.filter((rank) => rank.mode === mode),
      ]
    }),
    ...matches.flatMap((match) =>
      match.rank && match.mmr != null ? [{ ...match.rank, mmr: match.mmr, at: match.at }] : [],
    ),
  ].sort((a, b) => a.at.localeCompare(b.at))
  const last = standings.at(-1)
  const standing = last && { tier: last.tier, division: last.division, mmr: last.mmr }
  const firstPoints = standings.find((s) => s.mmr != null)

  let streak = 0
  let bestStreak = 0
  let run = 0
  for (const match of matches) {
    const win = match.result === "win"
    streak = win ? Math.max(streak, 0) + 1 : Math.min(streak, 0) - 1
    run = win ? run + 1 : 0
    bestStreak = Math.max(bestStreak, run)
  }

  const series: Summary["series"] = []
  for (const match of matches) {
    if (match.mmr == null) continue
    if (series.length === 0 && match.rank?.mmr != null) series.push({ at: match.at, mmr: match.rank.mmr })
    series.push({ at: match.at, mmr: match.mmr, match })
  }

  const days: Day[] = []
  for (const match of matches) {
    const date = dayOf(match.at)
    let day = days.at(-1)
    if (day?.date !== date) days.push((day = { date, wins: 0, losses: 0, points: 0 }))
    if (match.result === "win") day.wins++
    else day.losses++
    day.points += match.points ?? 0
  }
  for (const day of days) {
    const end = standings.filter((s) => dayOf(s.at) <= day.date).at(-1)
    day.end = end && { tier: end.tier, division: end.division, mmr: end.mmr }
  }

  const tracked = matches.filter((match) => match.me)
  const me = averageStats(tracked.map((match) => match.me!))
  const pointsOf = (result: Match["result"]) =>
    mean(matches.filter((m) => m.result === result && m.points != null).map((m) => m.points!))

  return {
    matches,
    wins: matches.filter((match) => match.result === "win").length,
    losses: matches.filter((match) => match.result === "loss").length,
    streak,
    bestStreak,
    winPoints: pointsOf("win"),
    lossPoints: pointsOf("loss"),
    standing,
    first: firstPoints && { at: firstPoints.at, mmr: firstPoints.mmr! },
    series,
    days,
    averages: me && {
      me,
      mates: averageStats(tracked.flatMap((match) => match.mates ?? [])),
      matches: tracked.length,
    },
  }
}
