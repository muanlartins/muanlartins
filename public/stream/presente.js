// The Christmas tree's presents: what a viewer can choose on /pix while a Christmas goal is on (tema "natal"), the look
// a Pix gets when nobody chose (from the moment it came, so it never changes), and the drawings: one present, and the
// whole tree with every present of the goal, its lights lit as far as the goal has come and its star once it's reached.
// Shared by the Pix overlay (pix.html), /pix and the mural; the Pix API only keeps what was chosen (presenteDe in
// infra/pix), so anything it doesn't know falls back here. Plain script, no build: it sets window.Presente.

;(() => {
  // Hung on the tree, but the box, which goes under it.
  const FORMATOS = ["bola", "sino", "estrela", "bengala", "caixa"]
  const CORES = [
    "#e03131", "#ff9f43", "#ffd23f", "#3ddc97", "#4dd4ff", "#85a7ff",
    "#1d4ed8", "#c792ea", "#ff5c9a", "#8b1e3f", "#c9ced8", "#f4f5f7",
  ]
  const PADROES = ["liso", "listras", "bolinhas"]
  // The candy cane is always striped: its second colour is the stripes.
  const SEM_PADRAO = ["bengala"]
  const NAVY = "#001447"

  function hash(text) {
    let h = 2166136261
    for (const c of String(text)) h = Math.imul(h ^ c.codePointAt(0), 16777619)
    return h >>> 0
  }

  /** A Pix's present before anyone chooses: from `semente` (the moment it came), so it differs and never changes. */
  function padrao(semente = "") {
    let h = hash(semente)
    const pick = (list) => {
      const item = list[h % list.length]
      h = (Math.floor(h / list.length) ^ hash(String(h))) >>> 0
      return item
    }
    const cor = pick(CORES)
    return { formato: pick(FORMATOS), cor, detalhe: pick(CORES.filter((c) => c !== cor)), padrao: pick(PADROES) }
  }

  /** What was chosen over the default: only what's valid is kept. */
  function normalizar(escolha, semente = "") {
    const a = padrao(semente)
    if (!escolha || typeof escolha !== "object") return a
    if (FORMATOS.includes(escolha.formato)) a.formato = escolha.formato
    if (PADROES.includes(escolha.padrao)) a.padrao = escolha.padrao
    for (const chave of ["cor", "detalhe"]) {
      const c = typeof escolha[chave] === "string" ? escolha[chave].toLowerCase() : ""
      if (CORES.includes(c)) a[chave] = c
    }
    return a
  }

  // --- One present, in its own units: a hung one has its hook at 0,0 and hangs down ~16; the box stands on 0,0. ---
  const linha = `stroke="${NAVY}" stroke-width="1" stroke-linejoin="round"`
  const brilho = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="0.9" fill="#fff" opacity="0.55" transform="rotate(-35 ${x} ${y})"/>`
  function estrelaD(cx, cy, R, r) {
    let d = ""
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2
      const raio = i % 2 ? r : R
      d += `${i ? "L" : "M"}${(cx + raio * Math.cos(a)).toFixed(2)} ${(cy + raio * Math.sin(a)).toFixed(2)} `
    }
    return d + "Z"
  }

  const SINO = "M0 2.6 C3.4 2.6 4.4 5 4.5 8 C4.6 10.4 5.3 11.6 6.6 12.6 H-6.6 C-5.3 11.6 -4.6 10.4 -4.5 8 C-4.4 5 -3.4 2.6 0 2.6 Z"
  const DESENHO = {
    bola(p, id) {
      const padrao =
        p.padrao === "listras"
          ? `<g clip-path="url(#${id})" fill="${p.detalhe}"><rect x="-7" y="7.2" width="14" height="1.8"/><rect x="-7" y="11" width="14" height="1.8"/></g>`
          : p.padrao === "bolinhas"
            ? `<g fill="${p.detalhe}"><circle cx="-2.7" cy="8.2" r="1.1"/><circle cx="2.5" cy="7.3" r="1.1"/><circle cx="0.2" cy="11.3" r="1.1"/><circle cx="-3.6" cy="12.3" r="0.9"/><circle cx="3.7" cy="11.6" r="0.9"/></g>`
            : ""
      return `<clipPath id="${id}"><circle cx="0" cy="10" r="6"/></clipPath>
        <path d="M0 0 V2.4" stroke="${NAVY}" stroke-width="0.8"/>
        <rect x="-1.7" y="2.2" width="3.4" height="2.2" fill="#c9ced8" ${linha}/>
        <circle cx="0" cy="10" r="6" fill="${p.cor}"/>${padrao}<circle cx="0" cy="10" r="6" fill="none" ${linha}/>
        ${brilho(-2.4, 7.4)}`
    },
    sino(p, id) {
      const padrao =
        p.padrao === "listras"
          ? `<g clip-path="url(#${id})" fill="${p.detalhe}"><rect x="-7" y="5.6" width="14" height="1.3"/><rect x="-7" y="9.4" width="14" height="1.7"/></g>`
          : p.padrao === "bolinhas"
            ? `<g fill="${p.detalhe}"><circle cx="-1.8" cy="6.4" r="0.9"/><circle cx="1.8" cy="6.4" r="0.9"/><circle cx="0" cy="9.2" r="1"/><circle cx="-3.1" cy="10.6" r="0.9"/><circle cx="3.1" cy="10.6" r="0.9"/></g>`
            : ""
      return `<clipPath id="${id}"><path d="${SINO}"/></clipPath>
        <path d="M0 0 V2.8" stroke="${NAVY}" stroke-width="0.8"/>
        <circle cx="0" cy="13.6" r="1.7" fill="${p.detalhe}" ${linha}/>
        <path d="${SINO}" fill="${p.cor}"/>${padrao}<path d="${SINO}" fill="none" ${linha}/>
        ${brilho(-2, 5.6)}`
    },
    estrela(p) {
      const miolo =
        p.padrao === "listras"
          ? `<path d="${estrelaD(0, 8, 3.5, 1.5)}" fill="${p.detalhe}"/>`
          : p.padrao === "bolinhas"
            ? `<circle cx="0" cy="8" r="1.7" fill="${p.detalhe}"/>`
            : ""
      return `<path d="M0 0 V1.6" stroke="${NAVY}" stroke-width="0.8"/>
        <path d="${estrelaD(0, 8, 7, 3)}" fill="${p.cor}" ${linha}/>${miolo}`
    },
    bengala(p) {
      const d = "M3 16.4 V4.2 A3 3 0 0 0 -3 4.2 V5.8"
      return `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="3.6" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="${p.cor}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="${p.detalhe}" stroke-width="2.4" stroke-dasharray="1.5 1.5"/>`
    },
    caixa(p, id) {
      let padrao = ""
      if (p.padrao === "listras") {
        for (let x = -22; x < 10; x += 4.4) padrao += `<path d="M${x} 0 L${x + 2} 0 L${x + 14} -12 L${x + 12} -12 Z"/>`
        padrao = `<g clip-path="url(#${id})" fill="${p.detalhe}" opacity="0.85">${padrao}</g>`
      } else if (p.padrao === "bolinhas") {
        const pontos = [[-5.4, -9.2], [4.6, -9.6], [-4.4, -3], [5.4, -3.4], [-6.6, -5.8], [6.6, -6.6]]
        padrao = `<g fill="${p.detalhe}">${pontos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.05"/>`).join("")}</g>`
      }
      const laco = (s) => `<path d="M0 -15.4 C${-2 * s} -19.6 ${-6.6 * s} -18.8 ${-4.8 * s} -16.2 C${-3.8 * s} -15.1 ${-1.7 * s} -15.2 0 -15.4 Z" fill="${p.detalhe}" ${linha}/>`
      return `<clipPath id="${id}"><rect x="-8" y="-12" width="16" height="12"/></clipPath>
        <rect x="-8" y="-12" width="16" height="12" fill="${p.cor}"/>${padrao}
        <rect x="-1.5" y="-12" width="3" height="12" fill="${p.detalhe}"/>
        <rect x="-8" y="-12" width="16" height="12" fill="none" ${linha}/>
        <rect x="-8.8" y="-15.4" width="17.6" height="3.6" fill="${p.cor}" ${linha}/>
        <rect x="-1.5" y="-15.4" width="3" height="3.6" fill="${p.detalhe}" ${linha}/>
        ${laco(1)}${laco(-1)}<circle cx="0" cy="-15.6" r="1.3" fill="${p.detalhe}" ${linha}/>`
    },
  }
  let serie = 0
  const novoId = () => `pz${(serie++).toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const desenho = (p, id) => (DESENHO[p.formato] ?? DESENHO.bola)(p, id)

  /** One present as SVG, alone (the /pix preview, the mural's list): it fills its box. */
  function figura(presente) {
    const p = normalizar(presente)
    const caixa = p.formato === "caixa" ? "-11 -21 22 22" : "-10 -1.5 20 20"
    return `<svg viewBox="${caixa}" aria-hidden="true" style="overflow:visible">${desenho(p, novoId())}</svg>`
  }

  // --- The tree: 200×250 units. Three tiers, each with a string of lights along its hem; the presents hang where
  // they show (a tier's upper part hides under the one above), in an order that spreads them from the first. ----------
  const CAMADAS = [
    { topo: 95, base: 212, meia: 86 },
    { topo: 55, base: 150, meia: 66 },
    { topo: 18, base: 95, meia: 46 },
  ]
  const LINHAS = [
    [0, 156], [0, 173], [0, 190],
    [1, 98], [1, 114], [1, 130],
    [2, 46], [2, 61], [2, 76],
  ]
  const VAGAS = (() => {
    const todas = []
    for (const [c, y] of LINHAS) {
      const { topo, base, meia } = CAMADAS[c]
      const largura = (meia * (y - topo)) / (base - topo) - 7
      const n = Math.max(1, Math.floor((2 * largura) / 15) + 1)
      for (let i = 0; i < n; i++) todas.push([n === 1 ? 100 : 100 - largura + (2 * largura * i) / (n - 1), y])
    }
    // Farthest first: each new present goes where the tree is emptiest, starting low in the middle.
    const ordem = [todas.splice(todas.findIndex(([x, y]) => y === 173 && Math.abs(x - 100) < 8), 1)[0] ?? todas.shift()]
    while (todas.length) {
      let melhor = 0
      let longe = -1
      todas.forEach(([x, y], i) => {
        const d = Math.min(...ordem.map(([a, b]) => (a - x) ** 2 + ((b - y) * 1.3) ** 2))
        if (d > longe) [melhor, longe] = [i, d]
      })
      ordem.push(todas.splice(melhor, 1)[0])
    }
    return ordem
  })()
  // The lights, bottom tier first and left to right: they light in this order as the goal fills.
  const LUZES = CAMADAS.flatMap(({ base, meia }, c) => {
    const n = [11, 8, 6][c]
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1)
      const x = 100 - meia + 7 + t * (2 * meia - 14)
      return [x, base - 6 + 4 * Math.sin(Math.PI * t)]
    })
  })
  const fio = (c) => {
    const { base, meia } = CAMADAS[c]
    const [x0, x1] = [100 - meia + 7, 100 + meia - 7]
    return `M${x0} ${base - 6} Q100 ${base + 2} ${x1} ${base - 6}`
  }
  const VAGAS_CAIXA = 16
  const ESTILO = `
    .pz-luz.pz-acesa .pz-halo { animation: pz-pisca 2.4s ease-in-out infinite alternate; }
    .pz-novo { animation: pz-cai 1.1s cubic-bezier(0.34, 1.4, 0.64, 1) both; }
    @keyframes pz-pisca { from { opacity: 0.35 } to { opacity: 0.95 } }
    @keyframes pz-cai { from { transform: translateY(-70px) scale(1.8); opacity: 0 } 40% { opacity: 1 } }
    .pz-estrela.pz-acesa { animation: pz-brilha 1.8s ease-in-out infinite alternate; }
    @keyframes pz-brilha { from { opacity: 0.85 } to { opacity: 1 } }`
  const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
  const tamanho = (centavos = 0) => (centavos >= 2000 ? 1.45 : centavos >= 500 ? 1.2 : 1)

  /**
   * The tree as SVG. `lista`: the goal's Pix in the order they came, { id, presente, centavos, nome? } (id: the moment
   * it came, the seed of an unchosen present; nome becomes its tooltip); `progresso` 0–1 lights the lights in turn and
   * the star at 1; `novo`, an id, drops that present in.
   */
  function arvore(lista = [], { progresso = 0, novo = null } = {}) {
    const uid = novoId()
    const pendurados = []
    const caixas = []
    for (const item of lista) {
      const p = normalizar(item.presente, item.id)
      ;(p.formato === "caixa" ? caixas : pendurados).push({ ...item, p })
    }
    const sobra = Math.max(0, pendurados.length - VAGAS.length) + Math.max(0, caixas.length - VAGAS_CAIXA)
    const titulo = (item) => (item.nome ? `<title>${escapar(item.nome)}</title>` : "")
    const um = (item, x, y, escala) =>
      `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${escala})" data-id="${escapar(item.id)}">${titulo(item)}<g class="${item.id === novo ? "pz-novo" : ""}">${desenho(item.p, `${uid}${item.i}`)}</g></g>`
    let i = 0
    const naArvore = pendurados.slice(0, VAGAS.length).map((item, n) => um({ ...item, i: i++ }, VAGAS[n][0], VAGAS[n][1], 1))

    // Under the tree, in two rows: the front one from the middle out, then the one behind it.
    const fileiras = [[], []]
    let largura = 0
    for (const item of caixas.slice(0, VAGAS_CAIXA)) {
      const k = tamanho(item.centavos)
      const w = 18 * k + 2
      const fila = largura + w <= 186 ? 0 : 1
      if (!fila) largura += w
      fileiras[fila].push({ ...item, k, w, i: i++ })
    }
    const chao = (fila, y, escala) => {
      const total = fila.reduce((t, c) => t + c.w * escala, 0)
      // Alternating sides from the middle: the first in the middle, then right, left…
      const ordem = []
      fila.forEach((c, n) => (n % 2 ? ordem.push(c) : ordem.unshift(c)))
      let x = 100 - total / 2
      return ordem
        .map((c) => {
          const w = c.w * escala
          x += w
          return um(c, x - w / 2, y, c.k * escala)
        })
        .join("")
    }
    const acesas = Math.min(LUZES.length, Math.floor(Math.max(0, progresso) * LUZES.length + 1e-9))
    const cheia = progresso >= 1
    const luzes = LUZES.map(([x, y], n) => {
      const acesa = n < acesas
      return acesa
        ? `<g class="pz-luz pz-acesa"><circle class="pz-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#ffd23f" filter="url(#${uid}h)" style="animation-delay:${((n * 0.37) % 2.4).toFixed(2)}s"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#ffe9a8" stroke="${NAVY}" stroke-width="0.6"/></g>`
        : `<g class="pz-luz"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="#0d3f26" stroke="${NAVY}" stroke-width="0.6"/></g>`
    }).join("")
    const camada = ({ topo, base, meia }) =>
      `<path d="M100 ${topo} L100 ${base} L${100 - meia} ${base} Z" fill="#2a9d5c"/><path d="M100 ${topo} L${100 + meia} ${base} L100 ${base} Z" fill="#1d7f45"/><path d="M100 ${topo} L${100 + meia} ${base} H${100 - meia} Z" fill="none" stroke="${NAVY}" stroke-width="1.6" stroke-linejoin="round"/>`
    return `<svg viewBox="0 0 200 250" class="pz-arvore" role="img" style="overflow:visible">
      <style>${ESTILO}</style>
      <defs><filter id="${uid}b" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter><filter id="${uid}h" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.8"/></filter></defs>
      <ellipse cx="100" cy="240" rx="98" ry="8" fill="#f4f5f7" opacity="0.9"/>
      <rect x="90" y="200" width="20" height="40" fill="#8a5a3c" stroke="${NAVY}" stroke-width="1.6"/>
      ${CAMADAS.map(camada).join("")}
      ${[0, 1, 2].map((c) => `<path d="${fio(c)}" fill="none" stroke="#0b3320" stroke-width="0.9"/>`).join("")}
      ${luzes}
      ${naArvore.join("")}
      ${cheia ? `<path d="${estrelaD(100, 17, 15, 6.5)}" fill="#ffd23f" filter="url(#${uid}b)" opacity="0.9"/>` : ""}
      <path class="pz-estrela${cheia ? " pz-acesa" : ""}" d="${estrelaD(100, 17, 12, 5.2)}" fill="${cheia ? "#ffd23f" : "#6b6a45"}" stroke="${NAVY}" stroke-width="1.4" stroke-linejoin="round"/>
      ${chao(fileiras[1], 233, 0.85)}${chao(fileiras[0], 243, 1)}
      ${sobra ? `<text x="196" y="236" text-anchor="end" font-size="13" font-weight="700" font-family="Space Grotesk, sans-serif" fill="#f4f5f7" stroke="${NAVY}" stroke-width="3" paint-order="stroke">+${sobra}</text>` : ""}
    </svg>`
  }

  window.Presente = { FORMATOS, CORES, PADROES, SEM_PADRAO, padrao, normalizar, figura, arvore, VAGAS: VAGAS.length + VAGAS_CAIXA }
})()
