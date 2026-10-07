import { Play } from "lucide-react"
import { LanguageNotice } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { ClearProgress } from "@/components/site/roadmap/clear-progress"
import { RoadmapTimeline } from "@/components/site/roadmap/roadmap-timeline"
import { TopicStatus } from "@/components/site/roadmap/topic-status"
import { YouTubeVideo } from "@/components/site/youtube-video"
import { ranksOf, roadmapPath, type Entry, type Roadmap } from "@/lib/roadmap"
import { UI, localize } from "@/lib/site"

export function RoadmapPage({ roadmap }: { roadmap: Roadmap }) {
  const title = localize(roadmap.title)

  return (
    <>
      <PageIntro title={title} description={localize(roadmap.description)}>
        <div className="space-y-4">
          <LanguageNotice language={roadmap.language} />
          <YouTubeVideo id={roadmap.video} title={title} language={roadmap.language} />
        </div>
      </PageIntro>

      <section className="mt-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-[38rem] text-[14px] leading-[1.6] text-muted">{UI.statusHint}</p>
          <ClearProgress roadmap={roadmap.id} />
        </div>
        <RoadmapTimeline
          roadmap={roadmap.id}
          ranks={ranksOf(roadmap).map(({ rank, entries }) => ({
            id: rank.id,
            name: localize(rank.name),
            color: rank.color,
            icons: rank.icons,
            paint: rank.paint,
            summary: rank.summary && localize(rank.summary),
            topics: entries.map((entry) => entry.topic.id),
            content: <RankTopics roadmap={roadmap} entries={entries} />,
          }))}
        />
      </section>

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{UI.credits}</p>
    </>
  )
}

/** A rank's topics, split by pillar. */
function RankTopics({ roadmap, entries }: { roadmap: Roadmap; entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 px-5 py-6 text-[13px] uppercase tracking-[0.08em] text-muted">
        {UI.soon}
      </p>
    )
  }

  const pillars = roadmap.pillars.filter((pillar) => entries.some((entry) => entry.pillar === pillar))

  return (
    <div className="space-y-8">
      {pillars.map((pillar) => (
        <div key={pillar.id}>
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            {localize(pillar.name)}
          </h3>
          <ul className="space-y-2">
            {entries
              .filter((entry) => entry.pillar === pillar)
              .map(({ topic, concept }) => {
                const title = localize(topic.title)
                return (
                  <li
                    key={topic.id}
                    className="group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border border-line bg-paper/70 px-4 py-3 backdrop-blur-sm transition-colors hover:border-klein"
                  >
                    <a href={roadmapPath(roadmap, topic)} className="min-w-0 flex-1 basis-48">
                      <span className="block text-[16px] font-medium leading-snug text-ink group-hover:text-klein">
                        {title}
                      </span>
                      <span className="block text-[13px] text-muted">
                        {localize(concept.name)} ·{" "}
                        {topic.video ? (
                          <>
                            <Play aria-hidden className="inline h-3 w-3 fill-klein text-klein" /> {UI.video}
                          </>
                        ) : (
                          UI.videoSoon
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
