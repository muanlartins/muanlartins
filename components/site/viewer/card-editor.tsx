"use client"

import { ArrowRight, ImagePlus, Lock, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { ImageCropper } from "@/components/site/viewer/image-cropper"
import { ViewerCard } from "@/components/site/viewer/viewer-card"
import { profile } from "@/content/profile"
import { SignedOut, type Fan, type Sigma, type SigmaStats, type Torcedor } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import {
  ABOUT_MAX,
  CARD_GAMES,
  eraseMyImage,
  forgetLook,
  FREE_THEME,
  PRONOUNS_MAX,
  saveMyCard,
  saveMyImage,
  THEMES,
  viewerPath,
  type Card,
  type ImageKind,
  type Images,
} from "@/lib/viewer"
import { drawPicture, readPicture, type Crop } from "@/lib/viewer-images"

const text = localize(profile)
const label = "block text-[13px] font-medium uppercase tracking-[0.1em] text-muted"
const field = "w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-klein"
const small = "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors"

/**
 * Their profile on /perfil, Discord-style: the banner and the photo (pictures of their own, framed here and sent at
 * once), the colours (a theme, or two of their own once their Σ unlocks free colours), pronouns, what they say about
 * themselves and their game, with the card as it shows on their page above it, wearing the fan being built. The text
 * and colours are saved together (PUT /eu/cartao), apart from the fan and from the pictures.
 */
export function CardEditor({
  token,
  login,
  saved,
  images: savedImages,
  fan,
  stats,
  T,
  S,
  onExpired,
}: {
  token: string
  login: string
  saved: Card | null
  images: Images | null
  fan: Fan
  stats: SigmaStats | null | undefined
  T: Torcedor
  S: Sigma | null
  onExpired: () => void
}) {
  const [base, setBase] = useState<Card>(saved ?? {})
  const [card, setCard] = useState<Card>(saved ?? {})
  const [images, setImages] = useState<Images | null>(savedImages)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [framing, setFraming] = useState<{ kind: ImageKind; image: HTMLImageElement } | null>(null)
  const [picture, setPicture] = useState<{ kind: ImageKind; state: "sending" | "error" | "big" } | null>(null)
  const files = { banner: useRef<HTMLInputElement>(null), foto: useRef<HTMLInputElement>(null) }
  const sigma = stats?.sigma ?? 0
  const freeUnlocked = Boolean(S && sigma >= S.COR_LIVRE)
  const free = card.cores ?? ["#002fa7", "#ff8a3d"]
  const dirty = JSON.stringify(card) !== JSON.stringify(base)

  const change = (patch: Partial<Card>) => {
    setCard((c) => ({ ...c, ...patch }))
    setStatus("idle")
  }

  const failed = (error: unknown) => {
    if (error instanceof SignedOut) onExpired()
  }

  async function save() {
    setStatus("saving")
    try {
      const { cartao } = await saveMyCard(token, card)
      forgetLook(login)
      setBase(cartao ?? {})
      setCard(cartao ?? {})
      setStatus("saved")
    } catch (error) {
      failed(error)
      setStatus("error")
    }
  }

  async function pick(kind: ImageKind, file: File | undefined) {
    if (!file) return
    const image = await readPicture(file)
    if (image) setFraming({ kind, image })
    else setPicture({ kind, state: "error" })
  }

  async function send(crop: Crop) {
    if (!framing) return
    const { kind, image } = framing
    setPicture({ kind, state: "sending" })
    try {
      const blob = await drawPicture(image, crop, kind)
      if (!blob) return setPicture({ kind, state: "big" })
      setImages(await saveMyImage(token, kind, blob))
      forgetLook(login)
      setFraming(null)
      setPicture(null)
    } catch (error) {
      failed(error)
      setPicture({ kind, state: "error" })
    }
  }

  async function erase(kind: ImageKind) {
    try {
      setImages(await eraseMyImage(token, kind))
      forgetLook(login)
    } catch (error) {
      failed(error)
      setPicture({ kind, state: "error" })
    }
  }

  const look = { aparencia: fan as unknown as Record<string, unknown>, cartao: null, duelo: null, imagens: images }

  const pictureRow = (kind: ImageKind) => (
    <div className="space-y-2">
      <span className={label}>{kind === "banner" ? text.card.banner : text.card.photo}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={files[kind]} type="file" accept="image/*" className="hidden" onChange={(e) => (pick(kind, e.target.files?.[0]), (e.target.value = ""))} />
        <button type="button" onClick={() => files[kind].current?.click()} className={cn(small, "border-klein/40 text-klein hover:bg-klein hover:text-paper")}>
          <ImagePlus aria-hidden className="h-4 w-4" />
          {images?.[kind] ? text.card.change : text.card.upload}
        </button>
        {images?.[kind] && (
          <button type="button" onClick={() => erase(kind)} className={cn(small, "border-line text-muted hover:border-[#b42318] hover:text-[#b42318]")}>
            <Trash2 aria-hidden className="h-4 w-4" />
            {kind === "banner" ? text.card.bannerOff : text.card.photoOff}
          </button>
        )}
      </div>
      <p className="text-[12px] text-muted">
        {picture?.kind === kind && picture.state === "error"
          ? text.card.pictureError
          : picture?.kind === kind && picture.state === "big"
            ? text.card.pictureBig
            : kind === "banner"
              ? text.card.bannerHint
              : text.card.photoHint}
      </p>
    </div>
  )

  return (
    <section id="cartao" className="scroll-mt-24 space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-klein">{text.card.title}</h2>
        <p className="max-w-[40rem] text-[14px] leading-[1.6] text-ink">{text.card.hint}</p>
      </div>

      <ViewerCard login={login} look={look} stats={stats} T={T} S={S} preview={card} />

      <div className="grid gap-6 rounded-xl border border-line bg-paper/70 p-5 md:grid-cols-2">
        <div className="space-y-5">
          {pictureRow("banner")}
          {pictureRow("foto")}
          <div className="space-y-2">
            <span className={label}>{text.card.colors}</span>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => {
                const on = (card.tema ?? THEMES[0].id) === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    title={theme.name}
                    aria-label={theme.name}
                    aria-pressed={on}
                    onClick={() => change({ tema: theme.id, cores: undefined })}
                    className={cn("h-9 w-9 rounded-full border-2 transition-transform hover:scale-110", on ? "border-paper ring-2 ring-klein" : "border-navy/15")}
                    style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }}
                  />
                )
              })}
            </div>
            {freeUnlocked ? (
              <span className={cn("inline-flex h-9 items-center gap-2 rounded-full border-2 pl-3 pr-1.5 text-[13px] text-ink", card.tema === FREE_THEME ? "border-klein" : "border-line")}>
                {text.card.free}
                {[0, 1].map((i) => (
                  <label key={i} className="relative h-6 w-6 cursor-pointer rounded-full border border-navy/20" style={{ background: free[i] }}>
                    <input
                      type="color"
                      value={free[i]}
                      onChange={(e) => {
                        const cores: [string, string] = [free[0], free[1]]
                        cores[i] = e.target.value
                        change({ tema: FREE_THEME, cores })
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                ))}
              </span>
            ) : (
              S && (
                <p className="flex items-center gap-1.5 text-[12px] text-muted">
                  <Lock aria-hidden className="h-3.5 w-3.5" />
                  {text.card.freeLocked} {S.ranque(S.COR_LIVRE, LOCALE).nome} ({S.COR_LIVRE} Σ)
                </p>
              )
            )}
          </div>
        </div>

        <div className="space-y-5">
          <label className="block space-y-2">
            <span className={label}>{text.card.pronouns}</span>
            <input value={card.pronomes ?? ""} maxLength={PRONOUNS_MAX} placeholder={text.card.pronounsHint} onChange={(e) => change({ pronomes: e.target.value })} className={field} />
          </label>
          <label className="block space-y-2">
            <span className={label}>{text.card.about}</span>
            <textarea value={card.sobre ?? ""} maxLength={ABOUT_MAX} rows={5} onChange={(e) => change({ sobre: e.target.value })} className={cn(field, "resize-none leading-[1.5]")} />
            <span className="flex justify-between gap-3 text-[12px] text-muted">
              <span>{text.card.aboutHint}</span>
              <span className="tabular-nums">
                {Array.from(card.sobre ?? "").length}/{ABOUT_MAX}
              </span>
            </span>
          </label>
          <label className="block space-y-2">
            <span className={label}>{text.card.game}</span>
            <select value={card.jogo ?? ""} onChange={(e) => change({ jogo: e.target.value || undefined })} className={field}>
              <option value="">{text.card.noGame}</option>
              {CARD_GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 md:col-span-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || status === "saving"}
            className="rounded-md bg-klein px-5 py-2 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {status === "saving" ? text.saving : text.card.save}
          </button>
          <p className="text-[14px] text-muted" aria-live="polite">
            {status === "saved" ? text.card.saved : status === "error" ? text.error : dirty ? text.unsaved : text.card.picturesNow}
          </p>
          <Link href={viewerPath(login)} className="ml-auto inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline">
            {text.card.page}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {framing && (
        <ImageCropper
          image={framing.image}
          kind={framing.kind}
          busy={picture?.state === "sending"}
          onCancel={() => {
            setFraming(null)
            setPicture(null)
          }}
          onDone={send}
        />
      )}
    </section>
  )
}
