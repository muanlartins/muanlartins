"use client"

import { ArrowRight, Shuffle } from "lucide-react"
import Script from "next/script"
import { useMemo, useRef, useState } from "react"
import { TwitchIcon } from "@/components/site/brand-icons"
import { GameIcon } from "@/components/site/game/game-icon"
import { ClassArt, duelKit, type DuelKit } from "@/components/site/minigames/class-art"
import { Marble, marbleKit, type MarbleKit } from "@/components/site/minigames/marble"
import { PageIntro } from "@/components/site/page-intro"
import { DiscordLink } from "@/components/site/profile/discord-link"
import { FanEditor, linkDoEndereco } from "@/components/site/profile/fan-editor"
import css from "@/components/site/profile/fan-editor.module.css"
import { editor } from "@/components/site/profile/fan-editor-text"
import { FanStage, type Thrown } from "@/components/site/profile/fan-stage"
import { SigmaPanel } from "@/components/site/profile/sigma-panel"
import { Button, ButtonLink, cardClass, CardLink, EmptyState, ErrorLine, SignInButton, Skeleton, TabPanel, Tabs } from "@/components/site/ui"
import { CardEditor } from "@/components/site/viewer/card-editor"
import { ViewerCard, ViewerPhoto } from "@/components/site/viewer/viewer-card"
import { channel } from "@/content/channel"
import { profile } from "@/content/profile"
import { channelPath } from "@/lib/channel"
import type { DiscordLink as Discord } from "@/lib/discord"
import { isArchived } from "@/lib/game"
import {
  canSave,
  eraseMine,
  loadMine,
  loadMySigma,
  saveMine,
  signIn,
  signOut,
  SignedOut,
  takeBack,
  takeDraft,
  takeToken,
  type Fan,
  type SavedFan,
  type Sigma,
  type SigmaStats,
  type Torcedor,
} from "@/lib/profile"
import { clube, codigo, enxugar, lerCodigo, normalizar, torcedorDe, type Torcedor3D } from "@/lib/torcedor3d"
import { localize, sectionPath } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"
import { viewerPath, type Card, type Images, type Look } from "@/lib/viewer"

const text = localize(profile)
const minigames = localize(channel.minijogos)
type Status = "idle" | "saving" | "saved" | "erased" | "error" | "expired" | "big"
const TABS = ["torcedor", "cartao", "bolinha", "contas", "sigma"] as const
/** The dream loadout is Valorant's: while the game is archived (lib/game.ts), its card and the tab's "e loadout" hide. */
const LOADOUT = !isArchived("valorant")
const tabLabel = (id: (typeof TABS)[number]) => (id === "bolinha" && !LOADOUT ? text.tabs.bolinhaSo : text.tabs[id])
type Tab = (typeof TABS)[number]

// The 3D fan being built before going to Twitch, kept for the way back (the 2D one follows it).
const DRAFT_3D = "perfil:rascunho3d"
function keepDraft(look: Torcedor3D) {
  try {
    sessionStorage.setItem(DRAFT_3D, codigo(look))
  } catch {}
}
function takeDraft3D(): Torcedor3D | null {
  try {
    const kept = sessionStorage.getItem(DRAFT_3D)
    sessionStorage.removeItem(DRAFT_3D)
    return kept ? lerCodigo(kept) : null
  } catch {
    return null
  }
}

/**
 * Their 2D fan, which the profile API still keeps beside the 3D one (`t3`) for what draws the 2D fan: their saved one
 * with what the 3D fan says of the shirt's colours and number, their team (a club's 2D shirt with it), the celebration,
 * the arrival shout and the stickers.
 */
function fan2D(T: Torcedor, base: Fan, look: Torcedor3D, login: string): Fan {
  const club = clube(look.time)
  return T.normalizar(
    {
      ...base,
      cor: look.cor,
      detalhe: look.detalhe,
      terceira: look.terceira,
      numero: look.numero,
      time: look.time,
      frase: look.frase,
      stickers: look.stickers,
      comemoracao: look.fes,
      ...(club ? { roupa: club.roupa } : {}),
    },
    login,
  )
}

/** A dot on a tab with changes not saved yet. */
const unsavedDot = <span role="img" aria-label={text.unsaved} title={text.unsaved} className="h-1.5 w-1.5 rounded-full bg-klein" />

/**
 * The profile, as an editor in tabs: Torcedor (the 3D fan's editor, fan-editor.tsx: the fan turning beside its
 * controls, with the team, the arrival shout and the stickers), Cartão (banner, photo, colours, pronouns, about),
 * Bolinha e loadout (picked on their own pages; just Bolinha while Valorant is archived), Contas (Twitch, Discord) and Σ e medalhas; on all but the first, their
 * fan on a bit of the stand and their card stay in view beside it. The fan and the card are saved apart (PUT /eu with
 * the 3D fan as `t3`, PUT /eu/cartao); the pictures and Discord at once. Whoever has no 3D fan yet opens with their 2D
 * one turned 3D (torcedorDe), so nobody starts from scratch. Signed in, "Ver minha página" leads to their page.
 */
export function ProfilePage() {
  const [T, setT] = useState<Torcedor | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
  const [kit, setKit] = useState<DuelKit | null>(null)
  const [mkit, setMkit] = useState<MarbleKit | null>(null)
  // undefined while it loads; null when they have none yet.
  const [stats, setStats] = useState<SigmaStats | null | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [login, setLogin] = useState("")
  const [saved, setSaved] = useState<Fan | null>(null)
  // Their 2D fan as saved, or the default: what the 2D fan they send keeps beyond what the 3D one says.
  const [base2D, setBase2D] = useState<Fan | null>(null)
  // The 3D fan being edited, and as saved (or the default one), to know what changed.
  const [look, setLook] = useState<Torcedor3D | null>(null)
  const [savedLook, setSavedLook] = useState<Torcedor3D | null>(null)
  // A fan opened by link (#t=T1:…; null when it didn't open), handed to the editor once.
  const [link, setLink] = useState<Torcedor3D | null | undefined>(undefined)
  // Their card as saved and as being edited (undefined: their profile hasn't come back).
  const [cardBase, setCardBase] = useState<Card | undefined>(undefined)
  const [cardDraft, setCardDraft] = useState<Card>({})
  const [images, setImages] = useState<Images | null>(null)
  const [duelo, setDuelo] = useState<Look["duelo"]>(null)
  const [weapons, setWeapons] = useState<number | null>(null)
  // Their Discord as linked (null: none), once their profile came back.
  const [discord, setDiscord] = useState<Discord | null | undefined>(undefined)
  const [status, setStatus] = useState<Status>("idle")
  const [loadFailed, setLoadFailed] = useState(false)
  const [confirmErase, setConfirmErase] = useState(false)
  const [move, setMove] = useState("")
  const [stickers, setStickers] = useState<Thrown[]>([])
  const [shout, setShout] = useState("")
  const [tab, setTab] = useState<Tab>("torcedor")
  const [ballsOpened, setBallsOpened] = useState(false)
  const moveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const nextSticker = useRef(0)

  function openTab(next: Tab, remember = true) {
    setTab(next)
    if (next === "bolinha") setBallsOpened(true)
    if (remember) history.replaceState(null, "", `#${next}`)
  }

  // Once torcedor.js is in: who's signed in, what they saved, and any fan built before going to Twitch.
  function start(T: Torcedor | undefined) {
    if (!T) return
    setT(T)
    // A tab named in the address (/perfil#cartao, the "Editar perfil" of their page); the editor shows from here on.
    const named = location.hash.slice(1) as Tab
    if (TABS.includes(named)) openTab(named, false)
    const found = canSave ? takeToken() : null
    // A sign-in from another page (/pix) goes back there with the token.
    const back = takeBack()
    if (back) {
      location.replace(back)
      return
    }
    // A fan shared by link (#t=T1:…, the editor's "Copiar link") opens in the editor.
    const shared = linkDoEndereco()
    if (shared !== undefined) {
      setLink(shared)
      openTab("torcedor", false)
    }
    // The 2D draft isn't used any more: the 2D fan follows the 3D one.
    takeDraft()
    const draft = takeDraft3D()
    setToken(found)
    const nobody = () => {
      setBase2D(T.padrao())
      setSavedLook(torcedorDe(null, ""))
      setLook(draft ?? torcedorDe(null, ""))
    }
    if (!found) return nobody()
    setLoadFailed(false)
    loadMine(found)
      .then(({ login, aparencia, cartao, imagens, discord, duelo, loadout }) => {
        setLogin(login)
        setCardBase(cartao ?? {})
        setCardDraft(cartao ?? {})
        setImages(imagens ?? null)
        setDiscord(discord ?? null)
        setDuelo(duelo ?? null)
        setWeapons(loadout?.armas ? Object.keys(loadout.armas).length : 0)
        loadMySigma(found, login)
          .then(setStats)
          .catch(() => setStats(null))
        const mine = aparencia ? T.normalizar(aparencia, login) : null
        setSaved(mine)
        setBase2D(mine ?? T.padrao(login))
        // Their 3D fan, or their 2D one turned 3D.
        const mine3D = torcedorDe(aparencia, login)
        setSavedLook(mine3D)
        setLook(draft ?? mine3D)
      })
      .catch((error) => {
        if (error instanceof SignedOut) {
          setToken(null)
          setStatus("expired")
        } else setLoadFailed(true)
        nobody()
      })
  }

  const fan = useMemo(() => (T && base2D && look ? fan2D(T, base2D, look, login) : null), [T, base2D, look, login])
  // What would be saved as `t3` (the shout trimmed as the stand has it), and whether it differs from what is.
  const t3 = useMemo(() => (look ? enxugar(normalizar(look)) : null), [look])
  const savedT3 = useMemo(() => (savedLook ? JSON.stringify(enxugar(savedLook)) : null), [savedLook])
  const dirty = Boolean(t3 && savedT3 !== null && JSON.stringify(t3) !== savedT3)
  const cardDirty = cardBase !== undefined && JSON.stringify(cardDraft) !== JSON.stringify(cardBase)
  const signedIn = Boolean(token && login)
  const isChannel = signedIn && login === CHANNEL

  function change(next: Torcedor3D) {
    setLook(next)
    setStatus("idle")
    setConfirmErase(false)
  }

  /** To Twitch, keeping a fan they changed for the way back. */
  function enter() {
    if (look && dirty) keepDraft(look)
    signIn(null)
  }

  function play(kind: "goal" | "against" | "arrive") {
    if (!fan) return
    clearTimeout(moveTimer.current)
    setMove("")
    setShout("")
    requestAnimationFrame(() => {
      setMove(kind === "goal" ? "comemora" : kind === "against" ? "lamenta" : "chega")
      if (kind === "arrive") setShout(fan.frase)
      else {
        const thrown = fan.stickers[kind === "goal" ? "gol" : "contra"].flatMap((emoji) =>
          [0, 1].map(() => ({
            id: nextSticker.current++,
            emoji,
            dx: (Math.random() - 0.5) * 140,
            up: -110 - Math.random() * 90,
            wait: Math.random() * 0.9,
          })),
        )
        setStickers(thrown)
      }
      moveTimer.current = setTimeout(() => (setMove(""), setShout(""), setStickers([])), 3600)
    })
  }

  async function save() {
    if (!fan || !t3) return
    if (!token) return enter()
    setStatus("saving")
    try {
      const { login, aparencia } = await saveMine(token, fan, t3)
      const mine = T!.normalizar(aparencia, login)
      setLogin(login)
      setSaved(mine)
      setBase2D(mine)
      setSavedLook(torcedorDe(aparencia, login))
      setStatus("saved")
    } catch (error) {
      if (error instanceof SignedOut) setToken(null)
      setStatus(error instanceof SignedOut ? "expired" : error instanceof Error && error.message === "413" ? "big" : "error")
    }
  }

  async function erase() {
    if (!token) return
    if (!confirmErase) return setConfirmErase(true)
    setConfirmErase(false)
    try {
      await eraseMine(token)
      setSaved(null)
      setBase2D(T!.padrao(login))
      setSavedLook(torcedorDe(null, login))
      setLook(torcedorDe(null, login))
      setStatus("erased")
    } catch (error) {
      setStatus(error instanceof SignedOut ? "expired" : "error")
    }
  }

  function leave() {
    signOut()
    setToken(null)
    setLogin("")
    setCardBase(undefined)
    setCardDraft({})
    setImages(null)
    setDuelo(null)
    setWeapons(null)
    setDiscord(undefined)
    setStats(undefined)
    setSaved(null)
    setBase2D(T!.padrao())
    setSavedLook(torcedorDe(null, ""))
    setLook(torcedorDe(null, ""))
    setStatus("idle")
  }

  const expired = () => {
    setToken(null)
    setStatus("expired")
  }

  const twitchButton = canSave ? (
    <SignInButton platform="twitch" onClick={enter}>
      {text.signIn}
    </SignInButton>
  ) : null
  const signInPrompt = (line: string) => (
    <EmptyState className="space-y-4">
      <p>{line}</p>
      {twitchButton ?? <p>{text.soon}</p>}
    </EmptyState>
  )

  // Their fan as the site's other pieces read it: the 2D one with the 3D one being made (`t3`).
  const viewerLook: Look = { aparencia: fan ? ({ ...fan, t3 } as unknown as SavedFan) : null, cartao: null, duelo, imagens: images }
  const name = login || text.you
  const stage = T && fan ? <FanStage T={T} fan={fan} look={look} name={name} move={move} shout={shout} stickers={stickers} play={play} /> : null
  const cardPreview =
    signedIn && T ? (
      <figure className="space-y-2">
        {/* The cut clips a box shadow: the shadow follows the shape from this wrapper, as the card does over a name. */}
        <div className="drop-shadow-[0_8px_24px_rgb(0_20_71/0.16)]">
          <ViewerCard login={login} look={viewerLook} stats={stats} T={T} S={S} size="pop" preview={cardDraft} />
        </div>
        <figcaption className="text-[13px] text-muted">{text.preview.card}</figcaption>
      </figure>
    ) : null
  const tabs = TABS.filter((id) => !(isChannel && id === "sigma"))
  const freeSigma = stats?.sigma ?? 0
  const resetAndErase = (
    <>
      <Button variant="quiet" size="sm" onClick={() => change(torcedorDe(null, login))}>
        {text.reset}
      </Button>
      {token && saved && (
        <Button variant="quiet" size="sm" onClick={erase} className={confirmErase ? "text-loss" : undefined}>
          {confirmErase ? text.confirmErase : text.erase}
        </Button>
      )}
    </>
  )
  const saveLine =
    status === "saved"
      ? text.saved
      : status === "erased"
        ? text.erased
        : status === "error"
          ? text.error
          : status === "big"
            ? editor.grandeDemais
            : status === "expired"
              ? text.expired
              : dirty && token
                ? text.unsaved
                : ""

  return (
    <div>
      {/* The same drawing and moves as the stream's crowd; React hoists the stylesheet into the head. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => start(window.Torcedor)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      {ballsOpened && (
        <>
          <Script src="/stream/duelo-motor.js" onReady={() => setKit(duelKit())} />
          <Script src="/stream/duelo-arte.js" onReady={() => setKit(duelKit())} />
          <Script src="/stream/bolinha.js" onReady={() => setMkit(marbleKit())} />
        </>
      )}
      <PageIntro title={text.title} description={text.description} />

      {/* Who's signed in, and the way to their page. */}
      <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-3">
        {!T || (token && !login && !loadFailed && status !== "expired") ? (
          <>
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-56" />
          </>
        ) : signedIn ? (
          <>
            <ViewerPhoto login={login} look={viewerLook} T={T} className="h-10 w-10 shrink-0" />
            <p className="text-[15px] text-ink">
              {text.signedInAs} <b className="font-medium">{login}</b>
            </p>
            <ButtonLink href={viewerPath(login)} icon={<ArrowRight aria-hidden className="h-4 w-4" />} className="flex-row-reverse">
              {text.myPage}
            </ButtonLink>
            <Button variant="quiet" onClick={leave}>
              {text.signOut}
            </Button>
          </>
        ) : canSave ? (
          <>
            {twitchButton}
            <p className="max-w-[28rem] text-[13px] text-muted">{text.signInNote}</p>
          </>
        ) : (
          <p className="max-w-[34rem] text-[13px] text-muted">{text.soon}</p>
        )}
        {isChannel && (
          <ButtonLink href={channelPath("agenda")} variant="secondary" icon={<ArrowRight aria-hidden className="h-4 w-4" />} className="flex-row-reverse">
            {text.agenda}
          </ButtonLink>
        )}
      </div>
      {loadFailed && (
        <ErrorLine className="mt-3" onRetry={() => T && start(T)}>
          {text.loadError}
        </ErrorLine>
      )}
      {status === "expired" && !token && <p className="mt-3 text-[15px] text-loss">{text.expired}</p>}

      {!T || !fan || !look ? (
        <div className="mt-10" aria-busy>
          <Skeleton className="h-8 w-full max-w-[34rem]" />
          <div className={cn(css.largo, "mt-8 grid gap-4 md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[400px_minmax(0,1fr)]")}>
            <Skeleton className="cut h-[240px] md:h-[600px]" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <Tabs
            label={text.tabs.label}
            idPrefix="perfil"
            className="max-md:-mx-6 max-md:px-6"
            value={tab}
            onChange={(id) => openTab(id)}
            items={tabs.map((id) => ({
              id,
              label:
                (id === "torcedor" && dirty && token) || (id === "cartao" && cardDirty) ? (
                  <>
                    {tabLabel(id)}
                    {unsavedDot}
                  </>
                ) : (
                  tabLabel(id)
                ),
            }))}
          />

          {/* The fan's editor takes the page's width: its own view stays in sight beside its controls. */}
          <TabPanel idPrefix="perfil" id="torcedor" className={cn("mt-8", tab !== "torcedor" && "hidden")}>
            <div className={css.largo}>
              <FanEditor look={look} onChange={change} eu={login} emojis={T.STICKERS} ativo={tab === "torcedor"} link={link} />
              <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-ground/90 px-2 py-3 backdrop-blur sm:py-4">
                {canSave &&
                  (token ? (
                    <Button onClick={save} disabled={status === "saving" || !dirty}>
                      {status === "saving" ? text.saving : text.save}
                    </Button>
                  ) : (
                    twitchButton
                  ))}
                <p
                  className={cn("min-w-0 flex-1 basis-40 text-[13px]", status === "error" || status === "expired" || status === "big" ? "text-loss" : "text-muted")}
                  aria-live="polite"
                >
                  {saveLine}
                </p>
                <div className="hidden gap-4 md:flex">{resetAndErase}</div>
              </div>
              {/* On a phone the bar that follows the page keeps to one line: the rest comes after it. */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 px-2 pb-2 pt-1 md:hidden">{resetAndErase}</div>
            </div>
          </TabPanel>

          <div className={cn("mt-8 grid gap-8 md:grid-cols-[18rem_minmax(0,1fr)]", tab === "torcedor" && "hidden")}>
            {/* What they're making, in view while they make it. */}
            <aside className="hidden space-y-8 md:sticky md:top-24 md:block md:self-start">
              {/* On the card's tab the card comes first. */}
              {tab === "cartao" ? (
                <>
                  {cardPreview}
                  {stage}
                </>
              ) : (
                <>
                  {stage}
                  {cardPreview}
                </>
              )}
            </aside>

            <div className="min-w-0">
              <TabPanel idPrefix="perfil" id="cartao" className={cn(tab !== "cartao" && "hidden")}>
                {signedIn && cardBase !== undefined ? (
                  <>
                    {cardPreview && <div className="mx-auto mb-10 max-w-[300px] md:hidden">{cardPreview}</div>}
                    <CardEditor
                      token={token!}
                      login={login}
                      card={cardDraft}
                      base={cardBase}
                      images={images}
                      look={viewerLook}
                      T={T}
                      onChange={(patch) => setCardDraft((c) => ({ ...c, ...patch }))}
                      onSaved={(card) => {
                        setCardBase(card)
                        setCardDraft(card)
                      }}
                      onImages={setImages}
                      onExpired={expired}
                    />
                  </>
                ) : (
                  signInPrompt(text.card.signIn)
                )}
              </TabPanel>

              <TabPanel idPrefix="perfil" id="bolinha" className={cn("space-y-3", tab !== "bolinha" && "hidden")}>
                <CardLink href={`${channelPath("minijogos")}#duelo`} className="flex items-center gap-4">
                  <span className="cut-sm grid h-16 w-16 shrink-0 place-items-center bg-navy">
                    {duelo?.classe ? (
                      <ClassArt kit={kit} classe={duelo.classe} material={duelo.material ?? (S ? S.ranque(freeSigma).id.replace(/-\d$/, "") : "bronze")} fan={fan} size={56} />
                    ) : (
                      <Shuffle aria-hidden className="h-6 w-6 text-paper/70" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-ink">{text.extras.duel}</span>
                    <span className="block text-[13px] text-muted">
                      {duelo?.classe ? ((minigames.yours.classes as Record<string, { name: string }>)[duelo.classe]?.name ?? duelo.classe) : text.extras.random}
                    </span>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[15px] font-medium text-klein">
                      {text.extras.pick}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </span>
                  </span>
                </CardLink>
                <CardLink href={`${channelPath("minijogos")}#corrida`} className="flex items-center gap-4">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-navy">
                    <Marble kit={mkit} fan={fan as unknown as Record<string, unknown>} who={look ? { look } : null} rankId={S && stats ? S.ranque(stats.sigma).id : undefined} size={56} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-ink">{text.extras.race}</span>
                    <span className="block text-[13px] text-muted">{text.extras.raceHint}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[15px] font-medium text-klein">
                      {text.extras.raceSee}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </span>
                  </span>
                </CardLink>
                {LOADOUT && (
                  <CardLink href={`${sectionPath("content")}/valorant/inventory#montar`} className="flex items-center gap-4">
                    <span className="cut-sm grid h-16 w-16 shrink-0 place-items-center bg-navy text-paper">
                      <GameIcon game="valorant" size={28} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-ink">{text.extras.loadout}</span>
                      <span className="block text-[13px] text-muted">{weapons ? text.extras.loadoutCount.replace("{n}", String(weapons)) : text.extras.loadoutNone}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1.5 text-[15px] font-medium text-klein">
                        {weapons ? text.extras.edit : text.extras.build}
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      </span>
                    </span>
                  </CardLink>
                )}
              </TabPanel>

              <TabPanel idPrefix="perfil" id="contas" className={cn("space-y-3", tab !== "contas" && "hidden")}>
                <section aria-labelledby="conta-twitch" className={cn(cardClass, "space-y-3 p-5")}>
                  <h2 id="conta-twitch" className="flex items-center gap-2 text-[15px] font-medium text-ink">
                    <TwitchIcon className="h-5 w-5 text-klein" />
                    {text.twitch.title}
                  </h2>
                  <p className="max-w-[38rem] text-[15px] text-muted">{text.twitch.hint}</p>
                  {signedIn ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
                      <span className="text-ink">
                        {text.signedInAs} <b className="font-medium">{login}</b>
                      </span>
                      <Button variant="quiet" size="sm" onClick={leave}>
                        {text.signOut}
                      </Button>
                    </div>
                  ) : (
                    (twitchButton ?? <p className="text-[13px] text-muted">{text.soon}</p>)
                  )}
                </section>
                {/* Their Σ rank as a role in the Discord server; the channel's own account has none. */}
                {canSave && !isChannel && <DiscordLink token={signedIn ? token : null} linked={discord} onExpired={expired} onReturn={() => openTab("contas", false)} />}
              </TabPanel>

              {!isChannel && (
                <TabPanel idPrefix="perfil" id="sigma" className={cn(tab !== "sigma" && "hidden")}>
                  <SigmaPanel S={S} stats={signedIn ? stats : undefined} signIn={signedIn ? undefined : signInPrompt(text.sigma.signIn)} />
                </TabPanel>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
