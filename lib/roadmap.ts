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
  /** The URL: /conteudo/<id>. */
  id: string
  title: L10n
  /** The paragraph under the title; also the summary on the content page. */
  description: L10n
  /** The one language its videos and texts are recorded in; the other site warns about it. */
  language: Locale
  /** The introduction video, in that language. Empty shows "coming soon". */
  video: string
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

export function roadmapPath(roadmap: Roadmap, topic?: Topic) {
  return `${sectionPath("content")}/${roadmap.id}${topic ? `/${topic.id}` : ""}`
}
