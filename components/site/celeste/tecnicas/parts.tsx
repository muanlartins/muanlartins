import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A technique page's pieces, on top of the documentation pages' (components/site/docs). */

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

/** A second of the game, 60 frames, with a stretch lit: how big a window is next to the whole. */
export function Second({ lit, label, className }: { lit: [from: number, to: number]; label: ReactNode; className?: string }) {
  return (
    <figure className={cn("space-y-2", className)}>
      <div role="img" aria-label={typeof label === "string" ? label : undefined} className="grid h-9 grid-cols-[repeat(60,minmax(0,1fr))] gap-px">
        {Array.from({ length: 60 }, (_, frame) => (
          <span key={frame} className={frame >= lit[0] && frame <= lit[1] ? "bg-klein" : "bg-klein/15"} />
        ))}
      </div>
      <figcaption className="text-[13px] text-muted">{label}</figcaption>
    </figure>
  )
}
