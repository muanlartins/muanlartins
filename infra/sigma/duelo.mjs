// The ball duel's records: the overlay (public/stream/duelo.html) sends each fight it shows while the stream is on
// (POST /duelo, with the key) and this keeps the score, apart from DynamoDB so a test can run it (duelo.test.mjs);
// index.mjs gives it the table.
//
// A fight is only its seed, its two classes and the rules' VERSAO (public/stream/duelo-motor.js, linked here as
// ./duelo-motor.js and copied into the zip by CI), so the overlay sends those and who fought, and this plays the fight
// again to know who won: the record is always what the replay shows. A fight under other rules (an overlay still
// running the engine from before a release) is refused, not recorded wrong.
//
// In the table, the item "#duelos" (not a login: "#" never is one): total (fights ever), placar (each login's wins,
// fights and latest name: the ranking) and lutas (the latest LUTAS fights). On each viewer's own item, duelos: their
// wins and fights, by class too, and their latest ULTIMAS fights. The channel's ball (alone in the chat, a viewer
// fights it) is in the ranking's data, shown apart, and has no item.

import { createRequire } from "node:module"

createRequire(import.meta.url)("./duelo-motor.js")
export const Duelo = globalThis.Duelo

export const GERAL = "#duelos"
export const LUTAS = 100
// Kept small: the Σ API scans its table for the audience and the credits, viewers' items and all.
export const ULTIMAS = 10
export const RANKING = 50
// The shortest a fight and its cards take is well over this: two sends closer together are a bug, not two fights.
export const INTERVALO_MIN = 10_000
// The weapon's materials, the Σ ranks' tiers (Rocket League's, as the overlay shows them).
export const MATERIAIS = ["bronze", "silver", "gold", "platinum", "diamond", "champion", "grand-champion", "supersonic-legend"]

const LOGIN = /^[a-z0-9_]{1,25}$/
const linha = (s, max) => [...String(s).replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()
const par = (l) => Array.isArray(l) && l.length === 2

/**
 * The fight the overlay sent, checked and played again: { id, em, versao, semente, classes, sorteadas, logins, nomes,
 * materiais, vencedor (0 or 1), motivo, segundos }. null when it isn't one (a different VERSAO included).
 */
export function luta(corpo, agora = new Date()) {
  const semente = corpo?.semente
  if (!Number.isInteger(semente) || semente < 0 || semente > 0xffffffff || corpo.versao !== Duelo.VERSAO) return null
  const { classes, logins } = corpo
  if (!par(classes) || !classes.every((c) => typeof c === "string" && Object.hasOwn(Duelo.CLASSES, c))) return null
  if (!par(logins) || !logins.every((l) => typeof l === "string" && LOGIN.test(l)) || logins[0] === logins[1]) return null
  const nomes = logins.map((login, i) => {
    const nome = typeof corpo.nomes?.[i] === "string" ? linha(corpo.nomes[i], 25) : ""
    return nome || login
  })
  const sorteadas = logins.map((_, i) => corpo.sorteadas?.[i] !== false)
  const materiais = logins.map((_, i) => (MATERIAIS.includes(corpo.materiais?.[i]) ? corpo.materiais[i] : null))
  const { fim } = Duelo.simular(semente, classes[0], classes[1])
  return {
    id: agora.getTime().toString(36) + semente.toString(36),
    em: agora.toISOString(),
    versao: Duelo.VERSAO,
    semente,
    classes: [...classes],
    sorteadas,
    logins: [...logins],
    nomes,
    materiais,
    vencedor: fim.vencedor,
    motivo: fim.motivo,
    segundos: Math.round(fim.t),
  }
}

/** Whether `l` was sent already: the same seed between the same two, among the latest fights. */
export const repetida = (geral, l) => (geral?.lutas ?? []).some((x) => x.semente === l.semente && x.logins.join() === l.logins.join())

/** Whether `l` came too soon after the latest fight recorded. */
export const cedo = (geral, l) => {
  const ultima = geral?.lutas?.[0]
  return !!ultima && Date.parse(l.em) - Date.parse(ultima.em) < INTERVALO_MIN
}

/** "#duelos" with the fight `l` counted. */
export function anotar(geral, l) {
  const placar = { ...(geral?.placar ?? {}) }
  l.logins.forEach((login, i) => {
    const antes = placar[login] ?? { v: 0, p: 0 }
    placar[login] = { v: antes.v + (l.vencedor === i ? 1 : 0), p: antes.p + 1, nome: l.nomes[i] }
  })
  return { total: (geral?.total ?? 0) + 1, placar, lutas: [l, ...(geral?.lutas ?? [])].slice(0, LUTAS) }
}

/** A viewer's own duelos with the fight `l`, in which they were side `i`. */
export function doViewer(duelos, l, i) {
  const d = duelos ?? {}
  const venceu = l.vencedor === i ? 1 : 0
  const classe = l.classes[i]
  const [v, p] = d.classes?.[classe] ?? [0, 0]
  return {
    v: (d.v ?? 0) + venceu,
    p: (d.p ?? 0) + 1,
    classes: { ...(d.classes ?? {}), [classe]: [v + venceu, p + 1] },
    ultimas: [l, ...(d.ultimas ?? [])].slice(0, ULTIMAS),
  }
}

/** Everyone in the ranking, best first: most wins, then the best rate, then fewer fights, then the login. */
export function ordem(placar, sem) {
  return Object.entries(placar ?? {})
    .filter(([login]) => login !== sem)
    .map(([login, { v, p, nome }]) => ({ login, nome: nome ?? login, vitorias: v, partidas: p }))
    .sort((a, b) => b.vitorias - a.vitorias || b.vitorias / b.partidas - a.vitorias / a.partidas || a.partidas - b.partidas || (a.login < b.login ? -1 : 1))
}

/** GET /duelos: how many fights ever, the ranking's top, the channel's ball apart, and the latest fights. */
export function resumo(geral, canal) {
  const todos = ordem(geral?.placar, canal)
  const c = geral?.placar?.[canal]
  return {
    total: geral?.total ?? 0,
    duelistas: todos.length,
    ranking: todos.slice(0, RANKING),
    canal: c ? { vitorias: c.v, partidas: c.p } : null,
    lutas: (geral?.lutas ?? []).slice(0, 30),
  }
}

/** GET /duelos?login=a: their wins and fights, by class, where they are in the ranking, and their latest fights. */
export function deViewer(login, duelos, geral, canal) {
  const posicao = ordem(geral?.placar, canal).findIndex((x) => x.login === login)
  return {
    login,
    vitorias: duelos?.v ?? 0,
    partidas: duelos?.p ?? 0,
    posicao: posicao < 0 ? null : posicao + 1,
    classes: Object.fromEntries(Object.entries(duelos?.classes ?? {}).map(([c, [v, p]]) => [c, { vitorias: v, partidas: p }])),
    lutas: duelos?.ultimas ?? [],
  }
}

const numero = (n) => n.toLocaleString("pt-BR")

/** The chat bot's !duelo: someone's record in a line. */
export function textoDuelo(nome, d, url) {
  if (!d.partidas) return `${nome} ainda não lutou no duelo. Quem está no chat com a live no ar pode ser sorteado a qualquer hora. Escolha a sua classe: ${url}`
  const taxa = Math.round((d.vitorias / d.partidas) * 100)
  const lugar = d.posicao ? ` · ${d.posicao}º no ranking` : ""
  const vit = d.vitorias === 1 ? "vitória" : "vitórias"
  const par_ = d.partidas === 1 ? "duelo" : "duelos"
  return `${nome}: ${numero(d.vitorias)} ${vit} em ${numero(d.partidas)} ${par_} (${taxa}%)${lugar} · ${url}`
}
