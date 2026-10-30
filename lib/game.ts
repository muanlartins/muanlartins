import type { Project } from "@/content/projects"
import type { Roadmap } from "@/lib/roadmap"
import { sectionPath, type L10n } from "@/lib/site"

/**
 * A game's corner of the content section, at /conteudo/<id>: a home page
 * introducing it, its roadmap, its ranked record, its lives, and links to
 * what lives elsewhere. A side menu ties them together.
 */
export interface Game {
  /** The URL: /conteudo/<id>. The roadmap shares it, so its topics live at /conteudo/<id>/<topic>. */
  id: string
  title: L10n
  /** The paragraph under the title; also the summary on the content page. */
  description: L10n
  /** The home page's introduction: the idea, the channel. A blank line starts a new paragraph. */
  intro: L10n
  roadmap: Roadmap
  /** The ranked record page, from content/matches/. */
  ranked?: { title: L10n; description: L10n }
  /** The lives page, from content/lives/, with a page per live at /lives/<date>. */
  lives?: { title: L10n; description: L10n }
  /** Apps and playlists elsewhere, listed in the menu and on the home page. */
  links: Project[]
}

export function game(page: Game) {
  return page
}

/** Pages under a game besides its topics: a topic can't take these ids. */
export const GAME_PAGES = ["fundamentals", "ranked", "lives"] as const
export type GamePage = (typeof GAME_PAGES)[number]

export function gamePath(game: { id: string }, page?: GamePage) {
  return `${sectionPath("content")}/${game.id}${page ? `/${page}` : ""}`
}

export function livePath(game: { id: string }, date: string) {
  return `${gamePath(game, "lives")}/${date}`
}
