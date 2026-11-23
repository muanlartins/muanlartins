"use client"

import { Redo2, Search, Undo2, X } from "lucide-react"
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { acha, Cabeca, Ficha, Foto, Grupo, INDICE, KitContext, Lista, palavras, semAcento, Vazio, type Kit } from "@/components/site/profile/fan-editor-controls"
import css from "@/components/site/profile/fan-editor.module.css"
import { editor as text } from "@/components/site/profile/fan-editor-text"
import { Galeria } from "@/components/site/profile/fan-gallery"
import type { Escolha, Modo, Palco } from "@/components/site/profile/torcedor3d-palco"
import { Input, Select, Tabs } from "@/components/site/ui"
import { profile } from "@/content/profile"
import { localize } from "@/lib/site"
import {
  clube,
  codigo,
  comTime,
  DESENHO,
  DESENHOS_MAX,
  enxugar,
  ESQUEMA,
  FRASE_MAX,
  lerCodigo,
  MECHA,
  MECHAS_MAX,
  MODELOS,
  normalizar,
  ondeFica,
  PECA,
  PECAS_MAX,
  sortear,
  STICKERS_MAX,
  TIME_MAX,
  TIMES,
  umEmoji,
  type Peca,
  type Torcedor3D,
  type Torcedor3DSalvo,
} from "@/lib/torcedor3d"
import type { Pose } from "@/lib/torcedor3d-fotos"
import { cn } from "@/lib/utils"

// The CSS module paints with the site's tokens: --color-klein, --color-paper, --color-line and --color-line-strong.
const perfil = localize(profile)
const ABAS = ["Modelos", "Galeria", ...ESQUEMA.map(([n]) => n), "Livre"]
const idAba = (n: string) => semAcento(n).replace(/[^a-z0-9]+/g, "-")
const POSES: Pose[] = ["parado", "cima", "aceno", "palmas", "triste"]
/** What the profile API keeps of a fan at most (infra/perfil/rotas.mjs, T3_MAX). */
const T3_MAX = 8192
const Y = PECA.find((c) => c.k === "y")!
type Chave = "pecas" | "desenhos" | "mechas"
const CAMPOS_DA: Record<Chave, typeof PECA> = { pecas: PECA, desenhos: DESENHO, mechas: MECHA }
const MAX: Record<Chave, number> = { pecas: PECAS_MAX, desenhos: DESENHOS_MAX, mechas: MECHAS_MAX }
/** An item as the code keeps it (esquema.js's validar, through normalizar). */
const validarItem = <T,>(chave: Chave, item: unknown): T => (normalizar({ [chave]: [item] })[chave] as unknown as T[])[0]
const validarPeca = (p: Partial<Peca>) => validarItem<Peca>("pecas", p)
const mesma = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** A copy that shows: a little lower than the original, on the same anchor. */
function afastar(d: Peca): Peca {
  const c = validarPeca({ ...d, y: d.y - 0.15 > Y.min! ? d.y - 0.15 : d.y + 0.15 })
  if (ondeFica(c) !== ondeFica(d)) c.onde = ondeFica(d)
  return c
}

/** A code inside pasted text: a bare code or a link with #t=T1:… (maybe percent-encoded). */
export function acharCodigo(texto: string) {
  let t = String(texto)
  try {
    t = decodeURIComponent(t)
  } catch {}
  return t.match(/T1:[A-Za-z0-9_\-+/=]*/)?.[0] ?? t.trim()
}
/**
 * The look in the address (#t=T1:…): undefined when there is none, null when it doesn't open. Read once, then taken off
 * the address, so a reload keeps what's saved instead of the link's fan.
 */
export function linkDoEndereco(): Torcedor3D | null | undefined {
  const m = location.hash.match(/^#(?:.*&)?t=([^&]+)/)
  if (!m) return undefined
  history.replaceState(null, "", location.pathname + location.search)
  return lerCodigo(acharCodigo(m[1]))
}

// What isn't a control of the table but is still looked for, and the profile's own groups.
const ATALHOS = text.atalhos.map((a) => ({ ...a, deles: palavras(a.palavras) }))
const EXTRAS = [
  { id: "time", titulo: perfil.groups.team, ...text.extras.time },
  { id: "frase", titulo: perfil.groups.phrase, ...text.extras.frase },
  { id: "stickers", titulo: perfil.groups.stickers, ...text.extras.stickers },
].map((x) => ({ ...x, deles: palavras(`${x.titulo} ${x.palavras}`) }))

// The navy island's controls: Klein claro edges on navy, Branco when on (brand/interface.md, contrast on dark).
const escuro = "focus-visible:outline-paper"
const chipEscuro = (on: boolean, pequeno = false) =>
  cn(
    escuro,
    "border font-medium leading-tight transition-colors",
    pequeno ? "min-h-8 px-2 py-1 text-[13px] sm:px-2.5" : "min-h-9 px-2 py-1.5 text-[14px] sm:px-2.5",
    on ? "border-paper bg-paper text-klein" : "border-klein-claro text-paper hover:border-paper",
  )
const botaoEscuro = (pequeno = false) =>
  cn(
    escuro,
    "cut-sm cut-edge relative inline-flex items-center justify-center gap-2 border border-klein-claro font-medium text-paper transition-colors hover:border-paper disabled:pointer-events-none disabled:opacity-40",
    pequeno ? "min-h-8 px-2.5 py-1 text-[13px]" : "min-h-9 px-3.5 py-1.5 text-[14px]",
  )
const iconeEscuro = cn(escuro, "cut-sm grid h-9 w-9 place-items-center border border-klein-claro bg-navy/60 text-paper transition-colors hover:border-paper disabled:opacity-40")

/** Their team: a club from the list dresses the shirt in its colours and pattern (comTime); any other is just its name. */
function TimeGrupo({ look, trocar }: { look: Torcedor3D; trocar: (novo: Torcedor3D) => void }) {
  const club = clube(look.time)
  const [typing, setTyping] = useState(Boolean(look.time && !club))
  const value = club ? club.nome : typing ? "outro" : ""
  return (
    <section aria-labelledby="grupo-time" className="grid gap-3">
      <Cabeca id="grupo-time">{perfil.groups.team}</Cabeca>
      <p className="-mt-1.5 text-[13px] text-muted">{perfil.groups.teamHint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={perfil.groups.team}
          boxClassName="w-full max-w-[16rem]"
          value={value}
          onChange={(e) => {
            const pick = e.target.value
            setTyping(pick === "outro")
            trocar(pick === "outro" || !pick ? normalizar({ ...look, time: "" }) : normalizar(comTime(look, pick)))
          }}
        >
          <option value="">{perfil.groups.teamNone}</option>
          {TIMES.map((t) => (
            <option key={t.nome} value={t.nome}>
              {t.nome}
            </option>
          ))}
          <option value="outro">{perfil.groups.teamOther}</option>
        </Select>
        {typing && (
          <Input
            boxClassName="w-full max-w-[14rem]"
            value={look.time}
            maxLength={TIME_MAX}
            placeholder={perfil.groups.teamName}
            aria-label={perfil.groups.teamName}
            onChange={(e) => trocar(normalizar({ ...look, time: e.target.value }))}
          />
        )}
      </div>
    </section>
  )
}

/** What they shout arriving at the stand. */
function FraseGrupo({ look, trocar }: { look: Torcedor3D; trocar: (novo: Torcedor3D) => void }) {
  // Typed as is (spaces kept while typing); the save trims it like the stand does.
  return (
    <section aria-labelledby="grupo-frase" className="grid gap-3">
      <Cabeca id="grupo-frase">{perfil.groups.phrase}</Cabeca>
      <p className="-mt-1.5 text-[13px] text-muted">{perfil.groups.phraseHint}</p>
      <div className="flex items-center gap-3">
        <Input
          aria-label={perfil.groups.phrase}
          boxClassName="w-full max-w-sm"
          value={look.frase}
          maxLength={FRASE_MAX}
          onChange={(e) => trocar({ ...look, frase: e.target.value })}
          onBlur={() => trocar(normalizar(look))}
        />
        <span className="text-[13px] tabular-nums text-muted">
          {Array.from(look.frase).length}/{FRASE_MAX}
        </span>
      </div>
    </section>
  )
}

/** The stickers they throw on a goal and on a goal against: up to three each. */
function StickersGrupo({ look, trocar, emojis }: { look: Torcedor3D; trocar: (novo: Torcedor3D) => void; emojis: string[] }) {
  const [outro, setOutro] = useState({ gol: "", contra: "" })
  const alternar = (quando: "gol" | "contra", emoji: string) => {
    const lista = look.stickers[quando]
    const proxima = lista.includes(emoji) ? lista.filter((e) => e !== emoji) : [...lista, emoji].slice(-STICKERS_MAX)
    trocar(normalizar({ ...look, stickers: { ...look.stickers, [quando]: proxima } }))
  }
  return (
    <section aria-labelledby="grupo-stickers" className="grid gap-3">
      <Cabeca id="grupo-stickers">{perfil.groups.stickers}</Cabeca>
      <p className="-mt-1.5 text-[13px] text-muted">{perfil.groups.stickersHint}</p>
      {(["gol", "contra"] as const).map((quando) => (
        <div key={quando} className="grid gap-2">
          <p id={`stickers-${quando}`} className="flex items-center gap-2 text-[14px]">
            {quando === "gol" ? perfil.groups.onGoal : perfil.groups.onAgainst}
            <span className="text-[20px] leading-none">{look.stickers[quando].join(" ")}</span>
          </p>
          <div role="group" aria-labelledby={`stickers-${quando}`} className="flex flex-wrap items-center gap-1">
            {emojis.map((emoji) => {
              const on = look.stickers[quando].includes(emoji)
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={on}
                  onClick={() => alternar(quando, emoji)}
                  className={cn("h-10 w-10 text-[22px] transition-colors", on ? "bg-klein/15 ring-2 ring-inset ring-klein" : "hover:bg-ground")}
                >
                  {emoji}
                </button>
              )
            })}
            <Input
              aria-label={perfil.groups.otherEmoji}
              placeholder={perfil.groups.otherEmoji}
              boxClassName="w-36"
              value={outro[quando]}
              onChange={(e) => {
                const valor = e.target.value.trim()
                if (umEmoji(valor)) {
                  alternar(quando, valor)
                  setOutro({ ...outro, [quando]: "" })
                } else setOutro({ ...outro, [quando]: valor })
              }}
            />
          </div>
        </div>
      ))}
    </section>
  )
}

/**
 * The 3D fan editor (the approved prototype's editor.js in React): the fan turning in 3D beside its controls, in tabs
 * from the schema (public/stream/torcedor3d/esquema.js), with a search across all of them, the presets, the gallery,
 * the free lists with three's gizmo on the model, undo and redo, the dice and the T1 code. The look lives in the
 * profile page (`look`, `onChange`); the team, the arrival shout and the stickers are the profile's own groups, in
 * Roupa and Acessórios. `ativo` is whether its tab shows: the keyboard shortcuts only listen then.
 */
export function FanEditor({
  look,
  onChange,
  eu,
  emojis,
  ativo,
  link,
}: {
  look: Torcedor3D
  onChange: (look: Torcedor3D) => void
  /** Their login, "" when signed out. */
  eu: string
  /** The stickers to pick from (public/stream/torcedor.js). */
  emojis: string[]
  ativo: boolean
  /** A look from the address's #t= (null: it didn't open), applied once as the first change. */
  link?: Torcedor3D | null
}) {
  const tela = useRef<HTMLCanvasElement>(null)
  const controles = useRef<HTMLDivElement>(null)
  const abas = useRef<HTMLDivElement>(null)
  const campoBusca = useRef<HTMLInputElement>(null)
  const [kit, setKit] = useState<Kit | null>(null)
  const [palco, setPalco] = useState<Palco | null>(null)
  const [semWebgl, setSemWebgl] = useState(false)
  const [girou, setGirou] = useState(false)
  const [aba, setAba] = useState("Modelos")
  const [buscaTexto, setBuscaTexto] = useState("")
  // While it has text, the panel shows what it finds across every tab instead of the tab.
  const [busca, setBusca] = useState("")
  const [pose, setPose] = useState<Pose>("parado")
  const [escolhidas, setEscolhidas] = useState<Escolha[]>([])
  const [modo, setModo] = useState<Modo>("translate")
  const [encaixe, setEncaixe] = useState(false)
  const [prancheta, setPrancheta] = useState<Peca[]>([])
  const [recado, setRecado] = useState<{ texto: string; erro?: boolean } | null>(() =>
    link ? { texto: text.linkAbriu } : link === null ? { texto: text.linkNaoAbriu, erro: true } : null,
  )
  const [hist, setHist] = useState(() => ({ passado: [] as string[], futuro: [] as string[], gravado: JSON.stringify(look) }))
  // The look once changes settle (250 ms): the options' pictures, the code and the undo steps follow it.
  const [assentado, setAssentado] = useState(look)
  const [codigoTexto, setCodigoTexto] = useState(() => codigo(look))
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [rolar, setRolar] = useState(0)

  /** A change: the 3D at once (the stage hears it before React renders), the rest once it settles. */
  function commit(novo: Torcedor3D) {
    onChange(novo)
    palco?.mostrar(novo)
  }
  /** Another fan entirely (a preset, the dice, the gallery, a code): their team, shout and stickers stay theirs. */
  const comMeu = (novo: Torcedor3DSalvo) => normalizar({ ...novo, time: look.time, frase: look.frase, stickers: look.stickers })
  const trocar = (novo: Torcedor3DSalvo) => commit(comMeu(novo))
  const mudar = (k: string, v: string | number | boolean) => commit(normalizar({ ...look, [k]: v }))
  const mudarItem = (chave: Chave, i: number, k: string, v: string | number | boolean) =>
    commit(normalizar({ ...look, [chave]: (look[chave] as object[]).map((it, j) => (j === i ? { ...it, [k]: v } : it)) }))

  // The link's fan, once, as an undoable change from what was saved.
  const abrirLink = useEffectEvent(() => {
    if (link) commit(comMeu(link))
  })
  useEffect(() => abrirLink(), [])

  // The stage comes with three, the gizmo and the model, only in the browser.
  const aoEscolher = useEffectEvent((lista: Escolha[], abrir: boolean) => {
    setEscolhidas(lista)
    if (!abrir) return
    if (aba !== "Livre" || busca) {
      setAba("Livre")
      setBusca("")
      setBuscaTexto("")
    }
    setRolar((n) => n + 1)
  })
  const aoSoltar = useEffectEvent((novo: Torcedor3D) => onChange(novo))
  const aoGirar = useEffectEvent(() => setGirou(true))
  useEffect(() => {
    let vivo = true
    let p: Palco | null = null
    import("@/components/site/profile/torcedor3d-palco").then((k) => {
      if (!vivo || !tela.current) return
      try {
        p = k.criarPalco(tela.current, {
          escolheu: (lista, abrir) => aoEscolher(lista, abrir),
          soltou: (novo) => aoSoltar(novo),
          girou: () => aoGirar(),
        })
        setPalco(p)
      } catch {
        setSemWebgl(true)
      }
      setKit(k)
    })
    return () => {
      vivo = false
      p?.descartar()
    }
  }, [])
  useEffect(() => palco?.mostrar(look), [palco, look])
  useEffect(() => palco?.pose(pose), [palco, pose])

  useEffect(() => {
    kit?.fotos.adiar()
    const t = setTimeout(() => {
      const agora = JSON.stringify(look)
      setHist((h) => (agora === h.gravado ? h : { passado: [...h.passado, h.gravado].slice(-80), futuro: [], gravado: agora }))
      setAssentado(look)
      setCodigoTexto(codigo(look))
    }, 250)
    return () => clearTimeout(t)
  }, [look, kit])

  function voltar(para: "tras" | "frente") {
    const de = para === "tras" ? hist.passado : hist.futuro
    if (!de.length) return
    const alvo = de[de.length - 1]
    setHist(
      para === "tras"
        ? { passado: hist.passado.slice(0, -1), futuro: [...hist.futuro, hist.gravado], gravado: alvo }
        : { passado: [...hist.passado, hist.gravado], futuro: hist.futuro.slice(0, -1), gravado: alvo },
    )
    commit(normalizar(JSON.parse(alvo)))
  }

  // Typing in the search only redraws the panel, a moment after the last key: the 3D fan is never rebuilt for it.
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaTexto.trim() ? buscaTexto : ""), 120)
    return () => clearTimeout(t)
  }, [buscaTexto])
  const limparBusca = () => {
    setBuscaTexto("")
    setBusca("")
  }

  /** On a phone the tabs stick under the 3D view: a new tab starts at its top, not wherever the page was. */
  function aoTopoDoPainel() {
    requestAnimationFrame(() => {
      const c = controles.current
      const topo = abas.current
      if (!c || !tela.current || !topo || !matchMedia("(max-width: 767.98px)").matches) return
      const linha = 64 + tela.current.getBoundingClientRect().height + topo.getBoundingClientRect().height
      const y = c.getBoundingClientRect().top
      if (y < linha) window.scrollBy(0, y - linha)
    })
  }
  function abrirAba(n: string, foco = false) {
    limparBusca()
    // The piece tools belong to the Livre tab: leaving it lets go of the pick.
    if (n !== "Livre" && escolhidas.length) palco?.escolher(null)
    setAba(n)
    aoTopoDoPainel()
    if (foco) requestAnimationFrame(() => document.getElementById(`t3-${idAba(n)}`)?.focus())
  }
  const vista = busca ? "busca" : aba
  // A new tab or search starts at the top of the panel.
  useLayoutEffect(() => {
    if (controles.current) controles.current.scrollTop = 0
  }, [vista])
  // The current tab scrolled into view inside its line, without moving the page.
  useLayoutEffect(() => {
    const l = abas.current?.querySelector<HTMLElement>("[role=tablist]")
    const t = document.getElementById(`t3-${idAba(aba)}`)
    if (!l || !t) return
    // Where the tab sits in the line's visible part.
    const x = t.getBoundingClientRect().left - l.getBoundingClientRect().left
    if (x < 16) l.scrollLeft += x - 16
    else if (x + t.offsetWidth > l.clientWidth - 16) l.scrollLeft += x + t.offsetWidth - l.clientWidth + 16
  }, [aba])
  // The picked piece's panel in view: only the panel scrolls, so on a phone the page stays on the 3D view just tapped.
  const mostrarPeca = useEffectEvent(() => {
    const c = controles.current
    const d = c?.querySelector(`[data-item="pecas-${escolhidas[0]?.i}"]`)
    if (!c || !d) return
    const dy = d.getBoundingClientRect().top - c.getBoundingClientRect().top
    if (dy < 0 || dy > c.clientHeight - 60) c.scrollTop += dy - 8
  })
  useEffect(() => {
    if (rolar) mostrarPeca()
  }, [rolar])

  // The free pieces: added, copied, pasted and deleted here; picked and moved on the stage.
  function acrescentar(novas: Peca[]) {
    const n = look.pecas.length
    const cabem = novas.slice(0, PECAS_MAX - n)
    if (!cabem.length) return
    commit(normalizar({ ...look, pecas: [...look.pecas, ...cabem] }))
    palco?.marcar(cabem.map((_, j) => ({ i: n + j, lado: 0 })))
  }
  const duplicar = () => acrescentar(escolhidas.map(({ i }) => afastar(look.pecas[i])))
  const copiar = () => setPrancheta(escolhidas.map(({ i }) => ({ ...look.pecas[i] })))
  // Pasted on the same fan, a copy is moved off the original so it can be seen.
  const colar = () => acrescentar(prancheta.map((d) => (look.pecas.some((p) => mesma(p, d)) ? afastar(d) : validarPeca(d))))
  function apagarPecas() {
    const fora = new Set(escolhidas.map(({ i }) => i))
    if (!fora.size) return
    palco?.escolher(null)
    commit(normalizar({ ...look, pecas: look.pecas.filter((_, j) => !fora.has(j)) }))
  }
  function escolherModo(m: Modo) {
    setModo(m)
    palco?.modo(m)
  }
  function encaixar(sim = !encaixe) {
    setEncaixe(sim)
    palco?.encaixar(sim)
  }

  const tecla = useEffectEvent((e: KeyboardEvent) => {
    if (!ativo || e.altKey) return
    if ((e.target as HTMLElement | null)?.closest?.("textarea, select, input:not([type=range]):not([type=checkbox])")) return
    if (palco?.arrastando()) {
      if (e.key === "Escape") palco.desfazerArrasto()
      return
    }
    const k = e.key.toLowerCase()
    const ctrl = e.ctrlKey || e.metaKey
    const feito = () => e.preventDefault()
    if (ctrl && k === "z") return voltar(e.shiftKey ? "frente" : "tras"), feito()
    if (ctrl && k === "y") return voltar("frente"), feito()
    if (ctrl && k === "v" && prancheta.length) return colar(), feito()
    if (k === "/" && !ctrl) return campoBusca.current?.focus(), feito()
    if (!escolhidas.length) return
    if (ctrl && k === "c" && !String(getSelection())) return copiar(), feito()
    if (ctrl && k === "d") return duplicar(), feito()
    if (ctrl) return
    if (k === "m") escolherModo("translate")
    else if (k === "g") escolherModo("rotate")
    else if (k === "e") escolherModo("scale")
    else if (k === "x") encaixar()
    else if (k === "delete" || k === "backspace") apagarPecas()
    else if (k === "escape") palco?.escolher(null)
    else return
    feito()
  })
  useEffect(() => {
    const ouvir = (e: KeyboardEvent) => tecla(e)
    document.addEventListener("keydown", ouvir)
    return () => document.removeEventListener("keydown", ouvir)
  }, [])

  // A link opened while the page is already here swaps the fan, as one undo step.
  const novoLink = useEffectEvent(() => {
    const a = linkDoEndereco()
    if (a === undefined) return
    if (!a) return setRecado({ texto: text.linkNaoAbriu, erro: true })
    trocar(a)
    setRecado({ texto: text.linkAbriu })
  })
  useEffect(() => {
    const ouvir = () => novoLink()
    addEventListener("hashchange", ouvir)
    return () => removeEventListener("hashchange", ouvir)
  }, [])

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(codigoTexto)
      setRecado({ texto: text.copiado })
    } catch {
      document.querySelector<HTMLTextAreaElement>("#t3-codigo")?.select()
      setRecado({ texto: text.selecionado })
    }
  }
  function usarCodigo() {
    const a = lerCodigo(acharCodigo(codigoTexto))
    if (!a) return setRecado({ texto: text.naoAbriu, erro: true })
    setRecado({ texto: text.pronto })
    trocar(a)
  }
  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#t=${codigo(look)}`)
      setRecado({ texto: text.linkCopiado })
    } catch {
      setRecado({ texto: text.linkFalhou, erro: true })
    }
  }

  const bytes = new TextEncoder().encode(JSON.stringify(enxugar(look))).length
  const kb = (n: number) => (n / 1024).toFixed(1).replace(".", ",").replace(/,0$/, "")
  const pesado = bytes > T3_MAX

  // The Livre tab's pieces talk to the 3D view: opening a panel picks that piece, and back.
  const listaPecas = (
    <Lista
      titulo={text.listas.pecas.titulo}
      chave="pecas"
      campos={PECA}
      itens={look.pecas as unknown as Record<string, string | number | boolean>[]}
      max={PECAS_MAX}
      nome={text.listas.pecas.nome}
      vazio={text.listas.pecas.vazio}
      adicionar={() => acrescentar([validarPeca({})])}
      mudar={(i, k, v) => mudarItem("pecas", i, k, v)}
      aberto={(i) => escolhidas[0]?.i === i}
      abrir={(i, abrir) => (abrir ? palco?.escolher(i, { abrir: false }) : palco?.escolher(null))}
      cabeca={
        prancheta.length > 0 && (
          <button
            type="button"
            disabled={look.pecas.length >= PECAS_MAX}
            onClick={colar}
            className="cut-sm cut-edge relative inline-flex items-center border border-line-strong bg-paper/60 px-3 py-1.5 text-[14px] font-medium text-ink transition-colors hover:border-klein hover:text-klein disabled:opacity-40"
          >
            {text.colar(prancheta.length)}
          </button>
        )
      }
    />
  )
  const lista = (chave: "desenhos" | "mechas") => {
    const itens = look[chave] as unknown as Record<string, string | number | boolean>[]
    const t = text.listas[chave]
    const aberto = (i: number) => abertos[`${chave}-${i}`] ?? i === itens.length - 1
    return (
      <Lista
        titulo={t.titulo}
        chave={chave}
        campos={CAMPOS_DA[chave]}
        itens={itens}
        max={MAX[chave]}
        nome={t.nome}
        vazio={t.vazio}
        adicionar={() => {
          setAbertos({ ...abertos, [`${chave}-${itens.length}`]: true })
          commit(normalizar({ ...look, [chave]: [...itens, validarItem(chave, {})] }))
        }}
        mudar={(i, k, v) => mudarItem(chave, i, k, v)}
        apagar={(i) => commit(normalizar({ ...look, [chave]: itens.filter((_, j) => j !== i) }))}
        aberto={aberto}
        abrir={(i, abrir) => setAbertos({ ...abertos, [`${chave}-${i}`]: abrir })}
      />
    )
  }
  const extra = (id: string) =>
    id === "time" ? (
      <TimeGrupo key="time" look={look} trocar={commit} />
    ) : id === "frase" ? (
      <FraseGrupo key="frase" look={look} trocar={commit} />
    ) : (
      <StickersGrupo key="stickers" look={look} trocar={commit} emojis={emojis} />
    )
  const grupo = (titulo: string, campos: typeof PECA, extraDoGrupo: (typeof ESQUEMA)[number][1][number][2], buscando = false) => (
    <Grupo
      key={titulo}
      titulo={titulo}
      campos={campos}
      extra={extraDoGrupo}
      look={look}
      mudar={mudar}
      trocar={(parte) => commit(normalizar({ ...look, ...parte }))}
      buscando={buscando}
      fotos={assentado}
    />
  )
  const fichaModelo = (nome: string, m: Torcedor3DSalvo, i: number) => (
    <Ficha key={nome} nome={nome} onClick={() => trocar(m)}>
      <Foto largura={104} altura={122} chave={i} desenhar={(k, t) => k.fotos.pedir(t, normalizar(m), { guardar: `modelo:${i}` })} />
    </Ficha>
  )

  let conteudo: ReactNode
  let anuncio = ""
  if (busca) {
    const q = palavras(busca)
    const modelos = MODELOS.map((m, i) => [m, i] as const).filter(([[nome]]) => acha(q, palavras(nome)))
    const grupos = INDICE.flatMap((g) => {
      // A control is found by its own words, the group's title helping ("cor olho" finds the eyes' colour).
      const campos = acha(q, g.deles) ? g.campos : g.campos.filter((_, j) => acha(q, [...g.deles, ...g.porCampo[j]]) && q.some((p) => g.porCampo[j].some((w) => w.startsWith(p))))
      return campos.length ? [{ ...g, campos }] : []
    })
    const extras = EXTRAS.filter((x) => acha(q, x.deles))
    const atalhos = ATALHOS.filter((a) => acha(q, a.deles))
    const n = modelos.length + grupos.reduce((s, g) => s + g.campos.length, 0) + extras.length + atalhos.length
    const termo = busca.trim()
    anuncio = n ? text.resultados(n, termo) : text.nadaCurto(termo)
    conteudo = !n ? (
      <Vazio>
        <p>{text.nada(termo)}</p>
      </Vazio>
    ) : (
      <>
        <p className="text-[13px] text-muted">{text.resultados(n, termo)}</p>
        {modelos.length > 0 && (
          <section aria-labelledby="busca-modelos" className="grid gap-3">
            <Cabeca id="busca-modelos">Modelos</Cabeca>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">{modelos.map(([[nome, m], i]) => fichaModelo(nome, m, i))}</div>
          </section>
        )}
        {grupos.map((g) => grupo(`${g.nomeAba} · ${g.titulo}`, g.campos, g.extra, true))}
        {extras.map((x) => (
          <div key={x.id} className="grid gap-1">
            <p className="text-[13px] text-muted">{x.aba}</p>
            {extra(x.id)}
          </div>
        ))}
        {atalhos.length > 0 && (
          <section aria-labelledby="busca-outras" className="grid gap-3">
            <Cabeca id="busca-outras">{text.outrasAbas}</Cabeca>
            {atalhos.map((a) => (
              <Vazio key={a.nome}>
                <p>
                  <strong className="font-medium text-ink">{a.nome}</strong>: {a.dica}
                </p>
                <button
                  type="button"
                  onClick={() => abrirAba(a.aba, true)}
                  className="cut-sm cut-edge relative inline-flex items-center border border-line-strong bg-paper/60 px-3 py-1.5 text-[14px] font-medium text-ink transition-colors hover:border-klein hover:text-klein"
                >
                  {text.abrir(a.aba)}
                </button>
              </Vazio>
            ))}
          </section>
        )}
      </>
    )
  } else if (aba === "Modelos") {
    conteudo = (
      <>
        <p className="text-[13px] text-muted">{text.modelosDica}</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">{MODELOS.map(([nome, m], i) => fichaModelo(nome, m, i))}</div>
      </>
    )
  } else if (aba === "Galeria") {
    conteudo = <Galeria eu={eu} usar={(novo) => trocar(novo)} />
  } else if (aba === "Livre") {
    conteudo = (
      <>
        <p className="max-w-[38rem] text-[13px] text-muted">{text.livreDica}</p>
        {listaPecas}
        {lista("desenhos")}
      </>
    )
  } else {
    const grupos = ESQUEMA.find(([n]) => n === aba)![1]
    conteudo = (
      <>
        {aba === "Roupa" && extra("time")}
        {grupos.map(([titulo, campos, e]) => grupo(titulo, campos, e))}
        {aba === "Cabelo" && lista("mechas")}
        {aba === "Acessórios" && (
          <>
            {extra("frase")}
            {extra("stickers")}
          </>
        )}
      </>
    )
  }

  const [primeira] = escolhidas
  return (
    <KitContext.Provider value={kit}>
      <div className={cn(css.editor, "grid items-start md:grid-cols-[320px_minmax(0,1fr)] md:gap-4 lg:grid-cols-[400px_minmax(0,1fr)]")}>
        <section aria-label={text.vista} className={cn(css.alto, "cut flex min-w-0 flex-col bg-navy text-paper max-md:contents")}>
          <div className={cn(css.tela, "relative min-h-0 bg-klein md:flex-1 max-md:order-1")}>
            <canvas
              ref={tela}
              tabIndex={0}
              aria-label={text.tela}
              className={cn(escuro, "block h-full w-full cursor-grab touch-pan-y focus-visible:-outline-offset-4 md:min-h-[260px]")}
            />
            {!palco && (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-paper" role={semWebgl ? "alert" : undefined}>
                {semWebgl ? text.semWebgl : text.carregando}
              </p>
            )}
            <p aria-hidden className={cn("pointer-events-none absolute left-3.5 top-3 text-[13px] text-paper transition-opacity duration-500", (girou || !palco) && "opacity-0")}>
              {text.arrasta}
            </p>
            <div className="absolute right-2 top-2 flex gap-1">
              <button type="button" className={iconeEscuro} aria-label={text.desfazer} title={`${text.desfazer} (Ctrl+Z)`} aria-keyshortcuts="Control+Z" disabled={!hist.passado.length} onClick={() => voltar("tras")}>
                <Undo2 aria-hidden className="h-[18px] w-[18px]" />
              </button>
              <button type="button" className={iconeEscuro} aria-label={text.refazer} title={`${text.refazer} (Ctrl+Shift+Z)`} aria-keyshortcuts="Control+Shift+Z" disabled={!hist.futuro.length} onClick={() => voltar("frente")}>
                <Redo2 aria-hidden className="h-[18px] w-[18px]" />
              </button>
            </div>
            {/* The picked piece's tools sit over the bottom of the 3D view, so nothing below it jumps. */}
            {primeira && (
              <div role="toolbar" aria-label={text.pecaEscolhida} className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1 bg-navy/90 p-1.5 sm:gap-1.5 sm:p-2">
                <strong className="mr-0.5 text-[13px] font-semibold">{escolhidas.length > 1 ? text.pecas(escolhidas.length) : text.peca(primeira.i + 1)}</strong>
                <span className="flex">
                  {(
                    [
                      ["translate", text.mover, "M"],
                      ["rotate", text.girar, "G"],
                      ["scale", text.esticar, "E"],
                    ] as const
                  ).map(([m, nome, k], j) => (
                    <button key={m} type="button" aria-pressed={modo === m} aria-keyshortcuts={k} title={`${nome} (${k})`} onClick={() => escolherModo(m)} className={cn(chipEscuro(modo === m, true), j && "-ml-px")}>
                      {nome}
                    </button>
                  ))}
                </span>
                <button type="button" aria-pressed={encaixe} aria-keyshortcuts="X" title={text.encaixarDica} onClick={() => encaixar()} className={chipEscuro(encaixe, true)}>
                  {text.encaixar}
                </button>
                <button type="button" aria-keyshortcuts="Control+D" title={`${text.duplicar} (Ctrl+D)`} disabled={look.pecas.length + escolhidas.length > PECAS_MAX} onClick={duplicar} className={botaoEscuro(true)}>
                  {text.duplicar}
                </button>
                <button type="button" aria-keyshortcuts="Control+C" title={text.copiarDica} onClick={copiar} className={botaoEscuro(true)}>
                  {text.copiar}
                </button>
                <button type="button" aria-keyshortcuts="Delete" title={`${text.apagar} (Delete)`} onClick={apagarPecas} className={botaoEscuro(true)}>
                  {text.apagar}
                </button>
                <button type="button" aria-keyshortcuts="Escape" aria-label={text.soltar} title={`${text.soltar} (Esc)`} onClick={() => palco?.escolher(null)} className={cn(iconeEscuro, "ml-auto h-8 w-8")}>
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 px-3 py-4 sm:px-4 max-md:order-2 max-md:mb-4 max-md:bg-navy">
            <div className="grid gap-2">
              <span id="t3-rotulo-pose" className="eyebrow text-klein-claro">
                {text.pose}
              </span>
              <div role="group" aria-labelledby="t3-rotulo-pose" className="flex flex-wrap">
                {POSES.map((p, j) => (
                  <button key={p} type="button" aria-pressed={pose === p} onClick={() => setPose(p)} className={cn(chipEscuro(pose === p), j && "-ml-px")}>
                    {text.poses[p as keyof typeof text.poses]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button type="button" className={botaoEscuro()} onClick={() => trocar(sortear())}>
                {text.sortear}
              </button>
            </div>
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="t3-codigo" className="eyebrow text-klein-claro">
                  {text.codigo}
                </label>
                <span title={text.peso} className="flex items-center gap-2 text-[13px] tabular-nums text-klein-claro">
                  {pesado && <span aria-hidden className="h-2 w-2 bg-loss outline outline-1 outline-paper" />}
                  {text.pesoDe(kb(bytes), kb(T3_MAX))}
                </span>
              </div>
              <p className="text-[13px] text-klein-claro">{text.codigoDica}</p>
              <span className="cut-sm cut-edge relative flex border border-klein-claro focus-within:border-paper">
                <textarea
                  id="t3-codigo"
                  spellCheck={false}
                  autoComplete="off"
                  value={codigoTexto}
                  onChange={(e) => setCodigoTexto(e.target.value)}
                  className="h-[52px] w-full resize-none break-all bg-transparent px-3 py-2 font-mono text-[12px] leading-[1.4] text-paper outline-none"
                />
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={botaoEscuro()} onClick={copiarCodigo}>
                  {text.copiarCodigo}
                </button>
                <button type="button" className={botaoEscuro()} onClick={usarCodigo}>
                  {text.usarCodigo}
                </button>
                <button type="button" className={botaoEscuro()} onClick={copiarLink}>
                  {text.copiarLink}
                </button>
              </div>
              <p role="status" className="min-h-[1.4em] text-[13px] text-paper">
                {recado?.erro && <span aria-hidden className="mr-2 inline-block h-2 w-2 bg-loss outline outline-1 outline-paper" />}
                {recado?.texto}
              </p>
            </div>
          </div>
        </section>

        <section aria-label={text.painel} className={cn(css.alto, "cut flex min-w-0 flex-col bg-paper max-md:order-3 max-md:h-auto")}>
          <div ref={abas} className={cn(css.topoPainel, "grid gap-2 border-b border-line bg-paper px-4 pt-3 md:pt-4")}>
            <div role="search" className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
              <label htmlFor="t3-busca" className="sr-only">
                {text.buscaRotulo}
              </label>
              <Input
                ref={campoBusca}
                id="t3-busca"
                type="search"
                value={buscaTexto}
                placeholder={text.buscaExemplo}
                autoComplete="off"
                spellCheck={false}
                aria-controls="t3-controles"
                aria-keyshortcuts="/"
                className="pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
                onChange={(e) => setBuscaTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Escape") return
                  e.stopPropagation()
                  if (buscaTexto) limparBusca()
                  else e.currentTarget.blur()
                }}
              />
              {buscaTexto && (
                <button
                  type="button"
                  aria-label={text.limparBusca}
                  onClick={() => {
                    limparBusca()
                    campoBusca.current?.focus()
                  }}
                  className="absolute right-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted hover:text-klein"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              )}
            </div>
            <Tabs
              label={text.abas}
              idPrefix="t3"
              className="-mx-4 gap-5 px-4 [scroll-padding-inline:16px]"
              value={idAba(aba)}
              onChange={(id) => abrirAba(ABAS.find((n) => idAba(n) === id) ?? "Modelos")}
              items={ABAS.map((n) => ({ id: idAba(n), label: n }))}
            />
          </div>
          <div
            ref={controles}
            id="t3-controles"
            role="tabpanel"
            tabIndex={-1}
            aria-labelledby={busca ? "t3-busca" : `t3-${idAba(aba)}`}
            className="grid min-h-0 flex-1 content-start gap-7 overflow-y-auto overscroll-contain px-4 pb-8 pt-5 focus-visible:-outline-offset-4 max-md:overflow-visible max-md:pb-6"
          >
            {conteudo}
          </div>
          <p role="status" className="sr-only">
            {anuncio}
          </p>
        </section>
      </div>
    </KitContext.Provider>
  )
}
