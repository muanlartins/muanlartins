import { Info, type LucideIcon } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A note set apart from the text: a Klein tint for something worth knowing, or Klein itself for the one thing to take
 * away (a summary). Cut like the site's panels.
 */
export function Callout({
  tone = "note",
  icon: Icon = Info,
  title,
  className,
  children,
}: {
  tone?: "note" | "strong"
  icon?: LucideIcon
  title?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("cut flex max-w-[38rem] gap-3 p-5 text-[15px] leading-[1.6]", tone === "note" ? "bg-klein/[0.07] text-ink" : "bg-klein text-paper", className)}>
      <Icon aria-hidden className={cn("mt-1 h-4 w-4 shrink-0", tone === "note" ? "text-klein" : "text-paper")} />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}

/** A chat command or anything typed as it's written: a square chip on a Klein tint, in the site's own type. */
export function CodeChip({ className, children }: { className?: string; children: ReactNode }) {
  return <code className={cn("inline-block bg-klein/[0.08] px-1.5 py-0.5 font-sans text-[15px] font-medium leading-tight text-klein", className)}>{children}</code>
}

export interface DefItem {
  key?: string
  term: ReactNode
  detail: ReactNode
  /** A figure on the right: a cost, a date. */
  aside?: ReactNode
}

/**
 * The row of a definition list, for lists whose rows are something else (a button that plays the command). Narrower
 * than 640 px the term goes over its definition, unless `side` keeps them side by side (a short term, like "10 Σ").
 */
export function defRowClass(aside = false, side = false) {
  return cn(
    "grid items-baseline gap-x-6 gap-y-1 py-3 sm:grid-cols-[var(--term)_minmax(0,1fr)]",
    side && "grid-cols-[var(--term)_minmax(0,1fr)]",
    aside && "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[var(--term)_minmax(0,1fr)_auto]",
  )
}

/**
 * A definition list ruled like a reference table: the term in a column of its own from 640 px (`termWidth`), what it
 * means beside it, and an optional figure on the right.
 */
export function DefList({
  items,
  termWidth = "12rem",
  head,
  side = false,
  className,
}: {
  items: DefItem[]
  termWidth?: string
  head?: [string, string, string?]
  /** Term and definition side by side on phones too (for short terms). */
  side?: boolean
  className?: string
}) {
  const aside = items.some((item) => item.aside != null)
  return (
    <div className={className} style={{ "--term": termWidth } as CSSProperties}>
      {head && (
        <div aria-hidden className={cn(defRowClass(aside, side), "eyebrow hidden pb-2 pt-0 text-muted sm:grid", side && "grid")}>
          <span>{head[0]}</span>
          <span>{head[1]}</span>
          {aside && <span className="text-right">{head[2]}</span>}
        </div>
      )}
      <dl className="divide-y divide-line border-y border-line">
        {items.map((item, i) => (
          <div key={item.key ?? i} className={defRowClass(aside, side)}>
            <dt className={cn("min-w-0", aside && "max-sm:col-start-1")}>{item.term}</dt>
            <dd className={cn("min-w-0 text-[15px] leading-[1.6] text-ink", aside && "max-sm:col-span-2 max-sm:row-start-2")}>{item.detail}</dd>
            {aside && <dd className="text-right text-[13px] tabular-nums text-muted max-sm:col-start-2 max-sm:row-start-1">{item.aside}</dd>}
          </div>
        ))}
      </dl>
    </div>
  )
}

/** Paragraphs from a text with blank lines between them, at the reading measure. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("max-w-[38rem] space-y-4 text-[15px] leading-[1.7] text-ink", className)}>
      {text.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  )
}
