"use client"

import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"
import { AGENT_PORTRAITS } from "@/lib/ranked-view"

// The agent on screen, kept per page: a new page draws another (never the same twice in a row).
let shown: { path: string; index: number } = { path: "", index: -1 }
function agentFor(path: string) {
  if (shown.path !== path) {
    let index = Math.floor(Math.random() * AGENT_PORTRAITS.length)
    if (index === shown.index) index = (index + 1) % AGENT_PORTRAITS.length
    shown = { path, index }
  }
  return shown.index
}
const never = () => () => {}

/**
 * Valorant's answer to Rocket League's ball: an agent behind every Valorant page, out of the bottom-left corner,
 * fading upwards. Each page opened draws another of the agents (public/valorant/agentes, by
 * scripts/valorant_assets.py). Drawn only in the browser, so the prerendered page has none and nothing jumps.
 */
export function AgentBackdrop() {
  const path = usePathname()
  const index = useSyncExternalStore(never, () => agentFor(path), () => -1)
  const agent = AGENT_PORTRAITS[index]
  if (!agent) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -bottom-[6vmin] -left-[10vmin] -z-10 h-[92vmin] w-[70vmin] opacity-[0.28] [mask-image:linear-gradient(to_top,black_55%,transparent)] motion-safe:animate-[agent-in_0.9s_ease-out]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={agent.image} src={agent.image} alt="" className="h-full w-full object-contain object-left-bottom" />
    </div>
  )
}
