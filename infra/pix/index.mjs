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
//   meta/atual          the goal on screen, counting every Pix since it was set (`desde`), until its `prazo` if it has one
//   meta/proxima        a goal set ahead of time: on its `desde` it takes the screen, ending the one before
//   meta/<iso>          a goal that ended (sk: when it started), for the mural's history
//   sorteio/<desde>#<n> the n-th gift sub drawn in a Christmas goal (the goal's `desde`), to whom, and whether it was given
//
// Public: POST /reservar, GET /reserva?id=, POST /musica (a refused song's new text), GET /mural (the site's /mural:
// the goals and their Pix), GET /metas (the goals alone, with their dates, for the agenda). The phone: POST /notificacao with x-token. The stream: GET /canal, GET /audio?id= and
// POST /canal with x-chave (the Σ key, already in OBS).
//
// A Christmas goal (tema "natal", from the dock): each of its Pix hangs a present on the tree that the overlay and the
// mural draw (public/stream/presente.js), as chosen on /pix (`presente`, kept as sent: the drawing checks it) or, with
// none, one picked from the moment it came; and every R$ 10 it makes (SUB, the extra too) is a sub Luan gives to someone in
// the stand: the dock's "Sortear sub" (acao "sortear") draws them here, once each, from who's in the chat right now (the
// Σ API's GET /presentes, with the key) weighted by Σ as the goal's dedication is (1 + ln(1 + Σ), sigma.js), never the
// channel or someone who already won one in that goal; the overlay plays the draw and the mural lists who won.
//
// A goal's dates are Brasília's days (no daylight saving since 2019, so midnight is 03:00 UTC): it runs until the
// midnight that ends its last day, and one set ahead starts at the midnight that begins its first. Nothing runs at
// midnight: every read goes through `vigente`, which moves the calendar on first (a goal past its end goes to the
// history, a scheduled one whose day came takes the screen), so whoever looks first after midnight does it.
//
// A song (musica.mjs), from R$ 5: the form sends a style and a theme or lyrics, checked by the word filter and by
// Gemini before the QR. Once paid, the Pix's `musica` is "gerando" and this function invokes itself with
// { musica: <pix sk> } (InvocationType Event), so the request that paid never waits for Google: Lyria makes it in
// ~25 s and it goes to the site's bucket as pt/musicas/<random>.mp3, which the site serves at /musicas/ (CI's sync
// leaves that folder alone): "pronta". Google refusing the text makes it "recusada": the viewer, still on /pix, may
// change it EDICOES times within ESPERA, else it plays as a plain alert ("falhou"). Trouble on the way throws, and
// Lambda tries an async event twice more; the third failure is "falhou" too, and the dock can make it again. The
// stream plays a song once it's "pronta" (or the plain alert once "falhou"), and the mural shows it, to listen and
// download, only after it played on the live (`tocou`). Before "pronta", Gemini Flash hears it with its lyrics and says
// when each line is sung (`tempos`, one [start, end] per line of `letraCantada`, ~12 s): the overlay and the mural show
// the lyrics in time, Spotify-style; without them (Google out of reach, too few lines placed) the song plays all the
// same. The dock's "Sincronizar letra" (POST /canal acao "letra") asks again, from the song on the site.

import { createHash, randomBytes } from "node:crypto"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import { corpo as lerCorpo, igual, json as lerJson, out } from "./comum/http.mjs"
import { quem } from "./comum/twitch.mjs"
import { filtrar } from "./filtro.mjs"
import { EDICOES, ESPERA, estadoDe, gerar, MINIMO_MUSICA, PERDIDA, pedidoDe, revisar, segundosDe, sincronizar } from "./musica.mjs"

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } })
const s3 = new S3Client({})
const lambda = new LambdaClient({})
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
const DONO = "muanlartins" // the channel's own login: its Pix are tests
const AUDIO = /^audio\/(webm|ogg|mp4|mpeg)(;[\w=.,\s-]*)?$/
const BASE64 = /^[A-Za-z0-9+/]+=*$/
const MAX_AUDIO = 360_000 // base64 characters: ~270 KB, far more than 20 s of Opus
// Where the site serves the songs; a local stand-in points it at itself.
const MUSICAS_URL = process.env.MUSICAS_URL ?? "/musicas/"
const SITE = "https://muanlartins.com.br"
const FALHAS = 3 // tries at making a song before it plays as a plain alert: one and Lambda's two retries
const RODANDO = 110_000 // a run that claimed a song this long ago died (Google's own wait is 95 s, the function's 120 s)
const SINCRONIA = 30_000 // the most the lyrics' timing may take; a run still ends by 100 s, well before RODANDO
const SUJA = "Tem uma palavra aí que não pode tocar na live. Mude o texto e tente de novo."
const TEMAS = ["natal"]
const SUB = 1000 // a gift sub for every R$ 10 of a Christmas goal (Luan's call, 2026-11-14)
// The Σ API (infra/sigma), for who's in the chat when a sub is drawn; a local stand-in points it elsewhere.
const SIGMA_API = process.env.SIGMA_API ?? "https://p1rblei1o9.execute-api.us-east-1.amazonaws.com"
const HEX = /^#[0-9a-f]{6}$/
const NOME_CURTO = /^[a-z]{1,12}$/

const novoId = () => randomBytes(9).toString("base64url")
const expiraEm = (ms) => Math.floor((Date.now() + ms) / 1000)
const iso = (t) => new Date(t).toISOString()
const linha = (s, max) => [...String(s ?? "").replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()

/** A present for the Christmas tree as /pix sends it: its shape, two colours and pattern, kept only in that form. */
function presenteDe(p) {
  if (!p || typeof p !== "object") return undefined
  const { formato, cor, detalhe, padrao } = p
  const ok = NOME_CURTO.test(formato) && HEX.test(cor) && HEX.test(detalhe) && NOME_CURTO.test(padrao)
  return ok ? { formato, cor, detalhe, padrao } : undefined
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
  let musica
  if (p.musica !== undefined) {
    musica = pedidoDe(p.musica)
    if (musica.erro) return out(400, { erro: musica.erro, campo: "musica" })
    if (pedido < MINIMO_MUSICA) return out(400, { erro: "A música é a partir de R$ 5." })
    if (!process.env.GEMINI_CHAVE) return out(503, { erro: "A música ainda não está disponível. Mande uma mensagem por enquanto." })
    if (filtrar(musica.sobre ?? musica.letra).sujo) return out(422, { erro: SUJA, campo: "musica" })
  }
  let audio
  if (p.audio && !musica) {
    const { tipo, dados } = p.audio
    if (!AUDIO.test(tipo) || typeof dados !== "string" || dados.length > MAX_AUDIO || !BASE64.test(dados)) return out(400, { erro: "Não deu para enviar o áudio. Grave de novo, mais curto." })
    audio = { tipo, dados }
  }
  if (await demais(event.requestContext.http.sourceIp)) return out(429, { erro: "Muitas reservas seguidas. Espere alguns minutos e tente de novo." })
  if (musica) {
    const v = await revisar(musica, { chave: process.env.GEMINI_CHAVE })
    if (v.sem) console.log("musica: revisão pulada", v.sem)
    if (!v.ok) return out(422, { erro: v.motivo, campo: "musica" })
  }
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
        mensagem: audio || musica ? "" : filtrar(linha(p.mensagem, 200)).texto,
        audio: audio?.tipo,
        voz: musica ? "antonio" : VOZ.test(p.voz) ? p.voz : undefined,
        musica,
        quando: p.quando === "entre" ? "entre" : "agora",
        presente: presenteDe(p.presente),
        // Every Pix from the form shows on the mural by the name and message its sender wrote, as the live does
        // (since 2026-11-10; before, only if they ticked the mural). The dock can take one off.
        mural: true,
        login: login ?? undefined,
        pago: false,
        criada: agora,
        expira: agora + RESERVA,
        ttl: expiraEm(2 * DIA),
      },
    }),
  )
  return out(200, { id, centavos, brcode: brcode(centavos), expira: agora + RESERVA, login, sigma: login && login !== DONO ? Math.floor((centavos * SIGMA_POR_REAL) / 100) : 0 })
}

async function situacao(id) {
  const r = typeof id === "string" && id.length < 32 ? await ler("reserva", id) : null
  if (!r) return out(200, { pago: false, expira: 0, ate: 0 })
  const base = { pago: r.pago, expira: r.expira, ate: r.expira + FOLGA }
  if (!r.musica) return out(200, base)
  const m = r.pix ? (await ler("pix", r.pix))?.musica : null
  return out(200, { ...base, musica: m ? paraQuemPediu(m) : { estado: r.pago ? "gerando" : "esperando" } })
}

/** The song as its sender sees it on /pix: its state, and after a refusal why, what they wrote and how long they have. */
function paraQuemPediu(m) {
  const estado = estadoDe(m)
  return {
    estado,
    estilo: m.estilo,
    sobre: m.sobre,
    letra: m.letra,
    ...(estado === "recusada" ? { motivo: m.motivo, edicoes: EDICOES - (m.edicoes ?? 0), ate: (m.recusadaEm ?? 0) + ESPERA } : {}),
  }
}

/** A refused song's new text, from its sender (the reservation's id is their proof): checked again, then made again. */
async function editarMusica(event) {
  const p = lerJson(event)
  const r = p && typeof p.id === "string" && p.id.length < 32 ? await ler("reserva", p.id) : null
  if (!r?.pix || !r.musica) return out(404, { erro: "Não achei esse Pix." })
  const m = (await ler("pix", r.pix))?.musica
  if (!m || estadoDe(m) !== "recusada" || (m.edicoes ?? 0) >= EDICOES) return out(409, { erro: "Essa música não está mais esperando um texto novo." })
  const novo = pedidoDe({ estilo: p.estilo ?? m.estilo, sobre: p.sobre, letra: p.letra })
  if (novo.erro) return out(400, { erro: novo.erro })
  if (filtrar(novo.sobre ?? novo.letra).sujo) return out(422, { erro: SUJA })
  const v = await revisar(novo, { chave: process.env.GEMINI_CHAVE })
  if (!v.ok) return out(422, { erro: v.motivo })
  const ok = await mudarMusica(
    r.pix,
    { estilo: novo.estilo, ...(novo.letra ? { letra: novo.letra } : { sobre: novo.sobre }), estado: "gerando", pedidoEm: Date.now(), edicoes: (m.edicoes ?? 0) + 1, falhas: 0 },
    { remover: [novo.letra ? "sobre" : "letra", "motivo", "recusadaEm"], se: "musica.estado = :r", valores: { ":r": "recusada" } },
  )
  if (!ok) return out(409, { erro: "Essa música não está mais esperando um texto novo." })
  await disparar(r.pix)
  return out(200, { musica: paraQuemPediu({ ...m, ...novo, estado: "gerando" }) })
}

// Brasília's days as instants: "2026-11-30" begins at 03:00 UTC that day; its end is the next day's beginning.
const DIA_BR = /^\d{4}-\d{2}-\d{2}$/
function inicioDoDia(dia) {
  if (typeof dia !== "string" || !DIA_BR.test(dia)) return null
  const t = Date.parse(`${dia}T03:00:00.000Z`)
  return Number.isNaN(t) || iso(t).slice(0, 10) !== dia ? null : iso(t)
}
const fimDoDia = (dia) => {
  const inicio = inicioDoDia(dia)
  return inicio && iso(Date.parse(inicio) + DIA)
}
const historico = (metas) => metas.filter((m) => m.sk !== "atual" && m.sk !== "proxima")
const comTema = (m) => (m?.tema ? { tema: m.tema } : {})
const somar = (pix) => pix.reduce((t, p) => t + p.centavos, 0)

/**
 * Ends a goal at `ate`: into the history with what came in until then (unless nothing did: a typo, say), then off the
 * screen, if it's still that one there.
 */
async function arquivar(m, ate) {
  const pix = (await todos("pix", { desde: m.desde })).filter((p) => p.sk < ate)
  if (pix.length) {
    const item = { pk: "meta", sk: m.desde, titulo: m.titulo, alvo: m.alvo, desde: m.desde, ate, arrecadado: somar(pix), ...(m.prazo ? { prazo: m.prazo } : {}), ...comTema(m) }
    await db.send(new PutCommand({ TableName: T, Item: item }))
  }
  await seCondicao(
    db.send(new DeleteCommand({ TableName: T, Key: { pk: "meta", sk: "atual" }, ConditionExpression: "#d = :d", ExpressionAttributeNames: { "#d": "desde" }, ExpressionAttributeValues: { ":d": m.desde } })),
  )
}

/**
 * The goal on screen and the one scheduled, after moving the calendar on to `agora`: the one on screen ends at its
 * `prazo` or when the scheduled one starts, whichever comes first, and the scheduled one takes the screen on its day.
 */
async function vigente(agora = Date.now()) {
  let [m, p] = await Promise.all([ler("meta", "atual"), ler("meta", "proxima")])
  for (let volta = 0; volta < 3; volta++) {
    const comeca = p && Date.parse(p.desde) <= agora ? p.desde : null
    const fim = [m?.prazo, comeca].filter((t) => t && Date.parse(t) <= agora).sort()[0]
    if (m && fim) {
      await arquivar(m, fim)
      m = null
    }
    if (m || !comeca) break
    const nova = { pk: "meta", sk: "atual", titulo: p.titulo, alvo: p.alvo, desde: p.desde, ...(p.prazo ? { prazo: p.prazo } : {}), ...comTema(p) }
    const pus = await seCondicao(db.send(new PutCommand({ TableName: T, Item: nova, ConditionExpression: "attribute_not_exists(sk)" })))
    await seCondicao(
      db.send(new DeleteCommand({ TableName: T, Key: { pk: "meta", sk: "proxima" }, ConditionExpression: "#d = :d", ExpressionAttributeNames: { "#d": "desde" }, ExpressionAttributeValues: { ":d": p.desde } })),
    )
    // Someone else moved it on at the same moment: theirs is on screen.
    m = pus ? nova : await ler("meta", "atual")
    p = await ler("meta", "proxima")
  }
  return { atual: m ?? null, proxima: p ?? null }
}

// A goal's dates and theme, as every route shows them.
const detalhes = (m) => ({ desde: m.desde, prazo: m.prazo ?? null, tema: m.tema ?? null })
const agendada = (p) => (p ? { titulo: p.titulo, alvo: p.alvo, ...detalhes(p) } : null)

/** The goal on screen with its count, and its Pix (a Christmas goal's tree); none, if there's no goal. */
async function metaComPix() {
  const { atual: m } = await vigente()
  if (!m) return { meta: null, pix: [] }
  const pix = await todos("pix", { desde: m.desde })
  return { meta: { titulo: m.titulo, alvo: m.alvo, arrecadado: somar(pix), ...detalhes(m) }, pix }
}
const meta = async () => (await metaComPix()).meta

// --- Christmas: the tree and the gift subs ------------------------------------------------------------------------

const sorteiosDe = async (desde) => (await todos("sorteio", { desde: `${desde}#` })).filter((s) => s.sk.startsWith(`${desde}#`))

/**
 * The Christmas goal whose subs are drawn now: the one on screen (`m`, as meta() gives it) if it's one, or else the last
 * that ended, up to a month after (a sub its last Pix earned after the last live of the month is drawn in the next).
 */
async function deNatal(m) {
  if (m?.tema === "natal") return m
  const mes = iso(Date.now() - 30 * DIA)
  const ultima = historico(await todos("meta"))
    .filter((g) => g.tema === "natal" && g.ate >= mes)
    .sort((a, b) => (a.desde < b.desde ? 1 : -1))[0]
  return ultima ?? null
}

/** A Christmas goal's subs: how many its Pix earned (`devidos`, one per SUB) and the ones drawn. */
async function subsDe(m) {
  return { titulo: m.titulo, desde: m.desde, cada: SUB, devidos: Math.floor(m.arrecadado / SUB), sorteios: await sorteiosDe(m.desde) }
}

/** Who is in the chat now, with their Σ, from the Σ API; null when it can't be reached. */
async function quemEsta() {
  try {
    const r = await fetch(`${SIGMA_API}/presentes`, { headers: { "x-chave": process.env.CHAVE }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const { pessoas } = await r.json()
    if (!Array.isArray(pessoas)) return null
    return pessoas.filter((c) => typeof c?.login === "string").map((c) => ({ login: c.login, sigma: Math.max(0, Number(c.sigma) || 0) }))
  } catch {
    return null
  }
}

/** One of `candidatos` ({ login, sigma }), each weighing 1 + ln(1 + Σ), like the goal's dedication (sigma.js's peso). */
export function sortear(candidatos, aleatorio = Math.random) {
  const peso = (c) => 1 + Math.log(1 + c.sigma)
  let sorte = aleatorio() * candidatos.reduce((t, c) => t + peso(c), 0)
  return candidatos.find((c) => (sorte -= peso(c)) < 0) ?? candidatos.at(-1)
}

const reaisDe = (c) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * When the Pix of no goal began: the first since the last goal ended (or the first ever), leaving out the channel's
 * own (Luan's tests); now, if there's none.
 */
async function semMeta() {
  const fim = historico(await todos("meta")).reduce((a, m) => (m.ate > a ? m.ate : a), "")
  const primeiro = (await todos("pix", fim ? { desde: fim } : {})).find((p) => p.login !== DONO)
  return primeiro ? primeiro.sk.slice(0, 24) : iso(Date.now())
}

// The mural: each goal (the one on screen, then the ones before) with every Pix that came while it was up, so its
// list adds up to its bar, by the name and message it was sent with, as the live showed them (Luan's call, 2026-11-10,
// for the ones from before too, when the form still asked about the mural), with their Twitch login when they signed
// in, so the page can draw their fan; one the dock took off shows only its value and day, as anonymous. Outside the
// goals only the Pix whose `mural` is set show (every one from the form since 2026-11-10): the rest are the channel's
// tests from before the first goal.
async function mural() {
  const { atual, proxima } = await vigente()
  const [todosPix, metas, sorteios] = await Promise.all([todos("pix"), todos("meta"), todos("sorteio")])
  const goals = [
    ...(atual ? [{ titulo: atual.titulo, alvo: atual.alvo, ...detalhes(atual), ate: null }] : []),
    ...historico(metas)
      .sort((a, b) => (a.desde < b.desde ? 1 : -1))
      .map((m) => ({ titulo: m.titulo, alvo: m.alvo, ...detalhes(m), ate: m.ate })),
  ]
  const daMeta = (p) => goals.findIndex((g) => p.sk >= g.desde && (!g.ate || p.sk < g.ate))
  const mostra = (p) => ({
    em: p.sk.slice(0, 24),
    nome: p.nome,
    mensagem: p.mensagem || p.transcricao || "",
    centavos: p.centavos,
    login: p.login,
    presente: p.presente,
    musica:
      p.musica?.tocou && p.musica.arquivo
        ? { url: MUSICAS_URL + p.musica.arquivo, estilo: p.musica.estilo, sobre: p.musica.sobre, letra: p.musica.letraCantada, tempos: p.musica.tempos, segundos: p.musica.segundos }
        : undefined,
  })
  const anonimo = (p) => ({ em: p.sk.slice(0, 24), nome: "", mensagem: "", centavos: p.centavos, presente: p.presente })
  const contas = goals.map(() => ({ arrecadado: 0, pix: 0, apoiadores: [] }))
  const semMeta = []
  for (const p of todosPix.reverse()) {
    const i = daMeta(p)
    if (i >= 0) {
      contas[i].arrecadado += p.centavos
      contas[i].pix++
      contas[i].apoiadores.push(p.oculto ? anonimo(p) : mostra(p))
    } else if (p.mural && !p.oculto) semMeta.push(mostra(p))
  }
  // A Christmas goal also lists who won its subs.
  const subs = (g) => (g.tema === "natal" ? { sorteios: sorteios.filter((s) => s.sk.startsWith(`${g.desde}#`)).map(({ login, em, dado }) => ({ login, em, dado })) } : {})
  const lista = goals.map((g, i) => ({ ...g, ...contas[i], ...subs(g) }))
  return out(200, {
    meta: atual ? lista[0] : null,
    metas: atual ? lista.slice(1) : lista,
    proxima: agendada(proxima),
    pix: semMeta,
  })
}

// The goals alone, for the agenda's calendar: the one on screen (with its count), the one scheduled, and the ended ones
// with what each made, newest first. Light: no Pix but the current goal's.
async function metas() {
  const m = await meta()
  const [proxima, todas] = await Promise.all([ler("meta", "proxima"), todos("meta")])
  return out(200, {
    meta: m,
    proxima: agendada(proxima),
    metas: historico(todas)
      .sort((a, b) => (a.desde < b.desde ? 1 : -1))
      .map((g) => ({ titulo: g.titulo, alvo: g.alvo, ...detalhes(g), ate: g.ate, arrecadado: g.arrecadado })),
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
    presente: r.presente,
    reserva: r.sk,
    origem,
    exibido: false,
    musica: r.musica ? { estilo: r.musica.estilo, sobre: r.musica.sobre, letra: r.musica.letra, estado: "gerando", pedidoEm: agora, edicoes: 0, falhas: 0 } : undefined,
  }
  await db.send(new PutCommand({ TableName: T, Item: item }))
  // The channel earns no Σ of its own: its Pix are tests.
  if (r.login && r.login !== DONO) {
    await db.send(
      new UpdateCommand({
        TableName: process.env.SIGMAS,
        Key: { login: r.login },
        UpdateExpression: "ADD sigma :s, doado :c",
        ExpressionAttributeValues: { ":s": Math.floor((r.centavos * SIGMA_POR_REAL) / 100), ":c": r.centavos },
      }),
    )
  }
  if (item.musica) {
    // The sender's /pix follows the song through its reservation.
    if (r.sk) await atualizar("reserva", r.sk, { pix: item.sk })
    await disparar(item.sk)
  }
  return item
}

// --- A song -------------------------------------------------------------------------------------------

/** SET (and REMOVE) fields of a Pix's `musica`, if it has one and `se` holds. */
function mudarMusica(sk, sets, { remover = [], se, valores = {} } = {}) {
  const nomes = {}
  const vals = { ...valores }
  const partes = Object.entries(sets).map(([k, v], i) => {
    nomes[`#m${i}`] = k
    vals[`:m${i}`] = v
    return `musica.#m${i} = :m${i}`
  })
  const fora = remover.map((k, i) => {
    nomes[`#r${i}`] = k
    return `musica.#r${i}`
  })
  return seCondicao(
    db.send(
      new UpdateCommand({
        TableName: T,
        Key: { pk: "pix", sk },
        ConditionExpression: `attribute_exists(musica)${se ? ` AND (${se})` : ""}`,
        UpdateExpression: [partes.length && `SET ${partes.join(", ")}`, fora.length && `REMOVE ${fora.join(", ")}`].filter(Boolean).join(" "),
        ExpressionAttributeNames: nomes,
        ...(Object.keys(vals).length ? { ExpressionAttributeValues: vals } : {}),
      }),
    ),
  )
}

/** Makes the song apart from this request: this same function, invoked without waiting. */
async function disparar(sk) {
  try {
    await lambda.send(new InvokeCommand({ FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME, InvocationType: "Event", Payload: Buffer.from(JSON.stringify({ musica: sk })) }))
  } catch (e) {
    console.error("musica: não deu para começar", sk, e)
    await mudarMusica(sk, { estado: "falhou", motivo: "Não deu para começar a música." })
  }
}

/** One try at a Pix's song (see the header). Throws on trouble while tries are left, so Lambda runs it again. */
async function fazerMusica(sk) {
  const m = (await ler("pix", sk))?.musica
  if (!m || m.estado !== "gerando") return
  const agora = Date.now()
  // One run at a time: a second delivery of the event, or a retry while the first still runs, leaves.
  const minha = await mudarMusica(sk, { rodando: agora }, { se: "musica.estado = :g AND (attribute_not_exists(musica.rodando) OR musica.rodando < :velha)", valores: { ":g": "gerando", ":velha": agora - RODANDO } })
  if (!minha) return
  let r = await gerar(m, { chave: process.env.GEMINI_CHAVE })
  if (r.ok) {
    const arquivo = `${novoId()}.mp3`
    const segundos = segundosDe(r.audio.length)
    try {
      await s3.send(new PutObjectCommand({ Bucket: process.env.BUCKET, Key: `pt/musicas/${arquivo}`, Body: r.audio, ContentType: r.mime, CacheControl: "public, max-age=31536000, immutable" }))
      const prazo = Math.min(SINCRONIA, 100_000 - (Date.now() - agora))
      const tempos = await sincronizar({ audio: r.audio, mime: r.mime, letra: r.letra, segundos }, { chave: process.env.GEMINI_CHAVE, prazo })
      if (!tempos) console.log("musica: letra sem tempos", sk)
      await mudarMusica(sk, { estado: "pronta", arquivo, letraCantada: r.letra, segundos, ...(tempos ? { tempos } : {}), prontaEm: Date.now() }, { remover: ["rodando", "motivo", ...(tempos ? [] : ["tempos"])] })
      return
    } catch (e) {
      r = { ok: false, recusada: false, motivo: `Não deu para guardar a música (${String(e.message ?? e).slice(0, 80)}).` }
    }
  }
  if (r.recusada) {
    const fim = (m.edicoes ?? 0) >= EDICOES
    await mudarMusica(sk, { estado: fim ? "falhou" : "recusada", motivo: r.motivo, recusadaEm: Date.now() }, { remover: ["rodando"] })
    return
  }
  const falhas = (m.falhas ?? 0) + 1
  await mudarMusica(sk, { falhas, motivo: r.motivo, ...(falhas >= FALHAS ? { estado: "falhou" } : {}) }, { remover: ["rodando"] })
  if (falhas < FALHAS) throw new Error(`musica ${sk}: ${r.motivo}`)
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
  const [pix, pendentes, reservas, { meta: m, pix: daMeta }] = await Promise.all([
    todos("pix", { desc: true, limite: 30 }),
    todos("pendente"),
    todos("reserva"),
    metaComPix(),
  ])
  const [proxima, natal] = await Promise.all([ler("meta", "proxima"), deNatal(m)])
  const comMusica = (p) => (p.musica ? { ...p, musica: { ...p.musica, estado: estadoDe(p.musica, agora), url: p.musica.arquivo ? MUSICAS_URL + p.musica.arquivo : undefined } } : p)
  return out(200, {
    agora,
    pix: pix.map(comMusica),
    pendentes,
    reservas: reservas
      .filter((r) => !r.pago && r.expira + FOLGA >= agora)
      .map(({ sk, centavos, nome, mensagem, audio, transcricao, sujo, voz, quando, expira, musica }) => ({ id: sk, centavos, nome, mensagem, audio, transcricao, sujo, voz, quando, expira, musica: musica && { estilo: musica.estilo } })),
    meta: m,
    proxima: agendada(proxima),
    // A Christmas goal on screen: every Pix's present, for the tree. And the subs of the one being drawn.
    arvore: m?.tema === "natal" ? daMeta.map((p) => ({ em: p.sk.slice(0, 24), presente: p.presente, centavos: p.centavos })) : null,
    subs: natal ? await subsDe(natal) : null,
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
    const ok = await atualizar("pix", p.pix, acao === "exibido" ? { exibido: true } : { exibido: false, pular: false })
    if (ok && acao === "exibido" && typeof p.reserva === "string") await apagar("audio", p.reserva)
    // A song that played goes on the mural, to listen and download (a skipped one too: it was on the live).
    if (ok && acao === "exibido") await mudarMusica(p.pix, { tocou: true }, { se: "musica.estado = :p", valores: { ":p": "pronta" } })
    return out(ok ? 200 : 404, {})
  }
  // Make a song again (it failed, or Luan didn't like it): it plays again once it's ready.
  if (acao === "musica") {
    if (typeof p.pix !== "string") return out(400, {})
    const agora = Date.now()
    const ok = await mudarMusica(p.pix, { estado: "gerando", pedidoEm: agora, falhas: 0 }, { remover: ["motivo", "rodando", "recusadaEm"], se: "musica.estado <> :g OR musica.pedidoEm < :perdida", valores: { ":g": "gerando", ":perdida": agora - PERDIDA } })
    if (!ok) return out(409, { erro: "Essa música já está sendo feita." })
    await atualizar("pix", p.pix, { exibido: false, pular: false })
    await disparar(p.pix)
    return out(200, {})
  }
  // The lyrics' timing again (a song made before it existed, or one Google missed), from the song on the site.
  if (acao === "letra") {
    const m = typeof p.pix === "string" && (await ler("pix", p.pix))?.musica
    if (!m?.arquivo || !m.letraCantada) return out(404, { erro: "Essa música não tem letra." })
    const audio = await fetch(new URL(MUSICAS_URL + m.arquivo, SITE))
      .then((x) => (x.ok ? x.arrayBuffer() : null))
      .catch(() => null)
    if (!audio) return out(502, { erro: "Não achei a música no site." })
    const tempos = await sincronizar({ audio: Buffer.from(audio), letra: m.letraCantada, segundos: m.segundos }, { chave: process.env.GEMINI_CHAVE, prazo: 25_000 })
    if (!tempos) return out(502, { erro: "O Google não conseguiu acompanhar a letra. Tente de novo." })
    await mudarMusica(p.pix, { tempos })
    return out(200, { linhas: tempos.filter(Boolean).length, de: tempos.length })
  }
  // Cut a song short: the overlay fades it out (or, before it starts, plays only the announcement).
  if (acao === "pular") {
    if (typeof p.pix !== "string") return out(400, {})
    return out((await atualizar("pix", p.pix, { pular: true })) ? 200 : 404, {})
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
  // A gift sub of the Christmas goal being drawn (deNatal), from who's in the chat now (see the header): one a call, the
  // dock's "Sortear sub", and the n-th only once, however many calls race for it.
  if (acao === "sortear") {
    const natal = await deNatal(await meta())
    if (!natal) return out(409, { erro: "Não tem meta de Natal agora." })
    const { devidos, sorteios } = await subsDe(natal)
    if (sorteios.length >= devidos) return out(409, { erro: `Nenhum sub esperando sorteio: o próximo vem com mais R$ ${reaisDe(SUB * (devidos + 1) - natal.arrecadado)}.` })
    const presentes = await quemEsta()
    if (!presentes) return out(502, { erro: "Não consegui ver quem está no chat. Tente de novo." })
    const ganharam = new Set(sorteios.map((s) => s.login))
    const candidatos = presentes.filter((c) => c.login !== DONO && !ganharam.has(c.login))
    if (!candidatos.length) return out(409, { erro: presentes.some((c) => c.login !== DONO) ? "Todo mundo no chat já ganhou um sub nessa meta." : "Ninguém na arquibancada agora: o sorteio é com a live no ar." })
    const vencedor = sortear(candidatos)
    const item = {
      pk: "sorteio",
      sk: `${natal.desde}#${String(sorteios.length + 1).padStart(3, "0")}`,
      login: vencedor.login,
      sigma: vencedor.sigma,
      // Who was in it, for the overlay's roulette (the winner among them, whoever is past the 40th).
      candidatos: [...new Set([vencedor.login, ...candidatos.map((c) => c.login)])].slice(0, 40),
      em: iso(Date.now()),
      exibido: false,
      dado: false,
    }
    const ok = await seCondicao(db.send(new PutCommand({ TableName: T, Item: item, ConditionExpression: "attribute_not_exists(sk)" })))
    if (!ok) return out(409, { erro: "Esse sub acabou de ser sorteado. Veja a lista." })
    return out(200, { sorteio: item })
  }
  // A drawn sub: played on the live (the overlay; the dock's "Mostrar de novo" sets it back) or given on Twitch (dado).
  if (acao === "sorteio") {
    if (typeof p.sk !== "string") return out(400, {})
    const sets = Object.fromEntries(["exibido", "dado"].filter((k) => typeof p[k] === "boolean").map((k) => [k, p[k]]))
    if (!Object.keys(sets).length) return out(400, {})
    return out((await atualizar("sorteio", p.sk, sets)) ? 200 : 404, {})
  }
  // A new goal ends the one before; "ajustar" changes the one on screen and keeps its count. With "avulsos", a goal
  // (new or adjusted) counts from the first Pix since the last goal ended (or the first ever, if none did). `ate` is
  // its last day (Brasília's "YYYY-MM-DD"; none, or "" when adjusting, runs until it's ended by hand). With
  // "proxima", it's set ahead of time, from its first day (`de`), replacing any scheduled before; an alvo of 0
  // takes the scheduled one off. `tema` "natal" makes it a Christmas goal (the tree and the subs; see the header);
  // Ajustar keeps the one it had unless it's sent ("" takes it off).
  if (acao === "meta") {
    const agora = Date.now()
    const alvo = Number(p.alvo)
    const valido = Number.isInteger(alvo) && alvo >= 1
    const titulo = valido ? filtrar(linha(p.titulo, 60)).texto : ""
    const prazo = p.ate ? fimDoDia(p.ate) : null
    const tema = TEMAS.includes(p.tema) ? p.tema : undefined
    if (p.ate && !prazo) return out(400, { erro: "Data de fim inválida." })
    if (prazo && Date.parse(prazo) <= agora) return out(400, { erro: "Esse dia já acabou." })
    if (p.proxima) {
      if (!valido) {
        await apagar("meta", "proxima")
        return out(200, { proxima: null })
      }
      const desde = inicioDoDia(p.de)
      if (!desde || Date.parse(desde) <= agora) return out(400, { erro: "A próxima meta começa num dia que ainda não chegou." })
      if (prazo && prazo <= desde) return out(400, { erro: "A meta acaba antes de começar." })
      const item = { pk: "meta", sk: "proxima", titulo, alvo, desde, ...(prazo ? { prazo } : {}), ...comTema({ tema }) }
      await db.send(new PutCommand({ TableName: T, Item: item }))
      return out(200, { proxima: agendada(item) })
    }
    const { atual } = await vigente(agora)
    if (!valido) {
      if (atual) await arquivar(atual, iso(agora))
      return out(200, { meta: null })
    }
    if (p.ajustar && atual) {
      const desde = p.avulsos ? await semMeta() : atual.desde
      const fica = p.ate === undefined ? atual.prazo : prazo
      const item = { pk: "meta", sk: "atual", titulo, alvo, desde, ...(fica ? { prazo: fica } : {}), ...comTema({ tema: p.tema === undefined ? atual.tema : tema }) }
      const ok = await seCondicao(
        db.send(new PutCommand({ TableName: T, Item: item, ConditionExpression: "#d = :d", ExpressionAttributeNames: { "#d": "desde" }, ExpressionAttributeValues: { ":d": atual.desde } })),
      )
      if (!ok) return out(409, { erro: "A meta mudou enquanto isso. Tente de novo." })
    } else {
      if (atual) await arquivar(atual, iso(agora))
      const desde = p.avulsos ? await semMeta() : iso(agora)
      await db.send(new PutCommand({ TableName: T, Item: { pk: "meta", sk: "atual", titulo, alvo, desde, ...(prazo ? { prazo } : {}), ...comTema({ tema }) } }))
    }
    return out(200, { meta: await meta() })
  }
  return out(400, { erro: "acao" })
}

export async function handler(event) {
  // A song, made apart from the request that paid it (disparar).
  if (typeof event?.musica === "string") return fazerMusica(event.musica)
  const metodo = event.requestContext.http.method
  const caminho = event.rawPath
  // The $default route takes the browser's preflight too; API Gateway adds the CORS headers.
  if (metodo === "OPTIONS") return { statusCode: 204 }
  if (metodo === "POST" && caminho === "/reservar") return reservar(event)
  if (metodo === "GET" && caminho === "/reserva") return situacao(event.queryStringParameters?.id)
  if (metodo === "POST" && caminho === "/musica") return editarMusica(event)
  if (metodo === "GET" && caminho === "/mural") return mural()
  if (metodo === "GET" && caminho === "/metas") return metas()
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
