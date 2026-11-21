/**
 * Valorant's matches as the stream's "Partidas" dock records them (its Valorant tab, from scripts/valorant.py, which
 * reads Valorant's own match history once a match ends): one file per session in content/valorant/, published from
 * the dock. Luan's numbers in full; teammates' without their names, but for the viewers in public/stream/aliados.json
 * who agreed to be named, by Twitch login; opponents not at all.
 */

export interface ValorantStats {
  kills: number
  deaths: number
  assists: number
  /** Combat score over the match; per round, it's the ACS. */
  score: number
  headshots: number
  bodyshots: number
  legshots: number
  damage: number
  firstKills: number
}

export interface ValorantMate {
  agent: string
  kills: number
  deaths: number
  assists: number
  score: number
  login?: string
}

export interface ValorantMatch {
  id: string
  start: string
  at: string
  /** Riot's queue: "competitive", "unrated", "swiftplay"… */
  queue: string
  map: string
  agent: string
  result: "win" | "loss" | "draw"
  /** Rounds, ours first. */
  score: [number, number]
  rounds: number
  me: ValorantStats
  mates?: ValorantMate[]
  /** RR won or lost (competitive). */
  rr?: number | null
  /** The rank after it: Riot's tier (9 is Silver 1) and the RR within it. */
  rank?: { tier: number; rr: number } | null
}

export interface ValorantSession {
  id: string
  game: "valorant"
  start: string
  end: string
  outputs?: { kind: "stream" | "record"; start: string; end?: string; file?: string }[]
  matches: ValorantMatch[]
}

/** Riot's competitive tiers by number, as the emblems in public/ranks/valorant/ are named. */
const TIERS = ["iron", "bronze", "silver", "gold", "platinum", "diamond", "ascendant", "immortal"]

/** The emblem's id for a Riot tier: 9 → "silver-1", 27 → "radiant"; undefined below Iron 1. */
export function tierId(tier: number | undefined | null) {
  if (!tier || tier < 3) return undefined
  if (tier >= 27) return "radiant"
  return `${TIERS[Math.floor((tier - 3) / 3)]}-${((tier - 3) % 3) + 1}`
}

/** Shots that hit the head, of all that hit, in %. */
export const headshotRate = (stats: Pick<ValorantStats, "headshots" | "bodyshots" | "legshots">) => {
  const hits = stats.headshots + stats.bodyshots + stats.legshots
  return hits ? (100 * stats.headshots) / hits : 0
}

export interface ValorantSummary {
  matches: ValorantMatch[]
  wins: number
  losses: number
  /** Luan's rank after the latest match that told it. */
  rank?: { tier: number; rr: number }
  /** Per match: kills, deaths, assists; and ACS and headshot % over every round and hit. */
  averages?: { kills: number; deaths: number; assists: number; acs: number; headshots: number }
  /** The viewers who played with Luan, most matches first, with their averages in those matches. */
  allies: { login: string; matches: number; wins: number; losses: number; rr: number; averages: { kills: number; deaths: number; assists: number } }[]
}

/** Every competitive match of these sessions, summed up for the ranked page. */
export function summarizeValorant(sessions: ValorantSession[]): ValorantSummary {
  const matches = sessions
    .flatMap((session) => session.matches)
    .filter((match) => match.queue === "competitive")
    .sort((a, b) => a.at.localeCompare(b.at))
  const wins = matches.filter((m) => m.result === "win").length
  const losses = matches.filter((m) => m.result === "loss").length
  const rank = matches.findLast((m) => m.rank?.tier)?.rank ?? undefined
  const total = (pick: (m: ValorantMatch) => number) => matches.reduce((sum, m) => sum + pick(m), 0)
  const rounds = total((m) => m.rounds)
  const averages = matches.length
    ? {
        kills: total((m) => m.me.kills) / matches.length,
        deaths: total((m) => m.me.deaths) / matches.length,
        assists: total((m) => m.me.assists) / matches.length,
        acs: rounds ? total((m) => m.me.score) / rounds : 0,
        headshots: headshotRate({
          headshots: total((m) => m.me.headshots),
          bodyshots: total((m) => m.me.bodyshots),
          legshots: total((m) => m.me.legshots),
        }),
      }
    : undefined

  const allies = new Map<string, { matches: number; wins: number; losses: number; rr: number; kills: number; deaths: number; assists: number }>()
  for (const m of matches) {
    for (const mate of m.mates ?? []) {
      if (!mate.login) continue
      const entry = allies.get(mate.login) ?? { matches: 0, wins: 0, losses: 0, rr: 0, kills: 0, deaths: 0, assists: 0 }
      entry.matches++
      if (m.result === "win") entry.wins++
      if (m.result === "loss") entry.losses++
      entry.rr += m.rr ?? 0
      entry.kills += mate.kills
      entry.deaths += mate.deaths
      entry.assists += mate.assists
      allies.set(mate.login, entry)
    }
  }

  return {
    matches,
    wins,
    losses,
    rank,
    averages,
    allies: [...allies]
      .map(([login, { kills, deaths, assists, ...counts }]) => ({
        login,
        ...counts,
        averages: { kills: kills / counts.matches, deaths: deaths / counts.matches, assists: assists / counts.matches },
      }))
      .sort((a, b) => b.matches - a.matches || a.login.localeCompare(b.login)),
  }
}
