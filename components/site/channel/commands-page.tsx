import { ArrowRight, Sigma } from "lucide-react"
import { CommandName } from "@/components/site/channel/command-name"
import { StandDemo } from "@/components/site/channel/stand-demo"
import { Callout, DefList, DocPage, DocSection, docsLinks } from "@/components/site/docs"
import { ButtonLink } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { commands } from "@/lib/commands"
import { localize, profileSlug } from "@/lib/site"

const T = localize(channel)
const C = T.comandos
const TERM = "14rem"

/**
 * /canal/comandos, a documentation page: every way to take part in the live from the chat, from
 * public/stream/comandos.json (the same list the stand's tips, the chat bot and the Twitch panel come from): the
 * stand's commands, tried on sample fans; the VAR's vote; the chat bot's; the rewards for Twitch's channel points;
 * and the way to Σ's own page.
 */
export function CommandsPage() {
  const { grupos, recompensas } = commands()
  const toc = [...grupos.map((g) => ({ id: g.id, title: g.titulo })), { id: "recompensas", title: recompensas.titulo }, { id: "sigma", title: C.sigma.title }]
  const count = grupos.reduce((n, g) => n + g.comandos.length, 0)

  return (
    <DocPage
      trail={[{ label: T.title, href: channelPath() }]}
      title={C.title}
      description={C.description}
      meta={[
        { label: C.meta.commands, value: count },
        { label: C.meta.rewards, value: recompensas.itens.length },
      ]}
      toc={toc}
      more={docsLinks(channelPath("comandos"))}
    >
      {grupos.map((grupo, i) => (
        <DocSection key={grupo.id} id={grupo.id} n={i + 1} title={grupo.titulo} description={grupo.texto}>
          {grupo.id === "arquibancada" ? (
            <StandDemo commands={grupo.comandos} you={C.you} hint={C.tryIt} shout={C.shout} also={C.also} term={TERM} />
          ) : (
            <DefList
              termWidth={TERM}
              head={grupo.comandos.length > 2 ? [C.head.command, C.head.does] : undefined}
              items={grupo.comandos.map((c) => ({ key: c.comando, term: <CommandName command={c} also={C.also} />, detail: c.texto }))}
            />
          )}
          {grupo.nota && <p className="mt-3 max-w-[38rem] text-[13px] leading-[1.5] text-muted">{grupo.nota}</p>}
          {grupo.id === "arquibancada" && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px] text-ink">{C.profile.text}</p>
              <ButtonLink href={`/${profileSlug()}`} variant="secondary" className="w-fit shrink-0">
                {C.profile.cta}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </ButtonLink>
            </div>
          )}
        </DocSection>
      ))}

      <DocSection id="recompensas" n={grupos.length + 1} title={recompensas.titulo} description={recompensas.texto}>
        <DefList
          termWidth={TERM}
          head={[C.head.reward, C.head.does, C.head.cost]}
          items={recompensas.itens.map((r) => ({
            key: r.nome,
            term: <span className="text-[15px] font-medium text-klein">{r.nome}</span>,
            detail: r.texto,
            aside: `${r.custo} ${C.points}`,
          }))}
        />
        <Callout className="mt-6">{C.notSigma}</Callout>
      </DocSection>

      <DocSection id="sigma" n={grupos.length + 2} title={C.sigma.title} description={C.sigma.text}>
        <ButtonLink href={channelPath("sigma")} variant="secondary" icon={<Sigma aria-hidden className="h-4 w-4" />}>
          {C.sigma.cta}
        </ButtonLink>
      </DocSection>
    </DocPage>
  )
}
