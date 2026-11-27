/**
 * The pictures behind <Torcedor3D>: one WebGL canvas for the whole page (lib/torcedor3d-fotos.ts's `fotografo`), the
 * fans baked one small step at a time within a few milliseconds of each frame, as the live's stand does, so a page of
 * many fans never stalls. Each picture is the whole frame as a PNG behind a blob URL, cached by the look's code, the
 * frame, its height in device pixels and the pose, and shared by every <img> that shows it. three.js and the schema
 * load with the first fan seen, not with the page; nothing here runs in Node (the components call it from effects).
 */
import type { Choice } from "@/lib/profile"
import type { Torcedor3D as Look, Torcedor3DSalvo } from "@/lib/torcedor3d"
import type { Foto, Pose, Quadro, Sessao } from "@/lib/torcedor3d-fotos"

export type { Pose, Quadro }
export interface Picture {
  src: string
  /** The whole frame, in device pixels. */
  w: number
  h: number
}

type Modulos = [typeof import("@/lib/torcedor3d"), typeof import("@/lib/torcedor3d-fotos")]
let modulos: Promise<Modulos> | null = null
/** The schema and the model, with the shirt number's font, once for the page. */
export function carregar(): Promise<Modulos> {
  modulos ??= Promise.all([import("@/lib/torcedor3d"), import("@/lib/torcedor3d-fotos")]).then(
    async (m) => {
      await m[1].prepararFonte()
      return m
    },
    (erro) => {
      // A chunk that failed to load (a release in between, the network): the next fan tries again.
      modulos = null
      throw erro
    },
  )
  return modulos
}

/** What to draw: what the profile API has for someone (their `t3`, else their 2D fan's), a look, or a preset's name. */
export interface Quem {
  aparencia?: Choice | null
  login?: string
  look?: Torcedor3DSalvo | null
  modelo?: string
  natal?: boolean
}
const vestidos = new Map<string, { look: Look; codigo: string }>()
/**
 * The look as drawn (dressed for December, never saved) and its code, the cache's key. `chave` is `q` as
 * JSON: the same person shown twice on a page is worked out once.
 */
export async function vestido(chave: string): Promise<{ look: Look; codigo: string }> {
  const [T] = await carregar()
  let v = vestidos.get(chave)
  if (!v) {
    const q = JSON.parse(chave) as Quem
    const preset = q.modelo ? T.MODELOS.find(([nome]) => nome === q.modelo)?.[1] : undefined
    const base = q.look ?? preset ?? T.torcedorDe(q.aparencia, q.login ?? "")
    const look = T.vestir(base, { natal: q.natal })
    v = { look, codigo: T.codigo(look) }
    if (vestidos.size > 1000) vestidos.clear()
    vestidos.set(chave, v)
  }
  return v
}

// The minigames' ball (boneco.js's bola: the fan's head made round), as the live's race and duel draw it: one map per
// person and size for the page, baked one a frame (each ~20–80 ms, once).
const bolas = new Map<string, Promise<HTMLCanvasElement | null>>()
let filaBola: Promise<unknown> = Promise.resolve()
/** Someone's ball, as a sphere's map 2h × h (bolinha.js's disco draws it flat); null without WebGL. */
export function bola(q: Quem, altura = 128): Promise<HTMLCanvasElement | null> {
  const chave = `${altura}|${JSON.stringify(q)}`
  let p = bolas.get(chave)
  if (!p) {
    p = filaBola.then(async () => {
      const [, F2] = await carregar()
      const { look } = await vestido(JSON.stringify(q))
      await new Promise((r) => requestAnimationFrame(r))
      try {
        return F2.fotografo.bola(look, { altura })
      } catch {
        return null
      }
    })
    filaBola = p.catch(() => null)
    bolas.set(chave, p)
    if (bolas.size > 300) bolas.delete(bolas.keys().next().value!)
  }
  return p
}

/** A fan's pictures at one frame and size, by pose; `usos` counts the <Torcedor3D>s showing them. */
interface Entrada {
  fotos: Map<Pose, Promise<Picture>>
  usos: number
}
const entradas = new Map<string, Entrada>()
/** Entries nobody shows, oldest first: kept for a while (a tab switched back, a list folded and opened). */
const livres = new Set<string>()
const GUARDAR = 240

interface Trabalho {
  chave: string
  look: Look
  quadro: Quadro
  altura: number
  poses: Pose[]
  prometidas: Map<Pose, { ok: (p: Picture) => void; nao: (e: unknown) => void }>
  sessao: Sessao | null
}
const fila: Trabalho[] = []
let atual: Trabalho | null = null
let agendado = false
/** No WebGL here: every fan stays a silhouette. */
let semGpu = false
/** Within a frame, ms of baking at most; building a fan (the one big step, ~5–15 ms) gets a frame of its own. */
const ORCAMENTO = 6
let passoMedio = 1.5

const chaveDe = (codigo: string, quadro: Quadro, altura: number) => `${quadro}|${altura}|${codigo}`

/**
 * The pictures of a look at a frame `altura` device pixels tall, one promise per pose (the same promise for whoever
 * asks again). Call `soltar` with the same key when the picture leaves the page.
 */
export function pedir(look: Look, codigo: string, quadro: Quadro, altura: number, poses: Pose[]): { chave: string; fotos: Promise<Picture>[] } {
  const chave = chaveDe(codigo, quadro, altura)
  const e = entradas.get(chave) ?? { fotos: new Map<Pose, Promise<Picture>>(), usos: 0 }
  entradas.set(chave, e)
  e.usos++
  livres.delete(chave)
  const faltam = poses.filter((p, i) => !e.fotos.has(p) && poses.indexOf(p) === i)
  if (faltam.length) {
    const t: Trabalho = { chave, look, quadro, altura, poses: faltam, prometidas: new Map(), sessao: null }
    for (const p of faltam) e.fotos.set(p, new Promise<Picture>((ok, nao) => t.prometidas.set(p, { ok, nao })))
    if (semGpu) falhar(t, new Error("WebGL"))
    else {
      fila.push(t)
      agendar()
    }
  }
  return { chave, fotos: poses.map((p) => e.fotos.get(p)!) }
}

/** One <Torcedor3D> no longer shows this entry; past GUARDAR unused ones, the oldest go. */
export function soltar(chave: string) {
  const e = entradas.get(chave)
  if (!e || --e.usos > 0) return
  livres.add(chave)
  for (const velha of livres) {
    if (livres.size <= GUARDAR) break
    livres.delete(velha)
    const v = entradas.get(velha)
    entradas.delete(velha)
    for (const f of v?.fotos.values() ?? []) f.then((p) => URL.revokeObjectURL(p.src), () => {})
  }
}

function falhar(t: Trabalho, erro: unknown) {
  for (const { nao } of t.prometidas.values()) nao(erro)
  // A later request starts over (a rejected promise isn't kept).
  const e = entradas.get(t.chave)
  for (const p of t.prometidas.keys()) e?.fotos.delete(p)
}

let F: Modulos[1] | null = null
function agendar() {
  if (agendado || (!atual && !fila.length)) return
  agendado = true
  if (F) return void requestAnimationFrame(trabalhar)
  // The first fan of the page waits for three.js; `agendado` holds meanwhile, so one loop runs.
  carregar().then(
    (m) => {
      F = m[1]
      requestAnimationFrame(trabalhar)
    },
    (erro) => {
      agendado = false
      for (const t of fila.splice(0)) falhar(t, erro)
    },
  )
}

function proximo(): Trabalho | null {
  for (;;) {
    const t = fila.shift()
    if (!t) return null
    // Everyone who wanted it left before it began: drop it, and a later request bakes it again.
    if (!entradas.get(t.chave)?.usos) {
      falhar(t, new Error("ninguém mais"))
      continue
    }
    return t
  }
}

function trabalhar() {
  agendado = false
  const t0 = performance.now()
  const { fotografo, FOTO } = F!
  for (;;) {
    if (!atual) {
      atual = proximo()
      if (!atual) return
      try {
        atual.sessao = fotografo.sessao(atual.look, atual.poses, { px: atual.altura / FOTO[atual.quadro].h, quadro: atual.quadro })
      } catch (erro) {
        // No WebGL (an old phone, a blocked GPU): nothing will bake, so nothing waits.
        semGpu = true
        falhar(atual, erro)
        atual = null
        for (const t of fila.splice(0)) falhar(t, erro)
        return
      }
    }
    const t = atual
    const s = t.sessao!
    // A shader compiling off the main thread: look again next frame.
    if (s.esperando) return agendar()
    const montar = !s.montado
    if (montar && performance.now() - t0 > 0.5) return agendar()
    const antes = performance.now()
    let fim = false
    try {
      fim = s.passo()
    } catch (erro) {
      s.largar()
      falhar(t, erro)
      atual = null
      continue
    }
    if (!montar) passoMedio += (performance.now() - antes - passoMedio) * 0.2
    if (fim) {
      atual = null
      s.pronto!.then(
        (fotos) => entregar(t, fotos),
        (erro) => falhar(t, erro),
      )
    }
    if (montar || performance.now() - t0 + passoMedio > ORCAMENTO) return agendar()
  }
}

/** Each pose's cut-out as the whole frame in a PNG: the <img> then needs no placing, and the margins cost nothing. */
function entregar(t: Trabalho, fotos: Partial<Record<Pose, Foto>>) {
  for (const [pose, { ok, nao }] of t.prometidas) {
    const f = fotos[pose]
    if (!f) {
      nao(new Error(pose))
      continue
    }
    png(f).then(ok, nao)
  }
}

async function png(f: Foto): Promise<Picture> {
  try {
    let blob: Blob | null
    if (typeof OffscreenCanvas !== "undefined") {
      const c = new OffscreenCanvas(f.W, f.H)
      c.getContext("2d")!.drawImage(f.img, f.x, f.y)
      blob = await c.convertToBlob({ type: "image/png" })
    } else {
      const c = Object.assign(document.createElement("canvas"), { width: f.W, height: f.H })
      c.getContext("2d")!.drawImage(f.img, f.x, f.y)
      blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"))
    }
    if (!blob) throw new Error("png")
    return { src: URL.createObjectURL(blob), w: f.W, h: f.H }
  } finally {
    f.img.close()
  }
}

/** What's waiting and kept, for the tests (window.__torcedores in the browser's console). */
export const medidas = () => ({ fila: fila.length + (atual ? 1 : 0), entradas: entradas.size, livres: livres.size, semGpu })

// One observer for every fan on the page: a picture is asked for once its box comes within a screen of the view.
const vigiados = new Map<Element, () => void>()
let olho: IntersectionObserver | null = null
export function quandoVisivel(el: Element, fn: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    fn()
    return () => {}
  }
  olho ??= new IntersectionObserver(
    (vistos) => {
      for (const v of vistos) {
        if (!v.isIntersecting) continue
        const f = vigiados.get(v.target)
        vigiados.delete(v.target)
        olho!.unobserve(v.target)
        f?.()
      }
    },
    { rootMargin: "50% 0px" },
  )
  vigiados.set(el, fn)
  olho.observe(el)
  return () => {
    vigiados.delete(el)
    olho?.unobserve(el)
  }
}
