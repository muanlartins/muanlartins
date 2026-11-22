"use client"

import { Pause, Play } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * A short looping picture (an animated WebP) that waits still with a play mark, as every clip on the site does
 * (brand/interface.md, "Motion"): it plays while pointed at or once pressed, and stops when pressed again.
 */
export function Clip({ still, moving, alt, width, height, pixel = false }: { still: string; moving: string; alt: string; width: number; height: number; pixel?: boolean }) {
  const [on, setOn] = useState(false)
  const [hover, setHover] = useState(false)
  const playing = on || hover
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${alt}. ${on ? "Pausar" : "Tocar"}`}
      onClick={() => setOn(!on)}
      onPointerEnter={(event) => event.pointerType === "mouse" && !matchMedia("(prefers-reduced-motion: reduce)").matches && setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="cut relative block w-full overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- an animated WebP, which next/image would freeze */}
      <img src={playing ? moving : still} alt="" width={width} height={height} className={cn("block h-auto w-full", pixel && "[image-rendering:pixelated]")} />
      <span aria-hidden className="cut-sm absolute bottom-2 right-2 grid h-9 w-9 place-items-center bg-klein text-paper">
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
      </span>
    </button>
  )
}
