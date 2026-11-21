"use client"

import { useMotionValue, useReducedMotion, useScroll, useSpring } from "motion/react"
import dynamic from "next/dynamic"
import { Backdrop } from "@/components/site/game/backdrop"

const RollingBall = dynamic(() => import("./rolling-ball"), { ssr: false })

/**
 * Rocket League's backdrop (the game kit's, components/site/game/backdrop.tsx): the ball behind a topic's page, half
 * out of the bottom-left corner, redrawn in the brand's ramp, rolling as the page scrolls and still otherwise.
 */
export function BallBackdrop() {
  const { scrollY } = useScroll()
  const rolled = useSpring(scrollY, { stiffness: 60, damping: 20 })
  const still = useMotionValue(0)
  const reduced = useReducedMotion()

  return (
    <Backdrop className="-bottom-[30vmin] -left-[30vmin] h-[95vmin] w-[95vmin]">
      <RollingBall distance={reduced ? still : rolled} />
    </Backdrop>
  )
}
