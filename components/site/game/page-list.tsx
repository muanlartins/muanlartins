"use client"

import { ArrowRight, ArrowUpRight, Clapperboard, Link2, Route, Target, Trophy, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import { GameIcon } from "@/components/site/game/game-icon"
import { cn } from "@/lib/utils"

/** The pages' icons, the same as the menu's (game-menu.tsx). */
const ICONS = { fundamentals: Route, ranked: Trophy, aim: Target, lives: Clapperboard, link: Link2 } satisfies Record<string, LucideIcon>

export interface PageEntry {
  href: string
  title: string
  summary: string
  icon: keyof typeof ICONS
  /** Another site: opens in a new tab. */
  away?: boolean
  /** Beside the title: a language badge. */
  badge?: ReactNode
  /** A glimpse of what's inside: the rank, the progress, the next live. */
  glimpse?: ReactNode
}

/**
 * A game's pages on its home, drawn like its menu: one panel, each page a row with its icon, a line about it and a
 * glimpse of what's inside on the right. The game's marker (the ball, the crosshair) slides down the panel's left edge
 * to the row being pointed at, as it does in the menu to the page being read.
 */
export function PageList({ pages, game }: { pages: PageEntry[]; game: string }) {
  const [active, setActive] = useState<number>()
  return (
    <ul className="relative divide-y divide-line/70 rounded-md border border-line bg-paper/75 backdrop-blur-sm" onPointerLeave={() => setActive(undefined)}>
      {pages.map((page, index) => {
        const Icon = ICONS[page.icon]
        const current = index === active
        const inner = (
          <>
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors sm:h-11 sm:w-11",
                current ? "border-klein bg-klein text-paper" : "border-line bg-ground/60 text-klein",
              )}
            >
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[19px] font-medium tracking-[-0.02em] text-klein">
                {page.title}
                {page.badge}
              </span>
              <span className="mt-0.5 block text-[14px] leading-[1.5] text-muted">{page.summary}</span>
              {page.glimpse && <span className="mt-2 block sm:hidden">{page.glimpse}</span>}
            </span>
            {page.glimpse && <span className="hidden w-60 shrink-0 justify-end text-right sm:flex">{page.glimpse}</span>}
            {page.away ? (
              <ArrowUpRight aria-hidden className={cn("h-4 w-4 shrink-0 transition-colors", current ? "text-klein" : "text-muted")} />
            ) : (
              <ArrowRight
                aria-hidden
                className={cn("h-4 w-4 shrink-0 transition-all", current ? "translate-x-0.5 text-klein" : "-translate-x-1 text-muted opacity-0")}
              />
            )}
          </>
        )
        const className = "flex items-center gap-4 px-4 py-4 outline-none transition-colors hover:bg-paper focus-visible:bg-paper sm:px-5"
        const events = { onPointerEnter: () => setActive(index), onFocus: () => setActive(index), onBlur: () => setActive(undefined) }
        return (
          <li key={page.href} className="relative first:[&>a]:rounded-t-md last:[&>a]:rounded-b-md">
            {current && (
              <motion.span
                layoutId="page-list-marker"
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="absolute -left-[7px] top-1/2 -mt-[6px] block"
              >
                <GameIcon game={game} />
              </motion.span>
            )}
            {page.away ? (
              <a href={page.href} className={className} {...events} {...(page.href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}>
                {inner}
              </a>
            ) : (
              <Link href={page.href} className={className} {...events}>
                {inner}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
