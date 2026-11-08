import { Crosshair as Aim, Map as MapIcon, Swords, UsersRound } from "lucide-react"
import type { ReactNode } from "react"
import { Ladder } from "@/components/site/game/ladder"
import { PageIntro } from "@/components/site/page-intro"
import { decimal, longDate, signed, time, weekday } from "@/components/site/ranked/format"
import type { Rank } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { headshotRate, summarizeValorant, tierId, type ValorantMatch, type ValorantSession } from "@/lib/valorant"

const T = localize({
  empty: {
    pt: "As ranqueadas de Valorant entram aqui a partir da primeira live: cada partida com o placar, o mapa, o agente e os meus números.",
    en: "Valorant's ranked matches show up here from the first stream on: each with the score, the map, the agent and my numbers.",
  },
  now: { pt: "Agora", en: "Now" },
  record: { pt: "nas lives", en: "on stream" },
  agents: { pt: "Agentes", en: "Agents" },
  maps: { pt: "Mapas", en: "Maps" },
  viewers: { pt: "Viewers que jogaram comigo", en: "Viewers who played with me" },
  matches: { pt: "partidas", en: "matches" },
  wins: { pt: "vitórias", en: "wins" },
  hint: {
    pt: "Por partida: abates (K), mortes (D) e assistências (A). ACS é a pontuação de combate por round; HS, os tiros na cabeça entre os que acertaram.",
    en: "Per match: kills (K), deaths (D) and assists (A). ACS is the combat score per round; HS, the headshots among the shots that hit.",
  },
})

const RESULT = { win: "V", loss: "D", draw: "E" } as const

/**
 * Valorant's ranked record: Luan's rank now, his averages, the agents and maps he plays, the viewers who played with
 * him, then every competitive match from the lives, day by day. Before the first, the ladder with where he is.
 */
export function ValorantRankedPage({
  title,
  description,
  sessions,
  ranks,
  rank,
  credits,
}: {
  title: string
  description: string
  sessions: ValorantSession[]
  /** The fundamentals' ranks, for the emblems' names and colours. */
  ranks: Rank[]
  /** Luan's rank by hand (the game's `rank`), for before the first match. */
  rank?: string
  credits: string
}) {
  const summary = summarizeValorant(sessions)
  const current = tierId(summary.rank?.tier)
  const info = ranks.find((r) => current?.startsWith(r.id))
  const division = current?.match(/-(\d)$/)?.[1]

  return (
    <>
      <PageIntro title={title} description={description} />

      {summary.matches.length === 0 ? (
        <section className="mt-12 space-y-8">
          <p className="max-w-[38rem] text-[16px] leading-[1.7] text-ink">{T.empty}</p>
          <Ladder ranks={ranks} current={rank} />
        </section>
      ) : (
        <>
          <section className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5 rounded-md border border-line bg-paper/70 p-5 backdrop-blur-sm">
            {current && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/ranks/valorant/${current}.webp`} alt="" className="h-14 w-14 object-contain" />
                <div>
                  <p className="text-[13px] text-muted">{T.now}</p>
                  <p className="text-xl font-medium" style={{ color: info?.color }}>
                    {info ? localize(info.name) : current}
                    {division && ` ${division}`}
                    {summary.rank && <span className="ml-2 text-[15px] font-normal text-muted">{summary.rank.rr} RR</span>}
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="text-[13px] text-muted">{T.record}</p>
              <p className="text-xl font-medium tabular-nums text-ink">
                {summary.wins}V <span className="text-klein-claro">·</span> {summary.losses}D
              </p>
            </div>
            {summary.averages && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 tabular-nums">
                <Figure value={`${decimal(summary.averages.kills)} K ${decimal(summary.averages.deaths)} D ${decimal(summary.averages.assists)} A`} />
                <Figure value={`${Math.round(summary.averages.acs)} ACS`} />
                <Figure value={`${Math.round(summary.averages.headshots)}% HS`} />
              </div>
            )}
          </section>
          <p className="mt-3 max-w-[38rem] text-[13px] leading-[1.5] text-muted">{T.hint}</p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <Tally icon={<Swords aria-hidden className="h-4 w-4" />} title={T.agents} rows={summary.agents.map((a) => ({ name: a.agent, ...a }))} />
            <Tally icon={<MapIcon aria-hidden className="h-4 w-4" />} title={T.maps} rows={summary.maps.map((m) => ({ name: m.map, ...m }))} />
          </div>

          {summary.allies.length > 0 && (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-xl font-medium tracking-[-0.02em] text-klein">
                <UsersRound aria-hidden className="h-5 w-5" />
                {T.viewers}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {summary.allies.map((ally) => (
                  <li key={ally.login}>
                    <a
                      href={`https://www.twitch.tv/${ally.login}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[14px] text-ink hover:border-klein hover:text-klein"
                    >
                      {ally.login}
                      <span className="tabular-nums text-muted">
                        {ally.matches} {T.matches} · {ally.wins} {T.wins}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12 space-y-10">
            {summary.days.map((day) => (
              <div key={day.date}>
                <h2 className="flex flex-wrap items-baseline gap-x-3 text-xl font-medium tracking-[-0.02em] text-klein">
                  {longDate(day.date)}
                  <span className="text-[14px] font-normal tabular-nums text-muted first-letter:uppercase">
                    {weekday(day.date)} · {day.wins}V · {day.losses}D{day.rr ? ` · ${signed(day.rr)} RR` : ""}
                  </span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {day.matches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{credits}</p>
    </>
  )
}

function Figure({ value }: { value: string }) {
  return <p className="text-[17px] font-medium text-ink">{value}</p>
}

function Tally({ icon, title, rows }: { icon: ReactNode; title: string; rows: { name: string; matches: number; wins: number }[] }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-[15px] font-medium text-klein">
        {icon}
        {title}
      </h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {rows.slice(0, 5).map((row) => (
          <li key={row.name} className="flex items-baseline justify-between gap-4 py-2 text-[14px]">
            <span className="text-ink">{row.name}</span>
            <span className="tabular-nums text-muted">
              {row.wins}V · {row.matches - row.wins}D
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A match: the result's colour down its side, the score, map and agent, my numbers and the RR. */
function MatchRow({ match }: { match: ValorantMatch }) {
  const acs = match.rounds ? Math.round(match.me.score / match.rounds) : 0
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-l-4 border-line bg-paper/70 px-4 py-3",
        match.result === "win" ? "border-l-klein" : match.result === "loss" ? "border-l-zinc-300" : "border-l-muted",
      )}
    >
      <span className="w-6 text-[14px] font-medium text-klein">{RESULT[match.result]}</span>
      <span className="min-w-0 flex-1 basis-48">
        <span className="block text-[16px] font-medium tabular-nums text-ink">
          {match.score[0]}–{match.score[1]} <span className="font-normal text-muted">·</span> {match.map}{" "}
          <span className="font-normal text-muted">·</span> {match.agent}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] tabular-nums text-muted">
          <Aim aria-hidden className="h-3.5 w-3.5" />
          {match.me.kills} K {match.me.deaths} D {match.me.assists} A · {acs} ACS · {Math.round(headshotRate(match.me))}% HS · {time(match.at)}
        </span>
      </span>
      {match.rr != null && (
        <span className={cn("text-[15px] font-medium tabular-nums", match.rr >= 0 ? "text-klein" : "text-muted")}>{signed(match.rr)} RR</span>
      )}
    </li>
  )
}
