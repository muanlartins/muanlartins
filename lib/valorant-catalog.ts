import { localize, LOCALE, type L10n } from "@/lib/site"

/**
 * Every Valorant weapon skin (public/valorant/catalogo.json, by scripts/valorant_catalogo.py from valorant-api.com),
 * and what the inventory draws from it. The pictures come from valorant-api.com's media CDN by Riot's ids, and the
 * showcase videos from Riot's own: neither is copied into the site, and both allow a canvas to draw them, which is how
 * the loadout's image is made (lib/loadout-image.ts).
 */

export type Category = "sidearms" | "smgs" | "shotguns" | "rifles" | "snipers" | "heavies" | "melee"

/** A weapon, in the collection's order. */
export interface CatalogWeapon {
  /** Its name in lowercase, as the profile API keeps loadouts: "vandal", "melee". */
  id: string
  nome: string
  grupo: Category
  /** Its standard skin. */
  padrao: string
}

/** A variant (chroma). The first of a skin is the skin itself, "Base". */
export interface CatalogChroma {
  i: string
  /** Its short name in English ("Blue"), and in Portuguese when it differs ("Azul"). */
  n: string
  p?: string
  /** Has a swatch. */
  s?: 1
  /** Its own showcase video, under Riot's video CDN. */
  v?: string
}

export interface CatalogSkin {
  /** The weapon's id. */
  a: string
  /** Its name in English, and in Portuguese when it differs. */
  n: string
  p?: string
  /** Its collection (theme) and rarity (content tier), by id. */
  t?: string
  r?: string
  /** The showcase video of its last level, for the variants without their own. */
  v?: string
  c: CatalogChroma[]
}

export interface Catalog {
  versao: string
  armas: CatalogWeapon[]
  /** Each collection's name in English and Portuguese. */
  temas: Record<string, [string, string]>
  raridades: Record<string, { nome: string; cor: string; ordem: number }>
  skins: Record<string, CatalogSkin>
}

/** A variant as the pages draw it. */
export interface Chroma {
  id: string
  /** The variant's short name: "Blue", "Azul"; the first is "Base". */
  name: string
  image: string
  swatch: string | null
  /** Riot's showcase video, on Riot's CDN. */
  video: string | null
}

export interface Skin {
  id: string
  name: string
  /** The weapon's own skin, before any other. */
  standard: boolean
  tier: { id: string; name: string; color: string; order: number } | null
  theme: { id: string; name: string } | null
  chromas: Chroma[]
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

const MEDIA = "https://media.valorant-api.com"
const VIDEOS = "https://valorant.dyn.riotcdn.net/x/videos/"

export const renderOf = (chroma: string) => `${MEDIA}/weaponskinchromas/${chroma}/fullrender.png`
export const swatchOf = (chroma: string) => `${MEDIA}/weaponskinchromas/${chroma}/swatch.png`

export const weaponName = (weapon: CatalogWeapon) => (weapon.id === "melee" ? localize(MELEE) : weapon.nome)

/** A skin's name as the Brazilian client shows it (the site speaks Portuguese), or the English one. */
export const skinName = (skin: Pick<CatalogSkin, "n" | "p">) => (LOCALE === "pt" ? (skin.p ?? skin.n) : skin.n)

/** A skin as the pages draw it; undefined when the catalogue doesn't have it (a skin newer than the catalogue). */
export function skinOf(catalog: Catalog, id: string | undefined): Skin | undefined {
  const raw = id ? catalog.skins[id] : undefined
  if (!raw || !id) return undefined
  const weapon = catalog.armas.find((each) => each.id === raw.a)
  const tier = raw.r ? catalog.raridades[raw.r] : undefined
  const theme = raw.t ? catalog.temas[raw.t] : undefined
  return {
    id,
    name: skinName(raw),
    standard: weapon?.padrao === id,
    tier: tier && raw.r ? { id: raw.r, name: tier.nome, color: tier.cor, order: tier.ordem } : null,
    theme: theme && raw.t ? { id: raw.t, name: LOCALE === "pt" ? theme[1] : theme[0] } : null,
    chromas: raw.c.map((chroma) => ({
      id: chroma.i,
      name: LOCALE === "pt" ? (chroma.p ?? chroma.n) : chroma.n,
      image: renderOf(chroma.i),
      swatch: chroma.s ? swatchOf(chroma.i) : null,
      video: chroma.v || raw.v ? VIDEOS + (chroma.v ?? raw.v) : null,
    })),
  }
}

/** The skins of a weapon in the catalogue, its standard one first, then by name. */
export function skinsOf(catalog: Catalog, weapon: CatalogWeapon): string[] {
  return Object.keys(catalog.skins)
    .filter((id) => catalog.skins[id].a === weapon.id)
    .sort((a, b) => (a === weapon.padrao ? -1 : b === weapon.padrao ? 1 : skinName(catalog.skins[a]).localeCompare(skinName(catalog.skins[b]), LOCALE)))
}

/** Only these skins of the catalogue (with everything else it has), for a page to start with before the whole loads. */
export function subset(catalog: Catalog, ids: Iterable<string>): Catalog {
  const skins: Catalog["skins"] = {}
  for (const id of ids) if (catalog.skins[id]) skins[id] = catalog.skins[id]
  for (const weapon of catalog.armas) if (catalog.skins[weapon.padrao]) skins[weapon.padrao] = catalog.skins[weapon.padrao]
  return { ...catalog, skins }
}

let loading: Promise<Catalog> | undefined

/** The whole catalogue, fetched once per page. */
export function loadCatalog(): Promise<Catalog> {
  loading ??= fetch("/valorant/catalogo.json").then((response) => {
    if (!response.ok) throw new Error(String(response.status))
    return response.json() as Promise<Catalog>
  })
  loading.catch(() => (loading = undefined))
  return loading
}
