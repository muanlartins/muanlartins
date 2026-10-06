import type { L10n } from "@/lib/site"

/**
 * The content page: one entry per project, newest first. A project with
 * no `href` yet shows as "coming soon".
 */
export interface Project {
  id: string
  name: L10n
  summary: L10n
  href?: string
}

export const page = {
  title: { pt: "Conteúdo", en: "Content" },
  description: {
    pt: "Os projetos de um cara engenhoso.",
    en: "The projects of a resourceful guy.",
  },
}

export const projects: Project[] = [
  // {
  //   id: "rocket-league",
  //   name: { pt: "Rocket League", en: "Rocket League" },
  //   summary: {
  //     pt: "TODO: do que se trata o projeto.",
  //     en: "TODO: what the project is about.",
  //   },
  // },
]
