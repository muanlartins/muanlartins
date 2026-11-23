import type { ReactNode } from "react"
import { SourceLine, type Source } from "@/components/site/lore"
import { Badge } from "@/components/site/ui"
import { fonte } from "@/content/valorant-universo/fontes"
import { delaDele, textoDoJogo, type Agente } from "@/lib/valorant-universo"

/**
 * The blocks every agent page has, drawn from the data alone: the official bio, the abilities in both languages and
 * the voices. A page's story file adds its own words around them.
 */

/** The game's straight quotes inside a quote, as single curly ones: "porradeiro" → ‘porradeiro’. */
const aspas = (text: string) => text.replace(/"([^"]+)"/g, "‘$1’")

/** The game's own bio of the agent, the dub's text over the original's. */
export function Bio({ agente }: { agente: Agente }) {
  return (
    <figure className="cut max-w-[38rem] space-y-2 bg-navy p-5 text-paper">
      <blockquote className="text-[17px] leading-[1.6]">“{aspas(agente.bio.pt)}”</blockquote>
      <p lang="en" className="text-[13px] leading-[1.5] text-klein-claro">
        “{aspas(agente.bio.en)}”
      </p>
      <figcaption className="text-[13px] text-klein-claro">A apresentação {delaDele(agente)} no próprio jogo</figcaption>
    </figure>
  )
}

/** Each ability by its key: the Brazilian client's name over the original's, what it does, and a note when the page has one. */
export function Habilidades({ agente, notas = {} }: { agente: Agente; notas?: Record<string, ReactNode> }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {agente.habilidades.map((habilidade) => (
        <li key={habilidade.tecla} className="grid gap-x-5 gap-y-2 py-5 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
          <p>
            <Badge tone={habilidade.tecla === "X" ? "klein" : "soft"}>{habilidade.tecla === "X" ? "Ult · X" : habilidade.tecla}</Badge>
          </p>
          <div className="min-w-0 max-w-[38rem] space-y-1.5">
            <h3 className="text-[15px] font-medium text-ink">
              {habilidade.pt.nome}{" "}
              <span lang="en" className="font-normal text-muted">
                · {habilidade.en.nome}
              </span>
            </h3>
            <p className="text-[15px] leading-[1.6] text-ink">{textoDoJogo(habilidade.pt.texto)}</p>
            {notas[habilidade.tecla] && <div className="text-[15px] leading-[1.6] text-ink">{notas[habilidade.tecla]}</div>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Who voices the agent in the dub and in the original, and how sure that is: a primary source, or the fan wikis. */
export function Vozes({ agente, extra }: { agente: Agente; extra?: { pt?: ReactNode; en?: ReactNode } }) {
  const card = (lang: "pt" | "en") => {
    const voz = agente.vozes[lang]
    const source: Source = voz.fonte ? { label: `Confirmada: ${fonte(voz.fonte).titulo}`, href: fonte(voz.fonte).url } : lang === "pt" ? { label: "Segundo a Dublagem Wiki (feita por fãs)", href: fonte("dublagem-wiki").url } : { label: voz.confirmada === false ? "Segundo a VALORANT Wiki, ainda sem confirmação" : "Segundo a VALORANT Wiki (feita por fãs)", href: fonte("fandom-wiki").url }
    return (
      <div className="cut cut-edge relative space-y-2 border border-line bg-paper/70 p-5">
        <p className="eyebrow text-muted">{lang === "pt" ? "Na dublagem brasileira" : "No original, em inglês"}</p>
        <p className="text-xl font-medium tracking-[-0.02em] text-klein">{voz.nome}</p>
        <SourceLine source={source} />
        {extra?.[lang] && <div className="pt-1 text-[15px] leading-[1.6] text-ink">{extra[lang]}</div>}
      </div>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {card("pt")}
      {card("en")}
    </div>
  )
}
