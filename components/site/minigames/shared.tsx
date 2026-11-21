"use client"

import { FanView } from "@/components/site/profile/fan-view"
import { shortDate, time } from "@/components/site/ranked/format"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import type { Choice, Torcedor } from "@/lib/profile"
import { HTML_LANG, LOCALE } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"

/** What the minigames' pieces share: formats, names and fans. */
const LANG = HTML_LANG[LOCALE]
export const number = (n: number) => n.toLocaleString(LANG)
export const percent = (v: number, p: number) => (p ? `${Math.round((v / p) * 100)}%` : "–")
/** "20/11 21h10" (brand/voz.md, "Formats"). */
export const when = (at: string) => `${shortDate(at)} ${LOCALE === "pt" ? time(at).replace(":", "h") : time(at)}`
/** "{n} vitórias" with the template's slots filled. */
export const fill = (template: string, slots: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k) => String(slots[k] ?? ""))

/** A name that leads to their page (the channel's own has none). */
export function Name({ login, children, className }: { login: string; children: string; className?: string }) {
  return login === CHANNEL ? <span className={className}>{children}</span> : <ViewerName login={login} className={className}>{children}</ViewerName>
}

/** Their fan from the stand, filling the box it's put in; their initial while the drawing loads. */
export function FanFigure({ T, fans, login, name }: { T: Torcedor | null; fans: Record<string, Choice> | null; login: string; name: string }) {
  if (T && fans) return <FanView T={T} fan={T.normalizar(fans[login] ?? null, login)} className="h-full w-full" />
  return (
    <span className="flex h-full w-full items-end justify-center pb-1">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-klein/15 text-[13px] font-medium text-klein">{(name || "?").charAt(0).toUpperCase()}</span>
    </span>
  )
}
