// Sova's abilities on the camera (Valorant), with the game's own pieces and effects. The module's shape is every
// filter's (../README.md): `filtros` for the dock and the page, `criar` for what it does. His look (his hair, the fur
// collar, the cape and the folded bow on his back) is the page's, in filtros.html's AGENTS.
//
// The game's own bow, arrows, Recon Bolt head and Owl Drone in 3D (privado/valorant/sova/files/, extracted read-only
// from the installed game, never published), lit in the 3D camera's space (centimetres), and their effects through
// vfx.js (efeitos.js, the game's values). Two by gesture: the bow (both hands closed, one fist against the other,
// opens it between them; pulling them apart draws it, the hand nearer the face on the string and his bow in the
// other, opening the further the hands part; opening a hand shoots a Recon Bolt from it towards the other hand, to the
// edge of the camera, where it sticks, its head spins and two sonar pulses go out; whoever they cross is revealed, in
// Valorant's red outline with the marker over the head) and the Owl Drone (both palms open to the camera, side by
// side: the drone opens between them, flies up beside his head, tags him with its dart, which reveals him twice, and
// flies off). From the dock (or keys E, Q, C, X): Flecha de Reconhecimento (E: the bow drawn and shot by itself),
// Flecha de Choque (Q: the Shock Bolt drawn and shot up, off the top of the box and bursting by his shoulder, the
// camera shakes), Drone Coruja (C) and Ultimate (X, Hunter's Fury: his bow turned to energy, three shots charged and
// fired across the box, the camera darkened a little). The dock's switch "Coruja sobrevoando" (`opcoes.patrulha`,
// or ?patrulha, key P) keeps the drone flying behind him, side to side above his shoulders (he covers it as it passes
// behind him); the drone ability is then that drone coming round to his side and going back. ?arco=<scale> (30) and
// ?coruja=<scale> (30) size the bow and the drone. In the box's screen space only the red reveal, the marker over the
// head and the ultimate's darkening, through the engine's effects on his body (`corpo`). Times in ms
// (performance.now()). Without the game's files it does nothing.

export const filtros = [
  {
    id: "sova",
    nome: "Sova",
    jogo: "Valorant",
    rosto: "../valorant/agentes/sova.webp",
    sons: "sova-",
    tint: "sova",
    atalho: "7",
    acoes: [
      ["drone", "C", "Drone Coruja"],
      ["choque", "Q", "Flecha de Choque"],
      ["recon", "E", "Flecha de Reconhecimento"],
      ["ult", "X", "Ultimate"],
    ],
    opcoes: [["patrulha", "Coruja sobrevoando"]],
    gestos: [
      ["Arco", "feche as duas mãos e encoste um punho no outro; afaste as mãos para puxar a corda e abra a mão da corda para atirar a Flecha de Reconhecimento."],
      ["Drone Coruja", "mostre as duas palmas abertas para a câmera, lado a lado."],
    ],
  },
]

export async function criar(m) {
  const SOVA = await import("./efeitos.js")
  const { THREE, GLTFLoader, vfx, sfx, q, video, uniforms, GLSL_COMMON, quad, at3, onBox, toScreen, panAt, pan3, faceBox, headAt, headPos, handShape } = m
  const { toEdge, clamp01, ease, bez, bezDir, easeOutBack, roomEnv, corpo, sacudir, fail } = m

  const sova = {
    // The bow: by gesture or the dock (auto, with the arrow it'll shoot); its hands on screen (a holds it, b
    // pulls the string), how much of it shows, how far it's drawn.
    // By gesture, g follows the two hands (where each was last, a hand opening, a hand lost) and d0 is how far
    // apart they were as it opened.
    bow: { state: "idle", since: 0, amt: 0, draw: 0, auto: 0, kind: "recon", a: new THREE.Vector2(0.75, 0.5), b: new THREE.Vector2(0.6, 0.5), g: null, d0: null },
    fists: 0, // since when both fists are together (the bow's gesture, before it opens)
    arrow: null, // { kind, pts: [Vector3...], legs: [ms...], t0, leg, sys }: in flight
    dart: null, // { tip, dir, t0, d, pulses: [...] }: the Recon Bolt stuck where it landed
    ult: null, // { t0, fired, charging, sys }
    drone: null, // { t0, from, side, patrol, darted }: the drone ability
    owl: { since: 0 }, // the drone's gesture, while it's held
    // The drone flying behind him (the dock's "Coruja sobrevoando", or ?patrulha): wanted, how far in it is,
    // where it is round its loop, the point it loops round (his head, followed slowly) and the side it came in.
    patrol: { want: q.has("patrulha"), amt: 0, ph: 0, anchor: null, side: 1 },
    reveals: [], // when the red reveal flashed (ms), for its fading
    maskUntil: 0, // the body mask is needed (for the reveal) until then
  }
  // Valorant's red, for the reveal on him.
  const REVEAL = [1.0, 0.27, 0.33]
  const PULSES = [0.4, 1.9] // the Recon Bolt's two sonar pulses, seconds after it lands
  const DART_LIFE = 4.2
  const ULT = { SHOTS: [1.2, 2.5, 3.8], CHARGE: 0.9, END: 4.6 }
  const DRONE = { OPEN: 0.5, FLY: 1.7, DART: 3.0, LEAVE: 5.6, END: 6.8 }
  function reveal(now) {
    sova.reveals.push(now)
    sova.maskUntil = Math.max(sova.maskUntil, now + 1500)
  }

  // The pieces, each lit by the cars' room (their reflections) and two lights.
  const HUNTER = "privado/valorant/sova/files/ShooterGame/Content/Characters/Hunter/S0/"
  const sv3 = { held: new THREE.Scene(), free: new THREE.Scene() }
  for (const sc of [sv3.held, sv3.free]) {
    sc.add(new THREE.HemisphereLight(0xe4ecff, 0x2a3042, 1.7))
    const sun = new THREE.DirectionalLight(0xffffff, 2.2)
    sun.position.set(0.4, 1, 1)
    sc.add(sun)
  }
  function loadPiece(path, done) {
    new GLTFLoader().load(
      HUNTER + path,
      (g) => {
        const env = roomEnv()
        g.scene.traverse((o) => {
          if (!o.isMesh) return
          o.frustumCulled = false
          // The energy inlays glow (the game draws them emissive).
          if (/Emissive/.test(o.material.name)) {
            o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.85, 1), name: o.material.name })
            return
          }
          if (o.material.map) o.material.map.colorSpace = THREE.NoColorSpace
          o.material.envMap = env
          o.material.envMapIntensity = 0.8
        })
        done(g.scene)
      },
      undefined,
      (e) => fail("sova", e),
    )
  }
  const glowMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })

  // His bow (the ultimate's model, the one all his abilities draw): in its own metres the arrow points +x, the
  // limbs run along y and the string rests 0.408 behind the grip, 0.129 above it, where the arrow lies.
  // Its size: drawn fully, its string reaches the pulling hand (so it's as big as his reach), within a range
  // round ?arco= (centimetres per game metre, 30).
  const BOW_K = Number(q.get("arco") || 30)
  const BOW = { REST: -0.408, PULL: 0.42, LINE: 0.129 }
  // By gesture it opens from 0.7 of that size, fists together, to this much at a full draw (the box is only
  // about 35 cm tall at his face, and the bow 46 at 30).
  const BOW_FIT = 1.1
  const bow3 = { root: new THREE.Group(), model: null, string: null, glow: null, arrows: {}, arrow: null, k: BOW_K }
  bow3.root.matrixAutoUpdate = false
  bow3.root.visible = false
  sv3.held.add(bow3.root)
  loadPiece("Ability_X/1P/Models/AB_Hunter_S0_X_Bow_Skelmesh.glb", (mesh) => {
    mesh.scale.setScalar(BOW_K)
    bow3.root.add(mesh)
    bow3.model = mesh
    bow3.string = mesh.getObjectByName("String")
    mesh.traverse((o) => {
      if (!o.isMesh) return
      // The string: a line of light. The energy inlays: lit up for the ultimate.
      if (/String/.test(o.material.name)) o.material = glowMat(new THREE.Color(0.55, 0.9, 1))
      else if (/Emissive/.test(o.material.name)) bow3.glow = o.material
    })
  })
  // The arrows, nocked on the string (children of the bow's model, in its metres: tail at 0, head at +0.8).
  const ARROWS = { recon: "Ability_Q/1P/Models/AB_Hunter_S0_Q_Arrow_Staticmesh.glb", choque: "Ability_4/1P/Models/AB_Hunter_S0_4_Arrow_Staticmesh.glb", ult: "Ability_X/1P/Models/AB_Hunter_S0_X_Arrow_Staticmesh.glb" }
  const ARROW_LEN = 0.8
  // One in flight, one stuck in a wall: copies scaled like the bow, outside it.
  const flying = new THREE.Group(), stuck = new THREE.Group()
  let stuckArrow = null
  flying.visible = stuck.visible = false
  sv3.free.add(flying, stuck)
  for (const [kind, path] of Object.entries(ARROWS))
    loadPiece(path, (mesh) => {
      mesh.visible = false
      bow3.arrows[kind] = mesh
      const tryAdd = () => (bow3.model ? bow3.model.add(mesh) : setTimeout(tryAdd, 200))
      tryAdd()
      if (kind === "ult") {
        mesh.traverse((o) => o.isMesh && (o.material = glowMat(new THREE.Color(0.3, 0.75, 1))))
        return
      }
      const c = mesh.clone()
      c.scale.setScalar(BOW_K)
      c.name = kind
      c.visible = false
      flying.add(c)
      if (kind === "recon") {
        stuckArrow = mesh.clone()
        stuckArrow.scale.setScalar(BOW_K)
        stuckArrow.visible = true
        stuck.add(stuckArrow)
      }
    })
  // The Recon Bolt's head, opened where it lands: it spins on the bolt.
  const reconHead = new THREE.Group()
  stuck.add(reconHead)
  loadPiece("VFX/Models/Hunter_Q_FX_Rotate_S0_Staticmesh_v2.glb", (mesh) => {
    mesh.scale.setScalar(1.75)
    // Its material's diffuse is the bow's (the export took the white one).
    const df = new THREE.TextureLoader().load(HUNTER + "3P/Models/Materials/HunterBow_S0_DF.png")
    df.flipY = false
    df.colorSpace = THREE.NoColorSpace
    mesh.traverse((o) => o.isMesh && o.material.isMeshStandardMaterial && ((o.material.map = df), (o.material.needsUpdate = true)))
    reconHead.add(mesh)
  })

  // Points on the bow, for the effects: the arrow's head, the nock and the string's ends.
  const bowPt = (x, y, z = 0) => (bow3.model ? bow3.model.localToWorld(new THREE.Vector3(x, y, z)) : new THREE.Vector3())
  function arrowTip() {
    const a = bow3.arrow
    return a ? a.localToWorld(new THREE.Vector3(ARROW_LEN - 0.03, 0, 0)) : bowPt(0.39, BOW.LINE)
  }
  // Places the bow: its grip at G, the string pulled towards N (both in camera space), `draw` (0..1) of the way
  // from rest to a full draw, scaled by `amt` as it shows. Its size: with `fit` (by gesture), so the string is
  // at N however far it's drawn (it opens as the hands part); otherwise so a full draw reaches N.
  const bowAxis = new THREE.Vector3(1, 0, 0)
  function placeBow(G, N, draw, amt, kind, fit) {
    const u = G.clone().sub(N)
    if (u.lengthSq() < 1e-6) u.set(1, 0, 0)
    u.normalize()
    bowAxis.copy(u)
    // Upright in the picture whichever way it aims, its face to the camera.
    const v = new THREE.Vector3(0, 1, 0).addScaledVector(u, -u.y)
    if (v.lengthSq() < 1e-4) v.set(-u.y, u.x, 0)
    v.normalize()
    const w = u.clone().cross(v)
    const k = Math.max(1e-3, easeOutBack(amt))
    bow3.root.matrix.makeBasis(u, v, w).scale(new THREE.Vector3(k, k, k)).setPosition(G)
    bow3.root.matrixWorldNeedsUpdate = true
    bow3.root.visible = amt > 0
    if (!bow3.model) return
    const reach = THREE.MathUtils.clamp(G.distanceTo(N) / (-BOW.REST + BOW.PULL * (fit ? draw : 1)), BOW_K * 0.7, BOW_K * (fit ? BOW_FIT : 1.5))
    bow3.k += (reach - bow3.k) * (amt < 1 ? 1 : fit ? 0.6 : 0.3)
    bow3.model.scale.setScalar(bow3.k)
    bow3.root.updateMatrixWorld(true)
    const sx = BOW.REST - BOW.PULL * draw
    if (bow3.string) {
      const t = bow3.model.localToWorld(new THREE.Vector3(sx, BOW.LINE, 0))
      bow3.string.parent.updateMatrixWorld(true)
      bow3.string.position.copy(bow3.string.parent.worldToLocal(t))
    }
    for (const [k2, a] of Object.entries(bow3.arrows)) a.visible = k2 === kind
    bow3.arrow = bow3.arrows[kind] || null
    if (bow3.arrow) bow3.arrow.position.set(sx, BOW.LINE, 0)
  }
  // The bow where the hands are now: the grip and the pulling hand at the depth of his face, a little nearer
  // the camera.
  function placeBowNow(kind) {
    const bow = sova.bow
    const fit = bow.state === "draw" && !bow.auto && !sova.ult
    placeBow(at3(bow.a.x, bow.a.y, 10), at3(bow.b.x, bow.b.y, 10), bow.draw, bow.amt, kind, fit)
  }

  // Where each hand holds the bow on screen: the bow hand by its knuckles, the string hand between its thumb
  // and index fingertips.
  function bowHands(B, S, k) {
    const sb = sova.bow
    sb.a.lerp(new THREE.Vector2(...toScreen(B.k.x, B.k.y)), k)
    sb.b.lerp(new THREE.Vector2(...toScreen((S.h[4].x + S.h[8].x) / 2, (S.h[4].y + S.h[8].y) / 2)), k)
  }
  // What the gestures say, for ?debug's hands line.
  let info = ""
  // The bow by gesture: both hands closed, one fist against the other, for 0.2 s opens it between them; pulling
  // them apart draws it (the hand nearer the face pulls the string, the other holds the bow), and opening a hand
  // lets the Recon Bolt go, from that hand towards the other. Losing a hand once it's a third drawn lets it go
  // too (a quick release blurs); opening or losing one before that folds it.
  function sovaHands(r, now) {
    const va = video.videoWidth / video.videoHeight || 16 / 9
    const hs = (r.landmarks || []).slice(0, 2).map((h, i) => handShape(h, r.gestures?.[i]?.[0]?.categoryName, va))
    owlHands(hs, now)
    const bow = sova.bow
    if (bow.auto || sova.ult) return
    const nose = m.faceLm ? m.faceLm[1] : { x: 0.5, y: 0.4 }
    const fw = m.faceLm ? Math.abs(m.faceLm[454].x - m.faceLm[234].x) * va : 0.2
    const toNose = (p) => Math.hypot((p.x - nose.x) * va, p.y - nose.y)
    const [A, B] = hs
    if (bow.state === "idle") {
      const together = hs.length === 2 && A.fist && B.fist && A.d(A.k, B.k) < 0.95 * (A.s + B.s)
      if (!together) {
        sova.fists = 0
        return
      }
      sova.fists ||= now
      info += " · punhos"
      if (now - sova.fists < 200) return
      sova.fists = 0
      const [S, G] = toNose(A.k) <= toNose(B.k) ? [A, B] : [B, A]
      bow.g = { pa: G.k, pb: S.k, opened: 0, lost: 0, gi: hs.indexOf(G), si: hs.indexOf(S) }
      Object.assign(bow, { state: "draw", since: now, kind: "recon", d0: null, draw: 0 })
      bowHands(G, S, 1)
      bowSound("recon")
      return
    }
    const g = bow.g
    if (bow.state !== "draw" || !g) return
    if (hs.length < 2) {
      g.lost ||= now
      if (now - g.lost > 150) bow.draw >= 0.35 ? shoot("recon", now) : foldBow()
      return
    }
    g.lost = 0
    // The same hands as before (the tracker's order can swap), then which pulls the string: the one nearer the
    // face, by a margin (he can change sides while drawing).
    const sq = (p, o) => (p.x - o.x) ** 2 + (p.y - o.y) ** 2
    let [G, S] = sq(A.k, g.pa) + sq(B.k, g.pb) <= sq(B.k, g.pa) + sq(A.k, g.pb) ? [A, B] : [B, A]
    if (toNose(G.k) < toNose(S.k) - 0.35 * fw) [G, S] = [S, G]
    g.pa = G.k
    g.pb = S.k
    // Where the hands hold it is set on every frame (followBow), from the hands as carried between answers.
    g.gi = hs.indexOf(G)
    g.si = hs.indexOf(S)
    info += ` · arco ${Math.round(bow.draw * 100)}%`
    // A hand open for two frames lets go: the one that opened was pulling the string.
    if (!G.open && !S.open) {
      g.opened = 0
      return
    }
    if (++g.opened < 2) return
    if (bow.draw < 0.25) return foldBow()
    if (G.open && !S.open) {
      bowHands(S, G, 1)
      placeBowNow(bow.kind)
    }
    shoot("recon", now)
  }
  // While drawn by hand, the bow is held where the hands are on this frame (as the engine carries them between the
  // tracker's answers).
  function followBow() {
    const b = sova.bow
    const g = b.g
    if (b.state !== "draw" || !g || b.auto || sova.ult || g.gi === g.si || !m.lastHands[g.gi] || !m.lastHands[g.si]) return
    const va = video.videoWidth / video.videoHeight || 16 / 9
    bowHands(handShape(m.lastHands[g.gi], undefined, va), handShape(m.lastHands[g.si], undefined, va), 0.8)
  }
  const foldBow = () => {
    bowQuiet("sova-bow-fold")
    Object.assign(sova.bow, { state: "idle", g: null })
  }
  // The bow's sounds: out, with its charge and a hum while it's drawn and a tick at half and at full draw
  // (updateSova), then let go (shoot) or folded unshot.
  let bowSnd = null
  function bowSound(kind) {
    bowSnd?.hum.stop(0.1)
    const shock = kind === "choque"
    const pan = panAt(sova.bow.a.x)
    sfx.play(shock ? "sova-shock-equip" : "sova-recon-equip", { pan })
    sfx.play(shock ? "sova-shock-charge" : "sova-recon-charge", { pan, gain: 0.8, delay: 0.12 })
    bowSnd = { lvl: 0, hum: sfx.play(shock ? "sova-shock-hum" : "sova-charge-hum", { loop: true, pan, gain: 0.7 }) }
  }
  function bowQuiet(cue) {
    if (!bowSnd) return
    bowSnd.hum.stop(0.1)
    bowSnd = null
    if (cue) sfx.play(cue, { pan: panAt(sova.bow.a.x) })
  }
  // The Owl Drone's gesture: both palms open to the camera, fingers up, side by side (thumbs towards each
  // other, so not the backs of the hands, and apart, so not a clap). Held 0.3 s, the drone opens between them
  // (or, flying behind him, comes).
  function isOwl(hs) {
    if (hs.length < 2) return false
    const [A, B] = hs
    const up = (x) => x.h[0].y - x.h[12].y > 1.1 * x.s
    const flat = (x) => x.d(x.h[5], x.h[17]) > 0.45 * x.d(x.h[0], x.h[9])
    const inward = (x, o) => x.d(x.h[4], o.h[0]) < x.d(x.h[20], o.h[0])
    const s = (A.s + B.s) / 2
    return A.open && B.open && up(A) && up(B) && flat(A) && flat(B) && inward(A, B) && inward(B, A) && A.d(A.k, B.k) > 1.0 * s && Math.abs(A.k.y - B.k.y) < 1.5 * s
  }
  function owlHands(hs, now) {
    const o = sova.owl
    if (!isOwl(hs)) {
      o.since = 0
      return
    }
    o.since ||= now
    info += " · coruja"
    if (now - o.since > 300 && !sova.drone) {
      const [A, B] = hs
      const mid = toScreen((A.k.x + B.k.x) / 2, (A.k.y + B.k.y) / 2)
      startDrone(now, at3(mid[0], mid[1], 12))
      o.since = Infinity
    }
  }

  // The dock's Flecha de Reconhecimento and Flecha de Choque: the bow drawn beside the face, toward the side with
  // more room, shot by itself.
  function autoBow(kind, now) {
    if (sova.bow.state !== "idle" || sova.ult) return
    const f = faceBox()
    const side = f.c.x < 0.5 ? 1 : -1
    sova.bow.a.set(clamp01(f.c.x + side * f.w * 2.3, 0.08, 0.92), f.c.y - f.w * 0.5)
    sova.bow.b.set(f.c.x + side * f.w * 0.5, f.c.y - f.w * 0.45)
    Object.assign(sova.bow, { state: "draw", since: now, auto: now, kind })
    bowSound(kind)
  }
  // The arrow leaves the bow: the Recon Bolt flies to the edge of the box where it points and sticks there; the
  // Shock Bolt flies up, bounces off the top of the box and bursts by his shoulder on that side.
  function shoot(kind, now) {
    // One arrow in the air at a time: the one before gets where it was going now.
    if (sova.arrow) finishArrow(sova.arrow, now)
    const tip = arrowTip()
    const from = onBox(tip)
    const dir2 = onBox(tip.clone().add(bowAxis)).sub(from).normalize()
    const depth = (p) => at3(p.x, p.y, tip.z - (m.headSeen ? headPos.z : -65))
    let pts
    if (kind === "recon") pts = [tip, depth(toEdge(from, dir2, 0.02))]
    else {
      const f = faceBox()
      const side = Math.sign(sova.bow.a.x - f.c.x) || 1
      const up = toEdge(from, new THREE.Vector2(dir2.x * 0.5, 1).normalize(), 0.03)
      const land = new THREE.Vector2(clamp01(f.c.x + side * f.w * 1.5), clamp01(f.c.y - f.w * 1.5))
      pts = [tip, depth(up), depth(land)]
    }
    const legs = pts.slice(1).map((p, i) => Math.max(110, (onBox(p).distanceTo(onBox(pts[i])) / 2.6) * 1000))
    const a = { kind, pts, legs, t0: now, leg: 0, at: tip.clone(), dir: pts[1].clone().sub(tip).normalize(), k: bow3.k }
    a.sys = vfx.spawn(kind === "recon" ? SOVA.E.trail : SOVA.Q.trail, (v) => v.copy(a.at), { scale: 0.3, dir: () => a.dir })
    sova.arrow = a
    sova.maskUntil = now + 6500
    bowQuiet("sova-bow-release")
    Object.assign(sova.bow, { state: "idle", auto: 0, g: null })
  }
  // An arrow at the end of its flight: the Recon Bolt sticks, the Shock Bolt bursts.
  function finishArrow(a, now) {
    a.sys.stop()
    const end = a.pts[a.pts.length - 1]
    if (a.kind === "recon") land(end, a.dir.clone(), a.k, now)
    else {
      // The game's blast is 4 m across; here about two faces.
      vfx.spawn(SOVA.Q.boom, (v) => v.copy(end), { scale: 0.07, dur: 0.05 })
      sfx.play("sova-shock-explode", { pan: pan3(end) })
      sacudir(380, 10, now)
    }
    sova.arrow = null
  }
  function startUlt(now) {
    if (sova.ult) return
    sova.arrow?.sys.stop()
    sova.arrow = null
    const f = faceBox()
    const side = f.c.x < 0.5 ? 1 : -1
    sova.bow.a.set(clamp01(f.c.x + side * f.w * 2.4, 0.08, 0.92), f.c.y - f.w * 0.35)
    sova.bow.b.set(f.c.x + side * f.w * 0.5, f.c.y - f.w * 0.35)
    Object.assign(sova.bow, { state: "idle", auto: 0 })
    bowQuiet()
    const pan = panAt(sova.bow.a.x)
    sfx.play("sova-ult-equip", { pan })
    sova.ult = { t0: now, fired: 0, charging: -1, pan, hum: sfx.play("sova-ult-hum", { loop: true, pan, gain: 0.8 }), sys: vfx.spawn(SOVA.X.bow, (v) => v.copy(limbPoint()), { scale: bow3.k / 100 }) }
  }
  // A point along the bow's limbs, at random (where Amb_EnergyBow1P_VFX's loops crawl: 17 to 53 cm from the grip).
  const LIMB = [0.17, 0.28, 0.36, -0.34, -0.45, -0.53]
  const limbPoint = () => bowPt(-0.06, LIMB[Math.floor(Math.random() * LIMB.length)] * (0.9 + Math.random() * 0.25), 0.01)

  // The Owl Drone: in its metres it faces +x, up +y, its two eyes 2.5 cm either side of the middle, its ducted
  // turbines at ±0.18 on z (their rings face forward). The ability: it opens where it's thrown (between the
  // palms, by the gesture), flies up beside his head, looks at him, tags him with its dart (which reveals him
  // twice) and flies off. With the dock's "Coruja sobrevoando" it flies behind him all the while (below), and
  // the ability is that drone coming round to beside his head and going back.
  // In its own scene: behind him it's drawn first, under him (his body's mask in front of it), else on top.
  const DRONE_K = Number(q.get("coruja") || 30)
  const drone3 = { root: new THREE.Group(), model: null, discs: [], behind: false, eyes: null }
  drone3.root.visible = false
  sv3.drone = new THREE.Scene()
  sv3.drone.add(new THREE.HemisphereLight(0xe4ecff, 0x2a3042, 1.7))
  const droneSun = new THREE.DirectionalLight(0xffffff, 2.2)
  droneSun.position.set(0.4, 1, 1)
  sv3.drone.add(droneSun, drone3.root)
  // His body as the nearest depth, where the mask has him: what's drawn behind it after is hidden.
  const occludeScene = quad(
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, -1.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        void main() {
          if (maskAt(vUv, 0.0) < 0.5) discard;
          gl_FragColor = vec4(0.0);
        }`,
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      depthFunc: THREE.AlwaysDepth,
    }),
  )
  const DRONE_EYE = new THREE.Vector3(0.085, 0.04, 0)
  loadPiece("Ability_E/1P/Models/AB_Hunter_S0_E_Skelmesh.glb", (mesh) => {
    mesh.scale.setScalar(DRONE_K)
    // Its +x to the group's +z, so the group's lookAt points it.
    mesh.rotation.y = -Math.PI / 2
    drone3.root.add(mesh)
    drone3.model = mesh
    // The turbines' blades, blurred spinning (Hunter_C_Propellers: the blur in (0, 3, 10)).
    const blur = new THREE.TextureLoader().load(HUNTER + "VFX/Textures/Hunter_C_Propellers_Blur.png")
    blur.colorSpace = THREE.NoColorSpace
    for (const z of [-0.18, 0.18]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), new THREE.MeshBasicMaterial({ map: blur, color: new THREE.Color(0.35, 0.75, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
      disc.position.set(0.072, -0.018, z)
      disc.rotation.y = Math.PI / 2
      mesh.add(disc)
      drone3.discs.push(disc)
    }
  })
  // Flying behind him: round an ellipse behind his head (centimetres from it: 38 to either side, 26 to 46
  // behind), a little above his shoulders, bobbing; a loop takes about 8 s, a little faster and slower in turn.
  const PATROL = { A: 38, Y: 4, Z: -36, B: 10, SPEED: 0.75 }
  const patrolPoint = (ph) => sova.patrol.anchor.clone().add(new THREE.Vector3(Math.sin(ph) * PATROL.A, PATROL.Y + Math.sin(ph * 2 + 0.7) * 4, PATROL.Z - Math.cos(ph) * PATROL.B))
  // Where it comes in from and leaves to: up and out of the box on a side.
  const patrolOff = (side) => headAt().add(new THREE.Vector3(side * 110, 55, -40))
  // A curve's middle point round his side, from a point behind him to one beside his head (either way): wide
  // enough that it never crosses him.
  const roundSide = (a, b, side, head) => new THREE.Vector3(head.x + side * Math.max(Math.abs(a.x - head.x), Math.abs(b.x - head.x), 42), Math.max(a.y, b.y) + 12, (a.z + b.z) / 2)

  function startDrone(now, from) {
    if (sova.drone) return
    const f = faceBox()
    // Flying behind him: that drone comes, round the side it's on.
    if (sova.patrol.amt >= 1 && drone3.root.visible) {
      const at = drone3.root.position.clone()
      sova.drone = { t0: now - DRONE.OPEN * 1000, from: at, side: Math.sign(at.x - headAt().x) || 1, patrol: true, darted: false }
    } else {
      const side = f.c.x > 0.5 ? -1 : 1
      const start = from || at3(clamp01(f.c.x + side * f.w * 1.6), clamp01(f.c.y - f.w * 2.2), 12)
      sova.drone = { t0: now, from: start, side, patrol: false, darted: false }
      vfx.spawn(SOVA.C.equip, (v) => v.copy(start), { scale: DRONE_K / 100, dur: 0.05 })
      sfx.play("sova-drone-open", { pan: pan3(start) })
    }
    sova.maskUntil = now + (DRONE.END + 0.5) * 1000
  }
  const droneEye = () => (drone3.model ? drone3.model.localToWorld(DRONE_EYE.clone()) : new THREE.Vector3())
  function updateDrone(now, dt) {
    const P = sova.patrol
    const head = headAt()
    const T = now / 1000
    P.amt = THREE.MathUtils.clamp(P.amt + (P.want ? dt / 1.6 : -dt / 1.2), 0, 1)
    if (P.amt > 0) {
      // His head, followed slowly, so it doesn't jerk along with every nod.
      if (!P.anchor) {
        P.anchor = head.clone()
        P.side = Math.sign(Math.sin(P.ph)) || 1
      }
      P.anchor.lerp(head, 1 - Math.exp(-dt * 2))
      if (!sova.drone) P.ph += dt * PATROL.SPEED * (0.75 + 0.25 * Math.sin(T * 0.43))
    } else P.anchor = null
    const d = sova.drone
    let p, ahead, s = 1
    if (d) {
      const t = (now - d.t0) / 1000
      if (t > DRONE.END) {
        sova.drone = null
        return updateDrone(now, 0)
      }
      const hover = head.clone().add(new THREE.Vector3(d.side * 23, 9, 8))
      // Back to its loop behind him, or off and away.
      const back = P.amt > 0
      const away = back ? patrolPoint(P.ph) : head.clone().add(new THREE.Vector3(d.side * 95, 50, -25))
      // Up from the hands in an arc (from behind him, round his side), then hovering (bobbing), then off;
      // facing the camera as it opens, then where it flies, him while it hovers, and where it goes.
      if (t < DRONE.OPEN) {
        p = d.from.clone()
        ahead = new THREE.Vector3(0, 0, 1)
        s = easeOutBack(t / DRONE.OPEN)
      } else if (t < DRONE.FLY) {
        const k = ease((t - DRONE.OPEN) / (DRONE.FLY - DRONE.OPEN))
        const ctl = d.patrol ? roundSide(d.from, hover, d.side, head) : d.from.clone().lerp(hover, 0.5).add(new THREE.Vector3(-d.side * 6, 22, 6))
        p = bez(d.from, ctl, hover, k)
        // The curve's direction, turning towards him as it arrives.
        ahead = bezDir(d.from, ctl, hover, k).setY(0).normalize().lerp(head.clone().sub(p).setY(0).normalize(), k * k)
      } else if (t < DRONE.LEAVE) {
        p = hover.clone()
        ahead = head.clone().sub(p)
      } else {
        const k = ease((t - DRONE.LEAVE) / (DRONE.END - DRONE.LEAVE))
        const ctl = back ? roundSide(away, hover, d.side, head) : hover.clone().lerp(away, 0.5)
        p = bez(hover, ctl, away, k)
        ahead = bezDir(hover, ctl, away, k).setY(0)
      }
    } else if (P.amt > 0) {
      const k = ease(P.amt)
      const on = patrolPoint(P.ph)
      const off = patrolOff(P.side)
      p = off.clone().lerp(on, k)
      // Along its loop, turned a little towards the camera (its eyes show more), or where it's going as it
      // comes in or leaves.
      const along = new THREE.Vector3(Math.cos(P.ph) * PATROL.A, 0, Math.sin(P.ph) * PATROL.B).normalize().add(new THREE.Vector3(0, 0, 0.5))
      const going = (P.want ? on.clone().sub(off) : off.clone().sub(on)).setY(0).normalize()
      ahead = along.normalize().multiplyScalar(k).addScaledVector(going, 1 - k)
    } else {
      drone3.root.visible = false
      drone3.eyes?.stop()
      drone3.eyes = null
      drone3.hum?.stop(0.3)
      drone3.hum = null
      return
    }
    if (!drone3.model) return
    p.y += Math.sin(T * 3.1) * 0.8
    drone3.root.position.copy(p)
    drone3.root.scale.setScalar(Math.max(1e-3, s))
    if (ahead.lengthSq() < 1e-6) ahead.set(0, 0, 1)
    drone3.root.lookAt(p.clone().add(ahead.normalize()))
    drone3.root.rotateZ(Math.sin(T * 2.3) * 0.08)
    drone3.root.visible = true
    for (const c of drone3.discs) c.rotateZ(dt * 38)
    drone3.root.updateMatrixWorld(true)
    // Behind him once it's a hand's breadth behind his face: he covers it, and its eyes' glow (drawn over
    // everything) waits until it comes out.
    drone3.behind = p.z < head.z - 10
    // Its propellers, quieter behind him and while it flies round on its own.
    drone3.hum ||= sfx.play("sova-drone-idle", { loop: true, gain: 0 })
    drone3.hum.set({ gain: (drone3.behind ? 0.45 : 1) * Math.min(1, s) * (d ? 1 : 0.6 * ease(P.amt)), pan: pan3(p) })
    if (!drone3.behind && !drone3.eyes) {
      const sys = [0.025, -0.025].map((z) => vfx.spawn(SOVA.C.eye, (v) => v.copy(drone3.model.localToWorld(new THREE.Vector3(DRONE_EYE.x, DRONE_EYE.y, z))), { scale: DRONE_K / 100 }))
      drone3.eyes = { stop: () => sys.forEach((x) => x.stop()) }
    } else if (drone3.behind && drone3.eyes) {
      drone3.eyes.stop()
      drone3.eyes = null
    }
    if (!d) return
    const t = (now - d.t0) / 1000
    // The dart: from the eye to his face; it reveals him as it hits, and again a second later.
    if (t >= DRONE.DART && !d.darted) {
      d.darted = true
      const at = droneEye(), to = head.clone().add(new THREE.Vector3(0, 0, 6))
      const dart = { p: at.clone(), t0: now }
      const dir = to.clone().sub(at).normalize()
      const sys = vfx.spawn(SOVA.C.dart, (v) => v.copy(dart.p), { scale: 1, dir: () => dir })
      d.dartFly = { dart, at, to, sys }
      sfx.play("sova-drone-dart", { pan: pan3(at) })
    }
    if (d.dartFly) {
      const f = d.dartFly
      const k = Math.min(1, (now - f.dart.t0) / 150)
      f.dart.p.copy(f.at).lerp(f.to, k)
      if (k >= 1) {
        f.sys.stop()
        vfx.spawn(SOVA.C.hit, (v) => v.copy(f.to), { scale: 0.3, dur: 0.05 })
        sfx.play("sova-drone-tag", { pan: pan3(f.to) })
        sacudir(160, 4, now)
        reveal(now)
        d.revealAgain = now + 1100
        d.dartFly = null
      }
    }
    if (d.revealAgain && now >= d.revealAgain) {
      reveal(now)
      sfx.play("sova-drone-pulse", { pan: pan3(head), gain: 0.8 })
      d.revealAgain = 0
    }
  }

  function sovaReset() {
    vfx.clear()
    sova.bow.fx = drone3.eyes = drone3.hum = bowSnd = null
    Object.assign(sova, { arrow: null, dart: null, ult: null, drone: null, reveals: [], fists: 0 })
    Object.assign(sova.bow, { state: "idle", auto: 0, amt: 0, draw: 0, g: null })
    Object.assign(sova.patrol, { amt: 0, anchor: null })
    bow3.root.visible = drone3.root.visible = flying.visible = stuck.visible = false
    corpo.brilho(0, REVEAL, 0)
    corpo.marca(0, 0, 0)
    corpo.escuro = 0
  }

  function updateSova(now, dt) {
    const bow = sova.bow
    const f = faceBox()
    // The dock's bow: drawn over 0.6 s, then shot.
    if (bow.auto && now - bow.auto > 750) shoot(bow.kind, now)
    // The ultimate: the bow out for its three shots, each charged 0.9 s.
    const ult = sova.ult
    let ultDraw = 0
    if (ult) {
      const t = (now - ult.t0) / 1000
      if (t > ULT.END) {
        ult.sys.stop()
        vfx.spawn(SOVA.X.outro, (v) => v.copy(bowPt(-0.05, 0)), { scale: bow3.k / 100, dur: 0.05 })
        ult.hum.stop(0.3)
        sfx.play("sova-ult-end", { pan: ult.pan })
        sova.ult = null
      } else {
        const next = ULT.SHOTS[ult.fired]
        if (next !== undefined) {
          const c = (t - (next - ULT.CHARGE)) / ULT.CHARGE
          if (c >= 0 && ult.charging !== ult.fired) {
            ult.charging = ult.fired
            // Its third-person effect, made to read from across a map: smaller here.
            ult.charge = vfx.spawn(SOVA.X.charge, (v) => v.copy(arrowTip()), { scale: 0.12 })
            ult.aim = vfx.spawn(SOVA.X.aim, (v) => v.copy(arrowTip()), { scale: 1, beam: () => [arrowTip(), ultEnd()] })
            sfx.play("sova-ult-charge", { pan: ult.pan })
          }
          ultDraw = THREE.MathUtils.clamp(c, 0, 1)
          if (t >= next) {
            ult.charge?.stop()
            ult.aim?.stop()
            const a = arrowTip(), b = ultEnd()
            vfx.spawn(SOVA.X.blast, (v) => v.copy(a), { scale: 0.32, dur: 0.05, beam: () => [a, b] })
            sfx.play("sova-ult-fire", { pan: ult.pan })
            sacudir(320, 13, now)
            ult.fired++
          }
        }
      }
    }
    // How much of the bow shows and how far it's drawn.
    const held = bow.state === "draw" || !!sova.ult
    bow.amt = THREE.MathUtils.clamp(bow.amt + (held ? dt / 0.18 : -dt / 0.25), 0, 1)
    if (sova.ult) bow.draw = ultDraw
    else if (bow.state === "draw" && bow.auto) bow.draw = Math.min(1, bow.draw + dt / 0.5)
    else if (bow.state === "draw") {
      // By gesture: as far as the hands have parted, from where the fists met to a full draw at the bow's
      // biggest.
      const d = at3(bow.a.x, bow.a.y, 10).distanceTo(at3(bow.b.x, bow.b.y, 10))
      bow.d0 ??= Math.max(d, -BOW.REST * BOW_K * 0.7)
      const full = (-BOW.REST + BOW.PULL) * BOW_K * BOW_FIT
      bow.draw = THREE.MathUtils.clamp((d - bow.d0) / Math.max(5, full - bow.d0), 0, 1)
    } else bow.draw = Math.max(0, bow.draw - dt / 0.06)
    // The charge's tick at half and at full draw, the hum following the bow.
    if (bowSnd && !sova.ult) {
      const lvl = bow.draw >= 0.98 ? 2 : bow.draw >= 0.5 ? 1 : 0
      const pan = panAt(bow.a.x)
      if (lvl > bowSnd.lvl) sfx.play("sova-charge-level", { pan, gain: 0.8 })
      bowSnd.lvl = Math.max(bowSnd.lvl, lvl)
      bowSnd.hum.set({ pan })
    }
    const kind = sova.ult ? (ultDraw > 0 ? "ult" : null) : bow.state === "idle" ? null : bow.kind
    placeBowNow(kind)
    if (bow3.glow) bow3.glow.color.setRGB(0.35, 0.85, 1).multiplyScalar(sova.ult ? 1.6 : 1)
    // While it's drawn: zaps on the string, the glow on the head (the shock's lightning instead).
    const showFx = bow.amt > 0.5 && kind && kind !== "ult"
    if (showFx && !bow.fx) {
      const k = bow3.k / 100
      bow.fx = [
        vfx.spawn(SOVA.E.string, (v) => v.copy(bowPt(BOW.REST - BOW.PULL * bow.draw, BOW.LINE)), { scale: k, beam: () => [bowPt(BOW.REST - BOW.PULL * bow.draw, BOW.LINE), bowPt(-0.375, 0.816)] }),
        vfx.spawn(SOVA.E.string, (v) => v.copy(bowPt(BOW.REST - BOW.PULL * bow.draw, BOW.LINE)), { scale: k, beam: () => [bowPt(BOW.REST - BOW.PULL * bow.draw, BOW.LINE), bowPt(-0.375, -0.706)] }),
        vfx.spawn(kind === "choque" ? SOVA.Q.held : SOVA.E.tip, (v) => v.copy(arrowTip()), { scale: k }),
      ]
    } else if (!showFx && bow.fx) {
      bow.fx.forEach((s) => s.stop())
      bow.fx = null
    }

    // The arrow in flight, leg by leg.
    flying.visible = false
    const a = sova.arrow
    if (a) {
      let t = now - a.t0
      let leg = 0
      while (leg < a.legs.length && t > a.legs[leg]) t -= a.legs[leg++]
      if (leg > a.leg) {
        // A bounce (the shock's ricochet off the top of the box).
        if (leg < a.legs.length) {
          vfx.spawn(SOVA.Q.ricochet, ((p) => (v) => v.copy(p))(a.pts[leg].clone()), { scale: 0.12, dur: 0.05 })
          sfx.play("sova-shock-ricochet", { pan: pan3(a.pts[leg]) })
        }
        a.leg = leg
      }
      if (leg >= a.legs.length) finishArrow(a, now)
      else {
        const p0 = a.pts[leg], p1 = a.pts[leg + 1]
        a.dir.copy(p1).sub(p0).normalize()
        a.at.copy(p0).lerp(p1, t / a.legs[leg])
        const mesh = flying.getObjectByName(a.kind)
        if (mesh) {
          flying.children.forEach((c) => (c.visible = c === mesh))
          // The arrow's head at `at`, pointing along the leg.
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), a.dir)
          mesh.scale.setScalar(a.k)
          mesh.position.copy(a.at).addScaledVector(a.dir, -ARROW_LEN * a.k)
          flying.visible = true
        }
      }
    }

    // The Recon Bolt where it landed: its head spinning, two sonar pulses that reveal him as they pass.
    stuck.visible = false
    const dt0 = sova.dart
    if (dt0) {
      const t = (now - dt0.t0) / 1000
      if (t > DART_LIFE) endDart(dt0)
      else {
        stuck.visible = true
        if (stuckArrow) {
          stuckArrow.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dt0.dir)
          stuckArrow.scale.setScalar(dt0.k)
          stuckArrow.position.copy(dt0.tip).addScaledVector(dt0.dir, -ARROW_LEN * dt0.k * 0.85)
        }
        reconHead.scale.setScalar(dt0.k)
        reconHead.position.copy(dt0.tip).addScaledVector(dt0.dir, -2)
        reconHead.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dt0.dir)
        reconHead.rotateX(t * 6.3)
        const d = headAt().distanceTo(dt0.tip)
        PULSES.forEach((p, i) => {
          if (t >= p && !dt0.pulsed[i]) {
            dt0.pulsed[i] = true
            // Its ring grows to 30 × 8 game centimetres across in a second: scaled to reach 1.3 times as far as
            // his head, which it crosses 0.63 s in (where its size curve passes 6.15).
            vfx.spawn(SOVA.E.pulse, (v) => v.copy(dt0.tip), { scale: (2.6 * d) / 240, dur: 0.05 })
            sfx.play("sova-recon-ping", { pan: pan3(dt0.tip) })
            dt0.ringAt[i] = now + 634
          }
          if (dt0.ringAt[i] && now >= dt0.ringAt[i]) {
            reveal(now)
            dt0.ringAt[i] = 0
          }
        })
      }
    }
    updateDrone(now, dt)

    // The red reveal: each flash fades over 0.9 s; the marker over the head while it shows.
    sova.reveals = sova.reveals.filter((r) => now - r < 1600)
    let rv = 0
    for (const r of sova.reveals) rv = Math.max(rv, Math.exp(-(now - r) / 600))
    corpo.brilho(0, REVEAL, rv, [0.2, 0.9, 0.8])
    const markAt = new THREE.Vector2(f.top.x, Math.min(0.94, f.top.y + f.h * 0.7))
    corpo.marca(markAt.x, markAt.y, rv > 0.15 ? Math.min(1, rv * 1.5) : 0)
    // Hunter's Fury: the camera darkens while it lasts.
    const ut = sova.ult ? (now - sova.ult.t0) / 1000 : -1
    corpo.escuro = ut >= 0 ? THREE.MathUtils.smoothstep(ut, 0, 0.6) * (1 - THREE.MathUtils.smoothstep(ut, 4.1, 4.6)) : 0
  }
  // Where the ultimate's shot goes: out of the box along the bow, a little past the edge.
  function ultEnd() {
    const tip = arrowTip()
    const from = onBox(tip)
    const dir2 = onBox(tip.clone().add(bowAxis)).sub(from).normalize()
    const e = toEdge(from, dir2, -0.1)
    return at3(e.x, e.y, tip.z - (m.headSeen ? headPos.z : -65))
  }
  // The Recon Bolt lands: the flash, its glows and arcs while it sits there.
  function land(tip, dir, k, now) {
    // One stuck at a time: a new one breaks the one before (its glow and arcs would stay on forever).
    if (sova.dart) endDart(sova.dart)
    vfx.spawn(SOVA.E.impact, (v) => v.copy(tip), { scale: 0.3, dur: 0.05 })
    const dart = { tip: tip.clone(), dir, k, t0: now, pulsed: [], ringAt: [] }
    dart.sys = vfx.spawn(SOVA.E.stuck, (v) => v.copy(dart.tip), { scale: 0.3 })
    sfx.play("sova-recon-hit", { pan: pan3(tip) })
    dart.snd = sfx.play("sova-recon-deployed", { pan: pan3(tip), gain: 0.8 })
    sova.dart = dart
  }
  function endDart(dart) {
    dart.sys.stop()
    vfx.spawn(SOVA.E.destroyed, (v) => v.copy(dart.tip), { scale: 0.3, dur: 0.05 })
    dart.snd.stop(0.2)
    sfx.play("sova-recon-end", { pan: pan3(dart.tip) })
    sova.dart = null
  }

  return {
    // His effects' textures, as he comes on.
    ligar: () => vfx.preload(SOVA),
    // His abilities go with him (the engine stops the box's shake and clears what's on his body).
    desligar: sovaReset,
    acao: (a, now) => ({ recon: () => autoBow("recon", now), choque: () => autoBow("choque", now), drone: () => startDrone(now), ult: () => startUlt(now) })[a]?.(),
    // The dock's "Coruja sobrevoando" (it comes to every module, Sova on or not, so it's there when he comes on).
    opcoes(o) {
      sova.patrol.want = !!o.patrulha
    },
    // In a browser: P for the drone flying behind him.
    tecla(k) {
      if (k === "p") sova.patrol.want = !sova.patrol.want
    },
    // The hands (his gestures, the bow in them) and the face (where things go round it); the body mask while a
    // reveal may be on screen or the drone flies behind him.
    quer: (now) => ({ maos: true, rosto: true, corpo: now < sova.maskUntil || sova.patrol.amt > 0 }),
    maos(r, now) {
      info = ""
      sovaHands(r, now)
      return info
    },
    seguir: followBow,
    atualizar: updateSova,
    // The drone behind him (his body in front of it), the bow in his hands (his hands back over it), and in front
    // of him the arrow in flight, the Recon Bolt stuck and the drone.
    desenhar(fase, r) {
      if (fase === "atras") {
        if (drone3.root.visible && drone3.behind) {
          r.renderer.clearDepth()
          r.renderer.render(occludeScene, r.ortho)
          r.renderer.render(sv3.drone, r.headCam)
        }
      } else if (fase === "segurado") {
        if (bow3.root.visible) {
          r.renderer.clearDepth()
          r.renderer.render(sv3.held, r.headCam)
          r.maosPorCima()
        }
      } else if (fase === "frente") {
        const droneFront = drone3.root.visible && !drone3.behind
        if (droneFront || flying.visible || stuck.visible) {
          r.renderer.clearDepth()
          if (flying.visible || stuck.visible) r.renderer.render(sv3.free, r.headCam)
          if (droneFront) r.renderer.render(sv3.drone, r.headCam)
        }
      }
    },
    ocupado: () => sova.bow.state !== "idle" || !!(sova.arrow || sova.dart || sova.ult || sova.drone),
    hud: () => `sova: peças ${bow3.model ? "ok" : "…"} · arco ${sova.bow.state} ${sova.bow.amt.toFixed(2)}${sova.arrow ? ` · flecha (${sova.arrow.kind})` : ""}${sova.dart ? " · reconhecimento" : ""}${sova.drone ? " · coruja" : ""}${sova.patrol.amt > 0 ? " · coruja sobrevoando" : ""}${sova.ult ? " · ultimate" : ""}`,
    estado: { sova, isOwl, bow3, drone3, SOVA },
  }
}
