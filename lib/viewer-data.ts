import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PEOPLE, SHIPPED, UPCOMING, type Credit } from "@/content/changelog"
import { dayOf } from "@/lib/ranked"
import { matchMoments } from "@/lib/lives"
import { lives } from "@/lib/lives-files"
import { sessions, valorantSessions } from "@/lib/matches"
import { SIGMA_API } from "@/lib/profile"
import { hasSection } from "@/lib/site"
import type { Idea, PlayedMatch, ViewerData } from "@/lib/viewer"

/**
 * What the site knows about each viewer when it's built, for their page (/torcedor/<login>): their ideas on the roadmap
 * (content/changelog.ts's credits, by the Twitch login in PEOPLE) and the matches they played with Luan (the ranked
 * sessions' teammates tagged with a login). Served as /torcedor/dados.json, so a page drawn in the browser for a login
 * the build didn't know reads the same.
 */
export function viewerData(): ViewerData {
  const ideias: Record<string, Idea[]> = {}
  const add = (credit: Credit | undefined, idea: Omit<Idea, "as" | "about">) => {
    const login = credit && (PEOPLE[credit.by] as { login?: string }).login
    if (!credit || !login) return
    ;(ideias[login] ??= []).push({ ...idea, as: credit.as ?? "idea", ...(credit.about ? { about: credit.about } : {}) })
  }
  for (const item of UPCOMING) add(item.credit, { id: item.id, title: item.title, shipped: false })
  for (const entry of SHIPPED) add(entry.credit, { id: entry.id, title: entry.title, shipped: true, date: entry.date })

  const moments = matchMoments(lives())
  const partidas: Record<string, PlayedMatch[]> = {}
  for (const session of sessions()) {
    for (const match of session.matches) {
      for (const mate of match.mates ?? []) {
        if (!mate.login) continue
        ;(partidas[mate.login] ??= []).push({
          game: "rocket-league",
          id: match.id,
          date: dayOf(match.at),
          result: match.result,
          ...(match.score ? { score: match.score } : {}),
          label: match.mode,
          ...(moments[match.id] ? { live: moments[match.id] } : {}),
        })
      }
    }
  }
  for (const session of valorantSessions()) {
    for (const match of session.matches) {
      for (const mate of match.mates ?? []) {
        if (!mate.login) continue
        ;(partidas[mate.login] ??= []).push({
          game: "valorant",
          id: match.id,
          date: dayOf(match.at),
          result: match.result,
          score: match.score,
          label: match.map,
          ...(moments[match.id] ? { live: moments[match.id] } : {}),
        })
      }
    }
  }
  // Newest first.
  for (const list of Object.values(partidas)) list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return { ideias, partidas }
}

let pending: Promise<string[]> | undefined

/**
 * The logins whose page is built: everyone who has watched a live (the Σ API's audience, asked once per build), whoever
 * has an idea on the roadmap and the viewers who played with Luan. Anyone else's page is drawn by the 404 page.
 */
export function viewerLogins(): Promise<string[]> {
  if (!hasSection("channel")) return Promise.resolve([])
  pending ??= (async () => {
    const known = new Set<string>()
    for (const person of Object.values(PEOPLE) as { login?: string }[]) if (person.login) known.add(person.login)
    const allies = JSON.parse(readFileSync(join(process.cwd(), "public", "stream", "aliados.json"), "utf8")) as { aliados: { login: string }[] }
    for (const ally of allies.aliados) known.add(ally.login.toLowerCase())
    for (const login of Object.keys(viewerData().partidas)) known.add(login)
    try {
      const response = await fetch(`${SIGMA_API}/audiencia`, { signal: AbortSignal.timeout(10_000) })
      if (response.ok) for (const p of ((await response.json()) as { pessoas: { login: string }[] }).pessoas) known.add(p.login)
    } catch (error) {
      console.warn(`The audience (${SIGMA_API}/audiencia) couldn't be read while building: ${error}. Their pages will be drawn in the browser.`)
    }
    return [...known].filter((login) => /^[a-z0-9_]{1,25}$/.test(login)).sort()
  })()
  return pending
}
