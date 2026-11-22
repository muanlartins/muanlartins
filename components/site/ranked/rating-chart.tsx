"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { resultWord } from "@/components/site/ranked/match-result"
import { number, shortDate, signed, time } from "@/components/site/ranked/format"
import { dayOf } from "@/lib/ranked"
import type { Band, Point, Result } from "@/lib/ranked-view"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  before: { pt: "Antes da primeira partida", en: "Before the first match" },
  unranked: { pt: "Sem rank", en: "Unranked" },
  matches: { pt: "partidas", en: "matches" },
  match1: { pt: "partida", en: "match" },
})

const HEIGHT = 300
/** Past this many matches the dots would touch: the line and the strip carry it. */
const MAX_DOTS = 80
const FILL: Record<Result, string> = { win: "fill-win", loss: "fill-loss", draw: "fill-muted" }
const STROKE: Record<Result, string> = { win: "stroke-win", loss: "stroke-loss", draw: "stroke-muted" }

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

/** Runs of consecutive indices where `test` holds: [[first, last], …]. */
function runs(length: number, test: (i: number) => boolean) {
  const found: [number, number][] = []
  for (let i = 0; i < length; i++) {
    if (!test(i)) continue
    if (found.length && found.at(-1)![1] === i - 1) found.at(-1)![1] = i
    else found.push([i, i])
  }
  return found
}

/**
 * The points (or RR) match by match, every match in its own slot, evenly spaced so a day of many matches isn't
 * squeezed against a day of few. Under the plot, a strip with every match's result (hollow when it has no value),
 * so a match nobody wrote the points for still counts; the line runs where the values are, dashed across the ones
 * without. Matches played while unranked are shaded. With `bands` (Valorant's ranks), the ranks it crossed stripe the
 * background, each with its emblem in the margin; otherwise round numbers. Dashed lines split the days. Hovering, a
 * tap or the arrow keys read a match: its value, result, score, map, the change.
 */
export function RatingChart({ series, bands, unit, label, missing }: { series: Point[]; bands?: Band[]; unit: string; label: string; missing: string }) {
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
  const n = series.length
  const shaded = runs(n, (i) => !!series[i].match?.unranked)
  const PAD = { left: banded ? (narrow ? 34 : 112) : 48, right: 64, top: shaded.length ? 30 : 16, bottom: 46 }
  const valued = series.flatMap((point, i) => (point.value != null ? [i] : []))
  const values = valued.map((i) => series[i].value!)
  const axis = banded ? [] : ticks(Math.min(...values), Math.max(...values))
  const [lo, hi] = banded ? [bands![0].from, bands!.at(-1)!.to] : [axis[0], axis.at(-1)!]
  const plot = width - PAD.left - PAD.right
  const gap = n > 1 ? plot / (n - 1) : 0
  const x = (i: number) => PAD.left + (n > 1 ? i * gap : plot / 2)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (HEIGHT - PAD.top - PAD.bottom)
  const bottom = HEIGHT - PAD.bottom
  // The results strip: a square per match under the plot, as wide as there's room for.
  const strip = { y: bottom + 8, size: Math.max(2, Math.min(10, gap - 2 || 10)) }

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
  const solid = runs(n, (i) => series[i].value != null)
  const line = (from: number, to: number) => valued.filter((i) => i >= from && i <= to).map((i) => `${x(i)},${y(series[i].value!)}`).join(" ")
  const last = valued.at(-1)!
  const lastValue = series[last].value!
  const plate = unit === "RR" ? `${lastValue - Math.floor(lastValue / 100) * 100} RR` : number(lastValue)
  const plateWidth = 14 + plate.length * 8
  const count = series.filter((p) => p.match).length
  const without = series.filter((p) => p.match && p.value == null).length
  const said = point && [point.value != null ? point.text : missing, match && resultWord(match.result), match?.score && `${match.score[0]}–${match.score[1]}`, match && `${shortDate(match.at)} ${time(match.at)}`].filter(Boolean).join(", ")

  return (
    <div
      ref={box}
      tabIndex={0}
      role="img"
      aria-label={`${label}: ${count} ${count === 1 ? T.match1 : T.matches}${without ? `, ${without} ${missing}` : ""}; ${series[valued[0]].text} → ${series[last].text}`}
      onKeyDown={step}
      onBlur={() => setActive(undefined)}
      className="cut cut-edge relative w-full touch-pan-y border border-line bg-paper/60"
      style={{ height: HEIGHT }}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-klein)" stopOpacity={0.2} />
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

          {shaded.map(([from, to]) => {
            const left = Math.max(PAD.left, x(from) - gap / 2)
            const right = Math.min(width - PAD.right, x(to) + gap / 2)
            return (
              <g key={from}>
                <rect x={left} y={PAD.top - 14} width={Math.max(right - left, 8)} height={bottom - PAD.top + 14} className="fill-klein/[0.06]" />
                {right - left >= 64 && (
                  <text x={left + 6} y={PAD.top - 4} className="fill-muted text-[12px]">
                    {T.unranked}
                  </text>
                )}
              </g>
            )
          })}

          {axis.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[12px] tabular-nums">
                {number(v)}
              </text>
            </g>
          ))}

          {days.map(({ i, label: day }) => (
            <g key={i}>
              {i > 0 && (
                <line x1={x(i) - gap / 2} x2={x(i) - gap / 2} y1={PAD.top} y2={strip.y + strip.size} className="stroke-line-strong" strokeDasharray="3 4" strokeWidth={1} />
              )}
              {day && (
                <text x={x(i)} y={HEIGHT - 10} textAnchor={n > 1 ? "start" : "middle"} className="fill-muted text-[12px] tabular-nums">
                  {day}
                </text>
              )}
            </g>
          ))}

          <polygon points={`${x(valued[0])},${bottom} ${line(0, n - 1)} ${x(last)},${bottom}`} fill={`url(#${gradient})`} />
          {/* Across matches without a value, the line goes on dashed: what happened between is unknown. */}
          {solid.slice(1).map(([from], index) => {
            const end = solid[index][1]
            return (
              <line
                key={from}
                x1={x(end)}
                y1={y(series[end].value!)}
                x2={x(from)}
                y2={y(series[from].value!)}
                className="stroke-klein/50"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )
          })}
          {solid.map(([from, to]) => (
            <polyline key={from} points={line(from, to)} fill="none" className="stroke-klein" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {active !== undefined && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={strip.y + strip.size} className="stroke-klein/40" strokeWidth={1} />}

          {series.map((p, i) => {
            const big = i === active
            if (p.value == null || (n > MAX_DOTS && !big)) return null
            return (
              <circle
                key={i}
                cx={x(i)}
                cy={y(p.value)}
                r={big ? 7 : p.match ? 5 : 3.5}
                className={cn("stroke-paper", p.match ? FILL[p.match.result] : "fill-muted")}
                strokeWidth={2}
              />
            )
          })}

          {series.map((p, i) =>
            p.match ? (
              p.value != null ? (
                <rect key={i} x={x(i) - strip.size / 2} y={strip.y} width={strip.size} height={8} className={FILL[p.match.result]} opacity={active === undefined || i === active ? 1 : 0.55} />
              ) : (
                <rect
                  key={i}
                  x={x(i) - strip.size / 2 + 0.75}
                  y={strip.y + 0.75}
                  width={Math.max(strip.size - 1.5, 1)}
                  height={6.5}
                  className={cn("fill-paper", STROKE[p.match.result])}
                  strokeWidth={1.5}
                />
              )
            ) : null,
          )}

          <g transform={`translate(${x(n - 1) + 10}, ${y(lastValue)})`}>
            {/* The plate: a Klein tab with the identity's cut. */}
            <polygon points={`4,-11 ${plateWidth},-11 ${plateWidth},7 ${plateWidth - 4},11 0,11 0,-7`} className="fill-klein" />
            <text x={plateWidth / 2} y={0} dy="0.34em" textAnchor="middle" className="fill-paper text-[12px] font-semibold tabular-nums">
              {plate}
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

      <p className="sr-only" aria-live="polite">
        {said}
      </p>

      {point && (
        // The cut clips a box shadow: the shadow follows the shape from this wrapper.
        <div
          className="pointer-events-none absolute top-2 z-10 drop-shadow-[0_8px_24px_rgb(0_20_71/0.16)]"
          style={{
            left: Math.min(Math.max(x(active!) - 110, 4), width - 236),
            transform: point.value != null && y(point.value) < 130 ? `translateY(${y(point.value) + 12}px)` : undefined,
          }}
        >
          <div className="cut w-max max-w-64 bg-paper text-[13px] leading-[1.45] text-muted">
            <div className={cn("flex items-center gap-3 px-3 py-2", match && "border-l-4", match?.result === "win" ? "border-l-win" : match?.result === "loss" ? "border-l-loss" : "border-l-line-strong")}>
              {match?.map && (
                <span className="relative h-9 w-16 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={match.map.image} alt="" className="h-full w-full object-cover" />
                  {match.agent && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={match.agent.image} alt="" className="absolute -bottom-1 -right-1.5 h-6 w-6 rounded-full border-2 border-paper bg-navy object-cover" />
                  )}
                </span>
              )}
              <span>
                <span className="block text-[15px] font-semibold tabular-nums text-ink">
                  {point.value != null ? point.text : <span className="font-medium text-muted">{missing.charAt(0).toUpperCase() + missing.slice(1)}</span>}
                  {match?.change != null && <span className={cn("ml-2", match.change >= 0 ? "text-win" : "text-loss")}>{signed(match.change)}</span>}
                </span>
                {match ? (
                  <>
                    <span className="block text-ink">
                      <span className={match.result === "win" ? "text-win" : match.result === "loss" ? "text-loss" : ""}>{resultWord(match.result)}</span>
                      {match.score && ` ${match.score[0]}–${match.score[1]}`}
                      {match.map && ` · ${match.map.name}`}
                    </span>
                    <span className="block tabular-nums">
                      {shortDate(match.at)} · {time(match.at)}
                      {match.unranked && ` · ${T.unranked}`}
                    </span>
                  </>
                ) : (
                  <span className="block">{T.before}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
