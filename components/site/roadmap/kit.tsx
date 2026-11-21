"use client"

import type { MotionValue } from "motion/react"
import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { BallBackdrop } from "./ball-backdrop"
import CrosshairMarker from "./crosshair-marker"

const BALL = 28

const RollingBall = dynamic(() => import("./rolling-ball"), {
  ssr: false,
  loading: () => <span className="block rounded-full border border-navy bg-paper" style={{ width: BALL, height: BALL }} />,
})
const Garage = dynamic(() => import("./garage"), { ssr: false })

/** Where the reader is on the rail: the rank under the middle of the screen (-1 above the first), out of `count`. */
export interface Reading {
  index: number
  count: number
}

/**
 * A game's own pieces on its fundamentals (the game kit): the marker riding the rail's tip, the scene behind the
 * roadmap, which follows the reading, and the backdrop behind a topic's page. Every game's page is the same; only
 * these change, picked by the game's id here and nowhere else, so a third game is a new entry. Valorant's scene is
 * the agent its layout puts behind all its pages (`agent-backdrop.tsx`), so it needs none here.
 */
interface RoadmapKit {
  marker: (tip: MotionValue<number>) => ReactNode
  scene?: (reading: Reading) => ReactNode
  topicBackdrop?: () => ReactNode
}

const KITS: Record<string, RoadmapKit> = {
  "rocket-league": {
    marker: (tip) => <RollingBall distance={tip} size={BALL} />,
    scene: ({ index, count }) => (
      <div className="h-full w-full opacity-20">
        <Garage step={index} steps={count} />
      </div>
    ),
    topicBackdrop: () => <BallBackdrop />,
  },
  valorant: {
    marker: (tip) => <CrosshairMarker distance={tip} />,
  },
}

/** A game with no pieces of its own yet: a Klein diamond on the rail, nothing behind. */
const PLAIN: RoadmapKit = { marker: () => <span className="block h-3 w-3 rotate-45 bg-klein" /> }

export const roadmapKit = (game: string) => KITS[game] ?? PLAIN

/** The backdrop behind a topic's page, if its game has one. */
export function TopicBackdrop({ game }: { game: string }) {
  return roadmapKit(game).topicBackdrop?.() ?? null
}
