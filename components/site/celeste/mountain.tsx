import { Strawberry, MountainShape } from "@/components/site/celeste/glyphs"
import { cn } from "@/lib/utils"

/** The base, then a camp per stage, up the switchbacks to the top. */
const BASE = [92, 320] as const
const CAMPS = [
  [186, 286],
  [430, 290],
  [470, 244],
  [262, 232],
  [276, 190],
  [420, 170],
  [326, 130],
  [360, 52],
] as const

/** A point as far along a leg as `share`. */
const along = (from: readonly [number, number], to: readonly [number, number], share: number) =>
  [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share] as const

/**
 * The climb at a glance: the route lit as far as his save says, a camp per stage (each a jump to it), the platinum's
 * flag, the strawberry where he is. It stands still: the rail under it is what moves.
 */
export function Mountain({ stages, fills, current }: { stages: { id: string; title: string; platinum?: boolean }[]; fills: number[]; current: number }) {
  const points = [BASE, ...CAMPS]
  const here = current >= CAMPS.length ? CAMPS[CAMPS.length - 1] : along(points[current], points[current + 1], fills[current] ?? 0)

  return (
    <svg viewBox="0 0 600 330" className="relative block w-full" role="group" aria-label="As etapas na montanha">
      <MountainShape range />
      <polyline points={points.map((point) => point.join(",")).join(" ")} fill="none" className="stroke-klein-claro" strokeWidth="2" strokeDasharray="2 7" />
      {CAMPS.map((camp, index) => {
        const fill = fills[index] ?? 0
        if (!fill) return null
        const tip = along(points[index], camp, fill)
        return <line key={index} x1={points[index][0]} y1={points[index][1]} x2={tip[0]} y2={tip[1]} className="stroke-paper" strokeWidth="4" />
      })}
      {CAMPS.map(([x, y], index) => {
        const stage = stages[index]
        const done = fills[index] === 1
        return (
          <a key={stage.id} href={`#${stage.id}`} aria-label={`Etapa ${index + 1}: ${stage.title}`} className="group">
            <circle cx={x} cy={y} r="22" fill="transparent" />
            {stage.platinum && (
              <g aria-hidden className="fill-ouro">
                <rect x={x + 9} y={y - 52} width="3" height="42" />
                <path d={`M${x + 12} ${y - 52}h26l-7 9 7 9h-26Z`} />
                <text x={x + 12} y={y - 59} className="text-[21px] font-medium uppercase tracking-[0.08em] md:text-[15px]">
                  Platina
                </text>
              </g>
            )}
            <path
              d={`M${x} ${y - 15} ${x + 15} ${y} ${x} ${y + 15} ${x - 15} ${y}Z`}
              strokeWidth="2.5"
              className={cn("transition-colors", done ? "fill-paper stroke-paper" : "fill-klein stroke-klein-claro group-hover:fill-navy")}
            />
            <text x={x} y={y} dominantBaseline="central" textAnchor="middle" className={cn("text-[21px] font-semibold md:text-[15px]", done ? "fill-klein" : "fill-paper")}>
              {index + 1}
            </text>
          </a>
        )
      })}
      <g aria-hidden transform={`translate(${here[0] - 15} ${here[1] - 44})`} className="pointer-events-none">
        <Strawberry size={30} onDark />
      </g>
    </svg>
  )
}
