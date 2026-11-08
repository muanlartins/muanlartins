import { Crosshair } from "@/components/site/game/crosshair"
import type { Rank } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({ me: { pt: "Eu", en: "Me" } })

/**
 * A game's ranks from the lowest, each by its first emblem, with Luan's lit and marked by the crosshair: where the
 * learning starts. The others are greyed, so the climb ahead reads at a glance.
 */
export function Ladder({
  ranks,
  current,
  className,
}: {
  ranks: Rank[]
  /** Luan's rank's id; none marks nobody. */ current?: string
  className?: string
}) {
  const at = ranks.findIndex((rank) => rank.id === current)
  return (
    <ol className={cn("grid grid-cols-5 gap-x-2 gap-y-6 sm:grid-cols-10", className)}>
      {ranks.map((rank, index) => {
        const mine = index === at
        return (
          <li key={rank.id} className="flex flex-col items-center gap-1.5 text-center">
            <span className="flex h-4 items-end">{mine && <Crosshair size={14} />}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rank.icons?.[0]}
              alt=""
              className={
                mine
                  ? "h-12 w-12 object-contain drop-shadow-[0_4px_10px_rgba(0,20,71,0.25)] sm:h-14 sm:w-14"
                  : "h-9 w-9 object-contain opacity-50 grayscale sm:h-10 sm:w-10"
              }
            />
            <span
              className={mine ? "text-[13px] font-medium" : "text-[11px] text-muted"}
              style={mine ? { color: rank.color } : undefined}
            >
              {localize(rank.name)}
            </span>
            {mine && <span className="sr-only">{T.me}</span>}
          </li>
        )
      })}
    </ol>
  )
}
