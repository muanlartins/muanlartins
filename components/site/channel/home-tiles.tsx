"use client"

import { Crown } from "lucide-react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { useNow } from "@/components/site/lives/agenda"
import { useTorcedor } from "@/components/site/channel/fan-stand"
import { FanView } from "@/components/site/profile/fan-view"
import { Skeleton } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { clock, daysFrom, weekdayOf } from "@/lib/agenda"
import type { TopFan } from "@/lib/home-build"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize(channel)

/**
 * The agenda's tile: the next seven days (five on phones) from the viewer's today, a live's day filled Klein with its start, the
 * others pale with "–". From the agenda the page already has (the build's, then the browser's).
 */
export function AgendaDays() {
  const { agenda, fresh } = useAgenda()
  const now = useNow()
  const days = agenda && now ? daysFrom(agenda, now, 7) : null
  if (now && fresh && !agenda) return <p className="p-4 text-[13px] leading-[1.5] text-loss">{T.next.error}</p>
  return (
    <ol className="absolute inset-0 grid grid-cols-5 gap-1.5 p-3 sm:grid-cols-7 sm:p-4 [&>li:nth-child(n+6)]:max-sm:hidden">
      {days
        ? days.map((day, i) => {
            const live = day.lives[0]
            return (
              <li
                key={day.data}
                className={cn("cut-sm flex min-w-0 flex-col items-center justify-center gap-0.5 text-center", live ? "bg-klein text-paper" : "bg-klein/[0.07] text-muted")}
              >
                <span className="text-[12px] font-medium">{i === 0 ? T.lives.agenda.today : weekdayOf(day.data)}</span>
                <span className={cn("text-[15px] font-semibold tabular-nums", !live && "text-ink")}>{day.data.slice(8)}</span>
                <span className="text-[12px] tabular-nums">{live ? clock(live.start) : "–"}</span>
              </li>
            )
          })
        : Array.from({ length: 7 }, (_, i) => (
            <li key={i}>
              <Skeleton className="cut-sm h-full" />
            </li>
          ))}
    </ol>
  )
}

// On screen left to right: second, first, third; each step shorter than the first's.
const PLACES = [
  { at: 1, step: "h-7" },
  { at: 0, step: "h-10" },
  { at: 2, step: "h-5" },
]

/**
 * The mural's tile: the audience's podium, the three with the most Σ standing as their fans on its steps, names over
 * them where there's room. From the build (`topFans`); without it, the steps alone.
 */
export function Podium({ top }: { top: TopFan[] }) {
  const kit = useTorcedor()
  return (
    <ol className="absolute inset-x-6 bottom-0 grid grid-cols-3 items-end gap-2 sm:inset-x-10 sm:gap-3">
      {PLACES.map(({ at, step }) => {
        const p = top[at]
        return (
          <li key={at} className="flex min-w-0 flex-col items-center">
            {p && (
              <span className="mb-1.5 flex max-w-full items-center gap-1 bg-navy/80 px-1.5 py-px text-[12px] font-medium text-paper">
                {at === 0 && <Crown aria-hidden className="h-3 w-3 shrink-0 text-ouro" />}
                <span className="truncate">{p.login}</span>
              </span>
            )}
            <div className="h-[45px] w-[30px]">{p && kit && <FanView T={kit} fan={kit.normalizar(p.fan, p.login)} className="h-full w-full" />}</div>
            <span className={cn("flex w-full justify-center bg-paper pt-1 text-[15px] font-semibold leading-none text-klein tabular-nums", step)}>{at + 1}</span>
          </li>
        )
      })}
    </ol>
  )
}
