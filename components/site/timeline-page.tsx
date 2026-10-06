import { Lifeline } from "@/components/lifeline/lifeline"
import { PageIntro } from "@/components/site/page-intro"
import { YouTubeVideo } from "@/components/site/youtube-video"
import { toLifelineMarkers, type TimelinePage as Content } from "@/lib/content"
import { localize } from "@/lib/site"

export function TimelinePage({ content }: { content: Content }) {
  const title = localize(content.title)

  return (
    <>
      <PageIntro title={title} description={localize(content.description)}>
        <YouTubeVideo id={localize(content.video)} title={title} />
      </PageIntro>

      <section className="-mx-6 mt-20">
        <Lifeline
          markers={toLifelineMarkers(content)}
          birthYear={0}
          title={title}
          labels={localize(content.labels)}
          layout="vertical"
          mode="inline"
        />
      </section>
    </>
  )
}
