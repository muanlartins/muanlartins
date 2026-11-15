// node --test infra/sigma/duelo.test.mjs: the duel's records (duelo.mjs). CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { anotar, cedo, deViewer, doViewer, Duelo, LUTAS, luta, MATERIAIS, ordem, repetida, resumo, textoDuelo, ULTIMAS } from "./duelo.mjs"

const EM = new Date("2026-11-20T23:00:00Z")
const enviada = (extra = {}) => ({ versao: Duelo.VERSAO, semente: 28, classes: ["machado", "arco"], logins: ["fulano", "ciclana"], nomes: ["Fulano", "  ciclana "], sorteadas: [false, true], materiais: ["gold", "lixo"], ...extra })

test("a fight is played again here: the winner is the engine's, not the sender's", () => {
  const l = luta({ ...enviada(), vencedor: 1 }, EM)
  const fim = Duelo.simular(28, "machado", "arco").fim
  assert.equal(l.vencedor, fim.vencedor)
  assert.equal(l.motivo, fim.motivo)
  assert.equal(l.segundos, Math.round(fim.t))
  assert.deepEqual(l.nomes, ["Fulano", "ciclana"])
  assert.deepEqual(l.sorteadas, [false, true])
  assert.deepEqual(l.materiais, ["gold", null])
  assert.equal(l.em, EM.toISOString())
  assert.ok(MATERIAIS.includes("supersonic-legend"))
})

test("anything that isn't a fight under today's rules is refused", () => {
  assert.equal(luta(enviada({ versao: Duelo.VERSAO + 1 }), EM), null)
  assert.equal(luta(enviada({ semente: -1 }), EM), null)
  assert.equal(luta(enviada({ semente: 1.5 }), EM), null)
  assert.equal(luta(enviada({ semente: 2 ** 32 }), EM), null)
  assert.equal(luta(enviada({ classes: ["machado", "bazuca"] }), EM), null)
  assert.equal(luta(enviada({ classes: ["machado"] }), EM), null)
  assert.equal(luta(enviada({ classes: ["machado", "toString"] }), EM), null)
  assert.equal(luta(enviada({ logins: ["fulano", "fulano"] }), EM), null)
  assert.equal(luta(enviada({ logins: ["fulano", "Fu Lano"] }), EM), null)
  assert.equal(luta(null, EM), null)
  // A name left out is the login.
  assert.deepEqual(luta(enviada({ nomes: undefined }), EM).nomes, ["fulano", "ciclana"])
})

test("the score: the ranking, both viewers' own records, the latest fights", () => {
  const a = luta(enviada(), EM)
  let geral = anotar(null, a)
  const quem = a.logins[a.vencedor]
  const outro = a.logins[1 - a.vencedor]
  assert.equal(geral.total, 1)
  assert.deepEqual(geral.placar[quem], { v: 1, p: 1, nome: a.nomes[a.vencedor] })
  assert.deepEqual(geral.placar[outro], { v: 0, p: 1, nome: a.nomes[1 - a.vencedor] })

  // The same fight again, or one too soon after, isn't counted (index.mjs answers without writing).
  assert.equal(repetida(geral, a), true)
  const b = luta(enviada({ semente: 6, classes: ["adaga", "lanca"], logins: ["beltrano", "fulano"] }), new Date(EM.getTime() + 5000))
  assert.equal(repetida(geral, b), false)
  assert.equal(cedo(geral, b), true)
  const c = luta(enviada({ semente: 6, classes: ["adaga", "lanca"], logins: ["beltrano", "fulano"] }), new Date(EM.getTime() + 60_000))
  assert.equal(cedo(geral, c), false)
  geral = anotar(geral, c)
  assert.equal(geral.total, 2)
  assert.equal(geral.lutas[0], c)
  assert.equal(geral.placar.fulano.p, 2)

  let meu = doViewer(undefined, a, 0)
  meu = doViewer(meu, c, 1)
  assert.equal(meu.p, 2)
  assert.deepEqual(meu.classes.machado, [a.vencedor === 0 ? 1 : 0, 1])
  assert.deepEqual(meu.classes.lanca, [c.vencedor === 1 ? 1 : 0, 1])
  assert.deepEqual(meu.ultimas, [c, a])
  const visto = deViewer("fulano", meu, geral, "muanlartins")
  assert.equal(visto.partidas, 2)
  assert.equal(visto.lutas.length, 2)
  assert.ok(visto.posicao >= 1)
  assert.deepEqual(deViewer("ninguem", undefined, geral, "muanlartins"), { login: "ninguem", vitorias: 0, partidas: 0, posicao: null, classes: {}, lutas: [] })
})

test("only the latest fights are kept, here and on each viewer", () => {
  let geral = null
  let meu
  for (let n = 0; n < LUTAS + 5; n++) {
    const l = luta(enviada({ semente: n }), new Date(EM.getTime() + n * 60_000))
    geral = anotar(geral, l)
    meu = doViewer(meu, l, 0)
  }
  assert.equal(geral.total, LUTAS + 5)
  assert.equal(geral.lutas.length, LUTAS)
  assert.equal(geral.lutas[0].semente, LUTAS + 4)
  assert.equal(meu.ultimas.length, ULTIMAS)
  assert.equal(meu.p, LUTAS + 5)
})

test("the ranking: wins, then the rate, then fewer fights; the channel's ball apart", () => {
  const placar = { a: { v: 3, p: 10 }, b: { v: 3, p: 4 }, c: { v: 5, p: 20 }, d: { v: 3, p: 4 }, muanlartins: { v: 9, p: 9 } }
  assert.deepEqual(ordem(placar, "muanlartins").map((x) => x.login), ["c", "b", "d", "a"])
  const r = resumo({ total: 12, placar, lutas: [] }, "muanlartins")
  assert.deepEqual(r.canal, { vitorias: 9, partidas: 9 })
  assert.equal(r.duelistas, 4)
  assert.equal(r.ranking[0].nome, "c")
  assert.deepEqual(resumo(undefined, "muanlartins"), { total: 0, duelistas: 0, ranking: [], canal: null, lutas: [] })
})

test("!duelo says someone's record in a line", () => {
  const url = "muanlartins.com.br/canal/minijogos"
  assert.match(textoDuelo("Fulano", { vitorias: 0, partidas: 0, posicao: null }, url), /ainda não lutou/)
  assert.equal(textoDuelo("Fulano", { vitorias: 12, partidas: 30, posicao: 4 }, url), `Fulano: 12 vitórias em 30 duelos (40%) · 4º no ranking · ${url}`)
  assert.equal(textoDuelo("Fulano", { vitorias: 1, partidas: 1, posicao: 1 }, url), `Fulano: 1 vitória em 1 duelo (100%) · 1º no ranking · ${url}`)
})
