"use client"

import { useMemo } from "react"
import { Color, ShaderMaterial } from "three"
import { BRAND } from "./palette"

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    gl_FragColor = vec4(uColor, uOpacity * (1.0 - smoothstep(0.15, 1.0, d)));
  }
`

/** A soft shadow on the ground: an ellipse `width` by `depth` uu, in navy. */
export function useShadowMaterial(opacity: number) {
  return useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: new Color(BRAND.navy) }, uOpacity: { value: opacity } },
      }),
    [opacity],
  )
}
