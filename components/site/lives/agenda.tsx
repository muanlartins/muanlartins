"use client"

import { CalendarPlus } from "lucide-react"
import { useSyncExternalStore } from "react"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { AGENDA, clock, nextLive, whenOf, WEEKDAYS } from "@/lib/agenda"
import { localize } from "@/lib/site"

const T = localize(channel.lives.agenda)

const gameOf = (id: string) => games.find((game) => game.id === id)

function everyMinute(listener: () => void) {
  const timer = setInterval(listener, 10_000)
  return () => clearInterval(timer)
}

/**
 * When the lives are: the week with its slots in Brasília time, then, once
 * the page knows the viewer's clock, the next live and the times in their
 * own zone when it differs.
 */
export function Agenda() {
  // The viewer's clock to the minute; unknown while prerendering.
  const minute = useSyncExternalStore(everyMinute, () => Math.floor(Date.now() / 60_000), () => undefined)
  const now = minute === undefined ? undefined : new Date(minute * 60_000)

  const weekend = !AGENDA.slots.some((slot) => slot.days.some((day) => day >= 6))

  return (
    <section id="agenda" className="scroll-mt-24">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{T.title}</h2>
      <ol className="mt-5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((name, index) => {
          const slots = AGENDA.slots.filter((slot) => slot.days.includes(index + 1))
          return (
            <li
              key={name}
              className={`flex min-h-16 flex-col justify-between gap-2 rounded-md px-1 py-2 text-center text-[11px] sm:min-h-20 sm:p-3 sm:text-left sm:text-[13px] ${
                slots.length ? "bg-klein text-paper" : "border border-dashed border-zinc-300 text-muted"
              }`}
            >
              <span className="font-medium capitalize">{name}</span>
              {slots.map((slot) => (
                <span key={slot.start} className="flex flex-col tabular-nums leading-tight">
                  <span>{clock(slot.start)}</span>
                  <span className="hidden opacity-70 sm:inline">{clock(slot.end)}</span>
                  <span title={gameOf(slot.game) && localize(gameOf(slot.game)!.title)} className="mt-1 text-[10px] font-medium tracking-[0.04em] opacity-80 sm:text-[11px]">
                    {gameOf(slot.game)?.short}
                  </span>
                </span>
              ))}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-[13px] text-muted">
        {T.zone}
        {weekend && ` · ${T.weekend}`}
      </p>
      {now && <Next now={now} />}
      <a href="/agenda.ics" className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline">
        <CalendarPlus className="h-4 w-4" />
        {T.subscribe}
      </a>
    </section>
  )
}

/** The next live from the viewer's clock, and its times in their zone when that isn't Brasília's. */
function Next({ now }: { now: Date }) {
  const live = nextLive(now)
  if (!live) return null

  const { when, local } = whenOf(live, now)

  return (
    <p className="mt-4 text-[15px]">
      <span className="font-medium text-klein">{T.next}:</span> {when}
      {gameOf(live.game) && ` · ${localize(gameOf(live.game)!.title)}`}
      {local && (
        <span className="text-muted">
          {" "}
          · {T.yours} ({local})
        </span>
      )}
    </p>
  )
}
