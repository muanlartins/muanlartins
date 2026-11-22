// Phoenix's abilities on the camera (Valorant), with the game's own effects (efeitos.js, through vfx.js). The
// module's shape is every filter's (../README.md): `filtros` for the dock and the page, `criar` for what it does.
// His look (his hair and jacket on Luan) is the page's, in filtros.html's AGENTS.
//
// From the dock (or keys C, Q, E, X): Blaze, a wall of fire racing across the bottom of the box from his left
// hand; Curveball, his flash; Hot Hands, a fireball from his right hand that leaves fire burning at the bottom;
// Run It Back, his shoulders and elbows on fire for 10 s (?ult=<s>) with the marker below him and the box's edge
// glowing, then the burst he comes back in. Two gestures: both palms open and facing each other hold a fire between
// them that grows with the gap (key 5 shows it in the middle); a snap with a turn of the hand puts the flash's orb
// in it, and moving the hand throws it that way (key 4 throws one from the right). Without the game's textures
// (privado/valorant/phoenix/), Curveball keeps its drawn orb and the rest do nothing.

export const filtros = [
  {
    id: "phoenix",
    nome: "Phoenix",
    jogo: "Valorant",
    rosto: "../valorant/agentes/phoenix.webp",
    sons: "phoenix-",
    tint: "phoenix",
    atalho: "3",
    acoes: [
      ["blaze", "C", "Labareda"],
      ["flash", "Q", "Bola Curva"],
      ["molotov", "E", "Mãos Quentes"],
      ["ult", "X", "Ultimate"],
    ],
    gestos: [
      ["Fogo", "as duas palmas abertas, de frente uma para a outra."],
      ["Bola Curva", "um estalo girando a mão."],
    ],
  },
]

export async function criar(m) {
  const PHX = await import("./efeitos.js")
  const { THREE, vfx, sfx, at3, handAt, panAt, pose, toScreen, easeOutBack, video, cover, q, W, H, GLSL_COMMON, VERT, quad, ortho } = m
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  // The values its layers are drawn with: the engine's camera, mask, framing, clock and aspect (the same objects, so
  // they follow the engine), then its own.
  const { uCam, uMask, uCover, uTime, uAspect } = m.uniforms
  const uniforms = {
    uCam,
    uMask,
    uCover,
    uTime,
    uAspect,
    // The fire between his palms: where (x, y, radius) and how much of it.
    uFire: { value: new THREE.Vector3(0.5, 0.4, 0.1) },
    uFireAmt: { value: 0 },
    // The flash: the orb (x, y, radius) and how much of it shows, the curve it flies along (from, control, to) and
    // how far along it is, the ring closing on it, and the glare where it popped.
    uOrb: { value: new THREE.Vector3(0.7, 0.45, 0.035) },
    uOrbAmt: { value: 0 },
    uFrom: { value: new THREE.Vector2() },
    uCtl: { value: new THREE.Vector2() },
    uTo: { value: new THREE.Vector2() },
    uK: { value: 0 },
    uRing: { value: 0 },
    uFlashAt: { value: new THREE.Vector2(0.5, 0.6) },
    uFlashAmt: { value: 0 },
    // Run It Back: the warm edge on the box while it lasts.
    uUltVig: { value: 0 },
  }

  // Phoenix's fire between the palms: a flame shaped like a drop pointing up, licking upwards, with
  // embers and a glow, added on top (it lights what's behind it).
  const fireMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec3 uFire;
      uniform float uFireAmt;
      void main() {
        vec2 p = (vUv - uFire.xy) * vec2(uAspect, 1.0) / max(uFire.z, 0.01);
        float r = length(p);
        if (r > 2.8) discard;
        float t = uTime;
        vec2 q = vec2(p.x * 1.05, p.y + 0.2);
        q.y *= q.y > 0.0 ? 0.5 : 1.15;
        float n = fbm(vec2(p.x * 2.4, p.y * 1.7 - t * 2.8));
        float n2 = fbm(vec2(p.x * 4.6 + 3.0, p.y * 3.2 - t * 4.4));
        float f = clamp((1.0 - length(q) + (n - 0.5) * 1.0 + (n2 - 0.5) * 0.45) * 1.7, 0.0, 1.0);
        // Flat bands with hard edges, like Valorant's painted fire: red rim, orange, gold, a white-hot core.
        vec3 col = f < 0.12 ? vec3(0.0) : f < 0.3 ? vec3(0.85, 0.16, 0.02) : f < 0.55 ? vec3(1.0, 0.45, 0.04)
          : f < 0.8 ? vec3(1.0, 0.78, 0.2) : vec3(1.0, 0.97, 0.82);
        vec3 c = col + vec3(1.0, 0.42, 0.08) * exp(-r * 1.6) * 0.35;
        for (int i = 0; i < 18; i++) {
          float fi = float(i);
          float life = fract(t * (0.45 + hash(fi + 7.0) * 0.4) + hash(fi));
          vec2 e = vec2((hash(fi + 1.3) - 0.5) * 1.5 + sin(t * 3.0 + fi) * 0.12, -0.1 + life * 2.3);
          c += vec3(1.0, 0.62, 0.18) * smoothstep(0.055, 0.0, length(p - e)) * (1.0 - life);
        }
        gl_FragColor = vec4(c * uFireAmt, 1.0);
      }`,
  })
  const fireScene = quad(fireMat)

  // Phoenix's flash (Curveball), after the game's: an orange orb with a dark red heart, a white-hot rim and
  // flares, held in the hand, then thrown along a curve with a trail while a ring closes on it; when the
  // ring meets it, it pops into a warm glare with rays of light from where it popped, that holds and fades.
  const BANG = { HOLD: 1.0, FLY: 0.65, GLARE: 1.6, FADE: 1.0 }
  const bangMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec3 uOrb;
      uniform float uOrbAmt;
      uniform vec2 uFrom;
      uniform vec2 uCtl;
      uniform vec2 uTo;
      uniform float uK;
      uniform float uRing;
      vec2 bez(float s) { return mix(mix(uFrom, uCtl, s), mix(uCtl, uTo, s), s); }
      float seg(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0));
      }
      void main() {
        vec2 a = vec2(uAspect, 1.0);
        vec2 d = (vUv - uOrb.xy) * a;
        float r = length(d);
        float R = uOrb.z;
        float ang = atan(d.y, d.x);
        float body = smoothstep(R, R * 0.9, r);
        vec3 orb = mix(vec3(0.5, 0.02, 0.02), vec3(1.0, 0.24, 0.08),
          smoothstep(0.0, 0.7 * R, r + 0.14 * R * sin(uTime * 9.0 + ang * 3.0)));
        orb = mix(orb, vec3(1.0, 0.95, 0.86), smoothstep(0.6 * R, 0.88 * R, r) * body);
        vec3 c = orb * body;
        float out_ = max(r - R, 0.0);
        float flares = pow(max(0.0, cos(ang * 3.0 + uTime * 2.0)), 14.0) + pow(max(0.0, cos(ang * 2.0 - uTime * 1.3 + 1.0)), 20.0);
        c += vec3(1.0, 0.42, 0.12) * (exp(-out_ / (R * 0.8)) * 0.9 + flares * exp(-out_ / (R * 2.4)) * 0.9) * (1.0 - body);
        // The trail: a continuous streak along the curve behind it, thinning out.
        if (uK > 0.0) {
          float best = 1e9;
          vec2 prev = bez(uK) * a;
          for (int i = 1; i < 16; i++) {
            float f = float(i) / 15.0;
            float s = max(uK - 0.4 * f, 0.0);
            vec2 cur = bez(s) * a;
            best = min(best, seg(vUv * a, prev, cur) / max(1.0 - f, 0.05));
            prev = cur;
            if (s <= 0.0) break;
          }
          c += vec3(1.0, 0.36, 0.1) * smoothstep(R * 0.7, 0.0, best) * 0.9;
        }
        if (uRing > 0.0) {
          float e = abs(r - uRing);
          c += vec3(1.0, 0.72, 0.42) * (smoothstep(0.005, 0.0, e) + 0.3 * exp(-e / 0.01));
        }
        float alpha = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
        if (alpha <= 0.002) discard;
        gl_FragColor = vec4(c / alpha, alpha * uOrbAmt);
      }`,
  })
  const bangScene = quad(bangMat)
  const flashMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec2 uFlashAt;
      uniform float uFlashAmt;
      void main() {
        vec2 d = (vUv - uFlashAt) * vec2(uAspect, 1.0);
        float r = length(d);
        float ang = atan(d.y, d.x);
        float rays = pow(abs(sin(ang * 7.0 + 0.3)), 18.0) + 0.8 * pow(abs(sin(ang * 11.0 + 1.7)), 30.0)
          + pow(abs(sin(ang * 4.0 + uTime * 0.15)), 40.0);
        rays *= exp(-r * 0.8);
        vec3 col = vec3(0.86, 0.6, 0.5) + vec3(1.0, 0.8, 0.66) * rays * 0.6 + vec3(1.0, 0.96, 0.9) * exp(-r * 4.0);
        gl_FragColor = vec4(min(col, vec3(1.0)), uFlashAmt * clamp(0.84 + 0.4 * exp(-r * 3.0) + rays * 0.3, 0.0, 1.0));
      }`,
  })
  const flashScene = quad(flashMat)
  // Run It Back's edge: the box's border glowing like embers, flickering, while the ultimate lasts.
  const vigMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uUltVig;
      void main() {
        vec2 e = min(vUv, 1.0 - vUv) * vec2(uAspect, 1.0);
        float d = min(e.x, e.y);
        float n = noise(vec2(vUv.x * 9.0 + vUv.y * 3.0, uTime * 1.3)) * 0.5 + noise(vec2(vUv.y * 11.0, uTime * 0.9 + 4.0)) * 0.5;
        float g = exp(-d * (14.0 - 6.0 * n)) * (0.55 + 0.45 * n);
        float a = clamp(g * uUltVig * 0.75, 0.0, 1.0);
        gl_FragColor = vec4(mix(vec3(0.85, 0.2, 0.03), vec3(1.0, 0.62, 0.2), n) * a, a);
      }`,
  })
  const vigScene = quad(vigMat)

  // ---------- his abilities, with the game's own effects (efeitos.js) ----------
  const phx = { orb: vfx.orb(), orbAt: new THREE.Vector3(), held: null, trail: null, e: null, c: null, x: null }
  function phxReset() {
    vfx.clear()
    phx.orb.visible = false
    Object.assign(phx, { held: null, trail: null, e: null, c: null, x: null })
    uniforms.uUltVig.value = 0
  }
  // Curveball, on the orb the flash's path moves (updateBang): held, it glows and throws sparks; in flight it
  // leaves its ribbon; where it lands it pops before the glare.
  function phxCurveball(t) {
    if (!vfx.ok) return
    const { HOLD, FLY } = BANG
    const o = uniforms.uOrb.value
    const on = uniforms.uOrbAmt.value > 0 && t < HOLD + FLY
    phx.orb.visible = on
    if (on) {
      phx.orbAt.copy(at3(o.x, o.y, 6))
      phx.orb.position.copy(phx.orbAt)
      const d = 9 * (o.z / 0.035)
      phx.orb.scale.set(d, d, 1)
      if (!phx.held) phx.held = vfx.spawn(PHX.Q.held, (v) => v.copy(phx.orbAt), { scale: 0.8 })
      if (t >= HOLD && !phx.trail) phx.trail = vfx.spawn(PHX.Q.trail, (v) => v.copy(phx.orbAt), { scale: 0.8 })
    } else if (phx.held) {
      phx.held.stop()
      phx.trail?.stop()
      phx.held = phx.trail = null
      if (t >= HOLD + FLY) {
        const p = phx.orbAt.clone()
        vfx.spawn(PHX.Q.explode, (v) => v.copy(p), { scale: 0.12, dur: 0.05 })
      }
    }
  }
  // Hot Hands: in the right hand while it's equipped, thrown up and down to the bottom of the box on that
  // side, the blast, then about 4 s of fire there.
  const HH = { EQUIP: 0.7, FLY: 0.55, BURN: 4 }
  function startHotHands(now) {
    if (phx.e || !vfx.ok) return
    const [u, v] = handAt(1)
    const side = u > 0.5 ? 1 : -1
    phx.e = { t0: now, from: [u, v], to: [0.5 + side * 0.2, 0.05], pos: new THREE.Vector3(), held: null, trail: null, stage: 0, burn: null }
    sfx.play("phoenix-molotov-equip", { pan: panAt(u) })
  }
  function updateHotHands(now) {
    const e = phx.e
    const t = (now - e.t0) / 1000
    // Its throw's sound by the clock, so a slow frame can't skip it.
    if (!e.thrown && t >= HH.EQUIP) {
      e.thrown = true
      sfx.play("phoenix-molotov-throw", { pan: panAt(e.from[0]) })
    }
    if (t < HH.EQUIP) {
      if (m.lastHands.length) e.from = handAt(e.to[0] > 0.5 ? 1 : -1)
      e.pos.copy(at3(e.from[0], e.from[1], 8))
      e.held ||= vfx.spawn(PHX.E.held, (v) => v.copy(e.pos), { scale: 0.75 })
    } else if (t < HH.EQUIP + HH.FLY) {
      const k = (t - HH.EQUIP) / HH.FLY
      const u = THREE.MathUtils.lerp(e.from[0], e.to[0], k)
      const v = THREE.MathUtils.lerp(e.from[1], e.to[1], k * k) + Math.sin(Math.PI * k) * 0.18
      e.pos.copy(at3(u, v, 8 - 2 * k))
      e.trail ||= vfx.spawn(PHX.E.trail, (v) => v.copy(e.pos), { scale: 0.7 })
    } else if (e.stage === 0) {
      e.held?.stop()
      e.trail?.stop()
      const p = at3(e.to[0], e.to[1], 6)
      vfx.spawn(PHX.E.explode, (v) => v.copy(p), { scale: 0.08, dur: 0.1 })
      const g = at3(e.to[0], 0.0, 10)
      vfx.spawn(PHX.E.ground, (v) => v.copy(g), { scale: 0.13, dur: HH.BURN })
      sfx.play("phoenix-molotov-explode", { pan: panAt(e.to[0]) })
      e.burn = sfx.play("phoenix-molotov-burn", { loop: true, pan: panAt(e.to[0]), gain: 0.9 })
      e.stage = 1
    } else if (e.stage === 1 && t > HH.EQUIP + HH.FLY + HH.BURN) {
      // The fire dies down.
      e.burn.stop(0.6)
      sfx.play("phoenix-molotov-end", { pan: panAt(e.to[0]) })
      e.stage = 2
    } else if (t > HH.EQUIP + HH.FLY + HH.BURN + 2) phx.e = null
  }
  // Blaze: the flame in the left hand while it's equipped, then the wall's head runs across the bottom of the
  // box from that side, the wall rising behind it, burning 6 s.
  const BZ = { EQUIP: 0.8, RUN: 0.75, BURN: 6 }
  function startBlaze(now) {
    if (phx.c || !vfx.ok) return
    const [u, v] = handAt(-1)
    const side = u < 0.5 ? -1 : 1
    phx.c = { t0: now, hand: [u, v], side, handPos: new THREE.Vector3(), pos: new THREE.Vector3(), held: null, head: null, wall: null, k: 0, run: null, burn: null, ended: false }
    sfx.play("phoenix-blaze-equip", { pan: panAt(u) })
  }
  function updateBlaze(now) {
    const c = phx.c
    const t = (now - c.t0) / 1000
    const from = at3(c.side < 0 ? -0.05 : 1.05, 0.02, 14)
    const to = at3(c.side < 0 ? 1.05 : -0.05, 0.02, 14)
    if (t < BZ.EQUIP) {
      if (m.lastHands.length) c.hand = handAt(c.side)
      c.handPos.copy(at3(c.hand[0], c.hand[1], 8))
      c.held ||= vfx.spawn(PHX.C.held, (v) => v.copy(c.handPos), { scale: 0.8 })
      return
    }
    c.held?.stop()
    c.k = Math.min(1, (t - BZ.EQUIP) / BZ.RUN)
    c.pos.lerpVectors(from, to, c.k)
    if (!c.wall) {
      c.head = vfx.spawn(PHX.C.head, (v) => v.copy(c.pos), { scale: 0.11, dur: BZ.RUN })
      // The wall's particles spread over what the head has crossed so far.
      c.wall = vfx.spawn(PHX.C.wall, (v) => v.copy(from), { scale: 0.11, dur: BZ.RUN + BZ.BURN, segment: (r) => to.clone().sub(from).multiplyScalar(r * c.k) })
      // The wall's sound runs across with its head, then it burns.
      c.run = sfx.play("phoenix-blaze-run", { pan: c.side * 0.6 })
      c.burn = sfx.play("phoenix-blaze-burn", { loop: true, gain: 0 })
    }
    c.run?.set({ pan: c.side * 0.6 * (1 - 2 * c.k) })
    c.burn?.set({ gain: Math.min(1, c.k * 1.5) * 0.9 })
    if (!c.ended && t > BZ.EQUIP + BZ.RUN + BZ.BURN) {
      c.ended = true
      c.burn?.stop(0.6)
      sfx.play("phoenix-blaze-end")
    }
    if (t > BZ.EQUIP + BZ.RUN + BZ.BURN + 2.5) phx.c = null
  }
  // Run It Back: a burst in his hands, the marker below him, his shoulders and elbows burning for 10 s
  // (with a warm edge on the box), then the burst he comes back in.
  const RB = { CAST: 0.8, LAST: Number(q.get("ult") || 10), RISE: 8.95 }
  function startRunItBack(now) {
    if (phx.x || !vfx.ok) return
    const hands = [handAt(-1), handAt(1)]
    const mu = pose.seen ? (pose.left.x + pose.right.x) / 2 : 0.5
    const marker = at3(mu, 0.02, 4)
    phx.x = { t0: now, limbs: [], back: false, fire: null, rise: null }
    sfx.play("phoenix-ult-cast", { pan: panAt(mu) * 0.5 })
    for (const h of hands) {
      const p = at3(h[0], h[1], 8)
      vfx.spawn(PHX.X.cast, (v) => v.copy(p), { scale: 0.8, dur: 1.2 })
    }
    vfx.spawn(PHX.X.marker, (v) => v.copy(marker), { scale: 0.16, dur: RB.CAST + RB.LAST })
  }
  function updateRunItBack(now) {
    const x = phx.x
    const t = (now - x.t0) / 1000
    const k = THREE.MathUtils.clamp(Math.min((t - 0.3) / 0.6, (RB.CAST + RB.LAST - t) / 0.5), 0, 1)
    uniforms.uUltVig.value = k
    if (t > 0.4 && !x.limbs.length) {
      // Shoulders, then elbows (where they're seen), each with its own flames, following him.
      const spot = (i) => (v) => {
        const p = i < 2 ? (i ? pose.right : pose.left) : pose.elbows[i - 2]
        if (!p || !pose.seen) return v.set(0, -1e4, 0)
        return v.copy(at3(p.x, p.y + (i < 2 ? 0.02 : 0), i < 2 ? (i ? pose.dz / 2 : -pose.dz / 2) : 0))
      }
      for (let i = 0; i < 4; i++) x.limbs.push(vfx.spawn(PHX.X.limb, spot(i), { scale: 0.4, dur: RB.LAST + RB.CAST - 0.4 }))
      x.fire = sfx.play("phoenix-fire", { loop: true, gain: 0.55 })
    }
    // The game's rise towards the comeback, started so that it ends as he comes back (partway in, with a short
    // ?ult=).
    const riseAt = RB.CAST + RB.LAST - RB.RISE
    if (!x.rise && t >= Math.max(RB.CAST, riseAt)) x.rise = sfx.play("phoenix-ult-rise", { offset: t - riseAt, gain: 0.85 })
    if (t > RB.CAST + RB.LAST && !x.back) {
      x.back = true
      x.fire?.stop(0.5)
      x.rise?.stop(0.2)
      sfx.play("phoenix-ult-return")
      const c = pose.seen ? new THREE.Vector2().addVectors(pose.left, pose.right).multiplyScalar(0.5) : new THREE.Vector2(0.5, 0.3)
      const p = at3(c.x, c.y + 0.08, 10)
      vfx.spawn(PHX.X.back, (v) => v.copy(p), { scale: 0.2, dur: 0.8 })
    }
    if (t > RB.CAST + RB.LAST + 3) phx.x = null
  }

  // ---------- his flash, and his gestures: the snap for it and the fire between his palms ----------
  const fire ={ on: false, demo: false, amt: 0, at: new THREE.Vector3(0.5, 0.35, 0.1), lastOn: -1e9 }
  const bang = { t0: -1, key: null, startX: 0, hand: new THREE.Vector2(0.75, 0.45), thrown: false }
  const snaps = new Map()
  function startBang(x, y, key) {
    if (bang.t0 >= 0) return
    Object.assign(bang, { t0: performance.now(), key, startX: x, thrown: false, heard: 0, idx: null })
    bang.hand.set(x, y)
    sfx.play("phoenix-flash-equip", { pan: panAt(x) })
  }
  // The orb's path: held in the hand, then thrown to the side the hand moved to (or to the middle).
  function updateBang(now) {
    const t = (now - bang.t0) / 1000
    const u = uniforms
    const R = 0.035
    const { HOLD, FLY, GLARE, FADE } = BANG
    u.uK.value = 0
    u.uRing.value = 0
    u.uFlashAmt.value = 0
    // Held, it rides the hand on every frame (the hand as carried between the tracker's answers), not only
    // when the tracker answers.
    const held = !bang.thrown && bang.idx != null && m.lastHands[bang.idx]
    if (held) bang.hand.set(...toScreen((held[4].x + held[12].x) / 2, (held[4].y + held[12].y) / 2))
    if (t < HOLD) {
      u.uOrb.value.set(bang.hand.x, bang.hand.y, R * easeOutBack(Math.min(1, t / 0.35)))
      u.uOrbAmt.value = 1
    } else if (t < HOLD + FLY) {
      if (!bang.thrown) {
        const dx = bang.hand.x - bang.startX
        const dir = Math.abs(dx) > 0.025 ? Math.sign(dx) : 0
        u.uFrom.value.copy(bang.hand)
        u.uTo.value.set(0.5 + dir * 0.3, 0.6)
        const side = dir || (bang.hand.x > 0.5 ? -1 : 1)
        u.uCtl.value.set((bang.hand.x + u.uTo.value.x) / 2 + side * 0.1, Math.max(bang.hand.y, 0.6) + 0.22)
        bang.thrown = true
      }
      const k = 1 - (1 - (t - HOLD) / FLY) ** 2
      const f = u.uFrom.value, c = u.uCtl.value, e = u.uTo.value
      const x = (1 - k) * (1 - k) * f.x + 2 * (1 - k) * k * c.x + k * k * e.x
      const y = (1 - k) * (1 - k) * f.y + 2 * (1 - k) * k * c.y + k * k * e.y
      u.uOrb.value.set(x, y, R * (1 - 0.3 * k))
      u.uK.value = k
      u.uRing.value = THREE.MathUtils.lerp(0.24, R * 1.05, k)
      u.uOrbAmt.value = 1
    } else if (t < HOLD + FLY + GLARE + FADE) {
      const g = t - HOLD - FLY
      u.uOrbAmt.value = Math.max(0, 1 - g / 0.12)
      u.uFlashAt.value.copy(u.uTo.value)
      // With the game's pop (vfx), the glare comes a moment after it, as the game's flash whites out.
      const pop = vfx.ok ? 0.15 : 0
      u.uFlashAmt.value = THREE.MathUtils.clamp((g - pop) / 0.06, 0, 1) * (g < GLARE ? 1 : (1 - (g - GLARE) / FADE) ** 1.6)
    } else {
      bang.t0 = -1
      u.uOrbAmt.value = 0
    }
    // Thrown, then its pop, and what a flashed player hears as the glare blinds whoever's watching.
    if (bang.heard < 1 && t >= HOLD) {
      bang.heard = 1
      sfx.play("phoenix-flash-throw", { pan: panAt(bang.hand.x) })
    }
    if (bang.heard < 2 && t >= HOLD + FLY) {
      bang.heard = 2
      const pan = panAt(u.uTo.value.x)
      sfx.play("phoenix-flash-pop", { pan })
      sfx.play("phoenix-flash-blind", { pan: pan * 0.5, gain: 0.55, delay: 0.15 })
    }
    phxCurveball(t)
  }

  // Both palms open, fingers up, seen edge on (facing each other), side by side: a fire between them.
  // A thumb pressed to the middle finger and let go with the middle finger landing in the palm: a snap.
  function phoenixHands(r, now) {
    let nota = ""
    const hands = r.landmarks || []
    const open = []
    hands.forEach((h, i) => {
      const palm = dist(h[0], h[9])
      const fingersOut = [8, 12, 16, 20].every((t) => dist(h[t], h[0]) > 1.3 * palm)
      const upright = h[0].y - h[12].y > 0.9 * palm
      const edgeOn = dist(h[5], h[17]) / palm
      if (fingersOut && upright && edgeOn < 0.8) {
        const c = [0, 5, 9, 13, 17].reduce((a, k) => ({ x: a.x + h[k].x / 5, y: a.y + h[k].y / 5 }), { x: 0, y: 0 })
        open.push({ c, palm })
      }
    })
    // The snap: thumb pressed to the middle finger, then within 0.6 s the hand turns quickly (more than
    // 35° within 0.2 s, flat or twisting) as the fingers part. Not at the face, not with both palms up for
    // the fire or just after it, not while a flash is on.
    const va = video.videoWidth / video.videoHeight || 16 / 9
    hands.forEach((h, i) => {
      const palm = dist(h[0], h[9])
      const key = r.handedness?.[i]?.[0]?.categoryName || String(i)
      const st = snaps.get(key) || { since: now, seen: now, armed: 0, hist: [] }
      if (now - st.seen > 300) Object.assign(st, { since: now, armed: 0, hist: [] })
      st.seen = now
      const atFace = m.faceLm && dist(h[9], m.faceLm[1]) < 0.9 * dist(m.faceLm[234], m.faceLm[454])
      const allowed = !atFace && now - st.since > 250 && now - fire.lastOn > 1200 && open.length < 2 && bang.t0 < 0
      const angle = Math.atan2(h[17].y - h[5].y, (h[17].x - h[5].x) * va)
      const width = dist(h[5], h[17]) / palm
      st.hist = st.hist.filter((e) => now - e.t < 200)
      let turn = 0, twist = 0
      for (const e of st.hist) {
        let da = Math.abs(angle - e.angle)
        if (da > Math.PI) da = 2 * Math.PI - da
        turn = Math.max(turn, da)
        twist = Math.max(twist, Math.abs(width - e.width))
      }
      st.hist.push({ t: now, angle, width })
      const pinched = dist(h[4], h[12]) < 0.45 * palm
      if (pinched) st.armed = now
      const [ox, oy] = toScreen((h[4].x + h[12].x) / 2, (h[4].y + h[12].y) / 2)
      if (allowed && st.armed && now - st.armed < 600 && !pinched && (turn > 0.6 || twist > 0.35)) {
        startBang(ox, oy, key)
        st.armed = 0
        st.hist = []
      }
      if (bang.t0 >= 0 && bang.key === key) {
        bang.hand.set(ox, oy)
        bang.idx = i
      }
      if (allowed && st.armed && now - st.armed < 600) nota += ` · estalo armado (giro ${Math.round((turn * 180) / Math.PI)}°)`
      snaps.set(key, st)
    })
    fire.on = false
    if (open.length === 2) {
      const [a, b] = open
      const gap = Math.abs(a.c.x - b.c.x)
      const palm = (a.palm + b.palm) / 2
      if (gap > 0.6 * palm && gap < 7 * palm && Math.abs(a.c.y - b.c.y) < 1.6 * palm) {
        const [x, y] = toScreen((a.c.x + b.c.x) / 2, (a.c.y + b.c.y) / 2)
        const rad = Math.max(0.04, (gap / cover.sx) * (W / H) * 0.42)
        fire.at.lerp(new THREE.Vector3(x, y, rad), fire.on ? 0.5 : 1)
        fire.on = true
        fire.lastOn = now
      }
    }
    nota += fire.on ? " · fogo" : ""
    return nota
  }

  // The fire between his palms (the gesture, or key 5), growing in and dying down.
  function updateFire(dt) {
    const fireWanted = fire.on || fire.demo
    if (fire.demo && !fire.on) fire.at.set(0.5, 0.3, 0.11)
    fire.amt = THREE.MathUtils.clamp(fire.amt + (fireWanted ? dt / 0.25 : -dt / 0.35), 0, 1)
    // The fire between his palms crackles as loud as it's big.
    if (fire.amt > 0.01) {
      fire.snd ||= sfx.play("phoenix-fire", { loop: true, gain: 0 })
      fire.snd.set({ gain: fire.amt * 0.9, pan: panAt(fire.at.x) })
    } else if (fire.snd) {
      fire.snd.stop(0.2)
      fire.snd = null
    }
    uniforms.uFire.value.copy(fire.at)
    uniforms.uFireAmt.value = fire.amt
  }

  return {
    ligar: () => vfx.preload(PHX),
    // His abilities go with him, the fire between his palms too (its crackle fades with every sound of the filter).
    desligar() {
      bang.t0 = -1
      uniforms.uOrbAmt.value = uniforms.uFlashAmt.value = 0
      phxReset()
      fire.on = false
      fire.amt = uniforms.uFireAmt.value = 0
      fire.snd?.stop(0.2)
      fire.snd = null
    },
    acao(a, now) {
      if (a === "flash") startBang(...handAt(1), null)
      else ({ molotov: startHotHands, blaze: startBlaze, ult: startRunItBack })[a]?.(now)
    },
    // In a browser: 4 throws a flash from the right, 5 shows the fire in the middle.
    tecla(k) {
      if (k === "4") startBang(0.75, 0.45, null)
      if (k === "5") fire.demo = !fire.demo
    },
    // The hands, for his gestures and to cast from (the face, the shoulders and the body mask come with his look).
    quer: () => ({ maos: true }),
    maos: phoenixHands,
    // Before the particles move: the fire, the flash's orb and what each ability's effects follow.
    mover(now, dt) {
      updateFire(dt)
      if (bang.t0 >= 0) updateBang(now)
      if (phx.e) updateHotHands(now)
      if (phx.c) updateBlaze(now)
      if (phx.x) updateRunItBack(now)
    },
    // The fire and the drawn orb (only without the game's textures) under the particles; the ultimate's edge and
    // the flash's glare over them.
    desenhar(fase, r) {
      if (fase === "antesFx") {
        if (fire.amt > 0) r.renderer.render(fireScene, ortho)
        if (uniforms.uOrbAmt.value > 0 && !vfx.ok) r.renderer.render(bangScene, ortho)
      } else if (fase === "depoisFx") {
        if (uniforms.uUltVig.value > 0) r.renderer.render(vigScene, ortho)
        // The glare stays in the camera's box (Luan's call), from where the orb popped.
        if (uniforms.uFlashAmt.value > 0) r.renderer.render(flashScene, ortho)
      }
    },
    ocupado: () => bang.t0 >= 0 || !!(phx.held || phx.trail || phx.e || phx.c || phx.x),
    estado: { phx },
  }
}
