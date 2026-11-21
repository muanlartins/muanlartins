"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { CURVE_STEP, ninetyAt } from "@/lib/mira"
import { localize } from "@/lib/site"

const T = localize({
  label: { pt: "O flick típico: quanto do caminho até o alvo, a cada 50 ms", en: "The typical flick: how much of the way to the target, every 50 ms" },
  target: { pt: "no alvo", en: "on target" },
  ms: { pt: "ms desde o começo do flick", en: "ms since the flick began" },
  way: { pt: "do caminho", en: "of the way" },
})

// The chart's series: a lighter Klein, validated for the light surface (dataviz's validate_palette.js); a second one
// (the matches beside the training) in navy and dashed, as the radar draws the Sunday before, so it never rests on
// colour alone.
const COLOR = "#1d4fd1"
const COMPARE = "#001447"
const HEIGHT = 240
const PAD = { left: 48, right: 64, top: 16, bottom: 34 }
const pct = (v: number) => `${Math.round(v * 100)}%`

/**
 * The typical flick as a line: the share of the way to the target done (0% where it began, 100% on the target) against
 * the ms since it began, with the moment it reaches 90% marked. Hovering, a tap or the arrow keys read a moment.
 */
export function FlickCurve({ values, compare, labels }: { values: number[]; compare?: number[]; labels?: [string, string] }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number>()

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  const both = compare && compare.length > 1 ? compare : undefined
  const n = Math.max(values.length, both?.length ?? 0)
  const hi = Math.max(1.1, Math.ceil(Math.max(...values, ...(both ?? [])) * 10) / 10)
  const plot = width - PAD.left - PAD.right
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * plot : 0)
  const y = (v: number) => PAD.top + (1 - v / hi) * (HEIGHT - PAD.top - PAD.bottom)
  const bottom = HEIGHT - PAD.bottom
  // The moment it reaches 90%, between two points.
  const ninety = ninetyAt(values) / CURVE_STEP

  function pick(event: PointerEvent) {
    const offset = event.clientX - box.current!.getBoundingClientRect().left
    setActive(Math.min(n - 1, Math.max(0, Math.round(((offset - PAD.left) / plot) * (n - 1)))))
  }

  function step(event: KeyboardEvent) {
    const move = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n }[event.key]
    if (move === undefined) return
    event.preventDefault()
    setActive((i) => Math.min(n - 1, Math.max(0, (i ?? -1) + move)))
  }

  return (
    <div
      ref={box}
      tabIndex={0}
      role="img"
      aria-label={`${T.label}: ${labels && both ? `${labels[0]} ` : ""}${values.map((v, i) => `${i * CURVE_STEP} ms ${pct(v)}`).join(", ")}${
        labels && both ? `; ${labels[1]} ${both.map((v, i) => `${i * CURVE_STEP} ms ${pct(v)}`).join(", ")}` : ""
      }`}
      onKeyDown={step}
      onBlur={() => setActive(undefined)}
      className="relative w-full touch-pan-y rounded-md border border-line bg-paper/60 outline-none focus-visible:ring-2 focus-visible:ring-klein"
      style={{ height: HEIGHT }}
    >
      {width > 0 && n > 1 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className={t === 1 ? "stroke-navy/50" : "stroke-line"} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {pct(t)}
              </text>
            </g>
          ))}
          <text x={width - PAD.right + 6} y={y(1)} dy="0.32em" className="fill-ink text-[11px] font-medium">
            {T.target}
          </text>
          {Array.from({ length: n }, (_, i) => i)
            .filter((i) => (i * CURVE_STEP) % (plot < 360 ? 200 : 100) === 0)
            .map((i) => (
              <text key={i} x={x(i)} y={bottom + 16} textAnchor="middle" className="fill-muted text-[11px] tabular-nums">
                {i * CURVE_STEP}
              </text>
            ))}
          <text x={PAD.left + plot / 2} y={HEIGHT - 2} textAnchor="middle" className="fill-muted text-[11px]">
            {T.ms}
          </text>

          <polygon points={`${x(0)},${y(0)} ${values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} ${x(values.length - 1)},${y(0)}`} fill={COLOR} opacity={0.1} />
          {active !== undefined && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={bottom} className="stroke-navy/30" strokeWidth={1} />}
          <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {ninety > 0 && (
            <g>
              <circle cx={x(ninety)} cy={y(0.9)} r={4.5} fill={COLOR} className="stroke-paper" strokeWidth={2} />
              <text x={x(ninety) + 8} y={y(0.9) + 16} className="fill-ink text-[12px] font-medium tabular-nums">
                90% · {Math.round(ninety * CURVE_STEP)} ms
              </text>
            </g>
          )}
          {both && (
            <polyline points={both.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={COMPARE} strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {active !== undefined && active < values.length && <circle cx={x(active)} cy={y(values[active])} r={4.5} fill={COLOR} className="stroke-paper" strokeWidth={2} />}
          {active !== undefined && both && active < both.length && <circle cx={x(active)} cy={y(both[active])} r={4.5} fill={COMPARE} className="stroke-paper" strokeWidth={2} />}
          <rect x={0} y={0} width={width} height={HEIGHT} fill="transparent" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setActive(undefined)} />
        </svg>
      )}

      {active !== undefined && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-max rounded-md border border-line bg-paper px-3 py-2 text-[12px] leading-[1.5] text-muted shadow-[0_8px_24px_rgb(0_20_71/0.16)]"
          style={{ left: Math.min(Math.max(x(active) - 60, 4), width - 140) }}
        >
          {both && labels ? (
            <>
              {active < values.length && (
                <span className="block tabular-nums">
                  <span className="font-semibold text-ink">{pct(values[active])}</span> {labels[0]}
                </span>
              )}
              {active < both.length && (
                <span className="block tabular-nums">
                  <span className="font-semibold text-ink">{pct(both[active])}</span> {labels[1]}
                </span>
              )}
            </>
          ) : (
            <span className="block font-semibold tabular-nums text-ink">
              {pct(values[active])} <span className="font-normal text-muted">{T.way}</span>
            </span>
          )}
          <span className="block tabular-nums">{active * CURVE_STEP} ms</span>
        </div>
      )}
    </div>
  )
}
