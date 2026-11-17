"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { ViewerCard } from "@/components/site/viewer/viewer-card"
import { profile } from "@/content/profile"
import { SignedOut, type Fan, type Sigma, type SigmaStats, type Torcedor } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { ABOUT_MAX, CARD_GAMES, FREE_THEME, forgetLook, saveMyCard, THEMES, viewerPath, type Card } from "@/lib/viewer"

const text = localize(profile)

/**
 * The card on /perfil: its colours (a theme, or two of their own once their Σ unlocks free colours), a line about them
 * and their game, with the card as it will show beside it, wearing the fan being built. Saved on its own (PUT
 * /eu/cartao), apart from the fan.
 */
export function CardEditor({
  token,
  login,
  saved,
  fan,
  stats,
  T,
  S,
  onExpired,
}: {
  token: string
  login: string
  saved: Card | null
  fan: Fan
  stats: SigmaStats | null | undefined
  T: Torcedor
  S: Sigma | null
  onExpired: () => void
}) {
  const [base, setBase] = useState<Card>(saved ?? {})
  const [card, setCard] = useState<Card>(saved ?? {})
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const sigma = stats?.sigma ?? 0
  const freeUnlocked = Boolean(S && sigma >= S.COR_LIVRE)
  const free = card.cores ?? ["#002fa7", "#ff8a3d"]
  const dirty = JSON.stringify(card) !== JSON.stringify(base)

  const change = (patch: Partial<Card>) => {
    setCard((c) => ({ ...c, ...patch }))
    setStatus("idle")
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
      if (error instanceof SignedOut) onExpired()
      setStatus("error")
    }
  }

  return (
    <section id="cartao" className="scroll-mt-24 space-y-4 rounded-md border border-line bg-paper/70 px-5 py-5">
      <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-klein">{text.card.title}</h2>
      <p className="max-w-[40rem] text-[14px] leading-[1.6] text-ink">{text.card.hint}</p>
      <div className="grid gap-6 md:grid-cols-[17rem_1fr]">
        <ViewerCard login={login} look={{ aparencia: fan as unknown as Record<string, unknown>, cartao: null, duelo: null }} stats={stats} T={T} S={S} size="pop" preview={card} />
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[14px] text-muted">{text.card.colors}</p>
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
                    className={cn("h-9 w-12 rounded-sm border-2 transition-transform hover:scale-105", on ? "border-klein ring-2 ring-klein/40" : "border-navy/20")}
                    style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }}
                  />
                )
              })}
              {freeUnlocked ? (
                <span
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-sm border-2 px-2 text-[12px] text-ink",
                    card.tema === FREE_THEME ? "border-klein ring-2 ring-klein/40" : "border-navy/20",
                  )}
                >
                  {text.card.free}
                  {[0, 1].map((i) => (
                    <label key={i} className="relative h-5 w-5 cursor-pointer rounded-sm border border-navy/20" style={{ background: free[i] }}>
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
                  <span className="flex h-9 items-center rounded-sm border-2 border-dashed border-navy/20 px-2 text-[12px] text-muted">
                    {text.card.freeLocked} {S.ranque(S.COR_LIVRE, LOCALE).nome} ({S.COR_LIVRE} Σ)
                  </span>
                )
              )}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="block text-[14px] text-muted">{text.card.about}</span>
            <textarea
              value={card.sobre ?? ""}
              maxLength={ABOUT_MAX}
              rows={2}
              onChange={(e) => change({ sobre: e.target.value })}
              className="w-full max-w-lg resize-none rounded-sm border border-line bg-paper px-3 py-2 text-ink"
            />
            <span className="flex max-w-lg justify-between gap-3 text-[12px] text-muted">
              <span>{text.card.aboutHint}</span>
              <span className="tabular-nums">
                {Array.from(card.sobre ?? "").length}/{ABOUT_MAX}
              </span>
            </span>
          </label>

          <label className="flex flex-wrap items-center gap-3 text-[14px] text-muted">
            {text.card.game}
            <select value={card.jogo ?? ""} onChange={(e) => change({ jogo: e.target.value || undefined })} className="rounded-sm border border-line bg-paper px-3 py-2 text-ink">
              <option value="">{text.card.noGame}</option>
              {CARD_GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || status === "saving"}
              className="rounded-sm bg-klein px-5 py-2 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {status === "saving" ? text.saving : text.card.save}
            </button>
            <p className="text-[14px] text-muted" aria-live="polite">
              {status === "saved" ? text.card.saved : status === "error" ? text.error : dirty ? text.unsaved : ""}
            </p>
            <Link href={viewerPath(login)} className="ml-auto inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline">
              {text.card.page}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
