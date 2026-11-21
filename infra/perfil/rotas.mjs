// The profile API's routes, apart from DynamoDB so a test can run them (index.test.mjs): index.mjs gives them the table.
//
// The table, keyed by login: aparencia (the fan for the stream's crowd, /perfil), id (their Twitch user id), em (when
// the fan was saved), loadout and loadoutEm (their dream Valorant loadout, the inventory's builder), duelo (their ball
// in the duel: its class and its weapon's material, /canal/minijogos), cartao (their card, the same everywhere on the
// site and on top of their page, /torcedor/<login>: its colours, a line about them and their game) and, on the
// channel's own login only, jogo (Luan's Valorant inventory as the game last had it, sent by scripts/valorant.py).
// imagens says which version of their banner and photo is current ({ banner, foto }, each an id); the pictures
// themselves are items of their own, "<login>#banner" and "<login>#foto" ("#" is never in a login), so the batch reads
// of the cards never carry them.
//
// Public:   GET /torcedores?logins=a,b   the fans of whoever is in the stand (the crowd, the mural, the roadmap)
//           GET /cartoes?logins=a,b      their cards: the fan, the card and the ball (a viewer's page, a name's card)
//           GET /duelistas?logins=a,b    the balls of whoever is in the duel (public/stream/duelo.html)
//           GET /loadout?login=a         someone's dream loadout; the channel's also brings its game reading
// Twitch:   GET /eu                      their fan, loadout, ball and card
//           PUT /eu, DELETE /eu          their fan (deleting it keeps the loadout)
//           PUT /eu/loadout, DELETE /eu/loadout
//           PUT /eu/duelo, DELETE /eu/duelo
//           PUT /eu/cartao, DELETE /eu/cartao
//           PUT /eu/imagem/banner, PUT /eu/imagem/foto   a WebP or JPEG drawn by the site (banner 3:1, photo square)
//           DELETE /eu/imagem/banner, DELETE /eu/imagem/foto
// Public:   GET /imagem/<login>/<banner|foto>/<id>.<webp|jpg>   the picture, cached for good (a new one is a new id)
// Channel:  DELETE /canal/imagem/<login>/<banner|foto>         takes anyone's picture down
// The live: POST /canal/jogo with x-chave, from the stream PC: the channel's inventory read from the game
//
// The lives' calendar (comum/agenda.mjs), the one source of truth for when the lives are, kept in the item "#agenda"
// (not a login, so no viewer's):
// Public:   GET /agenda                  the agenda, when it was saved and the lives of the next two weeks (proximas)
//           GET /agenda.ics              it for calendar apps (the site's "Adicionar à sua agenda")
//           GET /agenda.txt              the next live in a line of chat, as plain text: the chat bot's !agenda
//                                        (StreamElements' customapi shows the answer as it comes)
// Channel:  PUT /agenda                  the channel's Twitch only: the editor on /canal/agenda (and the Discord
//                                        server's events follow it)
//
// The Discord server (discord.mjs has the story; without the bot's token these answer 503):
// Twitch:   PUT /eu/discord              { token }: their Discord (its implicit grant's token) linked, in the server
//                                        with their Σ rank; DELETE /eu/discord unlinks it. GET /eu brings `discord`.
// Channel:  PUT /canal/discord/live      { inicio, titulo, jogo }: the stream opened (the Anúncios dock); the ping
//           PUT /canal/discord/sincronizar    the ranks and the events now (the hourly run does the same)
//           (PUT, not POST: the API's CORS lets browsers PUT, and the dock is a page of the site)
// The hourly run (EventBridge, { discord: "sincronizar" }): the ranks and the events.

import { FUSO, dataEm, ics, limpar, noChat, ocorrencias } from "./comum/agenda.mjs"
import { daLive, json, LOGIN, out } from "./comum/http.mjs"
import { filtrar } from "./filtro.mjs"

export const CANAL = "muanlartins"

// Items that aren't viewers: "#" is never in a login.
const AGENDA = "#agenda"
const CALENDARIO = "Live do muanlartins"
const PAGINA_AGENDA = "https://muanlartins.com.br/canal/agenda"

const ID = /^[a-z0-9-]{1,16}$/
const COR = /^#[0-9a-f]{6}$/
const EMOJI = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]*$/u
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ARMA = /^[a-z]{2,16}$/
const ARMAS = 30 // Valorant has 21 weapons; room for new ones
const VARIANTES = 6
const POSSES = 5000
const NOME = /^[a-z-]{2,24}$/
// The card's text about them ("Sobre mim") and their pronouns: what the Pix's word filter lets through.
export const SOBRE_MAX = 300
export const PRONOMES_MAX = 24
// The pictures: an item holds 400 KB. The site draws them small enough (lib/viewer-images.ts): a banner of 1500×500
// and a photo of 320×320.
export const IMAGEM_MAX = { banner: 300_000, foto: 90_000 }
const IMAGEM = /^\/imagem\/([a-z0-9_]{1,25})\/(banner|foto)\/([a-z0-9]{6,20})\.(webp|jpg)$/
const CANAL_IMAGEM = /^\/canal\/imagem\/([a-z0-9_]{1,25})\/(banner|foto)$/

const linha = (s, max) => [...String(s).replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()
// Text that may break lines: at most two in a row, spaces folded within each line.
const texto = (s, max) =>
  [...String(s).replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim()]
    .slice(0, max)
    .join("")
    .trim()

// What a picture is, by its first bytes: a WebP ("RIFF", size, "WEBP") or a JPEG.
export function formato(b) {
  if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp"
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg"
  return null
}
const novoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
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

// Their ball in the duel: { classe, material }, either left out for the default (a class drawn each duel; the material
// of their Σ rank). Only the shape is checked: duelo-motor.js knows the classes, and the overlay draws a material only
// once their Σ has unlocked it.
export function duelo(d) {
  const o = {}
  if (!d || typeof d !== "object") return o
  for (const k of ["classe", "material"]) if (typeof d[k] === "string" && NOME.test(d[k])) o[k] = d[k]
  return o
}

// Their card: { tema, cores, sobre, pronomes, jogo }, any left out for the default. tema is one of the site's themes
// (lib/viewer.ts) or "livre" with cores, two colours of their own, which the site draws only once their Σ unlocks free
// colours (as the fan's); sobre is what they say about themselves and pronomes their pronouns, both through the word
// filter; jogo is their game, by the site's id. The banner and the photo aren't in it: they're saved apart (imagens).
export function cartao(c) {
  const o = {}
  if (!c || typeof c !== "object") return o
  if (typeof c.tema === "string" && NOME.test(c.tema)) o.tema = c.tema
  if (Array.isArray(c.cores)) {
    const cores = c.cores.filter((x) => typeof x === "string" && COR.test(x.toLowerCase())).map((x) => x.toLowerCase())
    if (cores.length === 2) o.cores = cores
  }
  if (typeof c.sobre === "string") {
    const sobre = filtrar(texto(c.sobre, SOBRE_MAX)).texto
    if (sobre) o.sobre = sobre
  }
  if (typeof c.pronomes === "string") {
    const pronomes = filtrar(linha(c.pronomes, PRONOMES_MAX)).texto
    if (pronomes) o.pronomes = pronomes
  }
  if (typeof c.jogo === "string" && NOME.test(c.jogo)) o.jogo = c.jogo
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
 *   banco.remover(login, nomes) removes fields; usuario(headers) → { login, id } or null; chave is the stream's key;
 *   discord: discord.mjs's automacoes, or null while the bot has no token.
 */
export function rotas({ banco, usuario, chave, discord = null, agora = () => new Date() }) {
  const doCanal = async (event) => (await usuario(event.headers || {}))?.login === CANAL

  // Takes someone's banner or photo down: the picture's item emptied, and the card back to its colours / Twitch photo.
  async function tirarImagem(login, tipo) {
    await banco.remover(`${login}#${tipo}`, ["imagem", "ext", "id", "em"])
    const i = await banco.ler(login)
    if (!i?.imagens?.[tipo]) return i?.imagens ?? null
    const resto = Object.fromEntries(Object.entries(i.imagens).filter(([k]) => k !== tipo))
    if (Object.keys(resto).length) await banco.definir(login, { imagens: resto })
    else await banco.remover(login, ["imagens"])
    return Object.keys(resto).length ? resto : null
  }

  async function imagem(event, metodo, caminho) {
    const doCanalPedido = CANAL_IMAGEM.exec(caminho)
    if (doCanalPedido) {
      if (metodo !== "DELETE") return out(405, {})
      if (!(await doCanal(event))) return out(403, {})
      return out(200, { login: doCanalPedido[1], imagens: await tirarImagem(doCanalPedido[1], doCanalPedido[2]) })
    }
    const pedido = IMAGEM.exec(caminho)
    if (metodo !== "GET" || !pedido) return out(404, {})
    const [, login, tipo, id, ext] = pedido
    const i = await banco.ler(`${login}#${tipo}`)
    if (!i?.imagem || i.id !== id || i.ext !== ext) return out(404, {})
    return {
      statusCode: 200,
      headers: { "content-type": ext === "webp" ? "image/webp" : "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
      body: Buffer.from(i.imagem).toString("base64"),
      isBase64Encoded: true,
    }
  }

  async function agenda(event, metodo, caminho) {
    if (metodo === "GET") {
      const i = await banco.ler(AGENDA)
      if (caminho === "/agenda.txt") {
        return {
          statusCode: 200,
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
          body: noChat(i?.agenda ?? { dates: {}, games: {} }, { url: PAGINA_AGENDA }),
        }
      }
      if (caminho === "/agenda.ics") {
        return {
          statusCode: 200,
          headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=300" },
          body: ics(i?.agenda ?? { dates: {}, games: {} }, { nome: CALENDARIO, url: PAGINA_AGENDA }),
        }
      }
      const r = out(200, { agenda: i?.agenda ?? null, em: i?.em ?? null, proximas: i?.agenda ? ocorrencias(i.agenda, agora(), 14) : [] })
      return { ...r, headers: { ...r.headers, "cache-control": "public, max-age=30" } }
    }
    if (metodo !== "PUT" || caminho !== "/agenda") return out(405, {})
    if (!(await doCanal(event))) return out(403, { erro: "Só a conta do canal muda a agenda." })
    const a = limpar(json(event), dataEm(agora(), FUSO))
    if (!a) return out(400, {})
    const em = new Date().toISOString()
    await banco.definir(AGENDA, { agenda: a, em })
    // Discord's events follow; trouble there never fails the save (the hourly run tries again).
    if (discord) await discord.eventos(a).catch((e) => console.error("Discord, eventos:", e.message))
    return out(200, { agenda: a, em, proximas: ocorrencias(a, agora(), 14) })
  }

  /** The ranks and the events, now: the hourly run and the channel's button. */
  async function sincronizar() {
    const a = (await banco.ler(AGENDA))?.agenda
    const [eventos, ranks] = await Promise.allSettled([discord.eventos(a), discord.ranks()])
    const lido = (r) => (r.status === "fulfilled" ? r.value : { erro: r.reason?.message })
    return { eventos: lido(eventos), ranks: lido(ranks) }
  }

  async function doDiscord(event, metodo, caminho) {
    if (!discord) return out(503, { erro: "O Discord ainda não foi ligado." })
    if (caminho === "/canal/discord/live" || caminho === "/canal/discord/sincronizar") {
      if (metodo !== "PUT") return out(405, {})
      if (!(await doCanal(event))) return out(403, {})
      if (caminho === "/canal/discord/sincronizar") return out(200, await sincronizar())
      const corpo = json(event)
      if (!corpo) return out(400, {})
      return out(200, await discord.aoVivo({ inicio: corpo.inicio, titulo: corpo.titulo, jogo: corpo.jogo }))
    }
    const v = await usuario(event.headers || {})
    if (!v) return out(401, { erro: "Entre com a Twitch de novo." })
    if (metodo === "DELETE") {
      await discord.desvincular(v.login)
      return out(200, { login: v.login, discord: null })
    }
    if (metodo !== "PUT") return out(405, {})
    const token = json(event)?.token
    if (typeof token !== "string" || !/^[\w.-]{10,200}$/.test(token)) return out(400, {})
    const r = await discord.vincular(v.login, token).catch((e) => {
      console.error("Discord, vincular:", e.message)
      return { erro: e.status === 403 && e.body?.code === 40007 ? "Você foi banido do servidor." : "O Discord não respondeu. Tente de novo." }
    })
    if (!r) return out(401, { erro: "O Discord não aceitou: conecte de novo." })
    if (r.erro) return out(502, r)
    return out(200, { login: v.login, ...r })
  }

  return async function handler(event) {
    if (event.discord === "sincronizar") return discord ? sincronizar() : null
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

    if (metodo === "GET" && caminho === "/cartoes") {
      const logins = [...new Set((event.queryStringParameters?.logins || "").toLowerCase().split(","))].filter((l) => LOGIN.test(l)).slice(0, 100)
      if (!logins.length) return out(200, {})
      const itens = await banco.varios(logins)
      const r = out(
        200,
        Object.fromEntries(
          itens
            .filter((i) => i.aparencia || i.cartao || i.duelo || i.imagens)
            .map((i) => [
              i.login,
              { aparencia: i.aparencia ?? null, cartao: i.cartao ?? null, duelo: i.duelo && Object.keys(i.duelo).length ? i.duelo : null, imagens: i.imagens ?? null },
            ]),
        ),
      )
      return { ...r, headers: { ...r.headers, "cache-control": "public, max-age=30" } }
    }

    if (metodo === "GET" && caminho === "/duelistas") {
      const logins = [...new Set((event.queryStringParameters?.logins || "").toLowerCase().split(","))].filter((l) => LOGIN.test(l)).slice(0, 100)
      if (!logins.length) return out(200, {})
      const itens = await banco.varios(logins)
      return out(200, Object.fromEntries(itens.filter((i) => i.duelo && Object.keys(i.duelo).length).map((i) => [i.login, i.duelo])))
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

    if (caminho.startsWith("/imagem/") || caminho.startsWith("/canal/imagem/")) return imagem(event, metodo, caminho)
    if (caminho === "/agenda" || caminho === "/agenda.ics" || caminho === "/agenda.txt") return agenda(event, metodo, caminho)
    if (caminho === "/eu/discord" || caminho.startsWith("/canal/discord/")) return doDiscord(event, metodo, caminho)

    const minha = /^\/eu\/imagem\/(banner|foto)$/.exec(caminho)
    if (caminho !== "/eu" && caminho !== "/eu/loadout" && caminho !== "/eu/duelo" && caminho !== "/eu/cartao" && !minha) return out(404, {})
    const v = await usuario(event.headers || {})
    if (!v) return out(401, { erro: "Entre com a Twitch de novo." })
    const agora = new Date().toISOString()

    if (minha) {
      const tipo = minha[1]
      if (metodo === "PUT") {
        const bytes = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "binary")
        const ext = formato(bytes)
        if (!ext || bytes.length < 200 || bytes.length > IMAGEM_MAX[tipo]) return out(400, { erro: "Imagem grande demais ou num formato que não dá." })
        const id = novoId()
        await banco.definir(`${v.login}#${tipo}`, { imagem: bytes, ext, id, em: agora })
        const imagens = { ...((await banco.ler(v.login))?.imagens ?? {}), [tipo]: `${id}.${ext}` }
        await banco.definir(v.login, { id: v.id, imagens })
        return out(200, { login: v.login, imagens })
      }
      if (metodo === "DELETE") return out(200, { login: v.login, imagens: await tirarImagem(v.login, tipo) })
      return out(405, {})
    }

    if (caminho === "/eu/duelo") {
      if (metodo === "PUT") {
        const corpo = json(event)
        if (!corpo) return out(400, {})
        const d = duelo(corpo)
        await banco.definir(v.login, { id: v.id, duelo: d })
        return out(200, { login: v.login, duelo: d })
      }
      if (metodo === "DELETE") {
        await banco.remover(v.login, ["duelo"])
        return out(200, { login: v.login, duelo: null })
      }
      return out(405, {})
    }

    if (caminho === "/eu/cartao") {
      if (metodo === "PUT") {
        const corpo = json(event)
        if (!corpo) return out(400, {})
        const c = cartao(corpo)
        await banco.definir(v.login, { id: v.id, cartao: c })
        return out(200, { login: v.login, cartao: c })
      }
      if (metodo === "DELETE") {
        await banco.remover(v.login, ["cartao"])
        return out(200, { login: v.login, cartao: null })
      }
      return out(405, {})
    }

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
      return out(200, { login: v.login, aparencia: i.aparencia ?? null, loadout: i.loadout ?? null, duelo: i.duelo ?? null, cartao: i.cartao ?? null, imagens: i.imagens ?? null, discord: i.discord ?? null })
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
