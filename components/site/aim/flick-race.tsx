"use client"

import { Pause, Play } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { fill, pct } from "@/components/site/aim/format"
import { Legend, type Side } from "@/components/site/aim/marks"
import { Button } from "@/components/site/ui"
import { CURVE_STEP, ninetyAt } from "@/lib/mira"
import { localize } from "@/lib/site"

const T = localize({
  play: { pt: "Assistir", en: "Play" },
  pause: { pt: "Pausar", en: "Pause" },
  time: { pt: "Tempo desde o começo do flick", en: "Time since the flick began" },
  at: { pt: "aos {ms} ms", en: "at {ms} ms" },
  start: { pt: "início", en: "start" },
  target: { pt: "alvo", en: "target" },
  ninety: { pt: "90% do caminho em {ms} ms", en: "90% of the way in {ms} ms" },
  never: { pt: "não chega a 90% em {ms} ms", en: "doesn't reach 90% in {ms} ms" },
  label: { pt: "{name}: quanto do caminho até o alvo a mira já fez, a cada 50 ms", en: "{name}: how much of the way to the target the crosshair has done, every 50 ms" },
})

type Lane = { side: Side; name: string; curve: number[] }

/** The share of the way done t ms into the typical flick, between the curve's points; its last after it ends. */
function wayAt(curve: number[], t: number) {
  const k = t / CURVE_STEP
  const i = Math.floor(k)
  if (i >= curve.length - 1) return curve[curve.length - 1] ?? 0
  return curve[i] + (curve[i + 1] - curve[i]) * (k - i)
}

/**
 * The typical flick of the training and of the match as a race: each a lane from the start to the target (and past
 * it, for an overshoot), its crosshair where the middle flick was at the time picked. At rest it shows the moment the
 * training reaches 90% of the way; "Assistir" runs both at a quarter of the speed, the slider reads any moment.
 */
export function FlickRace({ lanes }: { lanes: Lane[] }) {
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const end = Math.max(...lanes.map((l) => (l.curve.length - 1) * CURVE_STEP))
  const rest = Math.round(ninetyAt(lanes[0].curve) / 10) * 10 || end
  const [t, setShown] = useState(rest)
  const [playing, setPlaying] = useState(false)
  const tRef = useRef(rest)
  const setT = (value: number) => {
    tRef.current = value
    setShown(value)
  }

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const next = Math.min(end, tRef.current + (now - last) * 0.25)
      last = now
      tRef.current = next
      setShown(next)
      if (next >= end) setPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const observer = new IntersectionObserver(([entry]) => !entry.isIntersecting && setPlaying(false))
    if (box.current) observer.observe(box.current)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [playing, end])

  function play() {
    if (playing) return setPlaying(false)
    if (reduce) return setT(end)
    if (tRef.current >= end) setT(0)
    setPlaying(true)
  }

  // The lanes run to 130% of the way, for the overshoots.
  const top = 1.3
  const at = (v: number) => `${(Math.min(top, Math.max(0, v)) / top) * 100}%`

  return (
    <div ref={box} className="space-y-4">
      <ul className="space-y-5">
        {lanes.map((lane) => {
          const v = wayAt(lane.curve, t)
          const ninety = ninetyAt(lane.curve)
          return (
            <li key={lane.side} className="space-y-1.5">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px]">
                <span className="inline-flex items-center gap-2 font-medium text-ink">
                  <Legend side={lane.side} /> {lane.name}
                </span>
                <span className="text-[15px] font-semibold tabular-nums text-ink">{pct(v)}</span>
              </p>
              <div
                role="img"
                aria-label={`${fill(T.label, { name: lane.name })}: ${lane.curve.map((c, i) => `${i * CURVE_STEP} ms ${pct(c)}`).join(", ")}`}
                className="relative h-9"
              >
                <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-line" />
                <span className="absolute top-1/2 h-1 -translate-y-1/2 bg-klein/35" style={{ left: 0, width: at(v) }} />
                <span className="absolute top-1 bottom-1 w-0.5 bg-ink/70" style={{ left: at(1) }} />
                <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: at(v) }}>
                  <svg width={22} height={22} viewBox="-11 -11 22 22" aria-hidden className="block overflow-visible">
                    {lane.side === "training" ? (
                      <circle r={7} className="fill-klein stroke-paper" strokeWidth={2} />
                    ) : (
                      <path d="M0 -9L9 0L0 9L-9 0Z" className="fill-navy stroke-paper" strokeWidth={2} />
                    )}
                  </svg>
                </span>
              </div>
              <p className="text-[13px] tabular-nums text-muted">
                {ninety ? fill(T.ninety, { ms: Math.round(ninety) }) : fill(T.never, { ms: (lane.curve.length - 1) * CURVE_STEP })}
              </p>
            </li>
          )
        })}
      </ul>
      <p aria-hidden className="relative h-4 text-[12px] text-muted">
        <span className="absolute left-0">{T.start}</span>
        <span className="absolute -translate-x-1/2" style={{ left: at(1) }}>
          {T.target}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={play} icon={playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />} className="min-w-[7.5rem]">
          {playing ? T.pause : T.play}
        </Button>
        <input
          type="range"
          min={0}
          max={end}
          step={10}
          value={Math.round(t)}
          onChange={(event) => {
            setPlaying(false)
            setT(Number(event.target.value))
          }}
          aria-label={T.time}
          aria-valuetext={`${Math.round(t)} ms`}
          className="h-6 min-w-[8rem] flex-1 accent-klein"
        />
        <span className="w-20 text-right text-[13px] tabular-nums text-muted">{fill(T.at, { ms: Math.round(t) })}</span>
      </div>
    </div>
  )
}
