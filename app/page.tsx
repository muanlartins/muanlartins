import { ChannelHome } from "@/components/site/channel/channel-home"
import { ChannelMenu } from "@/components/site/channel/channel-menu"
import { channel } from "@/content/channel"
import { lives } from "@/lib/lives-files"
import { HTML_LANG, homeUrl, localize } from "@/lib/site"

/** The home page is the channel's: most visitors come from the lives and the videos. /canal is the same page. */
export const metadata = {
  title: { absolute: "muanlartins" },
  description: localize(channel.description),
  alternates: {
    canonical: homeUrl(),
    languages: { [HTML_LANG.pt]: homeUrl("pt"), [HTML_LANG.en]: homeUrl("en") },
  },
}

export default function Home() {
  return (
    <div className="relative">
      <ChannelMenu />
      <ChannelHome lives={lives()} />
    </div>
  )
}
