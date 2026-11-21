import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** One bar: what it is, how much (to draw it) and how to say it. */
export interface Bar {
  id: string
  label: ReactNode
  value: number
  /** The number as written beside the bar ("12", "64%", "38 s"). */
  display: ReactNode
  /** Drawn pale: a value from too few to trust. */
  faint?: boolean
}

/**
 * A light bar chart (brand/interface.md; the aim page's way): one bar per row in Klein, the label on the left and its
 * number on the right, square ends, an optional track for shares and a reference line (50% of wins). Values are
 * written beside every bar, so nothing hides behind a hover.
 */
export function BarList({
  bars,
  max,
  track = false,
  reference,
  className,
}: {
  bars: Bar[]
  /** The scale's end; the largest value by default. */
  max?: number
  /** A pale track behind each bar, for shares of a whole. */
  track?: boolean
  /** A hairline across the bars at this value. */
  reference?: number
  className?: string
}) {
  const top = max ?? Math.max(1, ...bars.map((b) => b.value))
  const at = (v: number) => `${Math.min(100, Math.max(0, (v / top) * 100))}%`
  return (
    <ul className={cn("space-y-2", className)}>
      {bars.map((b) => (
        <li key={b.id} className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_auto]">
          <span className="flex min-w-0 items-center gap-2 text-[14px] text-ink">{b.label}</span>
          <span aria-hidden className={cn("relative h-2.5", track && "bg-klein/10")}>
            <span className={cn("absolute inset-y-0 left-0", b.faint ? "bg-klein/35" : "bg-klein")} style={{ width: b.value > 0 ? `max(2px, ${at(b.value)})` : 0 }} />
            {reference !== undefined && <span className="absolute -inset-y-1 w-px bg-navy/50" style={{ left: at(reference) }} />}
          </span>
          <span className="min-w-[3.5rem] text-right text-[13px] text-muted tabular-nums">{b.display}</span>
        </li>
      ))}
    </ul>
  )
}
