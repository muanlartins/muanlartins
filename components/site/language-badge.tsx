import { LANGUAGE_LABEL, LOCALE, UI, type Locale } from "@/lib/site"
import { cn } from "@/lib/utils"

/** "BR" on the English site: this is in Brazilian Portuguese. Nothing when it's in this site's language. */
export function LanguageBadge({ language, className }: { language: Locale; className?: string }) {
  if (language === LOCALE) return null
  return (
    <span
      title={UI.otherLanguage}
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm bg-klein px-1.5 py-0.5 text-[11px] font-medium leading-none tracking-[0.08em] text-paper",
        className,
      )}
    >
      {LANGUAGE_LABEL[language]}
    </span>
  )
}

/** The badge with a line on how to follow along: auto-translated subtitles. */
export function LanguageNotice({ language }: { language: Locale }) {
  if (language === LOCALE) return null
  return (
    <aside className="flex items-start gap-3 rounded-md border border-klein/30 bg-paper/60 px-4 py-3">
      <LanguageBadge language={language} className="mt-0.5" />
      <p className="text-[14px] leading-[1.6] text-ink">{UI.otherLanguage}</p>
    </aside>
  )
}
