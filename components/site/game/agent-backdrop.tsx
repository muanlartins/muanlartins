"use client"

import { Backdrop } from "@/components/site/game/backdrop"

/**
 * Valorant's backdrop (the game kit's, backdrop.tsx), its answer to Rocket League's ball: the agent of Luan's latest
 * ranked match, out of the bottom-left corner, fading upwards, redrawn in the brand's ramp so it reads as the site's
 * drawing, not Riot's poster. The game's layout picks it at build (`latestAgent` in app/[section]/[project]/
 * layout.tsx), so it changes as he plays and the prerendered page already has it; the home names it under "Meu rank".
 * The portraits are public/valorant/agentes/<id>-retrato.webp (scripts/valorant_assets.py).
 */
export function AgentBackdrop({ agent }: { /** The agent's id, as the art is named ("kayo"); none draws nothing. */ agent?: string }) {
  if (!agent) return null
  return (
    <Backdrop drift className="-bottom-[6vmin] -left-[10vmin] h-[92vmin] w-[70vmin] [mask-image:linear-gradient(to_top,black_55%,transparent)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/valorant/agentes/${agent}-retrato.webp`} alt="" className="h-full w-full object-contain object-left-bottom" />
    </Backdrop>
  )
}
