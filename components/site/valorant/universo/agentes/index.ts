import type { Historia } from "@/components/site/valorant/universo/agentes/historia"
import { raze } from "@/components/site/valorant/universo/agentes/raze"

/** The agents with a page of their own, by id: a new page is its file here and one line. */
export const HISTORIAS: Record<string, Historia> = { raze }

export const temPagina = (id: string) => id in HISTORIAS
