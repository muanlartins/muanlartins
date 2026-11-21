"use client"

import confetti from "canvas-confetti"
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Timeline } from "@/components/ui/timeline"
import { RankHeader } from "@/components/site/roadmap/rank-header"
import { roadmapKit } from "@/components/site/roadmap/kit"
import { CHANGE, currentRank, divisionOf, rankFills, useProgress, type Change, type Progress } from "@/lib/progress"
import { UI } from "@/lib/site"

/** The brand's values (app/globals.css) the confetti is drawn in, beside the new rank's colour: Branco and Klein claro. */
const CONFETTI = ["#f4f5f7", "#85a7ff"]
/** The brand's curve (brand/interface.md, "Motion"). */
const EASE = [0.65, 0, 0.35, 1] as const

export interface RankRow {
  id: string
  name: string
  color: string
  icons?: string[]
  summary?: string
  topics: string[]
  content: ReactNode
}

/**
 * The ranks, climbed by finishing topics. Each rank's stretch of rail fills
 * with its own topics; the game's marker waits on the visitor's rank, the
 * lowest one not finished. Moving up a rank, or a division within one
 * (Bronze 1 → 2), is celebrated.
 * Every game's is the same; what's the game's own (the marker on the rail,
 * the scene behind, which follows the rank being read) comes from its kit
 * (`kit.tsx`), by `game`. The ranks' colours stay on their emblems and the
 * rail's diamonds.
 */
export function RoadmapTimeline({ roadmap, ranks, game }: { roadmap: string; ranks: RankRow[]; /** The game's id, for its kit. */ game: string }) {
  const kit = roadmapKit(game)
  const { progress } = useProgress(roadmap)
  const fills = rankFills(ranks, progress)
  const rank = currentRank(fills)
  const reading = useRankInView(ranks)
  const [banner, setBanner] = useState<Reached & { key: number }>()

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
      {kit.scene && (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          {kit.scene({ index: reading, count: ranks.length })}
        </div>
      )}

      <Timeline
        fills={fills}
        current={rank}
        marker={kit.marker}
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

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4">
        <AnimatePresence>
          {banner && (
            <motion.div
              key={banner.key}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="drop-shadow-[0_8px_24px_rgb(0_20_71/0.16)]"
            >
              <p role="status" className="cut flex items-center gap-3 bg-navy py-3 pl-4 pr-5 text-[15px] font-medium text-paper">
                {banner.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={banner.icon} alt="" className="h-7 w-7 shrink-0 object-contain" />
                ) : (
                  <span aria-hidden className="h-3 w-3 shrink-0 rotate-45" style={{ background: banner.color }} />
                )}
                {banner.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/** What a change earned: the line to say, the colour to cheer in and the emblem reached. */
interface Reached {
  text: string
  color: string
  icon?: string
}

/** A rank's name with its division, when it has several: "Bronze 2", as both games' ranks are written. */
function rankName(rank: RankRow, division: number) {
  return (rank.icons?.length ?? 0) > 1 ? `${rank.name} ${division + 1}` : rank.name
}

/**
 * What a change earned, if anything: a new rank (the climb's lowest
 * unfinished rank went up), or else a new division within some rank.
 */
function promotion(ranks: RankRow[], before: Progress, after: Progress): Reached | undefined {
  const [was, now] = [rankFills(ranks, before), rankFills(ranks, after)]
  const reached = currentRank(now)
  if (reached > currentRank(was)) {
    const last = ranks[ranks.length - 1]
    if (reached === ranks.length) return { text: UI.roadmapDone, color: last.color, icon: last.icons?.at(-1) }
    return { text: `${UI.rankUp} ${rankName(ranks[reached], 0)}`, color: ranks[reached].color, icon: ranks[reached].icons?.[0] }
  }
  const index = ranks.findIndex((rank, index) => {
    const divisions = rank.icons?.length ?? 1
    return divisionOf(now[index], divisions) > divisionOf(was[index], divisions)
  })
  if (index === -1) return undefined
  const rank = ranks[index]
  const division = divisionOf(now[index], rank.icons?.length ?? 1)
  return { text: `${UI.rankUp} ${rankName(rank, division)}`, color: rank.color, icon: rank.icons?.[division] }
}

/** A rank's diamond on the rail, in the rank's colour: hollow until the visitor reaches it, then filled, with a pop. */
function RankDot({ color, reached }: { color: string; reached: boolean }) {
  return (
    <motion.span
      initial={false}
      animate={{ scale: reached ? [1, 1.5, 1] : 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="h-4 w-4 rotate-45 border-2 transition-[background-color,box-shadow] duration-500"
      style={{
        borderColor: color,
        background: reached ? color : "var(--color-ground)",
        boxShadow: reached ? `0 0 0 4px color-mix(in oklab, ${color} 22%, transparent)` : "none",
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
    colors: [color, ...CONFETTI],
    disableForReducedMotion: true,
  }
  confetti({ ...shot, angle: 60, origin: { x: 0, y: 0.9 } })
  confetti({ ...shot, angle: 120, origin: { x: 1, y: 0.9 } })
}
