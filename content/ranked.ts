import type { Project } from "@/content/projects"
import { sectionPath } from "@/lib/site"

/**
 * Luan's ranked record at /conteudo/ranked, built from the sessions the
 * stream's "Partidas" dock publishes to content/matches/.
 * TODO(Luan): the summary is a placeholder; rewrite it in your voice.
 */
export const ranked = {
  id: "ranked",
  name: { pt: "Ranqueadas", en: "Ranked" },
  summary: {
    pt: "Meu ranque, meus pontos e cada partida ranqueada das lives, em 1v1, 2v2 e 3v3.",
    en: "My rank, my points and every ranked match from the streams, in 1v1, 2v2 and 3v3.",
  },
  href: `${sectionPath("content")}/ranked`,
} satisfies Project
