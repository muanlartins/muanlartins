"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { gameLabel } from "@/components/site/lives/agenda"
import { channel } from "@/content/channel"
import { diaDaSemana, instante, somaDias } from "@/infra/comum/agenda.mjs"
import { clock, daysFrom, monthName, WEEKDAYS, type Agenda } from "@/lib/agenda"
import { localize } from "@/lib/site"

const T = localize(channel.agenda)

/** On a phone the day picked is under the calendar: bring it into view. */
export function showDay() {
  if (!matchMedia("(max-width: 639px)").matches) return
  requestAnimationFrame(() => document.getElementById("dia")?.scrollIntoView({ behavior: "smooth", block: "start" }))
}

/** How many months ahead the calendar goes. */
export const MONTHS_AHEAD = 3

const addMonths = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

/**
 * A month of the agenda as a calendar, Monday first: each day with its lives (time and game) and its note (a mark on
 * a phone); today ringed, days gone faded, empty and not clickable (the agenda doesn't keep
 * the past). The month is the caller's (`month`, "YYYY-MM").
 */
export function Calendar({
  agenda,
  today,
  month,
  onMonth,
  selected,
  onSelect,
}: {
  agenda: Agenda
  today: string
  month: string
  onMonth: (month: string) => void
  selected: string
  onSelect: (date: string) => void
}) {
  const first = `${month}-01`
  const last = somaDias(addMonths(month, 1) + "-01", -1)
  const start = somaDias(first, 1 - diaDaSemana(first))
  const end = somaDias(last, 7 - diaDaSemana(last))
  const count = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1
  const days = daysFrom(agenda, instante(start, "12:00", agenda.timeZone), count)
  const firstMonth = today.slice(0, 7)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein first-letter:uppercase">{monthName(month)}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => onMonth(addMonths(month, -1))}
            disabled={month <= firstMonth}
            aria-label={T.previous}
            className="rounded-md border border-line p-1.5 text-ink transition-colors hover:border-klein hover:text-klein disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMonth(addMonths(month, 1))}
            disabled={month >= addMonths(firstMonth, MONTHS_AHEAD)}
            aria-label={T.next}
            className="rounded-md border border-line p-1.5 text-ink transition-colors hover:border-klein hover:text-klein disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-muted sm:text-[12px]">
        {WEEKDAYS.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <ol className="mt-1.5 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const gone = day.data < today
          const outside = !day.data.startsWith(month)
          const isToday = day.data === today
          const isSelected = day.data === selected
          return (
            <li key={day.data} className={outside ? "opacity-45" : ""}>
              <button
                onClick={() => onSelect(day.data)}
                disabled={gone}
                aria-pressed={isSelected}
                aria-label={day.data}
                className={`relative flex h-full min-h-[4.25rem] w-full flex-col gap-1 rounded-md border p-1 text-left transition-colors sm:min-h-28 sm:p-2 ${
                  gone ? "cursor-default border-transparent opacity-40" : "bg-paper/70 hover:border-klein"
                } ${isSelected ? "border-klein ring-2 ring-klein/30" : gone ? "" : "border-line"}`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12px] font-medium tabular-nums sm:text-[13px] ${
                      isToday ? "bg-klein text-paper" : "text-ink"
                    }`}
                  >
                    {Number(day.data.slice(8))}
                  </span>
                </span>
                {!gone &&
                  day.lives.map((live) => (
                    <span
                      key={live.inicio}
                      title={live.titulo}
                      className="truncate rounded-[3px] bg-klein px-0.5 py-0.5 text-center text-[9px] font-medium leading-tight tabular-nums text-paper sm:px-1 sm:text-left sm:text-[12px]"
                    >
                      {clock(live.start)}
                      <span className="hidden sm:inline"> {gameLabel(agenda, live.jogo)}</span>
                    </span>
                  ))}
                {day.nota && !gone && <span className="hidden truncate text-[11px] leading-tight text-muted sm:block">{day.nota}</span>}
                {day.nota && !gone && <span className="text-[10px] leading-none text-muted sm:hidden">{day.lives.length ? "•" : "—"}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
