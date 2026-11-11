"use client"

import Script from "next/script"
import qrcode from "qrcode-generator"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { GoalBar } from "@/components/site/pix/goal-bar"
import { VoicePicker } from "@/components/site/pix/voice-picker"
import { FanView } from "@/components/site/profile/fan-view"
import { mural as muralCopy, pix, STYLES, VOICES } from "@/content/pix"
import {
  centavosDe,
  editSong,
  LETRA_MAX,
  loadMural,
  MINIMO,
  MINIMO_MUSICA,
  PIX_API,
  PixError,
  reais,
  reservationStatus,
  reserve,
  SOBRE_MAX,
  type Goal,
  type Order,
  type Reservation,
  type SongStatus,
} from "@/lib/pix"
import { canSave, keptToken, loadMine, signIn, signOut, SignedOut, type Choice, type Torcedor } from "@/lib/profile"
import { localize, MURAL_SLUG, PIX_SLUG } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const text = localize(pix)
const of = localize(muralCopy.of)
const PRESETS = [100, 500, 1000, 2000]
const SONG_PRESETS = [500, 1000, 2000]
const MAX_SECONDS = 15
const DRAFT_KEY = "pix:rascunho"

type Step = "form" | "pay" | "done" | "late"
type Mode = "texto" | "audio"
interface Draft {
  tipo: "mensagem" | "musica"
  nome: string
  mensagem: string
  modo: Mode
  voz: string
  preset: number | null
  outro: string
  quando: "agora" | "entre"
  estilo: string
  modoLetra: "sobre" | "letra"
  sobre: string
  letra: string
}
interface Recording {
  blob: Blob
  url: string
  seconds: number
}

const field = "w-full rounded-sm border border-line bg-paper px-3 py-2 text-[16px] text-ink"
const choice = (on: boolean) =>
  cn(
    "rounded-sm border px-3 py-2 text-[15px] transition-colors",
    on ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein/60",
  )

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-klein">{label}</p>
      {children}
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  )
}

const blank: Draft = {
  tipo: "mensagem",
  nome: "",
  mensagem: "",
  modo: "texto",
  voz: "antonio",
  preset: 500,
  outro: "",
  quando: "agora",
  estilo: STYLES[0].id,
  modoLetra: "sobre",
  sobre: "",
  letra: "",
}

const hour = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

/** A song's new state; on its way into a refusal, the text the viewer wrote comes back to the field to change. */
function nextSong(next: SongStatus, before: { current: SongStatus | null }, setSong: (s: SongStatus) => void, setRetry: (t: string) => void) {
  if (next.estado === "recusada" && before.current?.estado !== "recusada") setRetry(next.letra ?? next.sobre ?? "")
  before.current = next
  setSong(next)
}

function readDraft(): Draft {
  try {
    const kept = sessionStorage.getItem(DRAFT_KEY)
    sessionStorage.removeItem(DRAFT_KEY)
    return kept ? { ...blank, ...JSON.parse(kept) } : blank
  } catch {
    return blank
  }
}

function base64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function PixPage() {
  const [draft, setDraft] = useState<Draft>(blank)
  const [token, setToken] = useState<string | null>(null)
  const [login, setLogin] = useState("")
  const [recording, setRecording] = useState<Recording | null>(null)
  const [recordingNow, setRecordingNow] = useState(0)
  const [recordError, setRecordError] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [now, setNow] = useState(0)
  const [copied, setCopied] = useState(false)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [T, setT] = useState<Torcedor | null>(null)
  const [look, setLook] = useState<Choice | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  // The song of the Pix being paid (null for a message): its state on the way, and a refused one's new text.
  const [song, setSong] = useState<SongStatus | null>(null)
  const songRef = useRef<SongStatus | null>(null)
  const [songError, setSongError] = useState("")
  const [retry, setRetry] = useState("")
  const [retrying, setRetrying] = useState(false)

  const change = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const isSong = draft.tipo === "musica"
  const songText = draft.modoLetra === "sobre" ? draft.sobre.trim() : draft.letra.trim()
  const songState = song?.estado
  const centavos = draft.preset ?? centavosDe(draft.outro)
  const voices = VOICES.filter((v) => (draft.modo === "texto" ? v.text : v.recording))

  // The form kept from before going to Twitch, and whoever is signed in.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage only exists in the browser
    setDraft(readDraft())
    const found = canSave ? keptToken() : null
    if (!found) return
    setToken(found)
    loadMine(found)
      .then(({ login, aparencia }) => {
        setLogin(login)
        setLook(aparencia)
      })
      .catch((e) => {
        if (e instanceof SignedOut) setToken(null)
      })
  }, [])

  useEffect(() => {
    if (PIX_API) loadMural().then((m) => setGoal(m.meta), () => {})
  }, [step])

  // While paying: the countdown, and the reservation's status every 2 s until it's paid or past its grace.
  useEffect(() => {
    if (!reservation || (step !== "pay" && step !== "late")) return
    const tick = setInterval(() => setNow(Date.now()), 1000)
    const watch = setInterval(async () => {
      const status = await reservationStatus(reservation.id).catch(() => null)
      if (!status) return
      if (status.musica) nextSong(status.musica, songRef, setSong, setRetry)
      if (status.pago) setStep("done")
      else if (Date.now() > status.expira) setStep("late")
      if (status.pago || Date.now() > status.ate) clearInterval(watch)
    }, 2000)
    return () => {
      clearInterval(tick)
      clearInterval(watch)
    }
  }, [reservation, step])

  // Once paid, the song: every 3 s until it's made or given up (a refusal waits for its new text, or for time to run out).
  useEffect(() => {
    if (step !== "done" || !reservation || !songState || songState === "pronta" || songState === "falhou") return
    const watch = setInterval(async () => {
      const status = await reservationStatus(reservation.id).catch(() => null)
      if (status?.musica) nextSong(status.musica, songRef, setSong, setRetry)
    }, 3000)
    return () => clearInterval(watch)
  }, [step, reservation, songState])

  async function resend(e: React.FormEvent) {
    e.preventDefault()
    if (!reservation || !song) return
    setRetrying(true)
    setSongError("")
    try {
      nextSong(await editSong(reservation.id, song.letra ? { letra: retry } : { sobre: retry }), songRef, setSong, setRetry)
    } catch (err) {
      setSongError(err instanceof Error && err.message && !/^\d+$/.test(err.message) ? err.message : text.error)
    } finally {
      setRetrying(false)
    }
  }

  function goSignIn() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {}
    signIn(null, `/${PIX_SLUG}`)
  }

  function leave() {
    signOut()
    setToken(null)
    setLogin("")
    setLook(null)
  }

  async function startRecording() {
    setRecordError(false)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setRecordError(true)
      return
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t))
    const r = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 })
    const chunks: Blob[] = []
    const started = Date.now()
    const timer = setInterval(() => {
      const s = (Date.now() - started) / 1000
      setRecordingNow(s)
      if (s >= MAX_SECONDS) r.stop()
    }, 200)
    r.ondataavailable = (e) => chunks.push(e.data)
    r.onstop = () => {
      clearInterval(timer)
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: r.mimeType })
      setRecording((old) => {
        if (old) URL.revokeObjectURL(old.url)
        return { blob, url: URL.createObjectURL(blob), seconds: Math.min(MAX_SECONDS, (Date.now() - started) / 1000) }
      })
      recorder.current = null
      setRecordingNow(0)
    }
    recorder.current = r
    setRecordingNow(0.01)
    r.start()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!Number.isInteger(centavos) || centavos < (isSong ? MINIMO_MUSICA : MINIMO)) {
      setError(isSong ? text.songMinimum : text.minimum)
      return
    }
    setBusy(true)
    setError("")
    setSongError("")
    try {
      const order: Order = isSong
        ? { centavos, nome: draft.nome, mensagem: "", voz: "antonio", quando: draft.quando, musica: draft.modoLetra === "sobre" ? { estilo: draft.estilo, sobre: songText } : { estilo: draft.estilo, letra: songText } }
        : {
            centavos,
            nome: draft.nome,
            mensagem: draft.modo === "texto" ? draft.mensagem : "",
            voz: voices.some((v) => v.id === draft.voz) ? draft.voz : voices[0].id,
            quando: draft.quando,
          }
      if (!isSong && draft.modo === "audio" && recording) order.audio = { tipo: recording.blob.type, dados: await base64(recording.blob) }
      const r = await reserve(order, login ? token : null)
      songRef.current = isSong ? { estado: "esperando" } : null
      setSong(songRef.current)
      setReservation(r)
      setNow(r.expira - 15 * 60_000) // the server's clock: when it was reserved
      setStep("pay")
      scrollTo({ top: 0 })
    } catch (err) {
      const message = err instanceof Error && err.message && !/^\d+$/.test(err.message) ? err.message : text.error
      if (err instanceof PixError && err.campo === "musica") setSongError(message)
      else setError(message)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!reservation) return
    await navigator.clipboard.writeText(reservation.brcode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function again() {
    setReservation(null)
    setStep("form")
    setDraft((d) => ({ ...d, mensagem: "", sobre: "", letra: "" }))
    setRecording(null)
    songRef.current = null
    setSong(null)
    setRetry("")
    setSongError("")
  }

  const qr = (() => {
    if (!reservation) return ""
    const q = qrcode(0, "M")
    q.addData(reservation.brcode)
    q.make()
    return q.createSvgTag({ cellSize: 8, margin: 2, scalable: true })
  })()

  return (
    <div className="space-y-10">
      {/* The fan from the stream's crowd, for the mural's preview; React hoists the stylesheet into the head. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <PageIntro title={text.title} description={text.description} />

      {PIX_API && goal && step === "form" && (
        <a href={`/${MURAL_SLUG}`} className="block max-w-[34rem] space-y-2 rounded-md border border-line bg-paper/70 px-4 py-3 transition-colors hover:border-klein/60">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-klein">
            {text.goal}: {goal.titulo}
          </p>
          <GoalBar goal={goal} of={of} />
        </a>
      )}

      {!PIX_API ? (
        <p className="text-[15px] text-muted">{text.soon}</p>
      ) : step === "form" ? (
        <form onSubmit={submit} className="max-w-[34rem] space-y-7">
          <Field label={text.kind}>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!isSong} onClick={() => change({ tipo: "mensagem" })} className={choice(!isSong)}>
                {text.kindMessage}
              </button>
              <button
                type="button"
                aria-pressed={isSong}
                onClick={() => change({ tipo: "musica", quando: "entre", preset: draft.preset !== null && draft.preset < MINIMO_MUSICA ? MINIMO_MUSICA : draft.preset })}
                className={choice(isSong)}
              >
                ♪ {text.kindSong} <span className={isSong ? "text-paper/75" : "text-muted"}>· {text.kindSongPrice}</span>
              </button>
            </div>
          </Field>

          <Field label={text.name}>
            <input value={draft.nome} maxLength={25} autoComplete="nickname" placeholder={text.namePlaceholder} onChange={(e) => change({ nome: e.target.value })} className={field} />
          </Field>

          {isSong ? (
            <>
              <Field label={text.style}>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button key={s.id} type="button" aria-pressed={draft.estilo === s.id} onClick={() => change({ estilo: s.id })} className={choice(draft.estilo === s.id)}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={text.lyrics} hint={text.songHint}>
                <div className="flex flex-wrap gap-2">
                  {(["sobre", "letra"] as const).map((modoLetra) => (
                    <button key={modoLetra} type="button" aria-pressed={draft.modoLetra === modoLetra} onClick={() => change({ modoLetra })} className={choice(draft.modoLetra === modoLetra)}>
                      {modoLetra === "sobre" ? text.about : text.writeLyrics}
                    </button>
                  ))}
                </div>
                {draft.modoLetra === "sobre" ? (
                  <>
                    <input value={draft.sobre} maxLength={SOBRE_MAX} placeholder={text.aboutPlaceholder} onChange={(e) => change({ sobre: e.target.value })} className={field} />
                    <p className="text-right text-[13px] tabular-nums text-muted">
                      {draft.sobre.length}/{SOBRE_MAX}
                    </p>
                  </>
                ) : (
                  <>
                    <textarea value={draft.letra} maxLength={LETRA_MAX} rows={7} placeholder={text.lyricsPlaceholder} onChange={(e) => change({ letra: e.target.value })} className={cn(field, "resize-y")} />
                    <p className="text-right text-[13px] tabular-nums text-muted">
                      {draft.letra.length}/{LETRA_MAX}
                    </p>
                  </>
                )}
                {songError && <p className="text-[15px] text-[#c0392b]">{songError}</p>}
              </Field>
            </>
          ) : (
            <>
              <Field label={text.message}>
                <div className="flex gap-2">
                  {(["texto", "audio"] as const).map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      aria-pressed={draft.modo === modo}
                      onClick={() => change({ modo, voz: VOICES.find((v) => (modo === "texto" ? v.text : v.recording))!.id })}
                      className={choice(draft.modo === modo)}
                    >
                      {modo === "texto" ? text.write : text.record}
                    </button>
                  ))}
                </div>
                {draft.modo === "texto" ? (
                  <>
                    <textarea value={draft.mensagem} maxLength={200} rows={3} placeholder={text.messagePlaceholder} onChange={(e) => change({ mensagem: e.target.value })} className={cn(field, "resize-y")} />
                    <p className="text-right text-[13px] tabular-nums text-muted">{draft.mensagem.length}/200</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {recordingNow ? (
                        <button type="button" onClick={() => recorder.current?.stop()} className={choice(true)}>
                          ■ {text.recordStop} · {Math.floor(recordingNow)}s / {MAX_SECONDS}s
                        </button>
                      ) : (
                        <button type="button" onClick={startRecording} className={choice(false)}>
                          ● {recording ? text.recordAgain : text.recordStart}
                        </button>
                      )}
                      {recording && !recordingNow && (
                        <audio src={recording.url} controls className="h-9 max-w-full" />
                      )}
                    </div>
                    <p className="text-[13px] text-muted">{recordError ? text.recordDenied : text.recordLimit}</p>
                  </div>
                )}
              </Field>

              <Field label={text.voice} hint={draft.modo === "texto" ? text.voiceHint : text.voiceRecordingHint}>
                <VoicePicker voices={voices} value={voices.some((v) => v.id === draft.voz) ? draft.voz : voices[0].id} onChange={(voz) => change({ voz })} />
              </Field>
            </>
          )}

          <Field label={text.amount}>
            <div className="flex flex-wrap gap-2">
              {(isSong ? SONG_PRESETS : PRESETS).map((c) => (
                <button key={c} type="button" aria-pressed={draft.preset === c} onClick={() => change({ preset: c })} className={cn(choice(draft.preset === c), "min-w-16")}>
                  R$ {c / 100}
                </button>
              ))}
              <input
                aria-label={text.other}
                inputMode="decimal"
                placeholder={`${text.other}: ${text.otherPlaceholder}`}
                value={draft.outro}
                onFocus={() => change({ preset: null })}
                onChange={(e) => change({ outro: e.target.value, preset: null })}
                className={cn(field, "w-40 flex-1", draft.preset === null && "border-klein")}
              />
            </div>
          </Field>

          <Field label={text.when} hint={draft.quando === "entre" ? text.betweenHint : undefined}>
            <div className="flex gap-2">
              {(["agora", "entre"] as const).map((quando) => (
                <button key={quando} type="button" aria-pressed={draft.quando === quando} onClick={() => change({ quando })} className={choice(draft.quando === quando)}>
                  {quando === "agora" ? text.now : text.between}
                </button>
              ))}
            </div>
          </Field>

          {/* Every Pix goes on the mural by the name and message above; Twitch adds the sender's fan and their Σ. */}
          <div className="space-y-2">
            <div className="flex items-start gap-4 rounded-md border-2 border-klein/40 bg-klein/[0.04] px-4 py-4">
              <span className="flex w-[76px] shrink-0 justify-start pl-1">
                {T && login ? (
                  <FanView T={T} fan={T.normalizar(look, login)} className="h-[72px] w-12" />
                ) : (
                  <span className="mt-1 grid h-12 w-12 place-items-center rounded-full bg-klein/10 text-[20px] font-medium text-klein">
                    {(draft.nome || "?").trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[18px] font-medium text-klein">{text.muralTitle}</p>
                <p className="text-[14px] leading-[1.5] text-ink">
                  {text.muralNote} {!login && canSave && text.muralFan}
                </p>
                {canSave &&
                  (token && login ? (
                    <p className="text-[15px] text-ink">
                      {text.sigmaSignedIn} <strong className="font-medium text-klein">{login}</strong>
                      {Number.isInteger(centavos) && centavos > 0 && login !== CHANNEL && (
                        <>
                          {" · "}
                          {text.sigmaGain} <strong className="font-medium text-klein tabular-nums">{Math.floor(centavos / 10).toLocaleString("pt-BR")} Σ</strong>
                        </>
                      )}{" "}
                      <button type="button" onClick={leave} className="text-muted underline underline-offset-2 hover:text-klein">
                        {text.signOut}
                      </button>
                    </p>
                  ) : (
                    <button type="button" onClick={goSignIn} className="rounded-sm bg-[#9146ff] px-4 py-2 text-[15px] font-medium text-white transition-opacity hover:opacity-90">
                      {text.sigmaSignIn}
                    </button>
                  ))}
                {canSave && <p className="text-[13px] text-muted">{text.sigmaNote}</p>}
              </div>
            </div>
            <a href={`/${MURAL_SLUG}`} target="_blank" className="inline-block text-[14px] text-muted underline underline-offset-2 hover:text-klein">
              {text.muralSee} →
            </a>
          </div>

          <div className="space-y-3">
            <button
              disabled={busy || (isSong ? !songText : Boolean(recordingNow) || (draft.modo === "audio" && !recording))}
              className="w-full rounded-sm bg-klein px-5 py-3 text-[17px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? text.generating : `${text.generate}${Number.isInteger(centavos) && centavos > 0 ? ` · R$ ${reais(centavos)}` : ""}`}
            </button>
            {error && <p className="text-[15px] text-[#c0392b]">{error}</p>}
          </div>
        </form>
      ) : step === "done" ? (
        <section className="max-w-[34rem] space-y-3 rounded-md border border-line bg-paper/70 px-5 py-5">
          {song?.estado === "recusada" ? (
            <form onSubmit={resend} className="space-y-3">
              <h2 className="text-2xl font-medium text-klein">{text.songRefused}</h2>
              {song.motivo && <p className="text-[15px] text-ink">{song.motivo}</p>}
              {song.letra ? (
                <textarea value={retry} maxLength={LETRA_MAX} rows={7} onChange={(e) => setRetry(e.target.value)} className={cn(field, "resize-y")} />
              ) : (
                <input value={retry} maxLength={SOBRE_MAX} onChange={(e) => setRetry(e.target.value)} className={field} />
              )}
              {songError && <p className="text-[15px] text-[#c0392b]">{songError}</p>}
              <button disabled={retrying || !retry.trim()} className="w-full rounded-sm bg-klein px-5 py-3 text-[17px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40">
                {retrying ? text.songRetrying : text.songRetry}
              </button>
              {song.edicoes !== undefined && song.ate && (
                <p className="text-[13px] text-muted">{text.songTries.replace("{n}", String(song.edicoes)).replace("{hora}", hour(song.ate))}</p>
              )}
            </form>
          ) : (
            <>
              <h2 className="text-2xl font-medium text-klein">{text.doneTitle}</h2>
              {!song ? (
                <p className="text-[15px] text-ink">{text.doneNote}</p>
              ) : song.estado === "pronta" ? (
                <>
                  <p className="text-[15px] text-ink">{text.songReady}</p>
                  <p className="text-[15px] text-ink">{text.songReadyNote}</p>
                  <a href={`/${MURAL_SLUG}`} className="inline-block text-[14px] text-muted underline underline-offset-2 hover:text-klein">
                    {text.muralSee} →
                  </a>
                </>
              ) : song.estado === "falhou" ? (
                <p className="text-[15px] text-ink">{text.songFailed}</p>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-[15px] text-ink">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-klein" />
                    {text.songMaking}
                  </p>
                  <p className="text-[13px] text-muted">{text.songMakingNote}</p>
                </>
              )}
            </>
          )}
          <button onClick={again} className={choice(false)}>
            {text.again}
          </button>
        </section>
      ) : (
        reservation && (
          <section className="max-w-[34rem] space-y-5">
            <h2 className="text-2xl font-medium text-klein">{step === "late" ? text.lateTitle : text.payTitle}</h2>
            {step === "late" ? (
              <p className="text-[15px] text-ink">{text.lateNote}</p>
            ) : (
              <>
                <div className="mx-auto max-w-72 rounded-md bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
                <p className="text-center text-4xl font-medium tracking-[-0.03em] text-ink tabular-nums">R$ {reais(reservation.centavos)}</p>
                <p className="text-[15px] leading-[1.6] text-ink">{text.payNote}</p>
                <p className="text-[14px] text-muted tabular-nums">
                  {text.validFor} {clock(reservation.expira - now)}
                </p>
                <textarea readOnly value={reservation.brcode} rows={3} onFocus={(e) => e.target.select()} className={cn(field, "break-all font-mono text-[12px]")} />
                <button onClick={copy} className="w-full rounded-sm bg-klein px-5 py-3 text-[17px] font-medium text-paper transition-opacity hover:opacity-90">
                  {copied ? text.copied : text.copy}
                </button>
              </>
            )}
            <p className="flex items-center gap-2 text-[15px] text-muted">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-klein" />
              {text.waiting}
            </p>
            {step === "late" && (
              <button onClick={again} className={choice(false)}>
                {text.again}
              </button>
            )}
          </section>
        )
      )}

    </div>
  )
}
