import { Route, Swords, Target, Trophy } from "lucide-react"
import { LanguageBadge } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { DiversosRow } from "@/components/site/diversos/entries"
import { GameArtCredits, GameRow, type GamePageLink } from "@/components/site/game/game-card"
import { GameNextLine } from "@/components/site/game/game-next-line"
import { channel } from "@/content/channel"
import { fundamentals, gamePath, type Game } from "@/lib/game"
import { localize, type L10n } from "@/lib/site"

const T = localize({
  fundamentals: { pt: "Fundamentos", en: "Fundamentals" },
  pagesOf: { pt: "Páginas do {game}", en: "{game}'s pages" },
  zone: channel.lives.agenda.zone,
})

/** The pages' icons, the menu's (game-menu.tsx). */
const icon = "h-4 w-4 shrink-0"

/**
 * The content page: each game as its card from the game kit (game-card.tsx), with something of the game drawn on it,
 * its next live and its pages one click away (its fundamentals, its ranked record, its aim training, its inventory,
 * its links elsewhere), so nobody has to go through a game's home to reach them. Then the other games ("Jogos
 * diversos"), each one a click away.
 */
export function GameList({ page, games }: { page: { title: L10n; description: L10n }; games: Game[] }) {
  return (
    <>
      <PageIntro title={localize(page.title)} description={localize(page.description)} />

      <ul className="mt-12 space-y-4">
        {games.map((game) => {
          const title = localize(game.title)
          const pages: GamePageLink[] = [
            { label: T.fundamentals, href: gamePath(game, "fundamentals"), icon: <Route aria-hidden className={icon} /> },
            ...(game.ranked ? [{ label: localize(game.ranked.title), href: gamePath(game, "ranked"), icon: <Trophy aria-hidden className={icon} /> }] : []),
            ...(game.aim ? [{ label: localize(game.aim.title), href: gamePath(game, "aim"), icon: <Target aria-hidden className={icon} /> }] : []),
            ...(game.inventory ? [{ label: localize(game.inventory.title), href: gamePath(game, "inventory"), icon: <Swords aria-hidden className={icon} /> }] : []),
            ...game.links.flatMap((link) => (link.href ? [{ label: localize(link.name), href: link.href, away: true }] : [])),
          ]
          return (
            <li key={game.id}>
              <GameRow
                game={game.id}
                href={gamePath(game)}
                title={title}
                badge={<LanguageBadge language={fundamentals(game).language} />}
                description={localize(game.description)}
                next={<GameNextLine game={game.id} suffix={` (${T.zone})`} retry />}
                pages={pages}
                label={T.pagesOf.replace("{game}", title)}
              />
            </li>
          )
        })}
        <li>
          <DiversosRow />
        </li>
      </ul>
      <GameArtCredits className="mt-12" />
    </>
  )
}
