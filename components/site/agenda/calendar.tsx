"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { AgendaGameIcon, WEEKS_AHEAD } from "@/components/site/agenda/week"
import { gameName } from "@/components/site/lives/agenda"
import { Button } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { diaDaSemana, instante, somaDias } from "@/infra/comum/agenda.mjs"
import { clock, dayMonth, daysFrom, longDay, monthName, WEEKDAYS, type Agenda } from "@/lib/agenda"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize(channel.agenda)

/** On a phone the day picked is under the calendar: bring it into view. */
export function showDay() {
  if (!matchMedia("(max-width: 639px)").matches) return
  requestAnimationFrame(() => document.getElementById("dia")?.scrollIntoView({ behavior: "smooth", block: "start" }))
}

/** How many weeks a page of the calendar shows. */
export const CALENDAR_WEEKS = 5

/** The pages of weeks the calendar goes to. */
const PAGES = Math.ceil(WEEKS_AHEAD / CALENDAR_WEEKS) + 1

/** "Novembro de 2026" or "Novembro – dezembro de 2026": the months a page of weeks covers. */
function rangeName(first: string, last: string) {
  const a = monthName(first.slice(0, 7))
  const b = monthName(last.slice(0, 7))
  if (a === b) return a
  const [aMonth] = a.split(" ")
  return first.slice(0, 4) === last.slice(0, 4) ? `${aMonth} – ${b}` : `${a} – ${b}`
}

/**
 * The editor's calendar: five weeks at a time from this one, Monday first (no past weeks to scroll past), each day with
 * its lives as chips (the game's sign and the time, the sign alone on a phone) and a mark for its note; today in a
 * Klein square, days gone faded and not clickable (the agenda doesn't keep the past).
 */
export function Calendar({
  agenda,
  today,
  page,
  onPage,
  selected,
  onSelect,
}: {
  agenda: Agenda
  today: string
  page: number
  onPage: (page: number) => void
  selected: string
  onSelect: (date: string) => void
}) {
  const start = somaDias(today, 1 - diaDaSemana(today) + page * CALENDAR_WEEKS * 7)
  const days = daysFrom(agenda, instante(start, "12:00", agenda.timeZone), CALENDAR_WEEKS * 7)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein first-letter:uppercase">{rangeName(days[0].data, days.at(-1)!.data)}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 0} aria-label={T.previous} title={T.previous} className="px-2">
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onPage(page + 1)} disabled={page >= PAGES - 1} aria-label={T.next} title={T.next} className="px-2">
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div aria-hidden className="mt-5 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((name) => (
          <span key={name} className="eyebrow text-muted">
            {name}
          </span>
        ))}
      </div>
      <ol className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const gone = day.data < today
          const isToday = day.data === today
          const isSelected = day.data === selected
          const first = day.data.endsWith("-01")
          const label = [longDay(day.data), ...day.lives.map((live) => `${clock(live.start)} ${gameName(agenda, live.jogo)}`), day.nota].filter(Boolean).join(", ")
          return (
            <li key={day.data}>
              <button
                onClick={() => onSelect(day.data)}
                disabled={gone}
                aria-pressed={isSelected}
                aria-label={label}
                className={cn(
                  "relative flex h-full min-h-16 w-full flex-col gap-1 border p-1 text-left transition-colors sm:min-h-24 sm:p-1.5",
                  gone ? "cursor-default border-transparent opacity-40" : "border-line bg-paper/70 hover:border-klein",
                  isSelected && "border-klein bg-paper outline-2 -outline-offset-3 outline-klein",
                )}
              >
                <span
                  className={cn(
                    "self-start px-1 text-[13px] leading-5 font-medium tabular-nums",
                    isToday ? "bg-klein text-paper" : first ? "text-klein" : "text-ink",
                  )}
                >
                  {first ? dayMonth(day.data) : Number(day.data.slice(8))}
                </span>
                {!gone &&
                  day.lives.map((live) => (
                    <span key={live.inicio} className="flex items-center justify-center gap-1 bg-klein px-1 py-1 text-[12px] leading-none font-medium tabular-nums text-paper sm:justify-start">
                      <AgendaGameIcon game={live.jogo} size={14} onDark />
                      <span className="hidden sm:inline">{clock(live.start)}</span>
                    </span>
                  ))}
                {day.nota && !gone && (
                  <>
                    <span className="hidden truncate text-[12px] leading-tight text-muted sm:block">{day.nota}</span>
                    <span className="mx-auto mt-auto h-1.5 w-1.5 rounded-full bg-muted sm:hidden" />
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
