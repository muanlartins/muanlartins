"use client"

import Script from "next/script"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Crown, Dices, Flag, Lock, MessageSquare, Play, Repeat, Scale, Shuffle, Sparkles, Swords } from "lucide-react"
import { PageIntro } from "@/components/site/page-intro"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { shortDate, time } from "@/components/site/ranked/format"
import { ClassArt, duelKit, type DuelKit } from "@/components/site/minigames/class-art"
import { RaceSection } from "@/components/site/minigames/race-section"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { channel } from "@/content/channel"
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
  replayUrl,
  saveMyBall,
  tierOf,
  type Ball,
  type ClassId,
  type Duelist,
  type Duels,
  type Fight,
  type MaterialId,
} from "@/lib/duelo"
import { canSave, keptToken, loadFans, loadMySigma, signIn, signOut, SignedOut, type Choice, type Sigma, type Torcedor } from "@/lib/profile"
import { HTML_LANG, LOCALE, localize } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const text = localize(channel.minijogos)
const LANG = HTML_LANG[LOCALE]
const number = (n: number) => n.toLocaleString(LANG)
const percent = (v: number, p: number) => (p ? `${Math.round((v / p) * 100)}%` : "–")
// The ball picked before going to Twitch, to find it again on the way back.
const DRAFT_KEY = "duelo:rascunho"
// Who signed in from here comes back here (lib/profile.ts's sign-in returns through /perfil).
const BACK = "/canal/minijogos"
// The one who first had the idea (content/changelog.ts credits the same).
const IDEA_BY = "lucca_3098"
// The preview's ball before signing in: a login Twitch can't have (they're 4 characters or more).
const NOBODY = "eu"
// A fan's colours before torcedor.js loads.
const PLAIN = { cor: "#85a7ff", detalhe: "#002fa7", roupa: "lisa" }
// The two sides' rings, as the live draws them (duelo.html's --esquerda / --direita).
const RINGS = ["#85a7ff", "#ffb547"]

type Status = "idle" | "saving" | "saved" | "error" | "expired"

const heading = "text-[13px] font-medium uppercase tracking-[0.12em] text-klein"
const panel = "rounded-xl border border-line bg-paper/70"

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
      <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">{label}</span>
      <span className="flex gap-1" aria-label={`${label}: ${value}/5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-2.5 flex-1 -skew-x-12 rounded-[2px]", i <= value ? "bg-[#ffd166]" : "bg-white/12")} />
        ))}
      </span>
    </div>
  )
}

/** A rule of the game in a few words, with its icon. */
function Rule({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/70 px-3 py-1 text-[13px] text-ink">
      <span className="text-klein">{icon}</span>
      {children}
    </li>
  )
}

/** /canal/minijogos: the ball duel (pick your ball as in a game's select screen, the ranking, the latest fights) and the marble race. */
export function MinigamesPage() {
  const [T, setT] = useState<Torcedor | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
  const [kit, setKit] = useState<DuelKit | null>(null)
  const [versao, setVersao] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [login, setLogin] = useState("")
  const [sigma, setSigma] = useState(0)
  const [saved, setSaved] = useState<Ball | null>(null)
  const [ball, setBall] = useState<Ball>({})
  const [status, setStatus] = useState<Status>("idle")
  const [duels, setDuels] = useState<Duels | null | "error">(null)
  const [me, setMe] = useState<Duelist | null>(null)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)
  const [replay, setReplay] = useState<Fight | null>(null)
  const [hovered, setHovered] = useState<ClassId | null>(null)
  const [myFan, setMyFan] = useState<Choice | null>(null)
  const player = useRef<HTMLDivElement>(null)

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
          loadDuelist(login).then(setMe, () => {})
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
        const logins = [...d.ranking.map((r) => r.login), ...d.lutas.flatMap((f) => f.logins)]
        if (logins.length) loadFans(logins).then(setFans, () => setFans({}))
        else setFans({})
      },
      () => setDuels("error"),
    )
  }, [])

  // Their own fan's colours and shirt on every ball they look at.
  const fanOf = (who: string, choice: Choice | null | undefined) => (T ? T.normalizar(choice ?? null, who) : PLAIN)
  const mine = fanOf(login || NOBODY, myFan)

  // What their Σ has unlocked: the channel, everything.
  const unlocked = useMemo(() => {
    if (login === CHANNEL) return MATERIALS.length - 1
    if (!S) return 0
    return Math.max(0, MATERIALS.findIndex((m) => m.id === tierOf(S.ranque(sigma).id)))
  }, [S, sigma, login])
  const startsAt = (id: MaterialId) => S?.RL.find(([, rank]) => tierOf(rank) === id)?.[0] ?? 0
  const materialName = (id: MaterialId) => (S ? S.ranque(startsAt(id), LOCALE).nome.replace(/ (I|II|III)$/, "") : id)

  const dirty = !same(ball, saved)
  const pick = (patch: Ball) => {
    setBall((b) => clean({ ...b, ...patch }))
    setStatus("idle")
    setReplay(null)
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

  function watch(f: Fight) {
    setReplay(f)
    player.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const you = localize({ pt: "você", en: "you" })
  const src = replay
    ? replayUrl(replay)
    : playerUrl({
        logins: [login || NOBODY, CHANNEL],
        nomes: [login || you, CHANNEL],
        classes: [ball.classe ?? "*", ""],
        materiais: [ball.material ?? "*", ""],
      })

  const className = (id: string) => (text.yours.classes as Record<string, { name: string }>)[id]?.name ?? id
  const ranking = duels && duels !== "error" ? duels : null
  // The sheet shows the class under the mouse, else the one picked.
  const shown = hovered ?? (ball.classe as ClassId | undefined) ?? null
  const material = (MATERIALS.find((m) => m.id === ball.material) ?? MATERIALS[unlocked]).id
  const name = (l: string, n: string) => (l === CHANNEL ? n : <ViewerName login={l}>{n}</ViewerName>)

  return (
    <div className="space-y-12">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      <Script
        src="/stream/duelo-motor.js"
        onReady={() => {
          setVersao((window as { Duelo?: { VERSAO: number } }).Duelo?.VERSAO ?? null)
          setKit(duelKit())
        }}
      />
      <Script src="/stream/duelo-arte.js" onReady={() => setKit(duelKit())} />
      <PageIntro title={text.title} description={text.description} />

      {/* The two games, one click away. */}
      <nav className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "#duelo", Icon: Swords, title: text.duel.title, line: text.duel.short, n: ranking?.total ? text.ranking.total.replace("{n}", number(ranking.total)) : null },
          { href: "#corrida", Icon: Flag, title: text.race.title, line: text.race.short, n: null },
        ].map(({ href, Icon, title, line, n }) => (
          <a key={href} href={href} className="group flex items-start gap-3 rounded-xl border border-line bg-paper/70 p-4 transition-colors hover:border-klein">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy text-[#ffd166]">
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-medium text-ink group-hover:text-klein">{title}</span>
              <span className="block text-[13px] leading-snug text-muted">{line}</span>
              {n && <span className="mt-1 block text-[12px] text-klein tabular-nums">{n}</span>}
            </span>
          </a>
        ))}
      </nav>

      <section id="duelo" className="scroll-mt-24 space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink sm:text-3xl">{text.duel.title}</h2>
          <ul className="flex flex-wrap gap-2">
            <Rule icon={<Dices aria-hidden className="h-3.5 w-3.5" />}>{text.duel.rules.drawn}</Rule>
            <Rule icon={<Repeat aria-hidden className="h-3.5 w-3.5" />}>{text.duel.rules.loop}</Rule>
            <Rule icon={<Scale aria-hidden className="h-3.5 w-3.5" />}>{text.duel.rules.fair}</Rule>
            <Rule icon={<Sparkles aria-hidden className="h-3.5 w-3.5" />}>{text.duel.rules.looks}</Rule>
            <Rule icon={<MessageSquare aria-hidden className="h-3.5 w-3.5" />}>{text.duel.rules.command}</Rule>
          </ul>
          <p className="text-[13px] text-muted">
            {text.duel.idea}{" "}
            <ViewerName login={IDEA_BY} className="font-medium text-klein">
              {IDEA_BY}
            </ViewerName>
          </p>
        </div>

        {/* The select screen: the live's own box on the left (the preview of their ball, or a replay), the sheet on the right, the roster below. */}
        <div className="overflow-hidden rounded-xl bg-navy text-white">
          <div className="grid sm:grid-cols-[minmax(0,17rem)_1fr]">
            <div ref={player} className="scroll-mt-24 border-b border-white/10 p-3 sm:border-r sm:border-b-0">
              <div className="mx-auto max-w-[17rem] overflow-hidden rounded-md" style={{ aspectRatio: PLAYER_ASPECT }}>
                <iframe key={src} src={src} title={text.duel.title} className="h-full w-full border-0" />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/60">
                <span>{replay ? text.player.replay.replace("{a}", replay.nomes[0]).replace("{b}", replay.nomes[1]) : text.player.preview}</span>
                {replay && (
                  <button type="button" onClick={() => setReplay(null)} className="font-medium text-[#ffd166] hover:underline">
                    {text.player.back}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <div className="grid h-[120px] w-[120px] shrink-0 place-items-center rounded-full bg-white/[0.04] ring-1 ring-white/10">
                  {shown ? <ClassArt kit={kit} classe={shown} material={material} fan={mine} size={116} spin /> : <Shuffle aria-hidden className="h-10 w-10 text-white/70" />}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#ffd166]">{shown ? text.yours.tags[shown] : text.yours.classTitle}</p>
                  <p className="text-2xl font-medium tracking-[-0.02em]">{shown ? className(shown) : text.yours.random}</p>
                  <p className="text-[14px] leading-snug text-white/75">{shown ? text.yours.classes[shown].text : text.yours.randomText}</p>
                </div>
              </div>
              {shown && (
                <div className="space-y-2">
                  {(["dano", "alcance", "velocidade", "cresce"] as const).map((k) => (
                    <StatBar key={k} label={text.yours.stats[k]} value={CLASS_STATS[shown][k]} />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">{text.yours.materialTitle}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => pick({ material: undefined })}
                    aria-pressed={!ball.material}
                    title={text.yours.auto}
                    className={cn("grid h-14 w-14 place-items-center rounded-lg ring-1 transition", !ball.material ? "bg-white/15 ring-[#ffd166]" : "bg-white/[0.04] ring-white/10 hover:bg-white/10")}
                  >
                    <Sparkles aria-hidden className="h-5 w-5 text-white/80" />
                  </button>
                  {MATERIALS.map((m, i) => {
                    const locked = i > unlocked
                    const on = ball.material === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={locked}
                        onClick={() => pick({ material: m.id })}
                        aria-pressed={on}
                        title={locked ? `${materialName(m.id)} · ${text.yours.locked.replace("{n}", number(startsAt(m.id)))}` : materialName(m.id)}
                        className={cn(
                          "relative grid h-14 w-14 place-items-center rounded-lg ring-1 transition",
                          on ? "bg-white/15 ring-[#ffd166]" : "bg-white/[0.04] ring-white/10 hover:bg-white/10",
                          locked && "cursor-not-allowed",
                        )}
                      >
                        <span className={cn(locked && "opacity-25 grayscale")}>
                          <ClassArt kit={kit} classe={ball.classe ?? "espada"} material={m.id} fan={mine} size={50} />
                        </span>
                        {locked && <Lock aria-hidden className="absolute h-4 w-4 text-white/80" />}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[12px] text-white/60">
                  {(() => {
                    const m = MATERIALS.find((x) => x.id === material)!
                    const effects = (["brilho", "rastro", "faiscas", "arco"] as const).filter((e) => e in m).map((e) => text.yours.effects[e])
                    return `${materialName(m.id)}: ${effects.length ? effects.join(", ") : text.yours.metal}. `
                  })()}
                  {unlocked < MATERIALS.length - 1 &&
                    text.yours.next
                      .replace("{nome}", materialName(MATERIALS[unlocked + 1].id))
                      .replace("{n}", number(startsAt(MATERIALS[unlocked + 1].id)))
                      .replace("{s}", number(sigma))}
                </p>
              </div>
            </div>
          </div>

          {/* The roster. */}
          <div className="border-t border-white/10 p-3 sm:p-4" onPointerLeave={() => setHovered(null)}>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {(["*", ...CLASSES] as const).map((id) => {
                const on = id === "*" ? !ball.classe : ball.classe === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pick({ classe: id === "*" ? undefined : id })}
                    onPointerEnter={() => setHovered(id === "*" ? null : id)}
                    aria-pressed={on}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg px-1 pb-1.5 pt-2 ring-1 transition",
                      on ? "bg-white/15 ring-[#ffd166]" : "bg-white/[0.04] ring-white/10 hover:bg-white/10",
                    )}
                  >
                    {id === "*" ? (
                      <span className="grid h-[56px] w-[56px] place-items-center">
                        <Shuffle aria-hidden className="h-6 w-6 text-white/70" />
                      </span>
                    ) : (
                      <ClassArt kit={kit} classe={id} material={material} fan={mine} size={56} />
                    )}
                    <span className={cn("text-[12px]", on ? "text-white" : "text-white/70")}>{id === "*" ? text.yours.random : className(id)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-5 py-4">
            {canSave && (
              <button
                type="button"
                onClick={() => save()}
                disabled={Boolean(token) && (!dirty || status === "saving")}
                className="rounded-md bg-[#ffd166] px-5 py-2.5 text-[15px] font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {status === "saving" ? text.yours.saving : token ? text.yours.save : text.yours.signInToSave}
              </button>
            )}
            {token && saved && Object.keys(saved).length > 0 && (
              <button type="button" onClick={() => pick({ classe: undefined, material: undefined })} className="text-[13px] text-white/60 underline underline-offset-2 hover:text-white">
                {text.yours.reset}
              </button>
            )}
            <span className="text-[13px] text-white/70" aria-live="polite">
              {status === "saved" ? text.yours.saved : status === "error" ? text.yours.error : status === "expired" ? text.yours.expired : !token ? text.yours.signInNote : ""}
            </span>
            {token && login && (
              <span className="ml-auto text-[13px] text-white/60">
                {text.yours.signedInAs} <strong className="font-medium text-white">{login}</strong> ·{" "}
                <button type="button" onClick={leave} className="underline underline-offset-2 hover:text-white">
                  {text.yours.signOut}
                </button>
              </span>
            )}
          </div>
        </div>

        {token && me && (
          <div className={cn(panel, "space-y-4 p-5")}>
            <h3 className={heading}>{text.record.title}</h3>
            {me.partidas ? (
              <>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    [number(me.vitorias), text.record.wins],
                    [number(me.partidas), text.record.fights],
                    [percent(me.vitorias, me.partidas), text.record.rate],
                    [me.posicao ? `${me.posicao}º` : "–", text.record.place],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <dt className="sr-only">{label}</dt>
                      <dd className="text-2xl font-medium text-klein tabular-nums">{value}</dd>
                      <dd className="text-[13px] text-muted">{label}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="flex flex-wrap gap-2">
                  {Object.entries(me.classes)
                    .sort((a, b) => b[1].partidas - a[1].partidas)
                    .map(([c, r]) => (
                      <li key={c} className="flex items-center gap-2 rounded-lg bg-navy py-1 pl-1 pr-3 text-[13px] text-white">
                        <ClassArt kit={kit} classe={c} material={material} fan={mine} size={34} />
                        {className(c)}
                        <span className="text-white/60 tabular-nums">
                          {r.vitorias}/{r.partidas}
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <p className="text-[14px] text-muted">{text.record.none}</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={heading}>{text.ranking.title}</h3>
            {ranking && ranking.total > 0 && <p className="text-[13px] text-muted">{text.ranking.total.replace("{n}", number(ranking.total))}</p>}
          </div>
          {duels === "error" && <p className="text-[15px] text-muted">{text.ranking.unavailable}</p>}
          {ranking && !ranking.ranking.length && <p className="text-[15px] text-muted">{text.ranking.empty}</p>}
          {ranking && ranking.ranking.length > 0 && (
            <div className={cn(panel, "overflow-hidden")}>
              {/* The top three on a podium, the stand's way. */}
              <div className="flex items-end justify-center gap-3 bg-klein/[0.05] px-4 pt-6 sm:gap-6">
                {[1, 0, 2]
                  .filter((i) => ranking.ranking[i])
                  .map((i) => {
                    const r = ranking.ranking[i]
                    return (
                      <div key={r.login} className="flex w-28 flex-col items-center text-center sm:w-36">
                        {i === 0 && <Crown aria-hidden className="mb-1 h-5 w-5 text-[#d9a520]" />}
                        <FanSpot T={T} fans={fans} login={r.login} name={r.nome} />
                        <p className="mt-1 max-w-full truncate text-[14px] font-medium text-ink">{name(r.login, r.nome)}</p>
                        <p className="text-[12px] text-muted tabular-nums">
                          {number(r.vitorias)} {text.record.wins} · {percent(r.vitorias, r.partidas)}
                        </p>
                        <div className={cn("mt-2 grid w-full place-items-center rounded-t-md bg-klein text-xl font-medium text-paper", i === 0 ? "h-16" : i === 1 ? "h-11" : "h-8")}>{i + 1}</div>
                      </div>
                    )
                  })}
              </div>
              {ranking.ranking.length > 3 && (
                <ol className="divide-y divide-line">
                  {ranking.ranking.slice(3).map((r, k) => (
                    <li key={r.login} className={cn("flex items-center gap-3 px-4 py-2", r.login === login && "bg-klein/[0.06]")}>
                      <span className="w-6 shrink-0 text-right text-[14px] font-medium text-muted tabular-nums">{k + 4}</span>
                      <FanSpot T={T} fans={fans} login={r.login} name={r.nome} size="sm" />
                      <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                        {name(r.login, r.nome)}
                        {r.login === login && <span className="ml-1.5 text-[12px] font-normal text-klein">({text.ranking.you})</span>}
                      </p>
                      <p className="shrink-0 text-right text-[13px] text-muted tabular-nums">
                        <span className="text-[16px] font-medium text-klein">{number(r.vitorias)}</span> {text.record.wins} · {number(r.partidas)} {text.record.fights}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          {ranking?.canal && (
            <p className="text-[13px] text-muted">
              {text.ranking.channel.replace("{v}", `${number(ranking.canal.vitorias)} ${text.record.wins}`).replace("{p}", `${number(ranking.canal.partidas)} ${text.record.fights}`)}
            </p>
          )}
        </div>

        {ranking && ranking.lutas.length > 0 && (
          <div className="space-y-4">
            <h3 className={heading}>{text.latest.title}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ranking.lutas.map((f) => {
                const how = f.motivo === "nocaute" ? text.latest.knockout.replace("{s}", String(f.segundos)) : f.motivo === "tempo" ? text.latest.time : text.latest.draw
                const playable = versao !== null && f.versao === versao
                return (
                  <li key={f.id} className={cn(panel, "overflow-hidden", replay?.id === f.id && "border-klein")}>
                    <div className="flex items-center gap-2 bg-navy px-3 py-3 text-white">
                      {([0, 1] as const).map((i) => (
                        <div key={i} className={cn("flex min-w-0 flex-1 items-center gap-2", i === 1 && "order-3 flex-row-reverse text-right")}>
                          <ClassArt kit={kit} classe={f.classes[i]} material={f.materiais[i] ?? "bronze"} fan={fanOf(f.logins[i], fans?.[f.logins[i]])} size={44} ring={RINGS[i]} />
                          <div className="min-w-0">
                            <p className={cn("truncate text-[14px] font-medium", f.vencedor === i ? "text-[#ffd166]" : "text-white/70")}>
                              {f.vencedor === i && <Crown aria-hidden className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />}
                              {name(f.logins[i], f.nomes[i])}
                            </p>
                            <p className="truncate text-[11px] text-white/50">
                              {className(f.classes[i])}
                              {f.sorteadas[i] ? ` · ${text.latest.drawn}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                      <span className="order-2 shrink-0 text-[12px] font-semibold text-white/40">VS</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-muted">
                      <span>
                        {how} · {shortDate(f.em)} {time(f.em)}
                      </span>
                      {playable ? (
                        <button type="button" onClick={() => watch(f)} className="inline-flex items-center gap-1 rounded-md bg-klein px-2.5 py-1 font-medium text-paper hover:opacity-90">
                          <Play aria-hidden className="h-3.5 w-3.5" />
                          {text.latest.watch}
                        </button>
                      ) : (
                        versao !== null && <span>{text.latest.old}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      <RaceSection T={T} />
    </div>
  )
}
