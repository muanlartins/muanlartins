// The profile API's routes, apart from DynamoDB so a test can run them (index.test.mjs): index.mjs gives them the table.
//
// The table, keyed by login: aparencia (the fan for the stream's crowd, /perfil), id (their Twitch user id), em (when
// the fan was saved), loadout and loadoutEm (their dream Valorant loadout, the inventory's builder), and, on the
// channel's own login only, jogo (Luan's Valorant inventory as the game last had it, sent by scripts/valorant.py).
//
// Public:   GET /torcedores?logins=a,b   the fans of whoever is in the stand (the crowd, the mural, the roadmap)
//           GET /loadout?login=a         someone's dream loadout; the channel's also brings its game reading
// Twitch:   GET /eu                      their fan and loadout
//           PUT /eu, DELETE /eu          their fan (deleting it keeps the loadout)
//           PUT /eu/loadout, DELETE /eu/loadout
// The live: POST /canal/jogo with x-chave, from the stream PC: the channel's inventory read from the game

import { daLive, json, LOGIN, out } from "./comum/http.mjs"

export const CANAL = "muanlartins"

const ID = /^[a-z0-9-]{1,16}$/
const COR = /^#[0-9a-f]{6}$/
const EMOJI = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]*$/u
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ARMA = /^[a-z]{2,16}$/
const ARMAS = 30 // Valorant has 21 weapons; room for new ones
const VARIANTES = 6
const POSSES = 5000

const linha = (s, max) => [...String(s).replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()
const uuid = (x) => (typeof x === "string" && UUID.test(x.toLowerCase()) ? x.toLowerCase() : null)
const uuids = (l, max) => [...new Set((Array.isArray(l) ? l : []).map(uuid).filter(Boolean))].slice(0, max)

// The fan: only the shape of each choice is checked; torcedor.js knows the options and drops the rest.
export function aparencia(a) {
  const o = {}
  if (!a || typeof a !== "object") return o
  for (const k of ["cabeca", "roupa", "acessorio", "comemoracao"]) if (ID.test(a[k])) o[k] = a[k]
  for (const k of ["cor", "detalhe", "terceira"]) if (typeof a[k] === "string" && COR.test(a[k].toLowerCase())) o[k] = a[k].toLowerCase()
  if (typeof a.time === "string") o.time = linha(a.time, 24)
  if (Number.isInteger(a.numero) && a.numero >= 0 && a.numero <= 99) o.numero = a.numero
  if (typeof a.frase === "string") o.frase = linha(a.frase, 30)
  const st = (l) => (Array.isArray(l) ? l.filter((e) => typeof e === "string" && e.length <= 16 && EMOJI.test(e)).slice(0, 3) : [])
  if (a.stickers && typeof a.stickers === "object") o.stickers = { gol: st(a.stickers.gol), contra: st(a.stickers.contra) }
  return o
}

// A dream loadout: { armas: { vandal: { skin, chromas: [the preferred variant, then any alternatives] } } }, by Riot's
// ids; a weapon left out is open. Only the shape is checked: the site ignores ids its catalogue doesn't know.
export function loadout(l) {
  const armas = {}
  const dadas = l && typeof l.armas === "object" && !Array.isArray(l.armas) ? Object.entries(l.armas) : []
  for (const [arma, escolha] of dadas.slice(0, ARMAS)) {
    const skin = uuid(escolha?.skin)
    if (ARMA.test(arma) && skin) armas[arma] = { skin, chromas: uuids(escolha.chromas, VARIANTES) }
  }
  return { armas }
}

// The channel's inventory as the game has it: the skin and variant on each weapon, and every skin and variant owned.
export function jogo(j) {
  const equipado = {}
  const dadas = j && typeof j.equipado === "object" && !Array.isArray(j.equipado) ? Object.entries(j.equipado) : []
  for (const [arma, e] of dadas.slice(0, ARMAS)) {
    const skin = uuid(e?.skin)
    const chroma = uuid(e?.chroma)
    if (ARMA.test(arma) && skin && chroma) equipado[arma] = { skin, chroma }
  }
  const lido = typeof j?.lido === "string" && !Number.isNaN(Date.parse(j.lido)) ? new Date(j.lido).toISOString() : new Date().toISOString()
  return { lido, equipado, skins: uuids(j?.skins, POSSES), chromas: uuids(j?.chromas, POSSES) }
}

/**
 * The handler, given the table and how to know the caller:
 *   banco.ler(login) → the item or null; banco.varios(logins) → items; banco.definir(login, campos) sets fields;
 *   banco.remover(login, nomes) removes fields; usuario(headers) → { login, id } or null; chave is the stream's key.
 */
export function rotas({ banco, usuario, chave }) {
  return async function handler(event) {
    const metodo = event.requestContext.http.method
    const caminho = event.rawPath
    // The $default route takes the browser's preflight too; API Gateway adds the CORS headers.
    if (metodo === "OPTIONS") return { statusCode: 204 }

    if (metodo === "GET" && caminho === "/torcedores") {
      const logins = [...new Set((event.queryStringParameters?.logins || "").toLowerCase().split(","))].filter((l) => LOGIN.test(l)).slice(0, 100)
      if (!logins.length) return out(200, {})
      const itens = await banco.varios(logins)
      return out(200, Object.fromEntries(itens.filter((i) => i.aparencia).map((i) => [i.login, i.aparencia])))
    }

    if (metodo === "GET" && caminho === "/loadout") {
      const login = (event.queryStringParameters?.login || "").toLowerCase()
      if (!LOGIN.test(login)) return out(400, {})
      const i = (await banco.ler(login)) || {}
      return out(200, { login, loadout: i.loadout ?? null, em: i.loadoutEm ?? null, ...(login === CANAL ? { jogo: i.jogo ?? null } : {}) })
    }

    if (metodo === "POST" && caminho === "/canal/jogo") {
      if (!daLive(event, chave)) return out(401, {})
      const corpo = json(event)
      if (!corpo) return out(400, {})
      const lido = jogo(corpo)
      await banco.definir(CANAL, { jogo: lido })
      return out(200, { armas: Object.keys(lido.equipado).length, skins: lido.skins.length, chromas: lido.chromas.length })
    }

    if (caminho !== "/eu" && caminho !== "/eu/loadout") return out(404, {})
    const v = await usuario(event.headers || {})
    if (!v) return out(401, { erro: "Entre com a Twitch de novo." })
    const agora = new Date().toISOString()

    if (caminho === "/eu/loadout") {
      if (metodo === "PUT") {
        const corpo = json(event)
        if (!corpo) return out(400, {})
        const l = loadout(corpo)
        await banco.definir(v.login, { id: v.id, loadout: l, loadoutEm: agora })
        return out(200, { login: v.login, loadout: l, em: agora })
      }
      if (metodo === "DELETE") {
        await banco.remover(v.login, ["loadout", "loadoutEm"])
        return out(200, { login: v.login, loadout: null, em: null })
      }
      return out(405, {})
    }

    if (metodo === "GET") {
      const i = (await banco.ler(v.login)) || {}
      return out(200, { login: v.login, aparencia: i.aparencia ?? null, loadout: i.loadout ?? null })
    }
    if (metodo === "PUT") {
      const corpo = json(event)
      if (!corpo) return out(400, {})
      const a = aparencia(corpo)
      await banco.definir(v.login, { id: v.id, aparencia: a, em: agora })
      return out(200, { login: v.login, aparencia: a })
    }
    if (metodo === "DELETE") {
      await banco.remover(v.login, ["aparencia", "em"])
      return out(200, { login: v.login, aparencia: null })
    }
    return out(405, {})
  }
}
