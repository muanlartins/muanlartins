import assets from "@/content/valorant-assets.json"
import { decimal, divisionOf, number, shortDate, signed, tierOf, type RankInfo } from "@/components/site/ranked/format"
import { dayOf, summarize, viewersIn, type Match, type Mode, type Session } from "@/lib/ranked"
import type { Rank } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import { headshotRate, summarizeValorant, tierId, type ValorantSession } from "@/lib/valorant"

/**
 * One shape for every game's ranked record, so the ranked pages share their parts (components/site/ranked/record.tsx)
 * and only what's the game's own differs: Rocket League's points and goals, assists and saves; Valorant's RR along its
 * ranks, kills, deaths and assists, its maps and agents. A third game is a third function here, not a new page.
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
  /** What it's worth after, as the chart reads it; null when nobody wrote it down. */
  value?: number | null
  /** That value in words: "812 pts", "Prata 2 · 45 RR". */
  valueText?: string
  /** Played while no rank was recorded yet (not always placements: 1v1 had 11 of these, and placements are 10). */
  unranked?: boolean
  map?: Art
  agent?: Art
  stats: Stat[]
  /** Small notes: "174 ACS", "prorrogação". */
  extra: string[]
  viewers: string[]
  moment?: { date: string; at: number }
  /** Its replay on the site, for RLR (Rocket League's, lib/ranked.ts). */
  replay?: string
}

export interface Standing {
  icon: string
  name: string
  color: string
  /** Under the name: "Divisão 2". */
  detail?: string
  /** "812 pts", "45 RR". */
  value?: string
  /** Since the first on record: "+40 pts desde 28/10". */
  since?: string
}

export interface Band {
  from: number
  to: number
  name: string
  icon: string
  color: string
}

/** A slot on the chart: one per match, after the value it started from when that's known. */
export interface Point {
  at: string
  /** Points (or RR) after it; null for a match nobody wrote them down for, which keeps its slot. */
  value: number | null
  /** That value in words. */
  text: string
  /** None on the starting point. */
  match?: ViewMatch
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
  /** The chart's title: "Pontos", "RR". */
  title: string
  /** A match without a value, on the chart: "sem pontos anotados". */
  missing: string
  standing?: Standing
  wins: number
  losses: number
  /** Positive: wins in a row at the end; negative: losses. */
  streak: number
  bestStreak: number
  winChange?: number
  lossChange?: number
  /** The numbers under the rank: "Gols por partida 1,4". */
  tiles: { label: string; value: string }[]
  /** Oldest first. */
  matches: ViewMatch[]
  /** Oldest first: where it started when known, then every match, with a value or not. */
  series: Point[]
  /** The chart's backdrop: Valorant's ranks along the value. Without them, round numbers. */
  bands?: Band[]
  /** Oldest first. */
  days: Day[]
  /** Me first, then the viewers who played with me. */
  players: Player[]
  playersHint: string
  breakdowns: Breakdown[]
  /** What a match row's numbers are. */
  listHint: string
  /** Before the first match: what will fill the record. */
  empty: string
}

const T = localize({
  points: { pt: "pts", en: "pts" },
  pointsTitle: { pt: "Pontos", en: "Points" },
  noPoints: { pt: "sem pontos anotados", en: "no points written down" },
  noRR: { pt: "sem RR", en: "no RR" },
  division: { pt: "Divisão", en: "Division" },
  since: { pt: "desde", en: "since" },
  overtime: { pt: "prorrogação", en: "overtime" },
  left: { pt: "saí antes", en: "left early" },
  G: { pt: "G", en: "G" },
  A: { pt: "A", en: "A" },
  D: { pt: "D", en: "S" },
  K: { pt: "K", en: "K" },
  Dv: { pt: "D", en: "D" },
  matches: { pt: "Partidas", en: "Matches" },
  goals: { pt: "Gols por partida", en: "Goals per match" },
  assists: { pt: "Assistências por partida", en: "Assists per match" },
  saves: { pt: "Defesas por partida", en: "Saves per match" },
  kda: { pt: "K/D/A por partida", en: "K/D/A per match" },
  acs: { pt: "ACS (pontuação de combate)", en: "ACS (combat score)" },
  headshots: { pt: "Tiros na cabeça", en: "Headshots" },
  agents: { pt: "Agentes", en: "Agents" },
  maps: { pt: "Mapas", en: "Maps" },
  rlPlayers: {
    pt: "A média por partida de gols (G), assistências (A) e defesas (D). A de cada torcedor conta só as partidas que jogou comigo.",
    en: "The average per match of goals (G), assists (A) and saves (S). Each viewer's counts only the matches they played with me.",
  },
  rlList: {
    pt: "Placar, pontos ganhos ou perdidos e o total depois; meus gols (G), assistências (A) e defesas (D).",
    en: "Score, points won or lost and the total after; my goals (G), assists (A) and saves (S).",
  },
  rlListSolo: {
    pt: "Placar, pontos ganhos ou perdidos e o total depois; meus gols (G) e defesas (D).",
    en: "Score, points won or lost and the total after; my goals (G) and saves (S).",
  },
  valPlayers: {
    pt: "A média por partida de abates (K), mortes (D) e assistências (A). A de cada torcedor conta só as partidas que jogou comigo.",
    en: "The average per match of kills (K), deaths (D) and assists (A). Each viewer's counts only the matches they played with me.",
  },
  rlEmpty: {
    pt: "Nenhuma partida de {mode} ainda: cada uma entra aqui com o placar, os pontos e os meus números.",
    en: "No {mode} matches yet: each one shows up here with the score, the points and my numbers.",
  },
  valEmpty: {
    pt: "Nenhuma partida ranqueada ainda: cada uma entra aqui com o placar, o mapa, o agente e os meus números.",
    en: "No ranked matches yet: each one shows up here with the score, the map, the agent and my numbers.",
  },
  valList: {
    pt: "Placar em rodadas, o mapa, o agente e o RR; meus abates (K), mortes (D) e assistências (A), a pontuação de combate por rodada (ACS) e os tiros na cabeça entre os que acertaram (HS).",
    en: "Score in rounds, the map, the agent and the RR; my kills (K), deaths (D) and assists (A), the combat score per round (ACS) and the headshots among the hits (HS).",
  },
})

// --- What every game shares ----------------------------------------------------------------------------------------

/** Every match keeps its slot, valued or not, so 13 matches read as 13. */
function seriesOf(matches: ViewMatch[], start?: { value: number; text: string }): Point[] {
  return [
    ...(start && matches[0] ? [{ at: matches[0].at, value: start.value, text: start.text }] : []),
    ...matches.map((match) => ({ at: match.at, value: match.value ?? null, text: match.valueText ?? "", match })),
  ]
}

/** The day by day: each day's results in order, its record and net change, and where it ended. */
function daysOf(matches: ViewMatch[], end: (date: string) => Day["end"]): Day[] {
  const days: Day[] = []
  for (const match of matches) {
    const date = dayOf(match.at)
    let day = days.at(-1)
    if (day?.date !== date) days.push((day = { date, results: [], wins: 0, losses: 0, change: 0 }))
    day.results.push(match.result)
    if (match.result === "win") day.wins++
    if (match.result === "loss") day.losses++
    day.change += match.change ?? 0
  }
  for (const day of days) day.end = end(day.date)
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
  // 1v1 has no teammates, so no assists.
  const solo = mode === "1v1"
  const points = (value: number) => `${number(value)} ${T.points}`
  const statsOf = (s: { goals: number; assists: number; saves: number }, average = false): Stat[] => [
    { value: s.goals, letter: T.G, decimal: average },
    ...(solo ? [] : [{ value: s.assists, letter: T.A, decimal: average }]),
    { value: s.saves, letter: T.D, decimal: average },
  ]
  // A match played while unranked: its own rank going in says so, else the last rank on record before it (or the
  // first after, for matches before any: nobody goes back to unranked).
  const unranked = (match: Match) => {
    if (match.rank) return match.rank.tier === "unranked"
    const known = summary.standings.filter((s) => s.at < match.at).at(-1) ?? summary.standings.find((s) => s.at >= match.at)
    return known?.tier === "unranked"
  }
  const matches: ViewMatch[] = summary.matches.map((match) => ({
    id: match.id,
    at: match.at,
    result: match.result,
    score: match.score,
    change: match.points,
    value: match.mmr,
    valueText: match.mmr != null ? points(match.mmr) : undefined,
    unranked: unranked(match),
    stats: match.me ? statsOf(match.me) : [],
    extra: [match.overtime && T.overtime, match.left && T.left].filter(Boolean) as string[],
    viewers: viewersIn(match),
    moment: moments[match.id],
    replay: match.replay,
  }))
  const standing = summary.standing && tierOf(summary.standing.tier, ranks)
  const division = summary.standing?.division && summary.standing.tier !== "unranked" ? summary.standing.division : undefined
  const gained = summary.standing?.mmr != null && summary.first ? summary.standing.mmr - summary.first.mmr : undefined
  const first = summary.matches[0]
  const averages = summary.averages?.me

  return {
    unit: T.points,
    title: T.pointsTitle,
    missing: T.noPoints,
    standing: standing && {
      icon: standing.icon,
      name: standing.name,
      color: standing.color,
      detail: division ? `${T.division} ${division}` : undefined,
      value: summary.standing?.mmr != null ? points(summary.standing.mmr) : undefined,
      since: gained !== undefined && summary.first ? `${signed(gained)} ${T.points} ${T.since} ${shortDate(summary.first.at)}` : undefined,
    },
    wins: summary.wins,
    losses: summary.losses,
    ...streaks(matches),
    winChange: changeOf(matches, "win"),
    lossChange: changeOf(matches, "loss"),
    tiles: [
      { label: T.matches, value: number(matches.length) },
      ...(averages
        ? [
            { label: T.goals, value: decimal(averages.goals) },
            ...(solo ? [] : [{ label: T.assists, value: decimal(averages.assists) }]),
            { label: T.saves, value: decimal(averages.saves) },
          ]
        : []),
    ],
    matches,
    series: seriesOf(matches, first?.rank?.mmr != null ? { value: first.rank.mmr, text: points(first.rank.mmr) } : undefined),
    days: daysOf(matches, (date) => {
      const end = summary.standings.filter((s) => dayOf(s.at) <= date).at(-1)
      if (!end) return undefined
      const tier = tierOf(end.tier, ranks)
      const compact = [tier.name, divisionOf(end), end.mmr != null ? points(end.mmr) : undefined].filter(Boolean)
      return { icon: tier.icon, name: compact.join(" · ") }
    }),
    players: averages
      ? [
          {
            login: "muanlartins",
            me: true,
            matches: summary.matches.length,
            wins: summary.wins,
            losses: summary.losses,
            change: summary.matches.reduce((total, match) => total + (match.points ?? 0), 0),
            stats: statsOf(averages, true),
          },
          ...summary.allies.map((ally) => ({ ...ally, change: ally.points, stats: statsOf(ally.averages, true) })),
        ]
      : [],
    playersHint: T.rlPlayers,
    breakdowns: [],
    listHint: solo ? T.rlListSolo : T.rlList,
    empty: T.rlEmpty.replace("{mode}", mode),
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
  const describe = (value: number) => {
    const tier = Math.floor(value / 100) + 3
    return `${named(tier)?.name ?? ""} · ${value - (tier - 3) * 100} RR`
  }
  const matches: ViewMatch[] = summary.matches.map((match) => {
    const after = match.rank && named(match.rank.tier)
    return {
      id: match.id,
      at: match.at,
      result: match.result,
      score: match.score,
      change: match.rr,
      value: match.rank?.tier ? ladder(match.rank) : null,
      valueText: match.rank && after ? `${after.name} · ${match.rank.rr} RR` : undefined,
      // Riot's tiers under 3 are unranked.
      unranked: !!match.rank && match.rank.tier < 3,
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
  const head = matches[0]
  const start = head?.value != null && head.change != null ? head.value - head.change : undefined
  const series = seriesOf(matches, start !== undefined ? { value: start, text: describe(start) } : undefined)
  const values = series.flatMap((point) => (point.value != null ? [point.value] : []))
  const bands: Band[] = []
  if (values.length) {
    for (let tier = Math.floor(Math.min(...values) / 100) + 3; tier <= Math.floor(Math.max(...values) / 100) + 3; tier++) {
      const info = named(tier)
      if (info) bands.push({ from: (tier - 3) * 100, to: (tier - 2) * 100, ...info })
    }
  }
  const current = summary.rank && named(summary.rank.tier)
  const valued = series.filter((point) => point.value != null)
  const first = valued[0]
  const last = valued.at(-1)
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
    title: "RR",
    missing: T.noRR,
    standing: current && {
      ...current,
      value: summary.rank ? `${summary.rank.rr} RR` : undefined,
      since: first && last && last !== first ? `${signed(last.value! - first.value!)} RR ${T.since} ${shortDate(first.at)}` : undefined,
    },
    wins: summary.wins,
    losses: summary.losses,
    ...streaks(matches),
    winChange: changeOf(matches, "win"),
    lossChange: changeOf(matches, "loss"),
    tiles: [
      { label: T.matches, value: number(matches.length) },
      ...(mine
        ? [
            { label: T.kda, value: [mine.kills, mine.deaths, mine.assists].map((n) => decimal(n)).join(" / ") },
            { label: T.acs, value: number(Math.round(mine.acs)) },
            { label: T.headshots, value: `${Math.round(mine.headshots)}%` },
          ]
        : []),
    ],
    matches,
    series,
    bands,
    days: daysOf(matches, (date) => {
      const raw = summary.matches.findLast((m) => dayOf(m.at) <= date && m.rank?.tier)?.rank
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
    empty: T.valEmpty,
  }
}
