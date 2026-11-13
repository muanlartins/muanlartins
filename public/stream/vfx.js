// Valorant's own effects on the camera (filtros.html): a small particle system that draws the game's textures
// with the values from its particle systems (Cascade: lifetimes, sizes, HDR colours, curves over life), in the 3D
// camera's space (centimetres, like the game), into a half-float target that's tone mapped (ACES, with a bloom
// from its mipmaps) over the camera, so colours like the game's (30, 3, 1.75) come out white-hot in the middle
// and orange at the edges, as they do there.
//
// The textures are extracted from the installed game into privado/valorant/<agent>/ (gitignored, never
// published: see its README.txt); without them `ok` turns false.
import * as THREE from "three"

const ROOT = "privado/valorant/"
const P = "phoenix/files/ShooterGame/Content/"
// Each texture: its path, where its mask is ("a" alpha, "r" red, "g" green, "max" the brightest of the colours, for
// textures that pack strands in different colours), its flipbook's columns and rows, and whether its colour
// channels shade it (the flipbooks' grey base with brighter detail), and whether it needs fading at the quad's
// edge (a starburst whose rays run off it would show the sprite's square under bright colours). Each agent's
// effects add their own (addTextures).
const TEX = {
  flare: [P + "Characters/Phoenix/S0/VFX/Textures/solar_flare_4x4", "a", [4, 4], 0.6],
  embers: [P + "VFX/Textures/Old/DebrisBlur_TEX", "a", [2, 2], 0],
  glow: [P + "VFX/Textures/AlphaGradient/GlowA01_DIFF", "r", [1, 1], 0],
  star: [P + "VFX/Textures/Mask/FlashLocation_TEX", "r", [1, 1], 0, true],
  shaft: [P + "VFX/Textures/Mask/LightShaft_TEX", "r", [1, 1], 0],
  wiggly: [P + "VFX/Textures/AlphaGradient/T_Mask_Ramp_Bar_Horizontal_Wiggly_Center", "r", [1, 1], 0],
  pan: [P + "Characters/Phoenix/S0/VFX/Textures/Phoenix_FirePan_TFX", "r", [1, 1], 0],
  radial: [P + "Characters/Phoenix/S0/VFX/Textures/phoenix_radial_burst", "a", [4, 2], 0.5],
  muzzle: [P + "VFX/Textures/Mask/GMuzzleB_TEX", "r", [2, 2], 0, true],
  flame: [P + "Characters/Phoenix/S0/VFX/Textures/Phoenix_Molotov_Flame", "r", [1, 1], 0],
  flameB: [P + "Characters/Phoenix/S0/VFX/Textures/Phoenix_Molotov_Flame_b", "r", [1, 1], 0],
  wallEquip: [P + "Characters/Phoenix/S0/VFX/Textures/Wall_Equip_FlameAnim", "a", [2, 4], 0.5],
  ballInner: [P + "Characters/Phoenix/S0/VFX/Textures/FireBallShapesInner_TFX", "r", [8, 1], 0],
  smoke: [P + "VFX/Textures/Flipbook/burst_anim2", "a", [8, 2], 0.6],
  wrap: [P + "VFX/Radianite/Textures/Smoke_wraparound", "a", [1, 1], 0],
  ground: [P + "VFX/Radianite/Textures/Radianite_radial_burst", "r", [1, 1], 0],
  circle: [P + "Characters/Phoenix/S0/VFX/Textures/T_Mask_Circle_Gradient_02", "r", [1, 1], 0],
  collapse: [P + "VFX/Textures/Flipbook/flash_energy_collapse", "a", [4, 4], 0.4],
  crawl: [P + "VFX/Textures/Mask/FireCrawlA01", "r", [1, 1], 0],
}
export const addTextures = (t) => Object.assign(TEX, t)
// How the composite grades each agent's colours before its tone mapper (see uTint below).
export const TINTS = { phoenix: [1, 0.85, 0.38], sova: [1, 1, 1], sage: [1, 1, 1] }

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (v) => (Array.isArray(v) ? rand(v[0], v[1]) : v)
const lerp = (a, b, t) => a + (b - a) * t
// A curve given as values spread evenly over the particle's life.
function curve(c, t) {
  if (c === undefined) return 1
  if (!Array.isArray(c)) return c
  if (c.length === 1) return c[0]
  const x = Math.min(0.9999, Math.max(0, t)) * (c.length - 1)
  const i = Math.floor(x)
  return lerp(c[i], c[i + 1], x - i)
}

export function createVfx(renderer, camera) {
  const vfx = { ok: true, loaded: 0, scene: new THREE.Scene(), systems: [] }
  const loader = new THREE.TextureLoader()
  const textures = {}
  function tex(key) {
    if (textures[key]) return textures[key]
    const t = loader.load(
      ROOT + TEX[key][0] + ".png",
      () => vfx.loaded++,
      undefined,
      () => (vfx.ok = false),
    )
    t.colorSpace = THREE.NoColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return (textures[key] = t)
  }

  // ---- the sprites: one instanced quad per emitter definition, its particles in camera space ----
  const quad = new THREE.PlaneGeometry(1, 1)
  const MAX = 220
  const BLEND = {
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  }
  const spriteVert = /* glsl */ `
    attribute vec3 iPos;
    attribute vec4 iColor;
    attribute vec4 iMisc;
    attribute vec3 iDir;
    uniform float uAlign;
    uniform float uPivot;
    uniform float uUvRot;
    varying vec2 vUv;
    varying vec4 vColor;
    varying float vFrame;
    void main() {
      vec4 c = modelViewMatrix * vec4(iPos, 1.0);
      float ang = iMisc.z;
      // Velocity-aligned sprites stretch along where they're going (their height along it).
      if (uAlign > 0.5) {
        vec3 d = (modelViewMatrix * vec4(iDir, 0.0)).xyz;
        if (dot(d.xy, d.xy) > 1e-8) ang = atan(d.y, d.x) - 1.5707963;
      }
      // A beam's pivot is its start (the sprite runs from there along its direction).
      vec2 o = (position.xy + vec2(0.0, uPivot * 0.5)) * iMisc.xy;
      float cs = cos(ang), sn = sin(ang);
      c.xy += vec2(o.x * cs - o.y * sn, o.x * sn + o.y * cs);
      gl_Position = projectionMatrix * c;
      vUv = uUvRot > 0.5 ? vec2(uv.y, 1.0 - uv.x) : uv;
      vColor = iColor;
      vFrame = iMisc.w;
    }`
  const spriteFrag = /* glsl */ `
    uniform sampler2D uTex;
    uniform vec2 uGrid;
    uniform vec4 uMaskW;
    uniform float uMaskMax;
    uniform float uShade;
    uniform float uAdd;
    uniform float uBlendFrames;
    uniform float uFloor;
    uniform float uRound;
    varying vec2 vUv;
    varying vec4 vColor;
    varying float vFrame;
    vec2 cell(float f) {
      f = clamp(f, 0.0, uGrid.x * uGrid.y - 1.0);
      float cx = mod(f, uGrid.x);
      float cy = floor(f / uGrid.x);
      return vec2((cx + vUv.x) / uGrid.x, 1.0 - (cy + 1.0 - vUv.y) / uGrid.y);
    }
    void main() {
      float f0 = floor(vFrame);
      vec4 t = texture2D(uTex, cell(f0));
      if (uBlendFrames > 0.5) t = mix(t, texture2D(uTex, cell(f0 + 1.0)), fract(vFrame));
      // The textures' faint background would glow under colours in the hundreds: cut it off.
      float m = smoothstep(uFloor, 1.0, uMaskMax > 0.5 ? max(t.r, max(t.g, t.b)) : dot(t, uMaskW));
      if (uRound > 0.5) m *= smoothstep(0.5, 0.3, length(vUv - 0.5));
      vec3 shade = mix(vec3(1.0), t.rgb * 2.2, uShade);
      float a = m * vColor.a;
      gl_FragColor = vec4(vColor.rgb * shade * a, uAdd > 0.5 ? 0.0 : clamp(a, 0.0, 1.0));
    }`
  class Layer {
    constructor(def) {
      const [, maskCh, grid, shade, round] = TEX[def.tex]
      const geo = new THREE.InstancedBufferGeometry()
      geo.index = quad.index
      geo.setAttribute("position", quad.getAttribute("position"))
      geo.setAttribute("uv", quad.getAttribute("uv"))
      const attr = (n, size) => {
        const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX * size), size)
        a.setUsage(THREE.DynamicDrawUsage)
        geo.setAttribute(n, a)
        return a
      }
      this.aPos = attr("iPos", 3)
      this.aColor = attr("iColor", 4)
      this.aMisc = attr("iMisc", 4)
      this.aDir = attr("iDir", 3)
      geo.instanceCount = 0
      this.geo = geo
      this.frames = grid[0] * grid[1]
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTex: { value: tex(def.tex) },
          uGrid: { value: new THREE.Vector2(...grid) },
          uMaskW: { value: new THREE.Vector4(maskCh === "r" ? 1 : 0, maskCh === "g" ? 1 : 0, 0, maskCh === "a" ? 1 : 0) },
          uMaskMax: { value: maskCh === "max" ? 1 : 0 },
          uShade: { value: def.shade ?? shade },
          uAdd: { value: def.add ? 1 : 0 },
          uBlendFrames: { value: def.frames === "blend" ? 1 : 0 },
          uAlign: { value: def.align || def.beam ? 1 : 0 },
          uPivot: { value: def.beam ? 1 : 0 },
          uUvRot: { value: def.uvRot ? 1 : 0 },
          uFloor: { value: def.floor ?? 0.06 },
          uRound: { value: round ? 1 : 0 },
        },
        vertexShader: spriteVert,
        fragmentShader: spriteFrag,
        ...BLEND,
      })
      this.mesh = new THREE.Mesh(geo, mat)
      this.mesh.frustumCulled = false
      this.mesh.renderOrder = def.order ?? 0
      vfx.scene.add(this.mesh)
      this.ps = []
    }
  }
  const layers = new Map()
  const layerOf = (def) => {
    let l = layers.get(def)
    if (!l) layers.set(def, (l = new Layer(def)))
    return l
  }

  // ---- systems: emitters spawning from an anchor (a function giving a point in camera space each frame) ----
  const v = new THREE.Vector3()
  function emit(sys, def, n) {
    const l = layerOf(def)
    const k = sys.scale
    const at = sys.anchor(v.set(0, 0, 0)).clone()
    for (let i = 0; i < n && l.ps.length < MAX; i++) {
      const s0 = Array.isArray(def.size?.[0]) ? def.size.map((x) => x) : [def.size, def.size]
      const u = Math.random()
      const sw = lerp(s0[0][0] ?? s0[0], s0[1][0] ?? s0[1], def.sizeTogether === false ? Math.random() : u)
      const sh = lerp(s0[0][1] ?? s0[0], s0[1][1] ?? s0[1], def.sizeTogether === false ? Math.random() : u)
      const p = { age: 0, life: pick(def.life), sw: sw * k, sh: sh * k, rot: pick(def.rot ?? [0, 1]) * Math.PI * 2, spin: pick(def.spin ?? 0) * Math.PI * 2 }
      p.alpha = pick(def.alpha ?? 1)
      p.frame0 = def.frames === "random" || def.fps ? Math.floor(Math.random() * l.frames) : 0
      // Where it starts: on a sphere, a box, along a segment, or at the anchor.
      let ox = 0, oy = 0, oz = 0
      if (def.sphere) {
        const d = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(def.surface ? def.sphere : def.sphere * Math.cbrt(Math.random()))
        ox = d.x
        oy = d.y
        oz = d.z
      }
      if (def.offset) {
        ox += def.offset[0]
        oy += def.offset[1]
        oz += def.offset[2]
      }
      if (def.box) {
        ox += rand(-1, 1) * def.box[0]
        oy += rand(-1, 1) * def.box[1]
        oz += rand(-1, 1) * def.box[2]
      }
      ox *= k
      oy *= k
      oz *= k
      // Along a line (the wall), in camera space as it is.
      if (sys.segment) {
        const s = sys.segment(Math.random())
        ox += s.x
        oy += s.y
        oz += s.z
      }
      const vel = def.vel ? def.vel[0].map((a, j) => rand(a, def.vel[1][j]) * k) : [0, 0, 0]
      if (def.radial) {
        const len = Math.hypot(ox, oy, oz) || 1
        const r = pick(def.radial) * k
        vel[0] += (ox / len) * r
        vel[1] += (oy / len) * r
        vel[2] += (oz / len) * r
      }
      p.vel = vel
      // Along where a moving anchor went since the last frame (a trail stays continuous at any frame rate).
      let ax = at.x, ay = at.y, az = at.z
      if (def.interp && sys.prev) {
        const t = Math.random()
        ax = lerp(sys.prev.x, at.x, t)
        ay = lerp(sys.prev.y, at.y, t)
        az = lerp(sys.prev.z, at.z, t)
      }
      // A beam: from the system's start to its end (sys.beam() → [a, b]), its height the distance between.
      if (def.beam && sys.beam) {
        const [a, b] = sys.beam()
        const len = a.distanceTo(b)
        ax = a.x
        ay = a.y
        az = a.z
        p.dir = [b.x - a.x, b.y - a.y, b.z - a.z]
        p.sh = len * (def.beamLen ? pick(def.beamLen) : 1)
      } else if (def.align === "sys" && sys.dir) {
        const d = sys.dir()
        p.dir = [d.x, d.y, d.z]
      }
      if (def.local) Object.assign(p, { sys, ox, oy, oz, x: 0, y: 0, z: 0 })
      else Object.assign(p, { x: ax + ox, y: ay + oy, z: az + oz })
      l.ps.push(p)
    }
  }
  // spawn(defs, anchor, opts): a system of emitters, each def with its own delay, duration, rate and burst.
  vfx.spawn = (defs, anchor, opts = {}) => {
    const sys = { defs, anchor, t: 0, scale: opts.scale ?? 1, dur: opts.dur ?? Infinity, segment: opts.segment, beam: opts.beam, dir: opts.dir, stopped: false, acc: new Map(), burst: new Set(), prev: null }
    sys.stop = () => (sys.stopped = true)
    vfx.systems.push(sys)
    return sys
  }
  // Loads an agent's textures and builds its layers ahead (an effect's first use would otherwise be over before its
  // texture arrived): every def found in `tree` (a module of defs, nested as it likes).
  vfx.preload = (tree) => {
    const walk = (o) => {
      if (Array.isArray(o)) o.forEach(walk)
      else if (o && typeof o === "object") {
        if (typeof o.tex === "string" && TEX[o.tex]) layerOf(o)
        else Object.values(o).forEach(walk)
      }
    }
    walk(tree)
    renderer.compile(vfx.scene, camera)
  }
  vfx.clear = () => {
    vfx.systems.length = 0
    for (const l of layers.values()) l.ps.length = 0
  }
  vfx.active = () => vfx.systems.length > 0 || [...layers.values()].some((l) => l.ps.length) || orbs.some((o) => o.visible)

  vfx.update = (dt) => {
    for (const sys of vfx.systems) {
      sys.t += dt
      for (const def of sys.defs) {
        const t = sys.t - (def.delay ?? 0)
        if (t < 0 || sys.stopped) continue
        // A burst always goes off once, however long the frame (a one-off's whole system lasts a frame or two).
        if (def.burst && !sys.burst.has(def)) {
          sys.burst.add(def)
          emit(sys, def, def.burst)
        }
        if (def.rate && sys.t <= sys.dur && t < (def.dur ?? Infinity)) {
          const a = (sys.acc.get(def) || 0) + def.rate * dt
          const n = Math.floor(a)
          sys.acc.set(def, a - n)
          if (n) emit(sys, def, n)
        }
      }
      sys.prev = (sys.prev || new THREE.Vector3()).copy(sys.anchor(v.set(0, 0, 0)))
    }
    vfx.systems = vfx.systems.filter((s) => !s.stopped && (s.t <= s.dur + 0.05 || s.defs.some((d) => d.burst && !s.burst.has(d))))
    for (const [def, l] of layers) {
      l.ps = l.ps.filter((p) => (p.age += dt) < p.life)
      const drag = def.drag ?? 0
      const acc = def.accel || [0, 0, 0]
      l.ps.forEach((p, i) => {
        const t = p.age / p.life
        p.vel[0] += acc[0] * dt
        p.vel[1] += acc[1] * dt
        p.vel[2] += acc[2] * dt
        if (drag) for (let j = 0; j < 3; j++) p.vel[j] *= Math.max(0, 1 - drag * dt)
        p.rot += p.spin * dt
        let x, y, z
        if (p.sys) {
          p.ox += p.vel[0] * dt
          p.oy += p.vel[1] * dt
          p.oz += p.vel[2] * dt
          const a = p.sys.anchor(v.set(0, 0, 0))
          x = a.x + p.ox
          y = a.y + p.oy
          z = a.z + p.oz
        } else {
          x = p.x += p.vel[0] * dt
          y = p.y += p.vel[1] * dt
          z = p.z += p.vel[2] * dt
        }
        const sl = def.sizeLife
        const kx = sl?.x ? curve(sl.x, t) : curve(sl, t)
        const ky = sl?.y ? curve(sl.y, t) : curve(sl, t)
        const cs = curve(def.colorLife, t)
        const c0 = def.color || [1, 1, 1]
        const c = def.color2 ? [0, 1, 2].map((j) => lerp(c0[j], def.color2[j], t)) : c0
        const frame =
          def.frames === "life" || def.frames === "blend"
            ? t * (l.frames - (def.frames === "blend" ? 1.001 : 0.001))
            : def.frames === "random"
              ? p.frame0
              : def.fps
                ? (p.frame0 + Math.floor(p.age * def.fps)) % l.frames
                : 0
        l.aPos.setXYZ(i, x, y, z)
        l.aColor.setXYZW(i, c[0] * cs, c[1] * cs, c[2] * cs, p.alpha * curve(def.alphaLife, t))
        l.aMisc.setXYZW(i, p.sw * kx, p.sh * ky, p.rot, frame)
        const d = p.dir || p.vel
        l.aDir.setXYZ(i, d[0], d[1], d[2])
      })
      l.geo.instanceCount = l.ps.length
      for (const a of [l.aPos, l.aColor, l.aMisc, l.aDir]) a.needsUpdate = true
    }
    for (const o of orbs) if (o.visible) o.material.uniforms.uTime.value += dt
  }

  // ---- Curveball's orb: the game's is a dark core in a sphere of fire (Phoenix_E_FlashRing: Phoenix_FirePan
  // scrolling over Phoenix_Q_FlashBall, from ColorA (1.3, 0.1, 0.3) to ColorB (30, 1.8, 0.6)) with a fresnel rim
  // (Phoenix_E_Rim, (10, 1, 0.5)); here one sprite does all three. ----
  const orbs = []
  vfx.orb = () => {
    const m = new THREE.Mesh(
      quad,
      new THREE.ShaderMaterial({
        uniforms: {
          uPan: { value: tex("pan") },
          uTime: { value: 0 },
          uAmt: { value: 1 },
          uColA: { value: new THREE.Vector3(1.3, 0.1, 0.3) },
          uColB: { value: new THREE.Vector3(30, 1.8, 0.6) },
          uRim: { value: new THREE.Vector3(10, 1, 0.5) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            c.xy += position.xy * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
            gl_Position = projectionMatrix * c;
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uPan;
          uniform float uTime;
          uniform float uAmt;
          uniform vec3 uColA;
          uniform vec3 uColB;
          uniform vec3 uRim;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            if (r > 1.0) discard;
            float ang = atan(p.y, p.x) / 6.2831853;
            float core = 1.0 - smoothstep(0.5, 0.58, r);
            // The fire scrolls out from the core's edge (the mesh's V scroll of -4.5, seen edge on).
            float a1 = texture2D(uPan, vec2(ang * 2.0, r * 0.8 - uTime * 1.6)).r;
            float a2 = texture2D(uPan, vec2(ang * 3.0 + 0.37, r * 0.6 - uTime * 0.9)).r;
            float tx = a1 * a2;
            float shell = smoothstep(0.38, 0.6, r) * (1.0 - smoothstep(0.62 + tx * 0.35, 0.98, r));
            vec3 fire = mix(uColA, uColB, smoothstep(0.15, 0.9, tx)) * shell * tx * 1.6;
            float fres = pow(smoothstep(0.25, 0.58, r), 3.0) * core;
            vec3 e = fire + uRim * fres * 0.35;
            float a = max(core, shell * tx * 0.4);
            gl_FragColor = vec4(e * uAmt, a * uAmt);
          }`,
        ...BLEND,
      }),
    )
    m.frustumCulled = false
    m.renderOrder = 5
    m.visible = false
    vfx.scene.add(m)
    orbs.push(m)
    return m
  }

  // ---- the half-float target, tone mapped over the camera ----
  const target = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  })
  vfx.exposure = 0.2
  vfx.tint = new THREE.Vector3(...TINTS.phoenix)
  const composite = new THREE.ShaderMaterial({
    uniforms: { uFx: { value: target.texture }, uExposure: { value: vfx.exposure }, uBloom: { value: 0.4 }, uTint: { value: new THREE.Vector3(1, 0.85, 0.38) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uFx;
      uniform float uExposure;
      uniform float uBloom;
      // The game grades its colours after its tone mapper (fire comes out orange, not the salmon a plain ACES
      // gives (30, 3, 1.75)): a warm tint before it stands in for that.
      uniform vec3 uTint;
      varying vec2 vUv;
      vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      void main() {
        vec4 f = texture2D(uFx, vUv);
        vec3 bloom = textureLod(uFx, vUv, 3.0).rgb * 0.6 + textureLod(uFx, vUv, 5.0).rgb * 0.4;
        vec3 c = aces((f.rgb + bloom * uBloom) * uTint * uExposure);
        float a = clamp(f.a, 0.0, 1.0);
        if (a <= 0.001 && max(c.r, max(c.g, c.b)) <= 0.002) discard;
        gl_FragColor = vec4(c, a);
      }`,
    ...BLEND,
  })
  vfx.compositeScene = new THREE.Scene()
  const cq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), composite)
  cq.frustumCulled = false
  vfx.compositeScene.add(cq)
  // Draws the effects into the target, at half the camera box's size; the page then draws compositeScene in the box.
  vfx.render = (bw, bh) => {
    const w = Math.max(2, Math.round(bw / 2))
    const h = Math.max(2, Math.round(bh / 2))
    if (target.width !== w || target.height !== h) target.setSize(w, h)
    composite.uniforms.uExposure.value = vfx.exposure
    composite.uniforms.uTint.value.copy(vfx.tint)
    const prev = renderer.getRenderTarget()
    const clear = renderer.getClearColor(new THREE.Color())
    const clearA = renderer.getClearAlpha()
    renderer.setRenderTarget(target)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, false, false)
    renderer.render(vfx.scene, camera)
    renderer.setRenderTarget(prev)
    renderer.setClearColor(clear, clearA)
  }
  vfx.tex = tex
  return vfx
}
