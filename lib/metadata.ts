import type { Metadata } from "next"
import { HTML_LANG, hasSection, localize, LOCALE, sectionLink, sectionUrl, type L10n, type Locale, type Section } from "@/lib/site"

/**
 * Title, description, and the pt-BR ⇄ en pairing Google uses to pick a
 * domain. `path` is a page under the section, the same in both languages.
 * Only the languages that have the section are paired (the channel and the
 * content are Portuguese only), and a site's home section is its home page.
 */
export function sectionMetadata(
  section: Section,
  page: { title: L10n | string; description: L10n | string },
  path = "",
): Metadata {
  const url = (locale: Locale) => (path ? sectionUrl(section, locale) + path : sectionLink(section, locale))
  return {
    title: section === "personal" ? { absolute: "Luan Martins · muanlartins" } : localize(page.title),
    description: localize(page.description),
    alternates: {
      canonical: url(LOCALE),
      languages: Object.fromEntries((["pt", "en"] as const).filter((locale) => hasSection(section, locale)).map((locale) => [HTML_LANG[locale], url(locale)])),
    },
  }
}
