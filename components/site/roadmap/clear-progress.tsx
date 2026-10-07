"use client"

import { RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { useProgress } from "@/lib/progress"
import { UI } from "@/lib/site"
import { cn } from "@/lib/utils"

/** Wipes a roadmap's saved progress: the first click asks, a second one within a few seconds clears. */
export function ClearProgress({ roadmap }: { roadmap: string }) {
  const { progress, clear } = useProgress(roadmap)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!asking) return
    const timer = setTimeout(() => setAsking(false), 4000)
    return () => clearTimeout(timer)
  }, [asking])

  if (Object.keys(progress).length === 0) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (asking) clear()
        setAsking(!asking)
      }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
        asking ? "border-navy bg-navy text-paper" : "border-zinc-300 text-muted hover:border-klein hover:text-klein",
      )}
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {asking ? UI.confirmClear : UI.clearProgress}
    </button>
  )
}
