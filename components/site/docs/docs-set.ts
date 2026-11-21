import { channel } from "@/content/channel"
import { privacy } from "@/content/privacy"
import { channelPath } from "@/lib/channel"
import { hasSection, localize, privacySlug } from "@/lib/site"
import type { DocLink } from "./doc-page"

/**
 * The documentation pages, linked from each other's end: the channel's (only on the Portuguese site, which has the
 * channel) and the privacy policy. `current` is left out.
 */
export function docsLinks(current: string): DocLink[] {
  const T = localize(channel)
  const all: DocLink[] = [
    ...(hasSection("channel")
      ? [
          { label: T.comandos.title, href: channelPath("comandos") },
          { label: T.sigma.title, href: channelPath("sigma") },
          { label: T.backstage.title, href: channelPath("backstage") },
          { label: T.roadmap.title, href: channelPath("roadmap") },
        ]
      : []),
    { label: localize(privacy.title), href: `/${privacySlug()}` },
  ]
  return all.filter((link) => link.href !== current)
}
