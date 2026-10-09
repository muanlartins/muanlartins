import { ArrowUpRight, Clock, Play } from "lucide-react"
import { LanguageNotice } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { ClearProgress } from "@/components/site/roadmap/clear-progress"
import { RoadmapTimeline } from "@/components/site/roadmap/roadmap-timeline"
import { TopicStatus } from "@/components/site/roadmap/topic-status"
import { YouTubeVideo } from "@/components/site/youtube-video"
import { ranksOf, roadmapPath, type Entry, type Roadmap } from "@/lib/roadmap"
import { UI, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

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

      {roadmap.tools && (
        <div className="mt-12 space-y-3">
          {roadmap.tools.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="group flex items-start justify-between gap-6 rounded-md border border-line bg-paper/70 px-5 py-4 backdrop-blur-sm transition-colors hover:border-klein"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{UI.tool}</p>
                <h2 className="text-xl font-medium text-klein tracking-[-0.02em]">{localize(tool.name)}</h2>
                <p className="max-w-[34rem] text-[14px] leading-[1.6] text-ink">{localize(tool.summary)}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-klein" />
            </a>
          ))}
        </div>
      )}

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
                // Topics still waiting for their video are drawn as a draft.
                return (
                  <li
                    key={topic.id}
                    className={cn(
                      "group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border px-4 py-3 backdrop-blur-sm transition-colors hover:border-klein",
                      topic.video ? "border-line bg-paper/70" : "border-dashed border-zinc-300 bg-paper/30",
                    )}
                  >
                    <a href={roadmapPath(roadmap, topic)} className="min-w-0 flex-1 basis-48">
                      <span
                        className={cn(
                          "block text-[16px] font-medium leading-snug group-hover:text-klein",
                          topic.video ? "text-ink" : "text-muted",
                        )}
                      >
                        {title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted">
                        {localize(concept.name)}
                        <span aria-hidden>·</span>
                        {topic.video ? (
                          <span className="inline-flex items-center gap-1">
                            <Play aria-hidden className="h-3 w-3 fill-klein text-klein" /> {UI.video}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                            <Clock aria-hidden className="h-3 w-3" />
                            {UI.videoSoon}
                          </span>
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
