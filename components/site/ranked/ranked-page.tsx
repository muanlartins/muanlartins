"use client"

import { Play } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { FanSpot } from "@/components/site/pix/fan-spot"
import {
  decimal,
  divisionOf,
  shortDate,
  signed,
  tierOf,
  time,
  type RankInfo,
} from "@/components/site/ranked/format"
import { MatchResult } from "@/components/site/ranked/match-result"
import { PointsChart } from "@/components/site/ranked/points-chart"
import { BallBackdrop } from "@/components/site/roadmap/ball-backdrop"
import { loadFans, type Choice, type Torcedor } from "@/lib/profile"
import {
  MODES,
  summarize,
  viewersIn,
  type Ally,
  type Match,
  type Mode,
  type Session,
  type Standing,
} from "@/lib/ranked"
import { UI, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  modes: { pt: "Modo", en: "Mode" },
  division: { pt: "Divisão", en: "Division" },
  points: { pt: "pts", en: "pts" },
  since: { pt: "desde", en: "since" },
  matches: { pt: "Partidas", en: "Matches" },
  record: { pt: "Vitórias e derrotas", en: "Wins and losses" },
  winRate: { pt: "de vitórias", en: "won" },
  streak: { pt: "Sequência atual", en: "Current streak" },
  wins: { pt: "vitórias", en: "wins" },
  win1: { pt: "vitória", en: "win" },
  losses: { pt: "derrotas", en: "losses" },
  loss1: { pt: "derrota", en: "loss" },
  best: { pt: "melhor", en: "best" },
  perMatch: { pt: "Pontos por partida", en: "Points per match" },
  perMatchHint: { pt: "média na vitória / na derrota", en: "average win / loss" },
  chart: { pt: "Pontos", en: "Points" },
  chartLegendWin: { pt: "vitória", en: "win" },
  chartLegendLoss: { pt: "derrota", en: "loss" },
  chartEmpty: {
    pt: "O gráfico aparece quando houver pontos anotados em pelo menos uma partida.",
    en: "The chart shows up once a match has its points written down.",
  },
  days: { pt: "Por dia", en: "By day" },
  day: { pt: "Dia", en: "Day" },
  result: { pt: "V–D", en: "W–L" },
  net: { pt: "Pontos", en: "Points" },
  end: { pt: "Fim do dia", en: "End of day" },
  players: { pt: "Eu e os viewers que jogaram comigo", en: "Me and the viewers who played with me" },
  mine: { pt: "Minhas estatísticas", en: "My stats" },
  playersHint: {
    pt: "Partidas, vitórias e derrotas, pontos e a média por partida de gols (G), assistências (A) e defesas (D). A minha conta as {n} partidas com estatísticas do jogo; a de cada viewer, só as que jogou comigo.",
    en: "Matches, wins and losses, points, and the average per match of goals (G), assists (A) and saves (S). Mine counts the {n} matches with the game's stats; each viewer's, only the ones they played with me.",
  },
  me: { pt: "eu", en: "me" },
  G: { pt: "G", en: "G" },
  A: { pt: "A", en: "A" },
  D: { pt: "D", en: "S" },
  list: { pt: "Partidas", en: "Matches" },
  W: { pt: "V", en: "W" },
  L: { pt: "D", en: "L" },
  overtime: { pt: "prorrogação", en: "overtime" },
  left: { pt: "saí antes do fim", en: "left early" },
  listHint: {
    pt: "Placar, pontos ganhos ou perdidos, o total depois e meus gols · assistências · defesas.",
    en: "Score, points won or lost, the total after, and my goals · assists · saves.",
  },
  showAll: { pt: "Mostrar todas", en: "Show all" },
  together: { pt: "partidas", en: "matches" },
  together1: { pt: "partida", en: "match" },
  with: { pt: "com", en: "with" },
  onLive: { pt: "na live", en: "on stream" },
  empty: {
    pt: "Nenhuma partida ranqueada de {mode} publicada ainda.",
    en: "No ranked {mode} matches published yet.",
  },
})

/** The channel's own login: my line among the players. */
const ME = "muanlartins"

/** How many matches the list shows before "Show all". */
const SHOWN = 20

// The selected mode lives in the URL's hash (#3v3), so a link can open a tab.
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}
const readHash = () => decodeURIComponent(window.location.hash.slice(1))

export function RankedPage({
  title,
  description,
  sessions,
  ranks,
  moments,
  livesPath,
}: {
  title: string
  description: string
  sessions: Session[]
  ranks: RankInfo[]
  /** Matches a live has a chapter for: where to watch them. */
  moments: Record<string, { date: string; at: number }>
  livesPath: string
}) {
  const hash = useSyncExternalStore(subscribe, readHash, () => "")
  // Without a hash, the mode of the latest match.
  const latest = sessions
    .flatMap((session) => session.matches)
    .filter((match) => (MODES as readonly string[]).includes(match.mode))
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  const mode: Mode = (MODES as readonly string[]).includes(hash) ? (hash as Mode) : ((latest?.mode as Mode) ?? "3v3")

  function choose(next: Mode) {
    history.replaceState(null, "", `#${next}`)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  }

  const counts = Object.fromEntries(
    MODES.map((m) => [m, sessions.reduce((n, s) => n + s.matches.filter((match) => match.mode === m).length, 0)]),
  )
  const summary = summarize(sessions, mode)
  const played = summary.matches.length

  // The allies' fans, as they built them on their profile (or the one their login gives them).
  const [torcedor, setTorcedor] = useState<Torcedor | null>(null)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)
  const viewers = [...new Set(sessions.flatMap((session) => session.matches.flatMap(viewersIn)))].sort().join(",")
  useEffect(() => {
    loadFans([ME, ...(viewers ? viewers.split(",") : [])])
      .then(setFans)
      .catch(() => setFans({}))
  }, [viewers])

  // Me first, then the viewers who played with me.
  const players: Player[] = summary.averages
    ? [
        {
          login: ME,
          me: true,
          matches: played,
          wins: summary.wins,
          losses: summary.losses,
          points: summary.matches.reduce((total, match) => total + (match.points ?? 0), 0),
          averages: summary.averages.me,
        },
        ...summary.allies,
      ]
    : []

  return (
    <>
      <BallBackdrop />
      <PageIntro title={title} description={description} />

      <div role="tablist" aria-label={T.modes} className="mt-12 flex gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === mode}
            onClick={() => choose(m)}
            className={cn(
              "rounded-md border px-4 py-2 text-[15px] font-medium tabular-nums transition-colors",
              m === mode ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein",
            )}
          >
            {m}
            <span className={cn("ml-2 text-[12px]", m === mode ? "text-klein-claro" : "text-muted")}>{counts[m]}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-10 space-y-16">
        {summary.standing && <StandingHeader standing={summary.standing} first={summary.first} ranks={ranks} />}

        {played === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-5 py-6 text-[14px] text-muted">
            {T.empty.replace("{mode}", mode)}
          </p>
        ) : (
          <>
            <Tiles summary={summary} />

            <Section title={T.chart}>
              {summary.series.length > 1 ? (
                <>
                  <div className="mb-3 flex gap-5 text-[12px] text-muted">
                    <Key win>{T.chartLegendWin}</Key>
                    <Key>{T.chartLegendLoss}</Key>
                  </div>
                  <PointsChart key={mode} series={summary.series} />
                </>
              ) : (
                <p className="text-[14px] text-muted">{T.chartEmpty}</p>
              )}
            </Section>

            <Section title={T.days}>
              <table className="w-full text-[14px] tabular-nums">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] text-muted">
                    <th className="py-2 pr-4 font-normal">{T.day}</th>
                    <th className="py-2 pr-4 font-normal">{T.result}</th>
                    <th className="py-2 text-right font-normal">{T.net}</th>
                    <th className="py-2 pl-6 font-normal">{T.end}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary.days].reverse().map((day) => (
                    <tr key={day.date} className="border-b border-line/60">
                      <td className="py-2.5 pr-4">{shortDate(day.date)}</td>
                      <td className="whitespace-nowrap py-2.5 pr-4">
                        {day.wins}
                        {T.W} · {day.losses}
                        {T.L}
                      </td>
                      <td className="py-2.5 text-right">{signed(day.points)}</td>
                      <td className="py-2.5 pl-6">{day.end && <StandingInline standing={day.end} ranks={ranks} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {summary.averages && (
              <Section
                title={summary.allies.length > 0 ? T.players : T.mine}
                hint={T.playersHint.replace("{n}", String(summary.averages.matches))}
              >
                <Players players={players} torcedor={torcedor} fans={fans} />
              </Section>
            )}

            <Section title={T.list} hint={T.listHint}>
              <Matches matches={[...summary.matches].reverse()} moments={moments} livesPath={livesPath} />
            </Section>
          </>
        )}
      </div>

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{UI.credits}</p>
      <Script src="/stream/torcedor.js" onReady={() => setTorcedor(window.Torcedor ?? null)} />
    </>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-medium text-klein tracking-[-0.02em]">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** A win is a filled dot, a loss a hollow one, as on the chart. */
function Key({ win, children }: { win?: boolean; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="12" height="12" aria-hidden>
        <circle cx="6" cy="6" r="4" className={win ? "fill-klein" : "fill-ground stroke-klein"} strokeWidth={2} />
      </svg>
      {children}
    </span>
  )
}

function StandingHeader({
  standing,
  first,
  ranks,
}: {
  standing: Standing
  first?: { at: string; mmr: number }
  ranks: RankInfo[]
}) {
  const tier = tierOf(standing.tier, ranks)
  const division = divisionOf(standing)
  const gained = standing.mmr != null && first ? standing.mmr - first.mmr : undefined

  return (
    <div className="flex items-center gap-5" style={{ "--rank": tier.color } as CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tier.icon}
        alt=""
        className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_4px_10px_color-mix(in_oklab,var(--rank)_45%,transparent)]"
      />
      <div>
        <p className="rank-metal text-3xl font-medium tracking-[-0.02em]" style={{ backgroundPosition: "0% 0%" }}>
          {tier.name}
        </p>
        {division && (
          <p className="text-[14px] text-muted">
            {T.division} {division}
          </p>
        )}
        {standing.mmr != null && (
          <p className="mt-1 text-[15px] text-ink">
            <span className="text-xl font-semibold">{standing.mmr}</span> {T.points}
            {gained !== undefined && first && (
              <span className="ml-2 text-muted">
                {signed(gained)} {T.since} {shortDate(first.at)}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function StandingInline({ standing, ranks }: { standing: Standing; ranks: RankInfo[] }) {
  const tier = tierOf(standing.tier, ranks)
  const division = divisionOf(standing)
  return (
    <span className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tier.icon} alt="" className="h-6 w-6 object-contain" />
      <span>
        {tier.name}
        {division && <span className="text-muted"> · {division}</span>}
        {standing.mmr != null && <span className="text-muted"> · {standing.mmr}</span>}
      </span>
    </span>
  )
}

function Tiles({ summary }: { summary: ReturnType<typeof summarize> }) {
  const played = summary.matches.length
  const { streak } = summary
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: T.matches, value: String(played) },
    {
      label: T.record,
      value: `${summary.wins}${T.W} · ${summary.losses}${T.L}`,
      hint: `${Math.round((summary.wins / played) * 100)}% ${T.winRate}`,
    },
    {
      label: T.streak,
      value: streak > 0 ? count(streak, T.win1, T.wins) : count(-streak, T.loss1, T.losses),
      hint: summary.bestStreak > 0 ? `${T.best}: ${count(summary.bestStreak, T.win1, T.wins)}` : undefined,
    },
  ]
  if (summary.winPoints !== undefined || summary.lossPoints !== undefined) {
    tiles.push({
      label: T.perMatch,
      value: [summary.winPoints, summary.lossPoints].map((p) => (p === undefined ? "–" : signed(p))).join(" / "),
      hint: T.perMatchHint,
    })
  }

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="border-t border-line pt-3">
          <dt className="text-[13px] text-muted">{tile.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-ink">{tile.value}</dd>
          {tile.hint && <dd className="mt-0.5 text-[12px] text-muted">{tile.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}

type Player = Ally & { me?: boolean }

/** A number with its letter: "1,4 G". */
function Stat({ value, letter }: { value: number; letter: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-ink">{decimal(value, 1)}</span> <span className="text-[12px] text-muted">{letter}</span>
    </span>
  )
}

/** Me, marked, and the viewers who played with me: their fan, their record and their averages. */
function Players({ players, torcedor, fans }: { players: Player[]; torcedor: Torcedor | null; fans: Record<string, Choice> | null }) {
  return (
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
          <div className="min-w-0 space-y-0.5 text-[14px] tabular-nums">
            <p className="flex items-center gap-2">
              <a
                href={`https://www.twitch.tv/${player.login}`}
                target="_blank"
                rel="noreferrer"
                className={cn("truncate font-medium text-ink transition-colors hover:text-klein", player.me ? "text-[18px]" : "text-[16px]")}
              >
                {player.login}
              </a>
              {player.me && <span className="rounded-sm bg-klein px-1.5 py-px text-[11px] font-semibold text-paper">{T.me}</span>}
            </p>
            <p className="text-ink">
              {player.matches} {player.matches === 1 ? T.together1 : T.together} · {player.wins}
              {T.W} {player.losses}
              {T.L}
              {player.points !== 0 && <span className="text-muted"> · {signed(player.points)} {T.points}</span>}
            </p>
            <p className="flex flex-wrap gap-x-3">
              <Stat value={player.averages.goals} letter={T.G} />
              <Stat value={player.averages.assists} letter={T.A} />
              <Stat value={player.averages.saves} letter={T.D} />
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function Matches({
  matches,
  moments,
  livesPath,
}: {
  matches: Match[]
  moments: Record<string, { date: string; at: number }>
  livesPath: string
}) {
  const [all, setAll] = useState(false)
  const shown = all ? matches : matches.slice(0, SHOWN)

  return (
    <>
      <ul className="divide-y divide-line/60 border-y border-line">
        {shown.map((match) => {
          const moment = moments[match.id]
          return (
            <li key={match.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[14px] tabular-nums">
              <MatchResult match={match} />
              {viewersIn(match).length > 0 && (
                <span className="rounded-sm bg-klein/[0.08] px-2 py-0.5 text-[12px] text-klein">
                  {T.with} {viewersIn(match).join(", ")}
                </span>
              )}
              <span className="ml-auto flex items-center gap-3 text-[13px] text-muted">
                <span>
                  {[match.overtime && T.overtime, match.left && T.left].filter(Boolean).join(" · ")}
                  {(match.overtime || match.left) && " · "}
                  {shortDate(match.at)} {time(match.at)}
                </span>
                {moment && (
                  <Link
                    href={`${livesPath}/${moment.date}#t=${moment.at}`}
                    className="flex items-center gap-1 rounded-sm border border-line px-2 py-0.5 text-ink transition-colors hover:border-klein hover:text-klein"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    {T.onLive}
                  </Link>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {!all && matches.length > SHOWN && (
        <button
          onClick={() => setAll(true)}
          className="mt-4 rounded-md border border-line px-4 py-2 text-[14px] text-ink transition-colors hover:border-klein"
        >
          {T.showAll} ({matches.length})
        </button>
      )}
    </>
  )
}
