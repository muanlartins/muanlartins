// Every camera filter, in the Filtros dock's order: one folder each under filtros/, whose index.js says what the
// filter is (`filtros`: the dock's entry and the page's) and, when it does something of its own, how (`criar`).
// The procedure for a new one is README.md beside this file. A filter that's only a look on him (a model on his head
// and shoulders, no abilities) needs no folder: it's an entry in visuais.js.
export const MODULOS = ["phoenix", "sage", "sova", "carros", "bola", "celeste", "john", "sigma", "pop", "lente"]

// Each folder's filters, with the module they came from (`modulo`) and their look (`visual`, from visuais.js),
// then the looks that have no folder of their own.
export async function lista() {
  const { VISUAIS } = await import("./visuais.js")
  const mods = await Promise.all(MODULOS.map((nome) => import(`./${nome}/index.js`).then((mod) => ({ nome, mod }))))
  const out = mods.flatMap(({ nome, mod }) => mod.filtros.map((f) => ({ ...f, modulo: nome, visual: VISUAIS[f.id] })))
  for (const [id, v] of Object.entries(VISUAIS)) if (!out.some((f) => f.id === id)) out.push({ id, nome: v.nome || id, jogo: v.jogo || "Outros", rosto: v.rosto, visual: v })
  // An archived game's filters stay working but off the dock (`fora`): Valorant's since 2026-11-24.
  return out.map((f) => (ARQUIVADOS.includes(f.jogo) ? { ...f, fora: true } : f))
}

// Games whose filters the dock no longer lists (archived, to come back): their folders stay as they are.
export const ARQUIVADOS = ["Valorant"]
