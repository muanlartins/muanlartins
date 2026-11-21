"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/** The duel's engine and look (public/stream/duelo-motor.js and duelo-arte.js), once the page has loaded them. */
export interface DuelKit {
  Duelo: {
    criar(semente: number, a: string, b: string): { bolas: DuelBall[] }
  }
  Arte: {
    CONTORNO: string
    MATERIAIS: Record<string, { cor: string; luz: string; brilho?: true; rastro?: true; faiscas?: true; arco?: true }>
    arma(ctx: CanvasRenderingContext2D, bola: DuelBall, material: unknown, agora: number, parada: boolean): void
    padrao(ctx: CanvasRenderingContext2D, r: number, fan: { cor: string; detalhe: string; roupa: string }): void
  }
}
interface DuelBall {
  x: number
  y: number
  r: number
  comprimento: number
  angulo: number
  giro: number
  c: { arma?: { giro: number } }
}

/** The kit, or null while the scripts load. */
export function duelKit(): DuelKit | null {
  const w = window as unknown as { Duelo?: DuelKit["Duelo"]; DueloArte?: DuelKit["Arte"] }
  return w.Duelo && w.DueloArte ? { Duelo: w.Duelo, Arte: w.DueloArte } : null
}

/**
 * A class as the live draws it: a ball in the fan's colours and shirt with the class's weapon in a material, with the
 * duel's own drawing (duelo-arte.js). Still, it points up and to the right; `spin` turns it at the class's own speed
 * (slowed down), so the Adaga whirls and the Martelo lumbers.
 */
export function ClassArt({
  kit,
  classe,
  material = "bronze",
  fan,
  size = 72,
  spin = false,
  ring = "#85a7ff",
  className,
}: {
  kit: DuelKit | null
  classe: string
  material?: string
  fan: { cor: string; detalhe: string; roupa: string }
  size?: number
  spin?: boolean
  ring?: string
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { cor, detalhe, roupa } = fan

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !kit) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    canvas.width = canvas.height = Math.round(size * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const bola = kit.Duelo.criar(7, classe, classe).bolas[0]
    const m = kit.Arte.MATERIAIS[material] ?? kit.Arte.MATERIAIS.bronze
    // Units on the canvas: all round the ball when it turns, tighter when it holds still.
    const R = spin ? bola.r + bola.comprimento + 18 : 54
    const off = spin ? [0, 0] : [-17, 17]
    bola.x = off[0]
    bola.y = off[1]
    bola.angulo = -0.8
    bola.giro = 0
    const turns = Math.max(0.35, Math.min(1.2, (bola.c.arma?.giro ?? 0.6) * 0.55))
    const draw = (agora: number) => {
      const k = (canvas.width / 2) / R
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2)
      kit.Arte.arma(ctx, bola, m, agora, false)
      ctx.save()
      ctx.translate(bola.x, bola.y)
      ctx.beginPath()
      ctx.arc(0, 0, bola.r, 0, Math.PI * 2)
      ctx.fillStyle = cor
      ctx.fill()
      ctx.save()
      ctx.clip()
      kit.Arte.padrao(ctx, bola.r, { cor, detalhe, roupa })
      ctx.restore()
      ctx.lineWidth = 3.5
      ctx.strokeStyle = ring
      ctx.beginPath()
      ctx.arc(0, 0, bola.r - 1, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    if (!spin && !m.arco) {
      draw(0)
      return
    }
    let raf = 0
    let last = performance.now()
    const loop = (agora: number) => {
      if (spin) bola.angulo += turns * Math.PI * 2 * Math.min(0.05, (agora - last) / 1000)
      last = agora
      draw(agora)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [kit, classe, material, cor, detalhe, roupa, size, spin, ring])

  return <canvas ref={ref} aria-hidden className={cn("block", className)} style={{ width: size, height: size }} />
}
