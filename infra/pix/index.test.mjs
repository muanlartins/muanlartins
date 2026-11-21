// node --import ./infra/pix/local/registrar.mjs --test infra/pix/index.test.mjs: the Pix API against DynamoDB, S3 and
// Lambda in memory (local/aws.mjs) and a fake Google, songs above all: the order, the check before the Pix, making it
// after, a refusal and the new text, trouble and the retries, the stream and the mural. CI's zip leaves this file out.

import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import { esperar, local } from "./local/aws.mjs"

Object.assign(process.env, {
  TABLE: "pix",
  SIGMAS: "sigmas",
  CHAVE: "chave-da-live",
  PIX_CHAVE: "00000000-0000-0000-0000-000000000000",
  PIX_NOME: "LUAN TESTE",
  PIX_CIDADE: "RIO DE JANEIRO",
  PIX_TOKEN: "token-do-celular-de-teste-123",
  GEMINI_CHAVE: "chave-falsa",
  BUCKET: "site",
  AWS_LAMBDA_FUNCTION_NAME: "pix",
})

// Google, played by the test: the reviewer's verdict, Lyria's answers in order (then "ok" for every call after), and
// the lyrics' timing (null: that call fails).
const TEMPOS = [{ i: 0, inicio: 0.2, fim: 1.1 }, { i: 1, inicio: 1, fim: 1.9 }]
const google = { revisor: { ok: true, motivo: "" }, fora: false, lyria: [], chamadasLyria: 0, sincronia: TEMPOS, chamadasSincronia: 0 }
const MP3 = Buffer.alloc(48_000, 7) // 2 s at 192 kb/s
// Who's in the chat, as the Σ API answers it (null: it can't be reached).
const chat = { pessoas: [], chave: null }
globalThis.fetch = async (url, { body, headers } = {}) => {
  const resposta = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } })
  if (String(url).endsWith("/presentes")) {
    chat.chave = headers?.["x-chave"]
    return chat.pessoas ? resposta(200, { pessoas: chat.pessoas }) : resposta(503, {})
  }
  if (google.fora) throw new TypeError("fetch failed")
  // The site serving a song: what the function put in the bucket.
  const site = String(url).match(/^https:\/\/muanlartins\.com\.br\/(musicas\/.+)$/)
  if (site) {
    const a = local.arquivos.get(`pt/${site[1]}`)
    return a ? new Response(a.corpo, { status: 200 }) : new Response("", { status: 404 })
  }
  if (String(url).endsWith(":generateContent") && body.includes('"inline_data"')) {
    google.chamadasSincronia++
    google.ultimaSincronia = JSON.parse(body).contents[0].parts[1].text
    if (!google.sincronia) return resposta(503, { error: { code: 503, message: "The model is overloaded." } })
    return resposta(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(google.sincronia) }] } }] })
  }
  if (String(url).endsWith(":generateContent")) return resposta(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(google.revisor) }] } }] })
  if (String(url).endsWith("/interactions")) {
    google.chamadasLyria++
    google.ultimoPedido = JSON.parse(body).input
    const vez = google.lyria.shift() ?? "ok"
    if (vez === "recusa") return resposta(400, { error: { code: "prohibited_content", message: "Input blocked: The prompt could not be submitted." } })
    if (vez === "erro") return resposta(503, { error: { code: "unavailable", message: "The service is currently unavailable." } })
    return resposta(200, {
      steps: [
        { type: "model_output", content: [{ type: "text", text: "[[A0]]\n[:] Ô Luan, chuta essa bola\n[[B1]]\n[:] Que a torcida tá aqui" }] },
        { type: "model_output", content: [{ type: "audio", mime_type: "audio/mpeg", data: MP3.toString("base64") }] },
      ],
    })
  }
  throw new Error(`fetch inesperado: ${url}`)
}

const { handler, sortear } = await import("./index.mjs")
const { temposDe } = await import("./musica.mjs")
local.invocar = handler

async function chamar(metodo, caminho, { corpo, headers = {}, query } = {}) {
  const r = await handler({
    requestContext: { http: { method: metodo, sourceIp: `10.0.0.${Math.floor(Math.random() * 250)}` } },
    rawPath: caminho,
    headers,
    queryStringParameters: query,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : undefined }
}
const canal = (corpo) => chamar(corpo ? "POST" : "GET", "/canal", { corpo, headers: { "x-chave": "chave-da-live" } })
const reais = (c) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
let notificacoes = 0
async function pagar(centavos) {
  const texto = `Fulano${notificacoes++} te enviou um Pix de R$ ${reais(centavos)} creditado na sua conta`
  const r = await chamar("POST", "/notificacao", { corpo: { title: "Pix recebido", text: texto }, headers: { "x-token": process.env.PIX_TOKEN } })
  assert.equal(r.status, 200)
  await esperar()
}
const pedido = (musica, extra = {}) => ({ centavos: 500, nome: "Ana", mensagem: "", voz: "galvao", quando: "entre", musica, ...extra })
const status = async (id) => (await chamar("GET", "/reserva", { query: { id } })).body

beforeEach(() => {
  local.itens.clear()
  local.arquivos.clear()
  Object.assign(google, { revisor: { ok: true, motivo: "" }, fora: false, lyria: [], chamadasLyria: 0, sincronia: TEMPOS, chamadasSincronia: 0 })
})

test("a song's order: R$ 5 and up, a style, a theme or lyrics, clean words, and the reviewer's yes", async () => {
  assert.equal((await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "gol perdido" }, { centavos: 499 }) })).status, 400)
  assert.equal((await chamar("POST", "/reservar", { corpo: pedido({ estilo: "valsa", sobre: "gol perdido" }) })).status, 400)
  assert.equal((await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "  " }) })).status, 400)
  assert.equal((await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "x".repeat(121) }) })).status, 400)
  const suja = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "o luan é um viado" }) })
  assert.equal(suja.status, 422)
  assert.equal(suja.body.campo, "musica")

  google.revisor = { ok: false, motivo: "Sem nome de cantor, por favor." }
  const recusada = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "com a voz da Anitta" }) })
  assert.deepEqual([recusada.status, recusada.body.erro], [422, "Sem nome de cantor, por favor."])

  google.revisor = { ok: true, motivo: "" }
  const ok = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "o Luan perdendo gol feito" }) })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.centavos, 500)
  assert.deepEqual(await status(ok.body.id), { pago: false, expira: ok.body.expira, ate: ok.body.expira + 5 * 60_000, musica: { estado: "esperando" } })
  assert.equal(google.chamadasLyria, 0, "nothing is made before the Pix")
})

test("the check lets the order through when Gemini can't be reached", async () => {
  google.fora = true
  const r = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "rock", sobre: "subir pra Ouro" }) })
  assert.equal(r.status, 200)
})

test("without the Gemini key, songs are off and messages still work", async () => {
  delete process.env.GEMINI_CHAVE
  try {
    assert.equal((await chamar("POST", "/reservar", { corpo: pedido({ estilo: "rock", sobre: "subir pra Ouro" }) })).status, 503)
    assert.equal((await chamar("POST", "/reservar", { corpo: { centavos: 200, nome: "Bia", mensagem: "Valeu!", voz: "antonio", quando: "agora" } })).status, 200)
  } finally {
    process.env.GEMINI_CHAVE = "chave-falsa"
  }
})

test("paid, the song is made, waits for the live, and reaches the mural only after it played", async () => {
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "sertanejo", sobre: "a torcida que nunca abandona" }) })
  await pagar(r.centavos)
  assert.match(google.ultimoPedido, /sertanejo universitário/)
  assert.match(google.ultimoPedido, /a torcida que nunca abandona/)

  const s = await status(r.id)
  assert.equal(s.pago, true)
  assert.equal(s.musica.estado, "pronta")

  const { body: c } = await canal()
  const p = c.pix[0]
  assert.equal(p.musica.estado, "pronta")
  assert.match(p.musica.url, /^\/musicas\/[\w-]+\.mp3$/)
  assert.equal(p.musica.letraCantada, "Ô Luan, chuta essa bola\n\nQue a torcida tá aqui")
  assert.equal(p.musica.segundos, 2)
  assert.deepEqual(p.musica.tempos, [[0.2, 1], [1, 1.9]], "a line ends when the next starts")
  assert.match(google.ultimaSincronia, /com 2 segundos/)
  assert.match(google.ultimaSincronia, /0: Ô Luan, chuta essa bola\n1: Que a torcida tá aqui$/)
  assert.equal(p.mensagem, "")
  const arquivo = local.arquivos.get(`pt/musicas/${p.musica.arquivo}`)
  assert.equal(arquivo.tipo, "audio/mpeg")
  assert.equal(arquivo.corpo.length, MP3.length)

  const antes = (await chamar("GET", "/mural")).body
  assert.equal(antes.pix[0].musica, undefined, "not on the mural before the live played it")

  assert.equal((await canal({ acao: "exibido", pix: p.sk, reserva: p.reserva })).status, 200)
  const depois = (await chamar("GET", "/mural")).body.pix[0]
  assert.deepEqual(depois.musica, { url: p.musica.url, estilo: "sertanejo", sobre: "a torcida que nunca abandona", letra: "Ô Luan, chuta essa bola\n\nQue a torcida tá aqui", tempos: [[0.2, 1], [1, 1.9]], segundos: 2 })
  assert.equal(depois.nome, "Ana")
})

test("the lyrics' timing is checked: in order, inside the song, at least half the lines", () => {
  assert.deepEqual(temposDe([{ i: 0, inicio: 1.04, fim: 3 }, { i: 1, inicio: 3.5, fim: 5 }], 2, 60), [[1, 3], [3.5, 5]])
  // Past the song's end, or out of order: that line goes without a time.
  assert.deepEqual(temposDe([{ i: 0, inicio: 1, fim: 3 }, { i: 1, inicio: 110, fim: 112 }, { i: 2, inicio: 5, fim: 7 }], 3, 82), [[1, 3], null, [5, 7]])
  assert.deepEqual(temposDe([{ i: 0, inicio: 10, fim: 12 }, { i: 1, inicio: 4, fim: 6 }, { i: 2, inicio: 13, fim: 15 }], 3, 60), [[10, 12], null, [13, 15]])
  // Nonsense, a line not sung (-1), a repeated index: ignored.
  assert.deepEqual(temposDe([{ i: 0, inicio: -1, fim: -1 }, { i: 1, inicio: 2, fim: 4 }, { i: 1, inicio: 9, fim: 9.5 }, { i: 7, inicio: 1, fim: 2 }, { i: 2, inicio: 5, fim: 4 }, { i: 3, inicio: 6, fim: 8 }], 4, 60), [null, [2, 4], null, [6, 8]])
  // Fewer than half placed, or nothing to place: no timing at all.
  assert.equal(temposDe([{ i: 0, inicio: 1, fim: 2 }], 3, 60), null)
  assert.equal(temposDe("não é uma lista", 2, 60), null)
  assert.equal(temposDe([], 0, 60), null)
})

test("without the timing (Google out of reach), the song is ready all the same, and the dock asks again", async () => {
  google.sincronia = null
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "pagode", sobre: "o churrasco da live" }) })
  await pagar(r.centavos)
  const p = (await canal()).body.pix[0]
  assert.deepEqual([p.musica.estado, p.musica.tempos], ["pronta", undefined])
  assert.equal(google.chamadasSincronia, 1, "a song isn't made again for its timing")
  assert.equal(google.chamadasLyria, 1)

  assert.equal((await canal({ acao: "letra", pix: p.sk })).status, 502)
  google.sincronia = TEMPOS
  assert.deepEqual((await canal({ acao: "letra", pix: p.sk })).body, { linhas: 2, de: 2 })
  assert.deepEqual((await canal()).body.pix[0].musica.tempos, [[0.2, 1], [1, 1.9]])
  assert.equal((await canal({ acao: "letra", pix: "pix/nada" })).status, 404)

  // Made again, a song whose new timing fails loses the old one, which was for the old song.
  google.sincronia = null
  await canal({ acao: "musica", pix: p.sk })
  await esperar()
  const nova = (await canal()).body.pix[0]
  assert.deepEqual([nova.musica.estado, nova.musica.tempos], ["pronta", undefined])
})

test("lyrics written by the viewer are sung as written", async () => {
  const letra = "[Refrão]\nÔ Luan, chuta essa bola\nQue a torcida tá aqui agora"
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "forro", letra }) })
  await pagar(r.centavos)
  assert.match(google.ultimoPedido, /Cante exatamente esta letra:\n\n\[Refrão\]\nÔ Luan/)
  assert.equal((await status(r.id)).musica.estado, "pronta")
})

test("Google refuses: the viewer changes the text, twice at most, then it plays as a plain alert", async () => {
  google.lyria = ["recusa"]
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "Luan" }) })
  await pagar(r.centavos)
  let s = await status(r.id)
  assert.equal(s.musica.estado, "recusada")
  assert.equal(s.musica.edicoes, 2)
  assert.match(s.musica.motivo, /recusou/)
  assert.equal(s.musica.sobre, "Luan")

  // The new text is checked like the first.
  google.revisor = { ok: false, motivo: "Sem política, por favor." }
  assert.deepEqual((await chamar("POST", "/musica", { corpo: { id: r.id, sobre: "vote no fulano" } })).body, { erro: "Sem política, por favor." })
  google.revisor = { ok: true, motivo: "" }

  google.lyria = ["recusa"]
  assert.equal((await chamar("POST", "/musica", { corpo: { id: r.id, sobre: "o streamer errando tudo" } })).status, 200)
  await esperar()
  s = await status(r.id)
  assert.deepEqual([s.musica.estado, s.musica.edicoes, s.musica.sobre], ["recusada", 1, "o streamer errando tudo"])

  google.lyria = ["recusa"]
  await chamar("POST", "/musica", { corpo: { id: r.id, letra: "Ô streamer, joga bola" } })
  await esperar()
  s = await status(r.id)
  assert.equal(s.musica.estado, "falhou", "the third refusal gives up")
  assert.equal(s.musica.letra, "Ô streamer, joga bola")
  assert.equal(s.musica.sobre, undefined)
  assert.equal((await chamar("POST", "/musica", { corpo: { id: r.id, sobre: "mais uma" } })).status, 409)
  assert.equal(google.chamadasLyria, 3)

  const { body: c } = await canal()
  assert.equal(c.pix[0].musica.estado, "falhou")
})

test("a refusal nobody fixes in ten minutes gives up", async () => {
  google.lyria = ["recusa"]
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "funk", sobre: "Luan" }) })
  await pagar(r.centavos)
  const item = [...local.itens.values()].find((i) => i.pk === "pix")
  item.musica.recusadaEm -= 11 * 60_000
  assert.equal((await status(r.id)).musica.estado, "falhou")
  assert.equal((await chamar("POST", "/musica", { corpo: { id: r.id, sobre: "outra coisa" } })).status, 409)
})

test("trouble on the way: Lambda's retries make it, and three failures give up for the dock to try again", async () => {
  google.lyria = ["erro"]
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "rock", sobre: "subir pra Ouro" }) })
  await pagar(r.centavos)
  assert.equal((await status(r.id)).musica.estado, "pronta")
  assert.equal(google.chamadasLyria, 2)

  google.lyria = ["erro", "erro", "erro"]
  google.chamadasLyria = 0
  const { body: r2 } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "pop", sobre: "o chat" }, { centavos: 1000 }) })
  await pagar(r2.centavos)
  assert.equal((await status(r2.id)).musica.estado, "falhou")
  assert.equal(google.chamadasLyria, 3)
  const { body: c } = await canal()
  const p = c.pix.find((x) => x.reserva === r2.id)
  assert.match(p.musica.motivo, /HTTP 503/)

  // The dock makes it again; it plays again once ready.
  assert.equal((await canal({ acao: "musica", pix: p.sk })).status, 200)
  await esperar()
  const de_novo = (await canal()).body.pix.find((x) => x.reserva === r2.id)
  assert.deepEqual([de_novo.musica.estado, de_novo.exibido, de_novo.musica.motivo], ["pronta", false, undefined])
})

test("a song being made isn't made twice at once", async () => {
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "rap", sobre: "o VAR" }) })
  await pagar(r.centavos)
  const p = (await canal()).body.pix[0]
  google.chamadasLyria = 0
  const item = [...local.itens.values()].find((i) => i.pk === "pix")
  item.musica.estado = "gerando"
  item.musica.rodando = Date.now()
  await handler({ musica: p.sk })
  assert.equal(google.chamadasLyria, 0)
  assert.equal((await canal({ acao: "musica", pix: p.sk })).status, 409)
})

test("the dock cuts a song short, and Repetir brings it back", async () => {
  const { body: r } = await chamar("POST", "/reservar", { corpo: pedido({ estilo: "eletronica", sobre: "a live" }) })
  await pagar(r.centavos)
  const p = (await canal()).body.pix[0]
  await canal({ acao: "pular", pix: p.sk })
  assert.equal((await canal()).body.pix[0].pular, true)
  await canal({ acao: "repetir", pix: p.sk })
  const de_novo = (await canal()).body.pix[0]
  assert.deepEqual([de_novo.pular, de_novo.exibido], [false, false])
})

test("a plain Pix is as it was: no song, no Google", async () => {
  const { body: r } = await chamar("POST", "/reservar", { corpo: { centavos: 300, nome: "Caio", mensagem: "Que gol!", voz: "galvao", quando: "agora" } })
  await pagar(r.centavos)
  assert.deepEqual(await status(r.id), { pago: true, expira: r.expira, ate: r.expira + 5 * 60_000 })
  const p = (await canal()).body.pix[0]
  assert.deepEqual([p.mensagem, p.voz, p.musica], ["Que gol!", "galvao", undefined])
  await canal({ acao: "exibido", pix: p.sk, reserva: r.id })
  assert.equal((await chamar("GET", "/mural")).body.pix[0].mensagem, "Que gol!")
  assert.equal(google.chamadasLyria, 0)
})

const sigmaDe = (login) => local.itens.get(`sigmas|${JSON.stringify([["login", login]])}`)

test("the dock attributes a Pix: its name and login on the mural, and the Σ it would have given, moved if the login changes", async () => {
  // A Pix sent with no name and without signing in: on the mural as Anônimo, nobody's Σ.
  const { body: r } = await chamar("POST", "/reservar", { corpo: { centavos: 500, nome: "", mensagem: "Oi!", voz: "antonio", quando: "agora" } })
  await pagar(r.centavos)
  const sk = (await canal()).body.pix[0].sk
  let { body: m } = await chamar("GET", "/mural")
  assert.deepEqual([m.pix[0].nome, m.pix[0].login], ["", undefined])

  assert.equal((await canal({ acao: "atribuir", pix: "nada", nome: "Ana" })).status, 404)
  assert.equal((await canal({ acao: "atribuir", pix: sk, nome: "Mamuska", login: "leila m" })).status, 400, "not a login")
  assert.equal((await canal({ acao: "atribuir", pix: sk, nome: "  " })).status, 400, "nothing to set")
  assert.equal((await chamar("POST", "/canal", { corpo: { acao: "atribuir", pix: sk, nome: "Mamuska" } })).status, 401, "the dock's key")

  const a = await canal({ acao: "atribuir", pix: sk, nome: "Mamuska", login: "@Leila_M_30" })
  assert.equal(a.status, 200)
  ;({ body: m } = await chamar("GET", "/mural"))
  assert.deepEqual([m.pix[0].nome, m.pix[0].login, m.pix[0].mensagem], ["Mamuska", "leila_m_30", "Oi!"])
  assert.deepEqual([sigmaDe("leila_m_30").sigma, sigmaDe("leila_m_30").doado], [50, 500])

  // Again with the same login: the name changes, the Σ don't come twice.
  await canal({ acao: "atribuir", pix: sk, nome: "Mãe", login: "leila_m_30" })
  assert.equal(sigmaDe("leila_m_30").sigma, 50)
  // A wrong login fixed: the Σ go with it. No login sent keeps the one it has.
  await canal({ acao: "atribuir", pix: sk, nome: "Mamuska", login: "outra" })
  assert.deepEqual([sigmaDe("leila_m_30").sigma, sigmaDe("leila_m_30").doado, sigmaDe("outra").sigma], [0, 0, 50])
  await canal({ acao: "atribuir", pix: sk, nome: "Mamuska", login: "leila_m_30" })
  await canal({ acao: "atribuir", pix: sk, nome: "Mamuska" })
  ;({ body: m } = await chamar("GET", "/mural"))
  assert.equal(m.pix[0].login, "leila_m_30")
  assert.deepEqual([sigmaDe("leila_m_30").sigma, sigmaDe("outra").sigma], [50, 0])

  // One the dock took off the mural, or placed as Anônimo outside the form, comes back with its name.
  await canal({ acao: "ocultar", pix: sk })
  assert.equal((await chamar("GET", "/mural")).body.pix.length, 0)
  await canal({ acao: "atribuir", pix: sk, nome: "Mamuska" })
  assert.equal((await chamar("GET", "/mural")).body.pix[0].nome, "Mamuska")
  await pixDe(1000, "")
  const solto = (await canal()).body.pix[0].sk
  await canal({ acao: "atribuir", pix: solto, nome: "Mamuska", login: "leila_m_30" })
  ;({ body: m } = await chamar("GET", "/mural"))
  assert.deepEqual(m.pix.map((p) => [p.centavos, p.nome]), [[1000, "Mamuska"], [500, "Mamuska"]])
  assert.equal(sigmaDe("leila_m_30").sigma, 150)
})

test("a recording up to a minute: about 270 KB of base64 goes in, more is turned down", async () => {
  const audio = (n) => ({ tipo: "audio/webm;codecs=opus", dados: "A".repeat(n) })
  const ok = await chamar("POST", "/reservar", { corpo: { centavos: 200, nome: "Ana", mensagem: "", voz: "galvao", quando: "agora", audio: audio(330_000) } })
  assert.equal(ok.status, 200, "a minute at 32 kb/s")
  const grande = await chamar("POST", "/reservar", { corpo: { centavos: 200, nome: "Ana", mensagem: "", voz: "galvao", quando: "agora", audio: audio(360_004) } })
  assert.equal(grande.status, 400)
  const { body: t } = await canal({ acao: "transcricao", reserva: ok.body.id, texto: "palavra ".repeat(150) })
  assert.ok(t.texto.length > 900 && t.texto.length <= 1000, "a minute's words are kept for the mural")
})

// --- Goals: an end date, one set ahead of time, the calendar moving on by itself ---------------------------

const relogio = Date.now
const em = (instante) => (Date.now = () => Date.parse(instante))
const pixDe = (centavos, nome) => canal({ acao: "registrar", centavos, nome })

test("a goal with a last day ends at that day's Brasília midnight by itself, into the history, reached or not", async (t) => {
  t.after(() => (Date.now = relogio))
  em("2026-11-20T12:00:00Z")
  assert.equal((await canal({ acao: "meta", titulo: "Os três primeiros dígitos", alvo: 10000, ate: "2026-11-30" })).status, 200)
  await pixDe(6000, "Ana")
  em("2026-11-30T23:59:00-03:00")
  await pixDe(5000, "Bia")
  let { body: c } = await canal()
  assert.deepEqual(c.meta, { titulo: "Os três primeiros dígitos", alvo: 10000, arrecadado: 11000, desde: "2026-11-20T12:00:00.000Z", prazo: "2026-12-01T03:00:00.000Z", tema: null })

  // Past the goal, it keeps counting as extra; at midnight it's over, and a Pix after it counts for no goal.
  em("2026-12-01T00:00:01-03:00")
  await pixDe(700, "Caio")
  ;({ body: c } = await canal())
  assert.equal(c.meta, null)
  const { body: m } = await chamar("GET", "/metas")
  assert.equal(m.meta, null)
  assert.deepEqual(m.metas, [{ titulo: "Os três primeiros dígitos", alvo: 10000, desde: "2026-11-20T12:00:00.000Z", prazo: "2026-12-01T03:00:00.000Z", tema: null, ate: "2026-12-01T03:00:00.000Z", arrecadado: 11000 }])
  const { body: mural } = await chamar("GET", "/mural")
  assert.deepEqual(mural.metas[0].apoiadores.map((p) => p.nome), ["Bia", "Ana"])
})

test("a goal set ahead takes the screen on its first day, ending the one before right then", async (t) => {
  t.after(() => (Date.now = relogio))
  em("2026-11-14T20:00:00Z")
  await canal({ acao: "meta", titulo: "Os três primeiros dígitos", alvo: 10000 })
  await pixDe(1000, "Ana")
  // Its day has to be ahead, and its end after its start.
  assert.equal((await canal({ acao: "meta", proxima: true, titulo: "Natal", alvo: 10000, de: "2026-11-14", ate: "2026-12-31" })).status, 400)
  assert.equal((await canal({ acao: "meta", proxima: true, titulo: "Natal", alvo: 10000, de: "2026-12-01", ate: "2026-11-30" })).status, 400)
  const r = await canal({ acao: "meta", proxima: true, titulo: "Natal", alvo: 10000, de: "2026-12-01", ate: "2026-12-31" })
  assert.deepEqual(r.body.proxima, { titulo: "Natal", alvo: 10000, desde: "2026-12-01T03:00:00.000Z", prazo: "2027-01-01T03:00:00.000Z", tema: null })
  assert.deepEqual((await canal()).body.proxima, r.body.proxima)
  assert.equal((await chamar("GET", "/mural")).body.proxima.titulo, "Natal")

  em("2026-12-01T03:00:00Z")
  await pixDe(500, "Bia")
  const { body: c } = await canal()
  assert.deepEqual([c.meta.titulo, c.meta.arrecadado, c.proxima], ["Natal", 500, null])
  const { body: m } = await chamar("GET", "/metas")
  assert.deepEqual(
    m.metas.map((g) => [g.titulo, g.ate, g.prazo, g.arrecadado]),
    [["Os três primeiros dígitos", "2026-12-01T03:00:00.000Z", null, 1000]],
  )

  // And it ends on its own day too.
  em("2027-01-01T03:00:00Z")
  assert.equal((await canal()).body.meta, null)
  assert.deepEqual((await chamar("GET", "/metas")).body.metas.map((g) => g.titulo), ["Natal", "Os três primeiros dígitos"])
})

test("Ajustar keeps the count and sets or clears the last day; the dock can take a scheduled goal off", async (t) => {
  t.after(() => (Date.now = relogio))
  em("2026-11-14T20:00:00Z")
  await canal({ acao: "meta", titulo: "Os três primeiros dígitos", alvo: 10000 })
  await pixDe(6767, "Ana")
  assert.equal((await canal({ acao: "meta", ajustar: true, titulo: "Os três primeiros dígitos", alvo: 10000, ate: "2026-11-13" })).status, 400, "a day gone")
  assert.equal((await canal({ acao: "meta", ajustar: true, titulo: "Os três primeiros dígitos", alvo: 10000, ate: "2026-02-30" })).status, 400, "no such day")
  let { body } = await canal({ acao: "meta", ajustar: true, titulo: "Os três primeiros dígitos", alvo: 10000, ate: "2026-11-30" })
  assert.deepEqual([body.meta.arrecadado, body.meta.prazo], [6767, "2026-12-01T03:00:00.000Z"])
  ;({ body } = await canal({ acao: "meta", ajustar: true, titulo: "Três dígitos", alvo: 10000 }))
  assert.deepEqual([body.meta.titulo, body.meta.prazo], ["Três dígitos", "2026-12-01T03:00:00.000Z"], "no date sent keeps it")
  ;({ body } = await canal({ acao: "meta", ajustar: true, titulo: "Três dígitos", alvo: 10000, ate: "" }))
  assert.equal(body.meta.prazo, null, "an empty date clears it")

  await canal({ acao: "meta", proxima: true, titulo: "Natal", alvo: 10000, de: "2026-12-01" })
  await canal({ acao: "meta", proxima: true, alvo: 0 })
  assert.equal((await canal()).body.proxima, null)
  em("2026-12-02T12:00:00Z")
  assert.equal((await canal()).body.meta.titulo, "Três dígitos", "nothing took its place")
})

// --- Christmas -----------------------------------------------------------------------------------------------------

const PRESENTE = { formato: "sino", cor: "#e03131", detalhe: "#ffd23f", padrao: "listras" }

test("a Christmas goal: each Pix's present for the tree, as chosen on /pix, and the theme kept from schedule to history", async (t) => {
  t.after(() => (Date.now = relogio))
  em("2026-11-20T12:00:00Z")
  await canal({ acao: "meta", titulo: "Três dígitos", alvo: 10000, ate: "2026-11-30" })
  const r = await canal({ acao: "meta", proxima: true, titulo: "Natal na live", alvo: 10000, de: "2026-12-01", ate: "2026-12-31", tema: "natal" })
  assert.equal(r.body.proxima.tema, "natal")
  assert.equal((await canal({ acao: "meta", proxima: true, titulo: "Outra", alvo: 100, de: "2026-12-01", tema: "pascoa" })).body.proxima.tema, null, "only known themes")
  await canal({ acao: "meta", proxima: true, titulo: "Natal na live", alvo: 10000, de: "2026-12-01", ate: "2026-12-31", tema: "natal" })
  assert.equal((await canal()).body.arvore, null, "no tree before it")

  em("2026-12-03T22:00:00Z")
  const reserva = await chamar("POST", "/reservar", { corpo: { centavos: 500, nome: "Ana", mensagem: "Feliz Natal!", presente: PRESENTE } })
  // Only its shape and colours are kept, and only in that form.
  const torta = await chamar("POST", "/reservar", { corpo: { centavos: 100, nome: "Bia", presente: { formato: "<script>", cor: "red", detalhe: "#fff", padrao: "x" } } })
  await pagar(reserva.body.centavos)
  em("2026-12-03T22:01:00Z")
  await pagar(torta.body.centavos)
  em("2026-12-03T22:02:00Z")
  await pixDe(1234, "")
  const { body: c } = await canal()
  assert.deepEqual([c.meta.titulo, c.meta.tema], ["Natal na live", "natal"])
  assert.deepEqual(
    c.arvore.map((p) => [p.centavos, p.presente ?? null]),
    [[500, PRESENTE], [100, null], [1234, null]],
  )
  assert.deepEqual(c.arvore.map((p) => p.em), ["2026-12-03T22:00:00.000Z", "2026-12-03T22:01:00.000Z", "2026-12-03T22:02:00.000Z"], "the moment each came: an unchosen present's seed")
  const { body: mural } = await chamar("GET", "/mural")
  assert.equal(mural.meta.tema, "natal")
  assert.deepEqual(mural.meta.apoiadores.map((p) => p.presente ?? null), [null, null, PRESENTE])
  assert.deepEqual(mural.meta.sorteios, [])

  // Ajustar keeps it unless told; it goes to the history with it.
  assert.equal((await canal({ acao: "meta", ajustar: true, titulo: "Natal", alvo: 10000 })).body.meta.tema, "natal")
  em("2027-01-01T03:00:00Z")
  const { body: m } = await chamar("GET", "/metas")
  assert.deepEqual([m.metas[0].titulo, m.metas[0].tema], ["Natal", "natal"])
})

test("the gift subs: one per R$ 10, drawn from who's in the chat by Σ, never the channel nor twice the same, each only once", async (t) => {
  t.after(() => (Date.now = relogio))
  em("2026-12-05T21:00:00Z")
  await canal({ acao: "meta", titulo: "Natal na live", alvo: 10000, ate: "2026-12-31", tema: "natal" })
  chat.pessoas = [{ login: "muanlartins", sigma: 0 }, { login: "ana", sigma: 20000 }, { login: "bia", sigma: 0 }]
  let r = await canal({ acao: "sortear" })
  assert.equal(r.status, 409)
  assert.match(r.body.erro, /R\$ 10,00/)

  await pixDe(2550, "Ana")
  let { body: c } = await canal()
  assert.deepEqual([c.subs.devidos, c.subs.sorteios.length, c.subs.cada], [2, 0, 1000])
  r = await canal({ acao: "sortear" })
  assert.equal(r.status, 200)
  assert.equal(chat.chave, "chave-da-live", "the Σ API is asked with the key")
  const primeiro = r.body.sorteio.login
  assert.ok(["ana", "bia"].includes(primeiro))
  assert.ok(r.body.sorteio.candidatos.includes(primeiro) && !r.body.sorteio.candidatos.includes("muanlartins"))
  r = await canal({ acao: "sortear" })
  assert.equal(r.status, 200)
  assert.notEqual(r.body.sorteio.login, primeiro, "one sub each")
  r = await canal({ acao: "sortear" })
  assert.equal(r.status, 409, "only two earned")
  assert.match(r.body.erro, /R\$ 4,50/)

  // More Pix, but everyone in the chat already won; then someone new comes.
  await pixDe(1000, "Caio")
  assert.match((await canal({ acao: "sortear" })).body.erro, /já ganhou/)
  chat.pessoas = [{ login: "muanlartins", sigma: 0 }]
  assert.match((await canal({ acao: "sortear" })).body.erro, /Ninguém na arquibancada/)
  chat.pessoas = null
  assert.equal((await canal({ acao: "sortear" })).status, 502)
  chat.pessoas = [{ login: "caio", sigma: 15 }]
  assert.equal((await canal({ acao: "sortear" })).body.sorteio.login, "caio")

  // The overlay plays each once, the dock marks it given, and the mural lists who won.
  ;({ body: c } = await canal())
  assert.deepEqual(c.subs.sorteios.map((s) => [s.exibido, s.dado]), [[false, false], [false, false], [false, false]])
  const sk = c.subs.sorteios[0].sk
  assert.equal((await canal({ acao: "sorteio", sk, exibido: true })).status, 200)
  assert.equal((await canal({ acao: "sorteio", sk, dado: true })).status, 200)
  assert.equal((await canal({ acao: "sorteio", sk: "nada", dado: true })).status, 404)
  ;({ body: c } = await canal())
  assert.deepEqual([c.subs.sorteios[0].exibido, c.subs.sorteios[0].dado], [true, true])
  const { body: mural } = await chamar("GET", "/mural")
  assert.deepEqual(mural.meta.sorteios.map((s) => s.login), [primeiro, primeiro === "ana" ? "bia" : "ana", "caio"])
  assert.equal(mural.meta.sorteios[0].candidatos, undefined, "who else was there stays off the site")

  // A sub its last Pix earned after the last live is drawn in January, from the goal that ended.
  em("2026-12-31T23:30:00-03:00")
  await pixDe(1000, "Duda")
  em("2027-01-04T21:00:00Z")
  chat.pessoas = [{ login: "duda", sigma: 3 }]
  ;({ body: c } = await canal())
  assert.deepEqual([c.meta, c.arvore, c.subs.titulo, c.subs.devidos, c.subs.sorteios.length], [null, null, "Natal na live", 4, 3])
  assert.equal((await canal({ acao: "sortear" })).body.sorteio.login, "duda")
  chat.pessoas = []
})

test("the draw's odds: 1 + ln(1 + Σ), so a top rank has about twice a newcomer's, and someone with none still has theirs", () => {
  const gente = [{ login: "ssl", sigma: 20000 }, { login: "prata", sigma: 300 }, { login: "novo", sigma: 11 }, { login: "zero", sigma: 0 }]
  const vezes = Object.fromEntries(gente.map((g) => [g.login, 0]))
  const N = 20000
  for (let i = 0; i < N; i++) vezes[sortear(gente, () => i / N).login]++
  const peso = (s) => 1 + Math.log(1 + s)
  const total = gente.reduce((t, g) => t + peso(g.sigma), 0)
  for (const g of gente) assert.ok(Math.abs(vezes[g.login] / N - peso(g.sigma) / total) < 0.001, g.login)
  assert.ok(vezes.ssl / vezes.novo > 2.5 && vezes.ssl / vezes.novo < 3.5)
  assert.ok(vezes.zero > 0)
})
