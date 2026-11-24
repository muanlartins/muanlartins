"use client"

import { cn } from "@/lib/utils"

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
