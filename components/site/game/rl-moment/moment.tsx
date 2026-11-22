"use client"

import { Environment, Lightformer, PerspectiveCamera } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { BRAND } from "./palette"
import { Pitch, type Field } from "./pitch"
import { moment, Play } from "./play"
import { Turntable } from "./turntable"

/*
 * The scene, in the game's units (uu): the Octane on its turntable on the centre spot, near the camera; far behind it,
 * across the pitch towards the goal, the small Octane plays with the ball.
 */
const CAMERA = { position: [0, 85, 470] as const, pitch: (0.6 * Math.PI) / 180 }
const PLAY = { position: [250, 0, -2800] as [number, number, number], heading: (18 * Math.PI) / 180 }
const FIELD: Field = { centre: [0, 0], goalZ: -5200, goalX: 1600, boxDepth: 1100, boxHalf: 1600 }
/** The turntable's place: to the left on wide boxes; on phones nearer the middle and the camera, so it stays big. */
function turntableAt(aspect: number): [number, number, number] {
  const wide = Math.min(1, Math.max(0, (aspect - 1.5) / 0.75))
  return [-20 - 60 * wide, 0, 90 * (1 - wide)]
}

/**
 * Rocket League's moment on the game's home: the Octane turning in front, which dragging spins, and far behind it a
 * small Octane dribbling, flicking, flipping and air dribbling the ball in a loop that never changes (`lib/rl-moment.ts`).
 * It renders only while on screen; asking for less motion leaves one still frame of the air dribble.
 */
export default function RocketLeagueMoment() {
  const box = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [aspect, setAspect] = useState(2.25)
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(box.current!)
    const resize = new ResizeObserver(([entry]) => setAspect(entry.contentRect.width / Math.max(1, entry.contentRect.height)))
    resize.observe(box.current!)
    return () => {
      observer.disconnect()
      resize.disconnect()
    }
  }, [])

  return (
    <div ref={box} className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing">
      <Canvas
        frameloop={!visible ? "never" : reduced ? "demand" : "always"}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
      >
        {/* A longer lens on wide boxes, a wider one on phones, so the play fits across either. */}
        <PerspectiveCamera
          makeDefault
          position={[...CAMERA.position]}
          rotation={[-CAMERA.pitch, 0, 0]}
          fov={Math.min(38, Math.max(26, 26 + (2.25 - aspect) * 10))}
          near={20}
          far={20000}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[300, 500, 400]} intensity={1.6} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="rect" color={BRAND.paper} intensity={0.8} position={[0, 0, 8]} scale={[20, 10, 1]} />
          <Lightformer form="ring" color={BRAND.kleinClaro} intensity={2} position={[0, 1, -6]} scale={4} />
        </Environment>
        <Pitch field={FIELD} />
        <Turntable position={turntableAt(aspect)} still={reduced} />
        <Play position={PLAY.position} heading={PLAY.heading} still={reduced ? moment().still : undefined} />
      </Canvas>
    </div>
  )
}
