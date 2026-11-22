"use client"

import { ArrowRight, ArrowUpRight, Clapperboard, Link2, Route, Swords, Target, Trophy, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import { GameMarker } from "@/components/site/game/game-icon"
import { cardClass } from "@/components/site/ui"
import { cn } from "@/lib/utils"

/** The pages' icons, the same as the menu's (game-menu.tsx). */
const ICONS = { fundamentals: Route, ranked: Trophy, aim: Target, inventory: Swords, lives: Clapperboard, link: Link2 } satisfies Record<string, LucideIcon>

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
 * A game's pages on its home, drawn like its menu: one card, each page a row with its icon, a line about it and a
 * glimpse of what's inside on the right. The game's marker (the kit's: the ball, the crosshair) slides down the
 * card's left edge to the row being pointed at, as it does in the menu to the page being read. The card's ground is
 * cut behind the rows (a layer of its own), so the marker can sit on its edge without being clipped.
 */
export function PageList({ pages, game }: { pages: PageEntry[]; game: string }) {
  const [active, setActive] = useState<number>()
  return (
    <div className="relative">
      <span aria-hidden className={cn(cardClass, "absolute inset-0")} />
      <ul className="relative divide-y divide-line" onPointerLeave={() => setActive(undefined)}>
        {pages.map((page, index) => {
          const Icon = ICONS[page.icon]
          const current = index === active
          const inner = (
            <>
              <span
                className={cn(
                  "cut-sm flex h-10 w-10 shrink-0 items-center justify-center transition-colors sm:h-11 sm:w-11",
                  current ? "bg-klein text-paper" : "bg-klein/[0.07] text-klein",
                )}
              >
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-medium tracking-[-0.02em] text-klein">
                  {page.title}
                  {page.badge}
                </span>
                <span className="mt-1 block max-w-[30rem] text-[15px] leading-[1.5] text-muted">{page.summary}</span>
                {page.glimpse && <span className="mt-2.5 block sm:hidden">{page.glimpse}</span>}
              </span>
              {page.glimpse && <span className="hidden w-56 shrink-0 justify-end text-right sm:flex">{page.glimpse}</span>}
              {page.away ? (
                <ArrowUpRight aria-hidden className={cn("h-4 w-4 shrink-0 transition-colors", current ? "text-klein" : "text-muted")} />
              ) : (
                <ArrowRight aria-hidden className={cn("h-4 w-4 shrink-0 transition-all max-sm:hidden", current ? "translate-x-0.5 text-klein" : "-translate-x-1 text-muted opacity-0")} />
              )}
            </>
          )
          // A row is cut like the card, so its hover ground and its focus ring follow the corners.
          const className = "cut flex items-center gap-4 px-4 py-4 transition-colors hover:bg-paper focus-visible:bg-paper sm:px-5"
          const events = { onPointerEnter: () => setActive(index), onFocus: () => setActive(index), onBlur: () => setActive(undefined) }
          return (
            <li key={page.href} className="relative">
              {current && (
                <motion.span
                  layoutId={`page-list-marker-${game}`}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="absolute -left-[7px] top-1/2 z-10 -mt-[6px] block"
                >
                  <GameMarker game={game} />
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
    </div>
  )
}
