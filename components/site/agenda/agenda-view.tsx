"use client"

import { ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react"
import { useEffect, useState } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { AgendaEditor } from "@/components/site/agenda/agenda-editor"
import { GoalsNow, goalMarks, useGoals } from "@/components/site/agenda/goals"
import { agendaHours, AgendaGameIcon, AgendaWeek, AgendaWeekSkeleton, WEEKS_AHEAD, ZoneLine } from "@/components/site/agenda/week"
import { gameName, Subscribe, useNow } from "@/components/site/lives/agenda"
import { Pulse } from "@/components/site/lives/live-badge"
import { Button, EmptyState, ErrorLine, Section, Skeleton } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { dataEm, somaDias } from "@/infra/comum/agenda.mjs"
import { clock, dayMonth, nextOccurrence, whenOf, type Agenda } from "@/lib/agenda"
import { SCHEDULE_SCOPE, whoIs, type TwitchUser } from "@/lib/agenda-twitch"
import { channelPath } from "@/lib/channel"
import { keptToken, signIn } from "@/lib/profile"
import { localize } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const T = localize(channel.agenda)
const L = localize(channel.lives.agenda)
const E = localize({
  edit: { pt: "Planejar a agenda (conta do canal)", en: "Plan the schedule (the channel's account)" },
  notChannel: { pt: "Só a conta do canal planeja a agenda.", en: "Only the channel's account plans the schedule." },
  back: { pt: "Voltar a planejar", en: "Back to planning" },
  previewing: { pt: "Assim os visitantes veem a agenda salva.", en: "This is how visitors see the saved schedule." },
})

/**
 * /canal/agenda in the browser: for visitors, the next live and the days as a TV guide; for the channel's account,
 * signed in with Twitch, the editor (with a switch to see the page as visitors do).
 */
export function AgendaView() {
  const [token] = useState(keptToken)
  const [me, setMe] = useState<TwitchUser | null | undefined>(undefined)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    let live = true
    ;(token ? whoIs(token) : Promise.resolve(null)).then((found) => live && setMe(found))
    return () => {
      live = false
    }
  }, [token])

  const isChannel = me?.login === CHANNEL
  if (isChannel && !previewing) return <AgendaEditor token={token!} me={me!} onPreview={() => setPreviewing(true)} />

  return (
    <>
      {isChannel && (
        <p className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-klein bg-klein/[0.07] px-4 py-3 text-[15px] text-klein">
          <span className="inline-flex items-center gap-2">
            <Eye aria-hidden className="h-4 w-4" />
            {E.previewing}
          </span>
          <Button variant="quiet" size="sm" onClick={() => setPreviewing(false)} icon={<Pencil aria-hidden className="h-4 w-4" />}>
            {E.back}
          </Button>
        </p>
      )}
      <PublicAgenda />
      {me !== undefined && !isChannel && (
        <div className="mt-16 border-t border-line pt-4 text-[13px] text-muted">
          {me ? (
            E.notChannel
          ) : (
            <button onClick={() => signIn(null, channelPath("agenda"), SCHEDULE_SCOPE)} className="underline underline-offset-4 hover:text-klein">
              {E.edit}
            </button>
          )}
        </div>
      )}
    </>
  )
}

/** What visitors see: the next live, the days week by week (with the Pix goals' first and last days), the goal and the subscription. */
function PublicAgenda() {
  const { agenda, fresh, failed, retry } = useAgenda()
  const now = useNow()
  const goals = useGoals()
  const [week, setWeek] = useState(0)

  if (!agenda || !now) {
    if (fresh && !agenda) return <ErrorLine onRetry={retry}>{L.unavailable}</ErrorLine>
    return (
      <div className="space-y-16">
        <Skeleton className="cut h-56 sm:h-64" />
        <div>
          <Skeleton className="mb-6 h-7 w-48" />
          <AgendaWeekSkeleton />
        </div>
      </div>
    )
  }

  const today = dataEm(now, agenda.timeZone)
  // Weeks up to the last day planned, at most WEEKS_AHEAD.
  const planned = Object.keys(agenda.dates).sort().at(-1) ?? today
  const weeks = Math.min(WEEKS_AHEAD, Math.max(1, Math.ceil((Date.parse(planned) - Date.parse(today)) / 86_400_000 / 7 + 1 / 7)))
  const shown = Math.min(week, weeks - 1)
  const from = somaDias(today, shown * 7)
  const title = shown === 0 ? T.week : T.weekRange.replace("{from}", dayMonth(from)).replace("{to}", dayMonth(somaDias(from, 6)))

  return (
    <div className="space-y-16">
      <div>
        {failed && (
          <ErrorLine onRetry={retry} className="mb-3 text-[13px]">
            {L.stale}
          </ErrorLine>
        )}
        <NextUp agenda={agenda} now={now} />
      </div>
      <Section
        id="semana"
        title={<span className="tabular-nums">{title}</span>}
        action={
          weeks > 1 && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setWeek(shown - 1)} disabled={shown === 0} aria-label={T.previous} title={T.previous} className="px-2">
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setWeek(shown + 1)} disabled={shown >= weeks - 1} aria-label={T.next} title={T.next} className="px-2">
                <ChevronRight aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          )
        }
      >
        <AgendaWeek agenda={agenda} now={now} from={from} hours={agendaHours(agenda, now)} goals={goalMarks(goals)} />
        <ZoneLine agenda={agenda} now={now} className="mt-2" />
      </Section>
      <GoalsNow goals={goals} />
      <Subscribe />
    </div>
  )
}

/**
 * The next live, big, on Klein: when (from the viewer's clock, and in their zone when it isn't Brasília's), its times,
 * game, title and plan; "Ao vivo agora" while it's on.
 */
export function NextUp({ agenda, now }: { agenda: Agenda; now: Date }) {
  const live = nextOccurrence(agenda, now)
  if (!live) return <EmptyState>{L.empty}</EmptyState>
  const { when, local } = whenOf({ start: new Date(live.inicio), end: new Date(live.fim) }, now, agenda.timeZone)
  const onAir = Date.parse(live.inicio) <= +now
  const name = gameName(agenda, live.jogo)
  return (
    <section aria-label={onAir ? L.onAir : T.upNext} className="cut relative overflow-hidden bg-klein p-5 text-paper sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2 text-klein-claro">
            {onAir && <Pulse />}
            {onAir ? L.onAir : T.upNext}
          </p>
          <p className="mt-3 text-2xl leading-tight font-medium tracking-[-0.03em] first-letter:uppercase sm:text-4xl">{onAir ? clock(live.start) + "–" + clock(live.end) : when}</p>
          <p className="mt-2 text-[17px] text-paper/85">
            {onAir ? name : `${L.until.replace("{end}", clock(live.end))} · ${name}`}
          </p>
          {local && <p className="mt-1 text-[13px] text-klein-claro">{local}</p>}
        </div>
        <span className="cut-sm grid h-14 w-14 shrink-0 place-items-center bg-paper sm:h-24 sm:w-24">
          <span className="sm:hidden">
            <AgendaGameIcon game={live.jogo} size={32} />
          </span>
          <span className="hidden sm:block">
            <AgendaGameIcon game={live.jogo} size={56} />
          </span>
        </span>
      </div>
      <p className="mt-6 max-w-[38rem] text-xl leading-snug font-medium tracking-[-0.02em]">{live.titulo}</p>
      {live.roteiro.length > 0 && (
        <ol className={cn("mt-3 max-w-[38rem] space-y-1.5 border-l-2 border-paper/25 pl-3 text-[15px] leading-snug")}>
          {live.roteiro.map((item, index) => (
            <li key={index} className="flex gap-3">
              {item.at && <span className="shrink-0 tabular-nums text-klein-claro">{clock(item.at)}</span>}
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
