"use client"

import { useEffect, useRef, useState } from "react"
import { DiscordIcon } from "@/components/site/brand-icons"
import { Button, ButtonLink, cardClass, ErrorLine, SignInButton } from "@/components/site/ui"
import { profile } from "@/content/profile"
import { DISCORD_INVITE, connectDiscord, linkDiscord, takeDiscordToken, unlinkDiscord, type DiscordLink as Link } from "@/lib/discord"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile.discord)

/**
 * Their Discord on /perfil's Contas: connecting it puts them in the server with their Σ rank as a role
 * (lib/discord.ts). `linked` is what their profile says (undefined while it loads); `token` their Twitch token.
 * Discord sends them back to /perfil, which opens this tab.
 */
export function DiscordLink({ token, linked, onExpired, onReturn }: { token: string | null; linked: Link | null | undefined; onExpired: () => void; onReturn?: () => void }) {
  // What linking or unlinking here made of it, over what the profile said.
  const [changed, setChanged] = useState<{ link: Link | null } | null>(null)
  const link = changed ? changed.link : linked
  const [state, setState] = useState<"idle" | "busy" | "joined" | "updated" | "error">("idle")
  const [error, setError] = useState("")
  // Discord's token, just back from Discord, waiting for the Twitch one.
  const pending = useRef<string | null | "error">(null)

  useEffect(() => {
    pending.current = takeDiscordToken()
    if (pending.current) onReturn?.()
    if (pending.current === "error") {
      setState("error")
      setError(text.refused)
      pending.current = null
    }
    // Once, on arrival: the address is Discord's way back only then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <section aria-labelledby="conta-discord" className={cn(cardClass, "space-y-3 p-5")}>
      <h2 id="conta-discord" className="flex items-center gap-2 text-[15px] font-medium text-ink">
        <DiscordIcon className="h-5 w-5 text-klein" />
        {text.title}
      </h2>
      <p className="max-w-[38rem] text-[15px] text-muted">{text.hint}</p>
      {!token ? (
        <p className="text-[13px] text-muted">{text.signInFirst}</p>
      ) : link ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
          <span className="text-ink">
            {text.linked} <b className="font-medium">{link.nome}</b>
          </span>
          <ButtonLink href={DISCORD_INVITE} variant="secondary" size="sm">
            {text.open}
          </ButtonLink>
          <Button variant="quiet" size="sm" onClick={unlink} disabled={state === "busy"}>
            {text.unlink}
          </Button>
        </div>
      ) : (
        <SignInButton platform="discord" onClick={connectDiscord} disabled={state === "busy" || link === undefined}>
          {state === "busy" ? text.connecting : text.connect}
        </SignInButton>
      )}
      {state === "joined" && <p className="text-[15px] text-ink">{text.joined}</p>}
      {state === "updated" && <p className="text-[15px] text-ink">{text.updated}</p>}
      {state === "error" && (
        <ErrorLine>
          {text.error} {error}
        </ErrorLine>
      )}
    </section>
  )
}
