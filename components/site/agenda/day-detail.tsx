"use client"

import { Gamepad2 } from "lucide-react"
import { GameIcon } from "@/components/site/game/game-icon"
import { GoalDayNotes, type GoalMarks } from "@/components/site/agenda/goals"
import { gameName } from "@/components/site/lives/agenda"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { clock, longDay, type Agenda, type Day } from "@/lib/agenda"
import { localize } from "@/lib/site"

const T = localize(channel.agenda)
const L = localize(channel.lives.agenda)

/** A game's sign: the site's own for its games, a controller for any other. */
export function AgendaGameIcon({ game, size = 14 }: { game: string; size?: number }) {
  return games.some((g) => g.id === game) ? <GameIcon game={game} size={size} /> : <Gamepad2 aria-hidden style={{ width: size, height: size }} className="text-klein" />
}

/** One day in full: its note and a Pix goal starting or ending on it, then each live with its time, game, title and run of the show. */
export function DayDetail({ agenda, day, today, goals }: { agenda: Agenda; day: Day; today: string; goals?: GoalMarks }) {
  return (
    <section aria-live="polite">
      <h3 className="text-[19px] font-medium text-ink first-letter:uppercase">
        {day.data === today ? `${L.today}, ` : ""}
        {longDay(day.data)}
      </h3>
      {day.nota && <p className="mt-2 rounded-md bg-klein/[0.07] px-3 py-2 text-[15px] text-klein">{day.nota}</p>}
      <GoalDayNotes marks={goals} />
      {!day.lives.length && <p className="mt-3 text-[15px] text-muted">{T.noLive}</p>}
      <div className="mt-3 space-y-3">
        {day.lives.map((live) => (
          <article key={live.inicio} className="rounded-md border border-line bg-paper/70 p-4 sm:p-5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">
              <span className="font-medium tabular-nums text-klein">
                {clock(live.start)}–{clock(live.end)}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <AgendaGameIcon game={live.jogo} />
                {gameName(agenda, live.jogo)}
              </span>
            </p>
            <p className="mt-1.5 text-[20px] font-medium leading-snug tracking-[-0.01em] text-ink">{live.titulo}</p>
            {live.roteiro.length > 0 && (
              <ol className="mt-3 space-y-1.5 border-l-2 border-klein/25 pl-3">
                {live.roteiro.map((item, index) => (
                  <li key={index} className="flex gap-3 text-[15px] leading-snug">
                    <span className="w-11 shrink-0 tabular-nums text-klein">{item.at ? clock(item.at) : ""}</span>
                    <span className="text-ink">{item.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
