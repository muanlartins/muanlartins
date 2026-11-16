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
  [1, "espada", "foice", 0, "nocaute", 3646, [49.6, 0]],
  [28, "machado", "arco", 1, "nocaute", 3557, [0, 10.56]],
  [6, "adaga", "lanca", 1, "nocaute", 4735, [0, 80.02]],
  [99, "arco", "arco", 0, "nocaute", 2982, [26.4, 0]],
  [2026, "punho", "clava", 1, "nocaute", 4036, [0, 51.338756]],
  [7, "katana", "martelo", 0, "nocaute", 4742, [11.024319, 0]],
  [15, "clava", "adaga", 1, "nocaute", 6527, [0, 51.28]],
  [42, "foice", "punho", 1, "nocaute", 5088, [0, 60.4]],
]

test("the golden fights end as they did (rules of VERSAO 2)", () => {
  assert.equal(Duelo.VERSAO, 2)
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
  const um = Duelo.criar(424242, "clava", "punho")
  const outro = Duelo.criar(424242, "clava", "punho")
  while (!um.fim) {
    Duelo.passo(um)
    Duelo.passo(outro)
    assert.deepEqual(um.bolas.map((b) => [b.x, b.y, b.hp, b.angulo, b.atordoadoAte]), outro.bolas.map((b) => [b.x, b.y, b.hp, b.angulo, b.atordoadoAte]))
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

test("each ability does what it says", () => {
  // Fights long enough for every class to have grown: its counter moved from where it started.
  for (const id of Duelo.IDS) {
    const luta = Duelo.criar(77, id, id === "espada" ? "adaga" : "espada")
    const antes = Duelo.contador(luta.bolas[0], luta)
    while (!luta.fim && luta.bolas[0].acertos < 4) Duelo.passo(luta)
    assert.ok(luta.bolas[0].acertos >= 4, `${id} hit 4 times`)
    if (id !== "foice") assert.notEqual(Duelo.contador(luta.bolas[0], luta), antes, `${id}: ${antes}`)
  }
  // Poison never goes past 5, a stun stops the ball and its weapon.
  const veneno = Duelo.simular(3, "foice", "espada")
  assert.ok(veneno.bolas[1].envenenado <= 5)
  const luta = Duelo.criar(5, "clava", "espada")
  while (!luta.fim && !Duelo.parada(luta, luta.bolas[1])) Duelo.passo(luta)
  const [x, y, angulo] = [luta.bolas[1].x, luta.bolas[1].y, luta.bolas[1].angulo]
  Duelo.passo(luta)
  assert.deepEqual([luta.bolas[1].x, luta.bolas[1].y, luta.bolas[1].angulo], [x, y, angulo])
})

test("the balls fall: gravity, and the floor throws them back up", () => {
  const luta = Duelo.criar(9, "espada", "espada")
  const vy = luta.bolas[0].vy
  Duelo.passo(luta)
  assert.ok(Math.abs(luta.bolas[0].vy - (vy + Duelo.GRAVIDADE * Duelo.DT)) < 1e-9)
  let quicou = false
  while (!luta.fim && luta.t < 10) {
    const antes = luta.bolas[0].vy
    Duelo.passo(luta)
    if (antes > 0 && luta.bolas[0].vy < 0 && luta.bolas[0].y + luta.bolas[0].r >= luta.paredes.y1 - 1) quicou = true
  }
  assert.ok(quicou)
})
