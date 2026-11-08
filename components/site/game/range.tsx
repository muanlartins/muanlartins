"use client"

import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { useRef, useState, type MouseEvent } from "react"
import { CROSSHAIR_CURSOR } from "@/components/site/game/crosshair"
import { localize } from "@/lib/site"

const T = localize({
  start: { pt: "Atire no alvo para começar", en: "Shoot the target to start" },
  hint: { pt: "Aquecimento: 10 alvos", en: "Warm-up: 10 targets" },
  target: { pt: "Alvo", en: "Target" },
  perTarget: { pt: "por alvo", en: "per target" },
  of: { pt: "de", en: "of" },
  shots: { pt: "tiros acertados", en: "shots hit" },
  best: { pt: "Seu melhor neste navegador", en: "Your best in this browser" },
  record: {
    pt: "Novo recorde neste navegador",
    en: "New best in this browser",
  },
  again: { pt: "De novo", en: "Again" },
})

const TARGETS = 10
const KEY = "range:best"

type Point = { x: number; y: number }
type Round = {
  hits: number
  shots: number
  at: Point
  shown: number
  total: number
}
type Result = {
  average: number
  hits: number
  shots: number
  best?: number
  record: boolean
}

/** Somewhere on the range, in % of its size, kept off the edges and the HUD. */
const somewhere = (): Point => ({
  x: 8 + Math.random() * 84,
  y: 18 + Math.random() * 68,
})

function readBest() {
  try {
    const saved = Number(localStorage.getItem(KEY))
    return saved > 0 ? saved : undefined
  } catch {
    return undefined
  }
}

/**
 * Valorant's home opens on the range, the way every session of the game starts: ten targets, one at a time,
 * shot as fast as you can, then your time per target. The best stays in this browser.
 * The targets are buttons, so a keyboard can play too.
 */
export function Range() {
  const [round, setRound] = useState<Round>()
  const [result, setResult] = useState<Result>()
  const [marks, setMarks] = useState<(Point & { id: number; hit: boolean })[]>([])
  const area = useRef<HTMLDivElement>(null)
  const nextMark = useRef(0)

  function mark(point: Point, hit: boolean) {
    const id = nextMark.current++
    setMarks((marks) => [...marks.slice(-6), { ...point, id, hit }])
    setTimeout(() => setMarks((marks) => marks.filter((mark) => mark.id !== id)), 450)
  }

  function start() {
    setResult(undefined)
    setRound({
      hits: 0,
      shots: 0,
      at: somewhere(),
      shown: performance.now(),
      total: 0,
    })
  }

  function hit() {
    if (!round) return start()
    const now = performance.now()
    const hits = round.hits + 1
    const total = round.total + (now - round.shown)
    mark(round.at, true)
    if (hits < TARGETS) {
      setRound({
        hits,
        shots: round.shots + 1,
        at: somewhere(),
        shown: now,
        total,
      })
      return
    }
    const average = Math.round(total / TARGETS)
    const best = readBest()
    const record = !best || average < best
    if (record) {
      try {
        localStorage.setItem(KEY, String(average))
      } catch {}
    }
    setRound(undefined)
    setResult({
      average,
      hits,
      shots: round.shots + 1,
      best: record ? average : best,
      record,
    })
  }

  function miss(event: MouseEvent) {
    if (!round || !area.current) return
    const box = area.current.getBoundingClientRect()
    mark(
      {
        x: ((event.clientX - box.left) / box.width) * 100,
        y: ((event.clientY - box.top) / box.height) * 100,
      },
      false,
    )
    setRound({ ...round, shots: round.shots + 1 })
  }

  const target = round?.at ?? (result ? undefined : { x: 50, y: 50 })

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={area}
        onClick={miss}
        style={{ cursor: CROSSHAIR_CURSOR }}
        className="relative h-full select-none overflow-hidden border-y border-line bg-paper/60 sm:rounded-md sm:border"
      >
        <svg aria-hidden className="absolute inset-0 h-full w-full text-klein opacity-[0.08]">
          <defs>
            <pattern id="range-lattice" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M16 0V32M0 0L32 32M32 0L0 32" stroke="currentColor" strokeWidth="1" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#range-lattice)" />
        </svg>

        {round && (
          <p className="pointer-events-none absolute left-4 top-3 text-[13px] font-medium tabular-nums text-klein">
            {round.hits}/{TARGETS}
          </p>
        )}

        {target && (
          <motion.button
            key={`${target.x}-${target.y}`}
            type="button"
            aria-label={T.target}
            onClick={(event) => {
              event.stopPropagation()
              hit()
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.12 }}
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              cursor: CROSSHAIR_CURSOR,
            }}
            className="absolute -ml-6 -mt-6 grid h-12 w-12 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-klein"
          >
            <span className="grid h-8 w-8 rotate-45 place-items-center rounded-[4px] border-2 border-paper bg-klein shadow-[0_4px_14px_color-mix(in_oklab,var(--color-klein)_40%,transparent)]">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-paper" />
            </span>
          </motion.button>
        )}

        {!round && !result && (
          <p className="pointer-events-none absolute inset-x-0 top-[calc(50%+2.25rem)] text-center text-[14px] font-medium text-klein">
            {T.start}
          </p>
        )}

        <AnimatePresence>
          {marks.map((mark) => (
            <motion.span
              key={mark.id}
              aria-hidden
              initial={{ scale: 0.6, opacity: 1 }}
              animate={{ scale: mark.hit ? 1.8 : 1, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
              className={
                mark.hit
                  ? "pointer-events-none absolute -ml-5 -mt-5 h-10 w-10 rotate-45 rounded-[4px] border-2 border-klein-claro"
                  : "pointer-events-none absolute -ml-1 -mt-1 h-2 w-2 rounded-full bg-muted"
              }
            />
          ))}
        </AnimatePresence>

        {result && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-5xl font-medium tabular-nums tracking-[-0.03em] text-klein sm:text-6xl">
              {result.average} <span className="text-2xl sm:text-3xl">ms</span>
            </p>
            <p className="text-[15px] text-ink">
              {T.perTarget} · {TARGETS} {T.of} {result.shots} {T.shots}
            </p>
            <p className="text-[13px] tabular-nums text-muted">{result.record ? T.record : `${T.best}: ${result.best} ms`}</p>
            <button
              type="button"
              onClick={start}
              className="mt-4 rounded-md bg-klein px-4 py-2 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              {T.again}
            </button>
          </div>
        )}

        <p className="pointer-events-none absolute bottom-2 right-4 text-[12px] text-muted">{T.hint}</p>
      </div>
    </MotionConfig>
  )
}
