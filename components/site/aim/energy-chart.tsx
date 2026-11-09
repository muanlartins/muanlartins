"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { longDate, shortDate, signed } from "@/components/site/ranked/format"
import { localize } from "@/lib/site"
import { LEVELS, RANKS, rankById, type Benchmark } from "@/lib/voltaic"
import { cn } from "@/lib/utils"

const T = localize({
  energy: { pt: "energia", en: "energy" },
  label: { pt: "Energia a cada benchmark", en: "Energy at each benchmark" },
  one: {
    pt: "O primeiro benchmark está marcado. A linha começa no próximo domingo.",
    en: "The first benchmark is in. The line starts next Sunday.",
  },
  unranked: { pt: "Sem rank", en: "Unranked" },
})

const HEIGHT = 260
const PAD = { left: 96, right: 60, top: 14, bottom: 30 }

/**
 * The overall energy at each Sunday's benchmark, over Voltaic's ranks as stripes (100 energy each), so a rank gained
 * reads as the line crossing into the next colour. Hovering, a tap or the arrow keys read a benchmark.
 */
export function EnergyChart({ benchmarks }: { benchmarks: Benchmark[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number>()

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  const n = benchmarks.length
  const energies = benchmarks.map((b) => b.energy)
  // The stripes: at least the current level's ranks, and whatever the line reached.
  const level = LEVELS.find((l) => l.id === benchmarks.at(-1)!.level)!
  const lo = Math.min(level.points[0], Math.floor(Math.min(...energies) / 100) * 100)
  const hi = Math.max(level.points[4] + 100, Math.ceil((Math.max(...energies) + 1) / 100) * 100)
  const bands = []
  for (let from = lo; from < hi; from += 100) bands.push({ from, to: from + 100, rank: from >= 100 ? RANKS[Math.min(from / 100 - 1, RANKS.length - 1)] : undefined })

  const narrow = width < 480
  const left = narrow ? 40 : PAD.left
  const plot = width - left - PAD.right
  const gap = n > 1 ? plot / (n - 1) : 0
  const x = (i: number) => left + (n > 1 ? i * gap : plot / 2)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (HEIGHT - PAD.top - PAD.bottom)
  const bottom = HEIGHT - PAD.bottom
  const line = benchmarks.map((b, i) => `${x(i)},${y(b.energy)}`).join(" ")

  function pick(event: PointerEvent) {
    const offset = event.clientX - box.current!.getBoundingClientRect().left
    setActive(Math.min(n - 1, Math.max(0, Math.round(gap ? (offset - left) / gap : 0))))
  }

  function step(event: KeyboardEvent) {
    const move = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n }[event.key]
    if (move === undefined) return
    event.preventDefault()
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n) + move)))
  }

  const point = active !== undefined ? benchmarks[active] : undefined
  const last = benchmarks.at(-1)!

  return (
    <div className="space-y-3">
      <div
        ref={box}
        tabIndex={0}
        role="img"
        aria-label={`${T.label}: ${energies.join(", ")}`}
        onKeyDown={step}
        onBlur={() => setActive(undefined)}
        className="relative w-full touch-pan-y rounded-md border border-line bg-paper/60 outline-none focus-visible:ring-2 focus-visible:ring-klein"
        style={{ height: HEIGHT }}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="block overflow-visible">
            {bands.map((band, index) => {
              const top = y(band.to)
              const height = y(band.from) - top
              return (
                <g key={band.from}>
                  <rect x={left} y={top} width={plot} height={height} fill={band.rank?.color ?? "transparent"} opacity={index % 2 ? 0.08 : 0.14} />
                  <line x1={left} x2={width - PAD.right} y1={top} y2={top} className="stroke-line" strokeWidth={1} />
                  {band.rank && (
                    <text x={left - 8} y={top + height / 2} dy="0.32em" textAnchor="end" className="text-[12px] font-medium" fill={band.rank.color}>
                      {narrow ? band.rank.name.slice(0, 2) : band.rank.name}
                    </text>
                  )}
                </g>
              )
            })}

            {benchmarks.map((b, i) => (
              <text key={b.date} x={x(i)} y={HEIGHT - 10} textAnchor="middle" className="fill-muted text-[11px] tabular-nums">
                {n <= 12 || i % Math.ceil(n / 12) === 0 ? shortDate(b.date) : ""}
              </text>
            ))}

            {n > 1 && <polyline points={line} fill="none" className="stroke-klein" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {active !== undefined && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={bottom} className="stroke-klein/40" strokeWidth={1} />}
            {benchmarks.map((b, i) => (
              <circle
                key={b.date}
                cx={x(i)}
                cy={y(b.energy)}
                r={i === active ? 7 : 5}
                fill={rankById(b.rank)?.color ?? "var(--color-muted)"}
                className="stroke-paper"
                strokeWidth={2}
              />
            ))}

            <g transform={`translate(${x(n - 1) + 10}, ${y(last.energy)})`}>
              <rect x={0} y={-11} width={42} height={22} rx={5} className="fill-klein" />
              <text x={21} y={0} dy="0.34em" textAnchor="middle" className="fill-paper text-[12px] font-semibold tabular-nums">
                {last.energy}
              </text>
            </g>

            <rect x={0} y={0} width={width} height={HEIGHT} fill="transparent" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setActive(undefined)} />
          </svg>
        )}

        {point && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-max max-w-64 rounded-md border border-line bg-paper px-3 py-2 text-[12px] leading-[1.45] text-muted shadow-[0_8px_24px_rgb(0_20_71/0.16)]"
            style={{ left: Math.min(Math.max(x(active!) - 90, 4), width - 190) }}
          >
            <span className="block text-[14px] font-semibold tabular-nums text-ink">
              {point.energy} {T.energy}
              {active! > 0 && (
                <span className={cn("ml-2", point.energy >= benchmarks[active! - 1].energy ? "text-win" : "text-loss")}>
                  {signed(point.energy - benchmarks[active! - 1].energy)}
                </span>
              )}
            </span>
            <span className="block font-medium" style={{ color: rankById(point.rank)?.color }}>
              {rankById(point.rank)?.name ?? T.unranked}
              {point.complete && " Complete"}
            </span>
            <span className="block">{longDate(point.date)}</span>
          </div>
        )}
      </div>
      {n === 1 && <p className="text-[13px] text-muted">{T.one}</p>}
    </div>
  )
}
