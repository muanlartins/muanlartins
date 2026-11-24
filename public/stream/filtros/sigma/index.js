// Sigma: Luan turning into the Gigachad meme (Luan, 2026-11-24: "eu com os queixos quadrados e talvez até super
// musculoso"), the Lance ruim's moment on the camera. He goes black and white, his face morphs into a portrait of
// himself as Gigachad and the portrait slams up to fill the box on the sound's drop, holds, and shrinks back onto
// his face before he's himself again.
//
// The portrait (retrato.webp) is a still, picked by Luan: made once by an image model from a frame of his camera,
// with its face's 478 points beside it (retrato.json; both by scripts/sigma_retrato.py). A first version bent his live
// picture into a square jaw from code (radial handles on his face, painted light and shadows) and read as mumps and
// black smudges, three fixes running ("ainda ficou horrível", 2026-11-24); a still can be as good as the meme's.
//
// The morph is the classic one: one mesh over the box, its points his face's (MediaPipe's, carried to the frame),
// two rings round his face and a frame past the box's edges, triangulated once on the portrait's; each point slides
// from where it is on him to where it is on the portrait while the camera's picture, carried by the mesh, dissolves
// into the portrait's. The portrait is placed by its eyes: first on his (same size, same tilt), then out to its full
// framing (the whole box, eyes 40% from the top). In between it's only black and white: a red filter's (skin light,
// the blue background dark), a soft S-curve, a vignette and grain, the same over the portrait.
//
// As the Filtros dock's filter: the black and white stays on, and L (or a visit's lance) plays the transformation. The
// Lance ruim's visit (the Efeitos dock's { visita: { filtro: "sigma", acao: "lance", ate } }, `ate` the moment's end
// in Date.now()'s epoch ms) fades the black and white in over 0.25 s, transforms at 0.3–0.85 s (the second boom of
// sons.js's lance is at 0.85 s), holds, transforms back and is his plain picture again by `ate`; a shorter moment
// runs it all sooner. Without the portrait (a failed load), the moment is the black and white alone.

export const filtros = [{ id: "sigma", nome: "Sigma", jogo: "Efeitos", desenho: "sigma", teclas: { l: "lance" } }]

export async function criar(m) {
  const { THREE, GLSL_COMMON, GLSL_APAGAR, toScreen, W, H, FACE_OVAL } = m
  const V = THREE.Vector2
  const A = W / H
  const clamp = THREE.MathUtils.clamp
  const suave = (x) => {
    const t = clamp(x, 0, 1)
    return t * t * (3 - 2 * t)
  }
  // The black and white's fade in and out (s), and the moment without `ate` (ms).
  const ENTRA = 0.25
  const SAI = 0.3
  const LANCE_MS = 4000
  // The transformation (s from the start), and the way back (s before the end), for a 4 s moment.
  const VIRA = [0.3, 0.85]
  const VOLTA = [0.95, 0.3]
  // The portrait at its fullest: its eyes this high in the box (0 the bottom), unless that would show its edge.
  const OLHOS_EM = 0.6
  // His face's rings, as the oval scaled from its middle; the frame round it all, this far past the box.
  const ANEIS = [1.4, 2.1]
  const BORDA = 0.3

  const u = m.uniforms
  const U = {
    uCam: u.uCam, uMask: u.uMask, uCover: u.uCover, uTime: u.uTime, uAspect: u.uAspect,
    uErase: u.uErase, uFace: u.uFace, uFaceUp: u.uFaceUp, uPlate: u.uPlate, uPlateFix: u.uPlateFix, uPlateOk: u.uPlateOk,
    uMaskShift: u.uMaskShift, uEraseLow: u.uEraseLow, uMem: u.uMem, uKeep: u.uKeep,
    // The portrait, its background's grey; the black and white's amount, the portrait's share, the flash.
    uRet: { value: null },
    uFundo: { value: 0.05 },
    uAmt: { value: 0 },
    uW: { value: 0 },
    uFlash: { value: 0 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aLive;
      attribute vec2 aPort;
      varying vec2 vLive, vPort, vPos, vUv;
      void main() {
        vLive = aLive;
        vPort = aPort;
        vPos = position.xy * 0.5 + 0.5;
        vUv = vPos;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      ${GLSL_APAGAR}
      uniform sampler2D uRet;
      uniform float uFundo, uAmt, uW, uFlash;
      varying vec2 vLive, vPort, vPos;
      // Black and white through a red filter: skin light, the blue background dark.
      float mono(vec3 c) { return dot(c, vec3(0.52, 0.42, 0.06)); }
      void main() {
        vec3 plain = apagarCabelo(texture2D(uCam, camUv(vPos)).rgb, vPos).rgb;
        float y = 0.0;
        if (uW < 0.999) {
          y = smoothstep(0.02, 0.95, mono(apagarCabelo(texture2D(uCam, camUv(vLive)).rgb, vLive).rgb) * 1.05);
          y = mix(y, y * y * (3.0 - 2.0 * y), 0.35);
        }
        float r = uFundo;
        if (uW > 0.001) {
          // Its edges fade into its background, so no straight line shows while it's smaller than the box.
          vec2 d = smoothstep(vec2(0.0), vec2(0.06), vPort) * smoothstep(vec2(1.0), vec2(0.94), vPort);
          r = mix(uFundo, texture2D(uRet, vPort).r, d.x * d.y);
        }
        float v = mix(y, r, uW);
        vec2 dv = (vPos - 0.5) * vec2(uAspect, 1.0);
        v *= mix(1.0, 0.55, smoothstep(0.45, 1.05, length(dv)));
        // The grain, a new one every 24th of a second, most in the middle tones.
        vec2 g = floor(gl_FragCoord.xy / 1.5) + mod(floor(uTime * 24.0), 61.0) * vec2(17.0, 29.0);
        v += (hash2(g) + hash2(g + vec2(0.5, 0.25)) - 1.0) * 0.05 * (0.3 + 2.8 * v * (1.0 - v));
        v = mix(v, 1.0, uFlash);
        gl_FragColor = vec4(mix(plain, vec3(clamp(v, 0.0, 1.0)), uAmt), 1.0);
      }`,
  })
  const geometria = (pos, live, port, indice) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aLive", new THREE.BufferAttribute(live, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aPort", new THREE.BufferAttribute(port, 2).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(indice)
    return g
  }
  const cena = (g) => {
    const s = new THREE.Scene()
    const malha = new THREE.Mesh(g, mat)
    malha.frustumCulled = false
    s.add(malha)
    return s
  }
  // The black and white alone, straight over the box.
  const uv4 = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
  const plano = cena(geometria(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), uv4, uv4.slice(), [0, 1, 2, 0, 2, 3]))

  // The portrait: in its own space x across (0..its aspect) and y up (0..1), like the box's (0..A, 0..1).
  let ret = null
  try {
    const [dados, tex, { default: Delaunator }] = await Promise.all([
      fetch(new URL("./retrato.json", import.meta.url)).then((r) => r.json()),
      new THREE.TextureLoader().loadAsync(new URL("./retrato.webp", import.meta.url).href),
      import("https://cdn.jsdelivr.net/npm/delaunator@5.0.1/+esm"),
    ])
    tex.colorSpace = THREE.NoColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.anisotropy = 4
    U.uRet.value = tex
    // Its background's grey, from its top corners.
    const c = document.createElement("canvas")
    c.width = c.height = 8
    const cx = c.getContext("2d")
    cx.drawImage(tex.image, 0, 0, 8, 8)
    const px = cx.getImageData(0, 0, 8, 1).data
    U.uFundo.value = (px[0] + px[4 * 7]) / 2 / 255
    const Ap = dados.w / dados.h
    const pts = dados.pontos.map(([x, y]) => new V(x * Ap, 1 - y))
    const N = pts.length
    const pl = pts[33].clone().add(pts[133]).multiplyScalar(0.5)
    const pr = pts[362].clone().add(pts[263]).multiplyScalar(0.5)
    const pe = pl.clone().add(pr).multiplyScalar(0.5)
    const dP = pr.clone().sub(pl)
    // Its fullest framing: as wide as the box (or as tall), eyes at OLHOS_EM, never past its edges.
    const s1 = Math.max(A / Ap, 1)
    const c1 = new V(A / 2 + s1 * (pe.x - Ap / 2), clamp(OLHOS_EM, 1 - s1 * (1 - pe.y), s1 * pe.y))
    // The frame past the box's edges: 8 stretches a side.
    const moldura = []
    const [x0, x1, y0, y1] = [-BORDA, A + BORDA, -BORDA, 1 + BORDA]
    for (let i = 0; i < 8; i++) {
      const t = i / 8
      moldura.push(new V(x0 + (x1 - x0) * t, y0), new V(x1, y0 + (y1 - y0) * t), new V(x1 - (x1 - x0) * t, y1), new V(x0, y1 - (y1 - y0) * t))
    }
    const NA = ANEIS.length * FACE_OVAL.length
    const NT = N + NA + moldura.length
    const porto = Array.from({ length: NT }, () => new V())
    pts.forEach((p, i) => porto[i].copy(p))
    aneis(porto, N)
    // The frame's points in the portrait's space at its fullest (for the triangles; their place on it follows).
    moldura.forEach((f, k) => porto[N + NA + k].copy(f).sub(c1).multiplyScalar(1 / s1).add(pe))
    const tri = new Delaunator(porto.flatMap((p) => [p.x, p.y])).triangles
    const port = new Float32Array(NT * 2)
    porto.forEach((p, i) => port.set([p.x / Ap, p.y], i * 2))
    const g = geometria(new Float32Array(NT * 3), new Float32Array(NT * 2), port, Array.from(tri))
    ret = { Ap, N, NA, NT, pe, dP, s1, c1, moldura, porto, g, cena: cena(g), ele: Array.from({ length: NT }, () => new V()) }
  } catch (e) {
    m.fail?.("sigma", e)
  }
  // A face's rings (its points from 0 in `p`, the rings written from `k`), round the middle of its oval.
  function aneis(p, k) {
    const meio = new V()
    for (const i of FACE_OVAL) meio.add(p[i])
    meio.multiplyScalar(1 / FACE_OVAL.length)
    for (const f of ANEIS) for (const i of FACE_OVAL) p[k++].copy(p[i]).sub(meio).multiplyScalar(f).add(meio)
  }

  // amt: the black and white on screen; vira: the morph (0 him, 1 the portrait); zoom: the portrait from his face's
  // place (0) to its fullest (1); lance: the moment on the page's clock (t0, fim, pousou: the drop has landed).
  const st = { amt: 0, vira: 0, zoom: 0, lance: null }
  // Where the portrait sits on his face (its eyes on his): scale, turn, middle; kept while he's lost.
  const sobre = { s: 0.075 / Math.max(ret?.dP.length() ?? 1, 1e-6), a: 0, c: new V(0.5 * A, 0.58) }

  function lanceEm(now) {
    const L = st.lance
    if (!L || now >= L.fim) return null
    const t = (now - L.t0) / 1000
    const D = (L.fim - L.t0) / 1000
    const f = Math.min(1, D / 4)
    const pousou = VIRA[1] * f
    return {
      t,
      pousou,
      // The way in (0..1), the way back (1 until it starts, 0 once back), the hold between them (0..1).
      p: clamp((t - VIRA[0] * f) / ((VIRA[1] - VIRA[0]) * f), 0, 1),
      q: clamp((D - VOLTA[1] * f - t) / ((VOLTA[0] - VOLTA[1]) * f), 0, 1),
      segura: clamp((t - pousou) / Math.max(D - VOLTA[0] * f - pousou, 0.1), 0, 1),
      entra: clamp(t / (ENTRA * f), 0, 1),
      sai: clamp((D - t) / (SAI * f), 0, 1),
    }
  }

  const q = new V()
  const r = new V()
  function atualizar(now, dt) {
    const L = lanceEm(now)
    if (st.lance && !L) st.lance = null
    if (L && m.deVisita) st.amt = suave(L.entra) * suave(L.sai)
    else {
      const alvo = m.deVisita ? 0 : 1
      st.amt = alvo > st.amt ? Math.min(alvo, st.amt + dt / 0.3) : Math.max(alvo, st.amt - dt / 0.3)
    }
    // In, his face becomes the portrait's in place, then the portrait slams out to its fullest on the drop; back, it
    // shrinks onto his face, then dissolves into him.
    let vira = 0
    let zoom = 0
    let flash = 0
    let soco = 0
    if (L && ret) {
      if (L.p < 1 || L.q >= 1) {
        vira = suave(L.p / 0.6)
        zoom = clamp((L.p - 0.35) / 0.65, 0, 1) ** 2
      } else {
        zoom = 1 - suave((1 - L.q) / 0.6)
        vira = suave(L.q / 0.45)
      }
      if (L.t >= L.pousou) {
        const d = L.t - L.pousou
        soco = Math.exp(-d * 7)
        flash = 0.55 * Math.exp(-d * 11)
        if (!st.lance.pousou) {
          st.lance.pousou = true
          m.sacudir(320, 9, now)
        }
      }
    }
    st.vira = vira
    st.zoom = zoom
    U.uAmt.value = st.amt
    U.uFlash.value = flash * st.amt
    U.uW.value = suave((vira - 0.15) / 0.7)
    if (st.amt <= 0.003 || !ret || vira <= 0.001) return
    // Where his points are on the box (A wide, 1 high), or, lost, where the portrait's would be on his face.
    const lm = m.faceLm
    const visto = !!(m.headSeen && lm && lm.length >= 468)
    const P = (i, out) => {
      const [x, y] = toScreen(lm[i].x, lm[i].y)
      return out.set(x * A, y)
    }
    if (visto) {
      const el = P(33, new V()).add(P(133, q)).multiplyScalar(0.5)
      const er = P(362, new V()).add(P(263, q)).multiplyScalar(0.5)
      const dL = er.clone().sub(el)
      const a = Math.atan2(dL.y, dL.x) - Math.atan2(ret.dP.y, ret.dP.x)
      sobre.s = dL.length() / ret.dP.length()
      sobre.a = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -0.6, 0.6)
      sobre.c.copy(el).add(er).multiplyScalar(0.5)
    }
    // The portrait's place now: from on his face to its fullest (pushed in through the hold, punched on the drop).
    const k = (1 + 0.06 * suave(L.segura)) * (1 + 0.05 * soco)
    const s = Math.exp(THREE.MathUtils.lerp(Math.log(sobre.s), Math.log(ret.s1 * k), zoom))
    const ang = THREE.MathUtils.lerp(sobre.a, 0, zoom)
    const c = sobre.c.clone().lerp(ret.c1, zoom)
    const [co, si] = [Math.cos(ang), Math.sin(ang)]
    const T = (p, out) => {
      const x = p.x - ret.pe.x
      const y = p.y - ret.pe.y
      return out.set(c.x + s * (co * x - si * y), c.y + s * (si * x + co * y))
    }
    const Tinv = (p, out) => {
      const x = (p.x - c.x) / s
      const y = (p.y - c.y) / s
      return out.set(ret.pe.x + co * x + si * y, ret.pe.y - si * x + co * y)
    }
    const { N, NA, NT, ele, porto, moldura, g } = ret
    const n = visto ? Math.min(lm.length, N) : 0
    for (let i = 0; i < N; i++) {
      if (i < n) P(i, ele[i])
      else T(porto[i], ele[i])
    }
    if (visto) aneis(ele, N)
    else for (let j = N; j < N + NA; j++) T(porto[j], ele[j])
    const pos = g.attributes.position.array
    const live = g.attributes.aLive.array
    const port = g.attributes.aPort.array
    for (let i = 0; i < NT; i++) {
      if (i < N + NA) {
        T(porto[i], q).lerp(ele[i], 1 - vira)
        live[i * 2] = ele[i].x / A
        live[i * 2 + 1] = ele[i].y
      } else {
        // The frame stays past the box; the portrait is read there through its place now.
        const f = moldura[i - N - NA]
        q.copy(f)
        live[i * 2] = f.x / A
        live[i * 2 + 1] = f.y
        Tinv(f, r)
        port[i * 2] = r.x / ret.Ap
        port[i * 2 + 1] = r.y
      }
      pos[i * 3] = (q.x / A) * 2 - 1
      pos[i * 3 + 1] = q.y * 2 - 1
    }
    g.attributes.position.needsUpdate = true
    g.attributes.aLive.needsUpdate = true
    g.attributes.aPort.needsUpdate = true
  }

  return {
    ligar() {
      // Come on for a visit: his plain picture until the lance.
      if (m.deVisita && !st.lance) st.amt = 0
    },
    desligar() {
      Object.assign(st, { amt: 0, vira: 0, zoom: 0, lance: null })
      U.uAmt.value = U.uW.value = U.uFlash.value = 0
    },
    // The Lance ruim (from a visit, with `ate`: the moment's end, Date.now()'s ms, and `desde` its start: the camera
    // opening for the visit can take most of a second, and the transformation keeps to the sting's time, coming in
    // late rather than late on the drop): a moment with less than half a second left is left alone (it would only
    // blink).
    acao(id, now, extra) {
      if (id !== "lance" || st.lance) return
      const resta = extra?.ate != null ? extra.ate - Date.now() : LANCE_MS
      if (!(resta >= 500)) return
      const ja = extra?.desde != null ? clamp(Date.now() - extra.desde, 0, 2000) : 0
      st.lance = { t0: now - ja, fim: now + resta, pousou: false }
      m.sacudir(350, 7, now)
    },
    quer: () => ({ rosto: true }),
    atualizar,
    desenhar(fase, R) {
      if (fase !== "atras" || st.amt <= 0.003) return
      const w = U.uW.value
      U.uW.value = 0
      R.renderer.render(plano, R.ortho)
      U.uW.value = w
      if (ret && st.vira > 0.001) R.renderer.render(ret.cena, R.ortho)
    },
    ocupado: () => !!st.lance && performance.now() < st.lance.fim,
    hud: () => `sigma ${st.amt.toFixed(2)} · retrato ${ret ? "ok" : "não"} · vira ${st.vira.toFixed(2)} · zoom ${st.zoom.toFixed(2)}${st.lance ? ` · lance até ${((st.lance.fim - performance.now()) / 1000).toFixed(1)} s` : ""}`,
    estado: { sigma: st },
  }
}
