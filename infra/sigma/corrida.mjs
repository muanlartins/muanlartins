// The marble race's records: the overlay (public/stream/corrida.html) sends each race that ends while the stream is on
// (POST /corrida, with the key) and this keeps the score, apart from DynamoDB so a test can run it (corrida.test.mjs);
// index.mjs gives it the table.
//
// A race is only its seed, how many ran and the rules' VERSAO (public/stream/corrida-motor.js, linked here as
// ./corrida-motor.js and copied into the zip by CI), so the overlay sends those and who ran, in the order it gave the
// engine, and this runs the race again to know the order they crossed: the record is always what the race was. A race
// under other rules (an overlay from before a release) is refused, not recorded wrong.
//
// In the table, the item "#corridas" ("#" is never in a login): total (races ever), placar (each login's wins,
// podiums, races and latest name: the ranking) and ultimas (the latest races). On each viewer's own item, corridas:
// their wins, podiums, races, best place and latest few. The channel's marble (it races whoever is alone in the chat)
// is in no ranking and has no record. Worth nothing else: no Σ, no crown (Luan, 2026-11-17).

import { createRequire } from "node:module"

createRequire(import.meta.url)("./corrida-motor.js")
export const Corrida = globalThis.Corrida

export const GERAL = "#corridas"
export const ULTIMAS_GERAL = 30
export const ULTIMAS = 10
export const RANKING = 50
export const MAX = 40
// A race and its podium take well over this: two sends closer together are a bug, not two races.
export const INTERVALO_MIN = 20_000

const LOGIN = /^[a-z0-9_]{1,25}$/
const linha = (s, max) => [...String(s).replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()

/**
 * The race the overlay sent, checked and run again: { id, em, versao, semente, logins, nomes, ordem (indices into
 * logins, first to cross first), segundos (the winner's) }. null when it isn't one (a different VERSAO included).
 */
export function corrida(corpo, agora = new Date()) {
  const semente = corpo?.semente
  if (!Number.isInteger(semente) || semente < 0 || semente > 0xffffffff || corpo.versao !== Corrida.VERSAO) return null
  const logins = corpo.logins
  if (!Array.isArray(logins) || logins.length < 2 || logins.length > MAX) return null
  if (!logins.every((l) => typeof l === "string" && LOGIN.test(l)) || new Set(logins).size !== logins.length) return null
  const nomes = logins.map((login, i) => (typeof corpo.nomes?.[i] === "string" ? linha(corpo.nomes[i], 25) : "") || login)
  const { ordem, chegadas } = Corrida.simular(semente, logins.length)
  return {
    id: agora.getTime().toString(36) + semente.toString(36),
    em: agora.toISOString(),
    versao: Corrida.VERSAO,
    semente,
    logins: [...logins],
    nomes,
    ordem,
    segundos: Math.round(chegadas[ordem[0]] / Corrida.HZ),
  }
}

/** Whether `c` was sent already: the same seed with the same people, among the latest races. */
export const repetida = (geral, c) => (geral?.ultimas ?? []).some((x) => x.semente === c.semente && x.logins.join() === c.logins.join())

/** Whether `c` came too soon after the latest race recorded. */
export const cedo = (geral, c) => {
  const ultima = geral?.ultimas?.[0]
  return !!ultima && Date.parse(c.em) - Date.parse(ultima.em) < INTERVALO_MIN
}

/** Where login `i` of race `c` finished: 1 for the winner. */
export const posicaoDe = (c, i) => c.ordem.indexOf(i) + 1

/** "#corridas" with race `c` counted (the channel's marble left out). */
export function anotar(geral, c, canal) {
  const placar = { ...(geral?.placar ?? {}) }
  c.logins.forEach((login, i) => {
    if (login === canal) return
    const lugar = posicaoDe(c, i)
    const antes = placar[login] ?? { v: 0, p: 0, c: 0 }
    placar[login] = { v: antes.v + (lugar === 1 ? 1 : 0), p: antes.p + (lugar <= 3 ? 1 : 0), c: antes.c + 1, nome: c.nomes[i] }
  })
  return { total: (geral?.total ?? 0) + 1, placar, ultimas: [c, ...(geral?.ultimas ?? [])].slice(0, ULTIMAS_GERAL) }
}

/** A viewer's own corridas with race `c`, in which they were login `i`. */
export function doViewer(corridas, c, i) {
  const d = corridas ?? {}
  const lugar = posicaoDe(c, i)
  return {
    v: (d.v ?? 0) + (lugar === 1 ? 1 : 0),
    p: (d.p ?? 0) + (lugar <= 3 ? 1 : 0),
    c: (d.c ?? 0) + 1,
    melhor: Math.min(d.melhor ?? Infinity, lugar),
    ultimas: [{ id: c.id, em: c.em, lugar, de: c.logins.length }, ...(d.ultimas ?? [])].slice(0, ULTIMAS),
  }
}

/** Everyone in the ranking, best first: most wins, then podiums, then fewer races, then the login. */
export function classificacao(placar) {
  return Object.entries(placar ?? {})
    .map(([login, { v, p, c, nome }]) => ({ login, nome: nome ?? login, vitorias: v, podios: p, corridas: c }))
    .sort((a, b) => b.vitorias - a.vitorias || b.podios - a.podios || a.corridas - b.corridas || (a.login < b.login ? -1 : 1))
}

/** A race as the site shows it: who ran, the podium's names first. */
const publica = (c) => ({ id: c.id, em: c.em, versao: c.versao, semente: c.semente, logins: c.logins, nomes: c.nomes, ordem: c.ordem, segundos: c.segundos })

/** GET /corridas: how many races ever, the ranking's top and the latest races. */
export function resumo(geral) {
  const todos = classificacao(geral?.placar)
  return { total: geral?.total ?? 0, corredores: todos.length, ranking: todos.slice(0, RANKING), ultimas: (geral?.ultimas ?? []).map(publica) }
}

/** GET /corridas?login=a: their wins, podiums and races, their best place, where they are in the ranking, their latest. */
export function deViewer(login, corridas, geral) {
  const posicao = classificacao(geral?.placar).findIndex((x) => x.login === login)
  return {
    login,
    vitorias: corridas?.v ?? 0,
    podios: corridas?.p ?? 0,
    corridas: corridas?.c ?? 0,
    melhor: corridas?.melhor ?? null,
    posicao: posicao < 0 ? null : posicao + 1,
    ultimas: corridas?.ultimas ?? [],
  }
}
