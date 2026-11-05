// The word filter for what goes on stream from a Pix: the name, the message, and the transcript of a recorded
// one. Each word is compared without accents, digits read as letters ("v1ad0"), and repeated letters folded
// ("viaaado"), against the start of each entry; a hit becomes "•••" and marks the text dirty, so a recording
// with one never plays (its transcript is read by the chosen voice instead). Everyday swearing ("porra",
// "puta jogada") passes: this is for slurs, hate and the explicitly sexual. Add to it as the chat teaches us.

const PALAVRAS = [
  // slurs
  "viado", "viadinh", "viadao", "bichona", "traveco", "sapatao", "crioul", "macaquinh", "retardad", "mongoloid",
  "nigger", "nigga", "faggot",
  // hate
  "nazis", "hitler", "heil", "estupr",
  // sexual
  "buceta", "xoxota", "piroca", "arrombad", "vagabund", "cuzao", "fdp",
]

const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" }
const normal = (palavra) =>
  palavra
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/(.)\1+/g, "$1")
const ALVOS = PALAVRAS.map(normal)

/** The text with every filtered word as "•••", and whether there was any. */
export function filtrar(texto) {
  let sujo = false
  const limpo = String(texto ?? "").replace(/[\p{L}\p{N}@$]+/gu, (palavra) => {
    const n = normal(palavra)
    if (!ALVOS.some((alvo) => n.startsWith(alvo))) return palavra
    sujo = true
    return "•••"
  })
  return { texto: limpo, sujo }
}
