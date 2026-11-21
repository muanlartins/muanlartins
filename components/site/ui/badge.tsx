import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** A badge (brand/interface.md, "Components"): square, small, uppercase. Klein filled, a soft tint, or a result's colour. */
export function Badge({ tone = "klein", className, children }: { tone?: "klein" | "soft" | "win" | "loss" | "ouro"; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium uppercase leading-none tracking-[0.08em]",
        tone === "klein" && "bg-klein text-paper",
        tone === "soft" && "bg-klein/10 text-klein",
        tone === "win" && "bg-win/12 text-win",
        tone === "loss" && "bg-loss/12 text-loss",
        tone === "ouro" && "bg-ouro text-navy",
        className,
      )}
    >
      {children}
    </span>
  )
}
