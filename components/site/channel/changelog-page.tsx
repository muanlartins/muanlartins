"use client"

import { ArrowUpRight, Car, Clapperboard, Globe, Lightbulb, Play, Radio, Sigma, Users, type LucideIcon } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useEffect, useMemo, useRef, useState } from "react"
import { LifelinePhotoCard } from "@/components/lifeline/lifeline-photos"
import { TwitchIcon, YouTubeIcon } from "@/components/site/brand-icons"
import { DocPage, DocSection, docsLinks } from "@/components/site/docs"
import { Badge, buttonClass, cardClass, EmptyState } from "@/components/site/ui"
import { FanView } from "@/components/site/profile/fan-view"
import {
  FIRST_DAY,
  PEOPLE,
  SHIPPED,
  STATUSES,
  TAGS,
  UPCOMING,
  type Credit,
  type Person,
  type PersonId,
  type Shipped,
  type Status,
  type Tag,
  type Upcoming,
} from "@/content/changelog"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { loadFans, type Choice, type Torcedor } from "@/lib/profile"
import { HTML_LANG, LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { viewerPath } from "@/lib/viewer"

const T = localize(channel)
const R = T.roadmap

const TAG_ICONS: Record<Tag, LucideIcon> = { live: Radio, site: Globe, videos: Clapperboard, rlr: Car, marca: Sigma }
const TAG_ORDER = Object.keys(TAGS) as Tag[]
const STATUS_ORDER = Object.keys(STATUSES) as Status[]

const person = (id: PersonId): Person => PEOPLE[id]

/** What's out, filtered: everything, a category, or what the crowd suggested or told about. */
type Filter = Tag | "comunidade" | null
const shows = (filter: Filter, entry: Shipped) => !filter || (filter === "comunidade" ? Boolean(entry.credits?.length) : entry.tag === filter)

/** Newest first; within a day, as written. */
const ENTRIES = SHIPPED.map((entry, index) => ({ entry, index }))
  .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || a.index - b.index)
  .map(({ entry }) => entry)
const ENTRY_IDS = new Set<string>(ENTRIES.map((entry) => entry.id))

/** Who suggested (or told about) what, in the order of PEOPLE, with everything of theirs (released or coming) and
 * their credit on it. */
const SUGGESTIONS = (Object.keys(PEOPLE) as PersonId[])
  .map((id) => ({
    id,
    items: [...ENTRIES, ...UPCOMING].flatMap((item) => (item.credits ?? []).filter((credit) => credit.by === id).map((credit) => ({ item, credit }))),
  }))
  .filter((suggestion) => suggestion.items.length > 0)

const LOGINS = SUGGESTIONS.flatMap(({ id }) => {
  const login = person(id).login
  return login ? [login] : []
})

const noon = (day: string) => new Date(`${day}T12:00:00Z`).getTime()
const dayNumber = (day: string) => Math.round((noon(day) - noon(FIRST_DAY)) / 86_400_000) + 1
const WEEKDAY = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { weekday: "short", timeZone: "UTC" })
/** The year shows only once the list spans more than one (brand/voz.md, "Formats"). */
const YEARS = new Set(ENTRIES.map((entry) => entry.date.slice(0, 4))).size > 1
/** "sáb., 21/11" (brand/voz.md, "Formats"), with the year when the list spans years. */
function dateLabel(day: string) {
  const [y, m, d] = day.split("-")
  const weekday = WEEKDAY.format(noon(day)).replace(/\.$/, "")
  return `${weekday}., ${d}/${m}${YEARS ? `/${y}` : ""}`
}
/** "21/11". */
const shortDate = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`

/** Seeded by the entry, so the server's tilt matches the browser's; neighbours lean apart. */
function tilt(seed: string, index: number) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  const r = Math.abs(Math.sin(h + index * 78.233))
  // Rounded, so the server's style string and the browser's agree.
  return Math.round((index % 2 === 0 ? -1 : 1) * (h % 2 === 0 ? 1 : -1) * (2 + ((r * 1000) % 1) * 4) * 100) / 100
}

const GRID = "grid grid-cols-[2.5rem_1rem_1fr] gap-x-3"
const RAIL_LEFT = "calc(2.5rem + 0.75rem + 0.5rem)"

interface Fans {
  T: Torcedor | null
  fans: Record<string, Choice> | null
}

/**
 * /canal/roadmap: who had the ideas (their fans on a strip of the stand), what comes next by how sure it is, and the
 * changelog as a timeline like the personal page's, a day at a time, with pictures and clips that tilt, drag and open.
 */
export function ChangelogPage() {
  const [look, setLook] = useState<Fans>({ T: null, fans: null })
  const [filter, setFilter] = useState<Filter>(null)

  useEffect(() => {
    if (!LOGINS.length) return
    loadFans(LOGINS).then(
      (fans) => setLook((look) => ({ ...look, fans })),
      () => setLook((look) => ({ ...look, fans: {} })),
    )
  }, [])

  // A link to an entry shows it even when another category is picked (a link to a section doesn't touch the filter).
  useEffect(() => {
    const show = () => {
      const id = decodeURIComponent(location.hash.slice(1))
      if (!ENTRY_IDS.has(id)) return
      setFilter(null)
      // It may only exist once the filter is off: go to it after that render.
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView()))
    }
    show()
    addEventListener("hashchange", show)
    return () => removeEventListener("hashchange", show)
  }, [])

  return (
    <>
      {/* The same drawing as the stream's crowd; React hoists the stylesheet into the head. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => setLook((look) => ({ ...look, T: window.Torcedor ?? null }))} />

      <DocPage
        trail={[{ label: T.title, href: channelPath() }]}
        title={R.title}
        description={R.description}
        meta={[
          { label: R.meta.shipped, value: R.meta.count.replace("{n}", `${ENTRIES.length}`) },
          { label: R.meta.latest, value: shortDate(ENTRIES[0].date) },
          { label: R.meta.ideas, value: CREDITED },
        ]}
        toc={TOC}
        more={docsLinks(channelPath("roadmap"))}
      >
        <Community look={look} />
        <Next look={look} />
        <Changelog look={look} filter={filter} setFilter={setFilter} />
      </DocPage>
    </>
  )
}

/** The page's sections, as its index numbers them. Their ids aren't any entry's. */
const TOC = [
  { id: "torcida", title: R.community.title },
  { id: "proximos-passos", title: R.next.title },
  { id: "ja-saiu", title: R.shipped.title },
]
const n = (id: string) => TOC.findIndex((section) => section.id === id) + 1
/** How many releases came from the crowd's ideas. */
const CREDITED = ENTRIES.filter((entry) => entry.credits?.length).length

/** The narrowest place on the community's stand: room for a name, or, on a phone, for the fan alone (names then go at two heights). */
const SLOT = 120
const SLOT_COMPACT = 56
/** A step of the stand, the stream's band cut at a true 45° on its ends (as tall as they're cut). */
const STEP = { clipPath: "polygon(20px 0, calc(100% - 20px) 0, 100% 100%, 0 100%)" }

/**
 * The people who suggested something, standing on the stream's stand, each celebrating in turn. As many to a row as
 * fit, the rows as even as they can be (six in rows of five stand three and three), each on its own step.
 */
function Community({ look }: { look: Fans }) {
  const [moving, setMoving] = useState(-1)
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const inner = (width || 720) - 24
  const compact = inner < 560
  const most = Math.max(1, Math.floor(inner / (compact ? SLOT_COMPACT : SLOT)))
  const perRow = Math.ceil(SUGGESTIONS.length / Math.ceil(SUGGESTIONS.length / most))
  const slot = inner / perRow
  // When a name won't fit its place, every other one goes a step higher, so each can take two places.
  const stagger = slot < 112
  const rows: (typeof SUGGESTIONS)[] = []
  for (let i = 0; i < SUGGESTIONS.length; i += perRow) rows.push(SUGGESTIONS.slice(i, i + perRow))

  useEffect(() => {
    if (!look.T || SUGGESTIONS.length < 1 || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let turn = 0
    const timer = setInterval(() => setMoving(turn++ % SUGGESTIONS.length), 2400)
    return () => clearInterval(timer)
  }, [look.T])

  return (
    <DocSection id="torcida" n={n("torcida")} title={R.community.title} description={R.community.text}>
      <div ref={box} className={cn(cardClass, "overflow-hidden")}>
        {rows.map((row, r) => (
          <div key={r} className="relative px-3 pb-3" style={{ paddingTop: stagger ? 64 : 44 }}>
            <div className="absolute inset-x-0 bottom-0 h-5 bg-klein" style={STEP} />
            <ul className="relative flex justify-center">
              {row.map(({ id, items }, j) => {
                const p = person(id)
                return (
                  <li key={id} className="flex justify-center" style={{ width: slot }}>
                    <a href={`#${items[0].item.id}`} className={cn("group relative block", compact ? "h-[72px] w-12" : "h-[96px] w-16")} aria-label={p.name}>
                      <span
                        className={cn(
                          "absolute flex items-center gap-1 whitespace-nowrap bg-navy/80 px-1 py-px text-[12px] font-semibold text-paper transition-colors group-hover:bg-klein sm:px-1.5",
                          stagger && j % 2 ? "bottom-[calc(100%+32px)]" : "bottom-[calc(100%+12px)]",
                          // At two heights the names run wider than their place: the ends' lean inwards, off the edge.
                          stagger && row.length > 1 && j === 0 ? "left-0" : stagger && row.length > 1 && j === row.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                        )}
                        style={{ maxWidth: (stagger ? 2 * slot : slot) - 8 }}
                      >
                        <PlatformIcon where={p.where} className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </span>
                      {look.T && (
                        <FanView
                          T={look.T}
                          fan={look.T.normalizar(p.login ? (look.fans?.[p.login] ?? null) : null, p.login ?? p.name.toLowerCase())}
                          move={r * perRow + j === moving ? "comemora" : undefined}
                          className="h-full w-full"
                        />
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ id, items }) => {
          const p = person(id)
          return (
            // An odd card out takes the whole last row (brand/interface.md: no orphan tile).
            <li key={id} className={cn(cardClass, "px-4 py-3 sm:[&:last-child:nth-child(odd)]:col-span-2")}>
              {p.login ? (
                <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-ink">
                  <PlatformIcon where={p.where} className="h-3.5 w-3.5 text-klein" />
                  <ViewerName login={p.login} className="hover:text-klein">
                    {p.name}
                  </ViewerName>
                </span>
              ) : (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-ink hover:text-klein"
                >
                  <PlatformIcon where={p.where} className="h-3.5 w-3.5 text-klein" />
                  {p.name}
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5 text-muted group-hover:text-klein" />
                </a>
              )}
              {p.note && <span className="ml-1.5 text-[13px] text-muted">{p.note}</span>}
              {[
                { label: R.community.suggested, list: items.filter(({ credit }) => credit.as !== "report") },
                { label: R.community.reported, list: items.filter(({ credit }) => credit.as === "report") },
              ].map(
                ({ label, list }) =>
                  list.length > 0 && (
                    <div key={label}>
                      <p className="eyebrow mt-2 text-muted">{label}</p>
                      <ul className="mt-1 space-y-0.5">
                        {list.map(({ item, credit }) => (
                          <li key={item.id}>
                            <a href={`#${item.id}`} className="text-[14px] leading-[1.5] text-klein underline decoration-line underline-offset-4 hover:decoration-klein">
                              {credit.about ?? item.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
              )}
            </li>
          )
        })}
      </ul>
    </DocSection>
  )
}

/** What comes next, by how sure it is: what's being made now, what's decided, and ideas; or, with nothing queued, what will be. */
function Next({ look }: { look: Fans }) {
  return (
    <DocSection id="proximos-passos" n={n("proximos-passos")} title={R.next.title}>
      {UPCOMING.length === 0 && <EmptyState className="max-w-[38rem]">{R.next.empty}</EmptyState>}
      <div className="space-y-8">
        {STATUS_ORDER.map((status) => {
          const items = UPCOMING.filter((item) => item.status === status)
          if (!items.length) return null
          return (
            <div key={status}>
              <div className="flex items-center gap-2.5">
                <StatusDot status={status} />
                <h3 className="eyebrow text-klein">{STATUSES[status].title}</h3>
                <span className="text-[13px] text-muted">{STATUSES[status].text}</span>
              </div>
              <ul className={cn("mt-3 grid gap-3", status !== "agora" && items.length > 1 && "sm:grid-cols-2")}>
                {items.map((item) => (
                  <UpcomingCard key={item.id} item={item} look={look} />
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </DocSection>
  )
}

function StatusDot({ status }: { status: Status }) {
  if (status === "agora") {
    return (
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-klein opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-klein" />
      </span>
    )
  }
  return <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", status === "proximo" ? "bg-line-strong" : "border border-dashed border-klein")} />
}

function UpcomingCard({ item, look }: { item: Upcoming; look: Fans }) {
  const now = item.status === "agora"
  return (
    <li
      id={item.id}
      className={cn(
        "cut relative scroll-mt-32 p-5",
        now && "bg-klein text-paper",
        item.status === "proximo" && "cut-edge border border-line bg-paper/70",
        item.status === "ideia" && "border border-dashed border-line-strong",
      )}
    >
      <TagChip tag={item.tag} inverted={now} />
      <p className={cn("mt-2 font-medium tracking-[-0.01em]", now ? "text-[20px]" : "text-[16px] text-ink")}>{item.title}</p>
      <p className={cn("mt-1 text-[14px] leading-[1.55]", now ? "text-paper/80" : "text-muted")}>{item.text}</p>
      <Credits credits={item.credits} look={look} inverted={now} />
    </li>
  )
}

/** An entry's category, as a square badge with its icon. */
function TagChip({ tag, inverted }: { tag: Tag; inverted?: boolean }) {
  const Icon = TAG_ICONS[tag]
  return (
    <Badge tone="soft" className={cn(inverted && "bg-paper/15 text-paper")}>
      <Icon aria-hidden className="h-3 w-3" />
      {TAGS[tag]}
    </Badge>
  )
}

function PlatformIcon({ where, className }: { where: Person["where"]; className?: string }) {
  return where === "twitch" ? <TwitchIcon className={className} /> : <YouTubeIcon className={className} />
}

/** An entry's credits, one line each: whoever had the idea, then whoever suggested a part of it. */
function Credits({ credits, look, inverted }: { credits?: Credit[]; look: Fans; inverted?: boolean }) {
  if (!credits?.length) return null
  return (
    <div className="mt-3 space-y-1">
      {credits.map((credit) => (
        <CreditLine key={credit.by} credit={credit} look={look} inverted={inverted} />
      ))}
    </div>
  )
}

/** "Ideia de <fan> Woody_fdp" ("Avisado por" for a bug they told about), and what part was theirs when it's a part:
 * their fan on a sliver of the stand, a link to their channel or to where they said it. */
function CreditLine({ credit, look, inverted }: { credit: Credit; look: Fans; inverted?: boolean }) {
  const p = person(credit.by)
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]", inverted ? "text-paper/85" : "text-muted")}>
      <Lightbulb aria-hidden className={cn("h-4 w-4", inverted ? "text-paper" : "text-klein")} />
      {credit.as === "report" ? R.shipped.reported : R.shipped.idea}
      {/* A viewer's name leads to their page on the site; a YouTube commenter's to their channel. */}
      <a
        href={p.login ? viewerPath(p.login) : p.url}
        {...(p.login ? {} : { target: "_blank", rel: "noreferrer" })}
        className={cn("inline-flex items-center gap-1.5 font-medium", inverted ? "text-paper hover:underline" : "text-ink hover:text-klein")}
      >
        {look.T && (
          <span aria-hidden className={cn("relative inline-block h-[30px] w-[24px]", inverted ? "bg-paper/15" : "bg-klein/[0.08]")}>
            <span className="absolute inset-x-0 bottom-0 h-1 bg-klein" />
            <FanView
              T={look.T}
              fan={look.T.normalizar(p.login ? (look.fans?.[p.login] ?? null) : null, p.login ?? p.name.toLowerCase())}
              className="absolute bottom-1 left-1/2 h-[22px] w-[15px] -translate-x-1/2"
            />
          </span>
        )}
        {p.name}
        <PlatformIcon where={p.where} className="h-3.5 w-3.5 opacity-70" />
      </a>
      {p.note && <span>({p.note})</span>}
      {credit.about && <span>· {credit.about}</span>}
      {credit.link && (
        <a href={credit.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline decoration-current/30 underline-offset-4 hover:decoration-current">
          {R.community.comment}
          <ArrowUpRight aria-hidden className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

/** Everything released, a day at a time on a dashed rail: the day since the site went up, the date, then each release. */
function Changelog({ look, filter, setFilter }: { look: Fans; filter: Filter; setFilter: (filter: Filter) => void }) {
  const days = useMemo(() => {
    const shown = ENTRIES.filter((entry) => shows(filter, entry))
    const byDay: { date: string; entries: Shipped[] }[] = []
    for (const entry of shown) {
      const last = byDay.at(-1)
      if (last?.date === entry.date) last.entries.push(entry)
      else byDay.push({ date: entry.date, entries: [entry] })
    }
    return byDay
  }, [filter])

  const span = dayNumber(ENTRIES[0].date)
  const summary = R.shipped.summary.replace("{n}", `${ENTRIES.length}`).replace("{d}", `${span}`)
  const count = (filter: Filter) => ENTRIES.filter((entry) => shows(filter, entry)).length

  return (
    <DocSection id="ja-saiu" n={n("ja-saiu")} title={R.shipped.title} description={summary}>
      <p id="ja-saiu-filtro" className="eyebrow mb-3 text-muted">
        {R.shipped.filter}
      </p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="ja-saiu-filtro">
        <FilterButton active={filter === null} onClick={() => setFilter(null)} label={R.shipped.all} count={ENTRIES.length} />
        {count("comunidade") > 0 && (
          <FilterButton active={filter === "comunidade"} onClick={() => setFilter("comunidade")} label={R.shipped.community} count={count("comunidade")} icon={Users} />
        )}
        {TAG_ORDER.filter((tag) => count(tag) > 0).map((tag) => (
          <FilterButton key={tag} active={filter === tag} onClick={() => setFilter(tag)} label={TAGS[tag]} count={count(tag)} icon={TAG_ICONS[tag]} />
        ))}
      </div>

      {/* The personal page's rail: Klein tints, a dashed line, the count on the left. */}
      <div className="-mx-6 mt-10 px-6">
        <div className={`${GRID} mb-6 items-end`}>
          <p className="eyebrow text-right leading-5 text-muted">{R.shipped.day}</p>
          <div aria-hidden />
          <p className="eyebrow leading-5 text-muted">{R.shipped.date}</p>
        </div>

        {days.length === 0 ? (
          <EmptyState>{R.shipped.none}</EmptyState>
        ) : (
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute bottom-0 top-0 -translate-x-1/2" style={{ left: RAIL_LEFT, width: 1 }}>
              <div className="h-full w-px border-l border-dashed border-line-strong" />
            </div>
            <ol className="relative">
              {days.map(({ date, entries }) => (
                <li key={date} className="pb-12">
                  <div className={`${GRID} items-center`}>
                    <p className="text-right text-[12px] font-medium leading-4 tabular-nums text-muted">{dayNumber(date)}</p>
                    <div className="flex items-center justify-center">
                      <span aria-hidden className="block h-px w-[10px] bg-line-strong" />
                    </div>
                    <p className="whitespace-nowrap text-[15px] font-medium leading-5 tabular-nums text-muted">{dateLabel(date)}</p>
                  </div>
                  <ul className="mt-6 space-y-8">
                    {entries.map((entry) => (
                      <ShippedEntry key={entry.id} entry={entry} look={look} />
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </DocSection>
  )
}

/** A filter chip (brand/interface.md, "Tabs and filters"): square, filled Klein when on. */
function FilterButton({ active, onClick, label, count, icon: Icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border px-3 py-1.5 text-[14px] transition-colors",
        active ? "border-klein bg-klein text-paper" : "border-line-strong text-ink hover:border-klein hover:text-klein",
      )}
    >
      {Icon && <Icon aria-hidden className="h-3.5 w-3.5 opacity-75" />}
      {label}
      <span className={cn("tabular-nums text-[12px]", active ? "text-paper/70" : "text-muted")}>{count}</span>
    </button>
  )
}

function ShippedEntry({ entry, look }: { entry: Shipped; look: Fans }) {
  const away = entry.href?.startsWith("/rlr")
  return (
    <li className={GRID}>
      <div aria-hidden />
      <div className="flex justify-center pt-[26px]">
        <span
          aria-hidden
          className={cn(
            "relative z-10 block rounded-full ring-4 ring-ground",
            entry.credits?.length ? "h-2.5 w-2.5 bg-klein" : "h-1.5 w-1.5 bg-line-strong",
          )}
        />
      </div>
      <article id={entry.id} className={cn("group relative isolate min-w-0 scroll-mt-32", entry.credits?.length ? "p-5" : "py-1")}>
        {/* The entry's panel (credited ones) and the highlight when it's linked to, behind it so the tilted pictures
            aren't clipped by the cut. */}
        <span
          aria-hidden
          className={cn(
            "cut absolute -z-10 transition-colors duration-700 group-target:bg-klein/[0.08]",
            entry.credits?.length ? "cut-edge inset-0 border border-klein/25 bg-klein/[0.04]" : "-inset-x-4 -inset-y-3",
          )}
        />
        <TagChip tag={entry.tag} />
        <h3 className="mt-2 text-[17px] font-medium leading-snug tracking-[-0.02em] text-ink">{entry.title}</h3>
        <p className="mt-1 max-w-[38rem] text-[15px] leading-[1.6] text-muted">{entry.text}</p>
        <Credits credits={entry.credits} look={look} />

        {(entry.href || entry.video) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.href &&
              (away ? (
                <a href={entry.href} className={LINK}>
                  {R.shipped.see}
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link href={entry.href} className={LINK}>
                  {R.shipped.see}
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                </Link>
              ))}
            {entry.video && (
              <a href={`https://www.youtube.com/watch?v=${entry.video}`} target="_blank" rel="noreferrer" className={LINK}>
                <Play aria-hidden className="h-3.5 w-3.5 fill-current" />
                {R.shipped.watch}
              </a>
            )}
          </div>
        )}

        {entry.media && entry.media.length > 0 && (
          // A pile's cards all step back by the overlap, so a row that wraps starts in line with the text, not over the rail.
          <div className={cn("mt-6 flex flex-wrap items-start", entry.media.length > 1 ? "pl-9" : "pl-1")}>
            {entry.media.map((media, index) => (
              <LifelinePhotoCard
                key={media.src}
                photo={media}
                rotate={tilt(entry.id, index)}
                width={media.portrait ? 136 : 208}
                className={cn("relative", entry.media!.length > 1 ? "-ml-8 max-w-[calc(100%+2rem)]" : "max-w-full", index > 0 && "mt-6")}
              />
            ))}
          </div>
        )}
      </article>
    </li>
  )
}

const LINK = buttonClass({ variant: "secondary", size: "sm" })
