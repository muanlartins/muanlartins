import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

const LINE = "color-mix(in oklab, var(--color-klein-claro) 22%, transparent)"
// One cell is 24 px across; along the diagonal that's 24 × cos 45°.
const STEP = "calc(24px * 0.7071)"
const RULE = `transparent 0 calc(${STEP} - 1px), ${LINE} 0 ${STEP}`

/**
 * The identity's lattice (brand/interface.md, "The motifs"): hairlines at ±45°, one every 24 px, Klein claro at 0.22,
 * as `.ground` draws it on the live (still here: the site doesn't move at rest). The ground of the site's Klein surfaces
 * only, never behind text on the light ground. It fills its positioned parent; `fade` lets it thin out towards a side
 * so what sits on top reads first.
 */
export function Lattice({ fade, className }: { fade?: "left" | "right" | "bottom"; className?: string }) {
  const style: CSSProperties = { backgroundImage: `repeating-linear-gradient(45deg, ${RULE}), repeating-linear-gradient(-45deg, ${RULE})` }
  if (fade) {
    const to = fade === "left" ? "to right" : fade === "right" ? "to left" : "to top"
    style.maskImage = style.WebkitMaskImage = `linear-gradient(${to}, transparent, black 70%)`
  }
  return <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)} style={style} />
}
