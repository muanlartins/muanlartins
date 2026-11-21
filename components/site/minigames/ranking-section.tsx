"use client"

import { useState } from "react"
import { MarbleDot } from "@/components/site/minigames/marble"
import { FanFigure, fill, Name, number, percent } from "@/components/site/minigames/shared"
import { EmptyState, Ranking, Section, Skeleton, TabPanel, Tabs } from "@/components/site/ui"
import { channel } from "@/content/channel"
import type { Races } from "@/lib/corrida"
import type { Duels } from "@/lib/duelo"
import type { Choice, Torcedor } from "@/lib/profile"
import { localize } from "@/lib/site"

const text = localize(channel.minijogos)
const T = text.ranking
type Game = "duel" | "race"

/** A ranking's shape while it loads: the podium and a few lines. */
function RankingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="cut h-[300px]" />
      <Skeleton className="cut h-[200px]" />
    </div>
  )
}

/** Both minigames' rankings, a tab each, drawn by the site's one ranking (the audience's too). */
export function RankingSection({
  duels,
  races,
  T: Fan,
  fans,
  login,
  skinOf,
}: {
  duels: Duels | null | "error"
  races: Races | null | "error"
  T: Torcedor | null
  fans: Record<string, Choice> | null
  login: string
  skinOf: (login: string) => string | null
}) {
  const [game, setGame] = useState<Game>("duel")
  const figure = (l: string, nome: string) => <FanFigure T={Fan} fans={fans} login={l} name={nome} />
  const labels = { showAll: T.showAll, showLess: T.showLess, you: T.you }

  return (
    <Section id="ranking" title={T.title}>
      <Tabs
        label={T.title}
        idPrefix="ranking"
        value={game}
        onChange={setGame}
        className="mb-6"
        items={[
          { id: "duel", label: T.duel },
          { id: "race", label: T.race },
        ]}
      />
      <TabPanel idPrefix="ranking" id={game}>
        {game === "duel" ? (
          duels === "error" ? (
            <EmptyState>{T.unavailable}</EmptyState>
          ) : !duels ? (
            <RankingSkeleton />
          ) : !duels.ranking.length ? (
            <EmptyState>{T.empty}</EmptyState>
          ) : (
            <div className="space-y-4">
              <Ranking
                {...labels}
                label={`${T.title} · ${T.duel}`}
                entries={duels.ranking.map((r) => ({
                  id: r.login,
                  figure: figure(r.login, r.nome),
                  name: <Name login={r.login}>{r.nome}</Name>,
                  value: `${number(r.vitorias)} ${text.record.wins}`,
                  detail: `${percent(r.vitorias, r.partidas)} · ${number(r.partidas)} ${text.record.fights}`,
                  mine: r.login === login,
                }))}
              />
              <p className="max-w-[38rem] text-[13px] text-muted">
                {T.duelNote} {fill(T.total, { n: number(duels.total) })}.
                {duels.canal && ` ${fill(T.channel, { v: `${number(duels.canal.vitorias)} ${text.record.wins}`, p: `${number(duels.canal.partidas)} ${text.record.fights}` })}`}
              </p>
            </div>
          )
        ) : races === "error" ? (
          <EmptyState>{text.race.unavailable}</EmptyState>
        ) : !races ? (
          <RankingSkeleton />
        ) : !races.ranking.length ? (
          <EmptyState>{text.race.none}</EmptyState>
        ) : (
          <div className="space-y-4">
            <Ranking
              {...labels}
              label={`${T.title} · ${T.race}`}
              entries={races.ranking.map((r) => ({
                id: r.login,
                figure: figure(r.login, r.nome),
                name: <Name login={r.login}>{r.nome}</Name>,
                mark: <MarbleDot skin={skinOf(r.login)} size={14} />,
                value: `${number(r.vitorias)} ${text.race.wins}`,
                detail: `${number(r.podios)} ${text.race.podiums} · ${number(r.corridas)} ${text.race.races}`,
                mine: r.login === login,
              }))}
            />
            <p className="max-w-[38rem] text-[13px] text-muted">
              {T.raceNote} {fill(text.race.total, { n: number(races.total) })}.
            </p>
          </div>
        )}
      </TabPanel>
    </Section>
  )
}
