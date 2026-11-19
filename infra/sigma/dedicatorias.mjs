// The goals (in Valorant, the wins) the stand dedicated to someone, kept on their item (dedicatorias) for their page
// on the site (/torcedor/<login>): torcida.html sends each one while the stream is on, with the key (POST
// /dedicatoria), and GET /pessoa?login=a gives them back with the rest of what's public about them. Kept since
// 2026-11-17; before that, a dedication lived only in that day's end credits.

import { LOGIN } from "./comum/http.mjs"

// Their latest, newest first: enough for a page, small next to the item's 400 KB.
export const DEDICATORIAS_MAX = 60
const TIPOS = ["gol", "vitoria"]
const JOGO = /^[a-z-]{2,24}$/

/** A dedication as torcida.html sends it, checked; null when it isn't one. `id` is when it happened (ms), as the stand has it. */
export function dedicatoria(d, agora = Date.now()) {
  if (!d || typeof d !== "object") return null
  const login = String(d.login ?? "").toLowerCase()
  const id = Number(d.id)
  // Within a day of now: a stand's clock, not anyone's guess.
  if (!LOGIN.test(login) || !TIPOS.includes(d.tipo) || !Number.isInteger(id) || Math.abs(agora - id) > 86_400_000) return null
  const detalhe = d.detalhe == null ? null : [...String(d.detalhe).replace(/\s+/g, " ").trim()].slice(0, 40).join("") || null
  const jogo = typeof d.jogo === "string" && JOGO.test(d.jogo) ? d.jogo : null
  return { id, login, tipo: d.tipo, detalhe, jogo, em: new Date(id).toISOString() }
}

/** Their list with `d` on top, once (a second copy of the same moment changes nothing). */
export function anotarDedicatoria(lista, d) {
  const antes = Array.isArray(lista) ? lista : []
  if (antes.some((x) => x.id === d.id)) return null
  // The login is the item's key already.
  const guardada = { id: d.id, tipo: d.tipo, detalhe: d.detalhe, jogo: d.jogo, em: d.em }
  return [guardada, ...antes].slice(0, DEDICATORIAS_MAX)
}
