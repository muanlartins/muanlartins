"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

/**
 * December on the site (2026-11-15, with the live's Christmas goal): snow falling behind the pages and a Santa hat on
 * the mark, like the stand's. By São Paulo's calendar, read in the browser (the site is built ahead), so the first
 * paint never has it; ?natal shows it any day and ?natal=0 hides it.
 */
function isDecember() {
  const q = new URLSearchParams(location.search)
  if (q.get("natal") === "0") return false
  return q.has("natal") || new Date().toLocaleDateString("en-US", { timeZone: "America/Sao_Paulo", month: "numeric" }) === "12"
}
const never = () => () => {}
export const useDecember = () => useSyncExternalStore(never, isDecember, () => false)

/** Snow behind the page: a few flakes near and far, swaying as they fall; none for whoever asks for less motion. */
export function Snowfall() {
  const on = useDecember()
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!on || !canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    let w = 0
    let h = 0
    const fit = () => {
      w = innerWidth
      h = innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    addEventListener("resize", fit)
    const flake = (anywhere: boolean) => {
      const z = Math.random() ** 1.5
      return { x: Math.random() * w, y: anywhere ? Math.random() * h : -6, z, r: 1 + z * 2.6, v: 14 + z * 38, f: Math.random() * 6.3, a: 0.45 + z * 0.5, s: 6 + Math.random() * 16 }
    }
    const flakes = Array.from({ length: Math.round(Math.min(80, (w * h) / 18000)) }, () => flake(true))
    ctx.fillStyle = "#ffffff"
    let before = performance.now()
    let frame = requestAnimationFrame(function fall(now) {
      frame = requestAnimationFrame(fall)
      const dt = Math.min(0.1, (now - before) / 1000)
      before = now
      ctx.clearRect(0, 0, w, h)
      for (const p of flakes) {
        p.y += p.v * dt
        p.f += dt * (0.5 + p.z)
        p.x += Math.sin(p.f) * p.s * dt
        if (p.y > h + 6) Object.assign(p, flake(false))
        ctx.globalAlpha = p.a
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener("resize", fit)
    }
  }, [on])
  if (!on) return null
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}

/** The stand's Santa hat (public/stream/torcedor.js), drawn on its own: for the mark in the header. */
export function SantaHat({ className }: { className?: string }) {
  return (
    <svg viewBox="3.6 -9.2 21 13.2" aria-hidden className={cn("pointer-events-none", className)}>
      <g stroke="#001447" strokeWidth="0.8" strokeLinejoin="round">
        <path fill="#e03131" d="M6.4 1.6 C6.8 -3.6 10.6 -6.6 14.8 -6.9 C17.8 -7.1 20.4 -5.8 22 -3.9 L18 1.6 Z" />
        <path fill="#f4f5f7" d="M5.4 0.6 H18.6 A1.4 1.4 0 0 1 18.6 3.4 H5.4 A1.4 1.4 0 0 1 5.4 0.6 Z" />
        <circle fill="#f4f5f7" cx="22.2" cy="-3.6" r="2" />
      </g>
    </svg>
  )
}
