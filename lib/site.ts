/**
 * One codebase, two sites: muanlartins.com.br speaks Portuguese and
 * muanlartins.com speaks English. Each build bakes in one locale
 * (NEXT_PUBLIC_LOCALE) and links across to the other domain.
 */

export type Locale = "pt" | "en"
export type Section = "personal" | "professional" | "content"

export const LOCALE: Locale = process.env.NEXT_PUBLIC_LOCALE === "en" ? "en" : "pt"
export const OTHER_LOCALE: Locale = LOCALE === "pt" ? "en" : "pt"

const ORIGINS: Record<Locale, string> =
  process.env.NODE_ENV === "development"
    ? { pt: "http://localhost:3000", en: "http://localhost:3001" }
    : { pt: "https://muanlartins.com.br", en: "https://muanlartins.com" }

export const ORIGIN = ORIGINS[LOCALE]

export const SECTIONS: Section[] = ["personal", "professional", "content"]

const SLUGS: Record<Locale, Record<Section, string>> = {
  pt: { personal: "", professional: "profissional", content: "conteudo" },
  en: { personal: "", professional: "professional", content: "content" },
}

export function sectionPath(section: Section, locale: Locale = LOCALE) {
  return `/${SLUGS[locale][section]}`
}

export function sectionUrl(section: Section, locale: Locale = LOCALE) {
  return `${ORIGINS[locale]}${sectionPath(section, locale)}`
}

export function sectionFromSlug(slug: string): Section | undefined {
  return SECTIONS.find((section) => SLUGS[LOCALE][section] === slug)
}

/**
 * Your profiles elsewhere. They show in the footer and tell Google that
 * these accounts and this site are the same person.
 */
export const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/muanlartins" },
  { label: "Instagram", href: "https://www.instagram.com/muanlartins" },
  { label: "GitHub", href: "https://github.com/muanlartins" },
]

export const HTML_LANG: Record<Locale, string> = { pt: "pt-BR", en: "en" }

/** How the language switch and badges name each language: Brazilian Portuguese is "BR". */
export const LANGUAGE_LABEL: Record<Locale, string> = { pt: "BR", en: "EN" }

/** A string written in both languages. Content files use it everywhere. */
export interface L10n {
  pt: string
  en: string
}

function isL10n(value: unknown): value is L10n {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 2 &&
    typeof (value as L10n).pt === "string" &&
    typeof (value as L10n).en === "string"
  )
}

export type Localized<T> = T extends L10n
  ? string
  : T extends (infer U)[]
    ? Localized<U>[]
    : T extends object
      ? { [K in keyof T]: Localized<T[K]> }
      : T

/** Replaces every `{ pt, en }` pair in `value` with this build's language. */
export function localize<T>(value: T, locale: Locale = LOCALE): Localized<T> {
  if (isL10n(value)) return value[locale] as Localized<T>
  if (Array.isArray(value)) return value.map((item) => localize(item, locale)) as Localized<T>
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localize(item, locale)]),
    ) as Localized<T>
  }
  return value as Localized<T>
}

export const UI = localize({
  sections: {
    personal: { pt: "Pessoal", en: "Personal" },
    professional: { pt: "Profissional", en: "Professional" },
    content: { pt: "Conteúdo", en: "Content" },
  },
  switchLanguage: { pt: "English", en: "Português" },
  playVideo: { pt: "Assistir ao vídeo", en: "Play video" },
  videoSoon: { pt: "Vídeo em breve", en: "Video coming soon" },
  soon: { pt: "Em breve", en: "Coming soon" },
  status: {
    none: { pt: "Não comecei", en: "Not started" },
    practicing: { pt: "Treinando", en: "Practicing" },
    done: { pt: "Concluído", en: "Done" },
  },
  completed: { pt: "concluídos", en: "done" },
  /** Above the ranks: what the statuses mean and where they're kept. */
  statusHint: {
    pt: "Marque cada tópico como Treinando enquanto pratica e Concluído quando já sai natural no jogo. Concluir os tópicos de um rank leva a bola até o próximo. Fica salvo neste navegador.",
    en: "Mark each topic Practicing while you drill it and Done once it comes naturally in games. Finishing a rank's topics rolls the ball on to the next one. It's saved in this browser.",
  },
  rankUp: { pt: "Subiu para", en: "Ranked up to" },
  clearProgress: { pt: "Apagar progresso", en: "Clear progress" },
  confirmClear: { pt: "Apagar tudo? Clique de novo", en: "Clear everything? Click again" },
  roadmapDone: { pt: "Roteiro concluído!", en: "Roadmap complete!" },
  video: { pt: "Vídeo", en: "Video" },
  /** Under a roadmap of a game made by others. */
  credits: {
    pt: "Rocket League e os emblemas de rank são da Psyonix/Epic Games; este site não é oficial nem afiliado. Modelos 3D do Octane e da bola por Jako (CC BY 4.0).",
    en: "Rocket League and its rank emblems belong to Psyonix/Epic Games; this site is unofficial and not affiliated. Octane and ball 3D models by Jako (CC BY 4.0).",
  },
  /** Shown when a page's videos and texts are in the other language. */
  otherLanguage: {
    pt: "Os vídeos e textos daqui estão em inglês. Para legendas em português, ative as legendas (CC) e escolha Configurações → Legendas → Traduzir automaticamente → Português.",
    en: "The videos and texts here are in Brazilian Portuguese. For English subtitles, turn on captions (CC), then pick Settings → Subtitles → Auto-translate → English.",
  },
  previous: { pt: "Anterior", en: "Previous" },
  next: { pt: "Próximo", en: "Next" },
})
