/**
 * The marble race on the site (/canal/minijogos and each viewer's page). The race runs on the live by itself in the
 * talk scene between matches (public/stream/corrida.html, its engine corrida-motor.js), everyone in the chat; the
 * records are the Σ API's: the overlay sends each race that ends while the stream is on, and the API runs it again
 * from its seed (infra/sigma/corrida.mjs) to keep the wins, podiums and the latest races. Worth nothing else.
 */
import { SIGMA_API } from "@/lib/profile"

/** A race as the Σ API keeps it: who ran (in the order the engine was given) and the order they crossed. */
export interface Race {
  id: string
  em: string
  versao: number
  semente: number
  logins: string[]
  nomes: string[]
  /** Indices into logins, first to cross first. */
  ordem: number[]
  /** The winner's time. */
  segundos: number
}

export interface RaceStanding {
  login: string
  nome: string
  vitorias: number
  podios: number
  corridas: number
}

export interface Races {
  total: number
  corredores: number
  ranking: RaceStanding[]
  ultimas: Race[]
}

export interface Racer {
  login: string
  vitorias: number
  podios: number
  corridas: number
  melhor: number | null
  posicao: number | null
  ultimas: { id: string; em: string; lugar: number; de: number }[]
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(String(response.status))
  return (await response.json()) as T
}

export const loadRaces = () => get<Races>(`${SIGMA_API}/corridas`)
export const loadRacer = (login: string) => get<Racer>(`${SIGMA_API}/corridas?login=${encodeURIComponent(login)}`)

/** The site's player: the live's overlay alone (corrida.html?site), in a 16:9 box; width / height of its frame. */
export const RACE_ASPECT = "660 / 390"
const PLAYER = "/stream/corrida.html?site&w=640&h=360"

/** A recorded race played again, the very race the live showed (its seed and who ran, in the order it had them). */
export const raceUrl = (r: Race) =>
  `${PLAYER}&semente=${r.semente}&lutadores=${r.logins.join(",")}&nomes=${r.nomes.map(encodeURIComponent).join(",")}`
/** Sample people racing, for the page before any race was recorded. */
export const demoRaceUrl = (n = 12) => `${PLAYER}&demo=${n}`
