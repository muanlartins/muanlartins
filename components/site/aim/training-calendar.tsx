"use client"

import { Gauge } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { longDate } from "@/components/site/ranked/format"
import { HTML_LANG, LOCALE, localize } from "@/lib/site"
import type { TrainingDay } from "@/lib/voltaic"
import { cn } from "@/lib/utils"

const T = localize({
  min: { pt: "min", en: "min" },
  tasks: { pt: "tarefas", en: "tasks" },
  plays: { pt: "partidas", en: "plays" },
  rest: { pt: "Sem treino", en: "No training" },
  benchmark: { pt: "Benchmark", en: "Benchmark" },
  best: { pt: "melhor", en: "best" },
  less: { pt: "menos", en: "less" },
  more: { pt: "mais", en: "more" },
})

const WEEKDAYS = LOCALE === "en" ? ["S", "M", "T", "W", "T", "F", "S"] : ["D", "S", "T", "Q", "Q", "S", "S"]

/** Weeks the calendar shows at least, so it reads as a calendar from the first day. */
const WEEKS = 18
/** Minutes that step the colour up: a routine is about 20 to 30 minutes. */
const STEPS = [1, 10, 20, 35]

const day = (date: string) => new Date(`${date}T12:00:00Z`)
const key = (d: Date) => d.toISOString().slice(0, 10)
const monthFormat = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { month: "short", timeZone: "UTC" })

/**
 * Every day trained, GitHub-style: a column a week from Sunday (benchmark day, ringed when it was one), each square
 * in Klein by the minutes played. A square opens its day below: every task played, how many times, the best score.
 */
export function TrainingCalendar({ days, today }: { days: TrainingDay[]; today: string }) {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const [picked, setPicked] = useState(days.at(-1)?.date)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Open on the latest weeks when the calendar is wider than the screen.
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth })
  }, [])

  // From the Sunday on or before the first day (or WEEKS ago) to the week of the last day or today.
  const end = day(days.at(-1)?.date && days.at(-1)!.date > today ? days.at(-1)!.date : today)
  const start = day(days[0]?.date && days[0].date < today ? days[0].date : today)
  const earliest = new Date(end)
  earliest.setUTCDate(earliest.getUTCDate() - (WEEKS - 1) * 7)
  const first = start < earliest ? start : earliest
  first.setUTCDate(first.getUTCDate() - first.getUTCDay())
  const weeks: Date[][] = []
  for (const d = new Date(first); d <= end || d.getUTCDay() !== 0; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) weeks.push([])
    weeks.at(-1)!.push(new Date(d))
  }

  const level = (minutes: number) => STEPS.findLastIndex((step) => minutes >= step) + 1
  const shade = ["bg-zinc-200/80", "bg-klein/25", "bg-klein/50", "bg-klein/75", "bg-klein"]
  const chosen = picked ? byDate.get(picked) : undefined

  return (
    <div className="space-y-5">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]">
          <div className="mr-1 grid grid-rows-[14px_repeat(7,14px)] gap-[3px] text-[10px] leading-[14px] text-muted">
            <span />
            {WEEKDAYS.map((letter, i) => (
              <span key={i} className={i === 0 ? "font-medium text-klein" : undefined}>
                {letter}
              </span>
            ))}
          </div>
          {weeks.map((week, w) => {
            const month = week.find((d) => d.getUTCDate() === 1)
            return (
              <div key={w} className="grid grid-rows-[14px_repeat(7,14px)] gap-[3px]">
                <span className="relative text-[10px] leading-[14px] text-muted">
                  {month && <span className="absolute left-0 whitespace-nowrap">{monthFormat.format(month).replace(".", "")}</span>}
                </span>
                {week.map((d) => {
                  const date = key(d)
                  const trained = byDate.get(date)
                  const future = date > today
                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={!trained}
                      onClick={() => setPicked(date)}
                      title={trained ? `${longDate(date)} · ${trained.minutes} ${T.min}` : future ? undefined : `${longDate(date)} · ${T.rest}`}
                      aria-label={trained ? `${longDate(date)}: ${trained.minutes} ${T.min}` : longDate(date)}
                      className={cn(
                        "h-[14px] w-[14px] rounded-[3px] transition-transform",
                        future ? "bg-transparent" : shade[trained ? level(trained.minutes) : 0],
                        trained && "cursor-pointer hover:scale-125",
                        trained?.benchmark && "ring-2 ring-navy ring-offset-1 ring-offset-ground",
                        date === picked && "outline-2 outline-offset-2 outline-klein",
                      )}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          {T.less}
          {shade.map((c) => (
            <span key={c} className={cn("h-[10px] w-[10px] rounded-[2px]", c)} />
          ))}
          {T.more}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[10px] w-[10px] rounded-[2px] bg-klein ring-2 ring-navy ring-offset-1 ring-offset-ground" />
          {T.benchmark}
        </span>
      </div>

      {chosen && (
        <div className="rounded-md border border-line bg-paper/70 px-4 py-3 backdrop-blur-sm">
          <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[15px] font-medium text-klein">{longDate(chosen.date)}</span>
            <span className="flex items-center gap-2 text-[13px] tabular-nums text-muted">
              {chosen.benchmark && (
                <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[11px] font-medium text-paper">
                  <Gauge aria-hidden className="h-3 w-3" />
                  {T.benchmark}
                </span>
              )}
              {chosen.minutes} {T.min} · {chosen.plays} {T.plays}
            </span>
          </p>
          <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {chosen.tasks.map((task) => (
              <li key={task.name} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1 text-[13px]">
                <span className="truncate text-ink">
                  {task.name.replace(/^VT /, "")}
                  {task.plays > 1 && <span className="ml-1.5 text-muted">×{task.plays}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {T.best} <span className="font-medium text-ink">{task.best}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
