// What every function of the site's APIs (infra/perfil, infra/sigma, infra/pix) does the same way. Each function's
// folder links this one as ./comum (a symlink), and CI's zip carries the files themselves, so the import is the same
// on a laptop and in Lambda.

import { timingSafeEqual } from "node:crypto"

export const LOGIN = /^[a-z0-9_]{1,25}$/

/** An API Gateway (HTTP API) answer in JSON. */
export const out = (statusCode, body) => ({ statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

/** The request's body as text, base64 or not. */
export function corpo(event) {
  const b = event.body || ""
  return event.isBase64Encoded ? Buffer.from(b, "base64").toString() : b
}

/** The request's body as a JSON object; null when it isn't one. */
export function json(event) {
  try {
    const j = JSON.parse(corpo(event) || "{}")
    return j && typeof j === "object" && !Array.isArray(j) ? j : null
  } catch {
    return null
  }
}

/** Whether two secrets match, in constant time. */
export const igual = (a, b) => typeof a === "string" && !!b && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Whether the request carries the stream's key (x-chave: the Σ key, which only OBS and the stream PC hold). */
export const daLive = (event, chave = process.env.CHAVE) => igual(event.headers?.["x-chave"], chave)
