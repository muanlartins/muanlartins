import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A section of a page (brand/interface.md, "Components"): an h2 in Klein, an optional icon and a line under it, then
 * its content. Sections sit 64 px apart (`space-y-16` on their parent, or `mt-16`).
 */
export function Section({
  title,
  icon: Icon,
  description,
  action,
  id,
  className,
  children,
}: {
  title: ReactNode
  icon?: LucideIcon
  description?: ReactNode
  /** Something on the title's right: a link to see all, a filter. */
  action?: ReactNode
  id?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 className="flex items-center gap-2.5 text-2xl font-medium tracking-[-0.02em] text-klein">
          {Icon && <Icon aria-hidden className="h-5 w-5 shrink-0" />}
          {title}
        </h2>
        {action}
      </div>
      {description && <p className="mt-2 max-w-[38rem] text-[15px] leading-[1.6] text-muted">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
