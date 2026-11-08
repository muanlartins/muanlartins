"use client"

import { ArrowUpRight } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Crosshair } from "@/components/site/game/crosshair"
import { cn } from "@/lib/utils"

export interface MenuItem {
  label: string
  href: string
  /** Lives elsewhere: another app or YouTube. */
  away?: boolean
}

/** Another game to switch to, with its own pages' addresses. */
export interface OtherGame {
  title: string
  home: string
  pages: string[]
}

/**
 * A game's pages. Wide screens get a column in the left margin that follows
 * the page down, with a ball (Valorant: a crosshair) moving to the page being
 * read; narrower ones a row of tabs above it. A page under another counts as
 * that one's (a live as the lives'), and topic pages as the roadmap's.
 * With `games`, the games are one click apart, landing on the same page in
 * the other game when it has one (Fundamentals → Fundamentals).
 */
export function GameMenu({
  title,
  home,
  items,
  look,
  games = [],
}: {
  title: string
  home: string
  items: MenuItem[]
  /** Whose marker: a game's id. */
  look?: string
  games?: OtherGame[]
}) {
  const pathname = usePathname().replace(/\/$/, "")
  const own = items.filter((item) => !item.away)
  const active =
    own.find((item) => item.href === pathname) ??
    own.find((item) => item.href !== home && pathname.startsWith(`${item.href}/`)) ??
    (pathname.startsWith(`${home}/`) ? own.find((item) => item.href.endsWith("/fundamentals")) : undefined)
  const page = active ? active.href.slice(home.length) : ""
  const switchTo = (game: OtherGame) => (game.pages.includes(`${game.home}${page}`) ? `${game.home}${page}` : game.home)

  return (
    <>
      <aside className="absolute right-full top-0 mr-16 hidden h-full w-44 xl:block">
        <nav className="sticky top-32">
          <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{title}</p>
          {games.length > 0 && (
            <ul className="-mt-2 mb-5 space-y-1">
              {games.map((game) => (
                <li key={game.home}>
                  <Link
                    href={switchTo(game)}
                    className="text-[13px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-klein hover:decoration-klein"
                  >
                    {game.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <ul className="space-y-1 border-l border-line">
            {items.map((item) => {
              const current = item === active
              return (
                <li key={item.href} className="relative">
                  {current && (
                    <motion.span
                      layoutId="game-menu-ball"
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      className="absolute -left-[7px] top-1/2 -mt-[6px] block"
                    >
                      {look === "valorant" ? <Crosshair /> : <Ball />}
                    </motion.span>
                  )}
                  <MenuLink
                    item={item}
                    className={cn(
                      "flex items-center gap-1.5 py-1.5 pl-5 text-[15px] transition-colors",
                      current ? "font-medium text-klein" : "text-muted hover:text-ink",
                    )}
                  />
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {games.length > 0 && (
        <p className="-mt-10 mb-3 flex flex-wrap items-baseline gap-x-3 text-[13px] xl:hidden">
          <span className="font-medium text-klein">{title}</span>
          {games.map((game) => (
            <Link key={game.home} href={switchTo(game)} className="text-muted underline decoration-line underline-offset-4 hover:text-klein">
              {game.title}
            </Link>
          ))}
        </p>
      )}
      <nav className={cn("mb-12 flex flex-wrap gap-2 xl:hidden", games.length === 0 && "-mt-10")}>
        {items.map((item) => (
          <MenuLink
            key={item.href}
            item={item}
            className={cn(
              "flex items-center gap-1 rounded-md border px-3 py-1.5 text-[14px] transition-colors",
              item === active ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein",
            )}
          />
        ))}
      </nav>
    </>
  )
}

function MenuLink({ item, className }: { item: MenuItem; className: string }) {
  if (item.away) {
    return (
      <a href={item.href} className={className} {...(item.href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}>
        {item.label}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
      </a>
    )
  }
  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  )
}

/** A tiny ball: Klein, with the panel seams of the real one. */
function Ball() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
      <circle cx="6" cy="6" r="5.25" className="fill-paper stroke-klein" strokeWidth="1.5" />
      <path d="M6 3.2 8.4 4.9 7.5 7.7H4.5L3.6 4.9Z" className="fill-klein" />
    </svg>
  )
}
