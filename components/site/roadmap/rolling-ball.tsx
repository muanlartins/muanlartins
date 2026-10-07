"use client"

import { Center, Resize, useGLTF } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type { MotionValue } from "motion/react"
import { useEffect, useRef } from "react"
import type { Group } from "three"

const MODEL = "/models/ball.glb"

/** The ball, `size` pixels wide (or filling its box), rolling along as `distance` (in pixels) grows. */
export default function RollingBall({ distance, size }: { distance: MotionValue<number>; size?: number }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 7.6], fov: 16 }}
      gl={{ alpha: true, antialias: true }}
      style={size ? { width: size, height: size } : undefined}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[-2, 3, 4]} intensity={2.4} />
      <Ball distance={distance} />
    </Canvas>
  )
}

function Ball({ distance }: { distance: MotionValue<number> }) {
  const { scene } = useGLTF(MODEL)
  const group = useRef<Group>(null)
  const invalidate = useThree((state) => state.invalidate)
  // The ball spans about the whole canvas.
  const radius = useThree((state) => state.size.width) / 2

  useEffect(() => distance.on("change", () => invalidate()), [distance, invalidate])
  useFrame(() => {
    if (group.current) group.current.rotation.x = distance.get() / radius
  })

  return (
    <group ref={group} scale={2}>
      <Resize>
        <Center>
          <primitive object={scene} />
        </Center>
      </Resize>
    </group>
  )
}

useGLTF.preload(MODEL)
