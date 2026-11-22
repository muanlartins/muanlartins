import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { GamePicture } from "@/components/site/diversos/game-picture"
import { GameIcon } from "@/components/site/game/game-icon"
import { buttonClass, CardLink, cardClass, Lattice } from "@/components/site/ui"
import { EPIC_NOTICE, RIOT_NOTICE } from "@/content/notices"
import type { OtherGame } from "@/lib/diversos"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const CREDITS = localize({
  pt: "Artes oficiais dos jogos: Psyonix/Epic Games (Rocket League), Riot Games (Valorant) e Maddy Makes Games (Celeste).",
  en: "The games' official art: Psyonix/Epic Games (Rocket League), Riot Games (Valorant) and Maddy Makes Games (Celeste).",
})

/*
 * The game kit's card (brand/interface.md, "The game kit"): a game's tile on the content list (`GameRow`) and on the
 * channel's home (`GameTile`), with the game's official art, never a drawing of ours (Luan, 2026-11-21) and never its
 * logo (Riot's policy), picked by the game's id in `ARTS`: the two pages show the same art, so they never drift. The
 * makers' notices go wherever the cards do (`GameArtCredits`).
 */

/**
 * The main games' art, cropped clear of the logos, and where it's held when the box crops it further: Rocket League's
 * from its Steam library hero, Valorant's from playvalorant.com's hero.
 */
const ARTS: Record<string, { src: string; position: string }> = {
  "rocket-league": { src: "/jogos/rocket-league.webp", position: "50% 55%" },
  valorant: { src: "/jogos/valorant.webp", position: "50% 22%" },
}

/** The art box of a game's card: decorative, the card's title and line say it. `games` are the other games, for "diversos", up to three side by side. */
export function GameArt({ game, games = [], className }: { game: string; games?: OtherGame[]; className?: string }) {
  const art = ARTS[game]
  return (
    <div aria-hidden className={cn("cut relative overflow-hidden bg-klein", className)}>
      <Lattice />
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: art.position }} />
      ) : (
        <span className="absolute inset-0 flex">
          {games.slice(0, 3).map((each) => (
            <GamePicture key={each.id} game={each} className="h-full min-w-0 flex-1" />
          ))}
        </span>
      )}
    </div>
  )
}

/** The notices the games' makers ask for beside their art: Epic's and Riot's in their own words, in the site's language. */
export function GameArtCredits({ className }: { className?: string }) {
  return (
    <p className={cn("text-[12px] leading-[1.6] text-muted", className)}>
      {CREDITS} {localize(EPIC_NOTICE)} {localize(RIOT_NOTICE)}
    </p>
  )
}

/** A game on the channel's home: its art, its sign and name, its next live. The whole card links its home; on phones a row, the art beside. */
export function GameTile({ game, games, href, title, line }: { game: string; games?: OtherGame[]; href: string; title: string; line: ReactNode }) {
  return (
    <CardLink href={href} className="flex h-full items-center gap-4 sm:flex-col sm:items-stretch">
      <GameArt game={game} games={games} className="h-20 w-28 shrink-0 sm:h-32 sm:w-auto" />
      <div className="min-w-0 space-y-1">
        <h3 className="flex items-center gap-2 text-xl font-medium tracking-[-0.02em] text-klein">
          <GameIcon game={game} size={16} className="block shrink-0" />
          {title}
        </h3>
        <div className="min-h-5 text-[13px] leading-[1.5] text-muted">{line}</div>
      </div>
    </CardLink>
  )
}

export interface GamePageLink {
  label: string
  href: string
  icon?: ReactNode
  /** Lives outside these pages (RLR, YouTube): a plain link with ↗, in a new tab when it's another site. */
  away?: boolean
}

/**
 * A game on the content list: its art, then its name (an h2 that links its home, over the whole card), its line, its
 * next live and its pages one click away, as buttons above the card's link.
 */
export function GameRow({
  game,
  games,
  href,
  title,
  badge,
  description,
  next,
  pages,
  label,
}: {
  game: string
  games?: OtherGame[]
  href: string
  title: string
  badge?: ReactNode
  description: string
  next: ReactNode
  pages: GamePageLink[]
  /** The pages' list, named for screen readers ("Páginas do Valorant"). */
  label: string
}) {
  return (
    <article className={cn(cardClass, "group flex flex-col gap-5 p-5 transition-colors hover:border-klein sm:flex-row")}>
      <GameArt game={game} games={games} className="h-36 shrink-0 sm:h-auto sm:min-h-44 sm:w-60" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-medium tracking-[-0.02em] text-klein">
            <Link href={href} className="after:absolute after:inset-0">
              {title}
            </Link>
            {badge}
          </h2>
          <ArrowRight aria-hidden className="mt-1.5 h-5 w-5 shrink-0 text-muted transition-all group-hover:translate-x-0.5 group-hover:text-klein" />
        </div>
        <p className="mt-2 max-w-[34rem] text-[15px] leading-[1.6] text-ink">{description}</p>
        <div className="mt-2 text-[13px] leading-[1.5] text-muted">{next}</div>
        {pages.length > 0 && (
          <nav aria-label={label} className="relative z-10 mt-4 flex flex-wrap gap-2">
            {pages.map((page) =>
              page.away ? (
                <a
                  key={page.href}
                  href={page.href}
                  {...(page.href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  {page.icon}
                  {page.label}
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5 opacity-60" />
                </a>
              ) : (
                <Link key={page.href} href={page.href} className={buttonClass({ variant: "secondary", size: "sm" })}>
                  {page.icon}
                  {page.label}
                </Link>
              ),
            )}
          </nav>
        )}
      </div>
    </article>
  )
}
