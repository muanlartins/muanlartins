"use client"

import { useMotionValue, useReducedMotion, useScroll, useSpring } from "motion/react"
import dynamic from "next/dynamic"

const RollingBall = dynamic(() => import("./rolling-ball"), { ssr: false })

/** The ball behind a topic's page, half out of the bottom-left corner, rolling as the page scrolls. */
export function BallBackdrop() {
  const { scrollY } = useScroll()
  const rolled = useSpring(scrollY, { stiffness: 60, damping: 20 })
  const still = useMotionValue(0)
  const reduced = useReducedMotion()

  return (
    <div aria-hidden className="pointer-events-none fixed -bottom-[30vmin] -left-[30vmin] -z-10 h-[95vmin] w-[95vmin] opacity-20">
      <RollingBall distance={reduced ? still : rolled} />
    </div>
  )
}
