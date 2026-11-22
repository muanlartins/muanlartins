"use client"

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { BarList } from "@/components/site/ui"
import { buttonClass } from "@/components/site/ui/button"
import { cn } from "@/lib/utils"

/**
 * How long the reader's own tap lasts, from press to release, against a window of the game: a feel for how short
 * 83 ms is. Nothing is kept.
 */
export function PressTest({ window: ms, label, bars }: { window: number; label: string; bars: { id: string; label: string; value: number }[] }) {
  const [held, setHeld] = useState(false)
  const [last, setLast] = useState<number>()
  const since = useRef<number | null>(null)

  const down = (at: number) => {
    if (since.current !== null) return
    since.current = at
    setHeld(true)
  }
  const up = (at: number) => {
    if (since.current === null) return
    setLast(Math.max(1, Math.round(at - since.current)))
    since.current = null
    setHeld(false)
  }
  const onKey = (event: KeyboardEvent, press: boolean) => {
    if (event.key !== " " && event.key !== "Enter") return
    event.preventDefault()
    if (press && !event.repeat) down(event.timeStamp)
    if (!press) up(event.timeStamp)
  }

  const all = [
    { id: "janela", label, value: ms },
    ...bars,
    ...(last ? [{ id: "seu", label: "O seu toque", value: last }] : []),
  ]
  const frames = last ? Math.ceil((last * 60) / 1000) : 0

  return (
    <div className="space-y-5">
      <BarList bars={all.map((bar) => ({ ...bar, display: `${bar.value} ms` }))} max={Math.max(250, last ?? 0)} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          className={cn(buttonClass(), "min-h-12 touch-none select-none px-6", held && "bg-navy")}
          onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            down(event.timeStamp)
          }}
          onPointerUp={(event) => up(event.timeStamp)}
          onPointerCancel={() => {
            since.current = null
            setHeld(false)
          }}
          onKeyDown={(event) => onKey(event, true)}
          onKeyUp={(event) => onKey(event, false)}
        >
          Apertar e soltar o mais rápido que der
        </button>
        <p aria-live="polite" className="text-[15px] text-ink">
          {last === undefined
            ? "Conta do apertar até o soltar."
            : last <= ms
              ? `${last} ms. Coube na janela.`
              : `${last} ms, ${frames} frames. A janela fechou antes de você soltar.`}
        </p>
      </div>
    </div>
  )
}
