"use client"

import { Center, Environment, Lightformer, Resize, useGLTF } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useReducedMotion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Color, MathUtils, type Group, type Mesh, type MeshPhysicalMaterial, type Object3D } from "three"
import { airRollReplay } from "@/lib/air-roll"
import type { Paint } from "@/lib/roadmap"

const MODEL = "/models/octane.glb"
const KLEIN: Paint = { color: "#002fa7", metal: false }
/** Air roll ticks per pixel scrolled: about a revolution a screen. */
const TICKS_PER_PIXEL = 0.15

/**
 * The Octane behind the page, air rolling as the page scrolls: down plays
 * the roll forwards, up rewinds it. Its paint becomes that of the rank
 * being read (Klein above the ranks).
 */
export default function Garage({ paint = KLEIN }: { paint?: Paint }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 0, 5.2], fov: 30 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" color="#e6e8ec" intensity={0.8} position={[0, 0, 8]} scale={[20, 10, 1]} />
        <Lightformer form="rect" color="#e6e8ec" intensity={0.5} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer form="ring" color="#85a7ff" intensity={2} position={[0, 1, -6]} scale={4} />
      </Environment>
      <Octane color={paint.color} metal={paint.metal ?? true} />
    </Canvas>
  )
}

function Octane({ color, metal }: { color: string; metal: boolean }) {
  const { scene } = useGLTF(MODEL)
  const [replay] = useState(() => airRollReplay())
  const target = useMemo(() => new Color(color), [color])
  const reduced = useReducedMotion()
  const viewport = useThree((state) => state.viewport)
  const invalidate = useThree((state) => state.invalidate)
  const size = 1.25 * Math.min(viewport.width, viewport.height)

  const body = useRef<Group>(null)
  const paint = useRef<MeshPhysicalMaterial>(undefined)
  const tick = useRef(0)

  useEffect(() => {
    const onScroll = () => invalidate()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [invalidate])
  useEffect(() => invalidate(), [color, invalidate])

  useFrame((_, frame) => {
    const delta = Math.min(frame, 0.1)
    if (!body.current) return
    let moving = false

    paint.current ??= findPaint(body.current)
    if (paint.current) {
      paint.current.color.lerp(target, 1 - Math.exp(-4 * delta))
      paint.current.metalness = MathUtils.damp(paint.current.metalness, metal ? 1 : 0.3, 4, delta)
      paint.current.roughness = MathUtils.damp(paint.current.roughness, metal ? 0.22 : 0.45, 4, delta)
      moving ||= Math.abs(paint.current.metalness - (metal ? 1 : 0.3)) > 0.001
      moving ||= Math.abs(paint.current.color.r - target.r) + Math.abs(paint.current.color.g - target.g) + Math.abs(paint.current.color.b - target.b) > 0.002
    }

    if (!reduced) {
      const goal = window.scrollY * TICKS_PER_PIXEL
      tick.current = MathUtils.damp(tick.current, goal, 6, delta)
      if (Math.abs(tick.current - goal) < 0.01) tick.current = goal
      else moving = true
      replay.at(tick.current, body.current.quaternion)
    }
    if (moving) invalidate()
  })

  return (
    // Seen from ahead and to the side, nose up a little.
    <group rotation={[0.25, -0.75, 0.15]}>
      <group ref={body} scale={size}>
        <Resize>
          <Center>
            <primitive object={scene} />
          </Center>
        </Resize>
      </group>
    </group>
  )
}

/** The body's paint; the rest of the car keeps its own materials. */
function findPaint(car: Object3D) {
  let paint: MeshPhysicalMaterial | undefined
  car.traverse((part) => {
    const material = (part as Mesh).material as MeshPhysicalMaterial | undefined
    if (material?.name === "Octane_Body") paint = material
  })
  return paint
}

useGLTF.preload(MODEL)
