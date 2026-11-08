import { localize, sectionPath, type L10n, type Locale } from "@/lib/site"

/**
 * The shape of a roadmap's content file (content/rocket-league.ts). Topics
 * are written where they belong in the game (pillar → concept); the roadmap
 * page reorders them by the rank they belong to.
 */

export interface Paint {
  color: string
  /** Metallic, as the ranks are; off for a plain primer. Default on. */
  metal?: boolean
}

export interface Rank {
  id: string
  name: L10n
  /** The emblem's colour. */
  color: string
  /** The rank's emblem for each division, lowest first: finishing more of its topics shows the next one. */
  icons?: string[]
  /** The car's finish while the rank is read, when the emblem's colour won't do: real silver is lighter than a legible one. */
  paint?: Paint
  /** A line under the rank's name: what changes here. */
  summary?: L10n
}

/** Where a tip came from: a video, a guide, a pro's stream. "Como estou aprendendo" credits each one. */
export interface Source {
  title: string
  /** Who made it: a channel, a site, a player. */
  author?: string
  href: string
}

export interface Topic {
  /** The topic's URL and its saved progress. Rename the title freely; never the id. */
  id: string
  /** The rank where not knowing this starts costing games. */
  rank: string
  title: L10n
  /** The YouTube video, in the roadmap's language: the id in youtube.com/watch?v=<id>. Missing shows "coming soon". */
  video?: string
  /** The written version under the video, in the roadmap's language. A blank line starts a new paragraph. */
  text?: string
  /** The best sources found for it, credited under the text. */
  sources?: Source[]
}

/** One idea, taught a level deeper at each rank: boost, rotation, recovery… */
export interface Concept {
  id: string
  name: L10n
  topics: Topic[]
}

/** The broadest split: how to do it (mechanics), when and where to (strategy). */
export interface Pillar {
  id: string
  name: L10n
  concepts: Concept[]
}

export interface Roadmap {
  /** Where the visitor's progress is saved (lib/progress.ts). Never change it: a new edition takes a new one. */
  id: string
  /** Its game's id (lib/game.ts), which holds it at /conteudo/<game>/fundamentals. */
  game: string
  /**
   * Its edition, from 1. A game can redo its fundamentals: the newest edition is at /fundamentals, the older
   * ones at /fundamentals/v<edition>, and every edition's topics stay at /conteudo/<game>/<topic>.
   */
  edition?: number
  title: L10n
  /** The paragraph under the title; also the summary on the content page. */
  description: L10n
  /** The one language its videos and texts are recorded in; the other site warns about it. */
  language: Locale
  /** The introduction video, in that language. Empty shows "coming soon". */
  video: string
  /** Apps that go with it, shown under the introduction. */
  tools?: { name: L10n; summary: L10n; href: string }[]
  /** Lowest first. Only ranks with topics show. */
  ranks: Rank[]
  pillars: Pillar[]
}

export function roadmap(page: Roadmap) {
  return page
}

export interface Entry {
  topic: Topic
  concept: Concept
  pillar: Pillar
  rank: Rank
}

/** Every topic in reading order: by rank, then as written. */
export function entries(roadmap: Roadmap): Entry[] {
  return roadmap.pillars
    .flatMap((pillar) =>
      pillar.concepts.flatMap((concept) =>
        concept.topics.map((topic) => {
          const rank = roadmap.ranks.find((rank) => rank.id === topic.rank)
          if (!rank) throw new Error(`Topic "${topic.id}" has rank "${topic.rank}", which isn't in ranks.`)
          return { topic, concept, pillar, rank }
        }),
      ),
    )
    .sort((a, b) => roadmap.ranks.indexOf(a.rank) - roadmap.ranks.indexOf(b.rank))
}

/** Every rank, lowest first, with its topics — empty for ranks not written yet. */
export function ranksOf(roadmap: Roadmap) {
  const all = entries(roadmap)
  return roadmap.ranks.map((rank) => ({ rank, entries: all.filter((entry) => entry.rank === rank) }))
}

/** A topic with its place in the roadmap and its neighbours in reading order. */
export function findTopic(roadmap: Roadmap, id: string) {
  const all = entries(roadmap)
  const index = all.findIndex((entry) => entry.topic.id === id)
  if (index === -1) return undefined
  const { topic, concept, pillar, rank } = all[index]
  return {
    ...all[index],
    title: localize(topic.title),
    /** "Bronze · Mechanics · Movement" */
    path: [rank.name, pillar.name, concept.name].map((name) => localize(name)).join(" · "),
    previous: all[index - 1],
    next: all[index + 1],
  }
}

/** The URL of an edition other than the newest: /fundamentals/v1. */
export const editionSlug = (roadmap: Roadmap) => `v${roadmap.edition ?? 1}`

/**
 * A roadmap lives in its game (lib/game.ts): the newest edition at /conteudo/<game>/fundamentals, an older one at
 * /fundamentals/v<edition> (`latest` false), each topic at /conteudo/<game>/<topic> whatever its edition.
 */
export function roadmapPath(roadmap: Roadmap, topic?: Topic, latest = true) {
  const game = `${sectionPath("content")}/${roadmap.game}`
  if (topic) return `${game}/${topic.id}`
  return `${game}/fundamentals${latest ? "" : `/${editionSlug(roadmap)}`}`
}
