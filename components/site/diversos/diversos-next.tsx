"use client"

import type { ReactNode } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { useNow } from "@/components/site/lives/agenda"
import { Skeleton } from "@/components/site/ui"
import { liveText, occurrences } from "@/lib/agenda"
import { cn } from "@/lib/utils"

/**
 * The next live of another game in the agenda, in a line ("sáb 22/11, 21h · Celeste"): any game but the site's own
 * (`main`), or one game, matched by its Twitch category (the agenda's games are Twitch categories). `fallback` when
 * there's none; a line-shaped skeleton until the browser knows the time.
 */
export function DiversosNext({
  main,
  categoryId,
  name,
  prefix = "",
  suffix = "",
  fallback = null,
  className,
}: {
  /** The site's own games' ids (content/projects.ts): their lives aren't these. */
  main: string[]
  /** Only this game's: its Twitch category's id, or else its name. */
  categoryId?: string
  name?: string
  prefix?: string
  suffix?: string
  fallback?: ReactNode
  className?: string
}) {
  const { agenda } = useAgenda()
  const now = useNow()
  if (!now) return <Skeleton className={cn("h-[1.25em] w-40", className)} />
  const one = categoryId || name
  const live =
    agenda &&
    occurrences(agenda, now, 42).find(
      (live) =>
        !main.includes(live.jogo) &&
        Date.parse(live.fim) > +now &&
        (!one || (categoryId ? live.categoria === categoryId : live.nome.toLowerCase() === name!.toLowerCase())),
    )
  if (!live) return fallback ? <span className={className}>{fallback}</span> : null
  return (
    <span className={className}>
      {prefix}
      <span className="capitalize">{liveText(live)}</span>
      {!one && ` · ${live.nome}`}
      {suffix}
    </span>
  )
}
