// Live Pix: a viewer reserves a value on the site's /pix and pays it straight to Luan's account; the phone
// forwards the bank's notification here; the stream (the Pix overlay and dock) reads what's been paid.
// Deployed by CI (.github/workflows/deploy.yml) into the function infra/site.yml creates.
//
// A value is the reservation's id: R$ 5 is R$ 5,00 while nobody else holds it, then 5,01, 5,02… so the
// viewer never types cents and a Pix finds its message by its amount alone. A value frees when its Pix
// arrives or 15 minutes after it was reserved (plus 5 more, unseen, for a Pix paid at the last second).
//
// The table, one partition per kind (pk), sorted by sk:
//   reserva/<id>        what the viewer filled in, while it waits (expires in 2 days)
//   audio/<id>          a recorded message, until the alert has played
//   valor/<centavos>    who holds a value
//   pix/<iso>#<id>      every paid Pix, forever: the alerts, the goal and the mural
//   pendente/<iso>#<id> a Pix nobody reserved, for the dock to place (with only the payer's first name)
//   visto/<hash>        a notification already seen, since the phone may send one twice
//   limite/<ip>#<n>     reservations from one IP in the n-th 15-minute window, so a script can't hold every value
//   meta/atual          the goal on screen, counting every Pix since it was set
//   meta/<iso>          a goal that ended (sk: when it started), for the mural's history
//
// Public: POST /reservar, GET /reserva?id=, GET /mural (the site's /mural: the goals and who chose to show). The phone: POST /notificacao with x-token. The
// stream: GET /canal, GET /audio?id= and POST /canal with x-chave (the Σ key, already in OBS).

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { filtrar } from "./filtro.mjs"

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } })
const T = process.env.TABLE
const MINUTO = 60_000
const DIA = 24 * 60 * MINUTO
const RESERVA = 15 * MINUTO
const FOLGA = 5 * MINUTO
const SIGMA_POR_REAL = 10
const MINIMO = 100 // R$ 1,00, for a reservation; a Pix that arrives by itself counts at any value
const MAXIMO = 1_000_000 // R$ 10.000,00
const POR_IP = 5 // reservations per IP every RESERVA
const VOZ = /^[a-z0-9]{1,16}$/
const LOGIN = /^[a-z0-9_]{1,25}$/
const DONO = "muanlartins" // the channel's own login: its Pix are tests
const AUDIO = /^audio\/(webm|ogg|mp4|mpeg)(;[\w=.,\s-]*)?$/
const BASE64 = /^[A-Za-z0-9+/]+=*$/
const MAX_AUDIO = 360_000 // base64 characters: ~270 KB, far more than 20 s of Opus

const out = (statusCode, body) => ({ statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const novoId = () => randomBytes(9).toString("base64url")
const expiraEm = (ms) => Math.floor((Date.now() + ms) / 1000)
const iso = (t) => new Date(t).toISOString()
const linha = (s, max) => [...String(s ?? "").replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()
const igual = (a, b) => typeof a === "string" && !!b && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

function lerCorpo(event) {
  const b = event.body || ""
  return event.isBase64Encoded ? Buffer.from(b, "base64").toString() : b
}
function lerJson(event) {
  try {
    const j = JSON.parse(lerCorpo(event) || "{}")
    return j && typeof j === "object" ? j : null
  } catch {
    return null
  }
}

async function todos(pk, { desde, desc = false, limite } = {}) {
  const itens = []
  let ExclusiveStartKey
  do {
    const r = await db.send(
      new QueryCommand({
        TableName: T,
        KeyConditionExpression: desde ? "pk = :pk AND sk >= :d" : "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk, ...(desde ? { ":d": desde } : {}) },
        ScanIndexForward: !desc,
        Limit: limite,
        ExclusiveStartKey,
      }),
    )
    itens.push(...r.Items)
    ExclusiveStartKey = limite ? undefined : r.LastEvaluatedKey
  } while (ExclusiveStartKey)
  return itens
}
const ler = async (pk, sk) => (await db.send(new GetCommand({ TableName: T, Key: { pk, sk } }))).Item
const apagar = (pk, sk) => db.send(new DeleteCommand({ TableName: T, Key: { pk, sk } }))
async function seCondicao(promessa) {
  try {
    await promessa
    return true
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") return false
    throw e
  }
}

// --- The QR: BCB's EMV BRCode ("Pix copia e cola"), with the same fields as the bank's own static QR ------

const emv = (id, v) => id + String(v.length).padStart(2, "0") + v
function crc16(s) {
  let crc = 0xffff
  for (const b of Buffer.from(s)) {
    crc ^= b << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}
export function brcode(centavos) {
  const s =
    emv("00", "01") +
    emv("01", "11") +
    emv("26", emv("00", "br.gov.bcb.pix") + emv("01", process.env.PIX_CHAVE)) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", (centavos / 100).toFixed(2)) +
    emv("58", "BR") +
    emv("59", process.env.PIX_NOME) +
    emv("60", process.env.PIX_CIDADE) +
    emv("62", emv("05", "***")) +
    "6304"
  return s + crc16(s)
}

// Who is calling, if they signed in with Twitch on the site: their Pix earns them Σ.
async function quem(headers) {
  const token = (headers.authorization || "").replace(/^Bearer /, "")
  if (!token) return null
  const r = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: "OAuth " + token } })
  if (!r.ok) return null
  const v = await r.json()
  return v.client_id === process.env.TWITCH_CLIENT_ID && LOGIN.test(v.login) ? v.login : null
}

// --- The viewer -------------------------------------------------------------------------------------

async function demais(ip) {
  const janela = Math.floor(Date.now() / RESERVA)
  const r = await db.send(
    new UpdateCommand({
      TableName: T,
      Key: { pk: "limite", sk: `${ip}#${janela}` },
      UpdateExpression: "ADD n :um SET #ttl = :ttl",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: { ":um": 1, ":ttl": expiraEm(2 * RESERVA) },
      ReturnValues: "UPDATED_NEW",
    }),
  )
  return r.Attributes.n > POR_IP
}

async function reservar(event) {
  const p = lerJson(event)
  if (!p) return out(400, { erro: "Pedido inválido." })
  const pedido = Number(p.centavos)
  if (!Number.isInteger(pedido) || pedido < MINIMO || pedido > MAXIMO) return out(400, { erro: "Escolha um valor entre R$ 1 e R$ 10.000." })
  let audio
  if (p.audio) {
    const { tipo, dados } = p.audio
    if (!AUDIO.test(tipo) || typeof dados !== "string" || dados.length > MAX_AUDIO || !BASE64.test(dados)) return out(400, { erro: "Não deu para enviar o áudio. Grave de novo, mais curto." })
    audio = { tipo, dados }
  }
  if (await demais(event.requestContext.http.sourceIp)) return out(429, { erro: "Muitas reservas seguidas. Espere alguns minutos e tente de novo." })
  const login = await quem(event.headers || {})
  const agora = Date.now()
  const id = novoId()

  let centavos = null
  for (let c = pedido; c < pedido + 100 && c <= MAXIMO && centavos === null; c++) {
    const livre = await seCondicao(
      db.send(
        new PutCommand({
          TableName: T,
          Item: { pk: "valor", sk: String(c), reserva: id, expira: agora + RESERVA, ttl: expiraEm(DIA) },
          ConditionExpression: "attribute_not_exists(sk) OR expira < :livre",
          ExpressionAttributeValues: { ":livre": agora - FOLGA },
        }),
      ),
    )
    if (livre) centavos = c
  }
  if (centavos === null) return out(409, { erro: "Muitos Pix esperando nesse valor. Tente outro." })

  if (audio) await db.send(new PutCommand({ TableName: T, Item: { pk: "audio", sk: id, ...audio, ttl: expiraEm(2 * DIA) } }))
  await db.send(
    new PutCommand({
      TableName: T,
      Item: {
        pk: "reserva",
        sk: id,
        centavos,
        nome: filtrar(linha(p.nome, 25)).texto,
        mensagem: audio ? "" : filtrar(linha(p.mensagem, 200)).texto,
        audio: audio?.tipo,
        voz: VOZ.test(p.voz) ? p.voz : undefined,
        quando: p.quando === "entre" ? "entre" : "agora",
        mural: p.mural === true,
        login: login ?? undefined,
        pago: false,
        criada: agora,
        expira: agora + RESERVA,
        ttl: expiraEm(2 * DIA),
      },
    }),
  )
  return out(200, { id, centavos, brcode: brcode(centavos), expira: agora + RESERVA, login, sigma: login ? Math.floor((centavos * SIGMA_POR_REAL) / 100) : 0 })
}

async function situacao(id) {
  const r = typeof id === "string" && id.length < 32 ? await ler("reserva", id) : null
  return out(200, r ? { pago: r.pago, expira: r.expira, ate: r.expira + FOLGA } : { pago: false, expira: 0, ate: 0 })
}

async function meta() {
  const m = await ler("meta", "atual")
  if (!m) return null
  const arrecadado = (await todos("pix", { desde: m.desde })).reduce((t, p) => t + p.centavos, 0)
  return { titulo: m.titulo, alvo: m.alvo, arrecadado }
}

/** Ends the goal on screen; it goes to the history, unless no Pix came while it was up (a typo, say). */
async function encerrar() {
  const m = await ler("meta", "atual")
  if (!m) return
  const pix = await todos("pix", { desde: m.desde })
  if (pix.length) {
    const arrecadado = pix.reduce((t, p) => t + p.centavos, 0)
    await db.send(new PutCommand({ TableName: T, Item: { pk: "meta", sk: m.desde, titulo: m.titulo, alvo: m.alvo, desde: m.desde, ate: iso(Date.now()), arrecadado } }))
  }
  await apagar("meta", "atual")
}

/**
 * When the Pix of no goal began: the first since the last goal ended (or the first ever), leaving out the channel's
 * own (Luan's tests); now, if there's none.
 */
async function semMeta() {
  const fim = (await todos("meta")).filter((m) => m.sk !== "atual").reduce((a, m) => (m.ate > a ? m.ate : a), "")
  const primeiro = (await todos("pix", fim ? { desde: fim } : {})).find((p) => p.login !== DONO)
  return primeiro ? primeiro.sk.slice(0, 24) : iso(Date.now())
}

// The mural: each goal (the one on screen, then the ones before) with the Pix that came while it was up,
// and the Pix of no goal. A Pix shows by name only if its sender ticked the mural; with their Twitch
// login when they signed in, so the page can draw their fan. The rest count, without a name.
async function mural() {
  const [todosPix, metas] = await Promise.all([todos("pix"), todos("meta")])
  const atual = metas.find((m) => m.sk === "atual")
  const goals = [
    ...(atual ? [{ titulo: atual.titulo, alvo: atual.alvo, desde: atual.desde, ate: null }] : []),
    ...metas
      .filter((m) => m.sk !== "atual")
      .sort((a, b) => (a.desde < b.desde ? 1 : -1))
      .map((m) => ({ titulo: m.titulo, alvo: m.alvo, desde: m.desde, ate: m.ate })),
  ]
  const daMeta = (p) => goals.findIndex((g) => p.sk >= g.desde && (!g.ate || p.sk < g.ate))
  const mostra = (p) => ({
    em: p.sk.slice(0, 24),
    nome: p.nome,
    mensagem: p.mensagem || p.transcricao || "",
    centavos: p.centavos,
    login: p.login,
  })
  const contas = goals.map(() => ({ arrecadado: 0, pix: 0, apoiadores: [] }))
  const semMeta = []
  for (const p of todosPix.reverse()) {
    const i = daMeta(p)
    if (i >= 0) {
      contas[i].arrecadado += p.centavos
      contas[i].pix++
    }
    if (!p.mural || p.oculto) continue
    if (i >= 0) contas[i].apoiadores.push(mostra(p))
    else semMeta.push(mostra(p))
  }
  const lista = goals.map((g, i) => ({ ...g, ...contas[i] }))
  return out(200, {
    meta: atual ? lista[0] : null,
    metas: atual ? lista.slice(1) : lista,
    pix: semMeta,
  })
}

// --- A Pix arrives ------------------------------------------------------------------------------------

/** A Pix on the record: an alert for the stream, a line on the mural (if they agreed), and their Σ. */
async function registrar(r, origem) {
  const agora = Date.now()
  const item = {
    pk: "pix",
    sk: `${iso(agora)}#${r.sk ?? novoId()}`,
    centavos: r.centavos,
    nome: r.nome || "",
    mensagem: r.mensagem || "",
    transcricao: r.transcricao,
    sujo: r.sujo,
    audio: r.audio,
    voz: r.voz,
    quando: r.quando || "agora",
    mural: !!r.mural,
    login: r.login,
    reserva: r.sk,
    origem,
    exibido: false,
  }
  await db.send(new PutCommand({ TableName: T, Item: item }))
  if (r.login) {
    await db.send(
      new UpdateCommand({
        TableName: process.env.SIGMAS,
        Key: { login: r.login },
        UpdateExpression: "ADD sigma :s, doado :c",
        ExpressionAttributeValues: { ":s": Math.floor((r.centavos * SIGMA_POR_REAL) / 100), ":c": r.centavos },
      }),
    )
  }
  return item
}

/** The reservation, now paid, unless it was already (each pays once). Frees its value. */
async function quitar(id) {
  let r
  try {
    r = (
      await db.send(
        new UpdateCommand({
          TableName: T,
          Key: { pk: "reserva", sk: id },
          ConditionExpression: "attribute_exists(sk) AND pago = :nao",
          UpdateExpression: "SET pago = :sim",
          ExpressionAttributeValues: { ":nao": false, ":sim": true },
          ReturnValues: "ALL_NEW",
        }),
      )
    ).Attributes
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") return null
    throw e
  }
  await seCondicao(
    db.send(
      new DeleteCommand({ TableName: T, Key: { pk: "valor", sk: String(r.centavos) }, ConditionExpression: "reserva = :r", ExpressionAttributeValues: { ":r": id } }),
    ),
  )
  return r
}

/** A Pix of this value: it pays the reservation holding it, or waits in the dock for Luan to place it. */
async function receber(centavos, { primeiro, nome, origem }) {
  const valor = await ler("valor", String(centavos))
  if (valor && valor.expira + FOLGA >= Date.now()) {
    const r = await quitar(valor.reserva)
    if (r) return { pix: await registrar(r, origem) }
  }
  if (nome !== undefined) return { pix: await registrar({ centavos, nome: filtrar(linha(nome, 25)).texto }, origem) }
  // Nobody reserved it. Not on screen by itself: it may be a personal Pix that has nothing to do with the live.
  const pendente = { pk: "pendente", sk: `${iso(Date.now())}#${novoId()}`, centavos, primeiro, ttl: expiraEm(3 * DIA) }
  await db.send(new PutCommand({ TableName: T, Item: pendente }))
  return { pendente }
}

// Inter: "Pix recebido · NOME te enviou um Pix de R$ 1.234,56 creditado na sua conta…". Anything else from
// the bank (a Pix sent, a purchase) carries no such sentence and is ignored. The second one is for tests.
const FORMATOS = [
  /(?:Pix recebido\s+)?(?<nome>\S[^\n]*?)\s+te enviou um Pix de R\$\s?(?<valor>[\d.]+,\d{2})/,
  /Você recebeu um Pix de R\$\s?(?<valor>[\d.]+,\d{2}) de (?<nome>[^\n.]+)/,
]
export function lerNotificacao(texto) {
  const g = FORMATOS.map((f) => texto.match(f)?.groups).find(Boolean)
  if (!g) return null
  const primeiro = g.nome.trim().split(/\s+/)[0].toLowerCase().replace(/^\p{L}/u, (c) => c.toUpperCase())
  return { centavos: Number(g.valor.replace(/\./g, "").replace(",", "")), primeiro }
}

async function notificacao(event) {
  const token = event.headers?.["x-token"] ?? event.queryStringParameters?.t
  if (!igual(token, process.env.PIX_TOKEN)) return out(401, {})
  let texto = lerCorpo(event)
  const j = (() => {
    try {
      return JSON.parse(texto)
    } catch {
      return null
    }
  })()
  if (j && typeof j === "object") texto = [j.title, j.text, j.texto].filter(Boolean).join(" ")
  texto = String(texto).replace(/\s+/g, " ").trim().slice(0, 1000)
  const lido = lerNotificacao(texto)
  if (!lido || lido.centavos < 1) return out(200, { ignorada: true })
  const agora = Date.now()
  const hash = createHash("sha256").update(texto).digest("hex").slice(0, 32)
  const nova = await seCondicao(
    db.send(
      new PutCommand({
        TableName: T,
        Item: { pk: "visto", sk: hash, em: agora, ttl: expiraEm(DIA) },
        ConditionExpression: "attribute_not_exists(sk) OR em < :antes",
        ExpressionAttributeValues: { ":antes": agora - 15_000 },
      }),
    ),
  )
  if (!nova) return out(200, { repetida: true })
  const r = await receber(lido.centavos, { primeiro: lido.primeiro, origem: "notificacao" })
  return out(200, { centavos: lido.centavos, reserva: !!r.pix?.reserva, pendente: !!r.pendente })
}

// --- The stream ---------------------------------------------------------------------------------------

async function canal() {
  const agora = Date.now()
  const [pix, pendentes, reservas, m] = await Promise.all([
    todos("pix", { desc: true, limite: 30 }),
    todos("pendente"),
    todos("reserva"),
    meta(),
  ])
  return out(200, {
    agora,
    pix,
    pendentes,
    reservas: reservas
      .filter((r) => !r.pago && r.expira + FOLGA >= agora)
      .map(({ sk, centavos, nome, mensagem, audio, transcricao, sujo, voz, quando, expira }) => ({ id: sk, centavos, nome, mensagem, audio, transcricao, sujo, voz, quando, expira })),
    meta: m,
  })
}

const atualizar = (pk, sk, sets) =>
  seCondicao(
    db.send(
      new UpdateCommand({
        TableName: T,
        Key: { pk, sk },
        ConditionExpression: "attribute_exists(sk)",
        UpdateExpression: "SET " + Object.keys(sets).map((k, i) => `#k${i} = :v${i}`).join(", "),
        ExpressionAttributeNames: Object.fromEntries(Object.keys(sets).map((k, i) => [`#k${i}`, k])),
        ExpressionAttributeValues: Object.fromEntries(Object.values(sets).map((v, i) => [`:v${i}`, v])),
      }),
    ),
  )

async function acao(p) {
  const { acao } = p
  if (acao === "registrar") {
    const centavos = Number(p.centavos)
    if (!Number.isInteger(centavos) || centavos < 1 || centavos > MAXIMO) return out(400, { erro: "valor" })
    return out(200, await receber(centavos, { nome: typeof p.nome === "string" ? p.nome : "", origem: "manual" }))
  }
  if (acao === "ligar" || acao === "anonimo" || acao === "ignorar") {
    const pendente = typeof p.pendente === "string" && (await ler("pendente", p.pendente))
    if (!pendente) return out(404, {})
    let pix
    if (acao === "ligar") {
      const r = typeof p.reserva === "string" && (await quitar(p.reserva))
      if (!r) return out(409, { erro: "Essa reserva já foi paga ou não existe." })
      pix = await registrar({ ...r, centavos: pendente.centavos }, "ligado")
    }
    if (acao === "anonimo") pix = await registrar({ centavos: pendente.centavos, nome: "" }, "anonimo")
    await apagar("pendente", pendente.sk)
    return out(200, { pix })
  }
  if (acao === "exibido" || acao === "repetir") {
    if (typeof p.pix !== "string") return out(400, {})
    const ok = await atualizar("pix", p.pix, { exibido: acao === "exibido" })
    if (ok && acao === "exibido" && typeof p.reserva === "string") await apagar("audio", p.reserva)
    return out(ok ? 200 : 404, {})
  }
  if (acao === "ocultar") {
    if (typeof p.pix !== "string") return out(400, {})
    return out((await atualizar("pix", p.pix, { oculto: p.oculto !== false })) ? 200 : 404, {})
  }
  // A recording's words, from the stream's whisper: filtered here, kept for the mural.
  if (acao === "transcricao") {
    const { texto, sujo } = filtrar(linha(p.texto, 400))
    if (typeof p.reserva === "string") await atualizar("reserva", p.reserva, { transcricao: texto, sujo })
    if (typeof p.pix === "string") await atualizar("pix", p.pix, { transcricao: texto, sujo })
    return out(200, { texto, sujo })
  }
  // A new goal ends the one before; "ajustar" changes the one on screen and keeps its count. With "avulsos", a goal
  // (new or adjusted) counts from the first Pix since the last goal ended (or the first ever, if none did).
  if (acao === "meta") {
    const alvo = Number(p.alvo)
    if (!Number.isInteger(alvo) || alvo < 1) {
      await encerrar()
      return out(200, { meta: null })
    }
    const titulo = filtrar(linha(p.titulo, 60)).texto
    if (!(p.ajustar && (await atualizar("meta", "atual", { titulo, alvo, ...(p.avulsos ? { desde: await semMeta() } : {}) })))) {
      await encerrar()
      await db.send(new PutCommand({ TableName: T, Item: { pk: "meta", sk: "atual", titulo, alvo, desde: p.avulsos ? await semMeta() : iso(Date.now()) } }))
    }
    return out(200, { meta: await meta() })
  }
  return out(400, { erro: "acao" })
}

export async function handler(event) {
  const metodo = event.requestContext.http.method
  const caminho = event.rawPath
  // The $default route takes the browser's preflight too; API Gateway adds the CORS headers.
  if (metodo === "OPTIONS") return { statusCode: 204 }
  if (metodo === "POST" && caminho === "/reservar") return reservar(event)
  if (metodo === "GET" && caminho === "/reserva") return situacao(event.queryStringParameters?.id)
  if (metodo === "GET" && caminho === "/mural") return mural()
  if (metodo === "POST" && caminho === "/notificacao") return notificacao(event)

  if (!igual(event.headers?.["x-chave"], process.env.CHAVE)) return out(caminho === "/canal" || caminho === "/audio" ? 401 : 404, {})
  if (metodo === "GET" && caminho === "/canal") return canal()
  if (metodo === "GET" && caminho === "/audio") {
    const a = await ler("audio", String(event.queryStringParameters?.id ?? ""))
    return a ? out(200, { tipo: a.tipo, dados: a.dados }) : out(404, {})
  }
  if (metodo === "POST" && caminho === "/canal") {
    const p = lerJson(event)
    return p ? acao(p) : out(400, {})
  }
  return out(404, {})
}
