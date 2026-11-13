"use client"

import { ArrowRight, CalendarPlus } from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { AGENDA_ICS, clock, dayMonth, nextOccurrence, occurrences, weekdayOf, whenOf, type Agenda as AgendaData, type Occurrence } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { localize } from "@/lib/site"

const T = localize(channel.lives.agenda)

/** A game's short name: the site's for its games ("RL"), Twitch's category name for any other. */
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

/**
 * The next seven days with their dates, from the viewer's today in Brasília: each day's lives (a day off struck
 * through), "sem live" on a day without one; then the next live from the viewer's clock (and in their zone when it
 * isn't Brasília's), each live's title, and the calendar to subscribe to. `page` links the whole agenda.
 */
export function Agenda({ page = false }: { page?: boolean }) {
  const { agenda, fresh } = useAgenda()
  const now = useNow()
  const days = agenda && now ? occurrences(agenda, now, 7) : []
  const dates = now && agenda ? Array.from({ length: 7 }, (_, n) => dateAfter(isoIn(now, agenda.timeZone), n)) : []
  const known = Boolean(agenda && now)

  return (
    <section id="agenda" className="scroll-mt-24">
      {page ? null : <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{T.title}</h2>}
      <ol className={`${page ? "" : "mt-5 "}grid grid-cols-7 gap-1.5`} aria-busy={!known}>
        {(known ? dates : Array.from({ length: 7 }, (_, n) => `_${n}`)).map((date, index) => {
          const lives = days.filter((live) => live.data === date)
          const on = lives.some((live) => !live.folga)
          return (
            <li
              key={date}
              className={`flex min-h-20 flex-col gap-2 rounded-md px-1 py-2 text-center text-[11px] sm:min-h-24 sm:p-3 sm:text-left sm:text-[13px] ${
                !known ? "animate-pulse bg-zinc-100" : on ? "bg-klein text-paper" : "border border-dashed border-zinc-300 text-muted"
              }`}
            >
              {known && (
                <>
                  <span className="flex flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
                    <span className="font-medium capitalize">{index === 0 ? T.today : weekdayOf(date)}</span>
                    <span className="tabular-nums opacity-70">
                      <span className="sm:hidden">{date.slice(8)}</span>
                      <span className="hidden sm:inline">{dayMonth(date)}</span>
                    </span>
                  </span>
                  {lives.map((live) => (
                    <span key={live.inicio} title={live.titulo} className={`flex flex-col tabular-nums leading-tight ${live.folga ? "opacity-60" : ""}`}>
                      <span className={live.folga ? "line-through" : ""}>{clock(live.start)}</span>
                      <span className={`hidden opacity-70 sm:inline ${live.folga ? "line-through" : ""}`}>{clock(live.end)}</span>
                      <span className="mt-1 text-[10px] font-medium tracking-[0.04em] opacity-80 sm:text-[11px]">
                        {live.folga ? T.off : gameLabel(agenda!, live.jogo)}
                      </span>
                    </span>
                  ))}
                  {!lives.length && <span className="mt-auto text-[10px] sm:text-[12px]">{T.none}</span>}
                </>
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-[13px] text-muted">{T.zone}</p>

      {known && <Next agenda={agenda!} now={now!} />}
      {known && <Titles agenda={agenda!} lives={days.filter((live) => !live.folga && Date.parse(live.fim) > +now!)} />}
      {fresh && !agenda && <p className="mt-4 text-[15px] text-muted">{T.unavailable}</p>}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
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
        {!page && (
          <Link href={channelPath("agenda")} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline">
            {T.full}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  )
}

// Subscriptions, so the calendar follows every change: Google takes the address, the others open webcal://.
const WEBCAL = AGENDA_ICS.replace(/^https:/, "webcal:")
const GOOGLE = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(WEBCAL)}`

const isoIn = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date)

function dateAfter(date: string, days: number) {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
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
function Titles({ agenda, lives }: { agenda: AgendaData; lives: Occurrence[] }) {
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
