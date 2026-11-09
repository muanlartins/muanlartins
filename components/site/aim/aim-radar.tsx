"use client"

import { useId, useState } from "react"
import { localize } from "@/lib/site"
import { CATEGORIES, LEVELS, rankById, type Benchmark } from "@/lib/voltaic"
import { cn } from "@/lib/utils"

const T = localize({
  now: { pt: "Este benchmark", en: "This benchmark" },
  before: { pt: "O anterior", en: "The one before" },
  energy: { pt: "energia", en: "energy" },
  notPlayed: { pt: "não jogado", en: "not played" },
  hint: { pt: "Passe o mouse ou toque numa subcategoria.", en: "Hover or tap a subcategory." },
})

const C = 170
const R = 118
const HOLE = 0.14
/** The categories' ellipse: clear of the longest side labels ("Stability") and close above and below. */
const RX = R + 80
const RY = R + 40
/** Where the subcategories' names sit, past the outer ring. */
const LABEL = R + 12

/**
 * The aim's shape: the nine subcategories around a circle, Clicking, Tracking and Switching a third each, with this
 * benchmark's energy in each as a filled shape and the one before as a dashed line. The rings are the level's ranks.
 * Hovering, a tap or the keyboard reads a subcategory: its energy and its two scenarios.
 */
export function AimRadar({ benchmark, previous }: { benchmark: Benchmark; previous?: Benchmark }) {
  const [active, setActive] = useState<number>()
  const uid = useId().replace(/:/g, "")
  const level = LEVELS.find((l) => l.id === benchmark.level)!
  const rings = level.points.slice(1)
  const max = level.points[4] + 100
  const axes = benchmark.subcategories
  const n = axes.length
  const angle = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2
  const point = (i: number, energy: number) => {
    // 0 is a small circle, not the centre, so the lowest ranks' rings don't crowd it.
    const radius = (HOLE + (1 - HOLE) * (Math.min(energy, max) / max)) * R
    return [C + radius * Math.cos(angle(i)), C + radius * Math.sin(angle(i))] as const
  }
  const shape = (b: Benchmark) => b.subcategories.map((s, i) => point(i, s.energy).join(",")).join(" ")
  const comparable = previous?.level === benchmark.level ? previous : undefined
  const sub = active !== undefined ? axes[active] : undefined
  const scenarios = sub ? benchmark.scenarios.filter((s) => s.subcategory === sub.name) : []

  return (
    <div className="grid items-center gap-6 md:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
      <svg viewBox={`${C - RX - 22} ${C - RY - 22} ${2 * RX + 44} ${2 * RY + 44}`} className="mx-auto w-full max-w-[30rem] overflow-visible" role="img" aria-label={axes.map((s) => `${s.name} ${s.energy}`).join(", ")}>
        {/* The categories, a third each, on an ellipse around the labels (wider than tall: the side labels are long),
            with each name written along its arc, the bottom one turned to read left to right. */}
        {CATEGORIES.map((category, c) => {
          const from = angle(c * 3) - Math.PI / n + 0.07
          const to = angle(c * 3 + 3) - Math.PI / n - 0.07
          const at = (t: number) => `${C + RX * Math.cos(t)} ${C + RY * Math.sin(t)}`
          const below = Math.sin((from + to) / 2) > 0.3
          const id = `${uid}-${category.id}`
          return (
            <g key={category.id}>
              <path
                id={id}
                d={below ? `M ${at(to)} A ${RX} ${RY} 0 0 0 ${at(from)}` : `M ${at(from)} A ${RX} ${RY} 0 0 1 ${at(to)}`}
                fill="none"
                className="stroke-klein/35"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text dy={below ? 15 : -7} textAnchor="middle" className="fill-klein text-[11px] font-medium uppercase tracking-[0.14em]">
                <textPath href={`#${id}`} startOffset="50%">
                  {localize(category.name)}
                </textPath>
              </text>
            </g>
          )
        })}

        {rings.map((ring, index) => {
          const rank = rankById(level.ranks[index])!
          return (
            <g key={ring}>
              <polygon
                points={axes.map((_, i) => point(i, ring).join(",")).join(" ")}
                fill="none"
                stroke={rank.color}
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray={index === rings.length - 1 ? undefined : "2 3"}
              />
              {/* Each ring's rank, between the first two axes. */}
              <text x={point(0.5, ring)[0]} y={point(0.5, ring)[1]} dx={3} dy="0.32em" className="text-[9px] font-medium" fill={rank.color}>
                {rank.name}
              </text>
            </g>
          )
        })}
        {axes.map((_, i) => {
          const [x, y] = point(i, max)
          const [x0, y0] = point(i, 0)
          return <line key={i} x1={x0} y1={y0} x2={x} y2={y} className="stroke-line" strokeWidth={1} />
        })}

        {comparable && <polygon points={shape(comparable)} fill="none" className="stroke-muted" strokeWidth={1.5} strokeDasharray="4 4" />}
        <polygon points={shape(benchmark)} className="fill-klein/20 stroke-klein" strokeWidth={2} strokeLinejoin="round" />
        {axes.map((s, i) => {
          const [x, y] = point(i, s.energy)
          return <circle key={s.name} cx={x} cy={y} r={i === active ? 6 : 4} className="fill-klein stroke-paper" strokeWidth={2} />
        })}

        {axes.map((s, i) => {
          const x = C + LABEL * Math.cos(angle(i))
          const y = C + LABEL * Math.sin(angle(i))
          const cos = Math.cos(angle(i))
          return (
            <g
              key={s.name}
              tabIndex={0}
              role="button"
              aria-label={`${s.name}: ${s.energy} ${T.energy}`}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(undefined)}
              className="cursor-pointer outline-none"
            >
              {/* A wedge to hover, wider than the label. */}
              <path
                d={`M ${C} ${C} L ${C + (R + 60) * Math.cos(angle(i - 0.5))} ${C + (R + 60) * Math.sin(angle(i - 0.5))} L ${C + (R + 60) * Math.cos(angle(i + 0.5))} ${C + (R + 60) * Math.sin(angle(i + 0.5))} Z`}
                fill="transparent"
              />
              <text
                x={x}
                y={y}
                dy="0.32em"
                textAnchor={Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end"}
                className={cn("text-[12px]", i === active ? "fill-klein font-semibold" : "fill-ink")}
              >
                {s.name}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="space-y-4" onPointerLeave={() => setActive(undefined)}>
        <div className="flex flex-wrap gap-5 text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border-2 border-klein bg-klein/20" />
            {T.now}
          </span>
          {comparable && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-muted" />
              {T.before}
            </span>
          )}
        </div>
        {sub ? (
          <div className="rounded-md border border-line bg-paper/70 px-4 py-3 backdrop-blur-sm">
            <p className="text-[12px] uppercase tracking-[0.12em] text-muted">{sub.category}</p>
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-xl font-medium tracking-[-0.02em] text-klein">{sub.name}</span>
              <span className="tabular-nums text-ink">
                <span className="text-xl font-semibold">{sub.energy}</span> <span className="text-[13px] text-muted">{T.energy}</span>
              </span>
            </p>
            <ul className="mt-2 space-y-1 text-[14px]">
              {scenarios.map((s) => {
                const rank = rankById(s.rank)
                return (
                  <li key={s.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-ink">{s.name.replace(/^VT /, "")}</span>
                    <span className="tabular-nums text-muted">
                      {s.score ?? T.notPlayed}
                      {rank && (
                        <span className="ml-2 font-medium" style={{ color: rank.color }}>
                          {rank.name}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-x-4 gap-y-3 md:grid-cols-1">
            {CATEGORIES.map((category) => (
              <li key={category.id} className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-klein">{localize(category.name)}</p>
                {axes
                  .filter((s) => s.category === category.id)
                  .map((s) => (
                    <p key={s.name} className="flex justify-between gap-2 text-[13px] md:justify-start">
                      <span className="text-ink md:w-20">{s.name}</span>
                      <span className="tabular-nums text-muted">{s.energy}</span>
                    </p>
                  ))}
              </li>
            ))}
          </ul>
        )}
        {!sub && <p className="text-[12px] text-muted">{T.hint}</p>}
      </div>
    </div>
  )
}
