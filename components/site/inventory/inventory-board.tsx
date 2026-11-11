"use client"

import { Check, Download, Link2, Lock, LogOut, Play, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { ExportDialog } from "@/components/site/inventory/export-dialog"
import { SkinPicker } from "@/components/site/inventory/skin-picker"
import { longDate } from "@/components/site/ranked/format"
import type { ImageText } from "@/lib/loadout-image"
import { keptToken, signIn, signOut, SignedOut } from "@/lib/profile"
import { dayOf } from "@/lib/ranked"
import { localize } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"
import { CATEGORIES, loadCatalog, type Catalog, type Category, type Chroma, type Skin } from "@/lib/valorant-catalog"
import { boardOf, EMPTY, progress, type ChannelInventory, type InventoryWeapon, type Loadout, type Pick } from "@/lib/valorant-inventory"
import { draft, eraseMyLoadout, isLogin, keepDraft, loadLoadout, loadMyLoadout, loadoutLink, sameLoadout, saveMyLoadout } from "@/lib/valorant-loadout"

const T = localize({
  ideal: { pt: "Coleção", en: "Collection" },
  now: { pt: "No jogo agora", en: "In game now" },
  build: { pt: "Monte o seu", en: "Build yours" },
  views: { pt: "O que mostrar", en: "What to show" },
  of: { pt: "de", en: "of" },
  inCollection: { pt: "skins da coleção", en: "collection skins" },
  weapons: { pt: "armas", en: "weapons" },
  picked: { pt: "armas escolhidas", en: "weapons picked" },
  read: { pt: "Inventário lido do jogo em", en: "Inventory read from the game on" },
  unread: {
    pt: "O que está equipado em cada arma aparece depois da primeira leitura do jogo.",
    en: "What's equipped on each weapon shows up after the game's first reading.",
  },
  owned: { pt: "Na coleção", en: "Collected" },
  locked: { pt: "Variante bloqueada", en: "Variant locked" },
  missing: { pt: "Falta", en: "Missing" },
  open: { pt: "Em aberto", en: "Open" },
  choose: { pt: "Escolher skin", en: "Pick a skin" },
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
  export: { pt: "Exportar imagem", en: "Export image" },
  copyLink: { pt: "Copiar link", en: "Copy link" },
  copied: { pt: "Link copiado", en: "Link copied" },
  clear: { pt: "Limpar", en: "Clear" },
  confirmClear: { pt: "Limpar tudo? Clique de novo", en: "Clear it all? Click again" },
  signIn: { pt: "Entrar com a Twitch", en: "Sign in with Twitch" },
  signOut: { pt: "Sair", en: "Sign out" },
  starting: { pt: "Carregando o seu loadout…", en: "Loading your loadout…" },
  local: {
    pt: "Fica salvo neste navegador. Entre com a Twitch pra guardar no seu perfil e ter um link pra mostrar.",
    en: "It stays in this browser. Sign in with Twitch to keep it in your profile and get a link to show.",
  },
  saving: { pt: "Salvando no seu perfil…", en: "Saving to your profile…" },
  savedIn: { pt: "Salvo no perfil de", en: "Saved in the profile of" },
  saveError: {
    pt: "Não deu pra salvar agora. Fica neste navegador e eu tento de novo na próxima mudança.",
    en: "Couldn't save just now. It stays in this browser, and I'll try again on the next change.",
  },
  expired: { pt: "A Twitch pediu pra você entrar de novo.", en: "Twitch asked you to sign in again." },
  channelNote: {
    pt: "Você está montando a coleção do canal: o que salvar aqui aparece em Coleção pra todo mundo.",
    en: "You're building the channel's collection: what you save here shows in Collection for everyone.",
  },
  theirsTitle: { pt: "Loadout dos sonhos de", en: "Dream loadout of" },
  theirsLoading: { pt: "Carregando…", en: "Loading…" },
  theirsNone: { pt: "ainda não montou um loadout dos sonhos.", en: "hasn't built a dream loadout yet." },
  buildMine: { pt: "Montar o meu", en: "Build mine" },
  imageTitle: { pt: "Loadout dos sonhos", en: "Dream loadout" },
  imageCollection: { pt: "Coleção dos sonhos", en: "Dream collection" },
  imageMine: { pt: "Meu loadout", en: "My loadout" },
  imageCredit: { pt: "Skins: Riot Games · valorant-api.com", en: "Skins: Riot Games · valorant-api.com" },
})

type View = "ideal" | "now" | "build" | "theirs"
type Save = "local" | "saving" | "saved" | "error" | "expired"

const ORDER = Object.keys(CATEGORIES) as Category[]

/**
 * The inventory: the channel's collection as a board grouped like the game's own (each weapon a card, pale with its
 * skin as a ghost while missing, dark and in colour once it's in: black and blue skins, so the board darkens as it
 * fills), what's on each weapon now, and anyone's dream loadout: built here from every skin in the game, saved in this
 * browser or, signed in with Twitch, in their profile, opened by others with ?de=<login>, and exported as one picture.
 * The channel signed in builds the collection itself. It starts with what the page was built with and swaps in the
 * profile API's answer as it comes.
 */
export function InventoryBoard({ start, seed }: { start: Catalog; seed: ChannelInventory }) {
  const [catalog, setCatalog] = useState(start)
  const [loaded, setLoaded] = useState<"start" | "full" | "failed">("start")
  const [channel, setChannel] = useState(seed)
  const [view, setView] = useState<View>("ideal")
  const [open, setOpen] = useState<{ weapon: InventoryWeapon; mode: "channel" | "loadout" }>()
  const [picking, setPicking] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const [mine, setMine] = useState<Loadout>(EMPTY)
  const [account, setAccount] = useState<{ token: string; login: string } | null>(null)
  const [save, setSave] = useState<Save>("local")
  const [started, setStarted] = useState(false)
  const [theirs, setTheirs] = useState<{ login: string; loadout?: Loadout | null }>()
  const [confirmClear, setConfirmClear] = useState(false)
  const [copied, setCopied] = useState(false)
  // What the profile holds, to save only what changed.
  const saved = useRef<Loadout | null>(null)

  useEffect(() => {
    loadCatalog()
      .then((full) => (setCatalog(full), setLoaded("full")))
      .catch(() => setLoaded("failed"))
    loadLoadout(CHANNEL)
      .then((answer) => setChannel((before) => ({ colecao: answer.loadout ?? before.colecao, jogo: answer.jogo ?? before.jogo })))
      .catch(() => {})

    /* eslint-disable react-hooks/set-state-in-effect -- the address and this browser's storage only exist here */
    if (location.hash === "#montar") setView("build")
    const de = new URLSearchParams(location.search).get("de")?.toLowerCase() ?? null
    if (isLogin(de) && de !== CHANNEL) {
      setTheirs({ login: de })
      setView("theirs")
      loadLoadout(de)
        .then((answer) => setTheirs({ login: de, loadout: answer.loadout }))
        .catch(() => setTheirs({ login: de, loadout: null }))
    }
    const token = keptToken()
    const kept = draft()
    if (!token) {
      setMine(kept ?? EMPTY)
      setStarted(true)
      return
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    loadMyLoadout(token)
      .then(({ login, loadout }) => {
        saved.current = loadout
        setAccount({ token, login })
        // The channel starts from the collection the site had; anyone else from what they built before signing in.
        setMine(loadout ?? (login === CHANNEL ? seed.colecao : kept) ?? EMPTY)
        setSave("saved")
      })
      .catch((error) => {
        setMine(kept ?? EMPTY)
        setSave(error instanceof SignedOut ? "expired" : "error")
      })
      .finally(() => setStarted(true))
  }, [seed])

  // Every change is kept: in this browser, or a moment later in the profile.
  useEffect(() => {
    if (!started) return
    if (!account) return keepDraft(mine)
    if (sameLoadout(mine, saved.current)) return
    const timer = setTimeout(() => {
      setSave("saving")
      // Emptied, it's deleted from the profile, as the privacy policy says "Limpar" does.
      const request = Object.keys(mine.armas).length ? saveMyLoadout(account.token, mine) : eraseMyLoadout(account.token)
      request
        .then((answer) => {
          saved.current = answer.loadout
          keepDraft(null)
          setSave("saved")
          if (account.login === CHANNEL) setChannel((before) => ({ ...before, colecao: answer.loadout ?? EMPTY }))
        })
        .catch((error) => {
          if (error instanceof SignedOut) setAccount(null)
          setSave(error instanceof SignedOut ? "expired" : "error")
        })
    }, 1200)
    return () => clearTimeout(timer)
  }, [mine, account, started])

  const collection = boardOf(catalog, channel.colecao, channel.jogo, { owned: false })
  const own = boardOf(catalog, mine, null)
  const other = boardOf(catalog, theirs?.loadout ?? EMPTY, null)
  const board = view === "build" ? own : view === "theirs" ? other : collection
  const counts = progress(board)
  const groups = ORDER.map((category) => ({ category, weapons: board.filter((weapon) => weapon.category === category) }))
  const read = channel.jogo?.lido ? longDate(dayOf(channel.jogo.lido)) : null
  const views: View[] = [...(theirs ? (["theirs"] as const) : []), "ideal", "now", "build"]

  function setPick(weapon: string, pick: Pick | null) {
    setConfirmClear(false)
    setMine((before) => {
      const armas = { ...before.armas }
      if (pick) armas[weapon] = pick
      else delete armas[weapon]
      return { armas }
    })
  }

  function applyTheme(theme: string, variant: string) {
    const ofTheme = new Map<string, string>()
    for (const [id, skin] of Object.entries(catalog.skins)) if (skin.t === theme && !ofTheme.has(skin.a)) ofTheme.set(skin.a, id)
    setMine((before) => {
      const armas = { ...before.armas }
      for (const [weapon, id] of ofTheme) {
        const raw = catalog.skins[id]
        armas[weapon] = { skin: id, chromas: [(raw.c.find((chroma) => chroma.n === variant) ?? raw.c[0]).i] }
      }
      return { armas }
    })
  }

  function leave() {
    signOut()
    saved.current = null
    setAccount(null)
    setMine(draft() ?? EMPTY)
    setSave("local")
  }

  function copyLink() {
    if (!account) return
    navigator.clipboard?.writeText(loadoutLink(account.login)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const who = view === "theirs" ? (theirs?.login ?? "") : view === "build" ? (account?.login ?? T.imageMine) : CHANNEL
  const image: ImageText = {
    title: view === "ideal" ? T.imageCollection : T.imageTitle,
    who,
    count: `${counts.picked} ${T.of} ${counts.total} ${T.weapons}`,
    open: T.open,
    link: loadoutLink(view === "build" && account ? account.login : view === "theirs" && theirs ? theirs.login : CHANNEL).replace(/^https?:\/\//, "").replace(/\?.*$/, ""),
    credit: T.imageCredit,
  }

  const button =
    "flex items-center gap-1.5 rounded-md border border-line bg-paper/75 px-3 py-1.5 text-[14px] font-medium text-ink outline-none backdrop-blur-sm transition-colors hover:border-klein focus-visible:ring-2 focus-visible:ring-klein"
  const exportButton = (
    <button type="button" onClick={() => setExporting(true)} className={button}>
      <Download aria-hidden className="h-4 w-4" />
      {T.export}
    </button>
  )

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label={T.views} className="relative flex max-w-full self-start overflow-x-auto rounded-md border border-line bg-paper/70 p-1 backdrop-blur-sm">
          {views.map((each) => (
            <button
              key={each}
              type="button"
              role="radio"
              aria-checked={view === each}
              onClick={() => setView(each)}
              className={cn(
                "relative shrink-0 whitespace-nowrap rounded-[4px] px-3.5 py-1.5 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                view === each ? "text-paper" : "text-muted hover:text-ink",
              )}
            >
              {view === each && (
                <motion.span layoutId="inventory-view" transition={{ type: "spring", stiffness: 380, damping: 32 }} className="absolute inset-0 rounded-[4px] bg-klein" />
              )}
              <span className="relative">{each === "theirs" ? theirs?.login : T[each]}</span>
            </button>
          ))}
        </div>

        {(view === "ideal" || view === "now") && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="flex items-baseline gap-2 text-ink">
                <span className="whitespace-nowrap text-3xl font-medium tabular-nums tracking-[-0.02em] text-klein">
                  {counts.owned} {T.of} {counts.picked}
                </span>
                <span className="text-[15px] text-muted">{T.inCollection}</span>
              </p>
              <Bar weapons={board.filter((weapon) => weapon.ideal)} done={(weapon) => !!weapon.ideal?.owned} />
              <p className="text-[13px] text-muted">{read ? `${T.read} ${read}.` : T.unread}</p>
            </div>
            {view === "ideal" && <div className="flex gap-2">{exportButton}</div>}
          </div>
        )}

        {view === "build" && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="flex items-baseline gap-2 text-ink">
                <span className="whitespace-nowrap text-3xl font-medium tabular-nums tracking-[-0.02em] text-klein">
                  {counts.picked} {T.of} {counts.total}
                </span>
                <span className="text-[15px] text-muted">{T.picked}</span>
              </p>
              <Bar weapons={board} done={(weapon) => !!weapon.ideal} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
                {!started ? (
                  <span>{T.starting}</span>
                ) : account ? (
                  <>
                    <span>
                      {save === "saving" ? T.saving : save === "error" ? T.saveError : (
                        <>
                          {T.savedIn} <strong className="font-medium text-klein">{account.login}</strong>.
                        </>
                      )}
                    </span>
                    <button type="button" onClick={leave} className="flex items-center gap-1 underline underline-offset-2 hover:text-klein">
                      <LogOut aria-hidden className="h-3.5 w-3.5" />
                      {T.signOut}
                    </button>
                  </>
                ) : (
                  <span className="max-w-[34rem]">{save === "expired" ? T.expired : T.local}</span>
                )}
              </div>
              {account?.login === CHANNEL && <p className="text-[13px] font-medium text-klein">{T.channelNote}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {started && !account && (
                <button
                  type="button"
                  onClick={() => signIn(null, `${location.pathname}#montar`)}
                  className="rounded-md bg-[#9146ff] px-3 py-1.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  {T.signIn}
                </button>
              )}
              {account && save === "saved" && (
                <button type="button" onClick={copyLink} className={button}>
                  {copied ? <Check aria-hidden className="h-4 w-4" /> : <Link2 aria-hidden className="h-4 w-4" />}
                  {copied ? T.copied : T.copyLink}
                </button>
              )}
              {counts.picked > 0 && exportButton}
              {counts.picked > 0 && (
                <button
                  type="button"
                  onClick={() => (confirmClear ? (setMine(EMPTY), setConfirmClear(false)) : setConfirmClear(true))}
                  className={cn(button, confirmClear && "border-loss text-loss")}
                >
                  {confirmClear ? T.confirmClear : T.clear}
                </button>
              )}
            </div>
          </div>
        )}

        {view === "theirs" && theirs && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="text-[15px] text-muted">{T.theirsTitle}</p>
              <p className="flex items-baseline gap-3">
                <span className="truncate text-3xl font-medium tracking-[-0.02em] text-klein">{theirs.login}</span>
                {theirs.loadout && (
                  <span className="whitespace-nowrap text-[15px] tabular-nums text-muted">
                    {counts.picked} {T.of} {counts.total} {T.weapons}
                  </span>
                )}
              </p>
              {theirs.loadout === undefined && <p className="text-[13px] text-muted">{T.theirsLoading}</p>}
              {theirs.loadout === null && (
                <p className="text-[13px] text-muted">
                  {theirs.login} {T.theirsNone}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {theirs.loadout && exportButton}
              <button type="button" onClick={() => setView("build")} className="rounded-md bg-klein px-3 py-1.5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90">
                {T.buildMine}
              </button>
            </div>
          </div>
        )}
      </div>

      {groups.map(({ category, weapons: inGroup }) => (
        <div key={category}>
          <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{localize(CATEGORIES[category])}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {inGroup.map((weapon) => (
              <li key={weapon.id}>
                <WeaponCard
                  weapon={weapon}
                  view={view}
                  order={board.indexOf(weapon)}
                  read={!!channel.jogo}
                  disabled={view === "build" && !started}
                  onOpen={() => (view === "build" ? setPicking(weapon.id) : setOpen({ weapon, mode: view === "theirs" ? "loadout" : "channel" }))}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <SkinDialog weapon={open?.weapon} mode={open?.mode ?? "channel"} read={!!channel.jogo} onClose={() => setOpen(undefined)} />
      <SkinPicker
        catalog={catalog}
        loaded={loaded}
        weapon={catalog.armas.find((weapon) => weapon.id === picking)}
        pick={picking ? mine.armas[picking] : undefined}
        onPick={(pick) => picking && setPick(picking, pick)}
        onTheme={applyTheme}
        onClose={() => setPicking(undefined)}
      />
      <ExportDialog board={board} text={image} file={`loadout-dos-sonhos-${who.replace(/\s+/g, "-").toLowerCase()}`} open={exporting} onClose={() => setExporting(false)} />
    </section>
  )
}

function Bar({ weapons, done }: { weapons: InventoryWeapon[]; done: (weapon: InventoryWeapon) => boolean }) {
  return (
    <div className="flex h-1.5 max-w-sm gap-[3px]" aria-hidden>
      {weapons.map((weapon) => (
        <span key={weapon.id} title={weapon.name} className={cn("flex-1 rounded-full transition-colors", done(weapon) ? "bg-navy" : "bg-zinc-200")} />
      ))}
    </div>
  )
}

/** What a card shows in a view: the skin, its variant, whether it's done, and the line under the name. */
function cardOf(weapon: InventoryWeapon, view: View, read: boolean) {
  const { ideal, current } = weapon
  if (view === "now") {
    return {
      chroma: current.chroma,
      name: current.skin.standard ? T.standard : current.skin.name,
      done: !!ideal && ideal.skin.id === current.skin.id,
      ghost: false,
      status: !read ? null : ideal?.skin.id === current.skin.id ? { icon: Check, text: T.isIdeal } : ideal ? { text: `${T.collection}: ${ideal.skin.name}` } : null,
    }
  }
  if (!ideal) {
    return { chroma: current.skin.chromas[0], name: view === "build" ? T.choose : T.open, done: false, ghost: true, status: view === "ideal" ? { text: T.noPick } : null, open: true }
  }
  if (view === "build" || view === "theirs") {
    const variant = ideal.variants[0]
    return {
      chroma: variant,
      name: ideal.skin.name,
      done: true,
      ghost: false,
      swatches: ideal.skin.chromas.length > 1 ? ideal.variants : undefined,
      status: ideal.skin.chromas.length > 1 && variant !== ideal.skin.chromas[0] ? { text: variant.name } : null,
    }
  }
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

function WeaponCard({
  weapon,
  view,
  order,
  read,
  disabled,
  onOpen,
}: {
  weapon: InventoryWeapon
  view: View
  order: number
  read: boolean
  disabled: boolean
  onOpen: () => void
}) {
  const card = cardOf(weapon, view, read)
  const reduced = useReducedMotion()
  const Icon = card.status?.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={cn(
        "group flex h-40 w-full flex-col rounded-md border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein focus-visible:ring-offset-2 focus-visible:ring-offset-ground disabled:cursor-wait disabled:opacity-60",
        card.done
          ? "border-navy bg-navy bg-[radial-gradient(ellipse_at_50%_45%,rgba(0,47,167,0.95),transparent_70%)] text-paper hover:border-klein-claro"
          : card.ghost
            ? "border-dashed border-zinc-300 bg-paper/40 hover:border-klein"
            : "border-line bg-paper/75 backdrop-blur-sm hover:border-klein",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn("text-[12px] font-medium", card.done ? "text-klein-claro" : "text-muted")}>{weapon.name}</span>
        {view !== "now" && card.swatches && (
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
          <motion.img
            key={`${view}:${card.chroma.id}`}
            src={card.chroma.image}
            alt=""
            loading="lazy"
            decoding="async"
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 14 }}
            animate={{ opacity: card.ghost ? (card.open ? 0.3 : 0.65) : 1, x: 0, transition: { duration: 0.32, delay: reduced ? 0 : order * 0.018, ease: [0.2, 0.7, 0.2, 1] } }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -14, transition: { duration: 0.18 } }}
            className={cn(
              "absolute inset-0 m-auto max-h-full max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.03]",
              card.ghost && "mix-blend-multiply [filter:grayscale(1)_sepia(1)_hue-rotate(185deg)_saturate(1.6)_brightness(1.45)]",
              card.done && "drop-shadow-[0_6px_18px_rgba(133,167,255,0.25)]",
            )}
          />
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
 * A weapon's skin up close: the render of a variant, or Riot's showcase video for it, the variants with the ones
 * picked (and, for the channel's collection, the ones unlocked), and what's on the weapon now in the channel's game.
 * A native dialog, so focus, Esc and the backdrop behave.
 */
function SkinDialog({ weapon, mode, read, onClose }: { weapon?: InventoryWeapon; mode: "channel" | "loadout"; read: boolean; onClose: () => void }) {
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
  const channel = mode === "channel"

  const status = !channel
    ? null
    : !ideal
      ? T.statusOpen
      : !ideal.owned
        ? T.statusMissing
        : ideal.variants.some((v) => ideal.unlocked.includes(v.id))
          ? T.statusOwned
          : T.statusLocked

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
              {skin.theme && <p className="text-[13px] text-muted">{`${T.collection} ${skin.theme.name}`}</p>}
              {status && <p className="text-[14px] text-ink">{status}</p>}
            </div>

            {skin.chromas.length > 1 && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-ink">{T.variants}</p>
                <ul className="flex flex-wrap gap-2">
                  {skin.chromas.map((each) => {
                    const pick = ideal?.variants.findIndex((variant) => variant.id === each.id) ?? -1
                    const locked = channel && !!ideal?.owned && !ideal.unlocked.includes(each.id)
                    const current = each.id === chroma.id
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

            {channel && read && ideal && (
              <div className="flex items-center gap-4 border-t border-line pt-5">
                <span className="relative h-12 w-28 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shown.current.chroma.image} alt="" className="absolute inset-0 m-auto max-h-full max-w-full object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] text-muted">{T.now}</span>
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {shown.current.skin.standard ? T.standard : shown.current.skin.name}
                    {shown.current.chroma.id !== shown.current.skin.chromas[0].id && <span className="font-normal text-muted"> · {shown.current.chroma.name}</span>}
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
