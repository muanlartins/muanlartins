"use client"

import Link from "next/link"
import { localize } from "@/lib/site"
import { useLive } from "@/lib/twitch"

const T = localize({ live: { pt: "Ao vivo", en: "Live" } })

/** In the header while the channel is live on Twitch: a pulsing pill to the lives page, where the stream plays. */
export function LiveBadge({ href }: { href: string }) {
  if (!useLive()) return null
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-sm bg-klein px-2 py-1 text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-paper transition-opacity hover:opacity-85"
    >
      <Pulse />
      {T.live}
    </Link>
  )
}

/** A dot that pings, like a recording light, unless motion is reduced. */
export function Pulse({ className = "bg-klein-claro" }: { className?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping ${className}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  )
}
