// The chat bot's !sigma (the Σ API's GET /sigma.txt, which StreamElements' customapi shows as it comes): one line with
// a viewer's Σ, their rank in the channel's own ranks (Rocket League's, as the site and the Diversos stand show them),
// how far the next one is, and their lives. The ranks are public/stream/sigma.js itself, the stand's and the site's,
// linked here as ./sigma.js and copied into the zip by CI (cp -rL), run in a context of its own since it's a
// browser script.

import { readFileSync } from "node:fs"
import vm from "node:vm"

const contexto = { window: {} }
vm.runInNewContext(readFileSync(new URL("./sigma.js", import.meta.url), "utf8"), contexto)
export const Sigma = contexto.window.Sigma

const numero = (n) => n.toLocaleString("pt-BR")

/**
 * The line for `nome`, with their public numbers from the Σ API (sigma, lives, sequencia: the run of lives in a row
 * now), or none for someone who has never watched a live.
 */
export function textoSigma(nome, dados) {
  if (!dados?.lives) return `${nome} ainda não tem Σ. Quem fica no chat com a live no ar ganha 1 Σ por minuto, e mais 10 por live.`
  const { sigma = 0, lives, sequencia = 0 } = dados
  const r = Sigma.ranque(sigma)
  const proximo = r.proximo ? ` (faltam ${numero(r.ate - sigma)} pra ${r.proximo})` : ""
  const seguidas = sequencia >= 2 ? `, ${sequencia} seguidas` : ""
  return `${nome}: ${numero(sigma)} Σ · ${r.nome}${proximo} · ${numero(lives)} ${lives === 1 ? "live" : "lives"}${seguidas}`
}
