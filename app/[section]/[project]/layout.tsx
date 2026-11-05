import { ChannelMenu } from "@/components/site/channel/channel-menu"
import { GameMenu } from "@/components/site/game/game-menu"
import { games } from "@/content/projects"
import { gamePath } from "@/lib/game"
import { localize, sectionFromSlug } from "@/lib/site"

const LABELS = localize({
  home: { pt: "Início", en: "Home" },
  fundamentals: { pt: "Fundamentos", en: "Fundamentals" },
})

/** Every page of a game shares its menu: home, roadmap, ranked record, and links elsewhere. The channel's have its own. */
export default async function GameLayout({ children, params }: LayoutProps<"/[section]/[project]">) {
  const { section, project } = await params
  if (sectionFromSlug(section) === "channel") {
    return (
      <div className="relative">
        <ChannelMenu />
        {children}
      </div>
    )
  }
  const game = games.find((game) => game.id === project)
  if (!game) return children

  const items = [
    { label: LABELS.home, href: gamePath(game) },
    { label: LABELS.fundamentals, href: gamePath(game, "fundamentals") },
    ...(game.ranked ? [{ label: localize(game.ranked.title), href: gamePath(game, "ranked") }] : []),
    ...game.links.flatMap((link) => (link.href ? [{ label: localize(link.name), href: link.href, away: true }] : [])),
  ]

  return (
    <div className="relative">
      <GameMenu title={localize(game.title)} home={gamePath(game)} items={items} />
      {children}
    </div>
  )
}
