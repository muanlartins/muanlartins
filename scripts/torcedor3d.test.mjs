// The 3D fan's shared module (public/stream/torcedor3d/): the schema's rules, the share code, what it wears and the
// 2D fan turned 3D. The golden codes pin the prototype's (2026-11-23): a saved look or a code made then must read
// and come out the same, so a change that moves them is a change to everyone's fan. The 2D fan's lists live twice
// until it's retired (torcedor.js and here): the drift tests run torcedor.js itself and compare.
//
//   node --test scripts/torcedor3d.test.mjs

import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import * as E from "../public/stream/torcedor3d/esquema.js"
import { doAntigo, normalizar2D, padrao2D, torcedorDe } from "../public/stream/torcedor3d/antigo.js"
import { camisa2D, clube, comTime, natal, TIMES, TOUCA, vestir } from "../public/stream/torcedor3d/vestir.js"

const { normalizar, enxugar, codigo, lerCodigo, sortear, MODELOS, CAMPOS } = E
const sha = (linhas) => createHash("sha256").update(linhas.join("\n")).digest("hex")
const contexto = { window: {} }
vm.runInNewContext(readFileSync(new URL("../public/stream/torcedor.js", import.meta.url), "utf8"), contexto)
const T2 = contexto.window.Torcedor
// Through JSON, as a look comes from a profile or a code (and as torcedor.js's objects, made in another context, compare).
const comoJson = (x) => JSON.parse(JSON.stringify(x))

test("the prototype's codes: the presets and the dice give the very same codes", () => {
  assert.equal(
    codigo(normalizar(MODELOS[0][1])),
    "T1:eyJib2NhIjoiYWJlcnRhIiwicGludCI6ImZhaXhhcyIsImZyYW5qYSI6Im1lY2hhcyIsInJvdXBhIjoiZmFpeGEiLCJudW1PbiI6dHJ1ZSwibnVtZXJvIjoxMiwibnVtVCI6MC44LCJudW1ZIjowLjEsInNvYnJlIjoiamFxdWV0YSIsInNvYnJlQyI6IiMwMDE0NDciLCJzb2JyZUJvIjp0cnVlLCJzb2JyZUIiOiIjODVhN2ZmIiwiY2hhcGV1IjoiYm9uZSIsIm1hbyI6ImJhbmRlaXJhIiwibWFvQyI6IiM4NWE3ZmYifQ",
  )
  assert.equal(MODELOS.length, 14)
  assert.equal(sha(MODELOS.map(([, l]) => codigo(normalizar(l)))), "d3b3e471382fa46be0345d4fb3aa26adaf37cc16d4a95ce2eeb1fd85562e5303")
  assert.equal(sha(Array.from({ length: 100 }, (_, s) => codigo(sortear(s * 7919 + 13)))), "ed09f2e9d1d553d87f1b26b136bd7663719d6bb0dc96f387a92f4a59dea40a84")
})

test("normalizar: anything in, a whole look out; defaults where it's wrong, numbers kept to their range", () => {
  const padrao = normalizar(null)
  for (const lixo of [undefined, 3, "afro", [], true]) assert.deepEqual(normalizar(lixo), padrao)
  for (const c of CAMPOS) assert.equal(padrao[c.k], c.padrao, c.k)
  assert.deepEqual([padrao.pecas, padrao.desenhos, padrao.mechas], [[], [], []])
  assert.deepEqual([padrao.time, padrao.frase, padrao.stickers], ["", "", { gol: ["🎉"], contra: ["😭"] }])
  assert.deepEqual(enxugar(padrao), {})

  const a = normalizar({ ...JSON.parse('{ "__proto__": { "topo": "afro" } }'), pele: "red", cabC: "#FF5C9A", larg: 9, alt: -9, olhoT: 1.23456, espN: 7.6, olho: "Grande", cilios: 1, sardas: true, nada: 1 })
  assert.equal(a.pele, "#e9b48a")
  assert.equal(a.cabC, "#ff5c9a")
  assert.deepEqual([a.larg, a.alt, a.olhoT, a.espN], [1.25, 0.78, 1.235, 8])
  assert.deepEqual([a.olho, a.cilios, a.sardas, a.topo], ["oval", false, true, "curto"])
  assert.equal("nada" in a, false)
  assert.equal(Object.hasOwn(a, "__proto__"), false)
  assert.deepEqual(normalizar(a), a)

  const listas = normalizar({ pecas: [...Array(20).fill({ f: "cone", x: 99 }), "x"], desenhos: "x", mechas: [null, { l: -5 }] })
  assert.equal(listas.pecas.length, E.PECAS_MAX)
  assert.equal(listas.pecas[0].x, 1.6)
  assert.deepEqual(listas.desenhos, [])
  assert.equal(listas.mechas[1].l, 0.1)
})

test("the stand's own fields: team and frase trimmed as the 2D fan does, stickers single emoji, three at most", () => {
  const a = normalizar({ time: `  Grêmio   ${"x".repeat(40)}`, frase: "  bora   luan\n", stickers: { gol: ["🔥", "ab", "👨🏽‍🚀", "🎉", "⚽"], contra: "😭" } })
  assert.equal(a.time, `Grêmio ${"x".repeat(17)}`)
  assert.equal(a.frase, "bora luan")
  assert.deepEqual(a.stickers, { gol: ["🔥", "👨🏽‍🚀", "🎉"], contra: ["😭"] })
  assert.deepEqual(normalizar({ stickers: { gol: [] } }).stickers, { gol: [], contra: ["😭"] })
  assert.deepEqual(enxugar(normalizar({ stickers: { gol: ["🎉"], contra: ["😭"] } })), {})
  for (const texto of ["  a  b ", "x".repeat(40), " 🏆🏆 ", "São\tPaulo  FC"]) {
    assert.equal(normalizar({ frase: texto }).frase, T2.normalizar({ frase: texto }).frase)
    assert.equal(normalizar({ time: texto }).time, T2.normalizar({ time: texto }).time)
  }
})

test("the code: round trips any look, UTF-8 included, and refuses what isn't one", () => {
  const looks = [...MODELOS.map(([, l]) => l), ...Array.from({ length: 30 }, (_, s) => sortear(s)), { time: "São Paulo", frase: "Bora, Luan! 🏆", stickers: { gol: ["🔥"], contra: [] } }]
  // Through JSON: the dice may draw a -0, which a code (JSON) writes as 0.
  for (const l of looks) {
    const a = comoJson(normalizar(l))
    assert.deepEqual(lerCodigo(codigo(a)), a)
    assert.deepEqual(lerCodigo(`  ${codigo(a)}\n`), a)
  }
  for (const ruim of ["", "T1:", "T2:eyJ9", "T1:!!!!", "T1:bm9wZQ", `T1:${"A".repeat(E.CODIGO_MAX)}`, "eyJ0b3BvIjoiYWZybyJ9"]) assert.equal(lerCodigo(ruim), null, ruim)
  // A code of something that isn't a look still reads as a look (the default).
  assert.deepEqual(lerCodigo("T1:WzEsMl0"), normalizar(null))
})

test("bananeira: the 2D handstand is a celebration, but the dice keep to the first five", () => {
  assert.equal(normalizar({ fes: "bananeira" }).fes, "bananeira")
  const dados = new Set(Array.from({ length: 300 }, (_, s) => sortear(s).fes))
  assert.deepEqual([...dados].sort(), ["acena", "danca", "gira", "palmas", "pula"])
})

test("drift: the 2D fan's clubs, defaults, rules and December are torcedor.js's", () => {
  assert.deepEqual(comoJson(TIMES), comoJson(T2.TIMES))
  for (let i = 0; i < 300; i++) {
    const login = i ? `alguem_${i}_${(i * 7919).toString(36)}` : ""
    assert.deepEqual(comoJson(padrao2D(login)), comoJson(T2.padrao(login)), login)
  }
  const salvos = [
    null, 3, {}, { cor: "#FF0000", detalhe: "red", terceira: "#00ff00", cabeca: "hexagono", roupa: "faixa-dupla", acessorio: "cartola", comemoracao: "bananeira" },
    { numero: 99, frase: `  oi   ${"z".repeat(50)}`, time: "  Vasco  ", stickers: { gol: ["🔥", "x", "⚽", "🎉", "💙"], contra: "😭" } },
    { numero: 100, cabeca: "x", roupa: "numero", acessorio: "apito", comemoracao: "palmas" },
  ]
  for (const s of salvos) for (const login of ["", "fulano", "beltrana_99"]) assert.deepEqual(comoJson(normalizar2D(s, login)), comoJson(T2.normalizar(s, login)))
  // Every 2D option is one here too, and nothing more.
  for (const [lista, k] of [["CABECAS", "cabeca"], ["ROUPAS", "roupa"], ["ACESSORIOS", "acessorio"], ["COMEMORACOES", "comemoracao"]]) {
    for (const v of T2[lista]) assert.equal(normalizar2D({ [k]: v }, "x")[k], v, `${k} ${v}`)
    assert.equal(normalizar2D({ [k]: "outro" }, "x")[k], T2.padrao("x")[k])
  }
  for (const c of T2.CORES) assert.equal(normalizar2D({ cor: c }).cor, c)
  for (const dia of ["2026-11-30T23:30:00-03:00", "2026-12-01T00:00:00-03:00", "2026-12-31T23:59:00-03:00", "2027-01-01T01:00:00Z", "2027-01-01T03:00:00Z"])
    assert.equal(natal(Date.parse(dia)), T2.natal(Date.parse(dia)), dia)
})

test("doAntigo: the same 3D fan for the same login and 2D fan, pinned", () => {
  const logins = Array.from({ length: 40 }, (_, i) => `teste_${i}`)
  const salvos = [
    { cabeca: "triangulo", roupa: "numero", numero: 7, acessorio: "coroa", comemoracao: "bananeira", cor: "#FF5C9A", detalhe: "#ffd23f", frase: "bora", stickers: { gol: ["🔥"], contra: [] }, time: "Vasco" },
    { roupa: "faixa-dupla", acessorio: "fone", cor: "#c792ea", detalhe: "#3ddc97", terceira: "#ff9f43" },
    { cabeca: "hexagono", roupa: "gola", acessorio: "oculos" },
  ]
  const codes = [...logins.map((l) => codigo(doAntigo(null, l))), ...salvos.flatMap((s) => logins.slice(0, 5).map((l) => codigo(doAntigo(s, l))))]
  assert.equal(sha(codes), "fbed49864664ded20729847ef976db78e251e94172f6fb6d041d599ad204109a")
  assert.deepEqual(doAntigo(null, "teste_0"), doAntigo(undefined, "teste_0"))
  assert.deepEqual(doAntigo(salvos[0], "x"), doAntigo(comoJson(salvos[0]), "x"))
})

test("doAntigo: what they chose in 2D is kept; the rest is a person, and people differ", () => {
  const salvo = { cabeca: "triangulo", roupa: "numero", numero: 7, acessorio: "coroa", comemoracao: "bananeira", cor: "#FF5C9A", detalhe: "#ffd23f", terceira: "#4dd4ff", frase: " bora ", stickers: { gol: ["🔥"], contra: [] }, time: "Vasco" }
  const a = doAntigo(salvo, "fulano")
  assert.deepEqual(a, normalizar(a))
  assert.deepEqual([a.cor, a.detalhe, a.roupa, a.numOn, a.numero, a.numC], ["#ff5c9a", "#ffd23f", "lisa", true, 7, "#ffd23f"])
  assert.deepEqual([a.chapeu, a.chapC, a.fes, a.time, a.frase, a.stickers], ["coroa", "#ffd23f", "bananeira", "Vasco", "bora", { gol: ["🔥"], contra: [] }])
  assert.ok(a.testa < 0 && a.queixo > 0)
  // Every 2D pattern and accessory turns into something.
  for (const roupa of T2.ROUPAS) for (const acessorio of T2.ACESSORIOS) {
    const b = doAntigo({ roupa, acessorio, cor: "#ff0000", detalhe: "#00ff00", terceira: "#0000ff" }, "x")
    assert.deepEqual(b, normalizar(b))
    assert.equal(b.cor, "#ff0000")
  }
  assert.equal(doAntigo({ roupa: "tricolor", cor: "#ff0000", detalhe: "#00ff00", terceira: "#0000ff" }, "x").terceira, "#0000ff")
  assert.equal(doAntigo({ acessorio: "oculos" }, "x").oculos, "escuro")
  assert.equal(doAntigo({ acessorio: "bandeira", detalhe: "#00ff00" }, "x").maoC, "#00ff00")
  // Defaults: the 2D default's shirt; skin, hair and face vary from login to login, kept to people's.
  const muitos = Array.from({ length: 200 }, (_, i) => [`pessoa_${i}`, doAntigo(null, `pessoa_${i}`)])
  for (const [login, b] of muitos) {
    const v = T2.padrao(login)
    assert.equal(b.cor, v.cor, login)
    assert.equal(b.fes, "pula")
    assert.ok(["#ffe0c7", "#f6c9a4", "#e9b48a", "#d29a6c", "#b97a50", "#8f5a3c", "#6b402c", "#472a20"].includes(b.pele))
    assert.equal(b.pecas.length + b.desenhos.length + b.mechas.length, 0)
  }
  const varia = (k) => new Set(muitos.map(([, b]) => b[k])).size
  for (const [k, n] of [["pele", 8], ["topo", 10], ["olho", 6], ["cabC", 8], ["boca", 7], ["barba", 5]]) assert.ok(varia(k) >= n, `${k}: ${varia(k)}`)
  assert.ok(muitos.filter(([, b]) => b.barba !== "nada").length < 100)
})

test("torcedorDe: their saved 3D fan when there's one, the 2D one's otherwise", () => {
  assert.deepEqual(torcedorDe({ cor: "#ff0000", t3: { topo: "afro" } }, "x"), normalizar({ topo: "afro" }))
  assert.deepEqual(torcedorDe({ t3: {} }, "x"), normalizar({}))
  for (const sem of [null, undefined, {}, { cor: "#ff0000" }, { cor: "#ff0000", t3: null }, { cor: "#ff0000", t3: [1] }, { t3: "T1:x" }])
    assert.deepEqual(torcedorDe(sem, "fulano"), doAntigo(sem, "fulano"))
})

test("the club: picked, its shirt goes on and stays theirs to change; any other team is a name", () => {
  const base = normalizar({ roupa: "xadrez", cor: "#8b5cf6", gola: "polo" })
  for (const t of TIMES) {
    const a = normalizar(comTime(base, t.nome))
    assert.equal(a.time, t.nome)
    assert.equal(a.cor, t.cor.toLowerCase())
    assert.notEqual(a.roupa, "xadrez")
    assert.deepEqual(a, normalizar(a))
  }
  assert.deepEqual(normalizar(comTime(base, "Vasco")).roupa, "faixa")
  assert.equal(normalizar(comTime(base, "Grêmio")).roupa, "tricolor")
  assert.deepEqual(normalizar(comTime(base, "Ibis")), { ...base, time: "Ibis" })
  assert.equal(clube("Ibis"), null)
  // Changed after picking it, the shirt stays as they left it: only picking a club dresses it.
  const mudado = { ...normalizar(comTime(base, "Santos")), roupa: "listras" }
  assert.equal(vestir(mudado).roupa, "listras")
  assert.deepEqual(camisa2D({ roupa: "listra", cor: "#ffffff", detalhe: "#000000" }), { cor: "#ffffff", detalhe: "#000000", terceira: "#ffffff", golaC: "#000000", roupa: "peito" })
})

test("vestir: Santa's hat goes on when drawn, and no profile can keep it", () => {
  const look = normalizar({
    ...MODELOS[0][1], capuz: "levantado", desenhos: [{ f: "estrela", em: "camisa" }, { f: "coracao", em: "rosto" }],
  })
  assert.deepEqual(vestir(look), look)
  const natalino = vestir(look, { natal: true })
  for (const [k, v] of Object.entries(TOUCA)) assert.equal(natalino[k], v, k)
  assert.equal(natalino.capuz, "abaixado")
  // What vestir adds isn't an option: saved or put in a code, it's gone.
  assert.equal(normalizar(natalino).chapeu, "nada")
  assert.equal(lerCodigo(codigo(natalino)).chapeu, "nada")
  // A saved (enxuto) look is enough.
  assert.equal(vestir({ topo: "afro" }, { natal: true }).topo, "afro")
  assert.equal(look.chapeu, "bone")
})
