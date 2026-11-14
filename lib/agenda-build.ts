import { AGENDA_URL, type Agenda } from "@/lib/agenda"
import { hasSection } from "@/lib/site"

let pending: Promise<Agenda | null> | undefined

/**
 * The agenda as the profile API has it while the site builds: what each page shows before the browser asks again.
 * Fetched once per build; null on the English site (it has no channel) or when the API can't be reached, and the
 * pages then wait for the browser's answer.
 */
export function buildAgenda(): Promise<Agenda | null> {
  if (!hasSection("channel")) return Promise.resolve(null)
  pending ??= fetch(AGENDA_URL, { signal: AbortSignal.timeout(10_000) })
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => (body?.agenda as Agenda) ?? null)
    .catch((error) => {
      console.warn(`The agenda (${AGENDA_URL}) couldn't be read while building: ${error}. Pages will load it in the browser.`)
      return null
    })
  return pending
}
