// node --test infra/sigma/dedicatorias.test.mjs: the stand's dedications kept for each viewer. CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { anotarDedicatoria, dedicatoria, DEDICATORIAS_MAX } from "./dedicatorias.mjs"

const AGORA = Date.parse("2026-11-17T20:30:00Z")

test("a dedication is checked: the login, the kind, the moment and the detail", () => {
  assert.deepEqual(dedicatoria({ id: AGORA - 1000, login: "Fulano", tipo: "gol", detalhe: " 124 ", jogo: "rocket-league" }, AGORA), {
    id: AGORA - 1000,
    login: "fulano",
    tipo: "gol",
    detalhe: "124",
    jogo: "rocket-league",
    em: new Date(AGORA - 1000).toISOString(),
  })
  assert.equal(dedicatoria({ id: AGORA, login: "a b", tipo: "gol" }, AGORA), null)
  assert.equal(dedicatoria({ id: AGORA, login: "fulano", tipo: "assist" }, AGORA), null)
  assert.equal(dedicatoria({ id: AGORA - 2 * 86_400_000, login: "fulano", tipo: "gol" }, AGORA), null)
  assert.equal(dedicatoria({ id: AGORA, login: "fulano", tipo: "vitoria", jogo: "Valorant!" }, AGORA).jogo, null)
})

test("each moment once, newest first, up to the cap", () => {
  const d = dedicatoria({ id: AGORA, login: "fulano", tipo: "gol" }, AGORA)
  const lista = anotarDedicatoria(undefined, d)
  assert.deepEqual(lista, [{ id: AGORA, tipo: "gol", detalhe: null, jogo: null, em: d.em }])
  assert.equal(anotarDedicatoria(lista, d), null)
  let cheia = lista
  for (let i = 1; i <= DEDICATORIAS_MAX + 5; i++) cheia = anotarDedicatoria(cheia, dedicatoria({ id: AGORA + i, login: "fulano", tipo: "gol" }, AGORA + i))
  assert.equal(cheia.length, DEDICATORIAS_MAX)
  assert.equal(cheia[0].id, AGORA + DEDICATORIAS_MAX + 5)
})
