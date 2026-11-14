"use client"

import { Eye, Pencil } from "lucide-react"
import { useEffect, useState } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { AgendaEditor } from "@/components/site/agenda/agenda-editor"
import { Calendar, showDay } from "@/components/site/agenda/calendar"
import { AgendaGameIcon, DayDetail } from "@/components/site/agenda/day-detail"
import { Weekly } from "@/components/site/agenda/weekly"
import { gameName, Subscribe, useNow } from "@/components/site/lives/agenda"
import { channel } from "@/content/channel"
import { dataEm, dia, dias } from "@/infra/comum/agenda.mjs"
import { clock, nextOccurrence, whenOf, type Agenda, type Day } from "@/lib/agenda"
import { SCHEDULE_SCOPE, whoIs, type TwitchUser } from "@/lib/agenda-twitch"
import { channelPath } from "@/lib/channel"
import { keptToken, signIn } from "@/lib/profile"
import { localize } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"

const T = localize(channel.agenda)
const L = localize(channel.lives.agenda)
const E = localize({
  edit: { pt: "Planejar a agenda (conta do canal)", en: "Plan the schedule (the channel's account)" },
  notChannel: { pt: "Só a conta do canal planeja a agenda.", en: "Only the channel's account plans the schedule." },
  preview: { pt: "Ver como visitante", en: "See it as a visitor" },
  back: { pt: "Voltar a planejar", en: "Back to planning" },
  previewing: { pt: "Assim os visitantes veem a agenda salva.", en: "This is how visitors see the saved schedule." },
})

/** A day of the agenda with its lives as occurrences. */
export const dayOf = (agenda: Agenda, date: string): Day => dias(agenda, new Date(`${date}T15:00:00Z`), 1)[0] ?? { ...dia(agenda, date), lives: [] }

/**
 * /canal/agenda in the browser: for visitors, the next live, the month as a calendar and the day picked in full; for
 * the channel's account, signed in with Twitch, the editor (with a switch to see the page as visitors do).
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
        <p className="mb-8 flex flex-wrap items-center gap-3 rounded-md bg-klein/[0.07] px-4 py-3 text-[14px] text-klein">
          <Eye aria-hidden className="h-4 w-4" />
          {E.previewing}
          <button onClick={() => setPreviewing(false)} className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2">
            <Pencil aria-hidden className="h-3.5 w-3.5" />
            {E.back}
          </button>
        </p>
      )}
      <PublicAgenda />
      {me !== undefined && !isChannel && (
        <div className="mt-16 border-t border-line pt-4 text-[13px] text-muted">
          {me ? (
            E.notChannel
          ) : (
            <button onClick={() => signIn(null, channelPath("agenda"), SCHEDULE_SCOPE)} className="underline underline-offset-2 hover:text-klein">
              {E.edit}
            </button>
          )}
        </div>
      )}
    </>
  )
}

/** What visitors see: the next live, the calendar and the picked day, the subscription and the usual week. */
function PublicAgenda() {
  const { agenda, fresh } = useAgenda()
  const now = useNow()
  const [month, setMonth] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  if (!agenda || !now) {
    return fresh && !agenda ? <p className="text-[15px] text-muted">{L.unavailable}</p> : <div className="h-96 animate-pulse rounded-md bg-zinc-100" />
  }
  const today = dataEm(now, agenda.timeZone)
  const picked = selected ?? today

  return (
    <>
      <NextUp agenda={agenda} now={now} onPick={(date) => (setSelected(date), setMonth(date.slice(0, 7)))} />
      <div className="mt-12">
        <Calendar agenda={agenda} today={today} month={month ?? today.slice(0, 7)} onMonth={setMonth} selected={picked} onSelect={(date) => (setSelected(date), showDay())} />
        <p className="mt-2 text-[13px] text-muted">{L.zone}</p>
      </div>
      <div id="dia" className="mt-8 scroll-mt-20">
        <DayDetail agenda={agenda} day={dayOf(agenda, picked)} today={today} />
      </div>
      <div className="mt-8">
        <Subscribe />
      </div>
      <Weekly />
    </>
  )
}

/** The next live, big: when (from the viewer's clock, and in their zone when it isn't Brasília's), game, title, run. */
export function NextUp({ agenda, now, onPick }: { agenda: Agenda; now: Date; onPick?: (date: string) => void }) {
  const live = nextOccurrence(agenda, now)
  if (!live) return <p className="rounded-md border border-line bg-paper/70 p-5 text-[15px] text-muted">{L.empty}</p>
  const { when, local } = whenOf({ start: new Date(live.inicio), end: new Date(live.fim) }, now, agenda.timeZone)
  return (
    <section className="rounded-md border border-line bg-paper/70 p-5 backdrop-blur-sm sm:p-6">
      <p className="text-[14px] font-medium text-muted">{T.upNext}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-medium tracking-[-0.02em] text-ink sm:text-3xl">
        <span className="first-letter:uppercase">{when}</span>
        <span className="inline-flex items-center gap-2 text-klein">
          <AgendaGameIcon game={live.jogo} size={22} />
          {gameName(agenda, live.jogo)}
        </span>
      </p>
      {local && <p className="mt-1 text-[13px] text-muted">{local}</p>}
      <p className="mt-3 text-[17px] font-medium text-ink">{live.titulo}</p>
      {live.roteiro.length > 0 && (
        <ol className="mt-2 space-y-1 text-[14px]">
          {live.roteiro.slice(0, 4).map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="w-11 shrink-0 tabular-nums text-klein">{item.at ? clock(item.at) : ""}</span>
              <span className="text-ink">{item.text}</span>
            </li>
          ))}
        </ol>
      )}
      {onPick && (
        <button onClick={() => onPick(live.data)} className="mt-3 text-[14px] font-medium text-klein hover:underline">
          {T.seeDay} →
        </button>
      )}
    </section>
  )
}
