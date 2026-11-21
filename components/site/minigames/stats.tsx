"use client"

import { useMemo, useState } from "react"
import { ClassArt, type DuelKit } from "@/components/site/minigames/class-art"
import { className } from "@/components/site/minigames/fights"
import { fill, Name, number } from "@/components/site/minigames/shared"
import { BarList, EmptyState, Section, Skeleton, TabPanel, Tabs, type Bar } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { classStats, type Fight, type Standing } from "@/lib/duelo"
import { localize } from "@/lib/site"

const text = localize(channel.minijogos)
const T = text.stats
type View = "used" | "wins" | "length"
/** Fewer fights than this and a class's win rate is drawn pale. */
const FEW = 5
/** The win rate's ranking counts only who fought at least this much. */
const MIN_DUELS = 20
/** Too few fights to say anything by class. */
const ENOUGH = 10

type Fan = { cor: string; detalhe: string; roupa: string }

/**
 * The duel in numbers, from the fights the Σ API keeps: each class's use, wins and length as bars (one view at a
 * time), and who fights the most and wins the most, from the ranking.
 */
export function StatsSection({ fights, ranking, kit, fan }: { fights: Fight[] | null; ranking: Standing[] | null; kit: DuelKit | null; fan: Fan }) {
  const [view, setView] = useState<View>("used")
  const stats = useMemo(() => (fights ? classStats(fights) : []), [fights])
  const sides = stats.reduce((t, s) => t + s.lutas, 0)
  const drawn = stats.reduce((t, s) => t + s.sorteadas, 0)
  const label = (id: string) => (
    <>
      <ClassArt kit={kit} classe={id} fan={fan} size={26} className="shrink-0" />
      <span className="truncate">{className(id)}</span>
    </>
  )

  const bars: Record<View, Bar[]> = {
    used: [...stats].sort((a, b) => b.lutas - a.lutas).map((s) => ({ id: s.classe, label: label(s.classe), value: s.lutas, display: number(s.lutas) })),
    wins: [...stats]
      .sort((a, b) => b.vitorias / b.lutas - a.vitorias / a.lutas || b.lutas - a.lutas)
      .map((s) => ({ id: s.classe, label: label(s.classe), value: s.vitorias / s.lutas, display: `${Math.round((s.vitorias / s.lutas) * 100)}% · ${fill(T.of, { v: s.vitorias, p: s.lutas })}`, faint: s.lutas < FEW })),
    length: [...stats].sort((a, b) => b.segundos - a.segundos).map((s) => ({ id: s.classe, label: label(s.classe), value: s.segundos, display: `${Math.round(s.segundos)} s` })),
  }
  const notes: Record<View, string> = { used: fill(T.usedNote, { p: sides ? Math.round((drawn / sides) * 100) : 0 }), wins: T.winsNote, length: T.lengthNote }

  const people = ranking ?? []
  const most = [...people].sort((a, b) => b.partidas - a.partidas).slice(0, 5)
  const rate = people
    .filter((p) => p.partidas >= MIN_DUELS)
    .sort((a, b) => b.vitorias / b.partidas - a.vitorias / a.partidas)
    .slice(0, 5)
  const who = (p: Standing) => (
    <Name login={p.login} className="truncate">
      {p.nome}
    </Name>
  )

  return (
    <Section id="estatisticas" title={T.title} description={fights && fights.length >= ENOUGH ? fill(T.description, { n: fights.length }) : undefined}>
      {!fights ? (
        <Skeleton className="cut h-[360px]" />
      ) : fights.length < ENOUGH ? (
        <EmptyState>{text.fights.empty}</EmptyState>
      ) : (
        <div className="space-y-10">
          <div className="space-y-4">
            <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{T.classes}</h3>
            <Tabs
              label={T.classes}
              idPrefix="classes"
              value={view}
              onChange={setView}
              items={[
                { id: "used", label: T.used },
                { id: "wins", label: T.wins },
                { id: "length", label: T.length },
              ]}
            />
            <TabPanel idPrefix="classes" id={view} className="space-y-3">
              <p className="text-[13px] text-muted">{notes[view]}</p>
              <BarList bars={bars[view]} max={view === "wins" ? 1 : undefined} track={view === "wins"} reference={view === "wins" ? 0.5 : undefined} />
            </TabPanel>
          </div>
          {people.length > 0 && (
            <div className="grid gap-10 sm:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{T.fighters}</h3>
                <BarList bars={most.map((p) => ({ id: p.login, label: who(p), value: p.partidas, display: `${number(p.partidas)} ${text.record.fights}` }))} />
              </div>
              {rate.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{T.rate}</h3>
                  <BarList bars={rate.map((p) => ({ id: p.login, label: who(p), value: p.vitorias / p.partidas, display: `${Math.round((p.vitorias / p.partidas) * 100)}%` }))} max={1} track />
                  <p className="text-[13px] text-muted">{fill(T.rateNote, { n: MIN_DUELS })}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Section>
  )
}
