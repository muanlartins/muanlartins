import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * An explanation folded away (brand/voz.md, "Tone": "put it behind a 'Como funciona' the reader opens"): a quiet
 * summary line that opens what's under it.
 */
export function Fold({ summary = "Como funciona", children, className }: { summary?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={cn("group", className)}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-klein underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 max-w-[38rem] text-[15px] leading-[1.6] text-muted">{children}</div>
    </details>
  )
}
