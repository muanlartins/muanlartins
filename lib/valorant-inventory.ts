import data from "@/content/valorant-inventory.json"
import { localize, type L10n } from "@/lib/site"

/**
 * Valorant's inventory (content/valorant-inventory.json, by scripts/valorant_inventory.py): each weapon with the skin
 * on it in the game's last reading and the skin it gets in the collection Luan is building (content/valorant-ideal.json),
 * with which of those he owns, down to the variants.
 */

export interface Chroma {
  id: string
  /** The variant's short name as the game has it: "Blue", "Cobalt"; the first is "Base". */
  name: string
  image: string | null
  swatch: string | null
  /** Riot's showcase video, on Riot's CDN. */
  video: string | null
}

export interface Skin {
  name: string
  /** The weapon's own skin, before any other. */
  standard: boolean
  tier: { name: string; color: string } | null
  chromas: Chroma[]
}

export type Category = "sidearms" | "smgs" | "shotguns" | "rifles" | "snipers" | "heavies" | "melee"

export interface InventoryWeapon {
  id: string
  name: string
  category: Category
  /** On it now (the standard skin until the game is read). */
  current: { skin: Skin; chroma: Chroma }
  /** Its skin in the collection; none while Luan hasn't picked one. */
  ideal?: {
    skin: Skin
    /** The variants Luan would use, the first preferred. */
    variants: Chroma[]
    owned: boolean
    /** Of the skin's variants, the ones he can equip: the base with the skin, the others unlocked one by one. */
    unlocked: string[]
  }
}

export interface Inventory {
  /** When the game was last read; null before the first time. */
  read: string | null
  weapons: InventoryWeapon[]
}

export const CATEGORIES: Record<Category, L10n> = {
  sidearms: { pt: "Pistolas", en: "Sidearms" },
  smgs: { pt: "Submetralhadoras", en: "SMGs" },
  shotguns: { pt: "Escopetas", en: "Shotguns" },
  rifles: { pt: "Rifles", en: "Rifles" },
  snipers: { pt: "Fuzis de precisão", en: "Sniper rifles" },
  heavies: { pt: "Metralhadoras", en: "Machine guns" },
  melee: { pt: "Corpo a corpo", en: "Melee" },
}

/** The melee is "Melee" in the game's data; the Brazilian client calls it the knife. */
const MELEE: L10n = { pt: "Faca", en: "Melee" }

export function inventory(): Inventory {
  const skins = data.skins as Record<string, Skin>
  const owned = new Set<string>(data.owned.skins)
  const chromas = new Set<string>(data.owned.chromas)
  return {
    read: data.read,
    weapons: data.weapons.map(({ name, ...weapon }) => {
      if (weapon.id === "melee") name = localize(MELEE)
      const skin = skins[weapon.skin]
      const current = { skin, chroma: skin.chromas.find((chroma) => chroma.id === weapon.chroma) ?? skin.chromas[0] }
      if (!weapon.ideal) return { id: weapon.id, name, category: weapon.category as Category, current }
      const ideal = skins[weapon.ideal.skin]
      const has = owned.has(weapon.ideal.skin)
      return {
        id: weapon.id,
        name,
        category: weapon.category as Category,
        current,
        ideal: {
          skin: ideal,
          variants: weapon.ideal.variants.map((name) => ideal.chromas.find((chroma) => chroma.name === name)!),
          owned: has,
          unlocked: has ? ideal.chromas.filter((chroma, index) => index === 0 || chromas.has(chroma.id)).map((chroma) => chroma.id) : [],
        },
      }
    }),
  }
}
