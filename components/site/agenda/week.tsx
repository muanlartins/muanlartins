"use client"

import { Flag, Gamepad2 } from "lucide-react"
import { goalLines, type GoalMarks } from "@/components/site/agenda/goals"
import { GameIcon } from "@/components/site/game/game-icon"
import { gameName } from "@/components/site/lives/agenda"
import { Pulse } from "@/components/site/lives/live-badge"
import { Badge, EmptyState, Skeleton } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { instante, somaDias } from "@/infra/comum/agenda.mjs"
import { clock, dayMonth, daysFrom, minutesOf, nextOccurrence, occurrences, weekdayOf, zoneDifference, type Agenda, type Day, type Occurrence } from "@/lib/agenda"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize(channel.lives.agenda)

/** How many weeks ahead the agenda shows (the API keeps a few months; Twitch's calendar has eight weeks). */
export const WEEKS_AHEAD = 12

/** A game's sign: the site's own for its games (the ball, the crosshair), a controller for any other. `onDark` on Klein. */
export function AgendaGameIcon({ game, size = 14, onDark = false }: { game: string; size?: number; onDark?: boolean }) {
  if (games.some((g) => g.id === game)) return <GameIcon game={game} size={size} className="block shrink-0" />
  return <Gamepad2 aria-hidden style={{ width: size, height: size }} className={cn("shrink-0", onDark ? "text-paper" : "text-klein")} />
}

/** A live's start and end in minutes from its day's midnight (an end at or before the start is the next day's). */
function spanOf(live: Occurrence) {
  const start = minutesOf(live.start)
  const end = minutesOf(live.end)
  return { start, end: end <= start ? end + 1440 : end }
}

/** The hours the grid spans: the lives' earliest start to their latest end, at least six hours. */
export function hoursOf(lives: Occurrence[]) {
  if (!lives.length) return { from: 14, to: 23 }
  let from = Math.floor(Math.min(...lives.map((live) => spanOf(live).start)) / 60)
  let to = Math.ceil(Math.max(...lives.map((live) => spanOf(live).end)) / 60)
  while (to - from < 6) {
    if (from > 0) from--
    if (to - from < 6) to++
  }
  return { from, to }
}

/** The hours for every live from today on, so each week of the agenda (and the lives page's) shares one grid. */
export function agendaHours(agenda: Agenda, now: Date) {
  return hoursOf(occurrences(agenda, now, WEEKS_AHEAD * 7))
}

const pct = (n: number) => `${n * 100}%`

/** "Horário de Brasília", and how far the viewer's clock is when it isn't Brasília's. */
export function ZoneLine({ agenda, now, className }: { agenda: Agenda; now: Date; className?: string }) {
  const difference = zoneDifference(agenda.timeZone, now)
  return (
    <p className={cn("text-[13px] text-muted", className)}>
      {T.zone}
      {difference && ` · ${difference}`}
    </p>
  )
}

/**
 * The agenda's days as a TV guide, the one picture of the schedule on the site (the agenda and the lives page):
 * a row per day, each live a Klein block at its hours on a shared grid with its game's sign, then what it is in words
 * (its times, title and game; the plan of the live unless `compact`). The next live is ringed, the one on air pulses,
 * a day without a live says its note or "Sem live", and the days a Pix goal starts or ends say so.
 */
export function AgendaWeek({
  agenda,
  now,
  from,
  count = 7,
  hours,
  compact = false,
  goals,
}: {
  agenda: Agenda
  now: Date
  /** The first day, "YYYY-MM-DD" (today in the agenda's zone when left out). */
  from?: string
  count?: number
  hours: { from: number; to: number }
  compact?: boolean
  goals?: Record<string, GoalMarks>
}) {
  const days = daysFrom(agenda, from ? instante(from, "12:00", agenda.timeZone) : now, count)
  const today = daysFrom(agenda, now, 1)[0].data
  const next = nextOccurrence(agenda, now)
  const span = hours.to - hours.from
  const step = span <= 6 ? 1 : span <= 12 ? 2 : 3
  const ticks = Array.from({ length: span + 1 }, (_, i) => hours.from + i).filter((h) => h % step === 0)
  const any = days.some((day) => day.lives.length || day.nota)

  return (
    <div>
      <div aria-hidden className="grid grid-cols-[3.75rem_1fr] gap-3 pb-2 sm:grid-cols-[6rem_1fr]">
        <span />
        <div className="relative mx-1 h-4">
          {ticks.map((h) => (
            <span
              key={h}
              style={{ left: pct((h - hours.from) / span) }}
              className="absolute top-0 -translate-x-1/2 text-[12px] leading-none tabular-nums text-muted"
            >
              {clock(`${String(h % 24).padStart(2, "0")}:00`)}
            </span>
          ))}
        </div>
      </div>
      <ol className="divide-y divide-line border-y border-line">
        {days.map((day) => (
          <DayRow key={day.data} agenda={agenda} day={day} today={today} now={now} next={next} hours={hours} ticks={ticks} compact={compact} goals={goals?.[day.data]} />
        ))}
      </ol>
      {!any && <EmptyState className="mt-4">{T.empty}</EmptyState>}
    </div>
  )
}

function DayRow({
  agenda,
  day,
  today,
  now,
  next,
  hours,
  ticks,
  compact,
  goals,
}: {
  agenda: Agenda
  day: Day
  today: string
  now: Date
  next: Occurrence | null
  hours: { from: number; to: number }
  ticks: number[]
  compact: boolean
  goals?: GoalMarks
}) {
  const span = hours.to - hours.from
  const isToday = day.data === today
  const tomorrow = day.data === somaDias(today, 1)
  const label = isToday ? T.today : tomorrow ? T.tomorrow : weekdayOf(day.data)

  return (
    <li className="grid grid-cols-[3.75rem_1fr] gap-3 py-3 sm:grid-cols-[6rem_1fr]">
      <p className="leading-tight">
        <span className={cn("block text-[15px] font-medium first-letter:uppercase", isToday ? "text-klein" : "text-ink")}>{label}</span>
        <span className="mt-0.5 block text-[13px] tabular-nums text-muted">{dayMonth(day.data)}</span>
      </p>
      <div className="min-w-0">
        {day.lives.length ? (
          <>
            <div className="relative mx-1 h-9">
              {ticks.map((h) => (
                <span key={h} aria-hidden style={{ left: pct((h - hours.from) / span) }} className="absolute inset-y-0 w-px bg-line" />
              ))}
              {day.lives.map((live) => {
                const { start, end } = spanOf(live)
                const onAir = Date.parse(live.inicio) <= +now && +now < Date.parse(live.fim)
                const over = Date.parse(live.fim) <= +now
                const isNext = !onAir && next?.inicio === live.inicio
                return (
                  <span
                    key={live.inicio}
                    aria-hidden
                    style={{ left: pct((start / 60 - hours.from) / span), width: pct((end - start) / 60 / span) }}
                    className={cn(
                      "@container absolute inset-y-0 flex min-w-9 items-center gap-2 overflow-hidden bg-klein px-1.5 text-[13px] font-medium tabular-nums text-paper",
                      isNext && "outline-2 outline-offset-2 outline-klein",
                      over && "opacity-40",
                    )}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center bg-paper">{onAir ? <Pulse className="bg-klein" /> : <AgendaGameIcon game={live.jogo} size={16} />}</span>
                    <span className="hidden whitespace-nowrap @min-[4.5rem]:inline">
                      {clock(live.start)}
                      <span className="hidden @min-[8rem]:inline">–{clock(live.end)}</span>
                    </span>
                  </span>
                )
              })}
            </div>
            <ul className="mt-2 space-y-2">
              {day.lives.map((live) => {
                const onAir = Date.parse(live.inicio) <= +now && +now < Date.parse(live.fim)
                const over = Date.parse(live.fim) <= +now
                const isNext = !onAir && next?.inicio === live.inicio
                const name = gameName(agenda, live.jogo)
                return (
                  <li key={live.inicio} className={cn(over && "opacity-60")}>
                    <p className={cn("text-[15px] leading-snug", compact && "line-clamp-2")}>
                      {onAir && <Badge className="mr-2 align-[2px]">{T.onAirBadge}</Badge>}
                      {isNext && (
                        <Badge tone="soft" className="mr-2 align-[2px]">
                          {T.nextBadge}
                        </Badge>
                      )}
                      <span className="font-medium tabular-nums text-klein">
                        {clock(live.start)}–{clock(live.end)}
                      </span>{" "}
                      <span className="text-ink">{live.titulo}</span>
                      {!live.titulo.toLowerCase().includes(name.toLowerCase()) && <span className="text-muted"> · {name}</span>}
                    </p>
                    {!compact && live.roteiro.length > 0 && (
                      <ol className="mt-1.5 space-y-1 border-l-2 border-line pl-3 text-[13px] leading-snug">
                        {live.roteiro.map((item, index) => (
                          <li key={index} className="flex gap-2">
                            {item.at && <span className="shrink-0 tabular-nums text-klein">{clock(item.at)}</span>}
                            <span className="text-ink">{item.text}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                )
              })}
            </ul>
            {day.nota && <p className="mt-1.5 text-[13px] text-muted">{day.nota}</p>}
          </>
        ) : (
          <p className={cn("flex min-h-9 items-center text-[15px]", day.nota ? "text-ink" : "text-muted")}>{day.nota || T.none}</p>
        )}
        {goalLines(goals).map((line) => (
          <p key={line} className="mt-1.5 flex items-center gap-1.5 text-[13px] text-klein">
            <Flag aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {line}
          </p>
        ))}
      </div>
    </li>
  )
}

/** The grid while the agenda loads: the hours' line and seven rows. */
export function AgendaWeekSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div aria-busy>
      <Skeleton className="mb-2 ml-[4.5rem] h-3 w-2/3 sm:ml-[6.75rem]" />
      <div className="divide-y divide-line border-y border-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid grid-cols-[3.75rem_1fr] gap-3 py-3 sm:grid-cols-[6rem_1fr]">
            <span className="space-y-1.5">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-3 w-8" />
            </span>
            <Skeleton className={cn("h-9", i % 3 === 2 ? "w-1/3" : "w-full")} />
          </div>
        ))}
      </div>
    </div>
  )
}
