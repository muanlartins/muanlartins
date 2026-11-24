import type { ReactNode } from "react"
import { Badge } from "@/components/site/ui"
import { cn } from "@/lib/utils"

/**
 * The pieces of the site's reference pages on a game's world, on top of the documentation pages' (components/site/docs):
 * Celeste's technique and story pages and Valorant's Universo share them, so they read the same.
 */
/** Paragraphs at the reading measure. */
export function Text({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-w-[38rem] space-y-4 text-[15px] leading-[1.7] text-ink", className)}>{children}</div>
}

/**
 * A picture with its caption and its maker's credit. `pixel` keeps a game's pixels square. Someone else's picture is
 * shown only when the build has it (lib/celeste-demos.ts, `outsidePicture`): pass `src` undefined and it's left out.
 */
export function Picture({
  src,
  alt,
  width,
  height,
  credit,
  href,
  pixel = false,
  children,
  className,
}: {
  src?: string
  alt: string
  width: number
  height: number
  credit?: string
  href?: string
  pixel?: boolean
  children?: ReactNode
  className?: string
}) {
  if (!src) return null
  return (
    <figure className={cn("min-w-0 space-y-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, small pictures sized here */}
      <img src={src} alt={alt} width={width} height={height} loading="lazy" className={cn("cut block h-auto w-full", pixel && "[image-rendering:pixelated]")} />
      {(children || credit) && (
        <figcaption className="text-[13px] leading-[1.5] text-muted">
          {children}
          {children && credit && " "}
          {credit && (href ? <a href={href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-klein hover:underline">{credit}</a> : credit)}
        </figcaption>
      )}
    </figure>
  )
}

/** A picture beside its text, stacked on phones. Without the picture (someone else's this build lacks), just the text. */
export function Beside({ media, children, flip = false }: { media: ReactNode; children: ReactNode; flip?: boolean }) {
  if (!media) return <>{children}</>
  return (
    <div className="grid items-center gap-x-8 gap-y-5 sm:grid-cols-2">
      <div className={cn("min-w-0", flip && "sm:order-last")}>{media}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** A few numbers, big, each with what it is. */
export function Figures({ items, className }: { items: { label: ReactNode; value: ReactNode; note?: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-6", items.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3", className)}>
      {items.map((item, index) => (
        <div key={index} className="min-w-0">
          <dt className="eyebrow text-muted">{item.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] text-klein">{item.value}</dd>
          {item.note && <dd className="mt-1 text-[13px] leading-[1.5] text-muted">{item.note}</dd>}
        </div>
      ))}
    </dl>
  )
}

/** What a developer or a game said, in Portuguese, with the original beside it. */
export function Quote({ children, original, by, href }: { children: ReactNode; original?: string; by: string; href?: string }) {
  return (
    <figure className="cut max-w-[38rem] space-y-2 bg-navy p-5 text-paper">
      <blockquote className="text-[17px] leading-[1.6]">“{children}”</blockquote>
      {original && (
        <p lang="en" className="text-[13px] leading-[1.5] text-klein-claro">
          “{original}”
        </p>
      )}
      <figcaption className="text-[13px] text-klein-claro">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-paper focus-visible:outline-paper">
            {by}
          </a>
        ) : (
          by
        )}
      </figcaption>
    </figure>
  )
}

/** Moments in order, each a year (or a label) with what happened. */
export function Milestones({ items }: { items: { when: string; title: ReactNode; children: ReactNode; media?: ReactNode }[] }) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {items.map((item, index) => (
        <li key={index} className={cn("grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[6rem_minmax(0,1fr)]", item.media && "sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,14rem)]")}>
          <p className="text-xl font-semibold tabular-nums tracking-[-0.02em] text-klein">{item.when}</p>
          <div className="min-w-0 space-y-1">
            <h3 className="text-[15px] font-medium text-ink">{item.title}</h3>
            <div className="max-w-[38rem] text-[15px] leading-[1.6] text-ink">{item.children}</div>
          </div>
          {item.media && <div className="min-w-0">{item.media}</div>}
        </li>
      ))}
    </ol>
  )
}

/**
 * Lines of the game, as the game's own Brazilian translation has them, each with its English original under it: who
 * says it, then the line. `n` keeps the line's key in the game's files beside each one in the code (Celeste's
 * Content/Dialog), never on the page; `aside` sits by who says it (Valorant's lines: buttons that play them).
 */
export function Dialogue({ lines, className }: { lines: { who: string; pt: ReactNode; en: string; n?: string; aside?: ReactNode }[]; className?: string }) {
  return (
    <ol className={cn("max-w-[38rem] space-y-4 border-l-2 border-klein pl-4", className)}>
      {lines.map((line, index) => (
        <li key={index}>
          {line.aside ? (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <p className="eyebrow text-muted">{line.who}</p>
              {line.aside}
            </div>
          ) : (
            <p className="eyebrow text-muted">{line.who}</p>
          )}
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
