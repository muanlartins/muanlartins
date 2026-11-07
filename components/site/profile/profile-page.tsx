"use client"

import Script from "next/script"
import { useRef, useState, type ReactNode } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { FanView } from "@/components/site/profile/fan-view"
import { SigmaPanel } from "@/components/site/profile/sigma-panel"
import { profile } from "@/content/profile"
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
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile)
type Status = "idle" | "saving" | "saved" | "erased" | "error" | "expired"
type Option = "cabeca" | "roupa" | "acessorio" | "comemoracao"

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-6">
      <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-klein">{title}</h2>
      {hint && <p className="-mt-1 text-[14px] text-muted">{hint}</p>}
      {children}
    </section>
  )
}

/** Any colour, past the palette: a Σ unlock (sigma.js). Locked, it says where it unlocks. */
function FreeColor({
  value,
  onChange,
  locked,
  unlocksAt,
  palette,
}: {
  value: string
  onChange: (color: string) => void
  locked: boolean
  unlocksAt: string
  palette: string[]
}) {
  const custom = !palette.includes(value)
  if (locked) {
    return (
      <span className="flex h-8 items-center rounded-sm border-2 border-dashed border-navy/20 px-2 text-[12px] text-muted">
        {text.freeColor.locked} {unlocksAt}
      </span>
    )
  }
  return (
    <label
      title={text.freeColor.label}
      className={cn(
        "relative flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border-2 px-2 text-[12px] text-ink",
        custom ? "border-klein ring-2 ring-klein/40" : "border-navy/20",
      )}
    >
      <span className="h-4 w-4 rounded-sm border border-navy/20" style={{ background: custom ? value : "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
      {text.freeColor.label}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
    </label>
  )
}

/** Their team: a club from the list dresses the fan in its shirt; any other is just its name. */
function TeamGroup({ T, fan, change }: { T: Torcedor; fan: Fan; change: (patch: Partial<Fan>) => void }) {
  const club = T.TIMES.find((t) => t.nome === fan.time)
  const [typing, setTyping] = useState(Boolean(fan.time && !club))
  const value = club ? club.nome : typing ? "outro" : ""
  return (
    <Group title={text.groups.team} hint={text.groups.teamHint}>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={value}
          onChange={(e) => {
            const pick = e.target.value
            if (pick === "outro") {
              setTyping(true)
              change({ time: "" })
              return
            }
            setTyping(false)
            const team = T.TIMES.find((t) => t.nome === pick)
            change(team ? { time: team.nome, cor: team.cor, detalhe: team.detalhe, terceira: team.terceira ?? team.detalhe, roupa: team.roupa } : { time: "" })
          }}
          className="rounded-sm border border-line bg-paper px-3 py-2 text-ink"
        >
          <option value="">{text.groups.teamNone}</option>
          {T.TIMES.map((t) => (
            <option key={t.nome} value={t.nome}>
              {t.nome}
            </option>
          ))}
          <option value="outro">{text.groups.teamOther}</option>
        </select>
        {typing && (
          <input
            value={fan.time}
            maxLength={T.TIME_MAX}
            placeholder={text.groups.teamName}
            aria-label={text.groups.teamName}
            onChange={(e) => change({ time: e.target.value })}
            className="w-full max-w-[14rem] rounded-sm border border-line bg-paper px-3 py-2 text-ink"
          />
        )}
      </div>
    </Group>
  )
}

const tile = (on: boolean) =>
  cn(
    "flex flex-col items-center gap-2 rounded-md border px-2 pb-2 pt-3 text-[13px] transition-colors",
    on ? "border-klein bg-paper text-klein" : "border-line text-ink hover:border-klein/60",
  )

export function ProfilePage() {
  const [T, setT] = useState<Torcedor | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
  // undefined while it loads; null when they have none yet.
  const [stats, setStats] = useState<SigmaStats | null | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [login, setLogin] = useState("")
  const [saved, setSaved] = useState<Fan | null>(null)
  const [fan, setFan] = useState<Fan | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [confirmErase, setConfirmErase] = useState(false)
  const [move, setMove] = useState("")
  const [stickers, setStickers] = useState<{ id: number; emoji: string; dx: number; up: number; wait: number }[]>([])
  const [shout, setShout] = useState("")
  const [other, setOther] = useState({ gol: "", contra: "" })
  const moveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const nextSticker = useRef(0)

  // Once torcedor.js is in: who's signed in, what they saved, and any fan built before going to Twitch.
  function start(T: Torcedor | undefined) {
    if (!T) return
    setT(T)
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
    loadMine(found)
      .then(({ login, aparencia }) => {
        setLogin(login)
        loadMySigma(found, login)
          .then(setStats)
          .catch(() => setStats(null))
        const mine = aparencia ? T.normalizar(aparencia, login) : null
        setSaved(mine)
        setFan(draft ? T.normalizar(draft, login) : (mine ?? T.padrao(login)))
      })
      .catch((error) => {
        if (error instanceof SignedOut) setToken(null)
        setStatus(error instanceof SignedOut ? "expired" : "error")
        setFan(draft ? T.normalizar(draft) : T.padrao())
      })
  }

  const baseline = T && (saved ?? T.padrao(login))
  const dirty = Boolean(fan && baseline && JSON.stringify(fan) !== JSON.stringify(baseline))

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
    setStats(undefined)
    setSaved(null)
    setFan(T!.padrao())
    setStatus("idle")
  }

  function toggleSticker(when: "gol" | "contra", emoji: string) {
    if (!fan || !T) return
    const list = fan.stickers[when]
    const next = list.includes(emoji) ? list.filter((e) => e !== emoji) : [...list, emoji].slice(-T.STICKERS_MAX)
    change({ stickers: { ...fan.stickers, [when]: next } })
  }

  const options: { key: Option; title: string; list: (T: Torcedor) => string[]; hint?: string }[] = [
    { key: "cabeca", title: text.groups.head, list: (T) => T.CABECAS },
    { key: "roupa", title: text.groups.outfit, list: (T) => T.ROUPAS },
    { key: "acessorio", title: text.groups.accessory, list: (T) => T.ACESSORIOS },
  ]
  const optionName = (key: Option, id: string) =>
    (text.options[key] as Record<string, string | undefined>)[id] ?? id

  return (
    <div className="space-y-10">
      {/* The same drawing and moves as the stream's crowd; React hoists the stylesheet into the head. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => start(window.Torcedor)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      <PageIntro title={text.title} description={text.description} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
        {token && login ? (
          <>
            <span className="text-ink">
              {text.signedInAs} <strong className="font-medium text-klein">{login}</strong>
            </span>
            <button onClick={leave} className="text-muted underline underline-offset-2 hover:text-klein">
              {text.signOut}
            </button>
          </>
        ) : canSave ? (
          <>
            <button
              onClick={() => fan && signIn(fan)}
              className="rounded-sm bg-[#9146ff] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
            >
              {text.signIn}
            </button>
            <p className="max-w-[30rem] text-[14px] text-muted">{text.signInNote}</p>
          </>
        ) : (
          <p className="max-w-[34rem] text-[14px] text-muted">{text.soon}</p>
        )}
      </div>

      {S && canSave && <SigmaPanel S={S} login={token ? login : ""} stats={stats} />}

      {T && fan && (
        <div className="grid gap-10 sm:grid-cols-[15rem_1fr]">
          {/* The fan on a bit of the stream's stand, as the crowd shows it. */}
          <div className="sm:sticky sm:top-24 sm:self-start">
            <div className="relative h-72 overflow-hidden rounded-md bg-navy">
              <div
                className="absolute inset-x-0 bottom-0 h-8 bg-klein"
                style={{ clipPath: "polygon(24px 0, calc(100% - 24px) 0, 100% 100%, 0 100%)" }}
              />
              <div className="absolute bottom-6 left-1/2 h-[140px] w-[94px] -translate-x-1/2">
                <span className="absolute bottom-[calc(100%+28px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-navy/80 px-2 py-0.5 text-[15px] font-semibold text-paper">
                  {login || text.you}
                </span>
                {shout && (
                  <span className="absolute bottom-[calc(100%+62px)] left-1/2 z-10 w-max max-w-[13rem] -translate-x-1/2 bg-paper px-3 py-1.5 text-[15px] font-medium text-klein">
                    {shout}
                  </span>
                )}
                <FanView T={T} fan={fan} move={move} className="h-full w-full" />
                {stickers.map((s) => (
                  <span
                    key={s.id}
                    className="sticker"
                    style={{
                      left: "50%",
                      bottom: "100%",
                      ["--dx" as string]: `${s.dx}px`,
                      ["--sobe" as string]: `${s.up}px`,
                      ["--espera" as string]: `${s.wait}s`,
                    }}
                  >
                    {s.emoji}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
              {(["goal", "against", "arrive"] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => play(kind)}
                  disabled={kind === "arrive" && !fan.frase}
                  className="rounded-sm border border-klein/40 px-2.5 py-1.5 text-klein transition-colors hover:bg-paper disabled:opacity-40"
                >
                  {text.preview[kind]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <TeamGroup T={T} fan={fan} change={change} />

            <Group title={text.groups.colors}>
              {(T.TRES_CORES.includes(fan.roupa) ? (["cor", "detalhe", "terceira"] as const) : (["cor", "detalhe"] as const)).map((key) => (
                <div key={key} className="space-y-2">
                  <p className="text-[14px] text-muted">
                    {key === "cor" ? text.groups.color : key === "detalhe" ? text.groups.detail : text.groups.third}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {T.CORES.map((color) => (
                      <button
                        key={color}
                        aria-label={color}
                        aria-pressed={fan[key] === color}
                        onClick={() => change({ [key]: color })}
                        className={cn(
                          "h-8 w-8 rounded-sm border-2 transition-transform hover:scale-110",
                          fan[key] === color ? "border-klein ring-2 ring-klein/40" : "border-navy/20",
                        )}
                        style={{ background: color }}
                      />
                    ))}
                    {S && (
                      <FreeColor
                        value={fan[key]}
                        onChange={(color) => change({ [key]: color })}
                        locked={(stats?.sigma ?? 0) < S.COR_LIVRE}
                        unlocksAt={`${S.ranque(S.COR_LIVRE, LOCALE).nome} (${S.COR_LIVRE} Σ)`}
                        palette={T.CORES}
                      />
                    )}
                  </div>
                </div>
              ))}
            </Group>

            {options.map(({ key, title, list }) => (
              <Group key={key} title={title}>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {list(T).map((id) => (
                    <button key={id} aria-pressed={fan[key] === id} onClick={() => change({ [key]: id })} className={tile(fan[key] === id)}>
                      <FanView T={T} fan={T.normalizar({ ...fan, [key]: id }, login)} className="h-[54px] w-9" />
                      {optionName(key, id)}
                    </button>
                  ))}
                </div>
                {key === "roupa" && fan.roupa === "numero" && (
                  <label className="flex items-center gap-3 text-[14px] text-muted">
                    {text.groups.number}
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={fan.numero}
                      onChange={(e) => change({ numero: Math.max(0, Math.min(99, Math.trunc(Number(e.target.value) || 0))) })}
                      className="w-20 rounded-sm border border-line bg-paper px-2 py-1 text-ink"
                    />
                  </label>
                )}
              </Group>
            ))}

            <Group title={text.groups.celebration} hint={text.groups.celebrationHint}>
              <div className="flex flex-wrap gap-2">
                {T.COMEMORACOES.map((id) => (
                  <button
                    key={id}
                    aria-pressed={fan.comemoracao === id}
                    onClick={() => play("goal", id)}
                    className={cn(tile(fan.comemoracao === id), "px-4 py-2")}
                  >
                    {optionName("comemoracao", id)}
                  </button>
                ))}
              </div>
            </Group>

            <Group title={text.groups.phrase} hint={text.groups.phraseHint}>
              <div className="flex items-center gap-3">
                <input
                  value={fan.frase}
                  maxLength={T.FRASE_MAX}
                  onChange={(e) => change({ frase: e.target.value })}
                  onBlur={() => fan.frase && play("arrive")}
                  className="w-full max-w-sm rounded-sm border border-line bg-paper px-3 py-2 text-ink"
                />
                <span className="text-[13px] tabular-nums text-muted">
                  {Array.from(fan.frase).length}/{T.FRASE_MAX}
                </span>
              </div>
            </Group>

            <Group title={text.groups.stickers} hint={text.groups.stickersHint}>
              {(["gol", "contra"] as const).map((when) => (
                <div key={when} className="space-y-2">
                  <p className="text-[14px] text-ink">
                    {when === "gol" ? text.groups.onGoal : text.groups.onAgainst}{" "}
                    <span className="text-[20px]">{fan.stickers[when].join(" ")}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {T.STICKERS.map((emoji) => (
                      <button
                        key={emoji}
                        aria-pressed={fan.stickers[when].includes(emoji)}
                        onClick={() => toggleSticker(when, emoji)}
                        className={cn(
                          "h-10 w-10 rounded-sm text-[22px] transition-colors",
                          fan.stickers[when].includes(emoji) ? "bg-klein/15 ring-2 ring-klein" : "hover:bg-paper",
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                    <input
                      aria-label={text.groups.otherEmoji}
                      placeholder={text.groups.otherEmoji}
                      value={other[when]}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        if (T.umEmoji(value)) {
                          toggleSticker(when, value)
                          setOther({ ...other, [when]: "" })
                        } else setOther({ ...other, [when]: value })
                      }}
                      className="h-10 w-32 rounded-sm border border-line bg-paper px-2 text-[14px] text-ink"
                    />
                  </div>
                </div>
              ))}
            </Group>

            <div className="sticky bottom-0 -mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-ground/90 px-2 py-4 backdrop-blur">
              {canSave && (
                <button
                  onClick={save}
                  disabled={status === "saving" || (Boolean(token) && !dirty)}
                  className="rounded-sm bg-klein px-5 py-2 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {status === "saving" ? text.saving : token ? text.save : text.signIn}
                </button>
              )}
              <p className="text-[14px] text-muted" aria-live="polite">
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
              <div className="ml-auto flex gap-4 text-[14px]">
                <button onClick={() => change(T.padrao(login))} className="text-muted underline underline-offset-2 hover:text-klein">
                  {text.reset}
                </button>
                {token && saved && (
                  <button onClick={erase} className="text-muted underline underline-offset-2 hover:text-klein">
                    {confirmErase ? text.confirmErase : text.erase}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
