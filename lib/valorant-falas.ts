/**
 * An agent's voice lines (content/valorant-universo/falas/<id>.json, from scripts/valorant_falas.py; read at build
 * time by lib/valorant-falas-files.ts). Each line is the game's, in the Brazilian dub and the English original; the audio is
 * /valorant/falas/<agent>/<line>.<pt|en>.m4a (public/ while trying it, the site's bucket once released).
 */

/** When the game plays a line, as the script names it from the line's event. */
export type Quando =
  | "selecao"
  | "conversa"
  | "habilidade"
  | "abate-habilidade"
  | "inicio-partida"
  | "inicio-rodada"
  | "morte"
  | "abate"
  | "jogada"
  | "spike"
  | "vitoria"
  | "comando"
  | "maestria"
  | "outra"

export interface Fala {
  /** The line's file name (the game's name, in lowercase and dashes). */
  id: string
  /** The game's own name for it ("Clay.E02.Kill.Headshot05"). */
  jogo: string
  /** Who says it: an agent's id. */
  quem: string
  quando: Quando
  /** The events that play it: one of each kind is a moment of the game. */
  eventos: string[]
  /** Whom it's about or to: agents' ids, or a map's ("mapa:Pearl"). */
  com?: string[]
  lado?: "aliado" | "inimigo"
  pt: string
  en: string
  segundos: { pt?: number; en?: number }
}

export interface Falas {
  agente: string
  codinome: string
  falas: Fala[]
}

/** A line's audio. */
export const falaSrc = (agent: string, line: string, lang: "pt" | "en") => `/valorant/falas/${agent}/${line}.${lang}.m4a`
