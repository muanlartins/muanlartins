"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { GoalBar, shortDay, timeLeft } from "@/components/site/pix/goal-bar"
import { CardLink } from "@/components/site/ui"
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

/** A day's goal marks in words: "Último dia da meta Os três primeiros dígitos", "Começa a meta Natal". */
export function goalLines(marks?: GoalMarks) {
  if (!marks) return []
  return [...marks.ends.map((title) => `${T.goalEndsDay} ${title}`), ...marks.starts.map((title) => `${T.goalStartsDay} ${title}`)]
}

/**
 * The goal on screen, its bar and until when, and the one scheduled after it, as a card to the mural. The goals are
 * an extra on the agenda: nothing while they load, can't be read or there's neither.
 */
export function GoalsNow({ goals, className }: { goals: Goals | null; className?: string }) {
  if (!goals || (!goals.meta && !goals.proxima)) return null
  const { meta, proxima } = goals
  const next = proxima && lastDayOf(proxima)
  return (
    <CardLink href={`/${MURAL_SLUG}`} className={className}>
      <p className="eyebrow text-muted">{T.goals}</p>
      {meta && (
        <>
          <p className="mt-2 mb-3 text-xl font-medium tracking-[-0.02em] text-ink">{meta.titulo || M.goalNow}</p>
          <GoalBar goal={meta} of={M.of} />
          {meta.prazo && <p className="mt-1 text-[13px] tabular-nums text-muted">{meta.arrecadado >= meta.alvo ? `${M.reached} · ${timeLeft(meta)}` : timeLeft(meta)}</p>}
        </>
      )}
      {proxima && (
        <p className={`text-[13px] tabular-nums text-muted ${meta ? "mt-4 border-t border-line pt-3" : "mt-2"}`}>
          {meta ? `${T.after}: ` : `${M.next}: `}
          <span className="font-medium text-ink">{proxima.titulo}</span> · R$ {reais(proxima.alvo)} · {shortDay(firstDayOf(proxima))}
          {next && `–${shortDay(next)}`}
        </p>
      )}
      <p className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-klein">
        {T.seeMural}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </p>
    </CardLink>
  )
}
