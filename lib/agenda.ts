import { channel } from "@/content/channel"
import { duracao, ocorrencias, proxima } from "@/infra/comum/agenda.mjs"
import { PROFILE_API } from "@/lib/profile"
import { HTML_LANG, LOCALE, localize } from "@/lib/site"

/**
 * When the lives are: the calendar Luan edits at /canal/agenda, kept by the profile API (`GET /agenda`), the one
 * source of truth (`infra/comum/agenda.mjs` has the format and the rules, shared with the API). The site is built
 * with what the API had then (`lib/agenda-build.ts`) and each page that shows it asks the API again in the browser
 * (`components/site/agenda/agenda-context.tsx`), so a change shows without a release.
 */

/** Every week: ISO weekdays (1 Monday … 7 Sunday), "HH:MM" in the agenda's zone, a game's id in `games`. */
export interface Slot {
  days: number[]
  start: string
  end: string
  game: string
  title?: string
}

/** One day only. */
export interface Extra {
  date: string
  start: string
  end: string
  game: string
  title?: string
}

/** A weekly live that won't happen that day (the slot's start). */
export interface Off {
  date: string
  start: string
}

/** A game: its Twitch category's name and id, and the live's default title. */
export interface AgendaGame {
  name: string
  category: string
  title: string
}

export interface Agenda {
  timeZone: string
  slots: Slot[]
  extras: Extra[]
  off: Off[]
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
  avulsa: boolean
  folga: boolean
}

export const AGENDA_URL = `${PROFILE_API}/agenda`
/** The calendar apps' subscription: always the agenda as it is now. */
export const AGENDA_ICS = `${PROFILE_API}/agenda.ics`

/** The lives from `from`'s day through `days` days, days off included (marked `folga`). */
export const occurrences = (agenda: Agenda, from: Date, days = 7) => ocorrencias(agenda, from, days) as Occurrence[]

/** The live on air or the next one, days off skipped. */
export const nextOccurrence = (agenda: Agenda, now: Date) => proxima(agenda, now) as Occurrence | null

/** A slot's length in minutes (an end at or before the start is the next day's). */
export const lengthOf = (start: string, end: string) => duracao(start, end) as number

/** A game's slots, earliest in the week first. */
export const slotsOf = (agenda: Agenda, game: string) =>
  agenda.slots.filter((slot) => slot.game === game).sort((a, b) => Math.min(...a.days) - Math.min(...b.days))

const LANG = HTML_LANG[LOCALE]

/** "14h30" in Portuguese, "14:30" in English. */
export const clock = (hhmm: string) => (LOCALE === "pt" ? hhmm.replace(":", "h").replace(/h00$/, "h") : hhmm)

/** The weekdays' short names, Monday first (2024-01-01 was one). */
export const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(LANG, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + index))).replace(".", ""),
)

/** "seg e qua, 21h–23h": a slot in a line, in the agenda's time zone. */
export function slotText(slot: Slot) {
  const days = new Intl.ListFormat(LANG, { type: "conjunction" }).format(slot.days.map((day) => WEEKDAYS[day - 1]))
  return `${days}, ${clock(slot.start)}–${clock(slot.end)}`
}

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
