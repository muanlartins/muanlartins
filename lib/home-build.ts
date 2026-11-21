import { PROFILE_API, SIGMA_API, type Choice } from "@/lib/profile"
import { hasSection } from "@/lib/site"

/** One of the audience's top three: their login, their Σ and the fan they built (null: the one their login gives). */
export interface TopFan {
  login: string
  sigma: number
  fan: Choice | null
}

let pending: Promise<TopFan[]> | undefined

/**
 * The three with the most Σ, the mural's podium, as the APIs have them while the site builds (the home doesn't ask
 * again in the browser: the podium moves slowly, and every release brings it up to date). Asked once per build; empty
 * on the English site or when the Σ API can't be reached, and the home then draws the podium without anyone on it.
 */
export function topFans(): Promise<TopFan[]> {
  if (!hasSection("channel")) return Promise.resolve([])
  pending ??= (async () => {
    try {
      const response = await fetch(`${SIGMA_API}/audiencia`, { signal: AbortSignal.timeout(10_000) })
      if (!response.ok) throw new Error(String(response.status))
      const { pessoas } = (await response.json()) as { pessoas: { login: string; sigma?: number; minutos?: number }[] }
      // The mural's order: most Σ, then most minutes, then the login.
      const top = pessoas
        .map((p) => ({ login: p.login, sigma: p.sigma ?? 0, minutos: p.minutos ?? 0 }))
        .sort((a, b) => b.sigma - a.sigma || b.minutos - a.minutos || a.login.localeCompare(b.login))
        .slice(0, 3)
      let fans: Record<string, Choice> = {}
      try {
        const saved = await fetch(`${PROFILE_API}/torcedores?logins=${top.map((p) => encodeURIComponent(p.login)).join(",")}`, { signal: AbortSignal.timeout(10_000) })
        if (saved.ok) fans = await saved.json()
      } catch {
        // Without the profile API, each still gets the fan their login gives them.
      }
      return top.map(({ login, sigma }) => ({ login, sigma, fan: fans[login] ?? null }))
    } catch (error) {
      console.warn(`The audience (${SIGMA_API}/audiencia) couldn't be read while building: ${error}. The home's podium stays empty.`)
      return []
    }
  })()
  return pending
}
