import { TIME_ZONE, type Standing } from "@/lib/ranked"
import { HTML_LANG, LOCALE, localize } from "@/lib/site"

/** The roadmap's ranks, localized: "diamond" → Diamante, in its emblem's colour. */
export interface RankInfo {
  id: string
  name: string
  color: string
}

const T = localize({
  unranked: { pt: "Sem rank", en: "Unranked" },
  division: { pt: "div.", en: "div." },
})

/** "diamond-2" → Diamante 2 (brand/voz.md: the game's Portuguese, the level as a number), with its colour; unranked
 * ("Sem rank") and Supersonic Legend have no level. */
export function tierOf(tier: string, ranks: RankInfo[]) {
  const [, id, level] = /^(.*?)(?:-(\d))?$/.exec(tier)!
  const rank = ranks.find((rank) => rank.id === id)
  return {
    name: id === "unranked" ? T.unranked : `${rank?.name ?? id}${level ? ` ${level}` : ""}`,
    color: rank?.color ?? "var(--color-klein)",
    icon: `/ranks/${tier}.webp`,
  }
}

/** The division in the compact form: "div. 2" (written beside the tier: "Diamante 3 · div. 2"); none while unranked. */
export function divisionOf(standing: Standing) {
  return standing.division && standing.tier !== "unranked" ? `${T.division} ${standing.division}` : undefined
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

/** The hour in Luan's time, as the site writes it (brand/voz.md, "Times"): 21h, 21h30 (9:30 PM in English). */
export function time(at: string) {
  if (LOCALE !== "pt") return timeFormat.format(new Date(at))
  const [hour, minute] = timeFormat.format(new Date(at)).split(":")
  return minute === "00" ? `${hour}h` : `${hour}h${minute}`
}

const dayFormat = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" })

/** A day key in the long form, without the year: "sábado, 21 de novembro" / "Saturday, November 21". */
export function longDay(day: string) {
  return dayFormat.format(noon(day))
}

export function decimal(n: number, digits = 1) {
  return n.toLocaleString(HTML_LANG[LOCALE], { maximumFractionDigits: digits })
}

/** A whole number with the locale's grouping: 1.076 (brand/voz.md, "Numbers"). */
export function number(n: number) {
  return Math.round(n).toLocaleString(HTML_LANG[LOCALE])
}
