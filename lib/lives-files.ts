import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { seconds, type Line, type Live } from "@/lib/lives"

const FOLDER = join(process.cwd(), "content", "lives")

/** Every live, newest first. Read at build time. A live whose YouTube video is scheduled (youtube.publish_at)
 * stays off the site until a build after that moment: its video would show as private. */
export function lives(): Live[] {
  return readdirSync(FOLDER)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .reverse()
    .map((file) => JSON.parse(readFileSync(join(FOLDER, file), "utf8")) as Live)
    .filter((live) => !live.youtube?.publish_at || Date.parse(live.youtube.publish_at) <= Date.now())
}

export function transcript(date: string): Line[] {
  try {
    return JSON.parse(readFileSync(join(FOLDER, `${date}.transcript.json`), "utf8")) as Line[]
  } catch {
    return []
  }
}

/** How long a live's video is, in seconds: its `length`, or else where its transcript ends (0 without either). */
export function lengthOf(live: Live) {
  if (live.length) return seconds(live.length)
  return transcript(live.date).at(-1)?.[0] ?? 0
}
