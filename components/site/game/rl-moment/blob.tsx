"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, type RefObject } from "react"
import { Color, ShaderMaterial, type Group, type Mesh } from "three"
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

/** A shadow under something on the ground; `turn` makes it follow that group's heading. */
export function Blob({ width, depth, opacity, turn }: { width: number; depth: number; opacity: number; turn?: RefObject<Group | null> }) {
  const material = useShadowMaterial(opacity)
  const mesh = useRef<Mesh>(null)
  useFrame(() => {
    if (mesh.current && turn?.current) mesh.current.rotation.z = turn.current.rotation.y
  })
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position={[0, 0.5, 0]} scale={[width, depth, 1]} material={material} renderOrder={0}>
      <planeGeometry />
    </mesh>
  )
}
