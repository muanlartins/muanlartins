// The Σ API's viewers' matches on a laptop, over a table in memory (pareamento.mjs, the same code as the Lambda's), to
// try the "Sorteio" scene and the "Pareamento" dock without the stream:
//
//   node infra/sigma/local/servidor.mjs            # http://localhost:8132, key "local"
//   curl 'localhost:8132/jogar.txt?login=ana&nome=Ana'            # someone types !jogar (also /sair.txt, /time.txt, /cor.txt …&texto=)
//   curl -X POST localhost:8132/_gente -d 8                       # eight sample people on the list at once
//
// then open public/stream/sorteio.html?sigma=http://localhost:8132 and pareamento.html?sigma=http://localhost:8132#chave=local
// from any static server on public/ (python3 -m http.server -d public 8000). Stays out of the Lambda's zip (local/).

import { createServer } from "node:http"
import * as Pareamento from "../pareamento.mjs"

const PORTA = Number(process.env.PORTA || 8132)
const CHAVE = "local"
const DONO = "muanlartins"
const NOMES = ["Ana", "Bia", "Caio", "Duda", "Edu", "Fê", "Gabi", "Hugo", "Iara", "João", "Kaká", "Lia", "Malu", "Nico", "Otto", "Pri", "Quel", "Rafa", "Sol", "Téo", "Uli", "Vivi", "Wes", "Xande"]

const tabela = { item: null, sigma: new Map() }
tabela.ler = async () => (tabela.item ? structuredClone(tabela.item) : null)
tabela.gravar = async (estado, antes) => {
  if ((tabela.item?.versao ?? null) !== antes) return false
  tabela.item = structuredClone(estado)
  return true
}
tabela.somar = async (logins, n) => {
  for (const l of logins) tabela.sigma.set(l, (tabela.sigma.get(l) ?? 0) + n)
  console.log(`Σ ${n > 0 ? "+" : ""}${n}: ${logins.join(", ")}`)
}

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, x-chave", "access-control-allow-methods": "GET, POST, OPTIONS" }
const responder = (res, status, corpo, tipo = "application/json") => {
  res.writeHead(status, { ...cors, "content-type": `${tipo}; charset=utf-8`, "cache-control": "no-store" })
  res.end(tipo === "application/json" ? JSON.stringify(corpo) : corpo)
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost")
  let corpo = ""
  for await (const parte of req) corpo += parte
  try {
    if (req.method === "OPTIONS") return responder(res, 204, "", "text/plain")
    const txt = url.pathname.match(/^\/(jogar|sair|time|cor)\.txt$/)
    if (req.method === "GET" && txt) return responder(res, 200, await Pareamento.comandoDoChat(tabela, txt[1], Object.fromEntries(url.searchParams), DONO), "text/plain")
    if (req.method === "GET" && url.pathname === "/pareamento") return responder(res, 200, Pareamento.publico(await tabela.ler()))
    if (req.method === "POST" && url.pathname === "/pareamento") {
      if (req.headers["x-chave"] !== CHAVE) return responder(res, 401, {})
      const [status, r] = await Pareamento.acaoDoDock(tabela, JSON.parse(corpo || "{}"), DONO)
      return responder(res, status, r)
    }
    if (req.method === "POST" && url.pathname === "/_gente") {
      const n = Math.min(NOMES.length, Number(corpo) || 6)
      for (const nome of NOMES.slice(0, n)) await Pareamento.comandoDoChat(tabela, "jogar", { login: nome.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""), nome }, DONO)
      return responder(res, 200, Pareamento.publico(await tabela.ler()))
    }
    responder(res, 404, {})
  } catch (e) {
    console.error(e)
    responder(res, 500, { erro: e.message })
  }
}).listen(PORTA, () => console.log(`Σ (pareamento) em http://localhost:${PORTA}, chave "${CHAVE}"`))
