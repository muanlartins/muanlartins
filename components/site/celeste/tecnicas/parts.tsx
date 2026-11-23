import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A technique page's pieces: the shared ones (components/site/lore) and a second of the game. */
export { Beside, Figures, Milestones, Picture, Quote, Text } from "@/components/site/lore"

/** A second of the game, 60 frames, with a stretch lit: how big a window is next to the whole. */
export function Second({ lit, label, className }: { lit: [from: number, to: number]; label: ReactNode; className?: string }) {
  return (
    <figure className={cn("space-y-2", className)}>
      <div role="img" aria-label={typeof label === "string" ? label : undefined} className="grid h-9 grid-cols-[repeat(60,minmax(0,1fr))] gap-px">
        {Array.from({ length: 60 }, (_, frame) => (
          <span key={frame} className={frame >= lit[0] && frame <= lit[1] ? "bg-klein" : "bg-klein/15"} />
        ))}
      </div>
      <figcaption className="text-[13px] text-muted">{label}</figcaption>
    </figure>
  )
}
