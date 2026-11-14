import { channel } from "@/content/channel"
import { dias, duracao, ocorrencias, proxima } from "@/infra/comum/agenda.mjs"
import { PROFILE_API } from "@/lib/profile"
import { HTML_LANG, LOCALE, localize } from "@/lib/site"

/**
 * When the lives are: the calendar Luan edits at /canal/agenda, kept by the profile API (`GET /agenda`), the one
 * source of truth (`infra/comum/agenda.mjs` has the format and the rules, shared with the API). The site is built
 * with what the API had then (`lib/agenda-build.ts`) and each page that shows it asks the API again in the browser
 * (`components/site/agenda/agenda-context.tsx`), so a change shows without a release.
 */

/** One step of a live's run of the show, at a time or not. */
export interface PlanItem {
  at?: string
  text: string
}

/** A live on a day: "HH:MM" in the agenda's zone, a game's id in `games`. */
export interface PlannedLive {
  start: string
  end: string
  game: string
  title?: string
  plan?: PlanItem[]
}

/** A planned day: its lives and a note for the whole day (a note alone says why there's no live). */
export interface PlannedDay {
  note?: string
  lives: PlannedLive[]
}

/** A game: its Twitch category's name and id, and the live's default title. */
export interface AgendaGame {
  name: string
  category: string
  title: string
}

export interface Agenda {
  timeZone: string
  dates: Record<string, PlannedDay>
  games: Record<string, AgendaGame>
}

/** A live on a given day, as `ocorrencias` lists them (instants as ISO strings). */
export interface Occurrence {
  data: string
  inicio: string
  fim: string
  start: string
  end: string
  jogo: string
  nome: string
  categoria: string | null
  titulo: string
  roteiro: PlanItem[]
}

/** A day with its note and its lives (none when it isn't planned). */
export interface Day {
  data: string
  nota: string
  lives: Occurrence[]
}

export const AGENDA_URL = `${PROFILE_API}/agenda`
/** The calendar apps' subscription: always the agenda as it is now. */
export const AGENDA_ICS = `${PROFILE_API}/agenda.ics`

/** The days from `from`'s day through `count` days. */
export const daysFrom = (agenda: Agenda, from: Date, count = 7) => dias(agenda, from, count) as Day[]

/** Every live of those days, earliest first. */
export const occurrences = (agenda: Agenda, from: Date, count = 7) => ocorrencias(agenda, from, count) as Occurrence[]

/** The live on air or the next one. */
export const nextOccurrence = (agenda: Agenda, now: Date) => proxima(agenda, now) as Occurrence | null

/** A slot's length in minutes (an end at or before the start is the next day's). */
export const lengthOf = (start: string, end: string) => duracao(start, end) as number

/** A game's next live (on air or ahead), within six weeks. */
export const nextOf = (agenda: Agenda, game: string, now: Date) =>
  occurrences(agenda, now, 42).find((live) => live.jogo === game && Date.parse(live.fim) > +now) ?? null

/** Whether the agenda has any live of a game. */
export const hasGame = (agenda: Agenda, game: string) => Object.values(agenda.dates).some((day) => day.lives.some((live) => live.game === game))

const LANG = HTML_LANG[LOCALE]

/** "14h30" in Portuguese, "14:30" in English. */
export const clock = (hhmm: string) => (LOCALE === "pt" ? hhmm.replace(":", "h").replace(/h00$/, "h") : hhmm)

/** The weekdays' short names, Monday first (2024-01-01 was one). */
export const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(LANG, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + index))).replace(".", ""),
)

/** "sáb 21/11, 15h": a live in a line, in the agenda's time zone. */
export const liveText = (live: Occurrence) => `${weekdayOf(live.data)} ${dayMonth(live.data)}, ${clock(live.start)}`

/** "sábado, 21 de novembro": a date in full. */
export const longDay = (date: string) =>
  new Intl.DateTimeFormat(LANG, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))

/** "novembro de 2026": a month ("YYYY-MM"). */
export const monthName = (month: string) =>
  new Intl.DateTimeFormat(LANG, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`))

/** "15/11" or "11/15": a date's day and month. */
export const dayMonth = (date: string) =>
  new Intl.DateTimeFormat(LANG, { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))

/** "sáb": a date's short weekday. */
export const weekdayOf = (date: string) => WEEKDAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7]

const W = localize(channel.lives.agenda)

/**
 * When a live is, from the viewer's clock: "agora", "hoje, 21h", "amanhã, 14h30" or the weekday, in Brasília time;
 * and, when the viewer's clock differs, its start and end in their zone with the zone's city.
 */
export function whenOf(live: { start: Date; end: Date }, now: Date, zone: string) {
  const day = (date: Date, timeZone?: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date)
  const time = (date: Date, timeZone?: string) =>
    clock(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date))
  let when: string
  if (live.start <= now) when = W.now
  else {
    const ahead = Math.round((+new Date(day(live.start, zone)) - +new Date(day(now, zone))) / 86_400_000)
    const name =
      ahead === 0 ? W.today : ahead === 1 ? W.tomorrow : new Intl.DateTimeFormat(LANG, { weekday: "long", timeZone: zone }).format(live.start)
    when = `${name}, ${time(live.start, zone)}`
  }
  const differs = time(live.start) !== time(live.start, zone)
  const city = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replaceAll("_", " ")
  return { when, local: differs ? `${city}: ${time(live.start)}–${time(live.end)}` : undefined }
}
