"use client"

import { ArrowRight, Copy, MessageSquare, Mic, Music, PenLine, Square } from "lucide-react"
import Script from "next/script"
import qrcode from "qrcode-generator"
import { useEffect, useRef, useState } from "react"
import { TwitchIcon } from "@/components/site/brand-icons"
import { PageIntro } from "@/components/site/page-intro"
import { PresentPicker, PresentView } from "@/components/site/pix/christmas"
import { GoalBar } from "@/components/site/pix/goal-bar"
import { VoicePicker } from "@/components/site/pix/voice-picker"
import { Torcedor3D } from "@/components/site/fan/torcedor-3d"
import { Button, Card, CardLink, Choice, Choices, ErrorLine, Field, Input, Skeleton, Textarea, buttonClass } from "@/components/site/ui"
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
  type Present,
  type PresentKit,
  type Reservation,
  type SongStatus,
} from "@/lib/pix"
import { canSave, keptToken, loadMine, signIn, signOut, SignedOut, type SavedFan as Look } from "@/lib/profile"
import { localize, MURAL_SLUG, PIX_SLUG } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const text = localize(pix)
const of = localize(muralCopy.of)
const PRESETS = [100, 500, 1000, 2000]
const SONG_PRESETS = [500, 1000, 2000]
// A recording: up to a minute, in Opus at 32 kb/s (~240 KB). The API takes ~270 KB (MAX_AUDIO in infra/pix): a browser
// whose codec runs fatter stops at MAX_BYTES, checked every half second, before it gets there.
const MAX_SECONDS = 60
const BITRATE = 32_000
const MAX_BYTES = 250_000
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
  /** The present on the Christmas goal's tree, once presente.js picked the first one. */
  presente: Present | null
}
interface Recording {
  blob: Blob
  url: string
  seconds: number
  /** Stopped at MAX_BYTES rather than by the viewer or the minute. */
  full: boolean
}

/** A counter under a field: "12/200". */
function Count({ n, max }: { n: number; max: number }) {
  return (
    <p className="text-right text-[13px] tabular-nums text-muted">
      {n}/{max}
    </p>
  )
}

/** Something on its way (the Pix, the song): a dot that breathes while it waits, then the line. */
function Waiting({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[15px] text-ink">
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-klein motion-safe:animate-pulse" />
      {children}
    </p>
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
  presente: null,
}

/** "21h30", "21h": times as brand/voz.md writes them. */
const hour = (t: number) => {
  const d = new Date(t)
  return `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, "0") : ""}`
}

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
  // The goal on /pix is a nicety: a skeleton while it loads, nothing if it can't (the form is what the page is for).
  const [goalLoaded, setGoalLoaded] = useState(false)
  const [look, setLook] = useState<Look | null>(null)
  const [P, setP] = useState<PresentKit | null>(null)
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
  // A Christmas goal on screen: each Pix hangs a present on its tree.
  const natal = goal?.tema === "natal"

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
    if (!PIX_API) return
    loadMural()
      .then((m) => setGoal(m.meta), () => setGoal(null))
      .finally(() => setGoalLoaded(true))
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
    const r = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: BITRATE })
    const chunks: Blob[] = []
    let bytes = 0
    let full = false
    const started = Date.now()
    const timer = setInterval(() => {
      const s = (Date.now() - started) / 1000
      setRecordingNow(s)
      if (s >= MAX_SECONDS && r.state === "recording") r.stop()
    }, 200)
    r.ondataavailable = (e) => {
      chunks.push(e.data)
      bytes += e.data.size
      if (bytes >= MAX_BYTES && r.state === "recording") {
        full = true
        r.stop()
      }
    }
    r.onstop = () => {
      clearInterval(timer)
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: r.mimeType })
      setRecording((old) => {
        if (old) URL.revokeObjectURL(old.url)
        return { blob, url: URL.createObjectURL(blob), seconds: Math.min(MAX_SECONDS, (Date.now() - started) / 1000), full }
      })
      recorder.current = null
      setRecordingNow(0)
    }
    recorder.current = r
    setRecordingNow(0.01)
    r.start(500)
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
      if (natal && draft.presente) order.presente = draft.presente
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

  const amount = Number.isInteger(centavos) && centavos > 0 ? ` · R$ ${reais(centavos)}` : ""
  const ready = !busy && (isSong ? Boolean(songText) : !recordingNow && (draft.modo === "texto" || Boolean(recording)))
  const voice = voices.some((v) => v.id === draft.voz) ? draft.voz : voices[0].id
  const icon = "h-4 w-4"
  const h2 = "text-2xl font-medium tracking-[-0.02em] text-klein"

  return (
    <div>
      {natal && (
        <Script
          src="/stream/presente.js"
          onReady={() => {
            const kit = window.Presente ?? null
            setP(kit)
            // A present to start from, different for each visit: whoever doesn't choose sends this one.
            if (kit) setDraft((d) => (d.presente ? d : { ...d, presente: kit.normalizar(null, String(Date.now())) }))
          }}
        />
      )}
      <PageIntro title={text.title} description={text.description} />

      <div className="mt-12 max-w-[34rem] space-y-10">
        {!PIX_API ? (
          <p className="text-[15px] text-muted">{text.soon}</p>
        ) : step === "form" ? (
          <>
            {!goalLoaded ? (
              <Skeleton className="cut h-[116px]" />
            ) : (
              goal && (
                <CardLink href={`/${MURAL_SLUG}`} className="space-y-3">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="eyebrow text-klein">{text.goal}</span>
                    <span className="inline-flex items-center gap-1 text-[13px] text-muted">
                      {text.muralSee}
                      <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="block text-xl font-medium tracking-[-0.02em] text-ink">{goal.titulo}</span>
                  <GoalBar goal={goal} of={of} when />
                </CardLink>
              )
            )}

            <form onSubmit={submit} className="space-y-8">
              <Choices label={text.kind}>
                <div className="grid gap-2 sm:flex sm:flex-wrap">
                  <Choice on={!isSong} onClick={() => change({ tipo: "mensagem" })} icon={<MessageSquare aria-hidden className={icon} />}>
                    {text.kindMessage}
                  </Choice>
                  <Choice
                    on={isSong}
                    onClick={() => change({ tipo: "musica", quando: "entre", preset: draft.preset !== null && draft.preset < MINIMO_MUSICA ? MINIMO_MUSICA : draft.preset })}
                    icon={<Music aria-hidden className={icon} />}
                  >
                    {text.kindSong} <span className={cn("font-normal", isSong ? "text-paper/80" : "text-muted")}>· {text.kindSongPrice}</span>
                  </Choice>
                </div>
              </Choices>

              <Field label={text.name}>
                <Input value={draft.nome} maxLength={25} autoComplete="nickname" placeholder={text.namePlaceholder} onChange={(e) => change({ nome: e.target.value })} />
              </Field>

              {isSong ? (
                <>
                  <Choices label={text.style}>
                    <div className="flex flex-wrap gap-2">
                      {STYLES.map((s) => (
                        <Choice key={s.id} on={draft.estilo === s.id} onClick={() => change({ estilo: s.id })}>
                          {s.name}
                        </Choice>
                      ))}
                    </div>
                  </Choices>

                  <Choices label={text.lyrics} hint={text.songHint} error={songError || undefined}>
                    <div className="flex flex-wrap gap-2">
                      {(["sobre", "letra"] as const).map((modoLetra) => (
                        <Choice key={modoLetra} on={draft.modoLetra === modoLetra} onClick={() => change({ modoLetra })}>
                          {modoLetra === "sobre" ? text.about : text.writeLyrics}
                        </Choice>
                      ))}
                    </div>
                    {draft.modoLetra === "sobre" ? (
                      <>
                        <Input aria-label={text.about} value={draft.sobre} maxLength={SOBRE_MAX} placeholder={text.aboutPlaceholder} onChange={(e) => change({ sobre: e.target.value })} />
                        <Count n={draft.sobre.length} max={SOBRE_MAX} />
                      </>
                    ) : (
                      <>
                        <Textarea aria-label={text.writeLyrics} value={draft.letra} maxLength={LETRA_MAX} rows={7} placeholder={text.lyricsPlaceholder} onChange={(e) => change({ letra: e.target.value })} />
                        <Count n={draft.letra.length} max={LETRA_MAX} />
                      </>
                    )}
                  </Choices>
                </>
              ) : (
                <>
                  <Choices
                    label={text.message}
                    hint={draft.modo === "audio" ? (recording?.full ? text.recordFull : text.recordLimit) : undefined}
                    error={draft.modo === "audio" && recordError ? text.recordDenied : undefined}
                  >
                    <div className="flex flex-wrap gap-2">
                      {(["texto", "audio"] as const).map((modo) => (
                        <Choice
                          key={modo}
                          on={draft.modo === modo}
                          onClick={() => change({ modo, voz: VOICES.find((v) => (modo === "texto" ? v.text : v.recording))!.id })}
                          icon={modo === "texto" ? <PenLine aria-hidden className={icon} /> : <Mic aria-hidden className={icon} />}
                        >
                          {modo === "texto" ? text.write : text.record}
                        </Choice>
                      ))}
                    </div>
                    {draft.modo === "texto" ? (
                      <>
                        <Textarea aria-label={text.message} value={draft.mensagem} maxLength={200} rows={3} placeholder={text.messagePlaceholder} onChange={(e) => change({ mensagem: e.target.value })} />
                        <Count n={draft.mensagem.length} max={200} />
                      </>
                    ) : (
                      <div className="cut cut-edge relative space-y-3 border border-line bg-paper/70 p-4">
                        {recordingNow ? (
                          <>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <Button onClick={() => recorder.current?.stop()} icon={<Square aria-hidden className="h-3.5 w-3.5 fill-current" />}>
                                {text.recordStop}
                              </Button>
                              <span className="flex items-center gap-2 text-[15px] tabular-nums text-ink" aria-live="polite">
                                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-loss motion-safe:animate-pulse" />
                                {text.recording} · {clock(Math.floor(recordingNow) * 1000)} / {clock(MAX_SECONDS * 1000)}
                              </span>
                            </div>
                            <div aria-hidden className="h-1.5 bg-klein/12">
                              <div className="h-full bg-klein" style={{ width: `${Math.min(100, (recordingNow / MAX_SECONDS) * 100)}%` }} />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <Button variant={recording ? "secondary" : "primary"} onClick={startRecording} icon={<Mic aria-hidden className={icon} />}>
                              {recording ? text.recordAgain : text.recordStart}
                            </Button>
                            {recording && <audio src={recording.url} controls className="h-10 w-full sm:w-auto sm:min-w-0 sm:flex-1" />}
                          </div>
                        )}
                      </div>
                    )}
                  </Choices>

                  <Choices label={text.voice} hint={draft.modo === "texto" ? text.voiceHint : text.voiceRecordingHint}>
                    <VoicePicker label={text.voice} voices={voices} value={voice} onChange={(voz) => change({ voz })} />
                  </Choices>
                </>
              )}

              {natal && P && draft.presente && (
                <Choices label={text.present} hint={text.presentHint}>
                  <PresentPicker kit={P} value={draft.presente} onChange={(presente) => change({ presente })} />
                </Choices>
              )}

              <Choices label={text.amount}>
                <div className="flex flex-wrap gap-2">
                  {(isSong ? SONG_PRESETS : PRESETS).map((c) => (
                    <Choice key={c} on={draft.preset === c} onClick={() => change({ preset: c })} className="min-w-16 tabular-nums">
                      R$ {c / 100}
                    </Choice>
                  ))}
                  <Input
                    aria-label={text.other}
                    inputMode="decimal"
                    placeholder={`${text.other}: ${text.otherPlaceholder}`}
                    value={draft.outro}
                    onFocus={() => change({ preset: null })}
                    onChange={(e) => change({ outro: e.target.value, preset: null })}
                    boxClassName={cn("min-w-40 flex-1", draft.preset === null && "border-klein")}
                  />
                </div>
              </Choices>

              <Choices label={text.when} hint={draft.quando === "entre" ? text.betweenHint : undefined}>
                <div className="flex flex-wrap gap-2">
                  {(["agora", "entre"] as const).map((quando) => (
                    <Choice key={quando} on={draft.quando === quando} onClick={() => change({ quando })}>
                      {quando === "agora" ? text.now : text.between}
                    </Choice>
                  ))}
                </div>
              </Choices>

              {/* Every Pix goes on the mural by the name and message above; Twitch adds the sender's fan and their Σ. */}
              <div className="space-y-3">
                <Card className="flex items-start gap-4">
                  <span className="flex w-12 shrink-0 justify-center">
                    {login ? (
                      <Torcedor3D aparencia={look} login={login} className="h-[72px] w-12" />
                    ) : (
                      <span aria-hidden className="mt-0.5 grid h-12 w-12 place-items-center rounded-full bg-klein/10 text-xl font-medium text-klein">
                        {(draft.nome || "?").trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="text-[17px] font-medium text-klein">{text.muralTitle}</p>
                      <p className="text-[15px] leading-[1.6] text-ink">
                        {text.muralNote} {!login && canSave && text.muralFan}
                      </p>
                    </div>
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
                          <button type="button" onClick={leave} className={cn(buttonClass({ variant: "quiet", size: "sm" }), "ml-1 text-muted")}>
                            {text.signOut}
                          </button>
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <Button size="sm" onClick={goSignIn} icon={<TwitchIcon className={icon} />}>
                            {text.sigmaSignIn}
                          </Button>
                          <p className="text-[13px] text-muted">{text.sigmaNote}</p>
                        </div>
                      ))}
                  </div>
                </Card>
                <a href={`/${MURAL_SLUG}`} target="_blank" className={buttonClass({ variant: "quiet", size: "sm" })}>
                  {text.muralSee}
                  <ArrowRight aria-hidden className={icon} />
                </a>
              </div>

              <div className="space-y-3">
                <Button type="submit" disabled={!ready} className="min-h-11 w-full sm:w-auto sm:px-6">
                  {busy ? text.generating : `${text.generate}${amount}`}
                </Button>
                {error && <ErrorLine>{error}</ErrorLine>}
              </div>
            </form>
          </>
        ) : step === "done" ? (
          <Card className="space-y-4">
            {song?.estado === "recusada" ? (
              <form onSubmit={resend} className="space-y-4">
                <h2 className={h2}>{text.songRefused}</h2>
                {song.motivo && <p className="text-[15px] leading-[1.6] text-ink">{song.motivo}</p>}
                <Field
                  label={song.letra ? text.writeLyrics : text.about}
                  hint={song.edicoes !== undefined && song.ate ? text.songTries.replace("{n}", String(song.edicoes)).replace("{hora}", hour(song.ate)) : undefined}
                  error={songError || undefined}
                >
                  {song.letra ? (
                    <Textarea value={retry} maxLength={LETRA_MAX} rows={7} onChange={(e) => setRetry(e.target.value)} />
                  ) : (
                    <Input value={retry} maxLength={SOBRE_MAX} onChange={(e) => setRetry(e.target.value)} />
                  )}
                </Field>
                <Button type="submit" disabled={retrying || !retry.trim()} className="min-h-11 w-full sm:w-auto sm:px-6">
                  {retrying ? text.songRetrying : text.songRetry}
                </Button>
              </form>
            ) : (
              <>
                <h2 className={h2}>{text.doneTitle}</h2>
                {natal && P && draft.presente && (
                  <div className="cut flex items-center gap-4 bg-navy px-4 py-3">
                    <PresentView kit={P} present={draft.presente} className="h-14 w-14 shrink-0" />
                    <p className="text-[15px] text-paper">
                      {text.presentDone}{" "}
                      <a href={`/${MURAL_SLUG}`} className="font-medium text-klein-claro underline underline-offset-4">
                        {text.presentSee}
                      </a>
                    </p>
                  </div>
                )}
                {!song ? (
                  <p className="text-[15px] text-ink">{text.doneNote}</p>
                ) : song.estado === "pronta" ? (
                  <div className="space-y-2">
                    <p className="text-[15px] text-ink">{text.songReady}</p>
                    <p className="text-[15px] text-ink">{text.songReadyNote}</p>
                    <a href={`/${MURAL_SLUG}`} className={buttonClass({ variant: "quiet", size: "sm" })}>
                      {text.muralSee}
                      <ArrowRight aria-hidden className={icon} />
                    </a>
                  </div>
                ) : song.estado === "falhou" ? (
                  <p className="text-[15px] leading-[1.6] text-ink">{text.songFailed}</p>
                ) : (
                  <div className="space-y-1">
                    <Waiting>{text.songMaking}</Waiting>
                    <p className="pl-5 text-[13px] text-muted">{text.songMakingNote}</p>
                  </div>
                )}
              </>
            )}
            <Button variant="secondary" onClick={again}>
              {text.again}
            </Button>
          </Card>
        ) : (
          reservation && (
            <section className="space-y-6">
              <h2 className={h2}>{step === "late" ? text.lateTitle : text.payTitle}</h2>
              {step === "late" ? (
                <p className="text-[15px] leading-[1.6] text-ink">{text.lateNote}</p>
              ) : (
                <Card className="space-y-5">
                  <div className="mx-auto w-full max-w-64 bg-paper [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label={text.qr} dangerouslySetInnerHTML={{ __html: qr }} />
                  <div className="text-center">
                    <p className="text-4xl font-medium tracking-[-0.03em] text-ink tabular-nums">R$ {reais(reservation.centavos)}</p>
                    <p className="mt-1 text-[13px] text-muted tabular-nums">
                      {text.validFor} {clock(reservation.expira - now)}
                    </p>
                  </div>
                  <p className="text-[15px] leading-[1.6] text-ink">{text.payNote}</p>
                  <Button full onClick={copy} icon={<Copy aria-hidden className={icon} />} className="min-h-11">
                    {copied ? text.copied : text.copy}
                  </Button>
                  <Textarea
                    readOnly
                    aria-label={text.code}
                    value={reservation.brcode}
                    rows={3}
                    onFocus={(e) => e.target.select()}
                    className="resize-none break-all font-mono text-[13px] sm:text-[13px]"
                  />
                </Card>
              )}
              <Waiting>{text.waiting}</Waiting>
              {step === "late" && (
                <Button variant="secondary" onClick={again}>
                  {text.again}
                </Button>
              )}
            </section>
          )
        )}
      </div>
    </div>
  )
}
