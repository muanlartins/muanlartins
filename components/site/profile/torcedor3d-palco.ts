/**
 * The 3D editor's stage and its pictures (the prototype's editor.js, kept to its behaviour): the fan turning as you drag,
 * the poses and the blink, the free pieces picked on the model itself and moved with three's gizmo, and the queue that
 * draws the editor's thumbnails one per frame, so typing or dragging never stalls. Imperative, as three.js is; the editor
 * (fan-editor.tsx) imports this file only in the browser, so three, the gizmo and the model stay out of the page's first
 * load and out of the build's Node.
 */
import * as THREE from "three"
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js"
import { normalizar, ondeFica, PECA, PECAS_MAX, vestir, type Campo, type Peca, type Torcedor3D } from "@/lib/torcedor3d"
import { criarBoneco, fotografo, luzes, prepararFonte, type Boneco, type Pose, type Quadro } from "@/lib/torcedor3d-fotos"

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const entre = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const PASSO = 0.05
const LIMITE = Object.fromEntries(PECA.filter((c) => c.tipo === "num").map((c) => [c.k, c])) as unknown as Record<string, Required<Pick<Campo, "min" | "max">>>
/** A piece as the code keeps it: clamped and rounded like any code (esquema.js's validar, through normalizar). */
const validarPeca = (p: Partial<Peca>): Peca => normalizar({ pecas: [p] }).pecas[0]

/** A picked piece: its index and which side (1 is the mirrored copy). */
export interface Escolha {
  i: number
  lado: 0 | 1
}
export type Modo = "translate" | "rotate" | "scale"

/** What the stage tells the editor. */
export interface Avisos {
  /** The picked pieces changed; `abrir` when the Livre tab should open on the first. */
  escolheu(lista: Escolha[], abrir: boolean): void
  /** A gizmo drag ended with pieces moved: the look with them, one undo step. */
  soltou(look: Torcedor3D): void
  /** The fan was turned by hand (the "drag to turn" hint has done its job). */
  girou(): void
}

export interface Palco {
  /** The look to show; the same object again does nothing. */
  mostrar(look: Torcedor3D): void
  pose(nome: Pose): void
  /** Picks a piece (null lets go); `somar` adds or takes it from what's picked (Shift). */
  escolher(i: number | null, opcoes?: { lado?: 0 | 1; somar?: boolean; abrir?: boolean }): void
  /** Sets what's picked outright (after adding or pasting pieces). */
  marcar(lista: Escolha[], abrir?: boolean): void
  modo(m: Modo): void
  encaixar(sim: boolean): void
  girar(passo: number): void
  /** While the gizmo is dragging, Escape puts the piece back. */
  arrastando(): boolean
  desfazerArrasto(): void
  /** For the tests: how many times the fan was rebuilt, and the triangles drawn. */
  medidas(): { montagens: number; triangulos: number; pendentes: number }
  descartar(): void
}

/** The thumbnails: a canvas each, drawn one per frame once changes settle, newest request per canvas. */
const fila = new Map<HTMLCanvasElement, () => HTMLCanvasElement | undefined>()
let fotoPronta = 0
const guardadas = new Map<string, HTMLCanvasElement>()

function desenharFoto(t: HTMLCanvasElement, f: HTMLCanvasElement) {
  const g = t.getContext("2d")
  if (!g) return
  g.clearRect(0, 0, t.width, t.height)
  const e = Math.min(t.width / f.width, t.height / f.height)
  g.drawImage(f, (t.width - f.width * e) / 2, t.height - f.height * e, f.width * e, f.height * e)
}

export const fotos = {
  /** A picture of `look` for this canvas; with `guardar`, kept by that key and drawn at once next time (presets, the gallery). */
  pedir(t: HTMLCanvasElement, look: Torcedor3D, { quadro = "inteiro", giro = 0, guardar }: { quadro?: Quadro; giro?: number; guardar?: string } = {}) {
    const pronta = guardar && guardadas.get(guardar)
    if (pronta) {
      fila.delete(t)
      return desenharFoto(t, pronta)
    }
    fila.set(t, () => {
      const f = fotografo.tirar(vestir(look), ["parado"], { altura: t.height * 2, quadro, giro }).parado
      if (f && guardar) guardadas.set(guardar, f)
      return f
    })
  },
  /** An option's picture: the look with that option on, without what would hide it (esquema.js's `foto`). */
  pedirOpcao(t: HTMLCanvasElement, look: Torcedor3D, chave: string, valor: string, quadro: Quadro) {
    const de = normalizar({ ...look, [chave]: valor })
    // What is held, a hat or glasses would hide the very thing being chosen.
    if (chave !== "mao") de.mao = "nada"
    if (["topo", "franja", "atras", "orelha", "chifre"].includes(chave)) de.chapeu = "nada"
    if (["roupa", "gola", "sobre", "golaA", "ombreira", "cinto"].includes(chave)) de.pesc = "nada"
    if (["olho", "sobr", "pupila"].includes(chave)) de.oculos = "nada"
    const giro = ({ costas: -0.6, cauda: -0.6, capuz: -1.2 } as Record<string, number>)[chave] ?? 0
    fotos.pedir(t, de, { quadro: chave === "mao" ? "inteiro" : quadro, giro })
  },
  /** A change is on its way: the pictures wait until it settles. */
  adiar(ms = 250) {
    fotoPronta = performance.now() + ms
  },
  esquecer(t: HTMLCanvasElement) {
    fila.delete(t)
  },
  pendentes: () => fila.size,
}

/** One picture, the oldest request first; a canvas no longer on the page is skipped. */
function umaFoto() {
  for (const [t, fazer] of fila) {
    fila.delete(t)
    if (!t.isConnected) continue
    const f = fazer()
    if (f) desenharFoto(t, f)
    return
  }
}

/** What the model draws: the look without the stand's team, shout and stickers, which change nothing on it. */
const chaveDoDesenho = (look: Torcedor3D) => JSON.stringify(look, (k, v) => (k === "time" || k === "frase" || k === "stickers" ? undefined : v))

export function criarPalco(tela: HTMLCanvasElement, avisos: Avisos): Palco {
  const render = new THREE.WebGLRenderer({ canvas: tela, alpha: true, antialias: true })
  render.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  const cena = new THREE.Scene()
  luzes(cena)
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 80)
  const mesa = new THREE.Group()
  cena.add(mesa)
  let atual: Torcedor3D | null = null
  let desenhado = ""
  let boneco: Boneco | null = null
  let sujo = false
  let montagens = 0
  let poseAtual: Pose = "parado"
  let giro = -0.22
  let alvoGiro = giro
  let vivo = true
  let pronto = false
  let quadro = 0

  function medir() {
    const { clientWidth: w, clientHeight: h } = tela
    if (!w || !h) return
    render.setSize(w, h, false)
    camera.aspect = w / h
    const dist = Math.max(5.6, 5.2 / camera.aspect) / (2 * Math.tan((camera.fov * Math.PI) / 360))
    camera.position.set(0, 0.3, dist)
    camera.lookAt(0, -0.45, 0)
    camera.updateProjectionMatrix()
  }
  const tamanho = new ResizeObserver(medir)
  tamanho.observe(tela)
  // Off screen (another tab of the profile, scrolled away) nothing is drawn; the thumbnails still come.
  let visivel = true
  const olho = new IntersectionObserver(([e]) => (visivel = e.isIntersecting))
  olho.observe(tela)

  // Turning: a press that moves turns the fan; one that barely moves is a click, which picks a free piece.
  // These listeners come before the gizmo's, so a press the gizmo takes is marked (`gizmo`) before it moves.
  let arrasto: { x: number; y: number; giro: number; longe: boolean; gizmo?: boolean } | null = null
  const ouvir: [string, EventListener][] = []
  const em = <E extends Event>(tipo: string, f: (e: E) => void) => {
    tela.addEventListener(tipo, f as EventListener)
    ouvir.push([tipo, f as EventListener])
  }
  em<PointerEvent>("pointerdown", (e) => {
    arrasto = { x: e.clientX, y: e.clientY, giro: alvoGiro, longe: false }
    tela.setPointerCapture(e.pointerId)
  })
  em<PointerEvent>("pointermove", (e) => {
    tela.style.cursor = gizmo.axis ? "move" : ""
    if (!arrasto) return
    if (Math.hypot(e.clientX - arrasto.x, e.clientY - arrasto.y) > 6) arrasto.longe = true
    if (arrasto.gizmo) return
    alvoGiro = arrasto.giro + (e.clientX - arrasto.x) / 90
    if (arrasto.longe) avisos.girou()
  })
  em<PointerEvent>("pointerup", (e) => {
    if (arrasto && !arrasto.longe) clicar(e, arrasto.gizmo)
    arrasto = null
  })
  em<PointerEvent>("pointercancel", () => {
    arrasto = null
    // The gizmo only listens for pointerup: a cancelled touch must still end its drag, or the fan would never rebuild.
    if (gizmo.dragging) gizmo.pointerUp(null)
  })
  em<KeyboardEvent>("keydown", (e) => {
    if (e.key === "ArrowLeft") alvoGiro -= 0.3
    else if (e.key === "ArrowRight") alvoGiro += 0.3
    else return
    e.preventDefault()
  })

  // Free pieces straight on the 3D view: click one to pick it (Shift+click picks more), drag the gizmo, let go to keep it.
  const gizmo = new TransformControls(camera, tela)
  tela.style.touchAction = "" // the gizmo turns page scroll off; on a phone the canvas keeps pan-y until a piece is picked
  // Axes keep their usual three hues (cyan for depth: a blue one would vanish on Klein); the handle in use goes Branco.
  gizmo.setColors("#ff5c9a", "#3ddc97", "#4dd4ff", "#f4f5f7")
  gizmo.setSize(matchMedia("(pointer: coarse)").matches ? 1.15 : 0.85)
  cena.add(gizmo.getHelper())
  const raio = new THREE.Raycaster()
  let escolhidas: Escolha[] = []
  let avisadas = "[]"
  let inicio: { i: number; lado: 0 | 1; g: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; mundo: THREE.Vector3 }[] | null = null
  const caixas: THREE.BoxHelper[] = []
  const visto = (o: THREE.Object3D | null) => {
    for (; o; o = o.parent) if (!o.visible) return false
    return true
  }
  const ladoDe = (i: number, lado: number) => boneco?.pecas[i]?.[lado]

  /** Points the gizmo, the boxes and the editor at what is picked; also after the fan is rebuilt. */
  function prender(abrir = false) {
    const n = atual?.pecas.length ?? 0
    escolhidas = escolhidas.filter(({ i }) => i < n)
    if (boneco) for (const e of escolhidas) if (!ladoDe(e.i, e.lado)?.visible) e.lado = 0
    const [p] = escolhidas
    const g = p && ladoDe(p.i, p.lado)
    if (g) gizmo.attach(g)
    else gizmo.detach()
    escolhidas.forEach(({ i, lado }, j) => {
      // A box round each picked piece, drawn through the head so a buried piece is still found:
      // Branco round the one holding the gizmo, Klein claro round the others, both reading on the Klein ground.
      if (!caixas[j]) {
        caixas[j] = new THREE.BoxHelper(undefined, "#f4f5f7")
        Object.assign(caixas[j].material, { depthTest: false, transparent: true, opacity: 0.8 })
        caixas[j].renderOrder = 2
        cena.add(caixas[j])
      }
      ;(caixas[j].material as THREE.LineBasicMaterial).color.set(j ? "#85a7ff" : "#f4f5f7")
      caixas[j].object = ladoDe(i, lado)?.children[0] as THREE.Object3D
    })
    caixas.forEach((c, j) => (c.visible = j < escolhidas.length && !!c.object))
    tela.style.touchAction = escolhidas.length ? "none" : ""
    const agora = JSON.stringify(escolhidas)
    if (agora !== avisadas || abrir) {
      avisadas = agora
      avisos.escolheu(escolhidas.map((e) => ({ ...e })), abrir && escolhidas.length > 0)
    }
  }

  function escolher(i: number | null, { lado = 0, somar = false, abrir = true }: { lado?: 0 | 1; somar?: boolean; abrir?: boolean } = {}) {
    if (i === null) escolhidas = []
    else if (!somar) escolhidas = [{ i, lado }]
    else if (escolhidas.some((e) => e.i === i)) escolhidas = escolhidas.filter((e) => e.i !== i)
    else escolhidas.push({ i, lado })
    prender(abrir)
  }

  function clicar(e: PointerEvent, noGizmo = false) {
    if (!boneco) return
    const r = tela.getBoundingClientRect()
    raio.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    // The nearest thing hit, outlines aside: a piece behind the head is not picked through it.
    const alvo = raio
      .intersectObject(boneco.raiz, true)
      .find((h) => (h.object as THREE.Mesh).material && ((h.object as THREE.Mesh).material as THREE.Material).side !== THREE.BackSide && visto(h.object))
    let achou: Escolha | null = null
    boneco.pecas.forEach((lados, i) =>
      lados.forEach((g, lado) => {
        if (alvo && g.children[0] === alvo.object) achou = { i, lado: lado as 0 | 1 }
      }),
    )
    const a = achou as Escolha | null
    // On the gizmo a still click only narrows several picked pieces down to the one under it.
    if (noGizmo) {
      if (a && !e.shiftKey && escolhidas.length > 1 && escolhidas.some(({ i }) => i === a.i)) escolher(a.i, { lado: a.lado })
      return
    }
    if (a) escolher(a.i, { lado: a.lado, somar: e.shiftKey })
    else if (!e.shiftKey) escolher(null)
  }

  /** Keeps a dragged piece inside what the code can hold. */
  function conter(g: THREE.Object3D) {
    const c = (k: string, v: number) => entre(v, LIMITE[k].min, LIMITE[k].max)
    g.position.set(c("x", g.position.x), c("y", g.position.y), c("z", g.position.z))
    g.scale.set(c("sx", g.scale.x), c("sy", g.scale.y), c("sz", g.scale.z))
    const r = g.rotation
    if (Math.max(Math.abs(r.x), Math.abs(r.y), Math.abs(r.z)) > 3.14) r.set(c("rx", r.x), c("ry", r.y), c("rz", r.z))
  }

  gizmo.addEventListener("dragging-changed", (e) => {
    if (!e.value) return gravarArrasto()
    if (arrasto) arrasto.gizmo = true
    inicio = escolhidas.flatMap(({ i, lado }) => {
      const g = ladoDe(i, lado)
      return g ? [{ i, lado, g, p: g.position.clone(), q: g.quaternion.clone(), s: g.scale.clone(), mundo: g.getWorldPosition(V()) }] : []
    })
  })
  // While dragging only the picked groups move: the fan is rebuilt once, on release.
  gizmo.addEventListener("objectChange", () => {
    const [p, ...outras] = inicio ?? []
    if (!p || !boneco) return
    const g = p.g
    // Snapping in the piece's own numbers (0.05), not the world's; turning and stretching snap in the gizmo.
    if (encaixe && gizmo.mode === "translate") g.position.set(...(g.position.toArray().map((v) => Math.round(v / PASSO) * PASSO) as [number, number, number]))
    conter(g)
    if (outras.length) {
      // The others: the same move in the world, the same turn and stretch where they are.
      const anda = g.getWorldPosition(V()).sub(p.mundo)
      const gira = g.quaternion.clone().multiply(p.q.clone().invert())
      const estica = g.scale.clone().divide(p.s)
      for (const o of outras) {
        o.g.position.copy(o.g.parent!.worldToLocal(o.mundo.clone().add(anda)))
        o.g.quaternion.copy(gira).multiply(o.q)
        o.g.scale.copy(o.s).multiply(estica)
        conter(o.g)
      }
    }
    for (const { i, lado } of inicio!) boneco.seguir(i, lado)
  })

  /** Release: the numbers go back to the look, clamped and rounded like any code, as one undo step. */
  function gravarArrasto() {
    if (!inicio || !boneco || !atual) return
    const movidas = inicio
    inicio = null
    const pecas = atual.pecas.map((d) => ({ ...d }))
    let mudou = false
    for (const { i, lado, g } of movidas) {
      const d = pecas[i]
      if (!d) continue
      const l = lado ? -1 : 1
      const novo = reancorar(d, validarPeca({ ...d, x: l * g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: l * g.rotation.y, rz: l * g.rotation.z, sx: g.scale.x, sy: g.scale.y, sz: g.scale.z }))
      if (JSON.stringify(novo) !== JSON.stringify(d)) {
        pecas[i] = novo
        mudou = true
      }
    }
    if (!mudou) return
    atual = { ...atual, pecas }
    desenhado = chaveDoDesenho(atual)
    sujo = true
    avisos.soltou(atual)
  }

  /** An "auto" piece dropped across the chin line changes anchor; it keeps the spot it was dropped on, seen at rest. */
  function reancorar(d: Peca, novo: Peca): Peca {
    const de = ondeFica(d)
    const para = ondeFica(novo)
    if (de === para || !boneco) return novo
    boneco.pose("parado")
    boneco.raiz.updateMatrixWorld(true)
    const m = new THREE.Matrix4().compose(V(novo.x, novo.y, novo.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(novo.rx, novo.ry, novo.rz)), V(novo.sx, novo.sy, novo.sz))
    m.premultiply(boneco.ancoras[de].matrixWorld).premultiply(boneco.ancoras[para].matrixWorld.clone().invert())
    boneco.pose(poseAtual)
    const p = V()
    const q = new THREE.Quaternion()
    const s = V()
    m.decompose(p, q, s)
    const r = new THREE.Euler().setFromQuaternion(q)
    const feito = validarPeca({ ...novo, x: p.x, y: p.y, z: p.z, rx: r.x, ry: r.y, rz: r.z, sx: s.x, sy: s.y, sz: s.z })
    // Its new height must not send it back across the line.
    if (ondeFica(feito) !== para) feito.onde = para
    return feito
  }

  let encaixe = false
  function modo(m: Modo) {
    gizmo.setMode(m)
    // Moving goes by the screen's axes, turning by the piece's own.
    gizmo.setSpace(m === "rotate" ? "local" : "world")
  }
  function encaixar(sim: boolean) {
    encaixe = sim
    gizmo.setRotationSnap(sim ? Math.PI / 12 : null)
    gizmo.setScaleSnap(sim ? PASSO : null)
  }

  // A blink every 3–6 s while standing: pose("pisca") only swaps the face map, the fan isn't rebuilt. None for whoever
  // asks for less motion.
  const calmo = matchMedia("(prefers-reduced-motion: reduce)")
  let piscaEm = 3000
  let piscando = false
  function piscar(agora: number) {
    if (!boneco || calmo.matches) return
    if (piscando && agora > piscaEm + 120) {
      piscando = false
      if (poseAtual === "parado") boneco.pose("parado")
      piscaEm = agora + 3000 + Math.random() * 3000
    } else if (!piscando && agora > piscaEm && poseAtual === "parado") {
      piscando = true
      boneco.pose("pisca")
    }
  }

  function laco(agora: number) {
    if (!vivo) return
    try {
      // Never swapped under a gizmo drag: the drag holds the old fan's piece until release.
      if (sujo && atual && !gizmo.dragging) {
        sujo = false
        montagens++
        if (boneco) {
          mesa.remove(boneco.raiz)
          boneco.descartar()
        }
        boneco = criarBoneco(vestir(atual))
        boneco.pose(poseAtual)
        piscando = false
        mesa.add(boneco.raiz)
        prender()
      }
      piscar(agora)
      giro += (alvoGiro - giro) * 0.22
      mesa.rotation.y = giro
      if (escolhidas.length) {
        mesa.updateMatrixWorld()
        for (const c of caixas) if (c.visible) c.update()
      }
      if (visivel && !document.hidden) render.render(cena, camera)
      if (agora > fotoPronta) umaFoto()
    } catch (e) {
      console.error(e)
    }
    quadro = requestAnimationFrame(laco)
  }
  // The shirt's number needs the font before the first fan or picture.
  prepararFonte().finally(() => {
    if (!vivo) return
    pronto = true
    sujo = !!atual
    medir()
    quadro = requestAnimationFrame(laco)
  })

  return {
    mostrar(look) {
      if (look === atual) return
      atual = look
      // Typing the shout or picking stickers doesn't rebuild the fan.
      const chave = chaveDoDesenho(look)
      if (chave !== desenhado) {
        desenhado = chave
        sujo = pronto
      }
      prender()
    },
    pose(nome) {
      poseAtual = nome
      piscando = false
      boneco?.pose(nome)
    },
    escolher,
    marcar(lista, abrir = true) {
      escolhidas = lista.filter((e) => e.i < PECAS_MAX).map((e) => ({ ...e }))
      prender(abrir)
    },
    modo,
    encaixar,
    girar(passo) {
      alvoGiro += passo
    },
    arrastando: () => gizmo.dragging,
    desfazerArrasto() {
      if (gizmo.dragging) gizmo.reset()
    },
    medidas: () => ({ montagens, triangulos: render.info.render.triangles, pendentes: fila.size }),
    descartar() {
      vivo = false
      cancelAnimationFrame(quadro)
      tamanho.disconnect()
      olho.disconnect()
      for (const [tipo, f] of ouvir) tela.removeEventListener(tipo, f)
      gizmo.detach()
      gizmo.dispose()
      if (boneco) boneco.descartar()
      for (const c of caixas) c.dispose()
      render.dispose()
    },
  }
}
