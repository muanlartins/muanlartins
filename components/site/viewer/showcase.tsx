import type { ReactNode } from "react"
import { cardClass, Skeleton } from "@/components/site/ui"
import { cn } from "@/lib/utils"

/**
 * A showcase on a viewer's page, Steam-style (brand/interface.md, "Card"): a card with a title bar (an h2, its icon and
 * a line of meta on the right), its content, and an optional footer with what to do next. Every showcase on the page is
 * this one component, so they read as one set; `wide` spans both columns.
 */
export function Showcase({
  id,
  title,
  icon,
  meta,
  footer,
  wide,
  children,
}: {
  id: string
  title: string
  icon: ReactNode
  meta?: ReactNode
  footer?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={cn(cardClass, "flex scroll-mt-24 flex-col", wide && "sm:col-span-2")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-klein/[0.045] px-5 py-3">
        <h2 id={`${id}-titulo`} className="flex items-center gap-2.5 text-xl font-medium tracking-[-0.02em] text-klein">
          <span aria-hidden className="grid h-5 w-5 place-items-center [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </span>
          {title}
        </h2>
        {meta && <p className="text-[13px] text-muted tabular-nums">{meta}</p>}
      </div>
      <div className="flex-1 space-y-4 p-5">{children}</div>
      {footer && <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-3">{footer}</div>}
    </section>
  )
}

/** The showcases while their data comes: one wide, two side by side, shaped like what's coming. */
export function ShowcasesSkeleton() {
  const one = (wide?: boolean) => (
    <div className={cn(cardClass, "overflow-hidden", wide && "sm:col-span-2")}>
      <div className="border-b border-line bg-klein/[0.045] px-5 py-3">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="space-y-3 p-5">
        <Skeleton className={wide ? "h-36" : "h-12"} />
        {!wide && <Skeleton className="h-12" />}
        {!wide && <Skeleton className="h-12 w-2/3" />}
      </div>
    </div>
  )
  return (
    <div className="grid gap-6 sm:grid-cols-2" aria-busy>
      {one(true)}
      {one()}
      {one()}
    </div>
  )
}

/** A list in a showcase: rows split by lines, in a box of its own. */
export function ShowcaseList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line border border-line bg-paper/60">{children}</ul>
}

export const rowClass = "flex flex-wrap items-center gap-x-2.5 gap-y-1 px-4 py-2.5 text-[15px]"
