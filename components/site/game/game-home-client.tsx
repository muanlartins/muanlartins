"use client"

import dynamic from "next/dynamic"
import { useProgress } from "@/lib/progress"
import { UI } from "@/lib/site"

const Showroom = dynamic(() => import("./showroom"), { ssr: false })

export function ShowroomStage() {
  return <Showroom />
}

/** The visitor's own progress through the roadmap, from this browser. */
export function RoadmapProgress({ roadmap, topics }: { roadmap: string; topics: string[] }) {
  const { progress } = useProgress(roadmap)
  const done = topics.filter((topic) => progress[topic] === "done").length
  if (done === 0) return null
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-klein" style={{ width: `${(done / topics.length) * 100}%` }} />
      </div>
      <p className="text-[12px] tabular-nums text-muted">
        {done}/{topics.length} {UI.completed}
      </p>
    </div>
  )
}
