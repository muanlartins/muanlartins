import rocketLeague from "@/content/rocket-league"
import { ranked } from "@/content/ranked"
import { rlr } from "@/content/rlr"
import { roadmapPath } from "@/lib/roadmap"
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

/** Each roadmap gets a page at /conteudo/<id>, with one page per topic. */
export const roadmaps = [rocketLeague]

/** The commented 2v2 ranked series: a YouTube playlist, not a page here. */
const commented2v2 = {
  id: "2v2-comentado",
  name: { pt: "Rocket League 2v2 Comentado", en: "Rocket League 2v2, commented" },
  summary: {
    pt: "Partidas ranqueadas de 2v2, rumo ao Champion, comentando o que eu estou pensando em cada jogada.",
    en: "Ranked 2v2 matches on the way to Champion, saying what I'm thinking on every play.",
  },
  href: "https://www.youtube.com/playlist?list=PLf2PbBfB1o0A",
  language: "pt",
} satisfies Project

export const projects: Project[] = [
  ranked,
  commented2v2,
  rlr,
  ...roadmaps.map((roadmap) => ({
    id: roadmap.id,
    name: roadmap.title,
    summary: roadmap.description,
    href: roadmapPath(roadmap),
    language: roadmap.language,
  })),
]
