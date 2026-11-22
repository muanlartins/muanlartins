/**
 * Ranked matches as the stream's "Partidas" dock records them
 * (public/stream/partidas.html): one file per session in content/matches/,
 * published from the dock at the end of a stream. Points are the game's
 * MMR, typed in after each match; the rest comes from Rocket League's
 * Stats API. Teammates are kept without their names, but for the viewers who
 * agreed to be named (public/stream/aliados.json), kept by Twitch login.
 */

export const MODES = ["1v1", "2v2", "3v3"] as const
export type Mode = (typeof MODES)[number]

/** Days are counted in Luan's time, wherever the site is built. */
export const TIME_ZONE = "America/Sao_Paulo"

/** RLR, the replay player, on the site's own domain (/rlr/, GitHub Pages behind CloudFront), opening a replay the
 * site serves (`Match.replay`): same origin, so RLR fetches it without CORS. */
export const rlrHref = (replay: string) => `/rlr/?replay=${encodeURIComponent(replay)}`

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

/** Luan's own line: the Partidas dock adds these since 2026-11-21 (missing before). */
export interface MyStats extends PlayerStats {
  /** His touches in the air (the Stats API has none: the dock counts them). */
  aerials?: number
  /** The match's MVP. */
  mvp?: boolean
}

/** A teammate: their numbers, and their Twitch login when they're a viewer who agreed to be named. */
export interface Mate extends PlayerStats {
  login?: string
}

export interface Match {
  id: string
  /** The first countdown: where the match's chapter of the VOD begins. Missing on older matches. */
  start?: string | null
  /** The end. */
  at: string
  mode: string
  result: "win" | "loss"
  /** Left before the end: counted as a loss. */
  left?: boolean
  /** Goals, ours first. Missing on matches added by hand. */
  score?: [number, number]
  overtime?: boolean
  me?: MyStats
  mates?: Mate[]
  /** The rank going into the match. */
  rank?: Standing | null
  /** Points won or lost, and the total after. */
  points?: number | null
  mmr?: number | null
  /** Its replay on the site, "/replays/2026-11-20/2026-11-20-01.replay" (scripts/replays.py): RLR opens it. */
  replay?: string
}

export interface Session {
  id: string
  start: string
  end: string
  startRanks: Partial<Record<string, Standing>>
  matches: Match[]
  /** Every rank set in the dock during the session. */
  ranks: (Standing & { at: string; mode: string })[]
  /** The stream and the recording, as OBS started and stopped them. Missing on older sessions. */
  outputs?: Output[]
}

export interface Output {
  kind: "stream" | "record"
  start: string
  end?: string
  /** The recording's file name. */
  file?: string
}

export interface Summary {
  /** Oldest first. */
  matches: Match[]
  wins: number
  losses: number
  /** The latest rank and the first points on record. */
  standing?: Standing
  first?: { at: string; mmr: number }
  /** Every rank on record in the mode, in time order: set in the dock, read off the scoreboard, going into a match. */
  standings: (Standing & { at: string })[]
  /** Averages per match: mine, and one teammate's. */
  averages?: { me: PlayerStats; mates?: PlayerStats; matches: number }
  /** The viewers who played with me, most matches first. */
  allies: Ally[]
}

export interface Ally {
  login: string
  matches: number
  wins: number
  losses: number
  /** Net points from the matches together that have them. */
  points: number
  /** Their average per match with me. */
  averages: PlayerStats
}

/** The viewers among a match's teammates. */
export const viewersIn = (match: Match) => (match.mates ?? []).flatMap((mate) => (mate.login ? [mate.login] : []))

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

  const tracked = matches.filter((match) => match.me)
  const me = averageStats(tracked.map((match) => match.me!))

  const byLogin = new Map<string, { matches: Match[]; lines: PlayerStats[] }>()
  for (const match of matches) {
    for (const mate of match.mates ?? []) {
      if (!mate.login) continue
      const ally = byLogin.get(mate.login) ?? { matches: [], lines: [] }
      ally.matches.push(match)
      ally.lines.push(mate)
      byLogin.set(mate.login, ally)
    }
  }
  const allies: Ally[] = [...byLogin].map(([login, { matches: together, lines }]) => ({
    login,
    matches: together.length,
    wins: together.filter((match) => match.result === "win").length,
    losses: together.filter((match) => match.result === "loss").length,
    points: together.reduce((total, match) => total + (match.points ?? 0), 0),
    averages: averageStats(lines)!,
  }))
  allies.sort((a, b) => b.matches - a.matches || b.wins - a.wins || a.login.localeCompare(b.login))

  return {
    allies,
    matches,
    wins: matches.filter((match) => match.result === "win").length,
    losses: matches.filter((match) => match.result === "loss").length,
    standing,
    first: firstPoints && { at: firstPoints.at, mmr: firstPoints.mmr! },
    standings,
    averages: me && {
      me,
      mates: averageStats(tracked.flatMap((match) => match.mates ?? [])),
      matches: tracked.length,
    },
  }
}
