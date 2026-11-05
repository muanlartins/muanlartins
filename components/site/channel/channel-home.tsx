import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { FanStand } from "@/components/site/channel/fan-stand"
import { LanguageBadge } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { longDate } from "@/components/site/ranked/format"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { channelPath } from "@/lib/channel"
import { gamePath } from "@/lib/game"
import { PIX_API } from "@/lib/pix"
import type { Live } from "@/lib/lives"
import { LINKS, localize, PIX_SLUG, profileSlug, type Locale } from "@/lib/site"

const T = localize(channel)
const L = localize({ latest: { pt: "Última", en: "Latest" } })

const WHERE = [
  { link: LINKS.find((link) => link.label === "Twitch")!, text: T.where.twitch },
  { link: LINKS.find((link) => link.label === "YouTube")!, text: T.where.youtube },
]

/**
 * The channel's home: what it is, where to watch, what a viewer finds in a
 * live (and their fan in it), then the lives, the games and the backstage.
 */
export function ChannelHome({ lives }: { /** Newest first. */ lives: Live[] }) {
  return (
    <>
      <PageIntro title={T.title} description={T.description} />

      <div className="mt-10 max-w-[38rem] space-y-5 text-[17px] leading-[1.7] text-ink">
        {T.intro.split(/\n\s*\n/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <section className="mt-14">
        <Heading>{T.watch}</Heading>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {WHERE.map(({ link, text }) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-4 rounded-md border border-line bg-paper/70 px-5 py-4 transition-colors hover:border-klein"
            >
              <span>
                <span className="block text-xl font-medium tracking-[-0.02em] text-klein">{link.label}</span>
                <span className="text-[14px] text-ink">{text}</span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-klein" />
            </a>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{T.inside.title}</h2>

        <div className="mt-6 space-y-4">
          <h3 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{T.inside.crowd.title}</h3>
          <p className="max-w-[38rem] text-[16px] leading-[1.7] text-ink">{T.inside.crowd.text}</p>
          <FanStand />
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href={`/${profileSlug()}`}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-klein px-4 py-2.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              {T.inside.crowd.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="max-w-[28rem] text-[14px] leading-[1.6] text-muted">{T.inside.crowd.ctaHint}</p>
          </div>
        </div>

        <dl className="mt-10 grid gap-6 sm:grid-cols-3">
          {T.inside.moments.map((moment) => (
            <div key={moment.title} className="space-y-2 border-t border-line pt-4">
              <dt className="text-[15px] font-medium text-klein">{moment.title}</dt>
              <dd className="text-[14px] leading-[1.6] text-ink">{moment.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        <Card href={channelPath("lives")} title={T.lives.title} summary={T.lives.description} language="pt">
          {lives[0] && (
            <p className="text-[13px] text-muted">
              {L.latest}: {longDate(lives[0].date)}
            </p>
          )}
        </Card>
        {PIX_API && <Card href={`/${PIX_SLUG}`} title={T.pix.title} summary={T.pix.description} />}
        <Card href={channelPath("backstage")} title={T.backstage.title} summary={T.backstage.description} />
      </section>

      <section className="mt-16">
        <Heading>{T.games.title}</Heading>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {games.map((game, index) => (
            <Card key={game.id} href={gamePath(game)} title={localize(game.title)} summary={localize(game.description)} language={game.roadmap.language}>
              {index === 0 && <p className="text-[13px] text-muted">{T.games.first}</p>}
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{children}</h2>
}

function Card({
  href,
  title,
  summary,
  language,
  children,
}: {
  href: string
  title: string
  summary: string
  language?: Locale
  children?: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-md border border-line bg-paper/70 px-5 py-4 backdrop-blur-sm transition-colors hover:border-klein"
    >
      <h3 className="flex items-center gap-2 text-xl font-medium tracking-[-0.02em] text-klein">
        {title}
        {language && <LanguageBadge language={language} />}
      </h3>
      <p className="text-[14px] leading-[1.6] text-ink">{summary}</p>
      {children && <div className="mt-auto pt-1">{children}</div>}
    </Link>
  )
}
