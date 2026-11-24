"use client"

import { motion } from "motion/react"
import { useState, type CSSProperties } from "react"
import { CommandName } from "@/components/site/channel/command-name"
import { defRowClass } from "@/components/site/docs"
import { Arquibancada, type Lugar } from "@/components/site/fan/arquibancada"
import type { Momento } from "@/components/site/fan/torcedor-3d"
import type { Command } from "@/lib/commands"

/**
 * Made-up people filling the stand: two rows of ten, as the live seats them at most. Some in the stand's presets
 * (lib/torcedor3d.ts MODELOS), the rest with the fan their name gives them; long names to show how the riser cuts them.
 */
const PEOPLE: [string, string?][] = [
  ["capivara_cansada", "Organizada"],
  ["bia", "Black power"],
  ["torcedor_da_madrugada", "Gamer"],
  ["nina"],
  ["raul_aereo", "Tiozão"],
  ["livia", "Rainha"],
  ["mira_de_pao", "Robô"],
  ["otto"],
  ["teca", "Festeira"],
  ["breno_bobo", "Barbudo"],
  ["iara", "Elfa maga"],
  ["sol"],
  ["duda_gol", "Caramelo"],
  ["tobias"],
  ["malu_gamer", "De outro planeta"],
  ["igor"],
  ["lola_lulu", "Veterana"],
  ["enzo", "Dragão"],
  ["cida"],
]
/** The stand's commands (comandos.js) as the reader's fan's moments; !ola goes along everyone from them. */
const MOVES: Record<string, Momento> = { pula: "pula", danca: "danca", comemora: "festa", grito: "grito" }

/**
 * The stand's commands as a list, each a button that plays it on the stand as the live draws it, full: "you" in the
 * front row jump, dance, celebrate your own way or shout; !ola goes along everyone, out from you.
 */
export function StandDemo({ commands, you, hint, shout, also, term }: { commands: Command[]; you: string; hint: string; shout: string; also: string; term: string }) {
  const [played, setPlayed] = useState<{ move: string; n: number } | null>(null)
  const play = (comando: string) => setPlayed((p) => ({ move: comando.slice(1), n: (p?.n ?? 0) + 1 }))
  const tipo = played ? MOVES[played.move] : undefined

  const me: Lugar = {
    id: "voce",
    voce: true,
    nome: you,
    fan: {
      modelo: "Punk",
      login: "voce",
      acoes: ["pula", "danca", "festa", "grito", "ola"],
      momento: tipo && played ? { tipo, vez: played.n } : null,
    },
    acima:
      played?.move === "grito" ? (
        // The live's chat balloon: paper, a navy edge, cut at 45°.
        <motion.span
          key={played.n}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -4] }}
          transition={{ duration: 2.6, times: [0, 0.1, 0.85, 1] }}
          className="cut-sm cut-edge relative block border-2 border-navy bg-paper px-3 py-1.5 text-[18px] font-medium whitespace-nowrap text-navy"
        >
          {shout}
        </motion.span>
      ) : undefined,
  }

  return (
    <div className="space-y-4">
      {/* Wider than the text, into the gutters (brand/interface.md, "Layout"): ten seats a row with room for names. */}
      <div className="cut relative -mx-6 h-[330px] overflow-hidden bg-navy">
        <Arquibancada
          frente
          topo={44}
          onda={played?.move === "ola" ? played.n : undefined}
          lugares={[me, ...PEOPLE.map(([login, modelo]): Lugar => ({ id: login, nome: login, fan: { login, modelo, acoes: ["ola"] } }))]}
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
