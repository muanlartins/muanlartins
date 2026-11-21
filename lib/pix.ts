/** The Pix API (infra/pix, output PixApiUrl): reserving a value, its status, and the mural. NEXT_PUBLIC_PIX_API points it at a local stand-in. */
export const PIX_API = process.env.NEXT_PUBLIC_PIX_API ?? "https://g2x6kdnhr0.execute-api.us-east-1.amazonaws.com"

export interface Reservation {
  id: string
  centavos: number
  brcode: string
  expira: number
  login: string | null
  sigma: number
}

/** A Pix on the mural; `login` when its sender signed in with Twitch, to draw their fan. No name, message or login: an anonymous Pix, its value only. */
export interface MuralPix {
  em: string
  nome: string
  mensagem: string
  centavos: number
  login?: string
  /** The present it hung on a Christmas goal's tree, as chosen on /pix; without one, presente.js picks it from `em`. */
  presente?: Present
  /** Its song, once it played on the live; `tempos`, when the API timed its lyrics: [start, end] in seconds (or null) per non-blank line of `letra`. */
  musica?: { url: string; estilo: string; sobre?: string; letra?: string; tempos?: SongTimes; segundos?: number }
}

export type SongTimes = ([number, number] | null)[]

/** A goal and what came in while it was up: every Pix, each by its name and message unless it's anonymous. */
export interface Goal {
  titulo: string
  alvo: number
  desde: string
  /** When it ended; null while it's on screen. */
  ate: string | null
  /** The Brasília midnight after its last day, when it was set with one (it ends there by itself); null runs until ended by hand. */
  prazo: string | null
  arrecadado: number
  pix: number
  apoiadores: MuralPix[]
  /** "natal": a Christmas goal, its Pix hanging presents on the tree and every SUB of it a gift sub; null for a plain one. */
  tema: string | null
  /** A Christmas goal's gift subs drawn so far, in order. */
  sorteios?: { login: string; em: string; dado: boolean }[]
}

/** A goal set ahead of time: it takes the screen at the midnight that begins its first day. */
export interface PlannedGoal {
  titulo: string
  alvo: number
  desde: string
  prazo: string | null
  tema: string | null
}

export interface Mural {
  meta: Goal | null
  metas: Goal[]
  proxima: PlannedGoal | null
  /** The named Pix of no goal. */
  pix: MuralPix[]
}

/** A song's order: a style (STYLES in content/pix.ts, ESTILOS in infra/pix/musica.mjs) and a theme or the lyrics. */
export interface SongOrder {
  estilo: string
  sobre?: string
  letra?: string
}

export interface Order {
  centavos: number
  nome: string
  mensagem: string
  voz: string
  quando: "agora" | "entre"
  audio?: { tipo: string; dados: string }
  musica?: SongOrder
  presente?: Present
}

/** A present on the Christmas tree: its shape, colour, second colour and pattern (public/stream/presente.js). */
export interface Present {
  formato: string
  cor: string
  detalhe: string
  padrao: string
}

/** public/stream/presente.js, once a page loads it: the choices, the defaults and the drawings. */
export interface PresentKit {
  FORMATOS: string[]
  CORES: string[]
  PADROES: string[]
  SEM_PADRAO: string[]
  normalizar(choice: Partial<Present> | null | undefined, seed?: string): Present
  figura(present: Partial<Present>): string
  arvore(list: { id: string; presente?: Present; centavos?: number; nome?: string }[], options?: { progresso?: number; novo?: string | null }): string
}

declare global {
  interface Window {
    Presente?: PresentKit
  }
}

/** A gift sub for every R$ 10 of a Christmas goal (SUB in infra/pix). */
export const SUB = 1000

/**
 * A song as its sender follows it on /pix: waiting for the Pix, being made, ready (queued for the live), refused by
 * Google (`motivo`, `edicoes` left, until `ate`) or given up (it plays as a plain alert).
 */
export interface SongStatus {
  estado: "esperando" | "gerando" | "pronta" | "recusada" | "falhou"
  estilo?: string
  sobre?: string
  letra?: string
  motivo?: string
  edicoes?: number
  ate?: number
}

/** The API's refusal, with the field it's about ("musica") when there's one. */
export class PixError extends Error {
  campo?: string
  constructor(message: string, campo?: string) {
    super(message)
    this.campo = campo
  }
}

/** R$ for cents, as brand/voz.md writes money: 1234 → "12,34", 500 → "5", 123456 → "1.234,56". */
export const reais = (centavos: number) => {
  const whole = centavos % 100 === 0
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })
}

/** Cents from what was typed: "2,50", "2.5", "R$ 10" → 250, 250, 1000; NaN if it isn't an amount. */
export function centavosDe(texto: string) {
  const limpo = texto.replace(/R\$|\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")
  return /^\d+(\.\d{1,2})?$/.test(limpo) ? Math.round(Number(limpo) * 100) : NaN
}

export async function reserve(order: Order, token: string | null): Promise<Reservation> {
  const response = await fetch(`${PIX_API}/reservar`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(order),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new PixError(body.erro ?? String(response.status), body.campo)
  return body as Reservation
}

export async function reservationStatus(id: string): Promise<{ pago: boolean; expira: number; ate: number; musica?: SongStatus }> {
  const response = await fetch(`${PIX_API}/reserva?id=${encodeURIComponent(id)}`)
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

export async function loadMural(): Promise<Mural> {
  const response = await fetch(`${PIX_API}/mural`)
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

/** The goals alone, with their dates (GET /metas): the one on screen with its count, the one scheduled, the ended ones. */
export interface Goals {
  meta: Pick<Goal, "titulo" | "alvo" | "desde" | "prazo" | "arrecadado"> | null
  proxima: PlannedGoal | null
  metas: Pick<Goal, "titulo" | "alvo" | "desde" | "prazo" | "ate" | "arrecadado">[]
}

export async function loadGoals(): Promise<Goals> {
  const response = await fetch(`${PIX_API}/metas`)
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

// A goal's dates are Brasília's days: it starts at the midnight of its first and runs until the one after its last.
const BRASILIA = "America/Sao_Paulo"
/** The Brasília day of an instant, "YYYY-MM-DD". */
export const dayInBrasilia = (instant: string | number) => new Date(instant).toLocaleDateString("sv-SE", { timeZone: BRASILIA })
/** A goal's first day, "YYYY-MM-DD". */
export const firstDayOf = (goal: { desde: string }) => dayInBrasilia(goal.desde)
/** A goal's last day, "YYYY-MM-DD": the day it ended, or the one it's set to end; null for one on screen with no end. */
export function lastDayOf(goal: { prazo: string | null; ate?: string | null }) {
  const end = goal.ate ?? goal.prazo
  return end ? dayInBrasilia(Date.parse(end) - 1) : null
}
/** Whole days from today to a goal's last day (Brasília's): 0 on the last day. */
export const daysLeft = (goal: { prazo: string }, now = Date.now()) =>
  Math.round((Date.parse(lastDayOf(goal)!) - Date.parse(dayInBrasilia(now))) / 86_400_000)

/** A refused song's new text: checked again, then made again. */
export async function editSong(id: string, text: { sobre: string } | { letra: string }): Promise<SongStatus> {
  const response = await fetch(`${PIX_API}/musica`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...text }) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new PixError(body.erro ?? String(response.status), "musica")
  return body.musica as SongStatus
}

/** The smallest Pix the form takes: R$ 1; with a song, R$ 5. */
export const MINIMO = 100
export const MINIMO_MUSICA = 500
/** How long a song's theme and lyrics may be (infra/pix/musica.mjs checks them again). */
export const SOBRE_MAX = 120
export const LETRA_MAX = 800
