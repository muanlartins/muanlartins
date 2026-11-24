"use client"

import { ArrowRight, Flame } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { GameIcon } from "@/components/site/game/game-icon"
import { Torcedor3D } from "@/components/site/fan/torcedor-3d"
import { StandStrip } from "@/components/site/ui"
import { channel } from "@/content/channel"
import type { Sigma, SigmaStats } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { CARD_GAMES, cardColors, imageUrl, loadTwitchAvatar, viewerPath, type Card, type Look } from "@/lib/viewer"

const text = localize(channel.viewer)
export const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")
const BRASILIA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" })
/** "2026-11-08" → "08/11"; a moment ("2026-11-21T01:30:00Z") on Brasília's day: "20/11". */
export const dateBR = (date: string) => (date.length > 10 && !Number.isNaN(Date.parse(date)) ? BRASILIA.format(new Date(date)) : date.slice(5, 10).split("-").reverse().join("/"))

/** When they joined the stand: their first live, or "from the start" for those before 2026-11-07, when none was kept. */
export function sinceLine(stats: SigmaStats | null | undefined, primeira: string | null | undefined) {
  if (!stats?.lives) return text.never
  return primeira ? text.since.replace("{date}", dateBR(primeira)) : text.sinceStart
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex = (c: number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`
/** a toward b by t. */
const mix = (a: string, b: string, t: number) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t))
const NIGHT = "#070b1f"

/**
 * The card's palette from their two colours: the banner's gradient, and the card itself as their second colour sunk
 * into the night, so white text reads on any theme (Discord's profile themes, Steam's dark profiles).
 */
export function cardPalette(from: string, to: string) {
  return { from, to, body: mix(to, NIGHT, 0.62), deep: mix(to, NIGHT, 0.8), ring: from }
}

/**
 * Their photo: the one they sent, else their Twitch photo, else their fan from the shoulders up. (`T`, the 2D fan's kit,
 * isn't needed since the fans are 3D; it's still taken so /perfil's callers keep compiling.)
 */
export function ViewerPhoto({ login, look, className, ring }: { login: string; look: Look | null | undefined; T?: unknown; className?: string; ring?: string }) {
  const file = look?.imagens?.foto
  const [avatar, setAvatar] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (!file) loadTwitchAvatar(login).then(setAvatar)
  }, [login, file])
  const src = file ? imageUrl(login, "foto", file) : avatar
  return (
    <div className={cn("relative overflow-hidden rounded-full bg-navy", className)} style={ring ? { boxShadow: `0 0 0 4px ${ring}` } : undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        avatar === null && (
          <Torcedor3D aparencia={look?.aparencia ?? null} login={login} aguardando={look === undefined} quadro="cabeca" className="absolute inset-x-0 top-[6%] h-full" />
        )
      )}
    </div>
  )
}

/** Their fan standing on a strip of the stand, as the live's crowd draws them: on the card, by their name. */
function StandingFan({ login, look, strip, className }: { login: string; look: Look | null | undefined; strip: number; className?: string }) {
  return (
    <div className={cn("pointer-events-none", className)} aria-hidden>
      <div className="absolute inset-x-[12%] top-0" style={{ bottom: strip * 0.7 }}>
        <Torcedor3D aparencia={look?.aparencia ?? null} login={login} aguardando={look === undefined} className="h-full w-full" />
      </div>
      {/* After the fan: the strip covers the bust's base, as the live's riser does. */}
      <StandStrip height={strip} />
    </div>
  )
}

/** The banner: the picture they sent, else their colours with the stand's light over them. */
function Banner({ login, look, palette, className, children }: { login: string; look: Look | null | undefined; palette: ReturnType<typeof cardPalette>; className?: string; children?: ReactNode }) {
  const file = look?.imagens?.banner
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        background: file
          ? palette.deep
          : `radial-gradient(120% 140% at 85% 0%, ${palette.from}00 30%, ${palette.deep}aa 100%), radial-gradient(60% 90% at 20% 10%, color-mix(in oklab, var(--color-paper) 19%, transparent), transparent 70%), linear-gradient(135deg, ${palette.from}, ${palette.to})`,
      }}
    >
      {file ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(login, "banner", file)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        // The stand's rows, faint, under the colours.
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.13]"
          style={{ background: "repeating-linear-gradient(170deg, var(--color-paper) 0 2px, transparent 2px 22px)", maskImage: "linear-gradient(to top, black, transparent 85%)" }}
        />
      )}
      {children}
    </div>
  )
}

/** Their Σ as a rank, with the way to the next one, Steam's level. */
function RankChip({ S, sigma, game, size }: { S: Sigma; sigma: number; game?: string; size: "page" | "pop" }) {
  const rank = S.ranque(sigma, LOCALE, game === "valorant" ? "valorant" : "rocket-league")
  const progress = rank.ate ? Math.min(1, (sigma - rank.desde) / (rank.ate - rank.desde)) : 1
  const page = size === "page"
  return (
    <div className={cn("flex items-center gap-2.5 bg-paper/[0.08] ring-1 ring-paper/10 ring-inset", page ? "px-3 py-2" : "px-2.5 py-1.5")} title={rank.proximo ? `${text.next} ${rank.proximo}: ${number(rank.ate ?? 0)} Σ` : rank.nome}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rank.emblema} alt="" className={page ? "h-10 w-10" : "h-7 w-7"} />
      <div className="min-w-0">
        <p className={cn("font-medium leading-tight text-paper", page ? "text-[15px]" : "text-[13px]")}>{rank.nome}</p>
        <p className={cn("leading-tight text-paper/70 tabular-nums", page ? "text-[13px]" : "text-[12px]")}>{number(sigma)} Σ</p>
        {page && (
          <div className="mt-1 h-1 w-28 overflow-hidden bg-paper/15">
            <div className="h-full bg-paper/80" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Someone's card, the same wherever it shows (a profile, Discord- and Steam-style): their banner, their photo, their fan
 * standing by their name, their Σ as a rank, pronouns, game and what they say about themselves. "page" tops their page,
 * with `actions` by the name; "pop" is the small window on a name.
 */
export function ViewerCard({
  login,
  look,
  stats,
  primeira,
  S,
  size = "page",
  preview,
  actions,
  heading,
  className,
}: {
  login: string
  look: Look | null | undefined
  stats: SigmaStats | null | undefined
  primeira?: string | null
  /** The 2D fan's kit: no longer needed (the fans are 3D), still taken so /perfil's callers keep compiling. */
  T?: unknown
  S: Sigma | null
  size?: "page" | "pop"
  /** The card being edited on /perfil, over what's saved. */
  preview?: Card
  actions?: ReactNode
  /** Their name is the page's h1 (their own page). */
  heading?: boolean
  className?: string
}) {
  const card = preview ?? look?.cartao ?? null
  const sigma = stats?.sigma ?? 0
  const palette = cardPalette(...cardColors(card, sigma, S))
  const game = CARD_GAMES.find((g) => g.id === card?.jogo)
  const page = size === "page"
  const streak = stats?.sequencia ?? 0

  return (
    <div className={cn("cut relative overflow-hidden text-paper", className)} style={{ background: `linear-gradient(180deg, ${palette.body}, ${palette.deep})` }}>
      <Banner login={login} look={look} palette={palette} className={page ? "aspect-[3/1]" : "h-[92px]"}>
        <StandingFan login={login} look={look} strip={page ? 18 : 11} className={cn("absolute bottom-0", page ? "right-4 h-[96px] w-[76px] sm:right-7 sm:h-[150px] sm:w-[112px]" : "right-3 h-[78px] w-[60px]")} />
      </Banner>

      <div className={cn("relative", page ? "px-5 pb-5 sm:px-7 sm:pb-6" : "px-3.5 pb-3.5")}>
        <ViewerPhoto
          login={login}
          look={look}
          ring={palette.body}
          className={cn("absolute", page ? "-top-14 left-5 h-28 w-28 sm:-top-16 sm:left-7 sm:h-32 sm:w-32" : "-top-9 left-3.5 h-[72px] w-[72px]")}
        />
        <div className={cn("flex min-h-0 flex-wrap items-start justify-end gap-2", page ? "min-h-14 pt-3 pl-32 sm:pl-40" : "min-h-9 pt-2 pl-20")}>{actions}</div>

        <div className={page ? "mt-3" : "mt-1.5"}>
          {heading ? (
            <h1 className="truncate text-4xl font-medium tracking-[-0.03em] sm:text-5xl">{login}</h1>
          ) : (
            <p className={cn("truncate font-medium tracking-[-0.02em]", page ? "text-3xl sm:text-4xl" : "text-xl")}>{login}</p>
          )}
          <p className={cn("mt-0.5 flex flex-wrap items-center gap-x-2 text-paper/65", page ? "text-[14px]" : "text-[12px]")}>
            {card?.pronomes && <span className="text-paper/85">{card.pronomes}</span>}
            {card?.pronomes && <span aria-hidden>·</span>}
            <span>{sinceLine(stats, primeira)}</span>
          </p>
        </div>

        <div className={cn("flex flex-wrap items-center gap-2", page ? "mt-4" : "mt-2.5")}>
          {S && stats && <RankChip S={S} sigma={sigma} game={game?.id} size={size} />}
          {game && (
            <span className={cn("inline-flex items-center gap-1.5 bg-paper/[0.08] text-paper/90 ring-1 ring-paper/10 ring-inset", page ? "px-3 py-2 text-[14px]" : "px-2 py-1 text-[12px]")}>
              <GameIcon game={game.id} size={page ? 14 : 12} />
              {game.name}
            </span>
          )}
          {streak >= 2 && (
            <span className={cn("inline-flex items-center gap-1 bg-ouro/15 text-ouro ring-1 ring-ouro/30 ring-inset", page ? "px-3 py-2 text-[14px]" : "px-2 py-1 text-[12px]")}>
              <Flame aria-hidden className={page ? "h-4 w-4" : "h-3.5 w-3.5"} />
              {text.streakChip.replace("{n}", number(streak))}
            </span>
          )}
        </div>

        {card?.sobre && (
          <div className={cn("border-t border-paper/10", page ? "mt-5 pt-4" : "mt-3 pt-2.5")}>
            <p className="eyebrow text-paper/65">{text.about}</p>
            <p className={cn("mt-1 whitespace-pre-line break-words text-paper/90", page ? "text-[15px] leading-[1.6]" : "line-clamp-3 text-[13px] leading-[1.45]")}>{card.sobre}</p>
          </div>
        )}

        {!page && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-paper/10 pt-2.5 text-[12px]">
            <span className="text-paper/60 tabular-nums">
              {stats ? `${number(Math.floor(stats.minutos / 60))} h · ${number(stats.lives)} ${stats.lives === 1 ? "live" : "lives"}` : ""}
            </span>
            <Link href={viewerPath(login)} className="cut-sm inline-flex items-center gap-1 bg-paper/90 px-2.5 py-1 font-medium text-navy transition-colors hover:bg-paper">
              {text.open}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
