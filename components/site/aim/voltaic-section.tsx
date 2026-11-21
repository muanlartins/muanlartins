"use client"

import { Gauge, Radar, Timer } from "lucide-react"
import { useState } from "react"
import { AimRadar } from "@/components/site/aim/aim-radar"
import { EnergyChart } from "@/components/site/aim/energy-chart"
import { ScenarioList } from "@/components/site/aim/scenario-list"
import { TrainingCalendar } from "@/components/site/aim/training-calendar"
import { Crosshair } from "@/components/site/game/crosshair"
import { Fold, Section, TabPanel, Tabs } from "@/components/site/ui"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { LEVELS, RANKS, rankById, type VoltaicSummary } from "@/lib/voltaic"

const T = localize({
  title: { pt: "O benchmark", en: "The benchmark" },
  description: {
    pt: "Todo domingo, os 18 cenários da Voltaic no Aimlabs: cada pontuação vira energia e rank (os ranks da Voltaic, não os do Valorant).",
    en: "Every Sunday, Voltaic's 18 scenarios in Aimlabs: each score becomes energy and a rank (Voltaic's ranks, not Valorant's).",
  },
  tabs: { pt: "O benchmark", en: "The benchmark" },
  shape: { pt: "Formato", en: "Shape" },
  shapeHint: {
    pt: "Cada eixo é uma subcategoria, com a energia do seu melhor cenário; os anéis são os ranks do nível.",
    en: "Each axis is a subcategory, at its best scenario's energy; the rings are the level's ranks.",
  },
  sundays: { pt: "Por domingo", en: "By Sunday" },
  scenarios: { pt: "Cenários", en: "Scenarios" },
  scenariosHint: {
    pt: "A melhor pontuação de cada cenário no dia do benchmark. A barra acende pelos ranks; o traço é o domingo anterior.",
    en: "Each scenario's best score on benchmark day. The bar lights up through the ranks; the tick is the Sunday before.",
  },
  days: { pt: "Dias de treino", en: "Days trained" },
  daysHint: { pt: "Cada quadrado é um dia, mais forte quanto mais minutos. Escolhe um dia pra ver o que treinei.", en: "Each square is a day, darker with more minutes. Pick a day to see what I trained." },
  noBenchmark: { pt: "O primeiro benchmark entra aqui no próximo domingo.", en: "The first benchmark shows up here next Sunday." },
  how: { pt: "Como funciona o benchmark", en: "How the benchmark works" },
  week: { pt: "A semana", en: "The week" },
  weekText: {
    pt: "Todo dia, a rotina da Voltaic no Aimlabs, uns 20 minutos. No domingo, o benchmark: 18 cenários, uma vez cada.",
    en: "Every day, Voltaic's routine in Aimlabs, about 20 minutes. On Sunday, the benchmark: 18 scenarios, once each.",
  },
  routine: { pt: "Rotina", en: "Routine" },
  benchmark: { pt: "Benchmark", en: "Benchmark" },
  weekdays: { pt: "Dom Seg Ter Qua Qui Sex Sáb", en: "Sun Mon Tue Wed Thu Fri Sat" },
  ladder: { pt: "Da pontuação ao rank", en: "From score to rank" },
  ladderText: {
    pt: "Cada pontuação vira energia, 100 por rank. A energia geral é a média das 9 subcategorias, puxada pela mais fraca, e é ela que dá o rank.",
    en: "Each score becomes energy, 100 per rank. The overall energy is the mean of the 9 subcategories, pulled down by the weakest, and it sets the rank.",
  },
  me: { pt: "Eu", en: "Me" },
})

type Tab = "shape" | "sundays" | "scenarios" | "days"

/**
 * Voltaic's benchmark in one section, one view at a time: the aim's shape (the radar against the Sunday before), the
 * energy Sunday by Sunday over the ranks, every scenario through its thresholds, and the days trained; how the week
 * and the ranks work folded under it.
 */
export function VoltaicSection({ summary, today }: { summary: VoltaicSummary; today: string }) {
  const latest = summary.benchmarks.at(-1)
  const previous = summary.benchmarks.at(-2)
  const items: { id: Tab; label: string }[] = [
    ...(latest
      ? [
          { id: "shape" as const, label: T.shape },
          { id: "sundays" as const, label: T.sundays },
          { id: "scenarios" as const, label: T.scenarios },
        ]
      : []),
    { id: "days", label: T.days },
  ]
  const [tab, setTab] = useState<Tab>(items[0].id)

  return (
    <Section title={T.title} icon={Radar} description={T.description}>
      <div className="space-y-6">
        <Tabs label={T.tabs} items={items} value={tab} onChange={setTab} idPrefix="voltaic" />
        {latest && tab === "shape" && (
          <TabPanel idPrefix="voltaic" id="shape" className="space-y-4">
            <p className="max-w-[38rem] text-[13px] leading-[1.5] text-muted">{T.shapeHint}</p>
            <AimRadar benchmark={latest} previous={previous} />
          </TabPanel>
        )}
        {latest && tab === "sundays" && (
          <TabPanel idPrefix="voltaic" id="sundays">
            <EnergyChart benchmarks={summary.benchmarks} />
          </TabPanel>
        )}
        {latest && tab === "scenarios" && (
          <TabPanel idPrefix="voltaic" id="scenarios" className="space-y-4">
            <p className="max-w-[38rem] text-[13px] leading-[1.5] text-muted">{T.scenariosHint}</p>
            <ScenarioList benchmark={latest} previous={previous} />
          </TabPanel>
        )}
        {tab === "days" && (
          <TabPanel idPrefix="voltaic" id="days" className="space-y-4">
            <p className="max-w-[38rem] text-[13px] leading-[1.5] text-muted">{T.daysHint}</p>
            <TrainingCalendar days={summary.days} today={today} />
          </TabPanel>
        )}
        {!latest && <p className="text-[13px] text-muted">{T.noBenchmark}</p>}
        <Fold summary={T.how}>
          <HowItWorks rank={latest?.rank ?? null} />
        </Fold>
      </div>
    </Section>
  )
}

/**
 * The method at a glance: the week (the routine every day, the benchmark on Sunday) and the twelve Voltaic ranks by
 * level, the energy each starts at, with Luan's marked by the crosshair as on Valorant's own ladder.
 */
function HowItWorks({ rank }: { rank: string | null }) {
  const days = T.weekdays.split(" ")
  const mine = RANKS.findIndex((r) => r.id === rank)
  return (
    <div className="space-y-8 text-ink">
      <div className="space-y-3">
        <h3 className="text-[15px] font-medium">{T.week}</h3>
        <ol className="grid grid-cols-7 gap-1.5">
          {days.map((day, index) => {
            const sunday = index === 0
            const Icon = sunday ? Gauge : Timer
            return (
              <li
                key={day}
                className={cn("cut-sm flex flex-col items-center gap-1.5 px-1 py-3 text-center", sunday ? "bg-navy text-paper" : "cut-edge relative border border-line bg-paper/70 text-klein")}
              >
                <span className={cn("eyebrow", sunday ? "text-paper/80" : "text-muted")}>{day}</span>
                <Icon aria-hidden className="h-4 w-4" />
                <span className="hidden text-[12px] font-medium sm:block">{sunday ? T.benchmark : T.routine}</span>
              </li>
            )
          })}
        </ol>
        <p className="text-[15px] leading-[1.6]">{T.weekText}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[15px] font-medium">{T.ladder}</h3>
        <div className="space-y-2">
          {LEVELS.map((level) => (
            <div key={level.id} className="cut cut-edge relative border border-line bg-paper/70 px-3 pb-3 pt-2.5">
              <p className="eyebrow text-muted">{localize(level.name)}</p>
              <ol className="mt-2 grid grid-cols-4 gap-1">
                {level.ranks.map((id, index) => {
                  const voltaic = rankById(id)!
                  const at = RANKS.findIndex((r) => r.id === id)
                  const current = at === mine
                  return (
                    <li key={id} className="flex flex-col items-center gap-1 text-center">
                      <span className="flex h-3.5 items-end">{current && <Crosshair size={12} />}</span>
                      <svg viewBox="0 0 20 20" aria-hidden className={cn(current ? "h-7 w-7" : "h-5 w-5", at > mine && !current && "opacity-40")}>
                        <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill={voltaic.color} />
                      </svg>
                      <span className={cn("text-[12px] leading-tight", current ? "font-semibold text-ink" : "text-muted")}>{voltaic.name}</span>
                      <span className="text-[12px] tabular-nums text-muted">{level.points[index + 1]}</span>
                      {current && <span className="sr-only">{T.me}</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>
        <p className="text-[15px] leading-[1.6]">{T.ladderText}</p>
      </div>
    </div>
  )
}
