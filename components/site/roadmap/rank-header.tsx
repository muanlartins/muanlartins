"use client"

import { AnimatePresence, motion } from "motion/react"
import type { CSSProperties } from "react"
import { divisionOf } from "@/lib/progress"
import { UI } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * A rank's title, which follows the page through the rank: its in-game
 * emblem (the division climbs as its topics are done), its name in its
 * metal, glinting each time it comes into view, and its progress. Ranks
 * above the visitor's own are faded.
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
    <div
      className={cn("transition-[opacity,filter] duration-700", ahead && "opacity-45 grayscale-[60%]")}
      style={{ "--rank": color } as CSSProperties}
    >
      {icon && (
        <div className="relative mb-3 h-16 w-16">
          <AnimatePresence initial={false}>
            <motion.span
              key={`${icon}-burst`}
              aria-hidden
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-4 border-(--rank) shadow-[0_0_24px_var(--rank)]"
            />
            <motion.img
              key={icon}
              src={icon}
              alt=""
              initial={{ scale: 0.2, opacity: 0, rotate: -40 }}
              animate={{ scale: [0.2, 1.5, 1], opacity: 1, rotate: 0 }}
              exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.3 } }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_4px_10px_color-mix(in_oklab,var(--rank)_45%,transparent)]"
            />
          </AnimatePresence>
        </div>
      )}
      <motion.h2
        className="rank-metal text-2xl font-medium tracking-[-0.02em]"
        initial={{ backgroundPosition: "100% 0%" }}
        whileInView={{ backgroundPosition: "0% 0%" }}
        viewport={{ amount: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      >
        {name}
      </motion.h2>
      {total > 0 && (
        <>
          <div className="mt-3 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-zinc-200">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--rank)" }}
              initial={false}
              animate={{ width: `${fill * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <p className="mt-1.5 text-[13px] tabular-nums text-muted">
            {done}/{total} {UI.completed}
          </p>
        </>
      )}
      {summary && <p className="mt-3 text-[14px] leading-[1.5] text-muted">{summary}</p>}
    </div>
  )
}
