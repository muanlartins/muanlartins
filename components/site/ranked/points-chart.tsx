"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { shortDate, signed, time } from "@/components/site/ranked/format"
import { dayOf, type Summary } from "@/lib/ranked"
import { localize } from "@/lib/site"

const T = localize({
  points: { pt: "pts", en: "pts" },
  win: { pt: "Vitória", en: "Win" },
  loss: { pt: "Derrota", en: "Loss" },
  before: { pt: "Antes da primeira partida", en: "Before the first match" },
  overtime: { pt: "prorrogação", en: "overtime" },
  label: { pt: "Pontos a cada partida", en: "Points after each match" },
})

const HEIGHT = 240
const PAD = { left: 44, right: 52, top: 16, bottom: 30 }
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
 * The points (MMR) after each match, evenly spaced so a day of many matches
 * isn't squeezed against a day of few. Hairlines split the days. Wins are
 * filled dots, losses hollow ones; hovering or the arrow keys read a match.
 */
export function PointsChart({ series }: { series: Summary["series"] }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number>()

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  const n = series.length
  const values = series.map((point) => point.mmr)
  const axis = ticks(Math.min(...values), Math.max(...values))
  const [lo, hi] = [axis[0], axis.at(-1)!]
  const plot = width - PAD.left - PAD.right
  const gap = n > 1 ? plot / (n - 1) : 0
  const x = (i: number) => PAD.left + (n > 1 ? i * gap : plot / 2)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (HEIGHT - PAD.top - PAD.bottom)

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

  return (
    <div
      ref={box}
      tabIndex={0}
      role="img"
      aria-label={`${T.label}: ${values[0]} → ${values.at(-1)} ${T.points}`}
      onKeyDown={step}
      onBlur={() => setActive(undefined)}
      className="relative h-60 w-full touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-klein"
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible">
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
                <line
                  x1={x(i) - gap / 2}
                  x2={x(i) - gap / 2}
                  y1={PAD.top}
                  y2={HEIGHT - PAD.bottom}
                  className="stroke-zinc-300"
                  strokeWidth={1}
                />
              )}
              {label && (
                <text x={x(i)} y={HEIGHT - 10} textAnchor={n > 1 ? "start" : "middle"} className="fill-muted text-[11px] tabular-nums">
                  {label}
                </text>
              )}
            </g>
          ))}

          {active !== undefined && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="stroke-klein/40" strokeWidth={1} />
          )}

          <polyline
            points={series.map((p, i) => `${x(i)},${y(p.mmr)}`).join(" ")}
            fill="none"
            className="stroke-klein"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {series.map((p, i) => {
            const big = i === active
            if (n > MAX_DOTS && !big) return null
            const win = p.match?.result === "win"
            return (
              <circle
                key={i}
                cx={x(i)}
                cy={y(p.mmr)}
                r={big ? 6 : p.match ? 4.5 : 3}
                className={p.match ? (win ? "fill-klein stroke-ground" : "fill-ground stroke-klein") : "fill-muted stroke-ground"}
                strokeWidth={2}
              />
            )
          })}

          <text
            x={x(n - 1) + 10}
            y={y(values.at(-1)!)}
            dy="0.32em"
            className="fill-ink text-[12px] font-medium tabular-nums"
          >
            {values.at(-1)}
          </text>

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
          className="pointer-events-none absolute top-0 z-10 w-max max-w-56 rounded-md border border-line bg-paper px-3 py-2 text-[12px] leading-[1.45] text-muted shadow-[0_6px_20px_rgb(0_20_71/0.12)]"
          style={{
            left: Math.min(Math.max(x(active!) - 90, 0), width - 180),
            transform: y(point.mmr) < 90 ? `translateY(${y(point.mmr) + 16}px)` : undefined,
          }}
        >
          <p className="text-[15px] font-semibold text-ink tabular-nums">
            {point.mmr} {T.points}
            {match?.points != null && <span className="ml-2 font-medium text-muted">{signed(match.points)}</span>}
          </p>
          {match ? (
            <>
              <p className="flex items-center gap-1.5 text-ink">
                <svg width="10" height="10" aria-hidden className="shrink-0">
                  <circle
                    cx="5"
                    cy="5"
                    r="3.5"
                    className={match.result === "win" ? "fill-klein" : "fill-paper stroke-klein"}
                    strokeWidth={1.5}
                  />
                </svg>
                {match.result === "win" ? T.win : T.loss}
                {match.score && ` ${match.score[0]}–${match.score[1]}`}
                {match.overtime && ` · ${T.overtime}`}
              </p>
              <p className="tabular-nums">
                {shortDate(match.at)} · {time(match.at)}
              </p>
            </>
          ) : (
            <p>{T.before}</p>
          )}
        </div>
      )}
    </div>
  )
}
