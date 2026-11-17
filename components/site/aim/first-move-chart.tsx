"use client"

import { useEffect, useRef, useState } from "react"
import { FIRST_BINS } from "@/lib/mira"
import { localize } from "@/lib/site"

const T = localize({
  label: { pt: "Onde o primeiro movimento termina, em faixas de 5% do caminho", en: "Where the first movement ends, in bins of 5% of the way" },
  short: { pt: "← curto", en: "← short" },
  past: { pt: "passou →", en: "past →" },
  target: { pt: "alvo", en: "target" },
  flicks: { pt: "flicks", en: "flicks" },
})

// One series: a lighter Klein, validated for the light surface (dataviz's validate_palette.js).
const COLOR = "#1d4fd1"
const HEIGHT = 200
const PAD = { left: 12, right: 12, top: 26, bottom: 30 }
const pct = (v: number) => `${Math.round(v * 100)}%`

function range(i: number) {
  if (i === 0) return `< ${pct(FIRST_BINS[0])}`
  if (i === FIRST_BINS.length) return `≥ ${pct(FIRST_BINS.at(-1)!)}`
  return `${pct(FIRST_BINS[i - 1])}–${pct(FIRST_BINS[i])}`
}

/**
 * Where each flick's first movement ended, as a share of the way to the target: columns in 5% bins around the target
 * (100%, the line), the ends under 50% and from 150% on in a column each. The mass left of the line is undershooting,
 * right of it overshooting. Each column reads its count on hover, a tap or focus.
 */
export function FirstMoveChart({ counts }: { counts: number[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number>()

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  const n = counts.length
  const total = counts.reduce((s, c) => s + c, 0)
  const max = Math.max(...counts, 1)
  const plot = width - PAD.left - PAD.right
  const slot = plot / n
  const bar = Math.min(24, slot - 2)
  const x = (i: number) => PAD.left + i * slot + (slot - bar) / 2
  const bottom = HEIGHT - PAD.bottom
  const h = (c: number) => (c / max) * (bottom - PAD.top)
  // The target: the edge between the bin ending at 100% and the next.
  const target = FIRST_BINS.findIndex((e) => Math.abs(e - 1) < 1e-9)
  const lineX = PAD.left + (target + 1) * slot

  return (
    <div ref={box} role="img" aria-label={`${T.label}: ${counts.map((c, i) => `${range(i)} ${c}`).join(", ")}`} className="relative w-full rounded-md border border-line bg-paper/60" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          <line x1={PAD.left} x2={width - PAD.right} y1={bottom} y2={bottom} className="stroke-line" strokeWidth={1} />
          {counts.map((c, i) => {
            const top = bottom - h(c)
            const r = Math.min(4, h(c) / 2, bar / 2)
            return (
              <g key={i}>
                {c > 0 && (
                  <path
                    d={`M${x(i)},${bottom} V${top + r} Q${x(i)},${top} ${x(i) + r},${top} H${x(i) + bar - r} Q${x(i) + bar},${top} ${x(i) + bar},${top + r} V${bottom} Z`}
                    fill={COLOR}
                    opacity={active === undefined || active === i ? 1 : 0.55}
                  />
                )}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={bottom - PAD.top}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${range(i)}: ${c} ${T.flicks}`}
                  className="outline-none"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  onPointerLeave={() => setActive(undefined)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(undefined)}
                />
              </g>
            )
          })}
          <line x1={lineX} x2={lineX} y1={PAD.top - 12} y2={bottom} className="stroke-navy/60" strokeWidth={1} />
          <text x={lineX} y={PAD.top - 16} textAnchor="middle" className="fill-ink text-[11px] font-medium">
            {T.target}
          </text>
          <text x={lineX - 8} y={bottom + 18} textAnchor="end" className="fill-muted text-[11px]">
            {T.short}
          </text>
          <text x={lineX + 8} y={bottom + 18} className="fill-muted text-[11px]">
            {T.past}
          </text>
          <text x={PAD.left} y={bottom + 18} className="fill-muted text-[11px] tabular-nums">
            {pct(FIRST_BINS[0])}
          </text>
          <text x={width - PAD.right} y={bottom + 18} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
            {pct(FIRST_BINS.at(-1)!)}
          </text>
        </svg>
      )}
      {active !== undefined && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-max rounded-md border border-line bg-paper px-3 py-2 text-[12px] leading-[1.5] text-muted shadow-[0_8px_24px_rgb(0_20_71/0.16)]"
          style={{ left: Math.min(Math.max(x(active) - 50, 4), width - 130) }}
        >
          <span className="block font-semibold tabular-nums text-ink">
            {counts[active]} {T.flicks} <span className="font-normal text-muted">({pct(counts[active] / Math.max(total, 1))})</span>
          </span>
          <span className="block tabular-nums">{range(active)}</span>
        </div>
      )}
    </div>
  )
}
