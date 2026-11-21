"use client"

import Link from "next/link"
import Script from "next/script"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ViewerCard } from "@/components/site/viewer/viewer-card"
import type { Sigma, Torcedor } from "@/lib/profile"
import { cn } from "@/lib/utils"
import { isLogin, loadLook, loadPerson, viewerPath, type Look, type Person } from "@/lib/viewer"

const CARD_WIDTH = 300

/**
 * A viewer's name, wherever the site shows one: it leads to their page (/torcedor/<login>), and with a mouse, resting on
 * it opens their card in a small window, Discord-style. On a phone a tap just opens the page.
 */
export function ViewerName({ login, children, className }: { login: string; children?: ReactNode; className?: string }) {
  const key = login.toLowerCase()
  const [open, setOpen] = useState(false)
  const [look, setLook] = useState<Look | null | undefined>(undefined)
  const [person, setPerson] = useState<Person | null | undefined>(undefined)
  const [loadedT, setT] = useState<Torcedor | null>(null)
  const [loadedS, setS] = useState<Sigma | null>(null)
  // Once open (in the browser), whatever another part of the page already loaded.
  const T = loadedT ?? (open ? (window.Torcedor ?? null) : null)
  const S = loadedS ?? (open ? (window.Sigma ?? null) : null)
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const anchor = useRef<HTMLSpanElement>(null)

  useEffect(() => () => clearTimeout(timer.current), [])
  // The card is drawn over the page (a portal, so no box clips it); scrolling away closes it.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const escape = (e: KeyboardEvent) => e.key === "Escape" && close()
    addEventListener("scroll", close, { passive: true, once: true })
    addEventListener("keydown", escape)
    return () => {
      removeEventListener("scroll", close)
      removeEventListener("keydown", escape)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    loadLook(key).then(setLook)
    loadPerson(key).then(setPerson)
  }, [open, key])

  if (!isLogin(key)) return <span className={className}>{children ?? login}</span>

  const show = (now = false) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(
      () => {
        const box = anchor.current?.getBoundingClientRect()
        if (!box) return
        const left = Math.max(8, Math.min(box.left, innerWidth - CARD_WIDTH - 8))
        // Room under the name for the card, or it opens above.
        setPlace(innerHeight - box.bottom > 380 ? { left, top: box.bottom } : { left, bottom: innerHeight - box.top })
        setOpen(true)
      },
      now ? 0 : 350,
    )
  }
  const hide = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 180)
  }

  return (
    <span
      ref={anchor}
      className="relative inline-block max-w-full align-baseline"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
      onFocus={() => show(true)}
      onBlur={hide}
    >
      <Link href={viewerPath(key)} className={cn("hover:underline hover:underline-offset-2", className)}>
        {children ?? login}
      </Link>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-label={key}
            // The card is cut at 45°, which would clip a box shadow: the shadow follows its shape from out here.
            className={cn("fixed z-50 drop-shadow-[0_14px_22px_rgba(0,20,71,0.38)]", place.top !== undefined ? "pt-2" : "pb-2")}
            style={{ left: place.left, top: place.top, bottom: place.bottom, width: CARD_WIDTH }}
            onPointerEnter={() => clearTimeout(timer.current)}
            onPointerLeave={hide}
          >
            {/* The same drawing as the stand's; React hoists the stylesheet into the head, and each script loads once. */}
            {/* eslint-disable-next-line @next/next/no-css-tags */}
            <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
            {!T && <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />}
            {!S && <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />}
            <ViewerCard login={key} look={look} stats={person?.stats} primeira={person?.primeira} T={T} S={S} size="pop" />
          </div>,
          document.body,
        )}
    </span>
  )
}
