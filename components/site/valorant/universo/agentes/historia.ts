import type { ReactNode } from "react"
import type { Fala } from "@/lib/valorant-falas"
import type { Agente } from "@/lib/valorant-universo"

/**
 * An agent's page in Universo Valorant: its sections in order, each a title, an optional line and its body (prose and
 * the shared blocks: Bio, Habilidades, Vozes, Linhas, Conversas, the catalogue), and the sources it leans on, by
 * their ids in content/valorant-universo/fontes.ts. Every claim was checked in the game's files or in a source opened;
 * each reading of what something means carries its seal (lore's `Reading`: in the game, said by its makers, the
 * fans', or mine).
 */
export interface Secao {
  id: string
  title: string
  description?: ReactNode
  body: ReactNode
}

export interface HistoriaAgente {
  /** What the page is about, in a line, under the title. */
  lede: string
  sections: Secao[]
  fontes: string[]
}

export type Historia = (contexto: { agente: Agente; falas: Fala[] }) => HistoriaAgente
