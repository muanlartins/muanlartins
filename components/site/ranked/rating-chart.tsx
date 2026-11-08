"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { shortDate, signed, time } from "@/components/site/ranked/format"
import { dayOf } from "@/lib/ranked"
import type { Band, RecordView } from "@/lib/ranked-view"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  win: { pt: "Vitória", en: "Win" },
  loss: { pt: "Derrota", en: "Loss" },
  draw: { pt: "Empate", en: "Draw" },
  before: { pt: "Antes da primeira partida", en: "Before the first match" },
  label: { pt: "A cada partida", en: "After each match" },
})

const HEIGHT = 280
/** Past this many matches the dots would touch: the line alone carries it. */
const MAX_DOTS = 80

/** Ticks on round numbers, at most about five. */
function ticks(min: number, max: number) {
  const range = Math.max(max - min, 8)
  const magnitude = 10 ** Math.floor(Math.log10(range / 4))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => range / s <= 4) ?? magnitude * 10
  const lo = Math.floor(min / step) * step
  const hi = Math.max(Math.ceil(max / step) * step, lo + step)
  const values = []
  for (let v = lo; v <= hi + step / 2; v += step) values.push(Math.round(v))
  return values
}

/**
 * The points (or RR) after each match, evenly spaced so a day of many matches isn't squeezed against a day of few,
 * with the area under the line in Klein. With `bands` (Valorant's ranks), the ranks it crossed stripe the background,
 * each with its emblem in the margin; otherwise round numbers. Dashed lines split the days. Wins are green dots,
 * losses red; hovering, a tap or the arrow keys read a match: its result, score, map and agent, the change.
 */
export function RatingChart({ series, bands, unit }: { series: RecordView["series"]; bands?: Band[]; unit: string }) {
  const box = useRef<HTMLDivElement>(null)
  const gradient = useId()
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number>()

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  const banded = !!bands?.length
  const narrow = width < 480
  const PAD = { left: banded ? (narrow ? 34 : 112) : 44, right: 64, top: 16, bottom: 30 }
  const n = series.length
  const values = series.map((point) => point.value)
  const axis = banded ? [] : ticks(Math.min(...values), Math.max(...values))
  const [lo, hi] = banded
    ? [bands![0].from, bands!.at(-1)!.to]
    : [axis[0], axis.at(-1)!]
  const plot = width - PAD.left - PAD.right
  const gap = n > 1 ? plot / (n - 1) : 0
  const x = (i: number) => PAD.left + (n > 1 ? i * gap : plot / 2)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (HEIGHT - PAD.top - PAD.bottom)
  const bottom = HEIGHT - PAD.bottom

  // Where each day starts, labelled unless it would crowd the previous label.
  const days: { i: number; label?: string }[] = []
  let lastLabel = -Infinity
  series.forEach((point, i) => {
    if (i > 0 && dayOf(point.at) === dayOf(series[i - 1].at)) return
    const room = x(i) - lastLabel >= 52
    if (room) lastLabel = x(i)
    days.push({ i, label: room ? shortDate(point.at) : undefined })
  })

  function pick(event: PointerEvent) {
    const left = event.clientX - box.current!.getBoundingClientRect().left
    setActive(Math.min(n - 1, Math.max(0, Math.round(gap ? (left - PAD.left) / gap : 0))))
  }

  function step(event: KeyboardEvent) {
    const move = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n }[event.key]
    if (move === undefined) return
    event.preventDefault()
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n) + move)))
  }

  const point = active !== undefined ? series[active] : undefined
  const match = point?.match
  const line = series.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")
  const last = series.at(-1)!

  return (
    <div
      ref={box}
      tabIndex={0}
      role="img"
      aria-label={`${T.label}: ${series[0].text} → ${last.text}`}
      onKeyDown={step}
      onBlur={() => setActive(undefined)}
      className="relative w-full touch-pan-y rounded-md border border-line bg-paper/60 outline-none focus-visible:ring-2 focus-visible:ring-klein"
      style={{ height: HEIGHT }}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-klein)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--color-klein)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {banded &&
            bands!.map((band, index) => {
              const top = y(band.to)
              const height = y(band.from) - top
              return (
                <g key={band.from}>
                  <rect x={PAD.left} y={top} width={plot} height={height} fill={band.color} opacity={index % 2 ? 0.07 : 0.13} />
                  <line x1={PAD.left} x2={width - PAD.right} y1={top} y2={top} className="stroke-line" strokeWidth={1} />
                  {height >= 18 && (
                    <>
                      <image href={band.icon} x={6} y={top + height / 2 - 11} width={22} height={22} />
                      {!narrow && (
                        <text x={34} y={top + height / 2} dy="0.32em" className="fill-muted text-[12px]">
                          {band.name}
                        </text>
                      )}
                    </>
                  )}
                </g>
              )
            })}

          {axis.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {v}
              </text>
            </g>
          ))}

          {days.map(({ i, label }) => (
            <g key={i}>
              {i > 0 && (
                <line x1={x(i) - gap / 2} x2={x(i) - gap / 2} y1={PAD.top} y2={bottom} className="stroke-zinc-300" strokeDasharray="3 4" strokeWidth={1} />
              )}
              {label && (
                <text x={x(i)} y={HEIGHT - 10} textAnchor={n > 1 ? "start" : "middle"} className="fill-muted text-[11px] tabular-nums">
                  {label}
                </text>
              )}
            </g>
          ))}

          <polygon points={`${x(0)},${bottom} ${line} ${x(n - 1)},${bottom}`} fill={`url(#${gradient})`} />
          <polyline points={line} fill="none" className="stroke-klein" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {active !== undefined && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={bottom} className="stroke-klein/40" strokeWidth={1} />}

          {series.map((p, i) => {
            const big = i === active
            if (n > MAX_DOTS && !big) return null
            const result = p.match?.result
            return (
              <circle
                key={i}
                cx={x(i)}
                cy={y(p.value)}
                r={big ? 7 : p.match ? 5 : 3.5}
                className={cn("stroke-paper", result === "win" ? "fill-win" : result === "loss" ? "fill-loss" : "fill-muted")}
                strokeWidth={2}
              />
            )
          })}

          <g transform={`translate(${x(n - 1) + 10}, ${y(last.value)})`}>
            <rect x={0} y={-11} width={unit === "RR" ? 52 : 46} height={22} rx={5} className="fill-klein" />
            <text x={unit === "RR" ? 26 : 23} y={0} dy="0.34em" textAnchor="middle" className="fill-paper text-[12px] font-semibold tabular-nums">
              {unit === "RR" ? `${last.value - Math.floor(last.value / 100) * 100} RR` : last.value}
            </text>
          </g>

          <rect
            x={0}
            y={0}
            width={width}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setActive(undefined)}
          />
        </svg>
      )}

      {point && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-max max-w-64 overflow-hidden rounded-md border border-line bg-paper text-[12px] leading-[1.45] text-muted shadow-[0_8px_24px_rgb(0_20_71/0.16)]"
          style={{
            left: Math.min(Math.max(x(active!) - 110, 4), width - 230),
            transform: y(point.value) < 120 ? `translateY(${y(point.value) + 12}px)` : undefined,
          }}
        >
          <div className={cn("flex items-center gap-3 px-3 py-2", match && "border-l-4", match?.result === "win" ? "border-l-win" : match?.result === "loss" ? "border-l-loss" : "")}>
            {match?.map && (
              <span className="relative h-9 w-16 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={match.map.image} alt="" className="h-full w-full rounded-sm object-cover" />
                {match.agent && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={match.agent.image} alt="" className="absolute -bottom-1 -right-1.5 h-6 w-6 rounded-full border-2 border-paper bg-navy object-cover" />
                )}
              </span>
            )}
            <span>
              <span className="block text-[14px] font-semibold text-ink tabular-nums">
                {point.text}
                {match?.change != null && (
                  <span className={cn("ml-2", match.change >= 0 ? "text-win" : "text-loss")}>{signed(match.change)}</span>
                )}
              </span>
              {match ? (
                <>
                  <span className="block text-ink">
                    <span className={match.result === "win" ? "text-win" : match.result === "loss" ? "text-loss" : ""}>
                      {match.result === "win" ? T.win : match.result === "loss" ? T.loss : T.draw}
                    </span>
                    {match.score && ` ${match.score[0]}–${match.score[1]}`}
                    {match.map && ` · ${match.map.name}`}
                  </span>
                  <span className="block tabular-nums">
                    {shortDate(match.at)} · {time(match.at)}
                  </span>
                </>
              ) : (
                <span className="block">{T.before}</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
