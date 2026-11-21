import { cn } from "@/lib/utils"

/**
 * The page's two marks, so the training and the matches never rest on colour alone: the training is a circle in Klein
 * (Aimlabs' targets are spheres), a match a diamond in navy (Valorant's sharp shapes). Filled when the shot hit, hollow
 * when it missed. `Mark` draws one inside a chart's SVG at (x, y); `Legend` draws one inline beside its word.
 */
export type Side = "training" | "match"

const DIAMOND = (x: number, y: number, r: number) => `M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`

export function Mark({ side, x, y, r, hollow, tone, className }: { side: Side; x: number; y: number; r: number; hollow?: boolean; tone?: "klein" | "navy"; className?: string }) {
  const color = tone ?? (side === "training" ? "klein" : "navy")
  const paint = hollow
    ? cn("fill-paper", color === "klein" ? "stroke-klein" : "stroke-navy")
    : cn(color === "klein" ? "fill-klein" : "fill-navy", "stroke-paper")
  if (side === "training") return <circle cx={x} cy={y} r={r} className={cn(paint, className)} strokeWidth={hollow ? 1.5 : 1} vectorEffect="non-scaling-stroke" />
  return <path d={DIAMOND(x, y, r * 1.25)} className={cn(paint, className)} strokeWidth={hollow ? 1.5 : 1} vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
}

export function Legend({ side, hollow, tone, size = 12 }: { side: Side; hollow?: boolean; tone?: "klein" | "navy"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-6 -6 12 12" aria-hidden className="inline-block shrink-0 overflow-visible align-[-1px]">
      <Mark side={side} x={0} y={0} r={4} hollow={hollow} tone={tone} />
    </svg>
  )
}
