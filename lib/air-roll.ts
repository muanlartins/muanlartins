import { Quaternion, Vector3 } from "three"

/**
 * A car's spin in the air, tick for tick as RocketSim (github.com/ZealanL/RocketSim) moves it, ported from
 * muanlartins/losfeld-visualizer's physics.js: the stick's torque, the air's damping, the game's cap on spin.
 *
 * Car frame: forward = +X, up = +Y, right = +Z.
 */
export const TICK = 1 / 120

const SCALE = ((2 * Math.PI) / 65536) * 1000
const TORQUE = { roll: 400 * SCALE, pitch: 130 * SCALE, yaw: 95 * SCALE }
const DAMPING = { roll: 50 * SCALE, pitch: 30 * SCALE, yaw: 20 * SCALE }
/** The game's cap on a car's spin, in radians a second. */
export const MAX_SPIN = 5.5
const ROLL = new Vector3(1, 0, 0)
const PITCH = new Vector3(0, 0, 1)
const YAW = new Vector3(0, -1, 0)

/** A car's orientation and its spin (radians a second, in the world). */
export type Spin = { orientation: Quaternion; omega: Vector3 }
/** The stick, each from -1 to 1: `pitch` 1 lifts the nose, `yaw` 1 turns it left, `roll` 1 rolls right. */
export type Stick = { roll?: number; pitch?: number; yaw?: number }

/** One tick of the stick's torque and the air's damping on the spin (it doesn't move the car yet). */
export function steer(car: Spin, { roll = 0, pitch = 0, yaw = 0 }: Stick) {
  const local = car.omega.clone().applyQuaternion(car.orientation.clone().invert())
  const w = { roll: local.dot(ROLL), pitch: local.dot(PITCH), yaw: local.dot(YAW) }
  const torque = new Vector3()
    .addScaledVector(ROLL, TORQUE.roll * roll - DAMPING.roll * w.roll)
    .addScaledVector(PITCH, TORQUE.pitch * pitch - DAMPING.pitch * (1 - Math.abs(pitch)) * w.pitch)
    .addScaledVector(YAW, TORQUE.yaw * yaw - DAMPING.yaw * (1 - Math.abs(yaw)) * w.yaw)
    .applyQuaternion(car.orientation)
  car.omega.addScaledVector(torque, TICK)
}

/** One tick of the car turning at its spin; the game caps the spin after moving the car. */
export function turn(car: Spin) {
  const turned = car.omega.length() * TICK
  if (turned > 0) car.orientation.premultiply(new Quaternion().setFromAxisAngle(car.omega.clone().normalize(), turned)).normalize()
  if (car.omega.length() > MAX_SPIN) car.omega.setLength(MAX_SPIN)
}

/**
 * A car air rolling in place with Losfeld's clock: air roll held, and the stick circling against the roll once per
 * revolution, which keeps the car going straight.
 * `airRoll`: -1 left, 1 right. `turn`: the stick's way round (-1 clockwise). `start`: its first angle, 0 = far right.
 */
function airRoll({ airRoll = -1, turn: way = -1, start = 0 } = {}) {
  const car: Spin = { orientation: new Quaternion(), omega: new Vector3() }
  let rolled = 0

  function step() {
    const angle = start + way * Math.abs(rolled)
    steer(car, { roll: airRoll, pitch: -Math.sin(angle), yaw: Math.cos(angle) })
    rolled += car.omega.dot(ROLL.clone().applyQuaternion(car.orientation)) * TICK
    turn(car)
  }

  return { orientation: car.orientation, step }
}

/**
 * The same air roll recorded tick by tick, to play forwards and backwards:
 * `at(tick)` gives the car's orientation at any (fractional) tick.
 */
export function airRollReplay(options?: Parameters<typeof airRoll>[0]) {
  const car = airRoll(options)
  const ticks = [car.orientation.clone()]

  function at(tick: number, out = new Quaternion()) {
    const t = Math.max(0, tick)
    while (ticks.length < Math.floor(t) + 2) {
      car.step()
      ticks.push(car.orientation.clone())
    }
    const index = Math.floor(t)
    return out.slerpQuaternions(ticks[index], ticks[index + 1], t - index)
  }

  return { at }
}
