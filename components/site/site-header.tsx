"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LANGUAGE_LABEL,
  OTHER_LOCALE,
  SECTIONS,
  UI,
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

export function SiteHeader() {
  const pathname = usePathname()
  const current = currentSection(pathname)
  // Pages under a section keep the same path in both languages.
  const subpath = current === "personal" ? "" : pathname.slice(sectionPath(current).length)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ground/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-6 px-6">
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

        <div className="flex items-center gap-5 text-[14px] sm:gap-7">
          {SECTIONS.map((section) => (
            <Link
              key={section}
              href={sectionPath(section)}
              aria-current={section === current ? "page" : undefined}
              className={cn(
                "transition-colors hover:text-klein",
                section === current ? "text-klein" : "text-muted",
              )}
            >
              {UI.sections[section]}
            </Link>
          ))}
          <a
            href={sectionUrl(current, OTHER_LOCALE) + subpath}
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
