import { readFileSync } from "node:fs"
import { join } from "node:path"
import vm from "node:vm"

/**
 * Σ's rules as public/stream/sigma.js has them (the stand's, the profile's and the chat bot's, the one source), read at
 * build time for /canal/sigma: Rocket League's tiers with where each starts, where Valorant's Gold 1 starts and where
 * free colours unlock. sigma.js is a browser script, so it runs in a context of its own, as infra/sigma/texto.mjs
 * runs it.
 */
type Ladder = [number, string][]
interface SigmaScript {
  RL: Ladder
  VALORANT: Ladder
  COR_LIVRE: number
  ranque: (sigma: number, lingua?: string) => { id: string; nome: string; emblema: string }
}

export interface SigmaTier {
  id: string
  name: string
  from: number
  emblem: string
}

export function sigmaRules() {
  const context = { window: {} as { Sigma?: SigmaScript } }
  vm.runInNewContext(readFileSync(join(process.cwd(), "public", "stream", "sigma.js"), "utf8"), context)
  const S = context.window.Sigma
  if (!S) throw new Error("public/stream/sigma.js didn't set window.Sigma")
  // A tier is where its first division starts ("gold-1"), or a rank with no divisions (the top).
  const tiers: SigmaTier[] = S.RL.filter(([, id]) => !/-[23]$/.test(id)).map(([from, id]) => {
    const rank = S.ranque(from, "pt")
    return { id, name: rank.nome.replace(/ I$/, ""), from, emblem: rank.emblema }
  })
  const valorantGold = S.VALORANT.find(([, id]) => id === "gold-1")?.[0] ?? null
  return { tiers, valorantGold, freeColours: S.COR_LIVRE, freeColoursRank: S.ranque(S.COR_LIVRE, "pt").nome }
}
