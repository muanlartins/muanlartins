"use client"

import { Center, Resize, useGLTF } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import type { Group } from "three"
import { CAR, OCTANE_LENGTH, paintOctane } from "./octane"
import { Blob } from "./blob"

/** Radians a second the car turns on its own. */
const SPIN = 0.45
/** Radians per pixel dragged. */
const DRAG = 0.012

/**
 * The Octane on its turntable, in front: it turns on its own; dragging across the canvas spins it, and a flick keeps
 * it spinning until it eases back to its pace. With `still`, it only moves when dragged.
 */
export function Turntable({ position, still }: { position: [number, number, number]; still: boolean }) {
  const { scene } = useGLTF(CAR)
  const car = useMemo(() => scene.clone(), [scene])
  const group = useRef<Group>(null)
  const spin = useRef({ angle: -0.6, speed: SPIN, dragging: false })
  const canvas = useThree((three) => three.gl.domElement)
  const invalidate = useThree((three) => three.invalidate)

  useEffect(() => paintOctane(car), [car])

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
      invalidate()
    }
    const up = () => {
      spin.current.dragging = false
      invalidate()
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
  }, [canvas, invalidate])

  useFrame((_, frame) => {
    const delta = Math.min(frame, 0.1)
    const state = spin.current
    if (!group.current) return
    if (!state.dragging) {
      // A flick keeps spinning, then settles back to the turntable's pace (or to rest, when still).
      const pace = still ? 0 : SPIN
      state.speed += (pace - state.speed) * (1 - Math.exp(-1.6 * delta))
      state.angle += state.speed * delta
      if (still && Math.abs(state.speed) > 0.002) invalidate()
    }
    group.current.rotation.y = state.angle
  })

  return (
    <group position={position}>
      <Blob width={150} depth={92} opacity={0.42} turn={group} />
      <group ref={group}>
        <group scale={OCTANE_LENGTH}>
          <Resize>
            <Center top>
              <primitive object={car} />
            </Center>
          </Resize>
        </group>
      </group>
    </group>
  )
}
