// The render sheet: the fan at its angles, the poses, a close-up and the stand's sizes, in one picture. An ES module
// that render.py's page loads beside the fan's own modules (public/stream/torcedor3d/, the very files OBS's overlays
// load) and bakes with their fotografo, the same one the stand uses. The look is drawn as vestir() gives it, with no
// referee's kit and no Santa's hat: as it's saved.
import { fotografo, FOTO } from "/stream/torcedor3d/boneco.js"
import { MODELOS } from "/stream/torcedor3d/esquema.js"
import { vestir } from "/stream/torcedor3d/vestir.js"

const ANGULOS = { frente: 0, "tres-quartos": -0.7, lado: -1.45, costas: 2.6 }
const NOMES_POSE = { parado: "Parado", cima: "Gol", aceno: "Aceno", palmas: "Palmas", triste: "Gol deles", pisca: "Piscando" }
// The stand's two ends: one person on screen (31.5 px a head radius, a 63 px head) and a full one (8.5, a 17 px head).
const ESCALAS = [[31.5, "cabeça de 63 px"], [8.5, "cabeça de 17 px"]]
const VIZINHOS = ["Black power", "Rainha"]
const FUNDO_ARQ = "#002472"
let vizinhos = null

/** One picture as the stand draws it: k px per head radius, the bust's base on the floor. */
function naArquibancada(foto, k) {
  const w = Math.round(FOTO.inteiro.w * k)
  const h = Math.round(FOTO.inteiro.h * k)
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  c.getContext("2d").drawImage(foto, 0, 0, w, h)
  return c
}

export function folha(look, { angulos = Object.keys(ANGULOS), poses = [], rosto = false, arquibancada = false, altura = 340, titulo = "", subtitulo = "" } = {}) {
  const a = vestir(look)
  const linhas = []
  const celula = (img, rotulo, fundo = "#002fa7") => ({ img, rotulo, fundo })
  if (angulos.length) linhas.push(["Ângulos (pose parado)", angulos.map((n) => celula(fotografo.tirar(a, ["parado"], { altura, giro: ANGULOS[n] }).parado, n))])
  if (poses.length) {
    const f = fotografo.tirar(a, poses, { altura })
    linhas.push(["Poses (de frente)", poses.map((p) => celula(f[p], `${p} · ${NOMES_POSE[p]}`))])
  }
  if (rosto) linhas.push(["Rosto de perto", [["frente", 0], ["tres-quartos", -0.7]].map(([n, giro]) => celula(fotografo.tirar(a, ["parado"], { altura, quadro: "cabeca", giro }).parado, n))])
  if (arquibancada) {
    // Baked at 260 px, then scaled down by drawImage to the stand's sizes.
    const base = fotografo.tirar(a, ["parado"], { altura: 260 }).parado
    vizinhos ??= VIZINHOS.map((n) => fotografo.tirar(vestir(MODELOS.find(([m]) => m === n)[1]), ["parado"], { altura: 260 }).parado)
    const cel = ESCALAS.map(([k, r]) => celula(naArquibancada(base, k), r, FUNDO_ARQ))
    const [k] = ESCALAS[1]
    const pequeno = naArquibancada(base, k)
    // The small one blown up 4×, pixel by pixel: what is really there to read.
    const zoom = document.createElement("canvas")
    zoom.width = pequeno.width * 4
    zoom.height = pequeno.height * 4
    const gz = zoom.getContext("2d")
    gz.imageSmoothingEnabled = false
    gz.drawImage(pequeno, 0, 0, zoom.width, zoom.height)
    cel.push(celula(zoom, "17 px, ampliado 4×", FUNDO_ARQ))
    // Among two presets, at the small size: does it still stand out?
    const fila = document.createElement("canvas")
    const vz = vizinhos.map((v) => naArquibancada(v, k))
    const passo = Math.round(pequeno.width * 0.9)
    fila.width = passo * 2 + pequeno.width + 16
    fila.height = pequeno.height
    const gf = fila.getContext("2d")
    gf.drawImage(vz[0], 8, 0)
    gf.drawImage(vz[1], 8 + passo * 2, 0)
    gf.drawImage(pequeno, 8 + passo, 0)
    cel.push(celula(fila, "17 px, no meio de dois", FUNDO_ARQ))
    linhas.push(["Na arquibancada", cel])
  }

  // Layout: a title, then one row per kind, cells side by side with their label under them.
  const M = 16
  const GAP = 10
  const ROT = 26
  const TOPO = titulo || subtitulo ? 58 : 8
  // A cell is as wide as its picture or its label, whichever is wider.
  const medir = document.createElement("canvas").getContext("2d")
  medir.font = '500 13px "Space Grotesk", sans-serif'
  for (const [, cels] of linhas) for (const c of cels) c.w = Math.ceil(Math.max(c.img.width + 12, medir.measureText(c.rotulo).width + 4))
  const largura = Math.max(420, ...linhas.map(([, c]) => c.reduce((s, x) => s + x.w, 0) + GAP * (c.length - 1))) + M * 2
  const alturaLinha = (c) => Math.max(...c.map((x) => x.img.height)) + 12
  const total = TOPO + linhas.reduce((s, [, c]) => s + ROT + alturaLinha(c) + ROT + 6, 0) + M
  const tela = document.createElement("canvas")
  tela.width = largura
  tela.height = total
  const g = tela.getContext("2d")
  g.fillStyle = "#d6e2ff"
  g.fillRect(0, 0, largura, total)
  g.fillStyle = "#001447"
  g.textBaseline = "alphabetic"
  if (titulo) {
    g.font = '600 20px "Space Grotesk", sans-serif'
    g.fillText(titulo, M, 30)
  }
  if (subtitulo) {
    g.font = '400 14px "Space Grotesk", sans-serif'
    g.fillText(subtitulo, M, titulo ? 50 : 30)
  }
  let y = TOPO
  for (const [rotulo, cels] of linhas) {
    g.fillStyle = "#002fa7"
    g.font = '600 13px "Space Grotesk", sans-serif'
    g.fillText(rotulo.toUpperCase(), M, y + 17)
    y += ROT
    const h = alturaLinha(cels)
    let x = M
    for (const c of cels) {
      const w = c.w
      g.fillStyle = c.fundo
      g.fillRect(x, y, w, h)
      g.drawImage(c.img, x + Math.round((w - c.img.width) / 2), y + h - 6 - c.img.height)
      g.fillStyle = "#001447"
      g.font = '500 13px "Space Grotesk", sans-serif'
      g.fillText(c.rotulo, x, y + h + 17)
      x += w + GAP
    }
    y += h + ROT + 6
  }
  return tela.toDataURL("image/png")
}
