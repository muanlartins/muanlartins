// Celeste's numbers on the game scene (jogo.html), from the game itself: the MuanlartinsLink mod in Luan's Celeste
// (scripts/celeste-mod/) serves server-sent events on 127.0.0.1:8797, and its `estado` says where he is (menus, a
// chapter and its side), his deaths, strawberries, hearts and cassettes in the chapter and in the file, and both
// clocks. In the same places and look as the other games' (stream.css): the plate on the camera frame's top edge,
// flush right, as Rocket League's and Valorant's record (the chapter's name and side, its number, and the chapter's
// clock ticking), and a column beside the frame as Rocket League's match numbers (numeros.js): this chapter's deaths,
// strawberries, heart and cassette, then the file's deaths, strawberries, hearts and cassettes and its clock. Both show
// only while the game is connected; the clocks tick between states while the game says they run.
//
//   celesteNoJogo({ plate, column, hole, band, address, demo })
//     plate, column   the two elements      hole, band   the camera frame and its band, as jogo.html's; without a
//                                                         hole the page places both (celeste.html)
//     address         the mod's /eventos    demo         plays public/stream/celeste-sequencia.json (the stand-in's)
//                                                         without a server, over and over; a step's name (a string)
//                                                         plays up to it at once and stays there (screenshots)

const CELESTE_URL = "http://127.0.0.1:8797/eventos"
// Shapes of our own: the dock's snowy mountain, a heart and a cassette tape.
const CELESTE_ICONES = {
  montanha:
    '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M13 7l2.75 5-1.45-.8-1.3 1.4-1.4-1.4-1.35.8Z"/><path d="M9.54 13.3l2.06-.8 1.4 1.4 1.3-1.4 2.17.8L24 27H2Z"/><path d="M21.5 12.5l1.82 3.1-1-.5-.82.9-.9-.9-.92.5Z"/><path d="M19.87 16.8l.73-.5.9.9.8-.9 1.7.5L30 27H16Z"/></svg>',
  coracao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 4.2 12.9a4.6 4.6 0 0 1 6.5-6.5L12 7.7l1.3-1.3a4.6 4.6 0 0 1 6.5 6.5Z"/></svg>',
  fita: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h18v11H3Z"/><circle cx="8.5" cy="11.5" r="2" class="furo"/><circle cx="15.5" cy="11.5" r="2" class="furo"/><path d="M7 17.5l1.4-2.6h7.2l1.4 2.6" class="furo"/></svg>',
}

function celesteNoJogo({ plate, column, hole, band, address = CELESTE_URL, demo = false }) {
  const fmt = (n) => (n == null ? "–" : Number(n).toLocaleString("pt-BR"))
  const dois = (n) => String(n).padStart(2, "0")
  // The chapter's clock as the game's timer reads, minutes up (hours past one), hundredths smaller.
  const tempoCapitulo = (ms) => {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const base = h ? `${h}:${dois(Math.floor(s / 60) % 60)}:${dois(s % 60)}` : `${Math.floor(s / 60)}:${dois(s % 60)}`
    return `${base}<small>.${dois(Math.floor(ms / 10) % 100)}</small>`
  }
  const tempoArquivo = (ms) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 3600)}:${dois(Math.floor(s / 60) % 60)}:${dois(s % 60)}`
  }

  plate.classList.add("plate", "turned", "celeste-placa")
  plate.hidden = true
  plate.innerHTML = `<span class="icone">${CELESTE_ICONES.montanha}</span><span class="rank"></span><span class="line"></span>`
  const [, rank, line] = plate.children

  column.classList.add("numeros", "celeste-numeros")
  const linha = (k, nome) => `<div class="linha" data-k="${k}"><span class="rotulo">${nome}</span><span class="valor"></span></div>`
  column.innerHTML =
    `<div class="grupo capitulo"><p class="titulo">Neste capítulo</p>${linha("mortes", "Mortes")}${linha("morangos", "Morangos")}` +
    `<div class="linha coletas"><span class="rotulo">Coração e fita</span><span class="valor"><span class="item coracao">${CELESTE_ICONES.coracao}</span><span class="item fita">${CELESTE_ICONES.fita}</span></span></div></div>` +
    `<div class="grupo arquivo"><p class="titulo">No arquivo</p>${linha("mortesArquivo", "Mortes")}${linha("morangosArquivo", "Morangos")}` +
    `<div class="linha coletas-arquivo"><span class="valor"><span class="item tem">${CELESTE_ICONES.coracao}</span><span class="conta coracoes"></span></span>` +
    `<span class="valor"><span class="item tem">${CELESTE_ICONES.fita}</span><span class="conta fitas"></span></span></div>${linha("tempoArquivo", "Tempo")}</div>`
  const L = Object.fromEntries([...column.querySelectorAll(".linha[data-k]")].map((l) => [l.dataset.k, l.querySelector(".valor")]))
  const coletas = column.querySelector(".coletas")
  // A lit line lets go of its class once lit: the chapter's group hides in the menus, and a hidden element's animation
  // plays again when it shows.
  column.addEventListener("animationend", (e) => e.target.closest?.(".linha")?.classList.remove("subiu"))

  const lugar = () => {
    if (!hole) return
    plate.style.left = `${hole.offsetLeft + hole.offsetWidth + band - plate.offsetWidth}px`
    plate.style.top = `${hole.offsetTop - band - 26}px`
    const direita = hole.classList.contains("right")
    // As tall as the frame and level with it; in the menus (the file's numbers alone) as tall as they are, at its foot.
    const menu = column.classList.contains("no-menu")
    column.style.height = menu ? "auto" : `${hole.offsetHeight + 2 * band}px`
    column.style.top = menu ? `${hole.offsetTop + hole.offsetHeight + band - column.offsetHeight}px` : `${hole.offsetTop - band}px`
    column.style.left = direita ? `${hole.offsetLeft - band - 16 - column.offsetWidth}px` : `${hole.offsetLeft + hole.offsetWidth + band + 16}px`
  }

  let estado = null
  let ligado = false
  let antes = {}
  // The clocks as the last state had them, and when it came.
  const relogio = { capitulo: null, arquivo: null, em: 0, correndo: false }
  // A number that went up lights its line, as the match numbers do (numeros.js).
  const acender = (k, v) => {
    const el = L[k]?.parentElement
    if (el && antes[k] != null && v != null && v > antes[k]) {
      el.classList.remove("subiu")
      void el.offsetWidth
      el.dataset.mais = `+${v - antes[k]}`
      el.classList.add("subiu")
    }
    antes[k] = v
  }

  function desenhar() {
    const e = estado
    const visivel = ligado && !!e
    plate.hidden = !visivel
    column.classList.toggle("visivel", visivel)
    if (!visivel) return
    const c = e.onde === "nivel" || e.onde === "fim" ? e.capitulo : null
    column.classList.toggle("no-menu", !c)
    if (c) {
      const lado = c.lado && c.lado !== "A" ? ` <small>lado ${c.lado}</small>` : ""
      const num = c.numero > 0 ? `Capítulo ${c.numero}` : c.interludio ? "Interlúdio" : ""
      const onde = e.onde === "fim" ? "Completo" : num
      rank.innerHTML = `${c.nome}${lado}<span class="points">${[onde, c.colecao && c.colecao !== "Celeste" ? c.colecao : null].filter(Boolean).join(" · ") || "Celeste"}</span>`
    } else {
      rank.innerHTML = `Celeste<span class="points">${e.onde === "carregando" ? "Carregando" : "No menu"}</span>`
    }
    const m = e.mortes || {}, mo = e.morangos || {}, co = e.coracoes || {}, fi = e.fitas || {}
    L.mortes.textContent = fmt(m.capitulo)
    L.morangos.innerHTML = mo.total ? `${fmt(mo.capitulo)}<span class="accent">/</span>${fmt(mo.total)}` : fmt(mo.capitulo ?? mo.sessao)
    coletas.querySelector(".coracao").classList.toggle("tem", !!co.capitulo)
    coletas.querySelector(".fita").classList.toggle("tem", !!fi.capitulo)
    L.mortesArquivo.textContent = fmt(m.arquivo)
    L.morangosArquivo.textContent = fmt(mo.arquivo)
    column.querySelector(".conta.coracoes").textContent = fmt(co.arquivo)
    column.querySelector(".conta.fitas").textContent = fmt(fi.arquivo)
    if (c) {
      acender("mortes", m.capitulo)
      acender("morangos", mo.capitulo)
    }
    acender("mortesArquivo", m.arquivo)
    acender("morangosArquivo", mo.arquivo)
    mostrado.capitulo = mostrado.arquivo = null
    tick()
    lugar()
  }

  // The clocks between states, every frame while they run (only the text that changed is written).
  const mostrado = { capitulo: null, arquivo: null }
  function tick() {
    if (!estado) return
    const dt = relogio.correndo ? performance.now() - relogio.em : 0
    const temCap = (estado.onde === "nivel" || estado.onde === "fim") && relogio.capitulo != null
    const cap = temCap ? tempoCapitulo(relogio.capitulo + dt) : relogio.arquivo != null ? tempoArquivo(relogio.arquivo + dt) : ""
    if (cap !== mostrado.capitulo) {
      line.innerHTML = cap
      line.hidden = !cap
      const largura = plate.offsetWidth
      mostrado.capitulo = cap
      if (plate.offsetWidth !== largura) lugar()
    }
    const arq = relogio.arquivo != null ? tempoArquivo(relogio.arquivo + dt) : "–"
    if (arq !== mostrado.arquivo) L.tempoArquivo.textContent = mostrado.arquivo = arq
  }
  const quadro = () => {
    tick()
    requestAnimationFrame(quadro)
  }
  requestAnimationFrame(quadro)

  function ouvir(msg) {
    if (msg.tipo === "capitulo_inicio" || msg.tipo === "saiu") antes = {}
    if (msg.tipo !== "estado") return
    estado = msg
    const t = msg.tempo || {}
    Object.assign(relogio, { capitulo: t.capitulo ?? null, arquivo: t.arquivo ?? null, em: performance.now(), correndo: !!t.correndo })
    desenhar()
  }

  if (demo) return celesteDemo(ouvir, (sim) => ((ligado = sim), desenhar()), typeof demo === "string" ? demo : null)
  const abrir = () => {
    const es = new EventSource(address)
    es.onopen = () => ((ligado = true), desenhar())
    es.onerror = () => {
      ligado = es.readyState === 1
      desenhar()
      // Closed for good (not a reconnect): open it again in a while.
      if (es.readyState === 2) setTimeout(abrir, 5000)
    }
    es.onmessage = ({ data }) => {
      try {
        ligado = true
        ouvir(JSON.parse(data))
      } catch {}
    }
  }
  abrir()
}

/**
 * ?demo: the stand-in's sequence (celeste-sequencia.json, what scripts/celeste-mod/simular.py serves), played here
 * as the mod would send it, with the clocks running, over and over.
 */
async function celesteDemo(ouvir, conectado, ate = null) {
  const seq = await (await fetch("celeste-sequencia.json")).json()
  const copia = (v) => JSON.parse(JSON.stringify(v))
  const juntar = (a, b, topo = true) => {
    for (const [k, v] of Object.entries(b)) {
      if (v === null) {
        if (topo) a[k] = null
        else delete a[k]
      }
      else if (typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object") juntar(a[k], v, false)
      else a[k] = copia(v)
    }
  }
  let estado = copia(seq.inicio)
  let desde = performance.now()
  const agora = () => {
    const e = copia(estado)
    if (e.tempo?.correndo) for (const k of ["capitulo", "arquivo"]) if (e.tempo[k] != null) e.tempo[k] += Math.round(performance.now() - desde)
    return e
  }
  conectado(true)
  ouvir(agora())
  let i = 0
  const aplicar = (p) => {
    for (const ev of p.eventos || []) ouvir(ev)
    estado = agora()
    desde = performance.now()
    juntar(estado, p.estado || {})
    ouvir(agora())
  }
  // Up to a step at once (?demo=<step>), then stay there with the clocks running.
  const fim = ate ? seq.passos.findIndex((p) => p.nome === ate) : -1
  if (fim >= 0) return seq.passos.slice(0, fim + 1).forEach(aplicar)
  const passo = () => {
    const p = seq.passos[i]
    aplicar(p)
    i = (i + 1) % seq.passos.length
    setTimeout(passo, (p.espera ?? 1) * 1000)
  }
  setTimeout(passo, 600)
}
