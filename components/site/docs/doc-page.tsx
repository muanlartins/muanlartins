import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Fragment, type ReactNode } from "react"
import { DocToc, type TocItem } from "./doc-toc"
import { DOCS } from "./labels"

export interface DocMeta {
  label: string
  value: ReactNode
}

export interface DocLink {
  label: string
  href: string
}

/**
 * The documentation pages' frame (the commands, Σ, the backstage, the roadmap, the privacy policy): quieter and
 * denser than the rest of the site, read like a reference. A trail over the title, the h1 and its line, the page's
 * facts on a ruled strip, the index (in the right margin from 1280 px, a bar that sticks under the header below it),
 * numbered sections (`DocSection`) and, at the end, the other documentation pages.
 */
export function DocPage({
  trail,
  title,
  description,
  meta = [],
  toc,
  more = [],
  children,
}: {
  /** Where the page sits, as the eyebrow over the title: a link back, then "Documentação". */
  trail: DocLink[]
  title: string
  description: ReactNode
  meta?: DocMeta[]
  toc: TocItem[]
  /** The other documentation pages, linked at the end. */
  more?: DocLink[]
  children: ReactNode
}) {
  return (
    <div className="relative">
      <header>
        <p className="eyebrow flex flex-wrap items-center gap-x-2 text-muted">
          {trail.map((crumb) => (
            <Fragment key={crumb.label}>
              {crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-klein">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              <span aria-hidden className="text-line-strong">
                /
              </span>
            </Fragment>
          ))}
          <span className="text-klein">{DOCS.docs}</span>
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.03em] text-klein sm:text-5xl">{title}</h1>
        <div className="mt-4 max-w-[38rem] text-[17px] leading-[1.6] text-ink">{description}</div>
        {meta.length > 0 && (
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-3">
            {meta.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                <dt className="eyebrow text-muted">{item.label}</dt>
                <dd className="text-[13px] font-medium tabular-nums text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <DocToc items={toc} />

      <div className="mt-12 [&>section:first-child]:mt-0">{children}</div>

      {more.length > 0 && (
        <nav aria-label={DOCS.more} className="mt-24 border-t border-line pt-3">
          <p className="eyebrow text-muted">{DOCS.more}</p>
          <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {more.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="group flex items-center justify-between gap-3 border-b border-line py-3 text-[15px] font-medium text-ink transition-colors hover:text-klein">
                  {link.label}
                  <ArrowRight aria-hidden className="h-4 w-4 text-muted transition-colors group-hover:text-klein" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
