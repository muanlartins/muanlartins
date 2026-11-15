// The ball duel's engine (public/stream/duelo-motor.js): a fight is its seed and two classes, the same anywhere.
// The golden fights below pin today's rules: if one changes, the engine changed, so bump its VERSAO (fights recorded
// before must still say which rules they were fought under) and write the new results here.
//
//   node --test scripts/duelo-motor.test.mjs

import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { test } from "node:test"

createRequire(import.meta.url)("../public/stream/duelo-motor.js")
const Duelo = globalThis.Duelo

// [seed, left, right, winner, how, steps, HP left]
const DOURADAS = [
  [1, "espada", "foice", 0, "nocaute", 4516, [13.734642, 0]],
  [28, "machado", "arco", 0, "nocaute", 4777, [27.021341, 0]],
  [6, "adaga", "lanca", 0, "nocaute", 5218, [30.898682, 0]],
  [99, "arco", "arco", 1, "nocaute", 4855, [0, 48.864789]],
  [2026, "lanca", "machado", 1, "nocaute", 6945, [0, 3.358098]],
  [7, "foice", "adaga", 0, "nocaute", 4181, [70.129969, 0]],
]

test("the golden fights end as they did (rules of VERSAO 1)", () => {
  assert.equal(Duelo.VERSAO, 1)
  for (const [semente, a, b, vencedor, motivo, tiques, hp] of DOURADAS) {
    const luta = Duelo.simular(semente, a, b)
    assert.deepEqual(
      [luta.fim.vencedor, luta.fim.motivo, luta.tique, luta.bolas.map((bola) => Number(bola.hp.toFixed(6)))],
      [vencedor, motivo, tiques, hp],
      `${a} × ${b}, semente ${semente}`,
    )
  }
})

test("the same seed is the same fight, step by step", () => {
  const um = Duelo.criar(424242, "adaga", "arco")
  const outro = Duelo.criar(424242, "adaga", "arco")
  while (!um.fim) {
    Duelo.passo(um)
    Duelo.passo(outro)
    assert.deepEqual(um.bolas.map((b) => [b.x, b.y, b.hp, b.angulo]), outro.bolas.map((b) => [b.x, b.y, b.hp, b.angulo]))
  }
  assert.deepEqual(um.fim, outro.fim)
})

test("every fight ends, within the time limit", () => {
  for (const a of Duelo.IDS) for (const b of Duelo.IDS) {
    const luta = Duelo.simular(a.length * 31 + b.length, a, b)
    assert.ok(luta.fim && luta.fim.t <= Duelo.FIM + Duelo.DT, `${a} × ${b}`)
  }
})

test("its sine is the real one, from + − × ÷ alone", () => {
  for (let x = -20; x < 20; x += 0.01) {
    assert.ok(Math.abs(Duelo.seno(x) - Math.sin(x)) < 1e-10)
    assert.ok(Math.abs(Duelo.cosseno(x) - Math.cos(x)) < 1e-10)
  }
})
