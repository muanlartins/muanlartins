// The Santa hat on the camera (2026-11-15, Luan's idea for December: "mesmo com cara de Octane, ou vestido de
// Phoenix, o gorrinho de natal ficaria por cima de tudo, com uma física legal"). It goes on whatever his head is
// under any filter (his curls, an agent's hair, the ball, a car's roof): filtros.html says each frame where its brim
// sits (`anchor`: the brim's centre, its turn and its size, in the 3D camera's centimetres) and what's under it
// (`collider`: an ellipsoid in the hat's own centimetres, so the pompom rests on the head instead of sinking in).
//
// The rest is here. A red velvet cone whose top flops over: its spine is a chain of points (Verlet), the first few
// fixed on the head, the others pulled back to the hat's shape, more loosely towards the tip, with gravity down the
// screen, so the top swings and bounces as he moves and hangs lower as he tilts his head. A fur brim (rigid) and a
// fur pompom at the tip, the fur drawn in shells. The back of the brim hides behind the head (an invisible cylinder
// under it), and the hat is drawn after everything on the head, so it's always on top. It drops onto the head when
// it comes on, pops off when it goes, and `launch` throws it up (a car's demolition) to land back where the head is.
//
// Its own centimetres: on Luan's head at scale 1, the brim an ellipse A across and B front to back, y up the hat.

export function createHat(THREE) {
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a93b5, 1.35))
  const sun = new THREE.DirectionalLight(0xfff2e6, 2.1)
  sun.position.set(0.35, 1, 0.9)
  scene.add(sun)
  // A cool light from behind on the left, for the velvet's sheen on the edges.
  const rim = new THREE.DirectionalLight(0xb4c6ff, 1.2)
  rim.position.set(-0.8, 0.45, -0.7)
  scene.add(rim)

  const A = 10.5, B = 11.5 // the brim's half-axes
  const BAND = [1.7, 2.6] // the brim's band: its half thickness and half height
  const L = 27 // the cone's length along its spine
  const N = 12 // segments of the spine
  const FIXED = 3 // points fixed on the head (the cone's first quarter)
  const POM = 3.1 // the pompom's radius
  const SEG = L / N

  // The spine at rest: straight up for its fixed part, then bending over to the hat's right (+x) and a little
  // back, more and more, until its tip points down beside the cone.
  const BEND = Number(new URLSearchParams(location.search).get("dobra") || 3.1)
  const rest = []
  {
    const p = new THREE.Vector3(0, 0.4, 0)
    rest.push(p.clone())
    for (let i = 1; i <= N; i++) {
      const u = Math.max(0, (i - 0.5 - FIXED) / (N - FIXED))
      const th = BEND * Math.pow(u, 1.35)
      p.add(new THREE.Vector3(Math.sin(th), Math.cos(th), -0.18 * Math.sin(th)).normalize().multiplyScalar(SEG))
      rest.push(p.clone())
    }
  }
  // How hard each point is pulled back to its place (per second squared): stiff by the head, loose at the tip.
  const K = rest.map((_, i) => {
    const v = Math.max(0, (i - FIXED) / (N - FIXED))
    return 650 * (1 - v) ** 2 + 38
  })
  const G = 980 * 0.4 // gravity, softened: felt is stiff for its weight
  const DAMP = 2.4 // per second
  const STEP = 1 / 240

  // ---------- the pieces ----------
  // A cheap smooth noise, for the fur's lumps.
  const hash = (x, y, z) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
    return s - Math.floor(s)
  }
  const smooth = (t) => t * t * (3 - 2 * t)
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
    const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi)
    const l = (a, b, t) => a + (b - a) * t
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz)
    return l(l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf), l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf), zf)
  }
  function lumpy(geo, freq, amp) {
    const pos = geo.getAttribute("position")
    geo.computeVertexNormals()
    const nor = geo.getAttribute("normal")
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const d = (noise(x * freq, y * freq, z * freq) - 0.5) * 2 * amp
      pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d)
    }
    geo.computeVertexNormals()
    return geo
  }

  // Fur: the same surface drawn in shells pushed out along its normals, each keeping only the strands that reach
  // it (cells of a 3D grid on the surface, each its own length), softly blended, darker inside.
  const SHELLS = 14
  function furMats(color, length, density) {
    return Array.from({ length: SHELLS }, (_, i) => {
      const shell = i / (SHELLS - 1)
      const m = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, transparent: i > 0, depthWrite: i === 0 })
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uShell = { value: shell }
        sh.uniforms.uFur = { value: length }
        sh.uniforms.uDensity = { value: density }
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uShell; uniform float uFur; uniform float uDensity; varying vec3 vFur;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFur = position * uDensity;\ntransformed += objectNormal * uShell * uFur;")
        sh.fragmentShader = sh.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nuniform float uShell; varying vec3 vFur;\nfloat furHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }",
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            if (uShell > 0.0) {
              vec3 cell = floor(vFur);
              float len = 0.45 + 0.55 * furHash(cell);
              float r = 0.75 * (1.0 - uShell / len);
              float d = length(fract(vFur) - 0.5);
              float a = smoothstep(r, r - 0.22, d) * (1.0 - 0.6 * uShell);
              if (uShell > len || a < 0.02) discard;
              diffuseColor.a *= a;
            }
            diffuseColor.rgb *= mix(0.78, 1.0, uShell);`,
          )
      }
      m.customProgramCacheKey = () => "gorro-pelo"
      return m
    })
  }
  const furred = (geo, mats) => {
    const g = new THREE.Group()
    mats.forEach((m, i) => {
      const mesh = new THREE.Mesh(geo, m)
      mesh.renderOrder = i
      g.add(mesh)
    })
    return g
  }

  // The rigid part, placed at the brim's centre each frame.
  const root = new THREE.Group()
  root.matrixAutoUpdate = false
  scene.add(root)
  // The brim: a thick band round the ellipse.
  {
    const R = 120, T = 24
    const pos = []
    const idx = []
    for (let i = 0; i < R; i++) {
      const a = (i / R) * Math.PI * 2
      const cx = A * Math.cos(a), cz = B * Math.sin(a)
      const n = new THREE.Vector2(Math.cos(a) / A, Math.sin(a) / B).normalize()
      for (let j = 0; j < T; j++) {
        const b = (j / T) * Math.PI * 2
        pos.push(cx + n.x * BAND[0] * Math.cos(b), BAND[1] * Math.sin(b), cz + n.y * BAND[0] * Math.cos(b))
        const i2 = (i + 1) % R, j2 = (j + 1) % T
        idx.push(i * T + j, i * T + j2, i2 * T + j, i2 * T + j, i * T + j2, i2 * T + j2)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    root.add(furred(lumpy(geo, 0.42, 0.5), furMats(0xf3f1ec, 0.8, 5)))
  }

  // The head under it: depth only, so what's behind it (the brim's back, the pompom hanging behind) is hidden.
  const under = new THREE.Group()
  under.matrixAutoUpdate = false
  scene.add(under)
  const occluder = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48), new THREE.MeshBasicMaterial({ colorWrite: false }))
  occluder.scale.set(A - 1.3, 26, B - 1.3)
  occluder.position.y = 1.2 - 13
  occluder.renderOrder = -1
  under.add(occluder)

  // The cone, rebuilt along the spine every frame, in the camera's space.
  const RINGS = 48, SIDES = 36
  const coneGeo = new THREE.BufferGeometry()
  const conePos = new THREE.Float32BufferAttribute(new Float32Array(RINGS * SIDES * 3), 3)
  conePos.setUsage(THREE.DynamicDrawUsage)
  coneGeo.setAttribute("position", conePos)
  {
    const idx = []
    for (let r = 0; r < RINGS - 1; r++)
      for (let j = 0; j < SIDES; j++) {
        const a = r * SIDES + j, b = r * SIDES + ((j + 1) % SIDES), c = a + SIDES, d = b + SIDES
        idx.push(a, c, b, b, c, d)
      }
    coneGeo.setIndex(idx)
  }
  const velvet = new THREE.MeshPhysicalMaterial({
    color: 0xa80f1f,
    roughness: 0.82,
    sheen: 1,
    sheenRoughness: 0.42,
    sheenColor: new THREE.Color(0xff7a7a),
    side: THREE.DoubleSide,
  })
  const cone = new THREE.Mesh(coneGeo, velvet)
  cone.matrixAutoUpdate = false
  cone.frustumCulled = false
  scene.add(cone)
  // Its half-axes along the spine: the brim's inside at the bottom, a point at the tip (under the pompom).
  const AC = A - 0.9, BC = B - 0.9
  const taper = (u) => Math.max(0.03, Math.pow(1 - u, 0.9))

  const pompom = furred(lumpy(new THREE.SphereGeometry(POM, 40, 28), 0.7, 0.35), furMats(0xf6f4ef, 1.0, 5))
  pompom.matrixAutoUpdate = false
  scene.add(pompom)

  // ---------- the state ----------
  const pts = rest.map((p) => p.clone()) // the spine in the camera's space
  const old = rest.map((p) => p.clone())
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal")
  const frame = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1) } // the hat now
  const M = new THREE.Matrix4(), Mold = new THREE.Matrix4(), Minv = new THREE.Matrix4()
  const st = { on: 0, at: -1e9, off: -1e9, flying: null, reset: true, acc: 0, visible: false }
  const hat = { scene, A, B, want: false, visible: false, launch, update, parts: { root, under, occluder, cone, pompom } }

  // Thrown up (a car blown up under it): an arc up and over, turning once, that lands wherever the head is by then,
  // growing or shrinking to its size there; never much higher than the camera's box shows over his head.
  function launch(now, push = 1) {
    if (!st.visible || st.flying) return
    const side = Math.random() < 0.5 ? -1 : 1
    st.flying = {
      t0: now,
      p: frame.p.clone(),
      q: frame.q.clone(),
      s: frame.s.clone(),
      side,
      h: 15 * push,
      axis: new THREE.Vector3(0.25 * (Math.random() - 0.5), 0.35 * (Math.random() - 0.5), side).normalize(),
    }
  }
  const FLY = 1.1

  const easeOutBounce = (t) => {
    const n = 7.5625, d = 2.75
    if (t < 1 / d) return n * t * t
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
    return n * (t -= 2.625 / d) * t + 0.984375
  }
  const DROP = 0.75, LEAVE = 0.28

  const v = new THREE.Vector3(), w = new THREE.Vector3(), tgt = new THREE.Vector3(), up = new THREE.Vector3()
  const pinOld = [], pinNew = []
  for (let i = 0; i < FIXED; i++) {
    pinOld.push(new THREE.Vector3())
    pinNew.push(new THREE.Vector3())
  }

  /**
   * One frame: `anchor` is where the brim sits now ({ p, q, s } in the camera's space, or null without a face), with
   * its `collider`, what's under it ({ c, r }: an ellipsoid in the hat's centimetres, or null).
   */
  function update(now, dt, anchor) {
    const collider = anchor?.collider
    // On and off: dropped onto the head with a bounce, popped away.
    if (hat.want && !st.on) {
      st.on = 1
      st.at = now
      st.reset = true
    } else if (!hat.want && st.on) {
      st.on = 0
      st.off = now
    }
    const leaving = !st.on ? (now - st.off) / 1000 / LEAVE : 0
    st.visible = !!anchor && (st.on || leaving < 1)
    hat.visible = st.visible
    if (!st.visible) {
      st.reset = true
      st.flying = null
      return
    }
    // The hat's frame: the anchor, or flying, or dropping in.
    frame.s.copy(anchor.s)
    let p = anchor.p.clone(), q = anchor.q.clone()
    const f = st.flying
    if (f) {
      const u = Math.min(1, (now - f.t0) / 1000 / FLY)
      const e = u * u * (3 - 2 * u)
      // From where it was to where the head is now, up and over in an arc, drifting to one side and back.
      p = f.p.clone().lerp(anchor.p, e)
      p.y += 4 * f.h * u * (1 - u)
      p.x += f.side * 7 * Math.sin(Math.PI * u)
      frame.s.lerpVectors(f.s, anchor.s, e)
      // One turn, slowing down, then settling into the head's own turn.
      const spun = new THREE.Quaternion().setFromAxisAngle(f.axis, Math.PI * 2 * (1 - (1 - u) ** 2)).multiply(f.q)
      const settle = Math.min(1, Math.max(0, (u - 0.55) / 0.45))
      q = spun.slerp(anchor.q, settle * settle * (3 - 2 * settle))
      if (u >= 1) st.flying = null
    }
    const tin = (now - st.at) / 1000
    if (tin < DROP) p.y += 34 * frame.s.y * (1 - easeOutBounce(tin / DROP))
    let k = 1
    if (!st.on) k = Math.max(0.001, 1 - leaving ** 2 * (2.7 * leaving - 1.7))
    else if (tin < 0.25) k = 0.8 + 0.2 * (tin / 0.25)
    Mold.copy(M)
    frame.p.copy(p)
    frame.q.copy(q)
    M.compose(p, q, frame.s.clone().multiplyScalar(k))
    root.matrix.copy(M)
    under.matrix.compose(anchor.p, anchor.q, anchor.s)
    under.visible = !f

    // The spine: Verlet in steps of 1/240 s, the fixed points and the rest shape moving from last frame's
    // place to this one's across the steps.
    if (st.reset) {
      for (let i = 0; i <= N; i++) {
        pts[i].copy(rest[i]).applyMatrix4(M)
        old[i].copy(pts[i])
      }
      Mold.copy(M)
      st.reset = false
      st.acc = 0
    }
    // Gravity in the hat's frame, taken back out of the rest shape: upright, it holds its shape; tilted, the top
    // sags towards the floor.
    up.set(0, 1, 0).applyQuaternion(q).multiplyScalar(G)
    for (let i = 0; i < FIXED; i++) {
      pinOld[i].copy(rest[i]).applyMatrix4(Mold)
      pinNew[i].copy(rest[i]).applyMatrix4(M)
    }
    const scale = (frame.s.x + frame.s.y + frame.s.z) / 3 * k
    st.acc += Math.min(dt, 0.05)
    const steps = Math.floor(st.acc / STEP)
    st.acc -= steps * STEP
    const keep = Math.exp(-DAMP * STEP)
    if (collider) Minv.compose(anchor.p, anchor.q, anchor.s).invert()
    const CM = new THREE.Matrix4().compose(anchor.p, anchor.q, anchor.s)
    // (A frame shorter than a step still moves the fixed part with the head.)
    if (!steps) for (let i = 0; i < FIXED; i++) pts[i].copy(pinNew[i])
    for (let s = 0; s < steps; s++) {
      const a = (s + 1) / steps
      for (let i = 0; i < FIXED; i++) pts[i].lerpVectors(pinOld[i], pinNew[i], a)
      for (let i = FIXED; i <= N; i++) {
        const P = pts[i]
        v.subVectors(P, old[i]).multiplyScalar(keep)
        // Pulled to its place in the hat's frame (between last frame's and this one's).
        tgt.copy(rest[i]).applyMatrix4(Mold)
        w.copy(rest[i]).applyMatrix4(M)
        tgt.lerp(w, a)
        const acc = tgt.sub(P).multiplyScalar(K[i]).addScaledVector(up, 1).add(w.set(0, -G, 0))
        old[i].copy(P)
        P.add(v).addScaledVector(acc, STEP * STEP)
        // Never more than a few centimetres a step (a bad frame of the tracker mustn't fling it).
        const d = P.distanceTo(old[i])
        if (d > 4 * scale) P.lerpVectors(old[i], P, (4 * scale) / d)
      }
      // Its length: each segment back to its own, the pompom's end weighing more.
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i <= N; i++) {
          const P0 = pts[i - 1], P1 = pts[i]
          v.subVectors(P1, P0)
          const len = v.length() || 1e-6
          const diff = (len - SEG * scale) / len
          const w0 = i - 1 < FIXED ? 0 : 1
          const w1 = i === N ? 0.35 : 1
          const sum = w0 + w1
          if (!sum) continue
          P0.addScaledVector(v, (diff * w0) / sum)
          P1.addScaledVector(v, (-diff * w1) / sum)
        }
      }
      // Out of the head under it.
      if (collider && !f) {
        for (let i = FIXED; i <= N; i++) {
          const pad = i === N ? POM + 0.6 : 0.8
          w.copy(pts[i]).applyMatrix4(Minv).sub(collider.c)
          const ex = collider.r.x + pad, ey = collider.r.y + pad, ez = collider.r.z + pad
          const e = Math.hypot(w.x / ex, w.y / ey, w.z / ez)
          if (e < 1 && e > 1e-6) {
            w.divideScalar(e).add(collider.c).applyMatrix4(CM)
            pts[i].copy(w)
          }
        }
      }
    }

    // The cone along the spine: rings carried along it (parallel transport from the brim's axes).
    const n = new THREE.Vector3(1, 0, 0).applyQuaternion(q)
    const b = new THREE.Vector3()
    const t = new THREE.Vector3()
    const c = new THREE.Vector3()
    const arr = conePos.array
    for (let r = 0; r < RINGS; r++) {
      const u = r / (RINGS - 1)
      curve.getPoint(u, c)
      curve.getTangent(u, t)
      n.addScaledVector(t, -n.dot(t)).normalize()
      b.crossVectors(n, t)
      const tp = taper(u) * k
      const ax = AC * frame.s.x * tp, bz = BC * frame.s.z * tp
      for (let j = 0; j < SIDES; j++) {
        const phi = (j / SIDES) * Math.PI * 2
        const cs = Math.cos(phi), sn = Math.sin(phi)
        const o = (r * SIDES + j) * 3
        arr[o] = c.x + n.x * cs * ax + b.x * sn * bz
        arr[o + 1] = c.y + n.y * cs * ax + b.y * sn * bz
        arr[o + 2] = c.z + n.z * cs * ax + b.z * sn * bz
      }
    }
    conePos.needsUpdate = true
    coneGeo.computeVertexNormals()
    // The pompom just past the tip.
    curve.getTangent(1, t)
    const tip = pts[N].clone().addScaledVector(t, POM * 0.55 * scale)
    pompom.matrix.compose(tip, q, new THREE.Vector3(scale, scale, scale))
  }

  return hat
}
