"use client"

import { Torcedor3D, type Momento } from "@/components/site/fan/torcedor-3d"
import { FanView } from "@/components/site/profile/fan-view"
import { StandStrip } from "@/components/site/ui"
import { profile } from "@/content/profile"
import type { Fan, Torcedor } from "@/lib/profile"
import type { Torcedor3D as Look3D } from "@/lib/torcedor3d"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile.preview)
// The buttons' moments as the 3D fan plays them on the live's stand.
const MOMENTO: Record<string, Momento> = { comemora: "festa", lamenta: "lamenta", chega: "chega" }

export interface Thrown {
  id: number
  emoji: string
  dx: number
  up: number
  wait: number
}

/**
 * Their fan on a bit of the live's stand, as the crowd draws them: their name over it, the arrival shout in its balloon,
 * the stickers flying on a goal; the buttons under it play each moment.
 */
export function FanStage({
  T,
  fan,
  look,
  name,
  move,
  shout,
  stickers,
  play,
  className,
}: {
  T: Torcedor
  fan: Fan
  /** The 3D fan being made; the 2D one stands in only until it has loaded. */
  look?: Look3D | null
  name: string
  move: string
  shout: string
  stickers: Thrown[]
  play: (kind: "goal" | "against" | "arrive") => void
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div role="img" aria-label={text.stand} className="cut relative h-64 overflow-hidden bg-navy">
        <StandStrip height={28} />
        <div className="absolute bottom-6 left-1/2 h-[140px] w-[94px] -translate-x-1/2">
          <span className="absolute bottom-[calc(100%+28px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-navy/80 px-2 py-0.5 text-[15px] font-semibold text-paper">{name}</span>
          {shout && (
            <span className="absolute bottom-[calc(100%+62px)] left-1/2 z-10 w-max max-w-[13rem] -translate-x-1/2 bg-paper px-3 py-1.5 text-[15px] font-medium text-klein">{shout}</span>
          )}
          {look ? (
            <Torcedor3D look={look} momento={MOMENTO[move] ? { tipo: MOMENTO[move] } : null} className="h-full w-full" />
          ) : (
            <FanView T={T} fan={fan} move={move} className="h-full w-full" />
          )}
          {stickers.map((s) => (
            <span
              key={s.id}
              className="sticker"
              style={{ left: "50%", bottom: "100%", ["--dx" as string]: `${s.dx}px`, ["--sobe" as string]: `${s.up}px`, ["--espera" as string]: `${s.wait}s` }}
            >
              {s.emoji}
            </span>
          ))}
        </div>
      </div>
      <div role="group" aria-label={text.try} className="grid grid-cols-3 gap-2 text-[13px]">
        {(["goal", "against", "arrive"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            title={`${text.try}: ${text[kind]}`}
            onClick={() => play(kind)}
            disabled={kind === "arrive" && !fan.frase}
            className="cut-sm cut-edge relative border border-line-strong px-1 py-1.5 font-medium text-klein transition-colors hover:border-klein hover:bg-paper disabled:opacity-40"
          >
            {text[kind]}
          </button>
        ))}
      </div>
    </div>
  )
}
