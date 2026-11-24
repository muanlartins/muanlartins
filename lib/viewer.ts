/**
 * A viewer's page on the site, /torcedor/<login>, and their card: the same everywhere a viewer's name shows (the mural,
 * the audience, the minigames, the roadmap, the ranked record), on top of their page and in a small window on a name.
 *
 * What it gathers, all public: their fan, card and ball (the profile API's GET /cartoes), their Σ, streak, first live and
 * the goals the stand dedicated to them (the Σ API's GET /pessoa), their duels (GET /duelos?login=), their Pix on the
 * mural (the Pix API), and what the site knows when it's built (/torcedor/dados.json: their ideas on the roadmap and the
 * matches they played with Luan).
 */
import { loadFans, loadSigmas, PROFILE_API, rememberMe, SIGMA_API, signOut, SignedOut, type SavedFan, type SigmaStats } from "@/lib/profile"

/** Where someone's page is: every viewer has one, built or not (a login the build didn't know is drawn by the 404 page). */
export const VIEWER_SLUG = "torcedor"
export const viewerPath = (login: string) => `/${VIEWER_SLUG}/${login.toLowerCase()}`
export const VIEWER_DATA = `/${VIEWER_SLUG}/dados.json`
const LOGIN = /^[a-z0-9_]{1,25}$/
export const isLogin = (login: string) => LOGIN.test(login)

/**
 * The card's colours: a theme (a gradient behind their fan) or two of their own, "livre", for everyone (Σ locks
 * nothing, Luan, 2026-11-23). The first is the default.
 */
export const THEMES = [
  { id: "klein", name: "Klein", colors: ["#002fa7", "#001447"] },
  { id: "ceu", name: "Céu", colors: ["#85a7ff", "#002fa7"] },
  { id: "por-do-sol", name: "Pôr do sol", colors: ["#ff8a3d", "#b5307a"] },
  { id: "gramado", name: "Gramado", colors: ["#2fa84f", "#0b4d2a"] },
  { id: "noite", name: "Noite", colors: ["#3a2a7a", "#0b0b24"] },
  { id: "brasa", name: "Brasa", colors: ["#ff4d3d", "#5a0f1c"] },
  { id: "ouro", name: "Ouro", colors: ["#f2c14e", "#a0671b"] },
  { id: "menta", name: "Menta", colors: ["#7fd8d2", "#1f6f8b"] },
  { id: "chiclete", name: "Chiclete", colors: ["#ff9ad5", "#8f4bff"] },
  { id: "grafite", name: "Grafite", colors: ["#6b7280", "#1f2430"] },
] as const
export const FREE_THEME = "livre"

/** What a viewer chose for their card; anything left out is the default. */
export interface Card {
  tema?: string
  /** Their own two colours, with tema "livre". */
  cores?: [string, string]
  /** "Sobre mim": what they say about themselves, up to two blank lines kept (the API runs it through the Pix's word filter). */
  sobre?: string
  /** Their pronouns, filtered the same way. */
  pronomes?: string
  /** Their game, by the site's id. */
  jogo?: string
}
export const ABOUT_MAX = 300
export const PRONOUNS_MAX = 24

/** Their banner and photo, each "<id>.<webp|jpg>" (a new picture is a new id, so the browser keeps each for good). */
export interface Images {
  banner?: string
  foto?: string
}
export type ImageKind = keyof Images
/** The pictures as the site draws them before sending (lib/viewer-images.ts) and the most the API keeps of each. */
export const IMAGE_SIZE: Record<ImageKind, { width: number; height: number; max: number }> = {
  banner: { width: 1500, height: 500, max: 300_000 },
  foto: { width: 320, height: 320, max: 90_000 },
}
export const imageUrl = (login: string, kind: ImageKind, file: string) => `${PROFILE_API}/imagem/${login.toLowerCase()}/${kind}/${file}`

const avatars = new Map<string, Promise<string | null>>()
/**
 * Their Twitch photo, the photo of anyone who never sent one (null for Twitch's default picture or out of reach): from
 * DecAPI, as the site's "Ao vivo" (the site has no backend for Twitch's API).
 */
export function loadTwitchAvatar(login: string): Promise<string | null> {
  const key = login.toLowerCase()
  let found = avatars.get(key)
  if (!found) {
    found = fetch(`https://decapi.me/twitch/avatar/${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((url) => (/^https:\/\/static-cdn\.jtvnw\.net\//.test(url.trim()) && !url.includes("user-default-pictures") ? url.trim().replace("300x300", "150x150") : null))
      .catch(() => null)
    avatars.set(key, found)
  }
  return found
}
/** The games a card can show: the channel's (content/projects.ts, kept light here for the browser). */
export const CARD_GAMES = [
  { id: "rocket-league", name: "Rocket League" },
  { id: "valorant", name: "Valorant" },
] as const

/** The card's two colours, as it's drawn: their own two with "livre", else their theme's. */
export function cardColors(card: Card | null | undefined): [string, string] {
  if (card?.tema === FREE_THEME && card.cores) return card.cores
  const theme = THEMES.find((t) => t.id === card?.tema) ?? THEMES[0]
  return [theme.colors[0], theme.colors[1]]
}

/** Someone's look on the site: their fan, card, duel ball and pictures, any of them null when never saved. */
export interface Look {
  aparencia: SavedFan | null
  cartao: Card | null
  duelo: { classe?: string; material?: string } | null
  imagens?: Images | null
}

/** A goal (in Valorant, a win) the stand dedicated to them. */
export interface Dedication {
  id: number
  tipo: "gol" | "vitoria"
  /** The goal's speed (km/h) or the match's score. */
  detalhe: string | null
  jogo: string | null
  em: string
}

/** What the Σ API says about someone. */
export interface Person {
  login: string
  stats: SigmaStats | null
  primeira: string | null
  dedicatorias: Dedication[]
}

/** What the site knows when it's built, by login. */
export interface ViewerData {
  ideias: Record<string, Idea[]>
  partidas: Record<string, PlayedMatch[]>
}

/** An idea of theirs on the roadmap. */
export interface Idea {
  id: string
  title: string
  /** Released (with its date) or still to come. */
  shipped: boolean
  date?: string
  as: "idea" | "report"
  about?: string
}

/** A match they played with Luan. */
export interface PlayedMatch {
  game: "rocket-league" | "valorant"
  id: string
  date: string
  result: "win" | "loss" | "draw"
  score?: [number, number]
  /** Rocket League's mode ("3v3") or Valorant's map. */
  label: string
  /** Where it is in a live's video, when the live has a chapter for it. */
  live?: { date: string; at: number }
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as T
}

// One request per batch of names, shared by every card on the page: a name's card asks only for what nobody asked yet.
const looks = new Map<string, Promise<Look | null>>()
let waiting: { login: string; resolve: (look: Look | null) => void }[] = []
let timer: ReturnType<typeof setTimeout> | undefined

function flush() {
  const batch = waiting
  waiting = []
  timer = undefined
  for (let i = 0; i < batch.length; i += 100) {
    const part = batch.slice(i, i + 100)
    get<Record<string, Look>>(`${PROFILE_API}/cartoes?logins=${part.map((p) => encodeURIComponent(p.login)).join(",")}`)
      .then((found) => part.forEach((p) => p.resolve(found[p.login] ?? null)))
      // Without /cartoes (an API from before it, or trouble with it), at least the fans.
      .catch(() =>
        loadFans(part.map((p) => p.login))
          .then((fans) => part.forEach((p) => p.resolve(fans[p.login] ? { aparencia: fans[p.login], cartao: null, duelo: null, imagens: null } : null)))
          .catch(() => part.forEach((p) => p.resolve(null))),
      )
  }
}

/** Someone's fan, card and ball (null: none saved, or the API out of reach). */
export function loadLook(login: string): Promise<Look | null> {
  const key = login.toLowerCase()
  let found = looks.get(key)
  if (!found) {
    found = new Promise((resolve) => waiting.push({ login: key, resolve }))
    looks.set(key, found)
    timer ??= setTimeout(flush, 30)
  }
  return found
}

/** Forget a look, after its owner saved a new one. */
export const forgetLook = (login: string) => looks.delete(login.toLowerCase())

const people = new Map<string, Promise<Person | null>>()

/** Someone's Σ, streak, first live and dedications (null when the API can't be reached). */
export function loadPerson(login: string): Promise<Person | null> {
  const key = login.toLowerCase()
  let found = people.get(key)
  if (!found) {
    found = get<Person>(`${SIGMA_API}/pessoa?login=${encodeURIComponent(key)}`).catch(() =>
      // Without /pessoa, at least their Σ.
      loadSigmas([key])
        .then((sigmas) => ({ login: key, stats: sigmas[key] ?? null, primeira: null, dedicatorias: [] }))
        .catch(() => null),
    )
    people.set(key, found)
  }
  return found
}

let data: Promise<ViewerData> | undefined
/** What the site knew when it was built: everyone's ideas and matches. */
export function loadViewerData(): Promise<ViewerData> {
  data ??= get<ViewerData>(VIEWER_DATA).catch(() => ({ ideias: {}, partidas: {} }))
  return data
}

async function call(method: "PUT" | "DELETE", token: string, body?: Card) {
  const response = await fetch(`${PROFILE_API}/eu/cartao`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (response.status === 401) {
    signOut()
    throw new SignedOut()
  }
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as { login: string; cartao: Card | null }
}

export const saveMyCard = (token: string, card: Card) => call("PUT", token, card)
export const eraseMyCard = (token: string) => call("DELETE", token)

/** Sends their banner or photo (already drawn to size by lib/viewer-images.ts): the card's pictures after it. */
export async function saveMyImage(token: string, kind: ImageKind, picture: Blob): Promise<Images | null> {
  const response = await fetch(`${PROFILE_API}/eu/imagem/${kind}`, { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": picture.type }, body: picture })
  if (response.status === 401) {
    signOut()
    throw new SignedOut()
  }
  if (!response.ok) throw new Error(String(response.status))
  const { login, imagens } = (await response.json()) as { login: string; imagens: Images | null }
  // The header shows their photo.
  if (login) rememberMe({ login, imagens })
  return imagens
}

async function erase(path: string, token: string): Promise<{ login: string; imagens: Images | null }> {
  const response = await fetch(`${PROFILE_API}${path}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } })
  if (response.status === 401) {
    signOut()
    throw new SignedOut()
  }
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as { login: string; imagens: Images | null }
}

/** Takes their own banner or photo down. */
export async function eraseMyImage(token: string, kind: ImageKind): Promise<Images | null> {
  const { login, imagens } = await erase(`/eu/imagem/${kind}`, token)
  if (login) rememberMe({ login, imagens })
  return imagens
}
/** The channel takes anyone's picture down (a picture that shouldn't be on the site). */
export const takeDownImage = async (token: string, login: string, kind: ImageKind) => (await erase(`/canal/imagem/${login.toLowerCase()}/${kind}`, token)).imagens
