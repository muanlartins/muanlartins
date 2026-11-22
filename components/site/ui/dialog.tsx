"use client"

import { X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A dialog (brand/interface.md, "Components"): the native <dialog> opened with showModal, so Escape and focus come
 * free; cut at 45° like a card, a 16 px gutter on phones, the `inventory-dialog` entrance; its button, Escape or a click
 * on the backdrop close it. What's inside is drawn only while it's open, so a player in it stops when it closes.
 * `width` is its widest, in rem. `flush` drops the body's padding and its scrolling for content that lays itself out
 * (a picture edge to edge, a list that scrolls under a fixed search).
 */
export function Dialog({
  open,
  onClose,
  title,
  closeLabel = "Fechar",
  width = 36,
  flush = false,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  closeLabel?: string
  width?: number
  flush?: boolean
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const element = ref.current
    if (open && !element?.open) element?.showModal()
    if (!open && element?.open) element.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      style={{ width: `min(${width}rem, calc(100vw - 2rem))` }}
      className="m-auto max-h-[calc(100dvh-2rem)] overflow-visible bg-transparent p-0 text-ink backdrop:bg-navy/55 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[inventory-dialog_0.22s_ease-out]"
    >
      {open && (
        // The cut clips a box shadow: the shadow follows the shape from this wrapper.
        <div className="drop-shadow-[0_8px_24px_rgb(0_20_71/0.16)]">
          <div className={cn("cut max-h-[calc(100dvh-2rem)] bg-paper", flush ? "flex flex-col overflow-hidden" : "overflow-y-auto", className)}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
              <h2 id={id} className="min-w-0 text-[17px] font-medium tracking-[-0.01em] text-klein">
                {title}
              </h2>
              <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} className="cut-sm grid h-8 w-8 shrink-0 place-items-center text-muted transition-colors hover:bg-klein/10 hover:text-klein">
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
            {flush ? children : <div className="p-5">{children}</div>}
          </div>
        </div>
      )}
    </dialog>
  )
}
