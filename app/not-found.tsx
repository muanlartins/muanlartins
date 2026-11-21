import type { Metadata } from "next"
import Link from "next/link"
import { SECTION_ICONS } from "@/components/site/section-icons"
import { ViewerFallback } from "@/components/site/viewer/viewer-fallback"
import { SECTIONS, UI, sectionHref } from "@/lib/site"

export const metadata: Metadata = { title: "404" }

/**
 * "404" in the mark's hand: each digit is one continuous stroke with sharp
 * miters, drawn on the brand's 45° lattice so its diagonals run along the
 * grid lines (1 unit = one lattice cell). The light-blue copy trails the
 * white one and passes under it with a Klein gap, as the mark's two copies
 * do at their crossings.
 */
const FOUR = "M3 2H0L2 0V4"
const ZERO = "M1.5 0H2L3 1V3L2 4H1L0 3V1L1 0H1.5"
const DIGITS = [FOUR, ZERO, FOUR]

const U = 24
const PAD = { x: 3, y: 2 }
const WIDTH = DIGITS.length * 4 - 1 + PAD.x * 2
const HEIGHT = 4 + PAD.y * 2
const STROKE = 0.42
const GAP = 0.14

function Strokes({ color, offset, delay, width = STROKE }: { color: string; offset: number; delay: number; width?: number }) {
  return (
    <g transform={`translate(${(PAD.x + offset) * U} ${(PAD.y + offset) * U}) scale(${U})`}>
      {DIGITS.map((d, i) => (
        <path
          key={i}
          d={d}
          transform={`translate(${i * 4} 0)`}
          pathLength={1}
          className="draw-stroke"
          style={{ animationDelay: `${delay + i * 0.18}s` }}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
      ))}
    </g>
  )
}

export default function NotFound() {
  return (
    <ViewerFallback>
      <section className="space-y-10">
        <div className="cut overflow-hidden bg-klein">
          <svg viewBox={`0 0 ${WIDTH * U} ${HEIGHT * U}`} className="block w-full" role="img" aria-label="404">
            <defs>
              <pattern id="lattice" width={U} height={U} patternUnits="userSpaceOnUse">
                <path d={`M0 0L${U} ${U}M0 ${U}L${U} 0`} stroke="var(--color-klein-claro)" strokeOpacity={0.22} strokeWidth={1} />
              </pattern>
              <radialGradient id="fade" cx="50%" cy="50%" r="50%">
                <stop offset="0.45" stopColor="#000" />
                <stop offset="1" stopColor="#fff" />
              </radialGradient>
              <mask id="lattice-mask">
                <rect width="100%" height="100%" fill="url(#fade)" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="url(#lattice)" mask="url(#lattice-mask)" />
            <Strokes color="var(--color-klein-claro)" offset={0.5} delay={0.25} />
            <Strokes color="var(--color-klein)" offset={0} delay={0} width={STROKE + 2 * GAP} />
            <Strokes color="var(--color-paper)" offset={0} delay={0} />
          </svg>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-medium text-klein tracking-[-0.03em] sm:text-5xl">{UI.notFound.title}</h1>
          <p className="max-w-[38rem] text-[17px] leading-[1.6] text-ink">{UI.notFound.text}</p>
          {/* The sections as the header has them: their icons and names. */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3 pt-2 text-[17px]">
            {SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section]
              return (
                <Link key={section} href={sectionHref(section)} className="inline-flex items-center gap-2 text-muted transition-colors hover:text-klein">
                  <Icon aria-hidden className="h-5 w-5" />
                  {UI.sections[section]}
                </Link>
              )
            })}
          </nav>
        </div>
      </section>
    </ViewerFallback>
  )
}
