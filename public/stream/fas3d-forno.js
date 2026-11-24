// The oven: fas3d.js's fans baked in a worker, so no frame of the overlay pays for building one (criarBoneco takes 5 to
// 80 ms in one go, which no step can split). The very same boneco.js on an OffscreenCanvas: a worker has no document,
// so the canvases it asks for are OffscreenCanvases, and no import map, so "three" and its own imports are rewritten
// to full addresses before it's imported. Messages: { id, look, poses, px, quadro } in; { id, fotos, ms } out, the
// ImageBitmaps transferred; { pronto } once warmed up (one fan baked and dropped: the shaders' first compile happens
// here, not at the first fan anyone sees); { falhou } if it can't, and the page bakes on its own thread instead.
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js"
const tela = () => Object.assign(new OffscreenCanvas(1, 1), { style: {} })
self.document = { createElement: tela, createElementNS: tela }

const base = new URL("./torcedor3d/", self.location.href)
let fotografo = null

async function abrir() {
  const reescrever = (src) => src.replace(/from "three"/g, `from "${THREE_URL}"`).replace(/from "\.\/([\w-]+\.js)"/g, (_, f) => `from "${new URL(f, base).href}"`)
  const src = await (await fetch(new URL("boneco.js", base))).text()
  const url = URL.createObjectURL(new Blob([reescrever(src)], { type: "text/javascript" }))
  const B = await import(url)
  const { normalizar } = await import(new URL("esquema.js", base).href)
  // The shirt's number is painted in the overlays' face.
  try {
    self.fonts.add(await new FontFace("Space Grotesk", `url(${new URL("../space-grotesk.ttf", base).href})`, { weight: "300 700" }).load())
  } catch {
    // Without it, the number falls back to a sans-serif.
  }
  fotografo = B.fotografo
  const fotos = await assar({ look: normalizar({ numOn: true }), poses: ["parado", "cima"], px: 20 }, false)
  for (const f of Object.values(fotos)) f.img.close()
}

const espera = () => new Promise((r) => setTimeout(r, 2))
// A frame between steps, so the GPU this shares with the page (and OBS) gets its turn: a fan's steps spread over a few
// frames instead of holding the GPU 20 to 80 ms in one go.
// (A worker's animation frame may never come without a canvas on screen: whichever comes first, it or 20 ms.)
const quadro = () =>
  new Promise((r) => {
    self.requestAnimationFrame?.(() => r())
    setTimeout(r, 20)
  })
async function assar({ look, poses, px, quadro: q = "inteiro" }, pausar = true) {
  const s = fotografo.sessao(look, poses, { px, quadro: q })
  for (;;) {
    while (s.esperando) await espera()
    if (s.passo()) break
    if (pausar) await quadro()
  }
  return s.pronto
}

const aberto = abrir()
aberto.then(
  () => self.postMessage({ pronto: true }),
  (e) => self.postMessage({ falhou: String(e?.message ?? e) }),
)

self.onmessage = async ({ data }) => {
  const t0 = performance.now()
  try {
    await aberto
    const fotos = await assar(data)
    self.postMessage({ id: data.id, fotos, ms: performance.now() - t0 }, Object.values(fotos).map((f) => f.img))
  } catch (e) {
    self.postMessage({ id: data.id, erro: String(e?.message ?? e) })
  }
}
