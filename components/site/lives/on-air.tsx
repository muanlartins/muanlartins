"use client"

import { ArrowUpRight } from "lucide-react"
import { Pulse } from "@/components/site/lives/live-badge"
import { ButtonLink } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { localize } from "@/lib/site"
import { CHANNEL, TWITCH, useLive } from "@/lib/twitch"

const T = localize({
  now: channel.lives.agenda.onAir,
  twitch: { pt: "Ver na Twitch", en: "Watch on Twitch" },
})

/**
 * The stream itself while the channel is live, so the site works as a portal to it. While I'm not (or it isn't known
 * yet) there's nothing here: the agenda under it says I'm not live and when the next one is. Twitch's player only
 * loads when there's something to play.
 */
export function OnAir({ className }: { className?: string }) {
  const live = useLive()
  if (!live) return null

  const params = new URLSearchParams({ channel: CHANNEL, parent: window.location.hostname, muted: "true" })
  return (
    <section className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 className="flex items-center gap-2.5 text-2xl font-medium tracking-[-0.02em] text-klein">
          <Pulse className="bg-klein" />
          {T.now}
        </h2>
        <ButtonLink href={TWITCH} external variant="quiet" size="sm">
          {T.twitch}
          <ArrowUpRight aria-hidden className="h-4 w-4" />
        </ButtonLink>
      </div>
      <div className="cut relative mt-6 aspect-video w-full overflow-hidden bg-klein">
        <iframe src={`https://player.twitch.tv/?${params}`} title={T.now} allowFullScreen className="absolute inset-0 h-full w-full" />
      </div>
    </section>
  )
}
