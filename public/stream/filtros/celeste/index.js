// Celeste on the camera (Maddy Makes Games' game), on Luan himself, with Madeline's or Badeline's look on him (two
// entries, the looks in visuais.js: Celeste 64's models, the hair coloured by the dashes as the game does). The effects
// are his own camera image (his cutout, his hair, his echo), a game object (the strawberry, the feather) or a plain
// shape (circles, rings, sparkles, speed lines). The module's shape is every filter's (../README.md): `filtros` for the dock and the page,
// `criar` for what it does.
//
// From the dock (or keys X, K, S, F, E in a browser): Dash (X, as in the game; also by gesture, a quick sideways swipe
// of an open hand, toward the side it moved): three or four afterimages of his own cutout (from the last frames)
// trailing behind him, speed lines and a burst, the picture whipping that way and back; his hair dims to blue and
// comes back to its colour with a refill sparkle 1.5 s later (the dock's "Cabelo do dash", `opcoes.cabelo`, on by
// default). Morte: his picture freezes and flashes, pops into a ring of circles bursting out while a black disc
// wipes the box from him, then the black opens again from where he is, the circles come back together on him and
// he's back. Morango: a winged strawberry flies in from a side, bobs, comes to him and is collected with a pulse,
// sparkles and its points, climbing 1000, 2000… 5000, 1UP when they come within a few seconds of each other.
// Pena: a golden glow round his outline with drifting sparkles while the box floats ~4 s, flickering as a warning
// near the end, and it pops. Eco: his own cutout a fraction of a second behind his movements, dark, behind him for
// 6 s, then it dissolves.
//
// The strawberry is Celeste 64's own model (privado/celeste/strawberry.glb, from its public repository, never
// committed or published; without it, one drawn in a shader); the sounds are the installed game's (privado/sons/,
// scripts/filtros_sons.py from its FMOD banks; no character's voice). His cutout is the camera times the body mask,
// kept for the last half second in render targets of the box's own (`hist`). Times in ms (performance.now()).
//
// The game itself (scripts/celeste-mod/, the MuanlartinsLink mod in Luan's Celeste): while this filter is on it
// listens to the mod's server-sent events on http://127.0.0.1:8797/eventos (?celeste-jogo=<url> for another, the stand-in
// scripts/celeste-mod/simular.py in tests); the EventSource reconnects by itself, and one that gave up is opened again
// every 5 s. With the dock's "Seguir o jogo" on (the default): the game's dash, death and respawn, strawberry and
// feather set off the same one-offs on their own, lighter where the game repeats them (a dash every second), silent
// (the game's own sounds are already on the stream) and timed by the game (the black holds until he respawns, the
// feather lasts as long as the game's, its warning when the game's starts, the strawberry's points from the game's
// chain); his hair follows his real dashes (his own colour warmed a little red with one left, pinkish with two, the
// blue with them spent, red where she has none at all, the refill's sparkle when they come back), which keeps the body mask on while he's in a level.
// "Clima do capítulo" (the default too) draws an ambient over the box while the game is connected, from the chapter
// it's in, crossfading over 1.6 s when it changes: shapes and particles of our own and a light grade, never over his
// face, the far ones behind him when the body mask is there (`AMBIENTES`, `ambMat`); a chapter with its scenery
// (cenarios.js: Forsaken City so far) has the game's own backgrounds and structures behind him instead, following
// his rooms. The one-offs stay on the dock.
// The rest of what the game says (her speed, the wind, her stamina and states, what follows her, who chases her) is
// reacoes.js's; its rarer moments (the heart, the cassette,
// a new room, the chapter's end) momentos.js's. The look's long hair and jacket are drawn here (CORTINA, ROUPA), only the fringe and crown a model's.

import { criarMomentos } from "./momentos.js"
import { criarReacoes } from "./reacoes.js"
import { CENARIOS, GLSL_CENA, criarCena } from "./cenarios.js"

// Two entries, the same filter with each look on him (visuais.js: Celeste 64's Madeline and Badeline).
const ENTRADA = {
    sons: "celeste-",
    acoes: [
      ["dash", "X", "Dash"],
      ["morte", "", "Morte"],
      ["morango", "", "Morango"],
      ["pena", "", "Pena"],
      ["eco", "", "Eco"],
    ],
    teclas: { x: "dash", k: "morte", s: "morango", f: "pena", e: "eco" },
    opcoes: [
      ["cabelo", "Cabelo do dash", true],
      ["jogo", "Seguir o jogo", true],
      ["ambiente", "Clima do capítulo", true],
    ],
    gestos: [["Dash", "passe a mão aberta rápido para um lado: o dash vai para esse lado."]],
}
export const filtros = [
  { id: "celeste", nome: "Madeline", jogo: "Celeste", desenho: "montanha", ...ENTRADA },
  { id: "badeline", nome: "Badeline", jogo: "Celeste", desenho: "montanha", ...ENTRADA },
]

export async function criar(m) {
  const { THREE, GLTFLoader, sfx, at3, panAt, faceBox, toScreen, handShape, video, renderer, GLSL_COMMON, GLSL_APAGAR, VERT, quad, ortho, W, H, ease, easeOutBack, fail, FACE_OVAL } = m
  const ASPECT = W / H
  const { uCam, uMask, uCover, uTime, uAspect, uFace, uFaceUp } = m.uniforms
  const clamp = THREE.MathUtils.clamp
  const lerp = THREE.MathUtils.lerp
  const PREMUL = { transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor }

  // Celeste's colours: the hair with its dash used (blue), the dash's trail (red), the feather's gold, the refill's
  // pink, and the dark of the echo.
  const BLUE = [0.27, 0.72, 1.0]
  const RED = [1.0, 0.3, 0.4]
  const GOLD = [1.0, 0.84, 0.3]
  const PINK = [1.0, 0.62, 0.78]
  const WHITE = [1, 1, 1]
  // His hair with one dash left, following the game: his own colour warmed a little.
  const WARM = [1.0, 0.42, 0.3]

  const cel = {
    dash: null,
    hair: { usedAt: -1e9, refilled: true, amt: 0, flash: 0, second: false, faceAt: -1e9, shown: false },
    morte: null,
    morango: null,
    popup: null,
    chain: { n: -1, at: -1e9 },
    pena: null,
    eco: null,
    lastDir: 1,
    lastSide: 1,
    maskUntil: 0,
    opts: { cabelo: true, jogo: true, ambiente: true },
    swipe: { tracks: [], last: -1e9, note: "" },
    // Strawberries the game collected while one was still flying in, started one after another.
    filaMorango: [],
  }
  // A cue, unless the game set the effect off (its own sound is already on the stream).
  const toca = (mudo, cue, o) => (mudo ? null : sfx.play(cue, o))

  // ---------- where he is ----------
  // His face on the box (the engine's, or the middle of the box), and his body's middle below it.
  const face = () => faceBox()
  // 1 while a look is drawn on him: only then is his own hair (erased under it) left out of what counts as him.
  const comLook = { value: 0 }
  // Dead until he starts coming back (the ghost that follows doesn't stop a dash, a feather or another death).
  const morto = () => !!cel.morte && cel.morte.stage < 2
  const bodyMid = () => {
    const f = face()
    return new THREE.Vector2(f.c.x, clamp(f.c.y - f.h * 0.75, 0.12, 0.8))
  }
  // The side of the box with more room beside him (1 right, -1 left), alternating when he's in the middle.
  function roomySide(last) {
    const x = face().c.x
    if (Math.abs(x - 0.5) < 0.05) return -last
    return x < 0.5 ? 1 : -1
  }
  // Box heights to box uv across.
  const ux = (h) => h / ASPECT

  // ---------- his cutout, kept for the last half second ----------
  // Each frame him as drawn goes into the next of these: the camera with the body mask in alpha or, with a look on him,
  // the frame's own picture with his body and his look in alpha (round his head only his look and his face, not his
  // erased hair), from the frame's two copies (`tomaQuadro`). `masked`: the mask was tracked then, so the alpha is him. The dash's afterimages take the last frames; the echo, one from 0.3 s ago.
  const HW = 640, HH = 360, N_HIST = 32
  const rtOpts = { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }
  const hist = Array.from({ length: N_HIST }, () => ({ rt: new THREE.WebGLRenderTarget(HW, HH, rtOpts), t: -1e9, masked: false }))
  let histI = 0
  const grabMat = new THREE.ShaderMaterial({
    uniforms: { uCam, uMask, uCover, uTime, uAspect, uFace, uFaceUp, uLook: { value: 0 }, uLookA: { value: null }, uLookB: { value: null }, uRostoJ: { value: null } },
    vertexShader: VERT,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec4 uFace;
      uniform vec2 uFaceUp;
      uniform float uLook;
      uniform sampler2D uLookA, uLookB, uRostoJ;
      void main() {
        float a = maskAt(vUv, 0.0);
        vec3 c = texture2D(uCam, camUv(vUv)).rgb;
        if (uLook > 0.5) {
          c = texture2D(uLookB, vUv).rgb;
          float look = smoothstep(0.05, 0.12, length(c - texture2D(uLookA, vUv).rgb));
          vec2 d = (vUv - uFace.xy) * vec2(uAspect, 1.0);
          d = vec2(dot(d, vec2(uFaceUp.y, -uFaceUp.x)), dot(d, uFaceUp));
          float zona = length(d / (vec2(max(uFace.z, uFace.w * 0.9), uFace.w) * vec2(2.6, 2.8)));
          float cabelo = step(zona, 1.0) * step(-0.3 * uFace.w, d.y) * (1.0 - smoothstep(0.3, 0.7, texture2D(uRostoJ, vUv).r));
          a = max(a * (1.0 - cabelo), look);
        }
        gl_FragColor = vec4(c, a);
      }`,
  })
  const grabScene = quad(grabMat)
  // A frame of history for the dash's afterimages: as it is when it was masked, else its colour with the mask as it is
  // now (the mask tracked only from the dash on, its first answer put on the frames before it).
  const reMaskMat = new THREE.ShaderMaterial({
    uniforms: { uCam, uMask, uCover, uTime, uAspect, uSrc: { value: null }, uTem: { value: 0 } },
    vertexShader: VERT,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform sampler2D uSrc;
      uniform float uTem;
      void main() {
        vec4 c = texture2D(uSrc, vUv);
        gl_FragColor = vec4(c.rgb, mix(maskAt(vUv, 0.0), c.a, uTem));
      }`,
  })
  const reMaskScene = quad(reMaskMat)
  function drawTo(rt, scene) {
    const before = renderer.getRenderTarget()
    renderer.setRenderTarget(rt)
    renderer.render(scene, ortho)
    renderer.setRenderTarget(before)
  }
  function remember(now, antes, depois) {
    const h = hist[histI]
    const u = grabMat.uniforms
    u.uLook.value = antes ? 1 : 0
    u.uLookA.value = antes
    u.uLookB.value = depois
    drawTo(h.rt, grabScene)
    u.uLook.value = 0
    h.t = now
    h.masked = m.mascaraEm > now - 250
    histI = (histI + 1) % N_HIST
  }
  // The frame `back` frames before the newest.
  const histAgo = (back) => hist[(histI - 1 - back + N_HIST * 4) % N_HIST]
  // The masked frame nearest to `t`, if there's one within 60 ms.
  function histAt(t) {
    let best = null
    for (const h of hist) if (h.masked && Math.abs(h.t - t) < 60 && (!best || Math.abs(h.t - t) < Math.abs(best.t - t))) best = h
    return best
  }
  const after = Array.from({ length: 4 }, () => new THREE.WebGLRenderTarget(HW, HH, rtOpts))
  // The frozen picture (Morte) and his mask then.
  const frozen = new THREE.WebGLRenderTarget(W, H, rtOpts)
  const frozenMask = new THREE.WebGLRenderTarget(HW, HH, rtOpts)

  // His face's outline (the face mesh's oval, a little wider), soft, on the box: kept clear of the hair's tint.
  const faceCanvas = document.createElement("canvas")
  faceCanvas.width = 320
  faceCanvas.height = 180
  const faceCtx = faceCanvas.getContext("2d")
  const faceTex = new THREE.CanvasTexture(faceCanvas)
  faceTex.colorSpace = THREE.NoColorSpace
  function drawFace() {
    const g = faceCtx
    g.clearRect(0, 0, 320, 180)
    const lm = m.faceLm
    if (!lm) return
    g.beginPath()
    FACE_OVAL.forEach((i, k) => {
      const [u, v] = toScreen(lm[i].x, lm[i].y)
      k ? g.lineTo(u * 320, (1 - v) * 180) : g.moveTo(u * 320, (1 - v) * 180)
    })
    g.closePath()
    g.fillStyle = g.strokeStyle = "#fff"
    g.lineJoin = "round"
    g.lineWidth = Math.max(2, face().w * 320 * 0.08)
    g.fill()
    g.stroke()
    faceTex.needsUpdate = true
  }

  // ---------- what's drawn behind him and on him (phase "atras") ----------
  // The frozen picture (Morte: the frame as drawn, his look on him, taken from the frame itself as Morte starts: once
  // after the ambient, `uFrzA`, and once before the particles, `uFrz`; drawn again over everything while it holds, so
  // the live look doesn't move on it) with his silhouette flashing white (his body, but round his head only where the
  // two differ: his look, not his erased hair); else, behind him (where the mask has him now nothing is
  // drawn), the echo and the dash's afterimages; and on him, his hair tinted blue (the body mask above his face,
  // outside its oval, where the camera is dark: hair, not skin).
  const backU = {
    uCam, uMask, uCover, uTime, uAspect, uFace, uFaceUp,
    uFreeze: { value: 0 }, uFrzComLook: { value: 0 }, uFrz: { value: frozen.texture }, uFrzA: { value: frozen.texture }, uFrzMask: { value: frozenMask.texture }, uFrzMaskOk: { value: 0 }, uFlash: { value: 0 }, uFrzDim: { value: 1 },
    uATint: { value: new THREE.Vector3(...RED) },
    uEcho: { value: hist[0].rt.texture }, uEchoA: { value: 0 }, uEchoOff: { value: new THREE.Vector2() }, uEchoDis: { value: 0 },
    uHair: { value: 0 }, uHairFlash: { value: 0 }, uHairTint: { value: new THREE.Vector3(...BLUE) }, uFaceMask: { value: faceTex },
  }
  for (let i = 0; i < 4; i++) {
    backU[`uA${i}`] = { value: after[i].texture }
    backU[`uAOff${i}`] = { value: new THREE.Vector2() }
    backU[`uAA${i}`] = { value: 0 }
  }
  const backMat = new THREE.ShaderMaterial({
    uniforms: backU,
    vertexShader: VERT,
    ...PREMUL,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec4 uFace;
      uniform vec2 uFaceUp;
      uniform float uFreeze, uFrzMaskOk, uFlash, uFrzDim, uFrzComLook;
      uniform sampler2D uFrz, uFrzA, uFrzMask, uRostoJ;
      uniform vec3 uATint;
      ${[0, 1, 2, 3].map((i) => `uniform sampler2D uA${i}; uniform vec2 uAOff${i}; uniform float uAA${i};`).join("\n")}
      uniform sampler2D uEcho;
      uniform float uEchoA, uEchoDis;
      uniform vec2 uEchoOff;
      uniform float uHair, uHairFlash;
      uniform vec3 uHairTint;
      uniform sampler2D uFaceMask;
      void over(inout vec4 o, vec3 c, float a) { o = vec4(c * a, a) + o * (1.0 - a); }
      // His cutout from a kept frame, moved by off (nothing past the box's edge).
      vec4 cutout(sampler2D t, vec2 uv) {
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
        vec4 c = texture2D(t, uv);
        c.a = smoothstep(0.35, 0.65, c.a);
        return c;
      }
      void main() {
        if (uFreeze > 0.5) {
          vec3 c0 = texture2D(uFrz, vUv).rgb;
          vec3 c = c0 * uFrzDim;
          float look = smoothstep(0.05, 0.12, length(c0 - texture2D(uFrzA, vUv).rgb));
          vec2 d = (vUv - uFace.xy) * vec2(uAspect, 1.0);
          d = vec2(dot(d, vec2(uFaceUp.y, -uFaceUp.x)), dot(d, uFaceUp));
          float zone = length(d / (vec2(max(uFace.z, uFace.w * 0.9), uFace.w) * vec2(2.6, 2.8)));
          float cabelo = uFrzComLook * step(zone, 1.0) * step(-0.3 * uFace.w, d.y) * (1.0 - smoothstep(0.3, 0.7, texture2D(uRostoJ, vUv).r));
          float body = max(uFrzMaskOk * smoothstep(0.35, 0.65, texture2D(uFrzMask, vUv).a) * (1.0 - cabelo), look);
          gl_FragColor = vec4(mix(c, vec3(1.0), body * uFlash), 1.0);
          return;
        }
        vec4 o = vec4(0.0);
        float behind = 1.0 - smoothstep(0.35, 0.6, maskAt(vUv, 0.0));
        // The echo: dark, a cool rim at its outline, grains dropping out as it dissolves.
        if (uEchoA > 0.003) {
          vec4 e = cutout(uEcho, vUv - uEchoOff);
          float grain = noise(vUv * vec2(uAspect, 1.0) * 90.0) * 0.7 + noise(vUv * vec2(uAspect, 1.0) * 23.0) * 0.3;
          float keep = smoothstep(uEchoDis - 0.04, uEchoDis + 0.04, grain);
          float edge = keep * (1.0 - smoothstep(uEchoDis + 0.04, uEchoDis + 0.12, grain)) * step(0.01, uEchoDis);
          vec2 px = vec2(3.0 / 640.0, 3.0 / 360.0);
          float around = 0.25 * (texture2D(uEcho, vUv - uEchoOff + vec2(px.x, 0.0)).a + texture2D(uEcho, vUv - uEchoOff - vec2(px.x, 0.0)).a + texture2D(uEcho, vUv - uEchoOff + vec2(0.0, px.y)).a + texture2D(uEcho, vUv - uEchoOff - vec2(0.0, px.y)).a);
          float rim = e.a * (1.0 - smoothstep(0.6, 0.95, around));
          // His own shading kept, dim, on a dark cool ramp.
          vec3 c = mix(vec3(0.02, 0.025, 0.05), vec3(0.3, 0.34, 0.48), smoothstep(0.05, 0.85, lum(e.rgb))) + vec3(0.5, 0.6, 0.8) * rim * 0.6 + vec3(0.6, 0.7, 0.9) * edge;
          over(o, c, e.a * keep * uEchoA * behind);
        }
        // The afterimages, the furthest first: his colours pulled towards the trail's, fading.
        ${[3, 2, 1, 0]
          .map(
            (i) => `if (uAA${i} > 0.003) {
          vec4 a = cutout(uA${i}, vUv - uAOff${i});
          vec3 c = mix(a.rgb, uATint * (0.3 + 0.9 * lum(a.rgb)), 0.6);
          over(o, c, a.a * uAA${i} * behind);
        }`,
          )
          .join("\n        ")}
        // His hair.
        if (uHair > 0.003 || uHairFlash > 0.003) {
          vec2 d = (vUv - uFace.xy) * vec2(uAspect, 1.0);
          d = vec2(dot(d, vec2(uFaceUp.y, -uFaceUp.x)), dot(d, uFaceUp));
          float fw = max(uFace.z, uFace.w * 0.72), fh = uFace.w;
          float head = length((d - vec2(0.0, fh * 0.5)) / vec2(fw * 2.0, fh * 1.75));
          float w = smoothstep(1.0, 0.82, head) * (1.0 - smoothstep(0.15, 0.6, texture2D(uFaceMask, vUv).r)) * smoothstep(-0.1, 0.35, d.y / fh) * smoothstep(0.3, 0.6, maskAt(vUv, 0.5));
          vec3 cam = texture2D(uCam, camUv(vUv)).rgb;
          float l = lum(cam);
          w *= 1.0 - smoothstep(0.3, 0.5, l);
          over(o, uHairTint * (0.3 + 1.5 * l), w * uHair * 0.88);
          over(o, vec3(1.0, 0.92, 0.96), w * uHairFlash * 0.55);
        }
        if (o.a < 0.002) discard;
        gl_FragColor = o;
      }`,
  })
  const backScene = quad(backMat)

  // ---------- the wipe (phase "depoisFx") ----------
  // A black disc growing from him (Morte), or the black opening from him again; his silhouette white while he
  // comes back.
  // The ghost (he's back): white over him and his look (where the frame drawn differs from before his look, taken from
  // the frame each frame while it shows, as Morte's frozen picture), a pink rim round it.
  const wipeU = { uCam, uMask, uCover, uTime, uAspect, uFace, uFaceUp, uIris: { value: new THREE.Vector4(0.5, 0.5, 0, 0) }, uGhost: { value: 0 }, uLookA: { value: null }, uLookB: { value: null }, uRostoJ: { value: null }, uComLook: comLook }
  const wipeMat = new THREE.ShaderMaterial({
    uniforms: wipeU,
    vertexShader: VERT,
    ...PREMUL,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec4 uIris, uFace;
      uniform vec2 uFaceUp;
      uniform float uGhost, uComLook;
      uniform sampler2D uLookA, uLookB, uRostoJ;
      void over(inout vec4 o, vec3 c, float a) { o = vec4(c * a, a) + o * (1.0 - a); }
      float look(vec2 uv) { return smoothstep(0.05, 0.12, length(texture2D(uLookB, uv).rgb - texture2D(uLookA, uv).rgb)); }
      // Him: his body, but round his head only his look (not his erased hair), and his look wherever it is.
      float ele(vec2 uv, float lod) {
        vec2 d = (uv - uFace.xy) * vec2(uAspect, 1.0);
        d = vec2(dot(d, vec2(uFaceUp.y, -uFaceUp.x)), dot(d, uFaceUp));
        float zone = length(d / (vec2(max(uFace.z, uFace.w * 0.9), uFace.w) * vec2(2.6, 2.8)));
        float cabelo = uComLook * step(zone, 1.0) * step(-0.3 * uFace.w, d.y) * (1.0 - smoothstep(0.3, 0.7, texture2D(uRostoJ, uv).r));
        return max(smoothstep(0.4, 0.6, maskAt(uv, lod)) * (1.0 - cabelo), look(uv));
      }
      void main() {
        vec4 o = vec4(0.0);
        float r = length((vUv - uIris.xy) * vec2(uAspect, 1.0));
        float black = 0.0;
        if (uIris.w > 0.5 && uIris.w < 1.5) black = smoothstep(uIris.z + 0.003, uIris.z - 0.003, r);
        else if (uIris.w > 1.5) black = smoothstep(uIris.z - 0.003, uIris.z + 0.003, r);
        if (uGhost > 0.003) {
          float body = ele(vUv, 0.0);
          vec2 px = vec2(4.0 / 1280.0, 4.0 / 720.0);
          float around = min(min(ele(vUv + vec2(px.x, 0.0), 1.6), ele(vUv - vec2(px.x, 0.0), 1.6)), min(ele(vUv + vec2(0.0, px.y), 1.6), ele(vUv - vec2(0.0, px.y), 1.6)));
          float rim = body * (1.0 - smoothstep(0.5, 0.95, around));
          over(o, vec3(1.0), body * uGhost * 0.9);
          over(o, vec3(1.0, 0.75, 0.82), rim * uGhost);
        }
        over(o, vec3(0.0), black);
        if (o.a < 0.002) discard;
        gl_FragColor = o;
      }`,
  })
  const wipeScene = quad(wipeMat)

  // ---------- flat particles on the box (phase "depoisFx") ----------
  // Sparkles (four-pointed stars), pixels, discs, speed lines, rings, soft glows, and the strawberry drawn when its
  // model didn't load. Positions in box uv, sizes in box heights, velocities in box heights a second.
  const MAXP = 600
  const KIND = { star: 0, pixel: 1, disc: 2, streak: 3, ring: 4, glow: 5, berry: 6, wing: 7 }
  const pGeo = new THREE.InstancedBufferGeometry()
  {
    const base = new THREE.PlaneGeometry(1, 1)
    pGeo.index = base.index
    pGeo.setAttribute("position", base.getAttribute("position"))
  }
  const iA = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4).setUsage(THREE.DynamicDrawUsage)
  const iB = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4).setUsage(THREE.DynamicDrawUsage)
  const iC = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4).setUsage(THREE.DynamicDrawUsage)
  pGeo.setAttribute("iA", iA)
  pGeo.setAttribute("iB", iB)
  pGeo.setAttribute("iC", iC)
  pGeo.instanceCount = 0
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uAspect },
    ...PREMUL,
    vertexShader: /* glsl */ `
      attribute vec4 iA; // x, y, size, turn
      attribute vec4 iB; // colour, alpha
      attribute vec4 iC; // kind, stretch, thickness, solid
      uniform float uAspect;
      varying vec2 vP;
      varying vec4 vCol;
      varying vec4 vK;
      void main() {
        vP = position.xy * 2.0;
        vec2 v = position.xy * vec2(iA.z * max(1.0, iC.y), iA.z);
        float c = cos(iA.w), s = sin(iA.w);
        v = vec2(c * v.x - s * v.y, s * v.x + c * v.y);
        vec2 uv = iA.xy + vec2(v.x / uAspect, v.y);
        gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
        vCol = iB;
        vK = iC;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vP;
      varying vec4 vCol;
      varying vec4 vK;
      float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 p = vP;
        float k = vK.x;
        vec3 col = vCol.rgb;
        float a = 0.0;
        if (k < 0.5) {
          vec2 q = abs(p);
          float star = max(smoothstep(0.2, 0.0, q.y) * (1.0 - q.x), smoothstep(0.2, 0.0, q.x) * (1.0 - q.y));
          a = clamp(star * 1.5 + smoothstep(0.32, 0.0, length(p)), 0.0, 1.0);
          col = mix(col, vec3(1.0), smoothstep(0.3, 0.0, length(p)));
        } else if (k < 1.5) {
          a = 1.0;
        } else if (k < 2.5) {
          a = smoothstep(1.0, 0.9, length(p));
        } else if (k < 3.5) {
          a = (1.0 - abs(p.x)) * smoothstep(1.0, 0.2, abs(p.y));
        } else if (k < 4.5) {
          float r = length(p);
          a = smoothstep(1.0 - vK.z - 0.05, 1.0 - vK.z, r) * smoothstep(1.0, 0.95, r);
        } else if (k < 5.5) {
          a = exp(-dot(p, p) * 4.0);
        } else if (k < 6.5) {
          // A strawberry: a round red berry narrowing down, seeds, a green crown and stem.
          vec2 q = vec2(p.x, p.y + 0.15);
          float body = length(vec2(q.x / (0.62 + 0.22 * q.y), q.y / 0.68));
          float leaf = 0.0;
          for (int i = 0; i < 5; i++) {
            float an = 3.14159 * (0.12 + 0.19 * float(i));
            vec2 dir = vec2(cos(an), sin(an) * 0.45);
            vec2 lp = p - vec2(0.0, 0.48);
            float along = dot(lp, dir);
            float across = abs(dot(lp, vec2(-dir.y, dir.x)));
            leaf = max(leaf, step(0.0, along) * step(along, 0.42) * step(across, 0.11 * (1.0 - along / 0.42)));
          }
          float stem = step(abs(p.x - 0.03), 0.05) * step(0.5, p.y) * step(p.y, 0.8);
          vec2 g = q * vec2(5.0, 6.0);
          vec2 cell = floor(g + vec2(0.5 * mod(floor(g.y), 2.0), 0.0));
          float seed = step(length(fract(g + vec2(0.5 * mod(floor(g.y), 2.0), 0.0)) - 0.5), 0.13) * step(0.3, hash2(cell) + 0.5);
          vec3 berry = mix(vec3(0.62, 0.05, 0.12), vec3(0.96, 0.2, 0.26), smoothstep(0.9, 0.2, body));
          berry += vec3(0.45, 0.35, 0.35) * smoothstep(0.32, 0.0, length(q - vec2(-0.22, 0.22)));
          berry = mix(berry, vec3(1.0, 0.9, 0.55), seed * step(body, 0.88));
          a = max(smoothstep(1.0, 0.94, body), max(leaf, stem));
          col = leaf + stem > 0.0 && body > 0.85 ? vec3(0.25, 0.7, 0.3) : berry;
        } else {
          // A white wing: three rounded feathers fanning out to +x.
          float w = 0.0;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 c = vec2(-0.15 + 0.32 * fi, 0.1 - 0.18 * fi);
            w = max(w, smoothstep(1.0, 0.9, length((p - c) / vec2(0.62 - 0.08 * fi, 0.26))));
          }
          a = w;
          col = mix(vec3(0.78, 0.82, 0.92), vec3(1.0), smoothstep(-0.4, 0.3, p.y));
        }
        a *= vCol.a;
        if (a < 0.003) discard;
        gl_FragColor = vec4(col * a, a * vK.w);
      }`,
  })
  const pMesh = new THREE.Mesh(pGeo, pMat)
  pMesh.frustumCulled = false
  const pScene = new THREE.Scene()
  pScene.add(pMesh)
  const parts = []
  // This frame's own (the strawberry drawn when its model didn't load), written after the particles.
  const frame = []
  // A particle: kind, x, y, size (to size1 over its life), colour, alpha, life, velocity, gravity (ay), drag,
  // turn (and its speed), stretch (speed lines), thickness (rings), solid (1 covers, 0 adds light), twinkle, and
  // `move(p, k, dt)` for one that follows a path of its own (k: 0..1 of its life).
  function spawn(o) {
    if (parts.length >= MAXP) return null
    const p = { kind: KIND.star, x: 0.5, y: 0.5, size: 0.02, size1: null, col: WHITE, a: 1, life: 0.6, age: 0, vx: 0, vy: 0, ay: 0, drag: 0, rot: 0, vr: 0, stretch: 1, thick: 0.12, solid: 0, twinkle: 0, fadeIn: 0, delay: 0, move: null, ...o }
    parts.push(p)
    return p
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      if (p.delay > 0) {
        p.delay -= dt
        continue
      }
      p.age += dt
      if (p.age >= p.life) {
        parts.splice(i, 1)
        continue
      }
      const k = p.age / p.life
      if (p.move) p.move(p, k, dt)
      else {
        p.vy += p.ay * dt
        const d = Math.exp(-p.drag * dt)
        p.vx *= d
        p.vy *= d
        p.x += ux(p.vx) * dt
        p.y += p.vy * dt
      }
      p.rot += p.vr * dt
    }
  }
  function uploadParts(t) {
    let n = 0
    for (const p of frame) {
      iA.setXYZW(n, p.x, p.y, p.size, p.rot || 0)
      iB.setXYZW(n, 1, 1, 1, 1)
      iC.setXYZW(n, p.kind, 1, 0, 1)
      n++
    }
    frame.length = 0
    for (const p of parts) {
      if (p.delay > 0) continue
      const k = p.age / p.life
      const size = p.size1 == null ? p.size : lerp(p.size, p.size1, ease(Math.min(1, k)))
      let a = p.a * (p.fadeIn > 0 ? Math.min(1, p.age / p.fadeIn) : 1) * (1 - ease(clamp((k - 0.6) / 0.4, 0, 1)))
      if (p.twinkle) a *= 0.55 + 0.45 * Math.sin(t * p.twinkle + p.rot * 7)
      iA.setXYZW(n, p.x, p.y, size, p.rot)
      iB.setXYZW(n, p.col[0], p.col[1], p.col[2], a)
      iC.setXYZW(n, p.kind, p.stretch, p.thick, p.solid)
      n++
    }
    pGeo.instanceCount = n
    iA.needsUpdate = iB.needsUpdate = iC.needsUpdate = true
    return n
  }
  // A burst of sparkles and pixels from a point.
  function burst(x, y, { n = 12, col = WHITE, col2 = null, speed = 0.5, size = 0.02, life = 0.5, kind = KIND.star, spread = Math.PI * 2, dir = 0, ay = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const an = dir + (spread >= Math.PI * 2 ? (i / n) * Math.PI * 2 + Math.random() * 0.4 : (Math.random() - 0.5) * spread)
      const v = speed * (0.55 + Math.random() * 0.6)
      spawn({ kind, x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, drag: 4, ay, size: size * (0.6 + Math.random() * 0.6), size1: size * 0.2, col: col2 && i % 2 ? col2 : col, life: life * (0.7 + Math.random() * 0.5), rot: Math.random() * 0.3 })
    }
  }
  const ring = (x, y, size, col, life = 0.4, thick = 0.1, a = 1) => spawn({ kind: KIND.ring, x, y, size: size * 0.2, size1: size, col, life, thick, a })

  // ---------- the strawberry (phase "frente"), in the 3D camera ----------
  const s3 = { scene: new THREE.Scene(), root: new THREE.Group(), body: new THREE.Group(), wings: [], mats: [], ok: false, failed: false, label: null, labelTex: null }
  s3.scene.add(new THREE.HemisphereLight(0xffffff, 0x6a4a5a, 2.4))
  {
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(0.4, 1, 1.2)
    s3.scene.add(sun)
  }
  s3.root.visible = false
  s3.root.add(s3.body)
  s3.scene.add(s3.root)
  // Its wings: white, three rounded feathers each, flapping on the berry's sides.
  {
    // The top edge out to the tip, then the feathers' rounded ends back to the root, each bulging out.
    const sh = new THREE.Shape()
    sh.moveTo(0, 0.2)
    sh.quadraticCurveTo(0.5, 0.66, 1.22, 0.62)
    sh.quadraticCurveTo(1.5, 0.5, 1.2, 0.3)
    sh.lineTo(1.13, 0.31)
    sh.quadraticCurveTo(1.18, 0.04, 0.84, 0.1)
    sh.lineTo(0.8, 0.13)
    sh.quadraticCurveTo(0.78, -0.16, 0.48, -0.04)
    sh.lineTo(0.45, -0.01)
    sh.quadraticCurveTo(0.36, -0.22, 0.1, -0.1)
    sh.lineTo(0, -0.06)
    const geo = new THREE.ShapeGeometry(sh, 10)
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    const edge = new THREE.MeshBasicMaterial({ color: 0x9aa6c8, side: THREE.DoubleSide })
    for (const side of [1, -1]) {
      const pivot = new THREE.Group()
      const w = new THREE.Mesh(geo, white)
      const e = new THREE.Mesh(geo, edge)
      e.scale.setScalar(1.09)
      e.position.set(-0.04, -0.02, -0.02)
      w.add(e)
      pivot.add(w)
      pivot.scale.set(side * 1.15, 1.15, 1.15)
      pivot.position.set(side * 0.78, 0.82, -0.15)
      pivot.userData.side = side
      s3.root.add(pivot)
      s3.wings.push(pivot)
    }
  }
  new GLTFLoader().load(
    "privado/celeste/strawberry.glb",
    (g) => {
      g.scene.traverse((o) => {
        if (!o.isMesh) return
        o.frustumCulled = false
        const map = o.material.map
        if (map) {
          map.colorSpace = THREE.NoColorSpace
          map.magFilter = THREE.NearestFilter
        }
        o.material = new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide })
        s3.mats.push(o.material)
      })
      // Its middle (the berry, -0.49..1.6 tall) on the group's origin.
      g.scene.position.y = -0.6
      s3.body.add(g.scene)
      s3.ok = true
    },
    undefined,
    (e) => {
      s3.failed = true
      fail("celeste", e)
    },
  )
  // The points above where it was collected (1000… 5000, 1UP): text on a sprite.
  {
    const c = document.createElement("canvas")
    c.width = 512
    c.height = 192
    s3.labelCanvas = c
    s3.labelTex = new THREE.CanvasTexture(c)
    s3.labelTex.colorSpace = THREE.NoColorSpace
    s3.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: s3.labelTex, transparent: true, depthTest: false, depthWrite: false }))
    s3.label.visible = false
    s3.scene.add(s3.label)
    document.fonts?.load?.("700 120px 'Space Grotesk'").catch(() => {})
  }
  function drawLabel(text, oneUp) {
    const c = s3.labelCanvas
    const g = c.getContext("2d")
    g.clearRect(0, 0, c.width, c.height)
    g.font = "700 120px 'Space Grotesk', sans-serif"
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.lineJoin = "round"
    g.strokeStyle = "#2a0710"
    g.lineWidth = 30
    g.strokeText(text, 256, 100)
    g.strokeStyle = oneUp ? "#1f8a4a" : "#d21f45"
    g.lineWidth = 16
    g.strokeText(text, 256, 100)
    g.fillStyle = oneUp ? "#eaffd8" : "#ffffff"
    g.fillText(text, 256, 100)
    s3.labelTex.needsUpdate = true
  }
  // Centimetres per box height at his face's depth (the 3D camera's units).
  const cmPerBox = () => at3(0.5, 0.6).distanceTo(at3(0.5, 0.4)) * 5

  // ---------- Dash ----------
  const DASH = { WHIP: 0.05, AFTER: 0.5, LAST: 0.9, REFILL: 1.5, PX: 22 }
  // From the dock, along the side with room behind him for the trail: towards where he sits.
  function dockDir() {
    const s = -roomySide(-cel.lastDir)
    return new THREE.Vector2(s, 0)
  }
  // `jogo`: the game's dash (o.dir its direction, o.segundo whether one is still left): lighter, since the game
  // dashes every second or so, silent, and the hair left to the game's count.
  function startDash(now, dir = null, o = {}) {
    if (morto() || (cel.dash && now - cel.dash.t0 < (o.jogo ? 150 : 300))) return
    if (!dir || dir.lengthSq() < 1e-4) dir = dockDir()
    dir = dir.clone().normalize()
    if (Math.abs(dir.x) > 0.1) cel.lastDir = Math.sign(dir.x)
    const hair = cel.hair
    const second = o.jogo ? !!o.segundo : now - hair.usedAt < DASH.REFILL * 1000
    const k = o.jogo ? 0.55 : 1
    cel.dash = { t0: now, dir, slot: histI, imgs: false, k, second }
    const c = bodyMid()
    toca(o.jogo, `celeste-dash-${second ? "duplo-" : ""}${dir.x < 0 ? "esquerda" : "direita"}`, { pan: panAt(c.x) })
    if (!o.jogo) {
      hair.usedAt = now
      hair.refilled = false
      hair.second = second
    }
    cel.maskUntil = Math.max(cel.maskUntil, now + (o.jogo ? 1.2 : DASH.REFILL + 0.8) * 1000)
    // The burst behind him: a ring and pixels thrown back.
    const back = Math.atan2(-dir.y, -dir.x)
    const at = [c.x - ux(dir.x * 0.12), c.y - dir.y * 0.12]
    ring(at[0], at[1], 0.22 * (0.6 + 0.4 * k), WHITE, 0.3, 0.09, 0.9 * k)
    burst(at[0], at[1], { n: Math.round(10 * k), kind: KIND.pixel, col: WHITE, col2: second ? PINK : RED, speed: 0.9, size: 0.012, life: 0.4, spread: 1.6, dir: back })
    // Speed lines across the box, along the dash.
    for (let i = 0; i < Math.round(16 * k * k); i++) {
      const y = 0.08 + Math.random() * 0.84
      const x = dir.x > 0 ? Math.random() * 0.7 : 0.3 + Math.random() * 0.7
      spawn({ kind: KIND.streak, x, y, vx: dir.x * (2.4 + Math.random() * 1.6), vy: dir.y * 2.4, size: 0.007 + Math.random() * 0.005, stretch: 22 + Math.random() * 26, rot: Math.atan2(dir.y, dir.x), col: WHITE, a: 0.55 + Math.random() * 0.35, life: 0.18 + Math.random() * 0.14, delay: Math.random() * 0.06 })
    }
  }
  function updateDash(now) {
    const d = cel.dash
    const t = (now - d.t0) / 1000
    // The picture whips that way and springs back.
    const k = (t < DASH.WHIP ? ease(t / DASH.WHIP) : Math.exp(-(t - DASH.WHIP) * 9) * Math.cos((t - DASH.WHIP) * 11)) * d.k * d.k
    m.deslocar(d.dir.x * DASH.PX * k, d.dir.y * DASH.PX * k)
    // The afterimages, once the mask has him (it's tracked from the dash on): the frames before the dash with it,
    // spread back along the dash, fading.
    if (!d.imgs && m.mascaraEm > d.t0 && t < 0.4) {
      d.imgs = true
      d.imgT = now
      after.forEach((rt, i) => {
        const h = hist[(d.slot - 1 - i * 2 + N_HIST * 4) % N_HIST]
        reMaskMat.uniforms.uSrc.value = h.rt.texture
        reMaskMat.uniforms.uTem.value = h.masked ? 1 : 0
        drawTo(rt, reMaskScene)
      })
    }
    for (let i = 0; i < 4; i++) {
      let a = 0
      if (d.imgs) {
        const ti = (now - d.imgT) / 1000 - i * 0.025
        a = ti < 0 ? 0 : (0.78 - i * 0.13) * (1 - ease(clamp(ti / DASH.AFTER, 0, 1))) * (0.5 + 0.5 * d.k)
        const dist = 0.075 * (i + 1) * (0.85 + 0.15 * Math.min(1, ti / 0.1)) * (0.6 + 0.4 * d.k)
        backU[`uAOff${i}`].value.set(ux(-d.dir.x * dist), -d.dir.y * dist)
      }
      backU[`uAA${i}`].value = a
    }
    backU.uATint.value.set(...(d.second ? PINK : RED))
    if (t > DASH.LAST) {
      cel.dash = null
      for (let i = 0; i < 4; i++) backU[`uAA${i}`].value = 0
    }
  }
  // The refill: a white flash on his hair and sparkles round his head.
  function refillSparkle(mudo) {
    const h = cel.hair
    h.flash = 1
    const f = face()
    for (let i = 0; i < 9; i++) {
      const an = Math.PI * (0.05 + 0.9 * (i / 8))
      const x = f.c.x + ux(Math.cos(an) * f.h * 0.95)
      const y = f.c.y + f.h * 0.2 + Math.sin(an) * f.h * 0.75
      spawn({ kind: KIND.star, x, y, vy: 0.05, size: 0.03, size1: 0.005, col: i % 2 ? PINK : WHITE, life: 0.55, delay: i * 0.02, rot: 0.2 })
    }
    toca(mudo, "celeste-dash-recarga", { pan: panAt(f.c.x), gain: 0.55 })
  }
  // The look's hair (visuais.js's Madeline or Badeline, Celeste 64's models, whose hair is white in the file),
  // coloured as Celeste 64 colours it (Player.cs, Badeline.cs): Madeline's red with a dash left, blue with none, pink
  // with two, gold in the feather, a white flash on the refill; Badeline's always purple. 0 when there's no look
  // (his own hair takes the colour then), 1 when it follows the dashes, 2 when it doesn't.
  const C64 = { um: 0xdb2c00, zero: 0x6ec0ff, dois: 0xfa91ff, pena: 0xf2d450, badeline: 0x9b3fb5 }
  const lookHair = new THREE.Color(C64.um)
  const lookTo = new THREE.Color()
  const lookShown = new THREE.Color()
  const WHITE_C = new THREE.Color(1, 1, 1)
  function hairOnLook(n, flash, dt) {
    const bad = m.modo === "badeline"
    lookTo.setHex(bad ? C64.badeline : !cel.opts.cabelo ? C64.um : cel.pena ? C64.pena : n <= 0 ? C64.zero : n === 1 ? C64.um : C64.dois)
    lookHair.lerp(lookTo, Math.min(1, dt * 30))
    lookShown.copy(lookHair).lerp(WHITE_C, bad || !cel.opts.cabelo ? 0 : flash)
    trMat.color.copy(lookShown)
    cel.hair.n = bad ? 1 : n
    return m.corDoVisual("Hair", lookShown) ? (bad ? 2 : 1) : 0
  }

  // The look's jacket, as her art draws it (the game's endings and portraits): a glossy puffer (Madeline's blue,
  // Badeline's purple) open down the front over a dark top whose turtleneck shows between the collar's two standing
  // sides, the backpack's leather straps over his shoulders, painted on his own outline (the body mask below the
  // collar, not his face or ears; his hands come back over it), so it fits whatever he does. Cel-shaded from a round
  // torso quilted in puffed bands, with the nylon's light streaks, a fine grain, and the art's dark lines at its edge,
  // the collar's, the opening's, the seams and the straps'. The collar follows his chin (the face's frame), the rest his
  // shoulders, centred on his neck. Its uniforms come first: the hair's occluder reads the chin too.
  // Madeline's open over her top, with the backpack's straps; Badeline's zipped up to the collar, no backpack.
  const ROUPA = {
    celeste: { claro: 0x74b4e0, meio: 0x4a88c0, sombra: 0x2e5a88, linha: 0x1b1838, brilho: 0xc8eeff, blusa: 0x4a3d6e, blusaSombra: 0x2f2650, aberta: 1, alcas: 1 },
    badeline: { claro: 0xa585e0, meio: 0x7851b6, sombra: 0x4f2a8a, linha: 0x241030, brilho: 0xe4d2ff, blusa: 0x3a2c48, blusaSombra: 0x241a30, aberta: 0, alcas: 0 },
    alca: { claro: 0x8a5634, sombra: 0x5c3420, brilho: 0xc98a55 },
  }
  // His face's outline as the face mesh has it, a touch inside, sharp (the engine's, for erasing round it, is padded
  // and soft): where the hair and the jacket stop at his jaw and chin.
  const justoCanvas = document.createElement("canvas")
  justoCanvas.width = 640
  justoCanvas.height = 360
  const justoCtx = justoCanvas.getContext("2d")
  const justoTex = new THREE.CanvasTexture(justoCanvas)
  justoTex.colorSpace = THREE.NoColorSpace
  function drawJusto(lm) {
    const g = justoCtx
    g.clearRect(0, 0, 640, 360)
    const pts = FACE_OVAL.map((i) => toScreen(lm[i].x, lm[i].y))
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
    g.beginPath()
    pts.forEach(([u, v], k) => {
      const x = (cx + (u - cx) * 0.97) * 640, y = (1 - (cy + (v - cy) * 0.97)) * 360
      k ? g.lineTo(x, y) : g.moveTo(x, y)
    })
    g.closePath()
    g.fillStyle = "#fff"
    g.filter = "blur(1px)"
    g.fill()
    justoTex.needsUpdate = true
  }
  backU.uRostoJ = { value: justoTex }
  wipeU.uRostoJ.value = justoTex
  grabMat.uniforms.uRostoJ.value = justoTex
  // Morte's two copies of the frame, the box's size.
  const frz = { a: null, b: null, box: new THREE.Vector4(), at: new THREE.Vector2() }
  function tomaQuadro(qual, r) {
    r.renderer.getScissor(frz.box)
    const w = frz.box.z, h = frz.box.w
    if (!frz.a || frz.a.image.width !== w || frz.a.image.height !== h) {
      frz.a?.dispose()
      frz.b?.dispose()
      frz.a = new THREE.FramebufferTexture(w, h)
      frz.b = new THREE.FramebufferTexture(w, h)
    }
    r.renderer.copyFramebufferToTexture(frz[qual], frz.at.set(frz.box.x, frz.box.y))
    backU.uFrzA.value = wipeU.uLookA.value = frz.a
    backU.uFrz.value = wipeU.uLookB.value = frz.b
  }
  // The collar, in half shoulder widths from the line between his shoulders: its top's height in front (`ALTO`), how
  // tall it stands (`ALTURA`), how far it goes each way (`LARGO`). On his shoulders, not his chin: his neck shows as he
  // raises his head, his chin comes over it as he lowers it. Beside it the jacket's top runs from the collar's foot down
  // his shoulders (`OMBRO`: how far above its foot it starts, and how much it falls per half shoulder width; measured
  // live: the trackers' shoulders are inside his outline and ~0.27 under its top), never over his own outline (the
  // mask) nor up to his jaw, so it follows his shoulders whatever they do.
  const GOLA = { ALTO: 0.62, ALTURA: 0.2, LARGO: 0.44, OMBRO: [0.06, 0.12] }
  const TRONCO_GLSL = /* glsl */ `
    // The body mask without the chair behind him (the engine's uTronco: ../../tronco.js).
    uniform sampler2D uTronco;
    float mascaraTronco(vec2 uv, float lod) { vec2 v = camUv(uv); return textureLod(uTronco, vec2(v.x, 1.0 - v.y), lod).r; }
    // His torso from the shoulders' line, centred under his chin, in half shoulder widths: x across (to the picture's
    // right), y up.
    vec2 tronco(vec2 uv) {
      vec2 asp = vec2(uAspect, 1.0);
      vec2 rt = vec2(uFaceUp.y, -uFaceUp.x);
      vec2 L = uShL * asp, R = uShR * asp, mid = (L + R) * 0.5;
      vec2 ax = normalize(R - L);
      if (dot(ax, rt) < 0.0) ax = -ax;
      vec2 ay = vec2(-ax.y, ax.x);
      if (dot(ay, uFaceUp) < 0.0) ay = -ay;
      mid += ax * dot(uChin * asp - mid, ax);
      float sw = clamp(length(R - L) * 0.5, 2.0 * uFace.z, 3.6 * uFace.z);
      return vec2(dot(uv * asp - mid, ax), dot(uv * asp - mid, ay)) / sw;
    }
    const float GOLA_ALTO = ${GOLA.ALTO.toFixed(3)}, GOLA_ALTURA = ${GOLA.ALTURA.toFixed(3)}, GOLA_LARGO = ${GOLA.LARGO.toFixed(3)};
    const float OMBRO_SOBE = ${GOLA.OMBRO[0].toFixed(3)}, OMBRO_CAI = ${GOLA.OMBRO[1].toFixed(3)};
    // From his chin in half face widths, along his face.
    vec2 queixo(vec2 uv) {
      vec2 q = (uv - uChin) * vec2(uAspect, 1.0) / uFace.z;
      return vec2(dot(q, vec2(uFaceUp.y, -uFaceUp.x)), dot(q, uFaceUp));
    }
    // The collar's top (the front of a ring round his neck).
    float golaTopo(float x) { return GOLA_ALTO + 0.6 * x * x; }
    // How far under the jacket's top a point is, in about half shoulder widths (positive: on the jacket, where the
    // mask has him): the collar's top within it; beside it his shoulders' line from the collar's foot, kept under his
    // jaw (a line just under it, rising towards his ears and away).
    float sobJaqueta(vec2 b, vec2 f) {
      float ax = abs(b.x);
      if (ax < GOLA_LARGO) return golaTopo(b.x) - b.y;
      float ombro = GOLA_ALTO - GOLA_ALTURA + OMBRO_SOBE - OMBRO_CAI * (ax - GOLA_LARGO) - b.y;
      float queixo = (0.3 * min(f.x * f.x, 4.0) - 0.02 - f.y) / 2.6;
      return min(ombro, queixo);
    }`
  const rpU = {
    uRosto: { value: justoTex },
    uAberta: { value: 1 },
    uMarcas: { value: m.q.has("espelho") ? 1 : 0 },
    uAlcas: { value: 1 },
    uChin: { value: new THREE.Vector2(0.5, 0.4) },
    uShL: { value: new THREE.Vector2(0.3, 0.1) },
    uShR: { value: new THREE.Vector2(0.7, 0.1) },
    uClaro: { value: new THREE.Color() },
    uMeio: { value: new THREE.Color() },
    uSombra: { value: new THREE.Color() },
    uLinha: { value: new THREE.Color() },
    uBrilho: { value: new THREE.Color() },
    uBlusa: { value: new THREE.Color() },
    uBlusaSombra: { value: new THREE.Color() },
    uAlcaBrilho: { value: new THREE.Color(ROUPA.alca.brilho) },
    uAlcaClaro: { value: new THREE.Color(ROUPA.alca.claro) },
    uAlcaSombra: { value: new THREE.Color(ROUPA.alca.sombra) },
    uAmt: { value: 0 },
  }
  // The look's long hair, as her official art draws it (the game's portraits and endings: Madeline's red, Badeline's
  // purple): one straight curtain from under the crown, round the sides of the head and down past the shoulders,
  // ending in points. A sheet of columns hung from a ring round the back and sides of the head piece (in the head's
  // centimetres, from the face's centre: up `ALTURA`, out `RAIO` across and back, `ARCO` degrees each way from the
  // back, so its front edges frame the face), each column falling as Celeste 64 moves its hair (Source/Graphics/
  // Hair.cs: each node pulled a quarter of the way per frame, at 60/s, towards a step down from the one before, waving
  // more towards the tip), straight down (`ABRE`: barely widening), never inwards of its root nor in front of it, its
  // strands drawn on it (a texture of lines) and its ends in uneven points, and kept out of an invisible body of his
  // made of what the trackers know (`CORPO`: his neck, a cylinder from under his head to between his shoulders, and
  // his shoulders, a capsule between them at their depths), so it lies on his shoulders behind his neck and slides
  // down his back instead of through him. So it
  // hangs down whatever his head does and sways as he moves. It's behind his face (an ellipse a little inside its
  // outline, so its front edges frame it), his neck and his body below the jacket's collar (the mask as depth there),
  // over the rest: his own hair beside his face, his ears, his chair. So it shows beside his neck, the long hair behind
  // it; the rest is on his back. The head piece covers its top.
  const CORTINA = { COLUNAS: 29, LINHAS: 11, ARCO: 140, ALTURA: 4.5, RAIO: [9.5, 10.5], CENTRO: -3.4, PASSO: 4.4, ABRE: 0.06, ONDA: 0.2 }
  const ct = { cols: [], wave: 0, on: false }
  const PONTAS = [0.5, 0.2, 0.65, 0.1, 0.4, 0.3, 0.7]
  // His invisible body, in cm: the neck's radius and where it starts (head space: down, back); the shoulders' capsule's
  // radius, and how far up and back from the joints the trackers give.
  const CORPO = { PESCOCO: 5.5, NUCA: [-5, -3.5], OMBRO: 7.5, OMBRO_SOBE: 3, OMBRO_ATRAS: 2 }
  const trScene = new THREE.Scene()
  trScene.add(new THREE.HemisphereLight(0xffffff, 0x50505a, 1.7))
  const trSun = new THREE.DirectionalLight(0xffffff, 1.5)
  trSun.position.set(0.3, 1, 1)
  trScene.add(trSun)
  // The strands: lines of a darker and a lighter shade down a lighter ground, as the art paints them.
  const fios = (() => {
    const cv = document.createElement("canvas")
    cv.width = 512
    cv.height = 8
    const g = cv.getContext("2d")
    g.fillStyle = "rgb(225,225,225)"
    g.fillRect(0, 0, 512, 8)
    let r = 7
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 70; i++) {
      const v = rnd() < 0.7 ? 120 + rnd() * 70 : 245 + rnd() * 10
      g.fillStyle = `rgb(${v},${v},${v})`
      g.fillRect(rnd() * 512, 0, 1 + rnd() * 4, 8)
    }
    const t = new THREE.CanvasTexture(cv)
    t.wrapS = THREE.RepeatWrapping
    t.colorSpace = THREE.NoColorSpace
    return t
  })()
  const trMat = new THREE.MeshStandardMaterial({ color: C64.um, map: fios, roughness: 1, metalness: 0, flatShading: true, side: THREE.DoubleSide })
  const ctGeo = new THREE.BufferGeometry()
  {
    const { COLUNAS: C, LINHAS: R } = CORTINA
    ctGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(C * R * 3), 3).setUsage(THREE.DynamicDrawUsage))
    const uv = new Float32Array(C * R * 2)
    for (let c = 0; c < C; c++) for (let j = 0; j < R; j++) uv.set([(c / (C - 1)) * 3, j / (R - 1)], (c * R + j) * 2)
    ctGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
    const idx = []
    for (let c = 0; c < C - 1; c++)
      for (let j = 0; j < R - 1; j++) {
        const a = c * R + j, b = (c + 1) * R + j
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    ctGeo.setIndex(idx)
  }
  const trMesh = new THREE.Mesh(ctGeo, trMat)
  trMesh.frustumCulled = false
  trMesh.visible = false
  trScene.add(trMesh)

  const trOcclude = quad(
    new THREE.ShaderMaterial({
      uniforms: { ...m.uniforms, ...rpU },
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, -1.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        uniform vec4 uFace;
        uniform vec2 uFaceUp, uChin, uShL, uShR;
        uniform sampler2D uRosto;
        ${TRONCO_GLSL}
        void main() {
          vec2 asp = vec2(uAspect, 1.0);
          vec2 rt = vec2(uFaceUp.y, -uFaceUp.x);
          vec2 d = (vUv - uFace.xy) * asp;
          d = vec2(dot(d, rt), dot(d, uFaceUp));
          // His face: an ellipse a little inside its outline up top (the hair covers his ears and temples), its own
          // outline from below his ears (his jaw).
          bool face = length(d / vec2(uFace.z * 0.9, uFace.w * 1.02)) < 1.0 && d.y > -0.25 * uFace.w || texture2D(uRosto, vUv).r > 0.5 && d.y <= -0.25 * uFace.w;
          vec2 q = (vUv - uChin) * asp / uFace.z;
          vec2 f = vec2(dot(q, rt), dot(q, uFaceUp));
          // His neck (from his jaw down, as wide as it) and his body below the collar; not his own hair beside his face.
          vec2 b = tronco(vUv);
          bool body = (mascaraTronco(vUv, 0.0) > 0.4 && sobJaqueta(b, f) > -0.02) || (maskAt(vUv, 0.0) > 0.4 && abs(f.x) < 0.8 && f.y < 0.05);
          if (!face && !body) discard;
          gl_FragColor = vec4(0.0);
        }`,
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      depthFunc: THREE.AlwaysDepth,
    }),
  )
  const UP = new THREE.Vector3(0, 1, 0)
  const B = { a: new THREE.Vector3(), b: new THREE.Vector3(), L: new THREE.Vector3(), R: new THREE.Vector3(), d: new THREE.Vector3(), p: new THREE.Vector3() }
  // Pushes p out of the capsule round segment a–b of radius r (the neck, the shoulders): straight out, or only along
  // `por` (the shoulders push the hair back behind them, never out to the side).
  function fora(p, a, b, r, por) {
    const ab = B.d.copy(b).sub(a)
    const t = THREE.MathUtils.clamp(B.p.copy(p).sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1)
    const off = B.p.copy(a).addScaledVector(ab, t).sub(p).negate()
    const d = off.length()
    if (d >= r || d < 1e-6) return
    if (!por) return void p.addScaledVector(off, (r - d) / d)
    // |off + x por| = r, x >= 0
    const bq = off.dot(por)
    p.addScaledVector(por, -bq + Math.sqrt(Math.max(0, bq * bq - (d * d - r * r))))
  }
  const T = { atras: new THREE.Vector3(), s: new THREE.Vector3(), out: new THREE.Vector3(), fwd: new THREE.Vector3(), side: new THREE.Vector3(), target: new THREE.Vector3(), off: new THREE.Vector3(), v: new THREE.Vector3() }
  function updateTranca(dt) {
    const a = m.visual
    const head = a?.pecas?.cabeca?.grupo && a.hair.parent
    ct.on = !!(head && m.headSeen && a.hair.visible && a.amt > 0.01)
    trMesh.visible = ct.on
    if (!ct.on) {
      ct.cols.length = 0
      return
    }
    const { COLUNAS: C, LINHAS: R, ARCO, ALTURA, RAIO, CENTRO, PASSO, ABRE, ONDA } = CORTINA
    head.updateWorldMatrix(true, false)
    const mw = head.matrixWorld
    const grow = easeOutBack(Math.min(1, a.amt))
    const s = T.s.setFromMatrixScale(mw).x
    const step = PASSO * s * Math.max(0.05, grow)
    const fwd = T.fwd.set(0, 0, 1).transformDirection(mw).setY(0)
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, 1)
    fwd.normalize()
    ct.wave += dt * 4
    const k = 1 - Math.pow(0.75, dt * 60)
    // His body: the neck from under his head to between his shoulders (or straight down without them), the shoulders.
    const nuca = B.a.set(0, CORPO.NUCA[0], CORPO.NUCA[1]).applyMatrix4(mw)
    const ombros = m.pose.seen
    if (ombros) {
      const z = m.headPos.z
      B.L.copy(m.onRay(m.pose.left.x, m.pose.left.y, z - m.pose.dz / 2))
      B.R.copy(m.onRay(m.pose.right.x, m.pose.right.y, z + m.pose.dz / 2))
      for (const v of [B.L, B.R]) v.addScaledVector(UP, CORPO.OMBRO_SOBE * s).addScaledVector(fwd, -CORPO.OMBRO_ATRAS * s)
      B.b.copy(B.L).add(B.R).multiplyScalar(0.5)
    } else B.b.copy(nuca).addScaledVector(UP, -15 * s)
    const pos = ctGeo.getAttribute("position")
    for (let c = 0; c < C; c++) {
      const th = THREE.MathUtils.degToRad(lerp(-ARCO, ARCO, c / (C - 1)))
      const root = T.v.set(Math.sin(th) * RAIO[0], ALTURA, CENTRO - Math.cos(th) * RAIO[1]).applyMatrix4(mw)
      const out = T.out.set(Math.sin(th), 0, -Math.cos(th)).transformDirection(mw).setY(0).normalize()
      const side = T.side.crossVectors(UP, out)
      let col = ct.cols[c]
      if (!col) col = ct.cols[c] = Array.from({ length: R }, (_, j) => root.clone().addScaledVector(UP, -step * j))
      col[0].copy(root)
      for (let j = 1; j < R; j++) {
        const nd = col[j]
        const prev = col[j - 1]
        T.target.copy(prev).addScaledVector(UP, -step).addScaledVector(out, step * ABRE)
        T.target.addScaledVector(side, Math.sin(ct.wave + j * 0.5 + c * 0.35) * ONDA * step * (j / R))
        // Following the game: away from where she moves, along the wind.
        T.target.x += (reacoes.empurra.x + momentos.empurra.x) * step * (j / R)
        T.target.y += (reacoes.empurra.y + momentos.empurra.y) * step * (j / R)
        nd.lerp(T.target, k)
        // Not inwards of its root (off his face and neck), not in front of it, at most a step from the one above.
        const inn = T.off.copy(nd).sub(root).dot(out)
        if (inn < 0) nd.addScaledVector(out, -inn)
        const ahead = T.off.copy(nd).sub(root).dot(fwd)
        if (ahead > 0) nd.addScaledVector(fwd, -ahead)
        T.off.copy(nd).sub(prev)
        if (T.off.length() > step) nd.copy(prev).addScaledVector(T.off.normalize(), step)
        fora(nd, nuca, B.b, CORPO.PESCOCO * s)
        if (ombros) fora(nd, B.L, B.R, CORPO.OMBRO * s, T.atras.copy(fwd).negate())
      }
      // The ends in uneven points: every other column shorter, by more or less.
      for (let j = 0; j < R; j++) {
        const p = j === R - 1 && c % 2 ? T.off.copy(col[j - 1]).lerp(col[j], PONTAS[c % PONTAS.length]) : col[j]
        pos.setXYZ(c * R + j, p.x, p.y, p.z)
      }
    }
    pos.needsUpdate = true
  }
  const roupa = quad(
    new THREE.ShaderMaterial({
      uniforms: { ...m.uniforms, ...rpU },
      vertexShader: VERT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        uniform sampler2D uKeep;
        uniform vec4 uFace;
        uniform vec2 uFaceUp, uChin, uShL, uShR;
        uniform vec3 uClaro, uMeio, uSombra, uLinha, uBrilho, uBlusa, uBlusaSombra, uAlcaClaro, uAlcaSombra, uAlcaBrilho;
        uniform float uAmt, uAberta, uAlcas, uMarcas;
        uniform sampler2D uRosto;
        ${TRONCO_GLSL}
        const vec3 LUZ = vec3(0.33, 0.6, 0.73);
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float ruido(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
        }
        // Three tones and a highlight from a normal.
        vec3 toon(vec3 n, float bias) {
          float l = dot(normalize(n), normalize(LUZ)) + bias;
          vec3 c = mix(uSombra, uMeio, smoothstep(0.3, 0.34, l));
          c = mix(c, uClaro, smoothstep(0.68, 0.72, l));
          return mix(c, uBrilho, smoothstep(0.93, 0.96, l) * 0.7);
        }
        void main() {
          // His outline, smoothed (a blurred mask) and a little out, so its edge is a clean curve.
          float m2 = mascaraTronco(vUv, 2.2);
          float body = smoothstep(0.2, 0.34, m2);
          if (body <= 0.0 && uMarcas < 0.5) discard;
          vec2 asp = vec2(uAspect, 1.0);
          float F = uFace.z;
          vec2 up = uFaceUp, rt = vec2(up.y, -up.x);
          float face = smoothstep(0.3, 0.7, texture2D(uRosto, vUv).r);
          vec2 b = tronco(vUv);
          vec2 f = queixo(vUv);
          float sob = sobJaqueta(b, f);
          float on = body * (1.0 - face) * smoothstep(-0.012, 0.012, sob);
          if (on <= 0.0 && uMarcas < 0.5) discard;
          // The body: a round torso (darker towards his sides) quilted in puffed bands, each a tube across it, curving
          // like rings seen from a little above, with a fine grain.
          float nx = clamp(b.x / 1.2, -0.98, 0.98);
          float cz = sqrt(1.0 - nx * nx);
          float by = b.y - 0.18 * nx * nx;
          float k = (by - 0.15) / 0.78;
          float v = fract(k);
          float band = floor(k);
          float grao = ruido(vUv * asp * 220.0) - 0.5;
          vec3 c = toon(vec3(nx, -cos(3.14159 * v) * 0.8, cz * (0.35 + sin(3.14159 * v))), 0.0);
          // The nylon's light streaks: broken strokes along the top of each band, on the lit side.
          float tr = smoothstep(0.035, 0.008, abs(v - 0.72 - 0.04 * sin(b.x * 5.0 + band * 2.0)));
          tr *= smoothstep(0.45, 0.6, ruido(vec2(b.x * 3.5, band * 7.3))) * smoothstep(-0.4, 0.2, nx);
          float seam = smoothstep(0.07, 0.0, min(v, 1.0 - v));
          // The open front: his dark top down the middle, widening a little as it goes down.
          float fw = 0.15 + 0.05 * clamp(-b.y, 0.0, 2.0);
          float blusa = smoothstep(fw + 0.012, fw, abs(b.x)) * uAberta;
          // The collar: standing round his neck, at both sides of the opening when it's open (the top's turtleneck
          // between them).
          float cx = b.x / GOLA_LARGO;
          float pe = GOLA_ALTO - GOLA_ALTURA;
          float collar = smoothstep(pe - 0.012, pe + 0.012, b.y) * smoothstep(GOLA_LARGO + 0.01, GOLA_LARGO - 0.01, abs(b.x));
          float gola = collar * mix(1.0, smoothstep(fw - 0.005, fw + 0.005, abs(b.x)), uAberta);
          float cv = clamp((b.y - pe) / (golaTopo(b.x) - pe), 0.0, 1.0);
          vec3 cc = toon(vec3(cx * 0.9, smoothstep(0.55, 1.0, cv) * 0.9 - 0.15, sqrt(max(0.0, 1.0 - cx * cx))), 0.0);
          cc = mix(cc, uBrilho, smoothstep(0.035, 0.01, abs(cv - 0.78)) * smoothstep(0.5, 1.0, cx * 1.4 + 0.3) * 0.8);
          float blusaTudo = max(blusa * (1.0 - collar), collar * (1.0 - gola));
          float bl = dot(normalize(vec3(b.x * 2.5, 0.4, 1.0)), normalize(LUZ));
          vec3 bc = mix(uBlusaSombra, uBlusa, smoothstep(0.5, 0.56, bl));
          c = mix(c, uBrilho, tr * 0.75 * (1.0 - collar));
          c = mix(c, cc, gola);
          c = mix(c, bc, blusaTudo);
          // The straps over each shoulder and down, leather, round like the body, with a light stroke down one edge.
          float sx = abs(b.x) - 0.58 - 0.04 * b.y;
          float strap = smoothstep(0.12, 0.108, abs(sx)) * (1.0 - collar) * uAlcas;
          float sl = dot(normalize(vec3(nx + sx * 3.0, 0.3, cz)), normalize(LUZ));
          vec3 scol = mix(uAlcaSombra, uAlcaClaro, smoothstep(0.5, 0.54, sl));
          scol = mix(scol, uAlcaBrilho, smoothstep(0.02, 0.006, abs(sx - 0.06 * sign(b.x))) * 0.85);
          c = mix(c, scol, strap);
          // The art's dark lines: his outline, the collar's, the opening's, the seams, the straps' edges.
          float line = smoothstep(0.48, 0.36, m2);
          line = max(line, smoothstep(0.024, 0.01, abs(sob)));
          line = max(line, collar * smoothstep(0.02, 0.006, abs(abs(b.x) - GOLA_LARGO)));
          line = max(line, collar * smoothstep(0.018, 0.006, abs(abs(b.x) - fw)) * uAberta);
          line = max(line, smoothstep(0.02, 0.008, abs(b.y - pe)) * step(abs(b.x), GOLA_LARGO) * max(step(fw, abs(b.x)), 1.0 - uAberta));
          // Zipped: the zip down the middle, the collar's too.
          line = max(line, (1.0 - uAberta) * smoothstep(0.02, 0.006, abs(b.x)) * 0.85);
          line = max(line, (1.0 - collar) * (1.0 - strap) * (1.0 - blusa) * seam * 0.55);
          line = max(line, (1.0 - collar) * smoothstep(0.022, 0.006, abs(abs(b.x) - fw)) * 0.95 * uAberta);
          line = max(line, (1.0 - collar) * smoothstep(0.016, 0.004, abs(abs(sx) - 0.114)) * uAlcas);
          c = mix(c, uLinha, clamp(line, 0.0, 1.0) * 0.92);
          c *= 1.0 + grao * 0.07;
          gl_FragColor = vec4(c, on * uAmt);
          // ?espelho: where the trackers put his shoulders (red), his chin (green) and the shoulders' line (yellow).
          if (uMarcas > 0.5) {
            vec2 asp = vec2(uAspect, 1.0);
            float dl = min(length((vUv - uShL) * asp), length((vUv - uShR) * asp));
            float dc = length((vUv - uChin) * asp);
            if (dl < 0.012) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            if (dc < 0.01) gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
            if (abs(b.y) < 0.006) gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
          }
        }`,
    }),
  )
  function updateRoupa() {
    const a = m.visual
    const cores = ROUPA[m.modo]
    const fl = m.faceLm
    rpU.uAmt.value = a && cores && fl ? Math.min(1, a.amt) : 0
    if (!rpU.uAmt.value) return
    rpU.uClaro.value.set(cores.claro)
    rpU.uMeio.value.set(cores.meio)
    rpU.uSombra.value.set(cores.sombra)
    rpU.uLinha.value.set(cores.linha)
    rpU.uBrilho.value.set(cores.brilho)
    rpU.uBlusa.value.set(cores.blusa)
    rpU.uBlusaSombra.value.set(cores.blusaSombra)
    rpU.uChin.value.set(...toScreen(fl[152].x, fl[152].y))
    rpU.uAberta.value = cores.aberta
    rpU.uAlcas.value = cores.alcas
    drawJusto(fl)
    if (m.pose.seen) {
      rpU.uShL.value.copy(m.pose.left)
      rpU.uShR.value.copy(m.pose.right)
    } else {
      // Without the shoulders, where they'd be under his face.
      const [lx, ly] = toScreen(fl[234].x, fl[234].y)
      const [rx, ry] = toScreen(fl[454].x, fl[454].y)
      const [cx, cy] = rpU.uChin.value.toArray()
      const w = Math.hypot((rx - lx) * (W / H), ry - ly)
      rpU.uShL.value.set(cx - (w * 1.3) / (W / H), cy - w * 0.7)
      rpU.uShR.value.set(cx + (w * 1.3) / (W / H), cy - w * 0.7)
    }
  }
  // His hair following the game: the colour of his dashes left (blue at none, his own warmed with one, pinkish with
  // two), only while he's alive in a level, his face seen and the body mask fresh; the look's instead when he has one.
  const tint = new THREE.Vector3(...WARM)
  // The dashes as her hair's colour counts them, the game's rule: blue only when one is spent (none left of one or
  // more), so red where she has none to spend (the prologue: 0 of 0).
  const dashesDoCabelo = (pl) => {
    const n = pl?.dashes ?? 1
    return n > 0 ? n : n < (pl?.max ?? 1) ? 0 : 1
  }
  function updateHairFromGame(now, dt) {
    const h = cel.hair
    if (m.headSeen) h.faceAt = now
    const pl = jogo.estado?.jogador
    const n = dashesDoCabelo(pl)
    const [col, amt] = n <= 0 ? [BLUE, 1] : n === 1 ? [WARM, 0.13] : [PINK, 0.2]
    const look = hairOnLook(n, h.flash, dt)
    const on = !look && cel.opts.cabelo && pl && pl.vivo !== false && now - h.faceAt < 700 && m.mascaraEm > now - 500
    h.amt += ((on ? amt : 0) - h.amt) * Math.min(1, dt * (n <= 0 ? 25 : 10))
    tint.lerp(new THREE.Vector3(...col), Math.min(1, dt * (n <= 0 ? 30 : 12)))
    h.flash = Math.max(0, h.flash - dt / 0.22)
    backU.uHairTint.value.copy(tint)
    backU.uHair.value = h.amt
    backU.uHairFlash.value = cel.opts.cabelo && !look ? h.flash : 0
    if (h.amt > 0.003 || (!look && h.flash > 0.003)) drawFace()
  }
  // His hair: blue from the dash until the refill, then a white flash and sparkles round his head.
  function updateHair(now, dt) {
    const h = cel.hair
    if (seguindo()) return updateHairFromGame(now, dt)
    backU.uHairTint.value.set(...BLUE)
    // His face, lost for a moment now and then, doesn't take the tint off; the body mask must be fresh (it's asked
    // from the dash on, and an old one would tint where he was).
    if (m.headSeen) h.faceAt = now
    const blue = now - h.usedAt < DASH.REFILL * 1000
    const look = hairOnLook(blue ? 0 : 1, h.flash, dt)
    const on = !look && cel.opts.cabelo && now - h.faceAt < 700 && m.mascaraEm > now - 500
    if (blue && ((on && h.amt > 0.3) || (look === 1 && cel.opts.cabelo))) h.shown = true
    if (!h.refilled && !blue) {
      h.refilled = true
      if (h.shown && cel.opts.cabelo) refillSparkle(false)
      h.shown = false
    }
    h.amt += ((on && blue ? 1 : 0) - h.amt) * Math.min(1, dt * (blue ? 25 : 14))
    h.flash = Math.max(0, h.flash - dt / 0.22)
    backU.uHair.value = h.amt
    backU.uHairFlash.value = cel.opts.cabelo && !look ? h.flash : 0
    if (h.amt > 0.003 || (!look && h.flash > 0.003)) drawFace()
  }

  // ---------- Morte ----------
  const MT = { FREEZE: 0.36, GROW: 0.42, HOLD: 0.18, OPEN: 0.45, CONVERGE: 0.48, GHOST: 0.35, WAIT: 2.5 }
  const T_POP = MT.FREEZE, T_BACK = MT.FREEZE + MT.GROW + MT.HOLD, T_MEET = T_BACK + 0.05 + MT.CONVERGE, T_END = T_MEET + MT.GHOST + 0.2
  // Far enough from c to cover the whole box.
  const reach = (c) => Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => Math.hypot((x - c.x) * ASPECT, y - c.y))) * 1.04
  // The game's death waits in the black for the game's respawn (`renasceu`, `voltaEm`), MT.WAIT at most.
  function startMorte(now, o = {}) {
    if (cel.morte) return
    // `toma`: the frame's two copies are taken while it's drawn (1: after the ambient, 2: before the particles); it
    // starts from then.
    cel.morte = { t0: now, stage: 0, c: bodyMid(), maskOk: false, jogo: !!o.jogo, voltaEm: null, toma: 1 }
    backU.uFrzMaskOk.value = 0
    toca(o.jogo, "celeste-morte-antes", { pan: panAt(cel.morte.c.x) })
    m.sacudir(260, 4, now)
    cel.maskUntil = Math.max(cel.maskUntil, now + (T_END + 0.5) * 1000)
  }
  // The circles: eight round him, flashing white and red, bursting out (or coming back together).
  function deathCircles(c, out, delay = 0) {
    for (let i = 0; i < 8; i++) {
      const an0 = (i / 8) * Math.PI * 2 + Math.PI / 8
      spawn({
        kind: KIND.disc,
        x: c.x,
        y: c.y,
        size: 0.06,
        col: WHITE,
        solid: 1,
        delay,
        life: out ? 0.62 : MT.CONVERGE,
        move(p, k) {
          const r = out ? 0.42 * (1 - (1 - k) ** 2.2) : 0.36 * (1 - ease(k))
          const an = an0 + (out ? k * 0.9 : (1 - k) * 0.9)
          p.x = c.x + ux(Math.cos(an) * r)
          p.y = c.y + Math.sin(an) * r
          p.size = out ? 0.075 * (1 - k) ** 0.8 + 0.004 : 0.02 + 0.05 * Math.sin(Math.PI * Math.min(1, k * 1.15))
          p.col = Math.floor(p.age / 0.05) % 2 ? RED : WHITE
        },
      })
    }
  }
  function updateMorte(now) {
    const d = cel.morte
    if (d.toma) return
    const real = (now - d.t0) / 1000
    // The game's: held in the black from T_BACK until he respawns, then on as the dock's from there.
    let t = real
    if (d.jogo && real >= T_BACK) {
      const volta = d.voltaEm != null ? (d.voltaEm - d.t0) / 1000 : real >= T_BACK + MT.WAIT ? T_BACK + MT.WAIT : null
      if (volta == null) {
        backU.uFreeze.value = 0
        wipeU.uIris.value.set(d.c.x, d.c.y, d.r ?? reach(d.c), 1)
        return
      }
      t = T_BACK + real - Math.max(T_BACK, volta)
    }
    // His silhouette in the frozen picture, once the mask (asked from now) has him.
    if (!d.maskOk && m.mascaraEm > d.t0 - 150) {
      d.maskOk = true
      drawTo(frozenMask, grabScene)
      backU.uFrzMaskOk.value = 1
    }
    const u = wipeU.uIris.value
    if (t < T_POP) {
      backU.uFreeze.value = 1
      backU.uFrzDim.value = 1
      backU.uFlash.value = Math.floor(t / 0.06) % 2 ? 0.9 : 0.3
      u.w = 0
    } else if (t < T_BACK) {
      if (d.stage === 0) {
        d.stage = 1
        toca(d.jogo, "celeste-morte-estouro", { pan: panAt(d.c.x) })
        deathCircles(d.c, true)
        ring(d.c.x, d.c.y, 0.3, WHITE, 0.35, 0.06)
        d.r = reach(d.c)
      }
      const k = clamp((t - T_POP) / MT.GROW, 0, 1)
      backU.uFreeze.value = 1
      backU.uFlash.value = Math.max(0, 1 - (t - T_POP) / 0.12)
      backU.uFrzDim.value = 1 - 0.5 * Math.min(1, (t - T_POP) / 0.15)
      u.set(d.c.x, d.c.y, d.r * ease(k), 1)
    } else {
      backU.uFreeze.value = 0
      if (d.stage === 1) {
        d.stage = 2
        // He comes back where he is now.
        d.c2 = bodyMid()
        d.r2 = reach(d.c2)
        toca(d.jogo, "celeste-morte-volta", { pan: panAt(d.c2.x) })
        const c2 = d.c2
        deathCircles(c2, false, 0.05)
        spawn({ kind: KIND.glow, x: c2.x, y: c2.y, size: 0.3, col: [1, 0.85, 0.9], a: 0.5, life: MT.CONVERGE + 0.1, fadeIn: MT.CONVERGE })
      }
      const k = clamp((t - T_BACK) / MT.OPEN, 0, 1)
      u.set(d.c2.x, d.c2.y, d.r2 * (1 - (1 - k) ** 3), k < 1 ? 2 : 0)
      wipeU.uGhost.value = t < T_MEET ? 1 : Math.max(0, 1 - (t - T_MEET) / MT.GHOST)
      if (d.stage === 2 && t >= T_MEET) {
        d.stage = 3
        ring(d.c2.x, d.c2.y, 0.36, WHITE, 0.4, 0.07)
        burst(d.c2.x, d.c2.y, { n: 10, col: WHITE, col2: PINK, speed: 0.7, size: 0.03, life: 0.5 })
      }
    }
    if (t > T_END) encerraMorte()
  }
  function encerraMorte() {
    cel.morte = null
    backU.uFreeze.value = 0
    wipeU.uGhost.value = 0
    wipeU.uIris.value.w = 0
  }

  // ---------- Morango ----------
  const MG = { IN: 0.8, BOB: 0.75, GO: 0.55, TOUCH: 0.42, POP: 0.28, LABEL: 1.3, CHAIN: 6, SIZE: 0.11 }
  // Where it's collected: beside the top of his head, on its side, clear of his face (following him as he moves).
  function besideHead(side) {
    const f = face()
    return new THREE.Vector2(clamp(f.c.x + side * (f.w * 0.85 + ux(0.1)), 0.1, 0.9), clamp(f.c.y + f.h * 0.4, 0.2, 0.85))
  }
  // The game's (o.jogo): a quicker flight in (it was already collected there), silent, its points from the game's chain
  // (o.indice: 0 is 1000… 5 and up 1UP), golden for the golden one (o.dourado). One collected while another is still
  // flying waits its turn.
  const MG_JOGO = { IN: 0.4, BOB: 0.12, GO: 0.3 }
  function startMorango(now, o = {}) {
    if (cel.morango && o.jogo && cel.filaMorango.length < 4) return void cel.filaMorango.push(o)
    if (cel.morango || cel.morte) return
    const side = roomySide(cel.lastSide)
    cel.lastSide = side
    const f = face()
    const from = new THREE.Vector2(side > 0 ? 1.1 : -0.1, 0.8)
    const hover = new THREE.Vector2(0.5 + side * 0.32, clamp(f.c.y + 0.12, 0.55, 0.8))
    cel.morango = { t0: now, side, from, hover, to: besideHead(side), pos: from.clone(), stage: 0, flapAt: now, scale: 1, wings: 1, ctrl: new THREE.Vector2((from.x + hover.x) / 2, Math.max(from.y, hover.y) + 0.12), T: o.jogo ? MG_JOGO : MG, mudo: !!o.jogo, indice: o.jogo ? o.indice : null, dourado: !!o.dourado }
    berryGold(!!o.dourado)
    s3.root.visible = s3.ok
  }
  // The golden strawberry: the model's colour taken to gold.
  function berryGold(on) {
    for (const mat of s3.mats) {
      mat.color.setRGB(...(on ? [0.42, 0.36, 0.18] : [1, 1, 1]))
      mat.emissive.setRGB(...(on ? [0.9, 0.64, 0.14] : [0, 0, 0]))
    }
  }
  function updateMorango(now, dt) {
    const g = cel.morango
    const t = (now - g.t0) / 1000
    const T1 = g.T.IN, T2 = T1 + g.T.BOB, T3 = T2 + g.T.GO, T4 = T3 + MG.TOUCH, T5 = T4 + MG.POP
    let flapHz = 7
    if (t >= T2 && t < T4 && m.headSeen) g.to.lerp(besideHead(g.side), 0.2)
    if (t < T1) {
      const k = 1 - (1 - t / T1) ** 2
      const a = g.from, c = g.ctrl, b = g.hover
      g.pos.set((1 - k) ** 2 * a.x + 2 * k * (1 - k) * c.x + k * k * b.x, (1 - k) ** 2 * a.y + 2 * k * (1 - k) * c.y + k * k * b.y)
    } else if (t < T2) {
      g.pos.set(g.hover.x + ux(Math.sin((t - T1) * 4) * 0.01), g.hover.y + Math.sin((t - T1) * 7) * 0.018)
      flapHz = 4.5
    } else if (t < T3) {
      const k = ease((t - T2) / g.T.GO)
      const from = new THREE.Vector2(g.hover.x, g.hover.y + Math.sin(g.T.BOB * 7) * 0.018)
      g.pos.lerpVectors(from, g.to, k)
      g.pos.y += Math.sin(Math.PI * k) * 0.05
    } else {
      g.pos.copy(g.to)
      g.pos.y += Math.sin(Math.min(1, (t - T3) / MG.TOUCH) * Math.PI) * 0.025
      if (g.stage === 0) {
        g.stage = 1
        toca(g.mudo, "celeste-morango-toque", { pan: panAt(g.to.x) })
        ring(g.to.x, g.to.y, 0.12, WHITE, 0.25, 0.12, 0.8)
        // Its wings go as it's touched, in a few white feathers.
        for (const side of [-1, 1]) burst(g.to.x + ux(side * 0.06), g.to.y + 0.03, { n: 3, kind: KIND.wing, col: WHITE, speed: 0.25, size: 0.035, life: 0.45, spread: 1.2, dir: side > 0 ? 0.3 : Math.PI - 0.3, ay: -0.6 })
      }
      g.wings = Math.max(0, 1 - (t - T3) / 0.12)
      g.scale = 1 + 0.12 * Math.sin(Math.min(1, (t - T3) / MG.TOUCH) * Math.PI)
    }
    // The wing flaps, and their sound now and then while it flies.
    g.flap = (g.flap || 0) + dt * flapHz * Math.PI * 2
    if (t < T3 && now - g.flapAt > 400) {
      g.flapAt = now
      toca(g.mudo, "celeste-morango-asa", { pan: panAt(clamp(g.pos.x, 0, 1)), gain: 0.35 })
    }
    if (t >= T4) {
      if (g.stage === 1) {
        g.stage = 2
        collect(now, g.to, g)
      }
      const k = clamp((t - T4) / MG.POP, 0, 1)
      g.scale = k < 0.35 ? 1 + 0.25 * ease(k / 0.35) : 1.25 * (1 - ease((k - 0.35) / 0.65))
    }
    placeBerry(g, now)
    if (t >= T5) {
      cel.morango = null
      s3.root.visible = false
      if (cel.filaMorango.length) startMorango(now, cel.filaMorango.shift())
    }
  }
  function placeBerry(g, now) {
    const s = (MG.SIZE * cmPerBox()) / 2.1
    const p = at3(g.pos.x, g.pos.y, 12)
    if (s3.ok) {
      s3.root.visible = true
      s3.root.position.copy(p)
      s3.root.scale.setScalar(Math.max(0.0001, s * g.scale))
      s3.root.rotation.set(0.12, Math.sin(now / 400) * 0.35, Math.sin(now / 260) * 0.08)
      for (const w of s3.wings) {
        const sd = w.userData.side
        w.visible = g.wings > 0.01
        w.scale.set(sd * 1.15 * g.wings, 1.15 * g.wings, 1.15 * g.wings)
        w.rotation.set(0, sd * (0.35 + 0.25 * Math.cos(g.flap)), sd * (0.15 + 0.6 * Math.sin(g.flap)))
      }
    } else if (s3.failed) {
      // Drawn: its two wings flapping, then the berry.
      if (g.wings > 0.01)
        for (const sd of [-1, 1]) {
          const flap = Math.sin(g.flap) * 0.6
          frame.push({ kind: KIND.wing, x: g.pos.x + ux(sd * MG.SIZE * 0.55), y: g.pos.y + MG.SIZE * 0.25, size: MG.SIZE * 0.6 * g.wings, rot: sd > 0 ? flap : Math.PI - flap })
        }
      frame.push({ kind: KIND.berry, x: g.pos.x, y: g.pos.y, size: MG.SIZE * g.scale })
    }
  }
  // Collected: a pulse, sparkles, its points (the chain climbing when the last came within a few seconds).
  function collect(now, at, g) {
    const ch = cel.chain
    ch.n = g.indice != null ? Math.min(5, g.indice) : now - ch.at < MG.CHAIN * 1000 ? Math.min(5, ch.n + 1) : 0
    ch.at = now
    const oneUp = ch.n >= 5
    const text = oneUp ? "1UP" : String((ch.n + 1) * 1000)
    toca(g.mudo, `celeste-morango-${oneUp ? "1up" : text}`, { pan: panAt(at.x) })
    const tone = g.dourado ? GOLD : [1, 0.45, 0.5]
    ring(at.x, at.y, 0.26, g.dourado ? GOLD : [1, 0.55, 0.6], 0.35, 0.1)
    ring(at.x, at.y, 0.16, WHITE, 0.25, 0.16)
    burst(at.x, at.y, { n: 12, col: WHITE, col2: tone, speed: 0.65, size: 0.028, life: 0.6 })
    burst(at.x, at.y, { n: 8, kind: KIND.pixel, col: g.dourado ? GOLD : [1, 0.3, 0.4], speed: 0.5, size: 0.01, life: 0.5, ay: -0.4 })
    drawLabel(text, oneUp)
    // Above where it was, inside the box.
    cel.popup = { t0: now, at: new THREE.Vector2(at.x, Math.min(at.y + 0.1, 0.84)) }
  }
  function updatePopup(now) {
    const p = cel.popup
    const t = (now - p.t0) / 1000
    if (t > MG.LABEL) {
      cel.popup = null
      s3.label.visible = false
      return
    }
    const cm = cmPerBox()
    const pos = at3(p.at.x, p.at.y + 0.07 * ease(Math.min(1, t / MG.LABEL)), 14)
    const pop = t < 0.18 ? easeOutBack(t / 0.18) : 1
    s3.label.visible = true
    s3.label.position.copy(pos)
    s3.label.scale.set(0.28 * cm * pop, 0.105 * cm * pop, 1)
    s3.label.material.opacity = 1 - ease(clamp((t - MG.LABEL + 0.4) / 0.4, 0, 1))
  }

  // ---------- Pena ----------
  // The game's feather (o.jogo) lasts until the game's ends (`fimEm`, from pena_fim; PN.MAX at most) and flickers from
  // the game's own warning (`avisoEm`, pena_aviso; another feather taken clears it), silent.
  const PN = { LAST: 4.0, WARN: 1.0, PX: 9, MAX: 12 }
  function startPena(now, o = {}) {
    if (cel.pena || morto()) return
    cel.pena = { t0: now, stage: 0, glow: 0, sparkAt: now, loop: null, jogo: !!o.jogo, fimEm: null, avisoEm: null }
    const c = bodyMid()
    toca(o.jogo, "celeste-pena-pega", { pan: panAt(c.x) })
    cel.pena.loop = toca(o.jogo, "celeste-pena-voo", { loop: true, gain: 0.5 })
    cel.maskUntil = Math.max(cel.maskUntil, now + ((o.jogo ? PN.MAX : PN.LAST) + 1) * 1000)
    burst(c.x, c.y + 0.1, { n: 10, col: GOLD, col2: WHITE, speed: 0.6, size: 0.03, life: 0.6 })
  }
  function updatePena(now, dt) {
    const p = cel.pena
    const t = (now - p.t0) / 1000
    const f = face()
    const last = !p.jogo ? PN.LAST : p.fimEm != null ? Math.max(0, (p.fimEm - p.t0) / 1000) : Math.max(t + 1, PN.MAX)
    if (t < last && t < PN.MAX) {
      // The box floats, gently.
      const amp = Math.min(1, t / 0.5)
      m.deslocar(Math.sin(t * 2.3) * PN.PX * 0.7 * amp, (Math.sin(t * 1.7 + 0.6) * PN.PX + 2) * amp)
      // The glow round his outline, flickering as a warning near the end.
      const warn = p.jogo ? p.avisoEm != null : t > PN.LAST - PN.WARN
      p.glow = Math.min(1, t / 0.25) * (warn ? (Math.floor(t * 12) % 2 ? 1 : 0.2) : 0.85 + 0.15 * Math.sin(t * 6))
      if (warn && p.stage === 0) {
        p.stage = 1
        toca(p.jogo, "celeste-pena-aviso", { pan: panAt(f.c.x) })
      } else if (!warn && p.stage === 1) p.stage = 0
      // Sparkles drifting off him: round his head and shoulders.
      while (now - p.sparkAt > 50) {
        p.sparkAt += 50
        const an = Math.random() * Math.PI
        const r = 0.85 + Math.random() * 0.4
        const x = f.c.x + ux(Math.cos(an) * f.h * 1.7 * r)
        const y = f.c.y - f.h * 0.6 + Math.sin(an) * f.h * 1.4 * r
        spawn({ kind: KIND.star, x, y, vx: (Math.random() - 0.5) * 0.06, vy: 0.06 + Math.random() * 0.08, size: 0.024 + Math.random() * 0.026, col: Math.random() < 0.25 ? WHITE : GOLD, life: 0.9 + Math.random() * 0.6, fadeIn: 0.15, twinkle: 14, rot: Math.random() * 0.6 })
      }
    } else {
      if (p.stage < 2) {
        p.stage = 2
        p.endT = t
        p.loop?.stop(0.12)
        toca(p.jogo, "celeste-pena-fim", { pan: panAt(f.c.x) })
        const c = bodyMid()
        ring(c.x, f.c.y - f.h * 0.3, 0.5, GOLD, 0.4, 0.06)
        burst(c.x, f.c.y - f.h * 0.3, { n: 22, col: GOLD, col2: WHITE, speed: 0.9, size: 0.03, life: 0.6 })
      }
      p.glow = Math.max(0, 1.3 - (t - p.endT) / 0.25)
    }
    m.corpo.brilho(0, GOLD, p.glow, [0.12, 0.95, 0.85])
    if (p.stage === 2 && t > p.endT + 0.6) {
      m.corpo.brilho(0, GOLD, 0)
      cel.pena = null
    }
  }

  // ---------- Eco ----------
  const EC = { LAST: 6.0, DELAY: 0.3, IN: 0.4, DISSOLVE: 0.8 }
  function startEco(now) {
    if (cel.eco || cel.morte) return
    const side = roomySide(cel.lastSide)
    cel.eco = { t0: now, side, stage: 0, seen: -1, dustAt: now }
    sfx.play("celeste-eco-entra", { pan: panAt(face().c.x), gain: 0.8 })
    cel.maskUntil = Math.max(cel.maskUntil, now + (EC.LAST + EC.DISSOLVE + 0.5) * 1000)
  }
  function updateEco(now) {
    const e = cel.eco
    const t = (now - e.t0) / 1000
    // The frame from a moment ago (one whose mask had him), a little to the side with more room.
    const h = histAt(now - EC.DELAY * 1000)
    if (h) {
      if (e.seen < 0) e.seen = now
      backU.uEcho.value = h.rt.texture
    }
    const shown = e.seen < 0 ? 0 : Math.min(1, (now - e.seen) / 1000 / EC.IN)
    backU.uEchoA.value = h ? shown * 0.9 : 0
    backU.uEchoOff.value.set(ux(e.side * (0.17 + 0.015 * Math.sin(t * 1.3))), 0.025 + 0.008 * Math.sin(t * 1.9))
    if (t > EC.LAST) {
      if (e.stage === 0) {
        e.stage = 1
        sfx.play("celeste-eco-sai", { pan: panAt(face().c.x), gain: 0.8 })
      }
      const k = clamp((t - EC.LAST) / EC.DISSOLVE, 0, 1)
      backU.uEchoDis.value = k
      // Dark specks rising off it.
      const f = face()
      while (now - e.dustAt > 40 && k < 0.9) {
        e.dustAt += 40
        const x = f.c.x + ux(e.side * 0.17 + (Math.random() - 0.5) * f.h * 2.4)
        const y = f.c.y - f.h * (Math.random() * 2.2) + f.h * 0.6
        spawn({ kind: KIND.pixel, x, y, vy: 0.08 + Math.random() * 0.1, vx: (Math.random() - 0.5) * 0.05, size: 0.006 + Math.random() * 0.006, col: [0.06, 0.06, 0.1], solid: 1, a: 0.85, life: 0.6 + Math.random() * 0.4 })
      }
    } else {
      e.dustAt = now
      backU.uEchoDis.value = 0
    }
    if (t > EC.LAST + EC.DISSOLVE) {
      cel.eco = null
      backU.uEchoA.value = 0
      backU.uEchoDis.value = 0
    }
  }

  // ---------- the dash by gesture ----------
  // A quick sideways swipe of an open hand: its knuckles' middle (motor.lastHands, each frame) moving DIST box heights
  // across within MIN_MS..MAX_MS (~1.8 box heights a second at least), at least twice as far as up or down, the hand
  // seen SEEN_MS before, not within COOLDOWN of the last one. A hand further than JUMP from where one was is another.
  // The dash goes the way it moved.
  const SWIPE = { DIST: 0.34, MIN_MS: 50, MAX_MS: 190, SEEN_MS: 160, COOLDOWN: 1000, JUMP: 0.45 }
  function readSwipe(now) {
    const sw = cel.swipe
    const va = video.videoWidth / video.videoHeight || 16 / 9
    const hands = m.lastHands || []
    const seen = hands.map((h) => {
      const s = handShape(h, null, va)
      const [x, y] = toScreen(s.k.x, s.k.y)
      return { x, y, open: s.open }
    })
    // Each hand to the track it continues (the nearest, if near enough); the rest start their own.
    const next = []
    for (const p of seen) {
      let best = null, bd = SWIPE.JUMP
      for (const tr of sw.tracks) {
        const last = tr.pts[tr.pts.length - 1]
        const d = Math.hypot((p.x - last.x) * ASPECT, p.y - last.y)
        if (d < bd && !next.includes(tr)) (best = tr), (bd = d)
      }
      const tr = best || { since: now, pts: [] }
      tr.pts.push({ t: now, ...p })
      tr.pts = tr.pts.filter((q) => now - q.t <= SWIPE.MAX_MS + 40)
      next.push(tr)
    }
    sw.tracks = next
    let fastest = 0
    for (const tr of sw.tracks) {
      const cur = tr.pts[tr.pts.length - 1]
      for (const q of tr.pts) {
        const ms = now - q.t
        if (ms < SWIPE.MIN_MS || ms > SWIPE.MAX_MS) continue
        const dx = (cur.x - q.x) * ASPECT
        const dy = cur.y - q.y
        fastest = Math.max(fastest, Math.abs(dx) / (ms / 1000))
        const open = tr.pts.slice(-3).filter((r) => r.open).length >= 2
        if (Math.abs(dx) > SWIPE.DIST && Math.abs(dx) > 2 * Math.abs(dy) && open && now - tr.since > SWIPE.SEEN_MS && now - sw.last > SWIPE.COOLDOWN) {
          sw.last = now
          tr.pts = [cur]
          startDash(now, new THREE.Vector2(Math.sign(dx), 0))
          sw.note = ` · dash ${dx > 0 ? "→" : "←"}`
          return
        }
      }
    }
    if (now - sw.last > 1500) sw.note = seen.length ? ` · mão ${fastest.toFixed(1)}/s` : ""
  }

  // ---------- the game link (scripts/celeste-mod/) ----------
  // The mod's messages, one JSON per server-sent event: `estado` (where he is, his dashes, the counts), and the moments
  // (dash, recarga, morte, renasceu, morango, pena_inicio, pena_aviso, pena_fim, sala, capitulo_inicio…). They come in
  // between frames and are played at the next frame's clock (`fila`).
  const LINK = m.q.get("celeste-jogo") || "http://127.0.0.1:8797/eventos"
  const jogo = { es: null, aberto: false, estado: null, fila: [], tentarEm: 0, n: 0 }
  // A page that wasn't drawing (a covered window, a hidden source) doesn't play what it missed when it's back: these
  // start only while fresh, and only the newest messages are kept.
  const COMECAM = new Set(["dash", "recarga", "morte", "morango", "pena_inicio", "sala", "coracao", "fita", "capitulo_fim"])
  const VELHO_MS = 1500, FILA_MAX = 300
  function abrirLink() {
    if (jogo.es && jogo.es.readyState !== 2) return
    jogo.es?.close()
    const es = new EventSource(LINK)
    jogo.es = es
    es.onopen = () => (jogo.aberto = true)
    // CONNECTING again: it reconnects by itself; CLOSED: opened again from atualizar.
    es.onerror = () => (jogo.aberto = es.readyState === 1)
    es.onmessage = (e) => {
      try {
        jogo.fila.push({ ev: JSON.parse(e.data), em: performance.now() })
        if (jogo.fila.length > FILA_MAX) jogo.fila.shift()
        jogo.aberto = true
      } catch {}
    }
  }
  function fecharLink() {
    jogo.es?.close()
    jogo.es = null
    jogo.aberto = false
    jogo.estado = null
    jogo.fila.length = 0
  }
  // He's in a level of the connected game, and the dock lets the filter follow it.
  const noNivel = () => jogo.aberto && jogo.estado?.onde === "nivel"
  const seguindo = () => cel.opts.jogo && noNivel()
  function lerJogo(now) {
    if (jogo.es?.readyState === 2 && now > jogo.tentarEm) {
      jogo.tentarEm = now + 5000
      jogo.es = null
      abrirLink()
    }
    for (const { ev, em } of jogo.fila.splice(0)) {
      jogo.n++
      if (ev.tipo === "estado") {
        jogo.estado = ev
        continue
      }
      if (!cel.opts.jogo || (COMECAM.has(ev.tipo) && now - em > VELHO_MS)) continue
      if (ev.tipo === "dash") {
        const [x = 0, y = 0] = ev.direcao || []
        if (jogo.estado?.jogador && ev.restantes != null) jogo.estado.jogador.dashes = ev.restantes
        startDash(now, new THREE.Vector2(x, y), { jogo: true, segundo: (ev.restantes ?? 0) >= 1 })
      } else if (ev.tipo === "recarga") {
        if (jogo.estado?.jogador) jogo.estado.jogador.dashes = ev.dashes
        if (cel.opts.cabelo && (cel.hair.amt > 0.05 || (ct.on && m.modo !== "badeline"))) refillSparkle(true)
      } else if (ev.tipo === "morte") {
        if (cel.pena?.jogo) cel.pena.fimEm = now
        momentos.limpa()
        // Dead again before he finished coming back: this death starts over.
        if (cel.morte?.jogo && cel.morte.voltaEm != null) encerraMorte()
        startMorte(now, { jogo: true })
      } else if (ev.tipo === "renasceu") {
        if (cel.morte?.jogo) cel.morte.voltaEm = now
      } else if (ev.tipo === "morango") {
        startMorango(now, { jogo: true, indice: ev.indice ?? 0, dourado: !!ev.dourado })
      } else if (ev.tipo === "pena_inicio") {
        if (cel.pena?.jogo) cel.pena.avisoEm = null
        else startPena(now, { jogo: true })
      } else if (ev.tipo === "pena_aviso") {
        if (cel.pena?.jogo) cel.pena.avisoEm = now
      } else if (ev.tipo === "pena_fim") {
        if (cel.pena?.jogo) cel.pena.fimEm = now
      } else if (ev.tipo === "sala" || ev.tipo === "coracao" || ev.tipo === "fita" || ev.tipo === "capitulo_fim") {
        momentos.chega(ev, jogo.estado, now)
      } else if (ev.tipo === "saiu") {
        if (cel.pena?.jogo) cel.pena.fimEm = now
        if (cel.morte?.jogo) cel.morte.voltaEm = now
      }
    }
  }

  // The rest of the game on him (reacoes.js): his hair's push, states, what follows her, who chases her.
  const reacoes = criarReacoes(m, { histAt, PREMUL, uRosto: justoTex, comLook })
  const momentos = criarMomentos(m, {
    PREMUL, spawn, burst, ring, KIND,
    ladoLivre: () => roomySide(-1),
    aoLado(side) {
      const p = besideHead(side)
      p.x = clamp(p.x + side * ux(0.07), 0.1, 0.9)
      return p
    },
  })
  const querLook = () => ct.on || wipeU.uGhost.value > 0.003 || reacoes.querLook()

  // ---------- the ambient (phase "atras", under his afterimages and his hair) ----------
  // One per chapter's mood, our own: what falls or drifts, its colours and a light grade, stronger towards the box's
  // edges and lighter on his face. Each gives the grade (the camera's colours taken towards its own, `ga` of it), what
  // goes behind him (`far`, kept off his body while the mask is fresh) and what passes in front (`near`, never on his
  // face), premultiplied. Ids: 0 the menus (calm snow), 1 the prologue and the city (a cold night, snow), 2 the old
  // site (drifting dust, dim violet), 3 the resort (dusty, ghostly greys), 4 the ridge (warm wind in gusts), 5 the
  // temple (crystal glints, teal and purple), 6 the reflection (dark ripples), 7 the summit (wind and snow under a
  // pink-gold sky), 8 the epilogue (soft, warm light), 9 the core hot (embers), 10 Farewell (stars, space), 11 the
  // core cold (frost); 12 Forsaken City with its own scenery behind him (cenarios.js), once its pictures are in.
  const AMBIENTES = {
    "Celeste/0-Intro": 1, "Celeste/1-ForsakenCity": 1, "Celeste/2-OldSite": 2, "Celeste/3-CelestialResort": 3,
    "Celeste/4-GoldenRidge": 4, "Celeste/5-MirrorTemple": 5, "Celeste/6-Reflection": 6, "Celeste/7-Summit": 7,
    "Celeste/8-Epilogue": 8, "Celeste/9-Core": 9, "Celeste/LostLevels": 10,
  }
  const NOMES_AMB = ["neve calma", "noite fria", "poeira violeta", "cinzas do hotel", "vento quente", "cristais", "ondas escuras", "vento e neve rosa", "luz quente", "brasas", "estrelas", "gelo", "cidade abandonada"]
  function ambienteDe(e) {
    if (!e || e.onde === "menu") return 0
    const c = e.capitulo
    if (!c) return null // loading: keep the one on
    const comCena = cena.clima(e)
    if (comCena != null) return comCena
    let id = AMBIENTES[c.sid]
    if (id == null && c.colecao === "Celeste") id = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10][c.id]
    if (id === 9 && e.nucleo === "frio") id = 11
    return id ?? 0
  }
  const amb = { a: 0, b: 0, k: 1, on: 0, maskOk: 0, cena: 0 }
  const cena = criarCena(m)
  const climaDeCena = new Set(Object.values(CENARIOS).map((c) => c.clima))
  const { uErase, uPlate, uPlateFix, uPlateOk, uMaskShift, uEraseLow, uMem, uKeep } = m.uniforms
  const ambU = {
    uCam, uMask, uCover, uTime, uAspect, uFace, uFaceUp,
    uErase, uPlate, uPlateFix, uPlateOk, uMaskShift, uEraseLow, uMem, uKeep,
    ...cena.uniforms,
    uAmbA: { value: 0 }, uAmbB: { value: 0 }, uAmbK: { value: 1 }, uAmbOn: { value: 0 }, uMaskOk: { value: 0 },
  }
  const ambMat = new THREE.ShaderMaterial({
    uniforms: ambU,
    vertexShader: VERT,
    ...PREMUL,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      ${GLSL_APAGAR}
      ${GLSL_CENA}
      uniform int uAmbA, uAmbB;
      uniform float uAmbK, uAmbOn, uMaskOk;
      float T;
      vec2 P; // box heights, (0,0) bottom left
      float VIG; // 0 in the middle, 1 at the corners
      void over(inout vec4 o, vec3 c, float a) { o = vec4(c * a, a) + o * (1.0 - a); }
      // The camera's colours towards a tone: saturation kept by sat, shadows times lo, lights times hi.
      vec3 tone(vec3 c, vec3 lo, vec3 hi, float sat) {
        float l = lum(c);
        return mix(vec3(l), c, sat) * mix(lo, hi, smoothstep(0.05, 0.8, l));
      }
      // A layer of round things on a grid of cells cell box heights wide, moving at vel (box heights a second, y up),
      // one in a share dens of the cells, swaying side to side, radius r; h is the cell's random.
      float drift(vec2 p, float cell, vec2 vel, float sway, float r, float dens, float seed, out float h) {
        vec2 q = (p - vel * T) / cell;
        vec2 id = floor(q);
        h = hash2(id + seed);
        if (h > dens) return 0.0;
        vec2 f = fract(q) - 0.5;
        vec2 off = (vec2(hash2(id + seed + 3.1), hash2(id + seed + 9.7)) - 0.5) * 0.5;
        off.x += sin(T * (0.7 + h) + h * 40.0) * sway / cell;
        float rr = r * (0.6 + 0.8 * hash2(id + seed + 5.3));
        return smoothstep(rr, rr * 0.2, length((f - off) * cell));
      }
      // Streaks along x (wind), moving at speed, cells of size sz, thickness th; gusts come and go.
      float streaks(vec2 p, vec2 sz, float speed, float dens, float th, float seed) {
        vec2 q = vec2(p.x - speed * T, p.y) / sz;
        vec2 id = floor(q);
        float h = hash2(id + seed);
        if (h > dens) return 0.0;
        vec2 f = fract(q) - 0.5;
        f.y -= (hash2(id + seed + 2.0) - 0.5) * 0.6;
        float along = 1.0 - smoothstep(0.1, 0.5, abs(f.x));
        float gust = smoothstep(0.42, 0.8, noise(vec2(T * 0.45 + seed, p.y * 1.3)));
        return along * smoothstep(th / sz.y, 0.0, abs(f.y)) * gust;
      }
      // Four-pointed glints that twinkle now and then.
      float glints(vec2 p, float cell, float dens, float rate, float size, float seed) {
        vec2 q = p / cell;
        vec2 id = floor(q);
        float h = hash2(id + seed);
        if (h > dens) return 0.0;
        vec2 f = (fract(q) - 0.5 - (vec2(hash2(id + seed + 1.0), hash2(id + seed + 2.0)) - 0.5) * 0.5) * cell;
        float tw = pow(max(0.0, sin(T * rate * (0.6 + h) + h * 50.0)), 14.0);
        vec2 a = abs(f) / size;
        float star = max(smoothstep(0.1, 0.0, a.y) * max(0.0, 1.0 - a.x), smoothstep(0.1, 0.0, a.x) * max(0.0, 1.0 - a.y));
        return (star + smoothstep(0.3, 0.0, length(a)) * 0.8) * tw;
      }
      // Rings spreading on a surface seen at an angle, on the sides of the box (clear of him), one after another.
      float ripples() {
        float s = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float per = 3.4 + fi * 1.1;
          float u = T / per + hash(fi * 7.0 + 1.0);
          float k = fract(u), cyc = floor(u);
          float side = mod(fi, 2.0);
          vec2 c = vec2((side < 0.5 ? 0.04 + 0.22 * hash(cyc * 3.1 + fi) : 0.74 + 0.22 * hash(cyc * 3.1 + fi)) * uAspect, 0.12 + 0.4 * hash(cyc * 7.3 + fi));
          float d = length((P - c) * vec2(1.0, 2.6));
          float r = k * 0.42;
          float ring = smoothstep(0.012, 0.0, abs(d - r)) + 0.55 * smoothstep(0.01, 0.0, abs(d - r * 0.66));
          s += ring * (1.0 - k) * smoothstep(0.0, 0.08, k);
        }
        return s;
      }
      // The grade: the camera toned (tone()), then washed towards the mood's colour (w of it), lit by its own light.
      vec3 mood(vec3 c, vec3 lo, vec3 hi, float sat, vec3 wash, float w) {
        return mix(tone(c, lo, hi, sat), wash * (0.35 + 0.9 * lum(c)), w);
      }
      void ambiente(int id, vec3 cam, out vec3 g, out float ga, out vec4 far, out vec4 near) {
        far = vec4(0.0);
        near = vec4(0.0);
        g = cam;
        ga = 0.0;
        float h, a;
        if (id == 0) {
          // The menus: a calm snow, the colours softened a little.
          g = mood(cam, vec3(0.9, 0.95, 1.06), vec3(0.98, 1.0, 1.04), 0.85, vec3(0.72, 0.8, 0.95), 0.3);
          ga = 0.18 + 0.3 * VIG;
          a = drift(P, 0.11, vec2(0.01, -0.045), 0.015, 0.0055, 0.45, 1.0, h);
          over(far, vec3(0.94, 0.96, 1.0), a * 0.6);
          a = drift(P, 0.22, vec2(0.018, -0.08), 0.025, 0.01, 0.3, 2.0, h);
          over(near, vec3(1.0), a * 0.55);
        } else if (id == 1) {
          // A cold night: navy around him, the edges darker, snow falling in two depths.
          g = mood(cam, vec3(0.7, 0.78, 1.08), vec3(0.88, 0.94, 1.06), 0.7, vec3(0.16, 0.22, 0.48), 0.5) * (1.0 - 0.3 * VIG);
          ga = 0.32 + 0.4 * VIG;
          a = drift(P, 0.085, vec2(0.02, -0.07), 0.012, 0.0045, 0.55, 3.0, h);
          over(far, vec3(0.88, 0.92, 1.0), a * 0.7);
          a = drift(P, 0.16, vec2(0.03, -0.12), 0.02, 0.008, 0.4, 4.0, h);
          over(near, vec3(0.96, 0.98, 1.0), a * 0.7);
        } else if (id == 2) {
          // The old site: dim violet, dust drifting slowly sideways and up, catching the light now and then.
          g = mood(cam, vec3(0.78, 0.66, 0.95), vec3(0.95, 0.9, 1.04), 0.7, vec3(0.4, 0.24, 0.52), 0.58) * (1.0 - 0.25 * VIG);
          ga = 0.3 + 0.4 * VIG;
          vec2 w = vec2(0.035, 0.012) + 0.02 * vec2(sin(T * 0.2), cos(T * 0.27));
          a = drift(P + 0.03 * vec2(noise(P * 3.0 + T * 0.2), 0.0), 0.06, w, 0.008, 0.0036, 0.5, 5.0, h);
          over(far, mix(vec3(0.82, 0.74, 1.0), vec3(1.0, 0.92, 0.8), step(0.7, fract(h * 13.0))), a * (0.45 + 0.4 * sin(T * 2.0 + h * 30.0)));
          a = drift(P, 0.14, w * 1.6, 0.02, 0.0065, 0.3, 6.0, h);
          over(near, vec3(0.9, 0.84, 1.0), a * 0.45);
        } else if (id == 3) {
          // The resort: the colour drained to dusty greys, slow motes and a haze at the edges.
          g = mood(cam, vec3(0.8, 0.78, 0.84), vec3(0.98, 0.96, 0.95), 0.3, vec3(0.5, 0.48, 0.54), 0.45);
          ga = 0.34 + 0.4 * VIG;
          float haze = fbm(P * 2.2 + vec2(T * 0.05, -T * 0.03)) * smoothstep(0.3, 0.95, VIG);
          over(far, vec3(0.72, 0.7, 0.76), haze * 0.3);
          a = drift(P, 0.075, vec2(-0.012, 0.01), 0.015, 0.004, 0.45, 7.0, h);
          over(far, vec3(0.84, 0.83, 0.88), a * 0.55);
          a = drift(P, 0.18, vec2(-0.02, 0.006), 0.03, 0.007, 0.22, 8.0, h);
          over(near, vec3(0.88, 0.87, 0.92), a * 0.35);
        } else if (id == 4) {
          // The ridge: warm gold, wind streaming across in gusts, specks blown with it.
          g = mood(cam, vec3(1.04, 0.9, 0.72), vec3(1.06, 1.0, 0.88), 0.95, vec3(0.95, 0.64, 0.34), 0.5);
          ga = 0.3 + 0.35 * VIG;
          a = streaks(P, vec2(0.45, 0.05), 1.1, 0.35, 0.0022, 9.0);
          over(far, vec3(1.0, 0.94, 0.8), a * 0.45);
          a = streaks(P + vec2(0.0, 0.025), vec2(0.7, 0.09), 1.6, 0.22, 0.003, 10.0);
          over(near, vec3(1.0, 0.96, 0.86), a * 0.28);
          float gust = smoothstep(0.42, 0.8, noise(vec2(T * 0.45 + 9.0, P.y * 1.3)));
          a = drift(P, 0.1, vec2(0.5, -0.02), 0.01, 0.0045, 0.35, 11.0, h) * (0.3 + 0.7 * gust);
          over(near, vec3(1.0, 0.86, 0.55), a * 0.6);
        } else if (id == 5) {
          // The temple: deep teal below, purple above, crystals glinting.
          vec3 wash = mix(vec3(0.06, 0.4, 0.46), vec3(0.36, 0.16, 0.52), smoothstep(0.15, 0.85, vUv.y));
          g = mood(cam, vec3(0.8, 0.95, 1.0), vec3(0.94, 1.0, 1.04), 0.7, wash, 0.5) * (1.0 - 0.25 * VIG);
          ga = 0.32 + 0.4 * VIG;
          a = glints(P, 0.1, 0.6, 1.4, 0.032, 12.0);
          over(far, mix(vec3(0.45, 1.0, 0.95), vec3(0.88, 0.62, 1.0), step(0.5, hash2(floor(P / 0.1) + 3.0))), clamp(a, 0.0, 1.0) * 0.9);
          a = glints(P + 0.05, 0.2, 0.4, 1.0, 0.05, 13.0);
          over(near, vec3(0.85, 1.0, 1.0), clamp(a, 0.0, 1.0) * 0.65);
        } else if (id == 6) {
          // The reflection: dark and cold around him, rings spreading on the sides, the light at their crests.
          g = mood(cam, vec3(0.6, 0.64, 0.82), vec3(0.82, 0.86, 1.0), 0.55, vec3(0.05, 0.07, 0.16), 0.55) * (1.0 - 0.35 * VIG);
          ga = 0.34 + 0.4 * VIG;
          float r = ripples();
          over(far, vec3(0.0, 0.01, 0.05), r * 0.45);
          over(far, vec3(0.55, 0.68, 1.0), r * 0.35);
        } else if (id == 7) {
          // The summit: a pink-gold sky (pink above, gold below), wind and snow driving across.
          vec3 sky = mix(vec3(1.0, 0.72, 0.46), vec3(1.0, 0.5, 0.68), smoothstep(0.2, 0.95, vUv.y));
          g = mood(cam, vec3(1.0, 0.88, 0.9), vec3(1.04, 1.0, 0.96), 0.9, sky, 0.55);
          ga = 0.3 + 0.35 * VIG;
          mat2 rot = mat2(0.94, 0.34, -0.34, 0.94);
          vec2 q = rot * P;
          a = drift(q, 0.07, vec2(0.55, -0.1), 0.006, 0.0045, 0.55, 14.0, h);
          over(far, vec3(1.0, 0.97, 0.98), a * 0.7);
          a = streaks(q, vec2(0.5, 0.05), 1.4, 0.35, 0.0022, 15.0);
          over(far, vec3(1.0, 0.95, 0.94), a * 0.45);
          a = drift(q, 0.14, vec2(0.85, -0.16), 0.01, 0.008, 0.45, 16.0, h);
          over(near, vec3(1.0), a * 0.7);
        } else if (id == 8) {
          // The epilogue: soft and warm, a few blurred lights rising slowly.
          g = mood(cam, vec3(1.04, 0.95, 0.85), vec3(1.05, 1.0, 0.94), 1.0, vec3(0.98, 0.74, 0.5), 0.46);
          ga = 0.28 + 0.3 * VIG;
          a = drift(P, 0.22, vec2(0.006, 0.025), 0.03, 0.028, 0.32, 17.0, h);
          over(far, vec3(1.0, 0.88, 0.62), a * 0.3);
          a = drift(P, 0.1, vec2(0.004, 0.02), 0.02, 0.005, 0.35, 18.0, h);
          over(near, vec3(1.0, 0.95, 0.82), a * 0.5);
        } else if (id == 9) {
          // The core, hot: red-orange rising from below, embers rising and flickering.
          vec3 heat = mix(vec3(0.85, 0.28, 0.1), vec3(0.6, 0.22, 0.2), smoothstep(0.0, 0.9, vUv.y));
          g = mood(cam, vec3(1.06, 0.84, 0.74), vec3(1.06, 0.98, 0.9), 0.9, heat, 0.48);
          ga = 0.28 + 0.25 * smoothstep(0.6, 0.0, vUv.y) + 0.25 * VIG;
          a = drift(P + vec2(0.02 * sin(P.y * 9.0 + T * 2.0), 0.0), 0.075, vec2(0.01, 0.14), 0.015, 0.0045, 0.5, 19.0, h);
          float fl = 0.55 + 0.45 * sin(T * 9.0 + h * 60.0);
          over(far, mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.85, 0.35), h), a * fl * 0.9);
          a = drift(P, 0.15, vec2(0.02, 0.2), 0.03, 0.007, 0.32, 20.0, h);
          over(near, vec3(1.0, 0.6, 0.2), a * (0.55 + 0.4 * sin(T * 7.0 + h * 40.0)));
        } else if (id == 10) {
          // Farewell: deep space around him, a field of stars twinkling, a shooting star now and then.
          g = mood(cam, vec3(0.66, 0.66, 0.95), vec3(0.9, 0.9, 1.06), 0.65, vec3(0.08, 0.06, 0.22), 0.6) * (1.0 - 0.3 * VIG);
          ga = 0.38 + 0.4 * VIG;
          vec2 sc = P / 0.032;
          vec2 sid = floor(sc);
          float sh = hash2(sid + 21.0);
          float st = smoothstep(0.1, 0.0, length(fract(sc) - 0.5 - (vec2(hash2(sid + 22.0), hash2(sid + 23.0)) - 0.5) * 0.6)) * step(0.8, sh);
          st *= 0.5 + 0.5 * sin(T * (1.0 + 2.0 * fract(sh * 7.0)) + sh * 40.0);
          over(far, mix(vec3(0.82, 0.86, 1.0), vec3(1.0, 0.9, 0.96), fract(sh * 17.0)), clamp(st, 0.0, 1.0) * 0.95);
          a = glints(P, 0.18, 0.32, 0.8, 0.035, 24.0);
          over(far, vec3(0.92, 0.94, 1.0), clamp(a, 0.0, 1.0) * 0.8);
          float per = 5.5;
          float u = T / per, k = fract(u), cyc = floor(u);
          vec2 s0 = vec2((0.2 + 0.7 * hash(cyc + 5.0)) * uAspect, 0.75 + 0.2 * hash(cyc + 9.0));
          vec2 dir = normalize(vec2(-0.9, -0.42));
          vec2 head = s0 + dir * k * 1.6;
          vec2 rel = P - head;
          float along = dot(rel, -dir), across = abs(dot(rel, vec2(-dir.y, dir.x)));
          float trail = step(0.0, along) * smoothstep(0.25, 0.0, along) * smoothstep(0.0025, 0.0, across) * step(k, 0.35);
          over(far, vec3(1.0), trail * 0.85);
        } else if (id == 12) {
          // Forsaken City: its scene draws what's behind him (cena()); him in its cold night light.
          g = mood(cam, vec3(0.72, 0.78, 1.06), vec3(0.9, 0.94, 1.05), 0.75, vec3(0.18, 0.2, 0.46), 0.42);
          ga = 0.3;
        } else {
          // The core, cold: icy blue, a thin frost in from the edges, ice glinting.
          g = mood(cam, vec3(0.8, 0.92, 1.06), vec3(0.94, 1.0, 1.05), 0.6, vec3(0.62, 0.82, 0.98), 0.38);
          ga = 0.3 + 0.35 * VIG;
          float e = min(min(vUv.x, 1.0 - vUv.x) * uAspect, min(vUv.y, 1.0 - vUv.y));
          float n = fbm(P * 9.0) * 0.6 + fbm(P * 23.0) * 0.4;
          float fr = smoothstep(0.07, 0.0, e - n * 0.06);
          float crack = smoothstep(0.03, 0.0, abs(noise(P * 30.0) - 0.5)) * smoothstep(0.1, 0.0, e - n * 0.06);
          over(near, vec3(0.88, 0.96, 1.0), fr * 0.17 + crack * 0.15);
          a = glints(P, 0.12, 0.45, 1.2, 0.026, 25.0);
          over(far, vec3(0.82, 0.96, 1.0), clamp(a, 0.0, 1.0) * 0.8);
          a = drift(P, 0.11, vec2(0.006, -0.02), 0.02, 0.0042, 0.35, 26.0, h);
          over(far, vec3(0.92, 0.97, 1.0), a * 0.5);
        }
      }
      void main() {
        T = uTime;
        P = vUv * vec2(uAspect, 1.0);
        VIG = smoothstep(0.3, 1.0, length((vUv - 0.5) * vec2(uAspect, 1.0)) / (0.5 * length(vec2(uAspect, 1.0))));
        // It paints the whole box, so from the camera with his own hair out, never the raw one.
        vec4 apagada = apagarCabelo(texture2D(uCam, camUv(vUv)).rgb, vUv);
        vec3 cam = apagada.rgb;
        vec3 g;
        float ga;
        vec4 far, near;
        ambiente(uAmbA, cam, g, ga, far, near);
        if (uAmbK > 0.001) {
          vec3 g2;
          float ga2;
          vec4 far2, near2;
          ambiente(uAmbB, cam, g2, ga2, far2, near2);
          g = mix(g, g2, uAmbK);
          ga = mix(ga, ga2, uAmbK);
          far = mix(far, far2, uAmbK);
          near = mix(near, near2, uAmbK);
        }
        // His face (and the hair round it), kept clear: an oval round the face's, a little above it.
        vec2 d = (vUv - uFace.xy) * vec2(uAspect, 1.0);
        d = vec2(dot(d, vec2(uFaceUp.y, -uFaceUp.x)), dot(d, uFaceUp));
        float fw = max(uFace.z, uFace.w * 0.72), fh = uFace.w;
        float faceK = smoothstep(1.15, 0.75, length((d - vec2(0.0, fh * 0.25)) / vec2(fw * 1.7, fh * 1.6)));
        // Where his hair was is background now, as toned as the rest.
        float body = uMaskOk * smoothstep(0.35, 0.65, maskAt(vUv, 0.0)) * (1.0 - apagada.a);
        faceK *= 1.0 - apagada.a;
        // The grade stronger around him (what's behind him takes the mood while the mask says where he is), a third
        // of it on him, less again on his face.
        float onde = mix(1.0, mix(1.4, 0.35, body), uMaskOk);
        vec3 c = mix(cam, clamp(g, 0.0, 1.5), clamp(ga * onde, 0.0, 0.85) * (1.0 - 0.6 * faceK));
        float back = (1.0 - body) * (1.0 - faceK * (1.0 - uMaskOk));
        c = c * (1.0 - far.a * back) + far.rgb * back;
        float front = 1.0 - faceK;
        if (uCenaW > 0.001) {
          vec3 fundo, soma;
          vec4 frente;
          cena(fundo, soma, frente);
          // Where he isn't: out of the body mask (only well out of it when Broadcast's background is there to say
          // more), and, sharper, wherever the camera shows that background (his erased hair too); never his face.
          float mk = maskAt(vUv, 0.0);
          float ok = uPlateOk;
          vec3 placa = texture2D(uPlate, camUv(vUv)).rgb;
          float dif = length(cam - (placa + uPlateFix));
          float foraM = 1.0 - smoothstep(mix(0.25, 0.06, ok), mix(0.6, 0.3, ok), mk);
          float chave = ok * (1.0 - smoothstep(0.08, 0.2, dif)) * (1.0 - smoothstep(0.92, 1.0, mk));
          // (His hair, erased, is background whatever the mask says: it's the mask's own him.)
          float bg = max(max(foraM, chave) * (1.0 - smoothstep(0.2, 0.8, texture2D(uKeep, vUv).r)), apagada.a);
          // His logo in that background stays, as the camera shows it.
          bg *= 1.0 - ok * smoothstep(0.42, 0.68, lum(placa));
          // Broadcast's blue left on his outline, where he meets the scene.
          float azul = ok * (1.0 - smoothstep(0.12, 0.5, dif)) * (1.0 - bg) * uCenaW;
          c.b = mix(c.b, min(c.b, max(c.r, c.g) * 1.05), azul);
          c = mix(c, fundo + soma, bg * uCenaW);
          // The sunset's light on him too, a little; what falls in front of him, never on his face.
          c += soma * (1.0 - bg) * 0.35 * uCenaW;
          float fr = front * uCenaW;
          c = c * (1.0 - frente.a * fr) + frente.rgb * fr;
        }
        c = c * (1.0 - near.a * front) + near.rgb * front;
        gl_FragColor = vec4(c * uAmbOn, uAmbOn);
      }`,
  })
  const ambScene = quad(ambMat)
  function updateAmbiente(now, dt) {
    const want = cel.opts.ambiente && jogo.aberto && !!jogo.estado
    amb.on = clamp(amb.on + dt * (want ? 1 / 1.5 : -1 / 2), 0, 1)
    const id = ambienteDe(jogo.estado)
    if (want && id != null && id !== amb.b) {
      // A change mid-crossfade starts from whichever was showing more.
      if (amb.k >= 0.5) amb.a = amb.b
      amb.b = id
      amb.k = amb.on > 0.01 ? 0 : 1
      if (amb.k === 1) amb.a = id
    }
    amb.k = Math.min(1, amb.k + dt / 1.6)
    if (amb.k >= 1) amb.a = amb.b
    amb.maskOk += ((m.mascaraEm > now - 400 ? 1 : 0) - amb.maskOk) * Math.min(1, dt * 6)
    ambU.uAmbA.value = amb.a
    ambU.uAmbB.value = amb.b
    ambU.uAmbK.value = amb.k >= 1 ? 0 : amb.k
    ambU.uAmbOn.value = ease(amb.on)
    ambU.uMaskOk.value = amb.maskOk
    // How much of a scene shows: its mood's share of the crossfade, faded with the ambient.
    const K = ambU.uAmbK.value
    amb.cena = ease(amb.on) * ((climaDeCena.has(amb.a) ? 1 - K : 0) + (climaDeCena.has(amb.b) ? K : 0))
    cena.atualizar(now, dt, jogo.estado, amb.cena, face().c)
  }

  // ---------- the module ----------
  function reset() {
    cel.pena?.loop?.stop(0.15)
    cel.dash = cel.morte = cel.morango = cel.popup = cel.pena = cel.eco = null
    cel.hair.usedAt = -1e9
    cel.hair.refilled = true
    cel.hair.shown = false
    cel.hair.amt = cel.hair.flash = 0
    parts.length = 0
    s3.root.visible = false
    s3.label.visible = false
    backU.uFreeze.value = 0
    backU.uEchoA.value = backU.uEchoDis.value = 0
    backU.uHair.value = backU.uHairFlash.value = 0
    for (let i = 0; i < 4; i++) backU[`uAA${i}`].value = 0
    wipeU.uIris.value.w = 0
    wipeU.uGhost.value = 0
    cel.swipe.tracks = []
    cel.filaMorango.length = 0
    berryGold(false)
    momentos.limpa()
    amb.on = amb.cena = 0
    ambU.uAmbOn.value = 0
    cena.uniforms.uCenaW.value = 0
  }
  const busy = () => !!(momentos.ocupado() || cel.dash || cel.morte || cel.morango || cel.popup || cel.pena || cel.eco || performance.now() - cel.hair.usedAt < DASH.REFILL * 1000 + 400)
  const backOn = () => backU.uFreeze.value > 0 || backU.uEchoA.value > 0.003 || backU.uHair.value > 0.003 || backU.uHairFlash.value > 0.003 || [0, 1, 2, 3].some((i) => backU[`uAA${i}`].value > 0.003)

  return {
    // The body mask asked once as it comes on: its first answer is the slowest (the model warming up), and the first
    // dash shouldn't wait for it.
    ligar() {
      cel.maskUntil = Math.max(cel.maskUntil, performance.now() + 1500)
      abrirLink()
    },
    desligar() {
      reset()
      fecharLink()
    },
    acao: (a, now) => ({ dash: (n) => startDash(n), morte: startMorte, morango: startMorango, pena: startPena, eco: startEco })[a]?.(now),
    opcoes(o) {
      cel.opts.cabelo = o.cabelo !== false
      cel.opts.jogo = o.jogo !== false
      cel.opts.ambiente = o.ambiente !== false
    },
    // The face (where he is, his hair), the hands (the dash's gesture) unless the game is driving, and the body mask
    // while something on him or his cutout needs it, or his hair follows the game.
    quer: (now) => ({ maos: !seguindo(), rosto: true, tronco: ct.on, corpo: now < cel.maskUntil || (seguindo() && cel.opts.cabelo) || ct.on || amb.cena > 0 || reacoes.querCorpo() || momentos.querCorpo() }),
    atualizar(now, dt) {
      lerJogo(now)
      momentos.atualizar(now)
      updateAmbiente(now, dt)
      if (!seguindo()) readSwipe(now)
      if (cel.dash) updateDash(now)
      updateHair(now, dt)
      updateTranca(dt)
      comLook.value = ct.on ? 1 : 0
      updateRoupa()
      if (cel.morte) updateMorte(now)
      if (cel.morango) updateMorango(now, dt)
      if (cel.popup) updatePopup(now)
      if (cel.pena) updatePena(now, dt)
      if (cel.eco) updateEco(now)
      reacoes.atualizar(now, dt, seguindo() ? jogo.estado : null, !!cel.morte)
      updateParts(dt)
    },
    desenhar(fase, r) {
      if (fase === "atras") {
        if (amb.on > 0.003) r.renderer.render(ambScene, r.ortho)
        reacoes.atras(r)
        if (backOn() && backU.uFreeze.value <= 0.5) r.renderer.render(backScene, r.ortho)
        // Copy A after all that's behind him, so only his look differs from it in copy B.
        if (cel.morte?.toma === 1) {
          tomaQuadro("a", r)
          cel.morte.toma = 2
        } else if (querLook()) tomaQuadro("a", r)
        if (ct.on) {
          r.renderer.clearDepth()
          r.renderer.render(trOcclude, r.ortho)
          r.renderer.render(trScene, r.headCam)
        }
        if (rpU.uAmt.value > 0) r.renderer.render(roupa, r.ortho)
      } else if (fase === "frente" && (s3.root.visible || s3.label.visible)) {
        r.renderer.clearDepth()
        r.renderer.render(s3.scene, r.headCam)
      } else if (fase === "antesFx") {
        if (cel.morte?.toma === 2) {
          tomaQuadro("b", r)
          backU.uFrzComLook.value = comLook.value
          cel.morte.toma = 0
          cel.morte.t0 = performance.now()
        } else if (querLook()) tomaQuadro("b", r)
        remember(performance.now(), ct.on ? frz.a : null, ct.on ? frz.b : null)
        if (!cel.morte) reacoes.pintar(r, frz.a, frz.b)
        if (backU.uFreeze.value > 0.5) r.renderer.render(backScene, r.ortho)
      } else if (fase === "depoisFx") {
        if (wipeU.uIris.value.w > 0 || wipeU.uGhost.value > 0.003) r.renderer.render(wipeScene, r.ortho)
        if (!morto()) momentos.desenhar(r)
        if (uploadParts(performance.now() / 1000)) r.renderer.render(pScene, r.ortho)
      }
    },
    ocupado: busy,
    pronto: () => s3.ok || s3.failed,
    hud: () => {
      const e = jogo.estado
      const onde = !jogo.aberto ? "sem conexão" : !e ? "conectado" : e.onde === "nivel" ? `${e.capitulo?.nome ?? "?"} ${e.capitulo?.lado ?? ""} · dashes ${e.jogador?.dashes ?? "–"}` : e.onde
      return (
        `celeste: morango ${s3.ok ? "ok" : s3.failed ? "desenhado" : "…"} · partículas ${parts.length}${cel.dash ? " · dash" : ""}${cel.morte ? " · morte" : ""}${cel.morango ? " · morango" : ""}${cel.pena ? " · pena" : ""}${cel.eco ? " · eco" : ""}${momentos.nome() ? ` · ${momentos.nome()}` : ""}` +
        `${cel.hair.amt > 0.05 ? " · cabelo" : ""}${cel.swipe.note}\n` +
        `jogo: ${onde} · ${jogo.n} msgs · clima ${NOMES_AMB[amb.b]}${amb.k < 1 ? ` (de ${NOMES_AMB[amb.a]})` : ""}${amb.on < 0.01 ? " (desligado)" : ""}`
      )
    },
    estado: { cel, s3, hist, jogo, amb, reacoes: reacoes.estado, cena: cena.estado },
  }
}
