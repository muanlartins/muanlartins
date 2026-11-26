// John Rocket League: Luan's alter ego (the name Exponja gave him; the art and its video posted by john_rocket_league in
// the Discord server, 2026-11-26): Luan shirtless and huge, curls, mustache and round glasses, holding up a white
// Champion emblem burning in purple fire. Luan, 2026-11-26: "uma versão sayajin do john rocket league", in the place
// of the Lance ruim's Sigma, and also on the Filtros dock's list to stay on.
//
// The art is a still (retrato.webp, its face's 478 points in retrato.json and mascaras.png beside it, all made by
// scripts/john_retrato.py). Luan's live face goes onto it: one mesh over the box as Sigma's, his face's points (MediaPipe's,
// carried to the frame), two rings round his face and a frame past the box's edges, triangulated once on the
// portrait's. His face keeps its own features (only its outline leans towards John's jaw), so he talks, blinks and
// makes faces as John. It's lit as the art is: the art's light blurred, times his face's detail (his picture over
// its own blur), so the purple from the emblem falls on his face. Round it, John's hair, body and fire.
// The still comes alive with code: the fire flickers (the art's own flames pushed about by flowing noise, more
// drawn over them), embers rise, the emblem glows; his eyes glow behind the glasses.
//
// As the Filtros dock's filter, he's John until another filter comes on: his face slides onto John's in place,
// then the picture opens out to the whole art. L (or a visit's lance) plays the power-up on top.
//
// The power-up (F2, the Efeitos dock's visit { filtro: "john", acao: "lance", ate, desde } in the Lance ruim's place,
// 6 s, on sons/john.wav: the video's own sound from 0.9 s, its hits at 1.15, 2.6 and 4.2 s): the camera goes purple,
// his face becomes John's in place, the hit throws the picture out to the whole art; his eyes catch fire, flare white,
// then orange like lasers on the second hit while the emblem's fire grows; on the third it bursts in a white flash
// and purple lightning runs over him in a burning aura; then back onto his face and his plain picture by `ate`. A
// shorter moment runs it all sooner. As the dock's filter, a lance plays only the power-up (he's John already).

export const filtros = [{ id: "john", nome: "John Rocket League", jogo: "Efeitos", rosto: "filtros/john/rosto.webp", teclas: { l: "lance" } }]

export async function criar(m) {
  const { THREE, GLSL_COMMON, GLSL_APAGAR, toScreen, W, H, FACE_OVAL } = m
  const V = THREE.Vector2
  const A = W / H
  const clamp = THREE.MathUtils.clamp
  const suave = (x) => {
    const t = clamp(x, 0, 1)
    return t * t * (3 - 2 * t)
  }
  const entre = (t, a, b) => suave((t - a) / (b - a))
  // The power-up's beats (s, for a 6 s moment), on the sound's hits.
  const D0 = 6
  const T = {
    entra: [0, 0.3], // the purple comes in
    vira: [0.25, 1.1], // his face becomes John's, in place
    abre: [1.15, 1.6], // first hit: out to the whole art
    acende: [1.6, 2.6], // his eyes catch fire
    laser: 2.6, // second hit: white, then orange
    carga: [2.6, 4.2], // the emblem's fire grows
    estoura: 4.2, // third hit: the burst, lightning, aura
    fecha: [5.2, 5.6], // back onto his face
    desvira: [5.45, 5.9], // and back to him
    sai: [5.75, 6], // the purple goes
  }
  // As the dock's filter: how it comes in (s), how much fire and eye glow while it stays.
  const CHEGA = 1.4
  const FOGO_BASE = 0.35
  const OLHO_BASE = 0.16
  // The portrait at its fullest: its eyes this high in the box (0 the bottom), unless that would show its edge.
  const OLHOS_EM = 0.6
  // His face's rings, as the oval scaled from its middle; the frame round it all, this far past the box.
  const ANEIS = [1.4, 2.1]
  const BORDA = 0.3
  // How far his face's outline leans to John's (0 his, 1 John's), and how much of his roll John's face keeps.
  const CONTORNO = 0.55
  const MIOLO = 0.12
  const ROLA = 0.5

  const u = m.uniforms
  const U = {
    uCam: u.uCam, uMask: u.uMask, uCover: u.uCover, uTime: u.uTime, uAspect: u.uAspect,
    uErase: u.uErase, uFace: u.uFace, uFaceUp: u.uFaceUp, uPlate: u.uPlate, uPlateFix: u.uPlateFix, uPlateOk: u.uPlateOk,
    uMaskShift: u.uMaskShift, uEraseLow: u.uEraseLow, uMem: u.uMem, uKeep: u.uKeep,
    uRet: { value: null },
    uMasc: { value: null },
    uAp: { value: 1.34 },
    uEmb: { value: new V(0.35, 0.68) },
    // The purple on the camera, the portrait's share, his face on it, the flash.
    uAmt: { value: 0 },
    uW: { value: 0 },
    uRosto: { value: 0 },
    uFlash: { value: 0 },
    // The fire, the emblem's charge, s since the burst (-1 none), the lightning, the aura.
    uFogo: { value: 0 },
    uCarga: { value: 0 },
    uEstouro: { value: -1 },
    uRaio: { value: 0 },
    uAura: { value: 0 },
    // His eyes on the box (0..1, y up), their glow's size (box heights), how much and what colour.
    uOlhoE: { value: new V(0.45, 0.6) },
    uOlhoD: { value: new V(0.55, 0.6) },
    uOlhoTam: { value: 0.02 },
    uOlho: { value: 0 },
    uOlhoCor: { value: new THREE.Color(0.7, 0.35, 1) },
    // His face's blur on the camera, in box heights (for its detail).
    uBorrao: { value: 0.03 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aLive;
      attribute vec2 aPort;
      attribute float aMix;
      varying vec2 vLive, vPort, vPos, vUv;
      varying float vMix;
      void main() {
        vLive = aLive;
        vPort = aPort;
        vMix = aMix;
        vPos = position.xy * 0.5 + 0.5;
        vUv = vPos;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      ${GLSL_APAGAR}
      uniform sampler2D uRet, uMasc;
      uniform vec3 uOlhoCor;
      uniform vec2 uEmb, uOlhoE, uOlhoD;
      uniform float uAp, uAmt, uW, uRosto, uFlash, uFogo, uCarga, uEstouro, uRaio, uAura, uOlhoTam, uOlho, uBorrao;
      varying vec2 vLive, vPort, vPos;
      varying float vMix;
      const vec3 ROXO = vec3(0.62, 0.3, 1.0);
      vec3 cam(vec2 p) { return apagarCabelo(texture2D(uCam, camUv(p)).rgb, p).rgb; }
      // The camera in the art's light: its brightness, purple, a little of his own colour kept.
      vec3 roxo(vec3 c) {
        float y = smoothstep(0.03, 0.95, lum(c));
        return mix(c, vec3(0.6, 0.42, 0.92) * y * 1.1 + vec3(0.025, 0.0, 0.05), 0.72);
      }
      // Embers: a few bright specks in each cell of a grid climbing the picture, twinkling.
      float brasas(vec2 q, float t) {
        vec2 g = q * vec2(30.0, 20.0) + vec2(0.0, -t * 2.6);
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float h = hash2(id);
        vec2 o = vec2(hash2(id + 7.1), hash2(id + 3.3)) - 0.5;
        float tw = 0.5 + 0.5 * sin(t * 7.0 + h * 40.0);
        return step(0.84, h) * tw * smoothstep(0.11, 0.0, length(f - o * 0.6));
      }
      void main() {
        vec3 vivo = cam(vLive);
        vec3 col = roxo(vivo);
        float t = uTime;
        if (uW > 0.001) {
          vec2 p = vPort;
          vec3 mk = texture2D(uMasc, p).rgb;
          // The art's own flames pushed about, up and sideways, by flowing noise.
          vec2 fl = vec2(noise(p * vec2(9.0, 5.0) + vec2(0.0, -t * 2.2)), noise(p * vec2(7.0, 4.0) + vec2(3.1, -t * 2.8))) - 0.5;
          p += fl * vec2(0.012, 0.02) * mk.r * (0.6 + uFogo + uCarga);
          vec3 r = texture2D(uRet, p).rgb;
          vec2 q = vPort * vec2(uAp, 1.0);
          // More flames over them: the fire's mask spread out, cut by noise rising through it.
          float zona = textureLod(uMasc, vPort, 3.5).r;
          float fn = fbm(vec2(q.x * 6.0, q.y * 3.5) + vec2(0.0, -t * 1.7));
          float chama = smoothstep(0.42, 0.85, fn + zona * 0.7 - 0.3) * zona;
          r += ROXO * chama * (0.4 * uFogo + 1.4 * uCarga);
          // The emblem lit from inside, flickering.
          r += vec3(0.78, 0.62, 1.0) * mk.g * (0.12 * uFogo + 0.9 * uCarga) * (0.85 + 0.15 * sin(t * 11.0));
          // Embers round the fire (and everywhere in the aura).
          float perto = textureLod(uMasc, vPort, 5.5).r * 2.5;
          float corpo = textureLod(uMasc, vPort, 4.0).b * 0.5 + textureLod(uMasc, vPort, 5.0).b * 0.5;
          float aura = clamp(corpo * 1.6 - mk.b, 0.0, 1.0);
          r += vec3(1.0, 0.45, 0.6) * brasas(q, t) * clamp(perto * (uFogo + uCarga) + aura * uAura, 0.0, 1.0) * 1.3;
          // The aura: flames climbing just outside him.
          float an = fbm(vec2(q.x * 9.0, q.y * 4.0 - t * 2.4));
          r += ROXO * aura * smoothstep(0.3, 0.8, an) * uAura * 1.5;
          // Lightning over him: ridges of noise, thin, jumping a few times a second.
          if (uRaio > 0.001) {
            float salto = floor(t * 9.0);
            vec2 rq = q * vec2(7.0, 5.0) + vec2(hash(salto) * 9.0, hash(salto + 1.3) * 9.0);
            float rr = 1.0 - abs(2.0 * fbm(rq) - 1.0);
            float liga = step(0.35, hash(salto + 2.7));
            r += vec3(0.85, 0.65, 1.0) * pow(rr, 28.0) * mk.b * uRaio * 2.4 * liga;
          }
          // The burst: a white core swelling and dying, a ring racing out, sparks along rays.
          if (uEstouro >= 0.0) {
            float e = uEstouro;
            vec2 de = (vPort - uEmb) * vec2(uAp, 1.0);
            float dd = length(de);
            float nucleo = exp(-dd / (0.04 + 0.35 * e)) * exp(-e * 2.2) * 2.6;
            float anel = exp(-pow((dd - e * 1.1) / 0.035, 2.0)) * exp(-e * 2.5);
            float raio = pow(hash(floor(atan(de.y, de.x) * 18.0)), 8.0) * smoothstep(e * 1.4, 0.0, dd) * exp(-e * 3.0);
            r += vec3(0.95, 0.85, 1.0) * nucleo + ROXO * anel * 1.5 + vec3(1.0, 0.7, 0.9) * raio * 1.2;
          }
          // Its edges fade into the purple camera, so no straight line shows while it's smaller than the box.
          vec2 d = smoothstep(vec2(0.0), vec2(0.04), vPort) * smoothstep(vec2(1.0), vec2(0.96), vPort);
          r = mix(col, r, d.x * d.y);
          // His face, lit as the art: the art's light blurred, times his picture over its own blur.
          float k = vMix * uRosto;
          if (k > 0.001) {
            float lb = lum(vivo) * 0.2;
            for (int i = 0; i < 8; i++) {
              float a = float(i) * 0.7854;
              vec2 o = vec2(cos(a) / uAspect, sin(a)) * uBorrao;
              lb += lum(cam(vLive + o)) * 0.07 + lum(cam(vLive + o * 0.5)) * 0.03;
            }
            vec3 luz = textureLod(uRet, vPort, 4.5).rgb;
            // (The detail a little stronger: a webcam's face is soft once it's John's size.)
            vec3 rosto = luz * clamp(pow(lum(vivo) / max(lb, 0.02), 1.25), 0.2, 2.4);
            rosto = mix(rosto, roxo(vivo), 0.12);
            r = mix(r, rosto, k);
          }
          col = mix(col, r, uW);
        }
        // His eyes: a hot core, a halo and a flare across.
        if (uOlho > 0.001) {
          vec2 a = vec2(uAspect, 1.0);
          float g = 0.0;
          for (int i = 0; i < 2; i++) {
            vec2 dv = (vPos - (i == 0 ? uOlhoE : uOlhoD)) * a / uOlhoTam;
            float dl = length(dv);
            g += exp(-dl * dl * 2.5) * 1.4 + exp(-dl * 0.9) * 0.45 + exp(-abs(dv.y) * 7.0) * exp(-abs(dv.x) * 0.22) * 0.5;
          }
          col += uOlhoCor * g * uOlho;
          col += vec3(1.0) * smoothstep(1.0, 2.0, g) * uOlho * 0.6;
        }
        col = mix(col, vec3(1.0), uFlash);
        gl_FragColor = vec4(mix(cam(vPos), col, uAmt), 1.0);
      }`,
  })
  const geometria = (pos, live, port, mix, indice) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aLive", new THREE.BufferAttribute(live, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aPort", new THREE.BufferAttribute(port, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("aMix", new THREE.BufferAttribute(mix, 1))
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
  // The camera alone, purple, straight over the box.
  const uv4 = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
  const plano = cena(geometria(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), uv4, uv4.slice(), new Float32Array(4), [0, 1, 2, 0, 2, 3]))

  // The portrait: in its own space x across (0..its aspect) and y up (0..1), like the box's (0..A, 0..1).
  let ret = null
  try {
    const carrega = (nome) => new THREE.TextureLoader().loadAsync(new URL(nome, import.meta.url).href)
    const [dados, tex, masc, { default: Delaunator }] = await Promise.all([
      fetch(new URL("./retrato.json", import.meta.url)).then((r) => r.json()),
      carrega("./retrato.webp"),
      carrega("./mascaras.png"),
      import("https://cdn.jsdelivr.net/npm/delaunator@5.0.1/+esm"),
    ])
    for (const t of [tex, masc]) {
      t.colorSpace = THREE.NoColorSpace
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.generateMipmaps = true
    }
    tex.anisotropy = 4
    U.uRet.value = tex
    U.uMasc.value = masc
    const Ap = dados.w / dados.h
    U.uAp.value = Ap
    U.uEmb.value.set(dados.emblema[0], 1 - dados.emblema[1])
    const pts = dados.pontos.map(([x, y]) => new V(x * Ap, 1 - y))
    const N = pts.length
    const pl = pts[33].clone().add(pts[133]).multiplyScalar(0.5)
    const pr = pts[362].clone().add(pts[263]).multiplyScalar(0.5)
    const pe = pl.clone().add(pr).multiplyScalar(0.5)
    const dP = pr.clone().sub(pl)
    // Its fullest framing: as wide as the box (or as tall), eyes at OLHOS_EM, never past its edges.
    const s1 = Math.max(A / Ap, 1)
    const c1 = new V(A / 2 + s1 * (pe.x - Ap / 2), clamp(OLHOS_EM, 1 - s1 * (1 - pe.y), s1 * pe.y))
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
    moldura.forEach((f, k) => porto[N + NA + k].copy(f).sub(c1).multiplyScalar(1 / s1).add(pe))
    const tri = new Delaunator(porto.flatMap((p) => [p.x, p.y])).triangles
    const port = new Float32Array(NT * 2)
    porto.forEach((p, i) => port.set([p.x / Ap, p.y], i * 2))
    // Each face point: how far out it is (0 the oval's middle, 1 on it), which sets how much of him shows there
    // and how far it leans to John's outline.
    const meio = new V()
    for (const i of FACE_OVAL) meio.add(pts[i])
    meio.multiplyScalar(1 / FACE_OVAL.length)
    const ovalR = FACE_OVAL.reduce((s, i) => s + pts[i].distanceTo(meio), 0) / FACE_OVAL.length
    const fora = pts.map((p) => p.distanceTo(meio) / ovalR)
    const mix = new Float32Array(NT)
    const molde = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      mix[i] = 1 - suave((fora[i] - 0.72) / 0.28)
      molde[i] = MIOLO + (CONTORNO - MIOLO) * suave((fora[i] - 0.55) / 0.45)
    }
    for (const i of FACE_OVAL) mix[i] = 0
    const g = geometria(new Float32Array(NT * 3), new Float32Array(NT * 2), port, mix, Array.from(tri))
    ret = { Ap, N, NA, NT, pe, dP, s1, c1, moldura, porto, molde, g, cena: cena(g), ele: Array.from({ length: NT }, () => new V()), nele: Array.from({ length: N }, () => new V()) }
  } catch (e) {
    m.fail?.("john", e)
  }
  function aneis(p, k) {
    const meio = new V()
    for (const i of FACE_OVAL) meio.add(p[i])
    meio.multiplyScalar(1 / FACE_OVAL.length)
    for (const f of ANEIS) for (const i of FACE_OVAL) p[k++].copy(p[i]).sub(meio).multiplyScalar(f).add(meio)
  }

  // base: how far in as the dock's filter (0..1); lance: the power-up on the page's clock (t0, fim, batidas já dadas).
  const st = { base: 0, amt: 0, vira: 0, zoom: 0, rosto: 0, lance: null }
  const sobre = { s: 0.075 / Math.max(ret?.dP.length() ?? 1, 1e-6), a: 0, c: new V(0.5 * A, 0.58) }
  const ROXO_OLHO = new THREE.Color(0.68, 0.32, 1)
  const BRANCO = new THREE.Color(1, 0.95, 1)
  const LARANJA = new THREE.Color(1, 0.55, 0.15)

  // The power-up now: its time (s, scaled to a 6 s moment) and whether it plays the way in and out.
  function lanceEm(now) {
    const L = st.lance
    if (!L || now >= L.fim) return null
    const D = (L.fim - L.t0) / 1000
    const f = Math.min(1, D / D0)
    return { t: (now - L.t0) / 1000 / f, f, inteiro: L.inteiro }
  }

  const q = new V()
  const r = new V()
  function atualizar(now, dt) {
    const L = lanceEm(now)
    if (st.lance && !L) st.lance = null
    // As the dock's filter it comes in and stays; on a visit, only for the moment.
    const alvo = m.deVisita ? 0 : 1
    st.base = alvo > st.base ? Math.min(alvo, st.base + dt / CHEGA) : Math.max(alvo, st.base - dt / 0.5)
    let amt = st.base > 0 ? 1 : 0
    let vira = suave(st.base / 0.45)
    let zoom = suave((st.base - 0.35) / 0.65)
    let fogo = FOGO_BASE * suave(st.base)
    let olho = OLHO_BASE * suave((st.base - 0.6) / 0.4) * (0.8 + 0.2 * Math.sin(now / 420))
    let carga = 0
    let estouro = -1
    let raio = 0
    let aura = 0
    let flash = 0
    const cor = ROXO_OLHO.clone()
    if (L) {
      const t = L.t
      if (L.inteiro) {
        amt = entre(t, ...T.entra) * (1 - entre(t, ...T.sai))
        vira = entre(t, ...T.vira) * (1 - entre(t, ...T.desvira))
        zoom = entre(t, ...T.abre) ** 1.5 * (1 - entre(t, ...T.fecha))
        fogo = FOGO_BASE * vira
      }
      const fim = 1 - entre(t, T.fecha[0] - 0.2, T.fecha[1])
      // The eyes: lit, a white flare on the second hit, orange, then a hot purple.
      const acende = entre(t, ...T.acende)
      const dl = t - T.laser
      let o = 0.25 + 0.55 * acende
      if (dl >= 0) {
        o = 1.1 + 0.9 * Math.exp(-dl * 4)
        if (dl < 0.3) cor.copy(BRANCO)
        else if (dl < 1.1) cor.copy(BRANCO).lerp(LARANJA, suave((dl - 0.3) / 0.25))
        else cor.copy(LARANJA).lerp(ROXO_OLHO, suave((dl - 1.1) / 0.5))
      }
      olho = Math.max(olho, o * fim)
      carga = entre(t, ...T.carga) * (t < T.estoura ? 1 : Math.exp(-(t - T.estoura) * 3)) * fim
      const de = t - T.estoura
      if (de >= 0) {
        estouro = de * L.f
        raio = suave(de / 0.15) * fim
        aura = suave(de / 0.3) * fim
        flash = 0.7 * Math.exp(-de * 7)
        fogo = Math.max(fogo, (FOGO_BASE + 0.6) * fim)
      }
      // The hits: the picture shaken once each.
      const B = st.lance.batidas
      for (const [k, tb, ms, px] of [[0, T.abre[0], 320, 8], [1, T.laser, 380, 10], [2, T.estoura, 650, 18]]) {
        if (!B[k] && t >= tb) {
          B[k] = true
          m.sacudir(ms, px, now)
        }
      }
      if (t >= T.abre[0]) flash = Math.max(flash, 0.35 * Math.exp(-(t - T.abre[0]) * 10) * (L.inteiro ? 1 : 0))
    }
    st.amt = amt
    st.vira = vira
    st.zoom = zoom
    U.uAmt.value = amt
    U.uW.value = suave((vira - 0.1) / 0.6)
    U.uFlash.value = flash * amt
    U.uFogo.value = fogo
    U.uCarga.value = carga
    U.uEstouro.value = estouro
    U.uRaio.value = raio
    U.uAura.value = aura
    U.uOlho.value = olho * amt
    U.uOlhoCor.value.copy(cor)
    const lm = m.faceLm
    const visto = !!(m.headSeen && lm && lm.length >= 478)
    if (amt <= 0.003 || !ret || vira <= 0.001) {
      U.uRosto.value = 0
      // Before the mesh: his eyes where they are on him (none while he's lost).
      if (visto) {
        for (const [i, o] of [[468, U.uOlhoE.value], [473, U.uOlhoD.value]]) {
          const [x, y] = toScreen(lm[i].x, lm[i].y)
          o.set(x, y)
        }
        U.uOlhoTam.value = Math.max(0.006, Math.hypot((U.uOlhoD.value.x - U.uOlhoE.value.x) * A, U.uOlhoD.value.y - U.uOlhoE.value.y) * 0.2)
      } else U.uOlho.value = 0
      return
    }
    // Where his points are on the box (A wide, 1 high), or, lost, where the portrait's would be on his face.
    st.rosto = visto ? Math.min(1, st.rosto + dt / 0.2) : Math.max(0, st.rosto - dt / 0.3)
    U.uRosto.value = st.rosto
    const P = (i, out) => {
      const [x, y] = toScreen(lm[i].x, lm[i].y)
      return out.set(x * A, y)
    }
    let dL = null
    let el = null
    if (visto) {
      el = P(33, new V()).add(P(133, q)).multiplyScalar(0.5)
      const er = P(362, new V()).add(P(263, q)).multiplyScalar(0.5)
      dL = er.clone().sub(el)
      const a = Math.atan2(dL.y, dL.x) - Math.atan2(ret.dP.y, ret.dP.x)
      sobre.s = dL.length() / ret.dP.length()
      sobre.a = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -0.6, 0.6)
      sobre.c.copy(el).add(er).multiplyScalar(0.5)
    }
    // The portrait's place now: from on his face to its fullest (a slow push in while the power-up burns).
    const k = 1 + 0.05 * U.uAura.value
    const s = Math.exp(THREE.MathUtils.lerp(Math.log(sobre.s), Math.log(ret.s1 * k), zoom))
    const ang = THREE.MathUtils.lerp(sobre.a, 0, zoom)
    const c = sobre.c.clone().lerp(ret.c1, zoom)
    const [co, si] = [Math.cos(ang), Math.sin(ang)]
    const Tp = (p, out) => {
      const x = p.x - ret.pe.x
      const y = p.y - ret.pe.y
      return out.set(c.x + s * (co * x - si * y), c.y + s * (si * x + co * y))
    }
    const Tinv = (p, out) => {
      const x = (p.x - c.x) / s
      const y = (p.y - c.y) / s
      return out.set(ret.pe.x + co * x + si * y, ret.pe.y - si * x + co * y)
    }
    const { N, NA, NT, ele, nele, porto, moldura, molde, g } = ret
    const n = visto ? Math.min(lm.length, N) : 0
    // His face in the portrait's space: his eyes on John's, keeping ROLA of his roll.
    if (visto) {
      const s0 = sobre.s
      const a0 = sobre.a * (1 - ROLA)
      const [c0, s0n] = [Math.cos(a0), Math.sin(a0)]
      for (let i = 0; i < n; i++) {
        P(i, q).sub(sobre.c)
        nele[i].set(ret.pe.x + (c0 * q.x + s0n * q.y) / s0, ret.pe.y + (-s0n * q.x + c0 * q.y) / s0)
      }
    }
    for (let i = 0; i < N; i++) {
      if (i < n) P(i, ele[i])
      else Tp(porto[i], ele[i])
    }
    if (visto) aneis(ele, N)
    else for (let j = N; j < N + NA; j++) Tp(porto[j], ele[j])
    const pos = g.attributes.position.array
    const live = g.attributes.aLive.array
    const port = g.attributes.aPort.array
    for (let i = 0; i < NT; i++) {
      if (i < N + NA) {
        // On John: his features where they are on his face, the outline leaning to John's jaw.
        if (i < n) r.copy(nele[i]).lerp(porto[i], molde[i])
        else r.copy(porto[i])
        Tp(r, q).lerp(ele[i], 1 - vira)
        live[i * 2] = ele[i].x / A
        live[i * 2 + 1] = ele[i].y
      } else {
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
    // His eyes where the mesh put them (the irises' middles), the glow's size from how far apart they are.
    const olhoEm = (i, out) => out.set((pos[i * 3] + 1) / 2, (pos[i * 3 + 1] + 1) / 2)
    olhoEm(468, U.uOlhoE.value)
    olhoEm(473, U.uOlhoD.value)
    const sep = Math.hypot((U.uOlhoD.value.x - U.uOlhoE.value.x) * A, U.uOlhoD.value.y - U.uOlhoE.value.y)
    U.uOlhoTam.value = Math.max(0.006, sep * 0.2)
    // His face's blur on the camera: about a fifth of the distance between his eyes.
    U.uBorrao.value = dL ? Math.max(0.006, dL.length() * 0.19) : U.uBorrao.value
  }

  return {
    ligar() {
      if (m.deVisita && !st.lance) st.base = 0
    },
    desligar() {
      Object.assign(st, { base: 0, amt: 0, vira: 0, zoom: 0, rosto: 0, lance: null })
      for (const k of ["uAmt", "uW", "uFlash", "uFogo", "uCarga", "uRaio", "uAura", "uOlho", "uRosto"]) U[k].value = 0
      U.uEstouro.value = -1
    },
    // The power-up (from a visit, with `ate`: the moment's end, Date.now()'s ms, and `desde` its start, so it keeps to
    // the sting's time when the page opens late): a moment with less than half a second left is left alone.
    acao(id, now, extra) {
      if (id !== "lance" || st.lance) return
      const resta = extra?.ate != null ? extra.ate - Date.now() : D0 * 1000
      if (!(resta >= 500)) return
      const ja = extra?.desde != null ? clamp(Date.now() - extra.desde, 0, 2000) : 0
      st.lance = { t0: now - ja, fim: now + resta, inteiro: !!m.deVisita || st.base < 0.5, batidas: [false, false, false] }
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
    hud: () => `john ${st.amt.toFixed(2)} · retrato ${ret ? "ok" : "não"} · vira ${st.vira.toFixed(2)} · zoom ${st.zoom.toFixed(2)} · rosto ${st.rosto.toFixed(2)}${st.lance ? ` · lance até ${((st.lance.fim - performance.now()) / 1000).toFixed(1)} s` : ""}`,
    estado: { john: st },
  }
}
