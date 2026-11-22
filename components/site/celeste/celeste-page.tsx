import Link from "next/link"
import { Climb, type TopicRow } from "@/components/site/celeste/climb"
import { MountainBackdrop } from "@/components/site/celeste/mountain-backdrop"
import { DiversosNext } from "@/components/site/diversos/diversos-next"
import { LiveRow } from "@/components/site/diversos/diversos-page"
import { PageIntro } from "@/components/site/page-intro"
import { shortDate, weekday } from "@/components/site/ranked/format"
import { BarList, EmptyState, Fold, Section } from "@/components/site/ui"
import { ACHIEVEMENTS, CHAPTERS, CREDITS, FUNDAMENTALS, type Side } from "@/content/celeste"
import { games } from "@/content/projects"
import { livePath } from "@/lib/channel"
import { referencesPath } from "@/lib/celeste-fontes"
import { celestePath, checkCeleste, cutsOf, learningOf, save } from "@/lib/celeste"
import { placeOf } from "@/lib/celeste-view"
import { hours, type OtherGame, type playedOf } from "@/lib/diversos"
import type { Live } from "@/lib/lives"

const number = (n: number) => n.toLocaleString("pt-BR")
const NONE = "–"

export const CELESTE_INTRO = {
  title: "Minha trajetória com Celeste",
  description: "O meu caminho pra fazer tudo que Celeste tem, do Prólogo aos 202 morangos. Vou aprendendo nas lives e anotando o que estudei.",
}

const T = {
  next: "Próxima live",
  how: "Como funciona",
  method:
    "Depois de cada live, o roteiro é lido do save do jogo: o que eu terminei, as mortes, o tempo e os morangos. Nenhum passo é marcado na mão. Só o 1UP! e o jogo secreto vêm da Steam, porque o save não guarda os dois. Um fundamento vira Aprendendo no primeiro recorte ou no lado em que o jogo ensina, e Aprendi com o recorte em que saiu certo. O aprendizado eu também ajusto na mão, porque quem sabe se aprendi sou eu.",
  read: (day: string) => `Lido do meu save em ${shortDate(day)}.`,
  unread: "Comecei do zero. Os números entram depois da primeira live.",
  helped: "O save está com modo assistência ou variantes ligados.",
  references: "Referências e como a gente montou o roteiro",
  deaths: "Onde eu mais morri",
  days: "Mortes por dia",
  lives: "Lives",
  livesEmpty: "Nenhuma live de Celeste ainda. Quando tiver, ela entra aqui com o vídeo.",
}

/** /conteudo/diversos/celeste: the climb (climb.tsx), his numbers from the save, where he died, and the lives. */
export function CelestePage({ game, played, lives }: { game: OtherGame; played: ReturnType<typeof playedOf>; lives: Live[] }) {
  checkCeleste()
  const topics: TopicRow[] = FUNDAMENTALS.map((topic) => ({
    id: topic.id,
    stage: topic.stage,
    title: topic.title,
    what: topic.what,
    href: celestePath(topic),
    state: learningOf(topic),
    need: topic.need,
    cuts: cutsOf(topic, lives).length,
  }))
  // Only the lives on the site: a step credited to one held back has its day, no link.
  const links = Object.fromEntries(played.lives.map(({ live }) => [live.date, livePath(live.date)]))

  const totals = save.totals
  const red = CHAPTERS.reduce((sum, chapter) => sum + (chapter.red ?? 0), 0)
  const of = (done: number | undefined, total: number) => `${done ?? 0}/${total}`
  const stats = [
    { label: "Mortes", value: totals ? number(totals.deaths) : NONE },
    { label: "No jogo", value: totals ? hours(totals.seconds) : NONE },
    { label: "Dashes", value: totals ? number(totals.dashes) : NONE },
    { label: "Conquistas", value: of(save.achievements.length, ACHIEVEMENTS.length) },
    { label: "Morangos", value: of(totals?.red, red) },
    { label: "Dourados", value: of(totals?.golden, 26) },
    { label: "Corações", value: of(totals?.hearts, 24) },
    { label: "Fitas", value: of(totals?.cassettes, 8) },
  ]

  const worst = Object.entries(save.sides)
    .flatMap(([key, side]) => {
      if (!side?.deaths) return []
      const [area, letter] = key.split("/")
      return [{ id: key, label: placeOf(Number(area), letter as Side), value: side.deaths, display: number(side.deaths) }]
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
  const days = save.history
    .map((day, index) => {
      const deaths = day.deaths - (save.history[index - 1]?.deaths ?? 0)
      return { id: day.date, label: shortDate(day.date), value: deaths, display: number(deaths) }
    })
    .slice(-10)

  return (
    <>
      <MountainBackdrop />
      <PageIntro title={CELESTE_INTRO.title} description={CELESTE_INTRO.description} />

      <div className="mt-12">
        <Climb
          save={save}
          topics={topics}
          lives={links}
          path={celestePath()}
          stats={
            <div className="mt-8 space-y-4">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="eyebrow text-muted">{stat.label}</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] text-klein">{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-1 text-[13px] text-muted">
                <p>{save.read ? T.read(save.read) : T.unread}</p>
                {(save.assist || save.variants) && <p>{T.helped}</p>}
                <DiversosNext main={games.map((each) => each.id)} categoryId={game.categoryId} name={game.category} prefix={`${T.next}: `} className="block" />
              </div>
              <Fold summary={T.how}>{T.method}</Fold>
              <Link href={referencesPath()} className="block text-[14px] font-medium text-klein underline-offset-4 hover:underline">
                {T.references}
              </Link>
            </div>
          }
        />

        <div className="mt-16 space-y-16">
          {worst.length > 0 && (
            <Section title={T.deaths}>
              <BarList bars={worst} />
            </Section>
          )}
          {days.length > 1 && (
            <Section title={T.days}>
              <BarList bars={days} />
            </Section>
          )}
          <Section title={T.lives}>
            {played.lives.length === 0 ? (
              <EmptyState>{T.livesEmpty}</EmptyState>
            ) : (
              <ul className="space-y-4">
                {played.lives.map(({ live, seconds }) => (
                  <li key={live.date}>
                    <LiveRow live={live} meta={[weekday(live.date), hours(seconds)].join(" · ")} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{CREDITS}</p>
    </>
  )
}
