"use client"

import { loadCatalog } from "@/lib/valorant-catalog"
import { boardOf, progress, type InventoryWeapon } from "@/lib/valorant-inventory"
import { loadLoadout } from "@/lib/valorant-loadout"

export interface Showcase {
  /** The weapons they picked a skin for, in the game's order. */
  picked: InventoryWeapon[]
  total: number
}

/** Someone's dream loadout for their page: null when they have none (or it couldn't be read). */
export async function loadShowcase(login: string): Promise<Showcase | null> {
  const { loadout } = await loadLoadout(login)
  if (!loadout || !Object.keys(loadout.armas).length) return null
  const board = boardOf(await loadCatalog(), loadout, null)
  const picked = board.filter((weapon) => weapon.ideal)
  return picked.length ? { picked, total: progress(board).total } : null
}

/** Their dream loadout as the inventory draws a weapon with its skin: the preferred variant, on the night. */
export function LoadoutTiles({ picked }: { picked: InventoryWeapon[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {picked.map(({ id, name, ideal }) => {
        const variant = ideal!.variants[0]
        return (
          <li key={id} className="cut-sm flex h-32 flex-col bg-navy bg-[radial-gradient(ellipse_at_50%_45%,var(--color-klein),transparent_70%)] p-3">
            <span className="text-[12px] font-medium text-klein-claro">{name}</span>
            <span className="relative my-1 block flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={variant.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 m-auto max-h-full max-w-[88%] object-contain drop-shadow-[0_6px_18px_color-mix(in_oklab,var(--color-klein-claro)_25%,transparent)]"
              />
            </span>
            <span className="truncate text-[13px] font-medium tracking-[-0.01em] text-paper" title={ideal!.skin.name}>
              {ideal!.skin.name}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
