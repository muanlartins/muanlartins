"use client"

import { MotionConfig } from "motion/react"
import type { ReactNode } from "react"

/** Every motion animation on the site follows the visitor's "reduce motion" (brand/interface.md, "Motion"). */
export function ReducedMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
