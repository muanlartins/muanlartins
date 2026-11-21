// The Discord server's automations, run by the profile API (infra/comum/discord.mjs has the server's story, and
// comum/discord.json the ids scripts/discord.mjs found or made):
//
// - Linking: a viewer signed in on /perfil connects their Discord (Discord's implicit grant with identify and
//   guilds.join, so the token stays in their browser like Twitch's and the API needs no client secret). The API asks
//   Discord who it is, puts them in the server if they aren't there yet, and gives them their Σ rank as a role. Each
//   viewer keeps `discord: { id, nome, em }`; the item "#discord" keeps every link, `vinculos` (Discord id → login).
// - Ranks: every linked member holds the role of their Σ tier (Rocket League's tiers, public/stream/sigma.js linked in
//   as ./sigma.js), and nobody else holds one. Kept on each link and on the hourly run.
// - Events: the agenda's lives of the next seven days are the server's events (external, at twitch.tv), so whoever
//   marks "Interessado" hears when one starts. Kept on every save of the agenda and on the hourly run. Only the
//   events the bot made are touched, and only those still to come.
// - The live's ping: when the stream opens, the Anúncios dock (abertura.js) says so (PUT /canal/discord/live) and the
//   bot posts it in #lives, pinging "Avisos de live". Once per stream start ("#discord".live).

import { readFileSync } from "node:fs"
import vm from "node:vm"
import { roteiroEmLinhas, ocorrencias } from "./comum/agenda.mjs"
import { API, RANKS, tierDe } from "./comum/discord.mjs"

const contexto = { window: {} }
vm.runInNewContext(readFileSync(new URL("./sigma.js", import.meta.url), "utf8"), contexto)
export const Sigma = contexto.window.Sigma

export const DISCORD = "#discord"
const TWITCH = "https://twitch.tv/muanlartins"
const AGENDA = "https://muanlartins.com.br/canal/agenda"
const DIAS = 7

/** Who a Discord token (a viewer's, from the implicit grant) belongs to; null when Discord says it's no good. */
export async function quemE(token, { buscar = fetch } = {}) {
  const r = await buscar(`${API}/users/@me`, { headers: { authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  const u = await r.json()
  return u?.id ? { id: u.id, nome: u.global_name || u.username } : null
}

/** The Σ API's public totals for these logins: { login: { sigma, … } }. */
export function sigmasDe(url, { buscar = fetch } = {}) {
  return async (logins) => {
    const total = {}
    for (let i = 0; i < logins.length; i += 100) {
      const r = await buscar(`${url}/sigmas?logins=${logins.slice(i, i + 100).map(encodeURIComponent).join(",")}`)
      if (!r.ok) throw new Error(`Σ API ${r.status}`)
      Object.assign(total, await r.json())
    }
    return total
  }
}

/** The text a live's event carries: its game, its run of the show and the agenda. */
export function descricaoDe(o) {
  const linhas = [o.nome, ...roteiroEmLinhas(o.roteiro ?? []), "", `A agenda: ${AGENDA}`]
  return linhas.join("\n").slice(0, 1000)
}

/** A title Discord shows as it is: no @everyone, @here or mentions. */
const semMencao = (s) => String(s ?? "").replace(/@(everyone|here)/gi, "@​$1").replace(/<[@#][!&]?\d+>/g, "").slice(0, 300)

/**
 * pedir: the bot's REST client (comum/discord.mjs's cliente); ids: comum/discord.json; banco: the profile table;
 * sigmas(logins): the Σ totals; quem(token): who a viewer's Discord token is.
 */
export function automacoes({ pedir, ids, banco, sigmas, quem = quemE, agora = () => new Date() }) {
  const G = ids.servidor
  const rankDe = Object.fromEntries(RANKS.map((r) => [r.id, ids.cargos?.[`rank-${r.id}`]]))
  const cargosDeRank = new Set(Object.values(rankDe).filter(Boolean))
  const cargoPara = (sigma) => rankDe[tierDe(Sigma.ranque(sigma ?? 0).id)]

  const lerVinculos = async () => (await banco.ler(DISCORD))?.vinculos ?? {}

  /** One member's rank roles made right: `quer` (a role id, or null for none). */
  async function acertar(membro, quer) {
    let mudou = 0
    for (const r of membro.roles.filter((r) => cargosDeRank.has(r) && r !== quer)) {
      await pedir("DELETE", `/guilds/${G}/members/${membro.user.id}/roles/${r}`, undefined, { motivo: "Rank Σ" })
      mudou++
    }
    if (quer && !membro.roles.includes(quer)) {
      await pedir("PUT", `/guilds/${G}/members/${membro.user.id}/roles/${quer}`, undefined, { motivo: "Rank Σ" })
      mudou++
    }
    return mudou
  }

  const membro = (id) =>
    pedir("GET", `/guilds/${G}/members/${id}`).catch((e) => {
      if (e.status === 404) return null
      throw e
    })

  /** Links `login` to the Discord account of `token`: in the server, with their rank. */
  async function vincular(login, token) {
    const u = await quem(token)
    if (!u) return null
    const sigma = (await sigmas([login]))[login]?.sigma ?? 0
    const quer = cargoPara(sigma)
    const vinculos = await lerVinculos()
    const antes = (await banco.ler(login))?.discord
    // This Discord linked to someone else before, or this login to another Discord: those links go.
    const outro = vinculos[u.id] && vinculos[u.id] !== login ? vinculos[u.id] : null
    if (outro) await banco.remover(outro, ["discord"])
    if (antes?.id && antes.id !== u.id) {
      delete vinculos[antes.id]
      const velho = await membro(antes.id)
      if (velho) await acertar(velho, null)
    }
    // Into the server with the role, or (already there) the role set.
    const entrou = await pedir("PUT", `/guilds/${G}/members/${u.id}`, { access_token: token, ...(quer ? { roles: [quer] } : {}) }, { motivo: `Vinculado a ${login} no site` })
    if (!entrou) {
      const m = await membro(u.id)
      if (m) await acertar(m, quer)
    }
    vinculos[u.id] = login
    const discord = { id: u.id, nome: u.nome, em: agora().toISOString() }
    await banco.definir(login, { discord })
    await banco.definir(DISCORD, { vinculos })
    return { discord, novo: Boolean(entrou) }
  }

  async function desvincular(login) {
    const antes = (await banco.ler(login))?.discord
    if (!antes?.id) return
    const vinculos = await lerVinculos()
    if (vinculos[antes.id] === login) delete vinculos[antes.id]
    await banco.definir(DISCORD, { vinculos })
    await banco.remover(login, ["discord"])
    const m = await membro(antes.id)
    if (m) await acertar(m, null)
  }

  /** Every member's rank roles, from their Σ now. */
  async function ranks() {
    const vinculos = await lerVinculos()
    const totais = await sigmas([...new Set(Object.values(vinculos))])
    let depois = "0"
    let mudou = 0
    let membros = 0
    for (;;) {
      const pagina = await pedir("GET", `/guilds/${G}/members?limit=1000&after=${depois}`)
      for (const m of pagina) {
        if (m.user.bot) continue
        membros++
        const login = vinculos[m.user.id]
        mudou += await acertar(m, login ? cargoPara(totais[login]?.sigma ?? 0) : null)
      }
      if (pagina.length < 1000) break
      depois = pagina.at(-1).user.id
    }
    return { membros, vinculados: Object.keys(vinculos).length, mudou }
  }

  /** The server's events made to match the agenda's next seven days. */
  async function eventos(agenda) {
    const agoraMs = +agora()
    const quer = ocorrencias(agenda ?? { dates: {}, games: {} }, agora(), DIAS).filter((o) => Date.parse(o.inicio) > agoraMs + 60_000)
    const meus = (await pedir("GET", `/guilds/${G}/scheduled-events`)).filter((e) => e.creator_id === ids.bot && e.status === 1)
    const usados = new Set()
    let criados = 0
    let mudados = 0
    let apagados = 0
    for (const o of quer) {
      const corpo = {
        name: o.titulo.slice(0, 100),
        description: descricaoDe(o),
        scheduled_start_time: o.inicio,
        scheduled_end_time: o.fim,
        entity_type: 3,
        entity_metadata: { location: TWITCH },
        privacy_level: 2,
      }
      const e = meus.find((x) => !usados.has(x.id) && Date.parse(x.scheduled_start_time) === Date.parse(o.inicio))
      if (!e) {
        await pedir("POST", `/guilds/${G}/scheduled-events`, corpo, { motivo: "Agenda do site" })
        criados++
        continue
      }
      usados.add(e.id)
      const igual = e.name === corpo.name && (e.description ?? "") === corpo.description && Date.parse(e.scheduled_end_time) === Date.parse(o.fim) && e.entity_metadata?.location === TWITCH
      if (!igual) {
        const { name, description, scheduled_end_time, entity_metadata } = corpo
        await pedir("PATCH", `/guilds/${G}/scheduled-events/${e.id}`, { name, description, scheduled_end_time, entity_metadata }, { motivo: "Agenda do site" })
        mudados++
      }
    }
    for (const e of meus.filter((x) => !usados.has(x.id))) {
      await pedir("DELETE", `/guilds/${G}/scheduled-events/${e.id}`, undefined, { motivo: "Saiu da agenda do site" })
      apagados++
    }
    return { criados, mudados, apagados }
  }

  /** The live's ping in #lives, once per stream start. */
  async function aoVivo({ inicio, titulo, jogo }) {
    const comeco = Date.parse(inicio)
    if (!Number.isFinite(comeco) || comeco > +agora() + 5 * 60_000 || comeco < +agora() - 6 * 3_600_000) return { avisado: false, motivo: "início fora de hora" }
    const chave = new Date(comeco).toISOString()
    if ((await banco.ler(DISCORD))?.live === chave) return { avisado: false, motivo: "já avisado" }
    const cargo = ids.cargos?.avisos
    const linhas = [`${cargo ? `<@&${cargo}> ` : ""}🔴 **Ao vivo agora:** ${semMencao(titulo) || "live no ar"}`, `${jogo ? `${semMencao(jogo)} · ` : ""}${TWITCH}`]
    await pedir("POST", `/channels/${ids.canais.lives}/messages`, { content: linhas.join("\n"), allowed_mentions: { roles: cargo ? [cargo] : [] } })
    await banco.definir(DISCORD, { live: chave })
    return { avisado: true }
  }

  return { vincular, desvincular, ranks, eventos, aoVivo }
}
