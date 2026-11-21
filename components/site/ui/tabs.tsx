"use client"

import { useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Tabs that switch between views of one page (brand/interface.md, "Components"): an underlined row, arrow keys move
 * between them, each says which panel it controls. Filters that narrow a list are chips with `aria-pressed` instead.
 */
export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  idPrefix = "tab",
  className,
}: {
  label: string
  items: { id: T; label: ReactNode; count?: number }[]
  value: T
  onChange: (id: T) => void
  idPrefix?: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (from: number, step: number) => {
    const next = (from + step + items.length) % items.length
    onChange(items[next].id)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none]", className)}>
      {items.map((item, i) => {
        const on = item.id === value
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-${item.id}`}
            aria-selected={on}
            aria-controls={`${idPrefix}-${item.id}-panel`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(i, 1)
              else if (e.key === "ArrowLeft") move(i, -1)
            }}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 pb-2.5 text-[15px] font-medium transition-colors focus-visible:outline-offset-4",
              on ? "border-klein text-klein" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {item.label}
            {item.count != null && <span className={cn("px-1.5 py-0.5 text-[12px] tabular-nums leading-none", on ? "bg-klein text-paper" : "bg-klein/10 text-klein")}>{item.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** The panel a tab controls. */
export function TabPanel({ idPrefix = "tab", id, children, className }: { idPrefix?: string; id: string; children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-${id}-panel`} aria-labelledby={`${idPrefix}-${id}`} className={className}>
      {children}
    </div>
  )
}
