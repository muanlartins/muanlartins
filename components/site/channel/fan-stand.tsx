"use client"

import Script from "next/script"
import { useEffect, useState } from "react"
import { FanView } from "@/components/site/profile/fan-view"
import type { Choice, Torcedor } from "@/lib/profile"

/** Made-up viewers, some with a fan of their own and some with the one their login gives them. */
const PEOPLE: [string, Choice?][] = [
  ["rafa", { cabeca: "redonda", acessorio: "bone", comemoracao: "pula" }],
  ["bia.lima"],
  ["tiago.mendes", { roupa: "numero", numero: 7, acessorio: "cachecol", comemoracao: "danca" }],
  ["ceci"],
  ["otto", { cabeca: "hexagono", acessorio: "coroa", comemoracao: "gira" }],
  ["kingkong"],
  ["ana_clara", { roupa: "faixa", acessorio: "oculos", comemoracao: "bananeira" }],
]

/** A few fans of the stream's stand, drawn by torcedor.js, each celebrating now and then. */
export function FanStand() {
  const [T, setT] = useState<Torcedor | null>(null)
  const [moving, setMoving] = useState(-1)

  useEffect(() => {
    if (!T || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let last = -1
    const timer = setInterval(() => {
      // A phone shows only the first four.
      const shown = matchMedia("(min-width: 640px)").matches ? PEOPLE.length : 4
      let next = Math.floor(Math.random() * shown)
      if (next === last) next = (next + 1) % shown
      last = next
      setMoving(next)
    }, 2600)
    return () => clearInterval(timer)
  }, [T])

  return (
    <div className="relative h-[120px] overflow-hidden rounded-md border border-line bg-paper/70">
      {/* The same drawing and moves as the stream's crowd; React hoists the stylesheet into the head. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <div
        className="absolute inset-x-0 bottom-0 h-5 bg-klein"
        style={{ clipPath: "polygon(16px 0, calc(100% - 16px) 0, 100% 100%, 0 100%)" }}
      />
      {T && (
        <ul className="absolute inset-x-3 bottom-3 flex justify-around">
          {PEOPLE.map(([login, choice], i) => (
            <li key={login} className={i > 3 ? "hidden sm:block" : undefined}>
              <div className="relative h-[60px] w-10">
                <span className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap bg-navy/80 px-1.5 py-px text-[11px] font-semibold text-paper">
                  {login}
                </span>
                <FanView
                  T={T}
                  fan={T.normalizar(choice ?? null, login)}
                  move={i === moving ? "comemora" : undefined}
                  className="h-full w-full"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
