// node --test infra/sigma/corrida.test.mjs: the marble race's records. CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { anotar, cedo, Corrida, corrida, deViewer, doViewer, repetida, resumo } from "./corrida.mjs"

const AGORA = new Date("2026-11-17T21:00:00Z")

test("a race is run again from its seed: the order is the engine's, not the overlay's", () => {
  const c = corrida({ versao: Corrida.VERSAO, semente: 1, logins: ["ana", "bia", "caio", "dudu", "eva"], nomes: ["Ana", "", "Caio  Lima", null], ordem: [4, 3, 2, 1, 0] }, AGORA)
  assert.deepEqual(c.ordem, Corrida.simular(1, 5).ordem)
  assert.deepEqual(c.nomes, ["Ana", "bia", "Caio Lima", "dudu", "eva"])
  assert.ok(c.segundos > 20 && c.segundos < 45)
  assert.equal(corrida({ versao: Corrida.VERSAO + 1, semente: 1, logins: ["ana", "bia"] }, AGORA), null)
  assert.equal(corrida({ versao: Corrida.VERSAO, semente: 1, logins: ["ana"] }, AGORA), null)
  assert.equal(corrida({ versao: Corrida.VERSAO, semente: 1, logins: ["ana", "ana"] }, AGORA), null)
  assert.equal(corrida({ versao: Corrida.VERSAO, semente: -1, logins: ["ana", "bia"] }, AGORA), null)
})

test("wins and podiums for everyone but the channel, each viewer's own record, and the ranking", () => {
  const c = corrida({ versao: Corrida.VERSAO, semente: 7, logins: ["ana", "bia", "caio", "muanlartins"] }, AGORA)
  const geral = anotar(undefined, c, "muanlartins")
  assert.equal(geral.total, 1)
  assert.equal(Object.keys(geral.placar).length, 3)
  const vencedor = c.logins[c.ordem[0]]
  const r = resumo(geral)
  assert.equal(r.corredores, 3)
  if (vencedor !== "muanlartins") assert.equal(r.ranking[0].login, vencedor)
  assert.equal(r.ranking.reduce((s, x) => s + x.podios, 0), c.ordem.slice(0, 3).filter((i) => c.logins[i] !== "muanlartins").length)
  const i = c.logins.indexOf("ana")
  const meu = doViewer(undefined, c, i)
  assert.equal(meu.c, 1)
  assert.equal(meu.melhor, c.ordem.indexOf(i) + 1)
  const d = deViewer("ana", meu, geral)
  assert.equal(d.corridas, 1)
  assert.ok(d.posicao >= 1)
  assert.deepEqual(deViewer("ninguem", undefined, geral), { login: "ninguem", vitorias: 0, podios: 0, corridas: 0, melhor: null, posicao: null, ultimas: [] })
})

test("the same race twice is one, and two races too close together are a bug", () => {
  const c = corrida({ versao: Corrida.VERSAO, semente: 9, logins: ["ana", "bia"] }, AGORA)
  const geral = anotar(undefined, c, "muanlartins")
  assert.equal(repetida(geral, c), true)
  const logo = corrida({ versao: Corrida.VERSAO, semente: 10, logins: ["ana", "bia"] }, new Date(AGORA.getTime() + 5000))
  assert.equal(cedo(geral, logo), true)
  const depois = corrida({ versao: Corrida.VERSAO, semente: 10, logins: ["ana", "bia"] }, new Date(AGORA.getTime() + 60_000))
  assert.equal(cedo(geral, depois), false)
})
