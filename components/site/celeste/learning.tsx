import { Circle, CircleCheck, CircleDot } from "lucide-react"
import type { Need } from "@/content/celeste"
import type { Learning } from "@/lib/celeste"
import { cn } from "@/lib/utils"

const STATE = {
  ahead: { label: "Vou aprender", icon: Circle, style: "border-line-strong text-ink" },
  learning: { label: "Aprendendo", icon: CircleDot, style: "border-klein bg-klein/10 text-klein" },
  learned: { label: "Aprendi", icon: CircleCheck, style: "border-klein bg-klein text-paper" },
}

const NEED: Record<Need, string> = { needed: "O jogo cobra", useful: "Ajuda", optional: "Opcional" }

export const needLabel = (need: Need) => NEED[need]

export const learningLabel = (state: Learning) => STATE[state].label

/** Where he is with a fundamental: from the cuts and the save, or as he set it (learning-hand.tsx). */
export function LearningBadge({ state }: { state: Learning }) {
  const { label, icon: Icon, style } = STATE[state]
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[13px] font-medium", style)}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}
