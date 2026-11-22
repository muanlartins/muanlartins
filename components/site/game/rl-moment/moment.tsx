"use client"

import { Environment, Lightformer } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { useReducedMotion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { BRAND } from "./palette"
import { Follow } from "./follow"
import { Pitch } from "./pitch"
import { moment, Play } from "./play"

/** The loop's line, turned a little to the camera, so each half is seen from its own side. */
const HEADING = (11 * Math.PI) / 180

/**
 * Rocket League's moment on the game's home: a small Octane dribbling, flicking, flipping and air dribbling the ball
 * on the brand's floor, in a loop that never changes (`lib/rl-moment.ts`), the camera gliding with it. Nothing else
 * (Luan, 2026-11-21: no car turning in front, no goal behind). It renders only while on screen; asking for less motion
 * leaves one still frame of the air dribble.
 */
export default function RocketLeagueMoment() {
  const box = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(box.current!)
    return () => observer.disconnect()
  }, [])

  const still = reduced ? moment().still : undefined
  return (
    <div ref={box} aria-hidden className="h-full w-full">
      <Canvas
        frameloop={!visible ? "never" : reduced ? "demand" : "always"}
        dpr={[1, 1.75]}
        camera={{ fov: 22, near: 50, far: 20000 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[300, 500, 400]} intensity={1.6} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="rect" color={BRAND.paper} intensity={0.8} position={[0, 0, 8]} scale={[20, 10, 1]} />
          <Lightformer form="ring" color={BRAND.kleinClaro} intensity={2} position={[0, 1, -6]} scale={4} />
        </Environment>
        {/* Before the play: its boost's streak turns to face where the camera is this frame. */}
        <Follow heading={HEADING} still={still} />
        <Pitch />
        <Play position={[0, 0, 0]} heading={HEADING} still={still} />
      </Canvas>
    </div>
  )
}
