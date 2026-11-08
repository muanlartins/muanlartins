"use client"

import { Ladder } from "@/components/site/game/ladder"
import { PageIntro } from "@/components/site/page-intro"
import { RankedRecord } from "@/components/site/ranked/record"
import { valorantView } from "@/lib/ranked-view"
import type { Rank } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import type { ValorantSession } from "@/lib/valorant"

const T = localize({
  empty: {
    pt: "As ranqueadas de Valorant entram aqui a partir da primeira live: cada partida com o placar, o mapa, o agente e os meus números.",
    en: "Valorant's ranked matches show up here from the first stream on: each with the score, the map, the agent and my numbers.",
  },
})

/**
 * Valorant's ranked record, drawn by the record every game shares (record.tsx) with what's Valorant's own: RR along
 * its ranks, maps and agents. Before the first match, the ladder with where Luan is.
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
  const view = valorantView(sessions, ranks)
  return (
    <>
      <PageIntro title={title} description={description} />
      <div className="mt-12">
        {view.matches.length === 0 ? (
          <section className="space-y-8">
            <p className="max-w-[38rem] text-[16px] leading-[1.7] text-ink">{T.empty}</p>
            <Ladder ranks={ranks} current={rank} />
          </section>
        ) : (
          <RankedRecord view={view} />
        )}
      </div>
      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{credits}</p>
    </>
  )
}
