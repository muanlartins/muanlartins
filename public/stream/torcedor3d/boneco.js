// The fan in 3D, all from code: no model files. Head centre at the origin, the bust below it, +z to the viewer.
// An ES module shared by OBS's overlays (public/stream, "three" from jsDelivr through the page's import map) and the
// site (its bundler takes "three" from npm, the same 0.182). Needs a DOM: the face and the shirt are drawn on canvases.
// `criarBoneco` builds one fan for a scene of your own; `fotografo` bakes transparent pictures of fans, which is how
// the stand and the site show them. Give both the look as `vestir()` (vestir.js) returns it.
import * as THREE from "three"
import { ondeFica } from "./esquema.js"

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const PI = Math.PI
const NAVY = "#001447"
const DEGRAUS = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1)
DEGRAUS.minFilter = DEGRAUS.magFilter = THREE.NearestFilter
DEGRAUS.needsUpdate = true
const entre = (x, a, b) => Math.min(b, Math.max(a, x))
const suave = (a, b, x) => { const t = entre((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const misturar = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`
export const EMOCOES = ["normal", "alegre", "triste", "pisca"]
/** The poses a fan has: at rest, a goal (both arms up), a wave, clapping, a goal against, and at rest with the eyes shut. */
export const POSES = ["parado", "cima", "aceno", "palmas", "triste", "pisca"]

/** A tube whose radius follows r(t), t from `de` to `ate` along the curve: horns, tails, a wizard's hat. */
function tuboAfinado(pts, raio, { de = 0, ate = 1, n = 22, lados = 10, mais = 0 } = {}) {
  const curva = new THREE.CatmullRomCurve3(pts)
  const pos = []
  const idx = []
  let N = null
  for (let i = 0; i <= n; i++) {
    const t = de + ((ate - de) * i) / n
    const p = curva.getPointAt(t)
    const T = curva.getTangentAt(t)
    if (!N) N = Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)
    N = N.clone().sub(T.clone().multiplyScalar(T.dot(N))).normalize()
    const B = T.clone().cross(N)
    const r = raio(t) + mais
    for (let j = 0; j <= lados; j++) {
      const w = (j / lados) * 2 * PI
      const c = Math.cos(w)
      const s = Math.sin(w)
      pos.push(p.x + (N.x * c + B.x * s) * r, p.y + (N.y * c + B.y * s) * r, p.z + (N.z * c + B.z * s) * r)
      if (i < n && j < lados) {
        const a = i * (lados + 1) + j
        idx.push(a, a + 1, a + lados + 1, a + 1, a + lados + 2, a + lados + 1)
      }
    }
  }
  for (const [i, fim] of [[0, false], [n, true]]) {
    const p = curva.getPointAt(de + ((ate - de) * i) / n)
    const c = pos.length / 3
    pos.push(p.x, p.y, p.z)
    for (let j = 0; j < lados; j++) {
      const a = i * (lados + 1) + j
      if (fim) idx.push(c, a, a + 1)
      else idx.push(c, a + 1, a)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return { g, curva }
}

/** The mirror image, faces kept facing out (the outline draws back faces). */
function espelhar(geo) {
  geo.scale(-1, 1, 1)
  if (geo.index) {
    const i = geo.index.array
    for (let j = 0; j < i.length; j += 3) [i[j + 1], i[j + 2]] = [i[j + 2], i[j + 1]]
  } else
    for (const at of Object.values(geo.attributes)) {
      const n = at.itemSize
      const v = at.array
      for (let j = 0; j < at.count; j += 3)
        for (let c = 0; c < n; c++) [v[(j + 1) * n + c], v[(j + 2) * n + c]] = [v[(j + 2) * n + c], v[(j + 1) * n + c]]
    }
  geo.computeVertexNormals()
  return geo
}

/** A flat outline with a little thickness, so its own outline wraps it. `fn` draws on a THREE.Shape. */
function chapa(fn, espessura = 0.045, curvas = 8) {
  const s = new THREE.Shape()
  fn(s)
  const g = new THREE.ExtrudeGeometry(s, { depth: espessura, bevelEnabled: false, curveSegments: curvas })
  g.translate(0, 0, -espessura / 2)
  return g
}

/** Fur and scales, under everything else; the same units on the face (radians) and on the shirt. */
function pelagem(g, a, onde) {
  const c = a.peloC
  const bolha = (x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, PI * 2); g.fillStyle = c; g.fill() }
  const cunha = (pts) => { g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fillStyle = c; g.fill() }
  if (a.pelo === "focinho") {
    if (onde === "rosto") {
      bolha(0, -a.focinhoY + 0.08, 0.5 * a.focinhoL + 0.06, 0.4)
      g.fillStyle = c
      g.fillRect(-0.36 * a.focinhoL, -a.focinhoY + 0.08, 0.72 * a.focinhoL, 2)
    } else bolha(0, -0.45, 0.72, 1.2)
  } else if (a.pelo === "mancha" && onde === "rosto") {
    for (const [dx, dy, r] of [[0, 0, 0.26], [0.13, -0.1, 0.2], [-0.07, 0.13, 0.18], [0.17, 0.1, 0.16]]) bolha(a.olhoX + dx, -a.olhoY + dy, r, r * 0.9)
  } else if (a.pelo === "manchas") {
    for (let i = 0; i < 30; i++) {
      const x = ((0.5 + i * 0.7548777) % 1) * 6.4 - 3.2
      const y = ((0.5 + i * 0.5698403) % 1) * 3.1 - 1.55
      if (onde === "rosto" && Math.abs(x) < 0.62 && y > -0.35 && y < 0.62) continue
      bolha(x, y, 0.13 + (i % 4) * 0.045, 0.11 + (i % 3) * 0.04, i)
    }
  } else if (a.pelo === "listras") {
    const ys = onde === "rosto" ? [-0.72, -0.3, 0.12, 0.55] : [-1.15, -0.55, 0.05, 0.65, 1.2]
    ys.forEach((y, i) => {
      for (const l of [-1, 1]) cunha([[l * 3.3, y - 0.14], [l * 3.3, y + 0.14], [l * (onde === "rosto" ? 1.0 : 0.9) + l * (i % 2) * 0.35, y + (i % 2 ? 0.1 : -0.08)]])
    })
    if (onde === "rosto") for (const x of [-0.22, 0, 0.22]) cunha([[x - 0.07, -1.6], [x + 0.07, -1.6], [x, -0.62 - Math.abs(x)]])
  } else if (a.pelo === "escamas") {
    g.strokeStyle = c
    g.lineWidth = 0.035
    for (let row = 0; row < 22; row++)
      for (let col = 0; col < 34; col++) {
        const x = -3.3 + col * 0.2 + (row % 2) * 0.1
        const y = -1.6 + row * 0.15
        if (onde === "rosto" && Math.abs(x) < 0.72 && y > -0.55 && y < 0.8) continue
        g.beginPath(); g.arc(x, y, 0.1, 0.15, PI - 0.15); g.stroke()
      }
  }
}

export function luzes(cena) {
  cena.add(new THREE.AmbientLight(0xffffff, 1.95))
  const sol = new THREE.DirectionalLight(0xffffff, 1.35)
  sol.position.set(-2.5, 3.5, 4)
  cena.add(sol)
}

/** The surface u, v → point, facing the viewer when u runs right and v runs down. */
function malha(fn, nu = 48, nv = 24) {
  const pos = []
  const uv = []
  const idx = []
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const p = fn(i / nu, j / nv)
      pos.push(p.x, p.y, p.z)
      uv.push(i / nu, 1 - j / nv)
      if (i < nu && j < nv) {
        const a = j * (nu + 1) + i
        idx.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2)
      }
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function forma(g, tipo) {
  g.beginPath()
  if (tipo === "circulo") g.arc(0, 0, 1, 0, PI * 2)
  else if (tipo === "quadrado") g.rect(-0.85, -0.85, 1.7, 1.7)
  else if (tipo === "triangulo") { g.moveTo(0, -1); g.lineTo(0.95, 0.75); g.lineTo(-0.95, 0.75) }
  else if (tipo === "losango") { g.moveTo(0, -1); g.lineTo(1, 0); g.lineTo(0, 1); g.lineTo(-1, 0) }
  else if (tipo === "estrela") for (let i = 0; i < 10; i++) g.lineTo(Math.sin((i * PI) / 5) * (i % 2 ? 0.45 : 1), -Math.cos((i * PI) / 5) * (i % 2 ? 0.45 : 1))
  else if (tipo === "coracao") { g.moveTo(0, 0.9); g.bezierCurveTo(-1.5, -0.1, -0.8, -1.3, 0, -0.45); g.bezierCurveTo(0.8, -1.3, 1.5, -0.1, 0, 0.9) }
  else if (tipo === "traco") g.rect(-1, -0.18, 2, 0.36)
  else if (tipo === "arco") { g.arc(0, 0.2, 1, PI, 0); g.arc(0, 0.2, 0.66, 0, PI, true) }
  else if (tipo === "lua") { g.arc(0, 0, 1, 0.9, PI * 2 - 0.9); g.arc(0.5, 0, 0.8, PI * 2 - 1.5, 1.5, true) }
  g.closePath()
}

function carimbos(g, a, onde) {
  for (const d of a.desenhos) {
    if (d.em !== onde) continue
    for (const lado of d.m ? [1, -1] : [1]) {
      g.save()
      g.translate(d.x * lado, -d.y)
      g.scale(lado, 1)
      g.rotate(d.r)
      g.scale(d.t * d.a, d.t)
      g.fillStyle = d.c
      forma(g, d.f)
      g.fill()
      g.restore()
    }
  }
}

function textura(tela) {
  const t = new THREE.CanvasTexture(tela)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** The face, drawn on a map wrapped round the head: 1 unit is a radian from the middle of the face. */
function pintarRosto(a, emocao, escala) {
  const tela = document.createElement("canvas")
  tela.width = 1024 * escala
  tela.height = 512 * escala
  const g = tela.getContext("2d", { willReadFrequently: true })
  g.fillStyle = a.pele
  g.fillRect(0, 0, tela.width, tela.height)
  const un = (512 / PI) * escala
  g.setTransform(un, 0, 0, un, 512 * escala, 256 * escala)
  g.lineCap = "round"
  g.lineJoin = "round"
  const elipse = (x, y, rx, ry, c) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, PI * 2); g.fillStyle = c; g.fill() }
  const linha = (pts, larg, c) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = larg; g.strokeStyle = c; g.stroke() }
  const curva = (x0, y0, cx, cy, x1, y1, larg, c) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.lineWidth = larg; g.strokeStyle = c; g.stroke() }

  pelagem(g, a, "rosto")
  if (a.pint === "metade") {
    g.fillStyle = a.pintC; g.fillRect(-1.5, -1.6, 1.5, 3.2)
    g.fillStyle = a.pintC2; g.fillRect(0, -1.6, 1.5, 3.2)
  } else if (a.pint === "mascara") {
    g.fillStyle = a.pintC; g.fillRect(-1.5, -0.3, 3, 0.48)
    g.fillStyle = a.pintC2; g.fillRect(-1.5, 0.18, 3, 0.07)
  } else if (a.pint === "faixas") {
    for (const l of [-1, 1]) {
      linha([[l * 0.5, 0.22], [l * 0.82, 0.16]], 0.09, a.pintC)
      linha([[l * 0.52, 0.34], [l * 0.82, 0.28]], 0.09, a.pintC2)
    }
  } else if (a.pint === "raio") {
    const raio = [[-0.28, -0.75], [-0.62, -0.1], [-0.4, -0.1], [-0.66, 0.5], [-0.22, -0.22], [-0.42, -0.22], [-0.12, -0.75]]
    g.beginPath(); raio.forEach(([x, y]) => g.lineTo(x, y)); g.closePath()
    g.fillStyle = a.pintC; g.fill(); g.lineWidth = 0.04; g.strokeStyle = a.pintC2; g.stroke()
  }
  if (a.corado) for (const l of [-1, 1]) elipse(l * 0.6, 0.26, 0.17, 0.1, misturar(a.pele, "#ff4f6d", 0.42))
  if (a.sardas) for (const l of [-1, 1]) for (const [x, y] of [[0.42, 0.18], [0.52, 0.24], [0.62, 0.16], [0.5, 0.12], [0.7, 0.24]]) elipse(l * x, y, 0.025, 0.025, misturar(a.pele, "#6b2d12", 0.5))

  const pelos = (c, baixo) => {
    g.beginPath()
    g.moveTo(-1.5, -0.05)
    g.bezierCurveTo(-1.1, 0.1, -0.62, 0.3, 0, 0.25 + baixo)
    g.bezierCurveTo(0.62, 0.3, 1.1, 0.1, 1.5, -0.05)
    g.lineTo(1.5, 1.6); g.lineTo(-1.5, 1.6); g.closePath()
    g.fillStyle = c; g.fill()
  }
  if (a.barba === "rala") pelos(misturar(a.pele, a.barbaC, 0.38), 0.04)
  if (a.barba === "cheia" || a.barba === "longa") {
    pelos(a.barbaC, 0)
    if (a.boca !== "oh") elipse(0, -a.bocaY, 0.3 * a.bocaT, 0.13 * a.bocaT * a.bocaA, misturar(a.barbaC, a.pele, 0.8))
  }
  if (a.barba === "cavanhaque") {
    g.beginPath(); g.moveTo(-0.22, 0.62); g.quadraticCurveTo(0, 0.56, 0.22, 0.62); g.lineTo(0.16, 0.92); g.lineTo(-0.16, 0.92); g.closePath()
    g.fillStyle = a.barbaC; g.fill()
  }

  // Per eye type: half its width and middle when closed, the upper lashes [x, y, dx, dy], the lower ones' start, the liner's corner.
  const CILIOS = [[0.12, -0.12, 0.1, -0.08], [0.16, -0.05, 0.11, -0.04]]
  const OLHOS = {
    oval: { w: 0.13, y: 0.02, baixo: [0.06, 0.15], asa: [0.1, -0.09] },
    grande: { w: 0.19, y: 0.02, baixo: [0.1, 0.19], asa: [0.16, -0.11] },
    amendoa: { w: 0.2, y: 0, baixo: [0.09, 0.09], asa: [0.2, -0.04] },
    reptil: { w: 0.2, y: 0, baixo: [0.09, 0.1], asa: [0.2, -0.03] },
    ponto: { w: 0.09, y: 0, baixo: [0.04, 0.09], asa: [0.07, -0.05], cilios: [[0.045, -0.085, 0.06, -0.08], [0.075, -0.04, 0.09, -0.04]] },
    feliz: { w: 0.15, y: 0.05, asa: [0.15, 0.05], cilios: [[0.1, -0.015, 0.08, -0.08], [0.135, 0.027, 0.1, -0.03]] },
    sono: { w: 0.17, y: -0.02, baixo: [0.08, 0.1], asa: [0.17, -0.02], cilios: [[0.1, -0.03, 0.07, -0.08], [0.15, -0.025, 0.1, -0.05]] },
    losango: { w: 0.15, y: 0, baixo: [0.06, 0.12], asa: [0.13, -0.04] },
    estrela: { w: 0.18, y: 0, baixo: [0.07, 0.14], asa: [0.18, -0.06] },
    traco: { w: 0.14, y: 0, baixo: [0.07, 0.04], asa: [0.14, 0], cilios: [[0.09, -0.01, 0.07, -0.08], [0.13, -0.005, 0.1, -0.04]] },
  }
  // A closed eye: the lid as one line sagging down, the lashes hanging from its outer end.
  function fecharOlho(x0, y0, x1, y1, larg, c) {
    const cx = (x0 + x1) / 2
    const cy = Math.max(y0, y1) + 0.12
    curva(x0, y0, cx, cy, x1, y1, larg, c)
    const q = (t) => [(1 - t) ** 2 * x0 + 2 * t * (1 - t) * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * t * (1 - t) * cy + t * t * y1]
    return { cilios: [[...q(0.72), 0.05, 0.09], [...q(0.9), 0.1, 0.05]], asa: [x1, y1] }
  }
  const bez = (p, t) => [0, 1].map((i) => (1 - t) ** 3 * p[0][i] + 3 * (1 - t) ** 2 * t * p[1][i] + 3 * (1 - t) * t * t * p[2][i] + t ** 3 * p[3][i])
  // The adjustable eye: an upper and a lower lid between two corners, with iris, pupil and shine clipped inside.
  function olhoLivre(cor) {
    const w = 0.21
    let cima = 0.15 + 0.1 * a.olhoCima
    let baixo = 0.09 + 0.07 * a.olhoBaixo
    let canto = a.olhoCanto
    // Happy: the lower lid pushes up into a smile. Sad: the upper lid drops and the outer corner falls.
    if (emocao === "alegre") { cima = Math.max(cima, 0.15); baixo = 0.1 - cima }
    if (emocao === "triste") { cima *= 0.55; canto -= 0.4 }
    const yi = 0.03
    const yo = 0.03 - 0.09 * canto
    if (emocao === "pisca") return fecharOlho(-w, yi, w, yo, 0.055, NAVY)
    const topo = [[-w, yi], [-w * 0.5, yi - (cima * 4) / 3], [w * 0.4, yo - (cima * 4) / 3], [w, yo]]
    const fundo = [[w, yo], [w * 0.4, yo + (baixo * 4) / 3], [-w * 0.5, yi + (baixo * 4) / 3], [-w, yi]]
    const tracar = (p) => g.bezierCurveTo(...p[1], ...p[2], ...p[3])
    g.beginPath(); g.moveTo(...topo[0]); tracar(topo); tracar(fundo); g.closePath()
    g.fillStyle = "#f4f5f7"; g.fill()
    g.save(); g.clip()
    const yc = (bez(topo, 0.5)[1] + bez(fundo, 0.5)[1]) / 2
    const r = 0.125 * a.irisT
    let iris = cor
    if (a.irisDeg > 0) {
      iris = g.createLinearGradient(0, yc - r, 0, yc + r)
      iris.addColorStop(0.2, cor)
      iris.addColorStop(1, misturar(cor, a.irisC, a.irisDeg))
    }
    elipse(0, yc, r, r * 1.08, iris)
    g.lineWidth = 0.016; g.strokeStyle = misturar(cor, NAVY, 0.55); g.stroke()
    const p = r * a.pupilaT
    if (a.pupila === "redonda") elipse(0, yc, p * 0.45, p * 0.5, NAVY)
    else if (a.pupila === "fenda") elipse(0, yc, p * 0.15, r * 0.85, NAVY)
    else if (a.pupila !== "nada") { g.save(); g.translate(0, yc); g.scale(p * 0.6, p * 0.6); forma(g, a.pupila); g.fillStyle = NAVY; g.fill(); g.restore() }
    g.beginPath(); g.moveTo(...topo[0]); tracar(topo); g.lineWidth = 0.08; g.strokeStyle = "rgba(0, 20, 71, 0.22)"; g.stroke()
    for (const [x, y, t] of [[0.4, -0.42, 0.3], [-0.42, 0.45, 0.16], [-0.4, -0.48, 0.11]].slice(0, a.brilho)) elipse(r * x, yc + r * y, r * t * a.brilhoT, r * t * a.brilhoT, "#f4f5f7")
    g.restore()
    g.beginPath(); g.moveTo(...topo[0]); tracar(topo); g.lineWidth = 0.05; g.strokeStyle = NAVY; g.stroke()
    g.beginPath(); g.moveTo(...fundo[0]); tracar(fundo); g.lineWidth = 0.028; g.stroke()
    const c = (t) => bez(topo, t)
    const b = (t) => bez(fundo, t)
    return { cilios: [[...c(0.6), 0.03, -0.1], [...c(0.78), 0.07, -0.085], [...c(0.94), 0.11, -0.05]], baixos: [[...b(0.22), 0.05, 0.07], [...b(0.42), 0.025, 0.075]], asa: [w, yo] }
  }

  for (const l of [-1, 1]) {
    const corOlho = a.olho2 && l > 0 ? a.olhoC2 : a.olhoC
    g.save()
    g.translate(l * a.olhoX, -a.olhoY)
    g.scale(l, 1)
    g.rotate(-a.olhoR + (emocao === "triste" ? 0.18 : 0))
    g.scale(a.olhoT, a.olhoT * a.olhoA)
    const tipo = emocao === "pisca" || a.olho === "livre" ? a.olho : emocao === "alegre" ? (["grande", "estrela", "losango", "reptil"].includes(a.olho) ? a.olho : "feliz") : emocao === "triste" ? "sono" : a.olho
    const d = OLHOS[tipo]
    let marca = { cilios: d?.cilios ?? CILIOS, baixos: d?.baixo && [[...d.baixo, 0.04, 0.07], [d.baixo[0] + 0.05, d.baixo[1] - 0.035, 0.07, 0.045]], asa: d?.asa }
    // Blinking: a smiling eye is already closed; the ones drawn in the eye's colour close in that colour.
    if (tipo === "livre") marca = olhoLivre(corOlho)
    else if (emocao === "pisca" && tipo !== "feliz") marca = fecharOlho(-d.w, d.y, d.w, d.y, ["ponto", "traco"].includes(tipo) ? 0.065 : 0.055, ["ponto", "traco"].includes(tipo) ? corOlho : NAVY)
    else if (tipo === "oval") { elipse(0, 0, 0.12, 0.165, NAVY); elipse(0, 0.04, 0.075, 0.09, corOlho); elipse(0.035, -0.06, 0.04, 0.05, "#f4f5f7") }
    else if (tipo === "grande") { elipse(0, 0, 0.185, 0.215, "#f4f5f7"); g.lineWidth = 0.035; g.strokeStyle = NAVY; g.stroke(); elipse(0, 0.02, 0.125, 0.155, corOlho); elipse(0, 0.03, 0.06, 0.08, NAVY); elipse(0.05, -0.05, 0.045, 0.05, "#f4f5f7") }
    else if (tipo === "amendoa") {
      g.beginPath(); g.moveTo(-0.2, 0.02); g.quadraticCurveTo(0, -0.22, 0.2, -0.04); g.quadraticCurveTo(0.02, 0.17, -0.2, 0.02)
      g.fillStyle = "#f4f5f7"; g.fill(); g.save(); g.clip(); elipse(0, -0.01, 0.095, 0.12, corOlho); elipse(0, 0, 0.045, 0.06, NAVY); g.restore()
      curva(-0.2, 0.02, 0, -0.22, 0.2, -0.04, 0.05, NAVY)
    } else if (tipo === "reptil") {
      g.beginPath(); g.moveTo(-0.2, 0.02); g.quadraticCurveTo(0, -0.24, 0.2, -0.03); g.quadraticCurveTo(0.02, 0.2, -0.2, 0.02)
      g.fillStyle = corOlho; g.fill(); g.lineWidth = 0.04; g.strokeStyle = NAVY; g.stroke()
      elipse(0, -0.01, 0.03, 0.12, NAVY); elipse(0.075, -0.07, 0.03, 0.03, "#f4f5f7")
    } else if (tipo === "ponto") elipse(0, 0, 0.085, 0.1, corOlho)
    else if (tipo === "feliz") curva(-0.15, 0.05, 0, -0.19, 0.15, 0.05, 0.075, NAVY)
    else if (tipo === "sono") {
      g.beginPath(); g.ellipse(0, -0.02, 0.15, 0.13, 0, 0, PI); g.closePath(); g.fillStyle = "#f4f5f7"; g.fill()
      g.save(); g.clip(); elipse(0, 0.02, 0.08, 0.1, corOlho); g.restore(); linha([[-0.17, -0.02], [0.17, -0.02]], 0.06, NAVY)
    } else if (tipo === "traco") linha([[-0.14, 0], [0.14, 0]], 0.07, corOlho)
    else {
      g.save(); g.scale(tipo === "losango" ? 0.15 : 0.2, 0.2); forma(g, tipo)
      g.lineWidth = 0.3; g.strokeStyle = NAVY; g.stroke(); g.fillStyle = corOlho; g.fill(); g.restore()
    }
    if (a.cilios) for (const [x, y, dx, dy] of marca.cilios) linha([[x, y], [x + dx * a.ciliosL, y + dy * a.ciliosL]], 0.035 * a.ciliosG, NAVY)
    if (a.ciliosB && marca.baixos) for (const [x, y, dx, dy] of marca.baixos) linha([[x, y], [x + dx * a.ciliosL * 0.8, y + dy * a.ciliosL * 0.8]], 0.026 * a.ciliosG, NAVY)
    if (a.delineado > 0.01 && marca.asa) {
      // The liner's wing: a point flicked up and out from the outer corner.
      const [x, y] = marca.asa
      const k = 0.5 + 0.5 * a.delineado
      g.beginPath(); g.moveTo(x - 0.07 * k, y - 0.035 * k); g.lineTo(x + 0.16 * a.delineado, y - 0.09 * a.delineado); g.lineTo(x, y + 0.02 * k); g.closePath()
      g.fillStyle = NAVY; g.fill()
    }
    g.restore()

    if (a.sobr !== "nada") {
      g.save()
      g.translate(l * a.sobrX, -a.sobrY)
      g.scale(l, 1)
      g.rotate(-a.sobrR + (emocao === "triste" ? 0.35 : 0))
      g.scale(a.sobrT, a.sobrT)
      const G = a.sobrG
      if (a.sobr === "arco") curva(-0.16, 0.02, 0, -0.1, 0.17, 0.02, 0.065 * G, a.sobrC)
      else if (a.sobr === "reta") linha([[-0.17, 0], [0.17, 0]], 0.07 * G, a.sobrC)
      else if (a.sobr === "grossa") linha([[-0.16, 0.01], [0.17, -0.01]], 0.13 * G, a.sobrC)
      else if (a.sobr === "brava") linha([[-0.19, 0.08], [0.17, -0.06]], 0.09 * G, a.sobrC)
      else if (a.sobr === "fina") curva(-0.17, 0.03, 0, -0.13, 0.19, 0.03, 0.035 * G, a.sobrC)
      else if (a.sobr === "angulo") linha([[-0.18, 0.03], [0.07, -0.07], [0.19, 0.03]], 0.065 * G, a.sobrC)
      else if (a.sobr === "bolinha") elipse(-0.07, 0, 0.075 * Math.min(G, 1.3), 0.055 * G, a.sobrC)
      else if (a.sobr === "preocupada") curva(-0.18, -0.07, -0.02, -0.04, 0.17, 0.06, 0.07 * G, a.sobrC)
      else if (a.sobr === "onda") { g.beginPath(); g.moveTo(-0.18, 0.02); g.bezierCurveTo(-0.08, -0.1, 0.05, 0.08, 0.19, -0.04); g.lineWidth = 0.06 * G; g.strokeStyle = a.sobrC; g.stroke() }
      else if (a.sobr === "peluda") {
        // Bushy: a solid band with a ragged top; thickness pulls the tufts up.
        g.beginPath(); g.moveTo(-0.19, 0.05); g.quadraticCurveTo(0, 0.02, 0.2, 0.04)
        for (const [x, y] of [[0.17, -0.06], [0.11, -0.02], [0.06, -0.09], [0, -0.04], [-0.06, -0.1], [-0.11, -0.04], [-0.16, -0.08]]) g.lineTo(x, 0.03 + (y - 0.03) * G)
        g.closePath(); g.fillStyle = a.sobrC; g.fill()
      } else { linha([[-0.17, 0], [0.04, -0.03]], 0.07 * G, a.sobrC); linha([[0.14, -0.01], [0.18, 0.01]], 0.07 * G, a.sobrC) }
      g.restore()
    }
  }

  g.save()
  g.translate(0, -a.bocaY)
  g.rotate(a.bocaR)
  g.scale(a.bocaT, a.bocaT * a.bocaA)
  const boca = emocao === "alegre" ? (["presas", "berro"].includes(a.boca) ? a.boca : "aberta") : emocao === "triste" ? "triste" : a.boca
  if (boca === "sorriso") curva(-0.22, -0.04, 0, 0.17, 0.22, -0.04, 0.07, a.bocaC)
  else if (boca === "triste") curva(-0.19, 0.09, 0, -0.12, 0.19, 0.09, 0.07, a.bocaC)
  else if (boca === "lado") curva(-0.17, 0.02, 0.1, 0.1, 0.22, -0.07, 0.07, a.bocaC)
  else if (boca === "reta") linha([[-0.19, 0], [0.19, 0]], 0.07, a.bocaC)
  else if (boca === "oh") elipse(0, 0, 0.1, 0.13, a.bocaC)
  else if (boca === "gato") {
    curva(-0.22, -0.02, -0.11, 0.15, 0, -0.02, 0.06, a.bocaC); curva(0, -0.02, 0.11, 0.15, 0.22, -0.02, 0.06, a.bocaC)
    linha([[0, -0.02], [0, -0.15]], 0.05, a.bocaC)
  } else if (boca === "presas") {
    curva(-0.25, -0.05, 0, 0.17, 0.25, -0.05, 0.07, a.bocaC)
    for (const l of [-1, 1]) {
      g.beginPath(); g.moveTo(l * 0.085, 0.045); g.lineTo(l * 0.175, 0.025); g.lineTo(l * 0.14, 0.17); g.closePath()
      g.fillStyle = "#f4f5f7"; g.fill(); g.lineWidth = 0.025; g.strokeStyle = NAVY; g.stroke()
    }
  } else if (boca === "tres") {
    g.beginPath(); g.arc(-0.075, -0.03, 0.075, PI, 0, true); g.arc(0.075, -0.03, 0.075, PI, 0, true)
    g.lineWidth = 0.06; g.strokeStyle = a.bocaC; g.stroke()
  } else if (boca === "bico") {
    // A kiss: the pucker drawn as a little 3.
    g.beginPath(); g.moveTo(-0.02, -0.1); g.quadraticCurveTo(0.11, -0.08, 0.015, 0); g.quadraticCurveTo(0.11, 0.08, -0.02, 0.1)
    g.lineWidth = 0.06; g.strokeStyle = a.bocaC; g.stroke()
  } else if (boca === "assobio") {
    elipse(0.07, 0, 0.07, 0.075, a.bocaC); elipse(0.07, 0, 0.032, 0.036, misturar(a.bocaC, NAVY, 0.55))
  } else if (boca === "onda") {
    g.beginPath(); g.moveTo(-0.22, 0); g.quadraticCurveTo(-0.147, -0.08, -0.073, 0); g.quadraticCurveTo(0, 0.08, 0.073, 0); g.quadraticCurveTo(0.147, -0.08, 0.22, 0)
    g.lineWidth = 0.06; g.strokeStyle = a.bocaC; g.stroke()
  } else if (boca === "dente") {
    // Two front teeth under the smile line, which is drawn last so it sits on them.
    for (const x of [-0.06, 0]) { g.beginPath(); g.rect(x, 0.01, 0.06, 0.12); g.fillStyle = "#f4f5f7"; g.fill(); g.lineWidth = 0.02; g.strokeStyle = NAVY; g.stroke() }
    curva(-0.21, -0.03, 0, 0.1, 0.21, -0.03, 0.065, a.bocaC)
  } else if (boca === "berro") {
    // Shouting: taller than the open mouth, with the throat and the tongue showing.
    g.beginPath(); g.moveTo(-0.24, -0.1); g.quadraticCurveTo(0, -0.15, 0.24, -0.1); g.bezierCurveTo(0.27, 0.36, -0.27, 0.36, -0.24, -0.1); g.closePath()
    g.fillStyle = a.bocaC; g.fill(); g.save(); g.clip()
    elipse(0, 0.05, 0.13, 0.09, misturar(a.bocaC, NAVY, 0.45))
    g.fillStyle = "#f4f5f7"; g.fillRect(-0.22, -0.17, 0.44, 0.075); elipse(0, 0.26, 0.17, 0.1, "#ff7285")
    g.restore()
  }
  else {
    g.beginPath(); g.moveTo(-0.26, -0.07); g.quadraticCurveTo(0, -0.12, 0.26, -0.07); g.bezierCurveTo(0.22, 0.2, -0.22, 0.2, -0.26, -0.07); g.closePath()
    g.fillStyle = a.bocaC; g.fill(); g.save(); g.clip()
    if (boca === "dentes") { g.fillStyle = "#f4f5f7"; g.fillRect(-0.3, -0.14, 0.6, 0.13); g.fillRect(-0.3, 0.1, 0.6, 0.1) }
    else { g.fillStyle = "#f4f5f7"; g.fillRect(-0.2, -0.14, 0.4, 0.07); elipse(0, 0.14, 0.15, 0.08, "#ff7285") }
    g.restore()
    if (boca === "lingua") elipse(0.09, 0.14, 0.08, 0.11, "#ff7285")
  }
  g.restore()
  if (a.barba === "bigode" || a.barba === "cavanhaque" || a.barba === "longa") {
    const y = -a.bocaY - 0.17
    g.beginPath(); g.moveTo(0, y - 0.06); g.bezierCurveTo(0.2, y - 0.12, 0.34, y, 0.4, y + 0.12); g.quadraticCurveTo(0.18, y + 0.05, 0, y + 0.05)
    g.quadraticCurveTo(-0.18, y + 0.05, -0.4, y + 0.12); g.bezierCurveTo(-0.34, y, -0.2, y - 0.12, 0, y - 0.06)
    g.fillStyle = a.barbaC; g.fill()
  }
  if (a.nariz === "narinas") for (const l of [-1, 1]) elipse(l * 0.075 * a.narizT, -a.narizY, 0.032 * a.narizT, 0.022 * a.narizT, a.narizCor ? a.narizC : misturar(a.pele, NAVY, 0.55))
  if (a.pinta) elipse(0.34, 0.3, 0.03, 0.03, "#33231d")
  if (a.cicatriz) { linha([[-0.5, -0.5], [-0.3, 0.02]], 0.035, misturar(a.pele, "#8a1f2d", 0.6)); linha([[-0.48, -0.3], [-0.36, -0.34]], 0.03, misturar(a.pele, "#8a1f2d", 0.6)) }
  carimbos(g, a, "rosto")
  return textura(tela)
}

/** The shirt: the front is the middle half of the map. */
function pintarCamisa(a, escala) {
  const W = 1024
  const H = 512
  const tela = document.createElement("canvas")
  tela.width = W * escala
  tela.height = H * escala
  const g = tela.getContext("2d", { willReadFrequently: true })
  g.scale(escala, escala)
  const nu = a.roupa === "pele" || a.roupa === "barriga"
  g.fillStyle = nu ? a.pele : a.cor
  g.fillRect(0, 0, W, H)
  g.fillStyle = a.detalhe
  const p = 64 * a.estT
  const meio = W / 2
  if (nu) {
    g.save(); g.translate(meio, 256); g.scale(160, 160); pelagem(g, a, "corpo"); g.restore()
    if (a.roupa === "barriga") {
      g.save()
      g.beginPath(); g.ellipse(meio, 330, 150 * a.estT, 250, 0, 0, PI * 2); g.fillStyle = a.detalhe; g.fill(); g.clip()
      g.strokeStyle = misturar(a.detalhe, NAVY, 0.3); g.lineWidth = 7
      for (let y = 130; y < H; y += 46) { g.beginPath(); g.moveTo(meio - 200, y); g.quadraticCurveTo(meio, y + 16, meio + 200, y); g.stroke() }
      g.restore()
    }
  } else if (a.roupa === "manto") {
    g.fillStyle = a.terceira
    g.beginPath(); [[-46, 0], [46, 0], [120, H], [-120, H]].forEach(([x, y]) => g.lineTo(meio + x, y)); g.fill()
    g.strokeStyle = a.detalhe; g.lineWidth = 30
    for (const l of [-1, 1]) { g.beginPath(); g.moveTo(meio + l * 52, 0); g.lineTo(meio + l * 128, H); g.stroke() }
  } else if (a.roupa === "listras" || a.roupa === "tricolor") {
    for (let i = -20; i <= 20; i++) {
      const c = a.roupa === "listras" ? [null, a.detalhe][Math.abs(i) % 2] : [null, a.detalhe, a.terceira][((i % 3) + 3) % 3]
      if (c) { g.fillStyle = c; g.fillRect(meio + i * p - p / 2, 0, p, H) }
    }
  } else if (a.roupa === "listrado") for (let i = 1; i < 18; i += 2) g.fillRect(0, i * p * 0.85, W, p * 0.85)
  else if (a.roupa === "faixa") {
    g.save(); g.translate(meio, 310); g.rotate(0.75); g.fillRect(-420, -p * 0.75, 840, p * 1.1)
    g.fillStyle = a.terceira; g.fillRect(-420, p * 0.35, 840, p * 0.3); g.restore()
  } else if (a.roupa === "peito") {
    g.fillRect(0, 270, W, p); g.fillStyle = a.terceira; g.fillRect(0, 270 + p, W, p * 0.5)
  } else if (a.roupa === "metade") g.fillRect(meio, 0, meio, H)
  else if (a.roupa === "xadrez") {
    for (let x = -20; x <= 20; x++) for (let y = 0; y < 20; y++) if ((x + y) % 2 === 0) g.fillRect(meio + x * p * 0.7, y * p * 0.7, p * 0.7, p * 0.7)
  } else if (a.roupa === "malha") {
    g.strokeStyle = a.detalhe; g.lineWidth = 7
    for (let i = -20; i < 30; i++) for (const d of [1, -1]) { g.beginPath(); g.moveTo(meio + i * p, 0); g.lineTo(meio + i * p + d * H, H); g.stroke() }
  } else if (a.roupa === "chevron") {
    for (let i = 0; i < 2; i++) {
      const y = 235 + i * p * 1.6
      g.fillStyle = i ? a.terceira : a.detalhe
      g.beginPath(); [[-300, -160], [0, 80], [300, -160], [300, -160 + p], [0, 80 + p], [-300, -160 + p]].forEach(([x, dy]) => g.lineTo(meio + x, y + dy)); g.fill()
    }
  } else if (a.roupa === "degrade") {
    const d = g.createLinearGradient(0, 120, 0, 120 + 340 * a.estT); d.addColorStop(0, a.cor); d.addColorStop(1, a.detalhe); g.fillStyle = d; g.fillRect(0, 0, W, H)
  }
  if (a.gola === "v" || a.gola === "polo") {
    g.fillStyle = a.golaC; g.beginPath(); [[-112, 0], [0, 176], [112, 0]].forEach(([x, y]) => g.lineTo(meio + x, y)); g.fill()
    g.fillStyle = misturar(a.pele, NAVY, 0.1); g.beginPath(); [[-76, 0], [0, 128], [76, 0]].forEach(([x, y]) => g.lineTo(meio + x, y)); g.fill()
    if (a.gola === "polo") { g.fillStyle = a.golaC; g.fillRect(meio - 11, 150, 22, 92); g.fillStyle = NAVY; g.fillRect(meio - 5, 186, 10, 10); g.fillRect(meio - 5, 216, 10, 10) }
  }
  if (a.numOn) {
    g.font = `700 ${190 * a.numT}px "Space Grotesk", sans-serif`
    g.textAlign = "center"; g.textBaseline = "middle"
    g.lineWidth = 12; g.lineJoin = "round"; g.strokeStyle = NAVY; g.fillStyle = a.numC
    g.save(); g.translate(meio, 310 - a.numY * 190); g.scale(0.82, 1); g.strokeText(String(a.numero), 0, 0); g.fillText(String(a.numero), 0, 0); g.restore()
  }
  g.translate(meio, 290); g.scale(200, 200)
  carimbos(g, a, "camisa")
  return textura(tela)
}

/** Builds one fan. `qualidade` 1 is the editor's, 0.5 what the stand's pictures need. */
export function criarBoneco(a, { qualidade = 1, traco = 0.04 } = {}) {
  const fina = qualidade === 1
  const N = fina ? 64 : 32
  const lixo = []
  const guardar = (x) => (lixo.push(x), x)
  const materiais = new Map()
  const material = (c, extra = null) => {
    if (extra) return guardar(new THREE.MeshToonMaterial({ color: c, gradientMap: DEGRAUS, side: THREE.DoubleSide, ...extra }))
    if (!materiais.has(c)) materiais.set(c, guardar(new THREE.MeshToonMaterial({ color: c, gradientMap: DEGRAUS, side: THREE.DoubleSide })))
    return materiais.get(c)
  }
  const contorno = guardar(new THREE.MeshBasicMaterial({ color: NAVY, side: THREE.BackSide }))

  function parte(pai, geo, c, { linha = traco, mat, p, r, s, fora, local, solta } = {}) {
    if (solta) {
      // Not baked: an Object3D the editor's gizmo can move. The outline is today's, kept in step by contornar().
      const o = new THREE.Group()
      if (p) o.position.copy(p)
      if (r) o.rotation.set(...r)
      if (s) o.scale.set(...s)
      pai.add(o)
      o.add(new THREE.Mesh(guardar(geo), mat ?? material(c)))
      if (linha) {
        const f = new THREE.Mesh(geo, contorno)
        f.matrixAutoUpdate = false
        o.add(f)
        o.userData.contorno = { f, linha }
        contornar(o)
      }
      return o
    }
    if (local) {
      // Outlined in its own frame, then placed: for flat or curved pieces that are turned.
      if (s) geo.scale(...s)
      const grupo = new THREE.Group()
      if (p) grupo.position.copy(p)
      if (r) grupo.rotation.set(...r)
      pai.add(grupo)
      return parte(grupo, geo, c, { linha, mat, fora })
    }
    if (p || r || s) {
      const o = new THREE.Object3D()
      if (p) o.position.copy(p)
      if (r) o.rotation.set(...r)
      if (s) o.scale.set(...s)
      o.updateMatrix()
      geo.applyMatrix4(o.matrix)
    }
    guardar(geo)
    const m = new THREE.Mesh(geo, mat ?? material(c))
    pai.add(m)
    if (fora) pai.add(new THREE.Mesh(guardar(fora), contorno))
    else if (linha) {
      // The outline: the same piece a little bigger, inside out.
      geo.computeBoundingBox()
      const t = geo.boundingBox.getSize(V(0, 0, 0))
      const meio = geo.boundingBox.getCenter(V(0, 0, 0))
      const k = [t.x, t.y, t.z].map((d) => 1 + (2 * linha) / Math.max(d, 0.09))
      const fora = new THREE.Mesh(geo, contorno)
      fora.scale.set(...k)
      fora.position.set(meio.x * (1 - k[0]), meio.y * (1 - k[1]), meio.z * (1 - k[2]))
      pai.add(fora)
    }
    return m
  }
  /** A loose piece's outline exactly as a baked one: its box taken in the parent's axes, pushed out by `linha`. */
  const caixa = new THREE.Box3()
  const ponto = V(0, 0, 0)
  const inversa = new THREE.Matrix4()
  function contornar(o) {
    const { f, linha } = o.userData.contorno ?? {}
    if (!f) return
    o.updateMatrix()
    const pos = f.geometry.attributes.position
    caixa.makeEmpty()
    for (let i = 0; i < pos.count; i++) caixa.expandByPoint(ponto.fromBufferAttribute(pos, i).applyMatrix4(o.matrix))
    const t = caixa.getSize(V(0, 0, 0))
    const meio = caixa.getCenter(V(0, 0, 0))
    const k = [t.x, t.y, t.z].map((d) => 1 + (2 * linha) / Math.max(d, 0.09))
    f.matrix.makeScale(...k).setPosition(meio.x * (1 - k[0]), meio.y * (1 - k[1]), meio.z * (1 - k[2]))
    f.matrix.multiply(o.matrix).premultiply(inversa.copy(o.matrix).invert())
    f.matrixWorldNeedsUpdate = true
  }

  const expoente = a.quadr >= 0 ? 2 + a.quadr * 4 : 2 + a.quadr * 0.75
  /** A point round the head: phi from the face, theta from the top, r out from its surface. */
  function S(phi, theta, r = 1) {
    let x = Math.sin(phi) * Math.sin(theta)
    let y = Math.cos(theta)
    let z = Math.cos(phi) * Math.sin(theta)
    const f = (Math.abs(x) ** expoente + Math.abs(y) ** expoente + Math.abs(z) ** expoente) ** (-1 / expoente)
    x *= f; y *= f; z *= f
    const baixo = suave(0, 1, -y)
    const alto = suave(0, 1, y)
    const estreita = 1 + a.queixo * 0.36 * baixo + a.testa * 0.25 * alto
    const gordo = 1 + a.bochecha * 0.24 * Math.exp(-(((y + 0.32) / 0.32) ** 2))
    // The muzzle: the front of the face pushed out, flat at the tip, so the nose and mouth ride on it.
    let bico = 0
    if (a.focinho > 0 && z > 0) bico = a.focinho * 0.85 * (1 - suave(0.45, 1.1, Math.hypot(x / (0.4 * a.focinhoL), (y - a.focinhoY) / 0.3))) * suave(0, 0.6, z)
    return V(x * a.larg * estreita * gordo * r, y * a.alt * r, (z * (1 + (estreita - 1) * 0.4) + bico) * r)
  }
  const naCara = (x, y, r = 1) => S(x, PI / 2 - y, r)
  const casca = (borda, raio, nu = N, nv = 20) => malha((u, v) => {
    const phi = (u - 0.5) * 2 * PI
    const b = borda(phi)
    return S(phi, 0.002 + b * v, typeof raio === "function" ? raio(phi, 0.002 + b * v, v) : raio)
  }, nu, nv)
  const bola = (r = 1) => new THREE.SphereGeometry(r, fina ? 20 : 12, fina ? 14 : 9)
  const tubo = (pts, r, fechado = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, fechado), Math.max(12, pts.length * 3), r, 8, fechado)
  function entreDois(de, ate, r0, r1 = r0) {
    const g = new THREE.CylinderGeometry(r1, r0, de.distanceTo(ate), 12)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), ate.clone().sub(de).normalize()))
    g.translate((de.x + ate.x) / 2, (de.y + ate.y) / 2, (de.z + ate.z) / 2)
    return g
  }

  const raiz = new THREE.Group()
  const cabeca = new THREE.Group()
  const rosto = new THREE.Group()
  cabeca.position.y = -0.95
  rosto.position.y = 0.95
  rosto.scale.setScalar(a.tam)
  cabeca.add(rosto)
  raiz.add(cabeca)

  // Head
  const peleMat = material("#ffffff", { map: guardar(pintarRosto(a, "normal", qualidade)) })
  const rostos = { normal: peleMat.map }
  parte(rosto, malha((u, v) => S((u - 0.5) * 2 * PI, 0.002 + v * (PI - 0.004)), N, N / 2), a.pele, { mat: peleMat })

  if (a.orelha !== "nada")
    for (const l of [-1, 1]) {
      const p = naCara((l * PI) / 2, -0.06 + a.orelhaY)
      const t = a.orelhaT
      const R = l * a.orelhaR
      const cor = a.orelha2 ? a.orelhaC : a.pele
      if (a.orelha === "pontuda") parte(rosto, new THREE.ConeGeometry(0.16 * t, 0.5 * t, 12), cor, { p: p.add(V(l * 0.12 * t, 0.12 * t, 0)), r: [0, 0, -l * 0.85 - R], s: [1, 1, 0.55] })
      else if (a.orelha === "elfa") parte(rosto, new THREE.ConeGeometry(0.15 * t, 0.95 * t, 12), cor, { p: naCara((l * PI) / 2, 0.02 + a.orelhaY).add(V(l * 0.38 * t, 0.2 * t, -0.06)), r: [-0.2, 0, -l * 1.12 - R], s: [1, 1, 0.42] })
      else if (a.orelha === "animal") parte(rosto, new THREE.ConeGeometry(0.3 * t, 0.62 * t, 4), cor, { p: S(l * 0.95, 0.62 - a.orelhaY, 0.9).add(V(l * 0.1 * t, 0.26 * t, 0)), r: [0, 0, -l * 0.38 - R], s: [1, 1, 0.42], local: true })
      else if (a.orelha === "caida") parte(rosto, bola(), cor, { p: S(l * 1.3, 0.92 - a.orelhaY, 1.0).add(V(l * 0.2, -0.34 * t, -0.02)), r: [0, l * 0.3, l * 0.16 + R], s: [0.12, 0.54 * t, 0.3 * t], local: true })
      else if (a.orelha === "urso") parte(rosto, bola(), cor, { p: S(l * 0.72, 0.55 - a.orelhaY, 0.98).add(V(0, 0.1 * t, 0)), r: [0, 0, -R], s: [0.26 * t, 0.26 * t, 0.11], local: true })
      else parte(rosto, bola(), cor, { p: p.add(V(l * 0.04, 0, 0)), r: [0, 0, (a.orelha === "abano" ? -l * 0.35 : 0) - R], s: a.orelha === "abano" ? [0.22 * t, 0.25 * t, 0.08] : [0.13 * t, 0.19 * t, 0.12 * t] })
    }

  // Horns: tapered tubes from the top of the head, each with its own outline.
  if (a.chifre !== "nada") {
    const k = a.chifreT
    const chifre = (pts, raio, c = a.chifreC) => {
      const { g, curva } = tuboAfinado(pts, raio, { lados: fina ? 10 : 7, n: fina ? 20 : 12 })
      parte(rosto, g, c, { fora: tuboAfinado(pts, raio, { lados: 7, n: 12, mais: traco }).g })
      return curva
    }
    const mais = (p, x, y, z) => p.clone().add(V(x * k, y * k, z * k))
    for (const l of a.chifre === "unicornio" ? [0] : [-1, 1]) {
      if (a.chifre === "dragao") {
        const b = S(l * 0.5, 0.55, 0.9)
        chifre([b, mais(b, l * 0.12, 0.38, -0.22), mais(b, l * 0.2, 0.64, -0.62), mais(b, l * 0.16, 0.66, -1.0)], (t) => k * (0.17 * (1 - t) ** 0.9 + 0.012))
      } else if (a.chifre === "carneiro") {
        const c0 = V(l * 1.0, 0.5, -0.15)
        const pts = [S(l * 0.55, 0.5, 0.9)]
        for (let i = 0; i <= 12; i++) {
          const w = (i / 12) * 1.75 * PI
          const raio = 0.45 * k * (1 - (i / 12) * 0.6)
          pts.push(c0.clone().add(V(l * (0.12 + i * 0.012) * k, raio * Math.cos(w), -raio * Math.sin(w))))
        }
        chifre(pts, (t) => k * (0.19 * (1 - t * 0.75)))
      } else if (a.chifre === "touro") {
        const b = S(l * 0.85, 0.72, 0.95)
        chifre([b, mais(b, l * 0.42, 0.04, 0.05), mais(b, l * 0.72, 0.3, 0.12), mais(b, l * 0.76, 0.62, 0.16)], (t) => k * (0.15 * (1 - t) + 0.012))
      } else if (a.chifre === "unicornio") {
        const b = S(0, 0.38, 0.95)
        chifre([b, mais(b, 0, 0.48, 0.18), mais(b, 0, 0.95, 0.36)], (t) => k * (0.13 * (1 - t) + 0.008))
      } else if (a.chifre === "diabinho") {
        const b = S(l * 0.42, 0.5, 0.94)
        chifre([b, mais(b, l * 0.1, 0.18, 0.02), mais(b, l * 0.05, 0.36, 0.06)], (t) => k * (0.11 * (1 - t) + 0.006))
      } else if (a.chifre === "antena") {
        const b = S(l * 0.32, 0.32, 0.95)
        const fim = mais(b, l * 0.42, 0.78, 0.12)
        chifre([b, mais(b, l * 0.12, 0.42, 0.04), fim], () => 0.032 * k)
        parte(rosto, bola(0.11 * k), a.chifreC, { p: fim })
      } else if (a.chifre === "galhada") {
        const b = S(l * 0.5, 0.5, 0.92)
        const viga = chifre([b, mais(b, l * 0.25, 0.42, -0.05), mais(b, l * 0.62, 0.78, -0.1), mais(b, l * 0.78, 1.18, -0.12)], (t) => k * (0.075 * (1 - t * 0.6)))
        for (const [t, x, y] of [[0.42, -0.08, 0.42], [0.72, 0.1, 0.4]]) {
          const o = viga.getPointAt(t)
          chifre([o, mais(o, l * x * 0.5, y * 0.55, 0.03), mais(o, l * x, y, 0.06)], (u) => k * (0.05 * (1 - u * 0.75)))
        }
      }
    }
  }

  if (a.nariz !== "nada" && a.nariz !== "narinas") {
    const t = a.narizT
    const p = naCara(0, a.narizY)
    const c = a.narizCor ? a.narizC : misturar(a.pele, "#7a2e22", 0.12)
    if (a.nariz === "triangulo") parte(rosto, new THREE.ConeGeometry(0.11 * t, 0.2 * t, 4), c, { p: p.add(V(0, 0, 0.06)), r: [0.6, 0, 0], linha: traco * 0.5 })
    else parte(rosto, bola(), c, { p, s: a.nariz === "longo" ? [0.085 * t, 0.17 * t, 0.15 * t] : a.nariz === "bola" ? [0.13 * t, 0.12 * t, 0.13 * t] : [0.085 * t, 0.07 * t, 0.09 * t], linha: traco * 0.5 })
  }

  if (a.barba === "longa")
    parte(rosto, malha((u, v) => {
      const x = (u - 0.5) * 2.5
      const p = naCara(x, -0.68 - v * 0.2, 1.07)
      return V(p.x * (1 - v * 0.6), p.y - v * (0.6 - Math.abs(x) * 0.35), p.z * (1 - v * 0.15))
    }, 20, 8), a.barbaC)

  // Hair
  const noChapeu = !["nada", "aureola", "festa", "bandana", "coroa", "tiara"].includes(a.chapeu) || a.capuz === "levantado"
  const corPonta = new THREE.Color(a.cab2 ? a.cabC2 : a.cabC)
  const corRaiz = new THREE.Color(a.cabC)
  const cabeloMat = material("#ffffff", { vertexColors: true })
  function cabelo(geo, opcoes = {}) {
    const m = parte(rosto, geo, "#ffffff", { ...opcoes, mat: cabeloMat })
    const pos = m.geometry.attributes.position
    const cores = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      c.copy(corPonta).lerp(corRaiz, suave(a.gradP - a.gradS, a.gradP + a.gradS, pos.getY(i)))
      cores.set([c.r, c.g, c.b], i * 3)
    }
    m.geometry.setAttribute("color", new THREE.BufferAttribute(cores, 3))
    return m
  }
  const lado = a.vira ? -1 : 1
  function frente(phi) {
    const x = entre((phi * lado) / 1.25, -1, 1)
    const L = a.franjaL * 0.15
    switch (a.franja) {
      case "reta": return 1.17 + L
      case "lado": return 0.98 + x * 0.3 + L
      case "cortina": return 0.68 + Math.min(1, Math.abs(x) * 1.7) * 0.5 + L * Math.abs(x)
      case "mechas": return 0.96 + (1 - Math.abs(((((phi + PI) * 1.5) % 1) + 1) % 1 * 2 - 1)) * 0.3 + L
      case "bico": return 0.78 + Math.max(0, 1 - Math.abs(x) * 2.2) * 0.3 + L
      case "topete": return 0.74
      default: return 0.82 - a.linha * 0.3 + Math.max(0, 1 - Math.abs(x) * 2) * a.linha * 0.2
    }
  }
  const linhaCabelo = (phi) => {
    const p = Math.abs(phi)
    const lateral = p < 1.75 ? 1.72 : 1.72 + suave(1.75, 2.6, p) * 0.5
    return frente(phi) + (lateral - frente(phi)) * suave(0.95, 1.45, p)
  }
  const raioCabelo = 1.05 + (a.topo === "volume" ? 0.16 + a.vol * 0.1 : a.vol * 0.07)
  if (a.topo === "raspado") parte(rosto, casca(linhaCabelo, 1.014), misturar(a.pele, a.cabC, 0.62), { linha: 0 })
  else if (a.topo === "afro" && !noChapeu)
    cabelo(casca(linhaCabelo, (phi, th, v) => 1.04 + (0.3 + a.vol * 0.17) * Math.min(1, (1 - v) * 4 + 0.15) + 0.035 * Math.sin(phi * 11) * Math.sin(th * 10), N + 16, 24))
  else if (a.topo === "moicano") parte(rosto, casca(linhaCabelo, 1.014), misturar(a.pele, a.cabC, 0.45), { linha: 0 })
  else if (a.topo !== "careca")
    cabelo(casca(linhaCabelo, (phi, th, v) => {
      const r = noChapeu ? 1.05 : raioCabelo
      return r + (1.035 - r) * suave(0.6, 1, v)
    }, N + 32, 20))

  if (!noChapeu && a.topo === "cachos") {
    const n = fina ? 46 : 30
    for (let i = 0; i < n; i++) {
      const phi = ((i * 2.399963) % (2 * PI)) - PI
      const th = Math.min(Math.sqrt((i + 0.5) / n) * 1.95, linhaCabelo(phi) - 0.12)
      cabelo(bola(0.22 + a.vol * 0.07), { p: S(phi, th, 1.07), linha: i % 2 ? traco : 0 })
    }
  }

  // Locks (mechas): tapered, slightly flat ribbons along a curve, giving the cut its shape over the shell.
  // All of them go in one mesh and one outline, so a whole head of locks costs two draws.
  const fios = { pos: [], cor: [], idx: [], fpos: [], fidx: [] }
  const tom = new THREE.Color()
  /** One lock along `pts`, root first. larg: half width at the root; chato: thickness over width; ponta 1 ends sharp, 0 blunt;
   *  afina above 1 keeps it wide longer before the point; plano: the way its flat side faces (a vector, or p => vector);
   *  nasce: how far along the outline reaches full width, so a root buried in the shell surfaces without a line. */
  function mecha(pts, { larg = 0.1, chato = 0.45, ponta = 1, afina = 1, cor = null, linha = traco, plano = null, nasce = 0.2, segs = fina ? 14 : 9 } = {}) {
    const curva = new THREE.CatmullRomCurve3(pts)
    const lados = fina ? 8 : 6
    const b = fios.pos.length / 3
    const fb = fios.fpos.length / 3
    let A = null
    const anel = (lista, p, U, w, h) => {
      for (let j = 0; j < lados; j++) {
        const ang = (j / lados) * 2 * PI
        const c = Math.cos(ang) * w
        const s = Math.sin(ang) * h
        lista.push(p.x + U.x * c + A.x * s, p.y + U.y * c + A.y * s, p.z + U.z * c + A.z * s)
      }
    }
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const p = curva.getPointAt(t)
      const T = curva.getTangentAt(t)
      let n = typeof plano === "function" ? plano(p) : plano ? plano.clone() : V(p.x, p.y * 0.5, p.z)
      n.addScaledVector(T, -T.dot(n))
      if (n.lengthSq() < 1e-4) {
        n = A ? A.clone() : Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)
        n.addScaledVector(T, -T.dot(n))
      }
      n.normalize()
      // Kept on the same side from ring to ring, or the ribbon would twist.
      if (A && n.dot(A) < 0) n.negate()
      A = n
      const U = A.clone().cross(T)
      const w = larg * (0.72 + 0.28 * suave(0, 0.2, t)) * (ponta * (1 - t ** afina) ** 0.75 + (1 - ponta) * (1 - 0.4 * t))
      anel(fios.pos, p, U, w, w * chato)
      const e = linha * suave(0, nasce, t)
      if (linha) anel(fios.fpos, p, U, w + e, w * chato + e)
      if (i < segs)
        for (let j = 0; j < lados; j++) {
          const q = i * lados + j
          const r = i * lados + ((j + 1) % lados)
          fios.idx.push(b + q, b + r, b + q + lados, b + r, b + r + lados, b + q + lados)
          if (linha) fios.fidx.push(fb + q, fb + r, fb + q + lados, fb + r, fb + r + lados, fb + q + lados)
        }
    }
    // Caps: flat at the root; the outline's tip a little past the point, so the point gets its line too.
    const fim = segs * lados
    const tampar = (lista, idx, base, p0, p1) => {
      const c = lista.length / 3
      lista.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
      for (let j = 0; j < lados; j++) {
        const r = (j + 1) % lados
        idx.push(c, base + r, base + j, c + 1, base + fim + j, base + fim + r)
      }
    }
    const ponto = curva.getPointAt(1)
    tampar(fios.pos, fios.idx, b, curva.getPointAt(0), ponto)
    if (linha) tampar(fios.fpos, fios.fidx, fb, curva.getPointAt(0), ponto.clone().addScaledVector(curva.getTangentAt(1), linha * 1.2))
    const propria = cor && new THREE.Color(cor)
    for (let i = b * 3; i < fios.pos.length; i += 3) {
      if (propria) tom.copy(propria)
      else tom.copy(corPonta).lerp(corRaiz, suave(a.gradP - a.gradS, a.gradP + a.gradS, fios.pos[i + 1]))
      fios.cor.push(tom.r, tom.g, tom.b)
    }
  }
  function fecharFios() {
    if (!fios.idx.length) return
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(fios.pos, 3))
    g.setAttribute("color", new THREE.Float32BufferAttribute(fios.cor, 3))
    g.setIndex(fios.idx)
    g.computeVertexNormals()
    let fora = null
    if (fios.fidx.length) {
      fora = new THREE.BufferGeometry()
      fora.setAttribute("position", new THREE.Float32BufferAttribute(fios.fpos, 3))
      fora.setIndex(fios.fidx)
    }
    parte(rosto, g, "#ffffff", { mat: cabeloMat, fora, linha: 0 })
  }

  const rTopo = noChapeu ? 1.05 : raioCabelo
  const voltaPhi = (phi) => ((((phi + PI) % (2 * PI)) + 2 * PI) % (2 * PI)) - PI
  /** How far out the hair is at a place on the head, so locks lie on it (1.035 is just past the hairline). */
  function rCasca(phi, th) {
    if (a.topo === "careca") return 1
    if (a.topo === "raspado" || a.topo === "moicano") return 1.014
    const v = th / linhaCabelo(voltaPhi(phi))
    if (a.topo === "afro" && !noChapeu) return 1.04 + (0.3 + a.vol * 0.17) * Math.min(1, (1 - Math.min(v, 1)) * 4 + 0.15)
    return rTopo + (1.035 - rTopo) * suave(0.6, 1, v)
  }
  const naCasca = (phi, th, mais = 0.012) => S(phi, th, rCasca(phi, th) + mais)
  /** Points over the hair from one place to another, in head angles; `curva` bows the path sideways. The root sinks in, so its end never shows. */
  function pela(phi0, th0, phi1, th1, curva = 0, mais = 0.012) {
    const pts = []
    for (let i = 0; i <= 5; i++) {
      const t = i / 5
      pts.push(naCasca(phi0 + (phi1 - phi0) * t + curva * Math.sin(PI * t), th0 + (th1 - th0) * t, i ? mais : -0.04))
    }
    return pts
  }
  /** A hair tie round `eixo`. */
  function prender(p, eixo, r) {
    const g = new THREE.TorusGeometry(r, 0.045, 6, 18)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), eixo.clone().normalize()))
    g.translate(p.x, p.y, p.z)
    parte(rosto, g, misturar(a.cabC, NAVY, 0.55), { linha: traco * 0.5 })
  }

  // Bangs: locks from the crown that end in points just past the shell's edge.
  if (!["careca", "raspado", "moicano", "afro"].includes(a.topo)) {
    const Lf = a.franjaL * 0.15
    const franja = (phiR, thR, phi, alem, curva = 0, op = {}) => mecha(pela(phiR, thR, phi, frente(phi) + alem, curva), { larg: 0.2, chato: 0.32, linha: traco * 0.6, ...op })
    if (a.franja === "lado")
      for (let i = 0; i <= 6; i++) {
        const u = i / 6
        franja(lado * (-0.5 + u * 0.75), 0.3, lado * (-1 + u * 2.3), 0.1, lado * 0.12 * (1 - u))
      }
    else if (a.franja === "reta")
      for (let i = 0; i <= 8; i++) {
        const phi = -1.25 + (i / 8) * 2.5
        franja(phi * 0.6, 0.35, phi, 0.05, 0, { ponta: 0.6 })
      }
    else if (a.franja === "cortina")
      for (const l of [-1, 1]) for (let k = 0; k < 4; k++) franja(l * 0.06, 0.25 + k * 0.04, l * (0.22 + k * 0.3), 0.08, l * 0.12)
    else if (a.franja === "mechas")
      for (let i = 0; i <= 6; i++) {
        const phi = -1.2 + (i / 6) * 2.4
        mecha(pela(phi * 0.45, 0.3, phi, 1.1 + (i % 2 ? -0.05 : 0.12) + Lf, i % 2 ? 0.06 : -0.06), { larg: 0.18, chato: 0.4, linha: traco * 0.6 })
      }
    else if (a.franja === "bico") {
      franja(0, 0.3, 0, 0.12, 0, { larg: 0.24 })
      for (const l of [-1, 1]) for (const [phi, alem] of [[0.4, 0.09], [0.82, 0.08]]) franja(l * phi * 0.5, 0.3, l * phi, alem, -l * 0.08)
    } else if (a.franja === "topete" && !noChapeu)
      // A quiff: locks rising from the hairline and rolling back over the top.
      for (let i = -2; i <= 2; i++) {
        const phi = i * 0.27 - 0.06 * lado
        const k = (1 + a.vol * 0.25) * (1 - Math.abs(i) * 0.14)
        const giro = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), phi)
        const q = (y, z) => V(0, 0.55 + (y - 0.55) * k, z - Math.abs(i) * 0.06).applyQuaternion(giro)
        mecha([q(0.5, 0.78), q(0.86, 1.0), q(1.2, 1.0), q(1.42, 0.66), q(1.4, 0.15), q(1.1, -0.38)], { larg: 0.25, chato: 0.6, linha: traco * 0.8 })
      }
  }

  // Spikes and the mohawk: locks standing out, swept up and back.
  if (!noChapeu && a.topo === "espetado") {
    const n = Math.round(a.espN)
    for (let i = 0; i < n; i++) {
      const phi = ((i * 2.399963) % (2 * PI)) - PI
      const th = Math.min(Math.sqrt((i + 0.3) / n) * 1.5, linhaCabelo(phi) - 0.15)
      const raiz = S(phi, th, rCasca(phi, th) - 0.05)
      const dir = S(phi, th, 1).normalize().add(V(0, 0.45, -0.25)).normalize()
      const l = (0.45 + a.vol * 0.2) * a.espL * (0.8 + 0.4 * ((i * 0.618) % 1))
      mecha([raiz, raiz.clone().addScaledVector(dir, l * 0.5).add(V(0, 0.04, -0.03)), raiz.clone().addScaledVector(dir, l).add(V(0, 0.12 * l, -0.1 * l))], { larg: 0.21 + a.vol * 0.03, chato: 0.55, plano: V(Math.cos(phi), 0, -Math.sin(phi)), linha: traco * 0.75 })
    }
  }
  if (!noChapeu && a.topo === "moicano")
    for (let i = 0; i < 9; i++) {
      const t = -0.85 + i * 0.34
      const raiz = S(t < 0 ? 0 : PI, Math.abs(t) + 0.001, 0.96)
      const dir = raiz.clone().normalize().add(V(0, 0.1, -0.45)).normalize()
      const l = (0.38 + a.vol * 0.25) * a.espL * (1.15 - Math.abs(t - 0.3) * 0.25)
      mecha([raiz, raiz.clone().addScaledVector(dir, l * 0.55), raiz.clone().addScaledVector(dir, l).add(V(0, -0.05, -0.12 * l))], { larg: 0.24, chato: 0.85, plano: V(1, 0, 0) })
    }
  // One strand standing up on the crown, curling to the side so the front view shows it.
  if (a.fio && !noChapeu && a.topo !== "careca" && a.topo !== "raspado") {
    const raiz = S(0.3 * lado, 0.14, rCasca(0, 0.14) - 0.04)
    const m = (x, y, z) => raiz.clone().add(V(x * lado, y, z))
    mecha([raiz, m(0, 0.3, 0.02), m(0.1, 0.55, 0.04), m(0.28, 0.6, 0.06), m(0.38, 0.47, 0.06)], { larg: 0.09, chato: 0.35, plano: V(0, 0, 1) })
  }

  /** A bun: a ball wrapped by a few locks, tied where it meets the head. */
  function coque(centro, R) {
    cabelo(bola(R), { p: centro })
    const Y = centro.clone().normalize()
    const X = V(0, 1, 0).cross(Y)
    if (X.lengthSq() < 0.01) X.set(1, 0, 0)
    X.normalize()
    const Z = Y.clone().cross(X)
    for (let k = 0; k < 4; k++) {
      const pts = []
      for (let s = 0; s <= 6; s++) {
        const u = s / 6
        const ang = (k * PI) / 2 + u * PI * 1.3
        const lat = -0.5 + u * 1.3
        pts.push(centro.clone().addScaledVector(X, Math.cos(lat) * Math.cos(ang) * R).addScaledVector(Z, Math.cos(lat) * Math.sin(ang) * R).addScaledVector(Y, Math.sin(lat) * R))
      }
      mecha(pts, { larg: R * 0.42, chato: 0.3, linha: traco * 0.6, plano: (p) => p.clone().sub(centro) })
    }
    prender(centro.clone().addScaledVector(Y, -R * 0.78), Y, R * 0.6)
  }
  if (!noChapeu && a.topo === "coque") coque(S(PI, 0.22, 1.26), 0.38 + a.vol * 0.1)
  if (!noChapeu && a.topo === "coque2") for (const l of [-1, 1]) coque(S(l * 1.75, 0.62, 1.2), 0.27 + a.vol * 0.07)

  // What a raised hood covers: everything outside its face window (the hood below uses the same window).
  const janela = { thC: 1.62, A: 1.9, B: 1.02 }
  const capuzCobre = (phi, th) => a.capuz === "levantado" && (phi / janela.A) ** 2 + ((th - janela.thC) / janela.B) ** 2 >= 1
  const antesAtras = rosto.children.length
  const fiosAntes = Object.fromEntries(Object.entries(fios).map(([k, l]) => [k, l.length]))
  // Hair down the back: a sheet for coverage, and locks over it whose tips make the edge.
  const solto = { medio: 1.0, longo: 1.95, ondas: 1.8, meio: 1.5 }[a.atras]
  if (solto) {
    const L = solto * a.comp
    const ini = 1.2
    const reto = a.atras === "medio"
    const costas = (u, v, mais = 0) => {
      const phi = ini + u * (2 * PI - 2 * ini)
      const p = S(phi, 1.25, raioCabelo + 0.04 + mais)
      const onda = a.atras === "ondas" ? 0.07 * Math.sin(v * 13) + 0.03 * Math.sin(u * 30) : 0
      const abre = 1 + v * (reto ? -0.02 : 0.2) + onda
      return V(p.x * abre, p.y - v * L, p.z * (reto ? 1 : 1 + v * 0.1) - v * 0.1)
    }
    cabelo(malha((u, v) => costas(u, v * 0.95), 40, 18))
    const n = fina ? 12 : 10
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const phi = ini + u * (2 * PI - 2 * ini)
      const pts = [naCasca(phi, 0.8, -0.04)]
      const fim = reto ? 1.02 : 0.98 + 0.1 * ((i * 0.618) % 1)
      // Waves also swing the locks side to side.
      const vs = a.atras === "ondas" ? [0, 0.2, 0.4, 0.6, 0.8, fim] : [0, 0.35, 0.7, fim]
      for (const v of vs) pts.push(costas(a.atras === "ondas" ? u + 0.016 * Math.sin(v * 10 + i * 1.7) * v : u, v, i === 0 || i === n ? 0.05 : 0.03))
      // A bob's ends tuck in.
      if (reto) pts[4].multiply(V(0.92, 1, 0.92)).add(V(0, 0.05, 0))
      mecha(pts, { larg: 0.27, chato: 0.3, ponta: reto ? 0.55 : 0.95, afina: 2.6, linha: traco * 0.5, nasce: 0.4 })
    }
    if (a.atras === "meio") {
      coque(naCasca(PI, 0.55, 0.12), 0.2 + a.vol * 0.05)
      for (const l of [-1, 1]) for (const th of [0.75, 1.0]) mecha(pela(l * 1.25, th, l * 2.75, 0.6, 0, 0.02), { larg: 0.16, chato: 0.3, linha: traco * 0.6 })
    }
  }

  /** A gathered bunch of locks along `eixo`: tight at the tie, bulging by `bojo`, opening by `abre` toward the tips. */
  function maco(eixo, { n = 6, abre = 0.4, bojo = 0.08, larg = 0.14 } = {}) {
    const curva = new THREE.CatmullRomCurve3(eixo)
    for (let k = 0; k < n; k++) {
      const giro = (k / n) * 2 * PI + 0.4
      const ate = 1 - 0.14 * ((k * 0.618) % 1)
      const pts = []
      for (let s = 0; s <= 5; s++) {
        const t = (s / 5) * ate
        const c = curva.getPointAt(t)
        const T = curva.getTangentAt(t)
        const X = V(0, 0, 1).cross(T)
        if (X.lengthSq() < 0.01) X.set(1, 0, 0)
        X.normalize()
        const Z = T.clone().cross(X)
        const o = 0.03 + bojo * Math.sin(PI * Math.min(1, t * 1.1)) + abre * 0.35 * t ** 1.3
        pts.push(c.addScaledVector(X, Math.cos(giro) * o).addScaledVector(Z, Math.sin(giro) * o))
      }
      mecha(pts, { larg, chato: 0.6 })
    }
    return curva
  }
  if (a.atras === "rabo") {
    const p = naCasca(PI, 0.75 - a.raboY * 0.45, -0.02)
    const k = a.comp
    const curva = maco([p, p.clone().add(V(0.45 * lado, 0.15, -0.25)), p.clone().add(V(0.8 * lado, -0.5, -0.1)), p.clone().add(V(0.7 * lado, -1.3 * k, 0.05))], { n: 6, abre: a.raboA * 0.7, bojo: 0.07, larg: 0.17 + a.vol * 0.03 })
    prender(curva.getPointAt(0.1), curva.getTangentAt(0.1), 0.12)
  }
  if (a.atras === "marias")
    for (const l of [-1, 1]) {
      const p = naCasca(l * 1.8, 1.15 - a.raboY * 0.5, -0.02)
      const c1 = p.clone().addScaledVector(V(l, 0.1 + a.raboA * 0.5, -0.2).normalize(), 0.22 + a.raboA * 0.25)
      const k = a.comp
      const curva = maco([p, c1, c1.clone().add(V(l * (0.08 + a.raboA * 0.12), -0.42 * k, 0)), c1.clone().add(V(l * (0.06 + a.raboA * 0.16), -0.95 * k, 0.04))], { n: 6, abre: a.raboA * 0.4, bojo: 0.1, larg: 0.19 + a.vol * 0.03 })
      prender(curva.getPointAt(0.12), curva.getTangentAt(0.12), 0.11)
    }

  /** A three-strand braid along `eixo`: each strand weaves side to side and front to back a third of a turn after the next, so it goes over one and under the other. */
  function trancar(eixo, B) {
    const curva = new THREE.CatmullRomCurve3(eixo)
    const voltas = Math.max(1, curva.getLength() / 1.15)
    const m = Math.ceil(voltas * 12)
    const lateral = (T) => {
      const X = T.clone().cross(V(0, 0, 1))
      if (X.lengthSq() < 0.01) X.set(1, 0, 0)
      return X.normalize()
    }
    for (let k = 0; k < 3; k++) {
      const pts = []
      for (let s = 0; s <= m; s++) {
        const t = s / m
        const c = curva.getPointAt(t)
        const T = curva.getTangentAt(t)
        const X = lateral(T)
        const w = B * (1 - 0.3 * t)
        const u = t * voltas * 2 * PI + (k * 2 * PI) / 3
        pts.push(c.addScaledVector(X, Math.sin(u) * w * 0.55).addScaledVector(X.clone().cross(T), Math.sin(2 * u) * w * 0.35))
      }
      mecha(pts, { larg: B * 0.5, chato: 0.55, ponta: 0.25, segs: m * 2, linha: traco * 0.8 })
    }
    // The tie, and the loose end below it.
    const fim = curva.getPointAt(1)
    const T = curva.getTangentAt(1)
    const X = lateral(T)
    prender(fim, T, B * 0.42)
    for (let k = 0; k < 3; k++) {
      const o = (k - 1) * 0.05
      mecha([fim.clone().addScaledVector(T, -0.04), fim.clone().addScaledVector(T, 0.1).addScaledVector(X, o), fim.clone().addScaledVector(T, 0.24 - Math.abs(o)).addScaledVector(X, o * 1.8)], { larg: B * 0.42, chato: 0.5 })
    }
  }
  if (a.atras === "tranca") trancar([S(lado * 1.35, 1.2, 1.12), V(lado * 1.02, -0.8, 0.42), V(lado * 0.95, -1.4, 0.8), V(lado * 0.88, -1.4 - 0.9 * a.comp, 0.9)], 0.22)
  if (a.atras === "trancas")
    for (const l of [-1, 1]) {
      const p = naCasca(l * 1.8, 1.15, -0.02)
      trancar([p, p.clone().add(V(l * 0.1, -0.4 * a.comp, 0.03)), p.clone().add(V(l * 0.16, -0.9 * a.comp, 0.08)), p.clone().add(V(l * 0.2, -1.4 * a.comp, 0.12))], 0.2)
    }
  if (a.atras === "dreads") {
    const n = fina ? 16 : 13
    for (let i = 0; i < n; i++) {
      const phi = 1.25 + (i / (n - 1)) * (2 * PI - 2.5)
      const th = 0.85 + 0.12 * (i % 2)
      const l = (1.5 + (i % 3) * 0.12) * a.comp
      const meio = naCasca(phi, th + 0.3, 0.06)
      mecha([naCasca(phi, th, -0.03), meio, V(meio.x * 1.12, meio.y - l * 0.45, meio.z * 1.1 - 0.04), V(meio.x * 1.2 + 0.04 * Math.sin(i * 2.1), meio.y - l, meio.z * 1.16 - 0.08)], { larg: 0.1, chato: 0.95, ponta: 0.3 })
    }
  }

  // A raised hood hides the hair behind it, locks and all; a braid to the side still falls in front.
  if (a.capuz === "levantado" && a.atras !== "tranca") {
    for (const m of rosto.children.slice(antesAtras)) m.visible = false
    for (const k in fiosAntes) fios[k].length = fiosAntes[k]
  }

  // The free locks, grown step by step from their place: lying on the hair while over it, then hanging.
  function crescer(m, l) {
    const phi = m.a * l
    const raiz = naCasca(phi, m.h, -0.02)
    const desce = naCasca(phi, m.h + 0.03).sub(naCasca(phi, m.h - 0.03)).normalize()
    const volta = naCasca(phi + 0.03, m.h).sub(naCasca(phi - 0.03, m.h)).normalize()
    const fora0 = desce.clone().cross(volta).normalize()
    const d = m.d * l
    const dir = desce.multiplyScalar(Math.cos(d)).addScaledVector(volta, Math.sin(d)).multiplyScalar(1 - m.s).addScaledVector(fora0, m.s + 0.04).normalize()
    const n = 12
    const passo = m.l / n
    const pts = [raiz]
    let p = raiz.clone()
    let caiu = false
    for (let i = 1; i <= n; i++) {
      const fora = p.clone().normalize()
      const lateral = dir.clone().cross(fora)
      if (lateral.lengthSq() < 1e-6) lateral.set(Math.cos(phi), 0, -Math.sin(phi))
      lateral.normalize()
      // Lying down it bends along the hair; standing up it bends over.
      dir.applyAxisAngle(fora.multiplyScalar(1 - m.s).addScaledVector(lateral, m.s).normalize(), m.k * l * passo * 2.4)
      const antes = p
      p = p.clone().addScaledVector(dir, passo)
      const q = V(p.x / a.larg, p.y / a.alt, p.z)
      const th = Math.acos(entre(q.y / q.length(), -1, 1))
      const ph = Math.atan2(q.x, q.z)
      const chao = naCasca(ph, th, 0.01).length()
      const r = p.length()
      if (r < chao) p.multiplyScalar(chao / r)
      else if (!caiu && m.s < 0.5 && th < linhaCabelo(ph) + 0.05) p.multiplyScalar((chao + (r - chao) * m.s * 2) / r)
      else if (m.s < 0.5) caiu = true
      if (caiu) dir.y -= passo * 3.5 * (1 - m.s * 2)
      else dir.copy(p).sub(antes)
      dir.normalize()
      pts.push(p)
    }
    mecha(pts, { larg: m.e, chato: 0.45, cor: m.p ? m.c : null, linha: traco * 0.8 })
  }
  for (const m of a.mechas) for (const l of m.m ? [1, -1] : [1]) if (!capuzCobre(m.a * l, m.h)) crescer(m, l)
  fecharFios()

  // Hats: in their own group, tilted on the head.
  const chapeu = new THREE.Group()
  chapeu.position.y = a.chapY
  chapeu.rotation.z = a.chapR
  chapeu.scale.setScalar(a.chapT)
  rosto.add(chapeu)
  const rc = 1.12 + (noChapeu || a.topo === "careca" ? 0 : a.vol * 0.06)
  const { chapC: c1, chapC2: c2 } = a
  if (a.chapeu === "bone" || a.chapeu === "boneTras") {
    const giro = a.chapeu === "bone" ? 0 : PI
    parte(chapeu, casca(() => 1.04, rc + 0.02, N, 16), c1)
    parte(chapeu, malha((u, v) => {
      const x = (u - 0.5) * 2.2
      const p = S(x + giro, 1.04, rc)
      const fora = V(Math.sin(x * 0.6 + giro), 0, Math.cos(x * 0.6 + giro))
      return p.add(fora.multiplyScalar(v * 0.62 * Math.cos(x * 0.8))).add(V(0, v * 0.17 * Math.cos(x * 0.8), 0))
    }, 20, 4), c2)
    parte(chapeu, bola(0.1), c2, { p: S(0, 0, rc + 0.03) })
  } else if (a.chapeu === "gorro") {
    parte(chapeu, casca(() => 1.1, (phi, th) => rc + 0.04 + Math.max(0, 0.5 - th) * 0.15), c1)
    parte(chapeu, malha((u, v) => S((u - 0.5) * 2 * PI, 0.93 + v * 0.24, rc + 0.12), N, 4), c2)
    parte(chapeu, bola(0.22), c2, { p: S(0, 0, rc + 0.26) })
  } else if (a.chapeu === "bucket") {
    parte(chapeu, casca(() => 0.98, (phi, th) => rc + 0.05 + 0.04 * suave(0.2, 0.5, th)), c1)
    parte(chapeu, malha((u, v) => S((u - 0.5) * 2 * PI, 0.95 + v * 0.17, rc + 0.06 + v * 0.3), N, 4), c2)
  } else if (a.chapeu === "bandana") {
    parte(chapeu, malha((u, v) => S((u - 0.5) * 2 * PI, 0.86 + v * 0.22, Math.max(rc, raioCabelo + 0.03)), N, 4), c1)
    for (const d of [0.1, -0.35]) parte(chapeu, new THREE.ConeGeometry(0.13, 0.48, 4), c1, { p: S(1.8, 1.05, rc + 0.18).add(V(0.08, d, 0)), r: [0, 0, d > 0 ? -2.2 : -0.8] })
  } else if (a.chapeu === "coroa") {
    parte(chapeu, malha((u, v) => {
      const ponta = Math.abs(((u * 6 + 0.5) % 1) * 2 - 1)
      const phi = (u - 0.5) * 2 * PI
      return V(Math.sin(phi) * 0.68 * a.larg, 0.98 * a.alt + (1 - v) * (0.16 + ponta * 0.36), Math.cos(phi) * 0.68)
    }, 72, 3), c1)
    for (let i = 0; i < 6; i++) parte(chapeu, new THREE.OctahedronGeometry(0.09), c2, { p: V(Math.sin((i * PI) / 3) * 0.7 * a.larg, 1.08 * a.alt, Math.cos((i * PI) / 3) * 0.7) })
  } else if (a.chapeu === "cartola") {
    const y = 0.72 * a.alt
    parte(chapeu, new THREE.CylinderGeometry(1.2, 1.2, 0.09, 36), c1, { p: V(0, y, 0) })
    parte(chapeu, new THREE.CylinderGeometry(0.88, 0.8, 0.95, 36), c1, { p: V(0, y + 0.5, 0) })
    parte(chapeu, new THREE.CylinderGeometry(0.835, 0.82, 0.22, 36), c2, { p: V(0, y + 0.17, 0), linha: 0 })
  } else if (a.chapeu === "festa") {
    parte(chapeu, new THREE.ConeGeometry(0.5, 0.95, 24), c1, { p: V(0.22, 1.36, 0.1), r: [0, 0, -0.22] })
    parte(chapeu, bola(0.16), c2, { p: V(0.33, 1.86, 0.1) })
    parte(chapeu, new THREE.CylinderGeometry(0.45, 0.5, 0.12, 24), c2, { p: V(0.14, 0.98, 0.1), r: [0, 0, -0.22], linha: 0 })
  } else if (a.chapeu === "mago") {
    const y = 0.66 * a.alt
    parte(chapeu, new THREE.CylinderGeometry(1.42, 1.42, 0.07, 40), c1, { p: V(0, y, 0.05), r: [0.1, 0, 0] })
    const pts = [V(0, y, 0), V(0, y + 0.72, -0.06), V(0.12, y + 1.28, -0.16), V(0.5, y + 1.55, -0.26)]
    const raio = (t) => 0.9 * (1 - t) ** 1.15 + 0.02
    parte(chapeu, tuboAfinado(pts, raio, { lados: fina ? 28 : 16, n: fina ? 20 : 12 }).g, c1, { fora: tuboAfinado(pts, raio, { lados: 16, n: 12, mais: traco }).g })
    parte(chapeu, new THREE.CylinderGeometry(0.85, 0.9, 0.18, 36, 1, true), c2, { p: V(0, y + 0.13, 0), linha: 0 })
  } else if (a.chapeu === "tiara") {
    const r = a.topo === "careca" || a.topo === "raspado" ? 1.04 : raioCabelo + 0.03
    const pts = []
    for (let i = 0; i < 28; i++) {
      const phi = (i / 28) * 2 * PI - PI
      pts.push(S(phi, 0.62 + 0.2 * Math.cos(phi), r))
    }
    parte(chapeu, tubo(pts, 0.04, true), c1, { linha: 0 })
    parte(chapeu, new THREE.OctahedronGeometry(0.12), c2, { p: S(0, 0.82, r + 0.04), s: [1, 1.35, 0.6] })
  } else if (a.chapeu === "aureola") parte(chapeu, new THREE.TorusGeometry(0.62, 0.08, 10, 36), c1, { p: V(0, 1.5, 0), r: [PI / 2 - 0.2, 0, 0] })
  else if (a.chapeu === "touca") {
    // December's Santa hat, over any hat (vestir.js puts it on; it's no option, so never saved): a red cone that
    // flops to one side, a fur brim and a pompom.
    const y = 0.7 * a.alt
    const pts = [V(0, y, 0), V(0.02, y + 0.62, -0.06), V(0.3, y + 1.0, -0.16), V(0.78, y + 0.82, -0.22)]
    const raio = (t) => 0.86 * (1 - t) ** 1.05 + 0.05
    parte(chapeu, casca(() => 0.95, rc + 0.03, N, 12), c1)
    parte(chapeu, tuboAfinado(pts, raio, { lados: fina ? 28 : 16, n: fina ? 20 : 12 }).g, c1, { fora: tuboAfinado(pts, raio, { lados: 16, n: 12, mais: traco }).g })
    parte(chapeu, malha((u, v) => S((u - 0.5) * 2 * PI, 0.86 + v * 0.3, rc + 0.14), N, 4), c2)
    parte(chapeu, bola(0.24), c2, { p: pts[3].clone().add(V(0.06, -0.1, 0)) })
  }
  if (a.capuz === "levantado" && !["aureola", "festa", "coroa"].includes(a.chapeu)) chapeu.visible = false

  // Glasses and ears
  if (a.oculos !== "nada") {
    const t = a.ocT
    const y = a.olhoY
    const x = entre(a.olhoX, 0.32, 0.5)
    const c = a.ocC
    if (a.oculos === "visor") parte(rosto, malha((u, v) => naCara((u - 0.5) * 2.5, y + (0.5 - v) * 0.4 * t, 1.1), 28, 4), c)
    else {
      const redondo = a.oculos === "redondo" || a.oculos === "monoculo"
      for (const l of a.oculos === "monoculo" ? [1] : [-1, 1]) {
        const pts = []
        for (let i = 0; i < 20; i++) {
          const w = (i / 20) * 2 * PI
          const q = (n) => (redondo ? n : Math.sign(n) * Math.abs(n) ** 0.45)
          pts.push(naCara(l * x + q(Math.cos(w)) * 0.27 * t, y + q(Math.sin(w)) * (redondo ? 0.27 : 0.21) * t, 1.1))
        }
        if (a.oculos === "escuro") parte(rosto, malha((u, v) => naCara(l * x + (u - 0.5) * 0.54 * t * (1 - v * 0.15), y + (0.5 - v) * 0.4 * t, 1.1), 10, 4), c)
        parte(rosto, tubo(pts, 0.035, true), c, { linha: 0 })
        if (a.oculos !== "monoculo") parte(rosto, tubo([naCara(l * (x + 0.27 * t), y, 1.1), naCara(l * 1.15, y, 1.07), naCara(l * 1.55, y, 1.02)], 0.03), c, { linha: 0 })
      }
      if (a.oculos !== "monoculo") parte(rosto, tubo([naCara(-x + 0.27 * t, y, 1.1), naCara(0, y + 0.03, 1.12), naCara(x - 0.27 * t, y, 1.1)], 0.035), c, { linha: 0 })
    }
  }
  if (a.fone === "fone") {
    const r = Math.max(raioCabelo + 0.08, rc + 0.07, a.capuz === "levantado" ? 1.27 : 0)
    const arco = []
    for (let i = 0; i <= 12; i++) {
      const t = -1.4 + (i / 12) * 2.8
      arco.push(S(t < 0 ? -PI / 2 : PI / 2, Math.abs(t) + 0.001, r))
    }
    parte(rosto, tubo(arco, 0.075), a.foneC)
    for (const l of [-1, 1]) parte(rosto, new THREE.CylinderGeometry(0.29, 0.29, 0.22, 20), a.foneC, { p: S(l * PI / 2, 1.62, r - 0.02), r: [0, 0, PI / 2] })
    parte(rosto, tubo([S(-PI / 2, 1.65, r), S(-1.0, 2.05, 1.2), S(-0.4, 2.15, 1.2)], 0.035), NAVY, { linha: 0 })
    parte(rosto, bola(0.085), NAVY, { p: S(-0.4, 2.15, 1.2), linha: 0 })
  } else if (a.fone === "brinco")
    for (const l of [-1, 1]) parte(rosto, new THREE.TorusGeometry(0.14, 0.035, 8, 20), a.foneC, { p: naCara((l * PI) / 2, -0.35, 1.1), linha: 0 })

  // Bust: the profile picture's silhouette, shoulders into a straight base.
  const pescTopo = -0.98
  parte(raiz, new THREE.CylinderGeometry(a.pescoco, a.pescoco * 1.1, 0.6, 20), misturar(a.pele, NAVY, 0.14), { p: V(0, pescTopo, 0) })
  const W = 1.34 * a.corpoL
  const chao = -2.95
  const ombro = chao + 1.73 * a.corpoA
  const perfil = []
  for (let i = 0; i <= 10; i++) perfil.push(new THREE.Vector2(W, chao + (i / 10) * (ombro - 0.72 - chao)))
  const base = a.pescoco * 1.15
  for (let i = 1; i <= 22; i++) {
    const w = (i / 22) * (PI / 2)
    perfil.push(new THREE.Vector2(base + (W - base) * Math.max(0, Math.cos(w)) ** (2 / a.ombro), ombro - 0.72 + 0.72 * Math.sin(w) ** (2 / a.ombro)))
  }
  perfil.push(new THREE.Vector2(0.01, ombro + 0.005))
  const regular = new THREE.CurvePath()
  for (let i = 0; i < perfil.length - 1; i++) regular.add(new THREE.LineCurve(perfil[i], perfil[i + 1]))
  const busto = new THREE.LatheGeometry(regular.getSpacedPoints(fina ? 40 : 24), N, -PI, PI * 2)
  parte(raiz, busto, a.cor, { s: [1, 1, a.fundo], mat: material("#ffffff", { map: guardar(pintarCamisa(a, qualidade)) }) })

  const zPeito = W * a.fundo
  if (a.gola === "redonda") parte(raiz, new THREE.TorusGeometry(a.pescoco * 1.25, 0.075, 8, 28), a.golaC, { p: V(0, ombro - 0.02, 0.02), r: [PI / 2 + 0.2, 0, 0], linha: traco * 0.5 })
  if (a.gola === "capuz") {
    parte(raiz, new THREE.TorusGeometry(0.62, 0.22, 10, 32), a.golaC, { p: V(0, ombro - 0.02, -0.3), r: [PI / 2 - 0.35, 0, 0] })
    for (const l of [-1, 1]) parte(raiz, entreDois(V(l * 0.2, ombro - 0.25, zPeito * 0.72), V(l * 0.24, ombro - 0.8, zPeito + 0.04), 0.035), "#f4f5f7", { linha: 0 })
  }
  if (a.pesc === "cachecol") {
    parte(raiz, new THREE.TorusGeometry(0.5, 0.2, 10, 28), a.pescC, { p: V(0, ombro + 0.1, 0.03), r: [PI / 2 + 0.12, 0, 0] })
    parte(raiz, new THREE.BoxGeometry(0.38, 0.95, 0.12), a.pescC, { p: V(0.4, ombro - 0.5, zPeito * 0.9), r: [-0.2, 0, 0.12] })
    for (const d of [-0.25, 0.1]) parte(raiz, new THREE.BoxGeometry(0.4, 0.14, 0.14), a.pescC2, { p: V(0.4 - d * 0.12, ombro - 0.5 + d, zPeito * 0.9 - d * 0.2 + 0.01), r: [-0.2, 0, 0.12], linha: 0 })
  } else if (a.pesc === "corrente" || a.pesc === "apito") {
    const pts = [V(-0.42, ombro + 0.02, 0.1), V(-0.3, ombro - 0.3, zPeito * 0.85), V(0, ombro - 0.5, zPeito + 0.03), V(0.3, ombro - 0.3, zPeito * 0.85), V(0.42, ombro + 0.02, 0.1)]
    parte(raiz, tubo(pts, 0.04), a.pescC, { linha: 0 })
    if (a.pesc === "apito") parte(raiz, new THREE.CylinderGeometry(0.13, 0.13, 0.3, 14), a.pescC2, { p: V(0, ombro - 0.65, zPeito + 0.12), r: [0, 0, PI / 2] })
    else parte(raiz, new THREE.OctahedronGeometry(0.15), a.pescC2, { p: V(0, ombro - 0.62, zPeito + 0.1) })
  } else if (a.pesc === "gravata") {
    parte(raiz, bola(0.14), a.pescC, { p: V(0, ombro - 0.12, zPeito * 0.62) })
    parte(raiz, new THREE.OctahedronGeometry(1), a.pescC, { p: V(0, ombro - 0.58, zPeito * 0.95), r: [-0.2, 0, 0], s: [0.2, 0.46, 0.07] })
  } else if (a.pesc === "lenco") {
    parte(raiz, new THREE.TorusGeometry(0.42, 0.09, 8, 24), a.pescC, { p: V(0, ombro + 0.04, 0.02), r: [PI / 2 + 0.15, 0, 0] })
    parte(raiz, new THREE.ConeGeometry(0.5, 0.72, 3), a.pescC, { p: V(0, ombro - 0.32, zPeito * 0.72), r: [-0.25, 0, PI], s: [1, 1, 0.3] })
    parte(raiz, bola(0.09), a.pescC2, { p: V(0, ombro - 0.05, zPeito * 0.62), linha: 0 })
  } else if (a.pesc === "coleira") {
    parte(raiz, new THREE.TorusGeometry(a.pescoco * 1.08, 0.07, 8, 28), a.pescC, { p: V(0, ombro + 0.12, 0.01), r: [PI / 2 + 0.1, 0, 0] })
    parte(raiz, new THREE.CylinderGeometry(0.11, 0.11, 0.035, 20), a.pescC2, { p: V(0, ombro - 0.06, a.pescoco * 1.08 + 0.08), r: [PI / 2, 0, 0] })
  } else if (a.pesc === "laco") {
    for (const l of [-1, 1]) parte(raiz, new THREE.ConeGeometry(0.19, 0.34, 4), a.pescC, { p: V(l * 0.17, ombro - 0.14, zPeito * 0.75), r: [0, 0, l * PI / 2] })
    parte(raiz, bola(0.1), a.pescC2, { p: V(0, ombro - 0.14, zPeito * 0.82) })
  }

  // Layers over the shirt: jackets, collars, a hood, pads, a belt. They ride on the bust's own profile:
  // s climbs it (0 at the base, 1 at the neck) and d is how far out from the shirt.
  const AM = fina ? 80 : 48
  const ladoBusto = new THREE.CurvePath()
  for (let i = 0; i < perfil.length - 2; i++) ladoBusto.add(new THREE.LineCurve(perfil[i], perfil[i + 1]))
  const amostra = ladoBusto.getSpacedPoints(AM)
  const normal2 = amostra.map((_, i) => {
    const p = amostra[Math.max(0, i - 1)]
    const q = amostra[Math.min(AM, i + 1)]
    const t = Math.hypot(q.x - p.x, q.y - p.y) || 1
    return [(q.y - p.y) / t, (p.x - q.x) / t]
  })
  // Near the neck the bust is thinner front to back than the neck itself: the layers round out there instead.
  const smax = (p, q) => (p + q + Math.hypot(p - q, 0.06)) / 2
  function noBusto(phi, s, d = 0) {
    const f = entre(s, 0, 1) * AM
    const i = Math.min(AM - 1, Math.floor(f))
    const t = f - i
    const p = amostra[i]
    const q = amostra[i + 1]
    const r = p.x + (q.x - p.x) * t
    const nx = normal2[i][0] + (normal2[i + 1][0] - normal2[i][0]) * t
    const ny = normal2[i][1] + (normal2[i + 1][1] - normal2[i][1]) * t
    const cerca = a.pescoco + 0.05
    return V((smax(r, cerca) + nx * d) * Math.sin(phi), p.y + (q.y - p.y) * t + ny * d, (smax(r * a.fundo, cerca) + nx * d) * Math.cos(phi))
  }
  const raioBusto = (s) => noBusto(PI / 2, s).x
  /** Round the neck: the top of the layers as a ring, pushed out by `sai` and lifted by `alto`. */
  function anelPescoco(phi, d, sai = 0, alto = 0) {
    const b = noBusto(phi, 1, d)
    const k = 1 + sai / Math.hypot(b.x, b.z)
    return V(b.x * k, b.y + alto, b.z * k)
  }

  /** A ribbon through pts, lying flat on the surface whose normals are ns: every trim, belt and roll. */
  function fita(pts, ns, larg, esp, mais = 0) {
    const fechado = pts[0].distanceTo(pts[pts.length - 1]) < 1e-4
    const P = fechado ? pts.slice(0, -1) : pts
    const n = P.length
    const L = 8
    const pos = []
    const idx = []
    for (let i = 0; i <= (fechado ? n : n - 1); i++) {
      const k = i % n
      const T = P[fechado ? (k + 1) % n : Math.min(n - 1, k + 1)].clone().sub(P[fechado ? (k - 1 + n) % n : Math.max(0, k - 1)]).normalize()
      const N = ns[k].clone().addScaledVector(T, -T.dot(ns[k])).normalize()
      const B = T.clone().cross(N)
      for (let j = 0; j <= L; j++) {
        const w = (j / L) * 2 * PI
        pos.push(...P[k].clone().addScaledVector(N, Math.cos(w) * (esp + mais)).addScaledVector(B, Math.sin(w) * (larg + mais)).toArray())
      }
    }
    const aneis = pos.length / 3 / (L + 1)
    for (let i = 0; i < aneis - 1; i++)
      for (let j = 0; j < L; j++) {
        const q = i * (L + 1) + j
        idx.push(q, q + 1, q + L + 1, q + 1, q + L + 2, q + L + 1)
      }
    if (!fechado)
      for (const [i, fim] of [[0, false], [n - 1, true]]) {
        const c = pos.length / 3
        pos.push(...P[i].toArray())
        for (let j = 0; j < L; j++) {
          const q = i * (L + 1) + j
          if (fim) idx.push(c, q, q + 1)
          else idx.push(c, q + 1, q)
        }
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }
  /** A layer from a map (u round, v down, `mais` further out): the piece, and its outline as the same map pushed out. */
  const camada = (pai, ponto, c, nu, nv) => parte(pai, malha((u, v) => ponto(u, v, 0), nu, nv), c, { fora: malha((u, v) => ponto(u, v, traco), nu, nv) })
  /** A trim along stretches [u0, v0, u1, v1] of a layer's map, as a ribbon with its own thin outline (or none, for stitches). */
  function bainha(pai, ponto, trechos, c, { larg = 0.045, esp = 0.03, n = fina ? 24 : 14, contorno = true } = {}) {
    const pts = []
    const ns = []
    for (const [u0, v0, u1, v1] of trechos)
      for (let i = pts.length ? 1 : 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * i) / n
        const v = v0 + ((v1 - v0) * i) / n
        const p = ponto(u, v, 0)
        pts.push(p)
        ns.push(ponto(u, v, 0.05).sub(p).normalize())
      }
    parte(pai, fita(pts, ns, larg, esp), c, contorno ? { fora: fita(pts, ns, larg, esp, traco * 0.6) } : { linha: 0 })
  }

  const sobre = a.sobre
  // How far the outer piece stands off the shirt: what goes on top of it starts there.
  const grossura = { nada: 0, jaqueta: 0.08, moletom: 0.1, sobretudo: 0.09, colete: 0.13, capinha: 0.2 }[sobre]
  const corBorda = a.sobreBo ? a.sobreB : a.sobreC
  const kx = W / 1.34
  const nu = fina ? 64 : 36
  const nv = fina ? 26 : 16
  /** An open front: how far across the chest it starts at each height, as an angle; round the neck it caps. */
  const abertura = (x) => (s) => Math.asin(Math.min(0.93, (x(s) * kx) / raioBusto(s)))
  if (sobre === "jaqueta" || sobre === "moletom" || sobre === "sobretudo") {
    const g = grossura
    const x = {
      jaqueta: (s) => 0.5 + 0.34 * suave(0.36, 0.74, s),
      moletom: (s) => 0.4 + 0.22 * suave(0.6, 1, s),
      sobretudo: (s) => 0.62 * suave(0.48, 0.82, s),
    }[sobre]
    const de = abertura(x)
    const corpo = (u, v, mais) => {
      const s = 1 - v
      const p = de(s)
      return noBusto(p + u * (2 * PI - 2 * p), s, g + mais)
    }
    camada(raiz, corpo, a.sobreC, nu, nv)
    if (sobre === "moletom") {
      // Zip tapes down the fronts, a ribbed band round the neck, the pocket's slant.
      bainha(raiz, corpo, [[0, 1, 0, 0]], corBorda)
      bainha(raiz, corpo, [[1, 0, 1, 1]], corBorda)
      const de1 = de(1)
      bainha(raiz, (u, v, mais) => anelPescoco(de1 + u * (2 * PI - 2 * de1), g + mais, 0.03, 0.04), [[0, 0, 1, 0]], a.sobreC, { larg: 0.075, esp: 0.05 })
      parte(raiz, new THREE.BoxGeometry(0.07, 0.13, 0.04), corBorda, { p: corpo(0, 0.2, 0.04), linha: traco * 0.5 })
      for (const l of [1, -1]) {
        const bolso = (u, v, mais) => {
          const s = 0.05 + u * 0.26
          return noBusto(l * Math.asin(Math.min(0.95, ((0.52 + u * 0.36) * kx) / raioBusto(s))), s, g + mais)
        }
        bainha(raiz, bolso, [[0, 0, 1, 0]], corBorda, { larg: 0.03, esp: 0.02, n: 8 })
      }
    } else {
      // A peaked lapel: it widens up to the point, then narrows into the collar.
      const s0 = sobre === "jaqueta" ? 0.36 : 0.48
      const larg = (sobre === "jaqueta" ? 0.34 : 0.44) * kx
      const w = (s) => {
        const t = (s - s0) / (0.98 - s0)
        return larg * (t < 0.8 ? t / 0.8 : 1 - ((t - 0.8) / 0.2) * 0.55)
      }
      for (const l of [1, -1]) {
        const lapela = (u, v, mais) => {
          const s = 0.98 - v * (0.98 - s0)
          const p0 = de(s)
          const p1 = p0 + w(s) / raioBusto(s)
          return noBusto(l > 0 ? p0 + (p1 - p0) * u : -p1 + (p1 - p0) * u, s, g + 0.035 + mais)
        }
        parte(raiz, malha((u, v) => lapela(u, v, 0), 4, fina ? 20 : 12), a.sobreC, { linha: 0 })
        const dentro = l > 0 ? 0 : 1
        bainha(raiz, lapela, [[dentro, 1, dentro, 0], [dentro, 0, 1 - dentro, 0], [1 - dentro, 0, 1 - dentro, 1]], corBorda)
      }
      // Below the lapels, the fronts: apart on the jacket, overlapping in the middle on the coat.
      if (sobre === "jaqueta") {
        bainha(raiz, corpo, [[0, 1, 0, 1 - s0]], corBorda)
        bainha(raiz, corpo, [[1, 1 - s0, 1, 1]], corBorda)
      } else {
        bainha(raiz, corpo, [[0, 1 - s0, 0, 1]], corBorda)
        for (const l of [1, -1])
          for (const s of [0.1, 0.24, 0.38]) parte(raiz, bola(0.065), a.sobreB, { p: noBusto(l * Math.asin((0.3 * kx) / raioBusto(s)), s, g + 0.03), s: [1, 1, 0.6], linha: traco * 0.6 })
      }
      // The collar stands up behind the neck, from one lapel's top to the other's.
      const c0 = de(0.98) + w(0.98) / raioBusto(0.98)
      const alto = sobre === "jaqueta" ? 0.2 : 0.3
      const gola = (u, v, mais) => anelPescoco(c0 + u * (2 * PI - 2 * c0), g, 0.02 + 0.09 * (1 - v) + mais, alto * (1 - v) * (0.6 + 0.4 * Math.sin(PI * u)))
      camada(raiz, gola, a.sobreC, fina ? 32 : 20, 3)
      bainha(raiz, gola, [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 1, 1]], corBorda, { n: fina ? 32 : 20 })
    }
  } else if (sobre === "colete") {
    // A puffer vest: quilted rows, closed by a zip below a V, cut wide round the arms so the shirt shows.
    const de = abertura((s) => 0.46 * suave(0.6, 0.95, s))
    const fileiras = 5
    const gomos = (s) => 0.075 + 0.065 * Math.abs(Math.sin(s * PI * fileiras)) ** 0.45
    const cS = 0.665
    const cH = 0.245
    const cA = 0.86
    const cava = (s) => (Math.abs(s - cS) < cH ? cA * Math.sqrt(1 - ((s - cS) / cH) ** 2) : 0)
    const painel = (de0, ate0) => (u, v, mais) => {
      const s = 1 - v
      const p = de0(s)
      return noBusto(p + (ate0(s) - p) * u, s, gomos(s) + mais)
    }
    const nvC = fina ? 40 : 24
    const paineis = [
      [painel(de, (s) => PI / 2 - cava(s)), fina ? 16 : 10],
      [painel((s) => PI / 2 + cava(s), (s) => 1.5 * PI - cava(s)), fina ? 32 : 18],
      [painel((s) => 1.5 * PI + cava(s), (s) => 2 * PI - de(s)), fina ? 16 : 10],
    ]
    const costura = misturar(a.sobreC, NAVY, 0.5)
    for (const [pn, n] of paineis) {
      camada(raiz, pn, a.sobreC, n, nvC)
      // Stitches in the creases between the rows.
      for (let k = 1; k < fileiras; k++) bainha(raiz, pn, [[0, 1 - k / fileiras, 1, 1 - k / fileiras]], costura, { larg: 0.016, esp: 0.012, n: 12, contorno: false })
    }
    const todo = painel(de, (s) => 2 * PI - de(s))
    bainha(raiz, todo, [[0, 0.4, 0, 0], [0, 0, 1, 0], [1, 0, 1, 0.4]], corBorda, { n: fina ? 20 : 12 })
    bainha(raiz, todo, [[0, 0.4, 0, 1]], corBorda, { larg: 0.035 })
    for (const l of [1, -1]) bainha(raiz, (u, v, mais) => {
      const s = cS + cH * Math.cos(2 * PI * u)
      return noBusto(l * (PI / 2 + cA * Math.sin(2 * PI * u)), s, gomos(s) + mais)
    }, [[0, 0, 1, 0]], corBorda, { n: fina ? 32 : 20 })
  } else if (sobre === "capinha") {
    // A short cape over the shoulders, shorter in front, closed at the neck with a clasp.
    const fim = (phi) => 0.47 + 0.05 * Math.cos(phi)
    const ab = 0.12
    const capinha = (u, v, mais) => {
      const phi = ab + u * (2 * PI - 2 * ab)
      return noBusto(phi, 1 - v * (1 - fim(phi)), 0.09 + 0.14 * v ** 1.8 + mais)
    }
    camada(raiz, capinha, a.sobreC, nu, fina ? 18 : 12)
    bainha(raiz, capinha, [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1]], corBorda, { n: fina ? 40 : 24 })
    parte(raiz, bola(0.085), a.sobreB, { p: anelPescoco(0, 0.1, 0.06, -0.03), s: [1, 1, 0.6] })
  }

  // A high collar, rolled or popped up, over whatever is under it.
  if (a.golaA !== "nada") {
    const g = Math.max(0.02, grossura * 0.6)
    const borda = a.golaABo ? a.golaAB : a.golaAC
    if (a.golaA === "role") {
      bainha(raiz, (u, v, mais) => anelPescoco(2 * PI * u, g, mais - 0.02, 0.15), [[0, 0, 1, 0]], a.golaAC, { larg: 0.13, esp: 0.065, n: fina ? 32 : 20 })
      bainha(raiz, (u, v, mais) => anelPescoco(2 * PI * u, g, mais + 0.04, 0.03), [[0, 0, 1, 0]], borda, { larg: 0.07, esp: 0.075, n: fina ? 32 : 20 })
    } else {
      const gola = (u, v, mais) => {
        const phi = 0.6 + u * (2 * PI - 1.2)
        return anelPescoco(phi, g, 0.03 + 0.12 * (1 - v) + mais, (0.2 + 0.22 * (1 - Math.cos(phi)) / 2) * (1 - v))
      }
      camada(raiz, gola, a.golaAC, fina ? 32 : 20, 4)
      bainha(raiz, gola, [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 1, 1]], borda, { n: fina ? 32 : 20 })
    }
  }

  // The hood: down, a bag on the upper back with its rim round the neck; up, over the head, framing the face and ears.
  const cordao = (l, g) => {
    const pts = [0.95, 0.85, 0.74, 0.64].map((s, i) => noBusto(l * (0.22 + i * 0.015), s, g + 0.03))
    parte(raiz, tubo(pts, 0.025), a.capuzB, { linha: 0 })
    parte(raiz, bola(0.045), a.capuzB, { p: pts[3], linha: 0 })
  }
  if (a.capuz === "abaixado") {
    const g = grossura + 0.03
    // The rim runs round the neck and rises at the back, where it is the bag's open top.
    const aroS = (phi) => 0.97 - 0.07 * (1 - Math.cos(phi)) / 2
    const aroD = (phi) => g + 0.06 + 0.17 * (1 - Math.cos(phi)) / 2
    const aro = (u, v, mais) => {
      const phi = 0.5 + u * (2 * PI - 1)
      return noBusto(phi, aroS(phi), aroD(phi) + mais)
    }
    const bolsa = (u, v, mais) => {
      const phi = PI + (u - 0.5) * 1.9 * Math.sqrt(Math.max(0, 1 - v ** 2.4))
      const d = g + 0.02 + (aroD(phi) - g - 0.02) * (1 - v) ** 0.7 + 0.12 * Math.sin(PI * u) ** 0.5 * Math.sin(PI * v) ** 0.7
      return noBusto(phi, aroS(phi) - v * (aroS(phi) - 0.3), d + mais)
    }
    camada(raiz, bolsa, a.capuzC, fina ? 24 : 14, fina ? 18 : 12)
    bainha(raiz, bolsa, [[0, 0, 0, 1], [1, 1, 1, 0]], a.capuzC, { larg: 0.04, n: fina ? 18 : 10 })
    // Inside the fold, its shade: a crescent under the rim.
    parte(raiz, malha((u, v) => bolsa(0.1 + 0.8 * u, v * 0.28 * Math.sin(PI * u) ** 0.6, 0.012), 16, 4), misturar(a.capuzC, NAVY, 0.45), { linha: 0 })
    bainha(raiz, aro, [[0, 0, 1, 0]], a.capuzB, { larg: 0.08, esp: 0.055, n: fina ? 40 : 24 })
    for (const l of [1, -1]) cordao(l, g)
  } else if (a.capuz === "levantado") {
    const { thC, A, B } = janela
    const thB = 2.45
    const rh = (phi) => 1.17 + 0.07 * Math.max(0, -Math.cos(phi))
    const meia = (th) => A * Math.sqrt(Math.max(0, 1 - ((th - thC) / B) ** 2))
    const coroa = (u, v, mais) => {
      const phi = (u - 0.5) * 2 * PI
      const fim = Math.abs(phi) < A ? thC - B * Math.sqrt(1 - (phi / A) ** 2) : thC
      return S(phi, 0.002 + v * (fim - 0.002), rh(phi) + mais)
    }
    // Below the face's window it comes down to the shoulders.
    const nuca = (u, v, mais) => {
      const th = thC + Math.min(1, v / 0.7) * (thB - thC)
      const m = meia(th)
      const phi = m + u * (2 * PI - 2 * m)
      const p = S(phi, th, rh(phi) + mais)
      return v <= 0.7 ? p : p.lerp(noBusto(phi, 0.9, grossura + 0.06 + mais).divideScalar(a.tam), (v - 0.7) / 0.3)
    }
    camada(rosto, coroa, a.capuzC, fina ? 64 : 36, fina ? 14 : 9)
    camada(rosto, nuca, a.capuzC, fina ? 40 : 24, fina ? 12 : 8)
    const sE = Math.acos((thC - thB) / B)
    bainha(rosto, (u, v, mais) => {
      if (u < 0.1) return nuca(0, 1 - (u / 0.1) * 0.3, mais)
      if (u > 0.9) return nuca(1, 0.7 + ((u - 0.9) / 0.1) * 0.3, mais)
      const sg = sE - ((u - 0.1) / 0.8) * 2 * sE
      const phi = A * Math.sin(sg)
      return S(phi, thC - B * Math.cos(sg), rh(phi) + mais)
    }, [[0, 0, 1, 0]], a.capuzB, { larg: 0.075, esp: 0.05, n: fina ? 56 : 32 })
    for (const l of [1, -1]) cordao(l, grossura)
  }

  // Shoulder pieces: pads, boards with fringe, or plates; on the shoulder caps, over the outer layer.
  if (a.ombreira !== "nada") {
    const g = grossura + 0.02
    const placa = (l, s0, s1, larg, alto, chato) => (u, v, mais) => {
      const s = s1 + (s0 - s1) * v
      const bojo = Math.sin(PI * u) * Math.sin(PI * v)
      return noBusto(l * (PI / 2) + (u - 0.5) * 2 * Math.min(0.62, larg / raioBusto(s)), s, g + alto * (chato ? Math.min(1, bojo * 3) : bojo ** 0.6) + mais)
    }
    const volta = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]]
    for (const l of [1, -1]) {
      const pecas = a.ombreira === "armadura" ? [[0.56, 0.87, 0.44, 0.13], [0.45, 0.62, 0.48, 0.09], [0.34, 0.5, 0.5, 0.07]] : a.ombreira === "lisa" ? [[0.48, 0.86, 0.4, 0.16]] : [[0.54, 0.92, 0.24, 0.07]]
      for (const [s0, s1, larg, alto] of pecas) {
        const p = placa(l, s0, s1, larg, alto, a.ombreira !== "lisa")
        camada(raiz, p, a.ombreiraC, 12, 10)
        bainha(raiz, p, volta, a.ombreiraB, { larg: 0.035, esp: 0.025, n: 8 })
      }
      if (a.ombreira === "franja") {
        const p = placa(l, 0.54, 0.92, 0.24, 0.07, true)
        parte(raiz, bola(0.055), a.ombreiraB, { p: p(0.5, 0.15, 0.02), linha: traco * 0.6 })
        for (let i = 0; i < 7; i++) {
          const q = p(0.08 + (i / 6) * 0.84, 1, 0)
          parte(raiz, entreDois(q, q.clone().add(V(l * 0.04, -0.26, 0)), 0.032), a.ombreiraB, { linha: traco * 0.5 })
        }
      }
    }
  }

  // At the waist: over a closed coat or vest, under an open jacket.
  if (a.cinto !== "nada") {
    const faixa = a.cinto === "faixa"
    const g = sobre === "sobretudo" || sobre === "colete" ? grossura + 0.03 : 0.04
    const sC = 0.13
    bainha(raiz, (u, v, mais) => noBusto(u * 2 * PI, sC, g + mais), [[0, 0, 1, 0]], a.cintoC, { larg: faixa ? 0.17 : 0.1, esp: faixa ? 0.035 : 0.03, n: fina ? 64 : 36 })
    if (faixa) {
      const no = noBusto(-0.6, sC, g + 0.06)
      parte(raiz, bola(0.15), a.cintoC, { p: no, s: [1.1, 1, 0.7] })
      for (const [dx, giro] of [[-0.08, 0.25], [0.07, -0.15]]) {
        const ponta = chapa((s) => { s.moveTo(-0.08, 0); s.lineTo(0.08, 0); s.lineTo(0.09, -0.3); s.lineTo(0, -0.24); s.lineTo(-0.07, -0.3) }, 0.04)
        parte(raiz, ponta, a.cintoC, { p: no.clone().add(V(dx, -0.05, 0.03)), r: [0, -0.5, giro], local: true })
        parte(raiz, new THREE.BoxGeometry(0.15, 0.045, 0.05), a.cintoB, { p: no.clone().add(V(dx + giro * 0.2, -0.27, 0.05)), r: [0, -0.5, giro], linha: 0 })
      }
    } else {
      const fivela = noBusto(0, sC, g + 0.04)
      parte(raiz, new THREE.BoxGeometry(0.34, 0.26, 0.05), a.cintoB, { p: fivela })
      parte(raiz, new THREE.BoxGeometry(0.18, 0.12, 0.05), a.cintoC, { p: fivela.clone().add(V(0, 0, 0.012)), linha: 0 })
    }
  }

  // On the back: a cape, or wings drawn for one side and mirrored.
  if (a.costas === "capa") {
    const fora = perfil.map((v) => new THREE.Vector2(v.x + 0.08 + grossura, v.y + 0.02))
    const caminho = new THREE.CurvePath()
    for (let i = 0; i < fora.length - 1; i++) caminho.add(new THREE.LineCurve(fora[i], fora[i + 1]))
    parte(raiz, new THREE.LatheGeometry(caminho.getSpacedPoints(fina ? 40 : 24), N, 0.55, 2 * PI - 1.1), a.costasC, { s: [1, 1, a.fundo] })
    parte(raiz, new THREE.CylinderGeometry(0.68, 0.46, 0.6, 24, 1, true, 1.05, 2 * PI - 2.1), a.costasC, { p: V(0, ombro + 0.2, -0.02) })
    parte(raiz, new THREE.OctahedronGeometry(0.13), a.costasC2, { p: V(0, ombro - 0.1, zPeito * 0.62 + 0.14) })
  } else if (a.costas !== "nada") {
    for (const l of [-1, 1]) {
      const asa = new THREE.Group()
      const fada = a.costas === "fada"
      asa.position.set(l * 0.3, ombro + (fada ? 0.12 : -0.12), -W * a.fundo * 0.5)
      asa.rotation.set(0.1, l * 0.55, 0)
      asa.scale.setScalar(a.costasT * (fada ? 1.2 : 1))
      raiz.add(asa)
      const X = (x) => x * l
      if (a.costas === "morcego") {
        const pulso = [0.78, 1.18]
        const pontas = [[1.78, 1.5], [1.6, 0.42], [1.02, -0.22], [0.18, -0.42]]
        parte(asa, chapa((s) => {
          s.moveTo(0, 0); s.lineTo(X(0.1), 0.38); s.lineTo(X(pulso[0]), pulso[1]); s.lineTo(X(pontas[0][0]), pontas[0][1])
          for (let i = 1; i < pontas.length; i++) {
            const [x0, y0] = pontas[i - 1]
            const [x1, y1] = pontas[i]
            const mx = (x0 + x1) / 2
            const my = (y0 + y1) / 2
            s.quadraticCurveTo(X(mx + (pulso[0] - mx) * 0.4), my + (pulso[1] - my) * 0.4, X(x1), y1)
          }
          s.lineTo(0, 0)
        }), a.costasC)
        const osso = (pts, r) => parte(asa, tubo(pts.map(([x, y]) => V(X(x), y, 0.035)), r), a.costasC2, { linha: 0 })
        osso([[0, 0], [0.1, 0.38], pulso, pontas[0]], 0.055)
        for (const pt of pontas.slice(1, 3)) osso([pulso, pt], 0.035)
      } else if (a.costas === "penas") {
        const penas = (s, de, ate, n, fora) => {
          for (let i = 1; i <= n; i++) {
            const t0 = (i - 1) / n
            const t1 = i / n
            const x0 = de[0] + (ate[0] - de[0]) * t0
            const y0 = de[1] + (ate[1] - de[1]) * t0
            const x1 = de[0] + (ate[0] - de[0]) * t1
            const y1 = de[1] + (ate[1] - de[1]) * t1
            s.quadraticCurveTo(X((x0 + x1) / 2 + fora[0]), (y0 + y1) / 2 + fora[1], X(x1), y1)
          }
        }
        parte(asa, chapa((s) => {
          s.moveTo(0, 0); s.quadraticCurveTo(X(0.05), 0.95, X(0.6), 1.38); s.quadraticCurveTo(X(1.3), 1.72, X(1.95), 1.3)
          penas(s, [1.95, 1.3], [0.12, -0.55], 7, [0.16, -0.22])
          s.lineTo(0, 0)
        }), a.costasC)
        parte(asa, chapa((s) => {
          s.moveTo(X(0.05), 0.1); s.quadraticCurveTo(X(0.1), 0.95, X(0.6), 1.3); s.quadraticCurveTo(X(1.15), 1.55, X(1.5), 1.25)
          penas(s, [1.5, 1.25], [0.15, 0.1], 5, [0.1, -0.16])
        }, 0.03), a.costasC2, { p: V(0, 0, 0.04) })
      } else {
        const lobo = (fn) => parte(asa, chapa(fn), a.costasC)
        lobo((s) => { s.moveTo(0, 0); s.bezierCurveTo(X(0.2), 1.25, X(1.25), 1.95, X(1.5), 1.38); s.bezierCurveTo(X(1.68), 0.92, X(0.85), 0.32, 0, 0) })
        lobo((s) => { s.moveTo(0, -0.05); s.bezierCurveTo(X(0.62), -0.08, X(1.15), -0.5, X(1.0), -0.88); s.bezierCurveTo(X(0.75), -1.05, X(0.25), -0.62, 0, -0.05) })
        for (const pts of [[[0.08, 0.06], [0.7, 0.95], [1.3, 1.4]], [[0.08, -0.08], [0.55, -0.35], [0.92, -0.78]]]) parte(asa, tubo(pts.map(([x, y]) => V(X(x), y, 0.03)), 0.022), a.costasC2, { linha: 0 })
      }
    }
  }

  // The tail rises behind the right shoulder, where the front view shows it.
  if (a.cauda !== "nada") {
    const k = a.caudaT
    const cc = a.caudaCor ? a.caudaC : a.pele
    const base = V(0.35, chao + 0.62, -W * a.fundo * 0.8)
    const P = (x, y, z) => base.clone().add(V(x * k, y * k, z * k))
    const cauda = (pts, raio, c, faixa = {}) => {
      const { g, curva } = tuboAfinado(pts, raio, { ...faixa, lados: fina ? 12 : 8, n: fina ? 26 : 14 })
      parte(raiz, g, c, { fora: tuboAfinado(pts, raio, { ...faixa, lados: 8, n: 14, mais: traco }).g })
      return curva
    }
    const ao = (curva, t, alto) => {
      const T = curva.getTangentAt(t)
      return { p: curva.getPointAt(t), T, fora: T.clone().cross(V(0, 0, 1)).normalize(), q: new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), alto ? T : T.clone().cross(V(0, 0, 1)).normalize()) }
    }
    if (a.cauda === "lagarto") {
      const raio = (t) => k * (0.3 * (1 - t) ** 1.1 + 0.02)
      const curva = cauda([P(0, 0, 0), P(0.8, -0.3, -0.2), P(1.5, 0.05, 0.25), P(1.6, 0.8, 0.6), P(1.35, 1.25, 0.8)], raio, cc)
      for (const t of [0.22, 0.38, 0.54, 0.7, 0.86]) {
        const o = ao(curva, t)
        const g = new THREE.ConeGeometry(0.1 * k * (1.1 - t * 0.6), 0.26 * k * (1.1 - t * 0.5), 4)
        g.applyQuaternion(o.q)
        g.translate(...o.p.clone().add(o.fora.clone().multiplyScalar(raio(t) + 0.06)).toArray())
        parte(raiz, g, a.caudaC2, { linha: traco * 0.6 })
      }
    } else if (a.cauda === "peluda") {
      const pts = [P(0, 0, 0), P(0.7, -0.25, -0.1), P(1.3, 0.3, 0.25), P(1.35, 1.08, 0.55)]
      const raio = (t) => k * (0.1 + 0.32 * Math.sin(PI * t) ** 0.7) * (1 - suave(0.86, 1, t) * 0.85)
      cauda(pts, raio, cc, { ate: 0.72 })
      cauda(pts, raio, a.caudaC2, { de: 0.72 })
    } else if (a.cauda === "curta") cauda([P(0, 0, 0), P(0.55, -0.1, -0.05), P(0.95, 0.4, 0.15), P(1.0, 0.95, 0.3)], (t) => k * 0.13 * (1 - t * 0.6), cc)
    else if (a.cauda === "fina") cauda([P(0, 0, 0), P(0.65, -0.3, -0.05), P(1.2, 0.25, 0.2), P(1.0, 0.9, 0.4), P(1.25, 1.38, 0.5)], (t) => k * 0.075 * (1 - t * 0.3), cc)
    else if (a.cauda === "diabo") {
      const curva = cauda([P(0, 0, 0), P(0.65, -0.25, -0.05), P(1.25, 0.35, 0.25), P(1.15, 1.0, 0.45)], () => k * 0.05, cc)
      const o = ao(curva, 1, true)
      const g = new THREE.OctahedronGeometry(0.22 * k)
      g.scale(1, 1.35, 0.32)
      g.applyQuaternion(o.q)
      g.translate(...o.p.clone().add(o.T.clone().multiplyScalar(0.16 * k)).toArray())
      parte(raiz, g, a.caudaC2)
    }
  }

  // Arms only show while something happens, as today: at rest it's the icon's bust.
  const manga = a.roupa === "pele" || a.roupa === "barriga" ? a.pele : a.cor
  // A jacket's sleeves win over the shirt's: long, in its colour, cuffed in its trim.
  const comMangas = sobre === "jaqueta" || sobre === "moletom" || sobre === "sobretudo"
  const corManga = comMangas ? a.sobreC : a.manga === "nada" ? a.pele : manga
  const longa = comMangas || a.manga === "longa"
  const comPunho = comMangas || (a.punho && a.manga !== "nada")
  const corPunho = comMangas ? corBorda : a.golaC
  const km = comMangas ? 1.1 : 1
  function braco(pai, l, cotovelo, mao) {
    const o = V(l * W * 0.74, ombro - 0.5, 0)
    parte(pai, entreDois(o, cotovelo, 0.24 * km, 0.2 * km), corManga)
    parte(pai, bola(0.2 * km), comPunho && !longa ? a.pele : corManga, { p: cotovelo, linha: 0 })
    if (longa) {
      const pulso = mao.clone().lerp(cotovelo, 0.24)
      parte(pai, entreDois(cotovelo, pulso, 0.18 * km, 0.16 * km), corManga)
      if (comPunho) parte(pai, entreDois(pulso.clone().lerp(cotovelo, 0.2), pulso.clone().lerp(mao, 0.1), 0.175 * km), corPunho)
      parte(pai, entreDois(pulso, mao, 0.14, 0.14), a.pele)
    } else {
      parte(pai, entreDois(cotovelo, mao, 0.17, 0.14), a.pele)
      if (comPunho) parte(pai, entreDois(o.clone().lerp(cotovelo, 0.76), o.clone().lerp(cotovelo, 0.97), 0.225), corPunho)
    }
    parte(pai, bola(0.21), a.pele, { p: mao })
  }
  const bracos = { cima: new THREE.Group(), aceno: new THREE.Group(), palmas: new THREE.Group() }
  for (const l of [-1, 1]) braco(bracos.cima, l, V(l * (W + 0.2), -1.05, 0.05), V(l * (W + 0.35), 0.1, 0.2))
  braco(bracos.aceno, 1, V(W + 0.22, -1.1, 0.05), V(W + 0.1, 0.25, 0.25))
  for (const l of [-1, 1]) braco(bracos.palmas, l, V(l * (W + 0.05), -1.85, 0.6), V(l * 0.16, -1.2, 1.1))
  for (const g of Object.values(bracos)) raiz.add(g)

  /**
   * An arm that moves every frame (the keyboard overlay's typing, teclas.js): the same pieces as braco(), with its own
   * materials (so a page can clip the bust and not the arms), placed by apontar(hand) with a two-bone reach from the
   * shoulder. Lengths in the fan's units; past its reach the arm stretches, as a cartoon's does.
   */
  function bracoVivo(l, { L1 = 1.25, L2 = 1.5, estica = 1.6 } = {}) {
    const grupo = new THREE.Group()
    raiz.add(grupo)
    const borda = guardar(new THREE.MeshBasicMaterial({ color: NAVY, side: THREE.BackSide }))
    const esf = guardar(bola(1))
    const segs = []
    const juntas = []
    const seg = (c, r0, r1, linha = traco) => {
      const geo = guardar(new THREE.CylinderGeometry(r1 / r0, 1, 1, 14))
      const m = new THREE.Mesh(geo, material(c, {}))
      const f = linha ? new THREE.Mesh(geo, borda) : null
      grupo.add(m)
      if (f) grupo.add(f)
      const s = { m, f, r0, linha }
      segs.push(s)
      return s
    }
    const junta = (c, r, linha = traco) => {
      const m = new THREE.Mesh(esf, material(c, {}))
      const f = linha ? new THREE.Mesh(esf, borda) : null
      grupo.add(m)
      if (f) grupo.add(f)
      const j = { m, f, r, linha }
      juntas.push(j)
      return j
    }
    const Y = V(0, 1, 0)
    const meio = V(0, 0, 0)
    const dir = V(0, 0, 0)
    const q = new THREE.Quaternion()
    const entre = (s, de, ate) => {
      dir.subVectors(ate, de)
      const len = Math.max(1e-4, dir.length())
      q.setFromUnitVectors(Y, dir.divideScalar(len))
      meio.addVectors(de, ate).multiplyScalar(0.5)
      for (const [o, extra] of [[s.m, 0], [s.f, s.linha]]) {
        if (!o) continue
        o.position.copy(meio)
        o.quaternion.copy(q)
        o.scale.set(s.r0 + extra, len + extra, s.r0 + extra)
      }
    }
    const em = (j, p) => {
      j.m.position.copy(p)
      j.m.scale.setScalar(j.r)
      if (j.f) { j.f.position.copy(p); j.f.scale.setScalar(j.r + j.linha) }
    }
    const cima = seg(corManga, 0.24 * km, 0.2 * km)
    const cot = junta(comPunho && !longa ? a.pele : corManga, 0.2 * km, 0)
    const ante = longa ? seg(corManga, 0.18 * km, 0.16 * km) : seg(a.pele, 0.17, 0.14)
    const punhoS = comPunho ? seg(corPunho, longa ? 0.175 * km : 0.225, longa ? 0.175 * km : 0.225) : null
    const pulsoS = longa ? seg(a.pele, 0.14, 0.14) : null
    const maoJ = junta(a.pele, 0.21)

    const ombroP = V(l * W * 0.74, ombro - 0.5, 0)
    const polo = V(l * 1, -0.7, -0.6).normalize()
    const cotovelo = V(0, 0, 0)
    const ao = V(0, 0, 0)
    const lado = V(0, 0, 0)
    const pulso = V(0, 0, 0)
    const tmpA = V(0, 0, 0)
    const tmpB = V(0, 0, 0)
    /** Puts the hand at `mao` (in the fan's own axes); `achata` squashes it, for a press. */
    function apontar(mao, achata = 0) {
      ao.subVectors(mao, ombroP)
      const d = Math.max(0.05, ao.length())
      ao.divideScalar(d)
      const k = Math.min(estica, Math.max(1, d / (L1 + L2 - 0.02)))
      const l1 = L1 * k, l2 = L2 * k
      const dd = Math.min(d, l1 + l2 - 0.01)
      const x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd)
      const h = Math.sqrt(Math.max(0, l1 * l1 - x * x))
      lado.copy(polo).addScaledVector(ao, -polo.dot(ao)).normalize()
      cotovelo.copy(ombroP).addScaledVector(ao, x).addScaledVector(lado, h)
      const fim = tmpA.copy(ombroP).addScaledVector(ao, d)
      entre(cima, ombroP, cotovelo)
      em(cot, cotovelo)
      if (longa) {
        pulso.copy(fim).lerp(cotovelo, 0.24)
        entre(ante, cotovelo, pulso)
        if (punhoS) entre(punhoS, tmpB.copy(pulso).lerp(cotovelo, 0.2), V(0, 0, 0).copy(pulso).lerp(fim, 0.1))
        entre(pulsoS, pulso, fim)
      } else {
        entre(ante, cotovelo, fim)
        if (punhoS) entre(punhoS, tmpB.copy(ombroP).lerp(cotovelo, 0.76), V(0, 0, 0).copy(ombroP).lerp(cotovelo, 0.97))
      }
      em(maoJ, fim)
      maoJ.m.scale.set(0.21 * (1 + achata * 0.25), 0.21 * (1 - achata * 0.3), 0.21)
      if (maoJ.f) maoJ.f.scale.set((0.21 + traco) * (1 + achata * 0.25), (0.21 + traco) * (1 - achata * 0.3), 0.21 + traco)
    }
    apontar(V(l * (W + 0.3), -2.2, 0.8))
    return { grupo, apontar, ombro: ombroP }
  }

  function item(pai, m) {
    if (a.mao === "bandeira") {
      const topo = m.clone().add(V(0.05, 1.35, 0))
      parte(pai, entreDois(m.clone().add(V(0, -0.35, 0)), topo, 0.045), "#f4f5f7", { linha: 0 })
      parte(pai, malha((u, v) => topo.clone().add(V(u * 0.6, -v * 0.5, Math.sin(u * 5) * 0.05)), 12, 3), a.maoC)
    } else if (a.mao === "corneta") {
      parte(pai, entreDois(m, m.clone().add(V(0.2, 0.72, 0.2)), 0.06, 0.1), a.maoC)
      parte(pai, entreDois(m.clone().add(V(0.2, 0.72, 0.2)), m.clone().add(V(0.28, 0.98, 0.28)), 0.1, 0.27), a.maoC)
    } else if (a.mao === "dedo") {
      parte(pai, new THREE.BoxGeometry(0.62, 0.6, 0.22), a.maoC, { p: m.clone().add(V(0, 0.22, 0)) })
      parte(pai, new THREE.BoxGeometry(0.2, 0.66, 0.22), a.maoC, { p: m.clone().add(V(-0.21, 0.8, 0)) })
      parte(pai, new THREE.BoxGeometry(0.34, 0.18, 0.22), a.maoC, { p: m.clone().add(V(-0.42, 0.2, 0)), r: [0, 0, -0.35] })
      parte(pai, new THREE.BoxGeometry(0.07, 0.3, 0.02), "#f4f5f7", { p: m.clone().add(V(0.04, 0.24, 0.13)), linha: 0 })
    } else if (a.mao === "cajado") {
      const topo = m.clone().add(V(0.05, 1.62, 0))
      parte(pai, entreDois(m.clone().add(V(0, -1.05, 0)), topo, 0.06, 0.05), a.maoC2)
      parte(pai, new THREE.TorusGeometry(0.17, 0.045, 6, 16), a.maoC2, { p: topo, r: [PI / 2, 0, 0], linha: 0 })
      parte(pai, new THREE.OctahedronGeometry(0.2), a.maoC, { p: topo.clone().add(V(0, 0.26, 0)), s: [0.8, 1.35, 0.8] })
    } else if (a.mao === "varinha") {
      const ponta = m.clone().add(V(0.16, 0.86, 0.1))
      parte(pai, entreDois(m.clone().add(V(-0.02, -0.12, 0)), ponta, 0.04, 0.025), a.maoC2)
      parte(pai, chapa((s) => { for (let i = 0; i < 10; i++) s.lineTo(Math.sin((i * PI) / 5) * (i % 2 ? 0.1 : 0.24), Math.cos((i * PI) / 5) * (i % 2 ? 0.1 : 0.24)) }, 0.07), a.maoC, { p: ponta.clone().add(V(0.04, 0.16, 0)) })
    } else if (a.mao === "celular") {
      parte(pai, new THREE.BoxGeometry(0.36, 0.62, 0.08), NAVY, { p: m.clone().add(V(0, 0.3, 0.08)) })
      parte(pai, new THREE.PlaneGeometry(0.28, 0.5), "#4dd4ff", { p: m.clone().add(V(0, 0.3, 0.14)), linha: 0 })
    }
  }
  const repouso = new THREE.Group()
  raiz.add(repouso)
  // A free piece held in the hand shows the resting hand even with nothing chosen in "Na mão".
  if (a.mao !== "nada" || a.pecas.some((d) => d.onde === "mao")) {
    const mao = V(W * 0.84, -1.85, 0.72)
    parte(repouso, bola(0.21), a.pele, { p: mao })
    item(repouso, mao)
    item(bracos.cima, V(W + 0.35, 0.1, 0.3))
    item(bracos.aceno, V(W + 0.1, 0.25, 0.35))
  }

  // The free pieces, each an Object3D (not baked) so the editor's gizmo can drive it: pecas[i] = [side, mirrored side].
  // "mao" rides with what is held: punho moves from the resting hand to the raised one; the mirrored side takes the other hand.
  const maoParada = V(W * 0.84, -1.85, 0.72)
  const maoAlta = { cima: V(W + 0.35, 0.1, 0.3), aceno: V(W + 0.1, 0.25, 0.35) }
  const punho = { [1]: new THREE.Group(), [-1]: new THREE.Group() }
  raiz.add(punho[1], punho[-1])
  const ancoras = { cabeca: rosto, corpo: raiz, mao: punho[1] }
  const pecas = a.pecas.map((d) => {
    const onde = ondeFica(d)
    return (d.m ? [1, -1] : [1]).map((l) => {
      const geo = {
        bola: () => bola(0.5),
        cubo: () => new THREE.BoxGeometry(1, 1, 1),
        cone: () => new THREE.ConeGeometry(0.5, 1, 16),
        tubo: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
        anel: () => new THREE.TorusGeometry(0.4, 0.14, 8, 24),
        losango: () => new THREE.OctahedronGeometry(0.5),
        gota: () => new THREE.LatheGeometry(Array.from({ length: 17 }, (_, i) => new THREE.Vector2(0.62 * Math.sin((PI * i) / 16) ** 0.9 * (1 - i / 16) ** 0.45 + 0.001, i / 16 - 0.5)), 16),
        chifre: () => tuboAfinado([V(-0.12, -0.5, 0), V(-0.05, -0.15, 0), V(0.12, 0.18, 0), V(0.4, 0.45, 0)], (t) => 0.2 * (1 - t) + 0.01, { n: 14, lados: 8 }).g,
        placa: () => chapa((s) => { s.moveTo(-0.5, -0.5); s.lineTo(0.5, -0.5); s.lineTo(0, 0.5) }, 1),
        capsula: () => new THREE.CapsuleGeometry(0.35, 0.3, 6, 12),
      }[d.f]()
      if (l < 0) espelhar(geo)
      const pai = onde === "mao" ? punho[l] : ancoras[onde]
      const g = parte(pai, geo, d.c, { p: V(l * d.x, d.y, d.z), r: [d.rx, l * d.ry, l * d.rz], s: [d.sx, d.sy, d.sz], solta: true })
      // On the middle line the mirrored side is hidden, not missing, so a drag can bring it back.
      g.visible = l > 0 || Math.abs(d.x) > 0.001
      return g
    })
  })
  /** After the gizmo moved side `lado` of piece i: the other side mirrors it, both outlines follow. */
  function seguir(i, lado = 0) {
    const g = pecas[i][lado]
    const h = pecas[i][1 - lado]
    if (h) {
      h.position.set(-g.position.x, g.position.y, g.position.z)
      h.rotation.set(g.rotation.x, -g.rotation.y, -g.rotation.z)
      h.scale.copy(g.scale)
      g.visible = true
      h.visible = Math.abs(g.position.x) > 0.001
      contornar(h)
    }
    contornar(g)
  }

  function pose(nome = "parado") {
    // "pisca" is parado with the eyes shut: the editor swaps to it for a blink, the stand can bake it.
    const emocao = nome === "triste" ? "triste" : nome === "pisca" ? "pisca" : nome === "parado" ? "normal" : "alegre"
    if (!rostos[emocao]) rostos[emocao] = guardar(pintarRosto(a, emocao, qualidade))
    peleMat.map = rostos[emocao]
    for (const [k, g] of Object.entries(bracos)) g.visible = k === nome
    repouso.visible = nome === "parado" || nome === "pisca" || nome === "triste" || nome === "palmas"
    cabeca.rotation.set(nome === "triste" ? 0.3 : 0, a.giro, a.incl + (nome === "cima" ? 0.07 : 0))
    const alta = maoAlta[nome]
    punho[1].position.copy(alta ?? maoParada).sub(maoParada)
    punho[-1].position.set(0, 0, 0)
    if (nome === "cima") punho[-1].position.copy(punho[1].position).multiply(V(-1, 1, 1))
  }
  pose()
  /** Only the face (the arms left as they are): for a page that moves the arms itself. */
  function emocao(e = "normal") {
    if (!rostos[e]) rostos[e] = guardar(pintarRosto(a, e, qualidade))
    peleMat.map = rostos[e]
  }
  return { raiz, pose, pecas, ancoras, seguir, cabeca, bracos, repouso, emocao, bracoVivo, descartar: () => lixo.forEach((x) => x.dispose()) }
}

// One renderer for every picture: the stand never runs 3D, it shows what this drew once.
/** The frames a picture can take, in head units: the whole fan, the head, the body, the head with what's on it, the eyes. */
export const FOTO = {
  inteiro: { x: 0, y: -0.36, w: 4.5, h: 5.3 },
  cabeca: { x: 0, y: 0.05, w: 3.0, h: 3.4 },
  corpo: { x: 0, y: -1.3, w: 3.8, h: 3.8 },
  alto: { x: 0, y: 0.3, w: 3.6, h: 4.4 },
  olhos: { x: 0, y: -0.04, w: 1.18, h: 1.34 }, // close enough to see a pupil
}

/**
 * The marble's look (Luan, 2026-11-26: the minigames' ball as the fan's head, "completamente redonda"): the head made a
 * sphere (its width, height, squareness, chin, cheeks, forehead and muzzle back to round, its size and tilt to the
 * default), everything else the fan's own. What sticks out of it (hair, a hat, ears, horns) is then pressed onto the
 * sphere by the photographer's bola(): what you'd see looking at the head from straight out along each direction.
 */
export const redonda = (a) => ({ ...a, larg: 1, alt: 1, quadr: 0, queixo: 0, bochecha: 0, testa: 0, focinho: 0, tam: 1, incl: 0, giro: 0 })

// The marble's picture: the head seen from its centre out, the farthest surface along each direction (so a hat's top
// covers the hair, the hair the scalp), flat colours, into a cube; then the cube unwrapped as the sphere's map
// (three's SphereGeometry: longitude across from −x, latitude down from the top), with a navy line wherever one piece
// meets another, as the outlines do on the fan.
const BOLA_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
const BOLA_FRAG = `
  precision highp float;
  uniform samplerCube cor;
  uniform samplerCube ids;
  uniform float traco;
  uniform vec3 navy;
  varying vec2 vUv;
  const float PI = 3.141592653589793;
  vec3 dirDe(vec2 uv) {
    float phi = uv.x * 2.0 * PI;
    float theta = (1.0 - uv.y) * PI;
    return vec3(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));
  }
  vec3 srgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }
  void main() {
    vec3 d = dirDe(vUv);
    vec3 c = textureCube(cor, d).rgb;
    vec3 id = textureCube(ids, d).rgb;
    vec3 t1 = abs(d.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : normalize(cross(d, vec3(0.0, 1.0, 0.0)));
    vec3 t2 = cross(d, t1);
    float borda = 0.0;
    for (int k = 0; k < 8; k++) {
      float a = float(k) * PI / 4.0;
      vec3 o = textureCube(ids, normalize(d + (t1 * cos(a) + t2 * sin(a)) * traco)).rgb;
      if (dot(o, o) > 0.0 && dot(id, id) > 0.0 && distance(o, id) > 0.002) borda = 1.0;
    }
    gl_FragColor = vec4(srgb(mix(c, navy, borda)), 1.0);
  }`

// Built on the first picture, not on import: the site's build imports this in Node, where there's no WebGL.
function montarFotografo() {
  const render = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  render.setClearColor(0, 0)
  // Room for the biggest shot the stand asks at 1x (about 65 px a unit), so the canvas grows at page load, not live.
  render.setSize(300, 350, false)
  const cena = new THREE.Scene()
  luzes(cena)
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40)
  const tamanho = new THREE.Vector2()
  const mvp = new THREE.Matrix4()
  const ponto = new THREE.Vector3()
  const semNada = () => {}

  const largura = (q, altura) => Math.round((altura * q.w) / q.h)
  /**
   * Camera on frame `q`, w × h px, drawn in the canvas's bottom-left corner; returns how far down the canvas the
   * picture starts. The canvas only grows: a resize reallocates its GPU buffers (20 to 120 ms here).
   */
  function enquadrar(q, w, altura) {
    render.getSize(tamanho)
    if (w > tamanho.x || altura > tamanho.y) render.setSize(Math.max(w, tamanho.x), Math.max(altura, tamanho.y), false)
    render.getSize(tamanho)
    render.setViewport(0, 0, w, altura)
    render.setScissor(0, 0, w, altura)
    render.setScissorTest(true)
    Object.assign(camera, { left: -q.w / 2, right: q.w / 2, top: q.h / 2, bottom: -q.h / 2 })
    camera.updateProjectionMatrix()
    camera.position.set(q.x, q.y + 0.9, 12)
    camera.lookAt(q.x, q.y, 0)
    return tamanho.y - altura
  }
  function foto(b, pose) {
    b.pose(pose)
    cena.add(b.raiz)
    render.render(cena, camera)
    cena.remove(b.raiz)
  }
  // Disposing a material makes three drop its shader program once no other uses it, and the next fan compiles
  // it all again (35 to 90 ms). The materials go to the garbage collector instead, so the programs stay.
  function desmontar(b) {
    b.raiz.traverse((o) => { if (o.material) o.material.dispose = semNada })
    b.descartar()
  }
  /**
   * The fan's box in the picture just drawn, in pixels, from its visible vertices (no GPU readback: that would wait
   * for every frame queued on the GPU), with a clear border round it so the edges filter as before. On a grid of `n`
   * pixels, so it shrinks by n to whole pixels.
   */
  function recorte(b, w, h, n) {
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    b.raiz.traverseVisible((o) => {
      if (!o.isMesh) return
      mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(o.matrixWorld)
      const e = mvp.elements
      const pos = o.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        ponto.fromBufferAttribute(pos, i)
        const x = e[0] * ponto.x + e[4] * ponto.y + e[8] * ponto.z + e[12]
        const y = e[1] * ponto.x + e[5] * ponto.y + e[9] * ponto.z + e[13]
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    })
    // Clip space (y up) to pixels (y down).
    const baixo = (v) => Math.floor(v / n - 1) * n
    const cima = (v) => Math.ceil(v / n + 1) * n
    const x = entre(baixo(((x0 + 1) / 2) * w), 0, w - n)
    const y = entre(baixo(((1 - y1) / 2) * h), 0, h - n)
    return { x, y, w: Math.max(n, entre(cima(((x1 + 1) / 2) * w), 0, w) - x), h: Math.max(n, entre(cima(((1 - y0) / 2) * h), 0, h) - y) }
  }

  // --- The marble -----------------------------------------------------------------------------------------------
  let bolaKit = null
  function kitDaBola() {
    if (bolaKit) return bolaKit
    const LADO = 256
    const cor = new THREE.WebGLCubeRenderTarget(LADO, { type: THREE.HalfFloatType, generateMipmaps: false })
    const ids = new THREE.WebGLCubeRenderTarget(LADO, { magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter, generateMipmaps: false })
    const cubo = new THREE.CubeCamera(0.01, 30, cor)
    const plano = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: BOLA_VERT,
        fragmentShader: BOLA_FRAG,
        uniforms: { cor: { value: cor.texture }, ids: { value: ids.texture }, traco: { value: 0.022 }, navy: { value: new THREE.Color(NAVY) } },
        depthTest: false,
        depthWrite: false,
      }),
    )
    plano.frustumCulled = false
    const cenaPlana = new THREE.Scene()
    cenaPlana.add(plano)
    const cenaBola = new THREE.Scene()
    bolaKit = { cor, ids, cubo, cenaPlana, cenaBola, cameraPlana: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) }
    return bolaKit
  }
  /**
   * The fan made a marble, from its centre out (redonda: the head a sphere): only the head and what rides on it, each
   * piece with two flat materials, its colour (and map: the face) and an id of its own; the outlines and see-through
   * pieces (lenses) left out. Returns what draws each pass and what puts the fan back.
   */
  function prepararBola(b) {
    const cabeca = b.ancoras.cabeca
    const naCabeca = new Set()
    cabeca.traverse((o) => naCabeca.add(o))
    const pecas = []
    b.raiz.traverse((o) => {
      if (!o.isMesh) return
      const m = o.material
      const contornoDe = m.isMeshBasicMaterial && m.side === THREE.BackSide
      const vidro = m.transparent && m.opacity < 0.6
      if (!naCabeca.has(o) || contornoDe || vidro || !o.visible) return
      const n = pecas.length + 1
      const plana = { side: THREE.DoubleSide, depthFunc: THREE.GreaterDepth }
      pecas.push({
        o,
        original: m,
        cor: new THREE.MeshBasicMaterial({ color: m.color ?? new THREE.Color("#ffffff"), map: m.map ?? null, vertexColors: !!m.vertexColors, ...plana }),
        id: new THREE.MeshBasicMaterial({ color: new THREE.Color(((n * 37) % 251) / 255, ((n * 91) % 241) / 255, ((n * 13 + 128) % 255) / 255), ...plana }),
      })
    })
    const escondidos = []
    b.raiz.traverse((o) => {
      if (o.isMesh && o.visible && !pecas.some((p) => p.o === o)) {
        o.visible = false
        escondidos.push(o)
      }
    })
    return {
      vestir: (qual) => pecas.forEach((p) => (p.o.material = p[qual])),
      desfazer() {
        // Not disposed: three would drop their programs and compile them again for the next marble (as desmontar).
        pecas.forEach((p) => (p.o.material = p.original))
        escondidos.forEach((o) => (o.visible = true))
      },
    }
  }
  /** One cube pass of the marble: clears to depth 0 so the farthest surface wins (GreaterDepth). */
  function passeDaBola(k, b, alvo, fundo) {
    k.cubo.renderTarget = alvo
    k.cenaBola.add(b.raiz)
    const depth = render.state.buffers.depth
    const corAntes = render.getClearColor(new THREE.Color())
    const alfaAntes = render.getClearAlpha()
    render.setScissorTest(false)
    render.setClearColor(fundo, 1)
    depth.setClear(0)
    k.cubo.update(render, k.cenaBola)
    depth.setClear(1)
    render.setClearColor(corAntes, alfaAntes)
    k.cenaBola.remove(b.raiz)
  }
  /** The cubes unwrapped into the canvas's bottom-left w × h; returns how far down the canvas it starts. */
  function desenrolar(k, w, h) {
    render.getSize(tamanho)
    if (w > tamanho.x || h > tamanho.y) render.setSize(Math.max(w, tamanho.x), Math.max(h, tamanho.y), false)
    render.getSize(tamanho)
    render.setRenderTarget(null)
    render.setViewport(0, 0, w, h)
    render.setScissor(0, 0, w, h)
    render.setScissorTest(true)
    render.render(k.cenaPlana, k.cameraPlana)
    return tamanho.y - h
  }
  /** A marble's map, step by step (each a few ms): build, colour cube, id cube, unwrap. */
  function passosDaBola(a, altura, traco) {
    const k = kitDaBola()
    const look = redonda(a)
    let b = null
    let prep = null
    let etapa = 0
    return {
      get montado() { return !!b },
      passo() {
        if (etapa === 0) {
          b = criarBoneco(look, { qualidade: 0.5, traco })
          b.pose("parado")
          b.raiz.updateMatrixWorld(true)
          prep = prepararBola(b)
        } else if (etapa === 1) {
          prep.vestir("cor")
          passeDaBola(k, b, k.cor, new THREE.Color(look.pele))
        } else if (etapa === 2) {
          prep.vestir("id")
          passeDaBola(k, b, k.ids, new THREE.Color(0, 0, 0))
        } else {
          const w = altura * 2
          const dy = desenrolar(k, w, altura)
          prep.desfazer()
          desmontar(b)
          return { x: 0, y: dy, w, h: altura }
        }
        etapa++
        return null
      },
      largar() {
        if (prep) prep.desfazer()
        if (b) desmontar(b)
      },
    }
  }

  return {
    /** The marble's map at once, a canvas 2h × h (the site, the tools): the fan's head made round, see redonda. */
    bola(a, { altura = 256, traco = 0.04 } = {}) {
      const s = passosDaBola(a, altura, traco)
      let r = null
      while (!(r = s.passo()));
      const c = document.createElement("canvas")
      c.width = r.w
      c.height = r.h
      c.getContext("2d").drawImage(render.domElement, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
      return c
    },
    /** Whole-frame canvases at once (the editor's thumbnails, the gallery). */
    tirar(a, poses, { altura = 260, quadro = "inteiro", traco = 0.06, giro = 0 } = {}) {
      const w = largura(FOTO[quadro], altura)
      const dy = enquadrar(FOTO[quadro], w, altura)
      const b = criarBoneco(a, { qualidade: 0.5, traco })
      b.raiz.rotation.y = giro
      const fotos = {}
      for (const p of poses) {
        foto(b, p)
        const c = document.createElement("canvas")
        c.width = w
        c.height = altura
        c.getContext("2d").drawImage(render.domElement, 0, dy, w, altura, 0, 0, w, altura)
        fotos[p] = c
      }
      desmontar(b)
      return fotos
    },
    /**
     * The stand's pictures, one small step per passo() so no frame pays for a whole fan: the first builds the fan,
     * each next one shoots a pose. `px` is pixels per unit. Each picture is cut to the fan, an ImageBitmap, and keeps
     * where the cut sits in the whole frame: { img, x, y, W, H }. `pronto` resolves with the pictures once all are in.
     * Shot at about `fino` px a unit and shrunk by whole times with the same filter the stand used to draw with, so
     * a small picture looks like the old 260 px ones did shrunk on the stand (a straight small render is softer:
     * the face and shirt maps fall to their mipmaps, the outline thins to a faint line).
     */
    sessao(a, poses, { px, quadro = "inteiro", traco = 0.06, fino = 260 / 5.3 }) {
      if (quadro === "bola") {
        // The marble's map, `px` tall and twice as wide, as the one picture "bola": { img, x: 0, y: 0, W, H }.
        const altura = Math.max(16, Math.round(px))
        const s = passosDaBola(a, altura, 0.04)
        let pronto = null
        return {
          px,
          get montado() { return s.montado },
          get pronto() { return pronto },
          esperando: false,
          passo() {
            const r = s.passo()
            if (!r) return false
            pronto = createImageBitmap(render.domElement, r.x, r.y, r.w, r.h).then((img) => ({ bola: { img, x: 0, y: 0, W: r.w, H: r.h } }))
            return true
          },
          largar() {
            if (pronto) return
            s.largar()
            pronto = Promise.resolve({})
          },
        }
      }
      const q = FOTO[quadro]
      const altura = Math.max(8, Math.round(px * q.h))
      const W = largura(q, altura)
      // Never past 640 px tall in the GPU canvas.
      const n = Math.max(1, Math.min(Math.round(fino / px), Math.floor(640 / altura)))
      const fotos = {}
      const vindo = []
      let b = null
      let feitas = 0
      let pronto = null
      let shaders = null
      return {
        px,
        get montado() { return !!b },
        get pronto() { return pronto },
        // A shader no fan used yet compiles off the main thread (KHR_parallel_shader_compile); the next steps wait.
        get esperando() { return shaders === false },
        passo() {
          if (!b) {
            b = criarBoneco(a, { qualidade: 0.5, traco })
            return false
          }
          if (shaders === null) {
            shaders = false
            cena.add(b.raiz)
            render.compileAsync(cena, camera).then(() => { shaders = true })
            cena.remove(b.raiz)
            return false
          }
          const dy = enquadrar(q, W * n, altura * n)
          const pose = poses[feitas++]
          foto(b, pose)
          const r = recorte(b, W * n, altura * n, n)
          // The bitmap copies the canvas now; the next pose can draw over it.
          const tam = n > 1 ? { resizeWidth: r.w / n, resizeHeight: r.h / n, resizeQuality: "low" } : {}
          vindo.push(createImageBitmap(render.domElement, r.x, r.y + dy, r.w, r.h, tam).then((img) => { fotos[pose] = { img, x: r.x / n, y: r.y / n, W, H: altura } }))
          if (feitas < poses.length) return false
          desmontar(b)
          pronto = Promise.all(vindo).then(() => fotos)
          return true
        },
        /** Stops half way: the fan goes, and so do the pictures already shot. */
        largar() {
          if (pronto) return
          if (b) desmontar(b)
          feitas = poses.length
          pronto = Promise.all(vindo).then(() => { for (const f of Object.values(fotos)) f.img.close() })
        },
      }
    },
  }
}
let estudio = null
const abrir = () => (estudio ??= montarFotografo())
/**
 * Pictures of fans, from one WebGL canvas for the whole page.
 *   tirar(look, poses, { altura, quadro, traco, giro }) → { [pose]: canvas }, whole frames at once (thumbnails, galleries).
 *   sessao(look, poses, { px, quadro, traco, fino }) → a session baked one small step per passo(), so no frame pays
 *     for a whole fan: { passo() → true once done, pronto (a promise of { [pose]: { img, x, y, W, H } }), montado,
 *     esperando, largar(), px }. Each picture is an ImageBitmap cut to the fan, with where it sits in the whole frame.
 *   bola(look, { altura }) → a canvas 2h × h, the fan as a marble (its head made round, wrapped as a sphere's map);
 *     sessao(look, ["bola"], { px: h, quadro: "bola" }) bakes the same step by step, as the picture "bola".
 *   preparar() makes the canvas now, so the first picture doesn't pay for it.
 */
export const fotografo = {
  tirar: (...args) => abrir().tirar(...args),
  bola: (...args) => abrir().bola(...args),
  sessao: (...args) => abrir().sessao(...args),
  preparar: () => void abrir(),
}
