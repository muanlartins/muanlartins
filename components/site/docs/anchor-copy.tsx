"use client"

import { Check, Link2 } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { DOCS } from "./labels"

/** Copies the link to a section (the page's address with its anchor) and says so for a moment. */
export function AnchorCopy({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    const url = `${location.origin}${location.pathname}#${id}`
    history.replaceState(null, "", `#${id}`)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Without the clipboard, the address bar already has the link.
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-live="polite" className={cn("text-[13px] text-klein transition-opacity", copied ? "opacity-100" : "opacity-0")}>
        {copied ? DOCS.copied : ""}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={DOCS.copyLink.replace("{title}", title)}
        title={DOCS.copyLink.replace("{title}", title)}
        className="inline-flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-klein"
      >
        {copied ? <Check aria-hidden className="h-4 w-4" /> : <Link2 aria-hidden className="h-4 w-4" />}
      </button>
    </span>
  )
}
