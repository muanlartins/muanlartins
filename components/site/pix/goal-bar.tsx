import { reais, type Goal } from "@/lib/pix"
import { cn } from "@/lib/utils"

/** A goal's progress: its bar and "R$ x de R$ y". */
export function GoalBar({ goal, of, large }: { goal: Pick<Goal, "alvo" | "arrecadado">; of: string; large?: boolean }) {
  const share = goal.alvo > 0 ? goal.arrecadado / goal.alvo : 0
  return (
    <div className="space-y-2">
      <div className={cn("overflow-hidden rounded-full bg-line", large ? "h-4" : "h-2.5")}>
        <div className="h-full rounded-full bg-klein transition-[width] duration-700" style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }} />
      </div>
      <p className={cn("tabular-nums", large ? "text-[17px] text-ink" : "text-[14px] text-muted")}>
        <strong className="font-medium text-klein">R$ {reais(goal.arrecadado)}</strong> {of} R$ {reais(goal.alvo)}
        {large && <span className="text-muted"> · {Math.floor(share * 100)}%</span>}
      </p>
    </div>
  )
}
