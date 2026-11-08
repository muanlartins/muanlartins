import rocketLeagueHome from "@/content/rocket-league-home"
import valorantHome from "@/content/valorant-home"
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
    pt: "Os projetos de um cara engenhoso.",
    en: "The projects of a resourceful guy.",
  },
}

/** The content page lists them (components/site/game/game-list.tsx); each gets a home at /conteudo/<id>, with its roadmap, its ranked record and its links (lib/game.ts). */
export const games = [rocketLeagueHome, valorantHome]

