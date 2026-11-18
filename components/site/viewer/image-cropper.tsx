"use client"

import { Minus, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { profile } from "@/content/profile"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import type { ImageKind } from "@/lib/viewer"
import type { Crop } from "@/lib/viewer-images"

const text = localize(profile.card)
// The frame on screen: the banner 3:1, the photo a circle.
const FRAME = { banner: { width: 540, height: 180 }, foto: { width: 260, height: 260 } }

/**
 * Framing a picture before it's sent: drag it, zoom it, see it as the card will (the banner's 3:1, the photo's circle).
 * `onDone` gets the part kept, in the picture's own pixels.
 */
export function ImageCropper({ image, kind, onCancel, onDone, busy }: { image: HTMLImageElement; kind: ImageKind; onCancel: () => void; onDone: (crop: Crop) => void; busy: boolean }) {
  const frame = FRAME[kind]
  const [width, setWidth] = useState<number>(frame.width)
  const box = useRef<HTMLDivElement>(null)
  // The frame shrinks on a phone; the maths works in the frame's own pixels.
  useEffect(() => {
    const measure = () => setWidth(Math.min(frame.width, (box.current?.parentElement?.clientWidth ?? frame.width) - 2))
    measure()
    addEventListener("resize", measure)
    return () => removeEventListener("resize", measure)
  }, [frame.width])
  const height = (width * frame.height) / frame.width
  const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const [zoom, setZoom] = useState(1)
  const [at, setAt] = useState({ x: 0.5, y: 0.5 })
  const drag = useRef<{ x: number; y: number; at: { x: number; y: number } } | null>(null)

  const scale = cover * zoom
  const shownW = image.naturalWidth * scale
  const shownH = image.naturalHeight * scale
  // at: the picture's point at the frame's centre, as a fraction of it, kept where the picture still covers the frame.
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    const w = image.naturalWidth * cover * z
    const h = image.naturalHeight * cover * z
    const mx = width / 2 / w
    const my = height / 2 / h
    return { x: Math.min(1 - mx, Math.max(mx, p.x)), y: Math.min(1 - my, Math.max(my, p.y)) }
  }
  const spot = clamp(at)
  const left = width / 2 - spot.x * shownW
  const top = height / 2 - spot.y * shownH

  const done = () =>
    onDone({ x: -left / scale, y: -top / scale, width: width / scale, height: height / scale })
  const zoomTo = (z: number) => {
    const next = Math.min(4, Math.max(1, z))
    setZoom(next)
    setAt((p) => clamp(p, next))
  }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-[600px] space-y-4 rounded-xl bg-paper p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-[15px] font-medium text-ink">{kind === "banner" ? text.cropBanner : text.cropPhoto}</p>
        <div className="flex justify-center">
          <div
            ref={box}
            className={cn("relative cursor-grab touch-none overflow-hidden bg-navy select-none active:cursor-grabbing", kind === "foto" ? "rounded-full" : "rounded-md")}
            style={{ width, height }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = { x: e.clientX, y: e.clientY, at: spot }
            }}
            onPointerMove={(e) => {
              const d = drag.current
              if (!d) return
              setAt(clamp({ x: d.at.x - (e.clientX - d.x) / shownW, y: d.at.y - (e.clientY - d.y) / shownH }))
            }}
            onPointerUp={() => (drag.current = null)}
            onWheel={(e) => zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left, top, width: shownW, height: shownH }} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" aria-label={text.zoomOut} onClick={() => zoomTo(zoom / 1.2)} className="text-muted hover:text-klein">
            <Minus className="h-4 w-4" />
          </button>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => zoomTo(Number(e.target.value))} className="flex-1 accent-klein" aria-label={text.zoom} />
          <button type="button" aria-label={text.zoomIn} onClick={() => zoomTo(zoom * 1.2)} className="text-muted hover:text-klein">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[12px] text-muted">{text.cropHint}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-[14px] text-muted hover:text-klein">
            {text.cancel}
          </button>
          <button type="button" onClick={done} disabled={busy} className="rounded-md bg-klein px-5 py-2 text-[14px] font-medium text-paper hover:opacity-90 disabled:opacity-50">
            {busy ? text.sending : text.usePicture}
          </button>
        </div>
      </div>
    </div>
  )
}
