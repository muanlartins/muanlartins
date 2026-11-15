// node --test infra/sigma/texto.test.mjs: the chat bot's !sigma line (texto.mjs). CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { Sigma, textoSigma } from "./texto.mjs"

test("sigma.js runs here as in the browser: the same ranks", () => {
  assert.equal(Sigma.ranque(0).nome, "Bronze I")
  assert.equal(Sigma.ranque(400).nome, "Ouro I")
  assert.equal(Sigma.ranque(25000).nome, "Lenda Supersônica")
})

test("a line with their Σ, rank, the way to the next one and their lives", () => {
  assert.equal(textoSigma("Rafa", { sigma: 1234, lives: 12, sequencia: 3 }), "Rafa: 1.234 Σ · Platina II (faltam 316 pra Platina III) · 12 lives, 3 seguidas")
  assert.equal(textoSigma("ceci", { sigma: 11, lives: 1, sequencia: 1 }), "ceci: 11 Σ · Bronze I (faltam 19 pra Bronze II) · 1 live")
  // The top rank has no next one.
  assert.equal(textoSigma("velho", { sigma: 20500, lives: 300, sequencia: 0 }), "velho: 20.500 Σ · Lenda Supersônica · 300 lives")
})

test("someone who never watched gets how Σ come", () => {
  assert.match(textoSigma("novo", undefined), /^novo ainda não tem Σ\. .*1 Σ por minuto/)
  assert.match(textoSigma("novo", { sigma: 0, lives: 0 }), /^novo ainda não tem Σ/)
})

test("the line fits StreamElements' 400 bytes", () => {
  const nome = "a".repeat(25)
  for (const t of [textoSigma(nome, { sigma: 19999, lives: 9999, sequencia: 999 }), textoSigma(nome)]) assert.ok(Buffer.byteLength(t) < 400, t)
})
