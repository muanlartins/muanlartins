import { mural } from "@/content/pix"
import { daysLeft, lastDayOf, reais, type Goal } from "@/lib/pix"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(mural)
const LANG = LOCALE === "pt" ? "pt-BR" : "en"

/** "30/11" from a Brasília day ("YYYY-MM-DD"). */
export const shortDay = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(LANG, { day: "2-digit", month: "2-digit", timeZone: "UTC" })

/** "faltam 16 dias", "falta 1 dia", "último dia". */
export const daysLeftLabel = (n: number) => (n <= 0 ? text.lastDay : n === 1 ? text.oneDayLeft : text.daysLeft.replace("{n}", String(n)))

/** How long a goal on screen has left: "até 30/11 · faltam 16 dias", or with `short` "até 30/11 (16 dias)"; null for one with no end. */
export function timeLeft(goal: { prazo: string | null }, short = false) {
  if (!goal.prazo) return null
  const n = daysLeft({ prazo: goal.prazo })
  const until = `${text.until} ${shortDay(lastDayOf(goal)!)}`
  if (!short) return `${until} · ${daysLeftLabel(n)}`
  return `${until} (${n <= 0 ? text.lastDay : n === 1 ? text.oneDay : text.days.replace("{n}", String(n))})`
}

/** A goal's progress: its bar and "R$ x de R$ y" (with `when`, until when it runs). */
export function GoalBar({ goal, of, large, when }: { goal: Pick<Goal, "alvo" | "arrecadado"> & { prazo?: string | null }; of: string; large?: boolean; when?: boolean }) {
  const share = goal.alvo > 0 ? goal.arrecadado / goal.alvo : 0
  const left = when && goal.prazo ? timeLeft({ prazo: goal.prazo }) : null
  return (
    <div className="space-y-2">
      <div className={cn("overflow-hidden rounded-full bg-line", large ? "h-4" : "h-2.5")}>
        <div className="h-full rounded-full bg-klein transition-[width] duration-700" style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }} />
      </div>
      <p className={cn("tabular-nums", large ? "text-[17px] text-ink" : "text-[14px] text-muted")}>
        <strong className="font-medium text-klein">R$ {reais(goal.arrecadado)}</strong> {of} R$ {reais(goal.alvo)}
        {large && <span className="text-muted"> · {Math.floor(share * 100)}%</span>}
        {left && <span> · {left}</span>}
      </p>
    </div>
  )
}
