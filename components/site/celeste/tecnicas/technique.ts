import type { ReactNode } from "react"

/**
 * A technique's page as a catalogue entry (Luan, 2026-11-22: "só um catálogo da técnica, com demonstrações do jogo,
 * curiosidades e conhecimentos externos"): its sections in order, the first one the game filmed. No training plan,
 * no reading list. Each technique is a file here, listed in index.ts; a fundamental without one keeps the plain page.
 */
export interface Technique {
  sections: { id: string; title: string; description?: ReactNode; body: ReactNode }[]
}
