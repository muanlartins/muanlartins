// node --test infra/perfil/index.test.mjs: the profile API's routes against a table in memory. CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { CANAL, rotas } from "./rotas.mjs"

const VANDAL = "18609205-4edb-5966-cff8-0fba0230ba1e"
const AZUL = "6fb459fa-4368-7d20-106a-629db9825a2b"
const ESCURA = "403f7d3e-4e96-6566-42f3-01b7a803d660"

function montar() {
  const itens = new Map()
  const banco = {
    ler: async (login) => (itens.has(login) ? structuredClone(itens.get(login)) : null),
    varios: async (logins) => logins.filter((l) => itens.has(l)).map((l) => structuredClone(itens.get(l))),
    definir: async (login, campos) => itens.set(login, { ...(itens.get(login) || { login }), ...structuredClone(campos) }),
    remover: async (login, nomes) => {
      const i = itens.get(login)
      if (i) for (const n of nomes) delete i[n]
    },
  }
  const usuario = async (headers) => (headers.authorization === "Bearer bom" ? { login: "fulano", id: "42" } : headers.authorization === "Bearer canal" ? { login: CANAL, id: "1" } : null)
  const handler = rotas({ banco, usuario, chave: "segredo-da-live" })
  const chamar = async (metodo, caminho, { token, corpo, query, headers } = {}) => {
    const r = await handler({
      requestContext: { http: { method: metodo } },
      rawPath: caminho,
      queryStringParameters: query,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
    return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : undefined }
  }
  return { itens, chamar, handler }
}

test("saving the fan keeps the loadout, and the other way round", async () => {
  const { chamar } = montar()
  await chamar("PUT", "/eu/loadout", { token: "bom", corpo: { armas: { vandal: { skin: VANDAL.toUpperCase(), chromas: [AZUL, ESCURA, AZUL] } } } })
  await chamar("PUT", "/eu", { token: "bom", corpo: { cor: "#00FF00", frase: "  vamo   " } })
  const eu = await chamar("GET", "/eu", { token: "bom" })
  assert.deepEqual(eu.body.aparencia, { cor: "#00ff00", frase: "vamo" })
  assert.deepEqual(eu.body.loadout, { armas: { vandal: { skin: VANDAL, chromas: [AZUL, ESCURA] } } })
  await chamar("DELETE", "/eu", { token: "bom" })
  const depois = await chamar("GET", "/eu", { token: "bom" })
  assert.equal(depois.body.aparencia, null)
  assert.ok(depois.body.loadout)
})

test("the loadout is public by login, and junk is dropped", async () => {
  const { chamar } = montar()
  await chamar("PUT", "/eu/loadout", {
    token: "bom",
    corpo: { armas: { vandal: { skin: VANDAL, chromas: ["x", AZUL] }, "Bad Weapon": { skin: VANDAL }, phantom: { skin: "nope" } }, extra: 1 },
  })
  const r = await chamar("GET", "/loadout", { query: { login: "FULANO" } })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body.loadout, { armas: { vandal: { skin: VANDAL, chromas: [AZUL] } } })
  assert.ok(r.body.em)
  assert.equal("jogo" in r.body, false)
  assert.equal((await chamar("GET", "/loadout", { query: { login: "ninguem" } })).body.loadout, null)
  assert.equal((await chamar("GET", "/loadout", { query: { login: "a b" } })).status, 400)
})

test("the fan list skips whoever only has a loadout", async () => {
  const { chamar } = montar()
  await chamar("PUT", "/eu/loadout", { token: "bom", corpo: { armas: {} } })
  assert.deepEqual((await chamar("GET", "/torcedores", { query: { logins: "fulano" } })).body, {})
  await chamar("PUT", "/eu", { token: "bom", corpo: { cabeca: "bone" } })
  assert.deepEqual((await chamar("GET", "/torcedores", { query: { logins: "fulano,outro" } })).body, { fulano: { cabeca: "bone" } })
})

test("only the stream's key sends the game's reading, and only the channel's loadout shows it", async () => {
  const { chamar } = montar()
  const leitura = { lido: "2026-11-10T22:00:00Z", equipado: { vandal: { skin: VANDAL, chroma: AZUL } }, skins: [VANDAL, "lixo"], chromas: [AZUL] }
  assert.equal((await chamar("POST", "/canal/jogo", { corpo: leitura })).status, 401)
  assert.equal((await chamar("POST", "/canal/jogo", { corpo: leitura, headers: { "x-chave": "errada-da-live" } })).status, 401)
  const ok = await chamar("POST", "/canal/jogo", { corpo: leitura, headers: { "x-chave": "segredo-da-live" } })
  assert.deepEqual(ok.body, { armas: 1, skins: 1, chromas: 1 })
  const canal = await chamar("GET", "/loadout", { query: { login: CANAL } })
  assert.equal(canal.body.jogo.lido, "2026-11-10T22:00:00.000Z")
  assert.deepEqual(canal.body.jogo.equipado, { vandal: { skin: VANDAL, chroma: AZUL } })
  assert.equal(canal.body.loadout, null)
  await chamar("PUT", "/eu/loadout", { token: "canal", corpo: { armas: { vandal: { skin: VANDAL, chromas: [AZUL] } } } })
  const depois = await chamar("GET", "/loadout", { query: { login: CANAL } })
  assert.ok(depois.body.loadout && depois.body.jogo)
})

test("without a valid token, nothing personal", async () => {
  const { chamar } = montar()
  assert.equal((await chamar("GET", "/eu")).status, 401)
  assert.equal((await chamar("PUT", "/eu/loadout", { token: "ruim", corpo: { armas: {} } })).status, 401)
  assert.equal((await chamar("GET", "/outra")).status, 404)
  assert.equal((await chamar("OPTIONS", "/eu")).status, 204)
})

const AGENDA = {
  slots: [{ days: [1, 3], start: "21:00", end: "23:00", game: "valorant", title: "Aprendendo Valorant" }],
  extras: [{ date: "2099-01-03", start: "15:00", end: "17:00", game: "valorant" }],
  off: [{ date: "2000-01-03", start: "21:00" }],
  games: { valorant: { name: "VALORANT", category: "516575", title: "Aprendendo Valorant" } },
}

test("the agenda: only the channel saves it, everyone reads it, with the next lives and as a calendar", async () => {
  const { chamar, handler } = montar()
  assert.deepEqual((await chamar("GET", "/agenda")).body, { agenda: null, em: null, proximas: [] })
  assert.equal((await chamar("PUT", "/agenda", { token: "bom", corpo: AGENDA })).status, 403)
  assert.equal((await chamar("PUT", "/agenda", { corpo: AGENDA })).status, 403)
  assert.equal((await chamar("PUT", "/agenda", { token: "canal", corpo: [] })).status, 400)
  const salvo = await chamar("PUT", "/agenda", { token: "canal", corpo: AGENDA })
  assert.equal(salvo.status, 200)
  // A day off in the past goes.
  assert.deepEqual(salvo.body.agenda.off, [])
  const lido = await chamar("GET", "/agenda")
  assert.deepEqual(lido.body.agenda, salvo.body.agenda)
  assert.ok(lido.body.em)
  // Two weeks hold at least four Monday and Wednesday lives.
  assert.ok(lido.body.proximas.filter((o) => o.jogo === "valorant" && !o.avulsa).length >= 4)
  const cal = await handler({ requestContext: { http: { method: "GET" } }, rawPath: "/agenda.ics", headers: {} })
  assert.match(cal.headers["content-type"], /^text\/calendar/)
  assert.match(cal.body, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE/)
  assert.match(cal.body, /DTSTART;TZID=America\/Sao_Paulo:20990103T150000/)
})

test("the story: the channel sends a JPEG, Instagram fetches it by its URL", async () => {
  const { handler } = montar()
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5000, 7)])
  const enviar = (token, body, tipo = "image/jpeg") =>
    handler({
      requestContext: { http: { method: "PUT" }, domainName: "api.exemplo" },
      rawPath: "/canal/story",
      headers: { authorization: `Bearer ${token}`, "content-type": tipo },
      body: body.toString("base64"),
      isBase64Encoded: true,
    })
  assert.equal((await enviar("bom", jpeg)).statusCode, 403)
  assert.equal((await enviar("canal", Buffer.alloc(5000, 7))).statusCode, 400)
  assert.equal((await enviar("canal", jpeg, "image/png")).statusCode, 400)
  assert.equal((await enviar("canal", Buffer.concat([jpeg, Buffer.alloc(400_000)]))).statusCode, 400)
  const r = await enviar("canal", jpeg)
  assert.equal(r.statusCode, 200)
  const { url } = JSON.parse(r.body)
  assert.match(url, /^https:\/\/api\.exemplo\/canal\/story\/[a-z0-9]+\.jpg$/)
  const caminho = new URL(url).pathname
  const img = await handler({ requestContext: { http: { method: "GET" } }, rawPath: caminho, headers: {} })
  assert.equal(img.statusCode, 200)
  assert.equal(img.isBase64Encoded, true)
  assert.deepEqual(Buffer.from(img.body, "base64"), jpeg)
  const velho = await handler({ requestContext: { http: { method: "GET" } }, rawPath: "/canal/story/outro123.jpg", headers: {} })
  assert.equal(velho.statusCode, 404)
})
