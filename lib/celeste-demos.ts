import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { demoFile, type Demo, type Footage } from "@/lib/celeste-demo"

/** Server only: what was filmed for a demonstration, read at build. The build refuses one that doesn't match. */
export function footageOf(demo: Demo): Footage {
  const footage: Footage = JSON.parse(readFileSync(join(process.cwd(), "public", demoFile(demo.id, "dados.json")), "utf8"))
  const frames = footage.to - footage.from + 1
  for (const take of demo.takes) {
    const filmed = footage.takes[take.id]
    if (filmed?.feet.length !== frames) throw new Error(`${demo.id}: no footage of the take "${take.id}" (scripts/celeste-tas/monta.py).`)
    if (take.rival && !demo.takes.some((each) => each.id === take.rival)) throw new Error(`${demo.id}: no take "${take.rival}" to run beside "${take.id}".`)
  }
  const inside = (at: number) => at + demo.zero >= footage.from && at + demo.zero <= footage.to
  if (!demo.takes.some((each) => each.id === demo.cover.take) || !inside(demo.cover.at)) throw new Error(`${demo.id}: its cover isn't in the footage.`)
  return footage
}

/**
 * A picture of someone else's (public/celeste/terceiros/, out of git until Luan decides on each): its address when
 * this build has it, else nothing, and the page goes without it.
 */
export function outsidePicture(name: string) {
  const path = `/celeste/terceiros/${name}`
  return existsSync(join(process.cwd(), "public", path)) ? path : undefined
}

/**
 * A picture of the game filmed for a page of the story (components/site/celeste/historia), in
 * `public/celeste/historia/<chapter>/<name>`, when the build has it: filmed with the TAS like the demonstrations, from
 * a chapter he has finished.
 */
export function storyPicture(chapter: string, name: string) {
  const path = `/celeste/historia/${chapter}/${name}`
  return existsSync(join(process.cwd(), "public", path)) ? path : undefined
}
