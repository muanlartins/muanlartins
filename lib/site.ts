/**
 * One codebase, two sites: muanlartins.com.br speaks Portuguese and
 * muanlartins.com speaks English. Each build bakes in one locale
 * (NEXT_PUBLIC_LOCALE) and links across to the other domain.
 */

export type Locale = "pt" | "en"
export type Section = "personal" | "professional" | "content" | "channel"

export const LOCALE: Locale = process.env.NEXT_PUBLIC_LOCALE === "en" ? "en" : "pt"
export const OTHER_LOCALE: Locale = LOCALE === "pt" ? "en" : "pt"

const ORIGINS: Record<Locale, string> =
  process.env.NODE_ENV === "development"
    ? { pt: "http://localhost:3000", en: "http://localhost:3001" }
    : { pt: "https://muanlartins.com.br", en: "https://muanlartins.com" }

export const ORIGIN = ORIGINS[LOCALE]

/**
 * Each site's sections, in the header's order. The Portuguese one has everything, the channel as its home page (its
 * pages live under /canal); the English one only Luan's life and work (his audience abroad is professional), his
 * life as its home page.
 */
const SECTIONS_OF: Record<Locale, Section[]> = {
  pt: ["channel", "content", "personal", "professional"],
  en: ["personal", "professional"],
}
const HOME: Record<Locale, Section> = { pt: "channel", en: "personal" }
export const SECTIONS = SECTIONS_OF[LOCALE]
export const HOME_SECTION = HOME[LOCALE]

/** Whether a site has a section: the English one has no channel or content. */
export const hasSection = (section: Section, locale: Locale = LOCALE) => SECTIONS_OF[locale].includes(section)

const SLUGS: Record<Locale, Record<Section, string>> = {
  pt: { personal: "pessoal", professional: "profissional", content: "conteudo", channel: "canal" },
  en: { personal: "personal", professional: "professional", content: "content", channel: "channel" },
}

export function sectionPath(section: Section, locale: Locale = LOCALE) {
  return `/${SLUGS[locale][section]}`
}

export function sectionUrl(section: Section, locale: Locale = LOCALE) {
  return `${ORIGINS[locale]}${sectionPath(section, locale)}`
}

/** Where a link to a section goes: a site's home section is its home page. */
export function sectionHref(section: Section, locale: Locale = LOCALE) {
  return section === HOME[locale] ? "/" : sectionPath(section, locale)
}

/** The site's home in a language: the channel in Portuguese, Luan's life in English. */
export function homeUrl(locale: Locale = LOCALE) {
  return `${ORIGINS[locale]}/`
}

/** A section's page in a language, as a full URL: the home page for that site's home section. */
export function sectionLink(section: Section, locale: Locale = LOCALE) {
  return section === HOME[locale] ? homeUrl(locale) : sectionUrl(section, locale)
}

export function sectionFromSlug(slug: string): Section | undefined {
  return SECTIONS.find((section) => SLUGS[LOCALE][section] === slug)
}

/** The privacy policy sits beside the sections; Google's consent screen for the channel's YouTube tools links to it. */
const PRIVACY_SLUGS: Record<Locale, string> = { pt: "privacidade", en: "privacy" }

export function privacySlug(locale: Locale = LOCALE) {
  return PRIVACY_SLUGS[locale]
}

export function privacyUrl(locale: Locale = LOCALE) {
  return `${ORIGINS[locale]}/${PRIVACY_SLUGS[locale]}`
}

/** The viewer's profile: for now, their fan in the stream's crowd. Twitch sends sign-ins back to it. */
const PROFILE_SLUGS: Record<Locale, string> = { pt: "perfil", en: "profile" }

export function profileSlug(locale: Locale = LOCALE) {
  return PROFILE_SLUGS[locale]
}

export function profileUrl(locale: Locale = LOCALE) {
  return `${ORIGINS[locale]}/${PROFILE_SLUGS[locale]}`
}

/** Pix on the live: the same word in both languages. */
export const PIX_SLUG = "pix"

export function pixUrl(locale: Locale = LOCALE) {
  return `${ORIGINS[locale]}/${PIX_SLUG}`
}

/** The mural of everyone who sent a Pix and chose to show: the same word in both languages too. */
export const MURAL_SLUG = "mural"

export function muralUrl(locale: Locale = LOCALE) {
  return `${ORIGINS[locale]}/${MURAL_SLUG}`
}

/**
 * Your profiles elsewhere. They show in the footer and tell Google that
 * these accounts and this site are the same person.
 */
export const LINKS = [
  { label: "YouTube", href: "https://www.youtube.com/@muanlartins" },
  { label: "Twitch", href: "https://www.twitch.tv/muanlartins" },
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
    channel: { pt: "Canal", en: "Channel" },
  },
  switchLanguage: { pt: "English", en: "Português" },
  privacy: { pt: "Privacidade", en: "Privacy" },
  /** The 404 page. */
  notFound: {
    title: { pt: "Nada por aqui", en: "Nothing here" },
    text: {
      pt: "Este endereço não existe ou mudou de lugar. Escolha uma seção lá em cima para continuar.",
      en: "This address doesn't exist or has moved. Pick a section up top to keep going.",
    },
  },
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
    pt: "Marque cada tópico como Treinando enquanto pratica e Concluído quando já sai natural no jogo. Concluir os tópicos de um rank leva você até o próximo. Fica salvo neste navegador.",
    en: "Mark each topic Practicing while you drill it and Done once it comes naturally in games. Finishing a rank's topics moves you on to the next one. It's saved in this browser.",
  },
  rankUp: { pt: "Subiu para", en: "Ranked up to" },
  clearProgress: { pt: "Apagar progresso", en: "Clear progress" },
  confirmClear: { pt: "Apagar tudo? Clique de novo", en: "Clear everything? Click again" },
  roadmapDone: { pt: "Roteiro concluído!", en: "Roadmap complete!" },
  video: { pt: "Vídeo", en: "Video" },
  /** Shown when a page's videos and texts are in the other language. */
  otherLanguage: {
    pt: "Os vídeos e textos daqui estão em inglês. Para legendas em português, ative as legendas (CC) e escolha Configurações → Legendas → Traduzir automaticamente → Português.",
    en: "The videos and texts here are in Brazilian Portuguese. For English subtitles, turn on captions (CC), then pick Settings → Subtitles → Auto-translate → English.",
  },
  /** On the newest fundamentals of a game that redid them, before links to the older ones. */
  olderEditions: { pt: "Edições anteriores:", en: "Earlier editions:" },
  /** On an older edition, before the link to the newest. */
  replacedBy: { pt: "Esta edição foi refeita. A atual:", en: "This edition was redone. The current one:" },
  edition: { pt: "edição", en: "edition" },
  /** A roadmap with no topics yet, above its ranks. */
  noTopics: {
    pt: "Ainda não há tópicos. Os primeiros chegam com as lives, um conceito de cada vez, organizados pelo rank em que começam a fazer diferença.",
    en: "No topics yet. The first ones come with the streams, one concept at a time, sorted by the rank where they start to matter.",
  },
  /** Under a topic's text: where its tips came from. */
  sources: { pt: "Onde aprendi", en: "Where I learned it" },
  previous: { pt: "Anterior", en: "Previous" },
  next: { pt: "Próximo", en: "Next" },
})
