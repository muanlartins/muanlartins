import rocketLeague from "@/content/rocket-league"
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

export const projects: Project[] = [
  rlr,
  ...roadmaps.map((roadmap) => ({
    id: roadmap.id,
    name: roadmap.title,
    summary: roadmap.description,
    href: roadmapPath(roadmap),
    language: roadmap.language,
  })),
]
