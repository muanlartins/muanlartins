import Link from "next/link"
import { DocPage, DocSection } from "@/components/site/docs"
import { agentePath } from "@/components/site/valorant/universo/agente-page"
import { HISTORIAS } from "@/components/site/valorant/universo/agentes"
import { FONTES, type TipoFonte } from "@/content/valorant-universo/fontes"
import valorant from "@/content/valorant-home"
import { gamePath } from "@/lib/game"
import { localize } from "@/lib/site"
import { falasDe } from "@/lib/valorant-falas-files"
import { agentes, universoPath } from "@/lib/valorant-universo"

export const REFERENCIAS_INTRO = {
  title: "Referências",
  description: "Tudo de onde o Universo Valorant saiu, e até onde cada coisa foi lida. Uma fonte só entra depois de aberta e de dizer o que a página diz.",
}

const TIPOS: { tipo: TipoFonte; title: string }[] = [
  { tipo: "jogo", title: "O jogo" },
  { tipo: "riot", title: "A Riot" },
  { tipo: "dados", title: "Os dados do jogo" },
  { tipo: "academico", title: "Pesquisa acadêmica" },
  { tipo: "imprensa", title: "Imprensa e entrevistas" },
  { tipo: "video", title: "Vídeos" },
  { tipo: "wiki", title: "As wikis dos fãs" },
]

/** Universo Valorant's bibliography, by kind, each source with who made it, how far it was read and the pages that use it. */
export function ReferenciasPage() {
  const all = agentes()
  const usedBy = new Map<string, string[]>()
  for (const agente of all.filter((each) => each.id in HISTORIAS)) {
    const { fontes } = HISTORIAS[agente.id]({ agente, falas: falasDe(agente.id)?.falas ?? [] })
    for (const id of fontes) usedBy.set(id, [...(usedBy.get(id) ?? []), agente.id])
  }
  const groups = TIPOS.map((group) => ({ ...group, fontes: FONTES.filter((each) => each.tipo === group.tipo) })).filter((group) => group.fontes.length > 0)

  return (
    <DocPage
      trail={[
        { label: "Valorant", href: gamePath({ id: "valorant" }) },
        { label: "Universo", href: universoPath() },
      ]}
      here="Referências"
      title={REFERENCIAS_INTRO.title}
      description={REFERENCIAS_INTRO.description}
      meta={[{ label: "Fontes", value: FONTES.length }]}
      toc={groups.map((group) => ({ id: group.tipo, title: group.title }))}
    >
      {groups.map((group, n) => (
        <DocSection key={group.tipo} id={group.tipo} n={n + 1} title={group.title}>
          <ul className="divide-y divide-line border-y border-line">
            {group.fontes.map((source) => {
              const pages = usedBy.get(source.id) ?? []
              return (
                <li key={source.id} id={source.id} className="scroll-mt-32 py-4">
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-klein">
                      {source.titulo}
                    </a>
                  ) : (
                    <p className="text-[15px] font-medium text-ink">{source.titulo}</p>
                  )}
                  <p className="mt-1 text-[13px] leading-[1.5] text-muted">
                    {source.autor}
                    {source.lingua === "en" && " · em inglês"}
                    {source.lingua === "ja" && " · em japonês"}
                    {" · "}lido: {source.lido.charAt(0).toLowerCase() + source.lido.slice(1)}
                  </p>
                  {pages.length > 0 && (
                    <p className="mt-1 text-[13px] text-muted">
                      Usada em{" "}
                      {pages.map((id, index) => (
                        <span key={id}>
                          {index > 0 && ", "}
                          <Link href={agentePath({ id })} className="text-klein hover:underline">
                            {all.find((each) => each.id === id)?.nome}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </DocSection>
      ))}
      <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{localize(valorant.credits)}</p>
    </DocPage>
  )
}
