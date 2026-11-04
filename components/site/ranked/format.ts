import { TIME_ZONE, type Standing } from "@/lib/ranked"
import { HTML_LANG, LOCALE } from "@/lib/site"

/** The roadmap's ranks, localized: "diamond" → Diamante, in its emblem's colour. */
export interface RankInfo {
  id: string
  name: string
  color: string
}

const ROMAN = ["I", "II", "III", "IV"]

/** "diamond-2" → Diamante II, with its colour; unranked and Supersonic Legend have no level. */
export function tierOf(tier: string, ranks: RankInfo[]) {
  const [, id, level] = /^(.*?)(?:-(\d))?$/.exec(tier)!
  const rank = ranks.find((rank) => rank.id === id)
  return {
    name: `${rank?.name ?? id}${level ? ` ${ROMAN[Number(level) - 1]}` : ""}`,
    color: rank?.color ?? "#002fa7",
    icon: `/ranks/${tier}.webp`,
  }
}

export function divisionOf(standing: Standing) {
  return standing.division ? ROMAN[standing.division - 1] : undefined
}

/** +9, −7 (a real minus), 0. */
export function signed(n: number) {
  const rounded = Math.round(n)
  return rounded > 0 ? `+${rounded}` : rounded < 0 ? `−${-rounded}` : "0"
}

const dateFormat = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" })
const timeFormat = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" })

/** 28/10 (10/28 in English), in Luan's time. A day key (YYYY-MM-DD) works too. */
export function shortDate(at: string) {
  return dateFormat.format(/^\d{4}-\d{2}-\d{2}$/.test(at) ? noon(at) : new Date(at))
}

/** Midday of a day key in Luan's time, so no time zone moves it to another day. */
const noon = (day: string) => new Date(`${day}T12:00:00-03:00`)

const fullFormat = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" })
const longFormat = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { timeZone: TIME_ZONE, day: "numeric", month: "long", year: "numeric" })
const weekdayFormat = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { timeZone: TIME_ZONE, weekday: "long" })

/** A day key (YYYY-MM-DD) as 28/10/2026 (10/28/2026 in English). */
export function fullDate(day: string) {
  return fullFormat.format(noon(day))
}

/** A day key as "28 de outubro de 2026" / "October 28, 2026". */
export function longDate(day: string) {
  return longFormat.format(noon(day))
}

/** A day key as its weekday: "quarta-feira" / "Wednesday". */
export function weekday(day: string) {
  return weekdayFormat.format(noon(day))
}

export function time(at: string) {
  return timeFormat.format(new Date(at))
}

export function decimal(n: number, digits = 1) {
  return n.toLocaleString(HTML_LANG[LOCALE], { maximumFractionDigits: digits })
}
