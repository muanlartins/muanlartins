import type { Project } from "@/content/projects"
import type { Roadmap } from "@/lib/roadmap"
import { sectionPath, type L10n } from "@/lib/site"

/**
 * A game's corner of the content section, at /conteudo/<id>: a home page
 * introducing it, its roadmap, its ranked record, and links to what lives
 * elsewhere. A side menu ties them together. The lives belong to the
 * channel (lib/channel.ts), whatever game they're of.
 */
export interface Game {
  /** The URL: /conteudo/<id>. The roadmap shares it, so its topics live at /conteudo/<id>/<topic>. */
  id: string
  title: L10n
  /** The paragraph under the title; also the summary on the content page. */
  description: L10n
  /** The home page's introduction: the idea, the channel. A blank line starts a new paragraph. */
  intro: L10n
  /** Short enough for a day of the agenda: "RL". */
  short: string
  /** Its fundamentals, newest edition first (lib/roadmap.ts): the first is the one at /fundamentals. */
  roadmaps: [Roadmap, ...Roadmap[]]
  /** Luan's rank, by its id in the fundamentals' ranks, while the game has no ranked record to read it from: the home shows it on the ladder. */
  rank?: string
  /** The ranked record page, from content/matches/. */
  ranked?: { title: L10n; description: L10n }
  /** The aim training page (Valorant's: Voltaic's routine and benchmarks, from content/voltaic/). */
  aim?: { title: L10n; description: L10n }
  /** Apps and playlists elsewhere, listed in the menu and on the home page. */
  links: Project[]
  /** Whose game it is and whose art the page uses, under its pages. */
  credits: L10n
}

export function game(page: Game) {
  return page
}

/** Pages under a game besides its topics: a topic can't take these ids. */
export const GAME_PAGES = ["fundamentals", "ranked", "aim"] as const
export type GamePage = (typeof GAME_PAGES)[number]

/** The newest edition of its fundamentals. */
export const fundamentals = (game: Game) => game.roadmaps[0]

export function gamePath(game: { id: string }, page?: GamePage) {
  return `${sectionPath("content")}/${game.id}${page ? `/${page}` : ""}`
}
