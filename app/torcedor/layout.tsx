import { ChannelMenu } from "@/components/site/channel/channel-menu"
import { GameNotices } from "@/components/site/game-notices"

/** A viewer's page is the channel's, with its menu, like /perfil and /mural. */
export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <ChannelMenu />
      {children}
      <GameNotices />
    </div>
  )
}
