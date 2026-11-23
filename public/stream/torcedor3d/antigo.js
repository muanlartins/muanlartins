// The 2D fan (public/stream/torcedor.js) as a 3D one, so everyone without a 3D look has one, with nothing written:
// what they chose in 2D is kept (head shape, the shirt's pattern and colours, accessory, number, celebration, team,
// frase, stickers) and the rest, a face and hair the 2D fan never had, comes from their login, the same every time.
// Pure, like esquema.js. A change here changes everyone's fan: scripts/torcedor3d.test.mjs pins some.
import { normalizar } from "./esquema.js"
import { camisa2D } from "./vestir.js"

// The 2D fan's options and defaults, as torcedor.js has them (scripts/torcedor3d.test.mjs runs that file and fails
// when the two drift).
const CORES = ["#f4f5f7", "#85a7ff", "#4dd4ff", "#3ddc97", "#b5e853", "#ffd23f", "#ff9f43", "#ff6b57", "#ff5c9a", "#c792ea", "#c08b5c", "#9aa3b5"]
const CABECAS = ["losango", "redonda", "quadrada", "hexagono", "triangulo"]
const ROUPAS = ["lisa", "listra", "faixa", "meio", "numero", "gola", "listras", "listrado", "tricolor", "faixa-dupla"]
const ACESSORIOS = ["nenhum", "bone", "cachecol", "bandeira", "coroa", "oculos", "fone", "cartola"]
const COMEMORACOES = ["pula", "danca", "gira", "acena", "bananeira"]
const PADRAO_STICKERS = { gol: ["🎉"], contra: ["😭"] }
const HEX = /^#[0-9a-f]{6}$/i
const EMOJI = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]*$/u
const umEmoji = (e) => typeof e === "string" && e.length <= 16 && EMOJI.test(e)

function hash(text) {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619)
  return h >>> 0
}

/** The 2D fan everyone has before choosing: torcedor.js's padrao(). */
export function padrao2D(login = "") {
  let h = hash(login)
  const pick = (list) => {
    const item = list[h % list.length]
    h = (Math.floor(h / list.length) ^ hash(String(h))) >>> 0
    return item
  }
  const cor = pick(CORES)
  const detalhe = pick(CORES.filter((c) => c !== cor))
  return {
    cor,
    detalhe,
    terceira: pick(CORES.filter((c) => c !== cor && c !== detalhe)),
    time: "",
    cabeca: pick(CABECAS.slice(0, 3)),
    roupa: pick(ROUPAS.slice(0, 3)),
    numero: h % 100,
    acessorio: pick(["nenhum", "nenhum", "bone", "cachecol", "bandeira"]),
    comemoracao: "pula",
    frase: "",
    stickers: { gol: [...PADRAO_STICKERS.gol], contra: [...PADRAO_STICKERS.contra] },
  }
}

/** A saved 2D fan over the default one, only what's valid kept: torcedor.js's normalizar(). */
export function normalizar2D(escolha, login = "") {
  const a = padrao2D(login)
  if (!escolha || typeof escolha !== "object") return a
  const de = (lista, chave) => lista.includes(escolha[chave]) && (a[chave] = escolha[chave])
  for (const chave of ["cor", "detalhe", "terceira"]) if (HEX.test(escolha[chave])) a[chave] = escolha[chave].toLowerCase()
  if (typeof escolha.time === "string") a.time = Array.from(escolha.time.replace(/\s+/g, " ").trim()).slice(0, 24).join("").trim()
  de(CABECAS, "cabeca")
  de(ROUPAS, "roupa")
  de(ACESSORIOS, "acessorio")
  de(COMEMORACOES, "comemoracao")
  if (Number.isInteger(escolha.numero) && escolha.numero >= 0 && escolha.numero <= 99) a.numero = escolha.numero
  if (typeof escolha.frase === "string") a.frase = Array.from(escolha.frase.replace(/\s+/g, " ").trim()).slice(0, 30).join("").trim()
  for (const quando of ["gol", "contra"]) {
    const lista = escolha.stickers?.[quando]
    if (Array.isArray(lista)) a.stickers[quando] = lista.filter(umEmoji).slice(0, 3)
  }
  return a
}

// The 2D heads as the 3D head's shape.
const CABECA = {
  redonda: {},
  quadrada: { quadr: 0.7, queixo: 0.25 },
  losango: { quadr: -0.9, alt: 1.08, queixo: -0.3 },
  hexagono: { quadr: 0.45, testa: -0.4, queixo: -0.4 },
  triangulo: { quadr: 0.2, testa: -0.9, queixo: 0.8 },
}
// The 2D accessories in 3D, in the fan's own colours as the 2D draws them (the accessory in the second colour).
const ACESSORIO = {
  nenhum: () => ({}),
  bone: (v) => ({ chapeu: "bone", chapC: v.detalhe, chapC2: v.cor }),
  cachecol: (v) => ({ pesc: "cachecol", pescC: v.detalhe, pescC2: v.cor }),
  bandeira: (v) => ({ mao: "bandeira", maoC: v.detalhe }),
  coroa: (v) => ({ chapeu: "coroa", chapC: v.detalhe, chapC2: v.cor }),
  oculos: () => ({ oculos: "escuro", ocC: "#001447" }),
  fone: (v) => ({ fone: "fone", foneC: v.detalhe }),
  cartola: (v) => ({ chapeu: "cartola", chapC: v.detalhe, chapC2: v.cor }),
}

// The person the 2D fan never showed, drawn from the login. Its own lists and its own dice, never ESQUEMA's options or
// sortear(), so a new option there changes nobody's face. Kept to people: skin tones, hair and eyes as people have them,
// with a few dyed.
const PELES = ["#ffe0c7", "#f6c9a4", "#e9b48a", "#d29a6c", "#b97a50", "#8f5a3c", "#6b402c", "#472a20"]
const CABELOS = ["#17181d", "#33231d", "#5a3825", "#8a5a36", "#c08b5c", "#e8c37a", "#b5462b"]
const PINTADOS = ["#85a7ff", "#ff5c9a", "#3ddc97", "#f4f5f7", "#9aa3b5"]
const OLHOS = ["#33231d", "#5a3825", "#17181d", "#1f8a4c", "#002fa7", "#8a5a36"]
function pessoa(login) {
  let s = hash(`torcedor3d:${login}`)
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const um = (l) => l[Math.floor(r() * l.length)]
  const perto = (centro, ate) => Math.round((centro + (r() * 2 - 1) * ate) * 1000) / 1000
  const cabC = r() < 0.9 ? um(CABELOS) : um(PINTADOS)
  const topo = um(["curto", "curto", "curto", "volume", "volume", "cachos", "afro", "raspado", "careca", "espetado", "coque", "coque2", "moicano"])
  const atras = r() < 0.5 ? "nada" : um(["medio", "longo", "ondas", "rabo", "marias", "trancas", "tranca", "dreads", "meio"])
  const barba = r() < 0.75 ? "nada" : um(["bigode", "cavanhaque", "rala", "cheia", "longa"])
  const duas = r() < 0.08
  return {
    pele: um(PELES),
    larg: perto(1, 0.06), alt: perto(1, 0.05), bochecha: perto(0.15, 0.2),
    orelha: r() < 0.88 ? "redonda" : um(["pontuda", "abano"]),
    olho: um(["oval", "oval", "oval", "grande", "grande", "amendoa", "ponto", "feliz", "sono"]),
    olhoC: um(OLHOS), olhoT: perto(1.05, 0.15), olhoX: perto(0.38, 0.04), olhoY: perto(0.02, 0.04),
    cilios: r() < 0.3,
    sobr: um(["arco", "arco", "reta", "grossa", "fina", "angulo", "preocupada", "cortada"]), sobrC: cabC, sobrT: perto(1, 0.15),
    nariz: um(["botao", "botao", "botao", "bola", "longo", "triangulo", "narinas"]), narizT: perto(1, 0.2),
    boca: um(["sorriso", "sorriso", "sorriso", "aberta", "dentes", "lado", "tres", "dente", "lingua"]), bocaT: perto(1, 0.15),
    barba, barbaC: cabC,
    sardas: r() < 0.12, corado: r() < 0.18, pinta: r() < 0.08,
    topo, franja: um(["lado", "lado", "nada", "reta", "cortina", "mechas", "bico", "topete"]), atras,
    vol: perto(0.55, 0.4), comp: perto(1, 0.3), vira: r() < 0.5,
    cabC, cab2: duas, ...(duas ? { cabC2: um(PINTADOS), gradP: perto(0, 0.4) } : {}),
    corpoL: perto(1, 0.1), ombro: perto(2.3, 0.6),
  }
}

/**
 * Someone's 3D fan from their 2D one (as saved, or null for whoever never saved one), with their login: a whole look,
 * as normalizar() gives. Deterministic: the same login and 2D fan give the same 3D fan everywhere.
 */
export function doAntigo(aparencia, login = "") {
  const v = normalizar2D(aparencia, login)
  return normalizar({
    ...pessoa(login),
    ...CABECA[v.cabeca],
    ...camisa2D(v),
    numero: v.numero,
    ...ACESSORIO[v.acessorio](v),
    fes: v.comemoracao,
    time: v.time,
    frase: v.frase,
    stickers: v.stickers,
  })
}

/** Someone's fan in 3D from what the profile API has for them: their 3D look (`t3`) when they saved one, else their 2D one's. */
export function torcedorDe(aparencia, login = "") {
  const t3 = aparencia && typeof aparencia === "object" ? aparencia.t3 : null
  return t3 && typeof t3 === "object" && !Array.isArray(t3) ? normalizar(t3) : doAntigo(aparencia, login)
}
