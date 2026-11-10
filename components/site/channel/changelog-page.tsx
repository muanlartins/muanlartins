"use client"

import { ArrowLeft, ArrowUpRight, Car, Clapperboard, Globe, Lightbulb, Play, Radio, Sigma, type LucideIcon } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { LifelinePhotoCard } from "@/components/lifeline/lifeline-photos"
import { TwitchIcon, YouTubeIcon } from "@/components/site/brand-icons"
import { PageIntro } from "@/components/site/page-intro"
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

const T = localize(channel)
const R = T.roadmap

const TAG_ICONS: Record<Tag, LucideIcon> = { live: Radio, site: Globe, videos: Clapperboard, rlr: Car, marca: Sigma }
const TAG_ORDER = Object.keys(TAGS) as Tag[]
const STATUS_ORDER = Object.keys(STATUSES) as Status[]

const person = (id: PersonId): Person => PEOPLE[id]

/** Newest first; within a day, as written. */
const ENTRIES = SHIPPED.map((entry, index) => ({ entry, index }))
  .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || a.index - b.index)
  .map(({ entry }) => entry)

/** Who suggested what, in the order of PEOPLE, with everything of theirs (released or coming). */
const SUGGESTIONS = (Object.keys(PEOPLE) as PersonId[])
  .map((id) => ({ id, items: [...ENTRIES, ...UPCOMING].filter((item) => item.credit?.by === id) }))
  .filter((suggestion) => suggestion.items.length > 0)

const LOGINS = SUGGESTIONS.flatMap(({ id }) => {
  const login = person(id).login
  return login ? [login] : []
})

const noon = (day: string) => new Date(`${day}T12:00:00Z`).getTime()
const dayNumber = (day: string) => Math.round((noon(day) - noon(FIRST_DAY)) / 86_400_000) + 1
const MONTH = new Intl.DateTimeFormat(HTML_LANG[LOCALE], { month: "short", timeZone: "UTC" })
/** "10 nov 2026", like the personal timeline's dates. */
function dateLabel(day: string) {
  const [y, m, d] = day.split("-").map(Number)
  return `${d} ${MONTH.format(Date.UTC(y, m - 1, d)).replace(".", "")} ${y}`
}

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
  const [filter, setFilter] = useState<Tag | null>(null)

  useEffect(() => {
    if (!LOGINS.length) return
    loadFans(LOGINS).then(
      (fans) => setLook((look) => ({ ...look, fans })),
      () => setLook((look) => ({ ...look, fans: {} })),
    )
  }, [])

  // A link to an entry shows it even when another tag is picked.
  useEffect(() => {
    const show = () => location.hash.length > 1 && setFilter(null)
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

      <Link
        href={channelPath()}
        className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-klein"
      >
        <ArrowLeft className="h-4 w-4" />
        {T.title}
      </Link>
      <PageIntro title={R.title} description={R.description} />

      <Community look={look} />
      <Next look={look} />
      <Changelog look={look} filter={filter} setFilter={setFilter} />
    </>
  )
}

function Heading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{children}</h2>
      {aside}
    </div>
  )
}

/** The people who suggested something, standing on the stream's stand, each celebrating in turn. */
function Community({ look }: { look: Fans }) {
  const [moving, setMoving] = useState(-1)

  useEffect(() => {
    if (!look.T || SUGGESTIONS.length < 1 || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let turn = 0
    const timer = setInterval(() => setMoving(turn++ % SUGGESTIONS.length), 2400)
    return () => clearInterval(timer)
  }, [look.T])

  return (
    <section className="mt-14">
      <Heading>{R.community.title}</Heading>
      <p className="mt-2 max-w-[38rem] text-[15px] leading-[1.6] text-muted">{R.community.text}</p>

      <div className="relative mt-5 h-[176px] overflow-hidden rounded-md border border-line bg-paper/70">
        <div
          className="absolute inset-x-0 bottom-0 h-5 bg-klein"
          style={{ clipPath: "polygon(16px 0, calc(100% - 16px) 0, 100% 100%, 0 100%)" }}
        />
        <ul className="absolute inset-x-3 bottom-3 flex justify-around sm:justify-center sm:gap-28">
          {SUGGESTIONS.map(({ id, items }, i) => {
            const p = person(id)
            return (
              <li key={id}>
                <a href={`#${items[0].id}`} className="group relative block h-[96px] w-16" aria-label={p.name}>
                  <span className="absolute bottom-[calc(100%+12px)] left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap bg-navy/80 px-1.5 py-px text-[11px] font-semibold text-paper transition-colors group-hover:bg-klein">
                    <PlatformIcon where={p.where} className="h-2.5 w-2.5" />
                    {p.name}
                  </span>
                  {look.T && (
                    <FanView
                      T={look.T}
                      fan={look.T.normalizar(p.login ? (look.fans?.[p.login] ?? null) : null, p.login ?? p.name.toLowerCase())}
                      move={i === moving ? "comemora" : undefined}
                      className="h-full w-full"
                    />
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {SUGGESTIONS.map(({ id, items }) => {
          const p = person(id)
          return (
            <li key={id} className="rounded-md border border-line bg-paper/70 px-4 py-3 backdrop-blur-sm">
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
              {p.note && <span className="ml-1.5 text-[13px] text-muted">{p.note}</span>}
              <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.1em] text-muted">{R.community.suggested}</p>
              <ul className="mt-1 space-y-0.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-[14px] leading-[1.5] text-klein underline decoration-line underline-offset-4 hover:decoration-klein">
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** What comes next, by how sure it is: what's being made now, what's decided, and ideas. */
function Next({ look }: { look: Fans }) {
  return (
    <section className="mt-16">
      <Heading>{R.next.title}</Heading>
      <div className="mt-6 space-y-8">
        {STATUS_ORDER.map((status) => {
          const items = UPCOMING.filter((item) => item.status === status)
          if (!items.length) return null
          return (
            <div key={status}>
              <div className="flex items-center gap-2.5">
                <StatusDot status={status} />
                <h3 className="text-[13px] font-medium uppercase tracking-[0.12em] text-klein">{STATUSES[status].title}</h3>
                <span className="text-[13px] text-muted">{STATUSES[status].text}</span>
              </div>
              <ul className={cn("mt-3 grid gap-3", status !== "agora" && "sm:grid-cols-2")}>
                {items.map((item) => (
                  <UpcomingCard key={item.id} item={item} look={look} />
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
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
  return <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", status === "proximo" ? "bg-klein-claro" : "border border-dashed border-klein")} />
}

function UpcomingCard({ item, look }: { item: Upcoming; look: Fans }) {
  const now = item.status === "agora"
  return (
    <li
      id={item.id}
      className={cn(
        "scroll-mt-28 rounded-md px-5 py-4",
        now && "bg-klein text-paper",
        item.status === "proximo" && "border border-line bg-paper/70 backdrop-blur-sm",
        item.status === "ideia" && "border border-dashed border-klein/35",
      )}
    >
      <TagChip tag={item.tag} inverted={now} />
      <p className={cn("mt-2 font-medium tracking-[-0.01em]", now ? "text-[20px]" : "text-[16px] text-ink")}>{item.title}</p>
      <p className={cn("mt-1 text-[14px] leading-[1.55]", now ? "text-paper/80" : "text-muted")}>{item.text}</p>
      {item.credit && <CreditLine credit={item.credit} look={look} inverted={now} />}
    </li>
  )
}

function TagChip({ tag, inverted }: { tag: Tag; inverted?: boolean }) {
  const Icon = TAG_ICONS[tag]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium",
        inverted ? "bg-paper/15 text-paper" : "bg-klein/[0.08] text-klein",
      )}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {TAGS[tag]}
    </span>
  )
}

function PlatformIcon({ where, className }: { where: Person["where"]; className?: string }) {
  return where === "twitch" ? <TwitchIcon className={className} /> : <YouTubeIcon className={className} />
}

/** "Ideia de <fan> Woody_fdp": their fan on a sliver of the stand, a link to their channel or to where they said it. */
function CreditLine({ credit, look, inverted }: { credit: Credit; look: Fans; inverted?: boolean }) {
  const p = person(credit.by)
  return (
    <div className={cn("mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]", inverted ? "text-paper/85" : "text-muted")}>
      <Lightbulb aria-hidden className={cn("h-4 w-4", inverted ? "text-paper" : "text-klein")} />
      {R.shipped.idea}
      <a
        href={p.url}
        target="_blank"
        rel="noreferrer"
        className={cn("inline-flex items-center gap-1.5 font-medium", inverted ? "text-paper hover:underline" : "text-ink hover:text-klein")}
      >
        {look.T && (
          <span aria-hidden className={cn("relative inline-block h-[30px] w-[24px] rounded-sm", inverted ? "bg-paper/15" : "bg-klein/[0.08]")}>
            <span className="absolute inset-x-0 bottom-0 h-1 rounded-b-sm bg-klein" />
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
function Changelog({ look, filter, setFilter }: { look: Fans; filter: Tag | null; setFilter: (tag: Tag | null) => void }) {
  const days = useMemo(() => {
    const shown = ENTRIES.filter((entry) => !filter || entry.tag === filter)
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
  const count = (tag: Tag) => ENTRIES.filter((entry) => entry.tag === tag).length

  return (
    <section className="mt-20">
      <Heading aside={<span className="text-[14px] text-muted">{summary}</span>}>{R.shipped.title}</Heading>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={R.shipped.title}>
        <FilterButton active={filter === null} onClick={() => setFilter(null)} label={R.shipped.all} count={ENTRIES.length} />
        {TAG_ORDER.filter((tag) => count(tag) > 0).map((tag) => (
          <FilterButton key={tag} active={filter === tag} onClick={() => setFilter(tag)} label={TAGS[tag]} count={count(tag)} icon={TAG_ICONS[tag]} />
        ))}
      </div>

      {/* The personal page's rail: Klein tints, a dashed line, the count on the left. */}
      <div className="-mx-6 mt-10 px-6">
        <div className={`${GRID} mb-6 items-end`}>
          <p className="text-right text-[11px] font-medium uppercase leading-5 tracking-[0.08em] text-zinc-500">{R.shipped.day}</p>
          <div aria-hidden />
          <p className="text-[11px] font-medium uppercase leading-5 tracking-[0.08em] text-zinc-500">{R.shipped.date}</p>
        </div>

        {days.length === 0 ? (
          <p className="text-[15px] text-muted">{R.shipped.none}</p>
        ) : (
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute bottom-0 top-0 -translate-x-1/2" style={{ left: RAIL_LEFT, width: 1 }}>
              <div className="h-full w-px border-l border-dashed border-zinc-300" />
            </div>
            <ol className="relative">
              {days.map(({ date, entries }) => (
                <li key={date} className="pb-12">
                  <div className={`${GRID} items-center`}>
                    <p className="text-right text-[11px] font-medium leading-4 tabular-nums text-zinc-500">{dayNumber(date)}</p>
                    <div className="flex items-center justify-center">
                      <span aria-hidden className="block h-px w-[10px] bg-zinc-400" />
                    </div>
                    <p className="whitespace-nowrap text-[15px] font-medium leading-5 tabular-nums text-zinc-500">{dateLabel(date)}</p>
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
    </section>
  )
}

function FilterButton({ active, onClick, label, count, icon: Icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-klein",
        active ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein",
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
            entry.credit ? "h-2.5 w-2.5 bg-klein" : "h-1.5 w-1.5 bg-zinc-400",
          )}
        />
      </div>
      <article
        id={entry.id}
        className={cn(
          "min-w-0 scroll-mt-28 rounded-md transition-colors duration-700",
          entry.credit ? "border border-klein/25 bg-klein/[0.04] p-4" : "py-1",
          "target:bg-klein/[0.08]",
        )}
      >
        <TagChip tag={entry.tag} />
        <h3 className="mt-2 text-[18px] font-medium leading-snug tracking-[-0.01em] text-ink">{entry.title}</h3>
        <p className="mt-1 max-w-[34rem] text-[15px] leading-[1.6] text-muted">{entry.text}</p>
        {entry.credit && <CreditLine credit={entry.credit} look={look} />}

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
          <div className="mt-6 flex flex-wrap items-start pl-1">
            {entry.media.map((media, index) => (
              <LifelinePhotoCard
                key={media.src}
                photo={media}
                rotate={tilt(entry.id, index)}
                width={media.portrait ? 136 : 208}
                className={cn("relative", index > 0 && "-ml-8 mt-6")}
              />
            ))}
          </div>
        )}
      </article>
    </li>
  )
}

const LINK =
  "inline-flex items-center gap-1 rounded-md border border-line bg-paper/70 px-2.5 py-1 text-[13px] font-medium text-ink transition-colors hover:border-klein hover:text-klein"
