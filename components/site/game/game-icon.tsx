import { Crosshair } from "@/components/site/game/crosshair"

/** Each game's sign, wherever a game is named: Rocket League's ball, Valorant's crosshair. */
export function GameIcon({ game, size = 12, className }: { game: string; size?: number; className?: string }) {
  if (game === "valorant") return <Crosshair size={size} className={className} />
  return <Ball size={size} className={className} />
}

/** A tiny ball: Klein, with the panel seams of the real one. */
export function Ball({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={className ?? "block"}>
      <circle cx="6" cy="6" r="5.25" className="fill-paper stroke-klein" strokeWidth="1.5" />
      <path d="M6 3.2 8.4 4.9 7.5 7.7H4.5L3.6 4.9Z" className="fill-klein" />
    </svg>
  )
}
