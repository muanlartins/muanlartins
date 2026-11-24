"use client"

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react"
import { Torcedor3D } from "@/components/site/fan/torcedor-3d"
import { cn } from "@/lib/utils"

/** Someone on the stand: their fan as <Torcedor3D> takes it, their name on the riser and what floats over them. */
export interface Lugar {
  id: string
  fan: Omit<ComponentProps<typeof Torcedor3D>, "className" | "escala">
  nome?: string
  /** The reader's own seat: the front row's middle, their name in Klein claro, as the live's stand marks "Você". */
  voce?: boolean
  /** Beside their face (a shout's balloon). */
  acima?: ReactNode
}

/** The live's stand's measures (public/stream/arquibancada3d.js): a riser for 18 px names, room over the top row. */
const DEGRAU = 24
const TOPO = 14
const RAIL = 26
/** The narrowest seat that still fits a name cut to 6 characters at 18 px; with no names, the fan's shoulders. */
const MIN_COM_NOME = 72
const MIN_SEM_NOME = 40
const NOME_FONTE = (familia: string) => `600 18px ${familia}`
let regua: CanvasRenderingContext2D | null = null
/** A name's width at 18 px in the site's face (the page's own family, as next/font names it). */
function medirNome(s: string, familia: string) {
  regua ??= document.createElement("canvas").getContext("2d")
  if (!regua) return s.length * 10
  regua.font = NOME_FONTE(familia)
  return regua.measureText(s).width
}

/** A name as the live's stand cuts it: the first 8 characters and "…", or 6 when 8 don't fit the seat. */
function cortar(nome: string, max: number, medir: (s: string) => number) {
  const letras = [...nome]
  const ate = (n: number) => (letras.length > n ? `${letras.slice(0, n).join("")}…` : nome)
  return medir(ate(8)) <= max ? ate(8) : ate(6)
}

interface Arranjo {
  W: number
  H: number
  R: number
  porFila: number
  passoX: number
  banda: number
  k: number
  baixos: number[]
  frente: number
}

/** The rows for `n` people in a W × H box: the live's fileiras(), every row the same, the seats as wide as fit. */
function fileiras(W: number, H: number, n: number, porFila: number, filas: number, nomes: boolean, frente: number, topo: number): Arranjo {
  const cabem = Math.max(1, Math.min(porFila, Math.floor((W - 24) / (nomes ? MIN_COM_NOME : MIN_SEM_NOME))))
  const R = Math.min(filas, Math.max(1, Math.ceil(n / cabem)))
  const passoX = (W - 24) / cabem
  const faixa = nomes ? DEGRAU : 10
  const livre = H - topo - frente
  const banda = Math.min(R === 1 ? 134 : 102, livre / R - faixa)
  const k = Math.max(4, Math.min((banda + 4) / 4.05, passoX / 2.6))
  const baixos: number[] = []
  let y = H - frente
  for (let r = 0; r < R; r++) {
    baixos.push(y)
    y -= faixa + banda
  }
  return { W, H, R, porFila: cabem, passoX, banda, k, baixos, frente }
}

const KLEIN_NAVY = ["bg-[color-mix(in_oklab,var(--color-klein)_45%,var(--color-navy))]", "bg-[color-mix(in_oklab,var(--color-klein)_30%,var(--color-navy))]"]

/**
 * The live's stand on the site, as torcida.html draws it since the 3D fans (arquibancada3d.js): up to `filas` rows of
 * `porFila` (two of ten), the row behind a quarter seat aside and higher, each row's back cut at 45° on its top corners,
 * a seat behind each place (Klein, every fourth Klein claro), the fans behind the navy riser with its Klein claro edge,
 * and the names on it at 18 px, cut to 8 characters (6 when 8 don't fit), the back rows' outlined in navy. Seats are
 * never narrower than a name: a narrow box seats fewer, and whoever doesn't fit isn't seated. `frente` adds the
 * front rail with the stand's plate. `onda` sends !ola along the stand from the reader's seat. It fills its box.
 */
export function Arquibancada({
  lugares,
  porFila = 10,
  filas = 2,
  nomes = true,
  frente = false,
  topo = TOPO,
  onda,
  className,
}: {
  lugares: Lugar[]
  porFila?: number
  filas?: number
  nomes?: boolean
  frente?: boolean
  /** Room over the top row, for hats and raised arms (the live's canvas has it above the stand). */
  topo?: number
  onda?: number
  className?: string
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState<{ w: number; h: number; familia: string; fontes: number } | null>(null)

  useEffect(() => {
    const el = caixa.current!
    const ler = () => {
      const r = el.getBoundingClientRect()
      setTam((t) => ({ w: r.width, h: r.height, familia: getComputedStyle(el).fontFamily, fontes: t?.fontes ?? 0 }))
    }
    const ro = new ResizeObserver(ler)
    ro.observe(el)
    // Names are measured in the site's face: once it's in, again.
    document.fonts.ready.then(() => setTam((t) => (t ? { ...t, fontes: t.fontes + 1 } : t)))
    return () => ro.disconnect()
  }, [])

  let conteudo: ReactNode = null
  if (tam && tam.w > 0 && tam.h > 0) {
    const a = fileiras(tam.w, tam.h, lugares.length, porFila, filas, nomes, frente ? RAIL : 0, topo)
    const lugaresSentados = lugares.slice(0, a.R * a.porFila)
    // The reader in the front row's middle.
    const meu = lugaresSentados.findIndex((l) => l.voce)
    if (meu >= 0) {
      const [l] = lugaresSentados.splice(meu, 1)
      lugaresSentados.splice(Math.floor((Math.min(a.porFila, lugaresSentados.length + 1) - 1) / 2), 0, l)
    }
    const n = lugaresSentados.length
    const faixa = nomes ? DEGRAU : 10
    const medir = (s: string) => medirNome(s, tam.familia)
    const desloca = (r: number) => (a.R > 1 ? (r % 2 ? a.passoX / 4 : -a.passoX / 4) : 0)
    const posicao = (i: number) => {
      const r = Math.floor(i / a.porFila)
      const naFila = Math.min(a.porFila, n - r * a.porFila)
      return { r, x: a.W / 2 + desloca(r) + ((i % a.porFila) - (naFila - 1) / 2) * a.passoX }
    }
    const lugaresXY = lugaresSentados.map((l, i) => ({ l, ...posicao(i) }))
    const x0 = lugaresXY.find((p) => p.l.voce)?.x ?? a.W / 2
    const fw = 4.5 * a.k
    const fh = 5.3 * a.k

    conteudo = (
      <>
        {Array.from({ length: a.R }, (_, r) => {
          const baixo = a.baixos[r]
          const cima = baixo - faixa
          const passo = faixa + a.banda
          const recuo = 6 + r * 14
          const z = (a.R - r) * 10
          const meio = a.W / 2 + desloca(r)
          return (
            <div key={r} aria-hidden className="contents">
              {/* The row's back: Klein sunk into navy, the rows behind darker. */}
              <div
                className={cn("absolute", KLEIN_NAVY[r % 2])}
                style={{ left: recuo, right: recuo, top: cima - passo * 0.42, height: passo * 0.42, zIndex: z, clipPath: "polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%, 0 14px)" }}
              />
              {Array.from({ length: a.porFila }, (_, c) => {
                const x = meio + (c - (a.porFila - 1) / 2) * a.passoX
                const w = a.passoX * 0.8
                const h = passo * 0.32
                return (
                  <span key={c} className={cn("cut-sm absolute", (c + r) % 4 === 0 ? "bg-klein-claro" : "bg-klein")} style={{ left: x - w / 2, top: cima - h, width: w, height: h, zIndex: z + 1 }}>
                    <span className="absolute inset-x-1 top-[5px] h-0.5 bg-navy/45" />
                  </span>
                )
              })}
              {/* The riser over the busts' base: navy, its edge Klein claro, its bottom corners cut. */}
              <div
                className="absolute border-t-2 border-klein-claro bg-navy"
                style={{ left: recuo, right: recuo, top: cima, height: faixa, zIndex: z + 3, clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px))" }}
              />
            </div>
          )
        })}
        {lugaresXY.map(({ l, r, x }) => {
          // The bust's base sits a tenth of a unit behind the riser's edge, as on the live.
          const pe = a.baixos[r] - faixa + 0.1 * a.k
          const momento = onda ? { tipo: "ola" as const, vez: onda, atraso: (Math.abs(x - x0) / a.passoX) * 140 } : l.fan.momento
          return (
            <div key={l.id} className="absolute" style={{ left: x - fw / 2, top: pe + 0.06 * a.k - fh, width: fw, height: fh, zIndex: (a.R - r) * 10 + 2 }}>
              <Torcedor3D {...l.fan} acoes={[...(l.fan.acoes ?? []), ...(onda !== undefined ? (["ola"] as const) : [])]} momento={momento} escala={1} className="h-full w-full" />
            </div>
          )
        })}
        {nomes &&
          lugaresXY.map(({ l, r, x }) => {
            if (!l.nome) return null
            const texto = cortar(l.nome, a.passoX - 8, medir)
            // Kept on its riser, 8 px from its ends, as the live's are.
            const meia = medir(texto) / 2
            const recuo = 6 + r * 14
            const cx = Math.min(Math.max(x, recuo + 8 + meia), a.W - recuo - 8 - meia)
            return (
              <span
                key={l.id}
                className={cn(
                  "absolute text-[18px] leading-none font-semibold whitespace-nowrap",
                  l.voce ? "text-klein-claro" : "text-paper",
                  // Front-row hats poke into the risers behind: their names get a navy outline.
                  r > 0 && "[-webkit-text-stroke:4px_var(--color-navy)] [paint-order:stroke_fill]",
                )}
                style={{ left: cx, top: a.baixos[r] - faixa + faixa / 2 + 1.5, transform: "translate(-50%, -50%)", zIndex: 100 }}
              >
                {texto}
              </span>
            )
          })}
        {/* A shout's balloon beside the face, to the side with more room, over everything (the live's talker's). */}
        {lugaresXY.map(({ l, r, x }) => {
          if (!l.acima) return null
          const rosto = a.baixos[r] - faixa + 0.1 * a.k - 2.95 * a.k
          const direita = x < a.W / 2
          return (
            <div
              key={`${l.id}-acima`}
              className="absolute -translate-y-1/2"
              style={{ top: rosto, zIndex: 110, ...(direita ? { left: x + 1.2 * a.k } : { right: a.W - x + 1.2 * a.k }) }}
            >
              {l.acima}
            </div>
          )
        })}
        {frente && (
          // The front: the rail on the lattice, its Branco edge, and the stand's plate.
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 border-t-2 border-paper bg-klein"
            style={{
              height: RAIL,
              zIndex: 90,
              clipPath: `polygon(${RAIL}px 0, calc(100% - ${RAIL}px) 0, 100% 100%, 0 100%)`,
              backgroundImage:
                "repeating-linear-gradient(45deg, color-mix(in oklab, var(--color-klein-claro) 22%, transparent) 0 1px, transparent 1px 24px), repeating-linear-gradient(-45deg, color-mix(in oklab, var(--color-klein-claro) 22%, transparent) 0 1px, transparent 1px 24px)",
            }}
          >
            <span className="cut-sm absolute top-px left-1/2 flex h-[calc(100%-1px)] w-[min(320px,60%)] -translate-x-1/2 items-center justify-center bg-paper text-[18px] leading-none font-bold whitespace-nowrap text-klein">
              TORCIDA MUANLARTINS
            </span>
          </div>
        )}
      </>
    )
  }

  return (
    <div ref={caixa} className={cn("absolute inset-0", className)}>
      {conteudo}
    </div>
  )
}
