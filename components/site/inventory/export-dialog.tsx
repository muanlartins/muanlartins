"use client"

import { Download, Share2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { drawLoadout, FORMATS, type Format, type ImageText } from "@/lib/loadout-image"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import type { InventoryWeapon } from "@/lib/valorant-inventory"

const T = localize({
  title: { pt: "Exportar imagem", en: "Export image" },
  close: { pt: "Fechar", en: "Close" },
  format: { pt: "Formato", en: "Format" },
  retrato: { pt: "Retrato", en: "Portrait" },
  paisagem: { pt: "Paisagem", en: "Landscape" },
  drawing: { pt: "Desenhando…", en: "Drawing…" },
  failed: { pt: "Não deu pra desenhar a imagem. Tente de novo.", en: "Couldn't draw the image. Try again." },
  download: { pt: "Baixar", en: "Download" },
  share: { pt: "Compartilhar", en: "Share" },
})

/**
 * The loadout as one picture (lib/loadout-image.ts): a preview in either format, then download it or, where the
 * browser can (phones), hand it straight to an app.
 */
export function ExportDialog({ board, text, file, open, onClose }: { board: InventoryWeapon[]; text: ImageText; file: string; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [format, setFormat] = useState<Format>("retrato")
  const [drawn, setDrawn] = useState<{ key: string; url: string; blob: Blob } | "failed">()
  const key = `${format}:${JSON.stringify(text)}:${board.map((w) => w.ideal?.variants[0].id ?? "").join()}`

  useEffect(() => {
    const element = dialog.current
    if (open && !element?.open) element?.showModal()
    if (!open && element?.open) element.close()
  }, [open])

  // The picture on screen stays valid until the next one replaces it.
  const shownUrl = useRef<string>(undefined)
  useEffect(() => {
    if (!open) return
    let gone = false
    drawLoadout(board, text, format, getComputedStyle(document.body).fontFamily)
      .then((blob) => {
        if (gone) return
        if (shownUrl.current) URL.revokeObjectURL(shownUrl.current)
        const url = URL.createObjectURL(blob)
        shownUrl.current = url
        setDrawn({ key, url, blob })
      })
      .catch(() => !gone && setDrawn("failed"))
    return () => {
      gone = true
    }
    // The key holds everything drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key])

  const ready = drawn && drawn !== "failed" && drawn.key === key ? drawn : undefined
  const name = `${file}-${format}.png`
  const canShare = typeof navigator !== "undefined" && !!ready && navigator.canShare?.({ files: [new File([ready.blob], name, { type: "image/png" })] })

  async function share() {
    if (!ready) return
    try {
      await navigator.share({ files: [new File([ready.blob], name, { type: "image/png" })], title: `${text.title} · ${text.who}` })
    } catch {}
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-auto w-[min(46rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-md border border-line bg-paper p-0 text-ink backdrop:bg-navy/55 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[inventory-dialog_0.22s_ease-out]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h3 className="text-[15px] font-medium text-ink">{T.title}</h3>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label={T.format} className="flex rounded-md border border-line p-0.5">
            {(Object.keys(FORMATS) as Format[]).map((each) => (
              <button
                key={each}
                type="button"
                role="radio"
                aria-checked={format === each}
                onClick={() => setFormat(each)}
                className={cn(
                  "rounded-[4px] px-2.5 py-1 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-klein",
                  format === each ? "bg-klein text-paper" : "text-muted hover:text-ink",
                )}
              >
                {T[each]}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label={T.close} className="rounded-md p-1.5 text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-klein">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="bg-zinc-100 p-4 sm:p-5">
        <div className="relative mx-auto flex items-center justify-center" style={{ aspectRatio: `${FORMATS[format].width} / ${FORMATS[format].height}`, maxHeight: "60dvh" }}>
          {ready ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ready.url} alt={`${text.title} · ${text.who}`} className="max-h-[60dvh] max-w-full rounded-[4px] shadow-[0_12px_40px_rgba(0,20,71,0.25)]" />
          ) : (
            <p className="text-[14px] text-muted">{drawn === "failed" ? T.failed : T.drawing}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[14px] font-medium text-ink outline-none transition-colors hover:border-klein focus-visible:ring-2 focus-visible:ring-klein"
          >
            <Share2 aria-hidden className="h-4 w-4" />
            {T.share}
          </button>
        )}
        <a
          href={ready?.url}
          download={name}
          aria-disabled={!ready}
          className={cn(
            "flex items-center gap-1.5 rounded-md bg-klein px-4 py-1.5 text-[14px] font-medium text-paper outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-klein focus-visible:ring-offset-2",
            ready ? "hover:opacity-90" : "pointer-events-none opacity-50",
          )}
        >
          <Download aria-hidden className="h-4 w-4" />
          {T.download}
        </a>
      </div>
    </dialog>
  )
}
