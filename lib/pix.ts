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

/** A Pix on the mural; `login` when its sender signed in with Twitch, to draw their fan. */
export interface MuralPix {
  em: string
  nome: string
  mensagem: string
  centavos: number
  login?: string
}

/** A goal and what came in while it was up: every Pix counts; only those who chose to are named. */
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

export interface Order {
  centavos: number
  nome: string
  mensagem: string
  voz: string
  quando: "agora" | "entre"
  mural: boolean
  audio?: { tipo: string; dados: string }
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
  if (!response.ok) throw new Error(body.erro ?? String(response.status))
  return body as Reservation
}

export async function reservationStatus(id: string): Promise<{ pago: boolean; expira: number; ate: number }> {
  const response = await fetch(`${PIX_API}/reserva?id=${encodeURIComponent(id)}`)
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

export async function loadMural(): Promise<Mural> {
  const response = await fetch(`${PIX_API}/mural`)
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

/** The smallest Pix the form takes: R$ 1. */
export const MINIMO = 100
