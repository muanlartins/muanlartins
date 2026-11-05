import { Clock, Flame, HeartHandshake, Tv, type LucideIcon } from "lucide-react"
import { profile } from "@/content/profile"
import type { Badge } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile.sigma)
const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")

const ICONS: Record<Badge["id"], LucideIcon> = { horas: Clock, lives: Tv, seguidas: Flame, doado: HeartHandshake }
/** One colour per level, warming up from bronze; the last is the channel's own Klein. */
const LEVELS = ["#b8794b", "#8e9aa8", "#d9a520", "#2fb0bb", "#4d7cff", "#9b5cf6", "#e0457b", "#002fa7"]

const UNITS = localize({
  horas: { pt: "h", en: "h" },
  lives: { pt: "lives", en: "lives" },
  seguidas: { pt: "seguidas", en: "in a row" },
})

/** A badge's amount as people say it: "25 h", "10 lives", "5 seguidas", "R$ 50". */
export function amount(id: Badge["id"], n: number) {
  return id === "doado" ? `R$ ${number(n)}` : `${number(n)} ${UNITS[id]}`
}

/** The medal: the badge's icon in its level's colour, grey before the first. */
export function Medal({ badge, size = "md" }: { badge: Badge; size?: "sm" | "md" }) {
  const Icon = ICONS[badge.id]
  const color = badge.nivel ? LEVELS[badge.nivel - 1] : undefined
  return (
    <span
      title={`${badge.nome}: ${amount(badge.id, badge.valor)}`}
      className={cn(
        "relative grid shrink-0 place-items-center",
        size === "md" ? "h-14 w-14" : "h-7 w-7",
        !color && "text-muted",
      )}
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
      <Icon className={cn("relative", size === "md" ? "h-6 w-6" : "h-3.5 w-3.5")} strokeWidth={2} />
      {size === "md" && badge.nivel > 0 && (
        <span className="absolute -right-1 -bottom-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold text-white" style={{ background: color }}>
          {badge.nivel}
        </span>
      )}
    </span>
  )
}

/** The profile's badges: each with its level and the way to the next one. */
export function BadgeGrid({ badges }: { badges: Badge[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {badges.map((b) => (
        <li key={b.id} className="flex items-center gap-4 rounded-md border border-line bg-paper/60 px-4 py-3">
          <Medal badge={b} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-[14px] font-medium text-ink">{b.nome}</span>
              <span className="text-[12px] text-muted">{b.nivel ? `${text.level} ${b.nivel}/${b.niveis}` : text.notYet}</span>
            </p>
            <p className="text-lg leading-tight font-medium text-klein tabular-nums">{amount(b.id, b.valor)}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(3, b.progresso * 100)}%`, background: b.nivel ? LEVELS[Math.min(b.nivel, LEVELS.length) - 1] : "var(--color-klein)" }}
              />
            </div>
            <p className="text-[12px] text-muted tabular-nums">
              {b.proximo === null ? text.maxed : `${text.toGo} ${amount(b.id, b.proximo)}`}
              {b.id === "doado" && ` · ${text.pixPrivate}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A row of small medals, the ones already earned, for the mural. */
export function BadgeChips({ badges, streak }: { badges: Badge[]; streak: number }) {
  const earned = badges.filter((b) => b.nivel > 0)
  if (!earned.length && streak < 2) return null
  return (
    <span className="flex flex-wrap items-center gap-1">
      {earned.map((b) => (
        <Medal key={b.id} badge={b} size="sm" />
      ))}
      {streak >= 2 && (
        <span title={`${streak} ${text.streakNow}`} className="inline-flex items-center gap-0.5 rounded-full bg-[#ff7a1a]/15 px-1.5 py-0.5 text-[12px] font-semibold text-[#e0620a] tabular-nums">
          <Flame className="h-3.5 w-3.5" strokeWidth={2.2} />
          {streak}
        </span>
      )}
    </span>
  )
}
