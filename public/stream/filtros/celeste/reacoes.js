// What the filter does with the rest of what the game says (scripts/celeste-mod/README.md: `jogador.estado`,
// `velocidade`, `cansado`, `levando`, `vento`, `perseguindo`), while it follows the game. The moments (dash, death,
// strawberry, feather) are index.js's.
//
//   velocidade, vento   his long hair streams away from where she moves and along the wind (`empurra`)
//   cansado             he and his look flash red, as she does out of stamina
//   nado                the water's light on him, bubbles rising
//   bolha, -vermelha    the bubble round his head and shoulders, green or red
//   bloco-sonho         he's the dream block's dark with its coloured stars
//   levando             what follows her trails behind his head: strawberries, the golden one (he glows too), keys
//   perseguindo         as many dark echoes of him (three at most) a moment behind, as the Badelines that chase her
//
// None of it over a death's animation, nor with the game paused. `pintar` draws what's on him and his look: the two
// copies of the frame (before his look and after it) are index.js's, taken while `querLook`.

const ITENS = 6
const ECOS = [0.17, 0.32, 0.48] // seconds behind (the cutouts' history keeps about half a second)

export function criarReacoes(m, { histAt, PREMUL, uRosto, comLook }) {
  const { THREE, GLSL_COMMON, VERT, quad, faceBox, W, H } = m
  const { uCam, uMask, uCover, uTime, uAspect, uFace, uFaceUp } = m.uniforms
  const base = { uCam, uMask, uCover, uTime, uAspect, uFace, uFaceUp }
  const ASPECT = W / H
  const perto = (v, alvo, dt, vel) => v + (alvo - v) * Math.min(1, dt * vel)

  const nivel = { cansado: 0, agua: 0, sonho: 0, bolha: 0, dourado: 0 }
  const empurra = new THREE.Vector2()

  // ---------- on him ----------
  const neleU = {
    ...base,
    uRostoJ: { value: uRosto },
    uComLook: comLook,
    uLookA: { value: null },
    uLookB: { value: null },
    uCansado: { value: 0 },
    uAgua: { value: 0 },
    uSonho: { value: 0 },
    uBolha: { value: 0 },
    uBolhaCor: { value: new THREE.Color(0x58e08a) },
    uDourado: { value: 0 },
  }
  const nele = quad(
    new THREE.ShaderMaterial({
      uniforms: neleU,
      vertexShader: VERT,
      ...PREMUL,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        uniform vec4 uFace;
        uniform vec2 uFaceUp;
        uniform sampler2D uRostoJ, uLookA, uLookB;
        uniform float uComLook, uCansado, uAgua, uSonho, uBolha, uDourado;
        uniform vec3 uBolhaCor;
        float sorte(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void poe(inout vec4 o, vec3 c, float a) { o = vec4(c * a, a) + o * (1.0 - a); }
        void main() {
          vec2 asp = vec2(uAspect, 1.0);
          vec2 d = (vUv - uFace.xy) * asp;
          d = vec2(dot(d, vec2(uFaceUp.y, -uFaceUp.x)), dot(d, uFaceUp));
          // Him: his body, but round his head only his look and his face (not his erased hair).
          float zona = length(d / (vec2(max(uFace.z, uFace.w * 0.9), uFace.w) * vec2(2.6, 2.8)));
          float rosto = smoothstep(0.3, 0.7, texture2D(uRostoJ, vUv).r);
          float cabelo = uComLook * step(zona, 1.0) * step(-0.3 * uFace.w, d.y) * (1.0 - rosto);
          float look = smoothstep(0.05, 0.12, length(texture2D(uLookB, vUv).rgb - texture2D(uLookA, vUv).rgb));
          float ele = max(smoothstep(0.4, 0.6, maskAt(vUv, 0.0)) * (1.0 - cabelo), look);
          vec2 P = vUv * asp;
          vec4 o = vec4(0.0);
          if (uSonho > 0.003) {
            // The dream block's dark with its stars, his face still showing through.
            vec2 q = P * 38.0 + vec2(uTime * 0.6, uTime * 0.25), id = floor(q);
            float h = sorte(id);
            float estrela = step(0.72, h) * smoothstep(0.24, 0.1, length(fract(q) - 0.5 - 0.5 * (vec2(sorte(id + 3.1), sorte(id + 7.7)) - 0.5))) * (0.6 + 0.4 * sin(uTime * 5.0 + h * 40.0));
            vec3 cor = h < 0.8 ? vec3(1.0, 0.45, 0.75) : h < 0.88 ? vec3(0.4, 0.9, 1.0) : h < 0.95 ? vec3(1.0, 0.9, 0.4) : vec3(0.5, 1.0, 0.6);
            poe(o, mix(vec3(0.02, 0.02, 0.07), cor, estrela), ele * uSonho * (0.85 - 0.5 * rosto));
          }
          if (uAgua > 0.003) {
            float luz = smoothstep(0.82, 1.0, sin(P.x * 26.0 + sin(P.y * 19.0 + uTime * 2.0) * 2.0 + uTime));
            poe(o, mix(vec3(0.1, 0.45, 0.8), vec3(0.75, 0.95, 1.0), luz), ele * uAgua * (0.32 + 0.2 * luz));
            vec2 q = vec2(P.x * 9.0, P.y * 9.0 - uTime * 1.6), id = floor(q);
            float h = sorte(id), r = length(fract(q) - 0.5);
            float bolhinha = step(0.86, h) * smoothstep(0.03, 0.0, abs(r - 0.1 - 0.15 * fract(h * 7.0)));
            poe(o, vec3(0.85, 0.97, 1.0), bolhinha * uAgua * 0.8);
          }
          if (uDourado > 0.003) {
            float dentro = smoothstep(0.5, 0.95, maskAt(vUv, 1.8));
            float borda = ele * (1.0 - dentro);
            poe(o, vec3(1.0, 0.84, 0.3), uDourado * max(borda * 0.8, ele * 0.1) * (0.8 + 0.2 * sin(uTime * 4.0)));
          }
          // Out of stamina: red, on and off, as the game flashes her.
          if (uCansado > 0.003) poe(o, vec3(1.0, 0.12, 0.15), ele * uCansado * step(0.5, fract(uTime * 6.0)) * 0.5);
          if (uBolha > 0.003) {
            vec2 b = (vUv - uFace.xy) * asp / uFace.w - vec2(0.0, -0.5);
            float an = atan(b.y, b.x);
            float r = length(b) / (2.5 + 0.06 * sin(an * 5.0 + uTime * 8.0));
            float anel = smoothstep(0.045, 0.0, abs(r - 1.0));
            float brilho = smoothstep(0.06, 0.0, abs(r - 0.82)) * smoothstep(0.6, 0.9, sin(an - 0.8));
            poe(o, uBolhaCor, uBolha * max(step(r, 1.0) * (0.08 + 0.22 * r * r * r), anel * 0.9));
            poe(o, vec3(1.0), uBolha * brilho * 0.6);
          }
          if (o.a < 0.002) discard;
          gl_FragColor = o;
        }`,
    }),
  )

  // ---------- behind him: what follows her, who chases her ----------
  const atrasU = {
    ...base,
    uItens: { value: Array.from({ length: ITENS }, () => new THREE.Vector4()) },
    uTam: { value: 0.03 },
  }
  ECOS.forEach((_, i) => {
    atrasU[`uEco${i}`] = { value: null }
    atrasU[`uEcoA${i}`] = { value: 0 }
  })
  const atras = quad(
    new THREE.ShaderMaterial({
      uniforms: atrasU,
      vertexShader: VERT,
      ...PREMUL,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        ${ECOS.map((_, i) => `uniform sampler2D uEco${i}; uniform float uEcoA${i};`).join("\n        ")}
        uniform vec4 uItens[${ITENS}]; // x, y, how much it shows, what (0 strawberry, 1 golden, 2 key)
        uniform float uTam;
        void poe(inout vec4 o, vec3 c, float a) { o = vec4(c * a, a) + o * (1.0 - a); }
        void eco(inout vec4 o, sampler2D t, float a, float fora, float lado) {
          if (a < 0.003) return;
          vec2 uv = vUv - vec2(lado / uAspect, 0.012);
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0) return;
          vec4 c = texture2D(t, uv);
          float s = smoothstep(0.35, 0.65, c.a);
          poe(o, mix(vec3(0.12, 0.03, 0.22), vec3(0.62, 0.3, 0.8), smoothstep(0.1, 0.8, lum(c.rgb))), s * a * fora);
        }
        void main() {
          float fora = 1.0 - smoothstep(0.35, 0.6, maskAt(vUv, 0.0));
          vec4 o = vec4(0.0);
          eco(o, uEco2, uEcoA2, fora, 0.2);
          eco(o, uEco1, uEcoA1, fora, -0.15);
          eco(o, uEco0, uEcoA0, fora, 0.1);
          for (int i = ${ITENS - 1}; i >= 0; i--) {
            vec4 it = uItens[i];
            if (it.z < 0.01) continue;
            vec2 p = (vUv - it.xy) * vec2(uAspect, 1.0) / (uTam * it.z);
            if (dot(p, p) > 6.0) continue;
            if (it.w > 1.5) {
              float cabo = smoothstep(0.2, 0.12, abs(length(p - vec2(0.0, 0.62)) - 0.46));
              float haste = step(abs(p.x), 0.14) * step(p.y, 0.2) * step(-1.2, p.y);
              float dente = step(0.0, p.x) * step(p.x, 0.55) * max(step(abs(p.y + 1.05), 0.12), step(abs(p.y + 0.6), 0.1));
              poe(o, vec3(1.0, 0.8, 0.25), max(cabo, max(haste, dente)));
            } else {
              float larg = p.y > 0.0 ? 0.95 : 0.95 * (1.0 - 0.55 * p.y * p.y);
              float r = length(vec2(p.x / max(larg, 0.1), p.y / (p.y > 0.0 ? 0.8 : 1.15)));
              vec3 fundo = it.w > 0.5 ? vec3(1.0, 0.78, 0.2) : vec3(0.93, 0.19, 0.25);
              vec2 g = fract(p * 2.1 + vec2(0.5, 0.2)) - 0.5;
              poe(o, vec3(0.24, 0.0, 0.04), smoothstep(1.2, 1.12, r));
              poe(o, mix(fundo, vec3(1.0, 0.95, 0.75), smoothstep(0.2, 0.12, length(g))), smoothstep(1.02, 0.94, r));
              float folha = step(abs(p.y - 0.85 + 0.3 * abs(p.x)), 0.22) * step(abs(p.x), 0.75);
              poe(o, vec3(0.3, 0.8, 0.35), folha);
            }
          }
          if (o.a < 0.002) discard;
          gl_FragColor = o;
        }`,
    }),
  )

  // What follows her hangs on a chain behind his head: each a little behind the one before, bobbing, as in the game.
  const fila = Array.from({ length: ITENS }, () => new THREE.Vector2(0.5, 0.5))
  let itens = 0
  let ecos = 0

  /** Every frame: `e` the game's state while the filter follows it (null otherwise), `parado` during a death. */
  function atualizar(now, dt, e, parado) {
    const j = !parado && e && !e.pausado ? e.jogador : null
    const vivo = !!j && j.vivo !== false
    const st = vivo ? j.estado : ""
    const levando = (vivo && j.levando) || {}
    const alvo = {
      cansado: vivo && j.cansado ? 1 : 0,
      agua: st === "nado" ? 1 : 0,
      sonho: st === "bloco-sonho" ? 1 : 0,
      bolha: st === "bolha" || st === "bolha-vermelha" ? 1 : 0,
      dourado: levando.dourados > 0 ? 1 : 0,
    }
    for (const k in nivel) {
      nivel[k] = parado ? 0 : perto(nivel[k], alvo[k], dt, 14)
      if (nivel[k] < 0.004) nivel[k] = 0
    }
    neleU.uCansado.value = nivel.cansado
    neleU.uAgua.value = nivel.agua
    neleU.uSonho.value = nivel.sonho
    neleU.uBolha.value = nivel.bolha
    neleU.uDourado.value = nivel.dourado
    if (alvo.bolha) neleU.uBolhaCor.value.set(st === "bolha" ? 0x58e08a : 0xf04858)

    // The hair: away from where she moves (her run is 90 px/s, a dash 240), along the wind (400, the strong 800).
    const [vx, vy] = (vivo && j.velocidade) || [0, 0]
    const [wx, wy] = (vivo && e.vento) || [0, 0]
    empurra.x = perto(empurra.x, Math.tanh(-vx / 240) * 0.7 + Math.tanh(wx / 600) * 0.8, dt, 8)
    empurra.y = perto(empurra.y, Math.tanh(-vy / 240) * 0.7 + Math.tanh(wy / 600) * 0.8, dt, 8)

    const tipos = [
      ...Array(Math.min(ITENS, levando.dourados || 0)).fill(1),
      ...Array(Math.min(ITENS, levando.chaves || 0)).fill(2),
      ...Array(Math.min(ITENS, levando.morangos || 0)).fill(0),
    ].slice(0, ITENS)
    const f = faceBox()
    atrasU.uTam.value = Math.max(0.018, f.h * 0.2)
    const lado = vx < 0 ? 1 : -1
    itens = 0
    for (let i = 0; i < ITENS; i++) {
      const v = atrasU.uItens.value[i]
      const x = f.c.x + (lado * f.h * (1.5 + i * 0.5)) / ASPECT
      const y = f.c.y + f.h * (0.85 - i * 0.12 + 0.07 * Math.sin(now * 0.004 - i * 0.9))
      const p = fila[i]
      if (v.z < 0.01) p.set(x, y)
      p.x = perto(p.x, x, dt, 7 / (1 + i * 0.35))
      p.y = perto(p.y, y, dt, 7 / (1 + i * 0.35))
      v.set(p.x, p.y, parado ? 0 : perto(v.z, i < tipos.length ? 1 : 0, dt, 10), i < tipos.length ? tipos[i] : v.w)
      if (v.z >= 0.01) itens++
    }

    const n = vivo ? Math.min(ECOS.length, e.perseguindo || 0) : 0
    ecos = 0
    ECOS.forEach((atraso, i) => {
      const h = i < n ? histAt(now - atraso * 1000) : null
      if (h) atrasU[`uEco${i}`].value = h.rt.texture
      const u = atrasU[`uEcoA${i}`]
      u.value = parado ? 0 : perto(u.value, h ? 0.85 : 0, dt, 6)
      if (u.value < 0.004) u.value = 0
      if (u.value || i < n) ecos++
    })
  }

  return {
    empurra,
    atualizar,
    querCorpo: () => ecos > 0 || Object.values(nivel).some((v) => v > 0),
    querLook: () => Object.values(nivel).some((v) => v > 0),
    atras(r) {
      if (itens || ecos) r.renderer.render(atras, r.ortho)
    },
    pintar(r, antes, depois) {
      if (!Object.values(nivel).some((v) => v > 0)) return
      neleU.uLookA.value = antes
      neleU.uLookB.value = depois
      r.renderer.render(nele, r.ortho)
    },
    estado: { nivel, empurra },
  }
}
