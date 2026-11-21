import { cn } from "@/lib/utils"

/**
 * The strip of the stand the fans stand on (brand/interface.md, "Components"): Klein, its ends cut at a true 45° (the
 * cut is its height). Place it at the bottom of a `relative` box; `height` is in px.
 */
export function StandStrip({ height = 20, className }: { height?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("absolute inset-x-0 bottom-0 bg-klein", className)}
      style={{ height, clipPath: `polygon(${height}px 0, calc(100% - ${height}px) 0, 100% 100%, 0 100%)` }}
    />
  )
}
