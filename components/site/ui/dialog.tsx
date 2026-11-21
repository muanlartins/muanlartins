"use client"

import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A dialog (brand/interface.md, "Components"): the native <dialog> with showModal, so Escape and focus come free;
 * cut like a panel, 16 px from the edges on phones, closed by its button, Escape or a click outside. What's inside is
 * only drawn while it's open, so a player in it stops when it closes.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  closeLabel = "Fechar",
  className,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  closeLabel?: string
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "cut m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto border-0 bg-paper p-0 text-ink backdrop:bg-navy/60 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[inventory-dialog_0.22s_ease-out]",
        className,
      )}
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={id} className="min-w-0 text-xl font-medium tracking-[-0.02em] text-klein">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} className="cut-sm -mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center text-muted transition-colors hover:bg-klein/10 hover:text-klein">
              <X aria-hidden className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
