"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LiveBadge } from "@/components/site/lives/live-badge"
import { cn } from "@/lib/utils"
import {
  LANGUAGE_LABEL,
  MURAL_SLUG,
  muralUrl,
  OTHER_LOCALE,
  PIX_SLUG,
  pixUrl,
  SECTIONS,
  UI,
  privacySlug,
  privacyUrl,
  profileSlug,
  profileUrl,
  sectionPath,
  sectionUrl,
  type Section,
} from "@/lib/site"

function currentSection(pathname: string): Section {
  return (
    SECTIONS.find(
      (section) => section !== "personal" && pathname.startsWith(sectionPath(section)),
    ) ?? "personal"
  )
}

/** `lives`: the lives page, where the "live" pill leads while the channel is on air. */
export function SiteHeader({ lives }: { lives?: string }) {
  const pathname = usePathname()
  const current = currentSection(pathname)
  // Pages under a section keep the same path in both languages.
  const subpath = current === "personal" ? "" : pathname.slice(sectionPath(current).length)
  const page = pathname.replace(/\/$/, "")
  const onPrivacy = page === `/${privacySlug()}`
  const onProfile = page === `/${profileSlug()}`
  // The profile, Pix and the mural sit beside the sections, but they're the channel's: its menu has them.
  const ofChannel = onProfile || page === `/${PIX_SLUG}` || page === `/${MURAL_SLUG}`
  const shown = onPrivacy ? null : ofChannel ? "channel" : current
  const otherLanguage = onPrivacy
    ? privacyUrl(OTHER_LOCALE)
    : onProfile
      ? profileUrl(OTHER_LOCALE)
      : page === `/${PIX_SLUG}`
        ? pixUrl(OTHER_LOCALE)
        : page === `/${MURAL_SLUG}`
          ? muralUrl(OTHER_LOCALE)
          : sectionUrl(current, OTHER_LOCALE) + subpath

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ground/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-6 sm:gap-6">
        <Link
          href="/"
          aria-label="muanlartins"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark-small.svg" alt="" className="h-8 w-8 rounded-[7px]" />
          <span className="hidden text-[17px] font-medium tracking-[-0.01em] sm:inline">
            muanlartins
          </span>
        </Link>

        {/* Four sections don't fit a phone: there the mark is the way home, and "Pessoal" steps out. */}
        <div className="flex items-center gap-3 text-[13px] sm:gap-7 sm:text-[14px]">
          {lives && <LiveBadge href={lives} />}
          {SECTIONS.map((section) => (
            <Link
              key={section}
              href={sectionPath(section)}
              aria-current={section === shown ? "page" : undefined}
              className={cn(
                "transition-colors hover:text-klein",
                section === shown ? "text-klein" : "text-muted",
                section === "personal" && "hidden sm:inline",
              )}
            >
              {UI.sections[section]}
            </Link>
          ))}
          <a
            href={otherLanguage}
            hrefLang={OTHER_LOCALE}
            aria-label={UI.switchLanguage}
            title={UI.switchLanguage}
            className="rounded-sm border border-line px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted transition-colors hover:border-klein hover:text-klein"
          >
            {LANGUAGE_LABEL[OTHER_LOCALE]}
          </a>
        </div>
      </nav>
    </header>
  )
}
