// The chapter's own scenery behind Luan (index.js's "Clima do capítulo"), as the game draws it: its parallax
// backgrounds in their order, places, speeds and colours, its effects (snow, wind, stars, rain, dust, the core's heat),
// a few of its structures by the box's edges, and what it lays over everything (a sunset added, a mist). Behind him
// only where he isn't (the body mask, and sharper where the camera shows NVIDIA Broadcast's background, `uPlate`), his
// logo in that background kept.
//
// It follows the game: the chapter's rooms each have their place in its map, so when he goes into another the
// backgrounds move as the game's do (the camera on the room, times each layer's scroll), the forest sinking and the
// city rising as he climbs; and they move a little with his head, as a camera that follows him would. Each layer shows
// only in the rooms the map gives it (`only`, `exclude`, a flag: the core's `cold` is its mode, the others are taken as
// unset) and fades in and out when he changes rooms, so a chapter's parts each have their own sky.
//
// The pictures are the installed game's, read by scripts/celeste_arte.py into public/stream/privado/celeste/fases/
// (<map>.png and .json: never committed or published). Without them the chapter keeps its plain mood.
// Everything is drawn in the game's own pixels: 180 of them up the box (320 across a 16:9 one), sampled one by one.

const CAMADAS = 24 // parallax layers at most at once, behind and over him together (the resort's roof has 18)
const PECAS = 10 // structures at most
const SONHOS = 2 // dream blocks at most

// Per chapter (the game's area sid): its sides' maps, the mood it's drawn over (index.js's AMBIENTES; left out, the
// chapter's own), the flags taken as set (`flags`: Reflection begins at dusk) and its structures (decals of `pasta`):
// [name, x, y of their middle in the box's game pixels from its top left, { quadros: frames a second, frio: the name
// in the core's cold mode, luz: brighter }]. A name ending in * is an animation, its frames the decals numbered after
// it. `sonho`: the old site's dream blocks, drawn as the game draws them, [x, y, w, h] in the same pixels. Placed where
// the background shows round him, never by his face.
function capitulo(mapa, cfg, ladosBC = true) {
  const lado = (l) => mapa.replace(/^(\d+)-/, `$1${l}-`)
  return { lados: ladosBC ? { A: mapa, B: lado("H"), C: lado("X") } : { A: mapa }, ...cfg }
}
export const CENARIOS = {
  "Celeste/0-Intro": capitulo(
    "0-Intro",
    { clima: 12, pasta: "decals/0-prologue/", estruturas: [["house", 22, 149], ["sign", 298, 144]] },
    false,
  ),
  "Celeste/1-ForsakenCity": capitulo("1-ForsakenCity", {
    clima: 12,
    pasta: "decals/1-forsakencity/",
    estruturas: [
      ["brazilian_coffee_building", 38, 146],
      ["brazilian_coffee_sign", 88, 122],
      ["royal_pizza_building", 296, 148],
      [["flag00", "flag01", "flag02", "flag03", "flag04"], 268, 100, { quadros: 9 }],
    ],
  }),
  "Celeste/2-OldSite": capitulo("2-OldSite", {
    pasta: "decals/2-oldsite/",
    sonho: [[-8, 116, 62, 72], [258, 30, 72, 42]],
    estruturas: [["chained_cage", 84, 34, { luz: 1.8 }], ["big_cage", 292, 160, { luz: 1.8 }], ["cloth_pole*", 302, 112, { quadros: 8, luz: 1.8 }]],
  }),
  "Celeste/3-CelestialResort": capitulo("3-CelestialResort", {
    pasta: "decals/3-resort/",
    estruturas: [
      ["curtain_side_a", 8, 32],
      ["curtain_side_d", 312, 32],
      ["chandelier_a", 52, 16],
      ["chandelier_b", 268, 16],
      ["fireplace*", 36, 164, { quadros: 10 }],
      ["granfather_clock*", 294, 156, { quadros: 6 }],
    ],
  }),
  "Celeste/4-GoldenRidge": capitulo("4-GoldenRidge", {
    pasta: "decals/4-cliffside/",
    estruturas: [["tree_a", 12, 104], ["rock_e", 262, 158], ["house_a", 302, 158]],
  }),
  "Celeste/5-MirrorTemple": capitulo("5-MirrorTemple", {
    pasta: "decals/5-temple/",
    estruturas: [["statue_f", 26, 118], ["bg_eye_a", 290, 38], ["crystal_c", 294, 150]],
  }),
  "Celeste/6-Reflection": capitulo("6-Reflection", {
    flags: ["duskbg"],
    pasta: "decals/6-reflection/",
    estruturas: [["crystal_reflection", 30, 134], ["top_vine_b", 280, 28], ["big_crystal_b", 300, 150]],
  }),
  "Celeste/7-Summit": capitulo("7-Summit", {
    pasta: "decals/7-summit/",
    estruturas: [["cloud_c", 18, 166], ["cloud_cd", 46, 168], ["cloud_bc", 4, 150], ["SummitFlag*", 294, 150, { quadros: 10 }]],
  }),
  "Celeste/8-Epilogue": capitulo(
    "8-Epilogue",
    {
      // Granny's cabin, the prologue's.
      pasta: "decals/",
      estruturas: [["0-prologue/house", 22, 149], ["8-epilogue/nest_back", 292, 142], ["8-epilogue/nest_front", 292, 142]],
    },
    false,
  ),
  "Celeste/9-Core": capitulo("9-Core", {
    pasta: "decals/9-core/",
    estruturas: [
      ["heart_sphere_a", 34, 30],
      ["capsule_b", 34, 150],
      ["stalagtite", 288, 22],
      ["ball_a", 296, 166, { frio: "ball_a_ice" }],
      ["rock_e", 258, 166, { frio: "rock_e_ice" }],
    ],
  }),
  "Celeste/LostLevels": capitulo(
    "LostLevels",
    {
      pasta: "decals/10-farewell/",
      estruturas: [["floating house", 44, 40], ["Car", 36, 150], ["creature_e*", 280, 36, { quadros: 8 }], ["ship", 294, 142]],
    },
    false,
  ),
}

// How far his head moves the camera: game pixels per box width (the layers then move by their scroll).
const SEGUE_CABECA = 150
// Structures move with his head as a layer of this scroll would.
const ROLAGEM_PECAS = 0.25
// A room's change eases the camera over this long (s), as the game's transition, and fades the layers it changes.
const TRANSICAO = 0.7
// How much of the climb the layers follow: all of Forsaken City's would sink the city out of the box by its end.
const SUBIDA = 0.45

// The game's effects this draws, by the styleground's name (lower case), behind (b) or in front (f): uFx's slots.
// 0 snow behind, 1 snow in front, 2 wind-blown snow in front, 3 behind, 4 stars (the sky, before any layer), 5 rain,
// 6 stardust, 7 the core's heat (embers rising; flakes falling when it's cold), 8 god rays (added light).
// The rest (the mirror's and the reflection's particles, the planets, the black hole…) aren't drawn.
const FX = {
  snowbg: () => 0,
  snowfg: () => 1,
  windsnow: (f) => (f ? 2 : 3),
  stars: () => 4,
  starfield: () => 4,
  bossstarfield: () => 4,
  corestarsfg: () => 4,
  rain: () => 5,
  stardust: () => 6,
  heatwave: () => 7,
  godrays: () => 8,
}
const NFX = 9
// The slots that are particles in front of him: with any, the mood's own (index.js) step aside.
const PARTICULAS = [1, 2, 5, 6, 7]

export const GLSL_CENA = /* glsl */ `
  uniform sampler2D uCenaTex;
  uniform float uCenaW, uCenaNF, uCenaNT, uCenaNE, uCenaPart, uFrio;
  uniform vec4 uCenaR[${CAMADAS}], uCenaP[${CAMADAS}], uCenaO[${CAMADAS}];
  uniform vec4 uPecaR[${PECAS}], uPecaP[${PECAS}];
  uniform vec4 uSonho[${SONHOS}];
  uniform float uCenaNS;
  uniform float uFx[${NFX}];
  uniform vec2 uVento;
  // A piece's pixel l (from its top left) in the packed picture.
  vec4 texel(vec4 r, vec2 l) { return texelFetch(uCenaTex, ivec2(r.xy + l), 0); }
  // Layer i at game pixel g (from the box's top left): straight colour (its tint applied) and alpha.
  vec4 camada(int i, vec2 g) {
    vec4 r = uCenaR[i], p = uCenaP[i], o = uCenaO[i];
    vec2 l = g - p.xy;
    if (p.z > 0.5) l.x = mod(l.x, r.z);
    if (o.y > 0.5) l.y = mod(l.y, r.w);
    if (l.x < 0.0 || l.y < 0.0 || l.x >= r.z || l.y >= r.w) return vec4(0.0);
    vec4 c = texel(r, floor(l));
    // The tint, packed as 0xRRGGBB in o.z (exact in a float).
    float t = o.z;
    vec3 tinta = vec3(floor(t / 65536.0), mod(floor(t / 256.0), 256.0), mod(t, 256.0)) / 255.0;
    return vec4(c.rgb * tinta, c.a * o.x);
  }
  // Square flakes of tam pixels (x by y) in cells of cel, moving at vel (pixels a second, y down) and swaying by bal.
  float floco(vec2 g, float cel, vec2 vel, float bal, vec2 tam, float dens, float seed) {
    vec2 q = (g - vel * uTime) / cel;
    vec2 id = floor(q);
    float h = hash2(id + seed);
    if (h > dens) return 0.0;
    vec2 f = fract(q) * cel;
    vec2 c = (0.3 + 0.4 * vec2(hash2(id + seed + 3.1), hash2(id + seed + 7.7))) * cel;
    c.x += sin(uTime * (0.9 + h) + h * 40.0) * bal;
    vec2 d = abs(f - c);
    return step(d.x, tam.x * 0.5) * step(d.y, tam.y * 0.5);
  }
  float neve(vec2 g, float cel, vec2 vel, float bal, float tam, float dens, float seed) {
    return floco(g, cel, vel, bal, vec2(tam), dens, seed);
  }
  // Stars of a pixel (a few with a cross), twinkling: brightness and how white.
  float estrela(vec2 g, float cel, float seed, out float cor) {
    vec2 id = floor(g / cel);
    float h = hash2(id + seed);
    cor = fract(h * 31.0);
    if (h > 0.32) return 0.0;
    vec2 c = floor((0.2 + 0.6 * vec2(hash2(id + seed + 1.3), hash2(id + seed + 4.1))) * cel) + 0.5;
    vec2 d = abs(mod(g, cel) - c);
    float s = step(max(d.x, d.y), 0.5);
    if (h < 0.06) s = max(s, step(d.x + d.y, 1.0) * 0.6);
    return s * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.7 + h * 6.0) + h * 90.0), 3.0));
  }
  // Rain: thin streaks falling fast and slanted.
  float chuva(vec2 g, float seed) {
    vec2 q = vec2(g.x + g.y * 0.25, g.y);
    float col = floor(q.x / 3.0);
    float h = hash(col + seed);
    if (h > 0.45) return 0.0;
    float y = mod(q.y - uTime * (260.0 + 120.0 * h) + h * 400.0, 70.0 + 50.0 * h);
    return step(abs(mod(q.x, 3.0) - 1.5), 0.5) * step(y, 7.0) * (0.35 + 0.4 * h);
  }
  void sobre(inout vec4 f, vec3 c, float a) { f = vec4(c * a, a) + f * (1.0 - a); }
  // The chapter at this pixel: what's behind him (opaque), what's added over everything (a sunset, the rays) and
  // what passes in front of him (premultiplied).
  void cena(out vec3 fundo, out vec3 soma, out vec4 frente) {
    vec2 g = floor(vec2(vUv.x * uAspect, 1.0 - vUv.y) * 180.0) + 0.5;
    fundo = vec3(0.0);
    soma = vec3(0.0);
    frente = vec4(0.0);
    float cor;
    if (uFx[4] > 0.0) {
      float s = max(estrela(g, 9.0, 1.0, cor), estrela(g + 4.0, 17.0, 2.0, cor) * 1.2);
      fundo += mix(vec3(0.62, 0.55, 1.0), vec3(1.0), cor) * min(s, 1.0) * uFx[4];
    }
    for (int i = 0; i < ${CAMADAS}; i++) {
      if (float(i) >= uCenaNF) break;
      vec4 c = camada(i, g);
      if (uCenaP[i].w > 0.5) fundo += c.rgb * c.a;
      else fundo = mix(fundo, c.rgb, c.a);
    }
    if (uFx[0] > 0.0) {
      fundo = mix(fundo, vec3(0.86, 0.9, 1.0), 0.5 * uFx[0] * neve(g, 7.0, vec2(5.0, 11.0), 1.2, 1.0, 0.35, 1.0));
      fundo = mix(fundo, vec3(0.92, 0.95, 1.0), 0.75 * uFx[0] * neve(g + 3.0, 11.0, vec2(8.0, 19.0), 1.8, 1.0, 0.3, 2.0));
    }
    vec2 tamV = vec2(1.0 + min(abs(uVento.x) / 90.0, 4.0), 1.0);
    if (uFx[3] > 0.0)
      fundo = mix(fundo, vec3(0.9, 0.93, 1.0), 0.7 * uFx[3] * floco(g, 9.0, uVento * 0.6, 1.0, tamV, 0.3, 6.0));
    for (int i = 0; i < ${PECAS}; i++) {
      if (float(i) >= uCenaNE) break;
      vec4 r = uPecaR[i], p = uPecaP[i];
      vec2 l = g - p.xy;
      if (l.x < 0.0 || l.y < 0.0 || l.x >= r.z || l.y >= r.w) continue;
      vec4 c = texel(r, floor(l));
      fundo = mix(fundo, c.rgb * p.z, c.a);
    }
    for (int i = 0; i < ${SONHOS}; i++) {
      if (float(i) >= uCenaNS) break;
      vec4 b = uSonho[i];
      // Its edges wave a pixel, as the game's.
      vec2 l = g - b.xy;
      float onda = floor(sin((l.x + l.y) * 0.35 + uTime * 3.0) * 1.2);
      float bx = min(l.x, b.z - l.x) + onda, by = min(l.y, b.w - l.y) + onda;
      float borda = min(bx, by);
      if (borda < 0.0) continue;
      // Inside: black with its stars in three depths, each with the game's colours, drifting with the camera.
      vec3 c = vec3(0.0);
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        vec2 q = g + vec2(uTime * (2.0 + fk * 2.0), 0.0) + fk * 13.0;
        float cel = 6.0 + fk * 3.0;
        vec2 id = floor(q / cel);
        float h = hash2(id + fk * 7.0 + 31.0);
        if (h > 0.62) continue;
        vec2 d = abs(mod(q, cel) - floor((0.25 + 0.5 * vec2(hash2(id + 3.0), hash2(id + 5.0))) * cel) - 0.5);
        float s = k == 2 ? step(d.x + d.y, 1.0) * step(min(d.x, d.y), 0.5) : step(max(d.x, d.y), 0.5);
        vec3 cor = fract(h * 6.0) < 0.33 ? (k == 0 ? vec3(1.0, 0.94, 0.07) : k == 1 ? vec3(0.37, 0.8, 0.89) : vec3(0.36, 0.43, 0.88))
          : fract(h * 6.0) < 0.66 ? (k == 0 ? vec3(1.0, 0.0, 0.82) : k == 1 ? vec3(0.5, 0.7, 0.37) : vec3(0.8, 0.23, 0.23))
          : (k == 0 ? vec3(0.03, 0.64, 0.06) : k == 1 ? vec3(0.88, 0.34, 0.3) : vec3(0.49, 0.67, 0.39));
        c = max(c, cor * s * (0.75 + 0.25 * sin(uTime * 2.0 + h * 40.0)));
      }
      fundo = borda < 1.0 ? vec3(1.0) : max(c, vec3(0.02, 0.02, 0.05));
    }
    if (uFx[1] > 0.0) sobre(frente, vec3(1.0), 0.85 * uFx[1] * neve(g, 23.0, vec2(14.0, 34.0), 3.0, 2.0, 0.32, 3.0));
    if (uFx[2] > 0.0) {
      sobre(frente, vec3(1.0), 0.8 * uFx[2] * floco(g, 19.0, uVento, 2.0, tamV * 2.0, 0.3, 7.0));
      sobre(frente, vec3(0.94, 0.96, 1.0), 0.6 * uFx[2] * floco(g + 7.0, 13.0, uVento * 0.8, 1.5, tamV, 0.3, 8.0));
    }
    if (uFx[5] > 0.0) sobre(frente, vec3(0.7, 0.78, 0.95), uFx[5] * chuva(g, 9.0));
    if (uFx[6] > 0.0) {
      float h = hash2(floor((g - vec2(6.0, -4.0) * uTime) / 15.0) + 10.0);
      vec3 c = h < 0.33 ? vec3(0.96, 0.5, 0.9) : h < 0.66 ? vec3(0.45, 0.9, 1.0) : vec3(0.75, 0.6, 1.0);
      float tw = 0.5 + 0.5 * sin(uTime * 3.0 + h * 50.0);
      sobre(frente, c, uFx[6] * tw * floco(g, 15.0, vec2(6.0, -4.0), 2.5, vec2(1.0), 0.4, 10.0));
    }
    if (uFx[7] > 0.0) {
      vec2 v = uFrio > 0.5 ? vec2(6.0, 18.0) : vec2(0.0, -26.0);
      vec3 c = uFrio > 0.5 ? vec3(0.85, 0.95, 1.0) : vec3(1.0, 0.55, 0.2);
      float fl = uFrio > 0.5 ? 0.8 : 0.6 + 0.4 * sin(uTime * 9.0 + g.x);
      sobre(frente, c, uFx[7] * fl * floco(g, 14.0, v, 3.0, vec2(1.0, uFrio > 0.5 ? 1.0 : 2.0), 0.35, 11.0));
    }
    for (int i = 0; i < ${CAMADAS}; i++) {
      if (float(i) < uCenaNF) continue;
      if (float(i) >= uCenaNF + uCenaNT) break;
      vec4 c = camada(i, g);
      if (uCenaP[i].w > 0.5) soma += c.rgb * c.a;
      else sobre(frente, c.rgb, c.a);
    }
    if (uFx[8] > 0.0) {
      float r = pow(max(0.0, sin(dot(g, vec2(0.035, 0.022)) + uTime * 0.25)), 10.0);
      r *= 0.5 + 0.5 * sin(dot(g, vec2(-0.011, 0.017)) - uTime * 0.13);
      soma += vec3(1.0, 0.94, 0.78) * r * 0.16 * uFx[8];
    }
  }`

// A room list's patterns ("a-*,b-00"), as the game's: * is anything.
function casa(nome, padroes) {
  return String(padroes ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .some((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`, "i").test(nome))
}
// A fade by the camera's place ("4776-7900,0-1", n for minus, : between segments): position → alpha factor.
function fader(s) {
  if (!s) return null
  const num = (v) => (v.startsWith("n") ? -parseFloat(v.slice(1)) : parseFloat(v))
  const seg = String(s)
    .split(":")
    .map((p) => {
      const [pos, a] = p.split(",")
      const [p0, p1] = pos.split("-").map(num)
      const [a0, a1] = a.split("-").map(num)
      return { p0, p1, a0, a1 }
    })
  return (x) =>
    seg.reduce((f, { p0, p1, a0, a1 }) => {
      const k = Math.min(1, Math.max(0, (x - p0) / (p1 - p0 || 1)))
      return f * (a0 + (a1 - a0) * k)
    }, 1)
}
// The map's tint ("8156e1", or a number: 0 is black) as 0xRRGGBB.
function tinta(c) {
  if (c == null || c === "") return 0xffffff
  const n = typeof c === "number" ? c : parseInt(String(c), 16)
  return Number.isFinite(n) ? n & 0xffffff : 0xffffff
}

export function criarCena(m) {
  const { THREE } = m
  const u = {
    uCenaTex: { value: null },
    uCenaW: { value: 0 },
    uCenaNF: { value: 0 },
    uCenaNT: { value: 0 },
    uCenaNE: { value: 0 },
    uCenaPart: { value: 0 },
    uFrio: { value: 0 },
    uCenaR: { value: Array.from({ length: CAMADAS }, () => new THREE.Vector4()) },
    uCenaP: { value: Array.from({ length: CAMADAS }, () => new THREE.Vector4()) },
    uCenaO: { value: Array.from({ length: CAMADAS }, () => new THREE.Vector4()) },
    uPecaR: { value: Array.from({ length: PECAS }, () => new THREE.Vector4()) },
    uPecaP: { value: Array.from({ length: PECAS }, () => new THREE.Vector4()) },
    uSonho: { value: Array.from({ length: SONHOS }, () => new THREE.Vector4()) },
    uCenaNS: { value: 0 },
    uFx: { value: new Array(NFX).fill(0) },
    uVento: { value: new THREE.Vector2(30, 10) },
  }
  // Each map as it loads: null while loading, false when it can't (no pictures), else { idx, tex, lista }.
  const mapas = {}
  const cam = { x: 0, y: 0, de: null, para: null, t0: 0, sala: null, mapa: null, ultimo: null, cabeca: 0.5 }

  // The map's stylegrounds this draws, in its order (behind, then in front), each with the rooms it shows in.
  function preparar(idx) {
    const salas = Object.keys(idx.salas)
    const lista = (l, frente) =>
      l
        .map((e) => {
          const fx = FX[String(e.tipo).toLowerCase()]
          const tipo = e.tipo === "parallax" ? (idx.pecas[e.texture] ? "camada" : null) : fx ? fx(frente) : null
          if (tipo == null) return null
          const onde = salas.filter((s) => casa(s, e.only ?? "*") && !casa(s, e.exclude))
          return { ...e, frente, tipo, salas: new Set(onde), tinta: tinta(e.color), fx: fader(e.fadex), fy: fader(e.fadey), v: 0 }
        })
        .filter(Boolean)
    return [...lista(idx.fundos, false), ...lista(idx.frentes, true)]
  }

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
        mapas[nome] = { idx, tex, lista: preparar(idx) }
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

  // A structure's frame now: its name, the frames of an animation (`*`, or a list), the core's cold one.
  function quadroDe(idx, pasta, nome, o, t, frio) {
    if (frio && o?.frio) nome = o.frio
    let quadros = Array.isArray(nome) ? nome : null
    if (!quadros && nome.endsWith("*")) {
      const raiz = pasta + nome.slice(0, -1)
      idx.animacoes ??= {}
      quadros = idx.animacoes[raiz] ??= Object.keys(idx.pecas)
        .filter((k) => k.startsWith(raiz) && /^\d+$/.test(k.slice(raiz.length)))
        .sort()
        .map((k) => k.slice(pasta.length))
    }
    return quadros ? quadros[Math.floor(t * (o?.quadros ?? 8)) % quadros.length] : nome
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

  return {
    uniforms: u,
    // This state's chapter config once its pictures are in (the mood to draw: its `clima`, else the chapter's own
    // over the scene), else null (the plain mood).
    cfg(e) {
      const q = mapaDe(e)
      if (!q) return null
      if (!(q.nome in mapas)) carregar(q.nome)
      return mapas[q.nome] ? q.cfg : null
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
      const { idx, lista } = mp
      u.uCenaTex.value = mp.tex
      // The camera on the room he's in (its middle), eased from the one before; at once on a new map.
      const W = 180 * (m.W / m.H)
      const nomeSala = e?.capitulo?.sala in idx.salas ? e.capitulo.sala : cam.sala in idx.salas ? cam.sala : Object.keys(idx.salas)[0]
      const sala = idx.salas[nomeSala]
      const alvo = { x: sala[0] + sala[2] / 2 - W / 2, y: sala[1] + sala[3] / 2 - 90 }
      const novo = cam.mapa !== q.nome
      if (novo) Object.assign(cam, { mapa: q.nome, x: alvo.x, y: alvo.y, de: null, para: alvo, sala: nomeSala })
      else if (nomeSala !== cam.sala) Object.assign(cam, { de: { x: cam.x, y: cam.y }, para: alvo, t0: now, sala: nomeSala })
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
      const frio = e?.nucleo === "frio"
      const flags = new Set([...(q.cfg.flags ?? []), ...(frio ? ["cold"] : [])])
      // Each styleground eases to whether it shows in this room (at once on a new map).
      const passo = novo ? 1 : Math.min(1, dt / TRANSICAO)
      const fx = new Array(NFX).fill(0)
      const atras = [], frente = []
      const cx = cam.x + W / 2, cy = cam.y + 90
      for (const c of lista) {
        const ve = c.salas.has(nomeSala) && (!c.flag || flags.has(c.flag)) && (!c.notflag || !flags.has(c.notflag))
        c.v += ((ve ? 1 : 0) - c.v) * passo
        if (c.v < 0.004) continue
        if (typeof c.tipo === "number") fx[c.tipo] = Math.max(fx[c.tipo], c.v)
        else (c.frente ? frente : atras).push(c)
      }
      const camadas = [...atras, ...frente].slice(0, CAMADAS)
      camadas.forEach((c, i) => {
        u.uCenaR.value[i].set(...idx.pecas[c.texture])
        const sx = c.scrollx ?? 1, sy = c.scrolly ?? 1
        u.uCenaP.value[i].set(
          Math.floor((c.x ?? 0) + (c.speedx ?? 0) * t - (cam.x + dx) * sx),
          Math.floor((c.y ?? 0) + (c.speedy ?? 0) * t - cam.y * SUBIDA * sy),
          c.loopx === false ? 0 : 1,
          c.blendmode === "additive" ? 1 : 0,
        )
        const fade = (c.fx ? c.fx(cx) : 1) * (c.fy ? c.fy(cy) : 1)
        u.uCenaO.value[i].set((c.alpha ?? 1) * fade * c.v, c.loopy ? 1 : 0, c.tinta, 0)
      })
      u.uCenaNF.value = Math.min(atras.length, CAMADAS)
      u.uCenaNT.value = camadas.length - u.uCenaNF.value
      fx.forEach((v, i) => (u.uFx.value[i] = v))
      u.uCenaPart.value = Math.max(...PARTICULAS.map((i) => fx[i]))
      u.uFrio.value = frio ? 1 : 0
      // The wind the game blows (pixels a second, y up) carries the wind-blown snow; a breeze without it.
      const [vx, vy] = e?.vento?.velocidade ?? e?.vento ?? [0, 0]
      const alvoV = [Math.max(-420, Math.min(420, (vx || 0) * 0.8 + 30)), 12 - (vy || 0) * 0.3]
      u.uVento.value.x += (alvoV[0] - u.uVento.value.x) * Math.min(1, dt * 2)
      u.uVento.value.y += (alvoV[1] - u.uVento.value.y) * Math.min(1, dt * 2)
      let n = 0
      for (const [nome, x, y, o] of q.cfg.estruturas) {
        const r = idx.pecas[q.cfg.pasta + quadroDe(idx, q.cfg.pasta, nome, o, t, frio)]
        if (!r || n >= PECAS) continue
        u.uPecaR.value[n].set(...r)
        u.uPecaP.value[n].set(Math.floor(x - r[2] / 2 - dx * ROLAGEM_PECAS), Math.floor(y - r[3] / 2), o?.luz ?? 1, 0)
        n++
      }
      u.uCenaNE.value = n
      const sonhos = (q.cfg.sonho ?? []).slice(0, SONHOS)
      sonhos.forEach(([x, y, w, h], i) => u.uSonho.value[i].set(Math.floor(x - dx * ROLAGEM_PECAS), y, w, h))
      u.uCenaNS.value = sonhos.length
    },
    estado: { cam, mapas },
  }
}
