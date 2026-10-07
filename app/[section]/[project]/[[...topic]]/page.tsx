import { notFound } from "next/navigation"
import { RoadmapPage } from "@/components/site/roadmap/roadmap-page"
import { TopicPage } from "@/components/site/roadmap/topic-page"
import { roadmaps } from "@/content/projects"
import { sectionMetadata } from "@/lib/metadata"
import { entries, findTopic } from "@/lib/roadmap"
import { localize, sectionFromSlug, sectionPath } from "@/lib/site"

/**
 * A roadmap at /conteudo/<project> and its topics at /conteudo/<project>/<topic>.
 * One route for both, so a roadmap with no topics yet still builds.
 */

export const dynamicParams = false

export function generateStaticParams() {
  const section = sectionPath("content").slice(1)
  return roadmaps.flatMap((roadmap) => [
    { section, project: roadmap.id, topic: [] },
    ...entries(roadmap).map(({ topic }) => ({ section, project: roadmap.id, topic: [topic.id] })),
  ])
}

type Props = PageProps<"/[section]/[project]/[[...topic]]">

async function find(params: Props["params"]) {
  const { section, project, topic: [topic, ...rest] = [] } = await params
  const roadmap = roadmaps.find((roadmap) => roadmap.id === project)
  if (sectionFromSlug(section) !== "content" || !roadmap || rest.length > 0) return undefined
  if (!topic) return { roadmap }
  const entry = findTopic(roadmap, topic)
  return entry && { roadmap, entry }
}

export async function generateMetadata({ params }: Props) {
  const found = await find(params)
  if (!found) return {}
  const { roadmap, entry } = found
  if (!entry) return sectionMetadata("content", roadmap, `/${roadmap.id}`)
  return sectionMetadata(
    "content",
    { title: `${entry.title} · ${localize(roadmap.title)}`, description: entry.path },
    `/${roadmap.id}/${entry.topic.id}`,
  )
}

export default async function ProjectPage({ params }: Props) {
  const found = await find(params)
  if (!found) notFound()
  if (!found.entry) return <RoadmapPage roadmap={found.roadmap} />
  return <TopicPage roadmap={found.roadmap} id={found.entry.topic.id} />
}
