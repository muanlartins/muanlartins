"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { GameIcon } from "@/components/site/game/game-icon"
import { FanView } from "@/components/site/profile/fan-view"
import { channel } from "@/content/channel"
import type { Sigma, SigmaStats, Torcedor } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { CARD_GAMES, cardColors, viewerPath, type Card, type Look } from "@/lib/viewer"

const text = localize(channel.viewer)
export const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")
/** "2026-11-08" → "08/11/2026". */
export const dateBR = (date: string) => date.slice(0, 10).split("-").reverse().join("/")

/** When they joined the stand: their first live, or "from the start" for those before 2026-11-07, when none was kept. */
export function sinceLine(stats: SigmaStats | null | undefined, primeira: string | null | undefined) {
  if (!stats?.lives) return text.never
  return primeira ? text.since.replace("{date}", dateBR(primeira)) : text.sinceStart
}

/**
 * Someone's card, the same wherever it shows: their colours behind their fan on a strip of the stand, their name, their
 * Σ as a rank, their game and a line about them. "page" tops their page; "pop" is the small window on a name.
 */
export function ViewerCard({
  login,
  look,
  stats,
  primeira,
  T,
  S,
  size = "page",
  preview,
  className,
}: {
  login: string
  look: Look | null | undefined
  stats: SigmaStats | null | undefined
  primeira?: string | null
  T: Torcedor | null
  S: Sigma | null
  size?: "page" | "pop"
  /** The card being edited on /perfil, over what's saved. */
  preview?: Card
  className?: string
}) {
  const card = preview ?? look?.cartao ?? null
  const sigma = stats?.sigma ?? 0
  const [from, to] = cardColors(card, sigma, S)
  const game = CARD_GAMES.find((g) => g.id === card?.jogo)
  const rank = S && stats ? S.ranque(sigma, LOCALE, game?.id === "valorant" ? "valorant" : "rocket-league") : null
  const page = size === "page"

  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-paper", className)}>
      <div className={cn("relative", page ? "h-28 sm:h-32" : "h-16")} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        {/* Their fan on a strip of the stand, half over the colours like an avatar. */}
        <div className={cn("absolute bottom-0 translate-y-1/2", page ? "left-5 h-[124px] w-[96px]" : "left-3 h-[76px] w-[58px]")}>
          <div className="absolute inset-0 rounded-md border-4 border-paper bg-navy" />
          <div
            className="absolute inset-x-1 bottom-1 h-3 rounded-b-sm bg-klein"
            style={{ clipPath: "polygon(6px 0, calc(100% - 6px) 0, 100% 100%, 0 100%)" }}
          />
          {T && (
            <div className={cn("absolute bottom-3 left-1/2 -translate-x-1/2", page ? "h-[88px] w-[58px]" : "h-[54px] w-9")}>
              <FanView T={T} fan={T.normalizar(look?.aparencia ?? null, login)} className="h-full w-full" />
            </div>
          )}
        </div>
      </div>
      <div className={cn(page ? "px-5 pb-5 pt-3" : "px-3 pb-3 pt-2")}>
        <div className={cn("flex flex-wrap items-center justify-end gap-2", page ? "min-h-10 pl-[108px]" : "min-h-7 pl-[66px]")}>
          {rank && (
            <span className={cn("inline-flex items-center gap-1.5 text-ink", page ? "text-[14px]" : "text-[12px]")} title={rank.nome}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rank.emblema} alt="" className={page ? "h-8 w-8" : "h-6 w-6"} />
              <span className="tabular-nums">{number(sigma)} Σ</span>
            </span>
          )}
        </div>
        <p className={cn("mt-3 truncate font-medium tracking-[-0.01em] text-klein", page ? "text-2xl" : "text-[16px]")}>{login}</p>
        <p className={cn("text-muted", page ? "text-[14px]" : "text-[12px]")}>
          {rank ? `${rank.nome} · ` : ""}
          {sinceLine(stats, primeira)}
        </p>
        {game && (
          <p className={cn("mt-2 inline-flex items-center gap-1.5 rounded-sm bg-klein/[0.07] px-2 py-0.5 text-ink", page ? "text-[13px]" : "text-[12px]")}>
            <GameIcon game={game.id} size={page ? 13 : 11} />
            {game.name}
          </p>
        )}
        {card?.sobre && <p className={cn("mt-2 break-words text-ink", page ? "text-[15px] leading-[1.55]" : "text-[13px] leading-[1.45]")}>{card.sobre}</p>}
        {!page && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2 text-[12px]">
            <span className="text-muted tabular-nums">
              {stats ? `${number(Math.floor(stats.minutos / 60))} h · ${number(stats.lives)} ${stats.lives === 1 ? "live" : "lives"}` : ""}
            </span>
            <Link href={viewerPath(login)} className="inline-flex items-center gap-1 font-medium text-klein hover:underline">
              {text.open}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
