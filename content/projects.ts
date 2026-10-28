import rocketLeagueHome from "@/content/rocket-league-home"
import { gamePath } from "@/lib/game"
import type { L10n, Locale } from "@/lib/site"

/**
 * The content page: one entry per project, newest first. A project with
 * no `href` yet shows as "coming soon".
 */
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
    pt: "Os projetos de um cara engenhoso.",
    en: "The projects of a resourceful guy.",
  },
}

/** Each game gets a home at /conteudo/<id>, with its roadmap, its ranked record and its links (lib/game.ts). */
export const games = [rocketLeagueHome]

export const projects: Project[] = games.map((game) => ({
  id: game.id,
  name: game.title,
  summary: game.description,
  href: gamePath(game),
  language: game.roadmap.language,
}))
