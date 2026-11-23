// The match's numbers on screen (Luan, 2026-11-20: Valorant's after-round and after-match stats "ficariam muito boas
// com o Rocket League também. Tipo um overlay de cada partida de quantos toques, gols, defesas, aéreos, score"). The
// Partidas dock (partidas.html) hears the games and sends "muanlartins-estatisticas" through OBS (obs-browser's
// emit_event) as his numbers change and every 5 s: { jogo, partida, modo, me, mvp, fim, mostrar }, where `fim` is the
// result once the match is over ({ result, score, em }); Valorant's comes from its summary, a little after the end.
//
//   placarDaPartida(el, hole, band)  jogo.html: a column beside the camera frame, his numbers in this Rocket League
//                                    match as they change (a +1 lights its line), from the first countdown to a
//                                    minute and a half after the end
//   fimDePartida(el, { aoMostrar })  conversa.html: the match that just ended, as the games' own end screens, until
//                                    the next one starts (five minutes at most); `aoMostrar(sim)` says when it comes
//                                    and goes, so the page can give it the topic's place
//
// ?demo on either page plays a match by itself.

/** Rocket League's numbers, in the order the column lists them, with their names on screen. */
const NUMEROS_RL = [
  ["score", "Score"],
  ["goals", "Gols"],
  ["assists", "Assistências"],
  ["saves", "Defesas"],
  ["shots", "Chutes"],
  ["touches", "Toques"],
  ["aerials", "Aéreos"],
  ["demos", "Demolições"],
]
// The column has room for a shorter name.
const CURTO = { assists: "Assist.", demos: "Demos" }
// The game scene's card leaves this long after the match's end, and anything this long after the dock went quiet.
const DEPOIS_DO_FIM_MS = 90_000
const SILENCIO_MS = 15_000
// The end card in Conversa: at most this long after the match.
const FIM_NA_CONVERSA_MS = 5 * 60_000

const RESULTADO = { win: "Vitória", loss: "Derrota", draw: "Empate" }

/**
 * The numbers from a "muanlartins-estatisticas" event: the Partidas dock sends them as JSON text in `dados`
 * (obs-websocket keeps only arrays of objects, so the result's score would arrive empty); ?demo sends them as is.
 */
function numerosDe(detail) {
  if (typeof detail?.dados !== "string") return detail ?? null
  try {
    return JSON.parse(detail.dados)
  } catch {
    return null
  }
}

function placarDaPartida(el, hole, band) {
  el.classList.add("numeros")
  el.innerHTML =
    `<p class="titulo">Nesta partida</p>` +
    NUMEROS_RL.map(([k, nome]) => `<div class="linha" data-k="${k}"><span class="rotulo">${CURTO[k] ?? nome}</span><span class="valor">0</span></div>`).join("")
  const linhas = Object.fromEntries([...el.querySelectorAll(".linha")].map((l) => [l.dataset.k, l]))
  // Beside the frame, on the side away from the screen's edge, as tall as the frame and level with it.
  const lugar = () => {
    const direita = hole.classList.contains("right")
    const alto = hole.offsetHeight + 2 * band
    el.style.height = `${alto}px`
    el.style.top = `${hole.offsetTop - band}px`
    el.style.left = direita ? `${hole.offsetLeft - band - 16 - el.offsetWidth}px` : `${hole.offsetLeft + hole.offsetWidth + band + 16}px`
  }
  lugar()
  let partida = null
  let antes = {}
  let ouvido = 0
  let ultimo = null
  const visivel = () => {
    const d = ultimo
    const ok = d && d.mostrar !== false && d.jogo === "rocket-league" && Date.now() - ouvido < SILENCIO_MS && (!d.fim || Date.now() - d.fim.em < DEPOIS_DO_FIM_MS)
    el.classList.toggle("visivel", Boolean(ok))
  }
  addEventListener("muanlartins-estatisticas", (e) => {
    const detail = numerosDe(e.detail)
    ouvido = Date.now()
    ultimo = detail
    if (detail?.jogo !== "rocket-league") return visivel()
    if (detail.partida !== partida) {
      partida = detail.partida
      antes = {}
    }
    for (const [k] of NUMEROS_RL) {
      const v = detail.me?.[k] ?? 0
      const linha = linhas[k]
      linha.querySelector(".valor").textContent = v
      // A goal, a save, an aerial…: its line lights up and a +1 goes by. The score climbs too often for that.
      if (k !== "score" && antes[k] != null && v > antes[k]) {
        linha.classList.remove("subiu")
        void linha.offsetWidth
        linha.dataset.mais = `+${v - antes[k]}`
        linha.classList.add("subiu")
      }
      antes[k] = v
    }
    el.classList.toggle("mvp", Boolean(detail.mvp))
    visivel()
  })
  setInterval(visivel, 1000)
}

function fimDePartida(el, { aoMostrar = () => {} } = {}) {
  el.classList.add("fim-de-partida")
  let mostrando = false
  let atual = null
  let ouvido = 0
  const tile = (valor, nome) => `<div class="tile"><span class="valor">${valor}</span><span class="rotulo">${nome}</span></div>`
  const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "–")
  function desenhar(d) {
    const { result, score } = d.fim
    const placar = score?.length === 2 && score.every(Number.isFinite) ? ` <span class="placar">${score[0]}<span class="accent">–</span>${score[1]}</span>` : ""
    let titulo = ""
    let tiles = ""
    if (d.jogo === "valorant") {
      const m = d.me ?? {}
      const tiros = (m.headshots ?? 0) + (m.bodyshots ?? 0) + (m.legshots ?? 0)
      const rodadas = d.rodadas || 0
      titulo = ["Fim de partida", d.modo, d.mapa, d.agente].filter(Boolean).join(" · ")
      tiles =
        tile(`${m.kills ?? 0}<span class="accent">/</span>${m.deaths ?? 0}<span class="accent">/</span>${m.assists ?? 0}`, "Abates / mortes / assist.") +
        tile(rodadas ? Math.round((m.score ?? 0) / rodadas) : "–", "ACS") +
        tile(pct(m.headshots ?? 0, tiros), "Na cabeça") +
        tile(m.firstKills ?? 0, "Primeiros abates") +
        tile(rodadas ? Math.round((m.damage ?? 0) / rodadas) : "–", "Dano por rodada")
    } else {
      titulo = ["Fim de partida", d.modo && (d.modo.includes(" ") || d.modo === "Hoops" ? d.modo : `Ranqueada ${d.modo}`)].filter(Boolean).join(" · ")
      tiles = NUMEROS_RL.map(([k, nome]) => tile(d.me?.[k] ?? 0, nome)).join("")
    }
    el.classList.toggle("valorant", d.jogo === "valorant")
    el.innerHTML = `<p class="eyebrow">${titulo}</p>
      <p class="resultado ${result}"><span class="palavra">${RESULTADO[result] ?? ""}</span>${placar}${d.mvp ? ` <span class="selo">MVP</span>` : ""}</p>
      <div class="tiles">${tiles}</div>`
  }
  function olhar() {
    const d = atual
    const sim = Boolean(d?.fim && d.mostrar !== false && Date.now() - d.fim.em < FIM_NA_CONVERSA_MS && Date.now() - ouvido < 60_000)
    if (sim !== mostrando) {
      mostrando = sim
      el.classList.toggle("visivel", sim)
      aoMostrar(sim)
    }
  }
  addEventListener("muanlartins-estatisticas", (e) => {
    const detail = numerosDe(e.detail)
    ouvido = Date.now()
    const novo = detail?.fim && JSON.stringify(detail) !== JSON.stringify(atual)
    atual = detail
    if (novo) desenhar(detail)
    olhar()
  })
  setInterval(olhar, 1000)
}

/**
 * ?demo: a Rocket League match told as the dock would, then its end (a win, then a loss, in turn); in Conversa,
 * Valorant's end after it. Then the next match, over and over.
 */
function demoDosNumeros({ comValorant = false } = {}) {
  let me
  let n = 0
  let partida = 0
  const enviar = (d) => dispatchEvent(new CustomEvent("muanlartins-estatisticas", { detail: { mostrar: true, ...d } }))
  const passo = () => {
    n++
    me.touches += 1
    me.score += 10 + (n % 3) * 5
    if (n % 4 === 0) me.shots++
    if (n % 7 === 0) {
      me.goals++
      me.score += 100
    }
    if (n % 5 === 0) {
      me.saves++
      me.score += 50
    }
    if (n % 3 === 0) me.aerials++
    if (n % 11 === 0) me.assists++
    if (n % 13 === 0) me.demos++
    const acabou = n >= 30
    const venceu = partida % 2 === 1
    enviar({ jogo: "rocket-league", partida: `demo-${partida}`, modo: "3v3", me: { ...me }, mvp: acabou && venceu, fim: acabou ? { result: venceu ? "win" : "loss", score: venceu ? [3, 1] : [2, 4], em: Date.now() } : null })
    if (!acabou) return setTimeout(passo, 900)
    if (comValorant)
      setTimeout(
        () =>
          enviar({
            jogo: "valorant", partida: `demo-v${partida}`, modo: "Competitiva", mapa: "Haven", agente: "Sova", rodadas: 22,
            me: { kills: 21, deaths: 15, assists: 6, score: 5610, headshots: 18, bodyshots: 41, legshots: 3, damage: 3520, firstKills: 4 },
            fim: { result: "win", score: [13, 9], em: Date.now() },
          }),
        12_000,
      )
    setTimeout(comecar, comValorant ? 24_000 : 20_000)
  }
  const comecar = () => {
    partida++
    n = 0
    me = { score: 0, goals: 0, assists: 0, saves: 0, shots: 0, touches: 0, aerials: 0, demos: 0 }
    passo()
  }
  setTimeout(comecar, 800)
  // The dock repeats the last message every 5 s.
  let ultimo = null
  addEventListener("muanlartins-estatisticas", ({ detail }) => (ultimo = detail))
  setInterval(() => ultimo && dispatchEvent(new CustomEvent("muanlartins-estatisticas", { detail: ultimo })), 5000)
}
