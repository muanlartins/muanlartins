import { ArrowLeft, ArrowRight, ArrowUpRight, Dumbbell } from "lucide-react"
import Link from "next/link"
import { Fragment } from "react"
import { Callout, CodeChip, DocPage, DocSection } from "@/components/site/docs"
import { LanguageNotice } from "@/components/site/language-badge"
import { TopicBackdrop } from "@/components/site/roadmap/kit"
import { TopicStatus } from "@/components/site/roadmap/topic-status"
import { YouTubeVideo } from "@/components/site/youtube-video"
import { fundamentals, gamePath, type Game } from "@/lib/game"
import { findTopic, roadmapPath, topicText, type Entry, type Roadmap } from "@/lib/roadmap"
import { HTML_LANG, UI, localize } from "@/lib/site"
import { ROADMAP } from "./labels"

/** A training pack's code, as the game asks for it: 05A4-631B-C3DB-A894. */
const PACK = /\b([0-9A-F]{4}(?:-[0-9A-F]{4}){3})\b/

/**
 * A topic, laid out as a documentation page: the trail back to its game and its rank on the fundamentals, its title
 * and lede (the text's first paragraph), its pillar and concept, then its video and the visitor's status, the text in
 * numbered sections (its own `## ` titles, or one "Resumo"), with the training packs set apart, where its tips came
 * from, and the topics around it in its edition. The text is Luan's, from the video: the page only lays it out.
 */
export function TopicPage({ game, roadmap, id }: { game: Game; roadmap: Roadmap; id: string }) {
  const { topic, rank, pillar, concept, title, path, previous, next } = findTopic(roadmap, id)!
  const lang = HTML_LANG[roadmap.language]
  const { lede, sections } = topicText(topic.text, ROADMAP.summary)
  const sources = topic.sources ?? []
  const toc = [...sections.map(({ id, title }) => ({ id, title })), ...(sources.length > 0 ? [{ id: "onde-aprendi", title: UI.sources }] : [])]
  const emblem = rank.icons?.[0]

  return (
    <>
      <TopicBackdrop game={game.id} />
      <DocPage
        trail={[
          { label: localize(game.title), href: gamePath(game) },
          { label: ROADMAP.fundamentals, href: `${roadmapPath(roadmap, undefined, roadmap === fundamentals(game))}#${rank.id}` },
        ]}
        here={
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {emblem && <img src={emblem} alt="" className="h-5 w-5 object-contain" />}
            {localize(rank.name)}
          </>
        }
        title={title}
        description={lede ? <Inline text={lede} lang={lang} /> : topic.video ? path : ROADMAP.draft}
        meta={[
          { label: ROADMAP.pillar, value: localize(pillar.name) },
          { label: ROADMAP.concept, value: localize(concept.name) },
        ]}
        toc={toc}
      >
        <div className="space-y-6">
          <LanguageNotice language={roadmap.language} />
          <YouTubeVideo id={topic.video ?? ""} title={title} language={roadmap.language} />
          <TopicStatus roadmap={roadmap.id} topic={topic.id} title={title} variant="choices" />
        </div>

        {sections.map((section, index) => (
          <DocSection key={section.id} id={section.id} n={index + 1} title={section.title}>
            <div lang={lang} className="max-w-[38rem] space-y-5 text-[17px] leading-[1.6] text-ink">
              {section.blocks.map((block, index) =>
                block.note ? (
                  <Callout key={index} icon={Dumbbell}>
                    <Inline text={block.text} />
                  </Callout>
                ) : (
                  <p key={index}>
                    <Inline text={block.text} />
                  </p>
                ),
              )}
            </div>
          </DocSection>
        ))}

        {sources.length > 0 && (
          <DocSection id="onde-aprendi" n={sections.length + 1} title={UI.sources}>
            <ul className="max-w-[38rem] divide-y divide-line border-y border-line">
              {sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-4 py-3">
                    <span>
                      <span className="block text-[15px] font-medium text-ink group-hover:text-klein">{source.title}</span>
                      {source.author && <span className="text-[13px] text-muted">{source.author}</span>}
                    </span>
                    <ArrowUpRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-muted group-hover:text-klein" />
                  </a>
                </li>
              ))}
            </ul>
          </DocSection>
        )}

        <nav aria-label={ROADMAP.around} className="mt-24 grid grid-cols-2 gap-6 border-t border-line pt-3">
          {previous ? <Neighbour roadmap={roadmap} entry={previous} label={UI.previous} /> : <span />}
          {next && <Neighbour roadmap={roadmap} entry={next} label={UI.next} forward />}
        </nav>
      </DocPage>
    </>
  )
}

/** The topic before or after this one in its edition's reading order. */
function Neighbour({ roadmap, entry, label, forward = false }: { roadmap: Roadmap; entry: Entry; label: string; forward?: boolean }) {
  const Arrow = forward ? ArrowRight : ArrowLeft
  return (
    <Link href={roadmapPath(roadmap, entry.topic)} className={`group block py-3 ${forward ? "text-right" : ""}`}>
      <span className={`eyebrow flex items-center gap-1.5 text-muted ${forward ? "justify-end" : ""}`}>
        {!forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
        {label}
        {forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
      </span>
      <span className="mt-1 block text-[15px] font-medium text-ink transition-colors group-hover:text-klein">{localize(entry.topic.title)}</span>
    </Link>
  )
}

/** A line of the text with its training pack codes set as typed. */
function Inline({ text, lang }: { text: string; lang?: string }) {
  return (
    <span lang={lang}>
      {text.split(PACK).map((part, index) =>
        index % 2 === 1 ? (
          <CodeChip key={index} className="text-[0.95em]">
            {part}
          </CodeChip>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </span>
  )
}
