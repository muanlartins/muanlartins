import { GameMenu } from "@/components/site/game/game-menu"
import { games } from "@/content/projects"
import { gamePath } from "@/lib/game"
import { localize } from "@/lib/site"

const LABELS = localize({
  home: { pt: "Início", en: "Home" },
  fundamentals: { pt: "Fundamentos", en: "Fundamentals" },
})

/** Every page of a game shares its menu: home, roadmap, ranked record, lives, and links elsewhere. */
export default async function GameLayout({ children, params }: LayoutProps<"/[section]/[project]">) {
  const { project } = await params
  const game = games.find((game) => game.id === project)
  if (!game) return children

  const items = [
    { label: LABELS.home, href: gamePath(game) },
    { label: LABELS.fundamentals, href: gamePath(game, "fundamentals") },
    ...(game.ranked ? [{ label: localize(game.ranked.title), href: gamePath(game, "ranked") }] : []),
    ...(game.lives ? [{ label: localize(game.lives.title), href: gamePath(game, "lives") }] : []),
    ...game.links.flatMap((link) => (link.href ? [{ label: localize(link.name), href: link.href, away: true }] : [])),
  ]

  return (
    <div className="relative">
      <GameMenu title={localize(game.title)} home={gamePath(game)} items={items} />
      {children}
    </div>
  )
}
