import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AnchorCopy } from "./anchor-copy"
import { sectionNumber } from "./labels"

/**
 * A numbered section of a documentation page: a rule with its number (a link to itself) and a button that copies its
 * link, the h2, an optional line under it, then its content. Sections sit 64 px apart.
 */
export function DocSection({
  id,
  n,
  title,
  description,
  className,
  children,
}: {
  id: string
  /** Its place on the page, from 1, as the index numbers it. */
  n: number
  title: string
  description?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={cn("mt-16 scroll-mt-32 border-t border-line pt-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <a href={`#${id}`} className="eyebrow tabular-nums text-muted transition-colors hover:text-klein" aria-hidden tabIndex={-1}>
          {sectionNumber(n)}
        </a>
        <AnchorCopy id={id} title={title} />
      </div>
      <h2 id={`${id}-titulo`} className="mt-1 text-2xl font-medium tracking-[-0.02em] text-klein">
        {title}
      </h2>
      {description && <div className="mt-2 max-w-[38rem] text-[15px] leading-[1.6] text-muted">{description}</div>}
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
