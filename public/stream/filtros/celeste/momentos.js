// The game's rarer moments on the camera (scripts/celeste-mod/README.md), each in plain shapes of our own and silent
// (the game's sound is already on the stream):
//
//   coracao        a crystal heart beside his head in the side's colour (A blue, B red, C gold; pale when it's a
//                  repeat), turning, then it breaks in a flash, its colour round him
//   fita           a cassette with its reels turning, its blocks round it swapping blue and pink on the beat
//   sala           the picture slides as the game's camera does and settles, his hair swept along
//   capitulo_fim   confetti down his sides and a warm glow round him
//
// The heart, the cassette and the ending take turns (a B side's heart ends its chapter too); the room doesn't wait.
// A death clears them all (`limpa`).

const DURA = { coracao: 2.2, fita: 2.8, capitulo_fim: 3.6 } // seconds
const QUEBRA = 1.35 // when the heart breaks
const SALA = { DURA: 0.65, PX: 20 } // the game's transition lasts 0.65 s
const BATIDA = 0.42 // the cassette blocks' beat
const LADO = { A: [0.37, 0.8, 0.98], B: [1, 0.3, 0.43], C: [1, 0.85, 0.3] }
const REPETIDO = [0.8, 0.8, 0.95]
const AZUL = [0.28, 0.66, 0.96]
const ROSA = [0.95, 0.35, 0.68]
const OURO = [1, 0.84, 0.4]
const CONFETE = [[0.98, 0.35, 0.4], [0.4, 0.8, 1], [1, 0.85, 0.35], [0.55, 0.9, 0.5], [0.85, 0.55, 1]]

export function criarMomentos(m, { PREMUL, spawn, burst, ring, KIND, aoLado, ladoLivre }) {
  const { THREE, VERT, quad, faceBox, ease, easeOutBack, W, H } = m
  const ASPECT = W / H
  const u = {
    uAspect: m.uniforms.uAspect,
    uTime: m.uniforms.uTime,
    uForma: { value: 0 }, // 1 the heart, 2 the cassette
    uLugar: { value: new THREE.Vector4(0.8, 0.7, 0.1, 0) }, // x, y, size, how much it shows
    uGira: { value: 1 },
    uCor: { value: new THREE.Color() },
    uClarao: { value: 0 },
  }
  const cena = quad(
    new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: VERT,
      ...PREMUL,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uAspect, uTime, uGira, uClarao;
        uniform int uForma;
        uniform vec4 uLugar;
        uniform vec3 uCor;
        void poe(inout vec4 o, vec3 c, float a) { o = vec4(c * a, a) + o * (1.0 - a); }
        float dot2(vec2 v) { return dot(v, v); }
        float coracao(vec2 p) {
          p.x = abs(p.x);
          if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - 0.35355;
          return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
        }
        float caixa(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }
        void main() {
          vec4 o = vec4(0.0);
          vec2 p = (vUv - uLugar.xy) * vec2(uAspect, 1.0) / max(uLugar.z, 0.001);
          if (uForma > 0 && uLugar.w > 0.003) {
            float a = uLugar.w;
            poe(o, uCor, exp(-dot(p, p) * 0.9) * 0.4 * a);
            if (uForma == 1) {
              vec2 q = vec2(p.x / uGira, p.y) * 0.62 + vec2(0.0, 0.55);
              float d = coracao(q);
              vec2 c = q - vec2(0.0, 0.6);
              // Cut like a gem: flat facets round a bright middle.
              float face = floor((atan(c.y, c.x) + 3.14159) / 0.785398);
              float luz = 0.65 + 0.35 * fract(sin(face * 12.9898) * 437.585);
              vec3 cor = mix(uCor * luz, mix(uCor, vec3(1.0), 0.6), step(length(c / vec2(0.8, 1.0)), 0.2));
              poe(o, mix(uCor * 0.25, vec3(1.0), smoothstep(0.02, 0.0, d)), smoothstep(0.075, 0.055, d) * a);
              poe(o, cor, smoothstep(0.0, -0.02, d) * a);
            } else {
              float d = caixa(p, vec2(1.0, 0.66), 0.12);
              poe(o, vec3(0.1, 0.08, 0.2), smoothstep(0.1, 0.07, d) * a);
              poe(o, uCor, smoothstep(0.01, -0.02, d) * a);
              poe(o, vec3(0.98, 0.95, 0.88), smoothstep(0.02, 0.0, caixa(p - vec2(0.0, 0.1), vec2(0.8, 0.38), 0.08)) * a);
              for (int i = 0; i < 2; i++) {
                vec2 c = p - vec2(i == 0 ? -0.36 : 0.36, 0.1);
                float r = length(c);
                poe(o, vec3(0.1, 0.08, 0.2), smoothstep(0.25, 0.22, r) * a);
                float dente = step(0.2, abs(sin(atan(c.y, c.x) * 3.0 + uTime * 6.0)));
                poe(o, vec3(0.98, 0.95, 0.88), smoothstep(0.15, 0.13, r) * step(0.055, r) * dente * a);
              }
              poe(o, vec3(0.1, 0.08, 0.2), smoothstep(0.02, 0.0, caixa(p + vec2(0.0, 0.54), vec2(0.5, 0.1), 0.04)) * a);
            }
          }
          poe(o, vec3(1.0), uClarao);
          if (o.a < 0.002) discard;
          gl_FragColor = o;
        }`,
    }),
  )

  const empurra = new THREE.Vector2() // his hair's push by the room's slide
  const fila = []
  let agora = null // the heart, the cassette or the ending on now
  let sala = null
  let brilhou = false

  function chega(ev, estado, now) {
    if (ev.tipo === "sala") {
      const [x, y] = ev.direcao || []
      const dir = new THREE.Vector2(x || 0, y || 0)
      if (dir.lengthSq() < 1e-4) return
      dir.normalize()
      sala = { t0: now, dir }
      const rot = Math.atan2(dir.y, dir.x)
      for (let i = 0; i < 7; i++) {
        const nx = Math.random(), ny = Math.random()
        spawn({ kind: KIND.streak, x: nx, y: ny, vx: -dir.x * 1.5, vy: -dir.y * 1.5, rot, size: 0.006, stretch: 16 + Math.random() * 14, a: 0.35, life: 0.35, delay: Math.random() * 0.15 })
      }
      return
    }
    if (!(ev.tipo in DURA) || fila.length >= 3) return
    const lado = ev.lado || estado?.capitulo?.lado || "A"
    fila.push({ tipo: ev.tipo, cor: ev.repetido || ev.repetida ? REPETIDO : LADO[lado] || LADO.A, repetido: !!(ev.repetido || ev.repetida) })
  }

  function brilho(cor, quanto) {
    if (quanto <= 0.003 && !brilhou) return
    brilhou = quanto > 0.003
    m.corpo.brilho(1, cor, brilhou ? quanto : 0, [0.1, 0.5, 0.65])
  }

  function comeca(now) {
    agora = { ...fila.shift(), t0: now, passo: -1, quebrou: false, confeteEm: now, side: ladoLivre() }
    if (agora.tipo === "capitulo_fim") {
      const f = faceBox()
      ring(f.c.x, f.c.y, 0.7, OURO, 0.6, 0.06)
    }
  }

  function coracao(g, t) {
    const at = aoLado(g.side)
    if (t < QUEBRA) {
      u.uForma.value = 1
      u.uCor.value.setRGB(...g.cor)
      // It slows down as it's about to break.
      const c = Math.cos(9 * (t - (t * t) / (3 * QUEBRA)))
      u.uGira.value = Math.max(0.25, Math.abs(c))
      const treme = t > QUEBRA - 0.3 ? Math.sin(t * 90) * 0.004 : 0
      u.uLugar.value.set(at.x + treme, at.y + 0.008 * Math.sin(t * 5), 0.1 * easeOutBack(Math.min(1, t / 0.3)), g.repetido ? 0.7 : 1)
      brilho(g.cor, 0.35 * Math.min(1, t / 0.3))
      return
    }
    if (!g.quebrou) {
      g.quebrou = true
      burst(at.x, at.y, { n: 26, col: g.cor, col2: [1, 1, 1], speed: 1.1, size: 0.04, life: 0.8 })
      burst(at.x, at.y, { n: 14, kind: KIND.pixel, col: g.cor, speed: 0.7, size: 0.018, life: 0.9, ay: -0.6 })
      ring(at.x, at.y, 0.6, g.cor, 0.5, 0.07)
    }
    const k = (t - QUEBRA) / (DURA.coracao - QUEBRA)
    u.uClarao.value = (g.repetido ? 0.12 : 0.3) * Math.max(0, 1 - k * 3)
    brilho(g.cor, Math.max(0, 1 - k))
  }

  function fita(g, t) {
    const at = aoLado(g.side)
    const passo = Math.floor(t / BATIDA)
    const cor = g.repetido ? REPETIDO : passo % 2 ? ROSA : AZUL
    const some = Math.max(0, Math.min(1, (DURA.fita - t) / 0.3))
    u.uForma.value = 2
    u.uCor.value.setRGB(...cor)
    u.uLugar.value.set(at.x, at.y + 0.01 * Math.sin(t * 5), 0.085 * easeOutBack(Math.min(1, t / 0.3)), some)
    if (passo !== g.passo && some === 1) {
      g.passo = passo
      for (let i = passo % 2; i < 8; i += 2) {
        const an = (i / 8) * Math.PI * 2
        spawn({ kind: KIND.pixel, x: at.x + (Math.cos(an) * 0.16) / ASPECT, y: at.y + Math.sin(an) * 0.13, size: 0.03, size1: 0.018, col: cor, solid: 1, life: BATIDA * 1.2 })
      }
    }
    brilho(cor, 0.3 * some * (1 - ((t / BATIDA) % 1) * 0.6))
  }

  function fim(g, t, now) {
    const some = Math.max(0, Math.min(1, (DURA.capitulo_fim - t) / 0.8))
    const f = faceBox()
    while (now - g.confeteEm > 28) {
      g.confeteEm += 28
      if (some < 1) continue
      // Down both sides of his face, never over it.
      const livre = (0.26 + Math.random() * 0.9) / ASPECT + f.w * 0.5
      const x = f.c.x + (Math.random() < 0.5 ? -livre : livre)
      if (x < 0 || x > 1) continue
      const col = CONFETE[Math.floor(Math.random() * CONFETE.length)]
      spawn({ kind: KIND.pixel, x, y: 1.02, vy: -0.3 - Math.random() * 0.25, ay: -0.08, size: 0.012 + Math.random() * 0.01, col, solid: 1, life: 1.9, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 9 })
    }
    brilho(OURO, Math.min(1, t / 0.4) * some * (0.6 + 0.2 * Math.sin(t * 6)))
  }

  function atualizar(now) {
    empurra.set(0, 0)
    if (sala) {
      const t = (now - sala.t0) / 1000 / SALA.DURA
      if (t >= 1) sala = null
      else {
        const k = Math.sin(Math.PI * ease(Math.max(0, t)))
        m.deslocar(-sala.dir.x * SALA.PX * k, -sala.dir.y * SALA.PX * k)
        empurra.copy(sala.dir).multiplyScalar(-0.6 * k)
      }
    }
    u.uForma.value = u.uLugar.value.w = u.uClarao.value = 0
    if (agora && (now - agora.t0) / 1000 >= DURA[agora.tipo]) {
      agora = null
      brilho(OURO, 0)
    }
    if (!agora && fila.length) comeca(now)
    if (!agora) return
    const t = (now - agora.t0) / 1000
    if (agora.tipo === "coracao") coracao(agora, t)
    else if (agora.tipo === "fita") fita(agora, t)
    else fim(agora, t, now)
  }

  function limpa() {
    fila.length = 0
    agora = sala = null
    empurra.set(0, 0)
    u.uForma.value = u.uLugar.value.w = u.uClarao.value = 0
    brilho(OURO, 0)
  }

  return {
    empurra,
    chega,
    atualizar,
    limpa,
    querCorpo: () => !!agora || fila.length > 0,
    ocupado: () => !!agora || fila.length > 0,
    desenhar(r) {
      if (u.uForma.value || u.uClarao.value > 0.003) r.renderer.render(cena, r.ortho)
    },
    nome: () => agora?.tipo || (sala ? "sala" : ""),
  }
}
