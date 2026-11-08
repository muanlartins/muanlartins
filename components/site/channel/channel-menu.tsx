import { GameMenu } from "@/components/site/game/game-menu"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { localize, MURAL_SLUG, PIX_SLUG, profileSlug, sectionPath } from "@/lib/site"

const LABELS = localize({
  home: { pt: "Início", en: "Home" },
  mural: { pt: "Mural", en: "Mural" },
  profile: { pt: "Perfil", en: "Profile" },
})

/**
 * The channel's pages, in the margin like a game's: its home (the site's), the lives, Pix, the mural, the viewer's profile and
 * the backstage. Pix, the mural and the profile live at the site's root (short to say on stream, and /perfil is
 * where Twitch sends sign-ins back), but they're the channel's.
 */
export function ChannelMenu() {
  const T = localize(channel)
  return (
    <GameMenu
      title={T.title}
      home={channelPath()}
      alias={sectionPath("channel")}
      items={[
        { label: LABELS.home, href: channelPath(), icon: "home" },
        { label: T.lives.title, href: channelPath("lives"), icon: "lives" },
        { label: T.pix.title, href: `/${PIX_SLUG}`, icon: "pix" },
        { label: LABELS.mural, href: `/${MURAL_SLUG}`, icon: "mural" },
        { label: LABELS.profile, href: `/${profileSlug()}`, icon: "profile" },
        { label: T.backstage.title, href: channelPath("backstage"), icon: "backstage" },
      ]}
    />
  )
}
