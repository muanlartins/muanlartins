// The 3D fan's kit for agents (scripts/torcedor/): its schema is made from the fan's own modules, what it reads from
// boneco.js still holds, its warnings name every change normalizar makes, its examples are clean and its guide
// (README.md) lists the presets and poses there are. A change to public/stream/torcedor3d/ that the kit or the guide
// doesn't follow fails here.
//
//   node --test scripts/torcedor/torcedor.test.mjs

import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"
import * as E from "../../public/stream/torcedor3d/esquema.js"
import { POSES as POSES_BONECO } from "../../public/stream/torcedor3d/boneco.js"
import { TIMES, comTime } from "../../public/stream/torcedor3d/vestir.js"
import { T3_MAX } from "../../infra/perfil/rotas.mjs"
import { ATRAS_COM_CAPUZ, CHAPEUS_COM_CABELO, CHAPEUS_COM_CAPUZ, POSES, esquema, validar } from "./motor.mjs"

const aqui = (f) => new URL(f, import.meta.url)
const guia = readFileSync(aqui("README.md"), "utf8")
const boneco = readFileSync(aqui("../../public/stream/torcedor3d/boneco.js"), "utf8")
const S = esquema()

test("the schema is the modules': every field, list, preset and club, with the presets' own codes", () => {
  assert.deepEqual(S.fields.map((c) => c.key), E.CAMPOS.map((c) => c.k))
  for (const c of S.fields) {
    const de = E.CAMPOS.find((x) => x.k === c.key)
    assert.equal(c.default, de.padrao, c.key)
    assert.equal(c.type, de.tipo, c.key)
    if (de.tipo === "op") assert.deepEqual(c.options.map((o) => o.id), de.opcoes.map(([id]) => id), c.key)
    if (de.tipo === "num") assert.deepEqual([c.min, c.max], [de.min, de.max], c.key)
  }
  assert.deepEqual(new Set(S.tabs.flatMap((t) => t.groups.flatMap((g) => g.keys))), new Set(E.CAMPOS.map((c) => c.k)))
  for (const [k, campos, max] of [["pecas", E.PECA, E.PECAS_MAX], ["desenhos", E.DESENHO, E.DESENHOS_MAX], ["mechas", E.MECHA, E.MECHAS_MAX]]) {
    assert.equal(S.lists[k].max, max, k)
    assert.deepEqual(S.lists[k].fields.map((c) => c.key), campos.map((c) => c.k), k)
  }
  assert.deepEqual(S.presets.map((p) => p.name), E.MODELOS.map(([n]) => n))
  for (const p of S.presets) assert.equal(p.code, E.codigo(E.normalizar(p.look)), p.name)
  assert.deepEqual(S.clubs.map((c) => c.name), TIMES.map((t) => t.nome))
  for (const c of S.clubs) assert.deepEqual(c.look, comTime({}, c.name), c.name)
  assert.deepEqual(Object.keys(S.torcida), ["time", "frase", "stickers"])
  assert.equal(S.format.maxChars, E.CODIGO_MAX)
  assert.equal(S.format.maxProfileBytes, T3_MAX)
})

test("what the kit reads from boneco.js still holds: the poses, what a hat and a raised hood hide", () => {
  assert.deepEqual(POSES.map(([id]) => id), POSES_BONECO)
  const lista = (re) => JSON.parse(boneco.match(re)?.[1] ?? "null")
  assert.deepEqual(lista(/const noChapeu = !(\[[^\]]*\])\.includes\(a\.chapeu\) \|\| a\.capuz === "levantado"/), CHAPEUS_COM_CABELO)
  assert.deepEqual(lista(/a\.capuz === "levantado" && !(\[[^\]]*\])\.includes\(a\.chapeu\)\) chapeu\.visible = false/), CHAPEUS_COM_CAPUZ)
  assert.match(boneco, new RegExp(`a\\.capuz === "levantado" && a\\.atras !== "${ATRAS_COM_CAPUZ[0]}"`))
  assert.equal(ATRAS_COM_CAPUZ.length, 1)
})

test("validar: the look is normalizar's own, and every change is named", () => {
  const ruim = {
    topo: "Black power", larg: 3, cor: "red", cabelo: "azul", cabc: "#ff0000", numOn: 1, numero: 10.6, olho: "<img>", chapC: "#FFD23F",
    pecas: [{ f: "bola", x: 9 }, null, ...Array(11).fill({})], desenhos: "x", mechas: [{ a: "x", l: 99, c: "red", p: 1 }],
    time: 7, frase: "x".repeat(40), stickers: { gol: ["🔥", "ab"], contra: "😭" },
  }
  const r = validar(JSON.stringify(ruim))
  assert.equal(r.ok, true)
  assert.deepEqual(r.look, JSON.parse(JSON.stringify(E.normalizar(ruim))))
  const tipos = new Set(r.avisos.map((a) => a.tipo))
  for (const t of ["chave-desconhecida", "fora-do-limite", "opcao-invalida", "cor-invalida", "tipo-errado", "arredondado", "lista-cortada", "item-invalido", "lista-invalida", "cortado"]) assert.ok(tipos.has(t), t)
  const msgs = r.avisos.map((a) => a.mensagem).join(" | ")
  assert.match(msgs, /quis dizer "afro"/)
  assert.match(msgs, /quis dizer "cabC"/)
  assert.ok(r.semEfeito.some((n) => n.campo === "chapC"))
  for (const c of ["time", "frase", "stickers.gol", "stickers.contra"]) assert.ok(r.avisos.some((a) => a.campo === c), c)

  assert.deepEqual(validar(JSON.stringify({ topo: "afro", chapeu: "bone" })).dicas.length, 1)
  assert.deepEqual(validar(JSON.stringify({ topo: "afro", chapeu: "festa" })).dicas, [])
  assert.equal(validar("T1:!!!@@").ok, false)
  assert.equal(validar('{"topo": ').ok, false)
  assert.match(validar(`T1:${"A".repeat(E.CODIGO_MAX)}`).erro, /12000/)
})

test("codes: every preset goes JSON → T1 → JSON, from a bare code, a link or a percent-encoded link", () => {
  for (const [nome, look] of E.MODELOS) {
    const ida = validar(JSON.stringify(look))
    assert.equal(ida.codigo, E.codigo(E.normalizar(look)), nome)
    assert.equal(ida.idaVolta, true, nome)
    for (const como of [ida.codigo, `https://muanlartins.com.br/perfil#t=${ida.codigo}`, `https://muanlartins.com.br/perfil#t=${ida.codigo.replace(":", "%3A")}`, JSON.stringify(ida.codigo)]) {
      const volta = validar(como)
      assert.equal(volta.origem, "codigo", nome)
      assert.deepEqual(volta.look, ida.look, nome)
      assert.deepEqual(volta.avisos, [], nome)
    }
  }
  const com = validar(JSON.stringify({ time: "São Paulo", frase: "Bora, Luan! 🏆", stickers: { gol: ["🔥"], contra: [] } }))
  assert.deepEqual(validar(com.codigo).enxuto, com.enxuto)
})

test("the biggest look the schema allows fits the code; validar says when one passes the profile's cap", () => {
  // Every field away from its default with the longest value it takes, every list full, the longest texts.
  const longe = (campos) => Object.fromEntries(campos.map((c) => [c.k, c.tipo === "num" ? (c.passo ? c.max : c.min + (c.max - c.min) * 0.123456) : c.tipo === "cor" ? "#123456" : c.tipo === "sim" ? !c.padrao : c.opcoes.map(([id]) => id).filter((id) => id !== c.padrao).sort((a, b) => b.length - a.length)[0]]))
  const look = {
    ...longe(E.CAMPOS),
    pecas: Array(E.PECAS_MAX).fill(longe(E.PECA)), desenhos: Array(E.DESENHOS_MAX).fill(longe(E.DESENHO)), mechas: Array(E.MECHAS_MAX).fill(longe(E.MECHA)),
    time: "ç".repeat(E.TIME_MAX), frase: "👨🏽‍🚀".repeat(E.FRASE_MAX), stickers: { gol: Array(E.STICKERS_MAX).fill("👨🏽‍🚀"), contra: Array(E.STICKERS_MAX).fill("👨🏽‍🚀") },
  }
  const r = validar(JSON.stringify(look))
  assert.ok(r.cabe, `${r.caracteres} caracteres`)
  assert.equal(r.idaVolta, true)
  // (Every field and list item away from its default goes past T3_MAX by a little; real looks are under 6 KB.)
  assert.equal(r.cabePerfil, r.bytes <= T3_MAX)
  assert.equal(validar(JSON.stringify(E.MODELOS[0][1])).cabePerfil, true)
})

test("the examples are original looks that validate clean", () => {
  const exemplos = readdirSync(aqui("exemplos/")).filter((f) => f.endsWith(".json"))
  assert.ok(exemplos.length >= 3)
  for (const f of exemplos) {
    const r = validar(readFileSync(aqui(`exemplos/${f}`), "utf8"))
    assert.equal(r.ok, true, f)
    assert.deepEqual([r.avisos, r.semEfeito, r.dicas], [[], [], []], f)
    assert.ok(r.cabe && r.cabePerfil && r.idaVolta, f)
    assert.match(guia, new RegExp("`" + f.replace(".", "\\.") + "`"), `${f} is in the guide`)
  }
})

test("the guide: its presets and poses are the modules', its format example is clean", () => {
  const presets = guia.split("### The presets")[1].split("\n## ")[0]
  assert.deepEqual([...presets.matchAll(/^- \*\*(.+?)\*\*:/gm)].map((m) => m[1]), E.MODELOS.map(([n]) => n))
  const poses = guia.match(/^Poses: (.+?)\. Angles:/ms)[1]
  assert.deepEqual([...poses.matchAll(/`(\w+)`/g)].map((m) => m[1]), POSES_BONECO)
  const exemplo = guia.split("## The format")[1].match(/```json\n([\s\S]*?)```/)[1]
  const r = validar(exemplo)
  assert.equal(r.ok, true)
  assert.deepEqual(r.avisos, [])
})

test("the CLI: exit 0 with warnings, 2 on unreadable input, and the code's way back", { skip: spawnSync("python3", ["--version"]).error && "no python3" }, () => {
  const cli = (script, ...args) => spawnSync("python3", [new URL(script, import.meta.url).pathname, ...args], { encoding: "utf8" })
  const v = cli("validar.py", '{"topo":"Black power"}')
  assert.equal(v.status, 0)
  assert.match(v.stdout, /quis dizer "afro"/)
  assert.match(v.stdout, /^T1:/m)
  assert.equal(cli("validar.py", "T1:!!!@@").status, 2)
  assert.equal(cli("validar.py", "nao-existe.json").status, 2)
  const cod = cli("codigo.py", aqui("exemplos/corujinha.json").pathname).stdout.trim()
  assert.match(cod, /^T1:[A-Za-z0-9_-]+$/)
  assert.deepEqual(JSON.parse(cli("codigo.py", cod).stdout), validar(readFileSync(aqui("exemplos/corujinha.json"), "utf8")).enxuto)
  const esq = cli("esquema.py")
  assert.equal(esq.status, 0)
  for (const k of E.CAMPOS.map((c) => c.k)) assert.match(esq.stdout, new RegExp(`^  ${k} `, "m"), k)
})
