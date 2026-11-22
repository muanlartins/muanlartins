"use client"

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Flame,
  ListOrdered,
  Play,
  Snowflake,
  Swords,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import Script from "next/script"
import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { decimal, longDay, shortDate, signed, time, weekday } from "@/components/site/ranked/format"
import { ResultLetter } from "@/components/site/ranked/match-result"
import { RatingChart } from "@/components/site/ranked/rating-chart"
import { RlrLink } from "@/components/site/ranked/rlr-link"
import { Badge, Button, ButtonLink, cardClass, EmptyState, Section } from "@/components/site/ui"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { livePath } from "@/lib/channel"
import { loadFans, type Choice, type Torcedor } from "@/lib/profile"
import { dayOf } from "@/lib/ranked"
import type { Breakdown, Day, Player, RecordView, Result, Stat, ViewMatch } from "@/lib/ranked-view"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  W: { pt: "V", en: "W" },
  L: { pt: "D", en: "L" },
  wins: { pt: "vitórias", en: "wins" },
  win1: { pt: "vitória", en: "win" },
  losses: { pt: "derrotas", en: "losses" },
  loss1: { pt: "derrota", en: "loss" },
  winRate: { pt: "de vitórias", en: "won" },
  matches: { pt: "partidas", en: "matches" },
  match1: { pt: "partida", en: "match" },
  streakWin: { pt: "vitórias seguidas", en: "wins in a row" },
  streakLoss: { pt: "derrotas seguidas", en: "losses in a row" },
  best: { pt: "Melhor sequência", en: "Best run" },
  inWin: { pt: "na vitória", en: "per win" },
  inLoss: { pt: "na derrota", en: "per loss" },
  chartWin: { pt: "vitória", en: "win" },
  chartLoss: { pt: "derrota", en: "loss" },
  unranked: { pt: "sem rank", en: "unranked" },
  chartLabel: { pt: "Partida a partida", en: "Match by match" },
  chartEmpty: {
    pt: "O gráfico aparece quando uma partida tiver os pontos anotados.",
    en: "The chart shows up once a match has its points written down.",
  },
  breakdowns: { pt: "Agentes e mapas", en: "Agents and maps" },
  days: { pt: "Dia a dia", en: "Day by day" },
  players: { pt: "Eu e os torcedores que jogaram comigo", en: "Me and the viewers who played with me" },
  me: { pt: "eu", en: "me" },
  list: { pt: "Partidas", en: "Matches" },
  with: { pt: "com", en: "with" },
  onLive: { pt: "Assistir na live", en: "Watch on stream" },
  onLiveHint: { pt: "Esta partida no vídeo da live", en: "This match in the stream's video" },
  showAll: { pt: "Ver todas", en: "Show all" },
})

/** How many matches the list shows before "Ver todas". */
const SHOWN = 20
const ME = "muanlartins"
const SQUARE: Record<Result, string> = { win: "bg-win", loss: "bg-loss", draw: "bg-zinc-300" }
const TEXT: Record<Result, string> = { win: "text-win", loss: "text-loss", draw: "text-muted" }
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * A game's ranked record, the same for every game: the rank now with the record and the runs, the points (or RR)
 * match by match, what the game breaks down (Valorant: agents, maps), day by day, me and the viewers who played with
 * me, and every match, by day. lib/ranked-view.ts turns each game's sessions into what this draws.
 */
export function RankedRecord({ view }: { view: RecordView }) {
  const valued = view.series.some((point) => point.value != null)
  const breakdowns = view.breakdowns.filter((b) => b.rows.length > 0)
  return (
    <div className="space-y-16">
      <RankHero view={view} />

      <Section icon={TrendingUp} title={view.title}>
        {valued ? (
          <>
            <ChartKey view={view} />
            <RatingChart series={view.series} bands={view.bands} unit={view.unit} label={T.chartLabel} missing={view.missing} />
          </>
        ) : (
          <EmptyState>{T.chartEmpty}</EmptyState>
        )}
      </Section>

      {breakdowns.length > 0 && (
        <Section icon={Swords} title={T.breakdowns}>
          <div className="grid gap-10 sm:grid-cols-2">
            {breakdowns.map((breakdown) => (
              <BreakdownList key={breakdown.title} breakdown={breakdown} />
            ))}
          </div>
        </Section>
      )}

      <Section icon={CalendarDays} title={T.days}>
        <Days days={[...view.days].reverse()} unit={view.unit} />
      </Section>

      {/* Alone, my line would repeat the numbers under the rank: the section is for the viewers. */}
      {view.players.length > 1 && (
        <Section icon={UsersRound} title={T.players} description={view.playersHint}>
          <Players players={view.players} unit={view.unit} />
        </Section>
      )}

      <Section icon={ListOrdered} title={T.list} description={view.listHint}>
        <Matches matches={[...view.matches].reverse()} unit={view.unit} />
      </Section>
    </div>
  )
}

/** What the chart's marks are, only the ones it draws: a match without a value and the unranked stretch with their count. */
function ChartKey({ view }: { view: RecordView }) {
  const matches = view.series.flatMap((point) => (point.match ? [point] : []))
  const missing = matches.filter((point) => point.value == null).length
  const unranked = matches.filter((point) => point.match!.unranked).length
  return (
    <p className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
      <Key mark={<span className="h-2.5 w-2.5 bg-win" />}>{T.chartWin}</Key>
      <Key mark={<span className="h-2.5 w-2.5 bg-loss" />}>{T.chartLoss}</Key>
      {missing > 0 && <Key mark={<span className="h-2.5 w-2.5 border-[1.5px] border-muted" />}>{`${view.missing} (${missing})`}</Key>}
      {unranked > 0 && <Key mark={<span className="h-2.5 w-4 bg-klein/15" />}>{`${T.unranked} (${unranked})`}</Key>}
    </p>
  )
}

function Key({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="flex">
        {mark}
      </span>
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
          <span className="ml-0.5 text-muted">{stat.letter}</span>
        </span>
      ))}
    </span>
  )
}

/** Wins and losses side by side in their colours: 4V 7D. */
function WinLoss({ wins, losses, className }: { wins: number; losses: number; className?: string }) {
  return (
    <span className={cn("tabular-nums", className)} aria-label={`${count(wins, T.win1, T.wins)}, ${count(losses, T.loss1, T.losses)}`}>
      <span className="text-win">
        {wins}
        {T.W}
      </span>{" "}
      <span className="text-loss">
        {losses}
        {T.L}
      </span>
    </span>
  )
}

// --- The rank now --------------------------------------------------------------------------------------------------

function RankHero({ view }: { view: RecordView }) {
  const { standing, wins, losses, streak } = view
  const played = wins + losses
  const rate = played ? Math.round((wins / played) * 100) : 0
  return (
    <section className="space-y-3">
      <div className={cn(cardClass, "grid gap-6 p-5 sm:p-6", standing && "sm:grid-cols-2")}>
        {standing && (
          <div className="flex items-center gap-5" style={{ "--rank": standing.color } as CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={standing.icon}
              alt=""
              className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_6px_16px_color-mix(in_oklab,var(--rank)_50%,transparent)]"
            />
            <div className="min-w-0">
              <p className="rank-metal text-4xl font-medium tracking-[-0.02em]" style={{ backgroundPosition: "0% 0%" }}>
                {standing.name}
              </p>
              {standing.detail && <p className="text-[15px] text-muted">{standing.detail}</p>}
              {standing.value && <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{standing.value}</p>}
              {standing.since && <p className="text-[13px] tabular-nums text-muted">{standing.since}</p>}
            </div>
          </div>
        )}

        <div className={cn("space-y-3", standing && "sm:border-l sm:border-line sm:pl-6")}>
          <p className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
            <span className="text-4xl font-semibold tracking-[-0.02em] text-win">
              {wins}
              <span className="text-xl">{T.W}</span>
            </span>
            <span className="text-4xl font-semibold tracking-[-0.02em] text-loss">
              {losses}
              <span className="text-xl">{T.L}</span>
            </span>
            <span className="text-[15px] text-muted">
              {rate}% {T.winRate}
            </span>
          </p>
          <div className="flex h-2 bg-zinc-200" aria-hidden>
            <span className="bg-win" style={{ width: `${rate}%` }} />
            <span className="bg-loss" style={{ width: `${played ? 100 - rate : 0}%` }} />
          </div>
          {(streak !== 0 || view.bestStreak > 1) && (
            <div className="flex flex-wrap gap-2">
              {streak !== 0 && (
                <Badge tone={streak > 0 ? "win" : "loss"}>
                  {streak > 0 ? <Flame aria-hidden className="h-3.5 w-3.5" /> : <Snowflake aria-hidden className="h-3.5 w-3.5" />}
                  {streak > 0 ? (streak === 1 ? `1 ${T.win1}` : `${streak} ${T.streakWin}`) : streak === -1 ? `1 ${T.loss1}` : `${-streak} ${T.streakLoss}`}
                </Badge>
              )}
              {view.bestStreak > 1 && (
                <Badge tone="soft">
                  {T.best}: {view.bestStreak}
                </Badge>
              )}
            </div>
          )}
          {(view.winChange !== undefined || view.lossChange !== undefined) && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
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
        <dl className={cn("grid gap-3", view.tiles.length === 4 ? "grid-cols-2 sm:grid-cols-4" : view.tiles.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {view.tiles.map((tile) => (
            <div key={tile.label} className={cn(cardClass, "flex flex-col justify-between gap-1 px-4 py-3")}>
              <dt className="text-[13px] leading-[1.35] text-muted">{tile.label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-ink">{tile.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

// --- Agents and maps ---------------------------------------------------------------------------------------------

function BreakdownList({ breakdown }: { breakdown: Breakdown }) {
  return (
    <div>
      <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{breakdown.title}</h3>
      <ul className="mt-3 space-y-2.5">
        {breakdown.rows.slice(0, 6).map((row) => {
          const played = row.wins + row.losses
          return (
            <li key={row.name} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.image}
                alt=""
                className={breakdown.kind === "agent" ? "h-9 w-9 shrink-0 rounded-full bg-navy object-cover" : "h-9 w-20 shrink-0 object-cover"}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2 text-[15px]">
                  <span className="truncate font-medium text-ink">{row.name}</span>
                  <WinLoss wins={row.wins} losses={row.losses} className="shrink-0 text-[13px]" />
                </span>
                <span className="mt-1 flex h-1.5 bg-zinc-200" aria-hidden>
                  <span className="bg-win" style={{ width: `${played ? (row.wins / played) * 100 : 0}%` }} />
                  <span className="bg-loss" style={{ width: `${played ? (row.losses / played) * 100 : 0}%` }} />
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// --- Day by day ----------------------------------------------------------------------------------------------------

function Days({ days, unit }: { days: Day[]; unit: string }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {days.map((day) => (
        <li key={day.date} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto_14rem]">
          <span className="leading-tight">
            <span className="block text-[15px] font-medium tabular-nums text-ink">{shortDate(day.date)}</span>
            <span className="block text-[12px] text-muted first-letter:uppercase">{weekday(day.date).split("-")[0]}</span>
          </span>
          <span className="flex flex-wrap gap-1" role="img" aria-label={`${count(day.wins, T.win1, T.wins)}, ${count(day.losses, T.loss1, T.losses)}`}>
            {day.results.map((result, index) => (
              <span key={index} className={cn("h-3 w-3", SQUARE[result])} />
            ))}
          </span>
          <span className="text-right text-[15px]">
            <WinLoss wins={day.wins} losses={day.losses} />
            {day.change !== 0 && (
              <>
                <br className="sm:hidden" />
                <span className="hidden text-muted sm:inline"> · </span>
                <Change value={day.change} unit={unit} />
              </>
            )}
          </span>
          {day.end && (
            <span className="hidden items-center gap-2 text-[13px] leading-tight text-muted sm:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={day.end.icon} alt="" className="h-7 w-7 shrink-0 object-contain" />
              <span>{day.end.name}</span>
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

  // My line takes the whole row when the viewers fill theirs; with an odd number of them it's one of the pair, so no
  // card is left alone in a row.
  const wide = (players.length - 1) % 2 === 0

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <li
            key={player.login}
            className={cn(cardClass, "flex items-center gap-4 px-3 py-3", player.me && "border-klein bg-klein/[0.06]", player.me && wide && "sm:col-span-2")}
          >
            <FanSpot T={torcedor} fans={fans} login={player.login} name={player.login} size={player.me ? "md" : "sm"} />
            <div className="min-w-0 space-y-1 text-[15px] tabular-nums">
              <p className="flex items-center gap-2">
                {player.login === ME ? (
                  <a
                    href={`https://www.twitch.tv/${player.login}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-[17px] font-medium text-ink transition-colors hover:text-klein"
                  >
                    {player.login}
                  </a>
                ) : (
                  <ViewerName login={player.login} className="block truncate font-medium text-ink transition-colors hover:text-klein" />
                )}
                {player.login === ME && <Badge>{T.me}</Badge>}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-ink">
                <span>{count(player.matches, T.match1, T.matches)}</span>
                <WinLoss wins={player.wins} losses={player.losses} />
                {player.change !== 0 && <Change value={player.change} unit={unit} />}
              </p>
              <Stats stats={player.stats} className="text-[13px]" />
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
          <h3 className="mb-3 text-xl font-medium tracking-[-0.02em] text-ink first-letter:uppercase">{longDay(day.date)}</h3>
          <ul className="space-y-2">
            {day.matches.map((match) => (
              <MatchRow key={match.id} match={match} unit={unit} />
            ))}
          </ul>
        </div>
      ))}
      {!all && matches.length > SHOWN && (
        <Button variant="secondary" size="sm" onClick={() => setAll(true)}>
          {T.showAll} ({matches.length})
        </Button>
      )}
    </div>
  )
}

/** A match in a row: the result, the map and agent when the game has them, the score, my numbers, the change, and
 * where to watch it (the live's video, RLR's replay). */
function MatchRow({ match, unit }: { match: ViewMatch; unit: string }) {
  const links = match.moment || match.replay
  return (
    <li className={cn(cardClass, "flex flex-wrap items-center gap-x-3 gap-y-2 p-2 pr-4 sm:flex-nowrap")}>
      <ResultLetter result={match.result} className="h-11 w-9 text-[15px]" />
      {match.map && (
        <span className="relative h-11 w-16 shrink-0 sm:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={match.map.image} alt="" className="h-full w-full object-cover" />
          {match.agent && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.agent.image} alt="" className="absolute -bottom-1.5 -right-2 h-8 w-8 rounded-full border-2 border-paper bg-navy object-cover" />
          )}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-[17px] font-semibold tabular-nums", TEXT[match.result])}>{match.score ? `${match.score[0]}–${match.score[1]}` : "–"}</span>
          {match.map && (
            <span className="truncate text-[15px] text-ink">
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
            <span className="bg-klein/[0.08] px-1.5 py-px text-klein">
              {T.with}{" "}
              {match.viewers.map((login, index) => (
                <span key={login}>
                  {index > 0 && ", "}
                  <ViewerName login={login} className="underline-offset-2 hover:underline" />
                </span>
              ))}
            </span>
          )}
        </span>
      </span>
      <span className="ml-auto shrink-0 text-right leading-tight">
        {match.change != null && <Change value={match.change} unit={unit} className="block text-[15px] font-semibold" />}
        <span className="block text-[13px] tabular-nums text-muted">
          {match.valueText && <span className="hidden sm:inline">{match.valueText} · </span>}
          {time(match.at)}
        </span>
      </span>
      {links && (
        <span className="flex w-full shrink-0 flex-wrap items-center gap-x-4 gap-y-1 pl-12 sm:w-auto sm:pl-0">
          {match.moment && (
            <ButtonLink
              href={`${livePath(match.moment.date)}#t=${match.moment.at}`}
              variant="quiet"
              size="sm"
              title={T.onLiveHint}
              icon={<Play aria-hidden className="h-4 w-4 shrink-0 fill-current" />}
              className="min-h-6 whitespace-nowrap"
            >
              {T.onLive}
            </ButtonLink>
          )}
          {match.replay && <RlrLink replay={match.replay} />}
        </span>
      )}
    </li>
  )
}
