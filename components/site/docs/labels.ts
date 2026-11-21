import { localize } from "@/lib/site"

/** The words the documentation pages share. */
export const DOCS = localize({
  docs: { pt: "Documentação", en: "Documentation" },
  onThisPage: { pt: "Nesta página", en: "On this page" },
  /** The phone's index before the reader reaches a section: "{n} seções". */
  sections: { pt: "{n} seções", en: "{n} sections" },
  copyLink: { pt: "Copiar o link de “{title}”", en: "Copy the link to “{title}”" },
  copied: { pt: "Link copiado", en: "Link copied" },
  more: { pt: "Mais documentação", en: "More documentation" },
})

/** "07": a section's number as the index and the section show it. */
export const sectionNumber = (n: number) => String(n).padStart(2, "0")
