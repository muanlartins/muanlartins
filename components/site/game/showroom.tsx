"use client"

import { ContactShadows, Center, Environment, Lightformer, Resize, useGLTF } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import type { Group, MeshPhysicalMaterial } from "three"
import { findPaint } from "@/components/site/roadmap/garage"

const CAR = "/models/octane.glb"
const BALL = "/models/ball.glb"
/** Radians a second the car turns on its own. */
const SPIN = 0.45
/** Radians per pixel dragged. */
const DRAG = 0.012

/**
 * The Octane on a turntable in Klein, with the ball bouncing beside it.
 * It turns on its own; dragging spins it, and it eases back to its pace.
 * Off screen it stops rendering.
 */
export default function Showroom() {
  const box = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={box}
      className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
    >
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.15, 6], fov: 26 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.1, 0)}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="rect" color="#e6e8ec" intensity={0.8} position={[0, 0, 8]} scale={[20, 10, 1]} />
          <Lightformer form="ring" color="#85a7ff" intensity={2} position={[0, 1, -6]} scale={4} />
        </Environment>
        <Car />
        <BouncingBall />
        <ContactShadows position={[0, -0.5, 0]} opacity={0.35} scale={9} blur={2.4} far={2} color="#001447" />
      </Canvas>
    </div>
  )
}

function Car() {
  const { scene } = useGLTF(CAR)
  const reduced = useReducedMotion()
  const group = useRef<Group>(null)
  const painted = useRef(false)
  const spin = useRef({ angle: -0.6, speed: SPIN, dragging: false })
  const canvas = useThree((three) => three.gl.domElement)

  // Dragging across the canvas turns the car; letting go mid-drag flicks it.
  useEffect(() => {
    let last: { x: number; t: number } | undefined
    const down = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId)
      spin.current.dragging = true
      last = { x: event.clientX, t: event.timeStamp }
    }
    const move = (event: PointerEvent) => {
      if (!spin.current.dragging || !last) return
      const dx = event.clientX - last.x
      const dt = Math.max(event.timeStamp - last.t, 1) / 1000
      spin.current.angle += dx * DRAG
      spin.current.speed = (dx * DRAG) / dt
      last = { x: event.clientX, t: event.timeStamp }
    }
    const up = () => {
      spin.current.dragging = false
    }
    canvas.addEventListener("pointerdown", down)
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerup", up)
    canvas.addEventListener("pointercancel", up)
    return () => {
      canvas.removeEventListener("pointerdown", down)
      canvas.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerup", up)
      canvas.removeEventListener("pointercancel", up)
    }
  }, [canvas])

  useFrame((_, frame) => {
    const delta = Math.min(frame, 0.1)
    const state = spin.current
    if (!group.current) return
    if (!painted.current) {
      const paint = findPaint(group.current) as MeshPhysicalMaterial | undefined
      if (paint) {
        paint.color.set("#002fa7")
        paint.metalness = 0.7
        paint.roughness = 0.28
        painted.current = true
      }
    }
    if (!state.dragging) {
      // A flick keeps spinning, then settles back to the turntable's pace.
      state.speed += ((reduced ? 0 : SPIN) - state.speed) * (1 - Math.exp(-1.6 * delta))
      state.angle += state.speed * delta
    }
    group.current.rotation.y = state.angle
  })

  return (
    <group ref={group} position={[-0.35, 0, 0]} scale={2.5}>
      <Resize>
        <Center>
          <primitive object={scene} />
        </Center>
      </Resize>
    </group>
  )
}

/** The ball off the car's nose, bouncing in place and turning as it goes. */
function BouncingBall() {
  const { scene } = useGLTF(BALL)
  const reduced = useReducedMotion()
  const group = useRef<Group>(null)
  const radius = 0.42

  useFrame(({ clock }) => {
    if (!group.current || reduced) return
    const t = clock.elapsedTime
    // A bounce is a parabola: |sin| gives the arcs, squared for a quick turn at the floor.
    const hop = Math.abs(Math.sin(t * 1.9))
    group.current.position.y = -0.5 + radius + hop * (1.6 - hop * 0.6) * 0.55
    group.current.rotation.x = t * 0.9
    group.current.rotation.z = t * 0.35
  })

  return (
    <group ref={group} position={[1.75, -0.5 + radius, -0.4]}>
      <group scale={radius * 2}>
        <Resize>
          <Center>
            <primitive object={scene} />
          </Center>
        </Resize>
      </group>
    </group>
  )
}

useGLTF.preload(CAR)
useGLTF.preload(BALL)
