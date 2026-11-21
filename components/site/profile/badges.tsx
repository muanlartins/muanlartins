import { Clock, Flame, HeartHandshake, Tv, type LucideIcon } from "lucide-react"
import { cardClass } from "@/components/site/ui"
import { profile } from "@/content/profile"
import type { Badge } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile.sigma)
const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")

const ICONS: Record<Badge["id"], LucideIcon> = { horas: Clock, lives: Tv, seguidas: Flame, doado: HeartHandshake }
/** One colour per level, warming up from bronze; the last is the channel's own Klein. A medal's metal, like a rank's emblem: data, not the page's palette. */
export const LEVELS = ["#b8794b", "#8e9aa8", "#d9a520", "#2fb0bb", "#4d7cff", "#9b5cf6", "#e0457b", "#002fa7"]

const UNITS = localize({
  horas: { pt: "h", en: "h" },
  lives: { pt: "lives", en: "lives" },
  seguidas: { pt: "seguidas", en: "in a row" },
})
const UNIT = localize({
  horas: { pt: "h", en: "h" },
  lives: { pt: "live", en: "live" },
  seguidas: { pt: "seguida", en: "in a row" },
})

/** A medal's amount as people say it: "25 h", "10 lives", "1 live", "5 seguidas", "R$ 50". */
export function amount(id: Badge["id"], n: number) {
  return id === "doado" ? `R$ ${number(n)}` : `${number(n)} ${n === 1 ? UNIT[id] : UNITS[id]}`
}

/** The medal: its icon in its level's colour, muted before the first. */
export function Medal({ badge, size = "md", label }: { badge: Badge; size?: "sm" | "md"; label?: string }) {
  const Icon = ICONS[badge.id]
  const color = badge.nivel ? LEVELS[badge.nivel - 1] : undefined
  return (
    <span
      title={label ?? `${badge.nome}: ${amount(badge.id, badge.valor)}`}
      className={cn("relative grid shrink-0 place-items-center", size === "md" ? "h-14 w-14" : "h-7 w-7", !color && "text-muted")}
      style={color ? { color } : undefined}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d="M28 2 51 15v26L28 54 5 41V15Z"
          fill="currentColor"
          fillOpacity={color ? 0.16 : 0.08}
          stroke="currentColor"
          strokeWidth={color ? 3 : 2}
          strokeOpacity={color ? 1 : 0.4}
        />
      </svg>
      <Icon aria-hidden className={cn("relative", size === "md" ? "h-6 w-6" : "h-3.5 w-3.5")} strokeWidth={2} />
      {size === "md" && badge.nivel > 0 && (
        <span className="absolute -right-1 -bottom-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold text-paper" style={{ background: color }}>
          {badge.nivel}
        </span>
      )}
    </span>
  )
}

/**
 * A medal with its name, amount, level as pips and the way to the next: the same tile on /perfil and on a viewer's page.
 * A row on phones, a standing tile from 640 px.
 */
export function MedalTile({ badge: b, rows }: { badge: Badge; rows?: boolean }) {
  const color = b.nivel ? LEVELS[b.nivel - 1] : undefined
  return (
    <li className={cn(cardClass, "flex items-center gap-4 px-4 py-3", !rows && "sm:flex-col sm:gap-2 sm:px-3 sm:pb-4 sm:pt-5 sm:text-center")}>
      <Medal badge={b} />
      <div className={cn("min-w-0 flex-1 space-y-1", !rows && "sm:flex sm:flex-none sm:flex-col sm:items-center")}>
        <p className="text-[13px] font-medium text-ink">{b.nome}</p>
        <p className="text-xl leading-tight font-medium tracking-[-0.02em] text-klein tabular-nums">{amount(b.id, b.valor)}</p>
        <span className="flex gap-1" role="img" aria-label={b.nivel ? `${text.level} ${b.nivel}/${b.niveis}` : text.notYet}>
          {Array.from({ length: b.niveis }, (_, i) => (
            <span key={i} className="h-1.5 w-3" style={{ background: i < b.nivel ? color : "var(--color-line)" }} />
          ))}
        </span>
        <p className="text-[12px] text-muted tabular-nums">
          {b.proximo === null ? text.maxed : `${text.toGo} ${amount(b.id, b.proximo)}`}
          {b.id === "doado" && ` · ${text.pixPrivate}`}
        </p>
      </div>
    </li>
  )
}

/**
 * The medals in a row that fills itself: three or four tiles (stacked rows on phones), never one left alone. `rows`
 * keeps them as rows at any width, for a narrow column.
 */
export function MedalGrid({ badges, rows }: { badges: Badge[]; rows?: boolean }) {
  return (
    <ul className={cn("grid gap-3", !rows && (badges.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"))}>
      {badges.map((b) => (
        <MedalTile key={b.id} badge={b} rows={rows} />
      ))}
    </ul>
  )
}

/**
 * A row of small medals, the ones already earned, for the mural. The run of lives in a row going on now rides on
 * the "seguidas" medal as a number, rather than a second flame beside it.
 */
export function BadgeChips({ badges, streak }: { badges: Badge[]; streak: number }) {
  const live = streak >= 2
  const shown = badges.filter((b) => b.nivel > 0 || (b.id === "seguidas" && live))
  if (!shown.length) return null
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {shown.map((b) =>
        b.id === "seguidas" && live ? (
          <span key={b.id} className="relative">
            <Medal badge={b} size="sm" label={`${streak} ${text.streakNow} (${b.nome}: ${amount(b.id, b.valor)})`} />
            <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-navy px-1 text-[11px] leading-none font-semibold text-ouro tabular-nums ring-2 ring-paper">
              {streak}
            </span>
          </span>
        ) : (
          <Medal key={b.id} badge={b} size="sm" />
        ),
      )}
    </span>
  )
}
