import { ArrowLeft, ArrowRight } from "lucide-react"
import { LanguageNotice } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { BallBackdrop } from "@/components/site/roadmap/ball-backdrop"
import { TopicStatus } from "@/components/site/roadmap/topic-status"
import { YouTubeVideo } from "@/components/site/youtube-video"
import { findTopic, roadmapPath, type Roadmap } from "@/lib/roadmap"
import { HTML_LANG, UI, localize } from "@/lib/site"

export function TopicPage({ roadmap, id }: { roadmap: Roadmap; id: string }) {
  const { topic, rank, title, path, previous, next } = findTopic(roadmap, id)!
  const paragraphs = topic.text?.split(/\n\s*\n/) ?? []

  return (
    <>
      <BallBackdrop />
      <a
        href={`${roadmapPath(roadmap)}#${rank.id}`}
        className="mb-10 inline-flex items-center gap-2 text-[14px] text-muted transition-colors hover:text-klein"
      >
        <ArrowLeft className="h-4 w-4" />
        {localize(roadmap.title)}
      </a>

      <PageIntro title={title} description={path}>
        <div className="space-y-4">
          <LanguageNotice language={roadmap.language} />
          <YouTubeVideo id={topic.video ?? ""} title={title} language={roadmap.language} />
        </div>
      </PageIntro>

      <div className="mt-6 flex justify-end">
        <TopicStatus roadmap={roadmap.id} topic={topic.id} title={title} />
      </div>

      {paragraphs.length > 0 && (
        <div lang={HTML_LANG[roadmap.language]} className="mt-12 max-w-[38rem] space-y-5 text-[17px] leading-[1.7] text-ink">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}

      <nav className="mt-20 grid grid-cols-2 gap-4 border-t border-line pt-8 text-[14px]">
        {previous ? (
          <a href={roadmapPath(roadmap, previous.topic)} className="group space-y-1">
            <span className="flex items-center gap-1.5 text-muted">
              <ArrowLeft className="h-3.5 w-3.5" />
              {UI.previous}
            </span>
            <span className="block font-medium text-ink group-hover:text-klein">{localize(previous.topic.title)}</span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={roadmapPath(roadmap, next.topic)} className="group space-y-1 text-right">
            <span className="flex items-center justify-end gap-1.5 text-muted">
              {UI.next}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="block font-medium text-ink group-hover:text-klein">{localize(next.topic.title)}</span>
          </a>
        )}
      </nav>
    </>
  )
}
