"use client"

import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge, Button, Choice, Input } from "@/components/site/ui"
import { FalaBotoes } from "@/components/site/valorant/universo/fala-player"
import { falaSrc, type Fala, type Quando } from "@/lib/valorant-falas"

/**
 * Every line of an agent, to hear and read in both languages: narrowed by when the game plays it (chips) or by any
 * word in either language, 30 at a time. Lines other agents say to or about this one are a filter of their own.
 */

const QUANDO: Record<Quando, string> = {
  selecao: "Seleção",
  "inicio-partida": "Começo da partida",
  "inicio-rodada": "Começo da rodada",
  conversa: "Conversas",
  habilidade: "Habilidades",
  "abate-habilidade": "Abates com habilidade",
  abate: "Abates",
  jogada: "Jogadas",
  morte: "Quando alguém cai",
  spike: "Spike",
  comando: "Comandos e rádio",
  vitoria: "Vitória e fim",
  maestria: "Maestria",
  outra: "Outras",
}
const ORDER = Object.keys(QUANDO) as Quando[]
const PAGE = 30

type Linha = Pick<Fala, "id" | "quem" | "quando" | "com" | "pt" | "en">

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function CatalogoFalas({ agent, de, dele, falas, nomes }: {
  agent: string
  /** "da Raze", "do Breach", "de Clove". */
  de: string
  /** "dela", "dele", "de Clove". */
  dele: string
  falas: Linha[]
  nomes: Record<string, string>
}) {
  const [filtro, setFiltro] = useState<Quando | "dela" | "sobre" | "todas">("todas")
  const [busca, setBusca] = useState("")
  const [mostrar, setMostrar] = useState(PAGE)

  const dela = falas.filter((fala) => fala.quem === agent)
  const sobre = falas.filter((fala) => fala.quem !== agent)
  const counts = useMemo(() => {
    const by = new Map<Quando, number>()
    for (const fala of dela) by.set(fala.quando, (by.get(fala.quando) ?? 0) + 1)
    return by
  }, [dela])

  const visiveis = useMemo(() => {
    const words = plain(busca).split(/\s+/).filter(Boolean)
    return falas
      .filter((fala) => {
        if (filtro === "dela") return fala.quem === agent
        if (filtro === "sobre") return fala.quem !== agent
        if (filtro !== "todas") return fala.quem === agent && fala.quando === filtro
        return true
      })
      .filter((fala) => words.every((word) => plain(`${fala.pt} ${fala.en} ${nomes[fala.quem] ?? ""}`).includes(word)))
      .sort((a, b) => Number(a.quem !== agent) - Number(b.quem !== agent) || ORDER.indexOf(a.quando) - ORDER.indexOf(b.quando))
  }, [falas, filtro, busca, agent, nomes])

  const pick = (next: typeof filtro) => {
    setFiltro(next)
    setMostrar(PAGE)
  }
  const nameOf = (id: string) => (id.startsWith("mapa:") ? id.slice(5) : (nomes[id] ?? id))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar as falas">
        <Choice size="sm" on={filtro === "todas"} onClick={() => pick("todas")}>
          Todas · {falas.length}
        </Choice>
        <Choice size="sm" on={filtro === "dela"} onClick={() => pick("dela")}>
          {de[0].toUpperCase() + de.slice(1)} · {dela.length}
        </Choice>
        {sobre.length > 0 && (
          <Choice size="sm" on={filtro === "sobre"} onClick={() => pick("sobre")}>
            Falando {dele} · {sobre.length}
          </Choice>
        )}
        {ORDER.filter((quando) => counts.get(quando)).map((quando) => (
          <Choice key={quando} size="sm" on={filtro === quando} onClick={() => pick(quando)}>
            {QUANDO[quando]} · {counts.get(quando)}
          </Choice>
        ))}
      </div>
      <label className="relative block max-w-sm">
        <span className="sr-only">Buscar uma fala</span>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={busca}
          onChange={(event) => {
            setBusca(event.target.value)
            setMostrar(PAGE)
          }}
          placeholder="Buscar em português ou em inglês"
          className="pl-9"
        />
      </label>

      {visiveis.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-6 text-[15px] text-muted">Nenhuma fala com essas palavras.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {visiveis.slice(0, mostrar).map((fala) => (
            <li key={fala.id} className="grid gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-[15px] leading-[1.5] text-ink">{fala.pt ? `“${fala.pt}”` : "–"}</p>
                <p lang="en" className="mt-0.5 text-[13px] leading-[1.5] text-muted">
                  {fala.en ? `“${fala.en}”` : "–"}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {fala.quem !== agent && <Badge tone="klein">{nameOf(fala.quem)}</Badge>}
                  <Badge tone="soft">{QUANDO[fala.quando]}</Badge>
                  {fala.com?.filter((id) => id !== agent).map((id) => (
                    <Badge key={id} tone="soft">
                      {id.startsWith("mapa:") ? `Em ${nameOf(id)}` : `Com ${nameOf(id)}`}
                    </Badge>
                  ))}
                </p>
              </div>
              <FalaBotoes pt={falaSrc(agent, fala.id, "pt")} en={falaSrc(agent, fala.id, "en")} label={`“${fala.pt || fala.en}”`} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {Math.min(mostrar, visiveis.length)} de {visiveis.length} falas
        </p>
        {mostrar < visiveis.length && (
          <Button variant="secondary" size="sm" onClick={() => setMostrar((n) => n + PAGE)}>
            Ver mais {Math.min(PAGE, visiveis.length - mostrar)}
          </Button>
        )}
      </div>
    </div>
  )
}
