import { useId, type CSSProperties } from "react"

/**
 * The overall energy as a core: a hexagon in the rank's colour with the energy inside, ringed by the way to the next
 * rank. Voltaic calls its score energy; the ring fills as the week's benchmark gets closer to the next threshold.
 */
export function EnergyCore({ energy, color, progress, size = 112 }: { energy: number; color: string; progress: number; size?: number }) {
  const gradient = useId()
  const r = 52
  const length = 2 * Math.PI * r
  const hexagon = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${60 + 36 * Math.cos(angle)},${60 + 36 * Math.sin(angle)}`
  }).join(" ")
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className="shrink-0" style={{ "--rank": color } as CSSProperties}>
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in oklab, var(--rank) 55%, white)" />
          <stop offset="55%" stopColor="var(--rank)" />
          <stop offset="100%" stopColor="color-mix(in oklab, var(--rank) 70%, var(--color-navy))" />
        </linearGradient>
      </defs>
      <circle cx={60} cy={60} r={r} fill="none" className="stroke-zinc-200" strokeWidth={6} />
      <circle
        cx={60}
        cy={60}
        r={r}
        fill="none"
        stroke="var(--rank)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - Math.min(1, Math.max(0, progress)))}
        transform="rotate(-90 60 60)"
        className="energy-ring"
        style={{ "--ring-length": length } as CSSProperties}
      />
      <polygon points={hexagon} fill={`url(#${gradient})`} className="drop-shadow-[0_4px_10px_rgba(0,20,71,0.25)]" />
      <text x={60} y={60} dy="0.34em" textAnchor="middle" className="fill-paper text-[24px] font-semibold tabular-nums tracking-[-0.02em]">
        {energy}
      </text>
    </svg>
  )
}
