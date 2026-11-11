/**
 * Dream loadouts through the profile API (infra/perfil): anyone's is public by login, the signed-in viewer saves theirs
 * with their Twitch token (lib/profile.ts's sign-in), and the channel's also brings its inventory as the game has it.
 * Before signing in, the loadout being built stays in this browser.
 */
import { PROFILE_API, signOut, SignedOut } from "@/lib/profile"
import { ORIGIN, sectionPath } from "@/lib/site"
import { EMPTY, type GameReading, type Loadout } from "@/lib/valorant-inventory"

const DRAFT_KEY = "loadout:rascunho"
const LOGIN = /^[a-z0-9_]{1,25}$/

export interface Saved {
  login: string
  loadout: Loadout | null
  /** When it was saved. */
  em: string | null
  /** The channel's only. */
  jogo?: GameReading | null
}

/** Someone's dream loadout (null when they have none), and the channel's game reading with the channel's. */
export async function loadLoadout(login: string): Promise<Saved> {
  const response = await fetch(`${PROFILE_API}/loadout?login=${encodeURIComponent(login)}`)
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as Saved
}

async function call(method: "GET" | "PUT" | "DELETE", path: string, token: string, body?: unknown) {
  const response = await fetch(`${PROFILE_API}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 401) {
    signOut()
    throw new SignedOut()
  }
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

/** The signed-in viewer's login and loadout. */
export const loadMyLoadout = (token: string) => call("GET", "/eu", token) as Promise<{ login: string; loadout: Loadout | null }>
export const saveMyLoadout = (token: string, loadout: Loadout) => call("PUT", "/eu/loadout", token, loadout) as Promise<Saved>
export const eraseMyLoadout = (token: string) => call("DELETE", "/eu/loadout", token) as Promise<Saved>

function valid(value: unknown): value is Loadout {
  return !!value && typeof value === "object" && typeof (value as Loadout).armas === "object" && !!(value as Loadout).armas
}

/** The loadout being built in this browser. */
export function draft(): Loadout | null {
  try {
    const kept = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as unknown
    return valid(kept) ? kept : null
  } catch {
    return null
  }
}

export function keepDraft(loadout: Loadout | null) {
  try {
    if (!loadout || !Object.keys(loadout.armas).length) localStorage.removeItem(DRAFT_KEY)
    else localStorage.setItem(DRAFT_KEY, JSON.stringify(loadout))
  } catch {}
}

export const sameLoadout = (a: Loadout | null, b: Loadout | null) => JSON.stringify(a ?? EMPTY) === JSON.stringify(b ?? EMPTY)

export const isLogin = (value: string | null): value is string => !!value && LOGIN.test(value)

/** The inventory page, with someone's loadout open: what the share button copies. */
export const loadoutLink = (login: string) => `${ORIGIN}${sectionPath("content")}/valorant/inventory?de=${login}`
