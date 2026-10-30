"use client"

import { ArrowUpRight } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export interface MenuItem {
  label: string
  href: string
  /** Lives elsewhere: another app or YouTube. */
  away?: boolean
}

/**
 * A game's pages. Wide screens get a column in the left margin that follows
 * the page down, with a ball rolling to the page being read; narrower ones a
 * row of tabs above it. A page under another counts as that one's (a live
 * as the lives'), and topic pages as the roadmap's.
 */
export function GameMenu({ title, home, items }: { title: string; home: string; items: MenuItem[] }) {
  const pathname = usePathname().replace(/\/$/, "")
  const own = items.filter((item) => !item.away)
  const active =
    own.find((item) => item.href === pathname) ??
    own.find((item) => item.href !== home && pathname.startsWith(`${item.href}/`)) ??
    (pathname.startsWith(`${home}/`) ? own.find((item) => item.href.endsWith("/fundamentals")) : undefined)

  return (
    <>
      <aside className="absolute right-full top-0 mr-16 hidden h-full w-44 xl:block">
        <nav className="sticky top-32">
          <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{title}</p>
          <ul className="space-y-1 border-l border-line">
            {items.map((item) => {
              const current = item === active
              return (
                <li key={item.href} className="relative">
                  {current && (
                    <motion.span
                      layoutId="game-menu-ball"
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      className="absolute -left-[7px] top-1/2 -mt-[6px] block"
                    >
                      <Ball />
                    </motion.span>
                  )}
                  <MenuLink
                    item={item}
                    className={cn(
                      "flex items-center gap-1.5 py-1.5 pl-5 text-[15px] transition-colors",
                      current ? "font-medium text-klein" : "text-muted hover:text-ink",
                    )}
                  />
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <nav className="-mt-10 mb-12 flex flex-wrap gap-2 xl:hidden">
        {items.map((item) => (
          <MenuLink
            key={item.href}
            item={item}
            className={cn(
              "flex items-center gap-1 rounded-md border px-3 py-1.5 text-[14px] transition-colors",
              item === active ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein",
            )}
          />
        ))}
      </nav>
    </>
  )
}

function MenuLink({ item, className }: { item: MenuItem; className: string }) {
  if (item.away) {
    return (
      <a href={item.href} className={className} {...(item.href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}>
        {item.label}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
      </a>
    )
  }
  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  )
}

/** A tiny ball: Klein, with the panel seams of the real one. */
function Ball() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="block">
      <circle cx="6" cy="6" r="5.25" className="fill-paper stroke-klein" strokeWidth="1.5" />
      <path d="M6 3.2 8.4 4.9 7.5 7.7H4.5L3.6 4.9Z" className="fill-klein" />
    </svg>
  )
}
