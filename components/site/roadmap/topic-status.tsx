"use client"

import { ChevronDown, Circle, CircleCheck, CircleDot } from "lucide-react"
import { Choice, Choices } from "@/components/site/ui"
import { useProgress, type Status } from "@/lib/progress"
import { UI } from "@/lib/site"
import { cn } from "@/lib/utils"
import { ROADMAP } from "./labels"

const STATUSES = ["none", "practicing", "done"] as const

const ICON = { none: Circle, practicing: CircleDot, done: CircleCheck }

const STYLE = {
  none: "border-line-strong bg-paper/60 text-ink hover:border-klein hover:text-klein",
  practicing: "border-klein bg-klein/10 text-klein",
  done: "border-klein bg-klein text-paper",
}

/**
 * A topic's status (not started, practicing or done), kept in this browser. In a list of topics it's a compact menu
 * labelled with the topic (`menu`); on the topic's own page, the three as choices side by side (`choices`).
 */
export function TopicStatus({ roadmap, topic, title, variant = "menu" }: { roadmap: string; topic: string; title: string; variant?: "menu" | "choices" }) {
  const { progress, setStatus } = useProgress(roadmap)
  const status = progress[topic] ?? "none"
  const pick = (value: (typeof STATUSES)[number]) => setStatus(topic, value === "none" ? undefined : (value as Status))

  if (variant === "choices") {
    return (
      <Choices label={ROADMAP.progress}>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((value) => {
            const Icon = ICON[value]
            return (
              <Choice key={value} size="sm" on={status === value} onClick={() => pick(value)} icon={<Icon aria-hidden className="h-4 w-4" />}>
                {UI.status[value]}
              </Choice>
            )
          })}
        </div>
      </Choices>
    )
  }

  const Icon = ICON[status]
  return (
    <label
      className={cn(
        "cut-sm cut-edge relative inline-flex shrink-0 items-center border text-[14px] font-medium transition-colors focus-within:outline-2 focus-within:-outline-offset-4 focus-within:outline-klein",
        STYLE[status],
        status === "done" && "focus-within:outline-paper",
      )}
    >
      <Icon aria-hidden className="pointer-events-none absolute left-2.5 h-4 w-4" />
      <select
        value={status}
        onChange={(event) => pick(event.target.value as (typeof STATUSES)[number])}
        aria-label={`${ROADMAP.progress}: ${title}`}
        className="cursor-pointer appearance-none bg-transparent py-1.5 pl-8 pr-8 outline-none"
      >
        {STATUSES.map((value) => (
          <option key={value} value={value} className="bg-paper text-ink">
            {UI.status[value]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 h-4 w-4" />
    </label>
  )
}
