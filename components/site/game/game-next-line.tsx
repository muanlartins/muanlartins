"use client"

import { useAgenda } from "@/components/site/agenda/agenda-context"
import { useNow } from "@/components/site/lives/agenda"
import { ErrorLine, Skeleton } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { liveText, nextOf } from "@/lib/agenda"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  next: channel.games.next,
  none: channel.next.none,
  error: channel.next.error,
})

/**
 * A game's next live on its card, in a line ("Próxima live: ter 24/11, 14h30"), with every state: a line-shaped
 * skeleton until the browser knows the time, "none" when the agenda has nothing of the game, the agenda's error
 * (with a retry where the line isn't inside a link).
 */
export function GameNextLine({ game, suffix = "", retry = false, className }: { game: string; suffix?: string; retry?: boolean; className?: string }) {
  const { agenda, fresh, failed, retry: again } = useAgenda()
  const now = useNow()
  if (!now || (!agenda && !fresh)) return <Skeleton className={cn("h-[1.25em] w-44 max-w-full", className)} />
  if (!agenda && failed) return <ErrorLine onRetry={retry ? again : undefined} className={cn("text-[13px]", className)}>{T.error}</ErrorLine>
  const live = agenda && nextOf(agenda, game, now)
  if (!live) return <span className={cn("block", className)}>{T.none}</span>
  return (
    <span className={cn("block", className)}>
      {T.next}: <span className="capitalize">{liveText(live)}</span>
      {suffix}
    </span>
  )
}
