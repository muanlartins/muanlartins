import { planoTwitch } from "@/infra/comum/agenda.mjs"
import type { Agenda } from "@/lib/agenda"
import { TWITCH_CLIENT_ID } from "@/lib/profile"

/**
 * The agenda on Twitch's own calendar, from the editor in Luan's browser with the channel's token (scope
 * `channel:manage:schedule`, the site's Twitch app): `planoTwitch` (infra/comum/agenda.mjs) says what to change and
 * this does it. Twitch's calendar only mirrors the agenda: a change made there is undone by the next save here.
 */

export const SCHEDULE_SCOPE = "channel:manage:schedule"

export class MissingScope extends Error {}

export interface TwitchUser {
  login: string
  id: string
  scopes: string[]
}

/** Who a token is, with its scopes; null when Twitch no longer takes it. */
export async function whoIs(token: string): Promise<TwitchUser | null> {
  const response = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: `OAuth ${token}` } }).catch(() => null)
  if (!response?.ok) return null
  const body = await response.json()
  return { login: body.login, id: body.user_id, scopes: body.scopes ?? [] }
}

async function helix(token: string, method: string, path: string, body?: unknown) {
  const response = await fetch(`https://api.twitch.tv/helix/${path}`, {
    method,
    headers: { "Client-Id": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  // GET /schedule answers 404 while the channel has no calendar yet.
  if (response.status === 404 && method === "GET") return null
  if (!response.ok) throw new Error(`Twitch: ${method} ${path.split("?")[0]} → ${response.status} ${(await response.text()).slice(0, 200)}`)
  return response.status === 204 ? null : response.json()
}

interface Segment {
  id: string
  start_time: string
  end_time: string
  title: string
  canceled_until: string | null
  category: { id: string; name: string } | null
  is_recurring: boolean
}

/** Three weeks of the calendar (a page holds 25 segments), enough to see each series' next occurrences. */
async function segments(token: string, broadcaster: string): Promise<Segment[]> {
  const all: Segment[] = []
  const until = Date.now() + 22 * 86_400_000
  let cursor = ""
  for (let page = 0; page < 8; page++) {
    const body = await helix(token, "GET", `schedule?broadcaster_id=${broadcaster}&first=25${cursor ? `&after=${cursor}` : ""}`)
    const found: Segment[] = body?.data?.segments ?? []
    all.push(...found)
    cursor = body?.pagination?.cursor ?? ""
    if (!cursor || !found.length || Date.parse(found[found.length - 1].start_time) > until) break
  }
  return all
}

export interface SyncReport {
  done: string[]
  waiting: string[]
}

/** Puts the agenda on Twitch's calendar; `step` hears each change as it's made. */
export async function syncTwitch(agenda: Agenda, token: string, step: (line: string) => void = () => {}): Promise<SyncReport> {
  const me = await whoIs(token)
  if (!me || !me.scopes.includes(SCHEDULE_SCOPE)) throw new MissingScope()
  const done: string[] = []
  const run = async (line: string, call: () => Promise<unknown>) => {
    step(line)
    await call()
    done.push(line)
  }
  let plan = planoTwitch(agenda, await segments(token, me.id), new Date())
  for (const { id, rotulo } of plan.remove) await run(`removeu ${rotulo}`, () => helix(token, "DELETE", `schedule/segment?broadcaster_id=${me.id}&id=${encodeURIComponent(id)}`))
  for (const { corpo, rotulo } of plan.cria) await run(`criou ${rotulo}`, () => helix(token, "POST", `schedule/segment?broadcaster_id=${me.id}`, corpo))
  // What was just created can have a day off on its first week.
  if (plan.cria.length) plan = planoTwitch(agenda, await segments(token, me.id), new Date())
  for (const { id, rotulo } of plan.cancela)
    await run(`cancelou ${rotulo}`, () => helix(token, "PATCH", `schedule/segment?broadcaster_id=${me.id}&id=${encodeURIComponent(id)}`, { is_canceled: true }))
  for (const { id, rotulo } of plan.retoma)
    await run(`retomou ${rotulo}`, () => helix(token, "PATCH", `schedule/segment?broadcaster_id=${me.id}&id=${encodeURIComponent(id)}`, { is_canceled: false }))
  return { done, waiting: plan.pendentes }
}

export interface Category {
  id: string
  name: string
  box: string
}

/** Twitch's categories for a search, for a game the agenda doesn't have yet. */
export async function searchCategories(token: string, query: string): Promise<Category[]> {
  const body = await helix(token, "GET", `search/categories?first=8&query=${encodeURIComponent(query)}`)
  return (body?.data ?? []).map((c: { id: string; name: string; box_art_url: string }) => ({
    id: c.id,
    name: c.name,
    box: c.box_art_url.replace("{width}", "52").replace("{height}", "72"),
  }))
}
