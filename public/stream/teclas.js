// The keyboard and the mouse on the stream (ErikMD's idea, erikmd01, 2026-11-20): the game's keys and the mouse's
// buttons light up as Luan presses them, beside the camera in the game scenes (palco.html?teclas=1). What's pressed
// comes from scripts/teclas.ps1 on the stream PC, over server-sent events on 127.0.0.1:8796, and only while a game is
// the window in front; with nothing coming (the script off, or no game in front) the box fades away.
//
// teclas(el, { jogo, endereco, demo, torcedor }) draws into `el`: the keys of `jogo` ("valorant", "rocket-league" or
// anything else, for Diversos) where they sit on a keyboard, and the mouse beside them. `demo` presses them on its own,
// to place the box without the script. `torcedor` puts the channel's 3D fan behind the box (teclas-torcedor.js; the
// page needs the import map for "three"): its head over the box's top edge, typing the keys and holding the mouse,
// which then slides as the real one moves. The box itself stays the same size, so the page places it as before.

/** Each game's keys: [name as teclas.ps1 sends it, x, y, width] in keys, as they sit on the keyboard. */
const TECLADOS = {
  // Movement, walking and crouching, the abilities (C Q E, X the ultimate), reload and use.
  valorant: [
    ["Q", 1.5, 0], ["W", 2.5, 0], ["E", 3.5, 0], ["R", 4.5, 0],
    ["A", 1.75, 1], ["S", 2.75, 1], ["D", 3.75, 1], ["F", 4.75, 1],
    ["SHIFT", 0, 2, 2.25], ["X", 3.25, 2], ["C", 4.25, 2],
    ["CTRL", 0, 3, 1.5], ["SPACE", 2.75, 3, 3.5],
  ],
  // The game's own keyboard layout: driving, air roll left and right, powerslide, ball cam; boost and jump on the mouse.
  "rocket-league": [
    ["Q", 1.5, 0], ["W", 2.5, 0], ["E", 3.5, 0],
    ["A", 1.75, 1], ["S", 2.75, 1], ["D", 3.75, 1],
    ["SHIFT", 0, 2, 2.25],
    ["CTRL", 0, 3, 1.5], ["SPACE", 2.75, 3, 3.5],
  ],
  outro: [
    ["Q", 1.5, 0], ["W", 2.5, 0], ["E", 3.5, 0], ["R", 4.5, 0],
    ["A", 1.75, 1], ["S", 2.75, 1], ["D", 3.75, 1], ["F", 4.75, 1],
    ["SHIFT", 0, 2, 2.25], ["C", 4.25, 2],
    ["CTRL", 0, 3, 1.5], ["SPACE", 2.75, 3, 3.5],
  ],
}
const ROTULOS = { SHIFT: "Shift", CTRL: "Ctrl", SPACE: "" }
/** Where the fan's profile comes from (the profile API's public GET /torcedores), as torcida.html's. */
const PERFIL_API = "https://wtpv8afsak.execute-api.us-east-1.amazonaws.com"

function teclas(el, { jogo = "outro", endereco = "http://127.0.0.1:8796", demo = false, torcedor = false } = {}) {
  const U = 36 // a key's side
  const G = 5 // between keys
  const P = U + G
  const B = 17 // the pane round the keys
  const lista = TECLADOS[jogo] ?? TECLADOS.outro
  const largura = Math.max(...lista.map(([, x, , w = 1]) => (x + w) * P - G))
  const altura = 4 * P - G
  const MOUSE = 86
  const VAO = 22 // between the keys and the mouse
  const total = largura + VAO + MOUSE
  // The drawing's view, in its own units (a pixel each before the page scales the box): just the keys, or with room
  // above the pane for the fan's head and to the sides for its arms.
  const vb = torcedor
    ? { x: -B - 7, y: -B - 143, w: total + 2 * B + 14, h: altura + 2 * B + 150 }
    : { x: -1, y: -1, w: total + 2, h: altura + 2 }
  // A key: a square with the frame's 45° cuts at two corners (top left, bottom right), the mark's symmetry.
  const tecla = (x, y, w, h, c = 6) => `${x + c},${y} ${x + w},${y} ${x + w},${y + h - c} ${x + w - c},${y + h} ${x},${y + h} ${x},${y + c}`
  const teclasDe = lista.map(([nome, x, y, w = 1]) => ({ nome, px: x * P, py: y * P, pw: w * P - G }))
  // The mouse: a capsule, its two buttons split by the wheel, the side buttons on its left (forward above back).
  const mx = largura + VAO
  const meio = MOUSE / 2
  const botoes = Math.round(altura * 0.44) // the buttons' height
  const corpo = `x="6" y="1" width="${MOUSE - 12}" height="${altura - 2}" rx="${(MOUSE - 12) / 2}"`
  const BOTOES = [
    ["L", `x="6" y="1" width="${meio - 8}" height="${botoes}"`, true],
    ["R", `x="${meio + 2}" y="1" width="${meio - 8}" height="${botoes}"`, true],
    ["M", `x="${meio - 7}" y="${botoes * 0.24}" width="14" height="${botoes * 0.48}" rx="7"`, false],
    ["X2", `x="0" y="${altura * 0.55}" width="8" height="${altura * 0.14}" rx="3"`, false],
    ["X1", `x="0" y="${altura * 0.73}" width="8" height="${altura * 0.14}" rx="3"`, false],
  ]
  const id = `mouse-${Math.random().toString(36).slice(2, 8)}`
  // Under: the tiles and the mouse's body. Over: the letters, the pressed rings and the wheel's chevrons.
  const fundo = `<defs><clipPath id="${id}-a"><rect ${corpo} /></clipPath></defs>
    ${teclasDe.map(({ nome, px, py, pw }) => `<g class="tecla" data-tecla="${nome}"><polygon class="tile" points="${tecla(px, py, pw, U)}" /></g>`).join("")}
    <g class="mouse" transform="translate(${mx} 0)">
      <rect class="corpo" ${corpo} />
      ${BOTOES.map(([b, a, clip]) => `<g class="tecla${b === "M" ? " roda" : ""}" data-botao="${b}" ${clip ? `clip-path="url(#${id}-a)"` : ""}><rect class="tile" ${a} /></g>`).join("")}
    </g>`
  const topo = `<defs><clipPath id="${id}-b"><rect ${corpo} /></clipPath></defs>
    ${teclasDe.map(({ nome, px, py, pw }) => `<g class="tecla" data-tecla="${nome}">
      <polygon class="anel" points="${tecla(px, py, pw, U)}" />
      ${nome === "SPACE"
        ? `<line x1="${px + pw / 2 - 18}" x2="${px + pw / 2 + 18}" y1="${py + U / 2 + 6}" y2="${py + U / 2 + 6}" />`
        : `<text x="${px + pw / 2}" y="${py + U / 2}">${ROTULOS[nome] ?? nome}</text>`}
    </g>`).join("")}
    <g class="mouse" transform="translate(${mx} 0)">
      ${BOTOES.map(([b, a, clip]) => `<g class="tecla" data-botao="${b}" ${clip ? `clip-path="url(#${id}-b)"` : ""}><rect class="anel" ${a} /></g>`).join("")}
      <path class="seta cima" d="M${meio - 6} ${botoes * 0.16} L${meio} ${botoes * 0.08} L${meio + 6} ${botoes * 0.16}" />
      <path class="seta baixo" d="M${meio - 6} ${botoes * 0.84} L${meio} ${botoes * 0.92} L${meio + 6} ${botoes * 0.84}" />
    </g>`
  const view = `viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"`
  el.classList.add("teclas")
  el.style.width = `${total + 2 * B}px`
  el.style.height = `${altura + 2 * B}px`
  el.innerHTML = `<div class="camadas" style="left: ${B + vb.x}px; top: ${B + vb.y}px; width: ${vb.w}px; height: ${vb.h}px">
    <svg ${view} aria-hidden="true">${fundo}</svg>
    ${torcedor ? `<canvas aria-hidden="true"></canvas>` : ""}
    <svg ${view} aria-hidden="true">${topo}</svg>
  </div>`

  const grupos = (attr) => {
    const mapa = new Map()
    for (const g of el.querySelectorAll(`[${attr}]`)) mapa.set(g.getAttribute(attr), [...(mapa.get(g.getAttribute(attr)) ?? []), g])
    return mapa
  }
  const porTecla = grupos("data-tecla")
  const porBotao = grupos("data-botao")
  const mouses = [...el.querySelectorAll(".mouse")]
  const setas = { cima: el.querySelector(".seta.cima"), baixo: el.querySelector(".seta.baixo") }

  // The fan, once its modules and its look have come; until then (or if they never do) the box works alone.
  const vivo = { teclas: new Set(), botoes: new Set(), ultima: null }
  let fan = null
  if (torcedor) {
    const alvo = Object.fromEntries(teclasDe.map(({ nome, px, py, pw }) => [nome, { x: nome === "SPACE" ? px + pw * 0.72 : px + pw - 10, y: py + 12 }]))
    import("./teclas-torcedor.js")
      .then(({ torcedorNasTeclas }) =>
        torcedorNasTeclas({
          el,
          canvas: el.querySelector("canvas"),
          vb,
          borda: -B,
          alvo,
          casa: { x: largura - 30, y: -8 }, // at rest: over the keys' top right corner, in the pane's margin
          mouse: { mx, meio, alt: altura },
          porMouse: (t) => mouses.forEach((g) => g.setAttribute("transform", t)),
          estado: vivo,
          login: typeof CHANNEL === "string" ? CHANNEL : "muanlartins",
          api: new URLSearchParams(location.search).get("perfil") ?? PERFIL_API,
          demo,
        }),
      )
      .then((f) => (fan = f))
      .catch((e) => console.warn("teclas: o torcedor não carregou", e))
  }

  let roda = null
  let mov = null
  let sumir
  const girar = (lado) => {
    setas[lado].classList.remove("girou")
    void setas[lado].getBoundingClientRect()
    setas[lado].classList.add("girou")
    fan?.roda(lado)
  }
  const mostrar = (estado) => {
    clearTimeout(sumir)
    // No game in front for a moment (an alt-tab): the box goes; back in the game, it comes back.
    if (!estado.foco) sumir = setTimeout(() => el.classList.remove("visivel"), 1500)
    else el.classList.add("visivel")
    const teclas = new Set(estado.teclas ?? [])
    const botoes = new Set(estado.botoes ?? [])
    for (const [nome, gs] of porTecla) for (const g of gs) g.classList.toggle("apertada", teclas.has(nome))
    for (const [nome, gs] of porBotao) for (const g of gs) g.classList.toggle("apertada", botoes.has(nome))
    for (const t of teclas) if (!vivo.teclas.has(t)) vivo.ultima = t
    vivo.teclas = teclas
    vivo.botoes = botoes
    if (roda && estado.rodaCima > roda.cima) girar("cima")
    if (roda && estado.rodaBaixo > roda.baixo) girar("baixo")
    roda = { cima: estado.rodaCima ?? 0, baixo: estado.rodaBaixo ?? 0 }
    // The mouse's movement: running totals, so a reconnect only sets where they stand.
    if (mov && estado.movX != null) fan?.mover(estado.movX - mov.x, estado.movY - mov.y)
    if (estado.movX != null) mov = { x: estado.movX, y: estado.movY }
  }

  if (demo) return demonstrar(mostrar)
  const fonte = new EventSource(endereco)
  fonte.onmessage = ({ data }) => {
    try {
      mostrar(JSON.parse(data))
    } catch {}
  }
  // The script off or restarting: the box goes until it's back (EventSource tries again by itself).
  fonte.onerror = () => {
    clearTimeout(sumir)
    el.classList.remove("visivel")
    mov = null
  }
}

/** A made-up player, to place the box: walking, strafing, a jump, a crouch, clicks, the wheel and the mouse moving. */
function demonstrar(mostrar) {
  const roteiro = [
    [["W"], []], [["W", "A"], []], [["W", "A"], ["L"]], [["W"], ["L"]], [["W", "D"], []], [["W", "D", "SPACE"], []],
    [["W", "SHIFT"], []], [["W", "SHIFT"], ["R"]], [["SHIFT"], ["R", "L"]], [["A"], []], [["D"], []], [["A"], ["L"]],
    [["CTRL"], ["L"]], [["CTRL", "D"], []], [["E"], []], [[], []], [["Q"], []], [["C"], []], [[], ["X2"]], [["S"], ["M"]],
  ]
  const estado = { foco: true, teclas: [], botoes: [], rodaCima: 0, rodaBaixo: 0, movX: 0, movY: 0 }
  let i = 0
  let fase = 0
  setInterval(() => {
    ;[estado.teclas, estado.botoes] = roteiro[i++ % roteiro.length]
    if (i % 7 === 0) estado.rodaCima++
    if (i % 11 === 0) estado.rodaBaixo++
    mostrar(estado)
  }, 260)
  // The hand on the mouse wanders, with a flick now and then, in the mouse's own counts.
  setInterval(() => {
    fase += 0.07
    estado.movX += Math.round(Math.cos(fase) * 40 + (Math.sin(fase * 0.7) > 0.96 ? 260 : 0))
    estado.movY += Math.round(Math.sin(fase * 1.7) * 22)
    mostrar(estado)
  }, 33)
}
