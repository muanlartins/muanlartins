import { FUNDAMENTALS, type Fundamental } from "@/content/celeste"
import { BUILT, SOURCES, STUDY, type Kind, type Ref } from "@/content/celeste-fontes"
import { diversosPath } from "@/lib/diversos"

/** Celeste's bibliography and what he studies each fundamental by (content/celeste-fontes.ts). */

export const REFERENCES = "referencias"

export const referencesPath = () => `${diversosPath({ id: "celeste" })}/${REFERENCES}`

/** A reference's address: its source's, at that second or that part of the page. */
export function hrefOf(ref: Ref) {
  const { href } = SOURCES[ref.source]
  if (ref.anchor !== undefined) return `${href.split("#")[0]}#${ref.anchor}`
  if (!ref.at) return href
  return `${href}${href.includes("?") ? "&" : "?"}t=${ref.at}s`
}

/** A fundamental's references of each kind that it has, in the order he'd use them. */
export function studyOf(topic: Fundamental) {
  const refs = STUDY[topic.id] ?? []
  return (["read", "watch", "practice"] as Kind[])
    .map((kind) => ({ kind, refs: refs.filter((ref) => ref.kind === kind) }))
    .filter((group) => group.refs.length > 0)
}

/** The fundamentals a source is studied for. */
export const studiedWith = (source: string) => FUNDAMENTALS.filter((topic) => STUDY[topic.id]?.some((ref) => ref.source === source))

/** The build refuses a bibliography that can't be right. */
export function checkReferences() {
  const fail = (what: string) => {
    throw new Error(`content/celeste-fontes.ts: ${what}`)
  }
  const seen = new Set<string>()
  for (const topic of FUNDAMENTALS) {
    if (topic.id === REFERENCES) fail(`a fundamental can't be called "${REFERENCES}".`)
    if (!STUDY[topic.id]?.length) fail(`"${topic.id}" has nothing to study it by.`)
  }
  for (const [id, refs] of Object.entries(STUDY)) {
    if (!FUNDAMENTALS.some((topic) => topic.id === id)) fail(`no fundamental "${id}".`)
    for (const ref of refs) {
      if (!SOURCES[ref.source]) fail(`"${id}" names no source "${ref.source}".`)
      seen.add(ref.source)
    }
  }
  for (const { source } of BUILT) {
    if (!SOURCES[source]) fail(`what built it names no source "${source}".`)
    seen.add(source)
  }
  const stray = Object.keys(SOURCES).find((id) => !seen.has(id))
  if (stray) fail(`"${stray}" is used nowhere.`)
}
