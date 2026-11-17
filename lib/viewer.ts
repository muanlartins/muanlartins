/**
 * A viewer's page on the site, /torcedor/<login>, and their card: the same everywhere a viewer's name shows (the mural,
 * the audience, the minigames, the roadmap, the ranked record), on top of their page and in a small window on a name.
 *
 * What it gathers, all public: their fan, card and ball (the profile API's GET /cartoes), their Σ, streak, first live and
 * the goals the stand dedicated to them (the Σ API's GET /pessoa), their duels (GET /duelos?login=), their Pix on the
 * mural (the Pix API), and what the site knows when it's built (/torcedor/dados.json: their ideas on the roadmap and the
 * matches they played with Luan).
 */
import { loadFans, loadSigmas, PROFILE_API, SIGMA_API, signOut, SignedOut, type Choice, type Sigma, type SigmaStats } from "@/lib/profile"

/** Where someone's page is: every viewer has one, built or not (a login the build didn't know is drawn by the 404 page). */
export const VIEWER_SLUG = "torcedor"
export const viewerPath = (login: string) => `/${VIEWER_SLUG}/${login.toLowerCase()}`
export const VIEWER_DATA = `/${VIEWER_SLUG}/dados.json`
const LOGIN = /^[a-z0-9_]{1,25}$/
export const isLogin = (login: string) => LOGIN.test(login)

/**
 * The card's colours: a theme (a gradient behind their fan) or two of their own, "livre", once their Σ unlocks free
 * colours (sigma.js's COR_LIVRE, as the fan's colours). The first is the default.
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
  /** A line about them (the API runs it through the Pix's word filter). */
  sobre?: string
  /** Their game, by the site's id. */
  jogo?: string
}
export const ABOUT_MAX = 140
/** The games a card can show: the channel's (content/projects.ts, kept light here for the browser). */
export const CARD_GAMES = [
  { id: "rocket-league", name: "Rocket League" },
  { id: "valorant", name: "Valorant" },
] as const

/** The card's two colours, as it's drawn: free colours only once their Σ unlocks them. */
export function cardColors(card: Card | null | undefined, sigma: number, S: Sigma | null): [string, string] {
  if (card?.tema === FREE_THEME && card.cores && S && sigma >= S.COR_LIVRE) return card.cores
  const theme = THEMES.find((t) => t.id === card?.tema) ?? THEMES[0]
  return [theme.colors[0], theme.colors[1]]
}

/** Someone's look on the site: their fan, card and duel ball, any of them null when never saved. */
export interface Look {
  aparencia: Choice | null
  cartao: Card | null
  duelo: { classe?: string; material?: string } | null
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
          .then((fans) => part.forEach((p) => p.resolve(fans[p.login] ? { aparencia: fans[p.login], cartao: null, duelo: null } : null)))
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
