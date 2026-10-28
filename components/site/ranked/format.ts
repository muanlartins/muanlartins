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
  return dateFormat.format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(at) ? `${at}T12:00:00-03:00` : at))
}

export function time(at: string) {
  return timeFormat.format(new Date(at))
}

export function decimal(n: number, digits = 1) {
  return n.toLocaleString(HTML_LANG[LOCALE], { maximumFractionDigits: digits })
}
