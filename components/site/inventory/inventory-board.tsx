"use client"

import { Check, Download, Link2, Lock, LogOut } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { ExportDialog } from "@/components/site/inventory/export-dialog"
import { Rarity, ShowcaseButton, SkinPicker } from "@/components/site/inventory/skin-picker"
import { longDay, time } from "@/components/site/ranked/format"
import { Button, Choice, Dialog, EmptyState, ErrorLine, SignInButton, Skeleton, TabPanel, Tabs } from "@/components/site/ui"
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
  build: { pt: "Monta o seu", en: "Build yours" },
  views: { pt: "O que mostrar", en: "What to show" },
  of: { pt: "de", en: "of" },
  inCollection: { pt: "skins da coleção", en: "collection skins" },
  weapons: { pt: "armas", en: "weapons" },
  picked: { pt: "armas escolhidas", en: "weapons picked" },
  read: { pt: "Lido do jogo em {date}, às {time}.", en: "Read from the game on {date}, at {time}." },
  unread: {
    pt: "O que está em cada arma aparece depois da primeira leitura do jogo.",
    en: "What's on each weapon shows up after the game's first reading.",
  },
  channelFailed: { pt: "Não deu pra buscar o inventário de agora.", en: "Couldn't fetch the inventory as it is now." },
  retry: { pt: "Tentar de novo", en: "Try again" },
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
  close: { pt: "Fechar", en: "Close" },
  variants: { pt: "Variantes", en: "Variants" },
  statusOwned: { pt: "Já tenho esta skin.", en: "I have this skin." },
  statusLocked: {
    pt: "Já tenho esta skin, mas a variante escolhida ainda está bloqueada.",
    en: "I have this skin, but the chosen variant is still locked.",
  },
  statusMissing: { pt: "Ainda não tenho esta skin.", en: "I don't have this skin yet." },
  statusOpen: { pt: "Ainda não escolhi a skin desta arma pra coleção.", en: "I haven't picked this weapon's collection skin yet." },
  export: { pt: "Exportar imagem", en: "Export image" },
  copyLink: { pt: "Copiar link", en: "Copy link" },
  copied: { pt: "Link copiado", en: "Link copied" },
  clear: { pt: "Limpar", en: "Clear" },
  confirmClear: { pt: "Limpar tudo? Clica de novo", en: "Clear it all? Click again" },
  signIn: { pt: "Entrar com a Twitch", en: "Sign in with Twitch" },
  signOut: { pt: "Sair", en: "Sign out" },
  starting: { pt: "Carregando o seu loadout…", en: "Loading your loadout…" },
  local: {
    pt: "Pra guardar no seu perfil e ter um link pra mostrar. Sem entrar, fica salvo só neste navegador.",
    en: "To keep it in your profile and get a link to show. Without signing in, it stays in this browser only.",
  },
  saving: { pt: "Salvando no seu perfil…", en: "Saving to your profile…" },
  savedIn: { pt: "Salvo no perfil de", en: "Saved in the profile of" },
  saveError: {
    pt: "Não deu pra salvar no seu perfil. Fica salvo neste navegador e vai pro perfil na próxima mudança.",
    en: "Couldn't save to your profile. It stays in this browser and goes to your profile on the next change.",
  },
  expired: { pt: "A Twitch pediu pra você entrar de novo.", en: "Twitch asked you to sign in again." },
  channelNote: {
    pt: "Você está montando a coleção do canal: o que salvar aqui aparece em Coleção pra todo mundo.",
    en: "You're building the channel's collection: what you save here shows in Collection for everyone.",
  },
  theirsTitle: { pt: "Loadout dos sonhos de", en: "Dream loadout of" },
  theirsLoading: { pt: "Carregando o loadout de {login}…", en: "Loading {login}'s loadout…" },
  theirsNone: { pt: "Nenhum loadout dos sonhos montado ainda.", en: "No dream loadout built yet." },
  theirsFailed: { pt: "Não deu pra buscar o loadout de {login}.", en: "Couldn't fetch {login}'s loadout." },
  buildMine: { pt: "Montar o meu", en: "Build mine" },
  imageTitle: { pt: "Loadout dos sonhos", en: "Dream loadout" },
  imageCollection: { pt: "Coleção dos sonhos", en: "Dream collection" },
  imageMine: { pt: "Meu loadout", en: "My loadout" },
  imageCredit: { pt: "Skins: Riot Games · valorant-api.com", en: "Skins: Riot Games · valorant-api.com" },
})

type View = "ideal" | "now" | "build" | "theirs"
type Save = "local" | "saving" | "saved" | "error" | "expired"

const ORDER = Object.keys(CATEGORIES) as Category[]
/** The site's one curve (brand/interface.md, "Motion"). */
const EASE = [0.65, 0, 0.35, 1] as const

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
  const [channelFailed, setChannelFailed] = useState(false)
  const [view, setView] = useState<View>("ideal")
  const [open, setOpen] = useState<{ weapon: InventoryWeapon; mode: "channel" | "loadout" }>()
  const [picking, setPicking] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const [mine, setMine] = useState<Loadout>(EMPTY)
  const [account, setAccount] = useState<{ token: string; login: string } | null>(null)
  const [save, setSave] = useState<Save>("local")
  const [started, setStarted] = useState(false)
  const [theirs, setTheirs] = useState<{ login: string; loadout?: Loadout | null; failed?: boolean }>()
  const [confirmClear, setConfirmClear] = useState(false)
  const [copied, setCopied] = useState(false)
  // What the profile holds, to save only what changed.
  const saved = useRef<Loadout | null>(null)

  function loadFull() {
    setLoaded("start")
    loadCatalog()
      .then((full) => (setCatalog(full), setLoaded("full")))
      .catch(() => setLoaded("failed"))
  }

  function loadChannel() {
    setChannelFailed(false)
    loadLoadout(CHANNEL)
      .then((answer) => setChannel((before) => ({ colecao: answer.loadout ?? before.colecao, jogo: answer.jogo ?? before.jogo })))
      .catch(() => setChannelFailed(true))
  }

  function loadTheirs(login: string) {
    setTheirs({ login })
    loadLoadout(login)
      .then((answer) => setTheirs({ login, loadout: answer.loadout }))
      .catch(() => setTheirs({ login, failed: true }))
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- the address and this browser's storage only exist here */
    loadFull()
    loadChannel()
    if (location.hash === "#montar") setView("build")
    const de = new URLSearchParams(location.search).get("de")?.toLowerCase() ?? null
    if (isLogin(de) && de !== CHANNEL) {
      setView("theirs")
      loadTheirs(de)
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
  const read = channel.jogo?.lido ? T.read.replace("{date}", longDay(dayOf(channel.jogo.lido)).replace(/^[^,]*, /, "")).replace("{time}", time(channel.jogo.lido)) : null
  const views: View[] = [...(theirs ? (["theirs"] as const) : []), "ideal", "now", "build"]
  const theirsReady = view !== "theirs" || !!theirs?.loadout

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

  const exportButton = (
    <Button variant="secondary" size="sm" onClick={() => setExporting(true)} icon={<Download aria-hidden className="h-4 w-4" />}>
      {T.export}
    </Button>
  )
  const count = (value: string, label: string) => (
    <p className="flex flex-wrap items-baseline gap-x-2 text-ink">
      <span className="whitespace-nowrap text-4xl font-medium tabular-nums tracking-[-0.02em] text-klein">{value}</span>
      <span className="text-[15px] text-muted">{label}</span>
    </p>
  )

  return (
    <section>
      <Tabs
        label={T.views}
        idPrefix="inventario"
        items={views.map((each) => ({ id: each, label: each === "theirs" ? theirs?.login : T[each] }))}
        value={view}
        onChange={setView}
      />

      <TabPanel idPrefix="inventario" id={view} className="mt-8 space-y-10">
        {(view === "ideal" || view === "now") && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              {count(`${counts.owned} ${T.of} ${counts.picked}`, T.inCollection)}
              <Bar weapons={board.filter((weapon) => weapon.ideal)} done={(weapon) => !!weapon.ideal?.owned} />
              <p className="text-[13px] text-muted">{read ?? T.unread}</p>
              {channelFailed && (
                <ErrorLine onRetry={loadChannel} retryLabel={T.retry} className="text-[13px]">
                  {T.channelFailed}
                </ErrorLine>
              )}
            </div>
            {view === "ideal" && <div className="flex gap-2">{exportButton}</div>}
          </div>
        )}

        {view === "build" && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              {count(`${counts.picked} ${T.of} ${counts.total}`, T.picked)}
              <Bar weapons={board} done={(weapon) => !!weapon.ideal} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
                {!started ? (
                  <span role="status">{T.starting}</span>
                ) : account ? (
                  <>
                    <span role="status">
                      {save === "saving" ? (
                        T.saving
                      ) : save === "error" ? (
                        <span className="text-loss">{T.saveError}</span>
                      ) : (
                        <>
                          {T.savedIn} <strong className="font-medium text-klein">{account.login}</strong>.
                        </>
                      )}
                    </span>
                    <Button variant="quiet" size="sm" onClick={leave} icon={<LogOut aria-hidden className="h-3.5 w-3.5" />} className="text-[13px]">
                      {T.signOut}
                    </Button>
                  </>
                ) : (
                  <span className="max-w-[34rem]">{save === "expired" ? T.expired : T.local}</span>
                )}
              </div>
              {account?.login === CHANNEL && <p className="text-[13px] font-medium text-klein">{T.channelNote}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {started && !account && (
                <SignInButton platform="twitch" size="sm" onClick={() => signIn(null, `${location.pathname}#montar`)}>
                  {T.signIn}
                </SignInButton>
              )}
              {account && save === "saved" && (
                <Button variant="secondary" size="sm" onClick={copyLink} icon={copied ? <Check aria-hidden className="h-4 w-4" /> : <Link2 aria-hidden className="h-4 w-4" />}>
                  {copied ? T.copied : T.copyLink}
                </Button>
              )}
              {counts.picked > 0 && exportButton}
              {counts.picked > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (confirmClear ? (setMine(EMPTY), setConfirmClear(false)) : setConfirmClear(true))}
                  className={cn(confirmClear && "border-loss text-loss hover:border-loss hover:text-loss")}
                >
                  {confirmClear ? T.confirmClear : T.clear}
                </Button>
              )}
            </div>
          </div>
        )}

        {view === "theirs" && theirs && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[15px] text-muted">{T.theirsTitle}</p>
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="truncate text-4xl font-medium tracking-[-0.02em] text-klein">{theirs.login}</span>
                  {theirs.loadout && (
                    <span className="whitespace-nowrap text-[15px] tabular-nums text-muted">
                      {counts.picked} {T.of} {counts.total} {T.weapons}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {theirs.loadout && exportButton}
                <Button size="sm" onClick={() => setView("build")}>
                  {T.buildMine}
                </Button>
              </div>
            </div>
            {theirs.loadout === undefined && !theirs.failed && (
              <p role="status" className="sr-only">
                {T.theirsLoading.replace("{login}", theirs.login)}
              </p>
            )}
            {theirs.failed && (
              <ErrorLine onRetry={() => loadTheirs(theirs.login)} retryLabel={T.retry}>
                {T.theirsFailed.replace("{login}", theirs.login)}
              </ErrorLine>
            )}
            {theirs.loadout === null && <EmptyState>{T.theirsNone}</EmptyState>}
          </div>
        )}

        {theirsReady
          ? groups.map(({ category, weapons: inGroup }) => (
              <div key={category}>
                <p id={`grupo-${category}`} className="eyebrow text-muted">
                  {localize(CATEGORIES[category])}
                </p>
                <ul aria-labelledby={`grupo-${category}`} className="mt-3 grid gap-3 sm:grid-cols-2">
                  {inGroup.map((weapon) => (
                    // A weapon alone at the end of its group takes the row, so no card is left by itself.
                    <li key={weapon.id} className="sm:odd:last:col-span-2">
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
            ))
          : theirs?.loadout === undefined && !theirs?.failed && <BoardSkeleton groups={groups.map((group) => group.weapons.length)} />}
      </TabPanel>

      <SkinDialog weapon={open?.weapon} mode={open?.mode ?? "channel"} read={!!channel.jogo} onClose={() => setOpen(undefined)} />
      <SkinPicker
        catalog={catalog}
        loaded={loaded}
        weapon={catalog.armas.find((weapon) => weapon.id === picking)}
        pick={picking ? mine.armas[picking] : undefined}
        onPick={(pick) => picking && setPick(picking, pick)}
        onTheme={applyTheme}
        onRetry={loadFull}
        onClose={() => setPicking(undefined)}
      />
      <ExportDialog board={board} text={image} file={`loadout-dos-sonhos-${who.replace(/\s+/g, "-").toLowerCase()}`} open={exporting} onClose={() => setExporting(false)} />
    </section>
  )
}

/** The board while someone's loadout comes: its groups, a pale card per weapon. */
function BoardSkeleton({ groups }: { groups: number[] }) {
  return (
    <div className="space-y-10" aria-hidden>
      {groups.map((size, index) => (
        <div key={index}>
          <Skeleton className="h-3 w-24" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: size }, (_, card) => (
              <Skeleton key={card} className={cn("cut h-40", size % 2 === 1 && card === size - 1 && "sm:col-span-2")} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Bar({ weapons, done }: { weapons: InventoryWeapon[]; done: (weapon: InventoryWeapon) => boolean }) {
  return (
    <div className="flex h-1.5 max-w-sm gap-[3px]" aria-hidden>
      {weapons.map((weapon) => (
        <span key={weapon.id} title={weapon.name} className={cn("flex-1 transition-colors", done(weapon) ? "bg-navy" : "bg-zinc-200")} />
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
        "cut cut-edge group relative flex h-40 w-full flex-col border p-4 text-left transition-colors disabled:cursor-wait disabled:opacity-60",
        card.done
          ? "border-navy bg-navy bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_oklab,var(--color-klein)_95%,transparent),transparent_70%)] text-paper hover:border-klein-claro focus-visible:outline-paper"
          : card.ghost
            ? "border-dashed border-line-strong bg-paper/40 before:border-dashed after:border-dashed hover:border-klein"
            : "border-line bg-paper/70 hover:border-klein",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn("text-[13px] font-medium", card.done ? "text-klein-claro" : "text-muted")}>{weapon.name}</span>
        {view !== "now" && card.swatches && (
          <span className="flex gap-1">
            {card.swatches.map((variant) =>
              variant.swatch ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={variant.id} src={variant.swatch} alt="" title={variant.name} className={cn("h-3.5 w-3.5 ring-1", card.done ? "ring-paper/30" : "ring-line")} />
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
            animate={{ opacity: card.ghost ? (card.open ? 0.3 : 0.65) : 1, x: 0, transition: { duration: 0.32, delay: reduced ? 0 : order * 0.018, ease: EASE } }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -14, transition: { duration: 0.18, ease: EASE } }}
            className={cn(
              "absolute inset-0 m-auto max-h-full max-w-[88%] object-contain transition-transform duration-300 group-hover:scale-[1.03]",
              card.ghost && "mix-blend-multiply [filter:grayscale(1)_sepia(1)_hue-rotate(185deg)_saturate(1.6)_brightness(1.45)]",
              card.done && "drop-shadow-[0_6px_18px_color-mix(in_oklab,var(--color-klein-claro)_25%,transparent)]",
            )}
          />
        </AnimatePresence>
      </span>
      <span className="flex items-baseline justify-between gap-3">
        <span className={cn("truncate text-[15px] font-medium tracking-[-0.01em]", card.done ? "text-paper" : card.open ? "text-muted" : "text-klein")}>{card.name}</span>
        {card.status && (
          <span className={cn("flex shrink-0 items-center gap-1 text-[13px]", card.done ? "text-klein-claro" : "text-muted")}>
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
 */
function SkinDialog({ weapon, mode, read, onClose }: { weapon?: InventoryWeapon; mode: "channel" | "loadout"; read: boolean; onClose: () => void }) {
  const [shown, setShown] = useState<InventoryWeapon>()
  const [selected, setSelected] = useState<string>()
  const [playing, setPlaying] = useState(false)

  // A new weapon starts on its first picked variant, as an image.
  if (weapon && weapon !== shown) {
    setShown(weapon)
    setSelected(undefined)
    setPlaying(false)
  }

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
    <Dialog open={!!weapon} onClose={onClose} title={skin ? (skin.standard ? T.standard : skin.name) : ""} closeLabel={T.close} width={42} flush>
      {shown && skin && chroma && (
        <div className="min-h-0 overflow-y-auto">
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
                  "absolute inset-0 m-auto max-h-[78%] max-w-[86%] object-contain drop-shadow-[0_10px_30px_color-mix(in_oklab,var(--color-klein-claro)_30%,transparent)] motion-safe:animate-[inventory-in_0.3s_cubic-bezier(0.65,0,0.35,1)]",
                  ideal && !ideal.owned && "opacity-55 grayscale",
                )}
              />
            )}
            {chroma.video && <ShowcaseButton playing={playing} onClick={() => setPlaying(!playing)} />}
          </div>

          <div className="space-y-6 p-5">
            <div className="space-y-1.5">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-muted">
                {shown.name}
                {skin.tier && <Rarity name={skin.tier.name} color={skin.tier.color} />}
              </p>
              {skin.theme && <p className="text-[13px] text-muted">{`${T.collection} ${skin.theme.name}`}</p>}
              {status && <p className="text-[15px] text-ink">{status}</p>}
            </div>

            {skin.chromas.length > 1 && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-muted">{T.variants}</p>
                <ul className="flex flex-wrap gap-2">
                  {skin.chromas.map((each) => {
                    const pick = ideal?.variants.findIndex((variant) => variant.id === each.id) ?? -1
                    const locked = channel && !!ideal?.owned && !ideal.unlocked.includes(each.id)
                    return (
                      <li key={each.id}>
                        <Choice
                          size="sm"
                          on={each.id === chroma.id}
                          onClick={() => {
                            setSelected(each.id)
                            setPlaying(false)
                          }}
                          className={cn("justify-start py-1.5 pl-1.5 pr-3 text-left", pick < 0 && each.id !== chroma.id && "text-muted")}
                          icon={
                            each.swatch ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={each.swatch} alt="" className="h-6 w-6" />
                            ) : (
                              <span className="h-6 w-6 bg-zinc-200" />
                            )
                          }
                        >
                          <span className="leading-tight">
                            <span className="flex items-center gap-1 text-[13px] font-medium">
                              {each.name}
                              {locked && <Lock aria-label={T.locked} className="h-3 w-3" />}
                            </span>
                            {pick >= 0 && <span className="block text-[12px] opacity-80">{pick === 0 ? T.preferred : T.alternative}</span>}
                          </span>
                        </Choice>
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
                  <span className="block text-[13px] text-muted">{T.now}</span>
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
    </Dialog>
  )
}
