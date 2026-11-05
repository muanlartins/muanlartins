/**
 * The viewer's profile: signing in with Twitch and saving their fan through the profile API
 * (infra/site.yml, output PerfilApiUrl). The site has no server of its own, so the sign-in is Twitch's
 * implicit flow: Twitch sends the token back to /perfil in the URL fragment, it stays in this browser,
 * and the API checks it with Twitch on every call.
 */
import { ORIGIN, profileSlug } from "@/lib/site"

/** The Twitch app (dev.twitch.tv/console); its redirect URLs are /perfil and /profile on both sites and localhost. */
export const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID ?? "dploislenvijye1obbcm5dqxcxu5y1"
/** The profile API. Both can be set in the environment to try the page against a local stand-in. */
export const PROFILE_API = process.env.NEXT_PUBLIC_PROFILE_API ?? "https://wtpv8afsak.execute-api.us-east-1.amazonaws.com"
/** The Σ API (output SigmaApiUrl): each viewer's points, public by login. */
export const SIGMA_API = process.env.NEXT_PUBLIC_SIGMA_API ?? "https://p1rblei1o9.execute-api.us-east-1.amazonaws.com"

const TOKEN_KEY = "twitch:token"
const STATE_KEY = "twitch:state"
const DRAFT_KEY = "perfil:rascunho"
// Where to go back to after Twitch, for a sign-in that didn't start on the profile (Twitch only sends back there).
const BACK_KEY = "twitch:volta"

/** What a viewer chose; the options and their defaults are in public/stream/torcedor.js. */
export type Choice = Record<string, unknown>

export interface Fan {
  cor: string
  detalhe: string
  cabeca: string
  roupa: string
  numero: number
  acessorio: string
  comemoracao: string
  frase: string
  stickers: { gol: string[]; contra: string[] }
}

declare global {
  interface Window {
    Torcedor?: Torcedor
    Sigma?: Sigma
  }
}

/** A viewer's Σ and what earned it (infra/site.yml). */
export interface SigmaStats {
  sigma: number
  minutos: number
  lives: number
  sequencia: number
}

/** A rank for a Σ total, in one game (sigma.js). */
export interface Rank {
  id: string
  nome: string
  emblema: string
  desde: number
  ate: number | null
  proximo: string | null
}

/** window.Sigma, from /stream/sigma.js. */
export interface Sigma {
  ranque(sigma?: number, lingua?: "pt" | "en"): Rank
  peso(sigma?: number): number
  COR_LIVRE: number
}

/** Someone's Σ, or nothing yet: they haven't been in a live since Σ started. */
export async function loadSigma(login: string): Promise<SigmaStats | null> {
  if (!SIGMA_API || !login) return null
  const response = await fetch(`${SIGMA_API}/sigmas?logins=${encodeURIComponent(login)}`)
  if (!response.ok) throw new Error(String(response.status))
  const found = (await response.json()) as Record<string, Partial<SigmaStats>>
  const stats = found[login]
  // A viewer whose first Σ came from a Pix has no minutes, lives or streak yet.
  return stats ? { sigma: 0, minutos: 0, lives: 0, sequencia: 0, ...stats } : null
}

/** window.Torcedor, from /stream/torcedor.js. */
export interface Torcedor {
  CORES: string[]
  CABECAS: string[]
  ROUPAS: string[]
  ACESSORIOS: string[]
  COMEMORACOES: string[]
  STICKERS: string[]
  FRASE_MAX: number
  STICKERS_MAX: number
  padrao(login?: string): Fan
  normalizar(choice: Choice | Fan | null | undefined, login?: string): Fan
  soPaleta(fan: Fan, login?: string): Fan
  figura(fan: Fan): string
  umEmoji(text: string): boolean
}

export const canSave = Boolean(TWITCH_CLIENT_ID && PROFILE_API)

const store = {
  get: (key: string, session = false) => {
    try {
      return (session ? sessionStorage : localStorage).getItem(key)
    } catch {
      return null
    }
  },
  set: (key: string, value: string | null, session = false) => {
    try {
      const s = session ? sessionStorage : localStorage
      if (value === null) s.removeItem(key)
      else s.setItem(key, value)
    } catch {}
  },
}

/** Sends the browser to Twitch, keeping the fan being built so it's still there on the way back. */
export function signIn(draft: Fan | null, back?: string) {
  const state = crypto.randomUUID()
  store.set(STATE_KEY, state, true)
  if (draft) store.set(DRAFT_KEY, JSON.stringify(draft), true)
  if (back) store.set(BACK_KEY, back, true)
  const url = new URL("https://id.twitch.tv/oauth2/authorize")
  url.search = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: `${ORIGIN}/${profileSlug()}`,
    response_type: "token",
    scope: "",
    state,
  }).toString()
  location.assign(url)
}

/** The token: just back from Twitch (then taken out of the address bar), or kept from before. */
export function takeToken(): string | null {
  const fragment = new URLSearchParams(location.hash.slice(1))
  const token = fragment.get("access_token")
  if (token || fragment.get("error")) history.replaceState(null, "", location.pathname)
  if (token && fragment.get("state") === store.get(STATE_KEY, true)) {
    store.set(STATE_KEY, null, true)
    store.set(TOKEN_KEY, token)
  }
  return store.get(TOKEN_KEY)
}

/** The page a sign-in started on, once; null when it started on the profile. */
export function takeBack(): string | null {
  const back = store.get(BACK_KEY, true)
  store.set(BACK_KEY, null, true)
  return back?.startsWith("/") && !back.startsWith("//") ? back : null
}

/** The token kept from an earlier sign-in, for pages other than the profile. */
export function keptToken(): string | null {
  return store.get(TOKEN_KEY)
}

export function signOut() {
  store.set(TOKEN_KEY, null)
}

/** The fan being built before going to Twitch, once. */
export function takeDraft(): Fan | null {
  const draft = store.get(DRAFT_KEY, true)
  store.set(DRAFT_KEY, null, true)
  try {
    return draft ? (JSON.parse(draft) as Fan) : null
  } catch {
    return null
  }
}

export class SignedOut extends Error {}

async function call(method: string, token: string, body?: unknown) {
  const response = await fetch(`${PROFILE_API}/eu`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 401) {
    signOut()
    throw new SignedOut()
  }
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as { login: string; aparencia: Choice | null }
}

/** The fans saved under these logins (the public side of the profile API); a login missing has none saved. */
export async function loadFans(logins: string[]): Promise<Record<string, Choice>> {
  const unique = [...new Set(logins)]
  const found: Record<string, Choice> = {}
  for (let i = 0; i < unique.length; i += 100) {
    const response = await fetch(`${PROFILE_API}/torcedores?logins=${unique.slice(i, i + 100).map(encodeURIComponent).join(",")}`)
    if (!response.ok) throw new Error(String(response.status))
    Object.assign(found, await response.json())
  }
  return found
}

export const loadMine = (token: string) => call("GET", token)
export const saveMine = (token: string, fan: Fan) => call("PUT", token, fan)
export const eraseMine = (token: string) => call("DELETE", token)
