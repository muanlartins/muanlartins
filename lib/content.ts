import type {
  LifelineEventImage,
  LifelineEventSegment,
  LifelineMarker,
  LifelineMentor,
  LifelineMetPerson,
  LifelinePhoto,
} from "@/components/lifeline/types"
import { HTML_LANG, LOCALE, localize, type L10n } from "@/lib/site"

/**
 * The shape of a page's content file (content/*.ts). Every piece of copy
 * is an `{ pt, en }` pair; structure, images and links are written once.
 */

type Bilingual<T> = { [K in keyof T]: T[K] extends string ? string | L10n : T[K] }

export type TimelineEvent =
  | L10n
  | {
      text: L10n | Bilingual<LifelineEventSegment>[]
      /** Hover reveal on desktop, tap to expand on mobile. */
      image?: Bilingual<LifelineEventImage>
      effect?: "fireworks"
    }

export interface TimelineMilestone {
  /** "2015", "2015-03" or "2015-03-14" — as precise as you like. */
  date: string
  events: TimelineEvent[]
  /** Always-visible floating cards, tilted like a notebook. */
  photos?: Bilingual<LifelinePhoto>[]
  mentors?: Bilingual<LifelineMentor>[]
  met?: LifelineMetPerson[]
}

export interface TimelinePage {
  title: L10n
  /** The paragraph under the title; also what Google and shared links show. */
  description: L10n
  /** Each language's YouTube video: the id in youtube.com/watch?v=<id>. Empty shows "coming soon". */
  video: L10n
  /** The left column counts years since this date: a birthday, a first job. */
  countFrom: string
  /** Column headers above the rail. */
  labels: { age: L10n; year: L10n }
  /** Only these appear on the rail, in date order. */
  milestones: TimelineMilestone[]
}

export function timeline(page: TimelinePage) {
  return page
}

interface ParsedDate {
  y: number
  m?: number
  d?: number
}

function parseDate(date: string): ParsedDate {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(date)
  if (!match) throw new Error(`"${date}" isn't a date — write it as 2015, 2015-03 or 2015-03-14.`)
  const [, y, m, d] = match
  return { y: Number(y), m: m ? Number(m) : undefined, d: d ? Number(d) : undefined }
}

function formatDate({ y, m, d }: ParsedDate) {
  if (!m) return `${y}`
  const month = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { month: "short", timeZone: "UTC" })
    .format(Date.UTC(y, m - 1, d ?? 1))
    .replace(".", "")
  return d ? `${d} ${month} ${y}` : `${month} ${y}`
}

/** Whole years from `from` to `to`, using months and days only when both dates have them. */
function yearsBetween(from: ParsedDate, to: ParsedDate) {
  let years = to.y - from.y
  if (from.m && to.m) {
    const before = to.m < from.m || (to.m === from.m && !!from.d && !!to.d && to.d < from.d)
    if (before) years--
  }
  return Math.max(0, years)
}

function position({ y, m, d }: ParsedDate) {
  return y + ((m ?? 1) - 1) / 12 + ((d ?? 1) - 1) / 365
}

export function toLifelineMarkers(page: TimelinePage): LifelineMarker[] {
  const from = parseDate(page.countFrom)
  return page.milestones
    .map(({ date, ...milestone }, index) => {
      const parsed = parseDate(date)
      return {
        ...(localize(milestone) as Omit<LifelineMarker, "id" | "year">),
        id: `${date}-${index}`,
        year: position(parsed),
        label: formatDate(parsed),
        age: yearsBetween(from, parsed),
      }
    })
    .sort((a, b) => a.year - b.year)
}
