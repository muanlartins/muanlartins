import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Every way to take part in the live from the chat: public/stream/comandos.json, the one list the site's
 * /canal/comandos, the stand's tips (torcida.html) and scripts/comandos.py (StreamElements, the Twitch panel) read.
 * Read at build time, so a change shows on the site with the next release.
 */
export interface Command {
  /** How to type it: "!pula". */
  comando: string
  /** Other ways that work: "!dança". */
  apelidos?: string[]
  /** How to show it, when it takes something after it: "!sigma ou !sigma @alguém". */
  uso?: string
  /** What it does. */
  texto: string
  /** The stand's tip, said by the channel's fan. */
  dica?: string
  /** The chat bot's answer (StreamElements). */
  resposta?: string
}

export interface CommandGroup {
  id: "arquibancada" | "var" | "bot"
  titulo: string
  texto: string
  nota?: string
  comandos: Command[]
}

export interface Commands {
  pagina: string
  grupos: CommandGroup[]
  recompensas: { titulo: string; texto: string; itens: { nome: string; custo: number; texto: string }[] }
  sigma: { titulo: string; texto: string; ganhos: { quanto: string; como: string }[] }
}

let read: Commands | undefined

export function commands(): Commands {
  read ??= JSON.parse(readFileSync(join(process.cwd(), "public", "stream", "comandos.json"), "utf8")) as Commands
  return read
}
