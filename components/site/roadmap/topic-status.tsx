"use client"

import { ChevronDown, Circle, CircleCheck, CircleDot } from "lucide-react"
import { useProgress, type Status } from "@/lib/progress"
import { UI } from "@/lib/site"
import { cn } from "@/lib/utils"

const STATUSES = ["none", "practicing", "done"] as const

const ICON = { none: Circle, practicing: CircleDot, done: CircleCheck }

const STYLE = {
  none: "border-zinc-300 text-muted hover:border-klein hover:text-klein",
  practicing: "border-klein-claro bg-klein-claro/25 text-klein",
  done: "border-klein bg-klein text-paper",
}

/** A topic's status, picked from a labelled menu: not started, practicing or done. */
export function TopicStatus({ roadmap, topic, title }: { roadmap: string; topic: string; title: string }) {
  const { progress, setStatus } = useProgress(roadmap)
  const status = progress[topic] ?? "none"
  const Icon = ICON[status]

  return (
    <label
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border text-[13px] font-medium transition-colors focus-within:ring-2 focus-within:ring-klein-claro",
        STYLE[status],
      )}
    >
      <Icon className="pointer-events-none absolute left-2.5 h-4 w-4" />
      <select
        value={status}
        onChange={(event) => setStatus(topic, event.target.value === "none" ? undefined : (event.target.value as Status))}
        aria-label={title}
        className="cursor-pointer appearance-none bg-transparent py-1.5 pl-8 pr-8 outline-none"
      >
        {STATUSES.map((value) => (
          <option key={value} value={value} className="bg-paper text-ink">
            {UI.status[value]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5" />
    </label>
  )
}
