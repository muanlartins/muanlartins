"use client"

import { CalendarDays, Play } from "lucide-react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { DiscordIcon, TwitchIcon, YouTubeIcon } from "@/components/site/brand-icons"
import { GameIcon } from "@/components/site/game/game-icon"
import { gameName, useNow } from "@/components/site/lives/agenda"
import { Pulse } from "@/components/site/lives/live-badge"
import { ButtonLink, Countdown, EmptyState, ErrorLine, Lattice, Skeleton } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { nextOccurrence, whenOf, type Agenda, type Occurrence } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { DISCORD_INVITE, LINKS, localize } from "@/lib/site"
import { TWITCH, useLive } from "@/lib/twitch"

const T = localize(channel)
const YOUTUBE = LINKS.find((link) => link.label === "YouTube")!.href

// The buttons on Klein: Branco filled, or a Klein claro edge.
const ON_KLEIN = "bg-paper text-klein hover:bg-ground"
const ON_KLEIN_EDGE = "border-klein-claro bg-transparent text-paper hover:border-paper hover:text-paper"

/**
 * The home's first block, the answer most visitors come for, and the only place "ao vivo" is said, because the live is
 * Twitch's: the live on air with the way to watch it, or a countdown to the next one with its game, when and title,
 * from the viewer's clock. Under it, apart, the places that are never live: YouTube, the Discord and the agenda.
 */
export function NextLive() {
  const live = useLive()
  const { agenda, fresh } = useAgenda()
  const now = useNow()
  const next = agenda && now ? nextOccurrence(agenda, now) : null
  const started = !!next && !!now && Date.parse(next.inicio) <= +now

  return (
    <section aria-labelledby={live ? "live-agora" : "live-rotulo"} className="mt-12">
      <div className="cut relative overflow-hidden bg-klein text-paper">
        <Lattice fade="left" />
        <div className="relative p-5 sm:p-8">
          {live ? (
            <OnAir agenda={agenda} current={started ? next : null} />
          ) : (
            <Upcoming agenda={agenda} next={next} started={started} loading={!now || (!agenda && !fresh)} failed={!!now && fresh && !agenda} now={now} />
          )}
        </div>
      </div>
      <Elsewhere />
    </section>
  )
}

/** Live on Twitch now: said big, with the game and title when the agenda has this live, and where to watch. */
function OnAir({ agenda, current }: { agenda: Agenda | null; current: Occurrence | null }) {
  const game = current && games.find((game) => game.id === current.jogo)
  return (
    <>
      <p className="eyebrow flex items-center gap-2 text-klein-claro">
        <Pulse className="bg-klein-claro" />
        Twitch
      </p>
      <h2 id="live-agora" className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[64px]">{T.next.onAir}</h2>
      {current && agenda && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-2 text-xl font-medium tracking-[-0.02em]">
            {game && <GameIcon game={game.id} size={20} />}
            {gameName(agenda, current.jogo)}
          </span>
          <span className="text-[15px] text-paper/80">{current.titulo}</span>
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={channelPath("lives")} icon={<Play aria-hidden className="h-4 w-4 fill-current" />} className={ON_KLEIN}>
          {T.next.watch}
        </ButtonLink>
        <ButtonLink href={TWITCH} variant="secondary" icon={<TwitchIcon className="h-4 w-4" />} className={ON_KLEIN_EDGE}>
          {T.next.open}
        </ButtonLink>
      </div>
    </>
  )
}

/** Not live: the next live and the time left to it, ticking; or why there's no countdown. */
function Upcoming({
  agenda,
  next,
  started,
  loading,
  failed,
  now,
}: {
  agenda: Agenda | null
  next: Occurrence | null
  started: boolean
  loading: boolean
  failed: boolean
  now: Date | undefined
}) {
  const game = next && games.find((game) => game.id === next.jogo)
  // Once its time has come, still the time it was set for ("hoje, 14h"), not "agora": it isn't on yet.
  const start = next && new Date(next.inicio)
  const when = next && start && now && agenda ? whenOf({ start, end: new Date(next.fim) }, started ? new Date(+start - 60_000) : now, agenda.timeZone) : null

  return (
    <>
      <p id="live-rotulo" className="eyebrow text-klein-claro">
        {T.next.title}
      </p>
      {loading ? (
        <div aria-hidden className="mt-3 space-y-2.5">
          <Skeleton className="h-8 w-72 max-w-full bg-paper/15" />
          <Skeleton className="h-5 w-56 max-w-full bg-paper/10" />
        </div>
      ) : next && agenda && when ? (
        <>
          <h2 className="mt-2 flex flex-col gap-x-3 gap-y-0.5 text-2xl font-medium tracking-[-0.02em] sm:flex-row sm:flex-wrap sm:items-center">
            <span className="inline-flex items-center gap-2">
              {game && <GameIcon game={game.id} size={22} />}
              {gameName(agenda, next.jogo)}
            </span>
            <span aria-hidden className="hidden text-klein-claro sm:inline">
              ·
            </span>
            <span className="first-letter:uppercase">{when.when}</span>
          </h2>
          <p className="mt-1.5 line-clamp-2 max-w-[38rem] text-[15px] leading-[1.6] text-paper/80">{next.titulo}</p>
        </>
      ) : null}

      {failed ? (
        <div className="cut-sm mt-5 bg-paper px-4 py-3">
          <ErrorLine onRetry={() => location.reload()} retryLabel={T.next.retry}>
            {T.next.error}
          </ErrorLine>
        </div>
      ) : !loading && !next ? (
        <EmptyState className="mt-4 border-klein-claro/60 text-paper/85">{T.next.none}</EmptyState>
      ) : started ? (
        <p className="cut cut-edge relative mt-6 border border-klein-claro/35 bg-navy/55 px-4 py-5 text-center text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] sm:py-8 sm:text-[56px]">
          {T.next.soon}
        </p>
      ) : (
        <Countdown to={loading ? undefined : next?.inicio} tone="dark" size="lg" label={T.next.countdown} className="mt-6" />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <ButtonLink href={TWITCH} icon={<TwitchIcon className="h-4 w-4" />} className={ON_KLEIN}>
          {T.next.follow}
        </ButtonLink>
        {when?.local && <p className="text-[13px] text-paper/75">{when.local}</p>}
      </div>
    </>
  )
}

/** The places that are never live, apart from the live's block: the videos, the Discord, the agenda. */
function Elsewhere() {
  const links = [
    { href: YOUTUBE, icon: <YouTubeIcon className="h-4 w-4 shrink-0" />, label: "YouTube", hint: T.where.youtube },
    { href: DISCORD_INVITE, icon: <DiscordIcon className="h-4 w-4 shrink-0" />, label: "Discord", hint: T.where.discord },
    { href: channelPath("agenda"), icon: <CalendarDays aria-hidden className="h-4 w-4 shrink-0" />, label: T.agenda.title, hint: T.where.agenda },
  ]
  return (
    <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
      {links.map((link) => (
        <li key={link.label}>
          <ButtonLink href={link.href} variant="secondary" icon={link.icon} className="w-full px-2 sm:px-4">
            {link.label}
            <span className="hidden whitespace-nowrap font-normal text-muted lg:inline">· {link.hint}</span>
          </ButtonLink>
        </li>
      ))}
    </ul>
  )
}
