"use client"

import { Lock } from "lucide-react"
import { profile } from "@/content/profile"
import type { Sigma } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile)
const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")
/** "Any colour", drawn as every hue. */
export const ANY_COLOUR = "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)"

const square = "h-8 w-8 shrink-0 border border-navy/20 transition-transform hover:scale-110"
const picked = "ring-2 ring-klein ring-offset-2 ring-offset-ground"

/** A colour (or a theme's two) to pick: a square, ringed when it's the one on. */
export function Swatch({ background, label, on, onClick }: { background: string; label: string; on: boolean; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={on} onClick={onClick} className={cn(square, on && picked)} style={{ background }} />
}

/** Any colour, through the browser's picker: every hue until one is picked, then that one. */
export function FreeSwatch({ value, on, label, onChange }: { value: string; on: boolean; label: string; onChange: (color: string) => void }) {
  return (
    <label title={label} className={cn(square, "relative cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-klein", on && picked)} style={{ background: on ? value : ANY_COLOUR }}>
      <span className="sr-only">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </label>
  )
}

/** Where a locked option unlocks, in words: "Libera no Ouro I (370 Σ)". */
export function unlockLine(S: Sigma, at: number) {
  return text.locked.replace("{rank}", S.ranque(at, LOCALE).nome).replace("{n}", number(at))
}

/**
 * An option their Σ hasn't reached yet: the swatch dimmed under a lock, with the emblem and the name of the rank that
 * unlocks it as a small badge. The sentence is its label, for whoever hovers or reads it out.
 */
export function LockedSwatch({ S, at, background, label }: { S: Sigma; at: number; background: string; label: string }) {
  const rank = S.ranque(at, LOCALE)
  const line = `${label}: ${unlockLine(S, at)}`
  return (
    <span role="img" aria-label={line} title={line} className="inline-flex h-8 items-center gap-1.5 border border-dashed border-line-strong pr-2">
      <span className="relative grid h-[30px] w-[30px] place-items-center" style={{ background }}>
        <span className="absolute inset-0 bg-ground/60" />
        <Lock aria-hidden className="relative h-3.5 w-3.5 text-navy" />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rank.emblema} alt="" className="h-5 w-5 object-contain" />
      <span className="text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-ink">{rank.nome}</span>
    </span>
  )
}
