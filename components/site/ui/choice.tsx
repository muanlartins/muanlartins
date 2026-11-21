import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * One option among a few, picked in place (brand/interface.md, "Components"): a form's choices, like the kind of Pix,
 * its amount or when it shows. Cut like a button, filled Klein when it's the one picked (`aria-pressed`). `size="sm"`
 * for a long row of small options.
 */
export function Choice({ on, icon, size = "md", className, children, ...rest }: ComponentProps<"button"> & { on: boolean; icon?: ReactNode; size?: "md" | "sm" }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "cut-sm cut-edge relative inline-flex items-center justify-center gap-2 border font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        size === "md" ? "min-h-10 px-3 py-2 text-[15px]" : "min-h-8 px-2.5 py-1 text-[14px]",
        on ? "border-klein bg-klein text-paper" : "border-line-strong bg-paper/60 text-ink hover:border-klein hover:text-klein",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

/**
 * A group of controls under one label (a row of choices, and the field that goes with them): a fieldset whose legend
 * looks like a field's label, with the same hint and error under it.
 */
export function Choices({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("min-w-0 space-y-2", className)}>
      <legend className="mb-2 text-[13px] font-medium text-muted">{label}</legend>
      {children}
      {hint && !error && <p className="text-[13px] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-[13px] text-loss">
          {error}
        </p>
      )}
    </fieldset>
  )
}
