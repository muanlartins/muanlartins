// The viewers' matches (Luan, 2026-11-28): when the stand is full, the chat plays Rocket League among itself in a
// private match Luan makes by hand, and this draws who plays with whom. The chat's !jogar puts someone on the list (and
// !sair takes them off); in the "Pareamento" dock (public/stream/pareamento.html) Luan picks the format among the ones
// the list allows (`formatos`) and draws; the "Sorteio" scene (public/stream/sorteio.html) plays the draw as a roulette
// and then shows the teams, or the tournament's bracket, as Luan marks each match's winner in the dock. Each draw takes
// the people it drew off the list: for the next one, everyone types !jogar again (Luan's call).
//
// The rule that makes it always work: when one more player closes the teams, Luan plays (an odd list for 1v1 and 2v2);
// otherwise he narrates. Teams of 1, 2 or 3; two teams are one match, more are a single-elimination bracket (at most
// MAX_TIMES teams, byes for the first drawn when the count isn't a power of two). A list too long for that draws a
// bracket's worth and leaves the rest on the list. Random only: there's no rank to balance with (Rocket League has no
// public rank API, and the in-game ways are off limits).
//
// Each team's first drawn viewer names it (!time) and picks its colour (!cor), from CORES; winning a match gives every
// viewer of the team SIGMA_VITORIA Σ.
//
// Everything lives in one item of the Σ table, ITEM, written only if nobody wrote it since it was read (`versao`), so two
// !jogar at once both land (`mudar` reads again and retries). The functions below are pure but `mudar` and the routes,
// which take the table as { ler, gravar, somar } (index.mjs gives them DynamoDB; the tests a Map).

import { randomInt } from "node:crypto"
import { LOGIN } from "./comum/http.mjs"
import { filtrar } from "./filtro.mjs"

export const ITEM = "#pareamento"
export const TAMANHOS = [1, 2, 3]
export const MAX_TIMES = 8
export const MAX_INSCRITOS = 64
export const SIGMA_VITORIA = 5
const ANTERIORES = 10
const NOME_MAX = 24
// Colours that read on the live's navy and tell teams apart; the first two are the game's own sides.
export const CORES = [
  { id: "azul", nome: "azul", hex: "#3d7bff" },
  { id: "laranja", nome: "laranja", hex: "#ff8a1f" },
  { id: "verde", nome: "verde", hex: "#2fbf5b" },
  { id: "roxo", nome: "roxo", hex: "#a46bff" },
  { id: "amarelo", nome: "amarelo", hex: "#ffd23f" },
  { id: "rosa", nome: "rosa", hex: "#ff5fa2" },
  { id: "vermelho", nome: "vermelho", hex: "#e5484d" },
  { id: "ciano", nome: "ciano", hex: "#22c7d6" },
]

const potencia = (n) => n >= 1 && (n & (n - 1)) === 0
const acima = (n) => 2 ** Math.ceil(Math.log2(Math.max(1, n)))
const semAcento = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim()
const diaDe = (t) => new Date(t).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" })

/**
 * The formats `n` viewers allow, the one to suggest first (one match; then everyone playing; then no byes; 2v2 over 1v1
 * over 3v3): one per team size, with Luan in when one more player is what
 * closes the teams or spares the bracket its byes. Each: { tam, luan, times, jogadores (viewers who play), sobram
 * (left on the list), partidas, tipo: "partida" | "torneio" }.
 */
export function formatos(n) {
  const opcoes = []
  if (!Number.isInteger(n) || n < 1) return opcoes
  for (const tam of TAMANHOS) {
    const candidatos = []
    for (const luan of [false, true]) {
      const p = n + (luan ? 1 : 0)
      const times = p / tam
      if (Number.isInteger(times) && times >= 2 && times <= MAX_TIMES) candidatos.push({ tam, luan, times, jogadores: n, sobram: 0 })
    }
    // An even number of teams (Luan's rule: an odd list, he plays), then no byes, then Luan out.
    candidatos.sort((a, b) => (a.times % 2) - (b.times % 2) || potencia(b.times) - potencia(a.times) || a.luan - b.luan)
    if (candidatos[0]) opcoes.push(candidatos[0])
    else if (n > MAX_TIMES * tam) opcoes.push({ tam, luan: false, times: MAX_TIMES, jogadores: MAX_TIMES * tam, sobram: n - MAX_TIMES * tam })
  }
  const PREFERE = { 2: 0, 1: 1, 3: 2 }
  return opcoes
    .map((o) => ({ ...o, partidas: o.times - 1, tipo: o.times === 2 ? "partida" : "torneio" }))
    .sort((a, b) => (a.times === 2 ? 0 : 1) - (b.times === 2 ? 0 : 1) || a.sobram - b.sobram || potencia(b.times) - potencia(a.times) || PREFERE[a.tam] - PREFERE[b.tam])
}

/** The format `pedido` ({ tam }) names among the ones `n` viewers allow, or null. */
export const formatoDe = (n, pedido) => formatos(n).find((o) => o.tam === Number(pedido?.tam)) ?? null

/** A 32-bit seed's numbers in [0, 1) (mulberry32). */
export function aleatorio(semente) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function embaralhar(lista, r) {
  const l = [...lista]
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[l[i], l[j]] = [l[j], l[i]]
  }
  return l
}

/** The bracket's first-round order for `s` slots (a power of two): 0 v s−1, so the first drawn meet the byes. */
function ordem(s) {
  let l = [0]
  while (l.length < s) l = l.flatMap((x) => [x, l.length * 2 - 1 - x])
  return l
}

/**
 * The matches for `t` teams: { id "r-k", rodada, a, b (team indexes, null while unknown), vencedor (a team index or
 * null), bye }. Two teams are one match; more, a bracket where the first round's byes are already decided.
 */
export function chave(t) {
  const s = acima(t)
  const seeds = ordem(s)
  const partidas = []
  for (let k = 0; k < s / 2; k++) {
    const a = seeds[2 * k] < t ? seeds[2 * k] : null
    const b = seeds[2 * k + 1] < t ? seeds[2 * k + 1] : null
    partidas.push({ id: `0-${k}`, rodada: 0, a, b, vencedor: b === null ? a : a === null ? b : null, bye: a === null || b === null })
  }
  for (let r = 1, n = s / 4; n >= 1; r++, n /= 2) for (let k = 0; k < n; k++) partidas.push({ id: `${r}-${k}`, rodada: r, a: null, b: null, vencedor: null, bye: false })
  return levar(partidas)
}

// Each decided match's winner into its place in the next round (and an undecided one's place emptied).
function levar(partidas) {
  const por = new Map(partidas.map((p) => [p.id, p]))
  for (const p of partidas) {
    if (p.rodada === 0) continue
    const [r, k] = [p.rodada, Number(p.id.split("-")[1])]
    p.a = por.get(`${r - 1}-${2 * k}`)?.vencedor ?? null
    p.b = por.get(`${r - 1}-${2 * k + 1}`)?.vencedor ?? null
  }
  return partidas
}

/** The match a match's winner goes to, or null for the final. */
function seguinte(partidas, id) {
  const [r, k] = id.split("-").map(Number)
  return partidas.find((p) => p.id === `${r + 1}-${Math.floor(k / 2)}`) ?? null
}

/** The final, the match no other feeds. */
const final = (partidas) => partidas.reduce((f, p) => (p.rodada > f.rodada ? p : f), partidas[0])

/**
 * A draw: `inscritos` ({ login, nome }) shuffled by `semente`, the format's players taken (Luan, `dono`, among them when
 * he plays), the teams made in the order drawn (each named after its first viewer, coloured in CORES' order) and the
 * matches. `ordem` is the order the roulette shows them in; whoever wasn't taken is in `fora`.
 */
export function sortear(inscritos, formato, semente, dono, agora = new Date()) {
  const r = aleatorio(semente)
  const misturados = embaralhar(inscritos, r)
  const escolhidos = misturados.slice(0, formato.jogadores)
  const fora = misturados.slice(formato.jogadores)
  const ordemDoSorteio = escolhidos.map((i) => i.login)
  if (formato.luan) ordemDoSorteio.splice(Math.floor(r() * (ordemDoSorteio.length + 1)), 0, dono)
  const nomes = Object.fromEntries([...escolhidos.map((i) => [i.login, i.nome]), ...(formato.luan ? [[dono, "Luan"]] : [])])
  const times = []
  for (let i = 0; i < formato.times; i++) {
    const logins = ordemDoSorteio.slice(i * formato.tam, (i + 1) * formato.tam)
    const capitao = logins.find((l) => l !== dono) ?? logins[0]
    times.push({ nome: formato.tam === 1 ? nomes[capitao] : `Time ${nomes[capitao]}`, cor: CORES[i % CORES.length].id, logins, capitao })
  }
  return {
    id: `${agora.toISOString()}#${semente}`,
    em: agora.toISOString(),
    semente,
    formato: { tam: formato.tam, luan: formato.luan, times: formato.times, tipo: formato.times === 2 ? "partida" : "torneio" },
    inscritos: inscritos.map(({ login, nome }) => ({ login, nome })),
    ordem: ordemDoSorteio,
    nomes,
    times,
    partidas: chave(formato.times),
    fora: fora.map((i) => i.login),
    campeao: null,
  }
}

/**
 * The winner of a match: `lado` "a" or "b". Returns { sorteio, ganhadores } (the winning team's logins) or { erro }.
 * The winner goes on to the next round; the final's is the champion.
 */
export function vencer(sorteio, id, lado) {
  const partidas = structuredClone(sorteio.partidas)
  const p = partidas.find((x) => x.id === id)
  if (!p) return { erro: "Essa partida não existe." }
  if (p.a === null || p.b === null) return { erro: "Essa partida ainda não tem os dois times." }
  if (p.vencedor !== null) return { erro: "Essa partida já tem vencedor." }
  if (lado !== "a" && lado !== "b") return { erro: "Diz qual time venceu." }
  p.vencedor = p[lado]
  levar(partidas)
  const campeao = final(partidas).vencedor
  return { sorteio: { ...sorteio, partidas, campeao }, ganhadores: sorteio.times[p.vencedor].logins }
}

/**
 * Takes a match's winner back (a click on the wrong team), while the match after it hasn't been decided. Returns
 * { sorteio, ganhadores } (whose Σ go back) or { erro }.
 */
export function desfazer(sorteio, id) {
  const partidas = structuredClone(sorteio.partidas)
  const p = partidas.find((x) => x.id === id)
  if (!p || p.vencedor === null || p.bye) return { erro: "Essa partida não tem vencedor pra desfazer." }
  if (seguinte(partidas, id)?.vencedor != null) return { erro: "A partida seguinte já tem vencedor: desfaz ela primeiro." }
  const ganhadores = sorteio.times[p.vencedor].logins
  p.vencedor = null
  levar(partidas)
  return { sorteio: { ...sorteio, partidas, campeao: null }, ganhadores }
}

/** Whether any real match of the draw has been decided (a redraw is fair only before that). */
const comecou = (sorteio) => sorteio.partidas.some((p) => !p.bye && p.vencedor !== null)

/** A name as typed in the chat: one line, no @ in front, at most NOME_MAX characters. */
export function limparNome(texto) {
  return String(texto ?? "")
    .replace(/[\p{C}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^@+/, "")
    .slice(0, NOME_MAX)
    .trim()
}

/** The colour a word in the chat names (any case, with or without accents), or null. */
export const corDe = (texto) => CORES.find((c) => semAcento(texto) === c.id) ?? null

/** An empty state for `dia`. */
const vazio = (dia) => ({ versao: 0, dia, inscritos: [], sorteio: null, anteriores: [] })

/** The state as of `agora`: a new day (Brasília's) starts with an empty list. */
export function hoje(estado, agora = new Date()) {
  const dia = diaDe(agora)
  if (!estado) return vazio(dia)
  if (estado.dia === dia) return estado
  return { ...estado, dia, inscritos: [] }
}

/** Someone onto the list: { estado, codigo: "entrou" | "ja" | "cheia" }. */
export function inscrever(estado, login, nome, agora = new Date()) {
  if (estado.inscritos.some((i) => i.login === login)) return { estado, codigo: "ja" }
  if (estado.inscritos.length >= MAX_INSCRITOS) return { estado, codigo: "cheia" }
  return { estado: { ...estado, inscritos: [...estado.inscritos, { login, nome, em: agora.toISOString() }] }, codigo: "entrou" }
}

/** Someone off the list: { estado, codigo: "saiu" | "nao" }. */
export function desinscrever(estado, login) {
  if (!estado.inscritos.some((i) => i.login === login)) return { estado, codigo: "nao" }
  return { estado: { ...estado, inscritos: estado.inscritos.filter((i) => i.login !== login) }, codigo: "saiu" }
}

/** The draw on screen and its teams, unless it's over. */
const aberto = (estado) => (estado.sorteio && estado.sorteio.campeao === null ? estado.sorteio : null)

/**
 * A team's name, by its first drawn viewer (`login`) or by Luan (`time`, its index): { estado, codigo, time }.
 * codigo: "ok" | "sem-sorteio" | "nao-capitao" | "vazio" | "filtro".
 */
export function nomear(estado, { login, time }, texto) {
  const s = aberto(estado)
  if (!s) return { estado, codigo: "sem-sorteio" }
  const t = time ?? s.times.findIndex((x) => x.capitao === login)
  if (!s.times[t]) return { estado, codigo: "nao-capitao" }
  const nome = limparNome(texto)
  if (!nome) return { estado, codigo: "vazio", time: t }
  if (filtrar(nome).sujo) return { estado, codigo: "filtro", time: t }
  const times = s.times.map((x, i) => (i === t ? { ...x, nome } : x))
  return { estado: { ...estado, sorteio: { ...s, times } }, codigo: "ok", time: t }
}

/**
 * A team's colour, like `nomear`: { estado, codigo, time, cor, de }. codigo: "ok" | "sem-sorteio" | "nao-capitao" |
 * "vazio" (no colour named, or one not in CORES) | "ocupada" (another team's: `de` is its index).
 */
export function colorir(estado, { login, time }, texto) {
  const s = aberto(estado)
  if (!s) return { estado, codigo: "sem-sorteio" }
  const t = time ?? s.times.findIndex((x) => x.capitao === login)
  if (!s.times[t]) return { estado, codigo: "nao-capitao" }
  const cor = corDe(texto)
  if (!cor) return { estado, codigo: "vazio", time: t }
  const de = s.times.findIndex((x, i) => i !== t && x.cor === cor.id)
  if (de >= 0) return { estado, codigo: "ocupada", time: t, cor, de }
  const times = s.times.map((x, i) => (i === t ? { ...x, cor: cor.id } : x))
  return { estado: { ...estado, sorteio: { ...s, times } }, codigo: "ok", time: t, cor }
}

/** The colours no other team has, as a list for the chat. */
const livres = (s, t) => CORES.filter((c) => !s.times.some((x, i) => i !== t && x.cor === c.id)).map((c) => c.nome)

// --- The table ----------------------------------------------------------------------------------------------------

/**
 * Reads the state, changes it with `fn` (which returns { estado, ... } or { erro }) and writes it if nobody wrote it
 * since; a clash reads again, up to five times. Returns what `fn` returned, with the state as written.
 */
export async function mudar(tabela, fn, agora = new Date()) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const lido = await tabela.ler()
    const antes = lido?.versao ?? null
    const r = fn(hoje(lido, agora))
    if (r.erro || r.estado === undefined) return r
    if (r.estado === lido) return r
    const estado = { ...r.estado, versao: (antes ?? 0) + 1 }
    if (await tabela.gravar(estado, antes)) return { ...r, estado }
  }
  throw new Error("pareamento: muitas escritas ao mesmo tempo")
}

/** What the scene, the dock and anyone may see: the list (its names), the formats it allows and the draw. */
export function publico(estado, agora = new Date()) {
  const e = hoje(estado, agora)
  return {
    dia: e.dia,
    inscritos: e.inscritos.map(({ login, nome }) => ({ login, nome })),
    formatos: formatos(e.inscritos.length),
    sorteio: e.sorteio,
    cores: CORES,
    sigmaVitoria: SIGMA_VITORIA,
  }
}

const exibido = (login, nome) => {
  const n = String(nome ?? "").trim().replace(/^@/, "")
  return n.toLowerCase() === login ? n : login
}
// "do Time Fulano", but "de Fulano" for a 1v1's team, which is a person.
const doTime = (s, t) => (s.formato.tam === 1 ? `de ${s.times[t].nome}` : `do ${s.times[t].nome}`)

/**
 * The chat bot's commands (StreamElements' customapi, GET /<comando>.txt?login=&nome=&texto=): the answer, a line of
 * chat. `comando` is "jogar", "sair", "time" or "cor".
 */
export async function comandoDoChat(tabela, comando, q, dono, agora = new Date()) {
  const login = String(q.login ?? "").trim().replace(/^@/, "").toLowerCase()
  if (!LOGIN.test(login)) return "Não deu pra saber quem mandou. Tenta de novo."
  const nome = exibido(login, q.nome)
  if (comando === "jogar") {
    if (login === dono) return "Eu entro quando precisar pra fechar os times."
    const r = await mudar(tabela, (e) => inscrever(e, login, nome, agora), agora)
    const n = r.estado.inscritos.length
    if (r.codigo === "cheia") return `A lista do sorteio está cheia (${MAX_INSCRITOS}).`
    return r.codigo === "ja" ? `${nome} já está no sorteio. Na lista: ${n}.` : `${nome} entrou no sorteio. Na lista: ${n}.`
  }
  if (comando === "sair") {
    const r = await mudar(tabela, (e) => desinscrever(e, login), agora)
    return r.codigo === "nao" ? `${nome} não estava no sorteio.` : `${nome} saiu do sorteio. Na lista: ${r.estado.inscritos.length}.`
  }
  const texto = q.texto ?? ""
  const r = await mudar(tabela, (e) => (comando === "time" ? nomear(e, { login }, texto) : colorir(e, { login }, texto)), agora)
  const s = r.estado.sorteio
  if (r.codigo === "sem-sorteio") return "Nenhum time sorteado agora."
  if (r.codigo === "nao-capitao") return comando === "time" ? "Quem escolhe o nome é o primeiro sorteado de cada time." : "Quem escolhe a cor é o primeiro sorteado de cada time."
  if (comando === "time") {
    if (r.codigo === "vazio") return "Pra dar nome ao seu time: !time e o nome."
    if (r.codigo === "filtro") return "Esse nome não passou no filtro. Tenta outro."
    return `Agora o time de ${nome} é “${s.times[r.time].nome}”.`
  }
  if (r.codigo === "vazio") return `Pra escolher a cor do seu time: !cor e uma destas: ${livres(s, r.time).join(", ")}.`
  if (r.codigo === "ocupada") return `${r.cor.nome[0].toUpperCase() + r.cor.nome.slice(1)} já é ${doTime(s, r.de)}. Livres: ${livres(s, r.time).join(", ")}.`
  return `${s.times[r.time].nome} agora joga de ${r.cor.nome}.`
}

/**
 * The dock's actions (POST /pareamento with the stream's key): { acao, ... }. Returns [status, body]; on success the
 * body is the public state. Winning a match gives its viewers SIGMA_VITORIA Σ (`tabela.somar`), taking it back takes
 * them back.
 */
export async function acaoDoDock(tabela, corpo, dono, agora = new Date(), semente = () => randomInt(2 ** 32)) {
  const acao = corpo?.acao
  let mexer = null
  const fn = (e) => {
    const s = e.sorteio
    switch (acao) {
      case "adicionar": {
        const login = String(corpo.login ?? "").trim().replace(/^@/, "").toLowerCase()
        if (!LOGIN.test(login) || login === dono) return { erro: "Esse login não vale." }
        const r = inscrever(e, login, exibido(login, corpo.nome) || login, agora)
        return r.codigo === "cheia" ? { erro: "A lista está cheia." } : r
      }
      case "tirar":
        return desinscrever(e, String(corpo.login ?? ""))
      case "limpar":
        return { estado: { ...e, inscritos: [] } }
      case "sortear":
      case "refazer": {
        const refazer = acao === "refazer"
        if (refazer && !s) return { erro: "Nenhum sorteio pra refazer." }
        if (refazer && comecou(s)) return { erro: "Esse sorteio já tem partida decidida: encerra ele e sorteia de novo." }
        if (!refazer && aberto(e)) return { erro: "Ainda tem um sorteio na tela: encerra ele antes." }
        const tirar = new Set(Array.isArray(corpo.tirar) ? corpo.tirar : [])
        // A redraw draws again from the same list, minus whoever Luan took out (someone who left).
        const lista = (refazer ? s.inscritos : e.inscritos).filter((i) => !tirar.has(i.login))
        // A redraw keeps the team size when the shorter list still allows it, else takes the suggestion.
        const formato = formatoDe(lista.length, corpo.formato) ?? (refazer ? formatos(lista.length)[0] : null)
        if (!formato) return { erro: refazer ? "Sobrou gente de menos pra sortear." : "Esse formato não fecha com essa lista." }
        const novo = sortear(lista, formato, semente(), dono, agora)
        const tirados = new Set(novo.ordem)
        // Whoever was drawn is off the list; whoever wasn't (a list too long) stays for the next.
        const inscritos = e.inscritos.filter((i) => !tirados.has(i.login))
        // A redraw puts back on the list whoever the first draw had taken and this one doesn't.
        const devolvidos = refazer ? s.ordem.filter((l) => l !== dono && !tirados.has(l) && !tirar.has(l) && !inscritos.some((i) => i.login === l)) : []
        const voltam = devolvidos.map((l) => ({ login: l, nome: s.nomes[l] ?? l, em: agora.toISOString() }))
        const anteriores = !refazer && s ? [resumo(s), ...e.anteriores].slice(0, ANTERIORES) : e.anteriores
        return { estado: { ...e, inscritos: [...inscritos, ...voltam], sorteio: novo, anteriores } }
      }
      case "vencer":
      case "desfazer": {
        if (!s) return { erro: "Nenhum sorteio agora." }
        const r = acao === "vencer" ? vencer(s, String(corpo.partida), corpo.lado) : desfazer(s, String(corpo.partida))
        if (r.erro) return r
        mexer = { logins: r.ganhadores.filter((l) => l !== dono), n: acao === "vencer" ? SIGMA_VITORIA : -SIGMA_VITORIA }
        return { estado: { ...e, sorteio: r.sorteio } }
      }
      case "nomear":
      case "colorir": {
        const t = Number(corpo.time)
        const r = acao === "nomear" ? nomear(e, { time: t }, corpo.nome) : colorir(e, { time: t }, corpo.cor)
        if (r.codigo === "ok") return r
        return { erro: { "sem-sorteio": "Nenhum sorteio aberto.", "nao-capitao": "Esse time não existe.", vazio: acao === "nomear" ? "Escreve um nome." : "Escolhe uma das cores.", filtro: "Esse nome não passou no filtro.", ocupada: "Essa cor já é de outro time." }[r.codigo] }
      }
      case "encerrar":
        if (!s) return { erro: "Nenhum sorteio pra encerrar." }
        return { estado: { ...e, sorteio: null, anteriores: [resumo(s), ...e.anteriores].slice(0, ANTERIORES) } }
      default:
        return { erro: "Ação desconhecida." }
    }
  }
  const r = await mudar(tabela, fn, agora)
  if (r.erro) return [400, { erro: r.erro }]
  if (mexer?.logins.length) await tabela.somar(mexer.logins, mexer.n)
  return [200, publico(r.estado, agora)]
}

/** A draw as kept among the earlier ones: who played and who won. */
const resumo = (s) => ({ id: s.id, formato: s.formato, times: s.times.map(({ nome, logins }) => ({ nome, logins })), campeao: s.campeao })
