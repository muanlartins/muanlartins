import { ArrowUpRight, History, Play } from "lucide-react"
import { LanguageNotice } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { ClearProgress } from "@/components/site/roadmap/clear-progress"
import { RoadmapTimeline } from "@/components/site/roadmap/roadmap-timeline"
import { TopicStatus } from "@/components/site/roadmap/topic-status"
import { Badge, EmptyState, cardClass } from "@/components/site/ui"
import { YouTubeVideo } from "@/components/site/youtube-video"
import { fundamentals, type Game } from "@/lib/game"
import { entries, ranksOf, roadmapPath, type Entry, type Roadmap } from "@/lib/roadmap"
import { UI, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * A game's fundamentals, the same page for every game: the introduction, then the ranks on the rail with their
 * topics (with none yet, a note above them, every rank "coming soon"), the game's marker rolling down it and its
 * scene behind (both from the game's kit, `kit.tsx`). A game that redid them shows its other editions under the
 * introduction: the newest links the older ones, an older one links the newest.
 */
export function RoadmapPage({ game, roadmap }: { game: Game; roadmap: Roadmap }) {
  const title = localize(roadmap.title)
  const latest = fundamentals(game)
  const others = game.roadmaps.filter((other) => other !== roadmap)
  const empty = entries(roadmap).length === 0

  return (
    <>
      <PageIntro title={title} description={localize(roadmap.description)}>
        <div className="space-y-4">
          <LanguageNotice language={roadmap.language} />
          {(roadmap.video || !empty) && <YouTubeVideo id={roadmap.video} title={title} language={roadmap.language} />}
        </div>
      </PageIntro>

      {others.length > 0 && (
        <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted">
          <History aria-hidden className="h-4 w-4" />
          {roadmap === latest ? UI.olderEditions : UI.replacedBy}
          {others.map((other) => (
            <a key={other.id} href={roadmapPath(other, undefined, other === latest)} className="font-medium text-klein hover:underline">
              {localize(other.title)}
              {other !== latest && ` (${UI.edition} ${other.edition ?? 1})`}
            </a>
          ))}
        </p>
      )}

      {roadmap.tools && (
        <div className="mt-12 space-y-3">
          {roadmap.tools.map((tool) => (
            // A plain link: the tools are other apps (RLR is served at /rlr/), not this site's pages.
            <a key={tool.href} href={tool.href} className={cn(cardClass, "group flex items-start justify-between gap-6 p-5 backdrop-blur-sm transition-colors hover:border-klein")}>
              <div className="space-y-1">
                <h2 className="text-xl font-medium tracking-[-0.02em] text-klein">{localize(tool.name)}</h2>
                <p className="max-w-[34rem] text-[15px] leading-[1.6] text-ink">{localize(tool.summary)}</p>
              </div>
              <ArrowUpRight aria-hidden className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-klein" />
            </a>
          ))}
        </div>
      )}

      <section className={roadmap.tools ? "mt-16" : "mt-12"}>
        {empty ? (
          <EmptyState className="max-w-[38rem]">{UI.noTopics}</EmptyState>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[38rem] text-[15px] leading-[1.6] text-muted">{UI.statusHint}</p>
            <ClearProgress roadmap={roadmap.id} />
          </div>
        )}
        <RoadmapTimeline
          roadmap={roadmap.id}
          game={game.id}
          ranks={ranksOf(roadmap).map(({ rank, entries }) => ({
            id: rank.id,
            name: localize(rank.name),
            color: rank.color,
            icons: rank.icons,
            summary: rank.summary && localize(rank.summary),
            topics: entries.map((entry) => entry.topic.id),
            content: <RankTopics roadmap={roadmap} entries={entries} />,
          }))}
        />
      </section>

      <p className="mt-16 text-[13px] leading-[1.6] text-muted">{localize(game.credits)}</p>
    </>
  )
}

/** A rank's topics, split by pillar; a rank without any says it's coming. */
function RankTopics({ roadmap, entries }: { roadmap: Roadmap; entries: Entry[] }) {
  if (entries.length === 0) return <EmptyState className="py-4">{UI.soon}</EmptyState>

  const pillars = roadmap.pillars.filter((pillar) => entries.some((entry) => entry.pillar === pillar))

  return (
    <div className="space-y-8">
      {pillars.map((pillar) => (
        <div key={pillar.id}>
          <p id={`${roadmap.id}-${entries[0].rank.id}-${pillar.id}`} className="eyebrow mb-3 text-muted">
            {localize(pillar.name)}
          </p>
          <ul aria-labelledby={`${roadmap.id}-${entries[0].rank.id}-${pillar.id}`} className="space-y-2">
            {entries
              .filter((entry) => entry.pillar === pillar)
              .map(({ topic, concept }) => {
                const title = localize(topic.title)
                // Topics still waiting for their video are drawn as a draft.
                return (
                  <li
                    key={topic.id}
                    className={cn(
                      cardClass,
                      "group flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 backdrop-blur-sm transition-colors hover:border-klein",
                      !topic.video && "bg-paper/30",
                    )}
                  >
                    <a href={roadmapPath(roadmap, topic)} className="min-w-0 flex-1 basis-48">
                      <span className={cn("block text-[15px] font-medium leading-snug group-hover:text-klein", topic.video ? "text-ink" : "text-muted")}>
                        {title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted">
                        {localize(concept.name)}
                        <span aria-hidden>·</span>
                        {topic.video ? (
                          <span className="inline-flex items-center gap-1">
                            <Play aria-hidden className="h-3.5 w-3.5 fill-klein text-klein" /> {UI.video}
                          </span>
                        ) : (
                          <Badge tone="soft">{UI.videoSoon}</Badge>
                        )}
                      </span>
                    </a>
                    <TopicStatus roadmap={roadmap.id} topic={topic.id} title={title} />
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
    </div>
  )
}
