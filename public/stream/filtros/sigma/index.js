// Sigma: Luan as the Gigachad meme, in black and white (Luan, 2026-11-24: "eu com os queixos quadrados e talvez até
// super musculoso"). One pass in phase "atras" redraws the camera over the whole box, warped and graded, so whatever
// comes later (the Santa hat, the effects on his body) still goes over it. All of it from code, no picture or model.
//
// - The warp: handles placed on his face's landmarks (`faceLm`) push his jaw's corners out and a little down, lower
//   and square his chin and thicken his neck; on his shoulders (`pose`), when seen, they broaden them and raise his
//   traps. Each handle moves what's round its point by its vector (the camera is read back from where it came, so
//   nothing tears); his eyes are kept where they are, his mouth mostly. It fades in as his face is found.
// - The grade: a red filter's black and white (his skin light, the blue background dark), local contrast, a hard
//   light from the box's left on his face and body (shaped as an ellipsoid and a cylinder, so it follows him), his eye
//   sockets, the hollows under his cheekbones and the shadow under his (new) jaw deepened, a strong S-curve, a vignette
//   round him and animated film grain.
//
// As the Filtros dock's filter it stays fully on. The Lance ruim's visit (the Efeitos dock's { visita: { filtro:
// "sigma", acao: "lance", ate } }, `ate` the moment's end in Date.now()'s epoch ms) snaps it in over 0.25 s with a
// small shake and a flash, holds, and eases him back to his plain picture over 0.3 s ending at `ate` (late, it still
// ends then; after `ate`, nothing). While Sigma is also the dock's choice, the lance only punches it and it stays on.
// Key L in a browser: the moment, 4 s.

export const filtros = [{ id: "sigma", nome: "Sigma", jogo: "Efeitos", desenho: "sigma", teclas: { l: "lance" } }]

export async function criar(m) {
  const { THREE, GLSL_COMMON, GLSL_APAGAR, VERT, quad, toScreen, W, H, ease, easeOutBack } = m
  const V = THREE.Vector2
  const A = W / H
  const clamp = THREE.MathUtils.clamp
  // How long the lance's snap in and ease out take (s), and the default moment for a lance without `ate` (ms).
  const ENTRA = 0.25
  const SAI = 0.3
  const LANCE_MS = 4000
  // Handles, at most.
  const N = 24
  // The jaw's handles, by landmark (image left, image right): how far out (face widths) and down (face heights) it
  // goes, and its reach (face heights). Gigachad's is the lower face longer and its chin broad and square, the cheeks
  // left where they are: pushed out under the ears (the first version, 2026-11-24), the jaw read as mumps ("parece
  // mais que eu tô com caxumba", Luan).
  const QUEIXO = [
    [152, 152, 0, 0.11, 0.22],
    [148, 377, 0.07, 0.11, 0.17],
    [176, 400, 0.11, 0.11, 0.18],
    [149, 378, 0.14, 0.1, 0.2],
    [150, 379, 0.14, 0.08, 0.21],
    [136, 365, 0.09, 0.05, 0.21],
    [172, 397, 0.03, 0.02, 0.19],
    [58, 288, 0, 0, 0.2],
  ]

  // The jaw's line, by landmark: the corner, round the chin, to the other corner.
  const MAND = [58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288]

  const u = m.uniforms
  const U = {
    uCam: u.uCam, uMask: u.uMask, uCover: u.uCover, uTime: u.uTime, uAspect: u.uAspect,
    uErase: u.uErase, uFace: u.uFace, uFaceUp: u.uFaceUp, uPlate: u.uPlate, uPlateFix: u.uPlateFix, uPlateOk: u.uPlateOk,
    uMaskShift: u.uMaskShift, uEraseLow: u.uEraseLow, uMem: u.uMem, uKeep: u.uKeep,
    // The grade's amount, the warp's, the snap's flash.
    uAmt: { value: 0 },
    uWarp: { value: 0 },
    uFlash: { value: 0 },
    // The handles: where each one's point goes (xy, in box heights from the bottom left) and by how much (zw); reach.
    uH: { value: Array.from({ length: N }, () => new THREE.Vector4()) },
    uHR: { value: new Array(N).fill(1) },
    uHN: { value: 0 },
    // His face: its middle and up (box heights), its width and height, the chin; his eyes and mouth; how sure (0..1).
    uRosto: { value: new THREE.Vector4(0.5 * A, 0.55, 0, 1) },
    uRostoS: { value: new V(0.2, 0.3) },
    uQueixo: { value: new V(0.5 * A, 0.4) },
    // His jaw's line where the warp puts it, from one corner round the chin to the other.
    uMand: { value: Array.from({ length: MAND.length }, () => new V()) },
    // The hollows under his cheekbones (where they are with his jaw moved out).
    uCovas: { value: [new V(0.45 * A, 0.5), new V(0.55 * A, 0.5)] },
    uOlhos: { value: [new V(0.45 * A, 0.6), new V(0.55 * A, 0.6)] },
    uBoca: { value: new V(0.5 * A, 0.45) },
    uFeicoes: { value: 0 },
    // His body: its middle across, the shoulders' height, half their span (box heights).
    uCorpo: { value: new THREE.Vector3(0.5 * A, 0.1, 0.35) },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: VERT,
    depthTest: false,
    depthWrite: false,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      ${GLSL_APAGAR}
      #define N ${N}
      uniform float uAmt, uWarp, uFlash, uFeicoes;
      uniform vec4 uH[N];
      uniform float uHR[N];
      uniform int uHN;
      uniform vec4 uRosto;
      uniform vec2 uRostoS, uQueixo, uBoca;
      uniform vec2 uOlhos[2];
      uniform vec2 uMand[${MAND.length}];
      uniform vec2 uCovas[2];
      uniform vec3 uCorpo;
      vec2 R, UP;
      // A point in the face's own axes (across, up) from c.
      vec2 local(vec2 p, vec2 c) { vec2 d = p - c; return vec2(dot(d, R), dot(d, UP)); }
      float elipse(vec2 p, vec2 c, vec2 r) { return length(local(p, c) / r); }
      // Black and white through a red filter: skin light, the blue background dark.
      float mono(vec3 c) { return dot(c, vec3(0.52, 0.42, 0.06)); }
      float monoEm(vec2 uv) { return mono(texture2D(uCam, camUv(uv)).rgb); }
      // How far what's drawn at p came from: each handle's vector, weighted round where its point went (a weighted
      // average where they overlap, fading to nothing past their reach).
      vec2 desloca(vec2 p) {
        vec2 s = vec2(0.0);
        float ws = 0.0;
        for (int i = 0; i < N; i++) {
          if (i >= uHN) break;
          vec4 h = uH[i];
          float x = length(p - h.xy - h.zw) / uHR[i];
          float w = x < 1.0 ? pow(1.0 - x * x, 3.0) : 0.0;
          s += h.zw * w;
          ws += w;
        }
        return s / max(ws, 1.0);
      }
      void main() {
        vec2 asp = vec2(uAspect, 1.0);
        vec2 p = vUv * asp;
        UP = uRosto.zw;
        R = vec2(UP.y, -UP.x);
        float fw = uRostoS.x, fh = uRostoS.y;
        // His eyes and mouth stay where they are.
        // (The mouth mostly: held still while the jaw round it moves, it would look pursed.)
        float fixo = smoothstep(1.0, 0.6, elipse(p, uOlhos[0], vec2(0.17 * fw, 0.1 * fh)));
        fixo = max(fixo, smoothstep(1.0, 0.6, elipse(p, uOlhos[1], vec2(0.17 * fw, 0.1 * fh))));
        fixo = max(fixo, smoothstep(1.0, 0.5, elipse(p, uBoca, vec2(0.3 * fw, 0.13 * fh))) * 0.45);
        vec2 D = uWarp > 0.0 ? desloca(p) * uWarp * (1.0 - fixo) : vec2(0.0);
        vec2 sp = p - D;
        vec2 su = sp / asp;
        vec4 plain = apagarCabelo(texture2D(uCam, camUv(vUv)).rgb, vUv);
        vec3 cam = uWarp > 0.0 ? apagarCabelo(texture2D(uCam, camUv(su)).rgb, su).rgb : plain.rgb;
        float y = mono(cam);
        // Local contrast: the picture against itself blurred, pushed apart (skin, muscle and hair get their grit).
        vec2 px = 1.0 / vec2(${W}.0, ${H}.0);
        float b = 0.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.7854 + 0.39;
          vec2 o = vec2(cos(a), sin(a)) * px;
          b += monoEm(su + o * 6.0) + monoEm(su + o * 15.0);
        }
        b /= 16.0;
        y = max(0.0, y + (y - b) * 0.85);
        // The hard light from the left: his face an ellipsoid, his body a cylinder between his shoulders.
        vec2 q = local(p, uRosto.xy) / vec2(0.58 * fw, 0.6 * fh);
        vec2 qs = q.x * R + q.y * UP;
        float r2 = dot(q, q);
        vec3 nf = normalize(vec3(qs, sqrt(max(0.0, 1.0 - min(r2, 1.0))) + 0.05));
        float bx0 = (p.x - uCorpo.x) / uCorpo.z;
        float bx = clamp(bx0, -1.0, 1.0);
        vec3 nb = normalize(vec3(bx, 0.2, sqrt(1.0 - bx * bx) + 0.08));
        vec3 n = normalize(mix(nb, nf, smoothstep(1.2, 0.85, sqrt(r2))));
        float luz = smoothstep(-0.15, 0.4, dot(n, normalize(vec3(-0.8, 0.35, 0.5))));
        // Only on him: his face, and his body under his chin between his shoulders; the room round him keeps an even,
        // dim light (lit from the left everywhere, half the screen went black with the camera on all of it).
        float nele = max(smoothstep(1.3, 0.95, sqrt(r2)), (1.0 - smoothstep(0.9, 1.2, abs(bx0))) * smoothstep(uQueixo.y + 0.08, uQueixo.y - 0.06, p.y));
        luz = mix(0.55, luz, nele);
        // Deep-set eyes under a heavy brow (their sockets a little in shadow, the brow's ridge lit) and hollow cheeks,
        // lightly: drawn strong, with a black band under the new jaw for its shadow on his neck, they read as black
        // smudges on the camera (Luan, 2026-11-24: "não tô entendendo essa sombra preta").
        float sombra = 0.0;
        for (int i = 0; i < 2; i++) {
          sombra = max(sombra, smoothstep(1.0, 0.35, elipse(p, uOlhos[i] + UP * 0.03 * fh, vec2(0.16 * fw, 0.07 * fh))) * 0.18);
          sombra = max(sombra, smoothstep(1.0, 0.2, elipse(p, uCovas[i], vec2(0.08 * fw, 0.09 * fh))) * 0.12);
          y += 0.08 * smoothstep(1.0, 0.3, elipse(p, uOlhos[i] + UP * 0.11 * fh, vec2(0.17 * fw, 0.04 * fh))) * luz * uFeicoes;
        }
        y *= 1.0 - sombra * uFeicoes;
        // His chin's knob catching the light.
        y += 0.1 * smoothstep(1.0, 0.2, elipse(p, uMand[${(MAND.length - 1) / 2}] + UP * 0.07 * fh, vec2(0.14 * fw, 0.06 * fh))) * (0.4 + 0.6 * luz) * uFeicoes;
        float v = y * 1.1 * mix(0.62, 1.25, luz);
        // The S-curve: blacks crushed, the lights bright.
        v = smoothstep(0.03, 0.97, pow(v, 1.1));
        v = mix(v, v * v * (3.0 - 2.0 * v), 0.45);
        // The vignette, round a point between the box's middle and his face.
        vec2 vc = mix(vec2(0.5 * uAspect, 0.5), uRosto.xy, 0.5);
        float dv = length((p - vc) / vec2(0.5 * uAspect, 0.5)) * 0.7071;
        v *= mix(1.0, 0.45, smoothstep(0.45, 1.0, dv));
        // The grain, a new one every 24th of a second, most in the middle tones.
        vec2 g = floor(gl_FragCoord.xy / 1.5) + mod(floor(uTime * 24.0), 61.0) * vec2(17.0, 29.0);
        v += (hash2(g) + hash2(g + vec2(0.5, 0.25)) - 1.0) * 0.075 * (0.3 + 2.8 * v * (1.0 - v));
        v = mix(v, 1.0, uFlash);
        gl_FragColor = vec4(mix(plain.rgb, vec3(clamp(v, 0.0, 1.0)), uAmt), 1.0);
      }`,
  })
  const cena = quad(mat)

  // amt: the grade on screen (0..1); achado and ombros: his face's and shoulders' handles, eased in as they're found;
  // lance: the Lance ruim's moment on the page's clock (t0, fim), its snap's punch and flash.
  const st = { amt: 0, achado: 0, ombros: 0, lance: null, warp: 0 }
  const handles = []
  const hand = (c, d, r, k) => handles.length < N && handles.push({ c, d: d.clone().multiplyScalar(k), r })
  // His face's handles as last seen (kept while he's lost, as they fade out).
  let doRosto = []

  function lanceEm(now) {
    const L = st.lance
    if (!L || now >= L.fim) return null
    const t = (now - L.t0) / 1000
    const dur = (L.fim - L.t0) / 1000
    const a = clamp(t / Math.min(ENTRA, dur * 0.4), 0, 1)
    const b = clamp((L.fim - now) / 1000 / Math.min(SAI, dur * 0.45), 0, 1)
    return { t, entra: a, sai: b }
  }

  function atualizar(now, dt) {
    const L = lanceEm(now)
    if (st.lance && !L) st.lance = null
    // On only for a visit: his plain picture but for the lance's moment. Else (the dock's choice): fully on.
    let warpK = 1
    let flash = 0
    if (L) flash = 0.55 * Math.max(0, 1 - L.t / 0.18) ** 2
    if (L && m.deVisita) {
      st.amt = ease(L.entra) * ease(L.sai)
      warpK = (easeOutBack(L.entra) * ease(L.sai)) / Math.max(st.amt, 1e-3)
    } else {
      const alvo = m.deVisita ? 0 : 1
      st.amt = alvo > st.amt ? Math.min(alvo, st.amt + dt / 0.3) : Math.max(alvo, st.amt - dt / 0.3)
      // The dock's Sigma takes the lance as a punch: the jaw pushed further a moment.
      if (L) warpK = 1 + 0.3 * Math.sin(Math.PI * Math.min(1, L.t / 0.4))
    }
    const lm = m.faceLm
    const visto = !!(m.headSeen && lm)
    st.achado = clamp(st.achado + dt * (visto ? 1 / 0.35 : -1 / 0.25), 0, 1)
    st.ombros = clamp(st.ombros + dt * (m.pose.seen ? 1 / 0.35 : -1 / 0.25), 0, 1)
    st.warp = st.amt * warpK
    U.uAmt.value = st.amt
    U.uWarp.value = st.warp
    U.uFlash.value = flash * st.amt
    U.uFeicoes.value = st.achado
    if (st.amt <= 0.003) return
    handles.length = 0
    if (visto) {
      const P = (i) => {
        const [x, y] = toScreen(lm[i].x, lm[i].y)
        return new V(x * A, y)
      }
      const top = P(10), chin = P(152), l = P(234), r = P(454)
      const up = top.clone().sub(chin)
      const fh = up.length()
      up.normalize()
      const fw = r.distanceTo(l)
      U.uRosto.value.set((top.x + chin.x) / 2, (top.y + chin.y) / 2, up.x, up.y)
      U.uRostoS.value.set(fw, fh)
      U.uQueixo.value.copy(chin)
      U.uOlhos.value[0].copy(P(33).add(P(133)).multiplyScalar(0.5))
      U.uOlhos.value[1].copy(P(362).add(P(263)).multiplyScalar(0.5))
      U.uBoca.value.copy(P(13).add(P(14)).multiplyScalar(0.5))
    }
    const up = new V(U.uRosto.value.z, U.uRosto.value.w)
    const R = new V(up.y, -up.x)
    const [fw, fh] = [U.uRostoS.value.x, U.uRostoS.value.y]
    if (visto) {
      doRosto = []
      const P = (i) => {
        const [x, y] = toScreen(lm[i].x, lm[i].y)
        return new V(x * A, y)
      }
      // Where each of the jaw line's points goes: its handle's vector, as the shader weighs it at its own point.
      const desl = new Map()
      for (const [li, ri, fora, baixo] of QUEIXO)
        for (const [i, s] of li === ri ? [[li, 0]] : [[li, -1], [ri, 1]])
          desl.set(i, R.clone().multiplyScalar(s * fora * fw).addScaledVector(up, -baixo * fh).multiplyScalar(st.achado * st.warp))
      MAND.forEach((i, k) => U.uMand.value[k].copy(P(i).add(desl.get(i))))
      // Each hollow between the cheekbone, the mouth's corner and the jaw's corner.
      for (const [k, maca, boca, canto] of [[0, 123, 61, 172], [1, 352, 291, 397]])
        U.uCovas.value[k].copy(P(maca).multiplyScalar(0.55).addScaledVector(P(boca), 0.05).addScaledVector(P(canto).add(desl.get(canto)), 0.4))
      for (const [li, ri, fora, baixo, alcance] of QUEIXO)
        for (const [i, s] of li === ri ? [[li, 0]] : [[li, -1], [ri, 1]])
          doRosto.push({ c: P(i), d: R.clone().multiplyScalar(s * fora * fw).addScaledVector(up, -baixo * fh), r: alcance * fh })
      // His neck, thicker: its sides below the jaw pushed out.
      const chin = U.uQueixo.value
      for (const s of [-1, 1])
        for (const [abaixo, fora] of [[0.32, 0.06], [0.6, 0.09]])
          doRosto.push({ c: chin.clone().addScaledVector(R, s * 0.3 * fw).addScaledVector(up, -abaixo * fh), d: R.clone().multiplyScalar(s * fora * fw), r: 0.3 * fh })
    }
    if (st.achado > 0) for (const h of doRosto) hand(h.c, h.d, h.r, st.achado)
    // His shoulders broader and his traps up.
    if (st.ombros > 0) {
      const a = new V(m.pose.left.x * A, m.pose.left.y)
      const b = new V(m.pose.right.x * A, m.pose.right.y)
      const meio = a.clone().add(b).multiplyScalar(0.5)
      const vao = Math.max(a.distanceTo(b), 0.05)
      U.uCorpo.value.set(meio.x, meio.y, vao / 2)
      for (const S of [a, b]) {
        const fora = S.clone().sub(meio).normalize()
        const cima = new V(-fora.y, fora.x)
        if (cima.y < 0) cima.negate()
        hand(S.clone(), fora.clone().multiplyScalar(0.13 * vao).addScaledVector(cima, 0.03 * vao), 0.34 * vao, st.ombros)
        hand(meio.clone().addScaledVector(fora, 0.3 * vao).addScaledVector(cima, 0.16 * vao), cima.clone().multiplyScalar(0.09 * vao).addScaledVector(fora, 0.02 * vao), 0.22 * vao, st.ombros)
        hand(S.clone().addScaledVector(fora, 0.05 * vao).addScaledVector(cima, -0.18 * vao), fora.clone().multiplyScalar(0.09 * vao), 0.3 * vao, st.ombros)
      }
    } else if (visto) U.uCorpo.value.set(U.uRosto.value.x, U.uQueixo.value.y - fh * 0.6, fw * 1.4)
    handles.forEach((h, i) => {
      U.uH.value[i].set(h.c.x, h.c.y, h.d.x, h.d.y)
      U.uHR.value[i] = h.r
    })
    U.uHN.value = handles.length
  }

  return {
    ligar() {
      // Come on for a visit: his plain picture until the lance.
      if (m.deVisita && !st.lance) st.amt = 0
    },
    desligar() {
      Object.assign(st, { amt: 0, achado: 0, ombros: 0, lance: null, warp: 0 })
      doRosto = []
      U.uAmt.value = U.uWarp.value = U.uFlash.value = 0
    },
    // The Lance ruim (from a visit, with `ate`: the moment's end, Date.now()'s ms): a moment shorter than half a
    // second is left alone (it would only blink).
    acao(id, now, extra) {
      if (id !== "lance" || st.lance) return
      const resta = extra?.ate != null ? extra.ate - Date.now() : LANCE_MS
      if (!(resta >= 500)) return
      st.lance = { t0: now, fim: now + resta }
      m.sacudir(350, 7, now)
    },
    quer: () => ({ rosto: true, ombros: true }),
    atualizar,
    desenhar(fase, r) {
      if (fase === "atras" && st.amt > 0.003) r.renderer.render(cena, r.ortho)
    },
    ocupado: () => !!st.lance && performance.now() < st.lance.fim,
    hud: () => `sigma ${st.amt.toFixed(2)} · rosto ${st.achado.toFixed(2)} · ombros ${st.ombros.toFixed(2)} · ${U.uHN.value} alças${st.lance ? ` · lance até ${((st.lance.fim - performance.now()) / 1000).toFixed(1)} s` : ""}`,
    estado: { sigma: st },
  }
}
