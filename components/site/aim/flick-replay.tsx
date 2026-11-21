"use client"

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { decimal, fill } from "@/components/site/aim/format"
import type { Side } from "@/components/site/aim/marks"
import { Button, Choice, Lattice } from "@/components/site/ui"
import { CURVE_STEP, durationOf, FLICK_STEP, type MiraFlick } from "@/lib/mira"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  label: { pt: "Replay dos flicks", en: "The flicks' replay" },
  one: { pt: "Um por vez", en: "One at a time" },
  all: { pt: "Todos juntos", en: "All together" },
  slow: { pt: "¼ da velocidade", en: "¼ speed" },
  real: { pt: "Velocidade real", en: "Real speed" },
  play: { pt: "Assistir", en: "Play" },
  pause: { pt: "Pausar", en: "Pause" },
  previous: { pt: "Flick anterior", en: "Previous flick" },
  next: { pt: "Próximo flick", en: "Next flick" },
  time: { pt: "Tempo do flick", en: "The flick's time" },
  counter: { pt: "Flick {i} de {n}", en: "Flick {i} of {n}" },
  fromHead: { pt: "começou a {d} da cabeça", en: "started {d} from the head" },
  fromTarget: { pt: "começou a {d} do alvo", en: "started {d} from the target" },
  hitHead: { pt: "acertou na cabeça", en: "hit the head" },
  hitBody: { pt: "acertou no corpo", en: "hit the body" },
  hitLegs: { pt: "acertou nas pernas", en: "hit the legs" },
  hit: { pt: "acertou", en: "hit" },
  miss: { pt: "errou", en: "missed" },
  toClick: { pt: "{ms} ms até o clique", en: "{ms} ms to the click" },
  corrections: { pt: "{n} correções", en: "{n} corrections" },
  correction: { pt: "1 correção", en: "1 correction" },
  noCorrection: { pt: "sem correção", en: "no correction" },
  walking: { pt: "andando", en: "walking" },
  allLine: {
    pt: "Os {n} flicks de uma vez, cada um do seu início (à esquerda) até o alvo, no mesmo tamanho: o que fica antes da linha parou curto, o que passa dela passou do alvo. A linha grossa é o flick típico.",
    en: "All {n} flicks at once, each from its start (left) to the target, at one size: what stops before the line stopped short, what crosses it went past. The thick line is the typical flick.",
  },
  start: { pt: "início", en: "start" },
  target: { pt: "alvo", en: "target" },
  head: { pt: "cabeça", en: "head" },
})

const W = 640
/** The screen's height: 16:9, or taller on a phone so the flicks aren't tiny. */
const WIDE = 360
const TALL = 440
const CX = W / 2
/** "All together": where the target sits, and the px a flick's whole way takes. */
const TX = 450
const UNIT = 330
/** The scale bar's steps, in degrees. */
const STEPS = [0.25, 0.5, 1, 2, 5, 10, 20, 50]

type P = [number, number]
const lerp = (a: P, b: P, g: number): P => [a[0] + (b[0] - a[0]) * g, a[1] + (b[1] - a[1]) * g]
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

/** Where the crosshair was, against the target, t ms into the flick. */
function pointAt(f: MiraFlick, t: number): P {
  const c = f.caminho
  const n = c.length
  const d = durationOf(f)
  if (n === 1 || t >= d) return c[n - 1]
  if (t <= 0) return c[0]
  const i = Math.floor(t / FLICK_STEP)
  if (i >= n - 2) {
    const from = (n - 2) * FLICK_STEP
    return lerp(c[n - 2], c[n - 1], d > from ? clamp((t - from) / (d - from)) : 1)
  }
  return lerp(c[i], c[i + 1], t / FLICK_STEP - i)
}

/** The way up to t ms (the whole way past the click). */
function wayUntil(f: MiraFlick, t: number): P[] {
  const d = durationOf(f)
  if (t >= d) return f.caminho
  const out = f.caminho.slice(0, -1).filter((_, i) => i * FLICK_STEP < t)
  return [...out, pointAt(f, t)]
}

/** A flick turned so it starts at (−1, 0) and the target is at (0, 0): along the way, and across it. */
function turn(f: MiraFlick) {
  const [sx, sy] = f.caminho[0]
  const a = Math.hypot(sx, sy) || 1
  const ex = sx / a
  const ey = sy / a
  return (p: P): P => [-(p[0] * ex + p[1] * ey) / a, (p[0] * ey - p[1] * ex) / a]
}

/**
 * The flicks of a match (or of the training) replayed as Luan saw them: the target's head fixed in the middle of a
 * dark "screen", the crosshair's way to it drawn as it went, in degrees on screen to scale, the click a diamond (filled
 * when it hit). One at a time, stepping through them, or all together, each turned to start at the left and scaled
 * to one size, so the stops short and the overshoots line up. Plays at a quarter of the speed by default; nothing moves
 * until asked, and under reduced motion a play shows the end at once.
 */
export function FlickReplay({ flicks, side, curve }: { flicks: MiraFlick[]; side: Side; /** The typical flick (lib/mira.ts's `curve`), drawn over all of them. */ curve?: number[] }) {
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<"one" | "all">("one")
  const [index, setIndex] = useState(() => Math.max(0, flicks.findIndex((f) => f.acertou)))
  const [speed, setSpeed] = useState(0.25)
  const [playing, setPlaying] = useState(false)
  const [t, setShown] = useState(Infinity)
  const tRef = useRef(Infinity)
  const setT = (value: number) => {
    tRef.current = value
    setShown(value)
  }

  const narrow = useSyncExternalStore(
    (onChange) => {
      const query = matchMedia("(max-width: 639px)")
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    },
    () => matchMedia("(max-width: 639px)").matches,
    () => false,
  )
  const H = narrow ? TALL : WIDE
  const flick = flicks[Math.min(index, flicks.length - 1)]
  const end = mode === "one" ? durationOf(flick) : Math.max(...flicks.map(durationOf))
  const shown = Math.min(t, end)

  // Each play runs from the start to the click; the frames move only while playing, and stop off screen.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const next = Math.min(end, (tRef.current >= end ? 0 : tRef.current) + (now - last) * speed)
      last = now
      tRef.current = next
      setShown(next)
      if (next >= end) setPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const observer = new IntersectionObserver(([entry]) => !entry.isIntersecting && setPlaying(false))
    if (box.current) observer.observe(box.current)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [playing, speed, end])

  function play() {
    if (playing) return setPlaying(false)
    if (reduce) return setT(end)
    if (tRef.current >= end) setT(0)
    setPlaying(true)
  }

  function go(step: number) {
    setPlaying(false)
    setT(Infinity)
    setIndex((i) => (i + step + flicks.length) % flicks.length)
  }

  function pickMode(next: "one" | "all") {
    setPlaying(false)
    setT(Infinity)
    setMode(next)
  }

  return (
    <div className="space-y-3">
      <div ref={box} className="cut relative overflow-hidden bg-navy">
        <Lattice className="opacity-60" />
        {mode === "one" ? <One flick={flick} t={shown} side={side} H={H} /> : <All flicks={flicks} t={shown} side={side} curve={curve} H={H} />}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <Button size="sm" onClick={play} icon={playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />} className="min-w-[7.5rem]">
          {playing ? T.pause : T.play}
        </Button>
        <input
          type="range"
          min={0}
          max={Math.round(end)}
          step={5}
          value={Math.round(shown)}
          onChange={(event) => {
            setPlaying(false)
            setT(Number(event.target.value))
          }}
          aria-label={T.time}
          aria-valuetext={`${Math.round(shown)} ms`}
          className="h-6 min-w-[8rem] flex-1 accent-klein"
        />
        <span className="w-16 text-right text-[13px] tabular-nums text-muted">{Math.round(shown)} ms</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex gap-2" role="group" aria-label={T.label}>
          <Choice size="sm" on={mode === "one"} onClick={() => pickMode("one")}>
            {T.one}
          </Choice>
          <Choice size="sm" on={mode === "all"} onClick={() => pickMode("all")}>
            {T.all}
          </Choice>
        </div>
        <div className="flex gap-2">
          <Choice size="sm" on={speed === 0.25} onClick={() => setSpeed(0.25)}>
            {T.slow}
          </Choice>
          <Choice size="sm" on={speed === 1} onClick={() => setSpeed(1)}>
            {T.real}
          </Choice>
        </div>
      </div>

      {mode === "one" ? (
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => go(-1)} aria-label={T.previous} className="h-10 w-10 shrink-0 px-0">
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Button>
          <p aria-live="polite" className="min-w-0 flex-1 text-[15px] leading-[1.5] text-ink">
            <span className="font-medium">{fill(T.counter, { i: index + 1, n: flicks.length })}</span>
            <span className="text-muted"> · {describe(flick, side)}</span>
          </p>
          <Button variant="secondary" size="sm" onClick={() => go(1)} aria-label={T.next} className="h-10 w-10 shrink-0 px-0">
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="max-w-[38rem] text-[13px] leading-[1.5] text-muted">{fill(T.allLine, { n: flicks.length })}</p>
      )}
    </div>
  )
}

/** A flick in words: where it started, how it ended, how long, how many corrections. */
function describe(f: MiraFlick, side: Side) {
  const [sx, sy] = f.caminho[0]
  const from = fill(side === "match" ? T.fromHead : T.fromTarget, { d: `${decimal(Math.hypot(sx, sy))}°` })
  const result = !f.acertou ? T.miss : f.osso === "cabeca" ? T.hitHead : f.osso === "perna" ? T.hitLegs : f.osso === "corpo" ? T.hitBody : T.hit
  const corrections = f.correcoes === 0 ? T.noCorrection : f.correcoes === 1 ? T.correction : fill(T.corrections, { n: f.correcoes })
  return [from, result + (f.andando ? ` ${T.walking}` : ""), fill(T.toClick, { ms: Math.round(durationOf(f)) }), corrections].join(" · ")
}

/** Valorant's default crosshair at (x, y), in Branco with a navy edge. */
function Crosshair({ x, y }: { x: number; y: number }) {
  const d = `M${x} ${y - 9}V${y - 3}M${x} ${y + 3}V${y + 9}M${x - 9} ${y}H${x - 3}M${x + 3} ${y}H${x + 9}`
  return (
    <g>
      <path d={d} className="stroke-navy" strokeWidth={4} strokeLinecap="square" />
      <path d={d} className="stroke-paper" strokeWidth={2} strokeLinecap="square" />
      <circle cx={x} cy={y} r={1.6} className="fill-paper" />
    </g>
  )
}

/** The click: a diamond, filled when the shot hit. */
function Click({ x, y, hit }: { x: number; y: number; hit: boolean }) {
  const r = 8
  return <path d={`M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`} className={hit ? "fill-paper stroke-navy" : "fill-navy/40 stroke-paper"} strokeWidth={2} />
}

/** The target: a head and shoulders for a match (in head radii), a sphere for Aimlabs. */
function Target({ r, side, CY }: { r: number; side: Side; CY: number }) {
  if (side === "training") return <circle cx={CX} cy={CY} r={r} className="fill-klein-claro/35 stroke-klein-claro" strokeWidth={1.5} />
  const at = (pts: P[]) => pts.map(([x, y]) => `${CX + x * r},${CY + y * r}`).join(" ")
  return (
    <g>
      <defs>
        <linearGradient id="replay-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="[stop-color:var(--color-paper)] [stop-opacity:0.16]" />
          <stop offset="1" className="[stop-color:var(--color-paper)] [stop-opacity:0]" />
        </linearGradient>
      </defs>
      <polygon points={at([[-1.25, 1.55], [1.25, 1.55], [3.1, 2.5], [3.4, 9], [-3.4, 9], [-3.1, 2.5]])} fill="url(#replay-body)" />
      <polygon points={at([[-0.42, 0.8], [0.42, 0.8], [0.42, 1.7], [-0.42, 1.7]])} className="fill-paper/15" />
      <circle cx={CX} cy={CY} r={r} className="fill-paper/25 stroke-paper/80" strokeWidth={1.5} />
    </g>
  )
}

function One({ flick, t, side, H }: { flick: MiraFlick; t: number; side: Side; H: number }) {
  const CY = H / 2
  // The head in the middle; the scale fits the whole way, never closer than a few target sizes.
  const xs = flick.caminho.map((p) => Math.abs(p[0]))
  const ys = flick.caminho.map((p) => Math.abs(p[1]))
  const half = Math.max(1.5, 3.5 * flick.raio)
  const s = Math.min((CX - 28) / Math.max(half, 1.1 * Math.max(...xs)), (CY - 28) / Math.max(half * (H / W), 1.1 * Math.max(...ys)))
  const px = (p: P): P => [CX + p[0] * s, CY + p[1] * s]
  const way = wayUntil(flick, t).map(px)
  const now = px(pointAt(flick, t))
  const start = px(flick.caminho[0])
  const done = t >= durationOf(flick)
  const step = STEPS.find((d) => d * s >= 48) ?? STEPS.at(-1)!
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="relative block h-auto w-full" role="img" aria-label={`${T.label}: ${describe(flick, side)}`}>
        <Target r={flick.raio * s} side={side} CY={CY} />
        <circle cx={start[0]} cy={start[1]} r={5} className="fill-none stroke-klein-claro" strokeWidth={1.5} />
        <polyline points={way.map((p) => p.join(",")).join(" ")} fill="none" className="stroke-klein-claro" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {done ? <Click x={now[0]} y={now[1]} hit={flick.acertou} /> : <Crosshair x={now[0]} y={now[1]} />}
        <path d={`M24 ${H - 30}v6h${step * s}v-6`} fill="none" className="stroke-paper/70" strokeWidth={1.5} />
      </svg>
      <span className="pointer-events-none absolute left-6 top-[calc(100%-26px)] text-[12px] font-medium tabular-nums text-paper/80">{`${decimal(step, step < 0.5 ? 2 : step < 1 ? 1 : 0)}°`}</span>
    </div>
  )
}

function All({ flicks, t, side, curve, H }: { flicks: MiraFlick[]; t: number; side: Side; curve?: number[]; H: number }) {
  const CY = H / 2
  const turned = useMemo(() => flicks.map((f) => ({ f, turn: turn(f) })), [flicks])
  const px = (p: P): P => [TX + p[0] * UNIT, CY + p[1] * UNIT]
  // The typical flick along the way: where the middle flick was at t (its last point once it ends).
  const typical = curve && curve.length > 1 ? (() => {
    const k = Math.min(curve.length - 1, t / CURVE_STEP)
    const i = Math.min(curve.length - 2, Math.floor(k))
    return curve[i] + (curve[i + 1] - curve[i]) * (k - i)
  })() : undefined
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="relative block h-auto w-full" role="img" aria-label={fill(T.allLine, { n: flicks.length })}>
        <line x1={TX} x2={TX} y1={20} y2={H - 20} className="stroke-paper/60" strokeWidth={1.5} strokeDasharray="4 4" />
        <line x1={TX - UNIT} x2={TX - UNIT} y1={CY - 14} y2={CY + 14} className="stroke-paper/40" strokeWidth={1.5} />
        {turned.map(({ f, turn }, i) => (
          <polyline
            key={i}
            points={wayUntil(f, t)
              .map((p) => px(turn(p)).join(","))
              .join(" ")}
            fill="none"
            className={cn(f.acertou ? "stroke-klein-claro/45" : "stroke-klein-claro/20")}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        ))}
        {turned.map(({ f, turn }, i) => {
          const [x, y] = px(turn(pointAt(f, t)))
          const done = t >= durationOf(f)
          if (x < -10 || x > W + 10 || y < -10 || y > H + 10) return null
          return done ? (
            <path key={i} d={`M${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z`} className={f.acertou ? "fill-paper" : "fill-none stroke-paper/70"} strokeWidth={1.25} />
          ) : (
            <circle key={i} cx={x} cy={y} r={2.5} className="fill-paper" />
          )
        })}
        {typical !== undefined && (
          <g>
            <line x1={TX - UNIT} x2={TX + (typical - 1) * UNIT} y1={CY} y2={CY} className="stroke-paper" strokeWidth={4} strokeLinecap="square" />
            <circle cx={TX + (typical - 1) * UNIT} cy={CY} r={6} className="fill-paper stroke-navy" strokeWidth={2} />
          </g>
        )}
      </svg>
      <span className="pointer-events-none absolute top-3 text-[12px] font-medium text-paper/80" style={{ left: `${((TX - UNIT) / W) * 100}%`, transform: "translateX(-50%)" }}>
        {T.start}
      </span>
      <span className="pointer-events-none absolute top-3 text-[12px] font-medium text-paper/80" style={{ left: `${(TX / W) * 100}%`, transform: "translateX(-50%)" }}>
        {side === "match" ? T.head : T.target}
      </span>
    </div>
  )
}
