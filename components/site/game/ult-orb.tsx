"use client"

import { motion, useTransform, type MotionValue } from "motion/react"
import { useId } from "react"

/**
 * Valorant's answer to Rocket League's rolling ball on the roadmap's rail: an ultimate orb, the sphere picked up on
 * the map to charge the ultimate, drawn in the brand's Klein. Its bands turn as it travels, by the distance it
 * covered, so it rolls down the rail as the ball does.
 */
export default function UltOrb({ distance, size = 28 }: { distance: MotionValue<number>; size?: number }) {
  const id = useId()
  // A full turn for each circumference travelled.
  const rotate = useTransform(distance, (d) => (d / (Math.PI * size)) * 360)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="block overflow-visible">
      <defs>
        <radialGradient id={`${id}-body`} cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="var(--color-paper)" />
          <stop offset="45%" stopColor="var(--color-klein-claro)" />
          <stop offset="100%" stopColor="var(--color-klein)" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="var(--color-klein-claro)" stopOpacity={0.55} />
          <stop offset="100%" stopColor="var(--color-klein-claro)" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="16" cy="16" r="12" />
        </clipPath>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#${id}-glow)`} />
      <circle cx="16" cy="16" r="12" fill={`url(#${id}-body)`} />
      <motion.g clipPath={`url(#${id}-clip)`} style={{ rotate, originX: "16px", originY: "16px" }}>
        {/* The orb's energy bands, curved like a sphere's meridians. */}
        <path d="M16 4c-5 4-5 20 0 24" fill="none" stroke="var(--color-paper)" strokeOpacity={0.85} strokeWidth={1.6} />
        <path d="M16 4c5 4 5 20 0 24" fill="none" stroke="var(--color-paper)" strokeOpacity={0.5} strokeWidth={1.2} />
        <path d="M4 16c4-3 20-3 24 0" fill="none" stroke="var(--color-navy)" strokeOpacity={0.35} strokeWidth={1.2} />
      </motion.g>
      <circle cx="16" cy="16" r="12" fill="none" stroke="var(--color-navy)" strokeOpacity={0.6} strokeWidth={1.2} />
      <circle cx="12" cy="11" r="2.4" fill="var(--color-paper)" opacity={0.9} />
    </svg>
  )
}
