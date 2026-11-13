"use client"

import { useAgenda } from "@/components/site/agenda/agenda-context"
import { slotsOf, slotText } from "@/lib/agenda"

/** When a game is live every week, a line per slot ("seg e qua, 21h–23h"), from the agenda as the API has it now. */
export function GameSlots({ game, className, as: Tag = "span", prefix = "", suffix = "" }: { game: string; className?: string; as?: "span" | "p"; prefix?: string; suffix?: string }) {
  const { agenda } = useAgenda()
  if (!agenda) return null
  return slotsOf(agenda, game).map((slot) => (
    <Tag key={`${slot.days.join("")}-${slot.start}`} className={className}>
      {prefix}
      {slotText(slot)}
      {suffix}
    </Tag>
  ))
}
