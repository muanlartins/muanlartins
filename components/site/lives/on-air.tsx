"use client"

import { ArrowUpRight } from "lucide-react"
import { Pulse } from "@/components/site/lives/live-badge"
import { localize } from "@/lib/site"
import { CHANNEL, TWITCH, useLive } from "@/lib/twitch"

const T = localize({
  now: { pt: "Ao vivo agora", en: "Live now" },
  // TODO(Luan): rewrite in your voice.
  offline: {
    pt: "Fora do ar agora. Quando eu entrar ao vivo, a live aparece aqui.",
    en: "Offline right now. When I go live, the stream shows up here.",
  },
  twitch: { pt: "Abrir na Twitch", en: "Open on Twitch" },
})

/**
 * The stream itself while the channel is live, so the site works as a
 * portal to it; a line pointing to Twitch otherwise. Twitch's player only
 * loads when there's something to play.
 */
export function OnAir() {
  const live = useLive()
  if (live === undefined) return null

  const link = (
    <a
      href={TWITCH}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[14px] font-medium text-klein hover:underline"
    >
      {T.twitch}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  )

  if (!live) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-dashed border-zinc-300 px-5 py-4 text-[14px] text-muted">
        {T.offline} {link}
      </p>
    )
  }

  const params = new URLSearchParams({ channel: CHANNEL, parent: window.location.hostname, muted: "true" })
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-medium tracking-[-0.02em] text-klein">
          <Pulse className="bg-klein" />
          {T.now}
        </h2>
        {link}
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-klein">
        <iframe
          src={`https://player.twitch.tv/?${params}`}
          title={T.now}
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </section>
  )
}
