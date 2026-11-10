import seedData from "@/content/valorant-inventory.json"
import { skinOf, weaponName, type Catalog, type Category, type Chroma, type Skin } from "@/lib/valorant-catalog"

/**
 * Valorant's inventory: dream loadouts (anyone's, built on the inventory page and saved in their profile) and the
 * channel's own inventory as the game has it (scripts/valorant_inventory.py → the profile API). The channel's collection
 * is its dream loadout: Luan edits it on the page signed in as the channel. content/valorant-inventory.json is what the
 * page starts with before the API answers (and while the channel has saved no collection).
 */

/** A weapon's pick: the skin and the variants, the first preferred. */
export interface Pick {
  skin: string
  chromas: string[]
}

/** A dream loadout, by weapon id; a weapon left out is "em aberto". */
export interface Loadout {
  armas: Record<string, Pick>
}

/** The channel's inventory as the game last had it. */
export interface GameReading {
  lido: string
  equipado: Record<string, { skin: string; chroma: string }>
  skins: string[]
  chromas: string[]
}

export interface ChannelInventory {
  colecao: Loadout
  jogo: GameReading | null
}

/** A weapon on the board. */
export interface InventoryWeapon {
  id: string
  name: string
  category: Category
  /** On it now in the channel's game (its standard skin while unknown, or for anyone else's loadout). */
  current: { skin: Skin; chroma: Chroma }
  /** Its pick in the loadout; none while open. */
  ideal?: {
    skin: Skin
    /** The variants picked, the first preferred. */
    variants: Chroma[]
    /** Whether the channel owns it (always true for anyone else's loadout, which draws as done). */
    owned: boolean
    /** Of the skin's variants, the ones the channel can equip: the base with the skin, the others unlocked one by one. */
    unlocked: string[]
  }
}

export const EMPTY: Loadout = { armas: {} }

export function seed(): ChannelInventory {
  return { colecao: seedData.colecao, jogo: seedData.jogo }
}

/** Every skin a channel inventory or a loadout mentions, for a page to bring from the catalogue. */
export function skinIds(inventory: Partial<ChannelInventory>, ...loadouts: Loadout[]): Set<string> {
  const ids = new Set<string>()
  for (const loadout of [inventory.colecao, ...loadouts]) for (const pick of Object.values(loadout?.armas ?? {})) ids.add(pick.skin)
  for (const on of Object.values(inventory.jogo?.equipado ?? {})) ids.add(on.skin)
  return ids
}

/**
 * The board for a loadout: each weapon of the catalogue with its pick (variants the catalogue doesn't know are left out,
 * a skin it doesn't know leaves the weapon open) and, with the channel's game reading, what's on it and what's owned.
 * Without a reading (anyone's loadout) every pick counts as owned and every variant as unlocked.
 */
export function boardOf(catalog: Catalog, loadout: Loadout, jogo: GameReading | null, { owned = !jogo } = {}): InventoryWeapon[] {
  const skins = new Set(jogo?.skins ?? [])
  const chromas = new Set(jogo?.chromas ?? [])
  return catalog.armas.flatMap((weapon) => {
    const standard = skinOf(catalog, weapon.padrao)
    if (!standard) return []
    const on = jogo?.equipado[weapon.id]
    const onSkin = (on && skinOf(catalog, on.skin)) || standard
    const current = { skin: onSkin, chroma: onSkin.chromas.find((chroma) => chroma.id === on?.chroma) ?? onSkin.chromas[0] }
    const base = { id: weapon.id, name: weaponName(weapon), category: weapon.grupo, current }
    const pick = loadout.armas[weapon.id]
    const skin = skinOf(catalog, pick?.skin)
    if (!pick || !skin) return [base]
    const variants = pick.chromas.flatMap((id) => skin.chromas.find((chroma) => chroma.id === id) ?? [])
    const has = owned || skins.has(skin.id)
    return [
      {
        ...base,
        ideal: {
          skin,
          variants: variants.length ? variants : [skin.chromas[0]],
          owned: has,
          unlocked: !has ? [] : owned ? skin.chromas.map((chroma) => chroma.id) : skin.chromas.filter((chroma, index) => index === 0 || chromas.has(chroma.id)).map((chroma) => chroma.id),
        },
      },
    ]
  })
}

/** How much of a loadout is picked, and how much of it the channel owns. */
export function progress(board: InventoryWeapon[]) {
  const picked = board.filter((weapon) => weapon.ideal)
  return { picked: picked.length, owned: picked.filter((weapon) => weapon.ideal!.owned).length, total: board.length }
}
