"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { bola, type Quem } from "@/components/site/fan/estudio"
import { cn } from "@/lib/utils"

/** The minigames' ball (public/stream/bolinha.js), once the page has loaded it. */
export interface MarbleKit {
  textura(canvas: HTMLCanvasElement, fan: Record<string, unknown>): HTMLCanvasElement
  disco(mapa: HTMLCanvasElement, px?: number): HTMLCanvasElement
  acabamento(rankId: string): { brilho?: true; rastro?: true; faiscas?: true; arco?: true }
}

export const marbleKit = () => (window as unknown as { Bolinha?: MarbleKit }).Bolinha ?? null

/**
 * Someone's ball as the live draws it since 2026-11-26: their fan's head made round (estudio.ts's bola), as a sphere's
 * map; null until it's baked, or with nobody to draw (then the shirt, kit.textura, stands in).
 */
export function useMarbleMap(who: Quem | null | undefined, altura = 128): HTMLCanvasElement | null {
  const key = who ? JSON.stringify(who) : ""
  const [map, setMap] = useState<{ key: string; canvas: HTMLCanvasElement | null } | null>(null)
  useEffect(() => {
    if (!key) return
    let stop = false
    bola(JSON.parse(key) as Quem, altura).then((canvas) => !stop && setMap({ key, canvas }))
    return () => {
      stop = true
    }
  }, [key, altura])
  return map?.key === key ? map.canvas : null
}

/** A marble's skin as a picture, for a dot in a list (the shirt wrapped flat, shaded round). */
export function marbleSkin(kit: MarbleKit | null, fan: Record<string, unknown>): string | null {
  if (!kit) return null
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 64
  return kit.textura(canvas, fan).toDataURL()
}

/**
 * A marble in a line of text: their head seen from the front (bolinha.js's disco) once it's baked, the shirt's skin in
 * a circle, lit from the top left like glass, until then.
 */
export function MarbleDot({ skin, who, kit, size = 18, className }: { skin: string | null; who?: Quem | null; kit?: MarbleKit | null; size?: number; className?: string }) {
  const map = useMarbleMap(who, 64)
  const face = useMemo(() => {
    const disco = kit?.disco ?? marbleKit()?.disco
    return map && disco ? disco(map, Math.round(size * 2)).toDataURL() : null
  }, [map, kit, size])
  const image = face ? `url(${face})` : skin ? `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.75), rgb(255 255 255 / 0) 34%), radial-gradient(circle at 50% 50%, rgb(0 0 0 / 0) 55%, rgb(0 10 40 / 0.45)), url(${skin})` : undefined
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full bg-klein/30", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: image,
        backgroundSize: face ? "cover" : skin ? `auto, auto, ${size * 2}px ${size}px` : undefined,
        backgroundPosition: "center",
      }}
    />
  )
}

/**
 * A viewer's marble in 3D, as the race draws it: their fan's head made round (useMarbleMap) on a sphere, rocking with
 * its face to you, with the glow their Σ rank unlocks; the shirt (bolinha.js) until the head is baked, turning slowly.
 * three.js straight, one small canvas, drawn only while on screen.
 */
export function Marble({
  kit,
  fan,
  who,
  rankId,
  size = 160,
  className,
}: {
  kit: MarbleKit | null
  fan: Record<string, unknown>
  who?: Quem | null
  rankId?: string
  size?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(fan)
  const map = useMarbleMap(who, 256)

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
      let tela = map
      if (!tela) {
        tela = document.createElement("canvas")
        tela.width = 512
        tela.height = 256
        kit.textura(tela, JSON.parse(key))
      }
      const texture = new THREE.CanvasTexture(tela)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 4
      const fim = rankId ? kit.acabamento(rankId) : {}
      const material = new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.4, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.2 })
      if (fim.brilho) {
        material.emissive = new THREE.Color(String((JSON.parse(key) as { cor?: string }).cor ?? "#85a7ff"))
        material.emissiveIntensity = 0.35
      }
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material)
      scene.add(ball)
      let visivel = true
      const olho = new IntersectionObserver(([e]) => (visivel = e.isIntersecting))
      olho.observe(canvas)
      const loop = (agora: number) => {
        raf = requestAnimationFrame(loop)
        if (!visivel) return
        if (map) {
          // The face (+z: the map's quarter) to you, looking around a little.
          ball.rotation.set(Math.sin(agora / 1700) * 0.12, Math.sin(agora / 1300) * 0.55, Math.sin(agora / 2100) * 0.1)
        } else {
          ball.rotation.set(0, agora / 2200, 0.25)
        }
        if (fim.arco) material.emissive.setHSL((agora / 3000) % 1, 0.9, 0.5)
        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(loop)
      dispose = () => {
        olho.disconnect()
        texture.dispose()
        material.dispose()
        renderer.dispose()
      }
    })
    return () => {
      stop = true
      cancelAnimationFrame(raf)
      dispose()
    }
  }, [kit, key, map, rankId, size])

  return <canvas ref={ref} aria-hidden className={cn("block", className)} style={{ width: size, height: size }} />
}
