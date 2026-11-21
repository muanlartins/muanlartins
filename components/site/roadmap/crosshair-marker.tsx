"use client"

import { motion, useSpring, useTransform, useVelocity, type MotionValue } from "motion/react"
import { Crosshair } from "@/components/site/game/crosshair"

/**
 * Valorant's marker on the fundamentals' rail: its crosshair, which blooms while it travels down the rail (as the
 * game's spreads while you move) and closes again when it stops.
 */
export default function CrosshairMarker({ distance, size = 24 }: { distance: MotionValue<number>; size?: number }) {
  const speed = useVelocity(distance)
  const spread = useTransform(speed, (pxPerSecond) => 1 + Math.min(Math.abs(pxPerSecond) / 1600, 0.4))
  const scale = useSpring(spread, { stiffness: 320, damping: 30 })
  return (
    <motion.span className="block" style={{ scale }}>
      <Crosshair size={size} />
    </motion.span>
  )
}
