import { FICHAS, type Ficha } from "@/content/valorant-universo/fichas"
import jogo from "@/content/valorant-universo/jogo.json"
import { gamePath } from "@/lib/game"

/**
 * Universo Valorant (Luan, 2026-11-23: "a nossa própria bibliografia dos jogos baseada nas nossas pesquisas", the
 * base of the channel's shorts and videos on Valorant's world): at /conteudo/valorant/universo, every agent with what
 * the game says (content/valorant-universo/jogo.json, scripts/valorant_universo.py) and what the research found
 * (fichas.ts); an agent with a story file (components/site/valorant/universo/agentes/) has a page of its own at
 * /universo/<id>, with every one of its voice lines in both languages (falas/<id>.json, scripts/valorant_falas.py).
 * The bibliography is /universo/referencias (fontes.ts).
 */

export const UNIVERSO = "universo"
export const REFERENCIAS = "referencias"

export const universoPath = (slug?: string) => `${gamePath({ id: "valorant" }, "universo")}${slug ? `/${slug}` : ""}`

type Jogo = (typeof jogo.agentes)[number]

export interface Agente extends Ficha {
  codinome: string
  funcao: { pt: string; en: string }
  bio: { pt: string; en: string }
  habilidades: Jogo["habilidades"]
  /** Its head (lists) and portrait in public/valorant/agentes/. */
  cabeca: string
  retrato: string
}

/** Every agent, in the order of their numbers (the Protocol's: there's no 8). */
export function agentes(): Agente[] {
  return FICHAS.map((ficha) => {
    const game = jogo.agentes.find((each) => each.id === ficha.id)
    if (!game) throw new Error(`content/valorant-universo/fichas.ts: "${ficha.id}" isn't in jogo.json; run scripts/valorant_universo.py.`)
    return { ...ficha, ...game, nome: ficha.nome, cabeca: `/valorant/agentes/${ficha.id}.webp`, retrato: `/valorant/agentes/${ficha.id}-retrato.webp` }
  }).sort((a, b) => a.numero - b.numero)
}

export const agente = (id: string) => agentes().find((each) => each.id === id)

/** An agent's name by the id the voice lines use ("kayo"), or a map's ("mapa:Pearl" → Pearl). */
export function nomeDe(id: string) {
  if (id.startsWith("mapa:")) return id.slice(5)
  return agente(id)?.nome ?? id
}

/** "da Raze", "do Breach", "de Clove". */
export const daAgente = (agent: Pick<Ficha, "artigo" | "nome">) => `d${agent.artigo || "e"} ${agent.nome}`

/** "dela", "dele", or the name when it goes without an article ("de Clove"). */
export const delaDele = (agent: Pick<Ficha, "artigo" | "nome">) => (agent.artigo === "a" ? "dela" : agent.artigo === "o" ? "dele" : `de ${agent.nome}`)

export const mapas = () => jogo.mapas

/** The game's text with its markup taken out (an ability's <whitebold>…</>, line breaks as spaces). */
export const textoDoJogo = (text: string) => text.replace(/<[^>]*>/g, "").replace(/\s*\r?\n\s*/g, " ").trim()
