// A fan in the crowd: what can be chosen, the look everyone gets by default, and the drawing. Shared by
// the crowd overlay (torcida.html) and the profile page on the site, where viewers choose their own; the
// profile API (infra/site.yml) only stores what they chose, so anything it doesn't know falls back here.
// Plain script, no build: it sets window.Torcedor.

;(() => {
  // Colours that read on any arena and sit with the channel's Klein; no darks, which vanish in the game.
  const CORES = [
    "#f4f5f7", "#85a7ff", "#4dd4ff", "#3ddc97", "#b5e853", "#ffd23f",
    "#ff9f43", "#ff6b57", "#ff5c9a", "#c792ea", "#c08b5c", "#9aa3b5",
  ]
  const CABECAS = ["losango", "redonda", "quadrada", "hexagono", "triangulo"]
  const ROUPAS = ["lisa", "listra", "faixa", "meio", "numero", "gola", "listras", "listrado", "tricolor", "faixa-dupla"]
  // Patterns that use the third colour too.
  const TRES_CORES = ["tricolor", "faixa-dupla"]
  const ACESSORIOS = ["nenhum", "bone", "cachecol", "bandeira", "coroa", "oculos", "fone", "cartola"]
  const COMEMORACOES = ["pula", "danca", "gira", "acena", "bananeira"]
  // Suggestions in the editor; any single emoji is allowed.
  const STICKERS = ["🎉", "⚽", "🔥", "🚀", "💙", "👏", "🙌", "😎", "🤩", "💥", "🏆", "🐐",
    "😭", "😱", "😩", "💀", "🤡", "😤", "🫠", "🙈", "💔", "🧱", "🥶", "🤦"]
  // The Série A clubs of 2026, their shirt drawn in the stand's own shapes: colours and pattern, never a crest.
  // Black is a dark grey: pure black vanishes against the navy outline and the darker arenas.
  const PRETO = "#2b2f38"
  const BRANCO = "#f4f5f7"
  const TIMES = [
    { nome: "Athletico-PR", cor: "#e03131", detalhe: PRETO, roupa: "listrado" },
    { nome: "Atlético-MG", cor: BRANCO, detalhe: PRETO, roupa: "listras" },
    { nome: "Bahia", cor: BRANCO, detalhe: "#1f5fbf", terceira: "#e03131", roupa: "faixa-dupla" },
    { nome: "Botafogo", cor: BRANCO, detalhe: PRETO, roupa: "listras" },
    { nome: "Chapecoense", cor: "#1f9d55", detalhe: BRANCO, roupa: "gola" },
    { nome: "Corinthians", cor: BRANCO, detalhe: PRETO, roupa: "gola" },
    { nome: "Coritiba", cor: BRANCO, detalhe: "#1f7a4d", roupa: "listra" },
    { nome: "Cruzeiro", cor: "#1d4ed8", detalhe: BRANCO, roupa: "gola" },
    { nome: "Flamengo", cor: "#e03131", detalhe: PRETO, roupa: "listrado" },
    { nome: "Fluminense", cor: "#8b1e3f", detalhe: "#1f7a4d", terceira: BRANCO, roupa: "tricolor" },
    { nome: "Grêmio", cor: "#3b82f6", detalhe: PRETO, terceira: BRANCO, roupa: "tricolor" },
    { nome: "Internacional", cor: "#e03131", detalhe: BRANCO, roupa: "gola" },
    { nome: "Mirassol", cor: "#ffd23f", detalhe: "#1f7a4d", roupa: "gola" },
    { nome: "Palmeiras", cor: "#1f8a4c", detalhe: BRANCO, roupa: "gola" },
    { nome: "Red Bull Bragantino", cor: BRANCO, detalhe: "#e03131", roupa: "gola" },
    { nome: "Remo", cor: "#1e3a8a", detalhe: BRANCO, roupa: "gola" },
    { nome: "Santos", cor: BRANCO, detalhe: PRETO, roupa: "gola" },
    { nome: "São Paulo", cor: BRANCO, detalhe: "#e03131", terceira: PRETO, roupa: "faixa-dupla" },
    { nome: "Vasco", cor: BRANCO, detalhe: PRETO, roupa: "faixa" },
    { nome: "Vitória", cor: "#e03131", detalhe: PRETO, roupa: "listrado" },
  ]
  const TIME_MAX = 24
  const FRASE_MAX = 30
  const STICKERS_MAX = 3
  const PADRAO_STICKERS = { gol: ["🎉"], contra: ["😭"] }

  function hash(text) {
    let h = 2166136261
    for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619)
    return h >>> 0
  }

  /** Everyone's look before they choose: from their login, so it differs between people and never changes. */
  function padrao(login = "") {
    let h = hash(login)
    const pick = (list) => {
      const item = list[h % list.length]
      h = (Math.floor(h / list.length) ^ hash(String(h))) >>> 0
      return item
    }
    const cor = pick(CORES)
    const detalhe = pick(CORES.filter((c) => c !== cor))
    return {
      cor,
      detalhe,
      terceira: pick(CORES.filter((c) => c !== cor && c !== detalhe)),
      time: "",
      cabeca: pick(CABECAS.slice(0, 3)),
      roupa: pick(ROUPAS.slice(0, 3)),
      numero: h % 100,
      acessorio: pick(["nenhum", "nenhum", "bone", "cachecol", "bandeira"]),
      comemoracao: "pula",
      frase: "",
      stickers: { gol: [...PADRAO_STICKERS.gol], contra: [...PADRAO_STICKERS.contra] },
    }
  }

  const HEX = /^#[0-9a-f]{6}$/i
  const EMOJI = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]*$/u
  const umEmoji = (e) => typeof e === "string" && e.length <= 16 && EMOJI.test(e)

  /** A stored look over the default one: only what's valid is kept. Any colour is valid here; the palette
      is a rule of the stand (soPaleta), which knows who has unlocked free colours. */
  function normalizar(escolha, login = "") {
    const a = padrao(login)
    if (!escolha || typeof escolha !== "object") return a
    const de = (lista, chave) => lista.includes(escolha[chave]) && (a[chave] = escolha[chave])
    for (const chave of ["cor", "detalhe", "terceira"]) if (HEX.test(escolha[chave])) a[chave] = escolha[chave].toLowerCase()
    if (typeof escolha.time === "string") a.time = Array.from(escolha.time.replace(/\s+/g, " ").trim()).slice(0, TIME_MAX).join("").trim()
    de(CABECAS, "cabeca")
    de(ROUPAS, "roupa")
    de(ACESSORIOS, "acessorio")
    de(COMEMORACOES, "comemoracao")
    if (Number.isInteger(escolha.numero) && escolha.numero >= 0 && escolha.numero <= 99) a.numero = escolha.numero
    if (typeof escolha.frase === "string") a.frase = Array.from(escolha.frase.replace(/\s+/g, " ").trim()).slice(0, FRASE_MAX).join("").trim()
    for (const quando of ["gol", "contra"]) {
      const lista = escolha.stickers?.[quando]
      if (Array.isArray(lista)) a.stickers[quando] = lista.filter(umEmoji).slice(0, STICKERS_MAX)
    }
    return a
  }

  /** The look with any colour outside the palette back to the default one: for who hasn't unlocked free colours (sigma.js).
      A club's own colours are everyone's, worn as its shirt. */
  function soPaleta(aparencia, login = "") {
    const base = padrao(login)
    const a = { ...aparencia }
    const clube = TIMES.find((t) => t.nome === a.time)
    const doClube = (chave) => clube && (clube[chave] ?? clube.detalhe).toLowerCase() === a[chave]
    for (const chave of ["cor", "detalhe", "terceira"]) if (!CORES.includes(a[chave]) && !doClube(chave)) a[chave] = base[chave]
    return a
  }

  const CABECA = {
    losango: `<path class="contorno" d="M12 0 L18.5 6.5 L12 13 L5.5 6.5 Z"/>`,
    redonda: `<circle class="contorno" cx="12" cy="6.5" r="6"/>`,
    quadrada: `<rect class="contorno" x="6.5" y="1" width="11" height="11"/>`,
    hexagono: `<path class="contorno" d="M8.8 0.8 H15.2 L18.4 6.5 L15.2 12.2 H8.8 L5.6 6.5 Z"/>`,
    triangulo: `<path class="contorno" d="M12 0.3 L18.8 12.5 H5.2 Z"/>`,
  }
  // The shirt inside its outline (the body's octagon, 0.6 in), for patterns cut to it.
  const CAMISA = [[7.6, 14.6], [16.4, 14.6], [21.4, 19.6], [21.4, 35.4], [2.6, 35.4], [2.6, 19.6]]
  /** A rectangle cut to the shirt (Sutherland–Hodgman: the shirt is convex), as path data. */
  function naCamisa(x0, y0, x1, y1) {
    let pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    for (let i = 0; i < CAMISA.length; i++) {
      const [ax, ay] = CAMISA[i]
      const [bx, by] = CAMISA[(i + 1) % CAMISA.length]
      const dentro = ([x, y]) => (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= 0
      const corte = ([px, py], [qx, qy]) => {
        const t = ((bx - ax) * (ay - py) - (by - ay) * (ax - px)) / ((bx - ax) * (qy - py) - (by - ay) * (qx - px))
        return [px + t * (qx - px), py + t * (qy - py)]
      }
      const antes = pts
      pts = []
      antes.forEach((p, j) => {
        const q = antes[(j + 1) % antes.length]
        if (dentro(q)) {
          if (!dentro(p)) pts.push(corte(p, q))
          pts.push(q)
        } else if (dentro(p)) pts.push(corte(p, q))
      })
      if (!pts.length) return ""
    }
    return "M" + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L") + " Z"
  }
  /** Stripes across the shirt, `n` of them, coloured in turn by `cores` (null leaves the body's colour). */
  function faixas(n, cores, vertical) {
    let d = ""
    const [a, b] = vertical ? [2.6, 21.4] : [14.6, 35.4]
    const passo = (b - a) / n
    for (let i = 0; i < n; i++) {
      const cor = cores[i % cores.length]
      if (!cor) continue
      const [p, q] = [a + i * passo, a + (i + 1) * passo]
      const forma = vertical ? naCamisa(p, 0, q, 40) : naCamisa(0, p, 30, q)
      d += `<path d="${forma}" fill="${cor}"/>`
    }
    return d
  }
  const ROUPA = {
    lisa: () => "",
    listra: () => `<rect x="2.6" y="23" width="18.8" height="4"/>`,
    faixa: () => `<path d="M7 14.6 H11 L21.4 25 V29 Z"/>`,
    meio: () => `<path d="M12 14.6 H16.8 L21.4 19.2 V35.4 H12 Z"/>`,
    numero: (n) => `<text x="12" y="31.5" text-anchor="middle" font-size="10" font-weight="700" font-family="Space Grotesk, sans-serif">${n}</text>`,
    gola: () => `<path d="M8.6 14.6 H15.4 L12 18.6 Z"/><path d="${naCamisa(0, 33.2, 30, 35.4)}"/>`,
    listras: (n, a) => faixas(5, [null, a.detalhe], true),
    listrado: (n, a) => faixas(6, [null, a.detalhe], false),
    tricolor: (n, a) => faixas(6, [null, a.detalhe, a.terceira], true),
    "faixa-dupla": (n, a) => `<path d="${naCamisa(0, 20.5, 30, 23.5)}" fill="${a.detalhe}"/><path d="${naCamisa(0, 23.5, 30, 26.5)}" fill="${a.terceira}"/>`,
  }
  const ACESSORIO = {
    nenhum: "",
    bone: `<path class="contorno" d="M6.5 2.5 L8 -1.5 H16 L17.5 2.5 Z M17 2.5 H22.5 V3.8 H17 Z"/>`,
    cachecol: `<path class="contorno" d="M6.5 12.6 H17.5 V15.6 H6.5 Z M13.5 15.6 H16.5 V22 H13.5 Z"/>`,
    bandeira: `<path d="M21 34 L27 2" stroke="#f4f5f7" stroke-width="1.2"/><path class="contorno" d="M27 2 L35 5.5 L26.2 9.5 Z"/>`,
    coroa: `<path class="contorno" d="M6.5 1.8 L7.3 -3.2 L9.9 -0.2 L12 -4.2 L14.1 -0.2 L16.7 -3.2 L17.5 1.8 Z"/>`,
    oculos: `<path d="M6.4 4.8 H11 V7.8 H6.4 Z M13 4.8 H17.6 V7.8 H13 Z M11 5.6 H13 V6.6 H11 Z" fill="#001447"/>`,
    fone: `<path d="M5.4 7.5 A6.6 6.6 0 0 1 18.6 7.5" fill="none" stroke-width="1.6" stroke="currentColor"/><path class="contorno" d="M3.9 5.8 H6.6 V10.6 H3.9 Z M17.4 5.8 H20.1 V10.6 H17.4 Z"/>`,
    cartola: `<path class="contorno" d="M7.8 1.6 V-5.6 H16.2 V1.6 Z M5 1.6 H19 V3.2 H5 Z"/>`,
  }
  /** The fan as SVG, 24×36 units, feet at the bottom; arms show only while cheering (.bracos). */
  function figura(aparencia) {
    const { cor, detalhe, cabeca, roupa, numero, acessorio } = aparencia
    return `<svg viewBox="0 0 24 36" aria-hidden="true" style="--cor:${cor}; color:${detalhe}">
      <g class="bracos"><path d="M5 18 L-1 8"/><path d="M19 18 L25 8"/></g>
      <g fill="${cor}">${CABECA[cabeca] || CABECA.losango}<path class="contorno" d="M7 14 H17 L22 19 V36 H2 V19 Z"/></g>
      <g fill="${detalhe}">${(ROUPA[roupa] || ROUPA.lisa)(numero, aparencia)}${ACESSORIO[acessorio] ?? ""}</g>
    </svg>`
  }

  window.Torcedor = {
    CORES, CABECAS, ROUPAS, TRES_CORES, ACESSORIOS, COMEMORACOES, STICKERS, FRASE_MAX, STICKERS_MAX, TIMES, TIME_MAX,
    padrao, normalizar, soPaleta, figura, umEmoji,
  }
})()
