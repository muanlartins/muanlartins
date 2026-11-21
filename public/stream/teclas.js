// The keyboard and the mouse on the stream (ErikMD's idea, erikmd01, 2026-11-20): the game's keys and the mouse's
// buttons light up as Luan presses them, beside the camera in the game scenes (jogo.html?teclas=1). What's pressed
// comes from scripts/teclas.ps1 on the stream PC, over server-sent events on 127.0.0.1:8796, and only while a game is
// the window in front; with nothing coming (the script off, or no game in front) the box fades away.
//
// teclas(el, { jogo, endereco, demo }) draws into `el`: the keys of `jogo` ("valorant", "rocket-league" or anything
// else, for Diversos) where they sit on a keyboard, and the mouse beside them. `demo` presses them on its own, to place
// the box without the script.

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

function teclas(el, { jogo = "outro", endereco = "http://127.0.0.1:8796", demo = false } = {}) {
  const U = 36 // a key's side
  const G = 5 // between keys
  const P = U + G
  const lista = TECLADOS[jogo] ?? TECLADOS.outro
  const largura = Math.max(...lista.map(([, x, , w = 1]) => (x + w) * P - G))
  const altura = 4 * P - G
  const MOUSE = 86
  const VAO = 22 // between the keys and the mouse
  const total = largura + VAO + MOUSE
  // A key: a square with the frame's 45° cuts at two corners (top left, bottom right), the mark's symmetry.
  const tecla = (x, y, w, h, c = 6) => `${x + c},${y} ${x + w},${y} ${x + w},${y + h - c} ${x + w - c},${y + h} ${x},${y + h} ${x},${y + c}`
  const chaves = lista
    .map(([nome, x, y, w = 1]) => {
      const px = x * P
      const py = y * P
      const pw = w * P - G
      const rotulo = ROTULOS[nome] ?? nome
      return `<g class="tecla" data-tecla="${nome}">
        <polygon points="${tecla(px, py, pw, U)}" />
        ${nome === "SPACE" ? `<line x1="${px + pw / 2 - 18}" x2="${px + pw / 2 + 18}" y1="${py + U / 2 + 6}" y2="${py + U / 2 + 6}" />` : `<text x="${px + pw / 2}" y="${py + U / 2}">${rotulo}</text>`}
      </g>`
    })
    .join("")
  // The mouse: a capsule, its two buttons split by the wheel, the side buttons on its left (forward above back).
  const mx = largura + VAO
  const meio = MOUSE / 2
  const botoes = Math.round(altura * 0.44) // the buttons' height
  const corpo = `x="6" y="1" width="${MOUSE - 12}" height="${altura - 2}" rx="${(MOUSE - 12) / 2}"`
  const mouse = `<g transform="translate(${mx} 0)">
    <defs><clipPath id="corpo-mouse"><rect ${corpo} /></clipPath></defs>
    <rect class="corpo" ${corpo} />
    <g clip-path="url(#corpo-mouse)">
      <g class="tecla" data-botao="L"><rect x="6" y="1" width="${meio - 8}" height="${botoes}" /></g>
      <g class="tecla" data-botao="R"><rect x="${meio + 2}" y="1" width="${meio - 8}" height="${botoes}" /></g>
    </g>
    <g class="tecla roda" data-botao="M"><rect x="${meio - 7}" y="${botoes * 0.24}" width="14" height="${botoes * 0.48}" rx="7" /></g>
    <path class="seta cima" d="M${meio - 6} ${botoes * 0.16} L${meio} ${botoes * 0.08} L${meio + 6} ${botoes * 0.16}" />
    <path class="seta baixo" d="M${meio - 6} ${botoes * 0.84} L${meio} ${botoes * 0.92} L${meio + 6} ${botoes * 0.84}" />
    <g class="tecla" data-botao="X2"><rect x="0" y="${altura * 0.55}" width="8" height="${altura * 0.14}" rx="3" /></g>
    <g class="tecla" data-botao="X1"><rect x="0" y="${altura * 0.73}" width="8" height="${altura * 0.14}" rx="3" /></g>
  </g>`
  el.classList.add("teclas")
  el.style.width = `${total + 34}px`
  el.style.height = `${altura + 34}px`
  el.innerHTML = `<svg viewBox="-1 -1 ${total + 2} ${altura + 2}" width="${total + 2}" height="${altura + 2}" aria-hidden="true">${chaves}${mouse}</svg>`

  const porTecla = new Map([...el.querySelectorAll("[data-tecla]")].map((g) => [g.dataset.tecla, g]))
  const porBotao = new Map([...el.querySelectorAll("[data-botao]")].map((g) => [g.dataset.botao, g]))
  const setas = { cima: el.querySelector(".seta.cima"), baixo: el.querySelector(".seta.baixo") }
  let roda = null
  let sumir
  const girar = (lado) => {
    setas[lado].classList.remove("girou")
    void setas[lado].getBoundingClientRect()
    setas[lado].classList.add("girou")
  }
  const mostrar = (estado) => {
    clearTimeout(sumir)
    // No game in front for a moment (an alt-tab): the box goes; back in the game, it comes back.
    if (!estado.foco) sumir = setTimeout(() => el.classList.remove("visivel"), 1500)
    else el.classList.add("visivel")
    const teclas = new Set(estado.teclas ?? [])
    const botoes = new Set(estado.botoes ?? [])
    for (const [nome, g] of porTecla) g.classList.toggle("apertada", teclas.has(nome))
    for (const [nome, g] of porBotao) g.classList.toggle("apertada", botoes.has(nome))
    if (roda && estado.rodaCima > roda.cima) girar("cima")
    if (roda && estado.rodaBaixo > roda.baixo) girar("baixo")
    roda = { cima: estado.rodaCima ?? 0, baixo: estado.rodaBaixo ?? 0 }
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
  }
}

/** A made-up player, to place the box: walking, strafing, a jump, a crouch, clicks and the wheel, over and over. */
function demonstrar(mostrar) {
  const roteiro = [
    [["W"], []], [["W", "A"], []], [["W", "A"], ["L"]], [["W"], ["L"]], [["W", "D"], []], [["W", "D", "SPACE"], []],
    [["W", "SHIFT"], []], [["W", "SHIFT"], ["R"]], [["SHIFT"], ["R", "L"]], [["A"], []], [["D"], []], [["A"], ["L"]],
    [["CTRL"], ["L"]], [["CTRL", "D"], []], [["E"], []], [[], []], [["Q"], []], [["C"], []], [[], ["X2"]], [["S"], ["M"]],
  ]
  let i = 0
  let cima = 0
  let baixo = 0
  setInterval(() => {
    const [teclas, botoes] = roteiro[i++ % roteiro.length]
    if (i % 7 === 0) cima++
    if (i % 11 === 0) baixo++
    mostrar({ foco: true, teclas, botoes, rodaCima: cima, rodaBaixo: baixo })
  }, 260)
}
