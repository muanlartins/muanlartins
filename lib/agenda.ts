import agenda from "@/content/agenda.json"
import { HTML_LANG, LOCALE } from "@/lib/site"

/**
 * When the lives are (`content/agenda.json`): weekly slots in the channel's
 * time zone. The Lives page shows them, `/agenda.ics` lets a viewer
 * subscribe, and `scripts/twitch_agenda.py` puts them on Twitch.
 */

export interface Slot {
  /** ISO weekdays: 1 Monday … 7 Sunday. */
  days: number[]
  /** "HH:MM", in the agenda's time zone. */
  start: string
  end: string
  /** Whose live it is: a game's id (content/projects.ts). */
  game: string
}

export const AGENDA: { timeZone: string; since: string; slots: Slot[] } = agenda

/** A game's slots, earliest in the week first. */
export const slotsOf = (game: string) =>
  AGENDA.slots.filter((slot) => slot.game === game).sort((a, b) => Math.min(...a.days) - Math.min(...b.days))

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

const minutes = (time: string) => {
  const [hours, mins] = time.split(":").map(Number)
  return hours * 60 + mins
}

/** The wall-clock parts of an instant in a time zone, with its ISO weekday. */
function partsIn(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1
  return { year: +parts.year, month: +parts.month, day: +parts.day, minute: +parts.hour * 60 + +parts.minute, weekday }
}

/** The instant a wall-clock time in a time zone falls on (time zones without a change that day). */
function instant(year: number, month: number, day: number, minute: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day, 0, minute)
  const seen = partsIn(new Date(guess), timeZone)
  const offset = Date.UTC(seen.year, seen.month - 1, seen.day, 0, seen.minute) - guess
  return new Date(guess - offset)
}

/** The next live, or the one on air now: its start, end and game, from `now`. */
export function nextLive(now = new Date()): { start: Date; end: Date; game: string } | undefined {
  const { timeZone, since, slots } = AGENDA
  const today = partsIn(now, timeZone)
  for (let ahead = 0; ahead < 8; ahead++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + ahead))
    const weekday = ((today.weekday - 1 + ahead) % 7) + 1
    const iso = date.toISOString().slice(0, 10)
    if (iso < since) continue
    const found = slots
      .filter((slot) => slot.days.includes(weekday))
      .map((slot) => ({
        start: instant(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), minutes(slot.start), timeZone),
        end: instant(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), minutes(slot.end), timeZone),
        game: slot.game,
      }))
      .filter((live) => live.end > now)
      .sort((a, b) => +a.start - +b.start)[0]
    if (found) return found
  }
}

const ICS_DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]

/** The agenda as an iCalendar file a calendar app can subscribe to: one weekly event per slot, named by `title(game)`. */
export function ics({ summary, title, description, url }: { summary: string; title: (game: string) => string; description: string; url: string }) {
  const { timeZone, since, slots } = AGENDA
  const stamp = `${since.replaceAll("-", "")}T000000Z`
  const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n")
  const events = slots.flatMap((slot, index) => {
    // The first day on or after `since` that the slot happens on.
    const first = new Date(`${since}T00:00:00Z`)
    while (!slot.days.includes(((first.getUTCDay() + 6) % 7) + 1)) first.setUTCDate(first.getUTCDate() + 1)
    const day = first.toISOString().slice(0, 10).replaceAll("-", "")
    const time = (hhmm: string) => `${hhmm.replace(":", "")}00`
    return [
      "BEGIN:VEVENT",
      `UID:live-${index}@muanlartins.com.br`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${timeZone}:${day}T${time(slot.start)}`,
      `DTEND;TZID=${timeZone}:${day}T${time(slot.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${slot.days.map((d) => ICS_DAYS[d - 1]).join(",")}`,
      `SUMMARY:${escape(title(slot.game))}`,
      `DESCRIPTION:${escape(description)}`,
      `URL:${url}`,
      `LOCATION:${url}`,
      "END:VEVENT",
    ]
  })
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//muanlartins//agenda//PT",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escape(summary)}`,
    `X-WR-TIMEZONE:${timeZone}`,
    // Brasília has kept UTC−3 all year since 2019.
    "BEGIN:VTIMEZONE",
    `TZID:${timeZone}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}
