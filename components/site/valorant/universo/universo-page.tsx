import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { DocPage, DocSection } from "@/components/site/docs"
import { Reading } from "@/components/site/lore"
import { agentePath } from "@/components/site/valorant/universo/agente-page"
import { HISTORIAS } from "@/components/site/valorant/universo/agentes"
import { fonte } from "@/content/valorant-universo/fontes"
import valorant from "@/content/valorant-home"
import { gamePath } from "@/lib/game"
import { localize } from "@/lib/site"
import { agentes, mapas, REFERENCIAS, universoPath, type Agente } from "@/lib/valorant-universo"
import { cn } from "@/lib/utils"

export const UNIVERSO_INTRO = {
  title: "Universo Valorant",
  description: "Os agentes, as vozes, as falas e as curiosidades do mundo de Valorant, tudo com fonte: o que o jogo diz, o que a Riot contou e o que os fãs descobriram.",
}

/**
 * Universo Valorant's front page: every agent (the ones with a page lead to it), the voices of all of them in both
 * languages, and the game's internal names for agents and maps, the curiosities the data alone gives.
 */
export function UniversoPage() {
  const all = agentes()
  const sections = [
    { id: "agentes", title: "Os agentes" },
    { id: "vozes", title: "Quem dá a voz" },
    { id: "codigo", title: "Os nomes no código" },
  ]
  return (
    <DocPage
      trail={[{ label: "Valorant", href: gamePath({ id: "valorant" }) }]}
      here="Universo"
      title={UNIVERSO_INTRO.title}
      description={UNIVERSO_INTRO.description}
      meta={[
        { label: "Agentes", value: all.length },
        { label: "Com página", value: Object.keys(HISTORIAS).length },
        { label: "Referências", value: <Link href={universoPath(REFERENCIAS)} className="text-klein hover:underline">Ver todas</Link> },
      ]}
      toc={sections}
    >
      <DocSection id="agentes" n={1} title="Os agentes" description="Na ordem do Protocolo: o número de cada um é o da ficha de agente. O 8 nunca apareceu.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {all.map((agente) => (
            <li key={agente.id}>
              <AgenteCard agente={agente} />
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="vozes" n={2} title="Quem dá a voz" description="A dublagem brasileira e o original. Marcada, a voz que uma fonte primária confirma; as outras são das wikis feitas por fãs.">
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[34rem] border-y border-line text-left text-[15px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="eyebrow py-2 pr-4 font-medium text-muted">Agente</th>
                <th scope="col" className="eyebrow py-2 pr-4 font-medium text-muted">Dublagem brasileira</th>
                <th scope="col" className="eyebrow py-2 font-medium text-muted">Original</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {all.map((agente) => (
                <tr key={agente.id}>
                  <th scope="row" className="py-2 pr-4 font-medium text-ink">
                    {agente.id in HISTORIAS ? (
                      <Link href={agentePath(agente)} className="text-klein hover:underline">
                        {agente.nome}
                      </Link>
                    ) : (
                      agente.nome
                    )}
                  </th>
                  <td className="py-2 pr-4 text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      {agente.vozes.pt.nome}
                      {agente.vozes.pt.fonte && (
                        <a href={fonte(agente.vozes.pt.fonte).url} target="_blank" rel="noreferrer" title={`Confirmada: ${fonte(agente.vozes.pt.fonte).titulo}`} className="text-win">
                          <Check aria-label="confirmada" className="h-4 w-4" />
                        </a>
                      )}
                    </span>
                  </td>
                  <td className="py-2 text-ink">
                    {agente.vozes.en.nome}
                    {agente.vozes.en.confirmada === false && <span className="text-[13px] text-muted"> (sem confirmação)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[38rem] text-[13px] leading-[1.5] text-muted">
          A Riot não publica o elenco de dublagem. As vozes vêm da{" "}
          <a href={fonte("dublagem-wiki").url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-4 hover:text-klein">
            Dublagem Wiki
          </a>{" "}
          e da{" "}
          <a href={fonte("fandom-wiki").url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-4 hover:text-klein">
            VALORANT Wiki
          </a>
          , e as confirmadas, de painéis e entrevistas com a própria Riot. O estúdio da dublagem é a UniDub (hoje Iyuno), em São Paulo.
        </p>
      </DocSection>

      <DocSection id="codigo" n={3} title="Os nomes no código" description="Antes de ganhar nome, cada agente e cada mapa tem um codinome nos arquivos do jogo, e ele fica lá pra sempre.">
        <div className="space-y-10">
          <Reading seal="jogo" title="Os agentes">
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              {all.map((agente) => (
                <li key={agente.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                  <span className="text-ink">{agente.nome}</span>
                  <code className={cn("text-[13px] text-klein", agente.codinome === agente.nome && "text-muted")}>{agente.codinome}</code>
                </li>
              ))}
            </ul>
          </Reading>
          <Reading seal="jogo" title="Os mapas, e as coordenadas da tela de carregamento">
            <ul className="divide-y divide-line border-y border-line">
              {mapas().map((mapa) => (
                <li key={mapa.id} className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[8rem_7rem_minmax(0,1fr)]">
                  <span className="text-ink">{mapa.nome.pt}</span>
                  <code className="text-[13px] text-klein">{mapa.codinome}</code>
                  <span className="text-[13px] tabular-nums text-muted">{mapa.coordenadas}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] leading-[1.5] text-muted">
              Os graus e os minutos são de lugares reais. Os segundos vêm trocados por letras, como num código.
            </p>
          </Reading>
        </div>
      </DocSection>

      <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{localize(valorant.credits)}</p>
    </DocPage>
  )
}

function AgenteCard({ agente }: { agente: Agente }) {
  const page = agente.id in HISTORIAS
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, 96 px heads */}
        <img src={agente.cabeca} alt="" width={48} height={48} loading="lazy" className="h-12 w-12" />
        <span className="eyebrow tabular-nums text-muted">{String(agente.numero).padStart(2, "0")}</span>
      </span>
      <span className="mt-3 block text-[15px] font-medium text-ink">{agente.nome}</span>
      <span className="block text-[13px] text-muted">{agente.funcao.pt}</span>
      {agente.origem && <span className="line-clamp-2 block text-[13px] text-muted">{agente.origem}</span>}
      {page && (
        <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-klein">
          Ler a página <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  )
  const box = "cut cut-edge relative block h-full border p-4"
  return page ? (
    <Link href={agentePath(agente)} className={cn(box, "border-klein bg-paper transition-colors hover:bg-klein/5")}>
      {body}
    </Link>
  ) : (
    <div className={cn(box, "border-line bg-paper/50")}>{body}</div>
  )
}
