import { notFound } from "next/navigation"
import { ProjectList } from "@/components/site/project-list"
import { TimelinePage } from "@/components/site/timeline-page"
import professional from "@/content/professional"
import * as content from "@/content/projects"
import { sectionMetadata } from "@/lib/metadata"
import { sectionFromSlug, sectionPath } from "@/lib/site"

export const dynamicParams = false

export function generateStaticParams() {
  return (["professional", "content"] as const).map((section) => ({
    section: sectionPath(section).slice(1),
  }))
}

export async function generateMetadata({ params }: PageProps<"/[section]">) {
  const section = sectionFromSlug((await params).section)
  if (section === "professional") return sectionMetadata(section, professional)
  if (section === "content") return sectionMetadata(section, content.page)
  return {}
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const section = sectionFromSlug((await params).section)
  if (section === "professional") return <TimelinePage content={professional} />
  if (section === "content") return <ProjectList page={content.page} projects={content.projects} />
  notFound()
}
