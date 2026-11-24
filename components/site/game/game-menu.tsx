"use client"

import { ArrowUpRight, CalendarDays, Clapperboard, Gamepad2, Heart, House, MessagesSquare, Milestone, Orbit, QrCode, Route, Sigma, Swords, Target, Trophy, UserRound, Wrench, type LucideIcon } from "lucide-react"
import { animate, motion, useMotionValue } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useLayoutEffect, useRef } from "react"
import { GameMarker } from "@/components/site/game/game-icon"
import { cn } from "@/lib/utils"

export interface MenuItem {
  label: string
  href: string
  /** Lives elsewhere: another app or YouTube. */
  away?: boolean
  /** Its icon, by name (the menu is drawn in the browser, so it gets a name, not the icon). */
  icon?: keyof typeof ICONS
}

/** Where each menu's ball last stood: the menu is drawn again on every page, and the ball moves on from there. */
const lastBall = new Map<string, number>()

/** The menus' icons. */
const ICONS = {
  home: House,
  fundamentals: Route,
  ranked: Trophy,
  aim: Target,
  inventory: Swords,
  universo: Orbit,
  lives: Clapperboard,
  agenda: CalendarDays,
  commands: MessagesSquare,
  minigames: Gamepad2,
  game: Gamepad2,
  pix: QrCode,
  mural: Heart,
  profile: UserRound,
  sigma: Sigma,
  backstage: Wrench,
  roadmap: Milestone,
} satisfies Record<string, LucideIcon>

/** Another game to switch to, with its own pages' addresses. */
export interface OtherGame {
  title: string
  home: string
  pages: string[]
}

/**
 * A game's pages. Wide screens get a column in the left margin that follows
 * the page down, with a ball (Valorant: a crosshair; the other games: a gamepad) moving to the page being
 * read; narrower ones a single row above it that scrolls sideways, the page being read kept in view (ten pages
 * wrapping into four rows of chips buried the title on phones). A page under another counts as
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
  alias,
}: {
  title: string
  home: string
  items: MenuItem[]
  /** Whose marker: a game's id. */
  look?: string
  games?: OtherGame[]
  /** Another address of the home page (the channel's /canal, the same page as the site's home). */
  alias?: string
}) {
  const path = usePathname().replace(/\/$/, "") || "/"
  const pathname = path === alias ? home : path
  const own = items.filter((item) => !item.away)
  const active =
    own.find((item) => item.href === pathname) ??
    own.find((item) => item.href !== home && pathname.startsWith(`${item.href}/`)) ??
    (home !== "/" && pathname.startsWith(`${home}/`) ? own.find((item) => item.href.endsWith("/fundamentals")) : undefined)
  const page = active ? active.href.slice(home.length) : ""
  const switchTo = (game: OtherGame) => (game.pages.includes(`${game.home}${page}`) ? `${game.home}${page}` : game.home)
  // The ball moves to the page being read, measured inside the list: a page-wide measure broke on long pages, where
  // the new page opens at its top while the old was scrolled down, and the ball flew in from below the fold.
  const list = useRef<HTMLUListElement>(null)
  const ball = useRef<HTMLSpanElement>(null)
  const ballY = useMotionValue(0)
  useLayoutEffect(() => {
    const here = list.current?.querySelector<HTMLElement>("[data-current]")
    if (!here || !ball.current) return
    const to = here.offsetTop + here.offsetHeight / 2 - 6
    const from = lastBall.get(home)
    lastBall.set(home, to)
    ball.current.style.visibility = "visible"
    if (from === undefined || from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ballY.set(to)
      return
    }
    ballY.set(from)
    const moving = animate(ballY, to, { type: "spring", stiffness: 260, damping: 24 })
    return () => moving.stop()
  }, [active, home, ballY])
  const strip = useRef<HTMLElement>(null)
  useEffect(() => {
    const row = strip.current
    const here = row?.querySelector<HTMLElement>('[aria-current="page"]')
    if (row && here) row.scrollLeft = here.offsetLeft - (row.clientWidth - here.offsetWidth) / 2
  }, [active])

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
          <ul ref={list} className="relative space-y-1 border-l border-line">
            {active && (
              <motion.span ref={ball} style={{ y: ballY, visibility: "hidden" }} className="pointer-events-none absolute -left-[7px] top-0 block">
                <GameMarker game={look ?? "rocket-league"} />
              </motion.span>
            )}
            {items.map((item) => {
              const current = item === active
              return (
                <li key={item.href} data-current={current || undefined} className="relative">
                  <MenuLink
                    item={item}
                    current={current}
                    className={cn(
                      "flex items-center gap-2 py-1.5 pl-5 text-[15px] transition-colors",
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
      <nav
        ref={strip}
        className={cn(
          "relative -mx-6 mb-12 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] xl:hidden [&::-webkit-scrollbar]:hidden",
          "[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]",
          games.length === 0 && "-mt-10",
        )}
      >
        {items.map((item) => (
          <MenuLink
            key={item.href}
            item={item}
            current={item === active}
            className={cn(
              "cut-sm cut-edge relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border px-3 py-1.5 text-[14px] transition-colors",
              item === active ? "border-klein bg-klein text-paper" : "border-line-strong text-ink hover:border-klein",
            )}
          />
        ))}
      </nav>
    </>
  )
}

function MenuLink({ item, className, current = false }: { item: MenuItem; className: string; current?: boolean }) {
  const Icon = item.icon && ICONS[item.icon]
  const icon = Icon && <Icon aria-hidden className="h-4 w-4 shrink-0 opacity-75" />
  if (item.away) {
    return (
      <a href={item.href} className={className} {...(item.href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}>
        {item.label}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
      </a>
    )
  }
  return (
    <Link href={item.href} className={className} aria-current={current ? "page" : undefined}>
      {icon}
      {item.label}
    </Link>
  )
}

