"use client"

import { CalendarDays, Play } from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { TwitchIcon, YouTubeIcon } from "@/components/site/channel/brand-icons"
import { GameIcon } from "@/components/site/game/game-icon"
import { Pulse } from "@/components/site/lives/live-badge"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { nextLive, whenOf } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { LINKS, localize } from "@/lib/site"
import { useLive } from "@/lib/twitch"

const T = localize(channel)
const TWITCH = LINKS.find((link) => link.label === "Twitch")!
const YOUTUBE = LINKS.find((link) => link.label === "YouTube")!

function everyMinute(listener: () => void) {
  const timer = setInterval(listener, 10_000)
  return () => clearInterval(timer)
}

/**
 * The home's first block, the answer most visitors come for: the live on air (watch it here), or when the next one
 * is and of which game, from the viewer's clock; then where to watch and the whole week's agenda.
 */
export function NextLive() {
  const live = useLive()
  const minute = useSyncExternalStore(everyMinute, () => Math.floor(Date.now() / 60_000), () => undefined)
  const now = minute === undefined ? undefined : new Date(minute * 60_000)
  const next = now && nextLive(now)
  const game = next && games.find((game) => game.id === next.game)
  const when = next && now && whenOf(next, now)

  return (
    <section className="mt-10 rounded-md border border-line bg-paper/70 p-5 backdrop-blur-sm sm:p-6">
      {live ? (
        <p className="flex items-center gap-2 text-[14px] font-medium text-klein">
          <Pulse className="bg-klein" />
          {T.next.onAir}
        </p>
      ) : (
        <p className="text-[14px] font-medium text-muted">{T.next.title}</p>
      )}
      {!live && (
        <p className="mt-1 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-medium tracking-[-0.02em] text-ink first-letter:uppercase sm:text-3xl">
          {when && <span className="first-letter:uppercase">{when.when}</span>}
          {game && (
            <span className="inline-flex items-center gap-2 text-klein">
              <GameIcon game={game.id} size={22} />
              {localize(game.title)}
            </span>
          )}
        </p>
      )}
      {!live && when?.local && <p className="mt-1 text-[13px] text-muted">{when.local}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        {live && (
          <Link
            href={channelPath("lives")}
            className="inline-flex items-center gap-2 rounded-md bg-klein px-4 py-2 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
          >
            <Play aria-hidden className="h-4 w-4 fill-paper" />
            {T.next.watch}
          </Link>
        )}
        <Away href={TWITCH.href} icon={<TwitchIcon className="h-4 w-4" />} label="Twitch" hint={T.where.twitch} />
        <Away href={YOUTUBE.href} icon={<YouTubeIcon className="h-4 w-4" />} label="YouTube" hint={T.where.youtube} />
        <Link
          href={`${channelPath("lives")}#agenda`}
          className="inline-flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-[14px] text-ink transition-colors hover:border-klein hover:text-klein"
        >
          <CalendarDays aria-hidden className="h-4 w-4" />
          {T.next.schedule}
        </Link>
      </div>
    </section>
  )
}

function Away({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-line px-3.5 py-2 text-[14px] text-ink transition-colors hover:border-klein hover:text-klein"
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className="hidden text-muted sm:inline">· {hint}</span>
    </a>
  )
}
