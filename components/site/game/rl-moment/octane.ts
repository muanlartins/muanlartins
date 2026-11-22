import type { MeshPhysicalMaterial, Object3D } from "three"
import { findPaint } from "@/components/site/roadmap/garage"
import { BRAND } from "./palette"

export const CAR = "/models/octane.glb"
export const BALL = "/models/ball.glb"
/** The Octane's body, nose to tail, in uu (the model is the game's, at the game's size). */
export const OCTANE_LENGTH = 134.8

/** The body in the brand's Klein, metallic like a showroom's paint. */
export function paintOctane(car: Object3D) {
  const paint = findPaint(car) as MeshPhysicalMaterial | undefined
  if (!paint) return
  paint.color.set(BRAND.klein)
  paint.metalness = 0.7
  paint.roughness = 0.28
}
