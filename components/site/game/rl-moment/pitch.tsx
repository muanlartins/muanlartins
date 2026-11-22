"use client"

import { useThree } from "@react-three/fiber"
import { useMemo } from "react"
import { Color, DoubleSide, ShaderMaterial, Vector2, Vector3 } from "three"
import { BRAND } from "./palette"

/** The lattice's cell on the pitch, in uu: the site's 24 px motif, drawn on the ground. */
const CELL = 160

/** Where the pitch's lines are, in the scene (uu): the centre spot, and the goal's line with the box in front of it. */
export type Field = { centre: [number, number]; goalZ: number; goalX: number; boxDepth: number; boxHalf: number }
/** Rocket League's centre circle, in uu. */
const CIRCLE = 1000

const vertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uInk;
  uniform vec3 uPaint;
  uniform vec2 uViewport;
  uniform vec3 uCamera;
  uniform float uCell;
  uniform float uGoalZ;
  uniform float uGoalX;
  uniform float uBoxDepth;
  uniform float uBoxHalf;
  uniform vec2 uCentre;
  uniform float uCircle;
  varying vec3 vWorld;

  // A hairline every cell, one screen pixel wide wherever it is, fading out before its lines crowd into a blur.
  float rule(float c) {
    float w = fwidth(c);
    float d = abs(fract(c - 0.5) - 0.5) / max(w, 1e-4);
    return (1.0 - min(d, 1.0)) * (1.0 - smoothstep(0.05, 0.22, w));
  }
  // A painted line reaching "reach" uu either side of d = 0, kept at least a pixel wide (and fainter when thinner).
  float paint(float d, float reach) {
    float w = fwidth(d);
    float h = max(reach, w * 0.75);
    return (1.0 - smoothstep(h - w, h + w, abs(d))) * min(1.0, reach / max(w * 0.75, 1e-4) + 0.35);
  }

  void main() {
    vec2 p = vWorld.xz;
    float lattice = max(rule((p.x + p.y) / uCell), rule((p.x - p.y) / uCell));

    float x = p.x - uGoalX;
    float goalLine = paint(p.y - uGoalZ, 9.0);
    float box = paint(abs(x) - uBoxHalf, 9.0) * step(uGoalZ, p.y) * step(p.y, uGoalZ + uBoxDepth);
    float centre = max(paint(p.y - uCentre.y, 9.0), paint(length(p - uCentre) - uCircle, 9.0));
    float lines = max(goalLine, max(box, centre));

    // The pitch thins into the page at the canvas' edges and far away, so it never ends in a hard line.
    vec2 uv = gl_FragCoord.xy / uViewport;
    float edge = smoothstep(0.0, 0.16, uv.x) * smoothstep(0.0, 0.16, 1.0 - uv.x) * smoothstep(0.0, 0.22, uv.y);
    // Far off, it dissolves towards the horizon over a few degrees of the view, so its edge is a gradient, not a band.
    float distance = length(p - uCamera.xz);
    float far = smoothstep(0.004, 0.045, atan(uCamera.y, distance));

    vec3 color = mix(uBase, uInk, lattice * 0.2);
    // Far off, the lines thin into the ground rather than stack into bands.
    color = mix(color, uPaint, lines * 0.9 * (1.0 - smoothstep(1800.0, 4200.0, distance)));
    gl_FragColor = vec4(color, edge * far * 0.92);
  }
`

/**
 * The pitch: a pale Klein ground with the lattice drawn on it and a few of the field's lines (the centre line and
 * circle, the goal's line and its box) in Branco, thinning into the page at every edge. At the far end, a goal in Klein
 * with a lattice for a net.
 */
export function Pitch({ field }: { field: Field }) {
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const camera = useThree((state) => state.camera)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          // The ground a step into Klein, so the pitch reads as a surface on the page.
          uBase: { value: new Color(BRAND.ground).lerp(new Color(BRAND.klein), 0.1) },
          uInk: { value: new Color(BRAND.klein) },
          uPaint: { value: new Color(BRAND.paper) },
          uViewport: { value: new Vector2(1, 1) },
          uCamera: { value: new Vector3() },
          uCell: { value: CELL },
          uGoalZ: { value: field.goalZ },
          uGoalX: { value: field.goalX },
          uBoxDepth: { value: field.boxDepth },
          uBoxHalf: { value: field.boxHalf },
          uCentre: { value: new Vector2(...field.centre) },
          uCircle: { value: CIRCLE },
        },
      }),
    [field],
  )
  material.uniforms.uViewport.value.set(size.width * dpr, size.height * dpr)
  material.uniforms.uCamera.value.copy(camera.position)

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, field.goalZ / 2]} material={material} renderOrder={-1}>
        <planeGeometry args={[18000, 18000]} />
      </mesh>
      <Goal x={field.goalX} z={field.goalZ} />
    </>
  )
}

/** Rocket League's goal: 1786 uu between the posts, 643 high, 880 deep. */
const GOAL = { half: 893, height: 643, depth: 880, post: 14 }

const netFragment = /* glsl */ `
  uniform vec3 uInk;
  uniform float uCell;
  varying vec3 vWorld;
  float rule(float c) {
    float w = fwidth(c);
    float d = abs(fract(c - 0.5) - 0.5) / max(w, 1e-4);
    return (1.0 - min(d, 1.0)) * (1.0 - smoothstep(0.2, 0.5, w));
  }
  void main() {
    vec2 p = vec2(vWorld.x + vWorld.z, vWorld.y);
    float net = max(rule((p.x + p.y) / uCell), rule((p.x - p.y) / uCell));
    gl_FragColor = vec4(uInk, net * 0.22);
  }
`

function Goal({ x, z }: { x: number; z: number }) {
  const net = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: netFragment,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: { uInk: { value: new Color(BRAND.klein) }, uCell: { value: 90 } },
      }),
    [],
  )
  const { half, height, depth, post } = GOAL
  return (
    <group position={[x, 0, z]}>
      {[-half, half].map((side) => (
        <mesh key={side} position={[side, height / 2, 0]}>
          <boxGeometry args={[post * 2, height, post * 2]} />
          <meshStandardMaterial color={BRAND.klein} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[half * 2 + post * 2, post * 2, post * 2]} />
        <meshStandardMaterial color={BRAND.klein} roughness={0.5} />
      </mesh>
      {/* The net: its back, its roof and its sides. */}
      <mesh position={[0, height / 2, -depth]} material={net}>
        <planeGeometry args={[half * 2, height]} />
      </mesh>
      <mesh position={[0, height, -depth / 2]} rotation-x={Math.PI / 2} material={net}>
        <planeGeometry args={[half * 2, depth]} />
      </mesh>
      {[-half, half].map((side) => (
        <mesh key={side} position={[side, height / 2, -depth / 2]} rotation-y={Math.PI / 2} material={net}>
          <planeGeometry args={[depth, height]} />
        </mesh>
      ))}
    </group>
  )
}
