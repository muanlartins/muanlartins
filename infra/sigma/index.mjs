// Σ, the channel's points: one total per viewer, earned in the lives and never spent or lost (public/stream/sigma.js
// turns a total into ranks and badges). Deployed by CI (.github/workflows/deploy.yml) into the function
// infra/site.yml creates; the code there is the first version, kept only as what answers until CI's deploy.
//
// The table, keyed by login: sigma, minutos (watched), lives, sequencia (lives in a row, as of their last one),
// recorde (their longest run), ultimaLive, minutosLive (watched in ultimaLive), minuto (the last one credited), primeira (their first live; only
// viewers who arrived after 2026-11-07 have it, so whoever lacks it was there before) and doado (cents sent by
// Pix, added by infra/pix). "#canal" keeps the channel's last two lives, which is how a streak knows it wasn't broken.
//
// GET /sigmas?logins=a,b is public: each one's Σ, minutes, lives, current streak and record; not what they sent.
// GET /audiencia is public too: everyone who has watched a live, the same fields plus their first live, for the
// mural's audience (its milestones and the stand of whoever was there when one was reached).
// GET /live is public: who watched the channel's latest live (today's, while it's on), with their minutes in it, for
// the credits that roll at the end of the stream (public/stream/creditos.html).
// GET /eu with the viewer's Twitch token: their own, with what they sent. POST /presenca comes from the crowd
// overlay once a minute while the stream is on, with who's in the chat and the key: each gets 1 Σ a minute
// (once, however many calls), and on their first minute of a live 10 Σ plus 5 for each live in a row before
// it, up to 50. A live is a day, in Luan's time. POST /var comes from the crowd overlay too, with the key, when the
// chat's verdict on a VAR comes out: who voted for it gets VAR_SIGMA, once per VAR (its id), however many calls.
// GET /presentes, with the key, is who's in the chat right now (credited by POST /presenca in the last PRESENTE
// minutes) with their Σ: the Pix API draws the Christmas gift subs from them.
// GET /sigma.txt?login=a&nome=A is public, plain text: someone's Σ, rank and lives in a line of chat (texto.mjs), the
// chat bot's !sigma, which StreamElements asks with the login and display name of whoever typed it (or of who they
// named: !sigma @fulano) and shows as it comes, so every answer, even a wrong login, is a 200 with a line to say.
// The ball duel's records (duelo.mjs keeps the score): POST /duelo comes from the duel overlay with the key, once per
// fight shown while the stream is on; GET /duelos is public, the ranking and the latest fights, and GET
// /duelos?login=a someone's record and their latest fights; GET /duelo.txt?login=a&nome=A is the chat bot's !duelo,
// like !sigma.
// The marble race's records (corrida.mjs keeps the score): POST /corrida comes from the race overlay with the key, once
// per race that ends while the stream is on; GET /corridas is public, the ranking and the latest races, and GET
// /corridas?login=a someone's record.
// A viewer's page (/torcedor/<login>): POST /dedicatoria comes from the crowd overlay with the key, each goal (a win
// in Valorant) the stand dedicates to someone (dedicatorias.mjs), and GET /pessoa?login=a is public: their Σ and
// streak as /sigmas has them, their first live and the dedications.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { BatchGetCommand, DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { daLive, json, LOGIN, out } from "./comum/http.mjs"
import { quem } from "./comum/twitch.mjs"
import * as Corridas from "./corrida.mjs"
import { anotarDedicatoria, dedicatoria } from "./dedicatorias.mjs"
import { anotar, cedo, deViewer, doViewer, Duelo, GERAL, luta, repetida, resumo, textoDuelo } from "./duelo.mjs"
import { textoSigma } from "./texto.mjs"

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const T = process.env.TABLE
const CANAL = "#canal"
const DONO = "muanlartins" // the channel itself: in its own stand, but it neither earns Σ nor shows any
// Getting the VAR right: very little, three minutes of watching (Luan's call, 2026-11-09).
const VAR_SIGMA = 3
// The crowd overlay credits the chat once a minute: whoever got one of the last few is still there.
const PRESENTE = 2
const MINIJOGOS = "muanlartins.com.br/canal/minijogos"
const lista = (l) => [...new Set(l.map((x) => String(x).toLowerCase()))].filter((x) => LOGIN.test(x)).slice(0, 100)
const diaDe = (t) => new Date(t).toLocaleDateString("sv", { timeZone: "America/Sao_Paulo" })

async function ler(logins) {
  const r = await db.send(new BatchGetCommand({ RequestItems: { [T]: { Keys: logins.map((login) => ({ login })) } } }))
  return Object.fromEntries((r.Responses?.[T] || []).map((i) => [i.login, i]))
}

// Their streak now: it holds while they were in the channel's last live, or in the one before it while today's
// is on (they may still come). Otherwise it broke.
function sequenciaAgora(i, canal, hoje) {
  if (!i.ultimaLive || !i.sequencia) return 0
  if (i.ultimaLive === canal.ultima) return i.sequencia
  if (canal.ultima === hoje && i.ultimaLive === canal.anterior) return i.sequencia
  return 0
}

async function todos() {
  const itens = []
  let ExclusiveStartKey
  do {
    const r = await db.send(new ScanCommand({ TableName: T, ExclusiveStartKey }))
    itens.push(...(r.Items || []))
    ExclusiveStartKey = r.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return itens.filter((i) => i.login !== CANAL && i.login !== DONO && i.lives)
}

async function audiencia(canal, hoje) {
  const pessoas = (await todos()).map((i) => ({ login: i.login, ...publico(i, canal, hoje), ...(i.primeira ? { primeira: i.primeira } : {}) }))
  return pessoas.sort((a, b) => b.minutos - a.minutos || b.lives - a.lives || (a.login < b.login ? -1 : 1))
}

// Who was in the channel's latest live, most minutes in it first. minutosLive started on 2026-11-10: whoever watched
// that day before it was deployed counts from then.
async function live(canal, hoje) {
  const dia = canal.ultima ?? null
  const pessoas = (await todos())
    .filter((i) => dia && i.ultimaLive === dia)
    .map((i) => ({ login: i.login, ...publico(i, canal, hoje), minutosLive: i.minutosLive ?? 0, ...(i.primeira ? { primeira: i.primeira } : {}) }))
  return { dia, pessoas: pessoas.sort((a, b) => b.minutosLive - a.minutosLive || b.sigma - a.sigma || (a.login < b.login ? -1 : 1)) }
}

const publico = (i, canal, hoje) => ({
  sigma: i.sigma ?? 0,
  minutos: i.minutos ?? 0,
  lives: i.lives ?? 0,
  sequencia: sequenciaAgora(i, canal, hoje),
  recorde: Math.max(i.recorde ?? 0, i.sequencia ?? 0),
})

// Who is calling, with their Twitch token issued to this site's app.
async function presenca(event) {
  if (!daLive(event)) return out(401, {})
  let corpo = event.body || "{}"
  if (event.isBase64Encoded) corpo = Buffer.from(corpo, "base64").toString()
  let logins
  try {
    logins = lista(JSON.parse(corpo).logins || []).filter((l) => l !== DONO)
  } catch {
    return out(400, {})
  }
  const minuto = Math.floor(Date.now() / 60000)
  const hoje = diaDe(Date.now())
  const canal = (await ler([CANAL]))[CANAL] || {}
  if (canal.ultima !== hoje) {
    await db.send(
      new UpdateCommand({ TableName: T, Key: { login: CANAL }, UpdateExpression: "SET ultima = :h, anterior = :a", ExpressionAttributeValues: { ":h": hoje, ":a": canal.ultima ?? null } }),
    )
  }
  const anterior = canal.ultima !== hoje ? canal.ultima : canal.anterior
  const itens = logins.length ? await ler(logins) : {}
  let creditados = 0
  await Promise.all(
    logins.map(async (login) => {
      const i = itens[login] || {}
      const nova = i.ultimaLive !== hoje
      const sequencia = !nova ? i.sequencia || 1 : anterior && i.ultimaLive === anterior ? (i.sequencia || 0) + 1 : 1
      const ganho = 1 + (nova ? 10 + 5 * Math.min(sequencia - 1, 10) : 0)
      try {
        await db.send(
          new UpdateCommand({
            TableName: T,
            Key: { login },
            ConditionExpression: "attribute_not_exists(minuto) OR minuto < :m",
            // minutosLive starts over on their first minute of a live.
            UpdateExpression: `SET minuto = :m, ultimaLive = :h, sequencia = :s, recorde = :r${nova ? ", minutosLive = :um" : ""}${itens[login]?.lives ? "" : ", primeira = if_not_exists(primeira, :h)"} ADD sigma :g, minutos :um, lives :l${nova ? "" : ", minutosLive :um"}`,
            ExpressionAttributeValues: {
              ":m": minuto,
              ":h": hoje,
              ":s": sequencia,
              ":r": Math.max(i.recorde ?? 0, i.sequencia ?? 0, sequencia),
              ":g": ganho,
              ":um": 1,
              ":l": nova ? 1 : 0,
            },
          }),
        )
        creditados++
      } catch (e) {
        if (e.name !== "ConditionalCheckFailedException") throw e
      }
    }),
  )
  return out(200, { creditados })
}

// Who voted for the chat's verdict on VAR `id` (the dock's, a timestamp): VAR_SIGMA each. `ultimoVar` keeps the
// last one credited, so a second call (the two crowd sources both send it) changes nothing.
async function acertouVar(event) {
  if (!daLive(event)) return out(401, {})
  let corpo = event.body || "{}"
  if (event.isBase64Encoded) corpo = Buffer.from(corpo, "base64").toString()
  let id, logins
  try {
    const dados = JSON.parse(corpo)
    id = String(dados.id ?? "")
    logins = lista(dados.logins || []).filter((l) => l !== DONO && l !== CANAL)
  } catch {
    return out(400, {})
  }
  if (!/^\d{1,15}$/.test(id)) return out(400, {})
  let creditados = 0
  await Promise.all(
    logins.map(async (login) => {
      try {
        await db.send(
          new UpdateCommand({
            TableName: T,
            Key: { login },
            ConditionExpression: "attribute_not_exists(ultimoVar) OR ultimoVar <> :v",
            UpdateExpression: "SET ultimoVar = :v ADD sigma :g",
            ExpressionAttributeValues: { ":v": id, ":g": VAR_SIGMA },
          }),
        )
        creditados++
      } catch (e) {
        if (e.name !== "ConditionalCheckFailedException") throw e
      }
    }),
  )
  return out(200, { creditados })
}

// A race the overlay showed: run again here (corrida.mjs), counted in "#corridas" and on each viewer's item. Like the
// duel's, "#corridas" is written only if nobody wrote it since it was read.
async function correu(event) {
  if (!daLive(event)) return out(401, {})
  const corpo = json(event)
  if (!corpo) return out(400, {})
  if (corpo.versao !== Corridas.Corrida.VERSAO) return out(409, { versao: Corridas.Corrida.VERSAO })
  const c = Corridas.corrida(corpo)
  if (!c) return out(400, {})
  const itens = await ler([Corridas.GERAL, ...c.logins.filter((l) => l !== DONO)])
  const geral = itens[Corridas.GERAL]
  if (Corridas.repetida(geral, c)) return out(200, { repetida: true })
  if (Corridas.cedo(geral, c)) return out(429, {})
  const novo = Corridas.anotar(geral, c, DONO)
  try {
    await db.send(
      new UpdateCommand({
        TableName: T,
        Key: { login: Corridas.GERAL },
        ConditionExpression: "attribute_not_exists(#t) OR #t = :antes",
        UpdateExpression: "SET #t = :t, placar = :p, ultimas = :u",
        ExpressionAttributeNames: { "#t": "total" },
        ExpressionAttributeValues: { ":antes": geral?.total ?? 0, ":t": novo.total, ":p": novo.placar, ":u": novo.ultimas },
      }),
    )
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") return out(409, {})
    throw e
  }
  await Promise.all(
    c.logins.map((login, i) =>
      login === DONO
        ? null
        : db.send(new UpdateCommand({ TableName: T, Key: { login }, UpdateExpression: "SET corridas = :c", ExpressionAttributeValues: { ":c": Corridas.doViewer(itens[login]?.corridas, c, i) } })),
    ),
  )
  return out(200, { id: c.id, vencedor: c.logins[c.ordem[0]] })
}

// A goal the stand dedicated: kept on their item, once (each stand sends only its own game's).
async function dedicada(event) {
  if (!daLive(event)) return out(401, {})
  const d = dedicatoria(json(event))
  if (!d || d.login === DONO) return out(400, {})
  const i = (await ler([d.login]))[d.login]
  const lista = anotarDedicatoria(i?.dedicatorias, d)
  if (!lista) return out(200, { repetida: true })
  await db.send(new UpdateCommand({ TableName: T, Key: { login: d.login }, UpdateExpression: "SET dedicatorias = :d", ExpressionAttributeValues: { ":d": lista } }))
  return out(200, { guardadas: lista.length })
}

async function presentes(event) {
  if (!daLive(event)) return out(401, {})
  const desde = Math.floor(Date.now() / 60000) - PRESENTE
  const itens = []
  let ExclusiveStartKey
  do {
    const r = await db.send(new ScanCommand({ TableName: T, FilterExpression: "minuto >= :m", ExpressionAttributeValues: { ":m": desde }, ExclusiveStartKey }))
    itens.push(...(r.Items || []))
    ExclusiveStartKey = r.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return out(200, { pessoas: itens.filter((i) => i.login !== CANAL && i.login !== DONO).map((i) => ({ login: i.login, sigma: i.sigma ?? 0 })) })
}

// A fight the duel overlay showed: played again here (duelo.mjs), counted in "#duelos" and on both viewers' items.
// "#duelos" is written only if nobody else wrote it since it was read; the overlay is the only writer, so a clash is
// a second copy of it, whose fight is dropped.
async function duelo(event) {
  if (!daLive(event)) return out(401, {})
  const corpo = json(event)
  if (!corpo) return out(400, {})
  if (corpo.versao !== Duelo.VERSAO) return out(409, { versao: Duelo.VERSAO })
  const l = luta(corpo)
  if (!l) return out(400, {})
  const itens = await ler([GERAL, ...l.logins])
  const geral = itens[GERAL]
  if (repetida(geral, l)) return out(200, { repetida: true })
  if (cedo(geral, l)) return out(429, {})
  const novo = anotar(geral, l)
  try {
    await db.send(
      new UpdateCommand({
        TableName: T,
        Key: { login: GERAL },
        ConditionExpression: "attribute_not_exists(#t) OR #t = :antes",
        UpdateExpression: "SET #t = :t, placar = :p, lutas = :l",
        ExpressionAttributeNames: { "#t": "total" },
        ExpressionAttributeValues: { ":antes": geral?.total ?? 0, ":t": novo.total, ":p": novo.placar, ":l": novo.lutas },
      }),
    )
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") return out(409, {})
    throw e
  }
  await Promise.all(
    l.logins.map((login, i) =>
      login === DONO
        ? null
        : db.send(new UpdateCommand({ TableName: T, Key: { login }, UpdateExpression: "SET duelos = :d", ExpressionAttributeValues: { ":d": doViewer(itens[login]?.duelos, l, i) } })),
    ),
  )
  return out(200, { id: l.id, vencedor: l.vencedor, motivo: l.motivo, segundos: l.segundos })
}

export async function handler(event) {
  const metodo = event.requestContext.http.method
  const caminho = event.rawPath
  // The $default route takes the browser's preflight too; API Gateway adds the CORS headers.
  if (metodo === "OPTIONS") return { statusCode: 204 }
  const hoje = diaDe(Date.now())
  if (metodo === "GET" && caminho === "/sigmas") {
    const logins = lista((event.queryStringParameters?.logins || "").split(",")).filter((l) => l !== DONO)
    if (!logins.length) return out(200, {})
    const itens = await ler([...logins, CANAL])
    const canal = itens[CANAL] || {}
    return out(200, Object.fromEntries(logins.filter((l) => itens[l]).map((l) => [l, publico(itens[l], canal, hoje)])))
  }
  if (metodo === "GET" && caminho === "/sigma.txt") {
    const q = event.queryStringParameters || {}
    const login = String(q.login || "").trim().replace(/^@/, "").toLowerCase()
    const exibido = String(q.nome || "").trim().replace(/^@/, "")
    const texto = (body) => ({ statusCode: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }, body })
    if (!LOGIN.test(login)) return texto("Pra ver os seus Σ: !sigma. Os de alguém: !sigma @fulano.")
    if (login === DONO) return texto("O muanlartins não junta Σ: eles são de quem assiste.")
    const itens = await ler([login, CANAL])
    return texto(textoSigma(exibido.toLowerCase() === login ? exibido : login, itens[login] && publico(itens[login], itens[CANAL] || {}, hoje)))
  }
  if (metodo === "GET" && caminho === "/pessoa") {
    const login = String(event.queryStringParameters?.login || "").trim().replace(/^@/, "").toLowerCase()
    if (!LOGIN.test(login)) return out(400, {})
    if (login === DONO) return out(200, { login, stats: null, primeira: null, dedicatorias: [] })
    const itens = await ler([login, CANAL])
    const i = itens[login]
    const r = out(200, {
      login,
      stats: i ? publico(i, itens[CANAL] || {}, hoje) : null,
      primeira: i?.primeira ?? null,
      dedicatorias: i?.dedicatorias ?? [],
    })
    return { ...r, headers: { ...r.headers, "cache-control": "public, max-age=15" } }
  }
  if (metodo === "GET" && caminho === "/audiencia") {
    const canal = (await ler([CANAL]))[CANAL] || {}
    return out(200, { pessoas: await audiencia(canal, hoje) })
  }
  if (metodo === "GET" && caminho === "/live") {
    const canal = (await ler([CANAL]))[CANAL] || {}
    return out(200, await live(canal, hoje))
  }
  if (metodo === "GET" && caminho === "/eu") {
    const login = await quem(event.headers || {})
    if (!login) return out(401, { erro: "Entre com a Twitch de novo." })
    const itens = await ler([login, CANAL])
    const i = login === DONO ? null : itens[login]
    return out(200, { login, stats: i ? { ...publico(i, itens[CANAL] || {}, hoje), doado: i.doado ?? 0 } : null })
  }
  if (metodo === "GET" && (caminho === "/duelos" || caminho === "/duelo.txt")) {
    const q = event.queryStringParameters || {}
    const login = String(q.login || "").trim().replace(/^@/, "").toLowerCase()
    if (caminho === "/duelo.txt") {
      const exibido = String(q.nome || "").trim().replace(/^@/, "")
      const texto = (body) => ({ statusCode: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }, body })
      if (!LOGIN.test(login)) return texto(`Pra ver o seu duelo: !duelo. O de alguém: !duelo @fulano. Ranking: ${MINIJOGOS}`)
      const itens = await ler([GERAL, login])
      const nome = exibido.toLowerCase() === login ? exibido : login
      return texto(textoDuelo(nome, deViewer(login, itens[login]?.duelos, itens[GERAL], DONO), MINIJOGOS))
    }
    if (q.login !== undefined && !LOGIN.test(login)) return out(400, {})
    const itens = await ler(login ? [GERAL, login] : [GERAL])
    const r = out(200, login ? deViewer(login, itens[login]?.duelos, itens[GERAL], DONO) : resumo(itens[GERAL], DONO))
    return { ...r, headers: { ...r.headers, "cache-control": "public, max-age=15" } }
  }
  if (metodo === "GET" && caminho === "/corridas") {
    const login = String(event.queryStringParameters?.login ?? "").trim().replace(/^@/, "").toLowerCase()
    if (event.queryStringParameters?.login !== undefined && !LOGIN.test(login)) return out(400, {})
    const itens = await ler(login ? [Corridas.GERAL, login] : [Corridas.GERAL])
    const r = out(200, login ? Corridas.deViewer(login, itens[login]?.corridas, itens[Corridas.GERAL]) : Corridas.resumo(itens[Corridas.GERAL]))
    return { ...r, headers: { ...r.headers, "cache-control": "public, max-age=15" } }
  }
  if (metodo === "POST" && caminho === "/corrida") return correu(event)
  if (metodo === "POST" && caminho === "/duelo") return duelo(event)
  if (metodo === "POST" && caminho === "/presenca") return presenca(event)
  if (metodo === "GET" && caminho === "/presentes") return presentes(event)
  if (metodo === "POST" && caminho === "/var") return acertouVar(event)
  if (metodo === "POST" && caminho === "/dedicatoria") return dedicada(event)
  return out(404, {})
}
