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
export const CLASSES = ["espada", "adaga", "arco", "lanca", "machado", "foice", "punho", "martelo", "katana", "clava"] as const
export type ClassId = (typeof CLASSES)[number]

/**
 * Each class's sheet from 1 to 5, read off duelo-motor.js's numbers, so the page can draw it as a game would. dano: a
 * hit's damage at the start, forca included (the Machado's ×4 critical, the Martelo's and the Punho's once moving);
 * alcance: the weapon's length (the Arco shoots across the arena); velocidade: how fast the weapon turns (the Punho's,
 * the ball itself); cresce: how much its ability grows with each hit. Balance is the engine's: every class wins about
 * half its fights.
 */
export const CLASS_STATS: Record<ClassId, { dano: number; alcance: number; velocidade: number; cresce: number }> = {
  espada: { dano: 2, alcance: 4, velocidade: 3, cresce: 4 },
  adaga: { dano: 2, alcance: 2, velocidade: 5, cresce: 3 },
  arco: { dano: 2, alcance: 5, velocidade: 2, cresce: 4 },
  lanca: { dano: 3, alcance: 5, velocidade: 2, cresce: 3 },
  machado: { dano: 5, alcance: 3, velocidade: 2, cresce: 3 },
  foice: { dano: 3, alcance: 4, velocidade: 2, cresce: 4 },
  punho: { dano: 3, alcance: 1, velocidade: 5, cresce: 4 },
  martelo: { dano: 4, alcance: 4, velocidade: 1, cresce: 5 },
  katana: { dano: 1, alcance: 4, velocidade: 3, cresce: 5 },
  clava: { dano: 4, alcance: 3, velocidade: 2, cresce: 2 },
}

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

/** The player's frame: the live's compact box (the engine's 300 arena with its strip and band), width / height. */
export const PLAYER_ASPECT = "332 / 392"

/**
 * The player's address: the live's overlay alone on the page (duelo.html?site), as compact as on the live. With a fight, its replay over and over;
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

/** What a fight's replay says beyond who won: the engine played again from its seed, in the browser. */
export interface FightReading {
  /** The winner's life at the end, 0 to 1. */
  left: number
  /** How far behind the winner ever was, in life (0 to 1): a comeback's size. */
  behind: number
  /** How many times the lead changed hands. */
  leads: number
}

/**
 * Plays the fights again off the page's thread (a worker running the live's own engine, duelo-motor.js), each fight
 * a reading. Only fights under the engine's rules (`versao`) are played. About 20 ms a fight.
 */
export function readFights(fights: Fight[], versao: number): Promise<Record<string, FightReading>> {
  const todo = fights.filter((f) => f.versao === versao).map(({ id, semente, classes }) => ({ id, semente, classes }))
  if (!todo.length || typeof Worker === "undefined") return Promise.resolve({})
  const code = `importScripts(${JSON.stringify(`${location.origin}/stream/duelo-motor.js`)})
onmessage = ({ data }) => {
  const D = self.Duelo, out = {}
  for (const f of data) {
    const luta = D.criar(f.semente, f.classes[0], f.classes[1])
    let min = 0, max = 0
    while (!luta.fim) {
      D.passo(luta)
      const d = luta.bolas[0].hp - luta.bolas[1].hp
      if (d < min) min = d
      if (d > max) max = d
    }
    const w = luta.fim.vencedor, total = luta.bolas[0].hpMax
    out[f.id] = { left: Math.max(0, luta.bolas[w].hp) / total, behind: (w === 0 ? -min : max) / total, leads: luta.metricas.viradas }
  }
  postMessage(out)
}`
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }))
    const worker = new Worker(url)
    const done = () => {
      worker.terminate()
      URL.revokeObjectURL(url)
    }
    worker.onmessage = ({ data }) => {
      done()
      resolve(data as Record<string, FightReading>)
    }
    worker.onerror = (e) => {
      done()
      reject(e)
    }
    worker.postMessage(todo)
  })
}

/** Why a fight is among the best, in the order they're picked. */
export const HIGHLIGHTS = ["virada", "detalhe", "disputada", "longa"] as const
export type Highlight = (typeof HIGHLIGHTS)[number]

/**
 * The best fights among those given, one per criterion and never the same fight twice: the biggest comeback (the
 * winner once 15% of life or more behind), the closest finish (the winner with 20% of life or less), the most
 * disputed (the lead changing hands 4 times or more) and the longest. A criterion nobody meets is left out.
 */
export function bestFights(fights: Fight[], readings: Record<string, FightReading>) {
  const read = fights.filter((f) => readings[f.id])
  const picked = new Set<string>()
  const best: { why: Highlight; fight: Fight; reading: FightReading | null }[] = []
  const take = (why: Highlight, list: Fight[], score: (f: Fight) => number) => {
    const top = list.filter((f) => !picked.has(f.id)).sort((a, b) => score(b) - score(a))[0]
    if (!top) return
    picked.add(top.id)
    best.push({ why, fight: top, reading: readings[top.id] ?? null })
  }
  take("virada", read.filter((f) => readings[f.id].behind >= 0.15), (f) => readings[f.id].behind)
  take("detalhe", read.filter((f) => readings[f.id].left <= 0.2), (f) => -readings[f.id].left)
  take("disputada", read.filter((f) => readings[f.id].leads >= 4), (f) => readings[f.id].leads)
  take("longa", fights, (f) => f.segundos)
  return best
}

/** Each class in the fights given: how often it fought (and how often drawn), its wins and its average length. */
export function classStats(fights: Fight[]) {
  const by = new Map<string, { classe: string; lutas: number; sorteadas: number; vitorias: number; segundos: number }>()
  for (const f of fights) {
    f.classes.forEach((classe, i) => {
      const s = by.get(classe) ?? { classe, lutas: 0, sorteadas: 0, vitorias: 0, segundos: 0 }
      s.lutas++
      if (f.sorteadas[i]) s.sorteadas++
      if (f.vencedor === i) s.vitorias++
      s.segundos += f.segundos
      by.set(classe, s)
    })
  }
  return [...by.values()].map((s) => ({ ...s, segundos: s.segundos / s.lutas }))
}
