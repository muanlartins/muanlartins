import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Catalog } from "@/lib/valorant-catalog"

let read: Catalog | undefined

/** The whole catalogue, read at build time; pages pass only the part they start with (`subset`) to the browser. */
export function catalog(): Catalog {
  read ??= JSON.parse(readFileSync(join(process.cwd(), "public", "valorant", "catalogo.json"), "utf8")) as Catalog
  return read
}
