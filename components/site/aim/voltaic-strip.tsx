import { Flame } from "lucide-react"
import { dayMonth, fill } from "@/components/site/aim/format"
import { Badge, Card } from "@/components/site/ui"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { LEVELS, rankById, standingOf, type VoltaicSummary } from "@/lib/voltaic"

const T = localize({
  eyebrow: { pt: "Voltaic · benchmark de {date}", en: "Voltaic · benchmark of {date}" },
  unranked: { pt: "Sem rank", en: "Unranked" },
  energy: { pt: "{n} de energia", en: "{n} energy" },
  toNext: { pt: "Faltam {n} pra {rank}", en: "{n} to {rank}" },
  top: { pt: "No topo da Voltaic", en: "At Voltaic's top" },
  since: { pt: "desde {date}", en: "since {date}" },
  focus: { pt: "Onde focar", en: "Where to focus" },
  focusWhy: { pt: "A subcategoria mais fraca é a que mais segura o rank.", en: "The weakest subcategory holds the rank back the most." },
  days: { pt: "{n} dias de treino", en: "{n} days trained" },
  day1: { pt: "1 dia de treino", en: "1 day trained" },
  streak: { pt: "{n} seguidos", en: "{n} in a row" },
  best: { pt: "recorde {n}", en: "best {n}" },
  time: { pt: "{t} de mira", en: "{t} aiming" },
  emblem: { pt: "{rank}, {energy} de energia", en: "{rank}, {energy} energy" },
})

/**
 * Where the training stands, in one card: the latest benchmark's Voltaic rank as its hexagon with the energy inside,
 * the way to the next rank, the change since the Sunday before, the subcategory holding it back, and the days, the run
 * and the hours trained. The frame for the aim tool under it, lighter than a section.
 */
export function VoltaicStrip({ summary, today }: { summary: VoltaicSummary; today: string }) {
  const latest = summary.benchmarks.at(-1)
  const previous = summary.benchmarks.at(-2)
  // A run still counts when the last day trained was today or yesterday.
  const yesterday = new Date(`${today}T12:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const alive = summary.lastDay === today || summary.lastDay === yesterday.toISOString().slice(0, 10)
  const streak = alive ? summary.streak : 0
  const hours = Math.floor(summary.totalMinutes / 60)
  const minutes = summary.totalMinutes % 60
  const meta = [
    summary.days.length === 1 ? T.day1 : fill(T.days, { n: summary.days.length }),
    `${fill(T.streak, { n: streak })}${summary.longestStreak > 1 ? ` (${fill(T.best, { n: summary.longestStreak })})` : ""}`,
    fill(T.time, { t: hours ? `${hours} h ${minutes} min` : `${minutes} min` }),
  ]

  if (!latest) {
    return (
      <Card>
        <p className="text-[15px] text-ink">
          {streak > 0 && <Flame aria-hidden className="mr-2 inline h-4 w-4 align-[-2px] text-klein" />}
          {meta.join(" · ")}
        </p>
      </Card>
    )
  }

  const level = LEVELS.find((l) => l.id === latest.level)
  // Ranked, the way to the next 100; below the level's first rank, the way to it.
  const standing = latest.rank
    ? standingOf(latest.energy)
    : level
      ? { rank: undefined, next: { rank: rankById(level.ranks[0])!, at: level.points[1] }, from: level.points[0] }
      : undefined
  const rank = standing?.rank
  const progress = standing?.next ? (latest.energy - standing.from) / (standing.next.at - standing.from) : 1
  const weakest = [...latest.subcategories].sort((a, b) => a.energy - b.energy)[0]
  const change = previous ? latest.energy - previous.energy : undefined

  return (
    <Card className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
        <div className="flex items-center gap-4">
          <Emblem energy={latest.energy} color={rank?.color} label={fill(T.emblem, { rank: rank?.name ?? T.unranked, energy: latest.energy })} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="eyebrow text-muted">{fill(T.eyebrow, { date: dayMonth(latest.date) })}</p>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xl font-medium tracking-[-0.02em] text-ink">{rank?.name ?? T.unranked}</span>
              {level && <span className="text-[13px] text-muted">{localize(level.name)}</span>}
              {latest.complete && <Badge>Complete</Badge>}
            </p>
            <div aria-hidden className="h-1.5 bg-klein/10">
              <div className="h-full bg-klein" style={{ width: `${Math.max(2, Math.min(1, progress) * 100)}%` }} />
            </div>
            <p className="text-[13px] tabular-nums text-muted">
              <span className="text-ink">{standing?.next ? fill(T.toNext, { n: standing.next.at - latest.energy, rank: standing.next.rank.name }) : T.top}</span>
              {change !== undefined && previous && (
                <>
                  {" · "}
                  <span className={cn("font-medium", change >= 0 ? "text-win" : "text-loss")}>{change >= 0 ? `+${change}` : `−${-change}`}</span>{" "}
                  {fill(T.since, { date: dayMonth(previous.date) })}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 sm:border-l sm:border-line sm:pl-8">
          <p className="eyebrow text-muted">{T.focus}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-medium tracking-[-0.02em] text-klein">{weakest.name}</span>
            <span className="text-[13px] text-muted">{weakest.category}</span>
            <span className="ml-auto text-xl font-semibold tabular-nums text-ink">{weakest.energy}</span>
          </p>
          <div className="flex h-1.5 gap-[2px]" aria-hidden>
            {latest.subcategories.map((sub) => (
              <span key={sub.name} className={cn("flex-1", sub === weakest ? "bg-klein" : "bg-klein/15")} />
            ))}
          </div>
          <p className="text-[13px] leading-[1.5] text-muted">{T.focusWhy}</p>
        </div>
      </div>
      <p className="border-t border-line pt-4 text-[13px] tabular-nums text-muted">
        {streak > 0 && <Flame aria-hidden className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-klein" />}
        {meta.join(" · ")}
      </p>
    </Card>
  )
}

/** The rank as Voltaic draws it: a hexagon in the rank's colour, the energy inside. */
function Emblem({ energy, color, label }: { energy: number; color?: string; label: string }) {
  const hexagon = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    return `${32 + 30 * Math.cos(angle)},${32 + 30 * Math.sin(angle)}`
  }).join(" ")
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" role="img" aria-label={label} className="shrink-0">
      <polygon points={hexagon} fill={color} className={color ? undefined : "fill-muted"} />
      <text x={32} y={32} dy="0.35em" textAnchor="middle" className="fill-paper text-[18px] font-semibold tabular-nums">
        {energy}
      </text>
    </svg>
  )
}
