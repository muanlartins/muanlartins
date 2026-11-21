"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Fragment, useEffect, useRef, useSyncExternalStore } from "react"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const L = localize({
  days: { pt: "dia|dias", en: "day|days" },
  hours: { pt: "hora|horas", en: "hour|hours" },
  minutes: { pt: "minuto|minutos", en: "minute|minutes" },
  /** The cells' short names. */
  min: { pt: "min", en: "min" },
  sec: { pt: "seg", en: "sec" },
  and: { pt: "e", en: "and" },
})

const plural = (n: number, forms: string) => forms.split("|")[n === 1 ? 0 : 1]

// One clock for every countdown on the page, ticking on the second.
let second: number | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
function tick() {
  second = Math.floor(Date.now() / 1000)
  listeners.forEach((listener) => listener())
  timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) tick()
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearTimeout(timer)
      timer = undefined
    }
  }
}
const useSecond = () => useSyncExternalStore(subscribe, () => second ?? Math.floor(Date.now() / 1000), () => undefined)

const TONES = {
  dark: { cell: "border-klein-claro/35 bg-navy/55", digit: "text-paper", label: "text-klein-claro", dot: "bg-klein-claro" },
  light: { cell: "border-line bg-paper/70", digit: "text-klein", label: "text-muted", dot: "bg-klein" },
}
const SIZES = {
  lg: { digit: "text-[40px] sm:text-[72px]", cell: "px-1 pb-2.5 pt-2 sm:pb-4 sm:pt-3", gap: "gap-1.5 sm:gap-3", dot: "size-1 sm:size-1.5" },
  md: { digit: "text-[28px] sm:text-[36px]", cell: "px-1 pb-2 pt-1.5", gap: "gap-1.5 sm:gap-2", dot: "size-1" },
}

/**
 * A countdown to a moment (brand/interface.md: the 45° cut, Space Grotesk's tabular figures): days, hours, minutes
 * and seconds in cut cells, the colon drawn as two of the lattice's diamonds. A digit that changes slides in (unless
 * motion is reduced, which also drops the seconds: the minutes are enough for whoever asked for a still page). Before
 * the browser knows the time, and without a `to`, the cells hold "–" so nothing shifts when it arrives. Screen readers
 * get it as one timer, to the minute, never read out each second.
 */
export function Countdown({
  to,
  tone = "light",
  size = "md",
  label,
  onEnd,
  className,
}: {
  /** The moment it counts to; nothing yet shows dashes. */
  to?: Date | number | string
  /** `dark` on Klein, `light` on the page's ground. */
  tone?: keyof typeof TONES
  size?: keyof typeof SIZES
  /** What it counts to, for screen readers: "Próxima live em". */
  label?: string
  /** Once, when it reaches zero. */
  onEnd?: () => void
  className?: string
}) {
  const now = useSecond()
  const reduced = useReducedMotion()
  const target = to === undefined ? undefined : +new Date(to)
  const known = now !== undefined && target !== undefined && !Number.isNaN(target)
  const left = known ? Math.max(0, Math.floor(target / 1000) - now) : 0

  const ended = useRef(false)
  useEffect(() => {
    if (!known) return
    if (left > 0) ended.current = false
    else if (!ended.current) {
      ended.current = true
      onEnd?.()
    }
  }, [known, left, onEnd])

  const d = Math.floor(left / 86_400)
  const h = Math.floor((left % 86_400) / 3600)
  const m = Math.floor((left % 3600) / 60)
  const s = left % 60
  const units = [
    { id: "d", value: d, name: plural(d, L.days) },
    { id: "h", value: h, name: plural(h, L.hours) },
    { id: "m", value: m, name: L.min },
    ...(reduced ? [] : [{ id: "s", value: s, name: L.sec }]),
  ]
  const words = [
    d && `${d} ${plural(d, L.days)}`,
    h && `${h} ${plural(h, L.hours)}`,
    (m || (!d && !h)) && `${m} ${plural(m, L.minutes)}`,
  ].filter(Boolean) as string[]
  const spoken = words.length > 1 ? `${words.slice(0, -1).join(", ")} ${L.and} ${words.at(-1)}` : words[0]
  const t = TONES[tone]
  const z = SIZES[size]

  return (
    <div role="timer" aria-label={known ? (label ? `${label} ${spoken}` : spoken) : label} className={cn("flex items-stretch", z.gap, className)}>
      {units.map((unit, i) => (
        <Fragment key={unit.id}>
          {i > 0 && (
            <span aria-hidden className="flex flex-col items-center justify-center gap-2 pb-5 sm:gap-3 sm:pb-7">
              <i className={cn("rotate-45", z.dot, t.dot)} />
              <i className={cn("rotate-45", z.dot, t.dot)} />
            </span>
          )}
          <span aria-hidden className={cn("cut cut-edge relative flex min-w-0 flex-1 flex-col items-center border", z.cell, t.cell)}>
            <span className={cn("flex font-semibold leading-[1.15] tracking-[-0.02em] tabular-nums", z.digit, t.digit)}>
              {known ? String(unit.value).padStart(2, "0").split("").map((digit, j, all) => <Digit key={all.length - j} value={digit} />) : "––"}
            </span>
            <span className={cn("eyebrow", t.label)}>{unit.name}</span>
          </span>
        </Fragment>
      ))}
    </div>
  )
}

/** One figure, sliding in from above as the last one leaves below. */
function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-flex overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "-70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "70%", opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
