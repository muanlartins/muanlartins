"use client"

import { useState } from "react"
import { GameCover } from "@/components/site/diversos/game-cover"
import type { OtherGame } from "@/lib/diversos"
import { cn } from "@/lib/utils"

/** Another game's official wide art (`art` in content/diversos.json, hotlinked), its cover without one or when it fails. */
export function GamePicture({ game, className }: { game: OtherGame; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!game.art || failed) return <GameCover game={game} className={className} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={game.art} alt="" loading="lazy" onError={() => setFailed(true)} className={cn("block object-cover", className)} />
  )
}
