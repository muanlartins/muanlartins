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

// [seed, marbles, steps, the order they crossed], a race on each map
const DOURADAS = [
  [1, 5, 5010, [2, 1, 4, 0, 3]], // classica
  [7, 12, 5920, [0, 5, 1, 9, 6, 7, 4, 11, 10, 3, 2, 8]], // fliperama
  [2026, 25, 7426, [8, 9, 2, 14, 17, 0, 16, 1, 10, 20, 23, 15, 21, 13, 12, 24, 18, 11, 5, 6, 4, 3, 22, 7, 19]], // fabrica
  [42, 2, 4331, [1, 0]], // fliperama
  [3, 9, 6296, [4, 3, 1, 0, 5, 6, 2, 8, 7]], // templo
]

test("the golden races end as they did (rules of VERSAO 3: the maps, the course's pockets gone)", () => {
  assert.equal(Corrida.VERSAO, 3)
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

test("the course goes forwards and never steps up into a marble's way between modules, on every map", () => {
  for (const mapa of Object.keys(Corrida.MAPAS)) for (let semente = 1; semente < 25; semente++) {
    const { modulos, chegada } = Corrida.pista(semente, 20, mapa)
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

test("the seed draws every map", () => {
  const vistos = new Set()
  for (let semente = 0; semente < 200; semente++) vistos.add(Corrida.mapaDe(semente))
  assert.deepEqual([...vistos].sort(), Object.keys(Corrida.MAPAS).sort())
})

// A pocket (a peg under the next module's slanting walls, a bumper by a wall, a post dead on the middle line) holds a
// marble until the engine lifts it out: each was found by counting those lifts, module by module.
test("no module holds marbles: on every map, hardly a stuck marble needs lifting out", () => {
  for (const mapa of Object.keys(Corrida.MAPAS)) {
    const presos = {}
    for (const semente of [11, 12, 13]) {
      const c = Corrida.criar(semente, 20, mapa)
      while (!c.fim) {
        const antes = c.bolas.map((b) => b.parado)
        Corrida.passo(c)
        c.bolas.forEach((b, i) => {
          if (antes[i] > Corrida.HZ && b.parado === 0 && !b.espera) {
            const tipo = c.pista.modulos[b.modulo].tipo
            presos[tipo] = (presos[tipo] ?? 0) + 1
          }
        })
      }
    }
    for (const [tipo, n] of Object.entries(presos)) assert.ok(n <= 3, `${mapa}: ${n} marbles lifted out of ${tipo} in 3 races`)
  }
})
