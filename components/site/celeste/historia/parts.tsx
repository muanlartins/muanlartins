import type { ReactNode } from "react"
import { Badge } from "@/components/site/ui"
import { cn } from "@/lib/utils"

/** The story pages' own pieces, on top of the technique pages' (tecnicas/parts.tsx). */

/**
 * Lines of the game, as the game's own Brazilian translation has them, each with its English original under it: who
 * says it, then the line. `n` keeps the dialog's key beside each one in the code, so a line can be found in the game's
 * files (Content/Dialog), never on the page.
 */
export function Dialogue({ lines, className }: { lines: { who: string; pt: ReactNode; en: string; n?: string }[]; className?: string }) {
  return (
    <ol className={cn("max-w-[38rem] space-y-4 border-l-2 border-klein pl-4", className)}>
      {lines.map((line, index) => (
        <li key={index}>
          <p className="eyebrow text-muted">{line.who}</p>
          <p className="mt-1 text-[17px] leading-[1.5] text-ink">“{line.pt}”</p>
          <p lang="en" className="mt-1 text-[13px] leading-[1.5] text-muted">
            “{line.en}”
          </p>
        </li>
      ))}
    </ol>
  )
}

/** Where a claim comes from, said beside it: the game itself, its makers, or its players. */
export type Seal = "jogo" | "devs" | "fas" | "minha"

const SEALS: Record<Seal, string> = {
  jogo: "No jogo",
  devs: "Dito por quem fez",
  fas: "Leitura dos fãs",
  minha: "Minha leitura",
}

/** One reading of what something means, with where it comes from. */
export function Reading({ seal, title, children }: { seal: Seal; title: ReactNode; children: ReactNode }) {
  return (
    <div className="max-w-[38rem]">
      <p className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-medium text-ink">{title}</span>
        <Badge tone={seal === "fas" || seal === "minha" ? "soft" : "klein"}>{SEALS[seal]}</Badge>
      </p>
      <div className="mt-2 space-y-3 text-[15px] leading-[1.7] text-ink">{children}</div>
    </div>
  )
}

/** Where a fact comes from, as a quiet link under it. */
export interface Source {
  label: string
  href?: string
}

/** A fact's sources, one or more, on a quiet line under it. */
export function SourceLine({ source }: { source: Source | Source[] }) {
  const sources = Array.isArray(source) ? source : [source]
  return (
    <p className="text-[13px] leading-[1.5] text-muted">
      {sources.map((each, index) => (
        <span key={index}>
          {index > 0 && " · "}
          {each.href ? (
            <a href={each.href} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-klein">
              {each.label}
            </a>
          ) : (
            each.label
          )}
        </span>
      ))}
    </p>
  )
}

/** Things worth knowing, one per row, each with its title and, when it has one, where it comes from. */
export function Facts({ items, className }: { items: { title: ReactNode; children: ReactNode; media?: ReactNode; source?: Source | Source[] }[]; className?: string }) {
  return (
    <ul className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item, index) => (
        <li key={index} className={cn("grid gap-x-6 gap-y-3 py-5", item.media && "sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]")}>
          <div className="min-w-0 max-w-[38rem] space-y-1">
            <h3 className="text-[15px] font-medium text-ink">{item.title}</h3>
            <div className="space-y-3 text-[15px] leading-[1.7] text-ink">{item.children}</div>
            {item.source && <SourceLine source={item.source} />}
          </div>
          {item.media && <div className="min-w-0">{item.media}</div>}
        </li>
      ))}
    </ul>
  )
}
