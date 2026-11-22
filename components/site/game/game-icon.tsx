import { Gamepad2 } from "lucide-react"
import type { ComponentType } from "react"
import { Strawberry } from "@/components/site/celeste/glyphs"
import { Crosshair } from "@/components/site/game/crosshair"

/*
 * The game kit's two smallest pieces (brand/interface.md, "The game kit"), picked by the game's id: a new game is a new
 * entry here, not a new page. The other pieces: the card's art (game-card.tsx), the moment (game-home.tsx) and the
 * backdrop (backdrop.tsx, with each game's in agent-backdrop.tsx and roadmap/ball-backdrop.tsx).
 */

type Glyph = ComponentType<{ size?: number; className?: string }>

/** A tiny ball: Klein, with the panel seams of the real one. */
export function Ball({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={className ?? "block"}>
      <circle cx="6" cy="6" r="5.25" className="fill-paper stroke-klein" strokeWidth="1.5" />
      <path d="M6 3.2 8.4 4.9 7.5 7.7H4.5L3.6 4.9Z" className="fill-klein" />
    </svg>
  )
}

/** The other games' sign: a gamepad in Klein, on Branco so it covers a menu's rail as the ball does. */
export function Pad({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden className={className ?? "block"} style={{ width: size, height: size }}>
      <Gamepad2 className="block h-full w-full bg-paper text-klein" strokeWidth={size < 16 ? 2.5 : 2} />
    </span>
  )
}

/** The sign: the game wherever it's named (menus, cards, the agenda, the lives). */
const SIGNS: Record<string, Glyph> = { "rocket-league": Ball, valorant: Crosshair, diversos: Pad, celeste: Strawberry }

/**
 * The marker, "you are here": the dot on the menu's rail at the page being read, and on a game's home at the page
 * being pointed at. Today each game's marker is its sign; they're kept apart so one can change alone. (The rail of the
 * fundamentals has its own, larger: Rocket League's 3D ball, Valorant's crosshair.)
 */
const MARKERS: Record<string, Glyph> = { "rocket-league": Ball, valorant: Crosshair, diversos: Pad, celeste: Strawberry }

/** Each game's sign: Rocket League's ball, Valorant's crosshair, Celeste's strawberry, a gamepad for the other games ("diversos"). */
export function GameIcon({ game, size = 12, className }: { game: string; size?: number; className?: string }) {
  const Sign = SIGNS[game] ?? Pad
  return <Sign size={size} className={className} />
}

/** Each game's marker (see `MARKERS`). */
export function GameMarker({ game, size = 12, className }: { game: string; size?: number; className?: string }) {
  const Marker = MARKERS[game] ?? Pad
  return <Marker size={size} className={className} />
}
