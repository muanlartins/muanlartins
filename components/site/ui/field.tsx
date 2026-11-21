import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Form fields (brand/interface.md, "Components"): one look for text, long text and choices. The box carries the edge,
 * the cut and the focus (an inset ring the cut can't clip); what's typed in sits inside it with no edge of its own.
 * Text is 16 px on phones so the browser doesn't zoom on focus.
 */
const box = "cut-sm cut-edge relative flex border border-line-strong bg-paper/80 transition-colors focus-within:border-klein focus-within:outline-2 focus-within:-outline-offset-4 focus-within:outline-klein"
const inner = "w-full min-w-0 bg-transparent px-3 py-2 text-[16px] text-ink outline-none placeholder:text-muted sm:text-[15px]"

export function Input({ className, boxClassName, ...rest }: ComponentProps<"input"> & { boxClassName?: string }) {
  return (
    <span className={cn(box, boxClassName)}>
      <input className={cn(inner, className)} {...rest} />
    </span>
  )
}

export function Textarea({ className, boxClassName, ...rest }: ComponentProps<"textarea"> & { boxClassName?: string }) {
  return (
    <span className={cn(box, boxClassName)}>
      <textarea className={cn(inner, "resize-y", className)} {...rest} />
    </span>
  )
}

export function Select({ className, boxClassName, ...rest }: ComponentProps<"select"> & { boxClassName?: string }) {
  return (
    <span className={cn(box, boxClassName)}>
      <select className={cn(inner, "appearance-none pr-8", className)} {...rest} />
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">▾</span>
    </span>
  )
}

/** A field with its label above, an optional hint and its error under it. */
export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && !error && <span className="block text-[13px] text-muted">{hint}</span>}
      {error && <span className="block text-[13px] text-loss">{error}</span>}
    </label>
  )
}
