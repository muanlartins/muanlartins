import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The states every fetched piece of data has (brand/interface.md, "States"): a skeleton shaped like what's coming, an
 * empty box that says what will fill it, and an error that says what failed with a way to try again.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block bg-zinc-200/80 motion-safe:animate-pulse", className)} />
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-dashed border-line-strong px-5 py-6 text-[15px] leading-[1.6] text-muted", className)}>{children}</div>
}

export function ErrorLine({ children, onRetry, retryLabel = "Tentar de novo", className }: { children: ReactNode; onRetry?: () => void; retryLabel?: string; className?: string }) {
  return (
    <p role="alert" className={cn("text-[15px] text-loss", className)}>
      {children}
      {onRetry && (
        <>
          {" "}
          <button type="button" onClick={onRetry} className="font-medium underline underline-offset-4">
            {retryLabel}
          </button>
        </>
      )}
    </p>
  )
}
