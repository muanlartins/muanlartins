import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { CommandName } from "@/components/site/channel/command-name"
import { StandDemo } from "@/components/site/channel/stand-demo"
import { PageIntro } from "@/components/site/page-intro"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { commands } from "@/lib/commands"
import { localize, profileSlug } from "@/lib/site"

const T = localize(channel)
const C = T.comandos

/**
 * /canal/comandos: every way to take part in the live from the chat, from public/stream/comandos.json (the same
 * list the stand's tips, the chat bot and the Twitch panel come from): the stand's commands, tried on sample fans;
 * the VAR's vote; the chat bot's; the channel points' sounds; and how Σ come.
 */
export function CommandsPage() {
  const { grupos, recompensas, sigma } = commands()
  return (
    <>
      <Link
        href={channelPath()}
        className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-klein"
      >
        <ArrowLeft className="h-4 w-4" />
        {T.title}
      </Link>
      <PageIntro title={C.title} description={C.description} />

      {grupos.map((grupo) => (
        <Part key={grupo.id} id={grupo.id} title={grupo.titulo} text={grupo.texto}>
          {grupo.id === "arquibancada" ? (
            <StandDemo commands={grupo.comandos} you={C.you} hint={C.tryIt} shout={C.shout} also={C.also} />
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {grupo.comandos.map((c) => (
                <li key={c.comando} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <CommandName command={c} also={C.also} />
                  <span className="text-[15px] leading-[1.55] text-ink">{c.texto}</span>
                </li>
              ))}
            </ul>
          )}
          {grupo.nota && <p className="mt-3 text-[13px] leading-[1.5] text-muted">{grupo.nota}</p>}
          {grupo.id === "arquibancada" && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px] text-ink">{C.profile.text}</p>
              <Link
                href={`/${profileSlug()}`}
                className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md bg-klein px-4 py-2.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
              >
                {C.profile.cta}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Part>
      ))}

      <Part id="pontos" title={recompensas.titulo} text={recompensas.texto}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {recompensas.itens.map((r) => (
            <li key={r.nome} className="rounded-md border border-line bg-paper/70 px-4 py-3">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[16px] font-medium text-klein">{r.nome}</span>
                <span className="text-[13px] text-muted">
                  {r.custo} {C.points}
                </span>
              </span>
              <span className="mt-1 block text-[14px] text-ink">{r.texto}</span>
            </li>
          ))}
        </ul>
      </Part>

      <Part id="sigma" title={sigma.titulo} text={sigma.texto}>
        <dl className="divide-y divide-line border-y border-line">
          {sigma.ganhos.map((g) => (
            <div key={g.como} className="flex items-baseline gap-6 py-3">
              <dt className="w-16 shrink-0 text-[17px] font-medium text-klein">{g.quanto}</dt>
              <dd className="text-[15px] text-ink">{g.como}</dd>
            </div>
          ))}
        </dl>
      </Part>
    </>
  )
}

function Part({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{title}</h2>
      <p className="mt-2 max-w-[38rem] text-[15px] leading-[1.6] text-ink">{text}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}
