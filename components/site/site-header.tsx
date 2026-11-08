"use client"

import { BriefcaseBusiness, Gamepad2, Radio, User, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LiveBadge } from "@/components/site/lives/live-badge"
import { cn } from "@/lib/utils"
import {
  hasSection,
  HOME_SECTION,
  LANGUAGE_LABEL,
  MURAL_SLUG,
  OTHER_LOCALE,
  PIX_SLUG,
  SECTIONS,
  UI,
  privacySlug,
  privacyUrl,
  profileSlug,
  sectionHref,
  sectionLink,
  sectionPath,
  sectionUrl,
  type Section,
} from "@/lib/site"

const ICONS: Record<Section, LucideIcon> = { channel: Radio, content: Gamepad2, personal: User, professional: BriefcaseBusiness }

/** The section a page is in; the home page is the site's home section's. */
function currentSection(page: string): Section | undefined {
  if (page === "") return HOME_SECTION
  return SECTIONS.find((section) => page === sectionPath(section) || page.startsWith(`${sectionPath(section)}/`))
}

/**
 * The header: the mark home, the sections with their icons, and the other language, only where the other site has
 * the same page (the English site is Luan's life and work only, so the channel and the games have no switch).
 * `lives`: the lives page, where the "live" pill leads while the channel is on air.
 */
export function SiteHeader({ lives }: { lives?: string }) {
  const page = usePathname().replace(/\/$/, "")
  const current = currentSection(page)
  const onPrivacy = page === `/${privacySlug()}`
  // The profile, Pix and the mural sit beside the sections, but they're the channel's: its menu has them.
  const ofChannel = page === `/${profileSlug()}` || page === `/${PIX_SLUG}` || page === `/${MURAL_SLUG}`
  const shown = onPrivacy ? null : ofChannel ? "channel" : current
  // Pages under a section keep the same path in both languages.
  const subpath = current && page.startsWith(sectionPath(current)) ? page.slice(sectionPath(current).length) : ""
  const otherLanguage = onPrivacy
    ? privacyUrl(OTHER_LOCALE)
    : !ofChannel && current && hasSection(current, OTHER_LOCALE)
      ? subpath
        ? sectionUrl(current, OTHER_LOCALE) + subpath
        : sectionLink(current, OTHER_LOCALE)
      : undefined

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ground/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-6 sm:gap-6">
        <Link href="/" aria-label="muanlartins" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark-small.svg" alt="" className="h-8 w-8 rounded-[7px]" />
          <span className="hidden text-[17px] font-medium tracking-[-0.01em] sm:inline">muanlartins</span>
        </Link>

        {/* Four sections don't fit a phone: there "Profissional" steps out. */}
        <div className="flex items-center gap-3 text-[13px] sm:gap-6 sm:text-[14px]">
          {lives && hasSection("channel") && <LiveBadge href={lives} />}
          {SECTIONS.map((section) => {
            const Icon = ICONS[section]
            return (
              <Link
                key={section}
                href={sectionHref(section)}
                aria-current={section === shown ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 transition-colors hover:text-klein",
                  section === shown ? "text-klein" : "text-muted",
                  SECTIONS.length > 3 && section === "professional" && "hidden sm:inline-flex",
                )}
              >
                <Icon aria-hidden className="hidden h-4 w-4 sm:block" />
                {UI.sections[section]}
              </Link>
            )
          })}
          {otherLanguage && (
            <a
              href={otherLanguage}
              hrefLang={OTHER_LOCALE}
              aria-label={UI.switchLanguage}
              title={UI.switchLanguage}
              className="rounded-sm border border-line px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted transition-colors hover:border-klein hover:text-klein"
            >
              {LANGUAGE_LABEL[OTHER_LOCALE]}
            </a>
          )}
        </div>
      </nav>
    </header>
  )
}
