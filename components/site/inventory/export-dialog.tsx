"use client"

import { Download, Share2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button, buttonClass, Choice, Dialog, ErrorLine, Skeleton } from "@/components/site/ui"
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
  drawing: { pt: "Desenhando a imagem…", en: "Drawing the image…" },
  failed: { pt: "Não deu pra desenhar a imagem.", en: "Couldn't draw the image." },
  retry: { pt: "Tentar de novo", en: "Try again" },
  download: { pt: "Baixar", en: "Download" },
  share: { pt: "Compartilhar", en: "Share" },
})

/**
 * The loadout as one picture (lib/loadout-image.ts): a preview in either format, then download it or, where the
 * browser can (phones), hand it straight to an app.
 */
export function ExportDialog({ board, text, file, open, onClose }: { board: InventoryWeapon[]; text: ImageText; file: string; open: boolean; onClose: () => void }) {
  const [format, setFormat] = useState<Format>("retrato")
  const [drawn, setDrawn] = useState<{ key: string; url: string; blob: Blob } | { key: string; failed: true }>()
  const [attempt, setAttempt] = useState(0)
  const key = `${format}:${attempt}:${JSON.stringify(text)}:${board.map((w) => w.ideal?.variants[0].id ?? "").join()}`

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
      .catch(() => !gone && setDrawn({ key, failed: true }))
    return () => {
      gone = true
    }
    // The key holds everything drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key])

  const current = drawn?.key === key ? drawn : undefined
  const ready = current && "url" in current ? current : undefined
  const failed = !!current && "failed" in current
  const name = `${file}-${format}.png`
  const canShare = typeof navigator !== "undefined" && !!ready && navigator.canShare?.({ files: [new File([ready.blob], name, { type: "image/png" })] })
  const { width, height } = FORMATS[format]

  async function share() {
    if (!ready) return
    try {
      await navigator.share({ files: [new File([ready.blob], name, { type: "image/png" })], title: `${text.title} · ${text.who}` })
    } catch {}
  }

  return (
    <Dialog open={open} onClose={onClose} title={T.title} closeLabel={T.close} width={46} flush>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-5 py-3" role="group" aria-label={T.format}>
        {(Object.keys(FORMATS) as Format[]).map((each) => (
          <Choice key={each} size="sm" on={format === each} onClick={() => setFormat(each)}>
            {T[each]}
          </Choice>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-100 p-5">
        <div className="relative mx-auto flex max-h-[56dvh] max-w-full items-center justify-center" style={{ aspectRatio: `${width} / ${height}` }}>
          {ready ? (
            // The file as it is: a full rectangle, so it posts anywhere without corners to fill.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ready.url} alt={`${text.title} · ${text.who}`} className="max-h-[56dvh] max-w-full shadow-float" />
          ) : failed ? (
            <ErrorLine onRetry={() => setAttempt((n) => n + 1)} retryLabel={T.retry}>
              {T.failed}
            </ErrorLine>
          ) : (
            <>
              <Skeleton className="cut absolute inset-0" />
              <p role="status" className="relative text-[15px] text-muted">
                {T.drawing}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
        {canShare && (
          <Button variant="secondary" size="sm" onClick={share} icon={<Share2 aria-hidden className="h-4 w-4" />}>
            {T.share}
          </Button>
        )}
        <a href={ready?.url} download={name} aria-disabled={!ready} className={cn(buttonClass({ size: "sm" }), !ready && "pointer-events-none opacity-40")}>
          <Download aria-hidden className="h-4 w-4" />
          {T.download}
        </a>
      </div>
    </Dialog>
  )
}
