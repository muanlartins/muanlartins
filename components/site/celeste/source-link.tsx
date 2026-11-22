import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import type { Source } from "@/content/celeste-fontes"

/** A source as a ruled row: its title, whose it is and in which language, and under that what it's for. */
export function SourceLink({ source, href = source.href, at, children }: { source: Source; href?: string; at?: string; children?: ReactNode }) {
  const meta = [source.author, at, source.lang === "en" && "em inglês", source.general && "não é só de Celeste"].filter(Boolean).join(" · ")
  return (
    <li className="py-3">
      <a href={href} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-4">
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <span className="block text-[15px] font-medium text-ink group-hover:text-klein">{source.title}</span>
          <span className="text-[13px] text-muted">{meta}</span>
        </span>
        <ArrowUpRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-muted group-hover:text-klein" />
      </a>
      {children && <div className="mt-1 text-[13px] leading-[1.5] text-muted">{children}</div>}
    </li>
  )
}
