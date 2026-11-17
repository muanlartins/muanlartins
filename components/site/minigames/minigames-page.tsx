"use client"

import Script from "next/script"
import { useEffect, useMemo, useRef, useState } from "react"
import { Lock, Play, Shuffle, Sparkles } from "lucide-react"
import { PageIntro } from "@/components/site/page-intro"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { shortDate, time } from "@/components/site/ranked/format"
import { channel } from "@/content/channel"
import {
  CLASSES,
  eraseMyBall,
  loadDuelist,
  loadDuels,
  loadMyBall,
  MATERIALS,
  playerUrl,
  replayUrl,
  saveMyBall,
  tierOf,
  type Ball,
  type Duelist,
  type Duels,
  type ClassId,
  type Fight,
  type MaterialId,
} from "@/lib/duelo"
import { canSave, keptToken, loadFans, loadMySigma, signIn, signOut, SignedOut, type Choice, type Sigma, type Torcedor } from "@/lib/profile"
import { HTML_LANG, LOCALE, localize } from "@/lib/site"
import { CHANNEL, TWITCH } from "@/lib/twitch"
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

type Status = "idle" | "saving" | "saved" | "error" | "expired"

const heading = "text-[13px] font-medium uppercase tracking-[0.12em] text-klein"
const chip = (on: boolean, locked = false) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[14px] transition-colors",
    locked ? "cursor-not-allowed border-dashed border-line text-muted/70" : on ? "border-klein bg-klein text-paper" : "border-line bg-paper/60 text-ink hover:border-klein/60",
  )

/** A material's swatch: its colour, glowing from Platina up, a ring of colours for the top. */
function Swatch({ id }: { id: MaterialId }) {
  const m = MATERIALS.find((x) => x.id === id)!
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 shrink-0 rounded-full border border-navy/25"
      style={{
        background: "arco" in m ? "conic-gradient(#ff6b6b, #f2c14e, #7fd8d2, #7aa2ff, #b48cff, #ff6b6b)" : m.cor,
        boxShadow: "brilho" in m ? `0 0 8px 1px ${m.cor}` : undefined,
      }}
    />
  )
}

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

/** /canal/minijogos: for now, the ball duel. Your ball (and its preview), your record, the ranking and the latest fights. */
export function MinigamesPage() {
  const [T, setT] = useState<Torcedor | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
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

  return (
    <div className="space-y-12">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      <Script src="/stream/duelo-motor.js" onReady={() => setVersao((window as { Duelo?: { VERSAO: number } }).Duelo?.VERSAO ?? null)} />
      <PageIntro title={text.title} description={text.description} />

      <section className="space-y-4">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink sm:text-3xl">{text.duel.title}</h2>
        <div className="max-w-[40rem] space-y-3 text-[16px] leading-[1.6] text-ink">
          <p>{text.duel.lead}</p>
          <p className="text-muted">{text.duel.fair}</p>
          <p className="text-[14px] text-muted">
            {text.duel.idea}{" "}
            <a href={`https://www.twitch.tv/${IDEA_BY}`} target="_blank" rel="noreferrer" className="font-medium text-klein hover:underline">
              {IDEA_BY}
            </a>
            {" · "}
            {text.duel.command}
          </p>
        </div>
      </section>

      <section className="space-y-6">
        {/* The live's own overlay: the preview of their ball, or a replay. */}
        <div ref={player} className="max-w-[720px] space-y-2">
          <div className="overflow-hidden rounded-md bg-navy" style={{ aspectRatio: "660 / 390" }}>
            <iframe key={src} src={src} title={text.duel.title} className="h-full w-full border-0" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-muted">
            <span>{replay ? text.player.replay.replace("{a}", replay.nomes[0]).replace("{b}", replay.nomes[1]) : text.player.preview}</span>
            {replay && (
              <button type="button" onClick={() => setReplay(null)} className="font-medium text-klein hover:underline">
                {text.player.back}
              </button>
            )}
          </div>
        </div>

        <div className="max-w-[720px] space-y-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h3 className={heading}>{text.yours.title}</h3>
            {token && login ? (
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink">
                <span>
                  {text.yours.signedInAs} <strong className="font-medium text-klein">{login}</strong>
                </span>
                <button type="button" onClick={leave} className="text-muted underline underline-offset-2 hover:text-klein">
                  {text.yours.signOut}
                </button>
              </p>
            ) : null}
          </div>
          {!token && canSave && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="button" onClick={() => save()} className="rounded-sm bg-[#9146ff] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90">
                {text.yours.signIn}
              </button>
              <p className="max-w-[26rem] text-[14px] text-muted">{text.yours.signInNote}</p>
            </div>
          )}
          {status === "expired" && <p className="text-[14px] text-[#b42318]">{text.yours.expired}</p>}

          <div className="space-y-2.5">
            <h4 className="text-[15px] font-medium text-ink">{text.yours.classTitle}</h4>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => pick({ classe: undefined })} className={chip(!ball.classe)} aria-pressed={!ball.classe}>
                <Shuffle aria-hidden className="h-3.5 w-3.5" />
                {text.yours.random}
              </button>
              {CLASSES.map((id) => (
                <button key={id} type="button" onClick={() => pick({ classe: id })} className={chip(ball.classe === id)} aria-pressed={ball.classe === id}>
                  {text.yours.classes[id].name}
                </button>
              ))}
            </div>
            <p className="text-[14px] text-ink">
              {ball.classe && ball.classe in text.yours.classes ? text.yours.classes[ball.classe as ClassId].text : text.yours.randomText}{" "}
              <span className="text-muted">{text.yours.classHint}</span>
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-[15px] font-medium text-ink">{text.yours.materialTitle}</h4>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => pick({ material: undefined })} className={chip(!ball.material)} aria-pressed={!ball.material}>
                <Sparkles aria-hidden className="h-3.5 w-3.5" />
                {text.yours.auto}
              </button>
              {MATERIALS.map((m, i) => {
                const locked = i > unlocked
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={locked}
                    title={locked ? text.yours.locked.replace("{n}", number(startsAt(m.id))) : undefined}
                    onClick={() => pick({ material: m.id })}
                    className={chip(ball.material === m.id, locked)}
                    aria-pressed={ball.material === m.id}
                  >
                    {locked ? <Lock aria-hidden className="h-3.5 w-3.5" /> : <Swatch id={m.id} />}
                    {materialName(m.id)}
                  </button>
                )
              })}
            </div>
            <p className="text-[14px] text-ink">
              {(() => {
                const shown = MATERIALS.find((m) => m.id === ball.material) ?? MATERIALS[unlocked]
                const effects = (["brilho", "rastro", "faiscas", "arco"] as const).filter((e) => e in shown).map((e) => text.yours.effects[e])
                const look = effects.length ? effects.join(", ") : text.yours.metal
                return `${materialName(shown.id)}: ${look}.`
              })()}{" "}
              <span className="text-muted">
                {unlocked < MATERIALS.length - 1
                  ? text.yours.next
                      .replace("{nome}", materialName(MATERIALS[unlocked + 1].id))
                      .replace("{n}", number(startsAt(MATERIALS[unlocked + 1].id)))
                      .replace("{s}", number(sigma))
                  : text.yours.materialHint}
              </span>
            </p>
          </div>

          {canSave && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => save()}
                disabled={Boolean(token) && (!dirty || status === "saving")}
                className="rounded-sm bg-klein px-5 py-2.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {status === "saving" ? text.yours.saving : token ? text.yours.save : text.yours.signInToSave}
              </button>
              {token && saved && Object.keys(saved).length > 0 && (
                <button type="button" onClick={() => pick({ classe: undefined, material: undefined })} className="text-[14px] text-muted underline underline-offset-2 hover:text-klein">
                  {text.yours.reset}
                </button>
              )}
              {status === "saved" && <span className="text-[14px] text-klein">{text.yours.saved}</span>}
              {status === "error" && <span className="text-[14px] text-[#b42318]">{text.yours.error}</span>}
            </div>
          )}

          {token && me && (
            <div className="space-y-3 border-t border-line pt-5">
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
                  <p className="text-[13px] text-muted">
                    {text.record.byClass}:{" "}
                    {Object.entries(me.classes)
                      .sort((a, b) => b[1].partidas - a[1].partidas)
                      .map(([c, r]) => `${className(c)} ${r.vitorias}/${r.partidas}`)
                      .join(" · ")}
                  </p>
                </>
              ) : (
                <p className="text-[14px] text-muted">{text.record.none}</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1.5">
          <h2 className={heading}>{text.ranking.title}</h2>
          <p className="text-[14px] text-muted">
            {text.ranking.note}
            {ranking && ranking.total > 0 && ` ${text.ranking.total.replace("{n}", number(ranking.total))}.`}
          </p>
        </div>
        {duels === "error" && <p className="text-[15px] text-muted">{text.ranking.unavailable}</p>}
        {ranking && !ranking.ranking.length && <p className="text-[15px] text-muted">{text.ranking.empty}</p>}
        {ranking && ranking.ranking.length > 0 && (
          <ol className="divide-y divide-line overflow-hidden rounded-md border border-line bg-paper/70">
            {ranking.ranking.map((r, i) => (
              <li key={r.login} className={cn("flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4", r.login === login && "bg-klein/[0.06]")}>
                <span className="w-6 shrink-0 text-right text-[15px] font-medium text-muted tabular-nums">{i + 1}</span>
                <FanSpot T={T} fans={fans} login={r.login} name={r.nome} size="sm" />
                <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                  {r.nome}
                  {r.login === login && <span className="ml-1.5 text-[12px] font-normal text-klein">({text.ranking.you})</span>}
                </p>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-lg leading-tight font-medium text-klein">
                    {number(r.vitorias)} <span className="text-[13px] font-normal text-muted">{text.record.wins}</span>
                  </p>
                  <p className="text-[12px] text-muted">
                    {number(r.partidas)} {text.record.fights} · {percent(r.vitorias, r.partidas)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {ranking?.canal && (
          <p className="text-[14px] text-muted">
            {text.ranking.channel
              .replace("{v}", `${number(ranking.canal.vitorias)} ${text.record.wins}`)
              .replace("{p}", `${number(ranking.canal.partidas)} ${text.record.fights}`)}{" "}
            <a href={TWITCH} target="_blank" rel="noreferrer" className="text-klein hover:underline">
              twitch.tv/{CHANNEL}
            </a>
          </p>
        )}
      </section>

      {ranking && ranking.lutas.length > 0 && (
        <section className="space-y-4">
          <h2 className={heading}>{text.latest.title}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-paper/70">
            {ranking.lutas.map((f) => {
              const w = f.vencedor
              const how = f.motivo === "nocaute" ? text.latest.knockout.replace("{s}", String(f.segundos)) : f.motivo === "tempo" ? text.latest.time : text.latest.draw
              const side = (i: 0 | 1) => (
                <>
                  <strong className="font-medium text-ink">{f.nomes[i]}</strong>{" "}
                  <span className="text-muted">
                    ({className(f.classes[i])}
                    {f.sorteadas[i] ? `, ${text.latest.drawn}` : ""})
                  </span>
                </>
              )
              const playable = versao !== null && f.versao === versao
              return (
                <li key={f.id} className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", replay?.id === f.id && "bg-klein/[0.06]")}>
                  <FanSpot T={T} fans={fans} login={f.logins[w]} name={f.nomes[w]} size="sm" />
                  <div className="min-w-0 flex-1 text-[14px] leading-snug">
                    <p>
                      {side(w)} {text.latest.won} {side((1 - w) as 0 | 1)}
                    </p>
                    <p className="text-[12px] text-muted">
                      {how} · {shortDate(f.em)} {time(f.em)}
                    </p>
                  </div>
                  {playable ? (
                    <button
                      type="button"
                      onClick={() => watch(f)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-klein/40 px-2.5 py-1.5 text-[13px] font-medium text-klein transition-colors hover:bg-klein hover:text-paper"
                    >
                      <Play aria-hidden className="h-3.5 w-3.5" />
                      {text.latest.watch}
                    </button>
                  ) : (
                    versao !== null && <span className="shrink-0 text-[12px] text-muted">{text.latest.old}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
