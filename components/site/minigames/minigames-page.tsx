"use client"

import Script from "next/script"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BarChart3, Flag, Play, Shuffle, Sparkles, Swords, Trophy, type LucideIcon } from "lucide-react"
import { PageIntro } from "@/components/site/page-intro"
import { ClassArt, duelKit, type DuelKit } from "@/components/site/minigames/class-art"
import { className, DuelReplay, FightRow, FightsSection } from "@/components/site/minigames/fights"
import { marbleKit, marbleSkin, type MarbleKit } from "@/components/site/minigames/marble"
import { RaceSection } from "@/components/site/minigames/race-section"
import { RankingSection } from "@/components/site/minigames/ranking-section"
import { fill, number, percent } from "@/components/site/minigames/shared"
import { StatsSection } from "@/components/site/minigames/stats"
import { BarList, buttonClass, cardClass, ErrorLine, Fold, Section, Skeleton } from "@/components/site/ui"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { channel } from "@/content/channel"
import { loadRaces, type Races } from "@/lib/corrida"
import {
  CLASS_STATS,
  CLASSES,
  eraseMyBall,
  loadDuelist,
  loadDuels,
  loadMyBall,
  MATERIALS,
  PLAYER_ASPECT,
  playerUrl,
  saveMyBall,
  tierOf,
  type Ball,
  type ClassId,
  type Duelist,
  type Duels,
  type Fight,
  type MaterialId,
} from "@/lib/duelo"
import { canSave, keptToken, loadFans, loadMySigma, signIn, signOut, SignedOut, type Choice, type SavedFan, type Sigma } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { normalizar2D } from "@/lib/torcedor2d"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const text = localize(channel.minijogos)
// The ball picked before going to Twitch, to find it again on the way back.
const DRAFT_KEY = "duelo:rascunho"
// Who signed in from here comes back here (lib/profile.ts's sign-in returns through /perfil).
const BACK = "/canal/minijogos"
// The one who first had the idea (content/changelog.ts credits the same).
const IDEA_BY = "lucca_3098"
// The preview's other ball: a login Twitch can't have (they're 4 characters or more), so it never names anyone.
const NOBODY = "eu"
// The class stats' ball, nobody's: Klein claro and Klein, as canvas colours.
const PLAIN = { cor: "#85a7ff", detalhe: "#002fa7", roupa: "lisa" }

type Status = "idle" | "saving" | "saved" | "error" | "expired"

function readDraft(): Ball | null {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Ball | null
    sessionStorage.removeItem(DRAFT_KEY)
    return d && typeof d === "object" ? d : null
  } catch {
    return null
  }
}

const clean = (b: Ball): Ball => ({ ...(b.classe ? { classe: b.classe } : {}), ...(b.material ? { material: b.material } : {}) })
const same = (a: Ball | null, b: Ball | null) => JSON.stringify(clean(a ?? {})) === JSON.stringify(clean(b ?? {}))

/** A stat as a game's sheet draws it: five segments. */
function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
      <span className="eyebrow text-paper/65">{label}</span>
      <span className="flex gap-1" role="img" aria-label={`${label}: ${value}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-2.5 flex-1", i <= value ? "bg-ouro" : "bg-paper/12")} />
        ))}
      </span>
    </div>
  )
}

/** A square to pick on the select screen: a class in the roster, a material. Its edge turns gold when picked. */
const pickClass = (on: boolean) =>
  cn("cut-sm cut-edge relative border transition-colors", on ? "border-ouro bg-paper/15" : "border-paper/15 bg-paper/[0.04] hover:bg-paper/10")

/** The page's sections, one click away: its own index under the intro. */
const INDEX: { id: string; label: keyof typeof text.index; Icon: LucideIcon }[] = [
  { id: "duelo", label: "duel", Icon: Swords },
  { id: "corrida", label: "race", Icon: Flag },
  { id: "ranking", label: "ranking", Icon: Trophy },
  { id: "lutas", label: "fights", Icon: Play },
  { id: "estatisticas", label: "stats", Icon: BarChart3 },
]

/**
 * /canal/minijogos: the ball duel (pick your ball as in a game's select screen, your record), the marble race, both
 * rankings, the best and latest fights with their replays, and the duel's numbers by class.
 */
export function MinigamesPage() {
  const [S, setS] = useState<Sigma | null>(null)
  const [kit, setKit] = useState<DuelKit | null>(null)
  const [marbles, setMarbles] = useState<MarbleKit | null>(null)
  const [versao, setVersao] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [login, setLogin] = useState("")
  const [sigma, setSigma] = useState(0)
  const [saved, setSaved] = useState<Ball | null>(null)
  const [ball, setBall] = useState<Ball>({})
  const [status, setStatus] = useState<Status>("idle")
  const [duels, setDuels] = useState<Duels | null | "error">(null)
  const [races, setRaces] = useState<Races | null | "error">(null)
  const [me, setMe] = useState<Duelist | null | "error">(null)
  const [fans, setFans] = useState<Record<string, SavedFan> | null>(null)
  const [hovered, setHovered] = useState<ClassId | null>(null)
  const [myFan, setMyFan] = useState<Choice | null>(null)
  const [replay, setReplay] = useState<Fight | null>(null)

  const addFans = useCallback((logins: string[]) => {
    if (!logins.length) return setFans((f) => f ?? {})
    loadFans([...new Set(logins)]).then(
      (more) => setFans((f) => ({ ...(f ?? {}), ...more })),
      () => setFans((f) => f ?? {}),
    )
  }, [])

  const loadMine = useCallback((who: string) => {
    setMe(null)
    loadDuelist(who).then(setMe, () => setMe("error"))
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage and the kept sign-in only exist in the browser */
    const draft = readDraft()
    if (draft) setBall(clean(draft))
    const found = canSave ? keptToken() : null
    setToken(found)
    /* eslint-enable react-hooks/set-state-in-effect */
    if (found) {
      loadMyBall(found)
        .then(({ login, duelo }) => {
          setLogin(login)
          setSaved(duelo)
          if (!draft) setBall(clean(duelo ?? {}))
          loadMySigma(found, login).then((s) => setSigma(s?.sigma ?? 0), () => {})
          loadMine(login)
          loadFans([login]).then((f) => setMyFan(f[login] ?? null), () => {})
        })
        .catch((error) => {
          if (error instanceof SignedOut) {
            setToken(null)
            setStatus("expired")
          }
        })
    }
    loadDuels().then(
      (d) => {
        setDuels(d)
        addFans([...d.ranking.map((r) => r.login), ...d.lutas.slice(0, 12).flatMap((f) => f.logins)])
      },
      () => setDuels("error"),
    )
    loadRaces().then(
      (r) => {
        setRaces(r)
        addFans([...r.ranking.map((x) => x.login), ...r.ultimas.slice(0, 4).flatMap((x) => x.logins)])
      },
      () => setRaces("error"),
    )
  }, [addFans, loadMine])

  // Their own fan's colours and shirt on every ball they look at.
  const fanOf = useCallback((who: string, choice?: Choice | null) => normalizar2D(choice ?? fans?.[who] ?? null, who), [fans])
  const mine = normalizar2D(myFan, login || NOBODY)

  // Their rank's material, the one they wear when they pick none (the channel's, the top).
  const unlocked = useMemo(() => {
    if (login === CHANNEL) return MATERIALS.length - 1
    if (!S) return 0
    return Math.max(0, MATERIALS.findIndex((m) => m.id === tierOf(S.ranque(sigma).id)))
  }, [S, sigma, login])
  const startsAt = (id: MaterialId) => S?.RL.find(([, rank]) => tierOf(rank) === id)?.[0] ?? 0
  const materialName = (id: MaterialId) => (S ? S.ranque(startsAt(id), LOCALE).nome.replace(/ (I|II|III)$/, "") : id)
  const skinOf = useCallback(
    (who: string) => marbleSkin(marbles, normalizar2D(fans?.[who] ?? null, who) as unknown as Record<string, unknown>),
    [marbles, fans],
  )

  const dirty = !same(ball, saved)
  const pick = (patch: Ball) => {
    setBall((b) => clean({ ...b, ...patch }))
    setStatus("idle")
  }

  async function save() {
    if (!token) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(ball))
      } catch {}
      return signIn(null, BACK)
    }
    setStatus("saving")
    try {
      const r = Object.keys(clean(ball)).length ? await saveMyBall(token, clean(ball)) : await eraseMyBall(token)
      setSaved(r.duelo)
      setStatus("saved")
    } catch (error) {
      if (error instanceof SignedOut) setToken(null)
      setStatus(error instanceof SignedOut ? "expired" : "error")
    }
  }

  function leave() {
    signOut()
    setToken(null)
    setLogin("")
    setSaved(null)
    setMe(null)
    setSigma(0)
    setMyFan(null)
  }

  // The preview: their ball against the channel's; signed in as the channel, the channel's against a fan's (the
  // player shows nothing given the same login twice).
  const asChannel = login === CHANNEL
  const src = asChannel
    ? playerUrl({ logins: [CHANNEL, NOBODY], nomes: [CHANNEL, text.player.fan], classes: [ball.classe ?? "*", "*"], materiais: [ball.material ?? "*", "*"] })
    : playerUrl({ logins: [login || NOBODY, CHANNEL], nomes: [login || text.player.you, CHANNEL], classes: [ball.classe ?? "*", ""], materiais: [ball.material ?? "*", ""] })

  const list = duels && duels !== "error" ? duels : null
  // The sheet shows the class under the pointer, else the one picked.
  const shown = hovered ?? (ball.classe as ClassId | undefined) ?? null
  const material = (MATERIALS.find((m) => m.id === ball.material) ?? MATERIALS[unlocked]).id
  const record = me && me !== "error" ? me : null

  return (
    <div>
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      <Script
        src="/stream/duelo-motor.js"
        onReady={() => {
          setVersao((window as { Duelo?: { VERSAO: number } }).Duelo?.VERSAO ?? null)
          setKit(duelKit())
        }}
      />
      <Script src="/stream/duelo-arte.js" onReady={() => setKit(duelKit())} />
      <Script src="/stream/bolinha.js" onReady={() => setMarbles(marbleKit())} />
      <PageIntro title={text.title} description={text.description} />

      {/* The page's own index, one line that scrolls sideways on phones. */}
      <nav aria-label={text.index.label} className="-mx-6 mt-8 overflow-x-auto px-6 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {INDEX.map(({ id, label, Icon }) => (
            <li key={id}>
              <a href={`#${id}`} className={buttonClass({ variant: "secondary", size: "sm" })}>
                <Icon aria-hidden className="h-4 w-4" />
                {text.index[label]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-12 space-y-16">
        <Section
          id="duelo"
          title={text.duel.title}
          description={text.duel.short}
          action={
            <p className="text-[13px] text-muted">
              {text.idea}{" "}
              <ViewerName login={IDEA_BY} className="font-medium text-klein">
                {IDEA_BY}
              </ViewerName>
            </p>
          }
        >
          <div className="space-y-6">
            <Fold summary={text.how}>
              <ul className="list-disc space-y-1.5 pl-5">
                {text.duel.how.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Fold>

            {/* The select screen: the live's own box on the left (the preview of their ball), the sheet on the right, the roster below. */}
            <div className="cut bg-navy text-paper">
              <div className="grid sm:grid-cols-[minmax(0,17rem)_1fr]">
                <div className="border-b border-paper/10 p-3 sm:border-r sm:border-b-0">
                  <div className="mx-auto max-w-[17rem]" style={{ aspectRatio: PLAYER_ASPECT }}>
                    <iframe key={src} src={src} title={text.duel.title} className="h-full w-full border-0" />
                  </div>
                  <p className="mt-2 text-[13px] text-paper/70">{asChannel ? text.player.previewChannel : text.player.preview}</p>
                </div>

                <div className="space-y-5 p-5">
                  <div className="flex items-center gap-4">
                    <div className="grid h-[120px] w-[120px] shrink-0 place-items-center rounded-full bg-paper/[0.04] ring-1 ring-paper/10">
                      {shown ? <ClassArt kit={kit} classe={shown} material={material} fan={mine} size={116} spin /> : <Shuffle aria-hidden className="h-10 w-10 text-paper/70" />}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <p className="eyebrow text-ouro">{shown ? text.yours.tags[shown] : text.yours.classTitle}</p>
                      <p className="text-2xl font-medium tracking-[-0.02em]">{shown ? className(shown) : text.yours.random}</p>
                      {/* Room for three lines whatever the class, so the sheet never changes height (see below). */}
                      <p className="min-h-[4.2em] text-[15px] leading-snug text-paper/75">{shown ? text.yours.classes[shown].text : text.yours.randomText}</p>
                    </div>
                  </div>
                  {/* Always there, empty for Aleatória: the sheet growing when a class showed pushed the roster below it
                      out from under the pointer, which hid the stats again, which brought the roster back: it flickered. */}
                  <div className="space-y-2">
                    {(["dano", "alcance", "velocidade", "cresce"] as const).map((k) => (
                      <StatBar key={k} label={text.yours.stats[k]} value={shown ? CLASS_STATS[shown][k] : 0} />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="eyebrow text-paper/65">{text.yours.materialTitle}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => pick({ material: undefined })} aria-pressed={!ball.material} title={text.yours.auto} aria-label={text.yours.auto} className={cn(pickClass(!ball.material), "grid h-14 w-14 place-items-center")}>
                        <Sparkles aria-hidden className="h-5 w-5 text-paper/80" />
                      </button>
                      {MATERIALS.map((m) => {
                        const label = materialName(m.id)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => pick({ material: m.id })}
                            aria-pressed={ball.material === m.id}
                            title={label}
                            aria-label={label}
                            className={cn(pickClass(ball.material === m.id), "grid h-14 w-14 place-items-center")}
                          >
                            <span>
                              <ClassArt kit={kit} classe={ball.classe ?? "espada"} material={m.id} fan={mine} size={50} />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[13px] text-paper/70">
                      {(() => {
                        const m = MATERIALS.find((x) => x.id === material)!
                        const effects = (["brilho", "rastro", "faiscas", "arco"] as const).filter((e) => e in m).map((e) => text.yours.effects[e])
                        return `${materialName(m.id)}: ${effects.length ? effects.join(", ") : text.yours.metal}. `
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* The roster. */}
              <div className="border-t border-paper/10 p-3 sm:p-4" onPointerLeave={() => setHovered(null)}>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {(["*", ...CLASSES] as const).map((id) => {
                    const on = id === "*" ? !ball.classe : ball.classe === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => pick({ classe: id === "*" ? undefined : id })}
                        onPointerEnter={() => setHovered(id === "*" ? null : id)}
                        onFocus={() => setHovered(id === "*" ? null : id)}
                        onBlur={() => setHovered(null)}
                        aria-pressed={on}
                        className={cn(pickClass(on), "flex flex-col items-center gap-1 px-1 pt-2 pb-1.5")}
                      >
                        {id === "*" ? (
                          <span className="grid h-[56px] w-[56px] place-items-center">
                            <Shuffle aria-hidden className="h-6 w-6 text-paper/70" />
                          </span>
                        ) : (
                          <ClassArt kit={kit} classe={id} material={material} fan={mine} size={56} />
                        )}
                        <span className={cn("text-[13px]", on ? "text-paper" : "text-paper/75")}>{id === "*" ? text.yours.random : className(id)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-paper/10 px-5 py-4">
                {canSave && (
                  <button
                    type="button"
                    onClick={() => save()}
                    disabled={Boolean(token) && (!dirty || status === "saving")}
                    // The primary button turned over for the navy island: Branco on navy.
                    className={cn(buttonClass(), "bg-paper text-navy hover:bg-klein-claro")}
                  >
                    {status === "saving" ? text.yours.saving : token ? text.yours.save : text.yours.signInToSave}
                  </button>
                )}
                {token && saved && Object.keys(saved).length > 0 && (
                  <button type="button" onClick={() => pick({ classe: undefined, material: undefined })} className="text-[13px] text-paper/70 underline underline-offset-4 hover:text-paper">
                    {text.yours.reset}
                  </button>
                )}
                <span className={cn("text-[13px]", status === "error" || status === "expired" ? "text-paper" : "text-paper/75")} role="status">
                  {status === "saved" ? text.yours.saved : status === "error" ? text.yours.error : status === "expired" ? text.yours.expired : !token ? text.yours.signInNote : ""}
                </span>
                {token && login && (
                  <span className="ml-auto text-[13px] text-paper/70">
                    {text.yours.signedInAs} <strong className="font-medium text-paper">{login}</strong> ·{" "}
                    <button type="button" onClick={leave} className="underline underline-offset-4 hover:text-paper">
                      {text.yours.signOut}
                    </button>
                  </span>
                )}
              </div>
            </div>

            {token && login && (
              <div className={cn(cardClass, "space-y-5 p-5")}>
                <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{text.record.title}</h3>
                {me === "error" ? (
                  <ErrorLine onRetry={() => loadMine(login)}>{text.record.unavailable}</ErrorLine>
                ) : !record ? (
                  <div aria-hidden className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14" />
                    ))}
                  </div>
                ) : record.partidas ? (
                  <>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        [number(record.vitorias), text.record.wins],
                        [number(record.partidas), text.record.fights],
                        [percent(record.vitorias, record.partidas), text.record.rate],
                        [record.posicao ? `${record.posicao}º` : "–", record.posicao || !asChannel ? text.record.place : text.record.outside],
                      ].map(([value, label]) => (
                        <div key={label} className="flex flex-col-reverse">
                          <dt className="text-[13px] text-muted">{label}</dt>
                          <dd className="text-xl font-semibold text-klein">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {Object.keys(record.classes).length > 0 && (
                      <BarList
                        max={1}
                        track
                        reference={0.5}
                        bars={Object.entries(record.classes)
                          .sort((a, b) => b[1].partidas - a[1].partidas)
                          .map(([c, r]) => ({
                            id: c,
                            label: (
                              <>
                                <ClassArt kit={kit} classe={c} material={material} fan={mine} size={26} className="shrink-0" />
                                <span className="truncate">{className(c)}</span>
                              </>
                            ),
                            value: r.vitorias / r.partidas,
                            display: `${percent(r.vitorias, r.partidas)} · ${fill(text.stats.of, { v: r.vitorias, p: r.partidas })}`,
                          }))}
                      />
                    )}
                    {record.lutas.length > 0 && (
                      <div className="space-y-2">
                        <p className="eyebrow text-klein">{text.record.latest}</p>
                        <ul className="-mx-5 -mb-5 divide-y divide-line border-t border-line">
                          {record.lutas.slice(0, 5).map((f) => (
                            <FightRow key={f.id} fight={f} login={login} playable={versao !== null && f.versao === versao} onWatch={setReplay} labels={{ won: text.record.won, lost: text.record.lost }} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[15px] text-muted">{text.record.none}</p>
                )}
              </div>
            )}
          </div>
        </Section>

        <RaceSection S={S} kit={marbles} races={races} login={login} fan={login ? (mine as unknown as Record<string, unknown>) : null} sigma={sigma} skinOf={skinOf} />

        <RankingSection duels={duels} races={races} fans={fans} login={login} skinOf={skinOf} />

        <FightsSection fights={list?.lutas ?? null} failed={duels === "error"} kit={kit} versao={versao} fanOf={fanOf} />

        <StatsSection fights={list?.lutas ?? null} ranking={list?.ranking ?? null} kit={kit} fan={PLAIN} />
      </div>

      <DuelReplay fight={replay} onClose={() => setReplay(null)} />
    </div>
  )
}
