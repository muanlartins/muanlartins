import { localize } from "@/lib/site"

/** The words the fundamentals' pages add to the site's (`UI` in lib/site.ts). */
export const ROADMAP = localize({
  fundamentals: { pt: "Fundamentos", en: "Fundamentals" },
  /** A topic's text when it has no sections of its own. */
  summary: { pt: "Resumo", en: "Summary" },
  pillar: { pt: "Pilar", en: "Pillar" },
  concept: { pt: "Conceito", en: "Concept" },
  progress: { pt: "Seu progresso", en: "Your progress" },
  cleared: { pt: "Apagado.", en: "Cleared." },
  around: { pt: "Outros tópicos", en: "Other topics" },
  /** Under a topic's title while it has no video, so no text yet. */
  draft: { pt: "Esse tópico ainda não tem vídeo. O resumo chega junto com ele.", en: "This topic has no video yet. Its summary comes with it." },
})
