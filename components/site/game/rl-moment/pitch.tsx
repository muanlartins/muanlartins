"use client"

import { useThree } from "@react-three/fiber"
import { useMemo } from "react"
import { Color, ShaderMaterial, Vector2 } from "three"
import { BRAND } from "./palette"

/** The lattice's cell on the floor (uu): the site's motif, two sets of lines at 45°. */
const CELL = 220
/** The centre circle's radius and the painted lines' half width (uu). */
const CIRCLE = 620
const LINE = 11

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
  uniform vec3 uTile;
  uniform vec3 uInk;
  uniform vec3 uPaint;
  uniform vec2 uViewport;
  uniform float uCell;
  uniform float uCircle;
  uniform float uLine;
  varying vec3 vWorld;

  // A line at each whole number of c, "px" screen pixels wide wherever it is, gone before they'd crowd into a blur.
  float rule(float c, float px) {
    float w = max(fwidth(c), 1e-4);
    float d = abs(fract(c - 0.5) - 0.5) / w;
    return (1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, d)) * (1.0 - smoothstep(0.1, 0.3, w));
  }
  // A painted line at d = 0, "reach" uu either side.
  float paint(float d, float reach) {
    float w = fwidth(d);
    float h = max(reach, w);
    return 1.0 - smoothstep(h - w, h + w, abs(d));
  }

  void main() {
    vec2 p = vWorld.xz;
    vec2 cell = vec2(p.x + p.y, p.x - p.y) / uCell;
    // Every other diamond a step darker, so the floor reads as laid, and how fast the play crosses it shows.
    float tile = mod(floor(cell.x) + floor(cell.y), 2.0);
    float lattice = max(rule(cell.x, 1.0), rule(cell.y, 1.0));
    float r = length(p);
    float lines = max(max(paint(p.x, uLine), paint(r - uCircle, uLine)), 1.0 - smoothstep(48.0, 54.0, r));

    vec3 color = mix(uBase, uTile, tile);
    color = mix(color, uInk, lattice * 0.38);
    color = mix(color, uPaint, lines);

    // It thins into the page at every edge of the box, so it never ends in a hard line.
    vec2 uv = gl_FragCoord.xy / uViewport;
    float edge = smoothstep(0.0, 0.14, uv.x) * smoothstep(0.0, 0.14, 1.0 - uv.x) * smoothstep(0.0, 0.14, uv.y) * smoothstep(0.17, 0.62, 1.0 - uv.y);
    gl_FragColor = vec4(color, edge);
    #include <colorspace_fragment>
  }
`

/**
 * The floor: the brand's lattice laid in two tints of Klein, with the pitch's centre line, circle and spot in Branco,
 * thinning into the page at every edge.
 */
export function Pitch() {
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uBase: { value: new Color(BRAND.ground).lerp(new Color(BRAND.kleinClaro), 0.45) },
          uTile: { value: new Color(BRAND.ground).lerp(new Color(BRAND.kleinClaro), 0.68) },
          uInk: { value: new Color(BRAND.klein) },
          uPaint: { value: new Color(BRAND.paper) },
          uViewport: { value: new Vector2(1, 1) },
          uCell: { value: CELL },
          uCircle: { value: CIRCLE },
          uLine: { value: LINE },
        },
      }),
    [],
  )
  material.uniforms.uViewport.value.set(size.width * dpr, size.height * dpr)

  return (
    <mesh rotation-x={-Math.PI / 2} material={material} renderOrder={-1}>
      <planeGeometry args={[24000, 24000]} />
    </mesh>
  )
}
