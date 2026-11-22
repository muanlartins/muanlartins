import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { LearningAccount, LearningByHand, LearningState } from "@/components/site/celeste/learning-hand"
import { MountainBackdrop } from "@/components/site/celeste/mountain-backdrop"
import { needLabel } from "@/components/site/celeste/learning"
import { SourceLink } from "@/components/site/celeste/source-link"
import { TECHNIQUES } from "@/components/site/celeste/tecnicas"
import { DocPage, DocSection } from "@/components/site/docs"
import { shortDate } from "@/components/site/ranked/format"
import { Badge, EmptyState } from "@/components/site/ui"
import { YouTubeVideo } from "@/components/site/youtube-video"
import { CREDITS, FUNDAMENTALS, STAGES, type Fundamental } from "@/content/celeste"
import { SOURCES } from "@/content/celeste-fontes"
import { livePath } from "@/lib/channel"
import { celestePath, cutsOf, learningOf, save } from "@/lib/celeste"
import { hrefOf, referencesPath, studyOf } from "@/lib/celeste-fontes"
import { placeOf } from "@/lib/celeste-view"
import { hours } from "@/lib/diversos"
import type { Live } from "@/lib/lives"
import { UI } from "@/lib/site"

const T = {
  stage: "Etapa",
  mine: "Meu aprendizado",
  need: "Pra completar",
  taught: "O jogo ensina",
  untaught: "Não ensina",
  cuts: "Recortes das lives",
  onLives: "Nas lives",
  empty: "Nenhum recorte ainda. O primeiro entra quando eu tentar isso na live.",
  first: "Saiu certo",
  onLive: "Ver a live",
  where: "Onde eu aprendo no jogo",
  notPlayed: "Ainda não joguei esse lado.",
  study: "Por onde vou estudar",
  kinds: { read: "Ler", watch: "Ver", practice: "Treinar" },
  all: "Todas as referências",
  around: "Outros fundamentos",
}

/**
 * A fundamental with a catalogue page (components/site/celeste/tecnicas): the game filmed, how it works and its
 * curiosities, then the lives' cuts when there are any. The rest keep the plain page below.
 */
function CataloguePage({ topic, lives }: { topic: Fundamental; lives: Live[] }) {
  const stage = STAGES.find((each) => each.id === topic.stage)!
  const { sections } = TECHNIQUES[topic.id]()
  const cuts = cutsOf(topic, lives)
  const index = FUNDAMENTALS.indexOf(topic)
  const [previous, next] = [FUNDAMENTALS[index - 1], FUNDAMENTALS[index + 1]]
  const toc = [...sections.map(({ id, title }) => ({ id, title })), ...(cuts.length ? [{ id: "recortes", title: T.onLives }] : [])]

  return (
    <LearningByHand>
      <MountainBackdrop />
      <DocPage
        trail={[{ label: "Celeste", href: `${celestePath()}#${stage.id}` }]}
        here={`${T.stage} ${STAGES.indexOf(stage) + 1} · ${stage.title}`}
        title={topic.title}
        description={topic.what}
        meta={[
          { label: T.mine, value: <LearningState id={topic.id} title={topic.title} auto={learningOf(topic)} /> },
          { label: T.need, value: needLabel(topic.need) },
        ]}
        toc={toc}
      >
        {sections.map((section, n) => (
          <DocSection key={section.id} id={section.id} n={n + 1} title={section.title} description={section.description}>
            {section.body}
          </DocSection>
        ))}
        {cuts.length > 0 && (
          <DocSection id="recortes" n={toc.length} title={T.onLives}>
            <Cuts cuts={cuts} />
          </DocSection>
        )}

        <LearningAccount path={celestePath(topic)} className="mt-10" />
        <nav aria-label={T.around} className="mt-24 grid grid-cols-2 gap-6 border-t border-line pt-3">
          {previous ? <Neighbour topic={previous} label={UI.previous} /> : <span />}
          {next && <Neighbour topic={next} label={UI.next} forward />}
        </nav>
        <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{CREDITS}</p>
      </DocPage>
    </LearningByHand>
  )
}

/**
 * A fundamental of Celeste as Luan learns it: what it is in a line, the lives' cuts in the order they happened, his
 * numbers on the side where the game teaches it, and where he's learning it. Teaching it is the second phase's.
 */
export function CelesteTopicPage({ topic, lives }: { topic: Fundamental; lives: Live[] }) {
  if (TECHNIQUES[topic.id]) return <CataloguePage topic={topic} lives={lives} />
  const stage = STAGES.find((each) => each.id === topic.stage)!
  const cuts = cutsOf(topic, lives)
  const side = topic.taught && save.sides[`${topic.taught.area}/${topic.taught.side}`]
  const place = topic.taught && placeOf(topic.taught.area, topic.taught.side)
  const index = FUNDAMENTALS.indexOf(topic)
  const [previous, next] = [FUNDAMENTALS[index - 1], FUNDAMENTALS[index + 1]]
  const toc = [
    { id: "recortes", title: T.cuts },
    ...(topic.taught ? [{ id: "onde-o-jogo-ensina", title: T.where }] : []),
    { id: "estudar", title: T.study },
  ]

  return (
    <LearningByHand>
      <MountainBackdrop />
      <DocPage
        trail={[{ label: "Celeste", href: `${celestePath()}#${stage.id}` }]}
        here={`${T.stage} ${STAGES.indexOf(stage) + 1} · ${stage.title}`}
        title={topic.title}
        description={topic.what}
        meta={[
          { label: T.mine, value: <LearningState id={topic.id} title={topic.title} auto={learningOf(topic)} /> },
          { label: T.need, value: needLabel(topic.need) },
          { label: T.taught, value: place ?? T.untaught },
        ]}
        toc={toc}
      >
        <DocSection id="recortes" n={1} title={T.cuts}>
          {cuts.length === 0 ? (
            <EmptyState>{T.empty}</EmptyState>
          ) : (
            <Cuts cuts={cuts} />
          )}
        </DocSection>

        {topic.taught && (
          <DocSection id="onde-o-jogo-ensina" n={2} title={T.where}>
            <p className="text-[17px] leading-[1.6] text-ink">
              {place}. {side ? `${side.deaths.toLocaleString("pt-BR")} ${side.deaths === 1 ? "morte" : "mortes"} em ${hours(side.seconds)} até agora.` : T.notPlayed}
            </p>
          </DocSection>
        )}

        <DocSection id="estudar" n={toc.length} title={T.study}>
          <div className="max-w-[38rem] space-y-8">
            {studyOf(topic).map(({ kind, refs }) => (
              <div key={kind}>
                <h3 className="eyebrow mb-2 text-muted">{T.kinds[kind]}</h3>
                <ul className="divide-y divide-line border-y border-line">
                  {refs.map((ref, index) => (
                    <SourceLink key={index} source={SOURCES[ref.source]} href={hrefOf(ref)} at={ref.at ? clockAt(ref.at) : undefined}>
                      {ref.where}
                    </SourceLink>
                  ))}
                </ul>
              </div>
            ))}
            <Link href={referencesPath()} className="inline-block text-[14px] font-medium text-klein underline-offset-4 hover:underline">
              {T.all}
            </Link>
          </div>
        </DocSection>

        <LearningAccount path={celestePath(topic)} className="mt-10" />

        <nav aria-label={T.around} className="mt-24 grid grid-cols-2 gap-6 border-t border-line pt-3">
          {previous ? <Neighbour topic={previous} label={UI.previous} /> : <span />}
          {next && <Neighbour topic={next} label={UI.next} forward />}
        </nav>

        <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{CREDITS}</p>
      </DocPage>
    </LearningByHand>
  )
}

/** Where in a video, as "3:13". */
const clockAt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

function Neighbour({ topic, label, forward = false }: { topic: Fundamental; label: string; forward?: boolean }) {
  const Arrow = forward ? ArrowRight : ArrowLeft
  return (
    <Link href={celestePath(topic)} className={`group block py-3 ${forward ? "text-right" : ""}`}>
      <span className={`eyebrow flex items-center gap-1.5 text-muted ${forward ? "justify-end" : ""}`}>
        {!forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
        {label}
        {forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
      </span>
      <span className="mt-1 block text-[15px] font-medium text-ink transition-colors group-hover:text-klein">{topic.title}</span>
    </Link>
  )
}

/** The lives' cuts, in the order they happened. */
function Cuts({ cuts }: { cuts: ReturnType<typeof cutsOf> }) {
  return (
    <ol className="space-y-10">
      {cuts.map((cut) => (
        <li key={`${cut.video}-${cut.from}`} className="space-y-3">
          <YouTubeVideo id={cut.video} title={cut.title} start={cut.from} end={cut.to} />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            <span className="text-[15px] font-medium text-ink">{cut.title}</span>
            {cut.learned && <Badge>{T.first}</Badge>}
            {cut.date && <span>{shortDate(cut.date)}</span>}
            {cut.live && (
              <Link href={`${livePath(cut.live)}#t=${cut.from}`} className="text-klein hover:underline">
                {T.onLive}
              </Link>
            )}
          </p>
        </li>
      ))}
    </ol>
  )
}
