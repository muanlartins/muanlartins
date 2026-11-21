import Link from "next/link"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * A card (brand/interface.md, "Components"): the light edge, Branco at 70% over the ground, cut at 45° on two corners,
 * 20 px inside. `CardLink` is a whole card that links, its edge turning Klein on hover.
 */
export const cardClass = "cut cut-edge relative border border-line bg-paper/70"

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn(cardClass, "p-5", className)} {...rest} />
}

export function CardLink({ className, href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const cls = cn(cardClass, "block p-5 transition-colors hover:border-klein", className)
  if (href.startsWith("http")) return <a href={href} className={cls} target="_blank" rel="noreferrer" {...(rest as ComponentProps<"a">)} />
  return <Link href={href} className={cls} {...rest} />
}
