import { notFound } from "next/navigation"
import { ChannelHome } from "@/components/site/channel/channel-home"
import { PixPage } from "@/components/site/pix/pix-page"
import { PrivacyPage } from "@/components/site/privacy-page"
import { ProfilePage } from "@/components/site/profile/profile-page"
import { ProjectList } from "@/components/site/project-list"
import { TimelinePage } from "@/components/site/timeline-page"
import { channel } from "@/content/channel"
import { pix } from "@/content/pix"
import { privacy } from "@/content/privacy"
import { profile } from "@/content/profile"
import professional from "@/content/professional"
import * as content from "@/content/projects"
import { lives } from "@/lib/lives-files"
import { sectionMetadata } from "@/lib/metadata"
import { HTML_LANG, localize, PIX_SLUG, pixUrl, privacySlug, privacyUrl, profileSlug, profileUrl, sectionFromSlug, sectionPath } from "@/lib/site"

export const dynamicParams = false

export function generateStaticParams() {
  return [
    ...(["professional", "content", "channel"] as const).map((section) => ({ section: sectionPath(section).slice(1) })),
    { section: privacySlug() },
    { section: profileSlug() },
    { section: PIX_SLUG },
  ]
}

export async function generateMetadata({ params }: PageProps<"/[section]">) {
  const slug = (await params).section
  if (slug === privacySlug()) {
    return {
      title: localize(privacy.title),
      description: localize(privacy.description),
      alternates: {
        canonical: privacyUrl(),
        languages: { [HTML_LANG.pt]: privacyUrl("pt"), [HTML_LANG.en]: privacyUrl("en") },
      },
    }
  }
  if (slug === profileSlug()) {
    return {
      title: localize(profile.title),
      description: localize(profile.description),
      alternates: {
        canonical: profileUrl(),
        languages: { [HTML_LANG.pt]: profileUrl("pt"), [HTML_LANG.en]: profileUrl("en") },
      },
    }
  }
  if (slug === PIX_SLUG) {
    return {
      title: localize(pix.title),
      description: localize(pix.description),
      alternates: {
        canonical: pixUrl(),
        languages: { [HTML_LANG.pt]: pixUrl("pt"), [HTML_LANG.en]: pixUrl("en") },
      },
    }
  }
  const section = sectionFromSlug(slug)
  if (section === "professional") return sectionMetadata(section, professional)
  if (section === "content") return sectionMetadata(section, content.page)
  if (section === "channel") return sectionMetadata(section, channel)
  return {}
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const slug = (await params).section
  if (slug === privacySlug()) return <PrivacyPage />
  if (slug === profileSlug()) return <ProfilePage />
  if (slug === PIX_SLUG) return <PixPage />
  const section = sectionFromSlug(slug)
  if (section === "professional") return <TimelinePage content={professional} />
  if (section === "content") return <ProjectList page={content.page} projects={content.projects} />
  if (section === "channel") return <ChannelHome lives={lives()} />
  notFound()
}
