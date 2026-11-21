"use client"

import Link from "next/link"
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { BadgeChips } from "@/components/site/profile/badges"
import { FanView } from "@/components/site/profile/fan-view"
import { shortDate } from "@/components/site/ranked/format"
import { BarList, cardClass, EmptyState, ErrorLine, Ranking, Section, Skeleton } from "@/components/site/ui"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { COUNTS, MILESTONES, mural as muralCopy } from "@/content/pix"
import { livePath } from "@/lib/channel"
import { loadAudience, loadFans, SIGMA_API, type Choice, type Sigma, type Torcedor, type Viewer } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(muralCopy)
const milestones = localize(MILESTONES)
const LANG = LOCALE === "pt" ? "pt-BR" : "en"
const number = (n: number) => n.toLocaleString(LANG)
/** "pessoa|pessoas" for n. */
const plural = (n: number, forms: string) => forms.split("|")[n === 1 ? 0 : 1]
const fillText = (template: string, slots: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k) => String(slots[k] ?? ""))

/** Most Σ first, the stream stand's order. */
const bySigma = (a: Viewer, b: Viewer) => b.sigma - a.sigma || b.minutos - a.minutos || a.login.localeCompare(b.login)

/** "45 min", "3 h", "12,5 h". */
function watched(minutos: number) {
  if (minutos < 60) return `${Math.round(minutos)} min`
  const h = Math.round(minutos / 6) / 10
  return `${h.toLocaleString(LANG, { maximumFractionDigits: h < 10 ? 1 : 0 })} h`
}

/** A template's {slots} filled with nodes. */
function fill(template: string, slots: Record<string, ReactNode>) {
  return template.split(/\{(\w+)\}/).map((part, i) => <Fragment key={i}>{i % 2 ? slots[part] : part}</Fragment>)
}

interface Look {
  T: Torcedor | null
  S: Sigma | null
  fans: Record<string, Choice> | null
}

/** Their fan, the one they built on /perfil or the one their login gives them. */
function Fan({ p, look: { T, fans }, className }: { p: Viewer; look: Look; className?: string }) {
  return <div className={className}>{T && fans && <FanView T={T} fan={T.normalizar(fans[p.login] ?? null, p.login)} className="h-full w-full" />}</div>
}

/** Their rank's emblem, as by their name on the stream's stand. */
function Emblem({ p, S, size = "h-4 w-4" }: { p: Viewer; S: Sigma | null; size?: string }) {
  if (!S) return null
  const rank = S.ranque(p.sigma, LOCALE)
  // eslint-disable-next-line @next/next/no-img-element -- a static emblem, already sized
  return <img src={rank.emblema} alt={rank.nome} title={rank.nome} className={cn("shrink-0 object-contain", size)} />
}

/** Everyone who had watched by a milestone, as the stream's stand: rows of fans, each on its step, name above. */
function Stand({ people, look }: { people: Viewer[]; look: Look }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-y-5 px-3 sm:px-6">
      {people.map((p) => (
        <li key={p.login} className="flex min-w-0 flex-col items-center">
          <span className="mb-2.5 flex max-w-[100px] min-w-0 items-center gap-1 bg-navy/85 px-1.5 py-0.5 text-[12px] font-medium text-paper">
            <Emblem p={p} S={look.S} size="h-3.5 w-3.5" />
            <ViewerName login={p.login} className="block truncate">
              {p.login}
            </ViewerName>
          </span>
          <Fan p={p} look={look} className="h-[54px] w-9" />
          <span aria-hidden className="h-2 w-full bg-navy/45" />
        </li>
      ))}
    </ul>
  )
}

/** A number on its own: what it is, the number, and a line under it. */
function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={cn(cardClass, "p-5")}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-klein">{value}</p>
      {hint && <p className="mt-1 text-[13px] leading-snug text-muted">{hint}</p>}
    </div>
  )
}

/**
 * A count's milestones as a ladder: one segment per step up to the next one, the steps reached full, the next filling
 * up. Steps are evenly spaced (10, 25, 50, 100 are rungs, not a scale), each with its number under it.
 */
function Ladder({ label, value, steps }: { label: string; value: number; steps: number[] }) {
  const next = steps.findIndex((s) => s > value)
  const shown = next < 0 ? steps : steps.slice(0, next + 1)
  return (
    <div className={cn(cardClass, "space-y-3 p-5")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-[13px] text-muted">{label}</p>
        {next >= 0 && <p className="text-[13px] text-muted">{fillText(text.nextMilestone, { n: number(steps[next]) })}</p>}
      </div>
      <p className="text-xl font-semibold text-klein">{number(value)}</p>
      <div>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }} role="img" aria-label={`${label}: ${number(value)}`}>
          {shown.map((step, i) => {
            const from = i ? shown[i - 1] : 0
            const share = Math.min(1, Math.max(0, (value - from) / (step - from)))
            return (
              <span key={step} className="h-2.5 bg-klein/12">
                <span className="block h-full bg-klein" style={{ width: `${share * 100}%` }} />
              </span>
            )
          })}
        </div>
        <div aria-hidden className="mt-1.5 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
          {shown.map((step) => (
            <span key={step} className={cn("text-right text-[12px] tabular-nums", step <= value ? "text-klein" : "text-muted")}>
              {number(step)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The lives watched in bins: 1, 2, 3, 4–5, 6–9, 10–19, 20+, up to the bin of the most anyone watched. */
const BINS: [number, number][] = [
  [1, 1],
  [2, 2],
  [3, 3],
  [4, 5],
  [6, 9],
  [10, 19],
  [20, Infinity],
]

interface Moment {
  date: string
  titles: string[]
  counts: number[]
  newcomers: number
  before: number
  live: boolean
  dedication: boolean
}

/**
 * The timeline: the dated milestones, the days the crowd passed a count (from everyone's first live) and each live's
 * newcomers as a bar, newest first. Whoever came before 2026-11-07 has no first live kept: they're counted on the
 * dedication's day.
 */
function moments(people: Viewer[]): Moment[] {
  const by = new Map<string, Moment>()
  const at = (date: string) => by.get(date) ?? by.set(date, { date, titles: [], counts: [], newcomers: 0, before: 0, live: false, dedication: false }).get(date)!
  for (const m of milestones) {
    const x = at(m.date)
    x.titles.push(m.title)
    x.live ||= !!m.live
    x.dedication ||= !!m.dedication
  }
  const dedicated = milestones.find((m) => m.dedication)
  const before = people.filter((p) => !p.primeira).length
  if (dedicated && before) at(dedicated.date).before = before
  for (const p of people) if (p.primeira) at(p.primeira).newcomers++
  // The count's steps, dated by the day the crowd reached them.
  let total = 0
  for (const x of [...by.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const was = total
    total += x.newcomers + x.before
    x.counts = COUNTS.pessoas.filter((s) => s > was && s <= total)
  }
  return [...by.values()].sort((a, b) => b.date.localeCompare(a.date))
}

function Timeline({ people, onStand }: { people: Viewer[]; onStand: (() => void) | null }) {
  const list = useMemo(() => moments(people), [people])
  const most = Math.max(1, ...list.map((m) => m.newcomers))
  return (
    <ol className="space-y-0">
      {list.map((m, i) => {
        const big = m.titles.length > 0 || m.counts.length > 0
        return (
          <li key={m.date} className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[4rem_1fr] sm:gap-4">
            <time dateTime={m.date} className={cn("pt-0.5 text-right text-[13px] tabular-nums", big ? "font-medium text-ink" : "text-muted")}>
              {shortDate(m.date)}
            </time>
            <div className={cn("relative border-l-2 border-line pl-5", i < list.length - 1 ? "pb-6" : "pb-1")}>
              <span aria-hidden className={cn("absolute top-1.5 -left-[7px] rounded-full ring-4 ring-ground", big ? "h-3 w-3 bg-klein" : "-left-[5px] h-2 w-2 bg-line-strong")} />
              <div className="space-y-1.5">
                {m.titles.map((t) => (
                  <p key={t} className="text-[17px] leading-snug font-medium text-ink">
                    {t}
                  </p>
                ))}
                {m.counts.map((n) => (
                  <p key={n} className="text-[17px] leading-snug font-medium text-klein">
                    {fillText(text.countPeople, { n: number(n) })}
                  </p>
                ))}
                {(m.newcomers > 0 || m.before > 0) && (
                  <div className="flex items-center gap-2.5">
                    {m.newcomers > 0 && <span aria-hidden className="h-2 bg-klein/60" style={{ width: `${Math.max(0.375, (m.newcomers / most) * 9)}rem` }} />}
                    <span className="text-[13px] text-muted tabular-nums">
                      {m.newcomers > 0 ? fillText(plural(m.newcomers, text.newcomers), { n: number(m.newcomers) }) : fillText(text.before, { n: number(m.before) })}
                    </span>
                  </div>
                )}
                {(m.live || (m.dedication && onStand)) && (
                  <p className="flex flex-wrap gap-x-4 text-[14px]">
                    {m.live && (
                      <Link href={livePath(m.date)} className="font-medium text-klein underline-offset-4 hover:underline">
                        {text.seeLive}
                      </Link>
                    )}
                    {m.dedication && onStand && (
                      <a
                        href="#afiliacao"
                        // The tab lives in the address (#audiencia): scroll to the stand without trading it for #afiliacao.
                        onClick={(e) => {
                          e.preventDefault()
                          onStand()
                        }}
                        className="font-medium text-klein underline-offset-4 hover:underline"
                      >
                        {text.seeStand}
                      </a>
                    )}
                  </p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The tab's shape while the audience loads: the lead, the podium, a few lines. */
function AudienceSkeleton() {
  return (
    <div className="space-y-10" aria-busy>
      <Skeleton className="h-20 max-w-[36rem]" />
      <Skeleton className="cut h-[300px]" />
      <Skeleton className="cut h-[220px]" />
    </div>
  )
}

/**
 * The audience tab: how many watch, the ranking by Σ (the site's one ranking, as the minigames'), who comes to the
 * lives in numbers, the milestones as a timeline with each live's newcomers, and the stand of the dedicated one.
 */
export function Audience({ T, S }: { T: Torcedor | null; S: Sigma | null }) {
  const [people, setPeople] = useState<Viewer[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)
  const [last, setLast] = useState<{ dia: string | null; pessoas: { minutosLive: number }[] } | null>(null)
  const look = { T, S, fans }

  const load = useCallback(() => {
    loadAudience().then(
      (list) => {
        setPeople(list.sort(bySigma))
        if (list.length) loadFans(list.map((p) => p.login)).then(setFans, () => setFans({}))
      },
      () => setFailed(true),
    )
    // Who was in the latest live: a tile only, so without it the tab carries on.
    fetch(`${SIGMA_API}/live`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setLast, () => {})
  }, [])

  useEffect(load, [load])
  const retry = () => {
    setFailed(false)
    load()
  }

  const dedicated = milestones.find((m) => m.dedication)
  const honored = useMemo(
    () =>
      dedicated && people
        ? people.filter((p) => !p.primeira || p.primeira <= dedicated.date).sort((a, b) => a.login.localeCompare(b.login))
        : [],
    [people, dedicated],
  )

  if (failed) return <ErrorLine onRetry={retry} retryLabel={text.retry}>{text.audienceError}</ErrorLine>
  if (!people) return <AudienceSkeleton />
  if (!people.length) return <EmptyState>{text.audienceEmpty}</EmptyState>

  const minutes = people.reduce((t, p) => t + p.minutos, 0)
  const hours = Math.floor(minutes / 60)
  const visits = people.reduce((t, p) => t + p.lives, 0)
  const back = people.filter((p) => p.lives >= 2).length
  const longest = [...people].sort((a, b) => b.recorde - a.recorde || b.lives - a.lives)[0]
  const most = Math.max(...people.map((p) => p.lives))
  const bins = BINS.filter(([a]) => a <= most).map(([a, b]) => {
    const n = people.filter((p) => p.lives >= a && p.lives <= b).length
    const label = a === b ? `${a} ${plural(a, text.livesUnit)}` : b === Infinity ? fillText(text.livesFrom, { a }) : fillText(text.livesBin, { a, b })
    return { id: String(a), label, value: n, display: `${number(n)} · ${Math.round((n / people.length) * 100)}%` }
  })
  const lastMinutes = last?.pessoas.reduce((t, p) => t + (p.minutosLive ?? 0), 0) ?? 0
  const tiles = [
    { label: text.avgLive, value: watched(visits ? minutes / visits : 0), hint: text.avgLiveHint },
    { label: text.back, value: `${Math.round((back / people.length) * 100)}%`, hint: fillText(text.backHint, { n: number(back), t: number(people.length) }) },
    ...(last?.dia && last.pessoas.length
      ? [{ label: text.lastLive, value: `${number(last.pessoas.length)} ${plural(last.pessoas.length, text.people)}`, hint: fillText(text.lastLiveHint, { d: shortDate(last.dia), h: watched(lastMinutes) }) }]
      : []),
    ...(longest && longest.recorde > 1 ? [{ label: text.streak, value: fillText(text.streakValue, { n: number(longest.recorde) }), hint: longest.login }] : []),
  ]
  const showStand = () => document.getElementById("afiliacao")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })

  return (
    <div className="space-y-16">
      <p className="max-w-[36rem] text-2xl leading-[1.3] font-medium tracking-[-0.02em] text-ink sm:text-4xl sm:leading-[1.2]">
        {fill(text.audienceLead, {
          pessoas: <span className="text-klein">{`${number(people.length)} ${plural(people.length, text.people)}`}</span>,
          horas: <span className="text-klein">{`${number(hours)} ${plural(hours, text.hours)}`}</span>,
        })}
      </p>

      <Section title={text.ranking} description={text.rankingNote}>
        <Ranking
          label={text.ranking}
          showAll={text.showAll}
          showLess={text.showLess}
          you={text.you}
          entries={people.map((p) => ({
            id: p.login,
            figure: <Fan p={p} look={look} className="h-full w-full" />,
            name: <ViewerName login={p.login}>{p.login}</ViewerName>,
            mark: <Emblem p={p} S={S} />,
            value: `${number(p.sigma)} Σ`,
            detail: `${watched(p.minutos)} · ${number(p.lives)} ${plural(p.lives, text.livesUnit)}`,
            extra: S ? <BadgeChips badges={S.medalhas(p, LOCALE)} streak={p.sequencia} /> : undefined,
          }))}
        />
      </Section>

      <Section title={text.statsTitle}>
        <div className="space-y-8">
          <div className={cn("grid grid-cols-2 gap-3", tiles.length === 4 ? "lg:grid-cols-4" : tiles.length === 3 && "sm:grid-cols-3")}>
            {tiles.map((t) => (
              <Tile key={t.label} {...t} />
            ))}
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{text.livesTitle}</h3>
            <BarList bars={bins} max={people.length} />
          </div>
        </div>
      </Section>

      <Section title={text.milestones}>
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <Ladder label={text.peopleLadder} value={people.length} steps={COUNTS.pessoas} />
            <Ladder label={text.hoursLadder} value={hours} steps={COUNTS.horas} />
          </div>
          <Timeline people={people} onStand={dedicated && honored.length ? showStand : null} />
        </div>
      </Section>

      {dedicated && honored.length > 0 && (
        <section id="afiliacao" className="cut scroll-mt-24 bg-klein pb-6 text-paper">
          <div className="space-y-3 px-5 pt-7 pb-9 sm:px-8 sm:pt-9">
            <p className="text-[13px] text-paper/75 tabular-nums">{shortDate(dedicated.date)}</p>
            <h2 className="text-2xl font-medium tracking-[-0.02em]">{text.dedicationTitle}</h2>
            <p className="max-w-[36rem] text-[17px] leading-[1.6] text-paper/90">{text.dedication}</p>
          </div>
          <Stand people={honored} look={look} />
          <p className="mt-6 max-w-[40rem] px-5 text-[13px] leading-[1.5] text-paper/75 sm:px-8">
            {`${number(honored.length)} ${plural(honored.length, text.people)}. ${text.dedicationSince}`}
          </p>
        </section>
      )}

      <p className="max-w-[38rem] text-[13px] text-muted">{text.audiencePrivacy}</p>
    </div>
  )
}
