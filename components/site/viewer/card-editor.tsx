"use client"

import { ImagePlus, Trash2 } from "lucide-react"
import { useRef, useState } from "react"
import { LockedSwatch, Swatch } from "@/components/site/profile/swatches"
import { ImageCropper } from "@/components/site/viewer/image-cropper"
import { ViewerPhoto } from "@/components/site/viewer/viewer-card"
import { Button, Field, Input, Select, Textarea } from "@/components/site/ui"
import { profile } from "@/content/profile"
import { SignedOut, type Sigma, type Torcedor } from "@/lib/profile"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import {
  ABOUT_MAX,
  CARD_GAMES,
  cardColors,
  eraseMyImage,
  forgetLook,
  FREE_THEME,
  imageUrl,
  PRONOUNS_MAX,
  saveMyCard,
  saveMyImage,
  THEMES,
  type Card,
  type ImageKind,
  type Images,
  type Look,
} from "@/lib/viewer"
import { drawPicture, readPicture, type Crop } from "@/lib/viewer-images"

const text = localize(profile.card)
const all = localize(profile)
const DEFAULT_FREE: [string, string] = ["#002fa7", "#ff8a3d"]

/**
 * The Cartão tab on /perfil, Discord-style: the banner and the photo (pictures of their own, framed here and sent at
 * once), the colours (a theme, or two of their own once their Σ unlocks free colours), pronouns, what they say about
 * themselves and their game. The card being edited lives in the profile page, so its preview beside the tabs follows
 * every change; the text and colours are saved together (PUT /eu/cartao), apart from the fan and from the pictures.
 */
export function CardEditor({
  token,
  login,
  card,
  base,
  images,
  look,
  sigma,
  T,
  S,
  onChange,
  onSaved,
  onImages,
  onExpired,
}: {
  token: string
  login: string
  /** The card being edited, and as it was last saved. */
  card: Card
  base: Card
  images: Images | null
  /** Their look as the preview draws it (fan and pictures), for the photo here. */
  look: Look
  sigma: number
  T: Torcedor
  S: Sigma | null
  onChange: (patch: Partial<Card>) => void
  onSaved: (card: Card) => void
  onImages: (images: Images | null) => void
  onExpired: () => void
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [framing, setFraming] = useState<{ kind: ImageKind; image: HTMLImageElement } | null>(null)
  const [picture, setPicture] = useState<{ kind: ImageKind; state: "sending" | "error" | "big" } | null>(null)
  const files = { banner: useRef<HTMLInputElement>(null), foto: useRef<HTMLInputElement>(null) }
  const freeUnlocked = Boolean(S && sigma >= S.COR_LIVRE)
  const free = card.cores ?? DEFAULT_FREE
  const dirty = JSON.stringify(card) !== JSON.stringify(base)
  const [from, to] = cardColors(card, sigma, S)

  const change = (patch: Partial<Card>) => {
    onChange(patch)
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
      onSaved(cartao ?? {})
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
      onImages(await saveMyImage(token, kind, blob))
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
      onImages(await eraseMyImage(token, kind))
      forgetLook(login)
    } catch (error) {
      failed(error)
      setPicture({ kind, state: "error" })
    }
  }

  const pictureButtons = (kind: ImageKind) => (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={files[kind]} type="file" accept="image/*" className="hidden" onChange={(e) => (pick(kind, e.target.files?.[0]), (e.target.value = ""))} />
      <Button size="sm" variant="secondary" icon={<ImagePlus aria-hidden className="h-4 w-4" />} onClick={() => files[kind].current?.click()}>
        {images?.[kind] ? text.change : text.upload}
      </Button>
      {images?.[kind] && (
        <Button size="sm" variant="quiet" icon={<Trash2 aria-hidden className="h-4 w-4" />} onClick={() => erase(kind)}>
          {kind === "banner" ? text.bannerOff : text.photoOff}
        </Button>
      )}
    </div>
  )
  const pictureLine = (kind: ImageKind) =>
    picture?.kind === kind && picture.state !== "sending" ? (
      <p role="alert" className="text-[13px] text-loss">
        {picture.state === "big" ? text.pictureBig : text.pictureError}
      </p>
    ) : (
      <p className="text-[13px] text-muted">{kind === "banner" ? text.bannerHint : text.photoHint}</p>
    )

  return (
    <div className="space-y-8">
      {/* The banner, as wide as it shows. */}
      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium text-muted">{text.banner}</legend>
        <div className="cut relative aspect-[3/1] overflow-hidden" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
          {images?.banner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(login, "banner", images.banner)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        {pictureButtons("banner")}
        {pictureLine("banner")}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium text-muted">{text.photo}</legend>
        <div className="flex items-center gap-4">
          <ViewerPhoto login={login} look={look} T={T} className="h-16 w-16 shrink-0" />
          <div className="space-y-1.5">
            {pictureButtons("foto")}
            {pictureLine("foto")}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium text-muted">{text.colors}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {THEMES.map((theme) => (
            <Swatch
              key={theme.id}
              label={theme.name}
              background={`linear-gradient(135deg, ${theme.colors[0]} 50%, ${theme.colors[1]} 50%)`}
              on={(card.tema ?? THEMES[0].id) === theme.id}
              onClick={() => change({ tema: theme.id, cores: undefined })}
            />
          ))}
          {S &&
            (freeUnlocked ? (
              <span className={cn("inline-flex h-8 items-center gap-1.5 border pl-2 pr-1 text-[13px] text-ink", card.tema === FREE_THEME ? "border-klein" : "border-line-strong")}>
                {text.free}
                {[0, 1].map((i) => (
                  <label key={i} className="relative h-6 w-6 cursor-pointer border border-navy/20 focus-within:outline-2 focus-within:outline-klein" style={{ background: free[i] }}>
                    <span className="sr-only">
                      {text.free} {i + 1}
                    </span>
                    <input
                      type="color"
                      value={free[i]}
                      onChange={(e) => {
                        const cores: [string, string] = [free[0], free[1]]
                        cores[i] = e.target.value
                        change({ tema: FREE_THEME, cores })
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                ))}
              </span>
            ) : (
              <LockedSwatch S={S} at={S.COR_LIVRE} background={`linear-gradient(135deg, ${DEFAULT_FREE[0]} 50%, ${DEFAULT_FREE[1]} 50%)`} label={text.free} />
            ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={text.pronouns}>
          <Input value={card.pronomes ?? ""} maxLength={PRONOUNS_MAX} placeholder={text.pronounsHint} onChange={(e) => change({ pronomes: e.target.value })} />
        </Field>
        <Field label={text.game}>
          <Select value={card.jogo ?? ""} onChange={(e) => change({ jogo: e.target.value || undefined })}>
            <option value="">{text.noGame}</option>
            {CARD_GAMES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label={text.about}
        hint={
          <span className="flex justify-between gap-3">
            <span>{text.aboutHint}</span>
            <span className="tabular-nums">
              {Array.from(card.sobre ?? "").length}/{ABOUT_MAX}
            </span>
          </span>
        }
      >
        <Textarea value={card.sobre ?? ""} maxLength={ABOUT_MAX} rows={4} onChange={(e) => change({ sobre: e.target.value })} className="resize-none leading-[1.5]" />
      </Field>

      <div className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-ground/90 px-2 py-4 backdrop-blur">
        <Button onClick={save} disabled={!dirty || status === "saving"}>
          {status === "saving" ? all.saving : text.save}
        </Button>
        <p className={cn("text-[13px]", status === "error" ? "text-loss" : "text-muted")} aria-live="polite">
          {status === "saved" ? text.saved : status === "error" ? all.error : dirty ? all.unsaved : text.picturesNow}
        </p>
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
    </div>
  )
}
