// The channel's fan behind the keyboard (teclas.js with `torcedor`; Luan's idea, 2026-11-28, from a reel of an avatar
// typing on an input overlay): their 3D fan from /perfil, drawn live with three.js between the box's two layers, so
// the keys' letters and the pressed rings always sit over the arms. The bust is cut at the box's top edge; the left
// hand taps the newest key held, the right one holds the mouse, which slides with the real one; the head follows the
// mouse and glances at the hand; on our goal (the Partidas dock's "muanlartins-torcida" event) the stand's own arms go
// up, on theirs the face falls. Needs the page's import map for "three", as torcida.html's.
import * as THREE from "three"
import { criarBoneco, luzes } from "./torcedor3d/boneco.js"
import { torcedorDe } from "./torcedor3d/antigo.js"
import { natal as dezembro, vestir } from "./torcedor3d/vestir.js"

const aprox = (a, b, dt, tau) => a + (b - a) * (1 - Math.exp(-dt / tau))
const lim = (v, m) => Math.max(-m, Math.min(m, v))

/**
 * Draws the fan on `canvas`, which covers the box's view `vb` (its SVG units, 1 unit a pixel before any scaling).
 * `alvo` is where the left hand taps each key, `casa` where it rests, `mouse` the mouse's place in the box (its left
 * edge, middle and height) and `porMouse(transform)` moves the mouse's two SVG groups as it slides. `estado` is
 * teclas.js's live state (teclas, botoes, ultima). Returns { mover(dx, dy), roda(lado) } for teclas.js to feed.
 */
export async function torcedorNasTeclas({ el, canvas, vb, borda, alvo, casa, mouse: M, porMouse, estado, login, api, demo }) {
  // The look: the fan the channel saved on /perfil, else the default one its login draws; Santa's hat in December.
  // The last one read is kept in the source's storage and drawn at once; the profile is read again behind it, for
  // the next time the source loads (a change on /perfil shows from then). The first time, it waits up to 6 s.
  const CHAVE = `teclas:torcedor:${login}`
  const ler = () =>
    fetch(`${api}/torcedores?logins=${encodeURIComponent(login)}`, { signal: AbortSignal.timeout(6000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((todos) => {
        const a = todos[login] ?? null
        try { localStorage.setItem(CHAVE, JSON.stringify(a)) } catch {}
        return a
      })
  let guardada
  try { guardada = JSON.parse(localStorage.getItem(CHAVE) ?? "undefined") } catch {}
  const lendo = ler().catch(() => undefined)
  const aparencia = guardada !== undefined ? guardada : ((await lendo) ?? null)
  const natal = new URLSearchParams(location.search).has("natal") || dezembro()
  const boneco = criarBoneco(vestir(torcedorDe(aparencia, login), { natal }), { qualidade: 1, traco: 0.04 })

  const render = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  render.setClearColor(0, 0)
  render.localClippingEnabled = true
  const cena = new THREE.Scene()
  luzes(cena)

  // An orthographic camera a touch from above; the head's centre over the gap between the keys and the mouse.
  const K = 45 // box units per fan unit
  const FAN = { x: M.mx - 41, y: -80 }
  const centro = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }
  const alvoCam = new THREE.Vector3((centro.x - FAN.x) / K, (FAN.y - centro.y) / K, 0)
  const camera = new THREE.OrthographicCamera(-vb.w / K / 2, vb.w / K / 2, vb.h / K / 2, -vb.h / K / 2, 0.1, 60)
  const TILT = 0.12
  camera.position.set(alvoCam.x, alvoCam.y + 20 * Math.sin(TILT), 20 * Math.cos(TILT))
  camera.lookAt(alvoCam)
  camera.updateMatrixWorld()
  const frente = camera.getWorldDirection(new THREE.Vector3())
  /** A point of the box (its SVG units) on the scene's plane z = `z`. */
  function noMundo(sx, sy, z, out = new THREE.Vector3()) {
    out.set(((sx - vb.x) / vb.w) * 2 - 1, -(((sy - vb.y) / vb.h) * 2 - 1), -1).unproject(camera)
    return out.addScaledVector(frente, (z - out.z) / frente.z)
  }

  cena.add(boneco.raiz)
  boneco.pose("parado")
  const giroBase = boneco.cabeca.rotation.clone()
  for (const g of Object.values(boneco.bracos)) g.visible = false
  boneco.repouso.visible = false
  const bracoE = boneco.bracoVivo(-1)
  const bracoD = boneco.bracoVivo(1)
  // The bust cut along the box's top edge, a line across the screen; the arms go on over the keys.
  const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
  const corte = new THREE.Plane(cima, -cima.dot(noMundo(centro.x, borda, 0)))
  const doBraco = new Set()
  for (const g of [bracoE.grupo, bracoD.grupo]) g.traverse((o) => doBraco.add(o))
  boneco.raiz.traverse((o) => {
    if (o.isMesh && !doBraco.has(o)) o.material.clippingPlanes = [corte]
  })

  // The canvas's pixels follow its size on screen (the page's scale and the box's).
  let largura = 0, altura = 0
  function medir() {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height))
    if (w === largura && h === altura) return
    largura = w
    altura = h
    render.setPixelRatio(Math.min(2, devicePixelRatio || 1))
    render.setSize(w, h, false)
  }

  const mao = { x: casa.x, y: casa.y, z: 1.3 }
  const mouse = { x: 0, y: 0, vx: 0, vy: 0 }
  const cabeca = { x: 0, y: 0 }
  const olhar = { y: 0, ate: 0 }
  let pulo = 0, inclina = 0, rostoAgora = ""
  let piscaEm = performance.now() + 2500
  let ultimoToque = 0, tAntes = performance.now(), vistoEm = 0, medidoEm = 0
  let gol = { tipo: null, ate: 0 }
  const w1 = new THREE.Vector3(), w2 = new THREE.Vector3()
  const rosto = (e) => {
    if (e !== rostoAgora) boneco.emocao((rostoAgora = e))
  }

  addEventListener("muanlartins-torcida", ({ detail }) => {
    if (detail?.tipo === "gol") gol = { tipo: detail.nosso ? "gol" : "contra", ate: performance.now() + 2800 }
  })
  if (demo) {
    let n = 0
    setInterval(() => dispatchEvent(new CustomEvent("muanlartins-torcida", { detail: { tipo: "gol", nosso: ++n % 3 !== 0 } })), 16000)
  }

  function quadro(t) {
    const dt = Math.max(0, Math.min(64, t - tAntes))
    tAntes = t
    const comemora = gol.tipo === "gol" && t < gol.ate
    const lamenta = gol.tipo === "contra" && t < gol.ate

    // The left hand: to the newest key held, else back to rest; it comes forward to press.
    const segura = estado.ultima && estado.teclas.has(estado.ultima) && alvo[estado.ultima]
      ? estado.ultima
      : [...estado.teclas].filter((x) => alvo[x]).pop()
    if (segura) ultimoToque = t
    const destino = segura ? alvo[segura] : t - ultimoToque < 450 ? mao : casa
    mao.x = aprox(mao.x, destino.x, dt, segura ? 45 : 160)
    mao.y = aprox(mao.y, destino.y, dt, segura ? 45 : 160)
    const perto = !!segura && Math.hypot(destino.x - mao.x, destino.y - mao.y) < 6
    mao.z = aprox(mao.z, perto ? 0.95 : 1.3, dt, 40)

    // The mouse slides with the real one and settles back to the middle.
    mouse.x *= Math.exp(-dt / 220)
    mouse.y *= Math.exp(-dt / 220)
    mouse.vx *= Math.exp(-dt / 90)
    mouse.vy *= Math.exp(-dt / 90)
    const giro = mouse.x * 0.7
    porMouse(`translate(${M.mx + mouse.x} ${mouse.y}) rotate(${giro} ${M.meio} ${M.alt * 0.6})`)

    // The body leans towards a far key; it hops on Space, and keeps hopping on our goal.
    const casaX = noMundo(casa.x, casa.y, 0, w1).x
    const maoX = noMundo(mao.x, mao.y, 0, w2).x
    inclina = aprox(inclina, lamenta ? 0 : lim((maoX - casaX) * 0.3, 0.9), dt, 120)
    const salto = comemora ? -0.35 * Math.abs(Math.sin(t / 140)) : estado.teclas.has("SPACE") ? -0.16 : 0
    pulo = aprox(pulo, salto, dt, comemora ? 30 : estado.teclas.has("SPACE") ? 40 : 110)
    boneco.raiz.position.set(inclina, -pulo, 0)

    // Arms: on our goal the stand's own, up; otherwise the live ones, to the key and to the mouse.
    boneco.bracos.cima.visible = comemora
    bracoE.grupo.visible = bracoD.grupo.visible = !comemora
    if (!comemora) {
      const raiz = boneco.raiz.position
      bracoE.apontar(noMundo(mao.x, mao.y, mao.z, w1).sub(raiz), perto ? 1 : 0)
      const rad = (giro * Math.PI) / 180
      const dy = M.alt * 0.06
      const clique = estado.botoes.has("L") || estado.botoes.has("R")
      const px = M.mx + mouse.x + M.meio - dy * Math.sin(rad)
      const py = mouse.y + M.alt * 0.6 + dy * Math.cos(rad) - (clique ? 6 : 0)
      bracoD.apontar(noMundo(px, py, clique ? 0.95 : 1.1, w2).sub(raiz), clique ? 1 : 0)
    }

    // The head follows the mouse, glances at the hand while typing, flicks with the wheel; hangs on their goal.
    let gy = lim(mouse.vx * 0.02, 0.35), gx = 0.14 + lim(mouse.vy * 0.015, 0.12)
    if (segura && Math.abs(mouse.vx) < 2) { gy = -0.22; gx = 0.2 }
    if (t < olhar.ate) gx = 0.14 + olhar.y * 0.12
    if (lamenta) { gx = 0.38; gy = 0 }
    if (comemora) { gx = -0.12; gy = 0 }
    cabeca.x = aprox(cabeca.x, gx, dt, 70)
    cabeca.y = aprox(cabeca.y, gy, dt, 70)
    boneco.cabeca.rotation.set(giroBase.x + cabeca.x, giroBase.y + cabeca.y, giroBase.z - inclina * 0.06)

    // The stand's own faces: happy on a goal or a jump, sad on theirs, a blink now and then.
    if (t > piscaEm + 130) piscaEm = t + 2200 + Math.random() * 3300
    const pisca = t > piscaEm && t < piscaEm + 130
    rosto(lamenta ? "triste" : comemora || estado.teclas.has("SPACE") ? "alegre" : pisca ? "pisca" : "normal")

    if (t - medidoEm > 1000) { medir(); medidoEm = t }
    render.render(cena, camera)
  }

  // Drawn only while the box shows (a game in front) and for its fade out; otherwise a glance four times a second.
  function laco(t) {
    if (el.classList.contains("visivel")) vistoEm = t
    if (t - vistoEm < 800) {
      quadro(t)
      requestAnimationFrame(laco)
    } else {
      tAntes = t
      setTimeout(() => requestAnimationFrame(laco), 250)
    }
  }
  medir()
  requestAnimationFrame(laco)
  el.classList.add("com-torcedor")

  return {
    /** The real mouse moved by (dx, dy) in its own counts (Raw Input, so about 1/1000 inch each at 1000 DPI). */
    mover(dx, dy) {
      mouse.x = lim(mouse.x + dx * 0.05, 16)
      mouse.y = lim(mouse.y + dy * 0.05, 10)
      mouse.vx = aprox(mouse.vx, dx * 0.3, 33, 40)
      mouse.vy = aprox(mouse.vy, dy * 0.3, 33, 40)
    },
    roda(lado) {
      olhar.y = lado === "cima" ? -1 : 1
      olhar.ate = performance.now() + 260
    },
  }
}
