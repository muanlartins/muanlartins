import { signed } from "@/components/site/ranked/format"
import { localize } from "@/lib/site"
import { CATEGORIES, LEVELS, rankById, type Benchmark, type ScenarioResult } from "@/lib/voltaic"
import { cn } from "@/lib/utils"

const T = localize({
  notPlayed: { pt: "não jogado", en: "not played" },
  to: { pt: "para", en: "to" },
  top: { pt: "acima do último rank do nível", en: "past the level's last rank" },
  previous: { pt: "domingo anterior", en: "the Sunday before" },
  accuracy: { pt: "de precisão", en: "accuracy" },
  energy: { pt: "energia", en: "energy" },
  energyTitle: { pt: "A energia da subcategoria: a do seu melhor cenário", en: "The subcategory's energy: its best scenario's" },
})

/**
 * Every scenario of the benchmark, by category and subcategory: its score, the change since the benchmark before,
 * and a bar through the level's ranks that lights up to the score in each rank's colour, with a tick where the score
 * was the Sunday before and what's left to the next rank.
 */
export function ScenarioList({ benchmark, previous }: { benchmark: Benchmark; previous?: Benchmark }) {
  const level = LEVELS.find((l) => l.id === benchmark.level)!
  const before = previous?.level === benchmark.level ? previous : undefined
  return (
    <div className="space-y-5">
      {CATEGORIES.map((category) => (
        <section key={category.id} className="rounded-md border border-line bg-paper/70 p-4 backdrop-blur-sm">
          <h3 className="text-[12px] font-medium uppercase tracking-[0.12em] text-klein">{localize(category.name)}</h3>
          {category.subcategories.map((name) => (
            <div key={name} className="mt-3 grid gap-x-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
              <p className="flex items-baseline gap-2 pt-0.5 text-[12px] text-muted sm:block">
                {name}
                <span className="block text-[13px] font-semibold tabular-nums text-ink" title={T.energyTitle}>
                  {benchmark.subcategories.find((s) => s.name === name)?.energy ?? 0}
                  <span className="ml-1 text-[11px] font-normal text-muted">{T.energy}</span>
                </span>
              </p>
              <ul className="mt-1 space-y-3 sm:mt-0">
                {benchmark.scenarios
                  .filter((s) => s.subcategory === name)
                  .map((s) => (
                    <Row key={s.id} scenario={s} previous={before?.scenarios.find((p) => p.id === s.id)} ranks={level.ranks} />
                  ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function Row({ scenario, previous, ranks }: { scenario: ScenarioResult; previous?: ScenarioResult; ranks: string[] }) {
  const { thresholds, score } = scenario
  const rank = rankById(scenario.rank)
  // The bar runs from 0 to one rank's width past the last threshold.
  const top = thresholds[3] + (thresholds[3] - thresholds[2])
  const at = (value: number) => `${(Math.min(value, top) / top) * 100}%`
  const segments = [
    { from: 0, to: thresholds[0], color: "var(--color-zinc-400)", name: "" },
    ...thresholds.map((from, i) => ({ from, to: thresholds[i + 1] ?? top, color: rankById(ranks[i])!.color as string, name: rankById(ranks[i])!.name as string })),
  ]
  const next = score !== null ? thresholds.findIndex((t) => score < t) : -1
  const change = score !== null && previous?.score != null ? score - previous.score : undefined
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
      <span className="truncate text-[15px] font-medium text-ink sm:row-start-1">{scenario.name.replace(/^VT /, "")}</span>
      <span className="flex shrink-0 items-baseline justify-end gap-2 tabular-nums sm:col-start-3 sm:row-start-1">
        {change !== undefined && change !== 0 && <span className={cn("text-[12px]", change > 0 ? "text-win" : "text-loss")}>{signed(change)}</span>}
        <span className="text-[15px] font-semibold text-ink">{score ?? "—"}</span>
        <span className="w-[4.5rem] text-right text-[12px] font-medium" style={{ color: rank?.color }}>
          {rank?.name ?? (score === null ? T.notPlayed : "—")}
        </span>
      </span>
      <div
        className="relative col-span-2 mt-1.5 h-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0"
        title={segments
          .slice(1)
          .map((s) => `${s.name} ${s.from}`)
          .join(" · ")}
      >
        <div className="absolute inset-0 flex gap-[2px] overflow-hidden rounded-full">
          {segments.map((segment) => {
            const width = ((Math.min(segment.to, top) - segment.from) / top) * 100
            const lit = score === null ? 0 : Math.min(1, Math.max(0, (score - segment.from) / (segment.to - segment.from)))
            return (
              <span key={segment.from} className="relative h-full" style={{ width: `${width}%`, background: `color-mix(in oklab, ${segment.color} 20%, transparent)` }}>
                <span className="absolute inset-y-0 left-0" style={{ width: `${lit * 100}%`, background: segment.color }} />
              </span>
            )
          })}
        </div>
        {previous?.score != null && (
          <span
            className="absolute -top-1 h-4 w-[2px] -translate-x-1/2 rounded-full bg-navy/60"
            style={{ left: at(previous.score) }}
            title={`${T.previous}: ${previous.score}`}
          />
        )}
      </div>
      <p className="col-span-2 mt-1 text-[11px] tabular-nums text-muted sm:col-span-1 sm:col-start-2">
        {score === null
          ? null
          : next >= 0
            ? `${thresholds[next] - score} ${T.to} ${rankById(ranks[next])!.name}`
            : T.top}
        {scenario.accuracy !== undefined && score !== null && ` · ${Math.round(scenario.accuracy)}% ${T.accuracy}`}
      </p>
    </li>
  )
}
