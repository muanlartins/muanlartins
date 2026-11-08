import { cn } from "@/lib/utils"

/**
 * Valorant's default crosshair, in Klein with a Branco outline so it reads on any ground: four lines around a
 * gap and a centre dot. It marks where you are in Valorant's pages as the ball does in Rocket League's.
 */
export function Crosshair({ size = 12, className }: { size?: number; className?: string }) {
  const lines = "M6 .75V3.75M6 8.25V11.25M.75 6H3.75M8.25 6H11.25"
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={cn("block", className)}>
      <path d={lines} className="stroke-paper" strokeWidth="3" strokeLinecap="square" />
      <circle cx="6" cy="6" r="1.6" className="fill-paper" />
      <path d={lines} className="stroke-klein" strokeWidth="1.5" />
      <circle cx="6" cy="6" r="0.85" className="fill-klein" />
    </svg>
  )
}

/** The crosshair as a CSS cursor, hotspot in the middle. */
export const CROSSHAIR_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"><path d="M6 .75V3.75M6 8.25V11.25M.75 6H3.75M8.25 6H11.25" stroke="#f4f5f7" stroke-width="1.6" stroke-linecap="square"/><circle cx="6" cy="6" r="1.1" fill="#f4f5f7"/><path d="M6 .75V3.75M6 8.25V11.25M.75 6H3.75M8.25 6H11.25" stroke="#002fa7" stroke-width=".8"/><circle cx="6" cy="6" r=".55" fill="#002fa7"/></svg>',
)}") 16 16, crosshair`
