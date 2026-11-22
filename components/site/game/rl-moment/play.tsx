"use client"

import { Center, Resize, useGLTF } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Quaternion, Vector3, type Group, type Mesh, type ShaderMaterial } from "three"
import { buildMoment, OCTANE, RL, sample, type Moment } from "@/lib/rl-moment"
import { useShadowMaterial } from "./blob"
import { BALL, CAR, OCTANE_LENGTH, paintOctane } from "./octane"
import { BRAND } from "./palette"

/** The boost's streak: how many points, and how far apart in time (seconds). */
const TRAIL = { points: 32, step: 1 / 100 }
/** The exhaust, in the car's frame from its centre of mass. */
const EXHAUST = new Vector3(-60, 4, 0)

/** Where the car and ball are this frame, and a spare vector: the page has one play, so they live here. */
const NOW = { car: { p: new Vector3(), q: new Quaternion(), boost: false }, ball: { p: new Vector3(), q: new Quaternion() } }
const AHEAD = new Vector3()

let built: Moment | undefined
/** The loop, built once for the page. */
export function moment() {
  built ??= buildMoment()
  return built
}

/**
 * The play far behind: the small Octane and the ball, as `lib/rl-moment.ts` has them as the loop plays (or at
 * `still` seconds into it), with their shadows on the pitch and the boost's streak behind the car.
 */
export function Play({ still, position, heading }: { still?: number; position: [number, number, number]; heading: number }) {
  const loop = moment()
  const { scene } = useGLTF(CAR)
  const { scene: ballScene } = useGLTF(BALL)
  const car = useMemo(() => scene.clone(), [scene])
  const ballModel = useMemo(() => ballScene.clone(), [ballScene])
  const carGroup = useRef<Group>(null)
  const ballGroup = useRef<Group>(null)
  const carShadow = useRef<Mesh>(null)
  const ballShadow = useRef<Mesh>(null)
  const shadow = useShadowMaterial(0.34)
  const ballShadowMaterial = useShadowMaterial(0.3)
  const camera = useThree((state) => state.camera)
  const parent = useRef<Group>(null)

  useEffect(() => paintOctane(car), [car])

  // The boost: a Klein claro streak with a Branco core, so it reads on the light page as on the game's sky.
  const sheath = useMemo(() => streak({ width: 42, head: BRAND.kleinClaro, tail: BRAND.kleinClaro, opacity: 1 }), [])
  const core = useMemo(() => streak({ width: 16, head: BRAND.paper, tail: BRAND.kleinClaro, opacity: 1 }), [])

  useFrame(({ clock }) => {
    const t = still ?? clock.elapsedTime
    const now = sample(loop, t, NOW)
    if (carGroup.current) {
      carGroup.current.position.copy(now.car.p)
      carGroup.current.quaternion.copy(now.car.q)
    }
    if (ballGroup.current) {
      ballGroup.current.position.copy(now.ball.p)
      ballGroup.current.quaternion.copy(now.ball.q)
    }
    // Shadows straight down, softer and wider the higher they are.
    if (carShadow.current) {
      const lift = Math.max(0, now.car.p.y - OCTANE.rest)
      const forward = AHEAD.set(1, 0, 0).applyQuaternion(now.car.q)
      carShadow.current.position.set(now.car.p.x, 0.6, now.car.p.z)
      carShadow.current.rotation.z = Math.atan2(-forward.z, forward.x)
      const grow = 1 + lift / 500
      carShadow.current.scale.set(150 * grow * Math.max(0.55, Math.hypot(forward.x, forward.z)), 96 * grow, 1)
      ;(carShadow.current.material as ShaderMaterial).uniforms.uOpacity.value = 0.34 / (1 + lift / 160)
    }
    if (ballShadow.current) {
      const lift = Math.max(0, now.ball.p.y - RL.ballRadius)
      const grow = 1 + lift / 600
      ballShadow.current.position.set(now.ball.p.x, 0.7, now.ball.p.z)
      ballShadow.current.scale.set(170 * grow, 170 * grow, 1)
      ;(ballShadow.current.material as ShaderMaterial).uniforms.uOpacity.value = 0.3 / (1 + lift / 200)
    }
    if (parent.current) {
      sheath.update(loop, t, camera.position, parent.current)
      core.update(loop, t, camera.position, parent.current)
    }
  })

  return (
    <group ref={parent} position={position} rotation-y={heading}>
      <mesh ref={carShadow} rotation-x={-Math.PI / 2} material={shadow} renderOrder={0}>
        <planeGeometry />
      </mesh>
      <mesh ref={ballShadow} rotation-x={-Math.PI / 2} material={ballShadowMaterial} renderOrder={0}>
        <planeGeometry />
      </mesh>
      <group ref={carGroup}>
        {/* The model's nose is along +x, as the loop's car; its wheels sit the centre of mass's height below it. */}
        <group position-y={-OCTANE.rest}>
          <group scale={OCTANE_LENGTH}>
            <Resize>
              <Center top>
                <primitive object={car} />
              </Center>
            </Resize>
          </group>
        </group>
      </group>
      <group ref={ballGroup}>
        <group scale={RL.ballRadius * 2}>
          <Resize>
            <Center>
              <primitive object={ballModel} />
            </Center>
          </Resize>
        </group>
      </group>
      <mesh geometry={sheath.geometry} renderOrder={2} frustumCulled={false}>
        <meshBasicMaterial vertexColors transparent depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh geometry={core.geometry} renderOrder={3} frustumCulled={false}>
        <meshBasicMaterial vertexColors transparent depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  )
}

/**
 * A boost streak: a ribbon through where the exhaust was over the last moments, turned to face the camera, `width` uu
 * wide at the car and thinning away, from `head`'s colour to `tail`'s, drawn only where the car was boosting.
 */
function streak({ width: full, head: headColor, tail: tailColor, opacity }: { width: number; head: string; tail: string; opacity: number }) {
  const n = TRAIL.points
  const geometry = new BufferGeometry()
  const positions = new Float32Array(n * 2 * 3)
  const colors = new Float32Array(n * 2 * 4)
  const index: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geometry.setIndex(index)
  geometry.setAttribute("position", new BufferAttribute(positions, 3))
  geometry.setAttribute("color", new BufferAttribute(colors, 4))
  const head = new Color(headColor)
  const tail = new Color(tailColor)
  const color = new Color()
  const at = { car: { p: new Vector3(), q: new Quaternion(), boost: false }, ball: { p: new Vector3(), q: new Quaternion() } }
  const points: Vector3[] = Array.from({ length: n }, () => new Vector3())
  const on: boolean[] = Array(n).fill(false)
  const eye = new Vector3()
  const side = new Vector3()
  const along = new Vector3()

  function update(loop: Moment, time: number, camera: Vector3, parent: Group) {
    for (let i = 0; i < n; i++) {
      sample(loop, time - i * TRAIL.step, at)
      points[i].copy(EXHAUST).applyQuaternion(at.car.q).add(at.car.p)
      on[i] = at.car.boost
    }
    eye.copy(camera)
    parent.worldToLocal(eye)
    for (let i = 0; i < n; i++) {
      const p = points[i]
      along.subVectors(points[Math.max(0, i - 1)], points[Math.min(n - 1, i + 1)])
      side.subVectors(eye, p).cross(along).normalize()
      const s = i / (n - 1)
      side.multiplyScalar(full * (1 - 0.8 * s))
      positions[i * 6] = p.x + side.x
      positions[i * 6 + 1] = p.y + side.y
      positions[i * 6 + 2] = p.z + side.z
      positions[i * 6 + 3] = p.x - side.x
      positions[i * 6 + 4] = p.y - side.y
      positions[i * 6 + 5] = p.z - side.z
      color.copy(head).lerp(tail, Math.min(1, s * 2.2))
      // Drawn where the car was boosting then, so it lingers a moment after the boost lets go.
      const alpha = (on[i] ? 1 : 0) * (1 - s) ** 1.2 * opacity
      for (const v of [0, 4]) {
        colors[i * 8 + v] = color.r
        colors[i * 8 + v + 1] = color.g
        colors[i * 8 + v + 2] = color.b
        colors[i * 8 + v + 3] = alpha
      }
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  }

  return { geometry, update }
}

useGLTF.preload(CAR)
useGLTF.preload(BALL)
