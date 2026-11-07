"use client"

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { BadgeChips } from "@/components/site/profile/badges"
import { FanView } from "@/components/site/profile/fan-view"
import { COUNTS, MILESTONES, mural as muralCopy } from "@/content/pix"
import { loadAudience, loadFans, type Choice, type Sigma, type Torcedor, type Viewer } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"

const text = localize(muralCopy)
const milestones = localize(MILESTONES)
const LANG = LOCALE === "pt" ? "pt-BR" : "en"
const number = (n: number) => n.toLocaleString(LANG)
const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(LANG, { day: "2-digit", month: "2-digit", year: "numeric" })
/** "pessoa|pessoas" for n. */
const plural = (n: number, forms: string) => forms.split("|")[n === 1 ? 0 : 1]
const heading = "text-[13px] font-medium uppercase tracking-[0.12em] text-klein"
const TOP = 10

/** "45 min", "3 h", "12,5 h". */
function watched(minutos: number) {
  if (minutos < 60) return `${minutos} min`
  const h = Math.round(minutos / 6) / 10
  return `${h.toLocaleString(LANG, { maximumFractionDigits: h < 10 ? 1 : 0 })} h`
}

/** A template's {slots} filled with nodes. */
function fill(template: string, slots: Record<string, ReactNode>) {
  return template.split(/\{(\w+)\}/).map((part, i) => <Fragment key={i}>{i % 2 ? slots[part] : part}</Fragment>)
}

/** The next count to reach, as a bar: "37 de 50". */
function NextCount({ label, value, steps }: { label: string; value: number; steps: number[] }) {
  const next = steps.find((s) => s > value)
  if (next === undefined) return null
  const before = [...steps].reverse().find((s) => s <= value) ?? 0
  const share = (value - before) / (next - before)
  return (
    <div className="space-y-3 rounded-md border border-line bg-paper/70 px-4 py-4 sm:px-5">
      <div className="space-y-0.5">
        <p className="text-[13px] text-muted">{text.nextMilestone}</p>
        <p className="text-xl font-medium tracking-[-0.02em] text-ink">{label.replace("{n}", number(next))}</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-klein" style={{ width: `${Math.min(100, Math.max(3, share * 100))}%` }} />
      </div>
      <p className="text-[14px] text-muted tabular-nums">
        <strong className="font-medium text-klein">{number(value)}</strong> {text.of} {number(next)}
      </p>
    </div>
  )
}

/** Everyone who had watched by a milestone, as the stream's stand: rows of fans, each on its step, name above. */
function Stand({ people, T, fans }: { people: Viewer[]; T: Torcedor | null; fans: Record<string, Choice> | null }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-y-5 px-3 sm:px-6">
      {people.map((p) => (
        <li key={p.login} className="flex min-w-0 flex-col items-center">
          <span title={p.login} className="mb-2.5 max-w-[100px] truncate bg-navy/80 px-1.5 py-px text-[11px] font-semibold text-paper">
            {p.login}
          </span>
          <div className="h-[54px] w-9">{T && fans && <FanView T={T} fan={T.normalizar(fans[p.login] ?? null, p.login)} className="h-full w-full" />}</div>
          <span aria-hidden className="h-2 w-full bg-navy/45" />
        </li>
      ))}
    </ul>
  )
}

/** The audience tab: how many watch, the next milestones, the stand of a dedicated milestone, who watches most, the milestones so far. */
export function Audience({ T, S }: { T: Torcedor | null; S: Sigma | null }) {
  const [people, setPeople] = useState<Viewer[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)
  const [all, setAll] = useState(false)

  useEffect(() => {
    loadAudience().then(
      (list) => {
        setPeople(list)
        if (list.length) loadFans(list.map((p) => p.login)).then(setFans, () => setFans({}))
      },
      () => setFailed(true),
    )
  }, [])

  const dedicated = milestones.find((m) => m.dedication)
  const honored = useMemo(
    () =>
      dedicated && people
        ? people.filter((p) => !p.primeira || p.primeira <= dedicated.date).sort((a, b) => a.login.localeCompare(b.login))
        : [],
    [people, dedicated],
  )

  if (failed) return <p className="text-[15px] text-muted">{text.audienceSoon}</p>
  if (!people) return <div className="min-h-[40vh]" />

  const hours = Math.floor(people.reduce((t, p) => t + p.minutos, 0) / 60)
  const reached = [
    ...COUNTS.pessoas.filter((n) => n <= people.length).map((n) => text.countPeople.replace("{n}", number(n))),
    ...COUNTS.horas.filter((n) => n <= hours).map((n) => text.countHours.replace("{n}", number(n))),
  ]
  const shown = all ? people : people.slice(0, TOP)

  return (
    <div className="space-y-12">
      <p className="max-w-[36rem] text-[26px] leading-[1.3] font-medium tracking-[-0.02em] text-ink sm:text-[32px]">
        {fill(text.audienceLead, {
          pessoas: <span className="text-klein">{`${number(people.length)} ${plural(people.length, text.people)}`}</span>,
          horas: <span className="text-klein">{`${number(hours)} ${plural(hours, text.hours)}`}</span>,
        })}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <NextCount label={text.countPeople} value={people.length} steps={COUNTS.pessoas} />
        <NextCount label={text.countHours} value={hours} steps={COUNTS.horas} />
      </div>

      {dedicated && honored.length > 0 && (
        <section id="afiliacao" className="scroll-mt-24 overflow-hidden rounded-md bg-klein pb-6 text-paper">
          <div className="space-y-3 px-5 pt-7 pb-9 sm:px-8 sm:pt-9">
            <p className="text-[14px] text-paper/70 tabular-nums">{day(dedicated.date)}</p>
            <h2 className="text-3xl font-medium tracking-[-0.03em] sm:text-4xl">{text.dedicationTitle}</h2>
            <p className="max-w-[36rem] text-[17px] leading-[1.6] text-paper/90">{text.dedication}</p>
          </div>
          <Stand people={honored} T={T} fans={fans} />
          <p className="mt-6 max-w-[40rem] px-5 text-[13px] leading-[1.5] text-paper/70 sm:px-8">
            {`${number(honored.length)} ${plural(honored.length, text.people)}. ${text.dedicationSince}`}
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className={heading}>{text.top}</h2>
        <ol className="divide-y divide-line overflow-hidden rounded-md border border-line bg-paper/70">
          {shown.map((p, i) => (
            <li key={p.login} className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
              <span className={`w-6 shrink-0 text-right text-[15px] font-medium tabular-nums ${i < 3 ? "text-klein" : "text-muted"}`}>{i + 1}</span>
              <FanSpot T={T} fans={fans} login={p.login} name={p.login} size="sm" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="truncate text-[15px] font-medium text-ink">{p.login}</p>
                {S && <BadgeChips badges={S.medalhas(p, LOCALE)} streak={p.sequencia} />}
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-lg leading-tight font-medium text-klein">{watched(p.minutos)}</p>
                <p className="text-[12px] text-muted">{`${number(p.lives)} ${plural(p.lives, text.livesUnit)}`}</p>
              </div>
            </li>
          ))}
        </ol>
        {people.length > TOP && (
          <button
            type="button"
            onClick={() => setAll(!all)}
            className="rounded-sm border border-line px-4 py-2 text-[15px] font-medium text-klein transition-colors hover:border-klein focus-visible:outline-2 focus-visible:outline-klein"
          >
            {all ? text.showLess : `${text.showAll} (${number(people.length)})`}
          </button>
        )}
      </section>

      <section className="space-y-5">
        <h2 className={heading}>{text.milestones}</h2>
        <ol className="ml-1.5 space-y-5 border-l-2 border-line pl-6">
          {[...milestones].reverse().map((m) => (
            <li key={m.date} className="relative">
              <span className="absolute top-[7px] -left-[32px] h-3 w-3 rounded-full bg-klein ring-4 ring-ground" />
              <p className="text-[13px] text-muted tabular-nums">{day(m.date)}</p>
              <p className="text-[17px] font-medium text-ink">{m.title}</p>
              {m.dedication && honored.length > 0 && (
                <a href="#afiliacao" className="text-[14px] text-klein underline-offset-4 hover:underline">
                  {text.seeStand}
                </a>
              )}
            </li>
          ))}
        </ol>
        {reached.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] text-muted">{text.reachedCounts}</p>
            <ul className="flex flex-wrap gap-2">
              {reached.map((r) => (
                <li key={r} className="rounded-full bg-klein/10 px-3 py-1 text-[13px] font-medium text-klein">
                  ✓ {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <p className="max-w-[38rem] text-[13px] text-muted">{text.audiencePrivacy}</p>
    </div>
  )
}
