"use client"

import { motion } from "motion/react"
import Script from "next/script"
import { useState, type CSSProperties } from "react"
import { CommandName } from "@/components/site/channel/command-name"
import { defRowClass } from "@/components/site/docs"
import { FanView } from "@/components/site/profile/fan-view"
import type { Command } from "@/lib/commands"
import type { Choice, Torcedor } from "@/lib/profile"

/** Made-up viewers around "you", in the middle, who does what's picked. */
const PEOPLE: [string, Choice?][] = [
  ["rafa", { cabeca: "redonda", acessorio: "bone", comemoracao: "pula" }],
  ["bia.lima"],
  ["voce", { roupa: "numero", numero: 10, acessorio: "cachecol", comemoracao: "gira" }],
  ["otto", { cabeca: "hexagono", acessorio: "coroa", comemoracao: "danca" }],
  ["ceci"],
]
const YOU = 2
/** The stand's moves (comandos.js): a class on the fan, drawn by torcedor.css. */
const MOVES = new Set(["pula", "danca", "comemora"])

/**
 * The stand's commands as a list, each a button that plays it on a few sample fans drawn by torcedor.js, with the
 * same moves as the live's stand: "you" jump, dance, celebrate or shout; !ola goes along everyone.
 */
export function StandDemo({ commands, you, hint, shout, also, term }: { commands: Command[]; you: string; hint: string; shout: string; also: string; term: string }) {
  const [T, setT] = useState<Torcedor | null>(null)
  const [played, setPlayed] = useState<{ move: string; n: number } | null>(null)
  const play = (comando: string) => setPlayed((p) => ({ move: comando.slice(1), n: (p?.n ?? 0) + 1 }))

  return (
    <div className="space-y-4">
      <div className="cut cut-edge relative h-[150px] overflow-hidden border border-line bg-paper/70">
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
        <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
        {/* The stand's step: its ends at a true 45° (as tall as they're cut). */}
        <div className="absolute inset-x-0 bottom-0 h-5 bg-klein" style={{ clipPath: "polygon(20px 0, calc(100% - 20px) 0, 100% 100%, 0 100%)" }} />
        {T && (
          <ul className="absolute inset-x-3 bottom-3 flex justify-around">
            {PEOPLE.map(([login, choice], i) => {
              const move = played && (played.move === "ola" ? "ola" : i === YOU && MOVES.has(played.move) ? played.move : undefined)
              return (
                <li key={login} className={i === 0 || i === PEOPLE.length - 1 ? "hidden sm:block" : undefined}>
                  <div className="relative h-[60px] w-10" style={{ "--atraso-ola": `${Math.abs(i - YOU) * 140}ms` } as CSSProperties}>
                    <span
                      className={`absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-px text-[12px] font-semibold ${i === YOU ? "bg-paper text-klein ring-1 ring-klein" : "bg-navy/80 text-paper"}`}
                    >
                      {i === YOU ? you : login}
                    </span>
                    {i === YOU && played?.move === "grito" && (
                      <motion.span
                        key={played.n}
                        initial={{ opacity: 0, y: 6, x: "-50%" }}
                        animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -4], x: "-50%" }}
                        transition={{ duration: 2.6, times: [0, 0.1, 0.85, 1] }}
                        className="absolute bottom-[calc(100%+34px)] left-1/2 z-10 whitespace-nowrap bg-klein px-3 py-1 text-[14px] font-medium text-paper"
                      >
                        {shout}
                      </motion.span>
                    )}
                    <FanView
                      key={move ? `${move}-${played?.n}` : "parado"}
                      T={T}
                      fan={T.normalizar(choice ?? null, login)}
                      move={move ?? undefined}
                      className="h-full w-full"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <p className="text-[13px] text-muted">{hint}</p>
      <ul className="divide-y divide-line border-y border-line" style={{ "--term": term } as CSSProperties}>
        {commands.map((c) => (
          <li key={c.comando}>
            <button type="button" onClick={() => play(c.comando)} className={`group w-full text-left focus-visible:outline-offset-0 ${defRowClass()}`}>
              <CommandName command={c} also={also} interactive />
              <span className="text-[15px] leading-[1.6] text-ink">{c.texto}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
