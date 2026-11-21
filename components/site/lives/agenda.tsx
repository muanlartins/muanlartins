"use client"

import { ArrowRight, CalendarPlus } from "lucide-react"
import { useSyncExternalStore } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { agendaHours, AgendaWeek, AgendaWeekSkeleton, ZoneLine } from "@/components/site/agenda/week"
import { ButtonLink, ErrorLine, Section, Skeleton } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { AGENDA_ICS, nextOccurrence, whenOf, type Agenda as AgendaData } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { localize } from "@/lib/site"
import { useLive } from "@/lib/twitch"

const T = localize(channel.lives.agenda)

/** A game's short name: the site's for its games ("RL"), the agenda's name for any other. For docks and tight spots only. */
export function gameLabel(agenda: AgendaData, id: string) {
  return games.find((game) => game.id === id)?.short ?? agenda.games[id]?.name ?? id
}

/** A game's full name. */
export function gameName(agenda: AgendaData, id: string) {
  const game = games.find((game) => game.id === id)
  return game ? localize(game.title) : (agenda.games[id]?.name ?? id)
}

function everyMinute(listener: () => void) {
  const timer = setInterval(listener, 10_000)
  return () => clearInterval(timer)
}

/** The viewer's clock to the minute; undefined while prerendering. */
export function useNow() {
  const minute = useSyncExternalStore(everyMinute, () => Math.floor(Date.now() / 60_000), () => undefined)
  return minute === undefined ? undefined : new Date(minute * 60_000)
}

// Subscriptions, so the calendar follows every change: Google takes the address, the others open webcal://.
const WEBCAL = AGENDA_ICS.replace(/^https?:/, "webcal:")
const GOOGLE = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(WEBCAL)}`

/** The agenda in the viewer's own calendar app: Google, or webcal:// for Apple's and the rest. */
export function Subscribe({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
        <CalendarPlus aria-hidden className="h-4 w-4 text-klein" />
        {T.subscribe}
      </p>
      <p className="mt-1 text-[13px] text-muted">{T.subscribeHint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href={GOOGLE} external variant="secondary" size="sm">
          {T.google}
        </ButtonLink>
        <ButtonLink href={WEBCAL} external variant="secondary" size="sm" target="_self">
          {T.otherApps}
        </ButtonLink>
      </div>
    </div>
  )
}

/**
 * The lives page's agenda: whether I'm live, the next live in a line, and the next seven days as the agenda page draws
 * them (the same component, so the two never drift), with the way to the whole agenda.
 */
export function LivesAgenda() {
  const { agenda, fresh, failed, retry } = useAgenda()
  const now = useNow()
  const live = useLive()
  const ready = agenda && now

  return (
    <Section
      title={T.title}
      action={
        <ButtonLink href={channelPath("agenda")} variant="quiet" size="sm">
          {T.full}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </ButtonLink>
      }
    >
      {!live && <p className="mb-5 min-h-6 text-[15px] text-ink">{ready ? <NextLine agenda={agenda} now={now} live={live} /> : <Skeleton className="h-5 w-72 max-w-full" />}</p>}
      {ready ? (
        <>
          <AgendaWeek agenda={agenda} now={now} hours={agendaHours(agenda, now)} compact />
          <ZoneLine agenda={agenda} now={now} className="mt-2" />
        </>
      ) : fresh && !agenda ? (
        <ErrorLine onRetry={retry}>{T.unavailable}</ErrorLine>
      ) : (
        <AgendaWeekSkeleton />
      )}
      {failed && agenda && (
        <ErrorLine onRetry={retry} className="mt-3 text-[13px]">
          {T.stale}
        </ErrorLine>
      )}
    </Section>
  )
}

/** "Não estou ao vivo agora. A próxima é segunda-feira, 21h, de Valorant." (only the second sentence while it's unknown whether I'm live). */
function NextLine({ agenda, now, live }: { agenda: AgendaData; now: Date; live: boolean | undefined }) {
  const next = nextOccurrence(agenda, now)
  const offline = live === false ? `${T.offline} ` : ""
  if (!next) return <>{offline.trim()}</>
  const game = gameName(agenda, next.jogo)
  // Its time came and the stream isn't up yet: it's about to start.
  if (Date.parse(next.inicio) <= +now) return <>{T.startingNow.replace("{game}", game)}</>
  const { when, local } = whenOf({ start: new Date(next.inicio), end: new Date(next.fim) }, now, agenda.timeZone)
  return (
    <>
      {offline}
      {T.nextIs.replace("{when}", when).replace("{game}", game)}
      {local && <span className="text-muted"> ({local})</span>}
    </>
  )
}
