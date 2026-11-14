"use client"

import { useAgenda } from "@/components/site/agenda/agenda-context"
import { useNow } from "@/components/site/lives/agenda"
import { liveText, nextOf } from "@/lib/agenda"

/** A game's next live in a line ("sáb 21/11, 15h"), from the agenda as the API has it now; nothing without one. */
export function GameNext({ game, className, as: Tag = "span", prefix = "", suffix = "" }: { game: string; className?: string; as?: "span" | "p"; prefix?: string; suffix?: string }) {
  const { agenda } = useAgenda()
  const now = useNow()
  const live = agenda && now ? nextOf(agenda, game, now) : null
  if (!live) return null
  return (
    <Tag className={className}>
      {prefix}
      <span className="capitalize">{liveText(live)}</span>
      {suffix}
    </Tag>
  )
}
