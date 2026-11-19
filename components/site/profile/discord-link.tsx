"use client"

import { useEffect, useRef, useState } from "react"
import { profile } from "@/content/profile"
import { DISCORD_INVITE, connectDiscord, linkDiscord, takeDiscordToken, unlinkDiscord, type DiscordLink as Link } from "@/lib/discord"
import { localize } from "@/lib/site"

const text = localize(profile.discord)

/** Discord's mark, in its own blurple button. */
function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.5 0 12.6 12.6 0 0 0-.61-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.89 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08 0l.37.3a.08.08 0 0 1 0 .13c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.1c.36.7.78 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .04-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" />
    </svg>
  )
}

/**
 * Their Discord on /perfil: connecting it puts them in the community's server with their Σ rank as a role
 * (lib/discord.ts). `linked` is what their profile says (undefined while it loads); `token` their Twitch token.
 */
export function DiscordLink({ token, linked, onExpired }: { token: string | null; linked: Link | null | undefined; onExpired: () => void }) {
  // What linking or unlinking here made of it, over what the profile said.
  const [changed, setChanged] = useState<{ link: Link | null } | null>(null)
  const link = changed ? changed.link : linked
  const [state, setState] = useState<"idle" | "busy" | "joined" | "updated" | "error">("idle")
  const [error, setError] = useState("")
  // Discord's token, just back from Discord, waiting for the Twitch one.
  const pending = useRef<string | null | "error">(null)

  useEffect(() => {
    pending.current = takeDiscordToken()
    if (pending.current === "error") {
      setState("error")
      setError(text.refused)
      pending.current = null
    }
  }, [])
  useEffect(() => {
    const discordToken = pending.current
    if (!token || !discordToken || discordToken === "error") return
    pending.current = null
    setState("busy")
    linkDiscord(token, discordToken)
      .then((r) => {
        setChanged({ link: r.discord ?? null })
        setState(r.novo ? "joined" : "updated")
      })
      .catch((e: Error) => {
        setState("error")
        setError(e.message)
      })
  }, [token])

  async function unlink() {
    if (!token) return
    setState("busy")
    try {
      await unlinkDiscord(token)
      setChanged({ link: null })
      setState("idle")
    } catch {
      onExpired()
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-line bg-paper/60 p-4">
      <div className="flex items-center gap-2">
        <DiscordMark className="h-5 w-5 text-[#5865f2]" />
        <h2 className="font-medium text-klein">{text.title}</h2>
      </div>
      <p className="text-[14px] text-muted">{text.hint}</p>
      {!token ? (
        <p className="text-[14px] text-muted">{text.signInFirst}</p>
      ) : link ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
          <span className="text-ink">
            {text.linked} <b className="font-medium">{link.nome}</b>
          </span>
          <a href={DISCORD_INVITE} className="font-medium text-klein hover:underline">
            {text.open}
          </a>
          <button onClick={unlink} disabled={state === "busy"} className="text-muted underline underline-offset-2 hover:text-klein disabled:opacity-50">
            {text.unlink}
          </button>
        </div>
      ) : (
        <button
          onClick={connectDiscord}
          disabled={state === "busy" || link === undefined}
          className="inline-flex items-center gap-2 rounded-sm bg-[#5865f2] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <DiscordMark className="h-4 w-4" />
          {state === "busy" ? text.connecting : text.connect}
        </button>
      )}
      {state === "joined" && <p className="text-[14px] text-ink">{text.joined}</p>}
      {state === "updated" && <p className="text-[14px] text-ink">{text.updated}</p>}
      {state === "error" && (
        <p className="text-[14px] text-loss">
          {text.error} {error}
        </p>
      )}
    </section>
  )
}
