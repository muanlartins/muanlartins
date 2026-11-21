import { DiversosNext } from "@/components/site/diversos/diversos-next"
import { GameRow, GameTile } from "@/components/site/game/game-card"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { diversos, diversosPath } from "@/lib/diversos"
import { localize } from "@/lib/site"

const MAIN = games.map((game) => game.id)
const NEXT = `${localize(channel.games.next)}: `
const names = new Intl.ListFormat("pt-BR").format(diversos.games.map((game) => game.name))

/** "Jogos diversos" in the content page's list of games (game-list.tsx): its card with the box arts, its line, its next live, each game a click away. */
export function DiversosRow() {
  return (
    <GameRow
      game="diversos"
      games={diversos.games}
      href={diversosPath()}
      title={diversos.page.title}
      description={diversos.page.description}
      next={
        <DiversosNext main={MAIN} prefix={NEXT} suffix={` (${localize(channel.lives.agenda.zone)})`} fallback={localize(channel.next.none)} className="block" />
      }
      pages={diversos.games.map((game) => ({ label: game.name, href: diversosPath(game) }))}
      label={diversos.page.title}
    />
  )
}

/** "Jogos diversos" as the channel home's third game card (channel-home.tsx, "Jogos"): the next live of any of them, or their names. */
export function DiversosCard() {
  return (
    <GameTile
      game="diversos"
      games={diversos.games}
      href={diversosPath()}
      title={diversos.page.title}
      line={<DiversosNext main={MAIN} prefix={NEXT} fallback={names} className="block" />}
    />
  )
}
