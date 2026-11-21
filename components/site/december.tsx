"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

/**
 * December on the site (2026-11-15, with the live's Christmas goal): snow falling behind the pages and settling at the
 * bottom, the live's Christmas lights under the header and a Santa hat on the mark, like the stand's. By São Paulo's calendar, read in the browser (the site is built ahead), so the first
 * paint never has it; ?natal shows it any day and ?natal=0 hides it.
 */
function isDecember() {
  const q = new URLSearchParams(location.search)
  if (q.get("natal") === "0") return false
  return q.has("natal") || new Date().toLocaleDateString("en-US", { timeZone: "America/Sao_Paulo", month: "numeric" }) === "12"
}
const never = () => () => {}
export const useDecember = () => useSyncExternalStore(never, isDecember, () => false)

/**
 * Snow behind the page: flakes near and far, swaying as they fall, that dodge the pointer and settle along the bottom
 * of the screen into a bank (Luan, 2026-11-21: "neve acumulando lá embaixo, uma interatividade do mouse"); the pointer
 * low enough digs into it. None of it for whoever asks for less motion.
 */
export function Snowfall() {
  const on = useDecember()
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext("2d")
    if (!on || !canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    const COL = 4
    let w = 0
    let h = 0
    // The bank: a height per 4 px column, up to a wavy cap so it never grows flat.
    let bank: number[] = []
    let cap: number[] = []
    const fit = () => {
      w = innerWidth
      h = innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.ceil(w / COL) + 1
      const seed = Math.random() * 100
      cap = Array.from({ length: n }, (_, i) => 26 + 9 * Math.sin(i * 0.045 + seed) + 5 * Math.sin(i * 0.13 + seed * 2))
      bank = Array.from({ length: n }, (_, i) => bank[i] ?? 4 + 3 * Math.sin(i * 0.09 + seed))
    }
    fit()
    addEventListener("resize", fit)
    const pointer = { x: -1e4, y: -1e4 }
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    const leave = () => {
      pointer.x = pointer.y = -1e4
    }
    addEventListener("pointermove", move, { passive: true })
    document.documentElement.addEventListener("pointerleave", leave)
    const flake = (anywhere: boolean) => {
      const z = Math.random() ** 1.5
      return { x: Math.random() * w, y: anywhere ? Math.random() * h : -6, vx: 0, z, r: 1 + z * 2.6, v: 14 + z * 38, f: Math.random() * 6.3, a: 0.45 + z * 0.5, s: 6 + Math.random() * 16 }
    }
    const flakes = Array.from({ length: Math.round(Math.min(90, (w * h) / 16000)) }, () => flake(true))
    // A white flake with a faint navy rim, drawn once: plain white all but vanishes on the site's pale blue.
    const sprite = document.createElement("canvas")
    sprite.width = sprite.height = 32
    const paint = sprite.getContext("2d")
    if (!paint) return
    const glow = paint.createRadialGradient(16, 16, 0, 16, 16, 16)
    glow.addColorStop(0, "rgba(255, 255, 255, 1)")
    glow.addColorStop(0.45, "rgba(255, 255, 255, 1)")
    glow.addColorStop(0.6, "rgba(0, 20, 71, 0.22)")
    glow.addColorStop(1, "rgba(0, 20, 71, 0)")
    paint.fillStyle = glow
    paint.fillRect(0, 0, 32, 32)
    const settle = (x: number, amount: number) => {
      const c = Math.round(x / COL)
      for (let k = -3; k <= 3; k++) {
        const i = c + k
        if (i < 0 || i >= bank.length) continue
        bank[i] = Math.min(cap[i], bank[i] + amount * Math.exp(-(k * k) / 4))
      }
    }
    let before = performance.now()
    let frame = requestAnimationFrame(function fall(now) {
      frame = requestAnimationFrame(fall)
      const dt = Math.min(0.1, (now - before) / 1000)
      before = now
      ctx.clearRect(0, 0, w, h)
      // The pointer pushes snow out of its way: flakes in the air, and the bank when it's down by the bottom.
      const R = 110
      for (const p of flakes) {
        const dx = p.x - pointer.x
        const dy = p.y - pointer.y
        const d = Math.hypot(dx, dy)
        if (d < R && d > 0.1) {
          const push = (1 - d / R) * 900 * dt
          p.vx += (dx / d) * push
          p.y += (dy / d) * push * 0.04
        }
        p.vx *= 1 - Math.min(1, 2.5 * dt)
        p.y += p.v * dt
        p.f += dt * (0.5 + p.z)
        p.x += (Math.sin(p.f) * p.s + p.vx) * dt
        const i = Math.round(p.x / COL)
        const ground = h - (bank[i] ?? 0)
        if (p.y >= ground) {
          if (i >= 0 && i < bank.length) settle(p.x, 2.2 + p.r * 1.6)
          Object.assign(p, flake(false))
        } else if (p.x < -10 || p.x > w + 10) Object.assign(p, flake(false))
        ctx.globalAlpha = p.a
        const dd = p.r * 2.2
        ctx.drawImage(sprite, p.x - dd, p.y - dd, dd * 2, dd * 2)
      }
      if (pointer.y > h - 60) {
        const c = Math.round(pointer.x / COL)
        for (let k = -6; k <= 6; k++) {
          const i = c + k
          if (i < 0 || i >= bank.length) continue
          const top = h - bank[i]
          if (pointer.y > top - 14) bank[i] = Math.max(0, bank[i] - (1 - Math.abs(k) / 7) * 60 * dt)
        }
      }
      // A little smoothing keeps the bank soft, as snow lies.
      for (let i = 1; i < bank.length - 1; i++) bank[i] += ((bank[i - 1] + bank[i + 1]) / 2 - bank[i]) * Math.min(1, 1.5 * dt)
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let i = 0; i < bank.length; i++) ctx.lineTo(i * COL, h - bank[i])
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = "rgba(244, 245, 247, 0.92)"
      ctx.fill()
      ctx.beginPath()
      for (let i = 0; i < bank.length; i++) ctx[i ? "lineTo" : "moveTo"](i * COL, h - bank[i])
      ctx.strokeStyle = "rgba(0, 20, 71, 0.16)"
      ctx.lineWidth = 1.2
      ctx.stroke()
    })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener("resize", fit)
      removeEventListener("pointermove", move)
      document.documentElement.removeEventListener("pointerleave", leave)
    }
  }, [on])
  if (!on) return null
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}

/** The live's Christmas bulbs (public/stream/stream.js, `acender`): the same five colours. */
const BULBS = ["#ff4d4d", "#ffd23f", "#3ddc97", "#85a7ff", "#ff9f43"]

/**
 * A string of Christmas lights hanging under the header, as the live hangs them round the camera: a wire in loops
 * across the screen, a bulb at each turn, three groups twinkling out of step (still under reduced motion).
 */
export function ChristmasLights() {
  const on = useDecember()
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!on) return
    const fit = () => setWidth(document.documentElement.clientWidth)
    fit()
    addEventListener("resize", fit)
    return () => removeEventListener("resize", fit)
  }, [on])
  if (!on || !width) return null
  const SPAN = 72
  const n = Math.ceil(width / SPAN) + 1
  const wire = Array.from({ length: n }, (_, i) => `${i ? "" : `M${-SPAN / 2} 1 `}Q${i * SPAN} 15 ${i * SPAN + SPAN / 2} 1`).join(" ")
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-8 w-full overflow-visible" viewBox={`0 0 ${width} 32`} preserveAspectRatio="none">
      <defs>
        {BULBS.map((c, i) => (
          <radialGradient key={c} id={`bulb-glow-${i}`}>
            <stop offset="0" stopColor={c} stopOpacity="0.6" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <path d={wire} fill="none" stroke="#0b1f4d" strokeWidth="1.2" />
      {Array.from({ length: n }, (_, i) => {
        const x = i * SPAN
        const c = i % BULBS.length
        return (
          <g key={i} className={cn("motion-safe:animate-[piscar_2.7s_ease-in-out_infinite]", ["", "[animation-delay:-0.9s]", "[animation-delay:-1.8s]"][i % 3])}>
            <circle cx={x} cy={16} r={14} fill={`url(#bulb-glow-${c})`} />
            <rect x={x - 2.5} y={7} width={5} height={4} fill="#0b1f4d" />
            <ellipse cx={x} cy={16.5} rx={4.6} ry={6.4} fill={BULBS[c]} stroke="#0b1f4d" strokeOpacity="0.35" strokeWidth="0.8" />
            <ellipse cx={x - 1.4} cy={14.2} rx={1.3} ry={2} fill="#fff" fillOpacity="0.75" />
          </g>
        )
      })}
    </svg>
  )
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
