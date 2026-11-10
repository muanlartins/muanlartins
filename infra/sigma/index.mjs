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

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { BatchGetCommand, DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const T = process.env.TABLE
const LOGIN = /^[a-z0-9_]{1,25}$/
const CANAL = "#canal"
const DONO = "muanlartins" // the channel itself: in its own stand, but it neither earns Σ nor shows any
// Getting the VAR right: very little, three minutes of watching (Luan's call, 2026-11-09).
const VAR_SIGMA = 3
const out = (statusCode, body) => ({ statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
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
async function quem(headers) {
  const token = (headers.authorization || "").replace(/^Bearer /, "")
  if (!token) return null
  const r = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: "OAuth " + token } })
  if (!r.ok) return null
  const v = await r.json()
  return v.client_id === process.env.TWITCH_CLIENT_ID && LOGIN.test(v.login) ? v.login : null
}

async function presenca(event) {
  if (!process.env.CHAVE || event.headers?.["x-chave"] !== process.env.CHAVE) return out(401, {})
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
  if (!process.env.CHAVE || event.headers?.["x-chave"] !== process.env.CHAVE) return out(401, {})
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
  if (metodo === "POST" && caminho === "/presenca") return presenca(event)
  if (metodo === "POST" && caminho === "/var") return acertouVar(event)
  return out(404, {})
}
