"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/** The race's look (public/stream/bolinha.js), once the page has loaded it. */
export interface MarbleKit {
  textura(canvas: HTMLCanvasElement, fan: Record<string, unknown>): HTMLCanvasElement
  acabamento(rankId: string): { brilho?: true; rastro?: true; faiscas?: true; arco?: true }
}

export const marbleKit = () => (window as unknown as { Bolinha?: MarbleKit }).Bolinha ?? null

/** A marble's skin as a picture, for a dot in a list (the texture wrapped flat, shaded round). */
export function marbleSkin(kit: MarbleKit | null, fan: Record<string, unknown>): string | null {
  if (!kit) return null
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 64
  return kit.textura(canvas, fan).toDataURL()
}

/** A marble in a line of text: its skin in a circle, lit from the top left like glass. */
export function MarbleDot({ skin, size = 18, className }: { skin: string | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full bg-klein/30", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: skin ? `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.75), rgb(255 255 255 / 0) 34%), radial-gradient(circle at 50% 50%, rgb(0 0 0 / 0) 55%, rgb(0 10 40 / 0.45)), url(${skin})` : undefined,
        backgroundSize: skin ? `auto, auto, ${size * 2}px ${size}px` : undefined,
        backgroundPosition: "center",
      }}
    />
  )
}

/**
 * A viewer's marble in 3D, turning slowly, as the race draws it: their fan's skin (bolinha.js) on a glassy sphere, with
 * the glow their Σ rank unlocks. three.js straight, one small canvas, drawn only while on screen.
 */
export function Marble({ kit, fan, rankId, size = 160, className }: { kit: MarbleKit | null; fan: Record<string, unknown>; rankId?: string; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(fan)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !kit) return
    let stop = false
    let raf = 0
    let dispose = () => {}
    import("three").then((THREE) => {
      if (stop) return
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1))
      renderer.setSize(size, size, false)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
      camera.position.set(0, 0.35, 4.1)
      camera.lookAt(0, 0, 0)
      scene.add(new THREE.HemisphereLight(0xdbe6ff, 0x0a1a5c, 1.3))
      const sol = new THREE.DirectionalLight(0xffffff, 2)
      sol.position.set(-2, 3, 3)
      scene.add(sol)
      const tela = document.createElement("canvas")
      tela.width = 512
      tela.height = 256
      kit.textura(tela, JSON.parse(key))
      const map = new THREE.CanvasTexture(tela)
      map.colorSpace = THREE.SRGBColorSpace
      const fim = rankId ? kit.acabamento(rankId) : {}
      const material = new THREE.MeshPhysicalMaterial({ map, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 })
      if (fim.brilho) {
        material.emissive = new THREE.Color(String((JSON.parse(key) as { cor?: string }).cor ?? "#85a7ff"))
        material.emissiveIntensity = 0.35
      }
      const bola = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material)
      bola.rotation.z = 0.25
      scene.add(bola)
      let visivel = true
      const olho = new IntersectionObserver(([e]) => (visivel = e.isIntersecting))
      olho.observe(canvas)
      const loop = (agora: number) => {
        raf = requestAnimationFrame(loop)
        if (!visivel) return
        bola.rotation.y = agora / 2200
        if (fim.arco) material.emissive.setHSL((agora / 3000) % 1, 0.9, 0.5)
        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(loop)
      dispose = () => {
        olho.disconnect()
        map.dispose()
        material.dispose()
        renderer.dispose()
      }
    })
    return () => {
      stop = true
      cancelAnimationFrame(raf)
      dispose()
    }
  }, [kit, key, rankId, size])

  return <canvas ref={ref} aria-hidden className={cn("block", className)} style={{ width: size, height: size }} />
}
