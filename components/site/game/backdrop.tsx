"use client"

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The tokens' values (app/globals.css), as the filter needs numbers: navy, Klein and Branco, 0–1 per channel.
const NAVY = [0, 20, 71]
const KLEIN = [0, 47, 167]
const PAPER = [244, 245, 247]
const ramp = (channel: number) => [NAVY, KLEIN, PAPER].map((color) => (color[channel] / 255).toFixed(3)).join(" ")

/** The SVG filter that redraws any picture in the brand: its darks navy, its middles Klein, its lights Branco. */
const FILTER = "game-backdrop-brand"

/**
 * The game kit's backdrop (brand/interface.md, "The game kit"): the game's own object behind its pages, out of the
 * bottom-left corner, faint (12% while the text runs over it; 20% from 1024 px, where the side menu leaves it a margin), redrawn in the brand's
 * ramp (navy, Klein, Branco) whatever its colours, behind everything and never in the way. Each game gives only its
 * object, where it sits and how big. Still at rest: it moves only as the page scrolls (`drift`: rising a little, for a
 * picture; a 3D object moves itself by `scrollY`), and not at all under reduced motion.
 */
export function Backdrop({ children, drift = false, className }: { children: ReactNode; drift?: boolean; className?: string }) {
  const { scrollY } = useScroll()
  const reduced = useReducedMotion()
  // A slow rise with the page, up to a tenth of the screen's short side.
  const y = useTransform(scrollY, (scrolled) => (drift && !reduced ? `${-Math.min(scrolled * 0.004, 10)}vmin` : "0vmin"))
  return (
    <motion.div aria-hidden style={{ y }} className={cn("pointer-events-none fixed bottom-0 left-0 -z-10 opacity-[0.12] lg:opacity-20", className)}>
      <svg width="0" height="0" className="absolute">
        <filter id={FILTER} colorInterpolationFilters="sRGB">
          {/* Its lightness alone, then that lightness along the ramp. */}
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={ramp(0)} />
            <feFuncG type="table" tableValues={ramp(1)} />
            <feFuncB type="table" tableValues={ramp(2)} />
          </feComponentTransfer>
        </filter>
      </svg>
      <div className="h-full w-full" style={{ filter: `url(#${FILTER})` }}>
        {children}
      </div>
    </motion.div>
  )
}
