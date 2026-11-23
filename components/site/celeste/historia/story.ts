import type { ReactNode } from "react"

/**
 * A page of Celeste's story (Luan, 2026-11-23: "os criadores, a história a fundo, o processo de criação, segredos",
 * the base of the channel's later videos and shorts): a chapter's, which exists once his save has finished it, or the
 * game's, which spoils nothing past the premise. Its sections in order; one that names `needs` (a fact of the save,
 * content/celeste.ts) shows only once he has it, as a heart's or a cassette's do. Every claim was checked in the game
 * or in a source opened (the research is in ~/.local/share/muanlartins/celeste-lore/, out of the repository since
 * it holds later chapters' spoilers).
 */
export interface StorySection {
  id: string
  title: string
  description?: ReactNode
  needs?: string
  body: ReactNode
}

export interface Story {
  /** What the page is about, in a line, under the title. */
  lede: string
  /** The page's facts on the strip under it; a chapter's are his numbers there, from the save. */
  meta?: { label: string; value: ReactNode }[]
  sections: StorySection[]
}
