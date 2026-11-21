"use client"

import { useEffect, useRef, useState } from "react"
import { FanView } from "@/components/site/profile/fan-view"
import type { Choice, Torcedor } from "@/lib/profile"
import { cn } from "@/lib/utils"

/** Made-up viewers, some with a fan of their own and some with the one their login gives them. */
const PEOPLE: [string, Choice?][] = [
  ["rafa", { cabeca: "redonda", acessorio: "bone", comemoracao: "pula" }],
  ["bia.lima"],
  ["tiago.mendes", { roupa: "numero", numero: 7, acessorio: "cachecol", comemoracao: "danca" }],
  ["ceci"],
  ["otto", { cabeca: "hexagono", acessorio: "coroa", comemoracao: "gira" }],
  ["ana_clara", { roupa: "faixa", acessorio: "oculos", comemoracao: "bananeira" }],
]

let loading: Promise<Torcedor | null> | undefined

/**
 * torcedor.js, the stream crowd's drawing, loaded once for every fan on the page (two `next/script`s of one file don't
 * both hear it load), with its stylesheet.
 */
export function useTorcedor() {
  const [kit, setKit] = useState<Torcedor | null>(null)
  useEffect(() => {
    if (!document.querySelector('link[href="/stream/torcedor.css"]')) {
      const css = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/stream/torcedor.css" })
      document.head.append(css)
    }
    loading ??= new Promise((resolve) => {
      if (window.Torcedor) return resolve(window.Torcedor)
      const script = Object.assign(document.createElement("script"), { src: "/stream/torcedor.js", async: true })
      script.onload = () => resolve(window.Torcedor ?? null)
      script.onerror = () => {
        loading = undefined
        resolve(null)
      }
      document.head.append(script)
    })
    let on = true
    loading.then((found) => on && setKit(found))
    return () => {
      on = false
    }
  }, [])
  return kit
}

/**
 * A few fans of the stream's stand, drawn by torcedor.js, on the stand's Klein strip (a true 45° at its ends: as tall
 * as it's cut). Still at rest, as the site is; when the link around it is hovered or focused, the stand celebrates in
 * a wave, as on the live after a goal. Phones show the first four. The names sit at the top, out of the jumps' way.
 */
export function FanStand({ count = PEOPLE.length, names = true, className }: { /** The first few only. */ count?: number; names?: boolean; className?: string }) {
  const T = useTorcedor()
  const [party, setParty] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const link = ref.current?.closest("a")
    if (!link) return
    const on = () => setParty(true)
    const off = () => setParty(false)
    link.addEventListener("pointerenter", on)
    link.addEventListener("pointerleave", off)
    link.addEventListener("focusin", on)
    link.addEventListener("focusout", off)
    return () => {
      link.removeEventListener("pointerenter", on)
      link.removeEventListener("pointerleave", off)
      link.removeEventListener("focusin", on)
      link.removeEventListener("focusout", off)
    }
  }, [])

  return (
    <div ref={ref} className={cn("absolute inset-0", className)}>
      <div className="absolute inset-x-0 bottom-0 h-4 bg-klein [clip-path:polygon(16px_0,calc(100%-16px)_0,100%_100%,0_100%)]" />
      {T && (
        <ul className={cn("absolute inset-x-3 bottom-4 top-3 flex justify-around", party && "festa")}>
          {PEOPLE.slice(0, count).map(([login, choice], i) => (
            <li key={login} className={cn("flex flex-col items-center justify-end", names && "justify-between", i > 3 && "hidden sm:flex")} style={{ ["--x" as string]: i * 110 }}>
              {names && <span className="whitespace-nowrap bg-navy/80 px-1.5 py-px text-[12px] font-medium text-paper">{login}</span>}
              <FanView T={T} fan={T.normalizar(choice ?? null, login)} className="h-12 w-8 sm:h-[54px] sm:w-9" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
