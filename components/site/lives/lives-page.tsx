import { GameIcon } from "@/components/site/game/game-icon"
import { LanguageBadge } from "@/components/site/language-badge"
import { LivesAgenda } from "@/components/site/lives/agenda"
import { OnAir } from "@/components/site/lives/on-air"
import { PageIntro } from "@/components/site/page-intro"
import { longDate, signed, weekday } from "@/components/site/ranked/format"
import { cardClass, EmptyState, Section } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { livePath } from "@/lib/channel"
import type { Live } from "@/lib/lives"
import { dayRecord, type DayRecord, type Session } from "@/lib/ranked"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import Link from "next/link"

const L = localize(channel.lives)
// "14 partidas ranqueadas · 10 vitórias e 4 derrotas · +53 pontos"
const T = localize({
  match: { pt: "partida ranqueada", en: "ranked match" },
  matches: { pt: "partidas ranqueadas", en: "ranked matches" },
  win: { pt: "vitória", en: "win" },
  wins: { pt: "vitórias", en: "wins" },
  loss: { pt: "derrota", en: "loss" },
  losses: { pt: "derrotas", en: "losses" },
  point: { pt: "ponto", en: "point" },
  points: { pt: "pontos", en: "points" },
  and: { pt: "e", en: "and" },
})

/** "1 vitória", "10 vitórias". */
const count = (n: number, one: string, many: string, shown: string = String(n)) => `${shown} ${Math.abs(n) === 1 ? one : many}`

/**
 * The channel's lives: the stream itself when the channel is live, the agenda's next seven days (the agenda page's own
 * component, linking to it), then every past one, newest first, each with its game and its day's ranked record.
 */
export function LivesPage({ lives, sessions }: { lives: Live[]; sessions: Session[] }) {
  return (
    <>
      <PageIntro title={L.title} description={L.description} />

      <div className="mt-12 space-y-16">
        <OnAir />
        <LivesAgenda />
        <Section title={L.past}>
          {lives.length ? (
            <ul className="space-y-4">
              {lives.map((live) => (
                <li key={live.date}>
                  <LiveCard href={livePath(live.date)} live={live} record={dayRecord(sessions, live.date)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>{L.noPast}</EmptyState>
          )}
        </Section>
      </div>
    </>
  )
}

function LiveCard({ href, live, record }: { href: string; live: Live; record: DayRecord }) {
  const played = record.wins + record.losses
  const game = games.find((game) => game.id === live.game)
  return (
    <Link href={href} className={cn(cardClass, "group flex flex-col gap-4 p-3 transition-colors hover:border-klein sm:flex-row sm:items-center sm:p-4")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${live.video}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-full shrink-0 bg-klein object-cover sm:w-56" />
      <div className="space-y-1.5 px-2 pb-2 sm:px-0 sm:pb-0">
        <h3 className="flex items-center gap-2 text-xl font-medium tracking-[-0.02em] text-klein group-hover:underline group-hover:underline-offset-4">
          {longDate(live.date)}
          <LanguageBadge language="pt" />
        </h3>
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className="first-letter:uppercase">{weekday(live.date)}</span>
          {game && (
            <>
              <span aria-hidden>·</span>
              <GameIcon game={game.id} size={14} className="block shrink-0" />
              {localize(game.title)}
            </>
          )}
        </p>
        <p className="text-[15px] leading-[1.6] text-ink">{localize(live.summary)}</p>
        {played > 0 && (
          <p className="text-[13px] tabular-nums text-muted">
            {count(played, T.match, T.matches)} · {count(record.wins, T.win, T.wins)} {T.and} {count(record.losses, T.loss, T.losses)} ·{" "}
            {count(Math.round(record.points), T.point, T.points, signed(record.points))}
          </p>
        )}
      </div>
    </Link>
  )
}
