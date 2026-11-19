// The profile API on this machine, for trying /perfil (the card, the banner and the photo, the fan, the duel's ball)
// without AWS or Twitch: the real rotas.mjs over a table in memory (gone when it stops), on http://localhost:8131.
// Whoever isn't in it yet is read once from the real API (their fan, card and ball), so the site shows everyone as
// they are; what's saved here stays here. The agenda is the real one.
//
//   node infra/perfil/local/servidor.mjs
//   NEXT_PUBLIC_PROFILE_API=http://localhost:8131 NEXT_PUBLIC_TWITCH_AUTHORIZE=http://localhost:8131/_entrar pnpm build
//
// "Entrar com a Twitch" then opens this server's page, which signs in as any login you type (token "local-<login>").

import { createServer } from "node:http"
import { rotas } from "../rotas.mjs"

const PORTA = 8131
const REAL = "https://wtpv8afsak.execute-api.us-east-1.amazonaws.com"
const LOGIN = /^[a-z0-9_]{1,25}$/

const itens = new Map()
// Each login's read from the real API, once (a promise, so two requests at once wait for the same read).
const vistos = new Map()
const banco = {
  ler: async (login) => (itens.has(login) ? structuredClone(itens.get(login)) : null),
  varios: async (logins) => logins.filter((l) => itens.has(l)).map((l) => structuredClone(itens.get(l))),
  definir: async (login, campos) => itens.set(login, { ...(itens.get(login) || { login }), ...structuredClone(campos) }),
  remover: async (login, nomes) => {
    const i = itens.get(login)
    if (i) for (const n of nomes) delete i[n]
  },
}

// Brings from the real API whoever this server hasn't seen yet.
async function trazer(logins) {
  const todos = [...new Set(logins)].filter((l) => LOGIN.test(l))
  const novos = todos.filter((l) => !vistos.has(l))
  if (novos.length) {
    const lendo = ler(novos)
    novos.forEach((l) => vistos.set(l, lendo))
  }
  await Promise.all(todos.map((l) => vistos.get(l)))
}

async function ler(novos) {
  const pedir = (rota) => fetch(`${REAL}${rota}?logins=${novos.join(",")}`).then((r) => (r.ok ? r.json() : {}), () => ({}))
  let achados = await pedir("/cartoes")
  // An API from before /cartoes: the fans and the balls apart.
  if (!Object.keys(achados).length) {
    const [fans, bolas] = await Promise.all([pedir("/torcedores"), pedir("/duelistas")])
    achados = Object.fromEntries([...new Set([...Object.keys(fans), ...Object.keys(bolas)])].map((l) => [l, { aparencia: fans[l], duelo: bolas[l] }]))
  }
  for (const [login, c] of Object.entries(achados)) {
    const campos = Object.fromEntries(Object.entries({ aparencia: c.aparencia, cartao: c.cartao, duelo: c.duelo, imagens: c.imagens }).filter(([, v]) => v))
    if (Object.keys(campos).length) await banco.definir(login, campos)
  }
}

const usuario = async (headers) => {
  const m = /^Bearer local-([a-z0-9_]{1,25})$/.exec(headers?.authorization || "")
  if (!m) return null
  await trazer([m[1]])
  return { login: m[1], id: `local-${m[1]}` }
}
const handler = rotas({ banco, usuario, chave: "local" })

const ENTRAR = (q) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Entrar (local)</title>
<body style="font:16px system-ui;display:grid;place-items:center;min-height:90vh;background:#d6e0ff;color:#001447">
<form style="background:#fff;padding:24px 28px;border-radius:12px;display:grid;gap:12px;min-width:280px">
  <b>Entrar com a Twitch (de mentira)</b>
  <small>Servidor local do perfil: nada sai deste computador.</small>
  <input name="login" placeholder="login da Twitch" value="muanlartins" autofocus style="font:inherit;padding:8px;border:1px solid #99a">
  <button style="font:inherit;padding:8px;background:#002fa7;color:#fff;border:0;border-radius:6px">Entrar</button>
</form>
<script>
  const q = new URLSearchParams(${JSON.stringify(q)})
  document.querySelector("form").onsubmit = (e) => {
    e.preventDefault()
    const login = e.target.login.value.trim().toLowerCase()
    if (!/^[a-z0-9_]{1,25}$/.test(login)) return
    location.href = q.get("redirect_uri") + "#" + new URLSearchParams({ access_token: "local-" + login, state: q.get("state") || "", token_type: "bearer" })
  }
</script>`

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-chave",
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`)
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end()
  if (url.pathname === "/_entrar") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    return res.end(ENTRAR(url.search))
  }
  // The agenda is the real one.
  if (url.pathname.startsWith("/agenda")) {
    const r = await fetch(`${REAL}${url.pathname}${url.search}`).catch(() => null)
    res.writeHead(r?.status ?? 502, { ...cors, "content-type": r?.headers.get("content-type") ?? "text/plain" })
    return res.end(r ? Buffer.from(await r.arrayBuffer()) : "")
  }
  const logins = (url.searchParams.get("logins") || url.searchParams.get("login") || "").toLowerCase().split(",")
  await trazer(logins)
  const partes = []
  for await (const p of req) partes.push(p)
  const corpo = Buffer.concat(partes)
  const tipo = req.headers["content-type"] || ""
  const binario = corpo.length && !tipo.includes("json")
  const r = await handler({
    requestContext: { http: { method: req.method }, domainName: `localhost:${PORTA}` },
    rawPath: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body: corpo.length ? (binario ? corpo.toString("base64") : corpo.toString()) : undefined,
    isBase64Encoded: Boolean(binario),
  })
  res.writeHead(r.statusCode, { ...cors, ...(r.headers || {}) })
  res.end(r.body === undefined ? "" : r.isBase64Encoded ? Buffer.from(r.body, "base64") : r.body)
}).listen(PORTA, "127.0.0.1", () => console.log(`perfil local em http://localhost:${PORTA}`))
