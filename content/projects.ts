import rocketLeagueHome from "@/content/rocket-league-home"
import valorantHome from "@/content/valorant-home"
import { isArchived } from "@/lib/game"
import type { L10n, Locale } from "@/lib/site"

/** Something of Luan's elsewhere, linked from a game: an app, a playlist. */
export interface Project {
  id: string
  name: L10n
  summary: L10n
  href?: string
  /** Set when it's only in one language; the other site marks it. */
  language?: Locale
}

export const page = {
  title: { pt: "Conteúdo", en: "Content" },
  description: {
    pt: "Os jogos das lives e o que estou aprendendo em cada um.",
    en: "The games on my streams and what I'm learning in each.",
  },
}

/** Every game with a home at /conteudo/<id>, with its roadmap, its ranked record and its links (lib/game.ts), archived ones included: finding a game by id (an old live's, the agenda's) and building its pages go by this. */
export const games = [rocketLeagueHome, valorantHome]

/** The games the site lists and links (the content page, the channel's home, the games' menus): all but the archived (ARCHIVED_GAMES in lib/game.ts). */
export const listedGames = games.filter((game) => !isArchived(game.id))

