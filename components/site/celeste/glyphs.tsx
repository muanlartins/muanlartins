/** Celeste's own pieces of the game kit (brand/interface.md), drawn in the brand's tokens: none of the game's art. */

/** A strawberry: Celeste's sign and marker, as the ball is Rocket League's. */
export function Strawberry({ size = 12, className, onDark = false }: { size?: number; className?: string; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className={className ?? "block"}>
      <path d="M3 2.8H9L11 4.2V6.2L7.4 10.8 6 11.6 4.6 10.8 1 6.2V4.2Z" className={onDark ? "fill-paper" : "fill-klein"} />
      <path d="M1.6 2.2 4.2 2.4 4.6 0.3 6 1.9 7.4 0.3 7.8 2.4 10.4 2.2 8 3.8 6 4.4 4 3.8Z" className={onDark ? "fill-klein-claro" : "fill-navy"} />
      <path
        d="M2.5 5v1 M4.5 5.4v1 M7.5 5.4v1 M9.5 5v1 M3.5 7.2v1 M6 6.6v1 M8.5 7.2v1 M5 8.8v1 M7 8.8v1"
        className={onDark ? "stroke-klein" : "stroke-paper"}
        strokeWidth="0.6"
      />
    </svg>
  )
}

/** The mountain in straight cuts, on a 600 × 330 stage: the hero's with the range round it, the backdrop's alone. */
export function MountainShape({ range = false }: { range?: boolean }) {
  return (
    <>
      {range && (
        <>
          <path d="M0 330 74 224 108 246 168 158 250 330Z" className="fill-navy" opacity="0.45" />
          <path d="M430 330 506 180 546 216 600 164V330Z" className="fill-navy" opacity="0.45" />
        </>
      )}
      <path d="M40 330 166 222 206 236 262 142 290 154 360 44 410 112 432 104 486 190 506 186 582 330Z" className="fill-navy" />
      <path d="M360 44 410 112 388 106 370 126 352 100 334 118 314 116Z" className="fill-paper" />
      <path d="M262 142 290 154 280 172 268 160 250 162Z" className="fill-paper" opacity="0.8" />
    </>
  )
}
