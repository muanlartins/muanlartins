"use client"

import { Check, Play, Plus, Search } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { Button, Choice, Dialog, EmptyState, ErrorLine, Input, Skeleton } from "@/components/site/ui"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { renderOf, skinName, skinOf, skinsOf, weaponName, type Catalog, type CatalogWeapon } from "@/lib/valorant-catalog"
import type { Pick } from "@/lib/valorant-inventory"

const T = localize({
  close: { pt: "Fechar", en: "Close" },
  done: { pt: "Pronto", en: "Done" },
  clear: { pt: "Deixar em aberto", en: "Leave it open" },
  search: { pt: "Buscar skin ou coleção", en: "Search a skin or collection" },
  rarities: { pt: "Raridade", en: "Rarity" },
  all: { pt: "Todas", en: "All" },
  loading: { pt: "Carregando todas as skins…", en: "Loading every skin…" },
  failed: { pt: "Não deu pra carregar todas as skins.", en: "Couldn't load every skin." },
  retry: { pt: "Tentar de novo", en: "Try again" },
  none: { pt: "Nenhuma skin com esse nome. Tenta outra palavra ou o nome da coleção.", en: "No skin by that name. Try another word or the collection's name." },
  pickOne: { pt: "Escolhe uma skin abaixo.", en: "Pick a skin below." },
  variants: { pt: "Variantes", en: "Variants" },
  preferred: { pt: "Preferida", en: "Preferred" },
  alternative: { pt: "Também usaria", en: "Would use too" },
  addAlternative: { pt: "Marcar como alternativa", en: "Mark as an alternative" },
  showcase: { pt: "Assistir em jogo", en: "Watch it in game" },
  stopShowcase: { pt: "Ver a imagem", en: "See the image" },
  collection: { pt: "Coleção", en: "Collection" },
  applyTheme: { pt: "Usar em todas as armas da coleção", en: "Use it on every weapon of the collection" },
  skins: { pt: "skins", en: "skins" },
})

const normal = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

/**
 * Every skin of one weapon, to pick the one for a dream loadout: a search over both languages' names and the
 * collections, the rarities as filters, the picked skin up close with Riot's showcase video, its variants (one
 * preferred, any others as alternatives), and the whole collection on every weapon that has it in one click.
 */
export function SkinPicker({
  catalog,
  loaded,
  weapon,
  pick,
  onPick,
  onTheme,
  onRetry,
  onClose,
}: {
  catalog: Catalog
  /** "full" once the whole catalogue is in; "failed" if it couldn't load. */
  loaded: "start" | "full" | "failed"
  weapon?: CatalogWeapon
  pick?: Pick
  onPick: (pick: Pick | null) => void
  /** Puts this collection's skin on every weapon that has one, in the variant of this name where it exists. */
  onTheme: (theme: string, variant: string) => void
  /** Asks for the whole catalogue again. */
  onRetry: () => void
  onClose: () => void
}) {
  const [shown, setShown] = useState<CatalogWeapon>()
  const [query, setQuery] = useState("")
  const [tier, setTier] = useState<string>()
  const [playing, setPlaying] = useState(false)
  const deferred = useDeferredValue(query)

  // A new weapon starts with an empty search.
  if (weapon && weapon !== shown) {
    setShown(weapon)
    setQuery("")
    setTier(undefined)
    setPlaying(false)
  }

  const skin = skinOf(catalog, pick?.skin)
  const preferred = skin?.chromas.find((chroma) => chroma.id === pick?.chromas[0]) ?? skin?.chromas[0]
  const alternatives = new Set(pick?.chromas.slice(1))
  const theme = skin?.theme
  const themeSize = theme ? new Set(Object.values(catalog.skins).filter((each) => each.t === theme.id).map((each) => each.a)).size : 0

  const words = normal(deferred).split(/\s+/).filter(Boolean)
  const all = shown ? skinsOf(catalog, shown) : []
  const tiers = [...new Set(all.map((id) => catalog.skins[id].r).filter((id): id is string => !!id))].sort(
    (a, b) => catalog.raridades[a].ordem - catalog.raridades[b].ordem,
  )
  const list = all.filter((id) => {
    const each = catalog.skins[id]
    if (tier && each.r !== tier) return false
    if (!words.length) return true
    const names = normal([each.n, each.p, ...(each.t ? (catalog.temas[each.t] ?? []) : [])].filter(Boolean).join(" "))
    return words.every((word) => names.includes(word))
  })

  function choose(id: string) {
    setPlaying(false)
    if (id === pick?.skin) return
    // The same variant where the new skin has one by that name (Blue → Blue), else the skin itself.
    const before = pick && catalog.skins[pick.skin]?.c.find((chroma) => chroma.i === pick.chromas[0])?.n
    const raw = catalog.skins[id]
    onPick({ skin: id, chromas: [(raw.c.find((chroma) => chroma.n === before) ?? raw.c[0]).i] })
  }

  function prefer(id: string) {
    if (!pick) return
    setPlaying(false)
    onPick({ skin: pick.skin, chromas: [id, ...pick.chromas.slice(1).filter((each) => each !== id)] })
  }

  function toggleAlternative(id: string) {
    if (!pick) return
    const rest = pick.chromas.slice(1)
    onPick({ skin: pick.skin, chromas: [pick.chromas[0], ...(rest.includes(id) ? rest.filter((each) => each !== id) : [...rest, id])] })
  }

  return (
    <Dialog open={!!weapon} onClose={onClose} title={shown ? weaponName(shown) : ""} closeLabel={T.close} width={60} flush>
      {shown && (
        <>
          <div className="grid shrink-0 border-b border-line sm:grid-cols-[1.15fr_1fr]">
            {/* On a phone the picture waits for a pick, leaving the room to the list. */}
            <div className={cn("relative h-32 bg-navy sm:h-56", !preferred && "hidden sm:block")}>
              {playing && preferred?.video ? (
                <video key={preferred.video} src={preferred.video} autoPlay controls playsInline className="h-full w-full bg-navy object-contain" onError={() => setPlaying(false)} />
              ) : preferred ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={preferred.id}
                  src={preferred.image}
                  alt={`${skin!.name} · ${preferred.name}`}
                  className="absolute inset-0 m-auto max-h-[78%] max-w-[86%] object-contain drop-shadow-[0_10px_30px_color-mix(in_oklab,var(--color-klein-claro)_30%,transparent)] motion-safe:animate-[inventory-in_0.3s_cubic-bezier(0.65,0,0.35,1)]"
                />
              ) : (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[15px] text-klein-claro">{T.pickOne}</p>
              )}
              {preferred?.video && <ShowcaseButton playing={playing} onClick={() => setPlaying(!playing)} />}
            </div>

            <div className="space-y-3 p-5">
              <h3 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xl font-medium tracking-[-0.02em] text-klein">
                {skin ? skin.name : <span className="text-[15px] font-normal tracking-normal text-muted">{T.pickOne}</span>}
                {skin?.tier && <Rarity name={skin.tier.name} color={skin.tier.color} />}
              </h3>

              {skin && skin.chromas.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-[13px] font-medium text-muted">{T.variants}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {skin.chromas.map((chroma) => {
                      const isPreferred = chroma.id === preferred?.id
                      const isAlternative = alternatives.has(chroma.id)
                      return (
                        <li
                          key={chroma.id}
                          className={cn(
                            "cut-sm cut-edge relative flex border transition-colors",
                            isPreferred ? "border-klein bg-klein text-paper" : isAlternative ? "border-klein text-klein" : "border-line-strong text-ink hover:border-klein",
                          )}
                        >
                          <button type="button" aria-pressed={isPreferred} onClick={() => prefer(chroma.id)} className="flex min-h-8 items-center gap-1.5 py-1 pl-1.5 pr-2.5 text-left text-[13px] font-medium">
                            {chroma.swatch ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={chroma.swatch} alt="" className="h-5 w-5" />
                            ) : (
                              <span className="h-5 w-5 bg-zinc-200" />
                            )}
                            {chroma.name}
                          </button>
                          {!isPreferred && (
                            <button
                              type="button"
                              aria-pressed={isAlternative}
                              title={isAlternative ? T.alternative : T.addAlternative}
                              aria-label={`${T.addAlternative}: ${chroma.name}`}
                              onClick={() => toggleAlternative(chroma.id)}
                              className={cn("grid w-7 place-items-center border-l transition-colors", isAlternative ? "border-klein bg-klein/10" : "border-line-strong text-muted hover:text-klein")}
                            >
                              {isAlternative ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Plus aria-hidden className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {alternatives.size > 0 && (
                    <p className="text-[13px] text-muted">{`${T.preferred}: ${preferred?.name} · ${T.alternative.toLowerCase()}: ${skin.chromas.filter((c) => alternatives.has(c.id)).map((c) => c.name).join(", ")}`}</p>
                  )}
                </div>
              )}

              {theme && themeSize > 1 && (
                <button
                  type="button"
                  onClick={() => onTheme(theme.id, catalog.skins[skin!.id].c.find((chroma) => chroma.i === preferred?.id)?.n ?? "Base")}
                  className="cut-sm cut-edge relative block w-full border border-line-strong px-3 py-2 text-left text-[13px] transition-colors hover:border-klein hover:bg-klein/5"
                >
                  <span className="block font-medium text-klein">
                    {T.collection} {theme.name}
                  </span>
                  <span className="block text-muted">
                    {T.applyTheme} ({themeSize})
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-5 py-3">
            <label className="relative min-w-[12rem] flex-1">
              <span className="sr-only">{T.search}</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T.search} className="pl-9" />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={T.rarities}>
              {[undefined, ...tiers].map((id) => (
                <Choice key={id ?? "all"} size="sm" on={tier === id} onClick={() => setTier(id)} icon={id ? <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: catalog.raridades[id].cor }} /> : undefined}>
                  {id ? catalog.raridades[id].nome : T.all}
                </Choice>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loaded === "failed" && <ErrorLine onRetry={onRetry} retryLabel={T.retry} className="mb-3">{T.failed}</ErrorLine>}
            {list.length === 0 && loaded === "full" && <EmptyState className="text-center">{T.none}</EmptyState>}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-busy={loaded === "start"}>
              {list.map((id) => {
                const each = catalog.skins[id]
                const on = id === pick?.skin
                const rarity = each.r ? catalog.raridades[each.r] : undefined
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => choose(id)}
                      className={cn("cut cut-edge group relative flex h-28 w-full flex-col border p-2 text-left transition-colors", on ? "border-navy bg-navy text-paper" : "border-line bg-paper hover:border-klein")}
                    >
                      <span className="relative block flex-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={renderOf(each.c[0].i)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 m-auto max-h-full max-w-[92%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        {rarity && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: rarity.cor }} />}
                        <span className={cn("truncate text-[13px] font-medium", on ? "text-paper" : "text-ink")}>{skinName(each)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
              {/* While the whole catalogue comes, the rest of the grid is drawn as what's coming. */}
              {loaded === "start" &&
                Array.from({ length: 8 }, (_, index) => (
                  <li key={`loading-${index}`} aria-hidden>
                    <Skeleton className="cut h-28" />
                  </li>
                ))}
            </ul>
            {loaded === "start" && <p className="sr-only" role="status">{T.loading}</p>}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3">
            <span className="text-[13px] tabular-nums text-muted">
              {list.length} {T.skins}
            </span>
            <span className="flex gap-2">
              {pick && (
                <Button variant="secondary" size="sm" onClick={() => onPick(null)}>
                  {T.clear}
                </Button>
              )}
              <Button size="sm" onClick={onClose}>
                {T.done}
              </Button>
            </span>
          </div>
        </>
      )}
    </Dialog>
  )
}

/** A skin's rarity as a square chip with its colour's dot (the game's colour, data from the catalogue). */
export function Rarity({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-line-strong px-2 py-0.5 text-[13px] font-medium tracking-normal text-ink">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
      {name}
    </span>
  )
}

/** Riot's showcase video for a skin, over its picture: play it, or go back to the picture. */
export function ShowcaseButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cut-sm absolute left-3 flex min-h-8 items-center gap-1.5 bg-paper/15 px-2.5 py-1.5 text-[13px] font-medium text-paper backdrop-blur-sm transition-colors hover:bg-paper/25 focus-visible:outline-paper",
        playing ? "top-3" : "bottom-3",
      )}
    >
      {!playing && <Play aria-hidden className="h-3.5 w-3.5 fill-current" />}
      {playing ? T.stopShowcase : T.showcase}
    </button>
  )
}
