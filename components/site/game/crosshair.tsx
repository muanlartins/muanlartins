import { cn } from "@/lib/utils"

const LINES = "M6 .75V3.75M6 8.25V11.25M.75 6H3.75M8.25 6H11.25"

/** Each tone's classes, written out whole so Tailwind finds them: the outline, then the ink. */
const TONES = {
  klein: { edge: ["stroke-paper", "fill-paper"], ink: ["stroke-klein", "fill-klein"] },
  paper: { edge: ["stroke-navy", "fill-navy"], ink: ["stroke-paper", "fill-paper"] },
}

/**
 * Valorant's default crosshair, the game kit's sign and marker for Valorant (game-icon.tsx): four lines around a gap
 * and a centre dot, outlined so it reads on any ground. In Klein with a Branco outline on the light pages (the
 * default); `tone="paper"`, Branco with a navy outline, on Klein and navy, as the game draws it on its dark.
 */
export function Crosshair({ size = 12, tone = "klein", className }: { size?: number; tone?: "klein" | "paper"; className?: string }) {
  const { edge, ink } = TONES[tone]
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={cn("block", className)}>
      <path d={LINES} className={edge[0]} strokeWidth="3" strokeLinecap="square" />
      <circle cx="6" cy="6" r="1.6" className={edge[1]} />
      <path d={LINES} className={ink[0]} strokeWidth="1.5" />
      <circle cx="6" cy="6" r="0.85" className={ink[1]} />
    </svg>
  )
}

// The tokens' values (app/globals.css): a cursor is an image, so it can't read them.
const PAPER = "#f4f5f7"
const KLEIN = "#002fa7"
const NAVY = "#001447"

const cursor = (ink: string, edge: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 12 12"><path d="${LINES}" stroke="${edge}" stroke-width="1.6" stroke-linecap="square"/><circle cx="6" cy="6" r="1.1" fill="${edge}"/><path d="${LINES}" stroke="${ink}" stroke-width=".8"/><circle cx="6" cy="6" r=".55" fill="${ink}"/></svg>`,
  )}") 16 16, crosshair`

/** The crosshair as a CSS cursor, hotspot in the middle: Klein on the light pages. */
export const CROSSHAIR_CURSOR = cursor(KLEIN, PAPER)

/** The same in Branco, for Klein and navy grounds (the range). */
export const CROSSHAIR_CURSOR_PAPER = cursor(PAPER, NAVY)
