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
  /** Its song, once it played on the live. */
  musica?: { url: string; estilo: string; sobre?: string; letra?: string; segundos?: number }
}

/** A goal and what came in while it was up: every Pix, each by its name and message unless it's anonymous. */
export interface Goal {
  titulo: string
  alvo: number
  desde: string
  ate: string | null
  arrecadado: number
  pix: number
  apoiadores: MuralPix[]
}

export interface Mural {
  meta: Goal | null
  metas: Goal[]
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
}

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

/** R$ for cents, as Brazilians write it: 1234 → "12,34". */
export const reais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
