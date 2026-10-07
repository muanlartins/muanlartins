"use client"

import confetti from "canvas-confetti"
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Timeline } from "@/components/ui/timeline"
import { RankHeader } from "@/components/site/roadmap/rank-header"
import { CHANGE, currentRank, divisionOf, rankFills, useProgress, type Change, type Progress } from "@/lib/progress"
import type { Paint } from "@/lib/roadmap"
import { UI } from "@/lib/site"

const BALL = 28

const Garage = dynamic(() => import("./garage"), { ssr: false })
const RollingBall = dynamic(() => import("./rolling-ball"), {
  ssr: false,
  loading: () => <span className="block rounded-full border border-navy bg-paper" style={{ width: BALL, height: BALL }} />,
})

export interface RankRow {
  id: string
  name: string
  color: string
  icons?: string[]
  paint?: Paint
  summary?: string
  topics: string[]
  content: ReactNode
}

/**
 * The ranks, climbed by finishing topics. Each rank's stretch of rail fills
 * with its own topics; the ball waits on the visitor's rank, the lowest one
 * not finished. Moving up a rank, or a division within one (Bronze I → II),
 * is celebrated.
 * Scrolling only sets the scene: the Octane behind the page air rolls, and
 * it and the page take on the metal of the rank being read.
 */
export function RoadmapTimeline({ roadmap, ranks }: { roadmap: string; ranks: RankRow[] }) {
  const { progress } = useProgress(roadmap)
  const fills = rankFills(ranks, progress)
  const rank = currentRank(fills)
  const reading = useRankInView(ranks)
  const [banner, setBanner] = useState<{ text: string; color: string; key: number }>()

  useEffect(() => {
    function onChange(event: Event) {
      const { detail } = event as CustomEvent<Change>
      if (detail.roadmap !== roadmap) return
      const reached = promotion(ranks, detail.before, detail.after)
      if (!reached) return
      setBanner((previous) => ({ ...reached, key: (previous?.key ?? 0) + 1 }))
      cheer(reached.color)
    }
    window.addEventListener(CHANGE, onChange)
    return () => window.removeEventListener(CHANGE, onChange)
  }, [roadmap, ranks])

  useEffect(() => {
    if (!banner) return
    const timer = setTimeout(() => setBanner(undefined), 3500)
    return () => clearTimeout(timer)
  }, [banner])

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {ranks.map((row, index) => (
          <div
            key={row.id}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              opacity: index === reading ? 1 : 0,
              background: GLOWS.map(
                ([size, at, strength]) =>
                  `radial-gradient(${size} at ${at}, color-mix(in oklab, ${row.color} ${strength}%, transparent), transparent 70%)`,
              ).join(", "),
            }}
          />
        ))}
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-20">
        <Garage paint={ranks[reading] && (ranks[reading].paint ?? { color: ranks[reading].color })} />
      </div>

      <Timeline
        fills={fills}
        current={rank}
        marker={(tip) => <RollingBall distance={tip} size={BALL} />}
        data={ranks.map((row, index) => ({
          id: row.id,
          dot: <RankDot color={row.color} reached={index <= rank} />,
          title: (
            <RankHeader
              name={row.name}
              color={row.color}
              icons={row.icons}
              summary={row.summary}
              done={Math.round(fills[index] * row.topics.length)}
              total={row.topics.length}
              ahead={index > rank}
            />
          ),
          content: row.content,
        }))}
      />

      <AnimatePresence>
        {banner && (
          <motion.p
            key={banner.key}
            role="status"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed inset-x-0 bottom-8 z-50 mx-auto flex w-max max-w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-navy px-5 py-3 text-[15px] font-medium text-paper shadow-xl"
          >
            <span className="h-3 w-3 shrink-0 rotate-45 rounded-[2px]" style={{ background: banner.color }} />
            {banner.text}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  )
}

/** Where the rank's colour glows behind the page: size, centre, strength (%). */
const GLOWS = [
  ["70% 55%", "90% 100%", 55],
  ["55% 45%", "0% 10%", 35],
  ["40% 35%", "100% 30%", 22],
  ["40% 35%", "10% 90%", 22],
] as const

const NUMERALS = ["I", "II", "III", "IV", "V"]

/** A rank's name with its division, when it has several: "Bronze II". */
function rankName(rank: RankRow, division: number) {
  return (rank.icons?.length ?? 0) > 1 ? `${rank.name} ${NUMERALS[division]}` : rank.name
}

/**
 * What a change earned, if anything: a new rank (the climb's lowest
 * unfinished rank went up), or else a new division within some rank.
 */
function promotion(ranks: RankRow[], before: Progress, after: Progress) {
  const [was, now] = [rankFills(ranks, before), rankFills(ranks, after)]
  const reached = currentRank(now)
  if (reached > currentRank(was)) {
    if (reached === ranks.length) return { text: UI.roadmapDone, color: ranks[ranks.length - 1].color }
    return { text: `${UI.rankUp} ${rankName(ranks[reached], 0)}`, color: ranks[reached].color }
  }
  const index = ranks.findIndex((rank, index) => {
    const divisions = rank.icons?.length ?? 1
    return divisionOf(now[index], divisions) > divisionOf(was[index], divisions)
  })
  if (index === -1) return undefined
  const rank = ranks[index]
  return { text: `${UI.rankUp} ${rankName(rank, divisionOf(now[index], rank.icons?.length ?? 1))}`, color: rank.color }
}

/** A rank's diamond: hollow until the visitor reaches it, then lit, with a pop. */
function RankDot({ color, reached }: { color: string; reached: boolean }) {
  return (
    <motion.span
      initial={false}
      animate={{ scale: reached ? [1, 1.7, 1] : 1 }}
      transition={{ duration: 0.6 }}
      className="h-4 w-4 rotate-45 rounded-[3px] border-2 transition-[background,box-shadow] duration-500"
      style={{
        borderColor: color,
        background: reached ? color : "transparent",
        boxShadow: reached ? `0 0 0 4px color-mix(in oklab, ${color} 22%, transparent), 0 0 18px ${color}` : "none",
      }}
    />
  )
}

/** The rank under the middle of the screen; -1 above the first. */
function useRankInView(ranks: RankRow[]) {
  const [reading, setReading] = useState(-1)
  const { scrollY } = useScroll()
  const update = useCallback(() => {
    const middle = window.innerHeight / 2
    setReading(ranks.findLastIndex((rank) => (document.getElementById(rank.id)?.getBoundingClientRect().top ?? Infinity) <= middle))
  }, [ranks])
  useMotionValueEvent(scrollY, "change", update)
  useEffect(() => {
    const frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [update])
  return reading
}

/** Confetti from both bottom corners, in the new rank's colour. */
function cheer(color: string) {
  const shot = {
    particleCount: 70,
    spread: 60,
    startVelocity: 60,
    ticks: 220,
    colors: [color, "#f4f5f7", "#85a7ff"],
    disableForReducedMotion: true,
  }
  confetti({ ...shot, angle: 60, origin: { x: 0, y: 0.9 } })
  confetti({ ...shot, angle: 120, origin: { x: 1, y: 0.9 } })
}
