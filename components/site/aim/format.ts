import { LOCALE } from "@/lib/site"

/** The aim page's numbers as the site writes them (brand/voz.md, "Formats"): "64%", "2,6", "0,3°", "–" when empty. */
const locale = LOCALE === "pt" ? "pt-BR" : "en"

export const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""))

export const pct = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? "–" : `${Math.round(v * 100)}%`)

export const decimal = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "–" : v.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })

export const whole = (v: number) => Math.round(v).toLocaleString(locale)

export const degrees = (v: number, digits = 1) => `${decimal(Math.abs(v), digits)}°`

/** "21/11" from "2026-11-21". */
export const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

/** The middle value of a list (null when empty). */
export function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length / 2
  return sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** A quantile of a list, linear between its points (null when empty). */
export function quantile(values: number[], q: number) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const at = (sorted.length - 1) * q
  const lo = Math.floor(at)
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (at - lo)
}
