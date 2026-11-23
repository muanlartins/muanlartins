import { cidadeAbandonada } from "@/components/site/celeste/historia/cidade-abandonada"
import { oJogo } from "@/components/site/celeste/historia/o-jogo"
import { prologo } from "@/components/site/celeste/historia/prologo"
import { resortCelestial } from "@/components/site/celeste/historia/resort-celestial"
import type { Story } from "@/components/site/celeste/historia/story"
import { terrenoAntigo } from "@/components/site/celeste/historia/terreno-antigo"
import { save } from "@/lib/celeste"

/** A page of the story at /conteudo/diversos/celeste/<slug>: the game's, or a chapter's (`area`, its id in the save). */
export interface StoryPage {
  slug: string
  area?: number
  title: string
  story: () => Story
}

export const GAME_STORY: StoryPage = { slug: "o-jogo", title: "Como Celeste foi feito", story: oJogo }

/** Each chapter with a page, in the game's order. A page is built only once his save has finished its A-side. */
const CHAPTERS: StoryPage[] = [
  { slug: "prologo", area: 0, title: "Prólogo", story: prologo },
  { slug: "cidade-abandonada", area: 1, title: "Cidade Abandonada", story: cidadeAbandonada },
  { slug: "terreno-antigo", area: 2, title: "Terreno Antigo", story: terrenoAntigo },
  { slug: "resort-celestial", area: 3, title: "Resort Celestial", story: resortCelestial },
]

/** The chapters he has finished, so the ones with a page now. */
export const chapterStories = () => CHAPTERS.filter((page) => page.area !== undefined && save.done[`${page.area}/A`])

/** Every page of the story the site builds: the game's first, then the chapters'. */
export const storyPages = () => [GAME_STORY, ...chapterStories()]

export const findStory = (slug: string | undefined) => storyPages().find((page) => page.slug === slug)
