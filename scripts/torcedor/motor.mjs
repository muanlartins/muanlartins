// The 3D fan's rules for agents and tools, run on the very modules the overlays, the site and the profile API run
// (public/stream/torcedor3d/esquema.js: normalizar, enxugar, the code, the presets; vestir.js: the clubs), so no rule
// is written twice. The CLI (scripts/torcedor/torcedor) and its local API ask it; torcedor.test.mjs pins it.
//   node scripts/torcedor/motor.mjs esquema            the machine-readable schema (`torcedor esquema --json`)
//   node scripts/torcedor/motor.mjs validar < entrada  a look as JSON, a T1 code or a #t= link → the normalized look,
//                                                      its code, and every change normalizar made, in words
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import * as E from "../../public/stream/torcedor3d/esquema.js"
import { TIMES, comTime } from "../../public/stream/torcedor3d/vestir.js"
import { T3_MAX } from "../../infra/perfil/rotas.mjs"

const LISTAS = { pecas: [E.PECA, E.PECAS_MAX, "peça"], desenhos: [E.DESENHO, E.DESENHOS_MAX, "desenho"], mechas: [E.MECHA, E.MECHAS_MAX, "mecha"] }
// What the stand does with the fan beside the drawing (esquema.js's torcida): not controls, but kept in the look.
const TORCIDA = ["time", "frase", "stickers"]
// boneco.js's POSES (torcedor.test.mjs checks), with the names the editor shows.
export const POSES = [["parado", "Parado"], ["cima", "Gol"], ["aceno", "Aceno"], ["palmas", "Palmas"], ["triste", "Gol deles"], ["pisca", "Piscando"]]
// Read from boneco.js (torcedor.test.mjs checks them against it): the hats that leave the hair alone, the ones a
// raised hood leaves on, and the back hair a raised hood leaves out.
export const CHAPEUS_COM_CABELO = ["nada", "aureola", "festa", "bandana", "coroa", "tiara"]
export const CHAPEUS_COM_CAPUZ = ["aureola", "festa", "coroa"]
export const ATRAS_COM_CAPUZ = ["tranca"]
const CABELO_ALTO = ["afro", "cachos", "espetado", "moicano", "coque", "coque2"]

// What boneco.js does with the numbers, in words (read from boneco.js; keep in step with it).
const COORDENADAS = {
  eixos: "Unidades da cabeça (raio ≈ 1), origem no centro da cabeça. x+ = esquerda do personagem (direita de quem olha), y+ = pra cima, z+ = pra frente, na direção de quem olha.",
  cabeca: "Esfera de raio 1 esticada por larg (x), alt (y) e tam (tudo); quadr deixa mais quadrada, queixo/testa/bochecha mudam a parte de baixo, de cima e as bochechas. Topo em y ≈ 1 (o cabelo soma 0,05 a 0,4), rosto em z ≈ 1, orelhas em x ≈ ±1. Gira no pescoço (y = -0,95) com incl, giro e nas poses.",
  pescoco: "Cilindro de raio `pescoco` (0,2 a 0,46) de y ≈ -1,28 a -0,68.",
  busto: "Do alto do ombro (y = -2,95 + 1,73·corpoA ≈ -1,22) até a base reta em y = -2,95. Meia-largura 1,34·corpoL; frente do peito em z ≈ 1,34·corpoL·fundo (≈ 0,88). Braços só aparecem nas poses cima, aceno e palmas: parado é o busto da foto de perfil.",
  mao: "A mão parada fica em (1,13·corpoL, -1,85, 0,72), do lado esquerdo do personagem (direita de quem olha). Nas poses cima e aceno ela sobe; em cima as duas sobem.",
  rosto: {
    unidades: "Desenhos e traços do rosto são pintados num mapa enrolado na cabeça: x = ângulo ao redor a partir do meio do rosto, em radianos (+ = esquerda do personagem); y = ângulo acima da linha dos olhos/equador (+ = pra cima). De frente se vê |x| até ≈ 1,2.",
    referencias: { olhos: "x = ±olhoX (0,38), y = olhoY (0,02)", sobrancelhas: "x = ±sobrX (0,39), y = sobrY (0,29)", nariz: "x 0, y = narizY (-0,16)", boca: "x 0, y = bocaY (-0,45)", bochechas: "x ±0,6, y -0,26", pinta: "x 0,34, y -0,3" },
    cobertura: "Acima de y ≈ 0,4 a franja pode cobrir o desenho (depende do corte); a barba cobre de y ≈ -0,25 pra baixo.",
  },
  camisa: {
    unidades: "Desenhos na camisa: x = 1 unidade ≈ 1,23 rad ao redor do busto (±1 cobre a frente toda, 0 = meio); y = 0 no meio do peito (y ≈ -1,77 no mundo), -0,95 perto da base (≈ -2,78), 0,3 no alto do peito (≈ -1,49); acima de 0,5 já é o ombro visto de cima.",
    cobertura: "Uma peça por cima (jaqueta, moletom, sobretudo, colete, capinha) e o que vai no pescoço cobrem o desenho da camisa.",
  },
  desenho: "Formas pintadas no mapa (2D). t = raio da forma, a = estica na largura, r = gira (radianos, horário visto de frente), m = repete espelhado no outro lado. Vão por cima de tudo que é pintado (olhos, boca, estampa, número).",
  peca: {
    posicao: "x, y, z = centro da peça no espaço da âncora; sx, sy, sz = tamanho em unidades (as formas base medem 1); rx, ry, rz em radianos, ordem XYZ.",
    formas: { bola: "esfera, diâmetro = sx/sy/sz", cubo: "cubo de lado 1", cone: "cone em pé no eixo y, ponta pra cima", tubo: "cilindro em pé no eixo y", anel: "rosca no plano xy (de frente pra câmera), furo no eixo z", losango: "octaedro (diamante)", gota: "gota em pé, ponta pra cima", chifre: "curva afinando no plano xy, sobe e vira pra +x", placa: "triângulo achatado de ponta pra cima no plano xy, espessura sz", capsula: "cápsula em pé no eixo y" },
    espelho: "m (padrão true!) cria uma cópia em -x com ry e rz invertidos. Em x = 0 a cópia fica escondida; pra uma peça só de um lado, use m: false.",
    onde: { auto: "y > -1 vai na cabeça, senão no corpo", cabeca: "segue a cabeça (tam, incl, giro, poses); origem no centro da cabeça", corpo: "presa no busto, não acompanha a cabeça", mao: "vai com a mão: coordenadas iguais às do corpo com a mão parada em (1,13·corpoL, -1,85, 0,72); a cópia espelhada fica na outra mão, que só aparece na pose cima" },
    contorno: "Toda peça ganha contorno azul-marinho; peças mais finas que 0,09 ficam quase só contorno.",
  },
  mecha: "Mecha livre: nasce na superfície do cabelo. a = ângulo ao redor da cabeça (0 = meio da testa, +1,57 = lado esquerdo do personagem, ±3,14 = nuca); h = ângulo a partir do topo (0,05 = coroa, 1,57 = altura das orelhas, 2,3 = perto do queixo); d = pra onde sai (0 desce, +1,57 vai no sentido de a crescente, ±3,14 sobe pro topo); s = 0 deita no cabelo e, quando sai dele, cai com o peso; s ≥ 0,5 sai em pé e não cai; k = curva (o sinal escolhe o lado); l = comprimento em unidades da cabeça; e = meia-largura na raiz. m espelha (a, d e k trocam de sinal). Sem p, usa a cor do cabelo (com o degradê de “Duas cores”).",
  camera: "As fotos são ortográficas, de frente e um pouco de cima. Ângulos do render: frente 0, tres-quartos -0,7, lado -1,45, costas 2,6 (giro do corpo em radianos).",
}

const TIPOS = {
  op: "string: um dos options[].id",
  num: "number entre min e max; fora disso é limitado, e arredondado a step (1 = inteiro, 0.001 nos outros)",
  cor: "string \"#rrggbb\" (6 dígitos; vira minúscula). Qualquer hex vale; a paleta é só o que o editor mostra",
  sim: "boolean true/false (1, \"true\" e afins viram o padrão)",
}

function campo(c, aba, grupo) {
  const o = { key: c.k, label: c.nome, type: c.tipo }
  if (aba) Object.assign(o, { tab: aba, group: grupo })
  o.default = c.padrao
  if (c.tipo === "num") Object.assign(o, { min: c.min, max: c.max, step: c.passo ? 1 : 0.001 })
  if (c.tipo === "op") o.options = c.opcoes.map(([id, label]) => ({ id, label }))
  if (c.tipo === "cor") o.palette = c.paleta
  if (c.dica) o.shownWhen = c.dica
  if (c.busca) o.keywords = c.busca
  return o
}

/** The whole schema, for agents and tools: what `torcedor esquema --json` prints and the API's GET /esquema.json. */
export function esquema() {
  const abas = E.ESQUEMA.map(([aba, grupos]) => ({
    name: aba,
    groups: grupos.map(([g, campos, extra]) => ({ name: g, keys: campos.map((c) => c.k), ...(extra?.dica ? { hint: extra.dica } : {}) })),
  }))
  // Free locks live in the editor's Cabelo tab; pieces and drawings in Livre.
  abas.find((a) => a.name === "Cabelo").lists = ["mechas"]
  abas.push({ name: "Livre", groups: [], lists: ["pecas", "desenhos"] })
  const lista = (campos, max) => ({ max, fields: campos.map((c) => campo(c)) })
  return {
    format: {
      version: "T1",
      code: "\"T1:\" + base64url(UTF-8 de JSON.stringify(enxugar(normalizar(look)))), sem \"=\" no fim",
      maxChars: E.CODIGO_MAX,
      maxProfileBytes: T3_MAX,
      look: "Objeto JSON plano com as chaves de `fields` (o que faltar fica no padrão), três listas (pecas, desenhos, mechas) e o que a arquibancada faz com o torcedor (`torcida`).",
      normalize: "normalizar(): chave desconhecida some; valor de tipo errado vira o padrão; número fora do limite é limitado e arredondado; lista que não é lista vira []; lista maior que o máximo é cortada; item que não é objeto vira o item padrão.",
      compact: "enxugar(): guarda só o que difere do padrão. É o que vai no código e no perfil.",
    },
    types: TIPOS,
    limits: { pecas: E.PECAS_MAX, desenhos: E.DESENHOS_MAX, mechas: E.MECHAS_MAX },
    torcida: {
      time: `string, o time do torcedor (até ${E.TIME_MAX} caracteres). Um nome de \`clubs\` sozinho não veste a camisa: copie o look do clube.`,
      frase: `string, o que ele grita quando chega na arquibancada (até ${E.FRASE_MAX} caracteres)`,
      stickers: `{ gol: [emoji], contra: [emoji] }: o que ele joga no gol e no gol do adversário, um emoji por item, até ${E.STICKERS_MAX} cada (padrão ${JSON.stringify(E.PADRAO_STICKERS)})`,
    },
    coordinates: COORDENADAS,
    palettes: Object.fromEntries(Object.entries(E.PALETAS).map(([k, l]) => [k, l.map((hex) => ({ hex, name: E.NOMES_COR[hex] ?? hex }))])),
    tabs: abas,
    fields: E.ESQUEMA.flatMap(([aba, grupos]) => grupos.flatMap(([g, campos]) => campos.map((c) => campo(c, aba, g)))),
    lists: { pecas: lista(E.PECA, E.PECAS_MAX), desenhos: lista(E.DESENHO, E.DESENHOS_MAX), mechas: lista(E.MECHA, E.MECHAS_MAX) },
    poses: POSES.map(([id, label]) => ({ id, label })),
    presets: E.MODELOS.map(([name, look]) => ({ name, look: JSON.parse(JSON.stringify(look)), code: E.codigo(E.normalizar(look)) })),
    // The Série A clubs: the shirt the editor puts on when someone picks one (vestir.js's comTime).
    clubs: TIMES.map((t) => ({ name: t.nome, look: comTime({}, t.nome) })),
  }
}

// Warnings: what normalizar changed or dropped, said per field. The result itself is always normalizar's own.
const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
function distancia(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let antes = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, antes + (a[i - 1] === b[j - 1] ? 0 : 1))
      antes = t
    }
  }
  return d[b.length]
}
const mostra = (v) => (v === undefined ? "undefined" : JSON.stringify(v)?.slice(0, 80) ?? String(v))
/** The closest key, for a typo or a label typed instead of the id. */
function parecida(k, campos) {
  const s = semAcento(k)
  const por = campos.find((c) => semAcento(c.k) === s || semAcento(c.nome) === s)
  if (por) return por.k
  const perto = campos.map((c) => [distancia(s, semAcento(c.k)), c.k]).sort((x, y) => x[0] - y[0])[0]
  return perto && perto[0] <= 2 ? perto[1] : null
}

function conferir(campos, de, a, onde, avisos, extras = []) {
  const caminho = (k) => (onde ? `${onde}.${k}` : k)
  const conhecidas = new Set([...campos.map((c) => c.k), ...extras])
  for (const k of Object.keys(de)) {
    if (conhecidas.has(k)) continue
    const p = parecida(k, campos)
    avisos.push({ tipo: "chave-desconhecida", campo: caminho(k), mensagem: `chave desconhecida "${k}": ignorada${p ? ` (quis dizer "${p}"?)` : ""}` })
  }
  for (const c of campos) {
    if (!(c.k in de)) continue
    const v = de[c.k]
    const n = a[c.k]
    const fim = `ficou ${mostra(n)}`
    if (c.tipo === "num") {
      if (typeof v !== "number" || !Number.isFinite(v)) avisos.push({ tipo: "tipo-errado", campo: caminho(c.k), mensagem: `${caminho(c.k)}: ${mostra(v)} não é número (${c.min} a ${c.max}); ${fim}` })
      else if (v < c.min || v > c.max) avisos.push({ tipo: "fora-do-limite", campo: caminho(c.k), mensagem: `${caminho(c.k)}: ${v} fora de ${c.min} a ${c.max}; ${fim}` })
      else if (c.passo && n !== v) avisos.push({ tipo: "arredondado", campo: caminho(c.k), mensagem: `${caminho(c.k)}: ${v} só aceita inteiro; ${fim}` })
    } else if (c.tipo === "op") {
      if (!c.opcoes.some(([id]) => id === v)) {
        const s = semAcento(v)
        const sugestao = c.opcoes.find(([id, nome]) => semAcento(id) === s || semAcento(nome) === s)?.[0]
        const ids = c.opcoes.map(([id]) => id).join(", ")
        avisos.push({ tipo: "opcao-invalida", campo: caminho(c.k), mensagem: `${caminho(c.k)}: ${mostra(v)} não é opção${sugestao ? ` (quis dizer "${sugestao}"?)` : ""}; ${fim}. Opções: ${ids}` })
      }
    } else if (c.tipo === "cor") {
      if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) avisos.push({ tipo: "cor-invalida", campo: caminho(c.k), mensagem: `${caminho(c.k)}: ${mostra(v)} não é cor #rrggbb; ${fim}` })
    } else if (typeof v !== "boolean") avisos.push({ tipo: "tipo-errado", campo: caminho(c.k), mensagem: `${caminho(c.k)}: ${mostra(v)} não é true/false; ${fim}` })
  }
}

/** The team, the frase and the stickers: trimmed and cut as the 2D fan does, stickers one emoji each. */
function conferirTorcida(de, a, avisos) {
  for (const [k, max] of [["time", E.TIME_MAX], ["frase", E.FRASE_MAX]]) {
    if (!(k in de)) continue
    if (typeof de[k] !== "string") avisos.push({ tipo: "tipo-errado", campo: k, mensagem: `${k}: ${mostra(de[k])} não é texto; ficou ""` })
    else if (a[k] !== de[k].replace(/\s+/g, " ").trim()) avisos.push({ tipo: "cortado", campo: k, mensagem: `${k}: passa de ${max} caracteres; ficou ${mostra(a[k])}` })
  }
  if (!("stickers" in de)) return
  const st = de.stickers
  if (!objeto(st)) return avisos.push({ tipo: "tipo-errado", campo: "stickers", mensagem: `stickers: ${mostra(st)} não é { gol: [...], contra: [...] }; ficou o padrão` })
  for (const q of ["gol", "contra"]) {
    if (!(q in st)) continue
    if (!Array.isArray(st[q])) avisos.push({ tipo: "lista-invalida", campo: `stickers.${q}`, mensagem: `stickers.${q}: ${mostra(st[q])} não é uma lista; ficou o padrão` })
    else if (st[q].length !== a.stickers[q].length) avisos.push({ tipo: "lista-cortada", campo: `stickers.${q}`, mensagem: `stickers.${q}: um emoji por item, até ${E.STICKERS_MAX}; ficou ${mostra(a.stickers[q])}` })
  }
}

const objeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v)
function avisosDe(de, a) {
  const avisos = []
  if (!objeto(de)) {
    avisos.push({ tipo: "entrada-invalida", campo: "", mensagem: `a entrada não é um objeto JSON (${Array.isArray(de) ? "é uma lista" : mostra(de)}); ficou o torcedor padrão` })
    return avisos
  }
  conferir(E.CAMPOS, de, a, "", avisos, [...Object.keys(LISTAS), ...TORCIDA])
  conferirTorcida(de, a, avisos)
  for (const [k, [campos, max, nome]] of Object.entries(LISTAS)) {
    if (!(k in de)) continue
    const l = de[k]
    if (!Array.isArray(l)) {
      avisos.push({ tipo: "lista-invalida", campo: k, mensagem: `${k}: ${mostra(l)} não é uma lista; ficou []` })
      continue
    }
    if (l.length > max) avisos.push({ tipo: "lista-cortada", campo: k, mensagem: `${k}: ${l.length} itens, o máximo é ${max}; os ${l.length - max} últimos saíram` })
    l.slice(0, max).forEach((item, i) => {
      if (!objeto(item)) avisos.push({ tipo: "item-invalido", campo: `${k}[${i}]`, mensagem: `${k}[${i}]: ${mostra(item)} não é um objeto; virou ${nome} padrão` })
      else conferir(campos, item, a[k][i], `${k}[${i}]`, avisos)
    })
  }
  return avisos
}

/** Valid but invisible: a value set for a control that the current choices hide (the editor hides it too). */
function semEfeito(de, a) {
  const notas = []
  if (!objeto(de)) return notas
  for (const c of E.CAMPOS) if (c.se && c.k in de && a[c.k] !== c.padrao && !c.se(a)) notas.push({ campo: c.k, mensagem: `${c.k} (${c.nome}) não aparece: ${c.dica}` })
  for (const [k, [campos]] of Object.entries(LISTAS))
    a[k].forEach((item, i) => {
      const cru = Array.isArray(de[k]) && objeto(de[k][i]) ? de[k][i] : {}
      for (const c of campos) if (c.se && c.k in cru && item[c.k] !== c.padrao && !c.se(item)) notas.push({ campo: `${k}[${i}].${c.k}`, mensagem: `${k}[${i}].${c.k} (${c.nome}) não aparece: ${c.dica}` })
    })
  return notas
}

/** What boneco.js hides behind other choices (its noChapeu and the raised hood). */
function dicas(a) {
  const d = []
  const noChapeu = !CHAPEUS_COM_CABELO.includes(a.chapeu) || a.capuz === "levantado"
  const cobre = a.capuz === "levantado" ? "o capuz levantado" : `o chapéu "${a.chapeu}"`
  if (noChapeu) {
    const some = [CABELO_ALTO.includes(a.topo) && `topo "${a.topo}" (vira cabelo liso por baixo)`, a.franja === "topete" && `franja "topete"`, a.fio && "fio em pé"].filter(Boolean)
    if (some.length) d.push(`${cobre} esconde: ${some.join(", ")}. Chapéus que deixam o cabelo: ${CHAPEUS_COM_CABELO.slice(1).join(", ")}.`)
  }
  if (a.capuz === "levantado" && a.chapeu !== "nada" && !CHAPEUS_COM_CAPUZ.includes(a.chapeu)) d.push(`o capuz levantado esconde o chapéu "${a.chapeu}"`)
  if (a.capuz === "levantado" && a.atras !== "nada" && !ATRAS_COM_CAPUZ.includes(a.atras)) d.push(`o capuz levantado esconde o cabelo de trás "${a.atras}" (e as mechas livres que ficam debaixo dele)`)
  return d
}

/** Finds a code in what was pasted: a bare code, a #t= link (maybe percent-encoded) or a JSON string holding one. */
function acharCodigo(t) {
  let s = t
  try {
    s = decodeURIComponent(t)
  } catch {}
  return s.match(/T1:[A-Za-z0-9_\-+/=]*/)?.[0] ?? null
}
/** A code's JSON as it was written, before normalizar: lerCodigo's own decoding, for the warnings. */
const cru = (cod) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cod.slice(3).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))))

/** Reads a look the way the editor does and says what it changed. Never throws: { ok: false, erro } when it can't read. */
export function validar(texto) {
  const t = String(texto).trim()
  let de
  let a
  let origem = "json"
  let cod = !t.startsWith("{") && !t.startsWith("[") ? acharCodigo(t) : null
  if (!cod) {
    try {
      de = JSON.parse(t)
    } catch (e) {
      return { ok: false, erro: `não é JSON nem código T1: ${e.message}` }
    }
    if (typeof de === "string" && acharCodigo(de)) cod = acharCodigo(de)
  }
  if (cod) {
    origem = "codigo"
    if (cod.length > E.CODIGO_MAX) return { ok: false, erro: `código com ${cod.length} caracteres: o editor só abre até ${E.CODIGO_MAX}` }
    a = E.lerCodigo(cod)
    if (!a) return { ok: false, erro: "o código não abriu (base64 ou JSON quebrado). Confira se ele veio inteiro, começando em T1:" }
    de = cru(cod)
  } else a = E.normalizar(de)
  const enxuto = E.enxugar(a)
  const codigo = E.codigo(a)
  const bytes = Buffer.byteLength(JSON.stringify(enxuto))
  return {
    ok: true,
    origem,
    codigo,
    caracteres: codigo.length,
    limite: E.CODIGO_MAX,
    cabe: codigo.length <= E.CODIGO_MAX,
    bytes,
    limitePerfil: T3_MAX,
    cabePerfil: bytes <= T3_MAX,
    idaVolta: JSON.stringify(E.lerCodigo(codigo)) === JSON.stringify(a),
    contagem: { pecas: a.pecas.length, desenhos: a.desenhos.length, mechas: a.mechas.length },
    avisos: avisosDe(de, a),
    semEfeito: semEfeito(de, a),
    dicas: dicas(a),
    enxuto,
    look: a,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cmd = process.argv[2]
  // A reader that stops early (| head) is not an error.
  process.stdout.on("error", (e) => process.exit(e.code === "EPIPE" ? 0 : 1))
  if (cmd === "esquema") process.stdout.write(JSON.stringify(esquema(), null, 1) + "\n")
  else if (cmd === "validar") process.stdout.write(JSON.stringify(validar(readFileSync(0, "utf8"))) + "\n")
  else {
    process.stderr.write("uso: node scripts/torcedor/motor.mjs esquema | validar < entrada\n")
    process.exit(2)
  }
}
