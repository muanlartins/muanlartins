import { CHAPTERS, STAGES, type Side, type Stage, type Step } from "@/content/celeste"
import type { Save } from "@/lib/celeste"

/** What the roadmap shows of the save, for the server and the browser alike (no files read here). */

export const TOTAL_STEPS = STAGES.reduce((sum, stage) => sum + stage.steps.length, 0)

export const doneIn = (stage: Stage, save: Save) => stage.steps.filter((step) => save.done[step.key]).length

export const fillsOf = (save: Save) => STAGES.map((stage) => doneIn(stage, save) / stage.steps.length)

/** Where he is: the first step not done, in the roadmap's order. */
export function nextStep(save: Save): { stage: Stage; step: Step } | undefined {
  for (const stage of STAGES) {
    const step = stage.steps.find((each) => !save.done[each.key])
    if (step) return { stage, step }
  }
}

/** "7 · O Cume": a chapter by its number and name, which always shows (it's no spoiler). */
export function chapterName(area: number) {
  const chapter = CHAPTERS.find((each) => each.id === area)!
  return chapter.number ? `${chapter.number} · ${chapter.name}` : chapter.name
}

/** "7 · O Cume, lado B": where something is. The Prologue, the Epilogue and chapter 9 have one side. */
export function placeOf(area: number, side: Side) {
  const chapter = CHAPTERS.find((each) => each.id === area)!
  return !chapter.number || area === 10 ? chapterName(area) : `${chapterName(area)}, lado ${side}`
}

export function stepText(step: Step, save: Save, spoilers: boolean) {
  if (step.secret && !spoilers && !save.done[step.key]) return step.secret
  if (!step.red || save.done[step.key]) return step.text
  const got = save.sides[`${step.area}/A`]?.red ?? 0
  return got ? `${got}/${step.red} morangos` : step.text
}
