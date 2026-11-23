// node --test infra/perfil/index.test.mjs: the profile API's routes against a table in memory. CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { CANAL, rotas, T3_MAX } from "./rotas.mjs"
import { CAMPOS, DESENHO, enxugar, MECHA, normalizar, PECA } from "./torcedor3d.mjs"

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

// Tomorrow in Brasília, so the next lives always have one.
const AMANHA = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 86_400_000))
const AGENDA = {
  dates: {
    [AMANHA]: { lives: [{ start: "21:00", end: "23:00", game: "valorant", title: "Aprendendo Valorant" }] },
    "2099-01-03": { lives: [{ start: "15:00", end: "17:00", game: "valorant" }] },
    "2000-01-03": { note: "passou", lives: [] },
  },
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
  // A day planned in the past goes.
  assert.deepEqual(Object.keys(salvo.body.agenda.dates), [AMANHA, "2099-01-03"])
  const lido = await chamar("GET", "/agenda")
  assert.deepEqual(lido.body.agenda, salvo.body.agenda)
  assert.ok(lido.body.em)
  assert.deepEqual(lido.body.proximas.map((o) => [o.data, o.start, o.titulo]), [[AMANHA, "21:00", "Aprendendo Valorant"]])
  const cal = await handler({ requestContext: { http: { method: "GET" } }, rawPath: "/agenda.ics", headers: {} })
  assert.match(cal.headers["content-type"], /^text\/calendar/)
  assert.match(cal.body, /DTSTART;TZID=America\/Sao_Paulo:\d{8}T210000\r\n/)
  assert.match(cal.body, /SUMMARY:Live do muanlartins: VALORANT/)
  const chat = await handler({ requestContext: { http: { method: "GET" } }, rawPath: "/agenda.txt", headers: {} })
  assert.match(chat.headers["content-type"], /^text\/plain/)
  // 2099's is past the two weeks the chat looks at.
  assert.equal(chat.body, "Próxima live amanhã às 21h (horário de Brasília): VALORANT, Aprendendo Valorant.")
})

test("Celeste's learning: only the channel sets it, everyone reads it, null is automatic again", async () => {
  const { chamar } = montar()
  assert.deepEqual((await chamar("GET", "/celeste")).body, { aprendizado: {}, em: null })
  const marca = { id: "coyote-time", estado: "aprendendo" }
  assert.equal((await chamar("PUT", "/celeste", { corpo: marca })).status, 403)
  assert.equal((await chamar("PUT", "/celeste", { token: "bom", corpo: marca })).status, 403)
  for (const corpo of [[], {}, { id: "__proto__", estado: "vou" }, { id: "wavedash", estado: "expert" }, { id: "wavedash" }, { id: "x".repeat(41), estado: "vou" }])
    assert.equal((await chamar("PUT", "/celeste", { token: "canal", corpo })).status, 400)
  assert.equal((await chamar("PUT", "/celeste", { token: "canal", corpo: marca })).status, 200)
  await chamar("PUT", "/celeste", { token: "canal", corpo: { id: "wavedash", estado: "aprendi" } })
  assert.deepEqual((await chamar("GET", "/celeste")).body.aprendizado, { "coyote-time": "aprendendo", wavedash: "aprendi" })
  await chamar("PUT", "/celeste", { token: "canal", corpo: { id: "coyote-time", estado: null } })
  assert.deepEqual((await chamar("GET", "/celeste")).body.aprendizado, { wavedash: "aprendi" })
  assert.equal((await chamar("DELETE", "/celeste", { token: "canal" })).status, 405)
})

test("the ball in the duel: saved on its own, public by login for the overlay, junk dropped", async () => {
  const { chamar } = montar()
  await chamar("PUT", "/eu", { token: "bom", corpo: { cabeca: "bone" } })
  assert.equal((await chamar("PUT", "/eu/duelo", { corpo: { classe: "machado" } })).status, 401)
  const salvo = await chamar("PUT", "/eu/duelo", { token: "bom", corpo: { classe: "machado", material: "Gold!", extra: 1 } })
  assert.deepEqual(salvo.body, { login: "fulano", duelo: { classe: "machado" } })
  const eu = await chamar("GET", "/eu", { token: "bom" })
  assert.deepEqual(eu.body.duelo, { classe: "machado" })
  assert.deepEqual(eu.body.aparencia, { cabeca: "bone" })
  assert.deepEqual((await chamar("GET", "/duelistas", { query: { logins: "FULANO,outro,a b" } })).body, { fulano: { classe: "machado" } })
  // Saving the fan keeps the ball.
  await chamar("PUT", "/eu", { token: "bom", corpo: { cabeca: "coroa" } })
  assert.deepEqual((await chamar("GET", "/eu", { token: "bom" })).body.duelo, { classe: "machado" })
  // Everything back to the default: nobody's ball in the list.
  await chamar("PUT", "/eu/duelo", { token: "bom", corpo: {} })
  assert.deepEqual((await chamar("GET", "/duelistas", { query: { logins: "fulano" } })).body, {})
  await chamar("PUT", "/eu/duelo", { token: "bom", corpo: { material: "diamond" } })
  await chamar("DELETE", "/eu/duelo", { token: "bom" })
  assert.equal((await chamar("GET", "/eu", { token: "bom" })).body.duelo, null)
})

test("the card: its theme, free colours, a filtered text, pronouns and the game; public with the fan and the ball", async () => {
  const { chamar } = montar()
  const r = await chamar("PUT", "/eu/cartao", {
    token: "bom",
    corpo: { tema: "por-do-sol", cores: ["#FF0000", "#00ff00", "#0000ff"], sobre: `  jogo   desde 2016,\n\n\n\nx ${"x".repeat(400)}`, jogo: "rocket-league", extra: 1 },
  })
  assert.equal(r.status, 200)
  // Three colours aren't two: dropped. The text keeps a blank line at most and is cut at 300 characters.
  assert.deepEqual(Object.keys(r.body.cartao).sort(), ["jogo", "sobre", "tema"])
  assert.equal([...r.body.cartao.sobre].length, 300)
  assert.ok(r.body.cartao.sobre.startsWith("jogo desde 2016,\n\nx x"))
  await chamar("PUT", "/eu/cartao", { token: "bom", corpo: { tema: "livre", cores: ["#FF0000", "#00ff00"], sobre: "sou viado mesmo", pronomes: "  ele / dele  " } })
  await chamar("PUT", "/eu", { token: "bom", corpo: { cor: "#00ff00" } })
  const eu = await chamar("GET", "/eu", { token: "bom" })
  assert.deepEqual(eu.body.cartao, { tema: "livre", cores: ["#ff0000", "#00ff00"], sobre: "sou ••• mesmo", pronomes: "ele / dele" })
  const pub = await chamar("GET", "/cartoes", { query: { logins: "FULANO,ninguem,Bad Login" } })
  assert.deepEqual(pub.body, { fulano: { aparencia: { cor: "#00ff00" }, cartao: eu.body.cartao, duelo: null, imagens: null } })
  await chamar("DELETE", "/eu/cartao", { token: "bom" })
  assert.equal((await chamar("GET", "/eu", { token: "bom" })).body.cartao, null)
  assert.equal((await chamar("PUT", "/eu/cartao", { corpo: {} })).status, 401)
})

// A tiny WebP: "RIFF", its size, "WEBP" and padding past the 200 bytes the API asks for at least.
const webp = (n = 400) => Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(n)])

test("the banner and the photo: saved apart, public by an id that never changes, taken down by them or the channel", async () => {
  const { itens, chamar, handler } = montar()
  const enviar = (caminho, bytes, token = "bom") =>
    handler({
      requestContext: { http: { method: "PUT" } },
      rawPath: caminho,
      headers: { authorization: `Bearer ${token}`, "content-type": "image/webp" },
      body: bytes.toString("base64"),
      isBase64Encoded: true,
    }).then((r) => ({ status: r.statusCode, body: JSON.parse(r.body) }))
  assert.equal((await enviar("/eu/imagem/banner", Buffer.from("not a picture at all".repeat(20)))).status, 400)
  assert.equal((await enviar("/eu/imagem/foto", webp(100_000))).status, 400)
  assert.equal((await enviar("/eu/imagem/banner", webp(), "ruim")).status, 401)
  const b = await enviar("/eu/imagem/banner", webp())
  assert.equal(b.status, 200)
  assert.match(b.body.imagens.banner, /^[a-z0-9]+\.webp$/)
  const f = await enviar("/eu/imagem/foto", webp(500))
  assert.deepEqual(Object.keys(f.body.imagens).sort(), ["banner", "foto"])
  // The cards say which; the pictures don't ride along in the batch.
  const pub = await chamar("GET", "/cartoes", { query: { logins: "fulano" } })
  assert.deepEqual(pub.body.fulano.imagens, f.body.imagens)
  assert.equal(itens.get("fulano").imagem, undefined)
  const r = await handler({ requestContext: { http: { method: "GET" } }, rawPath: `/imagem/fulano/banner/${b.body.imagens.banner}`, headers: {} })
  assert.equal(r.statusCode, 200)
  assert.equal(r.headers["content-type"], "image/webp")
  assert.match(r.headers["cache-control"], /immutable/)
  assert.ok(Buffer.from(r.body, "base64").equals(webp()))
  // An old id is gone with a new picture.
  const b2 = await enviar("/eu/imagem/banner", webp(300))
  assert.equal((await chamar("GET", `/imagem/fulano/banner/${b.body.imagens.banner}`)).status, 404)
  assert.notEqual(b2.body.imagens.banner, b.body.imagens.banner)
  // They take their banner down; only the channel takes down someone else's photo.
  assert.deepEqual((await chamar("DELETE", "/eu/imagem/banner", { token: "bom" })).body.imagens, { foto: f.body.imagens.foto })
  assert.equal((await chamar("GET", `/imagem/fulano/banner/${b2.body.imagens.banner}`)).status, 404)
  assert.equal((await chamar("DELETE", "/canal/imagem/fulano/foto", { token: "bom" })).status, 403)
  assert.equal((await chamar("DELETE", "/canal/imagem/fulano/foto", { token: "canal" })).status, 200)
  assert.equal((await chamar("GET", "/eu", { token: "bom" })).body.imagens, null)
})

// The biggest look the schema allows: every field off its default, every list full, the longest frase and stickers.
function maior() {
  const longe = (c) =>
    c.tipo === "num" ? (c.passo ? c.max : Math.round((c.min + (c.max - c.min) * 0.7777) * 1000) / 1000)
    : c.tipo === "cor" ? "#123456"
    : c.tipo === "sim" ? !c.padrao
    : c.opcoes.map(([id]) => id).filter((id) => id !== c.padrao).sort((a, b) => b.length - a.length)[0]
  const de = (campos) => Object.fromEntries(campos.map((c) => [c.k, longe(c)]))
  const astronauta = "👨🏽‍🚀"
  return enxugar(normalizar({
    ...de(CAMPOS), pecas: Array(12).fill(de(PECA)), desenhos: Array(16).fill(de(DESENHO)), mechas: Array(16).fill(de(MECHA)),
    time: "Red Bull Bragantino", frase: "🏆".repeat(30), stickers: { gol: Array(3).fill(astronauta), contra: Array(3).fill(astronauta) },
  }))
}

test("the 3D fan (t3): normalized by the schema itself, public with the fan, kept when the 2D editor saves", async () => {
  const { itens, chamar } = montar()
  // As DynamoDB keeps it (no undefined values).
  const guardado = () => JSON.parse(JSON.stringify(itens.get("fulano").aparencia))
  const look = { topo: "afro", cabC: "#FF5C9A", larg: 9, lixo: true, pecas: [{ f: "cone", x: 0.5, y: 1.2, nada: 1 }, 3], frase: "  bora   luan  " }
  const salvo = await chamar("PUT", "/eu", { token: "bom", corpo: { cor: "#00ff00", t3: look } })
  assert.equal(salvo.status, 200)
  // Only what differs from the default, colours in lower case, numbers inside their range, junk gone.
  const esperado = { larg: 1.25, topo: "afro", cabC: "#ff5c9a", pecas: [{ f: "cone", x: 0.5, y: 1.2 }, {}], frase: "bora luan" }
  assert.deepEqual(salvo.body.aparencia, { cor: "#00ff00", t3: esperado })
  assert.deepEqual(guardado().t3, enxugar(normalizar(look)))
  assert.deepEqual((await chamar("GET", "/eu", { token: "bom" })).body.aparencia.t3, esperado)
  assert.deepEqual((await chamar("GET", "/torcedores", { query: { logins: "fulano" } })).body, { fulano: { cor: "#00ff00", t3: esperado } })
  assert.deepEqual((await chamar("GET", "/cartoes", { query: { logins: "fulano" } })).body.fulano.aparencia.t3, esperado)
  // The 2D editor sends no t3: the 3D fan stays, the 2D fields change.
  await chamar("PUT", "/eu", { token: "bom", corpo: { cor: "#ff0000", frase: "oi" } })
  assert.deepEqual(guardado(), { cor: "#ff0000", frase: "oi", t3: esperado })
  // A look at every default is a 3D fan too; null drops it.
  await chamar("PUT", "/eu", { token: "bom", corpo: { t3: {} } })
  assert.deepEqual(guardado(), { t3: {} })
  await chamar("PUT", "/eu", { token: "bom", corpo: { cor: "#ff0000", t3: null } })
  assert.deepEqual(guardado(), { cor: "#ff0000" })
})

test("the 3D fan (t3): anything but an object is refused, and so is more than T3_MAX bytes", async () => {
  const { itens, chamar } = montar()
  const guardado = () => JSON.parse(JSON.stringify(itens.get("fulano").aparencia))
  await chamar("PUT", "/eu", { token: "bom", corpo: { cor: "#00ff00", t3: { topo: "afro" } } })
  for (const t3 of ["T1:eyJ0b3BvIjoiYWZybyJ9", 42, true, [{ topo: "careca" }]]) {
    const r = await chamar("PUT", "/eu", { token: "bom", corpo: { cor: "#123456", t3 } })
    assert.equal(r.status, 400, JSON.stringify(t3))
  }
  const grande = await chamar("PUT", "/eu", { token: "bom", corpo: { t3: { topo: "careca", frase: "x".repeat(T3_MAX) } } })
  assert.equal(grande.status, 413)
  // Nothing refused touched what was saved.
  assert.deepEqual(guardado(), { cor: "#00ff00", t3: { topo: "afro" } })
  // The biggest look the schema allows fits, and comes back whole.
  const tudo = maior()
  assert.ok(Buffer.byteLength(JSON.stringify(tudo)) <= T3_MAX)
  const r = await chamar("PUT", "/eu", { token: "bom", corpo: { t3: tudo } })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body.aparencia.t3, tudo)
  assert.equal(r.body.aparencia.t3.pecas.length, 12)
  assert.equal((await chamar("PUT", "/eu", { corpo: { t3: {} } })).status, 401)
})
