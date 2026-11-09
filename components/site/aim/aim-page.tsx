import { CalendarDays, Crosshair as CrosshairIcon, Flame, Gauge, Hexagon, Radar, Timer, TrendingUp, type LucideIcon } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { AimRadar } from "@/components/site/aim/aim-radar"
import { Crosshair } from "@/components/site/game/crosshair"
import { EnergyChart } from "@/components/site/aim/energy-chart"
import { EnergyCore } from "@/components/site/aim/energy-core"
import { ScenarioList } from "@/components/site/aim/scenario-list"
import { TrainingCalendar } from "@/components/site/aim/training-calendar"
import { PageIntro } from "@/components/site/page-intro"
import { longDate, signed } from "@/components/site/ranked/format"
import { dayOf } from "@/lib/ranked"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { LEVELS, RANKS, rankById, standingOf, summarizeVoltaic, type VoltaicDay } from "@/lib/voltaic"

const T = localize({
  empty: {
    pt: "O treino entra aqui a partir do primeiro dia: a rotina da Voltaic no Aimlabs, e o benchmark de domingo com o rank de cada cenário.",
    en: "Training shows up here from the first day on: Voltaic's Aimlabs routine, and Sunday's benchmark with each scenario's rank.",
  },
  unranked: { pt: "Sem rank", en: "Unranked" },
  benchmarkOf: { pt: "benchmark de", en: "benchmark of" },
  energy: { pt: "de energia", en: "energy" },
  to: { pt: "para", en: "to" },
  top: { pt: "No topo da Voltaic", en: "At Voltaic's top" },
  sinceLast: { pt: "desde o domingo anterior", en: "since the Sunday before" },
  focus: { pt: "Onde focar", en: "Where to focus" },
  focusWhy: {
    pt: "A energia geral é a média harmônica das 9 subcategorias: a mais fraca é a que mais segura o rank.",
    en: "The overall energy is the harmonic mean of the 9 subcategories: the weakest holds the rank back the most.",
  },
  days: { pt: "Dias de treino", en: "Days trained" },
  streak: { pt: "Sequência", en: "Streak" },
  dayUnit: { pt: "dias", en: "days" },
  day1: { pt: "dia", en: "day" },
  best: { pt: "recorde", en: "best" },
  time: { pt: "Tempo de mira", en: "Time aiming" },
  benchmarks: { pt: "Benchmarks", en: "Benchmarks" },
  shape: { pt: "O formato da mira", en: "The aim's shape" },
  shapeHint: {
    pt: "Cada eixo é uma subcategoria do benchmark, com a energia do seu melhor cenário. Os anéis são os ranks do nível.",
    en: "Each axis is one of the benchmark's subcategories, at its best scenario's energy. The rings are the level's ranks.",
  },
  progress: { pt: "Energia por domingo", en: "Energy by Sunday" },
  scenarios: { pt: "Cenários", en: "Scenarios" },
  scenariosHint: {
    pt: "A melhor pontuação de cada cenário no dia do benchmark. A barra acende pelos ranks; o traço é o domingo anterior.",
    en: "Each scenario's best score on benchmark day. The bar lights up through the ranks; the tick is the Sunday before.",
  },
  training: { pt: "Treino", en: "Training" },
  trainingHint: {
    pt: "Cada quadrado é um dia, mais forte quanto mais minutos. Clique num dia para ver o que treinei.",
    en: "Each square is a day, darker with more minutes. Click a day to see what I trained.",
  },
  how: { pt: "Como funciona", en: "How it works" },
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
  notValorant: { pt: "São os ranks da Voltaic, não os do Valorant.", en: "These are Voltaic's ranks, not Valorant's." },
  me: { pt: "Eu", en: "Me" },
  creditsVoltaic: { pt: "Benchmark e rotina da", en: "Benchmark and routine by" },
  creditsAimlabs: { pt: ", jogados no", en: ", played in" },
  creditsData: { pt: ". Os números saem do próprio Aimlabs, no meu PC.", en: ". The numbers come straight from Aimlabs, on my PC." },
})

/**
 * Luan's aim training with Voltaic (lib/voltaic.ts): the latest benchmark's rank and energy as a core with the way to
 * the next rank, the subcategory holding it back, the aim's shape (a radar of the nine subcategories against the
 * Sunday before), the energy Sunday by Sunday over the ranks, every scenario through its rank thresholds, and every
 * day trained as a calendar that opens each day's tasks.
 */
export function AimPage({ title, description, days, credits }: { title: string; description: string; days: VoltaicDay[]; credits: string }) {
  const summary = summarizeVoltaic(days)
  const today = dayOf(new Date().toISOString())
  const latest = summary.benchmarks.at(-1)
  const previous = summary.benchmarks.at(-2)

  return (
    <>
      <PageIntro title={title} description={description} />
      <div className="mt-12 space-y-16">
        {summary.days.length === 0 ? (
          <p className="max-w-[38rem] text-[16px] leading-[1.7] text-ink">{T.empty}</p>
        ) : (
          <>
            <Hero summary={summary} today={today} />

            {latest && (
              <Section icon={Radar} title={T.shape} hint={T.shapeHint}>
                <AimRadar benchmark={latest} previous={previous} />
              </Section>
            )}

            {latest && (
              <Section icon={TrendingUp} title={T.progress}>
                <EnergyChart benchmarks={summary.benchmarks} />
              </Section>
            )}

            {latest && (
              <Section icon={CrosshairIcon} title={T.scenarios} hint={T.scenariosHint}>
                <ScenarioList benchmark={latest} previous={previous} />
              </Section>
            )}

            <Section icon={CalendarDays} title={T.training} hint={T.trainingHint}>
              <TrainingCalendar days={summary.days} today={today} />
            </Section>
          </>
        )}

        <Section icon={Hexagon} title={T.how}>
          <HowItWorks rank={latest?.rank ?? null} />
        </Section>
      </div>
      <div className="mt-16 space-y-2 text-[12px] leading-[1.6] text-muted">
        <p>
          {T.creditsVoltaic}{" "}
          <a href="https://voltaic.gg" target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-klein">
            Voltaic
          </a>
          {T.creditsAimlabs}{" "}
          <a href="https://aimlabs.com" target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-klein">
            Aimlabs
          </a>
          {T.creditsData}
        </p>
        <p>{credits}</p>
      </div>
    </>
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
    <div className="space-y-10">
      <div className="space-y-3">
        <h3 className="text-[15px] font-medium text-ink">{T.week}</h3>
        <ol className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((day, index) => {
            const sunday = index === 0
            const Icon = sunday ? Gauge : Timer
            return (
              <li
                key={day}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border px-1 py-3 text-center",
                  sunday ? "border-navy bg-navy text-paper" : "border-line bg-paper/70 text-klein backdrop-blur-sm",
                )}
              >
                <span className={cn("text-[11px] font-medium uppercase tracking-[0.08em]", sunday ? "text-paper/80" : "text-muted")}>{day}</span>
                <Icon aria-hidden className="h-4 w-4" />
                <span className="hidden text-[12px] font-medium sm:block">{sunday ? T.benchmark : T.routine}</span>
              </li>
            )
          })}
        </ol>
        <p className="max-w-[40rem] text-[14px] leading-[1.6] text-ink">{T.weekText}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[15px] font-medium text-ink">{T.ladder}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <div key={level.id} className="rounded-md border border-line bg-paper/70 px-3 pb-3 pt-2.5 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{localize(level.name)}</p>
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
                      <span className={cn("text-[10px] leading-tight", current ? "font-semibold" : "text-muted")} style={current ? { color: voltaic.color } : undefined}>
                        {voltaic.name}
                      </span>
                      <span className="text-[10px] tabular-nums text-muted">{level.points[index + 1]}</span>
                      {current && <span className="sr-only">{T.me}</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>
        <p className="max-w-[40rem] text-[14px] leading-[1.6] text-ink">{T.ladderText}</p>
        <p className="text-[12px] text-muted">{T.notValorant}</p>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2.5 text-2xl font-medium tracking-[-0.02em] text-klein">
        <Icon aria-hidden className="h-5 w-5" />
        {title}
      </h2>
      {hint && <p className="mt-1 max-w-[42rem] text-[13px] leading-[1.5] text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Hero({ summary, today }: { summary: ReturnType<typeof summarizeVoltaic>; today: string }) {
  const latest = summary.benchmarks.at(-1)
  const previous = summary.benchmarks.at(-2)
  const level = latest && LEVELS.find((l) => l.id === latest.level)
  // Ranked, the way to the next 100; below the level's first rank, the way to it.
  const standing =
    latest && level
      ? latest.rank
        ? standingOf(latest.energy)
        : { rank: undefined, next: { rank: rankById(level.ranks[0])!, at: level.points[1] }, from: level.points[0] }
      : undefined
  const rank = standing?.rank
  const color = rank?.color ?? "#5f6675"
  const progress = latest && standing?.next ? (latest.energy - standing.from) / (standing.next.at - standing.from) : 1
  const weakest = latest ? [...latest.subcategories].sort((a, b) => a.energy - b.energy)[0] : undefined
  // A streak still counts when the last day trained was today or yesterday.
  const yesterday = new Date(`${today}T12:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const alive = summary.lastDay === today || summary.lastDay === yesterday.toISOString().slice(0, 10)
  const streak = alive ? summary.streak : 0
  const hours = Math.floor(summary.totalMinutes / 60)
  const minutes = summary.totalMinutes % 60

  return (
    <section className="space-y-4">
      <div className="grid gap-6 rounded-md border border-line bg-paper/70 p-5 backdrop-blur-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-6">
        {latest && standing ? (
          <div className="flex items-center gap-5" style={{ "--rank": color } as CSSProperties}>
            <EnergyCore energy={latest.energy} color={color} progress={progress} />
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="rank-metal text-3xl font-medium tracking-[-0.02em]" style={{ backgroundPosition: "0% 0%" }}>
                  {rank?.name ?? T.unranked}
                </span>
                {latest.complete && <span className="rounded-full bg-klein px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-paper">Complete</span>}
              </p>
              <p className="text-[13px] text-muted">
                {level && localize(level.name)} · {T.benchmarkOf} {longDate(latest.date)}
              </p>
              <p className="text-[14px] tabular-nums text-ink">
                {standing.next ? (
                  <>
                    <span className="font-semibold">{standing.next.at - latest.energy}</span> {T.energy} {T.to}{" "}
                    <span className="font-medium" style={{ color: standing.next.rank.color }}>
                      {standing.next.rank.name}
                    </span>
                  </>
                ) : (
                  T.top
                )}
              </p>
              {previous && (
                <p className="text-[13px] tabular-nums">
                  <span className={cn("font-medium", latest.energy >= previous.energy ? "text-win" : "text-loss")}>{signed(latest.energy - previous.energy)}</span>{" "}
                  <span className="text-muted">{T.sinceLast}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        {weakest ? (
          <div className="space-y-2 sm:border-l sm:border-line sm:pl-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{T.focus}</p>
            <p className="flex items-baseline gap-2">
              <span className="text-2xl font-medium tracking-[-0.02em] text-klein">{weakest.name}</span>
              <span className="text-[14px] text-muted">{weakest.category}</span>
              <span className="ml-auto text-[14px] tabular-nums text-ink">
                <span className="text-xl font-semibold">{weakest.energy}</span>
              </span>
            </p>
            <div className="flex h-1.5 gap-[2px]" aria-hidden>
              {latest!.subcategories.map((sub) => (
                <span key={sub.name} className={cn("flex-1 rounded-full", sub === weakest ? "bg-klein" : "bg-zinc-200")} title={`${sub.name} ${sub.energy}`} />
              ))}
            </div>
            <p className="text-[13px] leading-[1.5] text-muted">{T.focusWhy}</p>
          </div>
        ) : (
          <div />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={T.days} value={`${summary.days.length}`} />
        <Tile
          label={T.streak}
          value={
            <span className="inline-flex items-center gap-1.5">
              {streak > 0 && <Flame aria-hidden className="h-5 w-5 text-klein" />}
              {streak} {streak === 1 ? T.day1 : T.dayUnit}
            </span>
          }
          note={summary.longestStreak > 1 ? `${T.best}: ${summary.longestStreak}` : undefined}
        />
        <Tile label={T.time} value={hours ? `${hours} h ${minutes} min` : `${minutes} min`} />
        <Tile label={T.benchmarks} value={`${summary.benchmarks.length}`} />
      </dl>
    </section>
  )
}

function Tile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-md border border-line px-4 py-3">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{value}</dd>
      {note && <dd className="text-[12px] text-muted">{note}</dd>}
    </div>
  )
}
