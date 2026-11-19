import { PROFILE_API, SignedOut, signOut } from "@/lib/profile"
import { DISCORD_INVITE, ORIGIN } from "@/lib/site"

/**
 * The community's Discord server (infra/comum/discord.mjs has its story). The site stays the home of everything; the
 * server is where people talk, hear when a live opens and play together. A viewer signed in on /perfil connects their
 * Discord with Discord's implicit grant (identify, guilds.join: the token stays in their browser like Twitch's), and the
 * profile API puts them in the server with their Σ rank as a role (infra/perfil/discord.mjs).
 */

/** The Discord application "muanlartins": its id is public, like Twitch's client id. */
export const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? "1572978536090706070"
/** The server's permanent invite (scripts/discord.mjs made it), kept with the site's links. */
export { DISCORD_INVITE }

const STATE_KEY = "discord:state"
const STATE_PREFIX = "discord."

export interface DiscordLink {
  id: string
  nome: string
  em: string
}

/** Whether the address is Discord's way back (the profile's Twitch sign-in leaves it alone). */
export const isDiscordReturn = (fragment: URLSearchParams) => fragment.get("state")?.startsWith(STATE_PREFIX) ?? false

/** Sends the browser to Discord to connect their account; it comes back to the profile. */
export function connectDiscord() {
  const state = STATE_PREFIX + crypto.randomUUID()
  try {
    sessionStorage.setItem(STATE_KEY, state)
  } catch {}
  const url = new URL("https://discord.com/oauth2/authorize")
  url.search = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ? location.origin : ORIGIN}/perfil`,
    response_type: "token",
    scope: "identify guilds.join",
    state,
    prompt: "consent",
  }).toString()
  location.assign(url)
}

/** The Discord token just back from Discord (then taken out of the address bar), or null; "error" when they said no. */
export function takeDiscordToken(): string | null | "error" {
  const fragment = new URLSearchParams(location.hash.slice(1))
  if (!isDiscordReturn(fragment)) return null
  history.replaceState(null, "", location.pathname)
  let expected: string | null = null
  try {
    expected = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(STATE_KEY)
  } catch {}
  const token = fragment.get("access_token")
  if (!token || fragment.get("state") !== expected) return "error"
  return token
}

async function call(method: "PUT" | "DELETE", token: string, body?: unknown) {
  const response = await fetch(`${PROFILE_API}/eu/discord`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 401 && !body) {
    signOut()
    throw new SignedOut()
  }
  const json = (await response.json().catch(() => ({}))) as { discord?: DiscordLink | null; novo?: boolean; erro?: string }
  if (!response.ok) throw new Error(json.erro ?? String(response.status))
  return json
}

/** Links the Discord account of `discordToken` to the viewer signed in with Twitch: in the server, with their rank. */
export const linkDiscord = (token: string, discordToken: string) => call("PUT", token, { token: discordToken })

export const unlinkDiscord = (token: string) => call("DELETE", token)
