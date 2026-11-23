// The live's stand in 3D (approved by Luan on 2026-11-22, the prototype's arquibancada.js): rows of steps with the
// fans' pictures on them, their names at 18 px on each row's riser (taking turns when they'd touch), breathing,
// blinking, the flags and the drum, the talker coming forward to the rail with the chat line beside their face, and
// the stand's moments. One canvas, drawn each frame from pictures only: the 3D runs once per fan and pose, in small
// steps (fas3d.js's queue), never per frame. Shared by torcida.html (960 wide, 300 or 220 tall) and creditos.html.
//
// criarArquibancada(canvas, { largura, altura, acima, porFila, marca, convite }) → the stand:
//   dispor(lista, { animar })  who stands where: [{ login, nome, aparencia, emblema, canal }] in order (the front row
//                              first, left to right), at most `capacidade`; aparencia is the profile API's (the 3D
//                              look, or the 2D one turned 3D); animar: newcomers run in from the right.
//   sair(login)                sinks away (0.6 s), then goes, pictures and all
//   evento(tipo, { placa, ms, confete, de })   "gol" (their own celebrations rippling, flags, drum, the plate's
//                              word, confetti), "deles" (a slump), "defesa" (a quick cheer), "ola" (from the left, or
//                              from someone's login in `de`)
//   mover(login, tipo)         "pula", "danca", "comemora" (their own), "lamenta"
//   falar(login, texto)        comes forward with the line in a balloon (three wait at most)
//   dedicar(login, ms)         comes forward, arms up (a goal dedicated to them)
//   cartao(login, n)           the VAR's vote card in their raised hand (0 takes it away)
//   arbitro(aberto)            everyone in the referee's kit (each fan baked again, the usual look kept for after)
//   natal(sim)                 Santa's hat on everyone
//   confete()                  confetti without a goal (a Christmas sub)
//   altura(px), ocupada(), onde(login) → { x, y } (the top of their head), fotos(login), capacidade, medidas
import { acordar, bytes, FOTO, fonte, soltar } from "./fas3d.js"
import { torcedorDe } from "./torcedor3d/antigo.js"
import { vestir } from "./torcedor3d/vestir.js"

const POSES = ["parado", "cima", "aceno", "palmas", "triste", "pisca"]
// Names on the live: never under 18 px (brand/interface.md).
const NOME = '600 18px "Space Grotesk", sans-serif'
const FORTE = '700 18px "Space Grotesk", sans-serif'
// The talker turns while talking, so its picture is drawn scaled: never less sharp than the old 260 px pictures.
const NITIDO = 260 / 5.3
// The last few talkers keep their sharp picture: the chat's regulars speak again soon.
const FALANTES = 4
// Chat lines waiting for the rail; a newer one pushes out the oldest.
const FALAS = 3
const FALA_MS = 5000
const FALA_MIN_MS = 2200
const NAVY = "#001447"
const KLEIN = "#002fa7"
const CLARO = "#85a7ff"
const PAPEL = "#f4f5f7"
const AMARELO = "#ffd23f"
// How long each move lasts (their own celebration as the 2D's did).
const DURA = { pula: 2100, danca: 3600, lamenta: 3500 }
const FESTA_MS = { pula: 2000, danca: 2400, gira: 2200, acena: 2400, palmas: 2400, bananeira: 2200 }
const entre = (x, a, b) => Math.min(b, Math.max(a, x))
const suave = (a, b, x) => {
  const t = entre((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
// A fixed pseudo-random per fan, so breathing and blinking never march together.
const acaso = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
let serie = 0

export function criarArquibancada(tela, opcoes = {}) {
  const W = opcoes.largura ?? 960
  let altura = opcoes.altura ?? 300
  const ACIMA = opcoes.acima ?? 200
  const [POR1, POR2] = opcoes.porFila ?? [10, 14]
  const MARCA = opcoes.marca ?? "TORCIDA MUANLARTINS"
  const CONVITE = opcoes.convite ?? "Entre no chat e apareça aqui"
  const CAPACIDADE = 4 * POR2
  const g = tela.getContext("2d")
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  let H = 0
  function medir() {
    H = altura + ACIMA
    tela.width = W * dpr
    tela.height = H * dpr
    tela.style.width = `${W}px`
    tela.style.height = `${H}px`
  }
  medir()
  // OBS never asks for less motion; a browser might.
  const menos = matchMedia("(prefers-reduced-motion: reduce)").matches
  const todas = new Map() // login → fan (seated or leaving)
  let sentados = [] // in seat order
  let arranjo = fileiras(0)
  let evento = null
  let foco = null
  const falas = []
  const falantes = []
  const papeis = []
  let caixas = []
  let varAberto = false
  let comTouca = false
  let ultimo = performance.now()
  // desenho: ms to draw a frame (smoothed) and the longest; bytes: the pictures held.
  const medidas = { desenho: 0, desenhoMax: 0, piscadas: 0, bytes: 0, fans: 0 }
  // Names are cut to fit once, measured in the overlays' face: once it's in, they're measured again.
  document.fonts
    .load(NOME)
    .then(() => document.fonts.load(FORTE))
    .catch(() => {})
    .finally(() => {
      for (const f of todas.values()) f.corte = null
    })
  const conjunto = () => (varAberto ? "arbitro" : "normal")
  const lookPara = (f, conj) => vestir(f.base, { arbitro: conj === "arbitro", natal: comTouca })

  // --- The rows ------------------------------------------------------------------------------------------------
  // For whoever is in, and how big a fan shows (k px a unit; the talker's K). Every row the same size: the stand keeps
  // its steps however few have come, and a fan changing rows keeps its pictures.
  function fileiras(total) {
    const R = total <= POR1 ? 1 : total <= 2 * POR1 ? 2 : total <= 3 * POR2 ? 3 : 4
    const porFila = R < 3 ? POR1 : POR2
    const frente = 26
    const passoX = (W - 140) / porFila
    const livre = altura - 14 - frente
    // An 18 px name needs a 24 px riser. When rows are tight, only the front row keeps one, and the others shrink to
    // 10 px so the faces get the room back.
    const nomeEmTodas = livre / R >= 80
    const faixas = Array.from({ length: R }, (_, f) => (f === 0 || nomeEmTodas ? 24 : 10))
    const banda = Math.min(R === 1 ? 134 : 102, (livre - faixas.reduce((s, v) => s + v, 0)) / R)
    const k = Math.min((banda + 4) / 4.05, passoX / 2.6)
    // The talker: at least 30 (so a tiny back-row face reads) and never taller than the stand.
    const K = entre(1.7 * k, Math.max(30, 1.2 * k), Math.min(38, (altura - 8) / 4.7))
    const baixos = []
    let y0 = H - frente
    for (const faixa of faixas) {
      baixos.push(y0)
      y0 -= faixa + banda
    }
    return { R, porFila, frente, passoX, faixas, banda, k, K, baixos, topo: y0 - 14, px: k * dpr, foco: K * dpr }
  }
  function lugar(i, n) {
    const { R, porFila, passoX, faixas, baixos, k } = arranjo
    const f = Math.floor(i / porFila)
    const naFila = Math.min(porFila, n - f * porFila)
    const desloca = R > 1 ? (f % 2 ? passoX / 4 : -passoX / 4) : 0
    const x = W / 2 + desloca + ((i % porFila) - (naFila - 1) / 2) * passoX
    return { f, x, pe: baixos[f] - faixas[f] + 0.1 * k }
  }
  function rearrumar() {
    arranjo = fileiras(sentados.length)
    sentados.forEach((f, i) => {
      f.alvo = lugar(i, sentados.length)
      if (f.x == null) Object.assign(f, { x: f.alvo.x, pe: f.alvo.pe })
    })
  }

  // --- Who's there ---------------------------------------------------------------------------------------------
  function criar(d, animar) {
    const n = serie++
    return {
      login: d.login, nome: d.nome, canal: !!d.canal, emblema: null, base: null, chave: null, versao: 0,
      // Pictures by kit: { fotos, px, feito }; zoom: the talker's sharper aceno and cima.
      sets: {}, zoom: null, animar, chegou: null, saiu: null, mov: null, cartao: 0, x: null, pe: null, alvo: null,
      // Breath: 3.4 to 5 s a cycle at its own phase; first blink somewhere in the first 6 s.
      folego: (2 * Math.PI) / (3400 + 1600 * acaso(n)), fase: 2 * Math.PI * acaso(n + 0.5), pisca: performance.now() + 6000 * acaso(n + 0.25), corte: null,
    }
  }
  function vestirFa(f, d) {
    f.nome = d.nome ?? f.login
    f.canal = !!d.canal
    f.emblema = d.emblema ? emblema(d.emblema) : null
    const chave = JSON.stringify(d.aparencia ?? null)
    if (chave === f.chave) return
    f.chave = chave
    f.base = torcedorDe(d.aparencia ?? null, f.login)
    f.versao++
  }
  function largarZoom(f) {
    if (!f.zoom) return
    soltar(f.zoom.fotos)
    f.zoom = null
    const i = falantes.indexOf(f)
    if (i >= 0) falantes.splice(i, 1)
  }
  function remover(f) {
    if (todas.get(f.login) === f) todas.delete(f.login)
    f.morto = true
    for (const s of Object.values(f.sets)) soltar(s.fotos)
    f.sets = {}
    largarZoom(f)
    for (let i = falas.length - 1; i >= 0; i--) if (falas[i].f === f) falas.splice(i, 1)
    if (foco?.f === f) foco = null
    contar()
  }
  function contar() {
    let b = 0
    for (const f of todas.values()) {
      for (const s of Object.values(f.sets)) b += bytes(s.fotos)
      b += bytes(f.zoom?.fotos)
    }
    medidas.bytes = b
    medidas.fans = todas.size
  }

  // The rank emblems, shrunk once to the names' 18 px.
  const emblemas = new Map()
  function emblema(src) {
    if (emblemas.has(src)) return emblemas.get(src)
    const e = { img: null }
    emblemas.set(src, e)
    const i = new Image()
    i.onload = () =>
      createImageBitmap(i, { resizeWidth: 18 * dpr, resizeHeight: 18 * dpr, resizeQuality: "high" })
        .then((b) => (e.img = b))
        .catch(() => {})
    i.src = src
    return e
  }

  // --- Baking (fas3d.js's queue asks what's next) -----------------------------------------------------------------
  // What a fan's pictures need: 0 nothing, 1 none yet or an old look, 2 smaller than shown, 3 bigger.
  function falta(f) {
    const s = f.sets[conjunto()]
    if (!s?.fotos || s.feito !== f.versao) return 1
    if (Math.abs(s.px / arranjo.px - 1) < 0.01) return 0
    return s.px < arranjo.px ? 2 : 3
  }
  const pxZoom = () => Math.max(1.3 * arranjo.foco, NITIDO * dpr)
  const precisaZoom = (f) => !f.zoom || f.zoom.conj !== conjunto() || f.zoom.feito !== f.versao || f.zoom.px < pxZoom() * 0.99
  const vale = (f, v, conj) => () => !f.morto && !f.saiu && f.versao === v && (conj === "normal" || varAberto)

  function proximo() {
    const conj = conjunto()
    // Whoever is at the rail, or next in line for it, first: their seat's pictures if they just came (a chatter's first
    // line is also their arrival), then the sharper ones for the rail.
    const naFila = [foco?.f, ...falas.map((x) => x.f)].filter((f) => f && !f.morto && f.saiu == null)
    const chegando = naFila.find((f) => !fotosDe(f) && sentados.includes(f))
    if (chegando) return assento(chegando, conj)
    const quer = naFila.find(precisaZoom)
    if (quer) {
      const f = quer
      const v = f.versao
      const px = pxZoom()
      return {
        look: lookPara(f, conj), poses: ["aceno", "cima"], px, valido: vale(f, v, conj),
        guardar(fotos) {
          largarZoom(f)
          f.zoom = { conj, px, fotos, feito: v }
          falantes.push(f)
          if (falantes.length > FALANTES) largarZoom(falantes[0])
          contar()
        },
      }
    }
    // Whoever has no pictures (or an old look) first, front row first; then pictures shown bigger than baked, then smaller.
    let f = null
    let nota = 4
    for (const q of sentados) {
      const n = falta(q)
      if (n && n < nota) {
        f = q
        nota = n
        if (n === 1) break
      }
    }
    return f ? assento(f, conj) : null
  }
  function assento(f, conj) {
    const v = f.versao
    const px = arranjo.px
    return {
      look: lookPara(f, conj), poses: POSES, px, valido: vale(f, v, conj),
      guardar(fotos) {
        soltar(f.sets[conj]?.fotos)
        f.sets[conj] = { fotos, px, feito: v }
        if (f.chegou == null) f.chegou = performance.now()
        contar()
      },
    }
  }
  fonte(proximo, 0)

  // --- Drawing --------------------------------------------------------------------------------------------------
  function poligono(pts, cor) {
    g.beginPath()
    pts.forEach(([x, y]) => g.lineTo(x, y))
    g.closePath()
    g.fillStyle = cor
    g.fill()
  }
  const cortado = (x, y, w, h, c, cor) => poligono([[x + c, y], [x + w, y], [x + w, y + h - c], [x + w - c, y + h], [x, y + h], [x, y + c]], cor)
  function texto(t, x, y, px, cor, max, peso = 600) {
    g.font = `${peso} ${px}px "Space Grotesk", sans-serif`
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillStyle = cor
    let s = t
    while (max && s.length > 1 && g.measureText(s).width > max) s = `${s.slice(0, -2)}…`
    g.fillText(s, x, y)
  }

  // Every few seconds, 120 ms on the baked "pisca" picture; now and then a quick double blink.
  function piscando(f, agora) {
    if (agora >= f.pisca + 120) {
      f.pisca = agora + (Math.random() < 0.18 ? 150 : 2400 + Math.random() * 4600)
      medidas.piscadas++
    }
    return agora >= f.pisca
  }

  // Their own celebration, `d` ms in: the 2D fan's five (and clapping), with the 3D's arms.
  function festa(m, d, fes, k) {
    if (fes === "acena") {
      m.pose = Math.floor(d / 240) % 4 === 3 ? "cima" : "aceno"
      if (!menos) m.rot = Math.sin(d / 110) * 0.09
    } else if (fes === "palmas") {
      m.pose = Math.floor(d / 170) % 2 ? "palmas" : "cima"
      if (!menos) m.dy = -Math.abs(Math.sin(d / 170)) * 4
    } else if (fes === "bananeira" && d < 2200 && !menos) {
      // A handstand: up with a hop, held upside down, and back; arms up, so the hands reach for the step.
      const t = d / 2200
      m.pose = "cima"
      m.pivo = 2.4
      m.rot = Math.PI * (t < 0.2 ? suave(0, 0.2, t) : t < 0.8 ? 1 : 1 - suave(0.8, 1, t))
      m.dy = -0.35 * k * (t < 0.2 ? Math.sin((Math.PI * t) / 0.2) : t > 0.8 ? Math.sin((Math.PI * (t - 0.8)) / 0.2) : 0)
    } else {
      m.pose = fes === "danca" && Math.floor(d / 420) % 2 ? "aceno" : "cima"
      if (menos) return
      if (fes === "danca") m.rot = Math.sin(d / 200) * 0.17
      else m.dy = -Math.abs(Math.sin(d / 190)) * 13
      if (fes === "gira" && d < 1000) m.rot = suave(0, 1, d / 1000) * Math.PI * 2
    }
  }

  // The whole stand's moment, `x` along it.
  function agitar(m, x, agora, f, k) {
    const t = agora - evento.em
    if (evento.tipo === "ola") {
      const d = evento.x0 == null ? (t - x * 1.9) / 480 : (t - Math.abs(x - evento.x0) * 1.4) / 640
      if (d > 0 && d < 1) {
        m.pose = "cima"
        m.dy = menos ? 0 : -14 * Math.sin(d * Math.PI)
      }
      return
    }
    if (evento.tipo === "deles") {
      const fim = evento.ms
      const d = entre((t - x * 0.25) / 300, 0, 1) * entre((fim - t) / 300, 0, 1)
      if (d > 0.2) {
        m.pose = "triste"
        m.sombra = true
      }
      m.dy = 6 * d
      return
    }
    if (evento.tipo === "defesa") {
      const d = t - x * 0.25
      if (d >= 0 && d < 560) {
        m.pose = "cima"
        m.dy = menos ? 0 : -16 * Math.sin((Math.PI * d) / 560)
      }
      return
    }
    const d = t - x * 0.6
    if (d < 0 || t > evento.ms) return
    festa(m, d, f.base.fes, k)
  }

  // Someone's own move from the chat (or the VAR's verdict).
  function mexer(m, mv, d, f, k) {
    if (mv.tipo === "pula") {
      m.pose = "cima"
      if (!menos) m.dy = -18 * Math.abs(Math.sin((Math.PI * d) / 700))
    } else if (mv.tipo === "danca") {
      m.pose = Math.floor(d / 450) % 2 ? "aceno" : "cima"
      if (menos) return
      m.rot = Math.sin((2 * Math.PI * d) / 900) * 0.17
      m.dy = -5 * Math.abs(Math.sin((2 * Math.PI * d) / 900))
    } else if (mv.tipo === "comemora") festa(m, d, f.base.fes, k)
    else if (mv.tipo === "lamenta") {
      const s = entre(d / 300, 0, 1) * entre((mv.ate - mv.em - d) / 300, 0, 1)
      if (s > 0.2) {
        m.pose = "triste"
        m.sombra = true
      }
      m.dy = 6 * s
    }
  }

  function mover(f, x, agora, k) {
    // sobe: how many px the head rises with the breath (about 1.6 px peak to peak).
    const m = { dx: 0, dy: 0, sobe: menos ? 0 : Math.sin(agora * f.folego + f.fase) * 0.8, rot: 0, pivo: 2, pose: "parado", sombra: false, luz: 1, alpha: 1 }
    if (f.mov && agora >= f.mov.ate) f.mov = null
    if (f.mov) mexer(m, f.mov, agora - f.mov.em, f, k)
    else if (evento) agitar(m, x, agora, f, k)
    if (f.cartao && m.pose === "parado") m.pose = "aceno"
    if (m.pose === "parado" && piscando(f, agora)) m.pose = "pisca"
    if (f.saiu != null) {
      // Leaving: sinks away.
      const t = entre((agora - f.saiu) / 600, 0, 1)
      m.dy += 20 * suave(0, 1, t)
      m.alpha = 1 - t
    } else if (f.chegou != null) {
      const t = agora - f.chegou
      if (!f.animar) m.alpha = entre(t / 250, 0, 1)
      else if (t < 1100) {
        // Arriving: runs in from the right and hops into place.
        const a = entre(t / 660, 0, 1)
        m.dx = (1 - suave(0, 1, a)) * 400
        m.alpha = a
        if (t > 660 && !menos) m.dy -= 10 * Math.sin((Math.PI * (t - 660)) / 440)
      }
    }
    return m
  }

  function bandeirao(pe, topo, sentido, agora) {
    const forca = evento?.tipo === "gol" ? 2.4 : 1
    g.fillStyle = PAPEL
    g.fillRect(pe - 1.5, topo, 3, H - topo)
    const w = 64
    const h = 44
    for (let i = 0; i < 16; i++) {
      const y = (k) => (menos ? 0 : Math.sin((agora / 260) * forca - k * 0.5) * (k / 16) * 5 * forca)
      const xa = pe + sentido * (i / 16) * w
      const xb = pe + sentido * ((i + 1) / 16) * w
      poligono([[xa, topo + 2 + y(i)], [xb, topo + 2 + y(i + 1)], [xb, topo + 2 + h + y(i + 1)], [xa, topo + 2 + h + y(i)]], KLEIN)
    }
    const cx = pe + (sentido * w) / 2
    const cy = topo + 2 + h / 2
    poligono([[cx, cy - 13], [cx + 13, cy], [cx, cy + 13], [cx - 13, cy]], PAPEL)
  }

  // A name cut to fit `max` px once, not every frame (with room for the rank's emblem before it).
  function cortar(f, max) {
    const com = f.emblema ? 22 : 0
    if (f.corte?.max === max && f.corte.nome === f.nome && f.corte.com === com) return f.corte
    let s = f.nome
    while (s.length > 1 && g.measureText(s).width + com > max) s = `${s.slice(0, -2)}…`
    return (f.corte = { max, nome: f.nome, com, s, w: g.measureText(s).width + com })
  }
  function nome(q, y, contorno, aceso) {
    const x0 = q.cx - q.w / 2
    if (aceso) cortado(x0 - 6, y - 12, q.w + 12, 24, 5, PAPEL)
    const e = q.f.emblema?.img
    if (e) g.drawImage(e, x0, y - 9.5, 18, 18)
    const tx = x0 + (q.f.emblema ? 22 : 0)
    if (contorno && !aceso) g.strokeText(q.s, tx, y)
    g.fillStyle = aceso ? KLEIN : q.f.canal ? CLARO : PAPEL
    g.fillText(q.s, tx, y)
  }

  // A row's names at 18 px on its riser. A long login may borrow its neighbours' room (up to 3 seats); names that
  // would touch take turns of 3.2 s, and a name that fits beside a turn stays up through it. Whoever is moving has
  // theirs lit and always up.
  function nomes(lugares, L, D, y, passoX, f, agora) {
    g.font = NOME
    g.textAlign = "left"
    g.textBaseline = "middle"
    const max = Math.min(230, 3 * passoX - 14)
    const fim = []
    const todos = lugares.map(([p, x]) => {
      const c = cortar(p, max)
      const cx = entre(x, L + 8 + c.w / 2, D - 8 - c.w / 2)
      let n = fim.findIndex((e) => e + 14 <= cx - c.w / 2)
      if (n < 0) n = fim.push(0) - 1
      fim[n] = cx + c.w / 2
      return { f: p, s: c.s, w: c.w, cx, n, a: cx - c.w / 2, b: cx + c.w / 2 }
    })
    const K = fim.length
    const visiveis = (n) => {
      const v = todos.filter((q) => q.n === n)
      for (const q of todos) if (q.n !== n && v.every((o) => q.b + 14 <= o.a || o.b + 14 <= q.a)) v.push(q)
      return v
    }
    const t = agora / 3200 + f * 0.37
    const n = Math.floor(t) % K
    const r = t % 1
    const antes = K > 1 ? visiveis((n + K - 1) % K) : null
    const depois = K > 1 ? visiveis((n + 1) % K) : null
    // Rows behind get a navy outline: front-row hats and antennae poke into their riser.
    if (f) {
      g.strokeStyle = NAVY
      g.lineWidth = 4
      g.lineJoin = "round"
    }
    const acesos = []
    for (const q of K > 1 ? visiveis(n) : todos) {
      if (q.f.mov && agora < q.f.mov.ate && q.f.mov.tipo !== "lamenta") continue
      // Only names that come or go fade; the ones staying don't blink.
      g.globalAlpha = K > 1 ? Math.min(antes.includes(q) ? 1 : entre(r / 0.07, 0, 1), depois.includes(q) ? 1 : entre((1 - r) / 0.07, 0, 1)) : 1
      nome(q, y, !!f, false)
    }
    g.globalAlpha = 1
    for (const q of todos) if (q.f.mov && agora < q.f.mov.ate && q.f.mov.tipo !== "lamenta") acesos.push(q)
    for (const q of acesos) nome(q, y, false, true)
  }

  // The VAR's card in a raised hand: referee yellow, the option's number.
  function desenharCartao(f, x, pe, k, m) {
    const alto = m.pose === "aceno" || m.pose === "cima"
    const w = Math.max(22, 0.95 * k)
    const h = w * 1.25
    const cx = x + 1.45 * k
    const cy = pe + m.dy - 2.93 * k - (alto ? 0.25 * k + h * 0.45 : -1.85 * k + h * 0.2)
    g.save()
    g.globalAlpha = m.alpha
    g.translate(cx, cy)
    g.rotate(0.17)
    cortado(-w / 2 + 2, -h / 2 + 2, w, h, 4, NAVY)
    cortado(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, 5, NAVY)
    cortado(-w / 2, -h / 2, w, h, 4, AMARELO)
    g.font = FORTE
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillStyle = "#2b2f38"
    g.fillText(String(f.cartao), 0, 1)
    g.restore()
  }

  function fotosDe(f) {
    const s = f.sets[conjunto()]
    if (s?.fotos) return s.fotos
    return f.sets.normal?.fotos ?? f.sets.arbitro?.fotos ?? null
  }

  function desenharFoto(foto, x, pe, k, m) {
    const w = FOTO.inteiro.w * k
    const h = FOTO.inteiro.h * k
    const ex = w / foto.W
    const ey = h / foto.H
    g.save()
    if (m.alpha < 1) g.globalAlpha = Math.max(0, m.alpha)
    if (m.sombra) g.filter = "brightness(.65)"
    else if (m.luz < 0.99) g.filter = `brightness(${m.luz.toFixed(2)})`
    // At the size it was baked for and not turning: on whole screen pixels, one per picture pixel. The breath moves
    // the fan by whole pixels instead of stretching it (the bust's base is behind the riser).
    if (!m.rot && Math.max(Math.abs(ex * dpr - 1), Math.abs(ey * dpr - 1)) < 0.03) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(foto.img, Math.round((x - w / 2 + foto.x * ex) * dpr), Math.round((pe + m.dy - h + 0.06 * k + foto.y * ey - m.sobe) * dpr))
    } else {
      // The breath stretches the picture from the bust's base, so the head rises `sobe` px; turns go round `pivo`
      // units over the feet (the neck, or the middle for a handstand).
      const s = 1 + m.sobe / (4.6 * k)
      const piv = m.pivo * k
      g.translate(x, pe + m.dy - piv)
      g.rotate(m.rot)
      g.drawImage(foto.img, -w / 2 + foto.x * ex, piv - (h - 0.06 * k) * s + foto.y * ey * s, foto.img.width * ex, foto.img.height * ey * s)
    }
    g.restore()
  }

  function nova(agora) {
    const { R, frente, passoX, faixas, banda, k, K, baixos, topo } = arranjo
    bandeirao(26, topo, 1, agora)
    bandeirao(W - 26, topo, -1, agora)

    // Whoever is at the rail: 0 → 1 as they come forward, back to 0 as they return (no travel with reduced motion).
    const fala = !foco ? 0 : menos ? Number(agora < foco.ate) : Math.min(suave(0, 320, agora - foco.em), suave(0, 360, foco.ate - agora))
    if (foco) foco.de = null
    const rotulos = []
    const filas = Array.from({ length: R }, () => [])
    for (const f of todas.values()) if (f.alvo && f.alvo.f < R) filas[f.alvo.f].push(f)

    for (let r = R - 1; r >= 0; r--) {
      const faixa = faixas[r]
      const baixo = baixos[r]
      const cima = baixo - faixa
      const passo = faixa + banda
      const recuo = 18 + r * 14
      const L = recuo
      const D = W - recuo
      const costas = cima - passo * 0.42
      poligono([[L + 14, costas], [D - 14, costas], [D, costas + 14], [D, cima], [L, cima], [L, costas + 14]], r % 2 ? "#001c63" : "#002472")
      const desloca = R > 1 ? (r % 2 ? passoX / 4 : -passoX / 4) : 0
      const meio = W / 2 + desloca
      for (let c = 0; c < arranjo.porFila; c++) {
        const x = meio + (c - (arranjo.porFila - 1) / 2) * passoX
        const w = passoX * 0.8
        const h = passo * 0.32
        cortado(x - w / 2, cima - h, w, h, 6, (c + r) % 4 === 0 ? CLARO : KLEIN)
        g.fillStyle = "rgba(0,20,71,.45)"
        g.fillRect(x - w / 2 + 4, cima - h + 5, w - 8, 2)
      }

      const lugares = []
      for (const f of filas[r].sort((a, b) => a.x - b.x)) {
        const fotos = fotosDe(f)
        if (!fotos) continue
        caixas.push({ x: f.x, y: f.pe - 2.1 * k })
        if (foco?.f === f) {
          foco.de = { x: f.x, pe: f.pe, k, f: r }
          continue
        }
        const m = mover(f, f.x, agora, k)
        // The talker's neighbours step back a little: the nearer, the darker (only near ones, filters cost).
        if (fala && foco) m.luz = 1 - fala * 0.42 * entre(1 - Math.hypot((f.x - foco.x) / passoX, (r - foco.r) * 1.4) / 3.5, 0, 1)
        desenharFoto(fotos[m.pose] ?? fotos.parado, f.x + m.dx, f.pe, k, m)
        if (f.cartao) desenharCartao(f, f.x + m.dx, f.pe, k, m)
        if (f.saiu == null && (f.chegou == null || agora - f.chegou > (f.animar ? 600 : 0))) lugares.push([f, f.x])
      }

      poligono([[L, cima], [D, cima], [D, baixo - 5], [D - 5, baixo], [L + 5, baixo], [L, baixo - 5]], NAVY)
      g.fillStyle = CLARO
      g.fillRect(L, cima, D - L, 2)
      if (faixa >= 24 && lugares.length) rotulos.push([lugares, L, D, cima + faixa / 2 + 1.5, passoX, r, agora])
    }
    // Names after every row, so nothing in front covers them.
    for (const r of rotulos) nomes(...r)

    // Whoever is at the rail leans on it, drawn before it so the rail cuts the bust.
    if (foco && agora < foco.ate && foco.de) {
      const de = foco.de
      const fotos = fotosDe(foco.f)
      const zoom = foco.f.zoom?.conj === conjunto() ? foco.f.zoom.fotos : null
      const pose = foco.tipo === "fala" ? "aceno" : "cima"
      const base = H - 2
      const alvo = entre(de.x, 2.3 * K, W - 2.3 * K)
      const kk = de.k + (K - de.k) * fala
      const x = de.x + (alvo - de.x) * fala
      const pe = de.pe + (base - de.pe) * fala
      const ri = agora - foco.em
      const m = { dx: 0, dy: 0, sobe: menos ? 0 : Math.sin(agora * foco.f.folego + foco.f.fase) * 1.2, rot: menos ? 0 : Math.sin(ri / 160) * 0.05 * fala, pivo: 2, luz: 1, alpha: 1 }
      if (foco.tipo === "dedica" && !menos) m.dy = -Math.abs(Math.sin(ri / 190)) * 8 * fala
      let pose2 = pose
      const mv = foco.f.mov && agora < foco.f.mov.ate ? foco.f.mov : null
      if (mv) {
        // Their own move goes on at the rail (the channel's tip: it says the command and does it).
        const mm = { dx: 0, dy: 0, rot: 0, pivo: 2, pose }
        mexer(mm, mv, agora - mv.em, foco.f, kk)
        pose2 = mm.pose
        m.dy += mm.dy
        m.rot += mm.rot
        m.pivo = mm.pivo
      }
      const foto = zoom?.[pose2] ?? fotos?.[pose2] ?? (pose2 === pose ? null : zoom?.[pose]) ?? fotos?.[pose] ?? fotos?.parado
      if (foto) desenharFoto(foto, x, pe, kk, m)
      if (foco.f.cartao) desenharCartao(foco.f, x, pe, kk, { ...m, pose })
      foco.rosto = { x, y: pe - 3.3 * kk, r: 1.15 * kk, topo: H - altura + 6 }
    }

    // The front: rail, the fans' cloth and the drum.
    const y = H - frente
    poligono([[0, H], [frente, y], [W - frente, y], [W, H]], KLEIN)
    g.save()
    g.clip()
    g.strokeStyle = "rgba(133,167,255,.22)"
    g.lineWidth = 1
    for (let x = -40; x < W + 40; x += 24) {
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + frente, H)
      g.moveTo(x, y)
      g.lineTo(x - frente, H)
      g.stroke()
    }
    g.restore()
    // The VAR's referee yellow on the rail while it's open.
    g.fillStyle = varAberto ? AMARELO : PAPEL
    g.fillRect(frente, y, W - 2 * frente, 2)
    g.fillStyle = PAPEL
    for (let x = 56; x < W - 20; x += 94) g.fillRect(x, y, 3, frente)
    const palavra = evento?.placa && agora - evento.em < evento.ms ? evento.placa : sentados.length ? MARCA : CONVITE
    g.font = FORTE
    const larg = Math.max(320, Math.ceil(g.measureText(palavra).width) + 40)
    cortado(W / 2 - larg / 2, y + 1, larg, frente - 1, 8, PAPEL)
    texto(palavra, W / 2, y + frente / 2 + 1, 18, KLEIN, larg - 16, 700)

    const bate = evento?.tipo === "gol" && Math.floor(agora / 130) % 2
    const bx = W / 2 - larg / 2 - 70
    g.fillStyle = NAVY
    g.beginPath()
    g.ellipse(bx, y + 14, 24, 12, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = PAPEL
    g.beginPath()
    g.ellipse(bx, y + 12, 20, 9, 0, 0, Math.PI * 2)
    g.fill()
    poligono([[bx, y + 6], [bx + 6, y + 12], [bx, y + 18], [bx - 6, y + 12]], KLEIN)
    g.strokeStyle = CLARO
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(bx + 34, y + (bate ? 8 : 3))
    g.lineTo(bx + 10, y + (bate ? 12 : 3))
    g.stroke()

    if (foco && agora < foco.ate && foco.de) {
      if (foco.rosto && foco.tipo === "fala") balao(foco, fala)
    } else if (foco && (agora >= foco.ate || !foco.de)) foco = null
    if (!foco && falas.length) proximaFala(agora)
  }

  // The chat line beside the talker's face: paper, navy edge, 45° cuts, name in Klein over the message, 18 px.
  function balao(fc, e) {
    // Laid out once per message: at most two lines of 300 px, the rest cut with "…".
    if (!fc.linhas) {
      const caber = (t) => {
        while (t.length > 1 && g.measureText(t).width > 300) t = `${t.slice(0, -2)}…`
        return t
      }
      g.font = NOME
      const linhas = [""]
      for (const w of fc.fala.split(" ")) {
        const s = linhas.at(-1) ? `${linhas.at(-1)} ${w}` : w
        if (!linhas.at(-1) || g.measureText(s).width <= 300) linhas[linhas.length - 1] = s
        else if (linhas.length < 2) linhas.push(w)
        else {
          linhas[1] += "…"
          break
        }
      }
      fc.linhas = linhas.map(caber)
      let w = Math.max(...fc.linhas.map((l) => g.measureText(l).width))
      g.font = FORTE
      fc.nome = caber(fc.f.nome)
      w = Math.max(w, g.measureText(fc.nome).width)
      fc.w = Math.ceil(w) + 28
      fc.h = 16 + 22 * (fc.linhas.length + 1)
    }
    const { x, y, r, topo } = fc.rosto
    // To the side with more room, so the face stays clear.
    const lado = x < W / 2 ? 1 : -1
    const w = fc.w
    const h = fc.h
    const bx = entre(lado > 0 ? x + r + 18 : x - r - 18 - w, 8, W - 8 - w)
    const by = entre(y - h / 2 - 8, topo, H - 30 - h)
    g.globalAlpha = e
    const sobe = (1 - e) * 10
    const ponta = lado > 0 ? bx : bx + w
    const py = entre(y + 4, by + 14, by + h - 6)
    // Tail first in navy, then the edge, then paper: one outline all round.
    poligono([[ponta, py - 13 + sobe], [ponta - lado * 16, py + 5 + sobe], [ponta, py + 3 + sobe]], NAVY)
    cortado(bx - 2, by - 2 + sobe, w + 4, h + 4, 12, NAVY)
    cortado(bx, by + sobe, w, h, 11, PAPEL)
    poligono([[ponta + lado * 1, py - 10 + sobe], [ponta - lado * 11, py + 2 + sobe], [ponta + lado * 1, py + 1 + sobe]], PAPEL)
    g.textAlign = "left"
    g.textBaseline = "middle"
    g.font = FORTE
    g.fillStyle = KLEIN
    g.fillText(fc.nome, bx + 14, by + 19 + sobe)
    g.font = NOME
    g.fillStyle = NAVY
    fc.linhas.forEach((l, i) => g.fillText(l, bx + 14, by + 41 + 22 * i + sobe))
    g.globalAlpha = 1
  }

  // Confetti (little lattice diamonds in the mark's colours), and on a goal sparkles over the heads.
  let confeteEm = -1e9
  function soltarConfete() {
    confeteEm = performance.now()
    papeis.length = 0
    for (let i = 0; i < 130; i++)
      papeis.push({ x: Math.random() * W, vx: (Math.random() - 0.5) * 90, vy: 150 + Math.random() * 190, espera: Math.random() * 900, giro: 2 + Math.random() * 6, cor: [KLEIN, CLARO, PAPEL][i % 3] })
  }
  function confete(agora) {
    if (menos) return
    const t = agora - confeteEm
    if (t < 4600)
      for (const p of papeis) {
        const d = t - p.espera
        if (d < 0 || d > 3600) continue
        const s = d / 1000
        g.save()
        g.translate(p.x + p.vx * s, H - 60 - p.vy * s + 80 * s * s)
        g.rotate(s * p.giro)
        poligono([[0, -5], [4, 0], [0, 5], [-4, 0]], p.cor)
        g.restore()
      }
    if (evento?.tipo !== "gol") return
    const te = agora - evento.em
    caixas.forEach((c, i) => {
      if (Math.floor(te / 70 + i * 3.1) % 23 !== 0 || te > Math.min(4400, evento.ms)) return
      poligono([[c.x, c.y - 13], [c.x + 3, c.y - 3], [c.x + 13, c.y], [c.x + 3, c.y + 3], [c.x, c.y + 13], [c.x - 3, c.y + 3], [c.x - 13, c.y], [c.x - 3, c.y - 3]], "rgba(255,255,255,.85)")
    })
  }

  function quadro(agora) {
    const t0 = performance.now()
    const dt = Math.min(100, agora - ultimo)
    ultimo = agora
    if (evento && agora - evento.em > evento.ms + 600) evento = null
    // Toward each one's place (a seat changes when someone arrives, leaves or passes them in Σ).
    const a = 1 - Math.exp(-dt / 170)
    for (const f of todas.values()) {
      if (!f.alvo || f.saiu != null) continue
      f.x += (f.alvo.x - f.x) * a
      f.pe += (f.alvo.pe - f.pe) * a
      if (Math.abs(f.alvo.x - f.x) < 0.05) f.x = f.alvo.x
      if (Math.abs(f.alvo.pe - f.pe) < 0.05) f.pe = f.alvo.pe
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, W, H)
    caixas = []
    nova(agora)
    confete(agora)
    const d = performance.now() - t0
    medidas.desenho += (d - medidas.desenho) * 0.05
    medidas.desenhoMax = Math.max(medidas.desenhoMax, d)
  }
  const laco = (t) => {
    try {
      quadro(t)
    } catch (e) {
      console.error(e)
    }
    requestAnimationFrame(laco)
  }
  requestAnimationFrame(laco)

  // --- The chat at the rail -----------------------------------------------------------------------------------------
  // The next line whose fan has pictures (one waits up to 6 s for theirs: they may have just come in).
  function proximaFala(agora) {
    for (let i = 0; i < falas.length; i++) {
      const { f, fala, tipo, ms, em } = falas[i]
      if (f.morto || f.saiu != null || agora - em > 6000) {
        falas.splice(i--, 1)
        continue
      }
      if (!fotosDe(f)) continue
      falas.splice(i, 1)
      foco = { f, x: f.x, r: f.alvo?.f ?? 0, fala, tipo, em: agora, ate: agora + ms }
      return
    }
  }
  function aRail(f, fala, tipo, ms) {
    if (!f || f.morto || f.saiu != null) return
    const agora = performance.now()
    for (let i = falas.length - 1; i >= 0; i--) if (falas[i].f === f && falas[i].tipo === tipo) falas.splice(i, 1)
    if (tipo === "dedica") falas.unshift({ f, fala, tipo, ms, em: agora })
    else falas.push({ f, fala, tipo, ms, em: agora })
    while (falas.length > FALAS) falas.splice(falas.findIndex((x) => x.tipo === "fala"), 1)
    if (!foco) return proximaFala(agora)
    // Someone's waiting: whoever talks now makes room after a couple of seconds (a dedication goes first).
    const fim = tipo === "dedica" ? agora + 360 : Math.max(agora + 360, foco.em + FALA_MIN_MS)
    if (foco.tipo === "fala" && foco.ate > fim) foco.ate = fim
    acordar()
  }

  return {
    capacidade: CAPACIDADE,
    medidas,
    dispor(lista, { animar = true } = {}) {
      const agora = performance.now()
      const aqui = new Set()
      sentados = []
      for (const d of lista.slice(0, CAPACIDADE)) {
        let f = todas.get(d.login)
        if (f?.saiu != null) {
          remover(f)
          f = null
        }
        if (!f) {
          f = criar(d, animar)
          todas.set(d.login, f)
        }
        vestirFa(f, d)
        aqui.add(d.login)
        sentados.push(f)
      }
      // Past the last seat, or gone: no place (whoever is leaving finishes sinking first).
      for (const f of [...todas.values()]) if (!aqui.has(f.login) && (f.saiu == null || agora - f.saiu > 600)) remover(f)
      rearrumar()
      contar()
      acordar()
    },
    sair(login) {
      const f = todas.get(login)
      if (!f || f.saiu != null) return
      f.saiu = performance.now()
      sentados = sentados.filter((q) => q !== f)
      if (foco?.f === f) foco.ate = Math.min(foco.ate, performance.now() + 360)
      setTimeout(() => f.saiu != null && remover(f), 650)
    },
    evento(tipo, { placa = null, ms = tipo === "gol" ? 5000 : tipo === "deles" ? 3400 : tipo === "defesa" ? 800 : 3200, confete = tipo === "gol", de = null } = {}) {
      const agora = performance.now()
      const origem = de ? todas.get(de) : null
      evento = { tipo, em: agora, ms, placa, x0: origem ? origem.x : null }
      if (tipo === "gol" || tipo === "deles") {
        for (const f of todas.values()) if (f.mov?.tipo !== "lamenta") f.mov = null
        if (foco?.tipo === "fala") foco.ate = Math.min(foco.ate, agora + 360)
      }
      if (tipo === "gol" && confete) soltarConfete()
    },
    confete: soltarConfete,
    mover(login, tipo) {
      const f = todas.get(login)
      if (!f || f.saiu != null) return
      const agora = performance.now()
      const ms = tipo === "comemora" ? FESTA_MS[f.base.fes] ?? 2400 : DURA[tipo] ?? 2400
      f.mov = { tipo, em: agora, ate: agora + ms }
    },
    falar(login, texto) {
      const t = Array.from(String(texto).replace(/\s+/g, " ").trim())
      if (!t.length) return
      aRail(todas.get(login), t.slice(0, 120).join(""), "fala", FALA_MS)
    },
    dedicar(login, ms = 5600) {
      aRail(todas.get(login), "", "dedica", ms)
    },
    cartao(login, n) {
      const f = todas.get(login)
      if (f) f.cartao = n || 0
    },
    arbitro(aberto) {
      if (aberto === varAberto) return
      varAberto = aberto
      // Closed: the usual pictures are all still there, so the kit comes off at once and its pictures go.
      if (!aberto)
        for (const f of todas.values()) {
          soltar(f.sets.arbitro?.fotos)
          delete f.sets.arbitro
          if (f.zoom?.conj === "arbitro") largarZoom(f)
          f.cartao = 0
        }
      contar()
      acordar()
    },
    natal(sim) {
      if (!!sim === comTouca) return
      comTouca = !!sim
      for (const f of todas.values()) f.versao++
      acordar()
    },
    altura(px) {
      if (px === altura) return
      altura = px
      medir()
      rearrumar()
      for (const f of todas.values()) if (f.alvo) Object.assign(f, { x: f.alvo.x, pe: f.alvo.pe })
      acordar()
    },
    /** While a goal's party or mourning is on: the chat's moves wait. */
    ocupada: () => !!evento && (evento.tipo === "gol" || evento.tipo === "deles") && performance.now() - evento.em < evento.ms,
    /** Where someone's head is, in the canvas' pixels (for what rises from them: stickers). */
    onde(login) {
      const f = todas.get(login)
      if (!f?.alvo || !fotosDe(f)) return null
      return { x: f.x, y: f.pe - 4.3 * arranjo.k }
    },
    /** Someone's pictures on the stand now ({ pose: { img, x, y, W, H } }), or null: draw from them at once, never keep them (a new size closes them). */
    fotos(login) {
      const f = todas.get(login)
      return f ? fotosDe(f) : null
    },
    /** Who has pictures on the stand now (seated, not leaving). */
    visiveis: () => sentados.filter((f) => fotosDe(f)).map((f) => f.login),
    /** Fans still waiting for pictures, the one under way included. */
    esperando() {
      let n = 0
      for (const f of sentados) if (falta(f)) n++
      if (foco && precisaZoom(foco.f)) n++
      return n
    },
  }
}
