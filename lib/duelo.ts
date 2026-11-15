/**
 * The ball duel on the site (/canal/minijogos). Each viewer's ball (its class and its weapon's material) is kept with
 * their profile (the profile API's /eu/duelo, with lib/profile.ts's sign-in) and read by the live's overlay
 * (public/stream/duelo.html); the records are the Σ API's: the overlay sends each fight shown while the stream is on,
 * and the API plays it again from its seed (infra/sigma/duelo.mjs) to keep the wins, the ranking and the latest fights.
 * The player on the page is the overlay itself, in an iframe, so a replay is the very fight the live showed.
 */
import { PROFILE_API, SIGMA_API, signOut, SignedOut } from "@/lib/profile"

/** A viewer's ball; either left out is the default: a class drawn each duel, the material of their Σ rank. */
export interface Ball {
  classe?: string
  material?: string
}

/** A fight as the Σ API keeps it. */
export interface Fight {
  id: string
  em: string
  /** The rules it was fought under (duelo-motor.js's VERSAO): a replay needs the same. */
  versao: number
  semente: number
  classes: [string, string]
  /** Whether each side's class was drawn (no pick). */
  sorteadas: [boolean, boolean]
  logins: [string, string]
  nomes: [string, string]
  materiais: [string | null, string | null]
  vencedor: 0 | 1
  motivo: "nocaute" | "tempo" | "sorteio"
  segundos: number
}

export interface Standing {
  login: string
  nome: string
  vitorias: number
  partidas: number
}

export interface Duels {
  total: number
  duelistas: number
  ranking: Standing[]
  /** The channel's own ball, which fights whoever is alone in the chat. */
  canal: { vitorias: number; partidas: number } | null
  lutas: Fight[]
}

export interface Duelist {
  login: string
  vitorias: number
  partidas: number
  posicao: number | null
  classes: Record<string, { vitorias: number; partidas: number }>
  lutas: Fight[]
}

/** The classes, in the order the page shows them (duelo-motor.js's ids). */
export const CLASSES = ["espada", "adaga", "arco", "lanca", "machado", "foice"] as const
export type ClassId = (typeof CLASSES)[number]

/** The weapon's materials, from the lowest Σ rank tier to the top (the overlay's MATERIAIS). */
export const MATERIALS = [
  { id: "bronze", cor: "#c98a52" },
  { id: "silver", cor: "#c3cad6" },
  { id: "gold", cor: "#f2c14e" },
  { id: "platinum", cor: "#7fd8d2", brilho: true },
  { id: "diamond", cor: "#7aa2ff", brilho: true, rastro: true },
  { id: "champion", cor: "#b48cff", brilho: true, rastro: true, faiscas: true },
  { id: "grand-champion", cor: "#ff6b6b", brilho: true, rastro: true, faiscas: true },
  { id: "supersonic-legend", cor: "#ffffff", brilho: true, rastro: true, faiscas: true, arco: true },
] as const
export type MaterialId = (typeof MATERIALS)[number]["id"]

/** A Σ rank's tier: "gold-2" → "gold". */
export const tierOf = (rankId: string) => rankId.replace(/-\d$/, "")

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as T
}

/** The ranking's top, the channel's ball, the latest fights. */
export const loadDuels = () => get<Duels>(`${SIGMA_API}/duelos`)

/** Someone's record and latest fights. */
export const loadDuelist = (login: string) => get<Duelist>(`${SIGMA_API}/duelos?login=${encodeURIComponent(login)}`)

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

/** The signed-in viewer's login and ball (null: the default). */
export const loadMyBall = (token: string) => call("GET", "/eu", token) as Promise<{ login: string; duelo: Ball | null }>
export const saveMyBall = (token: string, ball: Ball) => call("PUT", "/eu/duelo", token, ball) as Promise<{ login: string; duelo: Ball }>
export const eraseMyBall = (token: string) => call("DELETE", "/eu/duelo", token) as Promise<{ login: string; duelo: null }>

/**
 * The player's address: the live's overlay alone on the page (duelo.html?site). With a fight, its replay over and over;
 * without, `logins` fight duel after duel (the preview of a ball, against the channel's). "*" in classes or materials
 * means the default (a class drawn, the rank's material) even if they saved something else.
 */
export function playerUrl({ logins, nomes, classes, materiais, fight }: { logins: [string, string]; nomes?: [string, string]; classes?: [string, string]; materiais?: [string, string]; fight?: Fight }) {
  const q = new URLSearchParams({ site: "", lutadores: logins.join(",") })
  if (nomes) q.set("nomes", nomes.join(","))
  if (classes) q.set("classes", classes.join(","))
  if (materiais) q.set("materiais", materiais.join(","))
  if (fight) {
    q.set("semente", String(fight.semente))
    q.set("repetir", "")
  }
  return `/stream/duelo.html?${q.toString().replace(/=(?=&|$)/g, "")}`
}

/** A recorded fight's replay. */
export const replayUrl = (f: Fight) =>
  playerUrl({ logins: f.logins, nomes: f.nomes, classes: f.classes, materiais: [f.materiais[0] ?? "*", f.materiais[1] ?? "*"], fight: f })
