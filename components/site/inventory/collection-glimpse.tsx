"use client"

import { useEffect, useState } from "react"
import { CHANNEL } from "@/lib/twitch"
import type { ChannelInventory } from "@/lib/valorant-inventory"
import { loadLoadout } from "@/lib/valorant-loadout"

/**
 * The channel's collection on Valorant's home as a line: how many of its skins Luan has, a square per weapon picked.
 * It starts with what the page was built with and follows the profile API, where the game's reading and the
 * collection now live.
 */
export function CollectionGlimpse({ weapons, start, of, collected }: { weapons: string[]; start: ChannelInventory; of: string; collected: string }) {
  const [inventory, setInventory] = useState(start)

  useEffect(() => {
    loadLoadout(CHANNEL)
      .then((answer) => setInventory((before) => ({ colecao: answer.loadout ?? before.colecao, jogo: answer.jogo ?? before.jogo })))
      .catch(() => {})
  }, [])

  const owned = new Set(inventory.jogo?.skins ?? [])
  const picks = weapons.flatMap((weapon) => inventory.colecao.armas[weapon] ?? [])
  return (
    <span className="w-full max-w-48 space-y-1.5">
      <span className="block text-[13px] tabular-nums text-muted">
        {picks.filter((pick) => owned.has(pick.skin)).length} {of} {picks.length} {collected}
      </span>
      <span className="flex h-1.5 gap-[2px]" aria-hidden>
        {picks.map((pick, index) => (
          <span key={index} className={owned.has(pick.skin) ? "flex-1 rounded-full bg-navy" : "flex-1 rounded-full bg-zinc-200"} />
        ))}
      </span>
    </span>
  )
}
