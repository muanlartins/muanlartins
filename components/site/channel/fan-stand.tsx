"use client"

import { useEffect, useRef, useState } from "react"
import { Arquibancada, type Lugar } from "@/components/site/fan/arquibancada"
import { cn } from "@/lib/utils"

/** Made-up fans in the stand's presets (lib/torcedor3d.ts MODELOS), with made-up names. */
const PEOPLE: [string, string][] = [
  ["rafa", "Organizada"],
  ["bia.lima", "Black power"],
  ["tiago.mendes", "Gamer"],
  ["ceci", "Festeira"],
  ["otto", "Barbudo"],
  ["ana_clara", "Veterana"],
]

/**
 * A few fans of the stream's stand on a row of it, as the live draws it since the 3D fans: names on the riser. Still at
 * rest, as the site is; when the link around it is hovered or focused, the stand celebrates in a wave, each their own
 * way, as on the live after a goal. A narrow box seats fewer (a phone, four).
 */
export function FanStand({ count = PEOPLE.length, names = true, className }: { /** The first few only. */ count?: number; names?: boolean; className?: string }) {
  const [party, setParty] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const link = ref.current?.closest("a")
    if (!link) return
    const on = () => setParty((n) => n + 1)
    link.addEventListener("pointerenter", on)
    link.addEventListener("focusin", on)
    return () => {
      link.removeEventListener("pointerenter", on)
      link.removeEventListener("focusin", on)
    }
  }, [])

  return (
    <div ref={ref} className={cn("absolute inset-0", className)}>
      <Arquibancada
        porFila={count}
        filas={1}
        nomes={names}
        lugares={PEOPLE.slice(0, count).map(
          ([login, modelo], i): Lugar => ({
            id: login,
            fan: { modelo, login, acoes: ["festa"], momento: party ? { tipo: "festa", vez: party, atraso: i * 80 } : null },
            nome: login,
          }),
        )}
      />
    </div>
  )
}
