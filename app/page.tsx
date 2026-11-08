import { ChannelHome } from "@/components/site/channel/channel-home"
import { ChannelMenu } from "@/components/site/channel/channel-menu"
import { TimelinePage } from "@/components/site/timeline-page"
import { channel } from "@/content/channel"
import personal from "@/content/personal"
import { lives } from "@/lib/lives-files"
import { sectionMetadata } from "@/lib/metadata"
import { HOME_SECTION, localize } from "@/lib/site"

/**
 * The home page: in Portuguese the channel's (most visitors come from the lives and the videos; /canal is the same
 * page), in English Luan's life (the English site is his life and work only; /personal is the same page).
 */
export const metadata =
  HOME_SECTION === "channel"
    ? { ...sectionMetadata("channel", channel), title: { absolute: "muanlartins" }, description: localize(channel.description) }
    : sectionMetadata("personal", personal)

export default function Home() {
  if (HOME_SECTION !== "channel") return <TimelinePage content={personal} />
  return (
    <div className="relative">
      <ChannelMenu />
      <ChannelHome lives={lives()} />
    </div>
  )
}

