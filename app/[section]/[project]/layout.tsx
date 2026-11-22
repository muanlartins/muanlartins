import { ChannelMenu } from "@/components/site/channel/channel-menu"
import { AgentBackdrop } from "@/components/site/game/agent-backdrop"
import { GameMenu } from "@/components/site/game/game-menu"
import { games } from "@/content/projects"
import assets from "@/content/valorant-assets.json"
import { DIVERSOS, diversos, diversosPath } from "@/lib/diversos"
import { gamePath, type Game } from "@/lib/game"
import { valorantSessions } from "@/lib/matches"
import { localize, sectionFromSlug } from "@/lib/site"

const LABELS = localize({
  home: { pt: "Início", en: "Home" },
  fundamentals: { pt: "Fundamentos", en: "Fundamentals" },
  all: { pt: "Todos", en: "All" },
})

/** The agent of Luan's latest ranked match (any match before the first ranked), by its art's id: Valorant's backdrop. */
function latestAgent() {
  const matches = valorantSessions()
    .flatMap((session) => session.matches)
    .sort((a, b) => b.at.localeCompare(a.at))
  const name = (matches.find((match) => match.queue === "competitive") ?? matches[0])?.agent
  return assets.agents.find((agent) => agent.name === name && agent.portrait)?.id
}

/** Every page of a game shares its menu: home, roadmap, ranked record, links elsewhere, and the other games. The channel's have its own. */
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
  // The other games ("Jogos diversos"): all of them, each one's page, and the site's own games one click away.
  if (project === DIVERSOS) {
    const items = [
      { label: LABELS.all, href: diversosPath(), icon: "home" as const },
      ...diversos.games.map((other) => ({ label: other.name, href: diversosPath(other), icon: "game" as const })),
    ]
    return (
      <div className="relative">
        <GameMenu
          title={diversos.page.title}
          home={diversosPath()}
          items={items}
          look={DIVERSOS}
          games={games.map((other) => ({ title: localize(other.title), home: gamePath(other), pages: [] }))}
        />
        {children}
      </div>
    )
  }
  const game = games.find((game) => game.id === project)
  if (!game) return children

  const pagesOf = (game: Game) => [
    { label: LABELS.home, href: gamePath(game), icon: "home" as const },
    { label: LABELS.fundamentals, href: gamePath(game, "fundamentals"), icon: "fundamentals" as const },
    ...(game.ranked ? [{ label: localize(game.ranked.title), href: gamePath(game, "ranked"), icon: "ranked" as const }] : []),
    ...(game.aim ? [{ label: localize(game.aim.title), href: gamePath(game, "aim"), icon: "aim" as const }] : []),
    ...(game.inventory ? [{ label: localize(game.inventory.title), href: gamePath(game, "inventory"), icon: "inventory" as const }] : []),
  ]
  const items = [
    ...pagesOf(game),
    ...game.links.flatMap((link) => (link.href ? [{ label: localize(link.name), href: link.href, away: true }] : [])),
  ]
  const others = [
    ...games
      .filter((other) => other !== game)
      .map((other) => ({ title: localize(other.title), home: gamePath(other), pages: pagesOf(other).map((page) => page.href) })),
    { title: diversos.page.title, home: diversosPath(), pages: [] },
  ]

  return (
    <div className="relative">
      {game.id === "valorant" && <AgentBackdrop agent={latestAgent()} />}
      <GameMenu title={localize(game.title)} home={gamePath(game)} items={items} look={game.id} games={others} />
      {children}
    </div>
  )
}
