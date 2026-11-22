"use client"

import { MountainShape } from "@/components/site/celeste/glyphs"
import { Backdrop } from "@/components/site/game/backdrop"

/** The game kit's backdrop for Celeste: the mountain, out of the bottom-left corner, rising a little with the scroll. */
export function MountainBackdrop() {
  return (
    <Backdrop drift className="w-[68vmin]">
      <svg viewBox="0 0 600 330" className="block w-full opacity-50">
        <MountainShape />
      </svg>
    </Backdrop>
  )
}
