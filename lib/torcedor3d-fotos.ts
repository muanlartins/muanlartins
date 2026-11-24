/**
 * The 3D fan's model and pictures for the site: public/stream/torcedor3d/boneco.js, bundled with npm's three (the same
 * 0.182 the overlays take from jsDelivr). Importing it is safe in the build's Node; only building a fan or a picture
 * needs the browser (a DOM for the face and shirt, WebGL for the pictures), so call them from effects or handlers.
 * Give both a look from vestir() (lib/torcedor3d.ts).
 */
import type { Group, Object3D, Scene } from "three"
import * as B from "@/public/stream/torcedor3d/boneco.js"
import type { Torcedor3D } from "@/lib/torcedor3d"

/** At rest, a goal (both arms up), a wave, clapping, a goal against, and at rest with the eyes shut (a blink). */
export type Pose = "parado" | "cima" | "aceno" | "palmas" | "triste" | "pisca"
/** The frames a picture can take: the whole fan, the head, the body, the head with what's on it, the eyes. */
export type Quadro = "inteiro" | "cabeca" | "corpo" | "alto" | "olhos"

/** One fan in a scene of your own (the editor's): add `raiz`, call `pose`, and `descartar` when it goes. */
export interface Boneco {
  raiz: Group
  pose(nome?: Pose): void
  /** Each free piece as [its side, the mirrored side], Object3Ds a gizmo can move. */
  pecas: Object3D[][]
  ancoras: { cabeca: Object3D; corpo: Object3D; mao: Object3D }
  /** After moving side `lado` of piece i: the other side mirrors it, both outlines follow. */
  seguir(i: number, lado?: 0 | 1): void
  descartar(): void
}
/** A picture of the stand's: the fan cut out, and where the cut sits in the whole frame (W × H). */
export interface Foto {
  img: ImageBitmap
  x: number
  y: number
  W: number
  H: number
}
/** A fan baked one small step per passo(), so no frame pays for a whole fan (the stand's way). */
export interface Sessao {
  readonly px: number
  readonly montado: boolean
  /** Set once the last step is taken: the pictures by pose. */
  readonly pronto: Promise<Partial<Record<Pose, Foto>>> | null
  /** A shader is compiling off the main thread: wait before the next step. */
  readonly esperando: boolean
  /** One step; true once all the poses are shot. */
  passo(): boolean
  /** Stops half way: the fan and the pictures already shot go. */
  largar(): void
}
export interface Fotografo {
  /** Whole frames at once (thumbnails, a gallery). */
  tirar(look: Torcedor3D, poses: Pose[], opcoes?: { altura?: number; quadro?: Quadro; traco?: number; giro?: number }): Partial<Record<Pose, HTMLCanvasElement>>
  /** `px` is pixels per head unit (the stand's 17 to 63 px heads are about 8 to 30). */
  sessao(look: Torcedor3D, poses: Pose[], opcoes: { px: number; quadro?: Quadro; traco?: number; fino?: number }): Sessao
  /** Makes the WebGL canvas now, so the first picture doesn't pay for it. */
  preparar(): void
}

export const POSES = B.POSES as Pose[]
export const FOTO = B.FOTO as Record<Quadro, { x: number; y: number; w: number; h: number }>
/** Builds one fan; `qualidade` 1 is the editor's, 0.5 what pictures need. */
export const criarBoneco = B.criarBoneco as unknown as (look: Torcedor3D, opcoes?: { qualidade?: number; traco?: number }) => Boneco
/** The lights the pictures are shot under, for a scene of your own. */
export const luzes = B.luzes as (cena: Scene) => void
/** One WebGL canvas for every picture on the page. */
export const fotografo = B.fotografo as unknown as Fotografo

let fonte: Promise<void> | null = null
/**
 * The shirt's number is painted with a face literally named "Space Grotesk"; next/font serves it under another name, so
 * the site loads the overlays' own file under that name once. Await it before the first fan or picture of a page.
 */
export function prepararFonte(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve()
  fonte ??= new FontFace("Space Grotesk", "url(/stream/space-grotesk.ttf)", { weight: "300 700" })
    .load()
    .then((f) => void document.fonts.add(f))
    .catch(() => {})
  return fonte
}
