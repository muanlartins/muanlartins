"use client"

import { Gamepad2 } from "lucide-react"
import { useState } from "react"
import { coverOf, type OtherGame } from "@/lib/diversos"
import { cn } from "@/lib/utils"

/**
 * A game's cover, from Twitch's CDN by its category (never a copy in the repo), in the 3:4 of a box. Without a
 * category, or when Twitch doesn't answer, the brand's sign for "diversos" on Klein in its place.
 */
export function GameCover({ game, className }: { game: OtherGame; className?: string }) {
  const [failed, setFailed] = useState(false)
  const src = coverOf(game, 288, 384)
  return (
    <span className={cn("cut-sm relative block aspect-[3/4] shrink-0 overflow-hidden bg-klein", className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <DiversosSign className="absolute inset-0" />
      )}
    </span>
  )
}

/** The sign for "diversos": a gamepad in Klein claro on Klein. */
export function DiversosSign({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid place-items-center bg-klein text-klein-claro", className)}>
      <Gamepad2 className="h-1/3 w-1/3 min-h-5 min-w-5" strokeWidth={1.75} />
    </span>
  )
}
