"use client"

import { createContext, useContext, useEffect, useEffectEvent, useRef, type ReactNode } from "react"
import { FreeSwatch, Swatch } from "@/components/site/profile/swatches"
import css from "@/components/site/profile/fan-editor.module.css"
import { editor as text } from "@/components/site/profile/fan-editor-text"
import { Button, Choice } from "@/components/site/ui"
import { ESQUEMA, NOMES_COR, PALETAS, type Campo, type Grupo as GrupoDoEsquema, type Torcedor3D, type Torcedor3DSalvo } from "@/lib/torcedor3d"
import type { Quadro } from "@/lib/torcedor3d-fotos"
import { cn } from "@/lib/utils"

/** The stage's module, once the browser has it: its thumbnail queue draws every picture of the editor. */
export type Kit = typeof import("@/components/site/profile/torcedor3d-palco")
export const KitContext = createContext<Kit | null>(null)

/** A picture of a fan on a canvas, drawn by the queue when `chave` changes (never while typing: one per frame). */
export function Foto({ largura, altura, chave, desenhar, className }: { largura: number; altura: number; chave: unknown; desenhar: (kit: Kit, tela: HTMLCanvasElement) => void; className?: string }) {
  const kit = useContext(KitContext)
  const ref = useRef<HTMLCanvasElement>(null)
  const pedir = useEffectEvent((k: Kit, t: HTMLCanvasElement) => desenhar(k, t))
  useEffect(() => {
    const t = ref.current
    if (!kit || !t) return
    pedir(kit, t)
    return () => kit.fotos.esquecer(t)
  }, [kit, chave])
  return <canvas ref={ref} width={largura} height={altura} aria-hidden className={cn("block h-auto max-w-full", className)} />
}

// The search: every control's name, its options' names and a few words people may type for it, without accents.
export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
export const palavras = (s: string) => semAcento(s).split(/[^a-z0-9]+/).filter(Boolean)
/** Every word of the query starts a word of the thing. */
export const acha = (q: string[], deles: string[]) => q.every((p) => deles.some((w) => w.startsWith(p)))
export const INDICE = ESQUEMA.flatMap(([nomeAba, grupos]) =>
  grupos.map(([titulo, campos, extra]) => ({
    nomeAba,
    titulo,
    campos,
    extra,
    deles: palavras(titulo),
    porCampo: campos.map((c) => palavras([c.nome, c.busca ?? "", ...(c.opcoes ?? []).map(([, n]) => n)].join(" "))),
  })),
)

/** An eyebrow over a group, with what goes on its right. */
export function Cabeca({ id, children, depois }: { id?: string; children: ReactNode; depois?: ReactNode }) {
  return (
    <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
      <p id={id} className="eyebrow flex items-center gap-2 text-klein">
        {children}
      </p>
      {depois}
    </div>
  )
}

/** A dashed box: what's missing and, maybe, what fills it. */
export function Vazio({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid justify-items-start gap-3 border border-dashed border-line-strong p-4 text-[15px] text-muted", className)}>{children}</div>
}

const nomeCor = (hex: string) => NOMES_COR[hex] ?? hex

/** One control of the schema: a range, a checkbox, colours, or options (drawn on the fan itself when `foto`). */
export function Controle({ campo: c, valor, mudar, id, foto }: { campo: Campo; valor: unknown; mudar: (v: string | number | boolean) => void; id: string; foto?: Torcedor3D }) {
  if (c.tipo === "num") {
    const v = Number(valor)
    const min = c.min ?? 0
    const max = c.max ?? 1
    const p = (v - min) / (max - min)
    return (
      <label htmlFor={id} className="grid min-h-8 grid-cols-[minmax(0,1fr)_30px] items-center gap-x-3 text-[14px] md:grid-cols-[minmax(0,150px)_minmax(70px,1fr)_30px] lg:grid-cols-[minmax(0,210px)_minmax(80px,1fr)_34px]">
        <span className="min-w-0">{c.nome}</span>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={c.passo ?? (max - min) / 200}
          value={v}
          onChange={(e) => mudar(Number(e.target.value))}
          className={cn(css.faixa, "max-md:col-span-2 max-md:row-start-2")}
          style={{ ["--p" as string]: `${p * 100}%` }}
        />
        <output htmlFor={id} className="text-right text-[13px] tabular-nums text-muted max-md:col-start-2 max-md:row-start-1">
          {c.passo ? v : Math.round(p * 100)}
        </output>
      </label>
    )
  }
  if (c.tipo === "sim") {
    return (
      <label htmlFor={id} className="flex min-h-9 items-center gap-2.5 text-[14px]">
        <input id={id} type="checkbox" checked={Boolean(valor)} onChange={(e) => mudar(e.target.checked)} className={css.marca} />
        <span>{c.nome}</span>
      </label>
    )
  }
  const rotulo = `${id}-rotulo`
  if (c.tipo === "cor") {
    const v = String(valor)
    const paleta = PALETAS[(c.paleta ?? "geral") as keyof typeof PALETAS] ?? PALETAS.geral
    const daPaleta = paleta.includes(v)
    return (
      <div className="grid gap-2 text-[14px]">
        <span id={rotulo}>{c.nome}</span>
        <div role="group" aria-labelledby={rotulo} className="flex flex-wrap items-center gap-1.5">
          {paleta.map((hex) => (
            <Swatch key={hex} background={hex} label={nomeCor(hex)} on={v === hex} onClick={() => mudar(hex)} />
          ))}
          {/* Any colour, for everyone: Σ locks nothing (Luan, 2026-11-23). */}
          <FreeSwatch value={v} on={!daPaleta} label={`${c.nome}: ${text.outraCor.toLowerCase()}`} onChange={(hex) => mudar(hex)} />
        </div>
      </div>
    )
  }
  const v = String(valor)
  const quadro = (c.foto === true ? "cabeca" : c.foto) as Quadro | undefined
  return (
    <div className="grid gap-2 text-[14px]">
      <span id={rotulo}>{c.nome}</span>
      <div role="group" aria-labelledby={rotulo} className={foto && quadro ? "grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2" : "flex flex-wrap items-center gap-1.5"}>
        {(c.opcoes ?? []).map(([opcao, nome]) =>
          foto && quadro ? (
            <Ficha key={opcao} on={v === opcao} onClick={() => mudar(opcao)} nome={nome}>
              <Foto largura={88} altura={100} chave={foto} desenhar={(kit, t) => kit.fotos.pedirOpcao(t, foto, c.k, opcao, quadro)} />
            </Ficha>
          ) : (
            <Choice key={opcao} size="sm" on={v === opcao} onClick={() => mudar(opcao)}>
              {nome}
            </Choice>
          ),
        )}
      </div>
    </div>
  )
}

/** An option drawn on the fan: its picture over its name, Klein when it's the one on. */
export function Ficha({ on, onClick, nome, children, label }: { on?: boolean; onClick: () => void; nome: ReactNode; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "cut-sm cut-edge relative flex min-w-0 flex-col items-center justify-start gap-1 border px-1 pb-2 pt-1.5 text-center text-[13px] leading-tight transition-colors",
        on ? "border-klein bg-klein text-paper" : "border-line bg-ground/45 text-ink hover:border-klein",
      )}
    >
      {children}
      <span className="flex min-h-[2.4em] items-center justify-center">{nome}</span>
    </button>
  )
}

/**
 * A group: its eyebrow, then its controls in the table's order, with neighbouring checkboxes in one row. A control with
 * `se` waits hidden until another choice makes it matter: in the search it says what brings it out; in a tab, a group
 * with nothing to show says it once, with the button that brings it (`acao`) when there is one.
 */
export function Grupo({
  titulo,
  campos,
  extra,
  look,
  mudar,
  trocar,
  buscando = false,
  fotos,
}: {
  titulo: string
  campos: Campo[]
  extra?: GrupoDoEsquema[2]
  look: Torcedor3D
  mudar: (k: string, v: string | number | boolean) => void
  trocar: (parte: Torcedor3DSalvo) => void
  buscando?: boolean
  /** The settled look, for the options' pictures. */
  fotos: Torcedor3D
}) {
  const id = `grupo-${semAcento(titulo).replace(/[^a-z0-9]+/g, "-")}`
  const aparece = (c: Campo) => !c.se || c.se(look)
  const algum = campos.some(aparece)
  const [rotuloAcao, parte] = extra?.acao ?? []
  // Neighbouring checkboxes share a row.
  const linhas: (Campo | Campo[])[] = []
  for (const c of campos) {
    if (!buscando && !aparece(c)) continue
    const ultima = linhas[linhas.length - 1]
    if (c.tipo === "sim" && aparece(c)) {
      if (Array.isArray(ultima)) ultima.push(c)
      else linhas.push([c])
    } else linhas.push(c)
  }
  const um = (c: Campo) =>
    aparece(c) ? (
      <Controle key={c.k} campo={c} valor={look[c.k]} mudar={(v) => mudar(c.k, v)} id={`c-${c.k}`} foto={c.foto ? fotos : undefined} />
    ) : (
      <p key={c.k} className="text-[13px] text-muted">
        <strong className="font-medium text-ink">{c.nome}</strong>: {c.dica}
      </p>
    )
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-3">
      <Cabeca id={id}>{titulo}</Cabeca>
      {!buscando && !algum && extra?.dica ? (
        <Vazio>
          <p>{extra.dica}</p>
          {rotuloAcao && parte && (
            <Button variant="secondary" size="sm" onClick={() => trocar(parte)}>
              {rotuloAcao}
            </Button>
          )}
        </Vazio>
      ) : (
        <div className="grid min-w-0 gap-3">
          {linhas.map((l) =>
            Array.isArray(l) ? (
              <div key={l[0].k} className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {l.map(um)}
              </div>
            ) : (
              um(l)
            ),
          )}
          {buscando && !algum && rotuloAcao && parte && (
            <div>
              <Button variant="secondary" size="sm" onClick={() => trocar(parte)}>
                {rotuloAcao}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

type Item = Record<string, string | number | boolean>

/**
 * A free list (pieces, drawings, locks): its eyebrow with the count, the header's buttons and "Adicionar", then each
 * item as a panel that opens. `aberto` and `abrir` say which panels are open; `semApagar` when the bar over the 3D view
 * already deletes (the pieces).
 */
export function Lista({
  titulo,
  chave,
  campos,
  itens,
  max,
  nome,
  vazio,
  adicionar,
  mudar,
  apagar,
  aberto,
  abrir,
  cabeca,
}: {
  titulo: string
  chave: string
  campos: Campo[]
  itens: Item[]
  max: number
  nome: string
  vazio: string
  adicionar: () => void
  mudar: (i: number, k: string, v: string | number | boolean) => void
  apagar?: (i: number) => void
  aberto: (i: number) => boolean
  /** A panel's title was used: `abrir` is whether it was closed (so it's opening). */
  abrir: (i: number, abrir: boolean) => void
  cabeca?: ReactNode
}) {
  const id = `lista-${chave}`
  const forma = campos.find((c) => c.k === "f")
  const nomeOpcao = (v: unknown) => forma?.opcoes?.find(([o]) => o === v)?.[1] ?? String(v)
  const Nome = nome[0].toUpperCase() + nome.slice(1)
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-3">
      <Cabeca
        id={id}
        depois={
          <div className="flex flex-wrap items-center gap-2">
            {cabeca}
            <Button variant="secondary" size="sm" disabled={itens.length >= max} onClick={adicionar}>
              {text.adicionar(nome)}
            </Button>
          </div>
        }
      >
        {titulo}
        <span title={text.deMax(itens.length, max)} className="bg-klein/10 px-1.5 py-px text-[12px] font-medium tabular-nums tracking-[0.04em] text-klein">
          {itens.length}/{max}
        </span>
      </Cabeca>
      {!itens.length && <Vazio>{vazio}</Vazio>}
      {itens.length > 0 && (
        <div>
          {itens.map((item, i) => (
            <details key={i} open={aberto(i)} data-item={`${chave}-${i}`} className={cn(css.item, "border-t border-line last:border-b")}>
              <summary
                className="flex min-h-11 items-center gap-2.5 text-[14px] font-medium"
                onClick={(e) => {
                  // The title decides, not the browser: the open panel follows what's picked.
                  e.preventDefault()
                  abrir(i, !aberto(i))
                }}
              >
                {Nome} {i + 1}
                {forma ? ` · ${nomeOpcao(item.f)}` : ""}
              </summary>
              <div className="grid gap-3 pb-5 pt-1">
                {campos.map((c) =>
                  !c.se || c.se(item as unknown as Torcedor3D) ? (
                    <Controle key={c.k} campo={c} valor={item[c.k]} mudar={(v) => mudar(i, c.k, v)} id={`${chave}-${i}-${c.k}`} />
                  ) : null,
                )}
                {apagar && (
                  <div>
                    <Button variant="secondary" size="sm" onClick={() => apagar(i)}>
                      {text.apagarItem(nome)}
                    </Button>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
