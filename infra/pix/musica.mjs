// A Pix's song: the viewer picks a style and says what the song is about (or writes its lyrics); Google's Lyria 3.5
// sings it in Portuguese. Tested 2026-11-10 (Downloads\teste-musica-ia): 19–29 s to make, 66–87 s long whatever
// length is asked (the stream cuts it at 60 s), about −12 LUFS, US$ 0,08 a song. Lyria refuses a singer's voice by
// name in a second (HTTP 400 prohibited_content) but sang a famous song's lyrics, so before the Pix a quick check by
// Gemini Flash turns down artists, existing lyrics, hate and attacks on real people (fails open: Lyria still filters).
//
// Everything here is plain functions over `fetch`, so index.test.mjs can run them against a fake Google.

const API = "https://generativelanguage.googleapis.com/v1beta"
const LYRIA = "lyria-3.5"
const REVISAO = "2026-05-20" // the Interactions API's Api-Revision
const REVISOR = "gemini-3.5-flash"

/** The styles on the form (content/pix.ts names them): the musical direction is ours, so nobody names an artist. */
export const ESTILOS = {
  funk: "funk carioca, 130 BPM, batida de tamborzão, grave pesado, voz masculina animada",
  sertanejo: "sertanejo universitário, violão e sanfona, duas vozes masculinas em terça, 90 BPM, clima de festa",
  pagode: "pagode de roda, cavaquinho, pandeiro, tantã e banjo, voz masculina, clima de churrasco com os amigos",
  forro: "forró pé de serra, sanfona, zabumba e triângulo, voz feminina, 120 BPM, dançante",
  rock: "rock pesado, guitarras distorcidas, bateria rápida, voz rasgada, 150 BPM, energia de estádio",
  rap: "rap brasileiro, batida boom bap, 90 BPM, rimas bem marcadas, voz masculina",
  eletronica: "música eletrônica, house animado, 124 BPM, sintetizadores brilhantes, refrão pra pular, voz feminina",
  pop: "pop brasileiro, 110 BPM, refrão grudento, produção moderna, voz feminina",
}
export const SOBRE_MAX = 120
export const LETRA_MAX = 800
export const MINIMO_MUSICA = 500 // R$ 5,00
/** After a refusal, the viewer may change the text this many more times, within ESPERA; then it plays as a plain alert. */
export const EDICOES = 2
export const ESPERA = 10 * 60_000
/** A song still "gerando" after this was lost (every retry died): the dock can make it again. */
export const PERDIDA = 10 * 60_000

const linha = (s, max) => [...String(s ?? "").replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()
const texto = (s, max) =>
  [...String(s ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()].slice(0, max).join("").trim()

/** What the form sent, cleaned: { estilo, sobre } or { estilo, letra }; or { erro } for the viewer. */
export function pedidoDe(p) {
  if (!p || typeof p !== "object") return { erro: "Escolha o estilo e diga sobre o que é a música." }
  if (!Object.hasOwn(ESTILOS, p.estilo)) return { erro: "Escolha um dos estilos." }
  const letra = texto(p.letra, LETRA_MAX + 1)
  const sobre = linha(p.sobre, SOBRE_MAX + 1)
  if (letra) return letra.length > LETRA_MAX ? { erro: `A letra vai até ${LETRA_MAX} caracteres.` } : { estilo: p.estilo, letra }
  if (sobre) return sobre.length > SOBRE_MAX ? { erro: `O tema vai até ${SOBRE_MAX} caracteres.` } : { estilo: p.estilo, sobre }
  return { erro: "Diga sobre o que é a música, ou escreva a letra." }
}

/** What Lyria is asked: our direction for the style, then the viewer's theme or lyrics, kept apart as Google advises. */
export function pedidoLyria({ estilo, sobre, letra }) {
  const inicio = `Crie uma música de cerca de 60 segundos, cantada em português do Brasil.\nEstilo: ${ESTILOS[estilo]}.\n`
  if (letra) return `${inicio}Cante exatamente esta letra:\n\n${letra}`
  return (
    `${inicio}Sobre o que a letra fala: ${sobre}.\n` +
    "Letra simples e divertida, no tom do pedido, com um refrão curto e fácil de cantar junto. " +
    "É um presente de um espectador para a live do Luan, um streamer de jogos."
  )
}

/** Lyria's text, "[[A0]]\n[:] Liguei a live…", as lyrics: a blank line between sections. */
export function letraLimpa(t) {
  const linhas = []
  for (const l of String(t ?? "").split("\n")) {
    if (/^\s*\[\[[^\]]*\]\]\s*$/.test(l)) {
      if (linhas.length && linhas.at(-1) !== "") linhas.push("")
      continue
    }
    const v = l.replace(/^\s*\[[^\]]*\]\s*/, "").trim()
    if (v) linhas.push(v)
  }
  while (linhas.at(-1) === "") linhas.pop()
  return linhas.join("\n").slice(0, 3000)
}

/** The song's state as everyone should see it: a refusal nobody fixed in time, or a song lost on the way, gave up. */
export function estadoDe(m, agora = Date.now()) {
  if (!m) return null
  if (m.estado === "recusada" && agora - (m.recusadaEm ?? 0) > ESPERA) return "falhou"
  if (m.estado === "gerando" && agora - (m.pedidoEm ?? 0) > PERDIDA) return "falhou"
  return m.estado
}

const REVISAO_REGRAS = `Você revisa pedidos de música feitos por espectadores da live do Luan (canal muanlartins), um streamer brasileiro de Rocket League e Valorant. A música é gerada por IA e toca na live. Responda só com o JSON pedido.

Recuse (ok = false) quando o pedido:
1. cita um cantor, banda, compositor ou outro artista real, ou pede a voz ou o jeito de cantar de alguém pelo nome. "Luan" sozinho é o streamer e pode; "Luan Santana" é um cantor e não pode.
2. traz a letra de uma música que já existe (mesmo um trecho reconhecível), ou pede para cantar uma música conhecida.
3. tem discurso de ódio, preconceito, ofensa a grupos, conteúdo sexual, violência real, ou incentivo a algo ilegal.
4. ataca, humilha ou expõe uma pessoa real que não seja o Luan (alguém do chat, famosos, políticos), ou faz propaganda política.

Pode (ok = true): zoar o Luan e as jogadas dele, palavrão do dia a dia, falar dos jogos, do chat, da torcida, de quem pediu, de times de futebol, de memes.

Se recusar, "motivo" é uma frase curta e simpática em português, falando direto com quem pediu, dizendo o que mudar, sem repetir palavrões ou ofensas do pedido. Se aceitar, "motivo" fica vazio.`

/**
 * Gemini Flash's verdict before the Pix: { ok: true } or { ok: false, motivo }. Any trouble reaching it lets the
 * order through ({ ok: true, sem: reason }): Lyria's own filter and the edit after a refusal still stand behind it.
 */
export async function revisar(pedido, { chave, fetch: buscar = fetch, prazo = 8000 }) {
  const corpo = {
    systemInstruction: { parts: [{ text: REVISAO_REGRAS }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(pedido) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: { type: "OBJECT", properties: { ok: { type: "BOOLEAN" }, motivo: { type: "STRING" } }, required: ["ok", "motivo"] },
      temperature: 0,
    },
  }
  try {
    const r = await buscar(`${API}/models/${REVISOR}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(prazo),
    })
    if (!r.ok) return { ok: true, sem: `HTTP ${r.status}` }
    const j = await r.json()
    const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
    const v = JSON.parse(t)
    if (v.ok === false) return { ok: false, motivo: linha(v.motivo, 200) || "Esse pedido não dá. Mude o texto e tente de novo." }
    return { ok: true }
  } catch (e) {
    return { ok: true, sem: e.name === "TimeoutError" ? "demorou" : String(e.message ?? e).slice(0, 100) }
  }
}

export const RECUSA =
  "O gerador de música recusou esse pedido. Costuma ser nome de artista ou letra de música que já existe: mude o texto e tente de novo."

/**
 * The song: { ok: true, audio (Buffer), mime, letra } or { ok: false, recusada, motivo }. `recusada` is Google
 * refusing the text (the viewer can change it); anything else is trouble on the way (worth trying again).
 */
export async function gerar(pedido, { chave, fetch: buscar = fetch, prazo = 95_000 }) {
  let r
  try {
    r = await buscar(`${API}/interactions`, {
      method: "POST",
      headers: { "content-type": "application/json", "api-revision": REVISAO, "x-goog-api-key": chave },
      body: JSON.stringify({ model: LYRIA, input: pedidoLyria(pedido), response_format: { type: "audio" } }),
      signal: AbortSignal.timeout(prazo),
    })
  } catch (e) {
    return { ok: false, recusada: false, motivo: e.name === "TimeoutError" ? "O Google demorou demais." : `Sem conexão com o Google (${String(e.message ?? e).slice(0, 80)}).` }
  }
  const j = await r.json().catch(() => null)
  if (!r.ok) {
    const erro = j?.error ?? {}
    const recusada = erro.code === "prohibited_content" || /blocked|prohibited|safety/i.test(String(erro.message ?? ""))
    return { ok: false, recusada, motivo: recusada ? RECUSA : `HTTP ${r.status}: ${String(erro.message ?? erro.code ?? "").slice(0, 160)}` }
  }
  const blocos = (j?.steps ?? []).flatMap((s) => (s.type === "model_output" ? s.content ?? [] : []))
  const audio = blocos.find((b) => b.type === "audio" && typeof b.data === "string")
  if (!audio) return { ok: false, recusada: false, motivo: "O Google respondeu sem a música." }
  const letra = letraLimpa(blocos.filter((b) => b.type === "text").map((b) => b.text).join("\n"))
  return { ok: true, audio: Buffer.from(audio.data, "base64"), mime: audio.mime_type || "audio/mpeg", letra }
}

/** Seconds of an MP3 at Lyria's 192 kb/s, close enough for the dock and the mural. */
export const segundosDe = (bytes) => Math.round((bytes * 8) / 192_000)
