// The Pix API on this machine, for trying the site's /pix and /mural, the overlay and the dock without AWS: the real
// index.mjs over aws.mjs (in memory, gone when it stops), on http://localhost:8130.
//
//   node infra/pix/local/servidor.mjs                fake Google: songs from Downloads\teste-musica-ia, ~4 s each
//   node infra/pix/local/servidor.mjs --google       the real one, with %USERPROFILE%\.config\muanlartins\gemini-chave.txt (US$ 0,08 a song)
//
// In the fake, a theme or lyrics with "recusa" is refused by Lyria, with "erro" fails on the way, with "anitta" is
// turned down before the Pix. POST /_pagar {"centavos"} pays as the phone would.
//   NEXT_PUBLIC_PIX_API=http://localhost:8130 pnpm dev   → /pix, /mural
//   /stream/pix.html?api=http://localhost:8130#chave=local   /stream/pix-painel.html?api=http://localhost:8130#chave=local

import { readdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { register } from "node:module"

register("./ganchos.mjs", import.meta.url)
const { local } = await import("./aws.mjs")

const PORTA = 8130
const GOOGLE_REAL = process.argv.includes("--google")
const TESTES = "/mnt/c/Users/muanl/Downloads/teste-musica-ia"
Object.assign(process.env, {
  TABLE: "pix",
  SIGMAS: "sigmas",
  CHAVE: "local",
  PIX_CHAVE: "00000000-0000-0000-0000-000000000000",
  PIX_NOME: "LUAN LOCAL",
  PIX_CIDADE: "RIO DE JANEIRO",
  PIX_TOKEN: "token-local-do-servidor-de-teste",
  BUCKET: "site",
  AWS_LAMBDA_FUNCTION_NAME: "pix-local",
  MUSICAS_URL: `http://localhost:${PORTA}/musicas/`,
  GEMINI_CHAVE: GOOGLE_REAL ? readFileSync("/mnt/c/Users/muanl/.config/muanlartins/gemini-chave.txt", "utf8").trim() : "falsa",
})

if (!GOOGLE_REAL) {
  let n = 0
  const mp3s = (() => {
    try {
      return readdirSync(TESTES).filter((f) => f.endsWith(".mp3")).map((f) => readFileSync(`${TESTES}/${f}`))
    } catch {
      return [Buffer.alloc(48_000)]
    }
  })()
  const real = globalThis.fetch
  globalThis.fetch = async (url, opcoes) => {
    const json = (status, corpo) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } })
    if (String(url).endsWith(":generateContent")) {
      const anitta = /anitta/i.test(opcoes.body)
      return json(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: !anitta, motivo: anitta ? "Sem nome de cantor ou cantora, por favor: troque por um estilo." : "" }) }] } }] })
    }
    if (String(url).endsWith("/interactions")) {
      const pedido = JSON.parse(opcoes.body).input
      await new Promise((r) => setTimeout(r, 4000))
      if (/recusa/i.test(pedido)) return json(400, { error: { code: "prohibited_content", message: "Input blocked" } })
      if (/erro/i.test(pedido)) return json(503, { error: { code: "unavailable", message: "The service is currently unavailable." } })
      const audio = mp3s[n++ % mp3s.length]
      return json(200, {
        steps: [
          { type: "model_output", content: [{ type: "text", text: "[[A0]]\n[:] Ô Luan, chuta essa bola\n[:] Que a torcida tá aqui agora\n[[B1]]\n[:] Ô Luan, faz mais um gol\n[:] Que hoje a live é um show" }] },
          { type: "model_output", content: [{ type: "audio", mime_type: "audio/mpeg", data: audio.toString("base64") }] },
        ],
      })
    }
    return real(url, opcoes)
  }
}

const { handler } = await import("../index.mjs")
local.invocar = handler
local.tentativasExtras = 2

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, x-chave, x-token",
}
const reais = (c) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
let pagos = 0

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`)
  const partes = []
  for await (const p of req) partes.push(p)
  const corpo = Buffer.concat(partes).toString()
  const responder = (status, tipo, dados) => {
    res.writeHead(status, { ...CORS, "content-type": tipo })
    res.end(dados)
  }
  try {
    if (req.method === "OPTIONS") return responder(204, "text/plain", "")
    if (req.method === "GET" && url.pathname.startsWith("/musicas/")) {
      const a = local.arquivos.get(`pt${url.pathname}`)
      return a ? responder(200, a.tipo, a.corpo) : responder(404, "text/plain", "")
    }
    let evento
    if (req.method === "POST" && url.pathname === "/_pagar") {
      const { centavos } = JSON.parse(corpo || "{}")
      evento = {
        requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
        rawPath: "/notificacao",
        headers: { "x-token": process.env.PIX_TOKEN },
        body: JSON.stringify({ title: "Pix recebido", text: `Teste${pagos++} te enviou um Pix de R$ ${reais(centavos)}` }),
      }
    } else {
      evento = {
        requestContext: { http: { method: req.method, sourceIp: req.socket.remoteAddress } },
        rawPath: url.pathname,
        headers: req.headers,
        queryStringParameters: Object.fromEntries(url.searchParams),
        body: corpo || undefined,
      }
    }
    const r = await handler(evento)
    console.log(req.method, url.pathname, r.statusCode)
    responder(r.statusCode, "application/json", r.body ?? "")
  } catch (e) {
    console.error(e)
    responder(500, "application/json", JSON.stringify({ erro: String(e.message) }))
  }
}).listen(PORTA, () => console.log(`Pix local em http://localhost:${PORTA} (Google ${GOOGLE_REAL ? "de verdade" : "falso"})`))
