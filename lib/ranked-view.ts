import assets from "@/content/valorant-assets.json"
import { divisionOf, shortDate, signed, tierOf, type RankInfo } from "@/components/site/ranked/format"
import { dayOf, summarize, viewersIn, type Mode, type Session } from "@/lib/ranked"
import type { Rank } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import { headshotRate, summarizeValorant, tierId, type ValorantSession } from "@/lib/valorant"

/**
 * One shape for every game's ranked record, so the ranked pages share their parts (components/site/ranked/record.tsx)
 * and only what's the game's own differs: Rocket League's points (MMR) and goals, assists and saves; Valorant's RR,
 * kills, deaths and assists, its maps and agents.
 */

export type Result = "win" | "loss" | "draw"

/** A number with its letter: 21 K. */
export interface Stat {
  value: number
  letter: string
  /** Shown with one decimal (averages). */
  decimal?: boolean
}

export interface Art {
  name: string
  image: string
}

export interface ViewMatch {
  id: string
  at: string
  result: Result
  score?: [number, number]
  /** Points (or RR) won or lost. */
  change?: number | null
  /** What it's worth after, as the chart reads it. */
  value?: number | null
  /** That value in words: "812 pts", "Prata 2 · 45 RR". */
  valueText?: string
  map?: Art
  agent?: Art
  stats: Stat[]
  /** Small notes: "174 ACS", "prorrogação". */
  extra: string[]
  viewers: string[]
  moment?: { date: string; at: number }
}

export interface Standing {
  icon: string
  name: string
  color: string
  /** Under the name: "Divisão II". */
  detail?: string
  /** "812 pts", "45 RR". */
  value?: string
  /** Since the first on record: "+40 desde 28/10". */
  since?: string
}

export interface Band {
  from: number
  to: number
  name: string
  icon: string
  color: string
}

export interface Day {
  date: string
  results: Result[]
  wins: number
  losses: number
  change: number
  end?: { icon: string; name: string }
}

export interface Player {
  login: string
  me?: boolean
  matches: number
  wins: number
  losses: number
  change: number
  stats: Stat[]
}

export interface Breakdown {
  title: string
  kind: "agent" | "map"
  rows: (Art & { wins: number; losses: number })[]
}

export interface RecordView {
  /** "pts", "RR". */
  unit: string
  standing?: Standing
  wins: number
  losses: number
  /** Positive: wins in a row at the end; negative: losses. */
  streak: number
  bestStreak: number
  winChange?: number
  lossChange?: number
  /** The game's own averages, for the tiles: "1,4 G", "213 ACS". */
  tiles: { label: string; stats: Stat[] }[]
  /** Oldest first. */
  matches: ViewMatch[]
  /** The value before the first match, then after each one. */
  series: { at: string; value: number; text: string; match?: ViewMatch }[]
  /** The chart's backdrop: Valorant's ranks along the value. Without them, round numbers. */
  bands?: Band[]
  /** Oldest first. */
  days: Day[]
  players: Player[]
  playersHint: string
  breakdowns: Breakdown[]
  /** What a match row's numbers are. */
  listHint: string
}

const T = localize({
  points: { pt: "pts", en: "pts" },
  division: { pt: "Divisão", en: "Division" },
  since: { pt: "desde", en: "since" },
  overtime: { pt: "prorrogação", en: "overtime" },
  left: { pt: "saí antes", en: "left early" },
  G: { pt: "G", en: "G" },
  A: { pt: "A", en: "A" },
  D: { pt: "D", en: "S" },
  K: { pt: "K", en: "K" },
  Dv: { pt: "D", en: "D" },
  goals: { pt: "Por partida", en: "Per match" },
  kda: { pt: "Abates, mortes, assistências", en: "Kills, deaths, assists" },
  aim: { pt: "Combate e mira", en: "Combat and aim" },
  agents: { pt: "Agentes", en: "Agents" },
  maps: { pt: "Mapas", en: "Maps" },
  rlPlayers: {
    pt: "Partidas, vitórias e derrotas, pontos e a média por partida de gols (G), assistências (A) e defesas (D). A minha conta as {n} partidas com estatísticas do jogo; a de cada viewer, só as que jogou comigo.",
    en: "Matches, wins and losses, points, and the average per match of goals (G), assists (A) and saves (S). Mine counts the {n} matches with the game's stats; each viewer's, only the ones they played with me.",
  },
  valPlayers: {
    pt: "Partidas, vitórias e derrotas, RR e a média por partida de abates (K), mortes (D) e assistências (A). A de cada viewer conta só as partidas que jogou comigo.",
    en: "Matches, wins and losses, RR, and the average per match of kills (K), deaths (D) and assists (A). Each viewer's counts only the matches they played with me.",
  },
  rlList: {
    pt: "Placar, pontos ganhos ou perdidos e o total depois; meus gols (G), assistências (A) e defesas (D).",
    en: "Score, points won or lost and the total after; my goals (G), assists (A) and saves (S).",
  },
  valList: {
    pt: "Placar em rounds, o mapa e o agente, o RR ganho ou perdido; meus abates (K), mortes (D) e assistências (A), a pontuação de combate por round (ACS) e os tiros na cabeça entre os que acertaram (HS).",
    en: "Score in rounds, the map and the agent, the RR won or lost; my kills (K), deaths (D) and assists (A), the combat score per round (ACS) and the headshots among the hits (HS).",
  },
})

/** The day by day: each day's results in order, its record and net change, and where it ended. */
function daysOf(matches: ViewMatch[], end: (match: ViewMatch) => Day["end"]): Day[] {
  const days: Day[] = []
  for (const match of matches) {
    const date = dayOf(match.at)
    let day = days.at(-1)
    if (day?.date !== date) days.push((day = { date, results: [], wins: 0, losses: 0, change: 0 }))
    day.results.push(match.result)
    if (match.result === "win") day.wins++
    if (match.result === "loss") day.losses++
    day.change += match.change ?? 0
    day.end = end(match) ?? day.end
  }
  return days
}

function streaks(matches: ViewMatch[]) {
  let streak = 0
  let best = 0
  let run = 0
  for (const match of matches) {
    const win = match.result === "win"
    streak = win ? Math.max(streak, 0) + 1 : Math.min(streak, 0) - 1
    run = win ? run + 1 : 0
    best = Math.max(best, run)
  }
  return { streak, bestStreak: best }
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined)
const changeOf = (matches: ViewMatch[], result: Result) =>
  mean(matches.filter((m) => m.result === result && m.change != null).map((m) => m.change!))

// --- Rocket League ---------------------------------------------------------------------------------------------

export function rocketLeagueView(
  sessions: Session[],
  mode: Mode,
  ranks: RankInfo[],
  moments: Record<string, { date: string; at: number }>,
): RecordView {
  const summary = summarize(sessions, mode)
  const matches: ViewMatch[] = summary.matches.map((match) => ({
    id: match.id,
    at: match.at,
    result: match.result,
    score: match.score,
    change: match.points,
    value: match.mmr,
    valueText: match.mmr != null ? `${match.mmr} ${T.points}` : undefined,
    stats: match.me
      ? [
          { value: match.me.goals, letter: T.G },
          { value: match.me.assists, letter: T.A },
          { value: match.me.saves, letter: T.D },
        ]
      : [],
    extra: [match.overtime && T.overtime, match.left && T.left].filter(Boolean) as string[],
    viewers: viewersIn(match),
    moment: moments[match.id],
  }))
  const byId = new Map(matches.map((m) => [m.id, m]))
  const standing = summary.standing && tierOf(summary.standing.tier, ranks)
  const division = summary.standing && divisionOf(summary.standing)
  const gained = summary.standing?.mmr != null && summary.first ? summary.standing.mmr - summary.first.mmr : undefined
  const rankAt = new Map(summary.days.map((day) => [day.date, day.end]))
  const stats = (s: { goals: number; assists: number; saves: number }): Stat[] => [
    { value: s.goals, letter: T.G, decimal: true },
    { value: s.assists, letter: T.A, decimal: true },
    { value: s.saves, letter: T.D, decimal: true },
  ]

  return {
    unit: T.points,
    standing: standing && {
      icon: standing.icon,
      name: standing.name,
      color: standing.color,
      detail: division && `${T.division} ${division}`,
      value: summary.standing?.mmr != null ? `${summary.standing.mmr} ${T.points}` : undefined,
      since: gained !== undefined && summary.first ? `${signed(gained)} ${T.since} ${shortDate(summary.first.at)}` : undefined,
    },
    wins: summary.wins,
    losses: summary.losses,
    ...streaks(matches),
    winChange: changeOf(matches, "win"),
    lossChange: changeOf(matches, "loss"),
    tiles: summary.averages ? [{ label: T.goals, stats: stats(summary.averages.me) }] : [],
    matches,
    series: summary.series.map((point) => ({
      at: point.at,
      value: point.mmr,
      text: `${point.mmr} ${T.points}`,
      match: point.match && byId.get(point.match.id),
    })),
    days: daysOf(matches, (match) => {
      const end = rankAt.get(dayOf(match.at))
      if (!end) return undefined
      const tier = tierOf(end.tier, ranks)
      return { icon: tier.icon, name: end.mmr != null ? `${tier.name} · ${end.mmr}` : tier.name }
    }),
    players: summary.averages
      ? [
          {
            login: "muanlartins",
            me: true,
            matches: summary.matches.length,
            wins: summary.wins,
            losses: summary.losses,
            change: summary.matches.reduce((total, match) => total + (match.points ?? 0), 0),
            stats: stats(summary.averages.me),
          },
          ...summary.allies.map((ally) => ({ ...ally, change: ally.points, stats: stats(ally.averages) })),
        ]
      : [],
    playersHint: T.rlPlayers.replace("{n}", String(summary.averages?.matches ?? 0)),
    breakdowns: [],
    listHint: T.rlList,
  }
}

// --- Valorant ----------------------------------------------------------------------------------------------------

/** "KAY/O" → "kayo": how scripts/valorant_assets.py names the art. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "")
const agentArt = (name: string): Art => ({ name, image: `/valorant/agentes/${slug(name)}.webp` })
const mapArt = (name: string): Art => ({ name, image: `/valorant/mapas/${slug(name)}.webp` })

/** Valorant's agents with a portrait, for the corner of its pages. */
export const AGENT_PORTRAITS = assets.agents.filter((agent) => agent.portrait).map((agent) => ({
  name: agent.name,
  image: `/valorant/agentes/${agent.id}-retrato.webp`,
}))

/** Riot's tier and the RR in it as one climbing number: Iron 1 at 0, each tier 100 more. */
const ladder = (rank: { tier: number; rr: number }) => (Math.min(rank.tier, 27) - 3) * 100 + rank.rr

export function valorantView(sessions: ValorantSession[], ranks: Rank[]): RecordView {
  const summary = summarizeValorant(sessions)
  const named = (tier: number) => {
    const id = tierId(tier)
    const rank = id && ranks.find((r) => id.startsWith(r.id))
    const division = id?.match(/-(\d)$/)?.[1]
    return id && rank ? { icon: `/ranks/valorant/${id}.webp`, name: `${localize(rank.name)}${division ? ` ${division}` : ""}`, color: rank.color } : undefined
  }
  const matches: ViewMatch[] = summary.matches.map((match) => {
    const after = match.rank && named(match.rank.tier)
    return {
      id: match.id,
      at: match.at,
      result: match.result,
      score: match.score,
      change: match.rr,
      value: match.rank ? ladder(match.rank) : null,
      valueText: match.rank && after ? `${after.name} · ${match.rank.rr} RR` : undefined,
      map: mapArt(match.map),
      agent: agentArt(match.agent),
      stats: [
        { value: match.me.kills, letter: T.K },
        { value: match.me.deaths, letter: T.Dv },
        { value: match.me.assists, letter: T.A },
      ],
      extra: [
        match.rounds ? `${Math.round(match.me.score / match.rounds)} ACS` : "",
        `${Math.round(headshotRate(match.me))}% HS`,
      ].filter(Boolean),
      viewers: (match.mates ?? []).flatMap((mate) => (mate.login ? [mate.login] : [])),
    }
  })
  const series: RecordView["series"] = []
  for (const match of matches) {
    if (match.value == null) continue
    // Before the first: the value it started from, when its change is known.
    if (series.length === 0 && match.change != null) {
      const before = match.value - match.change
      series.push({ at: match.at, value: before, text: describe(before, named) })
    }
    series.push({ at: match.at, value: match.value, text: match.valueText ?? "", match })
  }
  const values = series.map((point) => point.value)
  const bands: Band[] = []
  if (values.length) {
    for (let tier = Math.floor(Math.min(...values) / 100) + 3; tier <= Math.floor(Math.max(...values) / 100) + 3; tier++) {
      const info = named(tier)
      if (info) bands.push({ from: (tier - 3) * 100, to: (tier - 2) * 100, ...info })
    }
  }
  const current = summary.rank && named(summary.rank.tier)
  const first = series[0]
  const last = series.at(-1)
  const kda = (s: { kills: number; deaths: number; assists: number }): Stat[] => [
    { value: s.kills, letter: T.K, decimal: true },
    { value: s.deaths, letter: T.Dv, decimal: true },
    { value: s.assists, letter: T.A, decimal: true },
  ]
  const tally = (key: "agent" | "map") => {
    const counts = new Map<string, { wins: number; losses: number }>()
    for (const match of summary.matches) {
      const entry = counts.get(match[key]) ?? { wins: 0, losses: 0 }
      if (match.result === "win") entry.wins++
      if (match.result === "loss") entry.losses++
      counts.set(match[key], entry)
    }
    return [...counts]
      .sort((a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses) || b[1].wins - a[1].wins)
      .map(([name, count]) => ({ ...(key === "agent" ? agentArt(name) : mapArt(name)), ...count }))
  }
  const mine = summary.averages

  return {
    unit: "RR",
    standing: current && {
      ...current,
      value: summary.rank ? `${summary.rank.rr} RR` : undefined,
      since: first && last && last !== first ? `${signed(last.value - first.value)} RR ${T.since} ${shortDate(first.at)}` : undefined,
    },
    wins: summary.wins,
    losses: summary.losses,
    ...streaks(matches),
    winChange: changeOf(matches, "win"),
    lossChange: changeOf(matches, "loss"),
    tiles: mine
      ? [
          { label: T.kda, stats: kda(mine) },
          {
            label: T.aim,
            stats: [
              { value: Math.round(mine.acs), letter: "ACS" },
              { value: Math.round(mine.headshots), letter: "% HS" },
            ],
          },
        ]
      : [],
    matches,
    series,
    bands,
    days: daysOf(matches, (match) => {
      const raw = summary.matches.find((m) => m.id === match.id)?.rank
      const info = raw && named(raw.tier)
      return info ? { icon: info.icon, name: `${info.name} · ${raw.rr} RR` } : undefined
    }),
    players: mine
      ? [
          {
            login: "muanlartins",
            me: true,
            matches: summary.matches.length,
            wins: summary.wins,
            losses: summary.losses,
            change: summary.matches.reduce((total, match) => total + (match.rr ?? 0), 0),
            stats: kda(mine),
          },
          ...summary.allies.map((ally) => ({ ...ally, change: ally.rr, stats: kda(ally.averages) })),
        ]
      : [],
    playersHint: T.valPlayers,
    breakdowns: [
      { title: T.agents, kind: "agent", rows: tally("agent") },
      { title: T.maps, kind: "map", rows: tally("map") },
    ],
    listHint: T.valList,
  }
}

function describe(value: number, named: (tier: number) => { name: string } | undefined) {
  const tier = Math.floor(value / 100) + 3
  return `${named(tier)?.name ?? ""} · ${value - (tier - 3) * 100} RR`
}
