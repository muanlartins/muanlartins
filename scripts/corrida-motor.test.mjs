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
  [1, 5, 4099, [2, 0, 3, 1, 4]],
  [7, 12, 4403, [3, 6, 0, 10, 8, 4, 9, 11, 5, 7, 2, 1]],
  [2026, 25, 4573, [4, 12, 7, 15, 18, 10, 3, 17, 8, 19, 0, 5, 24, 16, 9, 14, 1, 22, 13, 21, 2, 6, 11, 20, 23]],
  [42, 2, 3848, [0, 1]],
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
