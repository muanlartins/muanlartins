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
})
