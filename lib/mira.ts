/**
 * How Luan's aim moves, flick by flick (scripts/mira.py, from Aimlabs' own replays of the click tasks): each play's
 * share of flicks that stop short of the target and that go past it, the corrections, clicking still moving, the
 * crosshair's shake before the click, why the misses missed, the median flick as a curve (the share of the way to
 * the target done, every 50 ms) and where the first movements ended. This sums the latest days' plays, each weighted
 * by its flicks.
 */

export type MiraPlay = {
  at: string
  task: string
  name: string
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
  pause?: number
}

export type MiraDay = { date: string; plays: MiraPlay[] }

/** The curve's step, in ms (CURVA_MS in scripts/mira.py). */
export const CURVE_STEP = 50
/** The edges of `primeiro`'s bins (FAIXAS in scripts/mira.py). */
export const FIRST_BINS = Array.from({ length: 21 }, (_, k) => 0.5 + 0.05 * k)
/** The days summed: the latest day with plays and the ones before it, this many days back. */
const WINDOW = 14

export type MiraNumbers = {
  plays: number
  flicks: number
  shots: number
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
}

export type MiraSummary = MiraNumbers & {
  from: string
  to: string
  days: number
  /** The way to the target done (0 at the flick's start, 1 on the target), every CURVE_STEP ms. */
  curve: number[]
  /** How many first movements ended in each of FIRST_BINS' bins (the first under 50%, the last 150% and over). */
  firstMove: number[]
  tasks: (MiraNumbers & { name: string; accuracy: number })[]
}

function weighted(plays: MiraPlay[], value: (p: MiraPlay) => number | null, weight: (p: MiraPlay) => number = (p) => p.flicks) {
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

function numbers(plays: MiraPlay[]): MiraNumbers {
  const misses = { curto: 0, passou: 0, lado: 0 }
  for (const p of plays) for (const k of ["curto", "passou", "lado"] as const) misses[k] += p.erros[k]
  // Hit rates kept as rates per play: back to counts, still and moving, to sum them.
  const still = weighted(plays, (p) => p.acerto_parado, (p) => p.flicks * (1 - (p.em_movimento ?? 0)))
  const moving = weighted(plays, (p) => p.acerto_movendo, (p) => p.flicks * (p.em_movimento ?? 0))
  return {
    plays: plays.length,
    flicks: plays.reduce((s, p) => s + p.flicks, 0),
    shots: plays.reduce((s, p) => s + p.tiros, 0),
    short: weighted(plays, (p) => p.curto) ?? 0,
    past: weighted(plays, (p) => p.passou) ?? 0,
    covers: weighted(plays, (p) => p.cobre) ?? 0,
    corrections: weighted(plays, (p) => p.correcoes) ?? 0,
    reaction: weighted(plays, (p) => p.reacao) ?? 0,
    movement: weighted(plays, (p) => p.movimento) ?? 0,
    moving: weighted(plays, (p) => p.em_movimento),
    hitStill: still,
    hitMoving: moving,
    shake: weighted(plays, (p) => (p.tremor === null ? null : p.tremor / p.alvo)),
    target: weighted(plays, (p) => p.alvo) ?? 0,
    misses,
  }
}

/** The plays' curves point by point, each weighted by its flicks, while half the flicks still have a point. */
function curve(plays: MiraPlay[]) {
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

/** The latest WINDOW days of plays, summed; null before the first. */
export function summarizeMira(days: MiraDay[]): MiraSummary | null {
  const withPlays = days.filter((d) => d.plays.length)
  const last = withPlays.at(-1)
  if (!last) return null
  const start = new Date(`${last.date}T12:00:00Z`)
  start.setUTCDate(start.getUTCDate() - (WINDOW - 1))
  const from = start.toISOString().slice(0, 10)
  const inWindow = withPlays.filter((d) => d.date >= from)
  const plays = inWindow.flatMap((d) => d.plays)
  const byTask = new Map<string, MiraPlay[]>()
  for (const p of plays) byTask.set(p.name, [...(byTask.get(p.name) ?? []), p])
  return {
    ...numbers(plays),
    from: inWindow[0].date,
    to: last.date,
    days: inWindow.length,
    curve: curve(plays),
    firstMove: Array.from({ length: FIRST_BINS.length + 1 }, (_, i) => plays.reduce((sum, p) => sum + (p.primeiro?.[i] ?? 0), 0)),
    tasks: [...byTask.entries()]
      .map(([name, ps]) => ({ name, accuracy: ps.reduce((s, p) => s + p.acertos, 0) / ps.reduce((s, p) => s + p.tiros, 0), ...numbers(ps) }))
      .sort((a, b) => b.flicks - a.flicks),
  }
}

/** When a curve (every CURVE_STEP ms) first reaches 90% of the way, in ms, between its points; 0 if it never does. */
export function ninetyAt(curve: number[]) {
  const i = curve.findIndex((v) => v >= 0.9)
  if (i <= 0) return 0
  return (i - 1 + (0.9 - curve[i - 1]) / (curve[i] - curve[i - 1])) * CURVE_STEP
}
