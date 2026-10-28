import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Session } from "@/lib/ranked"

/** Every published session (content/matches/*.json), oldest first. Read at build time. */
export function sessions(): Session[] {
  const folder = join(process.cwd(), "content", "matches")
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as Session)
}
