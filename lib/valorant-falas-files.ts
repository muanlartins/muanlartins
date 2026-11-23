import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Falas } from "@/lib/valorant-falas"

/** An agent's voice lines, read at build time; undefined when it has none yet. */
export function falasDe(agent: string): Falas | undefined {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "content", "valorant-universo", "falas", `${agent}.json`), "utf8")) as Falas
  } catch {
    return undefined
  }
}
