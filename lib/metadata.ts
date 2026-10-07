import type { Metadata } from "next"
import { HTML_LANG, localize, sectionUrl, type L10n, type Section } from "@/lib/site"

/**
 * Title, description, and the pt-BR ⇄ en pairing Google uses to pick a
 * domain. `path` is a page under the section, the same in both languages.
 */
export function sectionMetadata(
  section: Section,
  page: { title: L10n | string; description: L10n | string },
  path = "",
): Metadata {
  return {
    title: section === "personal" ? { absolute: "Luan Martins · muanlartins" } : localize(page.title),
    description: localize(page.description),
    alternates: {
      canonical: sectionUrl(section) + path,
      languages: {
        [HTML_LANG.pt]: sectionUrl(section, "pt") + path,
        [HTML_LANG.en]: sectionUrl(section, "en") + path,
      },
    },
  }
}
