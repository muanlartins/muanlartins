#!/usr/bin/env node
// Builds and keeps the community's Discord server (infra/comum/discord.mjs has the story) from what's written here:
// its settings, roles, channels, the protection against bots, the emojis, the onboarding and the welcome and rules
// messages. Run it again after changing any of it: it changes what differs and leaves the rest.
//
//   node scripts/discord.mjs            # what it would change (it only reads)
//   node scripts/discord.mjs --apply    # changes it
//   node scripts/discord.mjs --apply --sobras   # also deletes the channels the server came with that aren't here
//
// The bot's token is read from %USERPROFILE%\.config\muanlartins\discord-bot.txt and never printed. With the bot in
// no server yet, it prints the link that adds it. The ids it finds or makes go to infra/comum/discord.json, which the
// profile API reads. It never deletes a role, and deletes a channel only with --sobras, and only one it didn't make.

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { P, RANKS, cliente, cor, floco, soma } from "../infra/comum/discord.mjs"
import { PALAVRAS } from "../infra/pix/filtro.mjs"

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..")
const IDS = join(RAIZ, "infra/comum/discord.json")
const TOKEN = process.env.DISCORD_TOKEN_FILE ?? "/mnt/c/Users/muanl/.config/muanlartins/discord-bot.txt"
const APLICAR = process.argv.includes("--apply")
const SOBRAS = process.argv.includes("--sobras")
const SITE = "https://muanlartins.com.br"

// --- what the server is -----------------------------------------------------------------------------------------------

const DESCRICAO = "A comunidade do canal muanlartins: Rocket League e Valorant ao vivo na Twitch, e o que a gente aprende jogando."

// Top to bottom. "sub" is made by Discord's Twitch integration (Luan turns it on in the server's settings); the script
// only names, colours and places it.
const MODERACAO = soma(P.expulsar, P.banir, P.registro, P.mensagens, P.silenciar, P.ensurdecer, P.mover, P.apelidos, P.topicos, P.castigar, P.prioridade)
const CARGOS = [
  { chave: "streamer", nome: "Streamer", cor: "#85a7ff", hoist: true, permissoes: 0n },
  { chave: "moderacao", nome: "Moderação", cor: "#43d18a", hoist: true, permissoes: MODERACAO },
  { chave: "sub", nome: "Sub", cor: "#bf94ff", hoist: true, integracao: true },
  ...RANKS.map((r) => ({ chave: `rank-${r.id}`, nome: r.nome, cor: r.cor, hoist: true, permissoes: 0n })),
  { chave: "avisos", nome: "Avisos de live", cor: null, hoist: false, permissoes: 0n },
]

// What everyone can do. Not: @everyone, external apps, private threads, managing anything.
const TODOS = soma(
  P.ver, P.convidar, P.apelido, P.enviar, P.enviarEmTopico, P.criarTopico, P.links, P.arquivos, P.reagir, P.emojisDeFora,
  P.figurinhasDeFora, P.historico, P.entrar, P.falar, P.transmitir, P.voz, P.comandos, P.pedirFala, P.atividades,
  P.soundboard, P.sonsDeFora, P.mensagemDeVoz, P.enquetes,
)
const SO_LEITURA = soma(P.enviar, P.enviarEmTopico, P.criarTopico, P.criarTopicoPrivado)

// leitura: only the channel and the bot write there; so: only these roles see it (and Luan, the owner).
const CATEGORIAS = [
  {
    chave: "comece",
    nome: "📌 Comece aqui",
    canais: [
      { chave: "boas-vindas", nome: "👋┃boas-vindas", topico: "Quem somos, onde achar o canal e como pegar os seus cargos.", leitura: true },
      { chave: "regras", nome: "📜┃regras", topico: "Tenha bom senso.", leitura: true },
      { chave: "avisos", nome: "📢┃avisos", topico: "Novidades do canal e do site.", leitura: true, anuncio: true },
      { chave: "lives", nome: "🔴┃lives", topico: `Quando a live abre, e do que vai ser. A agenda completa: ${SITE}/canal/agenda`, leitura: true },
    ],
  },
  {
    chave: "conversa",
    nome: "💬 Conversa",
    canais: [
      { chave: "geral", nome: "💬┃geral", topico: "Papo livre." },
      { chave: "clipes", nome: "🎬┃clipes-e-jogadas", topico: "Os seus clipes e as jogadas da live." },
      { chave: "valorant", nome: "🎯┃valorant", topico: "Valorant: partidas, mira, agentes, dúvidas." },
      { chave: "rocket-league", nome: "🚗┃rocket-league", topico: "Rocket League: partidas, mecânicas, dúvidas." },
      { chave: "ideias", nome: "💡┃ideias", topico: `Ideias pro canal, pra live e pro site. As que viram coisa entram no roadmap com o seu nome: ${SITE}/canal/roadmap` },
      { chave: "subs", nome: "💜┃só-subs", topico: "Só pra quem é sub na Twitch.", so: ["sub", "moderacao"] },
    ],
  },
  {
    chave: "voz",
    nome: "🔊 Voz",
    canais: [
      { chave: "resenha", nome: "🗣️ Resenha", voz: true },
      { chave: "voz-valorant", nome: "🎯 Valorant", voz: true, limite: 5 },
      { chave: "voz-rocket-league", nome: "🚗 Rocket League", voz: true, limite: 3 },
      { chave: "assistindo", nome: "📺 Assistindo a live", voz: true },
    ],
  },
  {
    chave: "moderacao",
    nome: "🛡️ Moderação",
    so: ["moderacao"],
    canais: [{ chave: "moderacao", nome: "🛡️┃moderação", topico: "Só a moderação vê. O AutoMod avisa aqui o que bloqueou." }],
  },
]

const REGRAS = [
  "Respeite todo mundo: sem preconceito, ataques ou assédio.",
  "Sem conteúdo adulto ou violento.",
  "Sem spam e sem divulgar outros servidores ou canais sem combinar antes.",
  "A moderação tem a palavra final.",
]

// The messages the bot keeps in its channels (it edits its own when the text changes). <#chave> becomes the channel.
const MENSAGENS = {
  "boas-vindas": [
    "# Boas-vindas à torcida!",
    "Este é o servidor da comunidade do **muanlartins**: Rocket League e Valorant ao vivo na Twitch, aprendendo com o método científico, e vídeos no YouTube.",
    "",
    `🔴 **Lives:** <https://twitch.tv/muanlartins>. Quando a live abre, o aviso sai em <#lives>, e as próximas aparecem em **Eventos**, no topo da lista de canais. A agenda completa é a do site: <${SITE}/canal/agenda>`,
    "▶️ **YouTube:** <https://www.youtube.com/@muanlartins>",
    `🌐 **O site:** <${SITE}>, a casa de tudo: a sua página de torcedor, os seus Σ, o Pix ao vivo, os minijogos e o roadmap.`,
    "",
    "**Os seus cargos**",
    "🔔 Quer ser marcado quando a live abrir? Escolha em **Canais e cargos**, no topo da lista de canais.",
    `🏅 Os Σ que você ganha assistindo às lives viram o seu cargo aqui: conecte o Discord no seu perfil, <${SITE}/perfil>.`,
    "💜 Sub na Twitch? Conecte a Twitch nas **Conexões** do seu Discord e o cargo Sub chega sozinho, com o <#subs>.",
    "",
    "Leia as <#regras> e bom papo!",
  ].join("\n"),
  regras: [
    "# Regras",
    "**Tenha bom senso.** Na prática:",
    ...REGRAS.map((r, i) => `${i + 1}. ${r}`),
    "",
    "O AutoMod bloqueia spam, convites pra outros servidores e as palavras que a gente não usa aqui, as mesmas do Pix da live.",
  ].join("\n"),
}

// The followers' emotes on Twitch, for everyone here too (the subs' come with the Twitch integration).
const EMOJIS = ["Oi", "GG"].map((n) => ({ nome: `muanla${n}`, arquivo: join(RAIZ, `brand/twitch/emotes/${n}-112.png`) }))
const ICONE = join(RAIZ, "brand/logo/avatar-800.png")

// --- running it -------------------------------------------------------------------------------------------------------

const lerIds = () => (existsSync(IDS) ? JSON.parse(readFileSync(IDS, "utf8")) : {})
const ids = { canais: {}, cargos: {}, ...lerIds() }
const mudancas = []
const avisos = []

/** Does it (with --apply) or says it would. */
async function fazer(descricao, fn, novo = {}) {
  mudancas.push(descricao)
  console.log(`${APLICAR ? "→" : "·"} ${descricao}`)
  if (!APLICAR) return { id: `<novo>`, ...novo }
  return fn()
}

const dataUri = (arquivo) => `data:image/png;base64,${readFileSync(arquivo).toString("base64")}`
const semEnfeite = (nome) => nome.replace(/^.*┃/, "").replace(/^[^\p{L}\p{N}]+/u, "").trim().toLowerCase()
const bits = (n) => String(n ?? 0n)
const igualOverwrites = (a = [], b = []) => {
  const norma = (l) => JSON.stringify(l.map((o) => [o.id, Number(o.type), bits(o.allow), bits(o.deny)]).sort())
  return norma(a) === norma(b)
}

if (!existsSync(TOKEN)) {
  console.error(`Sem o token do bot em ${TOKEN}. No Developer Portal do Discord: o app → Bot → Reset Token, e salve só o token nesse arquivo.`)
  process.exit(1)
}
const pedir = cliente(readFileSync(TOKEN, "utf8").trim())

const app = await pedir("GET", "/oauth2/applications/@me")
const bot = await pedir("GET", "/users/@me")
const servidores = await pedir("GET", "/users/@me/guilds")
console.log(`Bot: ${bot.username} (app ${app.id})`)
// The bot wears the channel's avatar.
if (!bot.avatar) await fazer("pôr o avatar do canal no bot", () => pedir("PATCH", "/users/@me", { avatar: dataUri(ICONE) }))
if (app.bot_public) avisos.push('O bot está como "Public Bot": desligue em Developer Portal → Bot, pra só você poder adicioná-lo.')
if (!(app.flags & ((1 << 14) | (1 << 15)))) avisos.push('Ligue "Server Members Intent" em Developer Portal → Bot (o rank Σ precisa).')

const escolhido = servidores.find((s) => s.id === ids.servidor) ?? (servidores.length === 1 ? servidores[0] : null)
if (!escolhido) {
  if (!servidores.length) {
    console.log(`\nO bot ainda não está em nenhum servidor. Abra este link e escolha o servidor:\nhttps://discord.com/oauth2/authorize?client_id=${app.id}&scope=bot&permissions=8&integration_type=0`)
  } else {
    console.log(`\nO bot está em ${servidores.length} servidores; diga qual em infra/comum/discord.json ("servidor"): ${servidores.map((s) => `${s.name} ${s.id}`).join(", ")}`)
  }
  for (const a of avisos) console.log(`! ${a}`)
  process.exit(servidores.length ? 1 : 0)
}
const G = escolhido.id
ids.servidor = G
ids.bot = bot.id
const guild = await pedir("GET", `/guilds/${G}`)
console.log(`Servidor: ${guild.name} (${G})${APLICAR ? "" : " · só lendo; --apply muda"}\n`)

// Roles ------------------------------------------------------------------------------------------------------------------
let papeis = await pedir("GET", `/guilds/${G}/roles`)
const doBot = papeis.filter((r) => r.tags?.bot_id === bot.id).sort((a, b) => b.position - a.position)[0]
const topoBot = doBot?.position ?? 0
// The Twitch integration's own role (it also makes one per tier, left as they come).
const integracoes = await pedir("GET", `/guilds/${G}/integrations`).catch(() => [])
const daTwitch = integracoes.find((i) => i.type === "twitch" && i.role_id)?.role_id
const daIntegracao = papeis.filter((r) => r.id === daTwitch)
const cargo = {}
for (const c of CARGOS) {
  let r = papeis.find((x) => x.id === ids.cargos[c.chave])
  if (!r && c.integracao) r = daIntegracao.length === 1 ? daIntegracao[0] : null
  if (!r) r = papeis.find((x) => x.name === c.nome && !x.managed)
  if (!r && c.integracao) {
    avisos.push("Sem o cargo de sub ainda: ative a integração da Twitch (Configurações do servidor → Integrações → Twitch) e rode de novo.")
    continue
  }
  const quer = { name: c.nome, color: cor(c.cor), hoist: c.hoist, ...(c.integracao ? {} : { mentionable: false, permissions: bits(c.permissoes) }) }
  if (!r) {
    r = await fazer(`criar o cargo ${c.nome}`, () => pedir("POST", `/guilds/${G}/roles`, quer, { motivo: "Montagem do servidor" }), { name: c.nome })
  } else {
    const difere = Object.entries(quer).filter(([k, v]) => String(r[k]) !== String(v)).map(([k]) => k)
    if (difere.length && r.position >= topoBot) avisos.push(`O cargo ${r.name} está acima do bot: arraste o cargo do bot pro topo em Configurações do servidor → Cargos.`)
    else if (difere.length) r = await fazer(`ajustar o cargo ${c.nome} (${difere.join(", ")})`, () => pedir("PATCH", `/guilds/${G}/roles/${r.id}`, quer, { motivo: "Montagem do servidor" }), r)
  }
  cargo[c.chave] = r.id
  if (!String(r.id).startsWith("<")) ids.cargos[c.chave] = r.id
}
const todos = papeis.find((r) => r.id === G)
if (bits(todos.permissions) !== bits(TODOS)) await fazer("ajustar o que todo mundo pode (@everyone)", () => pedir("PATCH", `/guilds/${G}/roles/${G}`, { permissions: bits(TODOS) }))

// The order: our roles, top to bottom, in the slots they already hold under the bot's.
if (APLICAR) papeis = await pedir("GET", `/guilds/${G}/roles`)
const nossos = CARGOS.map((c) => papeis.find((r) => r.id === cargo[c.chave])).filter((r) => r && r.position < topoBot)
const posicoes = nossos.map((r) => r.position).sort((a, b) => b - a)
if (nossos.some((r, i) => r.position !== posicoes[i])) {
  await fazer("pôr os cargos na ordem", () => pedir("PATCH", `/guilds/${G}/roles`, nossos.map((r, i) => ({ id: r.id, position: posicoes[i] }))))
}

// Channels ---------------------------------------------------------------------------------------------------------------
let canais = await pedir("GET", `/guilds/${G}/channels`)
const usados = new Set()
const canal = {}
function achar(chave, tipos, nome) {
  const salvo = canais.find((c) => c.id === ids.canais[chave])
  if (salvo) return salvo
  return canais.find((c) => !usados.has(c.id) && tipos.includes(c.type) && semEnfeite(c.name) === semEnfeite(nome))
}
function overwrites(item, categoria) {
  const lista = []
  const so = item.so ?? categoria?.so
  if (so) {
    lista.push({ id: G, type: 0, allow: "0", deny: bits(P.ver) })
    for (const k of so) if (cargo[k] && !String(cargo[k]).startsWith("<")) lista.push({ id: cargo[k], type: 0, allow: bits(soma(P.ver, P.entrar)), deny: "0" })
  }
  if (item.leitura) {
    const todosAqui = lista.find((o) => o.id === G)
    if (todosAqui) todosAqui.deny = bits(BigInt(todosAqui.deny) | SO_LEITURA)
    else lista.push({ id: G, type: 0, allow: "0", deny: bits(SO_LEITURA) })
  }
  return lista
}
async function garantir(chave, item, tipos, quer, categoria) {
  const c = achar(chave, tipos, item.nome)
  if (!c) {
    const novo = await fazer(`criar ${quer.type === 4 ? "a categoria" : "o canal"} ${item.nome}`, () => pedir("POST", `/guilds/${G}/channels`, quer, { motivo: "Montagem do servidor" }), { name: item.nome })
    canal[chave] = novo.id
    if (!String(novo.id).startsWith("<")) ids.canais[chave] = novo.id
    return
  }
  usados.add(c.id)
  canal[chave] = c.id
  ids.canais[chave] = c.id
  const difere = []
  for (const [k, v] of Object.entries(quer)) {
    if (k === "type") continue
    if (k === "permission_overwrites" ? !igualOverwrites(c[k], v) : String(c[k] ?? "") !== String(v ?? "")) difere.push(k)
  }
  if (difere.length) {
    const patch = Object.fromEntries(Object.entries(quer).filter(([k]) => difere.includes(k)))
    await fazer(`ajustar ${item.nome} (${difere.join(", ")})`, () => pedir("PATCH", `/channels/${c.id}`, patch, { motivo: "Montagem do servidor" }))
  }
}
const comunidade = guild.features.includes("COMMUNITY")
for (const cat of CATEGORIAS) {
  await garantir(`cat-${cat.chave}`, cat, [4], { type: 4, name: cat.nome, permission_overwrites: overwrites(cat) }, null)
  for (const item of cat.canais) {
    const tipo = item.voz ? 2 : 0
    const quer = { type: tipo, name: item.nome, parent_id: canal[`cat-${cat.chave}`], permission_overwrites: overwrites(item, cat) }
    if (!item.voz) quer.topic = item.topico ?? ""
    if (item.voz) quer.user_limit = item.limite ?? 0
    if (String(quer.parent_id).startsWith("<")) delete quer.parent_id
    await garantir(item.chave, item, item.voz ? [2] : [0, 5], quer, cat)
  }
}

// The order: the categories as written, and each one's channels as written (Discord sorts by these numbers within a
// category, text before voice).
if (APLICAR) canais = await pedir("GET", `/guilds/${G}/channels`)
const ordem = CATEGORIAS.flatMap((cat, i) => [[`cat-${cat.chave}`, i], ...cat.canais.map((item, j) => [item.chave, j])])
const fora = ordem.filter(([k, pos]) => {
  const c = canais.find((x) => x.id === canal[k])
  return c && c.position !== pos
})
if (fora.length) await fazer("pôr os canais na ordem", () => pedir("PATCH", `/guilds/${G}/channels`, ordem.filter(([k]) => canais.some((x) => x.id === canal[k])).map(([k, position]) => ({ id: canal[k], position }))))

// The server's settings, the community features among them ---------------------------------------------------------------
const quer = {
  verification_level: 2,
  explicit_content_filter: 2,
  default_message_notifications: 1,
  preferred_locale: "pt-BR",
  description: DESCRICAO,
  system_channel_id: canal.geral,
  system_channel_flags: 1 << 2,
  rules_channel_id: canal.regras,
  public_updates_channel_id: canal.moderacao,
  safety_alerts_channel_id: canal.moderacao,
}
const difere = Object.entries(quer).filter(([k, v]) => String(guild[k] ?? "") !== String(v)).map(([k]) => k)
const patch = Object.fromEntries(Object.entries(quer).filter(([k]) => difere.includes(k)))
if (!comunidade) patch.features = [...new Set([...guild.features, "COMMUNITY"])]
if (!guild.icon) patch.icon = dataUri(ICONE)
if (Object.keys(patch).length) {
  const quais = [...difere, ...(patch.features ? ["comunidade"] : []), ...(patch.icon ? ["ícone"] : [])]
  await fazer(`ajustar o servidor (${quais.join(", ")})`, () => pedir("PATCH", `/guilds/${G}`, patch, { motivo: "Montagem do servidor" }))
}

// #avisos as an announcement channel (only in a community server).
if (APLICAR) canais = await pedir("GET", `/guilds/${G}/channels`)
const avisosCanal = canais.find((c) => c.id === canal.avisos)
if (avisosCanal && avisosCanal.type === 0) await fazer("fazer do #avisos um canal de anúncios", () => pedir("PATCH", `/channels/${canal.avisos}`, { type: 5 }))
else if (!avisosCanal) console.log("· (depois de criado, o #avisos vira canal de anúncios)")

// Rules screening: accepting the rules before talking. Its API isn't Discord's documented one, so trouble is a warning.
// (The server's feature MEMBER_VERIFICATION_GATE_ENABLED says it's on.)
try {
  const atual = await pedir("GET", `/guilds/${G}/member-verification?with_guild=false`).catch(() => null)
  const ligado = (await pedir("GET", `/guilds/${G}`)).features.includes("MEMBER_VERIFICATION_GATE_ENABLED")
  const campos = [{ field_type: "TERMS", label: "Leia e aceite as regras do servidor", values: ["Tenha bom senso.", ...REGRAS], required: true }]
  const igual = atual?.form_fields?.[0]?.values?.join("\n") === campos[0].values.join("\n") && atual?.description === DESCRICAO
  if (!igual || !ligado) {
    await fazer("ligar o aceite das regras antes de falar", () =>
      pedir("PATCH", `/guilds/${G}/member-verification`, { enabled: true, description: DESCRICAO, form_fields: campos }),
    )
  }
} catch (e) {
  avisos.push(`Não deu pra ligar o aceite das regras (${e.status ?? e.message}): ligue à mão em Configurações do servidor → Acesso → "Aceite das regras".`)
}

// The invite people get (permanent), before AutoMod, which lets it through.
const convites = await pedir("GET", `/guilds/${G}/invites`).catch(() => [])
let convite = convites.find((c) => c.inviter?.id === bot.id && c.max_age === 0 && c.max_uses === 0)?.code
if (!convite) {
  const novo = await fazer("criar o convite permanente", () => pedir("POST", `/channels/${canal["boas-vindas"]}/invites`, { max_age: 0, max_uses: 0, unique: true }), { code: "<novo>" })
  convite = novo.code
}
if (!String(convite).startsWith("<")) ids.convite = convite

// AutoMod -------------------------------------------------------------------------------------------------------------------
const alerta = { type: 2, metadata: { channel_id: canal.moderacao } }
const bloqueia = (msg) => ({ type: 1, metadata: { custom_message: msg } })
const isentos = [cargo.moderacao].filter((x) => x && !String(x).startsWith("<"))
const REGRAS_AUTOMOD = [
  { name: "Spam", trigger_type: 3, actions: [bloqueia("Isso pareceu spam. Se não era, fala com a moderação."), alerta] },
  {
    name: "Marcação em massa",
    trigger_type: 5,
    trigger_metadata: { mention_total_limit: 5, mention_raid_protection_enabled: true },
    actions: [bloqueia("Gente demais marcada de uma vez."), alerta, { type: 3, metadata: { duration_seconds: 600 } }],
  },
  {
    name: "Conteúdo adulto e ofensas",
    trigger_type: 4,
    trigger_metadata: { presets: [2, 3], allow_list: [] },
    actions: [bloqueia("Essa mensagem tem palavras que a gente não usa aqui."), alerta],
  },
  {
    name: "Palavras do Pix",
    trigger_type: 1,
    trigger_metadata: { keyword_filter: [...PALAVRAS, "sapatão", "viadão", "cuzão"].map((p) => `${p}*`), regex_patterns: [], allow_list: [] },
    actions: [bloqueia("Essa mensagem tem palavras que a gente não usa aqui."), alerta],
  },
  {
    name: "Convites e golpes",
    trigger_type: 1,
    trigger_metadata: {
      keyword_filter: [],
      regex_patterns: [
        String.raw`(?i)disc[o0]rd(?:app)?\s*(?:\.|dot)\s*(?:gg|io|me|li|com\s*/\s*invite)\s*/\s*[a-z0-9-]+`,
        String.raw`(?i)dsc\.gg/\S+`,
        String.raw`(?i)(?:free|gr[aá]tis|de\s+gra[cç]a)\s+nitro|nitro\s+(?:free|gr[aá]tis|de\s+gra[cç]a)`,
      ],
      allow_list: String(convite).startsWith("<") ? [] : [`*${convite}*`],
    },
    actions: [bloqueia("Convites pra outros servidores e brindes de nitro não passam aqui."), alerta],
  },
]
const automod = await pedir("GET", `/guilds/${G}/auto-moderation/rules`)
for (const r of REGRAS_AUTOMOD) {
  const corpo = { event_type: 1, enabled: true, exempt_roles: isentos, exempt_channels: [], ...r }
  if (String(canal.moderacao).startsWith("<")) corpo.actions = corpo.actions.filter((a) => a.type !== 2)
  const atual = automod.find((x) => x.name === r.name)
  if (!atual) {
    await fazer(`criar a regra do AutoMod "${r.name}"`, () => pedir("POST", `/guilds/${G}/auto-moderation/rules`, corpo))
    continue
  }
  const { trigger_type, ...resto } = corpo
  const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  const tm = (x) => Object.fromEntries(Object.keys(r.trigger_metadata ?? {}).map((k) => [k, x?.[k]]))
  const difere = !igual(atual.actions.map((a) => [a.type, a.metadata]), resto.actions.map((a) => [a.type, a.metadata])) ||
    !igual(tm(atual.trigger_metadata), tm(r.trigger_metadata)) || !atual.enabled || !igual(atual.exempt_roles.sort(), [...isentos].sort())
  if (difere) await fazer(`ajustar a regra do AutoMod "${r.name}"`, () => pedir("PATCH", `/guilds/${G}/auto-moderation/rules/${atual.id}`, resto))
}

// Emojis ----------------------------------------------------------------------------------------------------------------------
const emojis = await pedir("GET", `/guilds/${G}/emojis`)
for (const e of EMOJIS) {
  if (!emojis.some((x) => x.name === e.nome)) await fazer(`subir o emoji :${e.nome}:`, () => pedir("POST", `/guilds/${G}/emojis`, { name: e.nome, image: dataUri(e.arquivo) }))
}

// The bot's messages ----------------------------------------------------------------------------------------------------------
const comCanais = (texto) => texto.replace(/<#([a-z-]+)>/g, (_, k) => (canal[k] ? `<#${canal[k]}>` : `#${k}`))
for (const [chave, texto] of Object.entries(MENSAGENS)) {
  const id = canal[chave]
  const conteudo = comCanais(texto)
  const minhas = String(id).startsWith("<") ? [] : (await pedir("GET", `/channels/${id}/messages?limit=50`)).filter((m) => m.author?.id === bot.id)
  const minha = minhas.at(-1)
  const corpo = { content: conteudo, allowed_mentions: { parse: [] }, flags: 4 }
  if (!minha) await fazer(`escrever a mensagem de #${chave}`, () => pedir("POST", `/channels/${id}/messages`, corpo))
  else if (minha.content !== conteudo) await fazer(`atualizar a mensagem de #${chave}`, () => pedir("PATCH", `/channels/${id}/messages/${minha.id}`, corpo))
}

// Onboarding: the channels everyone sees and the one question, whether they want the live's ping. ------------------------------
try {
  const atual = await pedir("GET", `/guilds/${G}/onboarding`)
  const padrao = CATEGORIAS.filter((c) => !c.so).flatMap((c) => c.canais.filter((x) => !x.so).map((x) => canal[x.chave]))
  const titulo = "Quer ser marcado quando a live abrir?"
  const antes = atual.prompts?.find((p) => p.title === titulo)
  const prompts = [
    {
      id: antes?.id ?? floco(1),
      type: 0,
      title: titulo,
      single_select: false,
      required: false,
      in_onboarding: true,
      options: [
        {
          id: antes?.options?.[0]?.id ?? floco(2),
          title: "Sim, me marca",
          description: "Você é marcado em #lives quando a live começa.",
          emoji_name: "🔔",
          role_ids: [cargo.avisos],
          channel_ids: [],
        },
      ],
    },
  ]
  const igual =
    atual.enabled &&
    JSON.stringify([...atual.default_channel_ids].sort()) === JSON.stringify([...padrao].sort()) &&
    antes?.options?.length === 1 &&
    antes.options[0].role_ids?.[0] === cargo.avisos
  if (!igual && !padrao.some((x) => String(x).startsWith("<"))) {
    await fazer("ligar o onboarding: os canais de todos e a pergunta do aviso de live", () =>
      pedir("PUT", `/guilds/${G}/onboarding`, { prompts, default_channel_ids: padrao, enabled: true, mode: 0 }),
    )
  } else if (!igual) console.log("· (o onboarding fica pra depois de criados os canais)")
} catch (e) {
  avisos.push(`Não deu pra ligar o onboarding (${e.status ?? ""} ${e.body?.message ?? e.message}).`)
}

// Luan gets the Streamer role.
if (cargo.streamer && !String(cargo.streamer).startsWith("<")) {
  const dono = await pedir("GET", `/guilds/${G}/members/${guild.owner_id}`)
  if (!dono.roles.includes(cargo.streamer)) await fazer("dar o cargo Streamer ao dono", () => pedir("PUT", `/guilds/${G}/members/${guild.owner_id}/roles/${cargo.streamer}`))
} else if (cargo.streamer) console.log("· dar o cargo Streamer ao dono")

// What the server came with that isn't here.
const nossosCanais = new Set(Object.values(canal))
const sobras = canais.filter((c) => !nossosCanais.has(c.id))
if (sobras.length) {
  console.log(`\nCanais que não são daqui: ${sobras.map((c) => `${c.name}`).join(", ")}`)
  if (SOBRAS) for (const c of sobras) await fazer(`apagar o canal ${c.name}`, () => pedir("DELETE", `/channels/${c.id}`, undefined, { motivo: "Sobra da criação do servidor" }))
  else console.log("(--sobras apaga)")
}

if (APLICAR) writeFileSync(IDS, JSON.stringify(ids, null, 2) + "\n")
console.log(`\n${mudancas.length ? `${mudancas.length} mudança(s)${APLICAR ? " feitas" : "; --apply faz"}` : "Nada a mudar."}`)
if (ids.convite) console.log(`Convite: https://discord.gg/${ids.convite}`)
for (const a of avisos) console.log(`! ${a}`)
