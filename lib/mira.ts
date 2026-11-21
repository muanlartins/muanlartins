/**
 * How Luan's aim moves, flick by flick (scripts/mira.py, from Aimlabs' own replays of the click tasks): each play's
 * share of flicks that stop short of the target and that go past it, the corrections, clicking still moving, the
 * crosshair's shake before the click, why the misses missed, the median flick as a curve (the share of the way to
 * the target done, every 50 ms), where the first movements ended and, since 2026-11-21, the flicks one by one (each
 * one's way to the target). And the same for his Valorant matches (scripts/mira_ranked.py, from their replays, measured
 * by the same function), so the training and the matches stand side by side. Files from before a field existed still
 * load: every field added later is optional here.
 */

/** Where a hit landed on the body, as Riot's match summary counts it. */
export type Bone = "cabeca" | "corpo" | "perna"

/**
 * One flick (scripts/mira.py's `cada_flick`): the crosshair against the target's centre in degrees on screen (x to the
 * right, y down), every FLICK_STEP ms from the flick's start, the click last; some of a play's flicks keep only the
 * click. A match's also say where the shot hit and whether the body was walking.
 */
export type MiraFlick = {
  caminho: [number, number][]
  /** From the flick's start to the click, in ms. */
  ms?: number
  /** The target's radius, in degrees. */
  raio: number
  acertou: boolean
  correcoes: number
  osso?: Bone
  andando?: boolean
}

/** What a play in Aimlabs and a match in Valorant both have: scripts/mira.py's `resumo`, the same for both. */
export type MiraBase = {
  at: string
  tiros: number
  acertos: number
  flicks: number
  ajustes: number
  amplitude: number
  alvo: number
  curto: number
  passou: number
  cobre: number
  correcoes: number
  reacao: number
  movimento: number
  em_movimento: number | null
  acerto_parado: number | null
  acerto_movendo: number | null
  tremor: number | null
  erros: { curto: number; passou: number; lado: number }
  /** The distance to the target as a share of the flick (-1 at its start, 0 on the target, above 0 past it). */
  curva: number[]
  /** Where the first movements ended, as a share of the way: under 50%, 5% bins to 150% (FIRST_BINS), 150% and over. */
  primeiro: number[]
  cada_flick?: MiraFlick[]
}

export type MiraPlay = MiraBase & { task: string; name: string; pause?: number }

export type MiraDay = { date: string; plays: MiraPlay[] }

/**
 * A match of Valorant measured the same way (scripts/mira_ranked.py, from its replay), the flicks being each fight's
 * first shot and the target the head of the enemy nearest the crosshair, plus what only a match has: the fights, the
 * first shot standing or walking and its hits, the crosshair above (+) or below (−) the head before the fight, in
 * degrees (the median and the middle half), and the hits by body part.
 */
export type MiraMatch = MiraBase & {
  id: string
  map: string
  agent: string
  lutas: number
  andando: number | null
  acerto_parado_corpo: number | null
  acerto_andando: number | null
  altura: number | null
  altura_faixa: [number, number] | null
  ossos: Record<Bone, number>
}

export type MiraRankedDay = { date: string; matches: MiraMatch[] }

/** The curve's step, in ms (CURVA_MS in scripts/mira.py). */
export const CURVE_STEP = 50
/** A flick's way's step, in ms (PASSO in scripts/mira.py). */
export const FLICK_STEP = 25
/** The days summed: the latest day with plays and the ones before it, this many days back. */
const WINDOW = 14
/** The matches the page offers one by one, newest first. */
export const MATCHES_SHOWN = 6
/** The training's flicks sent to the page: with their whole way, and only the click. */
const TRAINING_PATHS = 60
const TRAINING_CLICKS = 300
/** All the window's matches together: their flicks sent to the page. */
const ALL_FLICKS = 400

export type MiraNumbers = {
  plays: number
  flicks: number
  shots: number
  hits: number
  short: number
  past: number
  covers: number
  corrections: number
  reaction: number
  movement: number
  moving: number | null
  hitStill: number | null
  hitMoving: number | null
  shake: number | null
  target: number
  misses: { curto: number; passou: number; lado: number }
  /** Flicks that hit, of all flicks: back from the misses each play counted. */
  flickHits: number
}

/** The numbers of a set of plays or matches, as the page draws them. */
export type AimView = MiraNumbers & {
  from: string
  to: string
  days: number
  /** The way to the target done (0 at the flick's start, 1 on the target), every CURVE_STEP ms. */
  curve: number[]
  /** Flicks one by one, when the files have them (an even share of them when there are many). */
  each: MiraFlick[]
}

export type TrainingView = AimView

export type MatchView = AimView & {
  /** The match's id, or "all" for the window's matches together. */
  id: string
  at: string
  map: string
  agent: string
  matches: number
  /** Hits by body part. */
  bones: Record<Bone, number>
  fights: number
  /** Of the fights' first shots: how many with the body walking, and the hits standing and walking. */
  walking: number | null
  hitStanding: number | null
  hitWalking: number | null
  /** The crosshair above (+) or below (−) the head before the fight, in degrees: the matches' medians, weighted by fights. */
  height: number | null
  heightRange: [number, number] | null
}

function weighted<P>(plays: P[], value: (p: P) => number | null | undefined, weight: (p: P) => number) {
  let sum = 0
  let total = 0
  for (const p of plays) {
    const v = value(p)
    if (v === null || v === undefined) continue
    sum += v * weight(p)
    total += weight(p)
  }
  return total ? sum / total : null
}

const byFlicks = (p: MiraBase) => p.flicks

function numbers(plays: MiraBase[]): MiraNumbers {
  const misses = { curto: 0, passou: 0, lado: 0 }
  for (const p of plays) for (const k of ["curto", "passou", "lado"] as const) misses[k] += p.erros[k]
  // Hit rates kept as rates per play: back to counts, still and moving, to sum them.
  const still = weighted(plays, (p) => p.acerto_parado, (p) => p.flicks * (1 - (p.em_movimento ?? 0)))
  const moving = weighted(plays, (p) => p.acerto_movendo, (p) => p.flicks * (p.em_movimento ?? 0))
  const flicks = plays.reduce((s, p) => s + p.flicks, 0)
  return {
    plays: plays.length,
    flicks,
    shots: plays.reduce((s, p) => s + p.tiros, 0),
    hits: plays.reduce((s, p) => s + p.acertos, 0),
    short: weighted(plays, (p) => p.curto, byFlicks) ?? 0,
    past: weighted(plays, (p) => p.passou, byFlicks) ?? 0,
    covers: weighted(plays, (p) => p.cobre, byFlicks) ?? 0,
    corrections: weighted(plays, (p) => p.correcoes, byFlicks) ?? 0,
    reaction: weighted(plays, (p) => p.reacao, byFlicks) ?? 0,
    movement: weighted(plays, (p) => p.movimento, byFlicks) ?? 0,
    moving: weighted(plays, (p) => p.em_movimento, byFlicks),
    hitStill: still,
    hitMoving: moving,
    shake: weighted(plays, (p) => (p.tremor === null ? null : p.tremor / p.alvo), byFlicks),
    target: weighted(plays, (p) => p.alvo, byFlicks) ?? 0,
    misses,
    flickHits: flicks ? 1 - (misses.curto + misses.passou + misses.lado) / flicks : 0,
  }
}

/** The plays' curves point by point, each weighted by its flicks, while half the flicks still have a point. */
function curve(plays: MiraBase[]) {
  const total = plays.reduce((s, p) => s + p.flicks, 0)
  const out: number[] = []
  for (let i = 0; ; i++) {
    const have = plays.filter((p) => p.curva.length > i)
    const w = have.reduce((s, p) => s + p.flicks, 0)
    if (!w || w * 2 < total) break
    out.push(1 + have.reduce((s, p) => s + p.curva[i] * p.flicks, 0) / w)
  }
  return out
}

/** The latest WINDOW days that have something, from the last of them back. */
function lastDays<D extends { date: string }>(days: D[]) {
  const last = days.at(-1)
  if (!last) return []
  const start = new Date(`${last.date}T12:00:00Z`)
  start.setUTCDate(start.getUTCDate() - (WINDOW - 1))
  const from = start.toISOString().slice(0, 10)
  return days.filter((d) => d.date >= from)
}

/** At most `n` of a list, evenly spread across it, in order. */
function spread<T>(list: T[], n: number) {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, k) => list[Math.round((k * (list.length - 1)) / (n - 1))])
}

/** A flick that kept its whole way (not only the click). */
export const hasPath = (f: MiraFlick) => f.caminho.length > 1

/** The window's training, summed; null before the first play. */
export function summarizeMira(days: MiraDay[]): TrainingView | null {
  const inWindow = lastDays(days.filter((d) => d.plays.length))
  const last = inWindow.at(-1)
  if (!last) return null
  const plays = inWindow.flatMap((d) => d.plays)
  const all = plays.flatMap((p) => p.cada_flick ?? [])
  return {
    ...numbers(plays),
    from: inWindow[0].date,
    to: last.date,
    days: inWindow.length,
    curve: curve(plays),
    each: [...spread(all.filter(hasPath), TRAINING_PATHS), ...spread(all.filter((f) => !hasPath(f)), TRAINING_CLICKS)],
  }
}

/** The day a match was played, in Brasília's time. */
export const matchDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })

/** Matches summed as the plays are, plus what only a match has. */
function summarizeMatches(matches: MiraMatch[], id: string, flicksCap?: number): MatchView {
  const first = matches[0]
  const bones = { cabeca: 0, corpo: 0, perna: 0 }
  for (const m of matches) for (const k of ["cabeca", "corpo", "perna"] as const) bones[k] += m.ossos[k]
  const byFights = (value: (m: MiraMatch) => number | null, weight: (m: MiraMatch) => number = (m) => m.lutas) => weighted(matches, value, weight)
  const ranges = matches.filter((m) => m.altura_faixa)
  const each = matches.flatMap((m) => m.cada_flick ?? [])
  return {
    ...numbers(matches),
    id,
    at: matches.at(-1)!.at,
    map: first.map,
    agent: first.agent,
    matches: matches.length,
    from: matchDay(first.at),
    to: matchDay(matches.at(-1)!.at),
    days: new Set(matches.map((m) => matchDay(m.at))).size,
    curve: curve(matches),
    each: flicksCap ? spread(each, flicksCap) : each,
    bones,
    fights: matches.reduce((s, m) => s + m.lutas, 0),
    walking: byFights((m) => m.andando),
    hitStanding: byFights((m) => m.acerto_parado_corpo, (m) => m.lutas * (1 - (m.andando ?? 0))),
    hitWalking: byFights((m) => m.acerto_andando, (m) => m.lutas * (m.andando ?? 0)),
    height: byFights((m) => m.altura),
    heightRange: ranges.length
      ? [weighted(ranges, (m) => m.altura_faixa![0], (m) => m.lutas) ?? 0, weighted(ranges, (m) => m.altura_faixa![1], (m) => m.lutas) ?? 0]
      : null,
  }
}

/**
 * The matches the page offers: the latest MATCHES_SHOWN one by one, newest first, and, when the window has more than
 * one, all of the window's together (first, id "all"). Empty before the first.
 */
export function summarizeRanked(days: MiraRankedDay[]): MatchView[] {
  const all = days.flatMap((d) => d.matches).sort((a, b) => a.at.localeCompare(b.at))
  if (!all.length) return []
  const each = all
    .slice(-MATCHES_SHOWN)
    .reverse()
    .map((m) => summarizeMatches([m], m.id))
  const inWindow = lastDays(days.filter((d) => d.matches.length)).flatMap((d) => d.matches)
  return inWindow.length > 1 ? [summarizeMatches(inWindow, "all", ALL_FLICKS), ...each] : each
}

/** When a curve (every CURVE_STEP ms) first reaches 90% of the way, in ms, between its points; 0 if it never does. */
export function ninetyAt(curve: number[]) {
  const i = curve.findIndex((v) => v >= 0.9)
  if (i <= 0) return 0
  return (i - 1 + (0.9 - curve[i - 1]) / (curve[i] - curve[i - 1])) * CURVE_STEP
}

/** Where a flick's crosshair was at the click and at its start, in degrees (x right, y down). */
export const clickOf = (f: MiraFlick) => f.caminho[f.caminho.length - 1]
export const startOf = (f: MiraFlick) => f.caminho[0]

/** A flick's time to the click, in ms: the file's, or its way's length. */
export const durationOf = (f: MiraFlick) => f.ms ?? (f.caminho.length - 1) * FLICK_STEP
