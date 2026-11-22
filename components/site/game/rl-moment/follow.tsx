"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo } from "react"
import { PerspectiveCamera, Quaternion, Vector3 } from "three"
import { RL, sample } from "@/lib/rl-moment"
import { moment } from "./play"

/** How many points of the loop the camera's path keeps, and the seconds either side each is the middle of. */
const STEPS = 240
const WINDOW = 0.8
/** The height the box always holds (uu), from under the floor's shadows to over the highest ball. */
const LOW = -60
const HIGH = 625
/** The camera's angle down to the middle of that. */
const DOWN = (11 * Math.PI) / 180
/** Room either side of the car or the ball's centre (uu). */
const MARGIN = RL.ballRadius + 30

/**
 * The camera gliding with the play: it looks at the middle of car and ball over the moment around now (so it never
 * jerks, and the loop closes), from as near as keeps both in the box all the loop long, whatever the box's shape.
 */
export function Follow({ heading, still }: { heading: number; still?: number }) {
  const path = useMemo(() => build(heading), [heading])
  useFrame(({ camera, clock, size }) => {
    const { seconds } = moment()
    const t = ((still ?? clock.elapsedTime) / seconds) % 1
    const i = Math.floor(t * STEPS)
    const at = AT.lerpVectors(path.centres[i], path.centres[(i + 1) % STEPS], t * STEPS - i)
    const half = Math.tan((((camera as PerspectiveCamera).fov / 2) * Math.PI) / 180)
    const aspect = size.width / Math.max(1, size.height)
    const distance = Math.max((HIGH - LOW) / (2 * half), path.reach / (half * aspect))
    const middle = (HIGH + LOW) / 2
    camera.position.set(at.x, middle + Math.sin(DOWN) * distance, at.z + Math.cos(DOWN) * distance)
    camera.lookAt(at.x, middle, at.z)
  })
  return null
}

const AT = new Vector3()
const Y = new Vector3(0, 1, 0)

function build(heading: number) {
  const loop = moment()
  const now = { car: { p: new Vector3(), q: new Quaternion(), boost: false }, ball: { p: new Vector3(), q: new Quaternion() } }
  const points = Array.from({ length: STEPS }, (_, i) => {
    sample(loop, (i / STEPS) * loop.seconds, now)
    return [now.car.p.clone().applyAxisAngle(Y, heading), now.ball.p.clone().applyAxisAngle(Y, heading)]
  })
  const span = Math.round((WINDOW / loop.seconds) * STEPS)
  const centres = points.map((_, i) => {
    const sum = new Vector3()
    let total = 0
    for (let k = -span; k <= span; k++) {
      const weight = span + 1 - Math.abs(k)
      for (const point of points[(i + k + STEPS) % STEPS]) sum.addScaledVector(point, weight)
      total += 2 * weight
    }
    return sum.divideScalar(total).setY(0)
  })
  const reach = Math.max(...points.flatMap((pair, i) => pair.map((point) => Math.abs(point.x - centres[i].x)))) + MARGIN
  return { centres, reach }
}
