import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The site's buttons (brand/interface.md, "Components"): primary (Klein), secondary (an edge that turns Klein) and
 * quiet (a text link), in two sizes, cut at 45° like everything framed on the site. Use `buttonClass` on anything that
 * should look like one (a Link, an <a>, a <label> for a file input); `Button` and `ButtonLink` for the usual cases.
 */
export type ButtonVariant = "primary" | "secondary" | "quiet"
export type ButtonSize = "md" | "sm"

export function buttonClass({ variant = "primary", size = "md", full = false }: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean } = {}) {
  if (variant === "quiet") {
    return cn(
      "inline-flex items-center gap-1.5 font-medium text-klein underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-40",
      size === "md" ? "text-[15px]" : "text-[14px]",
    )
  }
  return cn(
    "cut-sm relative inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
    size === "md" ? "px-4 py-2 text-[15px]" : "px-3 py-1.5 text-[14px]",
    variant === "primary" ? "bg-klein text-paper hover:bg-navy" : "cut-edge border border-line-strong bg-paper/60 text-ink hover:border-klein hover:text-klein",
    full && "w-full",
  )
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; icon?: ReactNode }

export function Button({ variant, size, full, icon, className, children, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={cn(buttonClass({ variant, size, full }), className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}

/** A link that looks like a button; `external` opens elsewhere in a new tab. */
export function ButtonLink({ variant, size, full, icon, className, children, href, external, ...rest }: Common & ComponentProps<typeof Link> & { href: string; external?: boolean }) {
  const cls = cn(buttonClass({ variant, size, full }), className)
  if (external || href.startsWith("http")) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer" {...(rest as ComponentProps<"a">)}>
        {icon}
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
