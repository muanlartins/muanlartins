"use client"

import { Crown } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Badge } from "./badge"
import { Button } from "./button"
import { cardClass } from "./card"
import { cn } from "@/lib/utils"

/** Someone in a ranking. The page says what each part holds; the ranking draws them all the same way. */
export interface RankingEntry {
  id: string
  /** Their figure (a fan), drawn to fill the box it's given: standing on their step, or on a strip of the stand. */
  figure: ReactNode
  /** Their name, usually a link to their page. */
  name: ReactNode
  /** Beside the name: their rank's emblem, their marble. */
  mark?: ReactNode
  /** The number the ranking goes by ("1.063 Σ", "68 vitórias"). */
  value: ReactNode
  /** A second line under it ("12 h · 9 lives", "64% · 107 duelos"). */
  detail?: ReactNode
  /** Under it all: their medals. */
  extra?: ReactNode
  /** The reader's own line, marked and kept in view when the list is folded. */
  mine?: boolean
}

// The podium's places (first, second, third: drawn second, first, third), the first's step the tallest whatever
// its content: the steps differ by their room under it.
const PLACES = [
  { col: "col-start-2", step: "pb-14", fan: "h-[96px] w-16" },
  { col: "col-start-1", step: "pb-9", fan: "h-[81px] w-[54px]" },
  { col: "col-start-3", step: "pb-5", fan: "h-[81px] w-[54px]" },
]

/** The name over a figure, as on the live's stand: a navy tag with their mark. */
function NameTag({ entry, className }: { entry: RankingEntry; className?: string }) {
  return (
    <span className={cn("flex max-w-full min-w-0 items-center gap-1 bg-navy/85 px-1.5 py-0.5 text-[12px] font-medium text-paper", className)}>
      {entry.mark}
      <span className="block min-w-0 truncate">{entry.name}</span>
    </span>
  )
}

/** The first three on their steps, on Klein. */
function Podium({ entries, you }: { entries: RankingEntry[]; you: string }) {
  return (
    <div className="cut bg-klein px-2 pt-8 sm:px-6 sm:pt-10">
      <ol className="grid grid-cols-3 items-end gap-1.5 sm:gap-4 sm:px-6">
        {entries.slice(0, 3).map((entry, i) => (
          <li key={entry.id} className={cn("row-start-1 flex min-w-0 flex-col items-center", PLACES[i].col)}>
            {i === 0 && <Crown aria-hidden className="mb-1.5 h-5 w-5 text-ouro" />}
            <NameTag entry={entry} className="mb-2.5" />
            <div className={PLACES[i].fan}>{entry.figure}</div>
            <div className={cn("flex w-full flex-col items-center gap-1 bg-paper px-1 pt-3 text-center", PLACES[i].step)}>
              <span className="text-4xl leading-none font-medium tracking-[-0.03em] text-klein tabular-nums">{i + 1}</span>
              <span className="mt-1 text-[17px] leading-tight font-medium text-ink tabular-nums">{entry.value}</span>
              {entry.detail && <span className="text-[13px] leading-snug text-muted tabular-nums">{entry.detail}</span>}
              {entry.extra && <span className="mt-1.5">{entry.extra}</span>}
              {entry.mine && <Badge tone="soft" className="mt-1">{you}</Badge>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** One line of the list: the place, the figure on its strip of the stand, the name, the number. */
function Row({ entry, place, you }: { entry: RankingEntry; place: number; you: string }) {
  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", entry.mine && "bg-klein/[0.07]")}>
      <span className="w-7 shrink-0 text-right text-[15px] font-medium text-muted tabular-nums">{place}</span>
      <span aria-hidden className="relative h-[56px] w-[42px] shrink-0 bg-klein/[0.07]">
        <span className="absolute bottom-1.5 left-1/2 h-[42px] w-[28px] -translate-x-1/2">{entry.figure}</span>
        {/* The stand's strip, its ends at a true 45° (as tall as its cut). */}
        <span className="absolute inset-x-0 bottom-0 h-1.5 bg-klein [clip-path:polygon(6px_0,calc(100%-6px)_0,100%_100%,0_100%)]" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-medium text-ink">
          {entry.mark}
          <span className="block min-w-0 truncate">{entry.name}</span>
          {entry.mine && <Badge tone="soft">{you}</Badge>}
        </p>
        {entry.extra}
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p className="text-[17px] leading-tight font-medium text-klein">{entry.value}</p>
        {entry.detail && <p className="text-[13px] text-muted">{entry.detail}</p>}
      </div>
    </li>
  )
}

/**
 * A ranking (brand/interface.md, "Components"): the first three on a podium, the list up to `top`, then "Ver todos".
 * The reader's own line stays in view under a folded list. Every ranking on the site (the audience's Σ, the
 * minigames') is this one, so they read the same.
 */
export function Ranking({
  entries,
  label,
  top = 10,
  showAll = "Ver todos",
  showLess = "Ver menos",
  you = "você",
  className,
}: {
  entries: RankingEntry[]
  /** What the list is, for screen readers ("Ranking do duelo"). */
  label: string
  top?: number
  showAll?: string
  showLess?: string
  you?: string
  className?: string
}) {
  const [all, setAll] = useState(false)
  const rest = entries.slice(3)
  const shown = all ? rest : rest.slice(0, Math.max(0, top - 3))
  const mine = entries.findIndex((e) => e.mine)
  const pinned = !all && mine >= Math.max(3, top) ? mine : -1
  return (
    <div className={cn("space-y-3", className)} role="group" aria-label={label}>
      <Podium entries={entries} you={you} />
      {shown.length > 0 && (
        <ol start={4} className={cn(cardClass, "divide-y divide-line overflow-hidden")}>
          {shown.map((entry, i) => (
            <Row key={entry.id} entry={entry} place={i + 4} you={you} />
          ))}
        </ol>
      )}
      {pinned >= 0 && (
        <ol start={pinned + 1} className={cn(cardClass, "overflow-hidden")}>
          <Row entry={entries[pinned]} place={pinned + 1} you={you} />
        </ol>
      )}
      {entries.length > top && (
        <Button variant="secondary" size="sm" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? showLess : `${showAll} (${entries.length.toLocaleString("pt-BR")})`}
        </Button>
      )}
    </div>
  )
}
