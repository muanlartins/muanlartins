// Sage's abilities on the camera (Valorant), with the game's own effects (efeitos.js, through vfx.js) and meshes.
// The module's shape is every filter's (../README.md): `filtros` for the dock and the page, `criar` for what it does.
//
// From the dock (or keys C, Q, E, X): Barrier Orb, the orb in his hand, then her wall of jade crystal rising across
// the bottom of the box in front of him, standing a few seconds and crumbling (also by gesture: arms crossed in an X,
// then opened, `sageArms`); Slow Orb, thrown down to the bottom of the box, where the slow field spreads and frost
// creeps up him while it lasts; Healing Orb, the orb in his hand, then her heal on him; Resurrection, both hands
// glowing, then the column of light he's raised in. The orbs and the wall are the game's own meshes
// (privado/valorant/sage/files/, extracted read-only from the installed game, never published), lit in the 3D
// camera's space (centimetres). Without them it does nothing.

export const filtros = [
  {
    id: "sage",
    nome: "Sage",
    jogo: "Valorant",
    rosto: "../valorant/agentes/sage.webp",
    sons: "sage-",
    tint: "sage",
    acoes: [
      ["barreira", "C", "Orbe de Barreira"],
      ["lentidao", "Q", "Orbe de Lentidão"],
      ["cura", "E", "Orbe Curativo"],
      ["ult", "X", "Ressurreição"],
    ],
    gestos: [["Orbe de Barreira", "cruze os braços em X na frente do peito e abra: a orbe vem na mão direita e a parede sobe quando os braços abrem."]],
  },
]

export async function criar(m) {
  const SAGE = await import("./efeitos.js")
  const { THREE, GLTFLoader, vfx, sfx, at3, handAt, panAt, pose, faceBox, easeOutBack, roomEnv, video, fail } = m

  const THORNE = "privado/valorant/sage/files/ShooterGame/Content/Characters/Thorne/S0/"
  const sage = { c: null, q: null, e: null, x: null, cross: { since: 0, last: 0, armed: false }, maskUntil: 0, heal: 0, frost: 0 }
  const sg3 = { scene: new THREE.Scene(), orb: null, wall: null, ok: 0 }
  // What she puts on him, eased: the heal's jade light and the slow field's frost (the page's body effects).
  const shown = { heal: 0, frost: 0 }
  sg3.scene.add(new THREE.HemisphereLight(0xe4fff6, 0x203a36, 1.6))
  {
    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(0.3, 1, 1)
    sg3.scene.add(sun)
  }
  const sageTex = (path, color) => {
    const t = new THREE.TextureLoader().load(THORNE + path)
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.flipY = false
    return t
  }
  function loadSage(path, done) {
    new GLTFLoader().load(
      THORNE + path,
      (g) => {
        g.scene.traverse((o) => {
          if (o.isMesh) o.frustumCulled = false
        })
        done(g.scene)
        sg3.ok++
      },
      undefined,
      (e) => fail("sage", e),
    )
  }
  // The orb (ThorneOrb, 13 cm across in the game): its own texture, lit, with the jade light inside it.
  loadSage("VFX/Meshes/ThorneOrb.glb", (mesh) => {
    mesh.traverse((o) => {
      if (!o.isMesh) return
      const map = o.material.map
      if (map) map.colorSpace = THREE.SRGBColorSpace
      o.material = new THREE.MeshStandardMaterial({ map, color: 0xbfffee, emissive: new THREE.Color(0.05, 0.9, 0.6), emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1, envMap: roomEnv(), envMapIntensity: 0.9 })
    })
    const root = new THREE.Group()
    root.add(mesh)
    root.visible = false
    sg3.orb = root
    sg3.scene.add(root)
  })
  // The wall: one segment of AB_Thorne_S0_E (2 m by 2.8 m tall, its crystals along its z), repeated across. Its
  // material's textures come with it in the export but not inside the mesh: the colour, the smooth normals, and
  // the cracks for when it's about to break.
  const WALL_N = 4
  const wallMat = new THREE.MeshStandardMaterial({
    map: sageTex("Ability_E/3P/Models/AB_Thorne_S0_E_DF.png", true),
    normalMap: sageTex("Ability_E/3P/Models/AB_Thorne_S0_E_Smoother_NM.png"),
    color: 0xd9fff2,
    emissive: new THREE.Color(0.02, 0.3, 0.2),
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 1,
  })
  loadSage("Ability_E/3P/Models/AB_Thorne_S0_E.glb", (mesh) => {
    wallMat.envMap = roomEnv()
    wallMat.envMapIntensity = 1.1
    const wall = new THREE.Group()
    wall.visible = false
    const geo = mesh.getObjectByProperty("isMesh", true).geometry
    wall.userData.segs = []
    for (let i = 0; i < WALL_N; i++) {
      // Each segment turned so its length runs across the box, a little askew like the game's.
      const seg = new THREE.Mesh(geo, wallMat)
      seg.rotation.y = Math.PI / 2 + (i % 2 ? 0.12 : -0.08)
      seg.position.x = (i - (WALL_N - 1) / 2) * 2.6
      seg.frustumCulled = false
      const pivot = new THREE.Group()
      pivot.add(seg)
      pivot.position.x = seg.position.x
      seg.position.x = 0
      wall.add(pivot)
      wall.userData.segs.push(pivot)
    }
    sg3.wall = wall
    sg3.scene.add(wall)
  })
  // Where an orb sits in a hand: the hand's middle on screen, a little before it.
  const sageHand = (side) => handAt(side)
  function placeOrb(p, k) {
    const o = sg3.orb
    if (!o) return
    o.visible = k > 0
    o.position.copy(p)
    o.scale.setScalar(Math.max(0.001, k) * 60)
    o.rotation.y += 0.03
    o.rotation.x += 0.011
  }
  const SG = { EQUIP: 0.8, THROW: 0.45, WALL_RISE: 0.55, WALL_STAND: 6, SLOW_LAST: 5.5, HEAL_LAST: 5, X_EQUIP: 1.3, X_RES: 1.8 }
  function sageReset() {
    if (sage.c || sage.q || sage.e || sage.x) vfx.clear()
    for (const k of ["c", "q", "e", "x"]) {
      const a = sage[k]
      if (a) for (const snd of [a.loop, a.loop2]) snd?.stop(0.2)
      sage[k] = null
    }
    if (sg3.orb) sg3.orb.visible = false
    if (sg3.wall) sg3.wall.visible = false
    sage.heal = sage.frost = 0
    shown.heal = shown.frost = 0
  }
  // An orb held for a moment in that hand (1 right, -1 left), following it: its mesh and the game's glow.
  function holdOrb(a, defs, now, side) {
    const t = (now - a.t0) / 1000
    if (m.lastHands.length) a.hand = sageHand(side)
    a.handPos.copy(at3(a.hand[0], a.hand[1], 8))
    a.held ||= vfx.spawn(defs, (v) => v.copy(a.handPos), { scale: 0.45 })
    placeOrb(a.handPos, Math.min(1, t / 0.2))
  }
  function dropOrb(a) {
    a.held?.stop()
    a.held = null
    if (sg3.orb) sg3.orb.visible = false
  }
  const newOrb = (now, side) => {
    const hand = sageHand(side)
    return { t0: now, hand, handPos: at3(hand[0], hand[1], 8), held: null, stage: 0 }
  }

  // Barrier Orb: the orb in his right hand, its flash as it's placed, then the wall erupts across the bottom of
  // the box, segment after segment from the middle, stands, and crumbles.
  // `hold` (by gesture): the orb stays in his hand until castBarrier.
  function startBarrier(now, hold = false) {
    if (sage.c || !vfx.ok || !sg3.wall) return
    sage.c = newOrb(now, 1)
    sage.c.hold = hold
    sfx.play("sage-barreira-equip", { pan: panAt(sage.c.hand[0]) })
  }
  function castBarrier(now) {
    const c = sage.c
    if (!c?.hold) return
    c.hold = false
    c.t0 = Math.min(c.t0, now - SG.EQUIP * 1000)
  }
  function updateBarrier(now) {
    const c = sage.c
    const t = (now - c.t0) / 1000
    const wall = sg3.wall
    if (c.hold) {
      if (now - sage.cross.last < 3000) return holdOrb(c, SAGE.C.held, now, 1)
      dropOrb(c)
      sage.c = null
      return
    }
    if (t < SG.EQUIP) return holdOrb(c, SAGE.C.held, now, 1)
    if (c.stage === 0) {
      dropOrb(c)
      const p = c.handPos.clone()
      vfx.spawn(SAGE.C.cast, (v) => v.copy(p), { scale: 0.35 })
      sfx.play("sage-barreira-cast", { pan: panAt(c.hand[0]) })
      // Its size: the four segments across a little more than the box, at their depth, in front of him. Its top
      // just under his chin (a third of the way up without a face), its foot wherever that puts it, below the box.
      const a = at3(-0.04, 0, 22),
        b = at3(1.04, 0, 22)
      c.k = a.distanceTo(b) / (WALL_N * 2.6) / 100
      const fb = faceBox()
      const topV = m.faceLm ? THREE.MathUtils.clamp(fb.top.y - fb.h - 0.04, 0.12, 0.45) : 0.3
      c.base = a.clone().lerp(b, 0.5)
      c.base.y = at3(0.5, topV, 22).y - 2.78 * c.k * 100
      wall.position.copy(c.base)
      wall.scale.setScalar(c.k * 100)
      wall.visible = true
      wall.userData.segs.forEach((s) => s.scale.set(1, 0.001, 1))
      wallMat.opacity = 1
      c.stage = 1
      c.formed = []
    }
    const segs = wall.userData.segs
    // Each segment: its delay from the middle out, then it shoots up (overshooting a little) with its burst.
    const order = segs.map((s, i) => Math.abs(i - (WALL_N - 1) / 2))
    const t1 = t - SG.EQUIP
    segs.forEach((s, i) => {
      const r = THREE.MathUtils.clamp((t1 - order[i] * 0.12) / SG.WALL_RISE, 0, 1)
      s.scale.y = Math.max(0.001, easeOutBack(r))
      if (r > 0 && !c.formed[i]) {
        c.formed[i] = true
        const p = new THREE.Vector3(s.position.x, 0, 0).multiplyScalar(c.k * 100).add(c.base)
        const top = p.clone().add(new THREE.Vector3(0, 2.4 * c.k * 100, 0))
        vfx.spawn(SAGE.C.form, (v) => v.copy(p), { scale: c.k * 0.6, segment: (u) => new THREE.Vector3(0, u * (top.y - p.y), 0) })
        if (i === Math.floor(WALL_N / 2)) sfx.play("sage-barreira-erupt")
      }
    })
    if (c.stage === 1 && t1 > SG.WALL_RISE + 0.3) {
      c.stage = 2
      const mid = c.base.clone()
      const half = WALL_N * 1.3 * c.k * 100
      c.stand = vfx.spawn(SAGE.C.stand, (v) => v.copy(mid).add(new THREE.Vector3(0, 2.2 * c.k * 100, 0)), { scale: c.k * 0.8, dur: SG.WALL_STAND, segment: (u) => new THREE.Vector3((u * 2 - 1) * half, 0, 0) })
    }
    // It crumbles: segment by segment, each with its smoke and chunks, sinking and fading.
    const tEnd = SG.WALL_RISE + SG.WALL_STAND
    if (t1 > tEnd) {
      if (c.stage === 2) {
        c.stage = 3
        sfx.play("sage-barreira-crumble")
        segs.forEach((s, i) => {
          const p = new THREE.Vector3(s.position.x, 1.2, 0).multiplyScalar(c.k * 100).add(c.base)
          setTimeout(() => sage.c === c && vfx.spawn(SAGE.C.crumble, (v) => v.copy(p), { scale: c.k * 0.55 }), i * 70)
        })
      }
      const k = THREE.MathUtils.clamp((t1 - tEnd) / 0.45, 0, 1)
      segs.forEach((s) => (s.scale.y = Math.max(0.001, 1 - k * 0.6)))
      wallMat.opacity = 1 - k
    }
    if (t1 > tEnd + 0.5) wall.visible = false
    if (t1 > tEnd + 2.2) sage.c = null
  }

  // Slow Orb: the orb in his right hand, thrown in an arc to the bottom of the box on the other side, the burst,
  // then the field: ether rising off a patch across the bottom, and frost creeping up him while it lasts.
  function startSlow(now) {
    if (sage.q || !vfx.ok || !sg3.orb) return
    sage.q = newOrb(now, 1)
    sfx.play("sage-lentidao-equip", { pan: panAt(sage.q.hand[0]) })
  }
  function updateSlow(now) {
    const q = sage.q
    const t = (now - q.t0) / 1000
    if (t < SG.EQUIP) return holdOrb(q, SAGE.Q.held, now, 1)
    if (q.stage === 0) {
      dropOrb(q)
      q.from = q.hand.slice()
      q.to = [THREE.MathUtils.clamp(1 - q.from[0], 0.3, 0.7), 0.04]
      q.pos = new THREE.Vector3()
      q.trail = vfx.spawn(SAGE.Q.trail, (v) => v.copy(q.pos), { scale: 0.35 })
      sfx.play("sage-lentidao-throw", { pan: panAt(q.from[0]) })
      q.stage = 1
    }
    const t1 = t - SG.EQUIP
    if (q.stage === 1) {
      const k = Math.min(1, t1 / SG.THROW)
      const u = THREE.MathUtils.lerp(q.from[0], q.to[0], k)
      const v = THREE.MathUtils.lerp(q.from[1], q.to[1], k * k) + Math.sin(Math.PI * k) * 0.15
      q.pos.copy(at3(u, v, 10 - 4 * k))
      placeOrb(q.pos, 0.8)
      if (k >= 1) {
        q.trail.stop()
        if (sg3.orb) sg3.orb.visible = false
        const p = at3(q.to[0], q.to[1], 8)
        vfx.spawn(SAGE.Q.impact, (v) => v.copy(p), { scale: 0.16 })
        vfx.spawn(SAGE.Q.poof, (v) => v.copy(p), { scale: 0.13 })
        // The patch: across the bottom of the box round where it landed.
        const a = at3(q.to[0] - 0.32, 0.0, 14),
          b = at3(q.to[0] + 0.32, 0.0, 14)
        q.zone = vfx.spawn(SAGE.Q.zone, (v) => v.copy(a), { scale: 0.09, dur: SG.SLOW_LAST, segment: (r) => b.clone().sub(a).multiplyScalar(r) })
        q.slowed = vfx.spawn(
          SAGE.Q.slowed,
          (v) => {
            if (!pose.seen) return v.set(0, -1e4, 0)
            const c = new THREE.Vector2().addVectors(pose.left, pose.right).multiplyScalar(0.5)
            return v.copy(at3(c.x + (Math.random() - 0.5) * 0.3, c.y - 0.12 - Math.random() * 0.2, 2))
          },
          { scale: 0.3, dur: SG.SLOW_LAST },
        )
        sfx.play("sage-lentidao-explode", { pan: panAt(q.to[0]) })
        q.loop = sfx.play("sage-lentidao-loop", { loop: true, pan: panAt(q.to[0]) * 0.5, gain: 0.8 })
        sage.maskUntil = now + (SG.SLOW_LAST + 1.5) * 1000
        q.stage = 2
      }
      return
    }
    const t2 = t1 - SG.THROW
    // The frost: up him over a second and a half, holding, gone over the last half second.
    sage.frost = Math.min(Math.min(1, t2 / 1.5), Math.max(0, (SG.SLOW_LAST - t2) / 0.6))
    if (q.stage === 2 && t2 > SG.SLOW_LAST) {
      q.stage = 3
      const p = at3(q.to[0], 0.04, 8)
      vfx.spawn(SAGE.Q.exit, (v) => v.copy(p), { scale: 0.13 })
      q.loop?.stop(0.5)
      sfx.play("sage-lentidao-end", { pan: panAt(q.to[0]) })
    }
    if (t2 > SG.SLOW_LAST + 2) sage.q = null
  }

  // Healing Orb: the orb in his right hand, then it's spent on him: the burst on his chest, five seconds of jade
  // light over him with petals and wisps rising off his shoulders and arms.
  function startHeal(now) {
    if (sage.e || !vfx.ok) return
    sage.e = newOrb(now, 1)
    sfx.play("sage-cura-equip", { pan: panAt(sage.e.hand[0]) })
  }
  const chest = () => (pose.seen ? new THREE.Vector2().addVectors(pose.left, pose.right).multiplyScalar(0.5) : new THREE.Vector2(0.5, 0.3))
  function updateHeal(now) {
    const e = sage.e
    const t = (now - e.t0) / 1000
    if (t < SG.EQUIP * 0.75) return holdOrb(e, SAGE.E.held, now, 1)
    if (e.stage === 0) {
      dropOrb(e)
      const c = chest()
      const p = at3(c.x, c.y + 0.05, 6)
      vfx.spawn(SAGE.E.start, (v) => v.copy(p), { scale: 0.12 })
      // Over him: from shoulder to shoulder, and a little above them.
      e.loopFx = vfx.spawn(
        SAGE.E.loop,
        (v) => {
          const c = chest()
          const w = pose.seen ? Math.abs(pose.left.x - pose.right.x) : 0.3
          return v.copy(at3(c.x + (Math.random() - 0.5) * w * 1.1, c.y - 0.1 + Math.random() * 0.25, 4))
        },
        { scale: 0.35, dur: SG.HEAL_LAST },
      )
      sfx.play("sage-cura-cast")
      e.loop = sfx.play("sage-cura-loop", { loop: true, gain: 0.8 })
      sage.maskUntil = now + (SG.HEAL_LAST + 1.5) * 1000
      e.stage = 1
    }
    const t1 = t - SG.EQUIP * 0.75
    sage.heal = Math.max(sage.heal, Math.min(Math.min(1, t1 / 0.4), Math.max(0, (SG.HEAL_LAST - t1) / 0.8)) * (0.75 + 0.25 * Math.sin(t1 * 5)))
    if (e.stage === 1 && t1 > SG.HEAL_LAST) {
      e.stage = 2
      e.loop?.stop(0.6)
    }
    if (t1 > SG.HEAL_LAST + 1.5) sage.e = null
  }

  // Resurrection: both hands glowing a second, then a column of light comes down on him, the bloom and the
  // crystals burst out, and he glows jade a while after.
  function startRes(now) {
    if (sage.x || !vfx.ok) return
    const x = { t0: now, stage: 0, hands: [new THREE.Vector3(), new THREE.Vector3()], equip: [] }
    sage.x = x
    sfx.play("sage-ult-equip")
    sage.maskUntil = now + (SG.X_EQUIP + SG.X_RES + 3) * 1000
  }
  function updateRes(now) {
    const x = sage.x
    const t = (now - x.t0) / 1000
    if (x.stage === 0) {
      ;[-1, 1].forEach((side) => {
        const spot = (v) => {
          const h = handAt(side)
          return v.copy(at3(h[0], h[1], 8))
        }
        x.equip.push(vfx.spawn(SAGE.X.equip, spot, { scale: 0.45, dur: SG.X_EQUIP }))
      })
      x.stage = 1
    }
    if (x.stage === 1 && t > SG.X_EQUIP) {
      x.stage = 2
      const c = chest()
      const top = at3(c.x, 1.05, 2),
        mid = at3(c.x, c.y + 0.12, 4)
      // The light comes down his length: shafts and wisps along a line from above the box to his chest.
      vfx.spawn(SAGE.X.column, (v) => v.copy(mid), { scale: 0.09, dur: SG.X_RES, segment: (r) => top.clone().sub(mid).multiplyScalar(r) })
      vfx.spawn(SAGE.X.res, (v) => v.copy(mid), { scale: 0.12 })
      sfx.play("sage-ult-res")
    }
    if (x.stage >= 2) {
      const t1 = t - SG.X_EQUIP
      sage.heal = Math.max(sage.heal, Math.min(Math.min(1, t1 / 0.5) * 1.4, Math.max(0, (SG.X_RES + 1.6 - t1) / 1.6)))
    }
    if (t > SG.X_EQUIP + SG.X_RES + 3) sage.x = null
  }
  // The barrier by gesture, from the body tracker's arms: forearms crossed in an X in front of the chest (each
  // wrist past the middle, on the other shoulder's side, above the belly) for a moment brings the orb to his
  // right hand; opening them (the wrists back on their own sides, wider than the shoulders, or out of the
  // picture) casts the wall. Held crossed over 3 s without opening, the orb goes away.
  function armsSide(lm) {
    const ok = (i) => lm[i].visibility > 0.3
    if (!ok(11) || !ok(12)) return null
    const s = Math.sign(lm[11].x - lm[12].x)
    const sw = Math.abs(lm[11].x - lm[12].x)
    return { s, sw, mid: (lm[11].x + lm[12].x) / 2, low: Math.max(lm[11].y, lm[12].y) + 1.4 * sw * (video.videoWidth / video.videoHeight || 16 / 9), wrists: ok(15) && ok(16) }
  }
  function armsCrossed(lm) {
    const a = armsSide(lm)
    if (!a || !a.wrists) return false
    return (lm[15].x - a.mid) * a.s < -0.08 * a.sw && (lm[16].x - a.mid) * a.s > 0.08 * a.sw && lm[15].y < a.low && lm[16].y < a.low
  }
  function armsOpen(lm) {
    const a = armsSide(lm)
    if (!a) return false
    return !a.wrists ? lm[15].visibility < 0.3 && lm[16].visibility < 0.3 : (lm[15].x - lm[16].x) * a.s > 1.1 * a.sw
  }
  function sageArms(lm, now) {
    const x = sage.cross
    if (!sage.c) x.armed = false
    if (lm && armsCrossed(lm)) {
      x.since ||= now
      x.last = now
      if (!x.armed && !sage.c && now - x.since > 120) {
        x.armed = true
        startBarrier(now, true)
      }
      return
    }
    x.since = 0
    if (x.armed && lm && armsOpen(lm)) {
      x.armed = false
      castBarrier(now)
    }
  }

  return {
    ligar: () => vfx.preload(SAGE),
    desligar: sageReset,
    acao: (a, now) => ({ barreira: startBarrier, lentidao: startSlow, cura: startHeal, ult: startRes })[a]?.(now),
    // The hands (to hold the orbs), the face (the wall's top under the chin), the arms every time (the gesture), and
    // the body mask while the heal or the frost is on him.
    quer: (now) => ({ maos: true, rosto: true, ombros: "sempre", corpo: now < sage.maskUntil }),
    pose: sageArms,
    atualizar(now, dt) {
      sage.heal = 0
      sage.frost = 0
      if (sage.c) updateBarrier(now)
      if (sage.q) updateSlow(now)
      if (sage.e) updateHeal(now)
      if (sage.x) updateRes(now)
      shown.heal += (sage.heal - shown.heal) * Math.min(1, dt * 10)
      shown.frost += (sage.frost - shown.frost) * Math.min(1, dt * 8)
      // Her heal and resurrection: a jade light over him and a glow round his outline; the slow field's frost.
      m.corpo.brilho(0, [0.25, 1.0, 0.72], shown.heal, [0.16, 0.7, 0.6])
      m.corpo.gelo = shown.frost
    },
    desenhar(fase, r) {
      if (fase === "frente" && ((sg3.orb && sg3.orb.visible) || (sg3.wall && sg3.wall.visible))) {
        r.renderer.clearDepth()
        r.renderer.render(sg3.scene, r.headCam)
      }
    },
    ocupado: () => !!(sage.c || sage.q || sage.e || sage.x),
    hud: () => `sage: peças ${sg3.ok}/2${sage.c ? " · barreira" : ""}${sage.q ? " · lentidão" : ""}${sage.e ? " · cura" : ""}${sage.x ? " · ressurreição" : ""}`,
    estado: { sage, sg3, armsCrossed, armsOpen },
  }
}
