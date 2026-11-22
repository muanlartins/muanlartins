import recortes from "@/content/celeste-recortes.json"
import saveData from "@/content/celeste-save.json"
import { CHAPTERS, FUNDAMENTALS, STAGES, type Fundamental, type Stage, type Step } from "@/content/celeste"
import { diversosPath } from "@/lib/diversos"
import { seconds, type Live } from "@/lib/lives"

/**
 * Celeste's roadmap (content/celeste.ts) against his save (content/celeste-save.json, scripts/celeste.py) and the
 * lives' cuts (content/celeste-recortes.json). Server only for the files; the pure helpers the browser needs are in
 * lib/celeste-view.ts.
 */

export const CELESTE = "celeste"

/** A fact of the save: the day it turned true and that day's live. */
export interface Fact {
  date?: string
  live?: string
}

export interface Save {
  slot: number
  start: string
  read: string | null
  assist: boolean
  variants: boolean
  seen: number[]
  totals: { deaths: number; seconds: number; dashes: number; strawberries: number; red: number; golden: number; hearts: number; cassettes: number } | null
  achievements: string[]
  sides: Record<string, { deaths: number; seconds: number; red: number } | undefined>
  done: Record<string, Fact | undefined>
  history: { date: string; deaths: number; seconds: number; strawberries: number }[]
}

export const save = saveData as unknown as Save

/**
 * A cut of a live in a fundamental: a stretch of that live's video (`live`, `from` and `to` in its time, "1:02:22"),
 * or a video of its own (`video`, with its `date`). `learned` marks the one where it first came out right.
 */
export interface Cut {
  topic: string
  title: string
  live?: string
  from?: string
  to?: string
  video?: string
  date?: string
  learned?: boolean
}

export const cuts = recortes as Cut[]

/** A fundamental's cuts ready to play, oldest first. A live held back (lib/lives-files.ts) holds its cuts back too. */
export function cutsOf(topic: Fundamental, lives: Live[]) {
  return cuts
    .filter((cut) => cut.topic === topic.id)
    .flatMap((cut) => {
      const live = cut.live ? lives.find((each) => each.date === cut.live) : undefined
      const video = cut.video ?? live?.video
      if (!video) return []
      return [{
        title: cut.title,
        video,
        date: cut.date ?? cut.live,
        live: live?.date,
        learned: !!cut.learned,
        from: cut.from ? seconds(cut.from) : 0,
        to: cut.to ? seconds(cut.to) : undefined,
      }]
    })
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.from - b.from)
}

export type Learning = "ahead" | "learning" | "learned"

/** Learned only with the cut that says so (finishing a side doesn't prove it); learning once a cut or that side began. His own mark goes over it (learning-hand.tsx). */
export function learningOf(topic: Fundamental): Learning {
  const own = cuts.filter((cut) => cut.topic === topic.id)
  const key = topic.taught && `${topic.taught.area}/${topic.taught.side}`
  if (own.some((cut) => cut.learned)) return "learned"
  return own.length || (key && (save.sides[key] || save.done[key])) ? "learning" : "ahead"
}

export const celestePath = (topic?: { id: string }) => `${diversosPath({ id: CELESTE })}${topic ? `/${topic.id}` : ""}`

export const findFundamental = (id: string | undefined) => FUNDAMENTALS.find((topic) => topic.id === id)

/** The build refuses a roadmap that can't be right. */
export function checkCeleste() {
  const keys = STAGES.flatMap((stage: Stage) => stage.steps.map((step: Step) => step.key))
  const twice = keys.find((key, index) => keys.indexOf(key) !== index)
  if (twice) throw new Error(`content/celeste.ts: the step "${twice}" is there twice.`)
  for (const stage of STAGES) {
    const stray = stage.steps.find((step) => !CHAPTERS.some((chapter) => chapter.id === step.area))
    if (stray) throw new Error(`content/celeste.ts: the step "${stray.key}" has no chapter ${stray.area}.`)
  }
  const ids = FUNDAMENTALS.map((topic) => topic.id)
  for (const topic of FUNDAMENTALS) {
    if (!STAGES.some((stage) => stage.id === topic.stage)) throw new Error(`content/celeste.ts: "${topic.id}" is in no stage.`)
    if (ids.indexOf(topic.id) !== ids.lastIndexOf(topic.id)) throw new Error(`content/celeste.ts: "${topic.id}" is there twice.`)
  }
  for (const cut of cuts) {
    if (!ids.includes(cut.topic)) throw new Error(`content/celeste-recortes.json: no fundamental "${cut.topic}".`)
    if (!cut.video && !(cut.live && cut.from)) throw new Error(`content/celeste-recortes.json: "${cut.title}" needs a video, or a live and from.`)
  }
}
