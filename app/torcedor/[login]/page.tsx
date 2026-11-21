import { notFound } from "next/navigation"
import { ViewerPage } from "@/components/site/viewer/viewer-page"
import { channel } from "@/content/channel"
import { sectionMetadata } from "@/lib/metadata"
import { hasSection, localize, ORIGIN } from "@/lib/site"
import { viewerPath } from "@/lib/viewer"
import { viewerLogins } from "@/lib/viewer-data"

export const dynamicParams = false

/**
 * A viewer's page, one per login the build knows (lib/viewer-data.ts); the 404 page draws anyone else's in the browser.
 * The English site has no channel, but a static export must build at least one page here: "_", which is not found.
 */
export async function generateStaticParams() {
  const logins = await viewerLogins()
  return logins.length ? logins.map((login) => ({ login })) : [{ login: "_" }]
}

export async function generateMetadata({ params }: PageProps<"/torcedor/[login]">) {
  const { login } = await params
  if (!hasSection("channel") || login === "_") return {}
  const T = localize(channel.viewer)
  return {
    ...sectionMetadata("channel", { title: `${login} · ${T.title}`, description: T.description.replace("{login}", login) }),
    alternates: { canonical: `${ORIGIN}${viewerPath(login)}` },
  }
}

export default async function Page({ params }: PageProps<"/torcedor/[login]">) {
  const { login } = await params
  if (!hasSection("channel") || login === "_") notFound()
  return <ViewerPage login={login} />
}
