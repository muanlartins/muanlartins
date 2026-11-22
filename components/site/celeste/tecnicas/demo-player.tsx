"use client"

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Ghost, Pause, Play, SquareDashed, StepBack, StepForward, type LucideIcon } from "lucide-react"
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { drawFrame, type Sheets } from "@/components/site/celeste/tecnicas/demo-canvas"
import { useSheets } from "@/components/site/celeste/tecnicas/use-sheets"
import { Choice, Choices, ErrorLine } from "@/components/site/ui"
import { KEY, demoFile, type Demo, type DemoStep, type Footage } from "@/lib/celeste-demo"
import { cn } from "@/lib/utils"

const T = {
  play: "Tocar",
  pause: "Pausar",
  back: "Voltar 1 frame",
  forward: "Avançar 1 frame",
  timeline: "Linha do tempo, frame a frame",
  stage: "Espaço toca ou pausa, as setas andam um frame.",
  speed: "Velocidade",
  speeds: { moment: "Lenta no momento", quarter: "¼", real: "Real" },
  show: "Mostrar junto",
  ghost: (label: string) => `Fantasma: ${label}`,
  boxes: "Hitbox",
  failed: "Não deu pra carregar a demonstração.",
}

type Speed = keyof typeof T.speeds

/** How long a frame stays, in ms. */
function frameTime(demo: Demo, at: number, speed: Speed) {
  if (speed === "real") return 1000 / 60
  if (speed === "quarter") return 1000 / 15
  const [from, to] = demo.moment
  if (at >= from && at <= to) return Math.min(300, Math.max(90, 2400 / (to - from + 1)))
  return at > to && at < to + 24 ? 45 : 22
}

const HOLD = 900

const TONE: Record<NonNullable<DemoStep["tone"]> | "none", string> = {
  none: "bg-navy text-paper",
  window: "bg-ouro text-navy",
  fail: "bg-loss text-paper",
}

const KEYS: { bit: number; label: string; icon?: LucideIcon }[] = [
  { bit: KEY.left, label: "Esquerda", icon: ArrowLeft },
  { bit: KEY.right, label: "Direita", icon: ArrowRight },
  { bit: KEY.up, label: "Cima", icon: ArrowUp },
  { bit: KEY.down, label: "Baixo", icon: ArrowDown },
  { bit: KEY.jump, label: "Pulo" },
  { bit: KEY.dash, label: "Dash" },
  { bit: KEY.grab, label: "Agarrar" },
]

/**
 * A technique filmed in the game, to look at frame by frame: a tap plays or pauses, a drag scrubs, and each variation
 * runs beside its rival as a ghost, with what's held under the picture. It waits with a play mark, as every clip on
 * the site does (brand/interface.md, "Motion"), and stops off screen.
 */
export function DemoPlayer({ demo, footage }: { demo: Demo; footage: Footage }) {
  const first = footage.from - demo.zero
  const last = footage.to - demo.zero
  const [takeId, setTakeId] = useState(demo.cover.take)
  const [at, setAt] = useState(demo.cover.at)
  const [playing, setPlaying] = useState(false)
  const [touched, setTouched] = useState(false)
  const [speed, setSpeed] = useState<Speed>("moment")
  const [compare, setCompare] = useState(true)
  const [boxes, setBoxes] = useState(false)

  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const colours = useRef<HTMLSpanElement>(null)
  const drag = useRef<{ x: number; at: number; moved: boolean } | null>(null)

  const take = demo.takes.find((each) => each.id === takeId)!
  const rival = demo.takes.find((each) => each.id === take.rival)
  const ghost = compare ? rival : undefined
  const { sheets, failed, retry } = useSheets(root, demo.id, take.id, ghost?.id)

  useEffect(() => {
    const context = canvas.current?.getContext("2d")
    if (!context || !sheets || !colours.current) return
    const [ok, fail, box] = [...colours.current.children].map((each) => getComputedStyle(each).color)
    drawFrame(context, { demo, footage, take, ghost, at, sheets: sheets as Sheets, boxes, colour: { ok, fail, box } })
  }, [demo, footage, take, ghost, at, sheets, boxes])

  useEffect(() => {
    if (!playing || !sheets) return
    let frame = 0
    let before: number | undefined
    let waited = 0
    let current = at
    const tick = (now: number) => {
      waited += Math.min(now - (before ?? now), 250)
      before = now
      let next = current
      for (;;) {
        const needs = next >= last ? HOLD : frameTime(demo, next, speed)
        if (waited < needs) break
        waited -= needs
        next = next >= last ? first : next + 1
      }
      if (next !== current) {
        current = next
        setAt(next)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // `at` is only where it starts from: the loop is what moves it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, sheets, speed, demo, first, last, takeId])

  useEffect(() => {
    if (!playing || !canvas.current) return
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlaying(false)
    })
    seen.observe(canvas.current)
    return () => seen.disconnect()
  }, [playing])

  function toggle() {
    if (!touched) setAt(first)
    else if (!playing && at >= last) setAt(first)
    setTouched(true)
    setPlaying(!playing)
  }

  function seek(to: number) {
    setTouched(true)
    setPlaying(false)
    setAt(Math.min(last, Math.max(first, Math.round(to))))
  }

  function choose(id: string) {
    const next = demo.takes.find((each) => each.id === id)!
    setTakeId(id)
    setTouched(true)
    // Straight to what differs: just before the moment when it's running, the press itself when it's paused.
    setAt(Math.max(first, playing ? demo.moment[0] - 4 : (next.press ?? demo.cover.at)))
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === " " || event.key === "Enter") toggle()
    else if (event.key === "ArrowLeft") seek(at - 1)
    else if (event.key === "ArrowRight") seek(at + 1)
    else return
    event.preventDefault()
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, at, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const moved = event.clientX - drag.current.x
    if (Math.abs(moved) > 6) drag.current.moved = true
    if (drag.current.moved) seek(drag.current.at + (moved / event.currentTarget.clientWidth) * (last - first))
  }
  function onPointerUp() {
    if (drag.current && !drag.current.moved) toggle()
    drag.current = null
  }

  const index = at + demo.zero - footage.from
  const filmed = footage.takes[take.id]
  const step = take.steps.findLast((each) => each.from <= at)
  const held = filmed.keys[index] ?? 0
  const used = demo.takes.reduce((bits, each) => footage.takes[each.id].keys.reduce((all, keys) => all | keys, bits), 0)

  return (
    <div ref={root} className="space-y-4">
      <div className="cut -mx-6 bg-navy text-paper [&_:focus-visible]:outline-paper sm:mx-0">
        <div
          role="button"
          tabIndex={0}
          aria-label={`${demo.alt}. ${T.stage}`}
          aria-pressed={playing}
          className="relative touch-pan-y cursor-pointer select-none overflow-hidden focus-visible:-outline-offset-4"
          style={{ aspectRatio: `${footage.width} / ${footage.height}` }}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a pixel-exact capture, under the canvas until it has drawn */}
          <img src={demoFile(demo.id, "capa.webp")} alt="" draggable={false} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
          <canvas ref={canvas} width={footage.width} height={footage.height} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />

          {step && (
            <p className={cn("pointer-events-none absolute left-2 top-2 max-w-[80%] px-2.5 py-1 text-[13px] font-medium tabular-nums sm:left-3 sm:top-3 sm:text-[15px]", TONE[step.tone ?? "none"])}>
              {step.text.replace("{n}", String(at))}
            </p>
          )}

          <Gauge demo={demo} footage={footage} take={take.id} at={at} />

          {!playing && (
            <span aria-hidden className={cn("cut-sm pointer-events-none absolute bottom-3 right-3 grid place-items-center bg-klein text-paper", touched ? "h-10 w-10" : "h-14 w-14")}>
              <Play className={cn("fill-current", touched ? "h-4 w-4" : "h-6 w-6")} />
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1 px-2 pt-1 sm:flex-nowrap">
          <IconButton label={playing ? T.pause : T.play} onClick={toggle} icon={playing ? Pause : Play} />
          <IconButton label={T.back} onClick={() => seek(at - 1)} icon={StepBack} />
          <IconButton label={T.forward} onClick={() => seek(at + 1)} icon={StepForward} />
          <div className="relative order-first h-10 w-full sm:order-none sm:ml-2 sm:w-auto sm:flex-1">
            <div aria-hidden className="absolute inset-x-2 top-[17px] h-1.5 bg-klein">
              <span className="absolute inset-y-0 left-0 bg-klein-claro" style={{ width: percent(at - first, last - first) }} />
              {demo.window && (
                <span className="absolute inset-y-0 bg-ouro" style={{ left: percent(demo.window[0] - first, last - first), width: percent(demo.window[1] - demo.window[0] + 1, last - first) }} />
              )}
              {take.press !== undefined && <span className="absolute -inset-y-1.5 w-[3px] -translate-x-1/2 bg-paper" style={{ left: percent(take.press - first, last - first) }} />}
            </div>
            <input
              type="range"
              min={first}
              max={last}
              value={at}
              aria-label={T.timeline}
              onChange={(event) => seek(Number(event.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-klein [&::-moz-range-thumb]:bg-paper [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-klein [&::-webkit-slider-thumb]:bg-paper"
            />
          </div>
        </div>

        <ul aria-hidden className="flex flex-wrap gap-1 px-3 pb-3 pt-1">
          {KEYS.filter(({ bit }) => used & bit).map(({ bit, label, icon: Icon }) => (
            <li key={bit} className={cn("grid h-7 min-w-7 place-items-center px-1.5 text-[12px] font-medium", held & bit ? "bg-ouro text-navy" : "bg-klein/50 text-klein-claro")}>
              {Icon ? <Icon className="h-4 w-4" /> : label}
            </li>
          ))}
        </ul>
      </div>

      {failed && (
        <ErrorLine onRetry={retry}>{T.failed}</ErrorLine>
      )}

      {demo.takes.length > 1 && (
        <Choices label={demo.choose}>
          <div className="flex flex-wrap gap-1.5">
            {demo.takes.map((each) => (
              <Choice key={each.id} on={each.id === take.id} aria-label={each.name} onClick={() => choose(each.id)} className="min-w-10 tabular-nums">
                {each.label}
              </Choice>
            ))}
          </div>
        </Choices>
      )}

      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <Choices label={T.speed}>
          <Row>
            {(Object.keys(T.speeds) as Speed[]).map((each) => (
              <Choice key={each} size="sm" on={each === speed} onClick={() => setSpeed(each)}>
                {T.speeds[each]}
              </Choice>
            ))}
          </Row>
        </Choices>
        {(rival || demo.boxes) && (
          <Choices label={T.show}>
            <Row>
              {rival && (
                <Choice size="sm" on={compare} onClick={() => setCompare(!compare)} icon={<Ghost aria-hidden className="h-4 w-4" />}>
                  {T.ghost(rival.label)}
                </Choice>
              )}
              {demo.boxes && (
                <Choice size="sm" on={boxes} onClick={() => setBoxes(!boxes)} icon={<SquareDashed aria-hidden className="h-4 w-4" />}>
                  {T.boxes}
                </Choice>
              )}
            </Row>
          </Choices>
        )}
      </div>

      {/* The canvas paints in the brand's tokens: their colours are read off these. */}
      <span ref={colours} aria-hidden hidden>
        <i className="text-ouro" />
        <i className="text-loss" />
        <i className="text-klein-claro" />
      </span>
    </div>
  )
}

const percent = (part: number, whole: number) => `${Math.min(100, Math.max(0, (part / whole) * 100))}%`

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

function IconButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-10 w-10 shrink-0 place-items-center transition-colors hover:bg-klein">
      <Icon aria-hidden className="h-5 w-5 fill-current" />
    </button>
  )
}

/** The footage's value as a bar over her head. */
function Gauge({ demo, footage, take, at }: { demo: Demo; footage: Footage; take: string; at: number }) {
  const filmed = footage.takes[take]
  const index = at + demo.zero - footage.from
  const feet = filmed.feet[index]
  const value = filmed.gauge?.[index]
  if (!demo.gauge || !feet || value === undefined) return null
  const { max, during } = demo.gauge
  if (during && (at < during[0] || at > during[1])) return null
  const x = feet[0] - filmed.cam[index][0] - footage.crop[0]
  const y = feet[1] - filmed.cam[index][1] - footage.crop[1] - 20
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute h-2 w-[11%] -translate-x-1/2 -translate-y-full bg-navy p-0.5 sm:h-3.5 sm:p-[3px]"
      style={{ left: `${Math.min(94, Math.max(6, (x / footage.width) * 100))}%`, top: `${Math.max(8, (y / footage.height) * 100)}%` }}
    >
      <span className="block h-full bg-ouro" style={{ width: percent(value, max) }} />
    </span>
  )
}
