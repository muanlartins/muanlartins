"use client"

import { AnimatePresence, motion } from "motion/react"
import type { CSSProperties } from "react"
import { divisionOf } from "@/lib/progress"
import { UI } from "@/lib/site"
import { cn } from "@/lib/utils"

/** The brand's curve (brand/interface.md, "Motion"). */
const EASE = [0.65, 0, 0.35, 1] as const

/**
 * A rank's title, which follows the page through the rank: its in-game
 * emblem (the division climbs as its topics are done, with a burst in the
 * rank's colour), its name and its progress. Ranks above the visitor's own
 * keep their text legible and grey out only the emblem.
 */
export function RankHeader({
  name,
  color,
  icons = [],
  summary,
  done,
  total,
  ahead,
}: {
  name: string
  color: string
  icons?: string[]
  summary?: string
  done: number
  total: number
  /** Not reached yet. */
  ahead: boolean
}) {
  const fill = total ? done / total : 0
  const icon = icons[divisionOf(fill, icons.length)]

  return (
    <div style={{ "--rank": color } as CSSProperties}>
      {icon && (
        <div className={cn("relative mb-3 h-14 w-14 transition-[opacity,filter] duration-500", ahead && "opacity-60 grayscale")}>
          <AnimatePresence initial={false}>
            <motion.span
              key={`${icon}-burst`}
              aria-hidden
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="absolute inset-0 rounded-full border-4 border-(--rank)"
            />
            <motion.img
              key={icon}
              src={icon}
              alt=""
              initial={{ scale: 0.2, opacity: 0, rotate: -40 }}
              animate={{ scale: [0.2, 1.4, 1], opacity: 1, rotate: 0 }}
              exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.3 } }}
              transition={{ duration: 0.6, ease: EASE }}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </AnimatePresence>
        </div>
      )}
      <h2 className={cn("text-2xl font-medium tracking-[-0.02em]", ahead ? "text-muted" : "text-klein")}>{name}</h2>
      {total > 0 && (
        <>
          <div className="mt-3 h-1 w-full max-w-40 bg-zinc-200">
            <motion.div
              className="h-full bg-klein"
              initial={false}
              animate={{ width: `${fill * 100}%` }}
              transition={{ duration: 0.5, ease: EASE }}
            />
          </div>
          <p className="mt-1.5 text-[13px] tabular-nums text-muted">
            {done}/{total} {UI.completed}
          </p>
        </>
      )}
      {summary && <p className="mt-3 text-[15px] leading-[1.6] text-muted">{summary}</p>}
    </div>
  )
}
