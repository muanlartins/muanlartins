import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Line, Live } from "@/lib/lives"

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
