"use client"

import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { CROSSHAIR_CURSOR, Crosshair } from "@/components/site/game/crosshair"
import { LOCALE, localize } from "@/lib/site"

const T = localize({
  start: { pt: "Atire no alvo para começar", en: "Shoot the target to start" },
  hint: { pt: "Aquecimento: 10 alvos", en: "Warm-up: 10 targets" },
  target: { pt: "Alvo", en: "Target" },
  perTarget: { pt: "por alvo", en: "per target" },
  of: { pt: "de", en: "of" },
  shots: { pt: "tiros acertados", en: "shots hit" },
  best: { pt: "Seu melhor neste navegador", en: "Your best in this browser" },
  record: { pt: "Novo recorde neste navegador", en: "New best in this browser" },
  again: { pt: "De novo", en: "Again" },
  withSens: { pt: "com sensibilidade", en: "at sensitivity" },
  sens: { pt: "Sua sensibilidade no Valorant", en: "Your Valorant sensitivity" },
  sensOn: {
    pt: "O mouse fica preso no range e mira como no jogo, no DPI que o seu mouse já usa. Esc solta.",
    en: "The mouse is held in the range and aims as in the game, at your mouse's own DPI. Esc lets go.",
  },
  sensOff: { pt: "Vazio, o alvo segue o cursor do sistema.", en: "Empty, the range follows the system cursor." },
})

const TARGETS = 10
/** A hit lands within this many pixels of a target's centre (its diamond's reach). */
const REACH = 20
/** More counts than a hand makes between two events: Chrome's jump as the lock starts, dropped. */
const JUMP = 1000
/** Valorant's yaw per mouse count at sensitivity 1, in degrees, and its horizontal field of view at 16:9. */
const YAW = 0.07
const FOV = 103

type Point = { x: number; y: number }
type Round = { hits: number; shots: number; at: Point; shown: number; total: number }
type Result = { average: number; shots: number; best?: number; record: boolean; sens?: number }

/** Somewhere on the range, in % of its size, kept off the edges and the HUD. */
const somewhere = (): Point => ({ x: 8 + Math.random() * 84, y: 18 + Math.random() * 68 })

function load(key: string) {
  try {
    return localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

/** The sensitivity typed, kept in this browser. */
const SENS = "range:sens"
const sensListeners = new Set<() => void>()
const sensStore = {
  subscribe(listener: () => void) {
    sensListeners.add(listener)
    return () => sensListeners.delete(listener)
  },
  get: () => load(SENS),
  set(value: string) {
    save(SENS, value)
    sensListeners.forEach((listener) => listener())
  },
}

/** A mouse that pointer lock can hold: not a phone's finger. */
function useCanLock() {
  return useSyncExternalStore(
    () => () => {},
    () => "requestPointerLock" in Element.prototype && matchMedia("(pointer: fine)").matches,
    () => false,
  )
}

/** "0,4" or "0.4" → 0.4; nothing usable → undefined. */
function parseSens(text: string) {
  const value = Number(text.replace(",", "."))
  return value > 0 && value <= 10 ? value : undefined
}

/**
 * Valorant's home opens on the range, the way every session of the game starts: ten targets, one at a time,
 * shot as fast as you can, then your time per target. The best stays in this browser.
 * With the visitor's Valorant sensitivity, the range holds the mouse (pointer lock, raw counts without the
 * system's acceleration where the browser allows it) and turns each count into the game's 0.07° × sensitivity,
 * spread over the screen's width as the game spreads its 103°: the same hand movement reaches the same target.
 * Without it, the targets follow the system cursor, and they are buttons, so a keyboard or a finger can play too.
 */
export function Range() {
  const [round, setRound] = useState<Round>()
  const [result, setResult] = useState<Result>()
  const [marks, setMarks] = useState<(Point & { id: number; hit: boolean })[]>([])
  const [locked, setLocked] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const aim = useRef<HTMLDivElement>(null)
  const position = useRef<Point>({ x: 0, y: 0 })
  const nextMark = useRef(0)

  const sensText = useSyncExternalStore(sensStore.subscribe, sensStore.get, () => "")
  const canLock = useCanLock()
  const sens = canLock ? parseSens(sensText) : undefined

  // Losing the lock (Esc) mid-round drops the round; the result screen stays.
  useEffect(() => {
    function onChange() {
      const held = document.pointerLockElement === area.current
      setLocked(held)
      if (!held) setRound(undefined)
    }
    document.addEventListener("pointerlockchange", onChange)
    return () => document.removeEventListener("pointerlockchange", onChange)
  }, [])

  // While locked, the mouse's counts move the drawn crosshair, from the middle, where the round starts.
  useEffect(() => {
    if (!locked || !sens) return
    const perCount = (sens * YAW * screen.width) / FOV
    const box = area.current!.getBoundingClientRect()
    position.current = { x: box.width / 2, y: box.height / 2 }
    if (aim.current) aim.current.style.transform = `translate(${box.width / 2}px, ${box.height / 2}px)`
    let first = true
    function onMove(event: MouseEvent) {
      if (first || Math.abs(event.movementX) > JUMP || Math.abs(event.movementY) > JUMP) {
        first = false
        return
      }
      const box = area.current!.getBoundingClientRect()
      const at = position.current
      at.x = Math.min(box.width, Math.max(0, at.x + event.movementX * perCount))
      at.y = Math.min(box.height, Math.max(0, at.y + event.movementY * perCount))
      if (aim.current) aim.current.style.transform = `translate(${at.x}px, ${at.y}px)`
    }
    document.addEventListener("mousemove", onMove)
    return () => document.removeEventListener("mousemove", onMove)
  }, [locked, sens])

  function mark(point: Point, hit: boolean) {
    const id = nextMark.current++
    setMarks((marks) => [...marks.slice(-6), { ...point, id, hit }])
    setTimeout(() => setMarks((marks) => marks.filter((mark) => mark.id !== id)), 450)
  }

  function start() {
    setResult(undefined)
    setRound({ hits: 0, shots: 0, at: somewhere(), shown: performance.now(), total: 0 })
    const element = area.current
    if (!sens || !element) return
    // Raw counts where supported (Chrome, Edge); the plain lock elsewhere.
    const lock = element.requestPointerLock as (options?: { unadjustedMovement?: boolean }) => Promise<void> | undefined
    lock.call(element, { unadjustedMovement: true })?.catch(() => element.requestPointerLock())
  }

  function hit() {
    if (!round) return start()
    const now = performance.now()
    const hits = round.hits + 1
    const total = round.total + (now - round.shown)
    mark(round.at, true)
    if (hits < TARGETS) {
      setRound({ hits, shots: round.shots + 1, at: somewhere(), shown: now, total })
      return
    }
    const average = Math.round(total / TARGETS)
    // A sensitivity's times and the cursor's aren't the same game: each keeps its best.
    const key = sens ? "range:best:sens" : "range:best"
    const best = Number(load(key)) || undefined
    const record = !best || average < best
    if (record) save(key, String(average))
    setRound(undefined)
    setResult({ average, shots: round.shots + 1, best: record ? average : best, record, sens })
    if (document.pointerLockElement) document.exitPointerLock()
  }

  /** A click on the range: with the mouse held, a shot where the crosshair is; otherwise a click beside the target. */
  function shoot(event: React.MouseEvent) {
    if (!round || !area.current) return
    const box = area.current.getBoundingClientRect()
    const at = locked ? position.current : { x: event.clientX - box.left, y: event.clientY - box.top }
    if (locked) {
      const target = { x: (round.at.x / 100) * box.width, y: (round.at.y / 100) * box.height }
      if (Math.hypot(at.x - target.x, at.y - target.y) <= REACH) return hit()
    }
    mark({ x: (at.x / box.width) * 100, y: (at.y / box.height) * 100 }, false)
    setRound({ ...round, shots: round.shots + 1 })
  }

  const target = round?.at ?? (result ? undefined : { x: 50, y: 50 })
  const number = (value: number) => value.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={area}
        onClick={shoot}
        style={{ cursor: CROSSHAIR_CURSOR }}
        className="relative h-72 select-none overflow-hidden border-y border-line bg-paper/60 sm:h-80 sm:rounded-md sm:border"
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
            style={{ left: `${target.x}%`, top: `${target.y}%`, cursor: CROSSHAIR_CURSOR }}
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

        {/* The crosshair the held mouse moves; the system's is hidden while it's held. */}
        <div ref={aim} aria-hidden className={locked ? "pointer-events-none absolute left-0 top-0" : "hidden"}>
          <Crosshair size={28} className="-ml-3.5 -mt-3.5" />
        </div>

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
              {result.sens && ` · ${T.withSens} ${number(result.sens)}`}
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

      {canLock && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
          <label htmlFor="range-sens" className="font-medium text-ink">
            {T.sens}
          </label>
          <input
            id="range-sens"
            type="text"
            inputMode="decimal"
            placeholder={number(0.4)}
            value={sensText}
            onChange={(event) => sensStore.set(event.target.value)}
            className="w-20 rounded-md border border-line bg-paper/70 px-2 py-1 tabular-nums text-ink outline-none focus-visible:border-klein"
          />
          <span className="text-muted">{sens ? T.sensOn : T.sensOff}</span>
        </div>
      )}
    </MotionConfig>
  )
}
