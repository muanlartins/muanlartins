import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { MiraDay, MiraRankedDay } from "@/lib/mira"
import type { Session } from "@/lib/ranked"
import type { ValorantSession } from "@/lib/valorant"
import type { VoltaicDay } from "@/lib/voltaic"

/**
 * Every published session (content/matches/*.json), oldest first. Read at build time. Each session's
 * match logs (<id>.events.json) are for editing the lives, not the site.
 *
 * A match is counted once: with OBS open off the stream, the Partidas dock and scripts/rocket_league.py both record
 * it (11-20: two 1v1 matches in two sessions). The first session keeps it, taking the points it lacks from the copy.
 */
export function sessions(): Session[] {
  const folder = join(process.cwd(), "content", "matches")
  const seen = new Map<string, Session["matches"][number]>()
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json") && !file.endsWith(".events.json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as Session)
    .map((session) => ({
      ...session,
      matches: session.matches.filter((match) => {
        const first = seen.get(match.id)
        if (!first) {
          seen.set(match.id, match)
          return true
        }
        first.points ??= match.points
        first.mmr ??= match.mmr
        return false
      }),
    }))
}

/**
 * Every published Valorant session (content/valorant/*.json), oldest first; none before the first. A match is counted
 * once, in the first session that has it: the dock can publish again a match valorant.py already published off the
 * stream (11-24 brought back 11-21's Summit match as a session of its own).
 */
export function valorantSessions(): ValorantSession[] {
  const folder = join(process.cwd(), "content", "valorant")
  if (!existsSync(folder)) return []
  const seen = new Set<string>()
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as ValorantSession)
    .map((session) => ({
      ...session,
      matches: session.matches.filter((match) => {
        if (seen.has(match.id)) return false
        seen.add(match.id)
        return true
      }),
    }))
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

/** Every day of Luan's flicks analysed (content/mira/<date>.json, from scripts/mira.py), oldest first; none before the first. */
export function miraDays(): MiraDay[] {
  const folder = join(process.cwd(), "content", "mira")
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as MiraDay)
}

/** Every day of Valorant matches whose aim was measured (content/mira-ranked/<date>.json, from scripts/mira_ranked.py). */
export function miraRankedDays(): MiraRankedDay[] {
  const folder = join(process.cwd(), "content", "mira-ranked")
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(folder, file), "utf8")) as MiraRankedDay)
}
