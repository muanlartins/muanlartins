// What a fan wears, as the 2D fan has it (public/stream/torcedor.js: TIMES, natal). Their club: picking one of TIMES
// puts its shirt on the look (comTime), which is saved, and they may change it after, as today. Santa's hat in December
// is put on only when it's drawn and never saved: the last step before drawing is criarBoneco(vestir(look, { natal })).
// Pure, like esquema.js.
import { normalizar } from "./esquema.js"

// Black is a dark grey: pure black vanishes against the navy outline and the darker arenas.
const PRETO = "#2b2f38"
const BRANCO = "#f4f5f7"
// The Série A clubs of 2026, their shirt in the fan's own patterns: colours and pattern, never a crest. The same list
// as the 2D fan's TIMES (scripts/torcedor3d.test.mjs fails when they drift), in its patterns' names.
export const TIMES = [
  { nome: "Athletico-PR", cor: "#e03131", detalhe: PRETO, roupa: "listrado" },
  { nome: "Atlético-MG", cor: BRANCO, detalhe: PRETO, roupa: "listras" },
  { nome: "Bahia", cor: BRANCO, detalhe: "#1f5fbf", terceira: "#e03131", roupa: "faixa-dupla" },
  { nome: "Botafogo", cor: BRANCO, detalhe: PRETO, roupa: "listras" },
  { nome: "Chapecoense", cor: "#1f9d55", detalhe: BRANCO, roupa: "gola" },
  { nome: "Corinthians", cor: BRANCO, detalhe: PRETO, roupa: "gola" },
  { nome: "Coritiba", cor: BRANCO, detalhe: "#1f7a4d", roupa: "listra" },
  { nome: "Cruzeiro", cor: "#1d4ed8", detalhe: BRANCO, roupa: "gola" },
  { nome: "Flamengo", cor: "#e03131", detalhe: PRETO, roupa: "listrado" },
  { nome: "Fluminense", cor: "#8b1e3f", detalhe: "#1f7a4d", terceira: BRANCO, roupa: "tricolor" },
  { nome: "Grêmio", cor: "#3b82f6", detalhe: PRETO, terceira: BRANCO, roupa: "tricolor" },
  { nome: "Internacional", cor: "#e03131", detalhe: BRANCO, roupa: "gola" },
  { nome: "Mirassol", cor: "#ffd23f", detalhe: "#1f7a4d", roupa: "gola" },
  { nome: "Palmeiras", cor: "#1f8a4c", detalhe: BRANCO, roupa: "gola" },
  { nome: "Red Bull Bragantino", cor: BRANCO, detalhe: "#e03131", roupa: "gola" },
  { nome: "Remo", cor: "#1e3a8a", detalhe: BRANCO, roupa: "gola" },
  { nome: "Santos", cor: BRANCO, detalhe: PRETO, roupa: "gola" },
  { nome: "São Paulo", cor: BRANCO, detalhe: "#e03131", terceira: PRETO, roupa: "faixa-dupla" },
  { nome: "Vasco", cor: BRANCO, detalhe: PRETO, roupa: "faixa" },
  { nome: "Vitória", cor: "#e03131", detalhe: PRETO, roupa: "listrado" },
]

// The 2D shirt's patterns on the 3D shirt, with the colours each needs to look the same: a single band is the chest
// band with its second stripe in the shirt's colour, the sash is solid, the collar is the V in the second colour.
const ESTAMPAS = {
  lisa: () => ({ roupa: "lisa" }),
  listra: (c) => ({ roupa: "peito", terceira: c.cor }),
  faixa: (c) => ({ roupa: "faixa", terceira: c.detalhe }),
  meio: () => ({ roupa: "metade" }),
  numero: (c) => ({ roupa: "lisa", numOn: true, numC: c.detalhe }),
  gola: (c) => ({ roupa: "lisa", gola: "v", golaC: c.detalhe }),
  listras: () => ({ roupa: "listras" }),
  listrado: () => ({ roupa: "listrado" }),
  tricolor: () => ({ roupa: "tricolor" }),
  "faixa-dupla": () => ({ roupa: "peito" }),
}
/** A 2D shirt ({ roupa, cor, detalhe, terceira } as torcedor.js has them) as the 3D shirt's fields. */
export function camisa2D({ roupa, cor, detalhe, terceira }) {
  const c = { cor, detalhe, terceira: terceira ?? detalhe }
  return { ...c, golaC: detalhe, ...(ESTAMPAS[roupa] ?? ESTAMPAS.lisa)(c) }
}

/** The club of TIMES whose name this is, or null (any other team is just a name). */
export const clube = (nome) => TIMES.find((t) => t.nome === nome) ?? null
/** Their team picked: a club of TIMES dresses the shirt in its colours and pattern (they may change it after). */
export function comTime(look, nome) {
  const time = clube(nome)
  return { ...look, time: nome, ...(time ? camisa2D(time) : {}) }
}

// December's Santa hat (boneco.js draws "touca", which is no option in ESQUEMA: no profile can keep it).
export const TOUCA = { chapeu: "touca", chapC: "#e03131", chapC2: BRANCO, chapY: 0, chapR: 0, chapT: 1 }
/** Whether it's December in Brasília, when the stand wears Santa's hat: torcedor.js's natal(). */
export const natal = (agora = Date.now()) => new Date(agora).toLocaleDateString("en-US", { timeZone: "America/Sao_Paulo", month: "numeric" }) === "12"

/**
 * The look to draw: Santa's hat with `natal` (over any hat; a raised hood comes down for it). Takes a saved look or a
 * whole one and gives a whole one; never save what it returns.
 */
export function vestir(look, { natal: comTouca = false } = {}) {
  const a = normalizar(look)
  if (comTouca) Object.assign(a, TOUCA, a.capuz === "levantado" ? { capuz: "abaixado" } : {})
  return a
}
