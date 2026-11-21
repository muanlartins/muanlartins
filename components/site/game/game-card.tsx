import { ArrowRight, ArrowUpRight, Gamepad2 } from "lucide-react"
import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import { GameCover } from "@/components/site/diversos/game-cover"
import { GameIcon } from "@/components/site/game/game-icon"
import { buttonClass, CardLink, cardClass, Lattice } from "@/components/site/ui"
import type { OtherGame } from "@/lib/diversos"
import { cn } from "@/lib/utils"

/*
 * The game kit's card (brand/interface.md, "The game kit"): a game's tile on the content list (`GameRow`) and on the
 * channel's home (`GameTile`), with something of the game drawn on it, picked by the game's id in `ARTS`: the two
 * pages draw the same art, so they never drift. Drawn in the brand's own colours; the game shows in its objects.
 */

/** Rocket League: an aerial into the goal. The car flies on its boost (the two streaks), the ball heads for the top corner, the boost meter full. */
function RocketLeagueArt() {
  return (
    <>
      <Lattice />
      <svg viewBox="0 0 200 128" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        {/* The pitch, past the drawing's edges on wide cards. */}
        <rect x="-200" y="110" width="600" height="40" className="fill-navy/45" />
        <line x1="-200" y1="110" x2="400" y2="110" className="stroke-klein-claro/70" strokeWidth="1" />
        {/* The goal, its net the lattice. */}
        <defs>
          <pattern id="rl-net" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0V6M0 0H6" className="stroke-paper/35" strokeWidth="0.8" />
          </pattern>
        </defs>
        <path d="M158 110V48h34l8 8v54" className="fill-navy/55" />
        <path d="M158 110V48h34l8 8v54" fill="url(#rl-net)" />
        <path d="M158 110V48h34l8 8" fill="none" className="stroke-paper" strokeWidth="2.5" />
        {/* The ball's path, then the ball with its panels. */}
        {[0.1, 0.17, 0.26].map((opacity, i) => (
          <circle key={i} cx={118 + i * 7} cy={52 - i * 4} r="12" className="fill-klein-claro" opacity={opacity} />
        ))}
        <g transform="translate(144 38)">
          <circle r="12.5" className="fill-paper stroke-navy" strokeWidth="1.5" />
          <path d="M0-6.6 6.3-2.1 3.9 5.4H-3.9L-6.3-2.1Z" className="fill-klein" />
          <path d="M0-6.6V-12.4M6.3-2.1 11.8-3.9M3.9 5.4 7.3 10M-3.9 5.4-7.3 10M-6.3-2.1-11.8-3.9" className="stroke-klein" strokeWidth="1.3" />
        </g>
        {/* The car (an Octane, side on) nose up, on its boost. */}
        <g transform="translate(86 80) rotate(-30) scale(1.3)">
          <path d="M-21-10-72-10-21-5Z" className="fill-paper" opacity="0.9" />
          <path d="M-21-5-88-2-21 0Z" className="fill-klein-claro" />
          {[-36, -50, -64].map((x, i) => (
            <rect key={x} x={x} y={i % 2 ? -14 : 3} width="2.5" height="2.5" className="fill-paper" opacity={0.75 - i * 0.2} />
          ))}
          <path d="M-20-2-19-9-7-11 1-16H10L16-10 21-7V-2Z" className="fill-paper stroke-navy" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M2-14H9L13-10H-1Z" className="fill-navy" />
          <path d="M-19-9-22-15H-12L-14-9.5" className="fill-paper stroke-navy" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="-11" cy="0" r="5.5" className="fill-navy stroke-paper" strokeWidth="1.2" />
          <circle cx="12" cy="0" r="5" className="fill-navy stroke-paper" strokeWidth="1.2" />
          <circle cx="-11" cy="0" r="1.6" className="fill-klein-claro" />
          <circle cx="12" cy="0" r="1.5" className="fill-klein-claro" />
        </g>
        {/* The boost meter, full, as the game's corner shows it. */}
        <g transform="translate(28 30)">
          <circle r="17" fill="none" className="stroke-klein-claro/30" strokeWidth="3.5" />
          <circle r="17" fill="none" className="stroke-paper" strokeWidth="3.5" pathLength="100" strokeDasharray="75 100" transform="rotate(135)" />
          <text y="4.5" textAnchor="middle" className="fill-paper text-[12px] font-semibold">
            100
          </text>
        </g>
      </svg>
    </>
  )
}

/** A sharp diamond, Valorant's own shape: the range's target. */
function Diamond({ x, y, size, className }: { x: number; y: number; size: number; className?: string }) {
  return <path d={`M${x} ${y - size}L${x + size} ${y}L${x} ${y + size}L${x - size} ${y}Z`} className={className} />
}

/** Valorant: the round's bar on top (7, the planted spike, 5), and the range's diamonds with the crosshair on one and another just hit. */
function ValorantArt() {
  return (
    <>
      <Lattice />
      <svg viewBox="0 0 200 128" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        {/* The round's bar: our score, the spike planted in place of the clock, theirs. */}
        <g className="text-[12px] font-semibold">
          <path d="M70 8h18v18H74l-4-4Z" className="fill-klein-claro" />
          <text x="79" y="21" textAnchor="middle" className="fill-navy">
            7
          </text>
          <path d="M91 8h18v18H91Z" className="fill-navy stroke-klein-claro/60" strokeWidth="1" />
          <path d="M100 11.5 105 17 100 22.5 95 17Z" className="fill-paper" />
          <path d="M112 8h14l4 4v14h-18Z" className="fill-paper" />
          <text x="121" y="21" textAnchor="middle" className="fill-navy">
            5
          </text>
        </g>
        {/* Targets: one far, one just hit (its burst), the one under the crosshair. */}
        <Diamond x={44} y={84} size={7} className="fill-klein stroke-paper/80" />
        <g opacity="0.9">
          <Diamond x={150} y={58} size={9} className="fill-none stroke-klein-claro" />
          <Diamond x={150} y={58} size={15} className="fill-none stroke-klein-claro/40" />
        </g>
        <Diamond x={100} y={76} size={17} className="fill-klein stroke-paper" />
        <Diamond x={100} y={76} size={5} className="fill-paper" />
        {/* The crosshair, Branco as on the game's dark. */}
        <g className="stroke-navy" strokeWidth="5" strokeLinecap="square">
          <path d="M100 52v10M100 90v10M76 76h10M114 76h10" />
        </g>
        <g className="stroke-paper" strokeWidth="2.5">
          <path d="M100 52v10M100 90v10M76 76h10M114 76h10" />
        </g>
        <text x="186" y="116" textAnchor="end" className="fill-paper text-[13px] font-semibold">
          312 ms
        </text>
      </svg>
    </>
  )
}

/** The other games: their Twitch box arts on the shelf, and empty places for the next ones. */
function DiversosArt({ games }: { games: OtherGame[] }) {
  const shown = games.slice(0, 3)
  const empty = Math.max(0, 3 - shown.length)
  return (
    <>
      <Lattice />
      {/* Sized by the box (container units), so three covers fit any card's shape. */}
      <span className="absolute inset-0 [container-type:size]">
        <span className="flex h-full items-center justify-center gap-[4cqw]">
          {shown.map((game) => (
            <GameCover key={game.id} game={game} className="h-[min(76cqh,37cqw)] w-[min(57cqh,27.75cqw)]" />
          ))}
          {Array.from({ length: empty }, (_, i) => (
            <span key={i} className="cut-sm grid h-[min(76cqh,37cqw)] w-[min(57cqh,27.75cqw)] shrink-0 place-items-center border border-dashed border-klein-claro/60 text-klein-claro/80">
              <Gamepad2 className="h-6 w-6" strokeWidth={1.75} />
            </span>
          ))}
        </span>
      </span>
    </>
  )
}

/** Each game's art and the ground it's drawn on. */
const ARTS: Record<string, { Art: ComponentType<{ games: OtherGame[] }>; ground: string }> = {
  "rocket-league": { Art: RocketLeagueArt, ground: "bg-klein" },
  valorant: { Art: ValorantArt, ground: "bg-navy" },
  diversos: { Art: DiversosArt, ground: "bg-klein" },
}

/** The art box of a game's card: decorative, the card's title and line say it. `games` are the other games, for "diversos". */
export function GameArt({ game, games = [], className }: { game: string; games?: OtherGame[]; className?: string }) {
  const { Art, ground } = ARTS[game] ?? ARTS.diversos
  return (
    <div aria-hidden className={cn("cut relative overflow-hidden", ground, className)}>
      <Art games={games} />
    </div>
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
