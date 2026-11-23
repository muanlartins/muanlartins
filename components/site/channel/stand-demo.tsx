"use client"

import { motion } from "motion/react"
import { useState, type CSSProperties } from "react"
import { CommandName } from "@/components/site/channel/command-name"
import { defRowClass } from "@/components/site/docs"
import { Arquibancada, type Lugar } from "@/components/site/fan/arquibancada"
import type { Momento } from "@/components/site/fan/torcedor-3d"
import type { Command } from "@/lib/commands"

/** Made-up fans in the stand's presets (lib/torcedor3d.ts MODELOS) around "you", in the middle, who does what's picked. */
const PEOPLE: [string, string][] = [
  ["rafa", "Organizada"],
  ["bia.lima", "Rainha"],
  ["voce", "Punk"],
  ["otto", "Robô"],
  ["ceci", "Caramelo"],
]
const YOU = 2
/** The stand's commands (comandos.js) as the fan's moments; !ola goes along everyone. */
const MOVES: Record<string, Momento> = { pula: "pula", danca: "danca", comemora: "festa", grito: "grito" }

/**
 * The stand's commands as a list, each a button that plays it on a row of sample fans drawn as the live's stand draws
 * them, with the same moves: "you" jump, dance, celebrate their own way or shout; !ola goes along everyone.
 */
export function StandDemo({ commands, you, hint, shout, also, term }: { commands: Command[]; you: string; hint: string; shout: string; also: string; term: string }) {
  const [played, setPlayed] = useState<{ move: string; n: number } | null>(null)
  const play = (comando: string) => setPlayed((p) => ({ move: comando.slice(1), n: (p?.n ?? 0) + 1 }))

  return (
    <div className="space-y-4">
      <div className="cut cut-edge relative h-[150px] overflow-hidden border border-line bg-paper/70">
        <Arquibancada
          degrau={20}
          folga={40}
          lugares={PEOPLE.map(([login, modelo], i): Lugar => {
            const mine = i === YOU
            const tipo = played?.move === "ola" ? "ola" : mine && played ? MOVES[played.move] : undefined
            return {
              id: login,
              voce: mine,
              nome: mine ? you : login,
              className: i === 0 || i === PEOPLE.length - 1 ? "hidden sm:block" : undefined,
              fan: {
                modelo,
                login,
                acoes: mine ? ["pula", "danca", "festa", "grito", "ola"] : ["ola"],
                momento: tipo && played ? { tipo, vez: played.n, atraso: tipo === "ola" ? Math.abs(i - YOU) * 140 : 0 } : null,
              },
              acima:
                mine && played?.move === "grito" ? (
                  // The live's chat balloon: paper, a navy edge, cut at 45°.
                  <motion.span
                    key={played.n}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -4] }}
                    transition={{ duration: 2.6, times: [0, 0.1, 0.85, 1] }}
                    className="cut-sm cut-edge relative mb-1 block border border-navy bg-paper px-3 py-1 text-[14px] font-medium whitespace-nowrap text-navy"
                  >
                    {shout}
                  </motion.span>
                ) : undefined,
            }
          })}
        />
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
