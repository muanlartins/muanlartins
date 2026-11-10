// Who is calling: the viewer's Twitch token, from the site's sign-in (lib/profile.ts, Twitch's implicit flow: the token
// stays in their browser). Twitch checks it, and it must have been issued to this site's app (TWITCH_CLIENT_ID). A warm
// function remembers a good token for a few minutes, so a page making several calls doesn't ask Twitch each time.

import { createHash } from "node:crypto"
import { LOGIN } from "./http.mjs"

const LEMBRA = 5 * 60_000
const lembrados = new Map()

/** The caller's { login, id } (Twitch's user id), or null without a valid token. */
export async function usuario(headers, clientId = process.env.TWITCH_CLIENT_ID) {
  const token = (headers?.authorization || "").replace(/^Bearer /, "")
  if (!token || !clientId) return null
  const chave = createHash("sha256").update(token).digest("base64url")
  const lembrado = lembrados.get(chave)
  if (lembrado && lembrado.ate > Date.now()) return lembrado.quem
  const r = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: "OAuth " + token } })
  if (!r.ok) return null
  const v = await r.json()
  if (v.client_id !== clientId || !LOGIN.test(v.login)) return null
  const quem = { login: v.login, id: v.user_id }
  if (lembrados.size > 500) lembrados.clear()
  lembrados.set(chave, { quem, ate: Date.now() + LEMBRA })
  return quem
}

/** Only the caller's login, or null. */
export async function quem(headers) {
  return (await usuario(headers))?.login ?? null
}
