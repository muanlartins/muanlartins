/**
 * The 3D fan for the site: public/stream/torcedor3d/, the very modules OBS's overlays load, bundled here (no copy), with
 * their types. This file is the pure part (the schema, codes, presets, dice, what it wears, the 2D fan turned 3D):
 * safe anywhere, the build's Node included. Pictures and the model are lib/torcedor3d-fotos.ts, which brings three.js.
 */
import * as A from "@/public/stream/torcedor3d/antigo.js"
import * as E from "@/public/stream/torcedor3d/esquema.js"
import * as V from "@/public/stream/torcedor3d/vestir.js"
import type { Choice } from "@/lib/profile"

/** A free 3D piece (esquema.js PECA): a shape on the head, the body or the hand. */
export interface Peca {
  f: string
  c: string
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rx: number
  ry: number
  rz: number
  /** Mirrored on the other side (true by default). */
  m: boolean
  onde: "auto" | "cabeca" | "corpo" | "mao"
}
/** A shape painted on the face or the shirt (esquema.js DESENHO). */
export interface Desenho {
  f: string
  em: "rosto" | "camisa"
  c: string
  x: number
  y: number
  t: number
  a: number
  r: number
  m: boolean
}
/** A free lock of hair (esquema.js MECHA). */
export interface Mecha {
  a: number
  h: number
  l: number
  d: number
  s: number
  k: number
  e: number
  p: boolean
  c: string
  m: boolean
}
export interface Stickers {
  gol: string[]
  contra: string[]
}
type Valor = string | number | boolean | Peca[] | Desenho[] | Mecha[] | Stickers

/**
 * A whole 3D fan, as normalizar() gives it: every field of ESQUEMA by its key (`k`), the free lists, and the stand's own
 * fields (team, frase, stickers). The few fields below are typed; the rest are read by key with ESQUEMA's types.
 */
export interface Torcedor3D {
  [campo: string]: Valor
  pele: string
  cor: string
  detalhe: string
  terceira: string
  roupa: string
  numero: number
  numOn: boolean
  chapeu: string
  /** The celebration on a goal: pula, danca, gira, acena, palmas or bananeira. */
  fes: string
  pecas: Peca[]
  desenhos: Desenho[]
  mechas: Mecha[]
  /** Their team, by name: a club of TIMES (whose shirt comTime puts on) or any they type. */
  time: string
  /** What they shout arriving at the stand. */
  frase: string
  stickers: Stickers
}
/** A 3D fan as the profile API keeps it (`t3`) and a code carries it: only what differs from the default (enxugar). */
export type Torcedor3DSalvo = Partial<Torcedor3D>

/** One control of the editor (esquema.js's op, num, cor and sim). */
export interface Campo {
  k: string
  nome: string
  tipo: "op" | "num" | "cor" | "sim"
  padrao: string | number | boolean
  /** op: [id, the name shown]. */
  opcoes?: [string, string][]
  min?: number
  max?: number
  /** num: 1 for whole numbers. */
  passo?: number
  /** cor: the palette the editor shows (PALETAS), never a rule. */
  paleta?: string
  /** Whether the control does anything for this look; `dica` says what brings it out. */
  se?: (a: Torcedor3D) => boolean
  dica?: string
  foto?: boolean | string
  busca?: string
}
/** A group of controls; `dica` stands in while none applies, `acao` is a button that applies it. */
export type Grupo = [nome: string, campos: Campo[], extra?: { dica?: string; acao?: [string, Torcedor3DSalvo] }]
/** The editor's tabs, each a list of groups. */
export type Aba = [nome: string, grupos: Grupo[]]
/** The 20 clubs, as the 2D fan's TIMES. */
export interface Time {
  nome: string
  cor: string
  detalhe: string
  terceira?: string
  roupa: string
}

export const ESQUEMA = E.ESQUEMA as unknown as Aba[]
export const CAMPOS = E.CAMPOS as unknown as Campo[]
export const PECA = E.PECA as unknown as Campo[]
export const DESENHO = E.DESENHO as unknown as Campo[]
export const MECHA = E.MECHA as unknown as Campo[]
export const { PECAS_MAX, DESENHOS_MAX, MECHAS_MAX, TIME_MAX, FRASE_MAX, STICKERS_MAX, CODIGO_MAX } = E
export const PALETAS = E.PALETAS as Record<"geral" | "pele" | "cabelo", string[]>
export const NOMES_COR = E.NOMES_COR as Record<string, string>
/** The presets: [name, look]. */
export const MODELOS = E.MODELOS as unknown as [string, Torcedor3DSalvo][]

/** Anything in, a whole look out: unknown keys dropped, wrong types to the default, numbers kept to their range. */
export const normalizar = E.normalizar as unknown as (entrada: unknown) => Torcedor3D
/** Only what differs from the default: what the profile keeps (send it as `t3`). */
export const enxugar = E.enxugar as unknown as (look: Torcedor3D) => Torcedor3DSalvo
/** The share code, "T1:…". */
export const codigo = E.codigo as unknown as (look: Torcedor3D) => string
/** A code (or anything) back to a whole look, or null. */
export const lerCodigo = E.lerCodigo as unknown as (texto: unknown) => Torcedor3D | null
/** A fan by chance, the same for the same seed. */
export const sortear = E.sortear as unknown as (semente?: number) => Torcedor3D
export const umEmoji = E.umEmoji as (texto: unknown) => boolean
/** Where a free piece rides. */
export const ondeFica = E.ondeFica as (peca: Peca) => "cabeca" | "corpo" | "mao"

export const TIMES = V.TIMES as Time[]
export const clube = V.clube as (nome: string) => Time | null
/** Their team picked: a club's shirt goes on (they may change it after). */
export const comTime = V.comTime as unknown as <T extends Torcedor3DSalvo>(look: T, nome: string) => T
/** The referee's kit and Santa's hat, put on only to draw: never save what it returns. */
export const vestir = V.vestir as unknown as (look: Torcedor3DSalvo, ocasiao?: { arbitro?: boolean; natal?: boolean }) => Torcedor3D
/** Whether it's December in Brasília (the stand's Santa hat). */
export const natal = V.natal as (agora?: number) => boolean

/** Someone's 3D fan from their 2D one (as saved, or null), the same every time for the same login. */
export const doAntigo = A.doAntigo as unknown as (aparencia: Choice | null | undefined, login: string) => Torcedor3D
/** Someone's 3D fan from what the profile API has: their `t3` when they saved one, else doAntigo's. */
export const torcedorDe = A.torcedorDe as unknown as (aparencia: Choice | null | undefined, login: string) => Torcedor3D
