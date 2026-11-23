"use client"

import { Torcedor3D } from "@/components/site/fan/torcedor-3d"
import { shortDate, time } from "@/components/site/ranked/format"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import type { SavedFan } from "@/lib/profile"
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

/** Their fan from the stand, filling the box it's put in; the stand's silhouette while their profiles load. */
export function FanFigure({ fans, login }: { fans: Record<string, SavedFan> | null; login: string }) {
  return <Torcedor3D aparencia={fans?.[login] ?? null} login={login} aguardando={!fans} className="h-full w-full" />
}
