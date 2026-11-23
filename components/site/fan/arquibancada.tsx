import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { Torcedor3D } from "@/components/site/fan/torcedor-3d"
import { cn } from "@/lib/utils"

/** Someone on the stand: their fan as <Torcedor3D> takes it, their name on the riser and what floats over them. */
export interface Lugar {
  id: string
  fan: Omit<ComponentProps<typeof Torcedor3D>, "className">
  nome?: ReactNode
  /** The reader's own seat: their name in Klein claro, as the live's stand marks "Você". */
  voce?: boolean
  /** Over their head (a shout's balloon, stickers), placed from the fan's top. */
  acima?: ReactNode
  /** On the seat's column, e.g. "hidden sm:flex" to leave it out on phones. */
  className?: string
}

/**
 * One row of the live's stand on the site, as torcida.html draws it since the 3D fans: the row's back cut at 45° on
 * its top corners, a seat behind each fan (Klein, every fourth Klein claro), the fans standing behind the riser, and
 * the navy riser with its Klein claro edge carrying their names. It fills the box `className` gives it; `degrau` is
 * the riser's height and `folga` the room kept over the fans (names never go there: they're on the riser).
 */
export function Arquibancada({ lugares, degrau = 18, folga = 16, className }: { lugares: Lugar[]; degrau?: number; folga?: number; className?: string }) {
  const resto = `(100% - ${degrau + folga}px)`
  return (
    <div className={cn("absolute inset-0", className)}>
      {/* The row's back, behind the seats: Klein sunk into navy, as the live's. */}
      <div
        aria-hidden
        className="absolute inset-x-1.5 bg-[color-mix(in_oklab,var(--color-klein)_45%,var(--color-navy))]"
        style={{ bottom: degrau, height: `calc(${resto} * 0.38)`, clipPath: "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%, 0 12px)" }}
      />
      <ul className="absolute inset-x-1.5 inset-y-0 flex">
        {lugares.map((l, i) => (
          <li key={l.id} className={cn("relative flex-1", l.className)}>
            <span
              aria-hidden
              className={cn("cut-sm absolute inset-x-[10%]", i % 4 === 0 ? "bg-klein-claro" : "bg-klein")}
              style={{ bottom: degrau, height: `calc(${resto} * 0.27)` }}
            >
              <span className="absolute inset-x-1 top-[5px] h-0.5 bg-navy/45" />
            </span>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: degrau - 3, height: `calc(${resto} + 3px)`, aspectRatio: "2 / 3" }}>
              {l.acima && <div className="absolute bottom-full left-1/2 z-30 -translate-x-1/2">{l.acima}</div>}
              <Torcedor3D {...l.fan} className="h-full w-full" />
            </div>
            {l.nome && (
              <span
                className={cn(
                  "absolute inset-x-0.5 bottom-0 z-20 flex items-center justify-center text-[12px] leading-none font-semibold",
                  l.voce ? "text-klein-claro" : "text-paper",
                )}
                style={{ height: degrau } as CSSProperties}
              >
                <span className="truncate">{l.nome}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      {/* The riser, over the busts' base, its edge in Klein claro and its bottom corners cut. */}
      <div
        aria-hidden
        className="absolute inset-x-1.5 bottom-0 z-10 border-t-2 border-klein-claro bg-navy"
        style={{ height: degrau, clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px))" }}
      />
    </div>
  )
}
