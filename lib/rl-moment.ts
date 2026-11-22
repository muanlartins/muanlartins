import { Quaternion, Vector3 } from "three"
import { TICK, steer, turn, type Spin, type Stick } from "./air-roll"

/**
 * Rocket League's moment: a small Octane playing with the ball as a good player does, in a loop that never changes.
 * Each half: it dribbles with the ball on its roof, flicks it with a front flip, slides round as the ball bounces,
 * pops it off the bounce with its nose, air dribbles it back, lets go, lands and catches it on its roof. The second
 * half is the first turned half a lap round the middle, so the loop closes on itself.
 *
 * Everything is in the game's units (uu, seconds) at the game's 120 ticks a second, with RocketSim's numbers
 * (github.com/ZealanL/RocketSim): gravity, boost, the jump and its hold, the dodge and its flip, the air control's
 * torque (`lib/air-roll.ts`). The car is simulated from its inputs in the air and driven along smooth paths on the
 * ground. The ball flies on gravity and bounces off the ground as the game's does; from the pop to the landing, car
 * and ball are simulated together, the ball bouncing off the car's hitbox where they meet, while the car's boost is
 * feathered as a player does. The flick's lift and the catch are placed where the car is. Built once (a few tens of
 * milliseconds), the same every time.
 *
 * Play space: x east, y up, z south (towards the camera). Car frame: forward +X, up +Y, right +Z.
 */

export const RL = {
  gravity: 650,
  ballRadius: 92.75,
  carMaxSpeed: 2300,
  ballMaxSpeed: 6000,
  boostAir: 3175 / 3,
  jumpImpulse: 875 / 3,
  jumpAccel: 4375 / 3,
  jumpMaxHold: 0.2,
  dodgeImpulse: 500,
  ballRestitution: 0.6,
  /** What the ball keeps of its speed across the ground when it bounces (it rolls and skids a little). */
  ballGroundKeep: 0.86,
}

/** The ball bouncing off the ground: up at the game's restitution, losing a little of its speed across. */
function bounceOff(v: Vector3) {
  return v.set(v.x * RL.ballGroundKeep, -v.y * RL.ballRestitution, v.z * RL.ballGroundKeep)
}

const R = RL.ballRadius
const DOWN = new Vector3(0, -RL.gravity, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)

/** The Octane, from its centre of mass: the centre's height on its wheels, and its hitbox (centre, half sizes). */
export const OCTANE = {
  rest: 24,
  box: { centre: new Vector3(3, 11, 0), half: new Vector3(63, 22, 40) },
}
const ROOF = new Vector3(-2, OCTANE.box.centre.y + OCTANE.box.half.y + R - 2, 0)
/** The ball against the nose: `angle` 0 is straight ahead of the bumper, 90° on the bonnet. */
function nose(angle: number) {
  const edge = new Vector3(OCTANE.box.centre.x + OCTANE.box.half.x, OCTANE.box.centre.y + OCTANE.box.half.y, 0)
  const a = (angle * Math.PI) / 180
  return edge.add(new Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar(R))
}

const rad = (deg: number) => (deg * Math.PI) / 180
const yaw = (heading: number) => new Quaternion().setFromAxisAngle(Y, heading)
const ahead = (heading: number) => new Vector3(Math.cos(heading), 0, -Math.sin(heading))
const headingOf = (v: Vector3) => Math.atan2(-v.z, v.x)
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

type Car = Spin & { p: Vector3; v: Vector3 }
type Frame = { p: Vector3; q: Quaternion; boost: boolean; heading?: number }
type Beat = { name: string; tick: number }

/** One tick in the air: gravity, boost along the nose, the jump's hold along the roof, then the stick. */
function airTick(car: Car, { boost = false, hold = false, stick = {} as Stick }) {
  car.v.addScaledVector(DOWN, TICK)
  if (boost) car.v.addScaledVector(new Vector3(1, 0, 0).applyQuaternion(car.orientation), RL.boostAir * TICK)
  if (hold) car.v.addScaledVector(new Vector3(0, 1, 0).applyQuaternion(car.orientation), RL.jumpAccel * TICK)
  if (car.v.length() > RL.carMaxSpeed) car.v.setLength(RL.carMaxSpeed)
  car.p.addScaledVector(car.v, TICK)
  steer(car, stick)
  turn(car)
}

/** The nose's angle above the horizon, and how fast it's rising. */
function noseAngle(car: Car) {
  const forward = new Vector3(1, 0, 0).applyQuaternion(car.orientation)
  const right = Z.clone().applyQuaternion(car.orientation)
  return { angle: Math.asin(Math.max(-1, Math.min(1, forward.y))), rate: car.omega.dot(right) }
}

/** The pitch a player would hold to bring the nose to `target` (radians) and keep it there. */
function pitchTo(car: Car, target: number) {
  const { angle, rate } = noseAngle(car)
  return Math.max(-1, Math.min(1, 9 * (target - angle) - 1.6 * rate))
}

/** On the ground along a smooth path from one state to another, `ticks` long; `face` overrides the heading. */
function drive(from: { p: Vector3; v: Vector3 }, to: { p: Vector3; v: Vector3 }, ticks: number, face?: (s: number) => number, boost?: (s: number) => boolean) {
  const frames: Frame[] = []
  const T = ticks * TICK
  for (let i = 1; i <= ticks; i++) {
    const s = i / ticks
    const [h00, h10, h01, h11] = [2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2]
    const p = from.p.clone().multiplyScalar(h00).addScaledVector(from.v, h10 * T).addScaledVector(to.p, h01).addScaledVector(to.v, h11 * T)
    const [d00, d10, d01, d11] = [6 * s ** 2 - 6 * s, 3 * s ** 2 - 4 * s + 1, -6 * s ** 2 + 6 * s, 3 * s ** 2 - 2 * s]
    const v = from.p.clone().multiplyScalar(d00 / T).addScaledVector(from.v, d10).addScaledVector(to.p, d01 / T).addScaledVector(to.v, d11)
    p.y = OCTANE.rest
    const heading = face ? face(s) : headingOf(v)
    frames.push({ p, q: yaw(heading), boost: boost?.(s) ?? false, heading })
  }
  return frames
}

/** How far the ball's surface is inside the car's hitbox (negative: clear of it), and the way out of it. */
function contact(ball: Vector3, car: Frame) {
  const local = ball.clone().sub(car.p).applyQuaternion(car.q.clone().invert()).sub(OCTANE.box.centre)
  const h = OCTANE.box.half
  const closest = new Vector3(Math.max(-h.x, Math.min(h.x, local.x)), Math.max(-h.y, Math.min(h.y, local.y)), Math.max(-h.z, Math.min(h.z, local.z)))
  return { overlap: R - closest.distanceTo(local), normal: local.sub(closest).normalize().applyQuaternion(car.q) }
}

/** The flick: a jump, held a moment, then a front flip whose rear lifts the ball off the roof. */
function flick(heading: number, speed: number) {
  const holdTicks = 17
  const dodgeTick = 19
  const p = new Vector3(0, OCTANE.rest, 0)
  const v = ahead(heading).multiplyScalar(speed).addScaledVector(Y, RL.jumpImpulse)
  const path: Vector3[] = []
  let flipTime = -1
  for (let tick = 1; ; tick++) {
    if (tick < holdTicks) v.y += RL.jumpAccel * TICK
    if (tick === dodgeTick) {
      v.addScaledVector(ahead(heading), RL.dodgeImpulse)
      flipTime = 0
    }
    v.y -= RL.gravity * TICK
    if (flipTime >= 0) {
      flipTime += TICK
      // RocketSim's flip damps the fall while the flip turns the car.
      if (flipTime >= 0.15 && flipTime < 0.65 && (v.y < 0 || flipTime < 0.21)) v.y *= 0.65
    }
    p.addScaledVector(v, TICK)
    if (p.y <= OCTANE.rest && v.y < 0) {
      p.y = OCTANE.rest
      path.push(p.clone())
      break
    }
    path.push(p.clone())
  }
  // The flip turns the nose down at a steady rate, a whole turn by the landing (the cap is 5.5 rad/s).
  const flipTicks = path.length - dodgeTick
  const rate = (2 * Math.PI) / ((flipTicks - 2) * TICK)
  if (rate > 5.5) console.warn(`The flick's flip spins at ${rate.toFixed(2)} rad/s, past the game's cap.`)
  const frames: Frame[] = path.map((p, i) => {
    const tick = i + 1
    // The spin builds over a few ticks, as the flip's torque does, then holds.
    const since = tick - dodgeTick
    const turned = since <= 0 ? 0 : Math.min(2 * Math.PI, rate * TICK * (since <= 4 ? (since * since) / 8 : since - 2))
    return { p, q: yaw(heading).multiply(new Quaternion().setFromAxisAngle(Z, -turned)), boost: false, heading }
  })
  return { frames, dodgeTick, rate, velocity: new Vector3(v.x, 0, v.z) }
}

type AirPlan = {
  /** How long the jump is held (at most 0.2 s). */
  hold: number
  /** Ticks of boost from the jump, before the ball is touched: the climb's start. */
  boostUntil: number
  /** The nose's angle (degrees) to hold over time (seconds from the jump), as [seconds, degrees] points. */
  nose: [number, number][]
  /** The climb (uu/s up) the player keeps to while carrying the ball, as [seconds, uu/s] points. */
  climb: [number, number][]
  /** When the player lets the ball go and turns the car level to land. */
  release: number
}

/** Piecewise smooth [x, y] points, read at `x`. */
function curve(points: [number, number][], x: number) {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) return points[i - 1][1] + (points[i][1] - points[i - 1][1]) * smooth(points[i - 1][0], points[i][0], x)
  }
  return points[points.length - 1][1]
}

type BallState = { p: Vector3; v: Vector3 }
/** The ball against the car: pushed out of the hitbox, and bounced off it as the car's surface is moving there. */
const CAR_RESTITUTION = 0.3
const CAR_FRICTION = 0.25

/**
 * The pop and the air dribble: a jump with boost, the nose brought up and held, then levelled to land. With `ball`
 * (the ball where it is at the jump, in the jump's own space), the two are simulated together: the ball bounces off
 * the hitbox where they meet, and the player feathers boost as one does, boosting when the ball pulls away from the
 * nose as long as the car isn't climbing faster than it means to.
 */
function airDribble(heading: number, speed: number, plan: AirPlan, ball?: BallState) {
  const car: Car = { p: new Vector3(0, OCTANE.rest, 0), v: ahead(heading).multiplyScalar(speed), orientation: yaw(heading), omega: new Vector3() }
  car.v.addScaledVector(Y, RL.jumpImpulse)
  const frames: Frame[] = []
  const balls: Vector3[] = []
  const touches: number[] = []
  let touched = false
  let wasTouching = false
  let boosting = false
  let since = 0
  for (let tick = 1; tick < 600; tick++) {
    const t = tick * TICK
    const frame = { p: car.p, q: car.orientation, boost: false }
    const gap = ball ? contact(ball.p, frame) : undefined
    let want = tick >= 2 && tick < plan.boostUntil
    if (ball && touched && t < plan.release && gap) {
      const leaving = ball.v.clone().sub(car.v).dot(gap.normal) > 0
      want ||= (leaving || -gap.overlap > 3) && car.v.y < curve(plan.climb, t)
    }
    // Boost comes on for at least a tenth of a second, as the game holds it, and stays off a few ticks.
    since++
    if (want !== boosting && (boosting ? since >= 12 : since >= 4)) {
      boosting = want
      since = 0
    }
    if (t >= plan.release) boosting = false
    const hold = t < Math.min(plan.hold, RL.jumpMaxHold)
    const goal = t < plan.release ? curve(plan.nose, t) : 0
    airTick(car, { boost: boosting, hold, stick: { pitch: pitchTo(car, rad(goal)) } })
    const landing = car.p.y <= OCTANE.rest && car.v.y < 0 && t > plan.release
    if (landing) car.p.y = OCTANE.rest

    if (ball) {
      ball.v.addScaledVector(DOWN, TICK)
      ball.p.addScaledVector(ball.v, TICK)
      if (ball.p.y < R) {
        ball.p.y = R
        bounceOff(ball.v)
      }
      const hit = contact(ball.p, { p: car.p, q: car.orientation, boost: false })
      if (hit.overlap > 0) {
        ball.p.addScaledVector(hit.normal, hit.overlap)
        const at = ball.p.clone().addScaledVector(hit.normal, -R).sub(car.p)
        const surface = car.v.clone().add(car.omega.clone().cross(at))
        const rel = ball.v.clone().sub(surface)
        const into = rel.dot(hit.normal)
        if (into < 0) {
          const across = rel.clone().addScaledVector(hit.normal, -into)
          ball.v.addScaledVector(hit.normal, -(1 + CAR_RESTITUTION) * into).addScaledVector(across, -CAR_FRICTION)
          if (ball.v.length() > RL.ballMaxSpeed) ball.v.setLength(RL.ballMaxSpeed)
        }
        if (!wasTouching) touches.push(tick)
        touched = true
        wasTouching = true
      } else wasTouching = false
      balls.push(ball.p.clone())
    }
    frames.push({ p: car.p.clone(), q: car.orientation.clone(), boost: boosting })
    if (landing) break
  }
  return { frames, balls, touches, velocity: new Vector3(car.v.x, 0, car.v.z), ball }
}

/** The ball for one stretch: riding the roof (hopping on it after a catch), or flying from a point at a velocity. */
type BallPart =
  | { kind: "ride"; from: number; to: number; caught: number; drop: number }
  | { kind: "fly"; from: number; to: number; p: Vector3; v: Vector3 }
  | { kind: "track"; from: number; to: number; points: Vector3[] }

/** The loop's choreography, in degrees, uu/s and ticks: the numbers to tune it by. Each half runs along +x. */
export const PLAN = {
  dribble: { speed: 340, ticks: 66, heading: -18 },
  flick: { ball: { forward: 430, up: 620 } },
  /** The air dribble's heading, and the car's speed when it jumps for the pop. */
  air: { heading: 174, speed: 60 },
  /** The pop: ticks after the bounce, the ball's place on the nose (degrees from the bumper). */
  pop: { after: 14, angle: 20 },
  airPlan: {
    hold: 0.12,
    boostUntil: 30,
    nose: [
      [0, 20],
      [0.2, 58],
      [0.6, 66],
      [1.0, 70],
    ],
    climb: [
      [0, 420],
      [0.35, 330],
      [0.8, 160],
      [1.1, 20],
    ],
    release: 1.2,
  } as AirPlan,
  /** How long the car carries the ball after the catch. */
  finish: { afterCatch: 30 },
}

/** The ball's height over the roof `age` ticks after it dropped onto it at `drop` uu/s: hops that die out. */
function hop(age: number, drop: number) {
  let t = age * TICK
  let v = drop * 0.4
  while (v > 25) {
    const flight = (2 * v) / RL.gravity
    if (t < flight) return v * t - 0.5 * RL.gravity * t * t
    t -= flight
    v *= 0.4
  }
  return 0
}

/** Builds one half of the loop, from the dribble to the catch, in play space. */
function half() {
  const beats: Beat[] = []
  const frames: Frame[] = []
  const mark = (name: string) => beats.push({ name, tick: frames.length })
  const { dribble } = PLAN
  const flickHeading = 0
  const airHeading = rad(PLAN.air.heading)
  const endHeading = rad(dribble.heading + 180)

  // 1. The dribble, curving from its heading to the flick's.
  const start = { p: new Vector3(0, OCTANE.rest, 0), v: ahead(rad(dribble.heading)).multiplyScalar(dribble.speed) }
  const flickAt = start.p.clone().addScaledVector(ahead(rad(dribble.heading) / 2), dribble.speed * dribble.ticks * TICK)
  mark("drible")
  frames.push({ p: start.p.clone(), q: yaw(rad(dribble.heading)), boost: false, heading: rad(dribble.heading) })
  frames.push(...drive(start, { p: flickAt, v: ahead(flickHeading).multiplyScalar(dribble.speed) }, dribble.ticks))

  // 2. The flick: the ball leaves the roof as the flip begins, the car flies on under it.
  const f = flick(flickHeading, dribble.speed)
  const jump0 = frames.length - 1
  mark("flick")
  frames.push(...f.frames.map((frame) => ({ ...frame, p: frame.p.clone().add(flickAt).setY(frame.p.y) })))
  const landed = frames.length - 1
  const releaseTick = jump0 + f.dodgeTick
  const releaseAt = frames[releaseTick].p.clone().add(ROOF.clone().applyQuaternion(yaw(flickHeading)))
  const releaseV = ahead(flickHeading).multiplyScalar(PLAN.flick.ball.forward).addScaledVector(Y, PLAN.flick.ball.up)
  // It comes down ahead and bounces.
  const fall = (releaseV.y + Math.sqrt(releaseV.y ** 2 + 2 * RL.gravity * (releaseAt.y - R))) / RL.gravity
  const bounceTick = releaseTick + Math.round(fall / TICK)
  const bounce = bounced(releaseAt, releaseV, (bounceTick - releaseTick) * TICK)

  // 4. The pop and the air dribble, simulated from the jump.
  const air = airDribble(airHeading, PLAN.air.speed, PLAN.airPlan)
  // The pop: the nose meets the ball as it comes up off the bounce. Find when to jump so the nose's contact is at
  // the ball's height then, and where, so it's there across too.
  const popTouch = bounceTick + PLAN.pop.after
  const ballAtPop = bounce.at(popTouch - bounceTick)
  let best = { tau: 0, angle: 0, miss: Infinity }
  for (let tau = 4; tau < 40; tau++) {
    const frame = air.frames[tau - 1]
    for (let angle = 0; angle <= 50; angle += 0.25) {
      const height = frame.p.y + nose(angle).applyQuaternion(frame.q).y
      const miss = Math.abs(height - ballAtPop.y) + Math.abs(angle - PLAN.pop.angle) * 0.2
      if (miss < best.miss) best = { tau, angle, miss }
    }
  }
  const popFrame = air.frames[best.tau - 1]
  const jumpAt = ballAtPop.clone().sub(popFrame.p.clone().setY(popFrame.p.y - OCTANE.rest)).sub(nose(best.angle).applyQuaternion(popFrame.q))
  jumpAt.y = OCTANE.rest
  const jumpTick = popTouch - best.tau

  // 3. Between the landing and the jump: a powerslide past where the ball bounces, round to face it, then a nudge at it.
  const creep = 8
  const slideTicks = jumpTick - landed - creep
  const stopAt = jumpAt.clone().addScaledVector(ahead(airHeading), -((40 + PLAN.air.speed) / 2) * creep * TICK)
  mark("slide")
  frames.push(
    ...drive(
      { p: frames[landed].p, v: f.velocity },
      { p: stopAt, v: ahead(airHeading).multiplyScalar(40) },
      slideTicks,
      (s) => flickHeading + (airHeading - flickHeading) * smooth(0, 1, s),
    ),
  )
  frames.push(...drive({ p: stopAt, v: ahead(airHeading).multiplyScalar(40) }, { p: jumpAt, v: ahead(airHeading).multiplyScalar(PLAN.air.speed) }, creep, () => airHeading, () => true))

  // The pop and the air dribble, car and ball together from the jump.
  mark("pop")
  const ballAtJump = jumpTick < bounceTick ? flight(releaseAt, releaseV, jumpTick - releaseTick) : { p: bounce.at(jumpTick - bounceTick), v: bounce.v.clone().addScaledVector(DOWN, (jumpTick - bounceTick) * TICK) }
  const together = airDribble(airHeading, PLAN.air.speed, PLAN.airPlan, { p: ballAtJump.p.clone().sub(jumpAt).setY(ballAtJump.p.y), v: ballAtJump.v.clone() })
  const air0 = frames.length - 1
  frames.push(...together.frames.map((frame) => ({ ...frame, p: frame.p.clone().add(jumpAt).setY(frame.p.y) })))
  const landedAgain = frames.length - 1
  const touches = together.touches.map((t) => air0 + t)

  const parts: BallPart[] = [
    { kind: "fly", from: releaseTick, to: Math.min(bounceTick, jumpTick + 1), p: releaseAt, v: releaseV },
  ]
  if (jumpTick + 1 > bounceTick) parts.push({ kind: "fly", from: bounceTick, to: jumpTick + 1, p: bounce.p, v: bounce.v })
  parts.push({ kind: "track", from: jumpTick + 1, to: landedAgain + 1, points: together.balls.map((b) => b.clone().add(jumpAt).setY(b.y)) })

  // 5. The ball flies on from where the car let it go, bounces ahead of the landing car and drops onto its roof.
  const loose = { p: parts[parts.length - 1].kind === "track" ? (parts[parts.length - 1] as Extract<BallPart, { kind: "track" }>).points.at(-1)!.clone() : new Vector3(), v: together.ball!.v.clone() }
  const roofHeight = OCTANE.rest + ROOF.y
  let catchTick = 0
  let catchBall = new Vector3()
  let catchV = new Vector3()
  const after: Vector3[] = []
  {
    const p = loose.p.clone()
    const v = loose.v.clone()
    let bounces = 0
    for (let tick = landedAgain + 1; tick < landedAgain + 600; tick++) {
      const was = p.y
      v.addScaledVector(DOWN, TICK)
      p.addScaledVector(v, TICK)
      if (p.y < R) {
        p.y = R
        bounceOff(v)
        bounces++
      }
      after.push(p.clone())
      if (bounces > 0 && was > roofHeight && p.y <= roofHeight && v.y < 0 && tick - landedAgain > 40) {
        catchTick = tick
        catchBall = p.clone()
        catchV = v.clone()
        break
      }
    }
  }
  parts.push({ kind: "track", from: landedAgain + 1, to: catchTick, points: after })
  const groundTick = landedAgain
  // The car lands, brakes to let the ball bounce ahead, and gets under it for the catch, then carries it on.
  const catchCar = catchBall.clone().sub(ROOF.clone().applyQuaternion(yaw(endHeading)))
  catchCar.y = OCTANE.rest
  const catchVelocity = catchV.clone().setY(0)
  const brakeAt = landedAgain + Math.min(24, Math.round((catchTick - landedAgain) / 3))
  const brakeV = together.velocity.clone().multiplyScalar(0.1)
  const brakePoint = frames[landedAgain].p.clone().addScaledVector(together.velocity.clone().add(brakeV), ((brakeAt - landedAgain) * TICK) / 2)
  const turnTo = (from: number, to: number) => (s: number) => from + (to - from) * smooth(0, 1, s)
  const midHeading = airHeading + (endHeading - airHeading) * 0.3
  mark("land")
  frames.push(...drive({ p: frames[landedAgain].p, v: together.velocity }, { p: brakePoint, v: brakeV }, brakeAt - landedAgain, turnTo(airHeading, midHeading)))
  // It meets the ball facing the way the ball is going, then turns with it to carry it on.
  frames.push(...drive({ p: brakePoint, v: brakeV }, { p: catchCar, v: catchVelocity }, catchTick - brakeAt, turnTo(midHeading, headingOf(catchVelocity))))
  beats.push({ name: "catch", tick: catchTick })
  const afterCatch = PLAN.finish.afterCatch
  const end = { p: catchCar.clone().addScaledVector(ahead(endHeading), ((catchVelocity.length() + dribble.speed) / 2) * afterCatch * TICK), v: ahead(endHeading).multiplyScalar(dribble.speed) }
  frames.push(...drive({ p: catchCar, v: catchVelocity }, end, afterCatch))

  const drop = -catchV.y
  parts.unshift({ kind: "ride", from: 0, to: releaseTick, caught: catchTick - (frames.length - 1), drop })
  parts.push({ kind: "ride", from: catchTick, to: frames.length, caught: catchTick, drop })

  return { frames, parts, beats, touches, catchTick, releaseTick, groundTick, bounceTick, landedAgain }
}

/** A ball flying from `p` at `v`, `ticks` later. */
function flight(p: Vector3, v: Vector3, ticks: number): BallState {
  const t = ticks * TICK
  return { p: p.clone().addScaledVector(v, t).addScaledVector(DOWN, 0.5 * t * t), v: v.clone().addScaledVector(DOWN, t) }
}

/** A ball flying from `p` at `v`, reaching the ground after `seconds` and bouncing: its bounce and its flight after. */
function bounced(p: Vector3, v: Vector3, seconds: number) {
  const at = p.clone().addScaledVector(v, seconds).addScaledVector(DOWN, 0.5 * seconds * seconds).setY(R)
  const out = bounceOff(v.clone().addScaledVector(DOWN, seconds))
  return {
    p: at,
    v: out,
    at: (ticks: number) => {
      const t = ticks * TICK
      return at.clone().addScaledVector(out, t).addScaledVector(DOWN, 0.5 * t * t)
    },
  }
}

export type Moment = ReturnType<typeof buildMoment>

/**
 * The whole loop, tick by tick: the car's place and orientation, the ball's, and whether the car is boosting.
 * Arrays of `ticks` entries (3 numbers a place, 4 an orientation).
 */
export function buildMoment() {
  const h = half()
  const n = h.frames.length
  // The middle: halfway between where the half starts and where it ends, so the turned half picks up where it left off.
  const middle = h.frames[0].p.clone().add(h.frames[n - 1].p).multiplyScalar(0.5)
  middle.y = 0
  const ticks = 2 * (n - 1)
  const car = { p: new Float32Array(ticks * 3), q: new Float32Array(ticks * 4) }
  const ball = { p: new Float32Array(ticks * 3), q: new Float32Array(ticks * 4) }
  const boost = new Uint8Array(ticks)

  // The ball's place over the half.
  const ballAt: Vector3[] = []
  for (let i = 0; i < n; i++) {
    const part = h.parts.find((p) => i >= p.from && i < p.to) ?? h.parts[h.parts.length - 1]
    if (part.kind === "ride") {
      const frame = h.frames[i]
      // Caught, the ball hops on the roof and settles; riding, it rocks a little as the car balances it.
      const offset = ROOF.clone().add(new Vector3(3 * Math.sin((12 * Math.PI * i) / (n - 1)), hop(i - part.caught, part.drop), 0))
      ballAt.push(frame.p.clone().add(offset.applyQuaternion(yaw(frame.heading ?? 0))))
    } else if (part.kind === "track") {
      ballAt.push(part.points[Math.min(part.points.length - 1, i - part.from)].clone())
    } else {
      const t = (i - part.from) * TICK
      ballAt.push(part.p.clone().addScaledVector(part.v, t).addScaledVector(DOWN, 0.5 * t * t))
    }
  }

  const turnHalf = yaw(Math.PI)
  for (let i = 0; i < ticks; i++) {
    const second = i >= n - 1
    const j = second ? i - (n - 1) : i
    const frame = h.frames[j]
    const p = frame.p.clone().sub(middle)
    const q = frame.q.clone()
    const b = ballAt[j].clone().sub(middle)
    if (second) {
      p.applyQuaternion(turnHalf)
      b.applyQuaternion(turnHalf)
      q.premultiply(turnHalf)
    }
    p.toArray(car.p, i * 3)
    q.toArray(car.q, i * 4)
    b.toArray(ball.p, i * 3)
    boost[i] = frame.boost ? 1 : 0
  }

  // The ball spins as it rolls through the air: about the axis across its path, as fast as it travels.
  const spin = new Quaternion()
  const step = new Quaternion()
  for (let i = 0; i < ticks; i++) {
    const a = new Vector3().fromArray(ball.p, i * 3)
    const b = new Vector3().fromArray(ball.p, ((i + 1) % ticks) * 3)
    const move = b.sub(a)
    const axis = new Vector3(move.z, 0, -move.x)
    const angle = (axis.length() / R) * 0.6
    if (angle > 0) spin.premultiply(step.setFromAxisAngle(axis.normalize(), angle))
    spin.toArray(ball.q, i * 4)
  }
  // Whatever turn is left at the end is spread over the loop, so the ball's last tick meets its first.
  const left = spin.clone().invert()
  for (let i = 0; i < ticks; i++) {
    const q = new Quaternion().fromArray(ball.q, i * 4)
    q.premultiply(new Quaternion().slerp(left, i / ticks)).toArray(ball.q, i * 4)
  }

  const beats = [...h.beats, ...h.beats.map((b) => ({ name: b.name, tick: b.tick + n - 1 }))]
  // The still frame for whoever asks for less motion: the car under the ball, boosting, in the first air dribble.
  const pop = h.beats.find((b) => b.name === "pop")!.tick
  let stillTick = pop + 60
  while (stillTick < pop + 110 && !boost[stillTick]) stillTick++
  return { ticks, seconds: ticks * TICK, still: stillTick * TICK, car, ball, boost, beats, half: h, middle }
}

const scratch = { p: new Vector3(), a: new Quaternion(), b: new Quaternion() }
/** The loop at `seconds` (wrapped), into `out`: places and orientations between ticks. Allocates nothing. */
export function sample(moment: Moment, seconds: number, out: { car: Frame; ball: { p: Vector3; q: Quaternion } }) {
  const t = (((seconds / TICK) % moment.ticks) + moment.ticks) % moment.ticks
  const i = Math.floor(t)
  const j = (i + 1) % moment.ticks
  const k = t - i
  const { p, a, b } = scratch
  out.car.p.fromArray(moment.car.p, i * 3).lerp(p.fromArray(moment.car.p, j * 3), k)
  out.car.q.slerpQuaternions(a.fromArray(moment.car.q, i * 4), b.fromArray(moment.car.q, j * 4), k)
  out.car.boost = moment.boost[i] === 1
  out.ball.p.fromArray(moment.ball.p, i * 3).lerp(p.fromArray(moment.ball.p, j * 3), k)
  out.ball.q.slerpQuaternions(a.fromArray(moment.ball.q, i * 4), b.fromArray(moment.ball.q, j * 4), k)
  return out
}

/** For checking the loop: how deep the ball ever goes into the car or the ground, and each touch's push. */
export function audit(moment: Moment) {
  let worst = { overlap: -Infinity, tick: 0 }
  let ground = Infinity
  for (let i = 0; i < moment.ticks; i++) {
    const ball = new Vector3().fromArray(moment.ball.p, i * 3)
    const frame = { p: new Vector3().fromArray(moment.car.p, i * 3), q: new Quaternion().fromArray(moment.car.q, i * 4), boost: false }
    const o = contact(ball, frame).overlap
    if (o > worst.overlap) worst = { overlap: o, tick: i }
    ground = Math.min(ground, ball.y - R)
  }
  return { worst, ground }
}

export { contact }
