import Link from "next/link"
import { LanguageBadge } from "@/components/site/language-badge"
import { OnAir } from "@/components/site/lives/on-air"
import { PageIntro } from "@/components/site/page-intro"
import { longDate, signed, weekday } from "@/components/site/ranked/format"
import { BallBackdrop } from "@/components/site/roadmap/ball-backdrop"
import { livePath, type Game } from "@/lib/game"
import type { Live } from "@/lib/lives"
import { dayRecord, type DayRecord, type Session } from "@/lib/ranked"
import { localize } from "@/lib/site"

const T = localize({
  past: { pt: "Lives anteriores", en: "Past streams" },
  W: { pt: "V", en: "W" },
  L: { pt: "D", en: "L" },
  points: { pt: "pts", en: "pts" },
  ranked: { pt: "ranqueadas", en: "ranked" },
})

/**
 * The game's lives: the stream itself when the channel is live, then every
 * past one, newest first, each with its day's ranked record.
 */
export function LivesPage({ game, lives, sessions }: { game: Game; lives: Live[]; sessions: Session[] }) {
  return (
    <>
      <BallBackdrop />
      <PageIntro title={localize(game.lives!.title)} description={localize(game.lives!.description)} />

      <div className="mt-12">
        <OnAir />
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{T.past}</h2>
        <ul className="mt-5 space-y-4">
          {lives.map((live) => (
            <li key={live.date}>
              <LiveCard href={livePath(game, live.date)} live={live} record={dayRecord(sessions, live.date)} />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function LiveCard({ href, live, record }: { href: string; live: Live; record: DayRecord }) {
  const played = record.wins + record.losses
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-md border border-line bg-paper/70 p-3 backdrop-blur-sm transition-colors hover:border-klein sm:flex-row sm:items-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${live.video}/mqdefault.jpg`}
        alt=""
        className="aspect-video w-full shrink-0 rounded-sm bg-klein object-cover sm:w-56"
      />
      <div className="space-y-1.5 px-2 pb-2 sm:px-0 sm:pb-0">
        <h3 className="flex items-center gap-2 text-xl font-medium tracking-[-0.02em] text-klein">
          {longDate(live.date)}
          <LanguageBadge language="pt" />
        </h3>
        <p className="text-[13px] text-muted first-letter:uppercase">{weekday(live.date)}</p>
        <p className="text-[14px] leading-[1.6] text-ink">{localize(live.summary)}</p>
        {played > 0 && (
          <p className="text-[13px] tabular-nums text-muted">
            {played} {T.ranked} · {record.wins}
            {T.W} · {record.losses}
            {T.L} · {signed(record.points)} {T.points}
          </p>
        )}
      </div>
    </Link>
  )
}
