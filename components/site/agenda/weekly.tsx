"use client"

import { useAgenda } from "@/components/site/agenda/agenda-context"
import { gameName } from "@/components/site/lives/agenda"
import { channel } from "@/content/channel"
import { slotText } from "@/lib/agenda"
import { localize } from "@/lib/site"

const T = localize(channel.agenda)

/** The lives that repeat every week, each with its game and title. */
export function Weekly() {
  const { agenda } = useAgenda()
  if (!agenda?.slots.length) return null
  const slots = [...agenda.slots].sort((a, b) => Math.min(...a.days) - Math.min(...b.days) || a.start.localeCompare(b.start))
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{T.weekly}</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {slots.map((slot) => (
          <li key={`${slot.days.join("")}-${slot.start}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
            <span className="text-[15px] font-medium tabular-nums text-ink first-letter:uppercase">{slotText(slot)}</span>
            <span className="text-[14px] text-muted">
              {gameName(agenda, slot.game)} · {slot.title || agenda.games[slot.game]?.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
