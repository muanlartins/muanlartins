import { GameMarker } from "@/components/site/game/game-icon"
import type { Rank } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({ me: { pt: "Eu estou aqui", en: "I'm here" } })

/**
 * A game's ranks in one row from the lowest, each by its first emblem, with Luan's lit and marked by the game's
 * marker (the kit's: the ball, the crosshair): where the learning stands. The others are greyed, so the climb ahead
 * reads at a glance. Every name shows from 640 px; on phones only Luan's, the others named for screen readers.
 */
export function Ladder({
  game = "valorant",
  ranks,
  current,
  className,
}: {
  /** Whose marker: the game's id (Valorant's crosshair when none is given, as before the kit). */
  game?: string
  ranks: Rank[]
  /** Luan's rank's id; none marks nobody. */ current?: string
  className?: string
}) {
  const at = ranks.findIndex((rank) => rank.id === current)
  return (
    <ol className={cn("flex items-start justify-between gap-1", className)}>
      {ranks.map((rank, index) => {
        const mine = index === at
        return (
          <li key={rank.id} aria-current={mine ? "step" : undefined} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
            <span className="flex h-4 items-end">{mine && <GameMarker game={game} size={14} />}</span>
            <span className="flex h-12 items-center sm:h-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rank.icons?.[0]}
                alt=""
                className={
                  mine
                    ? "h-11 w-11 object-contain drop-shadow-[0_4px_10px_color-mix(in_oklab,var(--color-navy)_25%,transparent)] sm:h-14 sm:w-14"
                    : "h-7 w-7 object-contain opacity-50 grayscale sm:h-10 sm:w-10"
                }
              />
            </span>
            <span className={cn("text-[12px] leading-[1.3]", mine ? "font-medium whitespace-nowrap text-klein sm:whitespace-normal" : "text-muted max-sm:sr-only")}>
              {localize(rank.name)}
              {mine && <span className="sr-only"> · {T.me}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
