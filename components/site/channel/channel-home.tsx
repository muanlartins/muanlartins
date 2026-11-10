import { ArrowRight, Clapperboard, Heart, MessagesSquare, Milestone, PartyPopper, QrCode, Trophy, UserRound, Wrench, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { FanStand } from "@/components/site/channel/fan-stand"
import { NextLive } from "@/components/site/channel/next-live"
import { GameIcon } from "@/components/site/game/game-icon"
import { PageIntro } from "@/components/site/page-intro"
import { longDate } from "@/components/site/ranked/format"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { slotsOf, slotText } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { gamePath } from "@/lib/game"
import type { Live } from "@/lib/lives"
import { PIX_API } from "@/lib/pix"
import { localize, MURAL_SLUG, PIX_SLUG, profileSlug } from "@/lib/site"

const T = localize(channel)
const L = localize({ latest: { pt: "Última", en: "Latest" } })

const MOMENT_ICONS: Record<string, LucideIcon> = { party: PartyPopper, chat: MessagesSquare, ranked: Trophy }

/**
 * The channel's home, which is the site's: little to read, a lot to click. The next live (or the one on air) with
 * where to watch, the games with when each is live, the stand with the way to build your fan and the live's moments
 * in a line each, then the channel's other pages as icons (the roadmap's among them).
 */
export function ChannelHome({ lives }: { /** Newest first. */ lives: Live[] }) {
  return (
    <>
      <PageIntro title={T.title} description={T.description} />

      <NextLive />

      <section className="mt-14">
        <Heading>{T.games.title}</Heading>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {games.map((game) => (
            <Link
              key={game.id}
              href={gamePath(game)}
              className="group flex items-center gap-4 rounded-md border border-line bg-paper/70 px-5 py-4 backdrop-blur-sm transition-colors hover:border-klein"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-klein/[0.08]">
                <GameIcon game={game.id} size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-medium tracking-[-0.02em] text-klein">{localize(game.title)}</span>
                {slotsOf(game.id).map((slot) => (
                  <span key={slot.start} className="block text-[13px] text-muted">
                    {slotText(slot)}
                  </span>
                ))}
              </span>
              <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-klein" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <Heading>{T.inside.title}</Heading>
        <div className="mt-4 space-y-4">
          <FanStand />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-ink">{T.inside.crowd.text}</p>
            <Link
              href={`/${profileSlug()}`}
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md bg-klein px-4 py-2.5 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              {T.inside.crowd.cta}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {T.inside.moments.map((moment) => {
            const Icon = MOMENT_ICONS[moment.icon]
            return (
              <li key={moment.title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-klein text-paper">
                  <Icon aria-hidden className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-[15px] font-medium text-ink">{moment.title}</span>
                  <span className="block text-[13px] leading-[1.5] text-muted">{moment.text}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-14">
        <Heading>{T.more}</Heading>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile href={channelPath("lives")} icon={Clapperboard} title={T.lives.title} summary={lives[0] ? `${L.latest}: ${longDate(lives[0].date)}` : T.lives.description} />
          {PIX_API && <Tile href={`/${PIX_SLUG}`} icon={QrCode} title={T.pix.title} summary={T.pix.description} />}
          {PIX_API && <Tile href={`/${MURAL_SLUG}`} icon={Heart} title={T.mural.title} summary={T.mural.description} />}
          <Tile href={`/${profileSlug()}`} icon={UserRound} title={T.profile.title} summary={T.profile.description} />
          <Tile href={channelPath("backstage")} icon={Wrench} title={T.backstage.title} summary={T.backstage.description} />
          <Tile href={channelPath("roadmap")} icon={Milestone} title={T.roadmap.title} summary={T.roadmap.tile} />
        </div>
      </section>
    </>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{children}</h2>
}

/** One of the channel's pages: its icon, its name, a line. */
function Tile({ href, icon: Icon, title, summary }: { href: string; icon: LucideIcon; title: string; summary: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-md border border-line bg-paper/70 p-4 backdrop-blur-sm transition-colors hover:border-klein"
    >
      <Icon aria-hidden className="h-5 w-5 text-klein" />
      <span className="text-[16px] font-medium text-ink group-hover:text-klein">{title}</span>
      <span className="text-[13px] leading-[1.45] text-muted">{summary}</span>
    </Link>
  )
}
