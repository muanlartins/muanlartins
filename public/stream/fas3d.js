// The 3D fans on the live's overlays (torcida.html, creditos.html, duelo.html, corrida.html): the look each one is drawn
// with, one queue that bakes every picture of the page in small steps, and a fan as a DOM picture (the duel's cards,
// the race's podium, the credits' list). The stand itself is arquibancada3d.js, fed by the same queue. An ES module
// over torcedor3d/ (the fan's schema, model and clothes, shared with the site): the page needs the import map that
// maps "three" to jsDelivr's three@0.182.0, as corrida.html has.
//
// The budget: a picture is baked one small step at a time (boneco.js's fotografo.sessao: building the fan, then one
// pose a step), and the queue takes at most ORCAMENTO ms of steps a frame. Building a fan is the one big step, so it
// only starts at the top of a frame, alone. Pictures are ImageBitmaps cut to the fan; whoever asked for them closes
// them (soltar) when the fan goes.
import { FOTO, fotografo } from "./torcedor3d/boneco.js"
import { torcedorDe } from "./torcedor3d/antigo.js"
import { natal as dezembro, vestir } from "./torcedor3d/vestir.js"

export { FOTO }
export const ORCAMENTO = 5

/** December in Brasília, or ?natal: Santa's hat on everyone (never saved). */
export const natal = () => new URLSearchParams(location.search).has("natal") || dezembro()

/**
 * Someone's fan as drawn: their 3D look when they saved one, else their 2D one turned 3D (antigo.js), dressed for the
 * moment (the referee's kit while the VAR is open, Santa's hat in December). `aparencia` is what the profile API's
 * /torcedores has for them (null for whoever never saved one). Free colours for everyone (Σ no longer locks them).
 */
export const lookDe = (aparencia, login, { arbitro = false, touca = natal() } = {}) => vestir(torcedorDe(aparencia, login), { arbitro, natal: touca })

// The 3D shirt as the 2D one's fields (torcedor.js), for what still draws a shirt flat: the duel's ball
// (duelo-arte.js) and the race's marble (bolinha.js). The way back of vestir.js's camisa2D, so a 2D fan turned 3D
// gives back its very shirt; a 3D pattern the 2D never had falls to the nearest.
const PLANA = { lisa: "lisa", listras: "listras", listrado: "listrado", faixa: "faixa", metade: "meio", tricolor: "tricolor", xadrez: "listras", malha: "listrado", chevron: "faixa", degrade: "meio", manto: "lisa" }
export function camisaPlana(a) {
  let roupa = PLANA[a.roupa] ?? "lisa"
  if (a.roupa === "peito") roupa = a.terceira === a.cor ? "listra" : "faixa-dupla"
  else if (roupa === "lisa" && a.numOn) roupa = "numero"
  else if (roupa === "lisa" && a.gola === "v") roupa = "gola"
  return { cor: a.cor, detalhe: a.detalhe, terceira: a.terceira, roupa, numero: a.numero, comemoracao: a.fes }
}

/** Closes a set of pictures ({ pose: { img } }). */
export function soltar(fotos) {
  for (const f of Object.values(fotos ?? {})) f?.img?.close()
}
/** Bytes a set of pictures holds. */
export const bytes = (fotos) => Object.values(fotos ?? {}).reduce((s, f) => s + (f?.img ? f.img.width * f.img.height * 4 : 0), 0)

// --- The queue ---------------------------------------------------------------------------------------------------
// Sources of work, in order: each fonte's proximo() says what it wants baked now ({ look, poses, px, quadro,
// valido(), guardar(fotos) }) or null. Asked again each time a fan is done, so a source always gets what it needs
// most at that moment (the stand: whoever came in first, then the sizes).
const fontes = []
let obra = null
let passoMedio = 1.5
let rodando = false
/** Each fan's baking ms (all its steps), each frame's baking ms, and the steps over 8 ms ([step, ms]). */
export const medidas = { fans: [], quadros: [], lentos: [] }

/** A source of work; `nota` orders the sources (lower first). Returns what removes it. */
export function fonte(proximo, nota = 0) {
  const f = { proximo, nota }
  fontes.push(f)
  fontes.sort((a, b) => a.nota - b.nota)
  acordar()
  return () => {
    const i = fontes.indexOf(f)
    if (i >= 0) fontes.splice(i, 1)
  }
}

// The shirt's number is painted in the overlays' face (stream.css's "Space Grotesk"): no fan is baked before it loads
// (3 s at most, then whatever there is).
let fonte3d = false
document.fonts
  .load('700 20px "Space Grotesk"')
  .catch(() => {})
  .finally(() => (fonte3d = true))
setTimeout(() => (fonte3d = true), 3000)

function comecar() {
  if (!fonte3d) return null
  // A copy: a source may take itself out when it has nothing left.
  for (const f of [...fontes]) {
    const job = f.proximo()
    if (job) return { job, ms: 0, passos: 0, s: fotografo.sessao(job.look, job.poses, { px: job.px, quadro: job.quadro ?? "inteiro" }) }
  }
  return null
}

/** Bakes for at most `ms` this frame; the page's loop calls it (acordar() keeps one going). */
export function trabalhar(ms = ORCAMENTO) {
  const t0 = performance.now()
  for (;;) {
    if (obra && !obra.job.valido()) {
      obra.s.largar()
      obra = null
    }
    // The last fan's bitmaps are on their way.
    if (obra?.s.pronto) return
    if (!obra && !(obra = comecar())) return
    if (obra.s.esperando) return
    const montar = !obra.s.montado
    if (montar && performance.now() - t0 > 0.5) return
    const t = performance.now()
    const fim = obra.s.passo()
    const d = performance.now() - t
    if (d > 8) medidas.lentos.push([obra.passos, Math.round(d * 10) / 10])
    obra.passos++
    obra.ms += d
    if (!montar) passoMedio += (d - passoMedio) * 0.2
    if (fim) {
      const o = obra
      o.s.pronto
        .then((fotos) => {
          if (o.job.valido()) o.job.guardar(fotos)
          else soltar(fotos)
          medidas.fans.push(Math.round(o.ms * 10) / 10)
          if (medidas.fans.length > 400) medidas.fans.splice(0, 200)
        })
        // A picture that failed (the GPU's canvas lost, say) never stalls the queue: the source asks again.
        .catch((e) => console.error(e))
        .finally(() => {
          if (obra === o) obra = null
        })
      return
    }
    if (montar || performance.now() - t0 + passoMedio > ms) return
  }
}

function laco() {
  const t = performance.now()
  trabalhar()
  const d = performance.now() - t
  if (d > 0.05) {
    medidas.quadros.push(Math.round(d * 100) / 100)
    if (medidas.quadros.length > 4000) medidas.quadros.splice(0, 2000)
  }
  if (obra || fontes.length) requestAnimationFrame(laco)
  else rodando = false
}
/** There's work (a source was added or changed): the loop runs while any source is there. */
export function acordar() {
  if (rodando) return
  rodando = true
  requestAnimationFrame(laco)
}
/** Whether a fan is being baked now. */
export const ocupado = () => !!obra

// --- A fan as a DOM picture ----------------------------------------------------------------------------------------
// One source for every picture the page asks for, first asked first baked.
const pedidos = []
let tirarPedidos = null
function pedir(p) {
  pedidos.push(p)
  tirarPedidos ??= fonte(() => {
    while (pedidos.length && !pedidos[0].valido()) pedidos.shift()
    const p = pedidos.shift()
    if (!pedidos.length && !p) {
      tirarPedidos?.()
      tirarPedidos = null
    }
    return p ?? null
  }, 10)
  acordar()
}

// What the 2D celebrations (torcedor.css's .comemora, data-comemoracao) show in 3D: the moves are the 2D's, on the
// picture; the arms are the pose's.
const POSE_DA_FESTA = { pula: "cima", danca: "aceno", gira: "cima", acena: "aceno", palmas: "palmas", bananeira: "cima" }
/** The pose a celebration shows (its own: their `fes`). */
export const poseDaFesta = (fes) => POSE_DA_FESTA[fes] ?? "cima"

/**
 * A fan in `caixa` (an element sized in CSS: the fan fills its height, bottom-centred, overflowing its width if need
 * be), as a canvas inside it. `poses` are the ones it will show (the first at once). Returns { pose(nome), festa(ms),
 * largar() }: festa shows their celebration's pose (clapping takes turns with arms up) for ms, or until another pose.
 * The picture is baked at the box's height on screen (times the screen's density); a box not in the page yet is
 * baked at `altura`.
 */
export function retrato(caixa, look, { poses = ["parado"], altura = 0, quadro = "inteiro" } = {}) {
  const dpr = Math.min(2, devicePixelRatio || 1)
  const q = FOTO[quadro]
  const h = altura || caixa.clientHeight || 60
  const px = (h * dpr) / q.h
  const tela = document.createElement("canvas")
  tela.className = "retrato3d"
  const H = Math.max(8, Math.round(px * q.h))
  const W = Math.round((H * q.w) / q.h)
  tela.width = W
  tela.height = H
  Object.assign(tela.style, { position: "absolute", bottom: "0", left: "50%", height: "100%", aspectRatio: `${q.w} / ${q.h}`, translate: "-50% 0", pointerEvents: "none" })
  const alvo = caixa.querySelector(".pose") ?? caixa
  alvo.replaceChildren(tela)
  const g = tela.getContext("2d")
  let fotos = null
  let vivo = true
  let atual = poses[0]
  let festa = 0
  function desenhar(nome) {
    atual = nome
    const f = fotos?.[nome] ?? fotos?.[poses[0]]
    g.clearRect(0, 0, W, H)
    if (f) g.drawImage(f.img, Math.round((f.x * W) / f.W), Math.round((f.y * H) / f.H), Math.round((f.img.width * W) / f.W), Math.round((f.img.height * H) / f.H))
  }
  pedir({
    look,
    poses: [...new Set(poses)],
    px,
    quadro,
    valido: () => vivo,
    guardar(f) {
      fotos = f
      desenhar(atual)
    },
  })
  let volta = 0
  const api = {
    tela,
    pose(nome) {
      clearInterval(festa)
      clearTimeout(volta)
      desenhar(nome)
    },
    festa(ms = 2600) {
      api.pose(poseDaFesta(look.fes))
      if (look.fes === "palmas" && poses.includes("cima")) {
        let n = 0
        festa = setInterval(() => desenhar(n++ % 2 ? "palmas" : "cima"), 170)
      }
      if (ms !== Infinity) volta = setTimeout(() => api.pose(poses[0]), ms)
    },
    largar() {
      vivo = false
      clearInterval(festa)
      clearTimeout(volta)
      soltar(fotos)
      fotos = null
    },
  }
  return api
}
