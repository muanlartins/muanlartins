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
  [1, 5, 5175, [3, 2, 4, 0, 1]],
  [7, 12, 5706, [6, 4, 2, 0, 5, 8, 1, 10, 3, 11, 7, 9]],
  [2026, 25, 5807, [10, 3, 4, 7, 2, 11, 9, 23, 15, 12, 17, 6, 18, 19, 16, 24, 13, 1, 0, 5, 22, 8, 14, 20, 21]],
  [42, 2, 8442, [1, 0]],
]

test("the golden races end as they did (rules of VERSAO 2, the 3D course)", () => {
  assert.equal(Corrida.VERSAO, 2)
  for (const [semente, quantos, tiques, ordem] of DOURADAS) {
    const r = Corrida.simular(semente, quantos)
    assert.deepEqual([r.tiques, r.ordem], [tiques, ordem], `seed ${semente}, ${quantos} marbles`)
  }
})

test("every race ends: everyone placed, the first across in under a minute and a bit, the rest within the closing time", () => {
  for (let semente = 100; semente < 112; semente++) {
    const quantos = [2, 8, 20, 40][semente % 4]
    const r = Corrida.simular(semente, quantos)
    assert.equal(r.ordem.length, quantos)
    assert.equal(new Set(r.ordem).size, quantos)
    const cruzaram = r.chegadas.filter((t) => t !== null)
    assert.ok(cruzaram.length >= 1, `seed ${semente}: nobody crossed`)
    const primeiro = Math.min(...cruzaram) / Corrida.HZ
    assert.ok(primeiro > 20 && primeiro < 75, `seed ${semente}: the first crossed at ${primeiro.toFixed(1)} s`)
    assert.ok(r.tiques <= Math.min(Corrida.LIMITE, Math.min(...cruzaram) + Corrida.FECHA), `seed ${semente}: ran ${r.tiques} steps`)
  }
})

test("the course goes forwards and never steps up into a marble's way between modules", () => {
  for (let semente = 1; semente < 40; semente++) {
    const { modulos, chegada } = Corrida.pista(semente, 20)
    for (let i = 1; i < modulos.length; i++) {
      assert.ok(modulos[i].x0 >= modulos[i - 1].x0, `seed ${semente}, module ${i}`)
      assert.ok(modulos[i].y0 <= modulos[i - 1].y1 + 1e-9, `seed ${semente}: ${modulos[i].tipo} starts above where ${modulos[i - 1].tipo} ends`)
    }
    assert.ok(chegada > modulos.at(-2).x1, `seed ${semente}`)
  }
})

test("the order changes on the way: the leader after 8 s doesn't just win", () => {
  let ganhou = 0
  const corridas = 12
  for (let k = 0; k < corridas; k++) {
    const c = Corrida.criar(500 + k, 12)
    let lider = null
    while (!c.fim) {
      Corrida.passo(c)
      if (c.tique === 8 * Corrida.HZ) lider = c.bolas.reduce((m, b) => (b.x > m.x ? b : m)).i
    }
    if (c.ordem[0] === lider) ganhou++
  }
  assert.ok(ganhou <= corridas * 0.5, `the leader after 8 s won ${ganhou} of ${corridas}`)
})
