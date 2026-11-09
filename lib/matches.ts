import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Session } from "@/lib/ranked"
import type { ValorantSession } from "@/lib/valorant"
import type { VoltaicDay } from "@/lib/voltaic"

/**
 * Every published session (content/matches/*.json), oldest first. Read at build time. Each session's
 * match logs (<id>.events.json) are for editing the lives, not the site.
 */
export function sessions(): Session[] {
  const folder = join(process.cwd(), "content", "matches")
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json") && !file.endsWith(".events.json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as Session)
}

/** Every published Valorant session (content/valorant/*.json), oldest first; none before the first. */
export function valorantSessions(): ValorantSession[] {
  const folder = join(process.cwd(), "content", "valorant")
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as ValorantSession)
}

/** Every day of Luan's aim training (content/voltaic/<date>.json, from scripts/voltaic.py), oldest first; none before the first. */
export function voltaicDays(): VoltaicDay[] {
  const folder = join(process.cwd(), "content", "voltaic")
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as VoltaicDay)
}
