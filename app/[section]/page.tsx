import { notFound } from "next/navigation"
import { ChannelHome } from "@/components/site/channel/channel-home"
import { ChannelMenu } from "@/components/site/channel/channel-menu"
import { GameList } from "@/components/site/game/game-list"
import { MuralPage } from "@/components/site/pix/mural-page"
import { PixPage } from "@/components/site/pix/pix-page"
import { PrivacyPage } from "@/components/site/privacy-page"
import { ProfilePage } from "@/components/site/profile/profile-page"
import { TimelinePage } from "@/components/site/timeline-page"
import { channel } from "@/content/channel"
import { mural, pix } from "@/content/pix"
import { privacy } from "@/content/privacy"
import { profile } from "@/content/profile"
import personal from "@/content/personal"
import professional from "@/content/professional"
import * as content from "@/content/projects"
import { lives } from "@/lib/lives-files"
import { sectionMetadata } from "@/lib/metadata"
import { hasSection, HTML_LANG, homeUrl, localize, SECTIONS, MURAL_SLUG, muralUrl, PIX_SLUG, pixUrl, privacySlug, privacyUrl, profileSlug, profileUrl, sectionFromSlug, sectionPath } from "@/lib/site"

export const dynamicParams = false

export function generateStaticParams() {
  // The English site is Luan's life and work: no channel, content, profile, Pix or mural.
  return [
    ...SECTIONS.map((section) => ({ section: sectionPath(section).slice(1) })),
    { section: privacySlug() },
    ...(hasSection("channel") ? [{ section: profileSlug() }, { section: PIX_SLUG }, { section: MURAL_SLUG }] : []),
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
  if (slug === MURAL_SLUG) {
    return {
      title: localize(mural.title),
      description: localize(mural.description),
      alternates: {
        canonical: muralUrl(),
        languages: { [HTML_LANG.pt]: muralUrl("pt"), [HTML_LANG.en]: muralUrl("en") },
      },
    }
  }
  const section = sectionFromSlug(slug)
  if (section === "personal") return sectionMetadata(section, personal)
  if (section === "professional") return sectionMetadata(section, professional)
  if (section === "content") return sectionMetadata(section, content.page)
  // The same page as the home, which is where search engines should send people.
  if (section === "channel") return { ...sectionMetadata(section, channel), alternates: { canonical: homeUrl() } }
  return {}
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const slug = (await params).section
  if (slug === privacySlug()) return <PrivacyPage />
  if (slug === profileSlug()) return <OfChannel page={<ProfilePage />} />
  if (slug === PIX_SLUG) return <OfChannel page={<PixPage />} />
  if (slug === MURAL_SLUG) return <OfChannel page={<MuralPage />} />
  const section = sectionFromSlug(slug)
  if (section === "personal") return <TimelinePage content={personal} />
  if (section === "professional") return <TimelinePage content={professional} />
  if (section === "content") return <GameList page={content.page} games={content.games} />
  if (section === "channel") return <OfChannel page={<ChannelHome lives={lives()} />} />
  notFound()
}

/** A page with the channel's menu, like those under /canal get from their layout. */
function OfChannel({ page }: { page: React.ReactNode }) {
  return (
    <div className="relative">
      <ChannelMenu />
      {page}
    </div>
  )
}
