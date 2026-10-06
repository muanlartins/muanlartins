import type { Metadata } from "next"
import { HTML_LANG, localize, sectionUrl, type L10n, type Section } from "@/lib/site"

/** Title, description, and the pt-BR ⇄ en pairing Google uses to pick a domain. */
export function sectionMetadata(
  section: Section,
  page: { title: L10n; description: L10n },
): Metadata {
  return {
    title: section === "personal" ? { absolute: "Luan Martins · muanlartins" } : localize(page.title),
    description: localize(page.description),
    alternates: {
      canonical: sectionUrl(section),
      languages: {
        [HTML_LANG.pt]: sectionUrl(section, "pt"),
        [HTML_LANG.en]: sectionUrl(section, "en"),
      },
    },
  }
}
