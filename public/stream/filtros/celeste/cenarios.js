// The chapter's own scenery behind Luan (index.js's "Clima do capítulo"), as the game draws it: its parallax
// backgrounds in their order, places and speeds, its snow, a few of its structures by the box's edges, and what it
// lays over everything (Forsaken City's purple sunset, added). Behind him only where he isn't (the body mask, and
// sharper where the camera shows NVIDIA Broadcast's background, `uPlate`), his logo in that background kept.
//
// It follows the game: the chapter's rooms each have their place in its map, so when he goes into another the
// backgrounds move as the game's do (the camera on the room, times each layer's scroll), the forest sinking and the
// city rising as he climbs; and they move a little with his head, as a camera that follows him would.
//
// The pictures are the installed game's, read by scripts/celeste_arte.py into public/stream/privado/celeste/fases/
// (<map>.png and .json: never committed or published). Without them the chapter keeps its plain mood.
// Everything is drawn in the game's own pixels: 180 of them up the box (320 across a 16:9 one), sampled one by one.

const CAMADAS = 8 // parallax layers at most, behind and over him together
const PECAS = 8 // structures at most

// Per chapter (the game's area sid) and side: the map, the mood id it's drawn over (index.js's AMBIENTES) and the
// structures (decals of the chapter's folder): [name or frames, x, y of their middle in the box's game pixels from
// its top left, { quadros: frames a second }]. Placed where the background shows round him, never by his face.
export const CENARIOS = {
  "Celeste/1-ForsakenCity": {
    lados: { A: "1-ForsakenCity" },
    clima: 12,
    pasta: "decals/1-forsakencity/",
    estruturas: [
      ["brazilian_coffee_building", 38, 146],
      ["brazilian_coffee_sign", 88, 122],
      ["royal_pizza_building", 296, 148],
      [["flag00", "flag01", "flag02", "flag03", "flag04"], 268, 100, { quadros: 9 }],
    ],
  },
}

// How far his head moves the camera: game pixels per box width (the layers then move by their scroll).
const SEGUE_CABECA = 150
// Structures move with his head as a layer of this scroll would.
const ROLAGEM_PECAS = 0.25
// A room's change eases the camera over this long (s), as the game's transition.
const TRANSICAO = 0.7
// How much of the climb the layers follow: all of Forsaken City's would sink the city out of the box by its end.
const SUBIDA = 0.45

export const GLSL_CENA = /* glsl */ `
  uniform sampler2D uCenaTex;
  uniform float uCenaW, uCenaNF, uCenaNT, uCenaNE;
  uniform vec4 uCenaR[${CAMADAS}], uCenaP[${CAMADAS}], uCenaO[${CAMADAS}];
  uniform vec4 uPecaR[${PECAS}], uPecaP[${PECAS}];
  uniform vec2 uNeve;
  // A piece's pixel l (from its top left) in the packed picture.
  vec4 texel(vec4 r, vec2 l) { return texelFetch(uCenaTex, ivec2(r.xy + l), 0); }
  // Layer i at game pixel g (from the box's top left): straight colour and alpha.
  vec4 camada(int i, vec2 g) {
    vec4 r = uCenaR[i], p = uCenaP[i];
    vec2 l = g - p.xy;
    if (p.z > 0.5) l.x = mod(l.x, r.z);
    if (uCenaO[i].y > 0.5) l.y = mod(l.y, r.w);
    if (l.x < 0.0 || l.y < 0.0 || l.x >= r.z || l.y >= r.w) return vec4(0.0);
    vec4 c = texel(r, floor(l));
    c.a *= uCenaO[i].x;
    return c;
  }
  // Snow in the game's pixels: square flakes of tam pixels in cells of cel, falling at vel (pixels a second, y down)
  // and swaying by bal.
  float neve(vec2 g, float cel, vec2 vel, float bal, float tam, float dens, float seed) {
    vec2 q = (g - vel * uTime) / cel;
    vec2 id = floor(q);
    float h = hash2(id + seed);
    if (h > dens) return 0.0;
    vec2 f = fract(q) * cel;
    vec2 c = (0.3 + 0.4 * vec2(hash2(id + seed + 3.1), hash2(id + seed + 7.7))) * cel;
    c.x += sin(uTime * (0.9 + h) + h * 40.0) * bal;
    vec2 d = abs(f - c);
    return step(max(d.x, d.y), tam * 0.5);
  }
  // The chapter at this pixel: what's behind him (opaque), what's added over everything (the sunset) and what
  // passes in front of him (premultiplied).
  void cena(out vec3 fundo, out vec3 soma, out vec4 frente) {
    vec2 g = floor(vec2(vUv.x * uAspect, 1.0 - vUv.y) * 180.0) + 0.5;
    fundo = vec3(0.0);
    soma = vec3(0.0);
    frente = vec4(0.0);
    for (int i = 0; i < ${CAMADAS}; i++) {
      if (float(i) >= uCenaNF) break;
      vec4 c = camada(i, g);
      if (uCenaP[i].w > 0.5) fundo += c.rgb * c.a;
      else fundo = mix(fundo, c.rgb, c.a);
    }
    if (uNeve.x > 0.5) {
      fundo = mix(fundo, vec3(0.86, 0.9, 1.0), 0.5 * neve(g, 7.0, vec2(5.0, 11.0), 1.2, 1.0, 0.35, 1.0));
      fundo = mix(fundo, vec3(0.92, 0.95, 1.0), 0.75 * neve(g + 3.0, 11.0, vec2(8.0, 19.0), 1.8, 1.0, 0.3, 2.0));
    }
    for (int i = 0; i < ${PECAS}; i++) {
      if (float(i) >= uCenaNE) break;
      vec4 r = uPecaR[i], p = uPecaP[i];
      vec2 l = g - p.xy;
      if (l.x < 0.0 || l.y < 0.0 || l.x >= r.z || l.y >= r.w) continue;
      if (p.z > 0.5) l.x = r.z - 1.0 - l.x;
      vec4 c = texel(r, floor(l));
      fundo = mix(fundo, c.rgb, c.a);
    }
    if (uNeve.y > 0.5) {
      float a = neve(g, 23.0, vec2(14.0, 34.0), 3.0, 2.0, 0.32, 3.0) * 0.85;
      frente = vec4(vec3(a), a);
    }
    for (int i = 0; i < ${CAMADAS}; i++) {
      if (float(i) < uCenaNF) continue;
      if (float(i) >= uCenaNF + uCenaNT) break;
      vec4 c = camada(i, g);
      if (uCenaP[i].w > 0.5) soma += c.rgb * c.a;
      else frente = vec4(c.rgb * c.a, c.a) + frente * (1.0 - c.a);
    }
  }`

export function criarCena(m) {
  const { THREE } = m
  const u = {
    uCenaTex: { value: null },
    uCenaW: { value: 0 },
    uCenaNF: { value: 0 },
    uCenaNT: { value: 0 },
    uCenaNE: { value: 0 },
    uCenaR: { value: Array.from({ length: CAMADAS }, () => new THREE.Vector4()) },
    uCenaP: { value: Array.from({ length: CAMADAS }, () => new THREE.Vector4()) },
    uCenaO: { value: Array.from({ length: CAMADAS }, () => new THREE.Vector4()) },
    uPecaR: { value: Array.from({ length: PECAS }, () => new THREE.Vector4()) },
    uPecaP: { value: Array.from({ length: PECAS }, () => new THREE.Vector4()) },
    uNeve: { value: new THREE.Vector2() },
  }
  // Each map as it loads: null while loading, false when it can't (no pictures), else { idx, tex, camadas }.
  const mapas = {}
  const cam = { x: 0, y: 0, de: null, para: null, t0: 0, sala: null, mapa: null, ultimo: null, cabeca: 0.5 }

  function carregar(nome) {
    mapas[nome] = null
    const base = `privado/celeste/fases/${nome}`
    Promise.all([
      fetch(`${base}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
      new THREE.TextureLoader().loadAsync(`${base}.png`),
    ])
      .then(([idx, tex]) => {
        tex.flipY = false
        tex.generateMipmaps = false
        tex.minFilter = tex.magFilter = THREE.NearestFilter
        tex.colorSpace = THREE.NoColorSpace
        tex.needsUpdate = true
        const camadas = (lista) => lista.filter((e) => e.tipo === "parallax" && idx.pecas[e.texture])
        const fundos = camadas(idx.fundos).slice(0, CAMADAS)
        const frentes = camadas(idx.frentes).slice(0, CAMADAS - fundos.length)
        const neve = [idx.fundos.some((e) => /^snow/i.test(e.tipo)), idx.frentes.some((e) => /^snow/i.test(e.tipo))]
        mapas[nome] = { idx, tex, fundos, frentes, neve }
      })
      .catch((e) => {
        mapas[nome] = false
        console.warn(`cenário ${nome}: ${e?.message || e}`)
      })
  }

  // The chapter's map for this state, or null.
  function mapaDe(e) {
    const c = e?.onde === "nivel" ? e.capitulo : null
    const cfg = c && CENARIOS[c.sid]
    const nome = cfg?.lados[c.lado || "A"]
    return nome ? { nome, cfg } : null
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

  return {
    uniforms: u,
    // The mood id to draw for this state: the scene's once its pictures are in, else null (the plain mood).
    clima(e) {
      const q = mapaDe(e)
      if (!q) return null
      if (!(q.nome in mapas)) carregar(q.nome)
      return mapas[q.nome] ? q.cfg.clima : null
    },
    // Each frame: w is how much the scene's mood shows (the crossfade, the ambient's fade), face the face's middle on
    // the box (uv).
    atualizar(now, dt, e, w, face) {
      // Out of the level (its end, the menus) the last one fades out with the mood.
      let q = mapaDe(e)
      if (q) cam.ultimo = q
      else if (w > 0.001) q = cam.ultimo
      const mp = q && mapas[q.nome]
      u.uCenaW.value = mp ? w : 0
      if (!mp || w <= 0.001) {
        if (!mp) cam.mapa = null
        return
      }
      const { idx, fundos, frentes, neve } = mp
      u.uCenaTex.value = mp.tex
      // The camera on the room he's in (its middle), eased from the one before; at once on a new map.
      const W = 180 * (m.W / m.H)
      const nomeSala = e?.capitulo?.sala ?? cam.sala
      const sala = idx.salas[nomeSala]
      const alvo = sala ? { x: sala[0] + sala[2] / 2 - W / 2, y: sala[1] + sala[3] / 2 - 90 } : cam.para || { x: 0, y: 0 }
      if (cam.mapa !== q.nome) Object.assign(cam, { mapa: q.nome, x: alvo.x, y: alvo.y, de: null, para: alvo, sala: nomeSala })
      else if (nomeSala !== cam.sala && sala) Object.assign(cam, { de: { x: cam.x, y: cam.y }, para: alvo, t0: now, sala: nomeSala })
      if (cam.de) {
        const k = Math.min(1, (now - cam.t0) / 1000 / TRANSICAO)
        cam.x = cam.de.x + (cam.para.x - cam.de.x) * ease(k)
        cam.y = cam.de.y + (cam.para.y - cam.de.y) * ease(k)
        if (k >= 1) cam.de = null
      }
      // His head, eased: the camera follows it a little.
      if (face) cam.cabeca += (face.x - cam.cabeca) * (1 - Math.exp(-dt / 0.35))
      const dx = (cam.cabeca - 0.5) * SEGUE_CABECA
      const t = now / 1000
      const tam = (nome) => idx.pecas[nome]
      ;[...fundos, ...frentes].forEach((c, i) => {
        const r = tam(c.texture)
        u.uCenaR.value[i].set(...r)
        const sx = c.scrollx ?? 1, sy = c.scrolly ?? 1
        u.uCenaP.value[i].set(
          Math.floor((c.x ?? 0) + (c.speedx ?? 0) * t - (cam.x + dx) * sx),
          Math.floor((c.y ?? 0) + (c.speedy ?? 0) * t - cam.y * SUBIDA * sy),
          c.loopx === false ? 0 : 1,
          c.blendmode === "additive" ? 1 : 0,
        )
        u.uCenaO.value[i].set(c.alpha ?? 1, c.loopy ? 1 : 0, 0, 0)
      })
      u.uCenaNF.value = fundos.length
      u.uCenaNT.value = frentes.length
      u.uNeve.value.set(neve[0] ? 1 : 0, neve[1] ? 1 : 0)
      let n = 0
      for (const [nome, x, y, o] of q.cfg.estruturas) {
        const quadro = Array.isArray(nome) ? nome[Math.floor(t * (o?.quadros ?? 8)) % nome.length] : nome
        const r = tam(q.cfg.pasta + quadro)
        if (!r || n >= PECAS) continue
        u.uPecaR.value[n].set(...r)
        u.uPecaP.value[n].set(Math.floor(x - r[2] / 2 - dx * ROLAGEM_PECAS), Math.floor(y - r[3] / 2), 0, 0)
        n++
      }
      u.uCenaNE.value = n
    },
    estado: { cam, mapas },
  }
}
