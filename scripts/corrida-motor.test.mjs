// The marble race's engine (public/stream/corrida-motor.js): a race is its seed and how many run, the same anywhere.
// The golden races below pin today's rules: if one changes, the engine changed, so bump its VERSAO (races recorded
// before must still say which rules they ran under) and write the new results here.
//
//   node --test scripts/corrida-motor.test.mjs

import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { test } from "node:test"

createRequire(import.meta.url)("../public/stream/corrida-motor.js")
const Corrida = globalThis.Corrida

// [seed, marbles, steps, the order they crossed]
const DOURADAS = [
  [1, 5, 4092, [4, 1, 2, 0, 3]],
  [7, 12, 4405, [0, 6, 3, 5, 8, 2, 11, 7, 1, 9, 4, 10]],
  [2026, 25, 4745, [4, 2, 12, 18, 17, 10, 15, 11, 9, 8, 0, 22, 24, 19, 5, 20, 7, 6, 21, 3, 13, 14, 1, 23, 16]],
  [42, 2, 3647, [1, 0]],
]

test("the golden races end as they did (rules of VERSAO 1)", () => {
  assert.equal(Corrida.VERSAO, 1)
  for (const [semente, quantos, tiques, ordem] of DOURADAS) {
    const r = Corrida.simular(semente, quantos)
    assert.deepEqual([r.tiques, r.ordem], [tiques, ordem], `seed ${semente}, ${quantos} marbles`)
  }
})

test("every marble crosses, in under a minute, and the leaders take about half a minute", () => {
  for (let semente = 100; semente < 112; semente++) {
    const quantos = [2, 8, 20, 40][semente % 4]
    const r = Corrida.simular(semente, quantos)
    assert.equal(r.ordem.length, quantos)
    assert.equal(new Set(r.ordem).size, quantos)
    assert.ok(r.chegadas.every((t) => t !== null && t < 60 * Corrida.HZ), `seed ${semente}: someone didn't cross`)
    const primeiro = Math.min(...r.chegadas) / Corrida.HZ
    assert.ok(primeiro > 20 && primeiro < 45, `seed ${semente}: the first crossed at ${primeiro.toFixed(1)} s`)
  }
})

test("the track never climbs, so no dip can hold a marble", () => {
  for (let semente = 1; semente < 30; semente++) {
    const { chao } = Corrida.pista(semente)
    for (let i = 1; i < chao.length - 1; i++) assert.ok(chao[i][1] >= chao[i - 1][1] && chao[i][0] >= chao[i - 1][0], `seed ${semente}, vertex ${i}`)
  }
})

test("the order changes on the way: the leader after 5 s doesn't just win", () => {
  // Marbles alike in single file keep the order they leave the start in (98% of races); the lanes and each stretch's
  // luck are what make it a race.
  let ganhou = 0
  const corridas = 16
  for (let k = 0; k < corridas; k++) {
    const c = Corrida.criar(500 + k, 12)
    let lider = null
    while (!c.fim) {
      Corrida.passo(c)
      if (c.tique === 5 * Corrida.HZ) lider = c.bolas.reduce((m, b) => (b.x > m.x ? b : m)).i
    }
    if (c.ordem[0] === lider) ganhou++
  }
  assert.ok(ganhou <= corridas * 0.6, `the leader after 5 s won ${ganhou} of ${corridas}`)
})
