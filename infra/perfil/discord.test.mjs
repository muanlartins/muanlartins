// node --test infra/perfil/discord.test.mjs: the Discord server's automations (discord.mjs) against a Discord and a
// table in memory, and their routes. CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { RANKS } from "./comum/discord.mjs"
import { automacoes, descricaoDe, DISCORD } from "./discord.mjs"
import { CANAL, rotas } from "./rotas.mjs"

const IDS = {
  servidor: "g1",
  bot: "b1",
  canais: { lives: "c-lives" },
  cargos: { avisos: "r-avisos", ...Object.fromEntries(RANKS.map((r) => [`rank-${r.id}`, `r-${r.id}`])) },
}

function montar({ sigmas = {}, membros = {}, eventos = [], agora = "2026-11-19T12:00:00Z" } = {}) {
  const itens = new Map()
  const banco = {
    ler: async (k) => (itens.has(k) ? structuredClone(itens.get(k)) : null),
    varios: async (ks) => ks.filter((k) => itens.has(k)).map((k) => structuredClone(itens.get(k))),
    definir: async (k, campos) => itens.set(k, { ...(itens.get(k) || { login: k }), ...structuredClone(campos) }),
    remover: async (k, nomes) => {
      const i = itens.get(k)
      if (i) for (const n of nomes) delete i[n]
    },
  }
  // Discord: members (id → roles), events, messages; every request is logged.
  const d = { membros: structuredClone(membros), eventos: structuredClone(eventos), mensagens: [], log: [], proximo: 1 }
  const pedir = async (metodo, caminho, corpo) => {
    d.log.push(`${metodo} ${caminho}`)
    let m
    if ((m = /^\/guilds\/g1\/members\/([\w-]+)$/.exec(caminho))) {
      if (metodo === "GET") {
        if (!d.membros[m[1]]) throw Object.assign(new Error("404"), { status: 404 })
        return { user: { id: m[1] }, roles: [...d.membros[m[1]]] }
      }
      if (metodo === "PUT") {
        if (d.membros[m[1]]) return null
        d.membros[m[1]] = [...(corpo.roles ?? [])]
        return { user: { id: m[1] }, roles: d.membros[m[1]] }
      }
    }
    if ((m = /^\/guilds\/g1\/members\/([\w-]+)\/roles\/([\w-]+)$/.exec(caminho))) {
      const roles = d.membros[m[1]]
      if (metodo === "PUT" && !roles.includes(m[2])) roles.push(m[2])
      if (metodo === "DELETE") d.membros[m[1]] = roles.filter((r) => r !== m[2])
      return null
    }
    if (caminho.startsWith("/guilds/g1/members?")) {
      return Object.entries(d.membros).map(([id, roles]) => ({ user: { id, bot: id === "b1" }, roles: [...roles] }))
    }
    if (caminho === "/guilds/g1/scheduled-events") {
      if (metodo === "GET") return structuredClone(d.eventos)
      const e = { id: `e${d.proximo++}`, creator_id: "b1", status: 1, ...corpo }
      d.eventos.push(e)
      return e
    }
    if ((m = /^\/guilds\/g1\/scheduled-events\/(\w+)$/.exec(caminho))) {
      if (metodo === "DELETE") d.eventos = d.eventos.filter((e) => e.id !== m[1])
      if (metodo === "PATCH") Object.assign(d.eventos.find((e) => e.id === m[1]), corpo)
      return null
    }
    if (caminho === "/channels/c-lives/messages") {
      d.mensagens.push(corpo)
      return { id: "m1" }
    }
    throw new Error(`não esperado: ${metodo} ${caminho}`)
  }
  const quem = async (token) => ({ "tok-ana-123456": { id: "u-ana", nome: "Ana" }, "tok-bia-123456": { id: "u-bia", nome: "Bia" } })[token] ?? null
  const discord = automacoes({ pedir, ids: IDS, banco, sigmas: async (ls) => Object.fromEntries(ls.filter((l) => sigmas[l] !== undefined).map((l) => [l, { sigma: sigmas[l] }])), quem, agora: () => new Date(agora) })
  const usuario = async (h) => ({ "Bearer fulano": { login: "fulano", id: "42" }, "Bearer outro": { login: "outro", id: "43" }, "Bearer canal": { login: CANAL, id: "1" } })[h.authorization] ?? null
  const handler = rotas({ banco, usuario, chave: "k", discord })
  const chamar = async (metodo, caminho, { token, corpo } = {}) => {
    const r = await handler({ requestContext: { http: { method: metodo } }, rawPath: caminho, headers: token ? { authorization: `Bearer ${token}` } : {}, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
    return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : undefined }
  }
  return { d, itens, discord, chamar, handler }
}

test("linking puts the viewer in the server with their Σ rank", async () => {
  const { d, itens, chamar } = montar({ sigmas: { fulano: 400 } })
  const r = await chamar("PUT", "/eu/discord", { token: "fulano", corpo: { token: "tok-ana-123456" } })
  assert.equal(r.status, 200)
  assert.equal(r.body.novo, true)
  assert.deepEqual(d.membros["u-ana"], ["r-gold"])
  assert.equal(itens.get(DISCORD).vinculos["u-ana"], "fulano")
  const eu = await chamar("GET", "/eu", { token: "fulano" })
  assert.equal(eu.body.discord.nome, "Ana")
})

test("someone already in the server gets their rank and loses the old one", async () => {
  const { d, chamar } = montar({ sigmas: { fulano: 2100 }, membros: { "u-ana": ["r-bronze", "r-avisos", "outro"] } })
  const r = await chamar("PUT", "/eu/discord", { token: "fulano", corpo: { token: "tok-ana-123456" } })
  assert.equal(r.body.novo, false)
  assert.deepEqual(d.membros["u-ana"].sort(), ["outro", "r-avisos", "r-diamond"])
})

test("a Discord token Discord refuses links nothing", async () => {
  const { itens, chamar } = montar()
  const r = await chamar("PUT", "/eu/discord", { token: "fulano", corpo: { token: "tok-ninguem-123" } })
  assert.equal(r.status, 401)
  assert.equal(itens.has(DISCORD), false)
})

test("one Discord, one login: linking it again elsewhere moves it, and unlinking takes the rank", async () => {
  const { d, itens, chamar } = montar({ sigmas: { fulano: 10, outro: 1000 } })
  await chamar("PUT", "/eu/discord", { token: "fulano", corpo: { token: "tok-ana-123456" } })
  await chamar("PUT", "/eu/discord", { token: "outro", corpo: { token: "tok-ana-123456" } })
  assert.equal(itens.get("fulano").discord, undefined)
  assert.equal(itens.get(DISCORD).vinculos["u-ana"], "outro")
  assert.deepEqual(d.membros["u-ana"], ["r-platinum"])
  await chamar("DELETE", "/eu/discord", { token: "outro" })
  assert.deepEqual(d.membros["u-ana"], [])
  assert.deepEqual(itens.get(DISCORD).vinculos, {})
})

test("the hourly run: linked members hold their tier, nobody else holds one", async () => {
  const { d, discord, itens } = montar({ sigmas: { fulano: 25000 }, membros: { "u-ana": ["r-bronze"], "u-bia": ["r-gold", "r-avisos"], b1: [] } })
  itens.set(DISCORD, { login: DISCORD, vinculos: { "u-ana": "fulano" } })
  const r = await discord.ranks()
  assert.deepEqual(d.membros["u-ana"], ["r-supersonic-legend"])
  assert.deepEqual(d.membros["u-bia"], ["r-avisos"])
  assert.deepEqual(r, { membros: 2, vinculados: 1, mudou: 3 })
  assert.equal((await discord.ranks()).mudou, 0)
})

const AGENDA = {
  games: { rl: { name: "Rocket League", category: "30921", title: "Ranqueadas de Rocket League" } },
  dates: {
    "2026-11-19": { lives: [{ start: "15:00", end: "18:00", game: "rl" }] },
    "2026-11-20": { lives: [{ start: "15:00", end: "18:00", game: "rl", title: "Inhouse com os viewers", plan: [{ at: "16:00", text: "inhouse" }] }] },
    "2026-11-30": { lives: [{ start: "15:00", end: "18:00", game: "rl" }] },
  },
}

test("the events follow the agenda's next seven days, and only the bot's", async () => {
  const alheio = { id: "x1", creator_id: "luan", status: 1, scheduled_start_time: "2026-11-21T18:00:00.000Z", name: "Do Luan" }
  const velho = { id: "x2", creator_id: "b1", status: 1, scheduled_start_time: "2026-11-22T18:00:00.000Z", name: "Saiu" }
  const noAr = { id: "x3", creator_id: "b1", status: 2, scheduled_start_time: "2026-11-19T11:00:00.000Z", name: "No ar" }
  const { d, discord } = montar({ eventos: [alheio, velho, noAr] })
  assert.deepEqual(await discord.eventos(AGENDA), { criados: 2, mudados: 0, apagados: 1 })
  const nomes = d.eventos.map((e) => e.name)
  assert.deepEqual(nomes, ["Do Luan", "No ar", "Ranqueadas de Rocket League", "Inhouse com os viewers"])
  const inhouse = d.eventos.find((e) => e.name === "Inhouse com os viewers")
  assert.equal(inhouse.scheduled_start_time, "2026-11-20T18:00:00.000Z")
  assert.equal(inhouse.entity_metadata.location, "https://twitch.tv/muanlartins")
  assert.match(inhouse.description, /^Rocket League\n16h · inhouse\n\nA agenda: /)
  // Again: nothing to do. A new title: one change.
  assert.deepEqual(await discord.eventos(AGENDA), { criados: 0, mudados: 0, apagados: 0 })
  const mudada = structuredClone(AGENDA)
  mudada.dates["2026-11-20"].lives[0].title = "Inhouse!"
  assert.deepEqual(await discord.eventos(mudada), { criados: 0, mudados: 1, apagados: 0 })
})

test("the live's ping goes once per stream start, pinging only its role", async () => {
  const { d, chamar } = montar({ agora: "2026-11-19T18:02:00Z" })
  const corpo = { inicio: "2026-11-19T18:01:30Z", titulo: "Ranqueadas @everyone", jogo: "Rocket League" }
  assert.equal((await chamar("PUT", "/canal/discord/live", { token: "fulano", corpo })).status, 403)
  const r = await chamar("PUT", "/canal/discord/live", { token: "canal", corpo })
  assert.equal(r.body.avisado, true)
  assert.equal((await chamar("PUT", "/canal/discord/live", { token: "canal", corpo })).body.avisado, false)
  assert.equal(d.mensagens.length, 1)
  const [m] = d.mensagens
  assert.match(m.content, /^<@&r-avisos> 🔴 \*\*Ao vivo agora:\*\* Ranqueadas @​everyone\nRocket League · https:\/\/twitch\.tv\/muanlartins$/)
  assert.deepEqual(m.allowed_mentions, { roles: ["r-avisos"] })
  // A start from yesterday (a dock left open) pings nobody.
  const velho = await chamar("PUT", "/canal/discord/live", { token: "canal", corpo: { ...corpo, inicio: "2026-11-18T18:00:00Z" } })
  assert.equal(velho.body.avisado, false)
})

test("saving the agenda moves the events; the hourly run does both", async () => {
  const { d, chamar, handler, itens } = montar({ sigmas: { fulano: 400 }, membros: { "u-ana": [] } })
  await chamar("PUT", "/agenda", { token: "canal", corpo: AGENDA })
  assert.equal(d.eventos.length, 2)
  itens.set(DISCORD, { login: DISCORD, vinculos: { "u-ana": "fulano" } })
  const r = await handler({ discord: "sincronizar" })
  assert.deepEqual(r.eventos, { criados: 0, mudados: 0, apagados: 0 })
  assert.equal(r.ranks.mudou, 1)
})

test("without the bot's token the routes say so", async () => {
  const handler = rotas({ banco: { ler: async () => null }, usuario: async () => null, chave: "k" })
  const r = await handler({ requestContext: { http: { method: "PUT" } }, rawPath: "/eu/discord", headers: {} })
  assert.equal(r.statusCode, 503)
  assert.equal(await handler({ discord: "sincronizar" }), null)
})

test("an event's text: the game, the run of the show, the agenda", () => {
  assert.equal(descricaoDe({ nome: "Valorant", roteiro: [] }), "Valorant\n\nA agenda: https://muanlartins.com.br/canal/agenda")
})
