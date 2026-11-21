"use client"

/**
 * Aceternity UI's Timeline (ui.aceternity.com/components/timeline), added
 * with `shadcn add https://ui.aceternity.com/registry/timeline.json`.
 * Restyled to the brand and sized for the site's column; entries take an
 * id (an anchor) and their own dot. The dots stay on the rail while the
 * titles follow the page (from 640 px; narrower, each title sits over its
 * entry). Instead of the scroll, the beam shows each entry's `fills` (how
 * far its stretch of rail is lit, in Klein) and rolls in when the timeline
 * comes into view; a `marker` rides the `current` entry's tip. Under
 * reduced motion, both are simply where they belong.
 */

import { motion, useInView, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react"
import React, { useEffect, useRef, useState } from "react"

interface TimelineEntry {
  id?: string
  title: React.ReactNode
  /** Sits on the rail; a plain dot when missing. */
  dot?: React.ReactNode
  content: React.ReactNode
}

/** The dot's centre, and the gap the marker keeps from a dot. */
const DOT = 20
const GAP = 34
/** How the beam and the marker roll to where they belong: a ball's roll, settling in about a second. */
const ROLL = { stiffness: 90, damping: 22 }

export const Timeline = ({
  data,
  fills = [],
  current = 0,
  marker,
}: {
  data: TimelineEntry[]
  /** How much of each entry's stretch of rail is lit, 0 to 1. */
  fills?: number[]
  /** The entry whose tip carries the marker; data.length puts it at the end. */
  current?: number
  /** Rides the beam's tip, given the tip's distance down the rail in pixels. */
  marker?: (tip: MotionValue<number>) => React.ReactNode
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const [layout, setLayout] = useState({ height: 0, dots: [] as number[] })

  useEffect(() => {
    if (!ref.current) return
    const timeline = ref.current
    const observer = new ResizeObserver(() =>
      setLayout({
        height: timeline.offsetHeight,
        dots: rows.current.map((row) => (row ? row.offsetTop + parseFloat(getComputedStyle(row).paddingTop) + DOT : 0)),
      }),
    )
    observer.observe(timeline)
    return () => observer.disconnect()
  }, [])

  // Each entry's stretch runs from just under its dot to just above the next one.
  const stretches = layout.dots.map((dot, index) => {
    const end = index + 1 < layout.dots.length ? layout.dots[index + 1] - GAP : layout.height - DOT
    return { dot, start: dot + GAP, end }
  })
  const tipOf = (index: number) => {
    const stretch = stretches[Math.min(index, stretches.length - 1)]
    if (!stretch) return 0
    if (index >= stretches.length) return stretch.end
    return stretch.start + (fills[index] ?? 0) * (stretch.end - stretch.start)
  }

  const inView = useInView(ref, { once: true, margin: "0px 0px -30% 0px" })
  const shown = inView && layout.height > 0
  const tip = useSpring(0, ROLL)
  const reduced = useReducedMotion()
  const target = shown ? tipOf(current) : 0
  useEffect(() => {
    if (reduced) tip.jump(target)
    else tip.set(target)
  }, [reduced, target, tip])
  const opacity = useTransform(tip, [0, 40], [0, 1])

  return (
    <div className="w-full">
      <div ref={ref} className="relative pb-10">
        {data.map((item, index) => (
          <div
            key={item.id ?? index}
            id={item.id}
            ref={(row) => {
              rows.current[index] = row
            }}
            className="relative flex scroll-mt-24 justify-start pt-10 sm:gap-10 sm:pt-24"
          >
            <div className="absolute left-0 top-10 z-40 flex h-10 w-10 items-center justify-center sm:top-24">
              {item.dot ?? <div className="h-3 w-3 rotate-45 border-2 border-line-strong bg-ground" />}
            </div>
            <div className="sticky top-28 z-30 hidden self-start sm:block sm:w-56 sm:shrink-0 sm:pl-16">{item.title}</div>

            <div className="relative w-full min-w-0 pl-16 sm:pl-0">
              <div className="mb-6 block pt-1 sm:hidden">{item.title}</div>
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{ height: layout.height + "px" }}
          className="absolute left-5 top-0 w-[2px] -translate-x-1/2 overflow-hidden bg-line [mask-image:linear-gradient(to_bottom,transparent_0,black_40px,black_calc(100%-80px),transparent_100%)]"
        >
          {stretches.map((stretch, index) => (
            <Beam
              key={index}
              top={stretch.dot}
              length={shown && (index === current || (fills[index] ?? 0) > 0) ? tipOf(index) - stretch.dot : 0}
              reduced={reduced}
            />
          ))}
        </div>
        {marker && (
          <motion.div style={{ y: tip, opacity }} className="absolute left-5 top-0 z-30 -translate-x-1/2 -translate-y-1/2">
            {marker(tip)}
          </motion.div>
        )}
      </div>
    </div>
  )
}

/** One entry's lit stretch, growing down from its dot. */
function Beam({ top, length, reduced }: { top: number; length: number; reduced: boolean | null }) {
  const height = useSpring(0, ROLL)
  useEffect(() => {
    if (reduced) height.jump(length)
    else height.set(length)
  }, [height, length, reduced])

  return (
    <motion.div
      style={{ top, height }}
      className="absolute inset-x-0 w-[2px] bg-klein"
    />
  )
}
