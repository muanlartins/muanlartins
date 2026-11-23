import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { DocPage, DocSection, type DocMeta } from "@/components/site/docs"
import { HISTORIAS } from "@/components/site/valorant/universo/agentes"
import { FONTES, fonte } from "@/content/valorant-universo/fontes"
import valorant from "@/content/valorant-home"
import { gamePath } from "@/lib/game"
import { localize } from "@/lib/site"
import type { Fala } from "@/lib/valorant-falas"
import { agentes, REFERENCIAS, universoPath, type Agente } from "@/lib/valorant-universo"

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

/** "2 de junho de 2020", or the closed beta's. */
export function chegada(agente: Agente) {
  if (agente.chegou === "beta") return "No beta, em 2020"
  const [year, month, day] = agente.chegou.split("-").map(Number)
  return `${day} de ${MESES[month - 1]} de ${year}`
}

/** The facts on the strip under the title. */
function ficha(agente: Agente): DocMeta[] {
  return [
    { label: "Agente", value: `nº ${agente.numero}` },
    ...(agente.nomeReal ? [{ label: "Nome", value: agente.apelido ? `${agente.nomeReal} (${agente.apelido})` : agente.nomeReal }] : []),
    ...(agente.origem ? [{ label: "De", value: agente.origem }] : []),
    { label: "Função", value: agente.funcao.pt },
    { label: "Chegou", value: chegada(agente) },
    { label: "No código", value: agente.codinome },
  ]
}

export const agentePath = (agente: { id: string }) => universoPath(agente.id)

/**
 * An agent's page (components/site/valorant/universo/agentes/<id>.tsx): the facts on the strip, the story's sections
 * numbered, then the sources it leans on, the agents before and after it that have a page, and Riot's notice.
 */
export function AgentePage({ agente, falas }: { agente: Agente; falas: Fala[] }) {
  const { lede, sections, fontes } = HISTORIAS[agente.id]({ agente, falas })
  const comPagina = agentes().filter((each) => each.id in HISTORIAS)
  const index = comPagina.findIndex((each) => each.id === agente.id)
  const [previous, next] = [comPagina[index - 1], comPagina[index + 1]]
  const all = [...sections, { id: "fontes", title: "Fontes", body: null }]

  return (
    <DocPage
      trail={[
        { label: "Valorant", href: gamePath({ id: "valorant" }) },
        { label: "Universo", href: universoPath() },
      ]}
      here="Agentes"
      title={agente.nome}
      description={lede}
      meta={ficha(agente)}
      toc={all.map(({ id, title }) => ({ id, title }))}
    >
      {sections.map((section, n) => (
        <DocSection key={section.id} id={section.id} n={n + 1} title={section.title} description={section.description}>
          {section.body}
        </DocSection>
      ))}
      <DocSection id="fontes" n={sections.length + 1} title="Fontes" description="De onde saiu cada coisa desta página. Todas estão, com até onde foram lidas, nas referências do Universo.">
        <ul className="max-w-[38rem] divide-y divide-line border-y border-line">
          {fontes.map((id) => {
            const source = fonte(id)
            return (
              <li key={id} className="py-3">
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-klein">
                    {source.titulo}
                  </a>
                ) : (
                  <span className="text-[15px] font-medium text-ink">{source.titulo}</span>
                )}
                <p className="mt-0.5 text-[13px] text-muted">{source.autor}</p>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-[15px]">
          <Link href={universoPath(REFERENCIAS)} className="text-klein underline-offset-4 hover:underline">
            Ver todas as {FONTES.length} referências
          </Link>
        </p>
      </DocSection>

      {(previous || next) && (
        <nav aria-label="Outros agentes" className="mt-24 grid grid-cols-2 gap-6 border-t border-line pt-3">
          {previous ? <Vizinho agente={previous} label="Anterior" /> : <span />}
          {next && <Vizinho agente={next} label="Próximo" forward />}
        </nav>
      )}
      <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{localize(valorant.credits)}</p>
    </DocPage>
  )
}

function Vizinho({ agente, label, forward = false }: { agente: Agente; label: string; forward?: boolean }) {
  const Arrow = forward ? ArrowRight : ArrowLeft
  return (
    <Link href={agentePath(agente)} className={`group block py-3 ${forward ? "text-right" : ""}`}>
      <span className={`eyebrow flex items-center gap-1.5 text-muted ${forward ? "justify-end" : ""}`}>
        {!forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
        {label}
        {forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
      </span>
      <span className="mt-1 block text-[15px] font-medium text-ink transition-colors group-hover:text-klein">{agente.nome}</span>
    </Link>
  )
}
