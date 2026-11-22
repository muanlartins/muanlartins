"use client"

import { CassetteTape, Check, Crown, Eye, EyeOff, Flag, Flame, Heart, Mountain as Peak, Search, Star, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Strawberry } from "@/components/site/celeste/glyphs"
import { LearningAccount, HandMark, LearningByHand, LearningState } from "@/components/site/celeste/learning-hand"
import { Mountain } from "@/components/site/celeste/mountain"
import { RankHeader } from "@/components/site/roadmap/rank-header"
import { shortDate } from "@/components/site/ranked/format"
import { Badge, Choice, Lattice, Section, cardClass } from "@/components/site/ui"
import { Timeline } from "@/components/ui/timeline"
import { ACHIEVEMENTS, EXTRAS, STAGES, type Need, type Stage, type StageIcon, type Step } from "@/content/celeste"
import { needLabel } from "@/components/site/celeste/learning"
import type { Learning, Save } from "@/lib/celeste"
import { TOTAL_STEPS, chapterName, doneIn, fillsOf, nextStep, stepText } from "@/lib/celeste-view"
import { currentRank } from "@/lib/progress"
import { cn } from "@/lib/utils"

const T = {
  now: "Próximo passo",
  finished: "Tudo feito. Valeu, galera!",
  steps: (done: number) => `${done} de ${TOTAL_STEPS} passos`,
  stage: (n: number) => `Etapa ${n}`,
  spoilers: "Mostrar spoilers",
  hide: "Esconder spoilers",
  hidden: "Os segredos ficam escondidos até eu achar.",
  fundamentals: "O que eu quero aprender aqui",
  cuts: (n: number) => (n === 1 ? "1 recorte" : `${n} recortes`),
  deaths: (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "morte" : "mortes"}`,
  hearts: (has: number, need: number, what: string) => `${Math.min(has, need)} de ${need} corações ${what}`,
  platinum: "Platina",
  platinumLine: "As 32 conquistas do jogo, contadas de novo nesta run, do zero.",
  secret: "Conquista secreta",
  extras: "O que mais tem de Celeste",
  extrasLine: "O save não conta esses, então eu marco na mão. Ficam fora dos passos e da platina.",
  others: "Os outros jogos",
  extraSecret: "Segredo",
  done: "Feito: ",
  missing: "Falta: ",
}

const ICONS: Record<StageIcon, LucideIcon> = {
  climb: Peak,
  search: Search,
  core: Flame,
  cassette: CassetteTape,
  heart: Heart,
  star: Star,
  clear: Flag,
  berry: Crown,
}

export interface TopicRow {
  id: string
  stage: string
  title: string
  what: string
  href: string
  state: Learning
  need: Need
  cuts: number
}

/**
 * The climb: the mountain with where he is, his numbers (`stats`), then the stages on the fundamentals' rail, each
 * with its steps by chapter and what he's learning in it, and the platinum. His save fills all of it, so unlike the
 * fundamentals' nothing here is the visitor's to mark; theirs is only whether spoilers show. What he's learning is the
 * one thing he can also set by hand (learning-hand.tsx).
 */
export function Climb({ save, topics, lives, stats, path }: { save: Save; topics: TopicRow[]; lives: Record<string, string>; stats: ReactNode; path: string }) {
  const [spoilers, setSpoilers] = useState(false)
  const fills = fillsOf(save)
  const current = currentRank(fills)
  const next = nextStep(save)
  const done = STAGES.reduce((sum, stage) => sum + doneIn(stage, save), 0)
  const titles = STAGES.map(({ id, platinum, title }) => ({ id, platinum, title }))

  return (
    <LearningByHand>
      <div className="cut relative overflow-hidden bg-klein text-paper">
        <Lattice fade="bottom" />
        <div className="relative grid items-end sm:grid-cols-[15rem_1fr]">
          <div className="space-y-2 p-6 sm:self-center sm:pr-0">
            {next ? (
              <>
                <p className="eyebrow text-klein-claro">{T.now}</p>
                <p className="text-2xl font-medium tracking-[-0.02em]">{chapterName(next.step.area)}</p>
                <p className="text-[15px]">{stepName(next.step, save, spoilers)}</p>
                <a href={`#${next.stage.id}`} className="inline-block text-[13px] text-klein-claro underline-offset-4 hover:underline focus-visible:outline-paper">
                  {T.stage(current + 1)} · {titles[current].title}
                </a>
              </>
            ) : (
              <p className="text-2xl font-medium tracking-[-0.02em]">{T.finished}</p>
            )}
            <p className="pt-3 text-[13px] tabular-nums text-klein-claro">{T.steps(done)}</p>
          </div>
          <Mountain stages={titles} fills={fills} current={current} />
        </div>
      </div>

      {stats}

      <section className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[24rem] text-[15px] leading-[1.6] text-muted">{T.hidden}</p>
          <Choice
            size="sm"
            on={spoilers}
            onClick={() => setSpoilers(!spoilers)}
            icon={spoilers ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
          >
            {spoilers ? T.hide : T.spoilers}
          </Choice>
        </div>

        <Timeline
          fills={fills}
          current={current}
          marker={() => <Strawberry size={26} />}
          data={STAGES.map((stage, index) => ({
            id: stage.id,
            dot: <StageDot reached={index <= current} />,
            title: <StageHeader stage={stage} n={index + 1} title={titles[index].title} save={save} ahead={index > current} />,
            content: (
              <StageBody
                stage={stage}
                save={save}
                spoilers={spoilers}
                lives={lives}
                next={next?.step.key}
                topics={topics.filter((topic) => topic.stage === stage.id)}
              />
            ),
          }))}
        />
      </section>

      <Section id="platina" title={`${T.platinum} · ${save.achievements.length}/${ACHIEVEMENTS.length}`} description={T.platinumLine} className="mt-16">
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {ACHIEVEMENTS.map((achievement) => {
            const earned = save.achievements.includes(achievement.id)
            return (
              <li key={achievement.id} className={cn("flex items-center gap-2 px-2.5 py-2 text-[13px] leading-snug", earned ? "bg-klein text-paper" : "bg-klein/[0.06] text-ink")}>
                <Box on={earned} />
                <span className="sr-only">{earned ? T.done : T.missing}</span>
                {achievement.secret && !earned && !spoilers ? T.secret : achievement.name}
              </li>
            )
          })}
        </ul>
      </Section>

      <Section id="extras" title={T.extras} description={T.extrasLine} className="mt-16">
        {[false, true].map((other) => (
          <div key={String(other)} className="mt-4 first:mt-0">
            {other && <p className="eyebrow mb-2 text-muted">{T.others}</p>}
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {EXTRAS.filter((extra) => !!extra.other === other).map((extra) => (
                <li key={extra.id}>
                  <HandMark id={extra.id}>{extra.secret && !spoilers ? T.extraSecret : extra.text}</HandMark>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <LearningAccount path={path} className="mt-4" />
      </Section>
    </LearningByHand>
  )
}

/** The next step by itself, away from its row: "Morango dourado do lado B". */
function stepName(step: Step, save: Save, spoilers: boolean) {
  return (!(step.secret && !spoilers) && step.next) || stepText(step, save, spoilers)
}

function StageDot({ reached }: { reached: boolean }) {
  return <span className={cn("h-4 w-4 rotate-45 border-2 border-klein", reached ? "bg-klein" : "bg-ground")} />
}

function StageHeader({ stage, n, title, save, ahead }: { stage: Stage; n: number; title: string; save: Save; ahead: boolean }) {
  const Icon = ICONS[stage.icon]
  return (
    <div>
      <span aria-hidden className={cn("cut mb-3 grid h-14 w-14 place-items-center", ahead ? "bg-klein/15 text-klein" : "bg-klein text-paper")}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="eyebrow mb-1 flex flex-wrap items-center gap-2 text-muted">
        {T.stage(n)}
        {stage.platinum && <Badge>{T.platinum}</Badge>}
      </p>
      <RankHeader name={title} color="var(--color-klein)" summary={stage.summary} done={doneIn(stage, save)} total={stage.steps.length} ahead={ahead} />
    </div>
  )
}

function StageBody({ stage, save, spoilers, lives, next, topics }: { stage: Stage; save: Save; spoilers: boolean; lives: Record<string, string>; next?: string; topics: TopicRow[] }) {
  const areas = [...new Set(stage.steps.map((step) => step.area))]
  const hearts = save.totals?.hearts ?? 0
  // One look down a stage: the chips under the chapter's name, unless every chapter has only one.
  const stacked = stage.steps.length > areas.length

  return (
    <div className="space-y-8">
      {stage.hearts && (
        <p className={cn("flex items-center gap-2 text-[13px] tabular-nums", hearts >= stage.hearts.need ? "text-klein" : "text-muted")}>
          <Heart aria-hidden className={cn("h-4 w-4", hearts >= stage.hearts.need && "fill-current")} />
          {T.hearts(hearts, stage.hearts.need, stage.hearts.what)}
        </p>
      )}

      <ul className="divide-y divide-line border-y border-line">
        {areas.map((area) => {
          const steps = stage.steps.filter((step) => step.area === area)
          const played = steps.flatMap((step) => (step.side && save.sides[`${area}/${step.side}`]) || [])
          const deaths = played.reduce((sum, side) => sum + side.deaths, 0)
          return (
            <li key={area} className={cn("flex gap-x-4 gap-y-2 py-2.5", stacked ? "flex-col items-start" : "flex-wrap items-center justify-between")}>
              <p className="text-[15px] font-medium text-ink">
                {chapterName(area)}
                {played.length > 0 && <span className="block text-[13px] font-normal tabular-nums text-muted">{T.deaths(deaths)}</span>}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {steps.map((step) => (
                  <li key={step.key}>
                    <StepChip step={step} save={save} spoilers={spoilers} lives={lives} next={step.key === next} />
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      {topics.length > 0 && (
        <div>
          <p id={`fundamentos-${stage.id}`} className="eyebrow mb-3 text-muted">
            {T.fundamentals}
          </p>
          <ul aria-labelledby={`fundamentos-${stage.id}`} className="space-y-2">
            {topics.map((topic) => (
              <li
                key={topic.id}
                className={cn(cardClass, "group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 backdrop-blur-sm transition-colors hover:border-klein", !topic.cuts && "bg-paper/30")}
              >
                <Link href={topic.href} className="min-w-0 flex-1 basis-48">
                  <span className="block">
                    <span className="block text-[15px] font-medium leading-snug text-ink group-hover:text-klein">{topic.title}</span>
                    <span className="mt-1 block text-[13px] leading-[1.5] text-muted">
                      <span className="font-medium text-ink">{needLabel(topic.need)}.</span> {topic.what}
                      {topic.cuts > 0 && <span className="text-klein"> · {T.cuts(topic.cuts)}</span>}
                    </span>
                  </span>
                </Link>
                <LearningState id={topic.id} title={topic.title} auto={topic.state} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Box({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center border", on ? "border-paper/80" : "border-line-strong")}>
      {on && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
    </span>
  )
}

/** A step: Klein once the save has it (a link to the live it was done in), ringed when it's the next. */
function StepChip({ step, save, spoilers, lives, next }: { step: Step; save: Save; spoilers: boolean; lives: Record<string, string>; next: boolean }) {
  const fact = save.done[step.key]
  const href = fact?.live ? lives[fact.live] : undefined
  const title = fact?.date ? `Feito ${href ? "na live de" : "em"} ${shortDate(fact.date)}` : undefined
  const className = cn(
    "inline-flex items-center gap-1.5 px-2 py-1 text-[14px] tabular-nums",
    fact ? "bg-klein text-paper" : "bg-klein/[0.06] text-ink",
    next && "ring-2 ring-klein",
  )
  const inner = (
    <>
      <Box on={!!fact} />
      <span className="sr-only">{fact ? T.done : T.missing}</span>
      {stepText(step, save, spoilers)}
      {title && <span className="sr-only">, {title}</span>}
    </>
  )
  return href ? (
    <Link href={href} title={title} className={cn(className, "transition-colors hover:bg-navy")}>
      {inner}
    </Link>
  ) : (
    <span title={title} className={className}>
      {inner}
    </span>
  )
}
