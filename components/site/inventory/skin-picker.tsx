"use client"

import { Check, Play, Plus, Search, X } from "lucide-react"
import { useDeferredValue, useEffect, useRef, useState } from "react"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { renderOf, skinName, skinOf, skinsOf, weaponName, type Catalog, type CatalogWeapon } from "@/lib/valorant-catalog"
import type { Pick } from "@/lib/valorant-inventory"

const T = localize({
  close: { pt: "Fechar", en: "Close" },
  done: { pt: "Pronto", en: "Done" },
  clear: { pt: "Deixar em aberto", en: "Leave it open" },
  search: { pt: "Buscar skin ou coleção", en: "Search a skin or collection" },
  all: { pt: "Todas", en: "All" },
  loading: { pt: "Carregando todas as skins…", en: "Loading every skin…" },
  failed: { pt: "Não deu pra carregar todas as skins. Recarregue a página.", en: "Couldn't load every skin. Reload the page." },
  none: { pt: "Nenhuma skin com esse nome.", en: "No skin by that name." },
  pickOne: { pt: "Escolha uma skin abaixo.", en: "Pick a skin below." },
  variants: { pt: "Variantes", en: "Variants" },
  preferred: { pt: "Preferida", en: "Preferred" },
  alternative: { pt: "Também usaria", en: "Would use too" },
  addAlternative: { pt: "Marcar como alternativa", en: "Mark as an alternative" },
  showcase: { pt: "Ver em jogo", en: "See it in game" },
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
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState<CatalogWeapon>()
  const [query, setQuery] = useState("")
  const [tier, setTier] = useState<string>()
  const [playing, setPlaying] = useState(false)
  const deferred = useDeferredValue(query)

  // The dialog keeps its weapon while it closes; a new one starts with an empty search.
  if (weapon && weapon !== shown) {
    setShown(weapon)
    setQuery("")
    setTier(undefined)
    setPlaying(false)
  }

  useEffect(() => {
    const element = dialog.current
    if (weapon && !element?.open) element?.showModal()
    if (!weapon && element?.open) element.close()
  }, [weapon])

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
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-auto flex w-[min(60rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-md border border-line bg-paper p-0 text-ink backdrop:bg-navy/55 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[inventory-dialog_0.22s_ease-out] [&:not([open])]:hidden"
    >
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
                  className="absolute inset-0 m-auto max-h-[78%] max-w-[86%] object-contain drop-shadow-[0_10px_30px_rgba(133,167,255,0.3)] motion-safe:animate-[inventory-in_0.3s_ease-out]"
                />
              ) : (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-klein-claro">{T.pickOne}</p>
              )}
              {preferred?.video && (
                <button
                  type="button"
                  onClick={() => setPlaying(!playing)}
                  className={cn(
                    "absolute left-3 flex items-center gap-1.5 rounded-md bg-paper/10 px-2.5 py-1.5 text-[13px] font-medium text-paper outline-none backdrop-blur-sm transition-colors hover:bg-paper/20 focus-visible:ring-2 focus-visible:ring-klein-claro",
                    playing ? "top-3" : "bottom-3",
                  )}
                >
                  {!playing && <Play aria-hidden className="h-3.5 w-3.5 fill-current" />}
                  {playing ? T.stopShowcase : T.showcase}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={T.close}
                className="absolute right-3 top-3 rounded-md p-1.5 text-paper/80 outline-none transition-colors hover:bg-paper/10 hover:text-paper focus-visible:ring-2 focus-visible:ring-klein-claro sm:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-muted">{weaponName(shown)}</p>
                  <h3 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xl font-medium tracking-[-0.02em] text-klein">
                    {skin ? skin.name : <span className="text-[15px] font-normal tracking-normal text-muted">{T.pickOne}</span>}
                    {skin?.tier && (
                      <span className="flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[12px] font-medium tracking-normal text-ink">
                        <span className="h-2 w-2 rounded-full" style={{ background: skin.tier.color }} />
                        {skin.tier.name}
                      </span>
                    )}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={T.close}
                  className={cn("rounded-md p-1.5 text-muted outline-none transition-colors hover:bg-zinc-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-klein", preferred && "hidden sm:block")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {skin && skin.chromas.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium text-muted">{T.variants}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {skin.chromas.map((chroma) => {
                      const isPreferred = chroma.id === preferred?.id
                      const isAlternative = alternatives.has(chroma.id)
                      return (
                        <li key={chroma.id} className="flex">
                          <button
                            type="button"
                            aria-pressed={isPreferred}
                            onClick={() => prefer(chroma.id)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-l-md border py-1 pl-1 pr-2 text-left text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                              isPreferred ? "border-klein bg-klein text-paper" : isAlternative ? "border-klein/50 text-klein" : "border-line text-ink hover:border-klein",
                              isPreferred && "rounded-r-md",
                            )}
                          >
                            {chroma.swatch ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={chroma.swatch} alt="" className="h-5 w-5 rounded-[3px]" />
                            ) : (
                              <span className="h-5 w-5 rounded-[3px] bg-zinc-200" />
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
                              className={cn(
                                "rounded-r-md border border-l-0 px-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                                isAlternative ? "border-klein/50 bg-klein/10 text-klein" : "border-line text-muted hover:text-klein",
                              )}
                            >
                              {isAlternative ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {alternatives.size > 0 && <p className="text-[12px] text-muted">{`${T.preferred}: ${preferred?.name} · ${T.alternative.toLowerCase()}: ${skin.chromas.filter((c) => alternatives.has(c.id)).map((c) => c.name).join(", ")}`}</p>}
                </div>
              )}

              {theme && themeSize > 1 && (
                <button
                  type="button"
                  onClick={() => onTheme(theme.id, catalog.skins[skin!.id].c.find((chroma) => chroma.i === preferred?.id)?.n ?? "Base")}
                  className="w-full rounded-md border border-klein/40 px-3 py-2 text-left text-[13px] outline-none transition-colors hover:border-klein hover:bg-klein/5 focus-visible:ring-2 focus-visible:ring-klein"
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

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
            <label className="relative min-w-[12rem] flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={T.search}
                aria-label={T.search}
                className="w-full rounded-md border border-line bg-paper py-2 pl-8 pr-3 text-[14px] text-ink outline-none placeholder:text-muted focus-visible:border-klein"
              />
            </label>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
              {[undefined, ...tiers].map((id) => (
                <button
                  key={id ?? "all"}
                  type="button"
                  role="radio"
                  aria-checked={tier === id}
                  onClick={() => setTier(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                    tier === id ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein",
                  )}
                >
                  {id && <span className="h-2 w-2 rounded-full" style={{ background: catalog.raridades[id].cor }} />}
                  {id ? catalog.raridades[id].nome : T.all}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
            {loaded !== "full" && <p className="mb-3 text-[13px] text-muted">{loaded === "failed" ? T.failed : T.loading}</p>}
            {list.length === 0 && loaded === "full" && <p className="py-6 text-center text-[14px] text-muted">{T.none}</p>}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                      className={cn(
                        "group flex h-28 w-full flex-col rounded-md border p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                        on ? "border-navy bg-navy text-paper" : "border-line bg-paper hover:border-klein",
                      )}
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
                        {rarity && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: rarity.cor }} />}
                        <span className={cn("truncate text-[12px] font-medium", on ? "text-paper" : "text-ink")}>{skinName(each)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
            <span className="text-[12px] text-muted">
              {list.length} {T.skins}
            </span>
            <span className="flex gap-2">
              {pick && (
                <button
                  type="button"
                  onClick={() => onPick(null)}
                  className="rounded-md border border-line px-3 py-1.5 text-[14px] font-medium text-ink outline-none transition-colors hover:border-klein focus-visible:ring-2 focus-visible:ring-klein"
                >
                  {T.clear}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-klein px-4 py-1.5 text-[14px] font-medium text-paper outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-klein focus-visible:ring-offset-2"
              >
                {T.done}
              </button>
            </span>
          </div>
        </>
      )}
    </dialog>
  )
}
