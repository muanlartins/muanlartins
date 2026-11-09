"use client"

import { Check, Lock, Play, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { CATEGORIES, type Category, type Chroma, type InventoryWeapon, type Skin } from "@/lib/valorant-inventory"

const T = localize({
  ideal: { pt: "Coleção", en: "Collection" },
  now: { pt: "No jogo agora", en: "In game now" },
  views: { pt: "O que mostrar", en: "What to show" },
  of: { pt: "de", en: "of" },
  inCollection: { pt: "skins da coleção", en: "collection skins" },
  read: { pt: "Inventário lido do jogo em", en: "Inventory read from the game on" },
  unread: {
    pt: "O que está equipado em cada arma aparece depois da primeira leitura do jogo.",
    en: "What's equipped on each weapon shows up after the game's first reading.",
  },
  owned: { pt: "Na coleção", en: "Collected" },
  locked: { pt: "Variante bloqueada", en: "Variant locked" },
  missing: { pt: "Falta", en: "Missing" },
  open: { pt: "Em aberto", en: "Open" },
  noPick: { pt: "Sem skin escolhida", en: "No skin picked" },
  standard: { pt: "Padrão", en: "Standard" },
  isIdeal: { pt: "É a da coleção", en: "The collection's" },
  collection: { pt: "Coleção", en: "Collection" },
  preferred: { pt: "Preferida", en: "Preferred" },
  alternative: { pt: "Alternativa", en: "Alternative" },
  showcase: { pt: "Ver em jogo", en: "See it in game" },
  stopShowcase: { pt: "Ver a imagem", en: "See the image" },
  close: { pt: "Fechar", en: "Close" },
  variants: { pt: "Variantes", en: "Variants" },
  statusOwned: { pt: "Já tenho esta skin.", en: "I have this skin." },
  statusLocked: {
    pt: "Já tenho esta skin, mas a variante escolhida ainda está bloqueada.",
    en: "I have this skin, but the chosen variant is still locked.",
  },
  statusMissing: { pt: "Ainda não tenho esta skin.", en: "I don't have this skin yet." },
  statusOpen: { pt: "Ainda não escolhi a skin desta arma para a coleção.", en: "I haven't picked this weapon's collection skin yet." },
})

type View = "ideal" | "now"

const ORDER = Object.keys(CATEGORIES) as Category[]

/**
 * The collection as a board grouped like the game's own: each weapon a card, pale with its skin as a ghost while
 * missing, dark and in colour once it's in (black and blue skins, so the board darkens as it fills). The other view
 * swaps every card to what's on the weapon now; a card opens the skin with its variants and Riot's showcase video.
 */
export function InventoryBoard({ weapons, read }: { weapons: InventoryWeapon[]; read: string | null }) {
  const [view, setView] = useState<View>("ideal")
  const [open, setOpen] = useState<InventoryWeapon>()
  const picked = weapons.filter((weapon) => weapon.ideal)
  const owned = picked.filter((weapon) => weapon.ideal!.owned).length
  const groups = ORDER.map((category) => ({ category, weapons: weapons.filter((weapon) => weapon.category === category) }))

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="flex items-baseline gap-2 text-ink">
            <span className="whitespace-nowrap text-3xl font-medium tabular-nums tracking-[-0.02em] text-klein">
              {owned} {T.of} {picked.length}
            </span>
            <span className="text-[15px] text-muted">{T.inCollection}</span>
          </p>
          <div className="flex h-1.5 max-w-sm gap-[3px]" aria-hidden>
            {picked.map((weapon) => (
              <span key={weapon.id} title={weapon.name} className={cn("flex-1 rounded-full", weapon.ideal!.owned ? "bg-navy" : "bg-zinc-200")} />
            ))}
          </div>
          <p className="text-[13px] text-muted">{read ? `${T.read} ${read}.` : T.unread}</p>
        </div>
        <div role="radiogroup" aria-label={T.views} className="relative flex self-start rounded-md border border-line bg-paper/70 p-1 backdrop-blur-sm sm:self-auto">
          {(["ideal", "now"] as const).map((each) => (
            <button
              key={each}
              type="button"
              role="radio"
              aria-checked={view === each}
              onClick={() => setView(each)}
              className={cn(
                "relative rounded-[4px] px-3.5 py-1.5 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                view === each ? "text-paper" : "text-muted hover:text-ink",
              )}
            >
              {view === each && (
                <motion.span layoutId="inventory-view" transition={{ type: "spring", stiffness: 380, damping: 32 }} className="absolute inset-0 rounded-[4px] bg-klein" />
              )}
              <span className="relative">{each === "ideal" ? T.ideal : T.now}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.map(({ category, weapons: inGroup }) => (
        <div key={category}>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{localize(CATEGORIES[category])}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {inGroup.map((weapon) => (
              <li key={weapon.id}>
                <WeaponCard weapon={weapon} view={view} order={weapons.indexOf(weapon)} read={read !== null} onOpen={() => setOpen(weapon)} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <SkinDialog weapon={open} read={read !== null} onClose={() => setOpen(undefined)} />
    </section>
  )
}

/** What a card shows in a view: the skin, its variant, whether it's done, and the line under the name. */
function cardOf(weapon: InventoryWeapon, view: View, read: boolean) {
  const { ideal, current } = weapon
  if (view === "now") {
    return {
      chroma: current.chroma,
      name: current.skin.standard ? T.standard : current.skin.name,
      done: !!ideal && ideal.skin === current.skin,
      ghost: false,
      status: !read ? null : ideal?.skin === current.skin ? { icon: Check, text: T.isIdeal } : ideal ? { text: `${T.collection}: ${ideal.skin.name}` } : null,
    }
  }
  if (!ideal) return { chroma: current.skin.chromas[0], name: T.open, done: false, ghost: true, status: { text: T.noPick }, open: true }
  const unlocked = ideal.variants.find((variant) => ideal.unlocked.includes(variant.id))
  return {
    chroma: unlocked ?? ideal.variants[0],
    name: ideal.skin.name,
    done: ideal.owned,
    ghost: !ideal.owned,
    swatches: ideal.variants,
    status: ideal.owned ? (unlocked ? { icon: Check, text: T.owned } : { icon: Lock, text: T.locked }) : { text: T.missing },
  }
}

function WeaponCard({ weapon, view, order, read, onOpen }: { weapon: InventoryWeapon; view: View; order: number; read: boolean; onOpen: () => void }) {
  const card = cardOf(weapon, view, read)
  const reduced = useReducedMotion()
  const Icon = card.status?.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-40 w-full flex-col rounded-md border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein focus-visible:ring-offset-2 focus-visible:ring-offset-ground",
        card.done
          ? "border-navy bg-navy bg-[radial-gradient(ellipse_at_50%_45%,rgba(0,47,167,0.95),transparent_70%)] text-paper hover:border-klein-claro"
          : card.ghost
            ? "border-dashed border-zinc-300 bg-paper/40 hover:border-klein"
            : "border-line bg-paper/75 backdrop-blur-sm hover:border-klein",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn("text-[12px] font-medium", card.done ? "text-klein-claro" : "text-muted")}>{weapon.name}</span>
        {view === "ideal" && card.swatches && (
          <span className="flex gap-1">
            {card.swatches.map((variant) =>
              variant.swatch ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={variant.id} src={variant.swatch} alt="" title={variant.name} className={cn("h-3.5 w-3.5 rounded-full ring-1", card.done ? "ring-paper/30" : "ring-line")} />
              ) : null,
            )}
          </span>
        )}
      </span>
      <span className="relative my-1 block flex-1">
        <AnimatePresence initial={false}>
          {card.chroma.image && (
            <motion.img
              key={`${view}:${card.chroma.id}`}
              src={card.chroma.image}
              alt=""
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 14 }}
              animate={{ opacity: card.ghost ? (card.open ? 0.3 : 0.65) : 1, x: 0, transition: { duration: 0.32, delay: reduced ? 0 : order * 0.018, ease: [0.2, 0.7, 0.2, 1] } }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -14, transition: { duration: 0.18 } }}
              className={cn(
                "absolute inset-0 m-auto max-h-full max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.03]",
                card.ghost && "mix-blend-multiply [filter:grayscale(1)_sepia(1)_hue-rotate(185deg)_saturate(1.6)_brightness(1.45)]",
                card.done && "drop-shadow-[0_6px_18px_rgba(133,167,255,0.25)]",
              )}
            />
          )}
        </AnimatePresence>
      </span>
      <span className="flex items-baseline justify-between gap-3">
        <span className={cn("truncate text-[15px] font-medium tracking-[-0.01em]", card.done ? "text-paper" : card.open ? "text-muted" : "text-klein")}>{card.name}</span>
        {card.status && (
          <span className={cn("flex shrink-0 items-center gap-1 text-[12px]", card.done ? "text-klein-claro" : "text-muted")}>
            {Icon && <Icon aria-hidden className="h-3.5 w-3.5" />}
            <span className="max-w-[11rem] truncate">{card.status.text}</span>
          </span>
        )}
      </span>
    </button>
  )
}

/**
 * A weapon's collection skin up close (or what's on it, while it has none): the render of a variant, or Riot's
 * showcase video for it, the variants with the ones Luan picked and the ones he has unlocked, and what's on the
 * weapon now. A native dialog, so focus, Esc and the backdrop behave.
 */
function SkinDialog({ weapon, read, onClose }: { weapon?: InventoryWeapon; read: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState<InventoryWeapon>()
  const [selected, setSelected] = useState<string>()
  const [playing, setPlaying] = useState(false)

  // The dialog keeps its weapon while it closes; a new one starts on its first picked variant, as an image.
  if (weapon && weapon !== shown) {
    setShown(weapon)
    setSelected(undefined)
    setPlaying(false)
  }

  useEffect(() => {
    const element = dialog.current
    if (weapon && !element?.open) element?.showModal()
    if (!weapon && element?.open) element.close()
  }, [weapon])

  const ideal = shown?.ideal
  const skin: Skin | undefined = ideal?.skin ?? shown?.current.skin
  const fallback = ideal ? (ideal.variants.find((variant) => ideal.unlocked.includes(variant.id)) ?? ideal.variants[0]) : shown?.current.chroma
  const chroma: Chroma | undefined = skin?.chromas.find((each) => each.id === selected) ?? fallback

  const status = !ideal ? T.statusOpen : !ideal.owned ? T.statusMissing : ideal.variants.some((v) => ideal.unlocked.includes(v.id)) ? T.statusOwned : T.statusLocked

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-auto w-[min(42rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md border border-line bg-paper p-0 text-ink backdrop:bg-navy/55 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[inventory-dialog_0.22s_ease-out]"
    >
      {shown && skin && chroma && (
        <div>
          <div className="relative h-56 bg-navy sm:h-64">
            {playing && chroma.video ? (
              <video key={chroma.video} src={chroma.video} autoPlay controls playsInline className="h-full w-full bg-navy object-contain" onError={() => setPlaying(false)} />
            ) : (
              chroma.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={chroma.id}
                  src={chroma.image}
                  alt={`${skin.name} · ${chroma.name}`}
                  className={cn(
                    "absolute inset-0 m-auto max-h-[78%] max-w-[86%] object-contain drop-shadow-[0_10px_30px_rgba(133,167,255,0.3)] motion-safe:animate-[inventory-in_0.3s_ease-out]",
                    ideal && !ideal.owned && "opacity-55 grayscale",
                  )}
                />
              )
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={T.close}
              className="absolute right-3 top-3 rounded-md p-1.5 text-paper/80 outline-none transition-colors hover:bg-paper/10 hover:text-paper focus-visible:ring-2 focus-visible:ring-klein-claro"
            >
              <X className="h-5 w-5" />
            </button>
            {chroma.video && (
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
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="space-y-1">
              <p className="text-[13px] text-muted">{shown.name}</p>
              <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-medium tracking-[-0.02em] text-klein">
                {skin.standard ? T.standard : skin.name}
                {skin.tier && (
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[12px] font-medium tracking-normal text-ink">
                    <span className="h-2 w-2 rounded-full" style={{ background: skin.tier.color }} />
                    {skin.tier.name}
                  </span>
                )}
              </h3>
              <p className="text-[14px] text-ink">{status}</p>
            </div>

            {skin.chromas.length > 1 && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-ink">{T.variants}</p>
                <ul className="flex flex-wrap gap-2">
                  {skin.chromas.map((each) => {
                    const pick = ideal?.variants.indexOf(each) ?? -1
                    const locked = !!ideal?.owned && !ideal.unlocked.includes(each.id)
                    const current = each === chroma
                    return (
                      <li key={each.id}>
                        <button
                          type="button"
                          aria-pressed={current}
                          onClick={() => {
                            setSelected(each.id)
                            setPlaying(false)
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-md border py-1.5 pl-1.5 pr-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                            current ? "border-klein bg-klein text-paper" : pick >= 0 ? "border-klein/50 hover:border-klein" : "border-line text-muted hover:border-klein",
                          )}
                        >
                          {each.swatch ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={each.swatch} alt="" className="h-6 w-6 rounded-[3px]" />
                          ) : (
                            <span className="h-6 w-6 rounded-[3px] bg-zinc-200" />
                          )}
                          <span className="leading-tight">
                            <span className="flex items-center gap-1 text-[13px] font-medium">
                              {each.name}
                              {locked && <Lock aria-label={T.locked} className="h-3 w-3" />}
                            </span>
                            {pick >= 0 && <span className={cn("block text-[11px]", current ? "text-paper/80" : "text-muted")}>{pick === 0 ? T.preferred : T.alternative}</span>}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {read && ideal && (
              <div className="flex items-center gap-4 border-t border-line pt-5">
                <span className="relative h-12 w-28 shrink-0">
                  {shown.current.chroma.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shown.current.chroma.image} alt="" className="absolute inset-0 m-auto max-h-full max-w-full object-contain" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] text-muted">{T.now}</span>
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {shown.current.skin.standard ? T.standard : shown.current.skin.name}
                    {shown.current.chroma.name !== "Base" && <span className="font-normal text-muted"> · {shown.current.chroma.name}</span>}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
