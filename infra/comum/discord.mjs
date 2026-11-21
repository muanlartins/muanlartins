// The community's Discord server (since 2026-11-19): what the setup script (scripts/discord.mjs) builds and the
// profile API's automations read. The site stays the source of truth; the server is where the people talk, hear when
// a live opens and play together.
//
// The bot is the Discord application "muanlartins" (Luan's, at discord.com/developers). Its token lives in
// %USERPROFILE%\.config\muanlartins\discord-bot.txt for the script and in the stack's parameter for the API, never in
// the repository and never printed. discord.json, next to this file, is what the script found or made: the server's,
// channels' and roles' ids (none of them secret), so the API never looks them up by name.

export const API = "https://discord.com/api/v10"
const AGENTE = "DiscordBot (https://muanlartins.com.br, 1)"
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * A REST client with the bot's token: pedir(metodo, caminho, corpo?, { motivo? }) returns the body as JSON (null when
 * empty) and throws on an error with its status. A 429 waits Discord's retry_after and tries again (up to 5 times).
 * Errors carry Discord's answer, never the token.
 */
export function cliente(token, { buscar = fetch } = {}) {
  return async function pedir(metodo, caminho, corpo, { motivo } = {}) {
    for (let tentativa = 0; ; tentativa++) {
      const headers = { authorization: `Bot ${token}`, "user-agent": AGENTE }
      if (corpo !== undefined) headers["content-type"] = "application/json"
      if (motivo) headers["x-audit-log-reason"] = encodeURIComponent(motivo)
      const r = await buscar(API + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
      const texto = await r.text()
      let body = null
      try {
        body = texto ? JSON.parse(texto) : null
      } catch {}
      if (r.status === 429 && tentativa < 5) {
        await espera(Math.ceil((body?.retry_after ?? 1) * 1000) + 100)
        continue
      }
      if (!r.ok) {
        const e = new Error(`Discord ${metodo} ${caminho.split("?")[0]}: ${r.status} ${texto.slice(0, 400)}`)
        e.status = r.status
        e.body = body
        throw e
      }
      return body
    }
  }
}

// Permissions, as Discord's bit flags.
export const P = {
  convidar: 1n << 0n,
  expulsar: 1n << 1n,
  banir: 1n << 2n,
  admin: 1n << 3n,
  reagir: 1n << 6n,
  registro: 1n << 7n,
  prioridade: 1n << 8n,
  transmitir: 1n << 9n,
  ver: 1n << 10n,
  enviar: 1n << 11n,
  links: 1n << 14n,
  arquivos: 1n << 15n,
  historico: 1n << 16n,
  todos: 1n << 17n,
  emojisDeFora: 1n << 18n,
  entrar: 1n << 20n,
  falar: 1n << 21n,
  silenciar: 1n << 22n,
  ensurdecer: 1n << 23n,
  mover: 1n << 24n,
  voz: 1n << 25n,
  apelido: 1n << 26n,
  apelidos: 1n << 27n,
  mensagens: 1n << 13n,
  comandos: 1n << 31n,
  pedirFala: 1n << 32n,
  topicos: 1n << 34n,
  criarTopico: 1n << 35n,
  criarTopicoPrivado: 1n << 36n,
  figurinhasDeFora: 1n << 37n,
  enviarEmTopico: 1n << 38n,
  atividades: 1n << 39n,
  castigar: 1n << 40n,
  soundboard: 1n << 42n,
  sonsDeFora: 1n << 45n,
  mensagemDeVoz: 1n << 46n,
  enquetes: 1n << 49n,
  appsDeFora: 1n << 50n,
}
export const soma = (...ps) => ps.reduce((a, p) => a | p, 0n)

// Σ as roles: Rocket League's tiers from public/stream/sigma.js, without divisions, each in a colour that reads on
// Discord's dark theme (the site's rank colours, lightened where they were too dark). "Σ" in the name, so nobody takes
// it for their own rank in the game.
export const RANKS = [
  { id: "supersonic-legend", nome: "Σ Lenda Supersônica", cor: "#f5f0ff" },
  { id: "grand-champion", nome: "Σ Grande Campeão", cor: "#e0506a" },
  { id: "champion", nome: "Σ Campeão", cor: "#a970f0" },
  { id: "diamond", nome: "Σ Diamante", cor: "#5b8cff" },
  { id: "platinum", nome: "Σ Platina", cor: "#3aa7b5" },
  { id: "gold", nome: "Σ Ouro", cor: "#c39a1c" },
  { id: "silver", nome: "Σ Prata", cor: "#aab3c2" },
  { id: "bronze", nome: "Σ Bronze", cor: "#c4824f" },
]

/** A rank's tier from its emblem id in sigma.js: "gold-2" → "gold". */
export const tierDe = (id) => String(id).replace(/-\d$/, "")

/** "#rrggbb" → Discord's integer colour. */
export const cor = (hex) => (hex ? parseInt(hex.slice(1), 16) : 0)

/** A snowflake for something new (onboarding's prompts and options need ids made by the client). */
export const floco = (desloca = 0) => String(((BigInt(Date.now()) - 1420070400000n) << 22n) + BigInt(desloca))
