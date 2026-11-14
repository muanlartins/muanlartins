"use client"

import { ArrowRight, CalendarPlus } from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { AGENDA_ICS, clock, dayMonth, daysFrom, nextOccurrence, weekdayOf, whenOf, type Agenda as AgendaData, type Day } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { localize } from "@/lib/site"

const T = localize(channel.lives.agenda)

/** A game's short name: the site's for its games ("RL"), the agenda's name for any other. */
export function gameLabel(agenda: AgendaData, id: string) {
  return games.find((game) => game.id === id)?.short ?? agenda.games[id]?.name ?? id
}

/** A game's full name. */
export function gameName(agenda: AgendaData, id: string) {
  const game = games.find((game) => game.id === id)
  return game ? localize(game.title) : (agenda.games[id]?.name ?? id)
}

function everyMinute(listener: () => void) {
  const timer = setInterval(listener, 10_000)
  return () => clearInterval(timer)
}

/** The viewer's clock to the minute; undefined while prerendering. */
export function useNow() {
  const minute = useSyncExternalStore(everyMinute, () => Math.floor(Date.now() / 60_000), () => undefined)
  return minute === undefined ? undefined : new Date(minute * 60_000)
}

// Subscriptions, so the calendar follows every change: Google takes the address, the others open webcal://.
const WEBCAL = AGENDA_ICS.replace(/^https?:/, "webcal:")
const GOOGLE = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(WEBCAL)}`

/** "Adicionar à sua agenda: Google · Apple e outros". */
export function Subscribe() {
  return (
    <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
      <CalendarPlus aria-hidden className="h-4 w-4 text-klein" />
      <span className="text-muted">{T.subscribe}:</span>
      <a href={GOOGLE} target="_blank" rel="noreferrer" className="font-medium text-klein hover:underline">
        Google
      </a>
      <span className="text-muted">·</span>
      <a href={WEBCAL} className="font-medium text-klein hover:underline">
        {T.otherApps}
      </a>
    </p>
  )
}

/**
 * The lives page's agenda: the next seven days with their dates, from the viewer's today in Brasília, each day's
 * lives, or its note, or "sem live"; then the next live from the viewer's clock (and in their zone when it isn't
 * Brasília's), each live's title, the calendar to subscribe to and the whole agenda.
 */
export function Agenda() {
  const { agenda, fresh } = useAgenda()
  const now = useNow()
  const days = agenda && now ? daysFrom(agenda, now, 7) : []
  const known = days.length > 0

  return (
    <section id="agenda" className="scroll-mt-24">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{T.title}</h2>
      <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-busy={!known}>
        {(known ? days : Array.from({ length: 7 }, (_, n) => ({ data: `_${n}` }) as Day)).map((day, index) => (
          <li
            key={day.data}
            className={`flex min-h-20 flex-col gap-2 rounded-md px-1 py-2 text-center text-[11px] sm:min-h-24 sm:p-3 sm:text-left sm:text-[13px] ${
              !known ? "animate-pulse bg-zinc-100" : day.lives.length ? "bg-klein text-paper" : "border border-dashed border-zinc-300 text-muted"
            }`}
          >
            {known && (
              <>
                <span className="flex flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
                  <span className="font-medium capitalize">{index === 0 ? T.today : weekdayOf(day.data)}</span>
                  <span className="tabular-nums opacity-70">
                    <span className="sm:hidden">{day.data.slice(8)}</span>
                    <span className="hidden sm:inline">{dayMonth(day.data)}</span>
                  </span>
                </span>
                {day.lives.map((live) => (
                  <span key={live.inicio} title={live.titulo} className="flex flex-col tabular-nums leading-tight">
                    <span>{clock(live.start)}</span>
                    <span className="hidden opacity-70 sm:inline">{clock(live.end)}</span>
                    <span className="mt-1 text-[10px] font-medium tracking-[0.04em] opacity-80 sm:text-[11px]">{gameLabel(agenda!, live.jogo)}</span>
                  </span>
                ))}
                {!day.lives.length && <span className="mt-auto line-clamp-3 text-[10px] sm:text-[12px]">{day.nota || T.none}</span>}
              </>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-muted">{T.zone}</p>

      {known && <Next agenda={agenda!} now={now!} />}
      {known && <Titles agenda={agenda!} days={days} now={now!} />}
      {fresh && !agenda && <p className="mt-4 text-[15px] text-muted">{T.unavailable}</p>}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <Subscribe />
        <Link href={channelPath("agenda")} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline">
          {T.full}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

/** The next live from the viewer's clock, and its times in their zone when that isn't Brasília's. */
function Next({ agenda, now }: { agenda: AgendaData; now: Date }) {
  const live = nextOccurrence(agenda, now)
  if (!live) return <p className="mt-4 text-[15px] text-muted">{T.empty}</p>
  const { when, local } = whenOf({ start: new Date(live.inicio), end: new Date(live.fim) }, now, agenda.timeZone)
  return (
    <p className="mt-4 text-[15px]">
      <span className="font-medium text-klein">{T.next}:</span> {when} · {gameName(agenda, live.jogo)}
      {local && (
        <span className="text-muted">
          {" "}
          · {T.yours} ({local})
        </span>
      )}
    </p>
  )
}

/** The week's lives by name: what each one is, as Luan titled it. */
function Titles({ agenda, days, now }: { agenda: AgendaData; days: Day[]; now: Date }) {
  const lives = days.flatMap((day) => day.lives).filter((live) => Date.parse(live.fim) > +now)
  if (!lives.length) return null
  return (
    <ul className="mt-4 space-y-1.5 text-[14px]">
      {lives.map((live) => (
        <li key={live.inicio} className="flex gap-3">
          <span className="shrink-0 whitespace-nowrap tabular-nums text-muted">
            <span className="capitalize">{weekdayOf(live.data)}</span> {dayMonth(live.data)}, {clock(live.start)}
          </span>
          <span className="min-w-0">
            <span className="text-ink">{live.titulo}</span>
            <span className="text-muted"> · {gameName(agenda, live.jogo)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
