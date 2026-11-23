"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useDecember } from "@/components/site/december"
import { medidas, pedir, quandoVisivel, soltar, vestido, type Picture, type Pose, type Quadro, type Quem } from "@/components/site/fan/estudio"
import { cn } from "@/lib/utils"

export type { Pose, Quadro }

/**
 * What a fan can play, as on the live's stand: their goal celebration (`festa`, the one they picked on /perfil), a goal
 * against (`lamenta`), arriving (`chega`) and the chat's commands (`pula`, `danca`, `ola`, `grito`).
 */
export type Momento = "festa" | "lamenta" | "chega" | "pula" | "danca" | "ola" | "grito"

/** The frames in head units, as boneco.js's FOTO (copied so the page needs no three.js before the first picture). */
const FRAMES: Record<Quadro, { x: number; y: number; w: number; h: number }> = {
  inteiro: { x: 0, y: -0.36, w: 4.5, h: 5.3 },
  cabeca: { x: 0, y: 0.05, w: 3.0, h: 3.4 },
  corpo: { x: 0, y: -1.3, w: 3.8, h: 3.8 },
  alto: { x: 0, y: 0.3, w: 3.6, h: 4.4 },
  olhos: { x: 0, y: -0.04, w: 1.18, h: 1.34 },
}

/** The pictures each moment swaps through (a celebration's depend on which it is), baked before it plays. */
const POSES_DE: Record<Momento, (fes: string) => Pose[]> = {
  festa: (fes) => (fes === "acena" ? ["aceno", "cima"] : fes === "palmas" ? ["palmas", "cima"] : fes === "danca" ? ["cima", "aceno"] : ["cima"]),
  lamenta: () => ["triste"],
  chega: () => ["aceno"],
  pula: () => ["cima"],
  danca: () => ["cima", "aceno"],
  ola: () => ["cima"],
  grito: () => ["aceno"],
}

interface Passo {
  pose: Pose
  /** Across, in px; up and down, in the box's heights; turned, in radians. */
  x: number
  y: number
  rot: number
  sombra: boolean
  opacidade: number
}
const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
/** A jump's height, in the box's heights. */
const PULO = 0.12

/**
 * Where a moment is `d` ms in, or null once it's over: the live stand's moves (the prototype's `agitar`), the poses
 * swapping as there. With less motion, only the pictures change.
 */
function mover(m: Momento, fes: string, d: number, menos: boolean): Passo | null {
  const P = (pose: Pose, y = 0, rot = 0, x = 0, sombra = false, opacidade = 1): Passo =>
    menos ? { pose, x: 0, y: 0, rot: 0, sombra, opacidade: 1 } : { pose, x, y, rot, sombra, opacidade }
  switch (m) {
    case "festa": {
      if (d > 5000) return null
      if (fes === "acena") return P(Math.floor(d / 240) % 4 === 3 ? "cima" : "aceno", 0, Math.sin(d / 110) * 0.09)
      if (fes === "palmas") return P(Math.floor(d / 170) % 2 ? "palmas" : "cima", -Math.abs(Math.sin(d / 170)) * 0.04)
      if (fes === "danca") return P(Math.floor(d / 420) % 2 ? "aceno" : "cima", 0, Math.sin(d / 200) * 0.17)
      return P("cima", -Math.abs(Math.sin(d / 190)) * PULO, fes === "gira" && d < 1000 ? suave(0, 1000, d) * 2 * Math.PI : 0)
    }
    case "pula":
      // Three jumps.
      return d > 2100 ? null : P("cima", -Math.abs(Math.sin((d / 700) * Math.PI)) * PULO)
    case "danca":
      return d > 3600 ? null : P(Math.floor(d / 420) % 2 ? "aceno" : "cima", 0, Math.sin(d / 200) * 0.17)
    case "ola":
      return d > 480 ? null : P("cima", -Math.sin((d / 480) * Math.PI) * PULO)
    case "grito":
      return d > 2600 ? null : P("aceno", 0, Math.sin(d / 160) * 0.05)
    case "lamenta": {
      if (d > 2600) return null
      const k = Math.min(suave(0, 300, d), suave(0, 300, 2600 - d))
      return P(k > 0.2 ? "triste" : "parado", 0.045 * k, 0, 0, k > 0.2)
    }
    case "chega": {
      if (d > 900) return null
      // In from the side, then a hop, waving.
      const k = suave(0, 540, d)
      return P(d > 540 ? "aceno" : "parado", d > 540 ? -Math.sin(((d - 540) / 360) * Math.PI) * PULO : 0, 0, (1 - k) * 120, false, Math.min(1, d / 320))
    }
  }
}

// One observer for the size of every fan on the page.
const medindo = new Map<Element, (altura: number) => void>()
let regua: ResizeObserver | null = null
function medir(el: Element, fn: (altura: number) => void) {
  if (typeof ResizeObserver === "undefined") {
    fn(el.getBoundingClientRect().height)
    return () => {}
  }
  regua ??= new ResizeObserver((vistos) => {
    for (const v of vistos) medindo.get(v.target)?.(v.contentRect.height)
  })
  medindo.set(el, fn)
  regua.observe(el)
  return () => {
    medindo.delete(el)
    regua?.unobserve(el)
  }
}

if (process.env.NODE_ENV === "development" && typeof window !== "undefined") Object.assign(window, { __torcedores: medidas })

/** The bust while the picture bakes (and for good without WebGL): a soft shape of what's coming, in the ink around it. */
function Silhueta({ quadro, pulsa }: { quadro: Quadro; pulsa: boolean }) {
  const f = FRAMES[quadro]
  return (
    <svg
      viewBox={`${f.x - f.w / 2} ${-(f.y + f.h / 2)} ${f.w} ${f.h}`}
      aria-hidden
      className={cn("absolute inset-0 h-full w-full fill-current opacity-[0.14]", pulsa && "motion-safe:animate-pulse")}
    >
      <circle cx="0" cy="0" r="1.05" />
      <rect x="-0.32" y="0.8" width="0.64" height="0.5" />
      <path d="M-1.55 2.93V2.1C-1.55 1.5-1.1 1.2-0.55 1.15H0.55C1.1 1.2 1.55 1.5 1.55 2.1V2.93Z" />
    </svg>
  )
}

/**
 * A fan in 3D, as the live's stand draws them, filling the box `className` gives it (its height sets the picture's;
 * the frame is wider than the old 2:3 figure and spills sideways, empty). Who: `aparencia` (what the profile API has:
 * their `t3`, else their 2D fan's, made 3D from their `login`), or a `look`, or a preset by `modelo`. In December the
 * Santa hat goes on (`natal` forces it either way), as on the stand; nothing drawn here is ever saved.
 *
 * The picture is baked only once the box nears the screen, on the page's one WebGL canvas, a step at a time, and
 * cached by look, frame, size and pose, so a page of many fans stays smooth; a silhouette stands in meanwhile. `pose`
 * is the picture at rest; `momento` plays a moment (again each time `vez` changes, after `atraso` ms), and `acoes`
 * bakes a moment's pictures ahead so it starts at once. `aguardando` holds the silhouette while the look is still on
 * its way (the profiles loading), so nobody's default fan is baked for nothing. `alt` names the picture; without it,
 * it's decoration beside a name (brand/interface.md, "Icons and images").
 */
export function Torcedor3D({
  aparencia,
  login,
  look,
  modelo,
  pose = "parado",
  momento,
  acoes,
  quadro = "inteiro",
  alt = "",
  natal,
  arbitro,
  aguardando = false,
  className,
}: Omit<Quem, "natal" | "arbitro"> & {
  pose?: Pose
  momento?: { tipo: Momento; vez?: number; atraso?: number } | null
  acoes?: Momento[]
  quadro?: Quadro
  alt?: string
  natal?: boolean
  arbitro?: boolean
  aguardando?: boolean
  className?: string
}) {
  const december = useDecember()
  const caixa = useRef<HTMLDivElement>(null)
  const corpo = useRef<HTMLDivElement>(null)
  const [visto, setVisto] = useState(false)
  const [altura, setAltura] = useState(0)
  const [feito, setFeito] = useState<{ codigo: string; fes: string; look: Awaited<ReturnType<typeof vestido>>["look"] } | null>(null)
  const [fotos, setFotos] = useState<{ codigo: string; por: Partial<Record<Pose, Picture>> }>({ codigo: "", por: {} })
  const [falhou, setFalhou] = useState(false)
  const [doMomento, setDoMomento] = useState<Pose | null>(null)

  // Who, as one string: the effects follow it, not the objects' identities.
  const quem = useMemo(
    () => JSON.stringify({ aparencia: aparencia ?? null, login: login ?? "", look: look ?? null, modelo: modelo ?? "", natal: natal ?? december, arbitro: !!arbitro }),
    [aparencia, login, look, modelo, natal, december, arbitro],
  )

  useEffect(() => quandoVisivel(caixa.current!, () => setVisto(true)), [])
  useEffect(
    () =>
      medir(caixa.current!, (h) => {
        // Device pixels, at most 2 a CSS pixel: past that nobody sees a difference, and memory does.
        if (h > 0) setAltura(Math.min(640, Math.round(h * Math.min(2, devicePixelRatio || 1))))
      }),
    [],
  )

  useEffect(() => {
    if (!visto || aguardando) return
    let vivo = true
    vestido(quem).then(
      ({ look, codigo }) => vivo && setFeito({ look, codigo, fes: String(look.fes) }),
      () => vivo && setFalhou(true),
    )
    return () => {
      vivo = false
    }
  }, [visto, quem, aguardando])

  const fes = feito?.fes ?? ""
  const tipo = momento?.tipo
  const precisa = [pose, ...(acoes ?? []).flatMap((a) => POSES_DE[a](fes)), ...(tipo ? POSES_DE[tipo](fes) : [])]
  const poses = [...new Set(precisa)].sort().join(",")

  useEffect(() => {
    if (!feito || !altura) return
    let vivo = true
    const { chave, fotos: vindo } = pedir(feito.look, feito.codigo, quadro, altura, poses.split(",") as Pose[])
    vindo.forEach((promessa, i) => {
      const p = poses.split(",")[i] as Pose
      promessa.then(
        (pic) => {
          if (!vivo) return
          // Decoded now, so swapping to it later never flashes.
          const img = new Image()
          img.src = pic.src
          img.decode().catch(() => {})
          setFotos((f) => ({ codigo: feito.codigo, por: { ...(f.codigo === feito.codigo ? f.por : {}), [p]: pic } }))
        },
        () => vivo && p === pose && setFalhou(true),
      )
    })
    return () => {
      vivo = false
      soltar(chave)
    }
  }, [feito, altura, quadro, poses, pose])

  // The moment: moves on the picture's box, straight on the element (no render a frame), the picture swapped by state.
  const vez = momento?.vez
  const atraso = momento?.atraso ?? 0
  const fesDaVez = tipo === "festa" ? fes : ""
  useEffect(() => {
    const el = corpo.current
    const box = caixa.current
    if (!tipo || !el || !box || (tipo === "festa" && !fesDaVez)) return
    const menos = matchMedia("(prefers-reduced-motion: reduce)").matches
    const inicio = performance.now() + atraso
    const H = box.getBoundingClientRect().height
    let quadroAnim = 0
    let ultima: Pose | null = null
    const limpar = () => {
      el.style.transform = BASE
      el.style.filter = ""
      el.style.opacity = ""
    }
    const passo = (agora: number) => {
      const d = agora - inicio
      const m = d < 0 ? null : mover(tipo, fesDaVez, d, menos)
      if (d >= 0 && !m) {
        limpar()
        setDoMomento(null)
        return
      }
      if (m) {
        el.style.transform = `${BASE} translate(${m.x.toFixed(2)}px, ${(m.y * H).toFixed(2)}px) rotate(${m.rot.toFixed(4)}rad)`
        el.style.filter = m.sombra ? "brightness(0.65)" : ""
        el.style.opacity = m.opacidade < 1 ? m.opacidade.toFixed(3) : ""
      }
      const p = m?.pose ?? null
      if (p !== ultima) {
        ultima = p
        setDoMomento(p)
      }
      quadroAnim = requestAnimationFrame(passo)
    }
    quadroAnim = requestAnimationFrame(passo)
    return () => {
      cancelAnimationFrame(quadroAnim)
      limpar()
      setDoMomento(null)
    }
  }, [tipo, vez, atraso, fesDaVez])

  const f = FRAMES[quadro]
  const por = feito && fotos.codigo === feito.codigo ? fotos.por : {}
  const querida = doMomento ?? pose
  // The moment's picture if it's in, else the one at rest.
  const mostrada = por[querida] ? querida : por[pose] ? pose : por.parado ? "parado" : null

  return (
    <div
      ref={caixa}
      className={cn("relative", className)}
      {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
    >
      <div ref={corpo} className="absolute top-0 left-1/2 h-full" style={{ aspectRatio: `${f.w} / ${f.h}`, transform: BASE, transformOrigin: "50% 62%" }}>
        {!mostrada && <Silhueta quadro={quadro} pulsa={!falhou} />}
        {(Object.entries(por) as [Pose, Picture][]).map(([p, pic]) => (
          // eslint-disable-next-line @next/next/no-img-element -- a blob baked in the browser, already at its size
          <img
            key={p}
            src={pic.src}
            alt=""
            draggable={false}
            className={cn("pointer-events-none absolute inset-0 h-full w-full select-none", p !== mostrada && "opacity-0")}
          />
        ))}
      </div>
    </div>
  )
}
const BASE = "translateX(-50%)"
