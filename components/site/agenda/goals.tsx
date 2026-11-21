"use client"

import { Flag } from "lucide-react"
import { useEffect, useState } from "react"
import { GoalBar, shortDay, timeLeft } from "@/components/site/pix/goal-bar"
import { channel } from "@/content/channel"
import { mural } from "@/content/pix"
import { firstDayOf, lastDayOf, loadGoals, PIX_API, reais, type Goals } from "@/lib/pix"
import { localize, MURAL_SLUG } from "@/lib/site"

const T = localize(channel.agenda)
const M = localize(mural)

/** The Pix goals with their dates, from the Pix API in the browser (null until they come, or if they can't). */
export function useGoals() {
  const [goals, setGoals] = useState<Goals | null>(null)
  useEffect(() => {
    let live = true
    if (PIX_API) loadGoals().then((found) => live && setGoals(found), () => {})
    return () => {
      live = false
    }
  }, [])
  return goals
}

/** What happens to the goals on a day: the ones that start and the ones whose last day it is, by title. */
export interface GoalMarks {
  starts: string[]
  ends: string[]
}

/** Each day a goal starts or ends (the one on screen and the one scheduled), "YYYY-MM-DD" → its marks. */
export function goalMarks(goals: Goals | null): Record<string, GoalMarks> {
  const marks: Record<string, GoalMarks> = {}
  const at = (date: string) => (marks[date] ??= { starts: [], ends: [] })
  for (const goal of [goals?.meta, goals?.proxima]) {
    if (!goal) continue
    at(firstDayOf(goal)).starts.push(goal.titulo || M.goalNow)
    const last = lastDayOf(goal)
    if (last) at(last).ends.push(goal.titulo || M.goalNow)
  }
  return marks
}

/** A day's goal marks in a calendar cell: a flag on a phone, words where there's room. */
export function GoalFlags({ marks }: { marks?: GoalMarks }) {
  if (!marks) return null
  const lines = [...marks.ends.map((title) => [T.goalEnds, title]), ...marks.starts.map((title) => [T.goalStarts, title])]
  return lines.map(([label, title]) => (
    <span key={label + title} title={`${label}: ${title}`} className="flex items-center text-[11px] font-medium leading-tight text-klein">
      <Flag aria-label={label} className="h-3 w-3 shrink-0 sm:hidden" />
      <span className="hidden truncate sm:inline">{label}</span>
    </span>
  ))
}

/** The day picked: "Último dia da meta Os três primeiros dígitos", "Começa a meta Natal". */
export function GoalDayNotes({ marks }: { marks?: GoalMarks }) {
  if (!marks) return null
  const lines = [...marks.ends.map((title) => `${T.goalEndsDay} ${title}`), ...marks.starts.map((title) => `${T.goalStartsDay} ${title}`)]
  return lines.map((line) => (
    <p key={line} className="mt-2 flex items-center gap-2 rounded-md bg-klein/[0.07] px-3 py-2 text-[15px] text-klein">
      <Flag aria-hidden className="h-4 w-4 shrink-0" />
      {line}
    </p>
  ))
}

/** The goal on screen, its bar and until when, and the one scheduled after it; nothing while there's neither. */
export function GoalsNow({ goals }: { goals: Goals | null }) {
  if (!goals || (!goals.meta && !goals.proxima)) return null
  const { meta, proxima } = goals
  const next = proxima && lastDayOf(proxima)
  return (
    <a href={`/${MURAL_SLUG}`} className="mt-6 block rounded-md border border-line bg-paper/70 p-5 backdrop-blur-sm transition-colors hover:border-klein/60 sm:p-6">
      <p className="text-[14px] font-medium text-muted">{T.goals}</p>
      {meta && (
        <>
          <p className="mt-1 mb-3 text-xl font-medium tracking-[-0.02em] text-ink">{meta.titulo || M.goalNow}</p>
          <GoalBar goal={meta} of={M.of} />
          {meta.prazo && meta.arrecadado < meta.alvo && <p className="mt-1 text-[14px] text-muted tabular-nums">{timeLeft(meta)}</p>}
          {meta.prazo && meta.arrecadado >= meta.alvo && (
            <p className="mt-1 text-[14px] text-klein tabular-nums">
              ✓ {M.reached} · {timeLeft(meta)}
            </p>
          )}
        </>
      )}
      {proxima && (
        <p className={`text-[14px] text-muted tabular-nums ${meta ? "mt-4 border-t border-line pt-3" : "mt-1"}`}>
          {meta ? `${T.after}: ` : `${M.next}: `}
          <span className="font-medium text-ink">{proxima.titulo}</span> · R$ {reais(proxima.alvo)} · {shortDay(firstDayOf(proxima))}
          {next && ` – ${shortDay(next)}`}
        </p>
      )}
      <p className="mt-3 text-[14px] font-medium text-klein">{T.seeMural} →</p>
    </a>
  )
}
