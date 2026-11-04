import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Line, Live } from "@/lib/lives"

const FOLDER = join(process.cwd(), "content", "lives")

/** Every live, newest first. Read at build time. */
export function lives(): Live[] {
  return readdirSync(FOLDER)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .reverse()
    .map((file) => JSON.parse(readFileSync(join(FOLDER, file), "utf8")) as Live)
}

export function transcript(date: string): Line[] {
  try {
    return JSON.parse(readFileSync(join(FOLDER, `${date}.transcript.json`), "utf8")) as Line[]
  } catch {
    return []
  }
}
