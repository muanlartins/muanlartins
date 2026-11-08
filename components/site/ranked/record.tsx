"use client"

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Flame,
  ListOrdered,
  Map as MapIcon,
  Play,
  Snowflake,
  Swords,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { decimal, longDate, shortDate, signed, time, weekday } from "@/components/site/ranked/format"
import { RatingChart } from "@/components/site/ranked/rating-chart"
import { livePath } from "@/lib/channel"
import { loadFans, type Choice, type Torcedor } from "@/lib/profile"
import { dayOf } from "@/lib/ranked"
import type { Breakdown, Day, Player, RecordView, Result, Stat, ViewMatch } from "@/lib/ranked-view"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  W: { pt: "V", en: "W" },
  L: { pt: "D", en: "L" },
  E: { pt: "E", en: "D" },
  winRate: { pt: "de vitórias", en: "won" },
  matches: { pt: "partidas", en: "matches" },
  match1: { pt: "partida", en: "match" },
  streakWin: { pt: "vitórias seguidas", en: "wins in a row" },
  streakWin1: { pt: "vitória", en: "win" },
  streakLoss: { pt: "derrotas seguidas", en: "losses in a row" },
  streakLoss1: { pt: "derrota", en: "loss" },
  best: { pt: "melhor sequência", en: "best run" },
  perMatch: { pt: "por partida", en: "per match" },
  inWin: { pt: "na vitória", en: "per win" },
  inLoss: { pt: "na derrota", en: "per loss" },
  chartWin: { pt: "vitória", en: "win" },
  chartLoss: { pt: "derrota", en: "loss" },
  chartEmpty: {
    pt: "O gráfico aparece quando houver pontos anotados em pelo menos uma partida.",
    en: "The chart shows up once a match has its points written down.",
  },
  days: { pt: "Dia a dia", en: "Day by day" },
  players: { pt: "Eu e os viewers que jogaram comigo", en: "Me and the viewers who played with me" },
  mine: { pt: "Minhas estatísticas", en: "My stats" },
  me: { pt: "eu", en: "me" },
  list: { pt: "Partidas", en: "Matches" },
  with: { pt: "com", en: "with" },
  onLive: { pt: "na live", en: "on stream" },
  showAll: { pt: "Mostrar todas", en: "Show all" },
})

/** How many matches the list shows before "Show all". */
const SHOWN = 20
const ME = "muanlartins"

/**
 * A game's ranked record, the same for every game: the rank now with the record and the runs, the points (or RR)
 * over time, what the game breaks down (Valorant: agents, maps), day by day, me and the viewers who played with me,
 * and every match, by day. lib/ranked-view.ts turns each game's sessions into what this draws.
 */
export function RankedRecord({ view }: { view: RecordView }) {
  return (
    <div className="space-y-16">
      <RankHero view={view} />

      <Section icon={TrendingUp} title={view.unit === "RR" ? "RR" : localize({ pt: "Pontos", en: "Points" })}>
        {view.series.length > 1 ? (
          <>
            <div className="mb-3 flex gap-5 text-[12px] text-muted">
              <Key result="win">{T.chartWin}</Key>
              <Key result="loss">{T.chartLoss}</Key>
            </div>
            <RatingChart series={view.series} bands={view.bands} unit={view.unit} />
          </>
        ) : (
          <p className="text-[14px] text-muted">{T.chartEmpty}</p>
        )}
      </Section>

      {view.breakdowns.some((b) => b.rows.length > 0) && (
        <div className="grid gap-10 sm:grid-cols-2">
          {view.breakdowns.map((breakdown) => (
            <BreakdownList key={breakdown.title} breakdown={breakdown} />
          ))}
        </div>
      )}

      <Section icon={CalendarDays} title={T.days}>
        <Days days={[...view.days].reverse()} unit={view.unit} />
      </Section>

      {view.players.length > 0 && (
        <Section icon={UsersRound} title={view.players.length > 1 ? T.players : T.mine} hint={view.playersHint}>
          <Players players={view.players} unit={view.unit} />
        </Section>
      )}

      <Section icon={ListOrdered} title={T.list} hint={view.listHint}>
        <Matches matches={[...view.matches].reverse()} unit={view.unit} />
      </Section>
    </div>
  )
}

function Section({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2.5 text-2xl font-medium tracking-[-0.02em] text-klein">
        <Icon aria-hidden className="h-5 w-5" />
        {title}
      </h2>
      {hint && <p className="mt-1 max-w-[42rem] text-[13px] leading-[1.5] text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

const RESULT_BG: Record<Result, string> = { win: "bg-win text-paper", loss: "bg-loss text-paper", draw: "bg-zinc-300 text-ink" }
const RESULT_TEXT: Record<Result, string> = { win: "text-win", loss: "text-loss", draw: "text-muted" }
const letter = (result: Result) => (result === "win" ? T.W : result === "loss" ? T.L : T.E)

function Key({ result, children }: { result: Result; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", result === "win" ? "bg-win" : "bg-loss")} />
      {children}
    </span>
  )
}

/** A change, coloured by its sign: +20 RR in green, −17 in red. */
function Change({ value, unit, className }: { value: number; unit?: string; className?: string }) {
  return (
    <span className={cn("tabular-nums", value > 0 ? "text-win" : value < 0 ? "text-loss" : "text-muted", className)}>
      {signed(value)}
      {unit && ` ${unit}`}
    </span>
  )
}

/** Numbers with their letters: 21 K 15 D 9 A. */
function Stats({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap gap-x-2.5 tabular-nums", className)}>
      {stats.map((stat) => (
        <span key={stat.letter} className="whitespace-nowrap">
          <span className="font-medium text-ink">{stat.decimal ? decimal(stat.value) : stat.value}</span>
          <span className="ml-0.5 text-[0.85em] text-muted">{stat.letter}</span>
        </span>
      ))}
    </span>
  )
}

// --- The rank now --------------------------------------------------------------------------------------------------

function RankHero({ view }: { view: RecordView }) {
  const { standing, wins, losses, streak } = view
  const played = wins + losses
  const rate = played ? Math.round((wins / played) * 100) : 0
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return (
    <section className="space-y-4">
      <div className="grid gap-6 rounded-md border border-line bg-paper/70 p-5 backdrop-blur-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-6">
        {standing ? (
          <div className="flex items-center gap-5" style={{ "--rank": standing.color } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={standing.icon}
              alt=""
              className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_6px_16px_color-mix(in_oklab,var(--rank)_50%,transparent)]"
            />
            <div className="min-w-0">
              <p className="rank-metal text-3xl font-medium tracking-[-0.02em]" style={{ backgroundPosition: "0% 0%" }}>
                {standing.name}
              </p>
              {standing.detail && <p className="text-[14px] text-muted">{standing.detail}</p>}
              {standing.value && <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{standing.value}</p>}
              {standing.since && <p className="text-[13px] tabular-nums text-muted">{standing.since}</p>}
            </div>
          </div>
        ) : (
          <div />
        )}

        <div className="space-y-3 sm:border-l sm:border-line sm:pl-6">
          <p className="flex items-baseline gap-3 tabular-nums">
            <span className="text-3xl font-semibold tracking-[-0.02em] text-win">
              {wins}
              <span className="text-xl">{T.W}</span>
            </span>
            <span className="text-3xl font-semibold tracking-[-0.02em] text-loss">
              {losses}
              <span className="text-xl">{T.L}</span>
            </span>
            <span className="text-[14px] text-muted">
              {rate}% {T.winRate}
            </span>
          </p>
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-200" aria-hidden>
            <span className="bg-win" style={{ width: `${rate}%` }} />
            <span className="bg-loss" style={{ width: `${played ? 100 - rate : 0}%` }} />
          </div>
          <div className="flex flex-wrap gap-2 text-[13px]">
            {streak !== 0 && (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium", streak > 0 ? "bg-win/10 text-win" : "bg-loss/10 text-loss")}>
                {streak > 0 ? <Flame aria-hidden className="h-3.5 w-3.5" /> : <Snowflake aria-hidden className="h-3.5 w-3.5" />}
                {streak > 0
                  ? Math.abs(streak) === 1
                    ? `1 ${T.streakWin1}`
                    : `${streak} ${T.streakWin}`
                  : Math.abs(streak) === 1
                    ? `1 ${T.streakLoss1}`
                    : `${-streak} ${T.streakLoss}`}
              </span>
            )}
            {view.bestStreak > 1 && (
              <span className="inline-flex items-center rounded-full bg-zinc-200/70 px-2.5 py-1 text-muted">
                {T.best}: {view.bestStreak}
              </span>
            )}
          </div>
          {(view.winChange !== undefined || view.lossChange !== undefined) && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
              {view.winChange !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <ArrowUpRight aria-hidden className="h-4 w-4 text-win" />
                  <Change value={view.winChange} unit={view.unit} className="font-medium" />
                  <span className="text-muted">{T.inWin}</span>
                </span>
              )}
              {view.lossChange !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <ArrowDownRight aria-hidden className="h-4 w-4 text-loss" />
                  <Change value={view.lossChange} unit={view.unit} className="font-medium" />
                  <span className="text-muted">{T.inLoss}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {view.tiles.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
          <div className="rounded-md border border-line px-4 py-3">
            <dt className="text-[13px] text-muted">{localize({ pt: "Partidas", en: "Matches" })}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{count(played, T.match1, T.matches)}</dd>
          </div>
          {view.tiles.map((tile) => (
            <div key={tile.label} className="rounded-md border border-line px-4 py-3">
              <dt className="text-[13px] text-muted">
                {tile.label} <span className="text-[12px]">({T.perMatch})</span>
              </dt>
              <dd className="mt-0.5 text-xl">
                <Stats stats={tile.stats} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

// --- Agents and maps ---------------------------------------------------------------------------------------------

function BreakdownList({ breakdown }: { breakdown: Breakdown }) {
  const Icon = breakdown.kind === "agent" ? Swords : MapIcon
  return (
    <section>
      <h2 className="flex items-center gap-2.5 text-xl font-medium tracking-[-0.02em] text-klein">
        <Icon aria-hidden className="h-[18px] w-[18px]" />
        {breakdown.title}
      </h2>
      <ul className="mt-3 space-y-2">
        {breakdown.rows.slice(0, 6).map((row) => {
          const played = row.wins + row.losses
          return (
            <li key={row.name} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.image}
                alt=""
                className={breakdown.kind === "agent" ? "h-9 w-9 shrink-0 rounded-full bg-navy object-cover" : "h-9 w-20 shrink-0 rounded-sm object-cover"}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2 text-[14px]">
                  <span className="truncate font-medium text-ink">{row.name}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    <span className="text-win">
                      {row.wins}
                      {T.W}
                    </span>{" "}
                    <span className="text-loss">
                      {row.losses}
                      {T.L}
                    </span>
                  </span>
                </span>
                <span className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-zinc-200" aria-hidden>
                  <span className="bg-win" style={{ width: `${played ? (row.wins / played) * 100 : 0}%` }} />
                  <span className="bg-loss" style={{ width: `${played ? (row.losses / played) * 100 : 0}%` }} />
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// --- Day by day ----------------------------------------------------------------------------------------------------

function Days({ days, unit }: { days: Day[]; unit: string }) {
  return (
    <ul className="divide-y divide-line/70 border-y border-line">
      {days.map((day) => (
        <li key={day.date} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto_13rem]">
          <span className="leading-tight">
            <span className="block text-[15px] font-medium tabular-nums text-ink">{shortDate(day.date)}</span>
            <span className="block text-[12px] text-muted first-letter:uppercase">{weekday(day.date).split("-")[0]}</span>
          </span>
          <span className="flex flex-wrap gap-1" aria-label={`${day.wins} ${T.W} · ${day.losses} ${T.L}`}>
            {day.results.map((result, index) => (
              <span key={index} className={cn("h-3 w-3 rounded-[3px]", result === "win" ? "bg-win" : result === "loss" ? "bg-loss" : "bg-zinc-300")} />
            ))}
          </span>
          <span className="text-right text-[14px] tabular-nums">
            <span className="text-ink">
              {day.wins}
              {T.W} · {day.losses}
              {T.L}
            </span>
            {day.change !== 0 && (
              <>
                <br className="sm:hidden" />
                <span className="hidden sm:inline"> · </span>
                <Change value={day.change} unit={unit} />
              </>
            )}
          </span>
          {day.end && (
            <span className="hidden items-center gap-2 text-[13px] text-muted sm:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={day.end.icon} alt="" className="h-6 w-6 object-contain" />
              <span className="truncate">{day.end.name}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

// --- Me and the viewers ------------------------------------------------------------------------------------------

function Players({ players, unit }: { players: Player[]; unit: string }) {
  // Their fans, as they built them on their profile (or the one their login gives them).
  const [torcedor, setTorcedor] = useState<Torcedor | null>(null)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)
  const logins = players.map((player) => player.login).join(",")
  useEffect(() => {
    loadFans(logins.split(","))
      .then(setFans)
      .catch(() => setFans({}))
  }, [logins])

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <li
            key={player.login}
            className={cn(
              "flex items-center gap-4 rounded-md px-3 py-3",
              player.me ? "border-2 border-klein bg-klein/[0.06] sm:col-span-2" : "border border-line",
            )}
          >
            <FanSpot T={torcedor} fans={fans} login={player.login} name={player.login} size={player.me ? "md" : "sm"} />
            <div className="min-w-0 space-y-1 text-[14px] tabular-nums">
              <p className="flex items-center gap-2">
                <a
                  href={`https://www.twitch.tv/${player.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("truncate font-medium text-ink transition-colors hover:text-klein", player.me ? "text-[18px]" : "text-[16px]")}
                >
                  {player.login}
                </a>
                {player.login === ME && <span className="rounded-sm bg-klein px-1.5 py-px text-[11px] font-semibold text-paper">{T.me}</span>}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-ink">
                <span>
                  {player.matches} {player.matches === 1 ? T.match1 : T.matches}
                </span>
                <span className="text-win">
                  {player.wins}
                  {T.W}
                </span>
                <span className="text-loss">
                  {player.losses}
                  {T.L}
                </span>
                {player.change !== 0 && <Change value={player.change} unit={unit} />}
              </p>
              <Stats stats={player.stats} />
            </div>
          </li>
        ))}
      </ul>
      <Script src="/stream/torcedor.js" onReady={() => setTorcedor(window.Torcedor ?? null)} />
    </>
  )
}

// --- Every match -------------------------------------------------------------------------------------------------

function Matches({ matches, unit }: { matches: ViewMatch[]; unit: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? matches : matches.slice(0, SHOWN)
  const days: { date: string; matches: ViewMatch[] }[] = []
  for (const match of shown) {
    const date = dayOf(match.at)
    if (days.at(-1)?.date !== date) days.push({ date, matches: [] })
    days.at(-1)!.matches.push(match)
  }

  return (
    <div className="space-y-8">
      {days.map((day) => (
        <div key={day.date}>
          <h3 className="mb-2.5 flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium text-ink">
            {longDate(day.date)}
            <span className="text-[13px] font-normal text-muted first-letter:uppercase">{weekday(day.date)}</span>
          </h3>
          <ul className="space-y-2">
            {day.matches.map((match) => (
              <MatchRow key={match.id} match={match} unit={unit} />
            ))}
          </ul>
        </div>
      ))}
      {!all && matches.length > SHOWN && (
        <button onClick={() => setAll(true)} className="rounded-md border border-line px-4 py-2 text-[14px] text-ink transition-colors hover:border-klein">
          {T.showAll} ({matches.length})
        </button>
      )}
    </div>
  )
}

/** A match in a row: the result, the map and agent when the game has them, the score, my numbers, the change. */
function MatchRow({ match, unit }: { match: ViewMatch; unit: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-md border border-line bg-paper/70 p-2 pr-4 backdrop-blur-sm sm:flex-nowrap">
      <span className={cn("grid h-11 w-9 shrink-0 place-items-center rounded-[5px] text-[15px] font-semibold", RESULT_BG[match.result])}>
        {letter(match.result)}
      </span>
      {match.map && (
        <span className="relative h-11 w-24 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={match.map.image} alt="" className="h-full w-full rounded-[5px] object-cover" />
          {match.agent && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={match.agent.image}
              alt=""
              className="absolute -bottom-1.5 -right-2 h-8 w-8 rounded-full border-2 border-paper bg-navy object-cover"
            />
          )}
        </span>
      )}
      <span className="min-w-0 flex-1 basis-40">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-[18px] font-semibold tabular-nums tracking-[-0.01em]", RESULT_TEXT[match.result])}>
            {match.score ? `${match.score[0]}–${match.score[1]}` : "–"}
          </span>
          {match.map && (
            <span className="truncate text-[14px] text-ink">
              {match.map.name}
              {match.agent && <span className="text-muted"> · {match.agent.name}</span>}
            </span>
          )}
          {match.extra.length > 0 && !match.map && <span className="text-[13px] text-muted">{match.extra.join(" · ")}</span>}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          {match.stats.length > 0 && <Stats stats={match.stats} />}
          {match.map && match.extra.length > 0 && <span className="tabular-nums">{match.extra.join(" · ")}</span>}
          {match.viewers.length > 0 && (
            <span className="rounded-sm bg-klein/[0.08] px-1.5 py-px text-[12px] text-klein">
              {T.with} {match.viewers.join(", ")}
            </span>
          )}
        </span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-3 text-right">
        <span className="leading-tight">
          {match.change != null && <Change value={match.change} unit={unit} className="block text-[16px] font-semibold" />}
          <span className="block text-[12px] tabular-nums text-muted">
            {match.valueText && <span className="hidden sm:inline">{match.valueText} · </span>}
            {time(match.at)}
          </span>
        </span>
        {match.moment && (
          <Link
            href={`${livePath(match.moment.date)}#t=${match.moment.at}`}
            className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] text-ink transition-colors hover:border-klein hover:text-klein"
          >
            <Play aria-hidden className="h-3 w-3 fill-current" />
            {T.onLive}
          </Link>
        )}
      </span>
    </li>
  )
}
