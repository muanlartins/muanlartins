import { Quaternion, Vector3 } from "three"

/**
 * A car air rolling in place with Losfeld's clock: air roll held, and the
 * stick circling against the roll once per revolution, which keeps the car
 * going straight. The spin follows RocketSim (github.com/ZealanL/RocketSim)
 * tick for tick, ported from muanlartins/losfeld-visualizer's physics.js.
 *
 * Car frame: forward = +X, up = +Y, right = +Z.
 */
const TICK = 1 / 120

const SCALE = ((2 * Math.PI) / 65536) * 1000
const TORQUE = { roll: 400 * SCALE, pitch: 130 * SCALE, yaw: 95 * SCALE }
const DAMPING = { roll: 50 * SCALE, pitch: 30 * SCALE, yaw: 20 * SCALE }
const MAX_SPIN = 5.5
const ROLL = new Vector3(1, 0, 0)
const PITCH = new Vector3(0, 0, 1)
const YAW = new Vector3(0, -1, 0)

/** `airRoll`: -1 left, 1 right. `turn`: the stick's way round (-1 clockwise). `start`: its first angle, 0 = far right. */
function airRoll({ airRoll = -1, turn = -1, start = 0 } = {}) {
  const orientation = new Quaternion()
  const omega = new Vector3()
  let rolled = 0

  function step() {
    const angle = start + turn * Math.abs(rolled)
    const [roll, pitch, yaw] = [airRoll, -Math.sin(angle), Math.cos(angle)]

    const local = omega.clone().applyQuaternion(orientation.clone().invert())
    const w = { roll: local.dot(ROLL), pitch: local.dot(PITCH), yaw: local.dot(YAW) }
    const torque = new Vector3()
      .addScaledVector(ROLL, TORQUE.roll * roll - DAMPING.roll * w.roll)
      .addScaledVector(PITCH, TORQUE.pitch * pitch - DAMPING.pitch * (1 - Math.abs(pitch)) * w.pitch)
      .addScaledVector(YAW, TORQUE.yaw * yaw - DAMPING.yaw * (1 - Math.abs(yaw)) * w.yaw)
      .applyQuaternion(orientation)

    omega.addScaledVector(torque, TICK)
    rolled += omega.dot(ROLL.clone().applyQuaternion(orientation)) * TICK
    const turned = omega.length() * TICK
    if (turned > 0) orientation.premultiply(new Quaternion().setFromAxisAngle(omega.clone().normalize(), turned)).normalize()
    // The game caps spin speed after moving the car.
    if (omega.length() > MAX_SPIN) omega.setLength(MAX_SPIN)
  }

  return { orientation, step }
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
