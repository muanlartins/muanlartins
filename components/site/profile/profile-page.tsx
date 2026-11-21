"use client"

import { ArrowRight, Shuffle } from "lucide-react"
import Script from "next/script"
import { useRef, useState } from "react"
import { TwitchIcon } from "@/components/site/brand-icons"
import { GameIcon } from "@/components/site/game/game-icon"
import { ClassArt, duelKit, type DuelKit } from "@/components/site/minigames/class-art"
import { Marble, marbleKit, type MarbleKit } from "@/components/site/minigames/marble"
import { PageIntro } from "@/components/site/page-intro"
import { DiscordLink } from "@/components/site/profile/discord-link"
import { FanEditor } from "@/components/site/profile/fan-editor"
import { FanStage, type Thrown } from "@/components/site/profile/fan-stage"
import { SigmaPanel } from "@/components/site/profile/sigma-panel"
import { Button, ButtonLink, cardClass, CardLink, EmptyState, ErrorLine, SignInButton, Skeleton, TabPanel, Tabs } from "@/components/site/ui"
import { CardEditor } from "@/components/site/viewer/card-editor"
import { ViewerCard, ViewerPhoto } from "@/components/site/viewer/viewer-card"
import { channel } from "@/content/channel"
import { profile } from "@/content/profile"
import { channelPath } from "@/lib/channel"
import type { DiscordLink as Discord } from "@/lib/discord"
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
  type Sigma,
  type SigmaStats,
  type Torcedor,
} from "@/lib/profile"
import { localize, sectionPath } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"
import { viewerPath, type Card, type Images, type Look } from "@/lib/viewer"

const text = localize(profile)
const minigames = localize(channel.minijogos)
type Status = "idle" | "saving" | "saved" | "erased" | "error" | "expired"
const TABS = ["torcedor", "cartao", "bolinha", "contas", "sigma"] as const
type Tab = (typeof TABS)[number]

/** A dot on a tab with changes not saved yet. */
const unsavedDot = <span role="img" aria-label={text.unsaved} title={text.unsaved} className="h-1.5 w-1.5 rounded-full bg-klein" />

/**
 * The profile, as an editor: what they're making stays in view beside it (their fan on a bit of the stand, playing its
 * moments, and their card as it shows on their name), and the parts are tabs: Torcedor (look, team, what it does in the
 * live), Cartão (banner, photo, colours, pronouns, about), Bolinha e loadout (picked on their own pages), Contas
 * (Twitch, Discord) and Σ e medalhas. The fan and the card are saved apart (PUT /eu, PUT /eu/cartao); the pictures and
 * Discord at once. Signed in, "Ver minha página" leads to their page (/torcedor/<login>).
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
  // Their card as saved and as being edited (undefined: their profile hasn't come back).
  const [cardBase, setCardBase] = useState<Card | undefined>(undefined)
  const [cardDraft, setCardDraft] = useState<Card>({})
  const [images, setImages] = useState<Images | null>(null)
  const [duelo, setDuelo] = useState<Look["duelo"]>(null)
  const [weapons, setWeapons] = useState<number | null>(null)
  // Their Discord as linked (null: none), once their profile came back.
  const [discord, setDiscord] = useState<Discord | null | undefined>(undefined)
  const [fan, setFan] = useState<Fan | null>(null)
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
    const draft = takeDraft()
    setToken(found)
    if (!found) {
      setFan(draft ? T.normalizar(draft) : T.padrao())
      return
    }
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
        setFan(draft ? T.normalizar(draft, login) : (mine ?? T.padrao(login)))
      })
      .catch((error) => {
        if (error instanceof SignedOut) {
          setToken(null)
          setStatus("expired")
        } else setLoadFailed(true)
        setFan(draft ? T.normalizar(draft) : T.padrao())
      })
  }

  const baseline = T && (saved ?? T.padrao(login))
  const dirty = Boolean(fan && baseline && JSON.stringify(fan) !== JSON.stringify(baseline))
  const cardDirty = cardBase !== undefined && JSON.stringify(cardDraft) !== JSON.stringify(cardBase)
  const signedIn = Boolean(token && login)
  const isChannel = signedIn && login === CHANNEL

  function change(patch: Partial<Fan>) {
    setFan((current) => current && T && T.normalizar({ ...current, ...patch }, login))
    setStatus("idle")
    setConfirmErase(false)
  }

  function play(kind: "goal" | "against" | "arrive", celebration?: string) {
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
    if (celebration) change({ comemoracao: celebration })
  }

  async function save() {
    if (!fan) return
    if (!token) return signIn(fan)
    setStatus("saving")
    try {
      const { login, aparencia } = await saveMine(token, fan)
      setLogin(login)
      setSaved(T!.normalizar(aparencia, login))
      setStatus("saved")
    } catch (error) {
      if (error instanceof SignedOut) setToken(null)
      setStatus(error instanceof SignedOut ? "expired" : "error")
    }
  }

  async function erase() {
    if (!token) return
    if (!confirmErase) return setConfirmErase(true)
    setConfirmErase(false)
    try {
      await eraseMine(token)
      setSaved(null)
      setFan(T!.padrao(login))
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
    setFan(T!.padrao())
    setStatus("idle")
  }

  const expired = () => {
    setToken(null)
    setStatus("expired")
  }

  const twitchButton = canSave ? (
    <SignInButton platform="twitch" onClick={() => signIn(fan)}>
      {text.signIn}
    </SignInButton>
  ) : null
  const signInPrompt = (line: string) => (
    <EmptyState className="space-y-4">
      <p>{line}</p>
      {twitchButton ?? <p>{text.soon}</p>}
    </EmptyState>
  )

  const look: Look = { aparencia: fan as unknown as Record<string, unknown>, cartao: null, duelo, imagens: images }
  const name = login || text.you
  const stage = T && fan ? <FanStage T={T} fan={fan} name={name} move={move} shout={shout} stickers={stickers} play={play} /> : null
  const cardPreview =
    signedIn && T ? (
      <figure className="space-y-2">
        {/* The cut clips a box shadow: the shadow follows the shape from this wrapper, as the card does over a name. */}
        <div className="drop-shadow-[0_8px_24px_rgb(0_20_71/0.16)]">
          <ViewerCard login={login} look={look} stats={stats} T={T} S={S} size="pop" preview={cardDraft} />
        </div>
        <figcaption className="text-[13px] text-muted">{text.preview.card}</figcaption>
      </figure>
    ) : null
  const tabs = TABS.filter((id) => !(isChannel && id === "sigma"))
  const freeSigma = stats?.sigma ?? 0

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
            <ViewerPhoto login={login} look={look} T={T} className="h-10 w-10 shrink-0" />
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

      {!T || !fan ? (
        <div className="mt-10 grid gap-8 md:grid-cols-[18rem_minmax(0,1fr)]" aria-busy>
          <Skeleton className="hidden h-64 md:block" />
          <div className="space-y-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 w-full" />
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
                    {text.tabs[id]}
                    {unsavedDot}
                  </>
                ) : (
                  text.tabs[id]
                ),
            }))}
          />
          <div className="mt-8 grid gap-8 md:grid-cols-[18rem_minmax(0,1fr)]">
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

              <TabPanel idPrefix="perfil" id="torcedor" className={cn(tab !== "torcedor" && "hidden")}>
                {stage && <div className="mb-10 md:hidden">{stage}</div>}
                <FanEditor T={T} S={S} fan={fan} login={login} sigma={freeSigma} change={change} play={play} />
                <div className="sticky bottom-0 z-10 -mx-2 mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-ground/90 px-2 py-4 backdrop-blur">
                  {canSave &&
                    (token ? (
                      <Button onClick={save} disabled={status === "saving" || !dirty}>
                        {status === "saving" ? text.saving : text.save}
                      </Button>
                    ) : (
                      twitchButton
                    ))}
                  <p className={cn("text-[13px]", status === "error" || status === "expired" ? "text-loss" : "text-muted")} aria-live="polite">
                    {status === "saved"
                      ? text.saved
                      : status === "erased"
                        ? text.erased
                        : status === "error"
                          ? text.error
                          : status === "expired"
                            ? text.expired
                            : dirty && token
                              ? text.unsaved
                              : ""}
                  </p>
                  <div className="ml-auto flex gap-4">
                    <Button variant="quiet" size="sm" onClick={() => change(T.padrao(login))}>
                      {text.reset}
                    </Button>
                    {token && saved && (
                      <Button variant="quiet" size="sm" onClick={erase} className={confirmErase ? "text-loss" : undefined}>
                        {confirmErase ? text.confirmErase : text.erase}
                      </Button>
                    )}
                  </div>
                </div>
              </TabPanel>

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
                      look={look}
                      sigma={freeSigma}
                      T={T}
                      S={S}
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
                    <Marble kit={mkit} fan={fan as unknown as Record<string, unknown>} rankId={S && stats ? S.ranque(stats.sigma).id : undefined} size={56} />
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
