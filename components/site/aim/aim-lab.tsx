"use client"

import { Crosshair, Swords } from "lucide-react"
import { useState } from "react"
import { CompareRows, type CompareRow } from "@/components/site/aim/compare-rows"
import { FlickRace } from "@/components/site/aim/flick-race"
import { FlickReplay } from "@/components/site/aim/flick-replay"
import { dayMonth, decimal, fill, pct, whole } from "@/components/site/aim/format"
import { MatchOnly } from "@/components/site/aim/match-only"
import { TargetFaces } from "@/components/site/aim/target-faces"
import { Choice, EmptyState, Fold, Section } from "@/components/site/ui"
import { hasPath, type MatchView, type TrainingView } from "@/lib/mira"
import { localize } from "@/lib/site"

const T = localize({
  title: { pt: "Do treino pro jogo", en: "From training to the game" },
  description: {
    pt: "Cada flick (o movimento rápido até o alvo), medido do mesmo jeito no Aimlabs e nos replays das minhas partidas de Valorant.",
    en: "Every flick (the quick move onto the target), measured the same way in Aimlabs and in my Valorant matches' replays.",
  },
  pick: { pt: "Partida", en: "Match" },
  all: { pt: "Todas · {n}", en: "All · {n}" },
  matchMeta: { pt: "{fights} duelos · {flicks} flicks · {shots} tiros", en: "{fights} fights · {flicks} flicks · {shots} shots" },
  allMeta: { pt: "{n} partidas de {from} a {to} · {flicks} flicks", en: "{n} matches from {from} to {to} · {flicks} flicks" },
  replay: { pt: "Flick a flick", en: "Flick by flick" },
  replayHint: {
    pt: "O caminho da mira até a cabeça do inimigo mais perto, como estava na minha tela.",
    en: "The crosshair's way to the nearest enemy's head, as it was on my screen.",
  },
  noReplay: { pt: "Essa partida foi medida antes dos flicks um a um: só os números dela aparecem aqui.", en: "This match was measured before the flicks were kept one by one: only its numbers show here." },
  compare: { pt: "Lado a lado", en: "Side by side" },
  training: { pt: "Treino · Aimlabs", en: "Training · Aimlabs" },
  trainingWhen: { pt: "Treino · Aimlabs, {when}", en: "Training · Aimlabs, {when}" },
  match: { pt: "Partida · {name}", en: "Match · {name}" },
  allMatches: { pt: "Partidas · todas", en: "Matches · all" },
  noMatches: {
    pt: "As partidas entram aqui assim que o replay da primeira for medido: cada flick, ao lado do treino.",
    en: "Matches show up here once the first one's replay is measured: every flick, beside the training.",
  },
  noTraining: { pt: "O treino entra aqui depois do primeiro dia de cenários de clique no Aimlabs.", en: "Training shows up here after the first day of click scenarios in Aimlabs." },
  rowHits: { pt: "O primeiro tiro acertou", en: "The first shot hit" },
  rowCovers: { pt: "O primeiro movimento cobre", en: "The first movement covers" },
  rowShort: { pt: "Paro antes do alvo", en: "Stop short of the target" },
  rowPast: { pt: "Passo do alvo", en: "Go past the target" },
  rowMoving: { pt: "Clico com a mira andando", en: "Click with the crosshair moving" },
  rowCorrections: { pt: "Correções por flick", en: "Corrections per flick" },
  rowTime: { pt: "Do começo do flick ao clique", en: "From the flick's start to the click" },
  race: { pt: "O flick típico", en: "The typical flick" },
  raceHint: { pt: "Quanto do caminho a mira já fez, no flick do meio de cada um.", en: "How much of the way the crosshair has done, in each one's middle flick." },
  faces: { pt: "Onde o primeiro tiro caiu", en: "Where the first shot landed" },
  only: { pt: "Na partida", en: "In the match" },
  onlyHint: { pt: "O que o Aimlabs não tem: onde a mira esperou, onde os tiros acertaram e o tiro andando.", en: "What Aimlabs doesn't have: where the crosshair waited, where the shots hit and shooting on the move." },
  how: { pt: "Como funciona", en: "How it works" },
  howTraining: {
    pt: "No treino, os replays do próprio Aimlabs nos cenários de clique: o caminho da mira desde o tiro anterior até o clique, contra o alvo se mexendo. É flick quando a mira precisou andar mais de três vezes o tamanho do alvo.",
    en: "In training, Aimlabs' own replays of the click scenarios: the crosshair's way from the shot before to the click, against the moving target. It's a flick when the crosshair had to travel more than three times the target's size.",
  },
  howMatch: {
    pt: "Nas partidas, o replay que o Valorant grava no servidor, com a mesma conta: o flick é o primeiro tiro de cada duelo, e o alvo é a cabeça do inimigo mais perto da mira, como ele estava na minha tela. Antes de usar uma partida, a mira reconstruída tem que passar a menos de 1° de onde as minhas balas bateram. Os acertos e as partes do corpo são os mesmos do resumo da Riot.",
    en: "In matches, the replay Valorant records on its server, measured the same way: the flick is each fight's first shot, and the target the head of the enemy nearest the crosshair, as it was on my screen. Before a match is used, the rebuilt crosshair must pass within 1° of where my bullets landed. The hits and body parts match Riot's own summary.",
  },
  howLimits: {
    pt: "O replay não tem as paredes, então não sabe quem eu via: a medida é do movimento, não da visão. Um flick que começou mais de 0,8 s antes do tiro conta a partir daí. E a cabeça desenhada é onde metade dos tiros na cabeça da partida bateram: ela se mexe com a animação do corpo, que o replay não grava, então um tiro na cabeça pode cair fora do círculo.",
    en: "The replay has no walls, so it can't tell whom I saw: this measures the movement, not the sight. A flick that began more than 0.8 s before the shot counts from there. And the head drawn is where half the match's headshots landed: it moves with the body's animation, which the replay doesn't record, so a headshot can land outside the circle.",
  },
})

/** A match's name in the picker and the labels: "21/11 · Summit · Sova". */
const nameOf = (m: MatchView) => `${dayMonth(m.to)} · ${m.map} · ${m.agent}`

/**
 * The aim tool, front and centre (lib/mira.ts): a match picked (the latest by default, or all of the window's
 * together), its flicks replayed one by one or all at once, the training beside it measure by measure and as two
 * typical flicks racing, where the first shots landed around the target in each, and what only the match has.
 */
export function AimLab({ training, matches }: { training: TrainingView | null; matches: MatchView[] }) {
  const [picked, setPicked] = useState(matches.find((m) => m.id !== "all")?.id ?? matches[0]?.id)
  const match = matches.find((m) => m.id === picked) ?? matches[0]

  if (!match) {
    return (
      <Section title={T.title} icon={Crosshair} description={T.description}>
        <EmptyState>{T.noMatches}</EmptyState>
      </Section>
    )
  }

  const paths = match.each.filter(hasPath)
  const matchLabel = match.id === "all" ? T.allMatches : fill(T.match, { name: nameOf(match) })
  const trainingLabel = training ? fill(T.trainingWhen, { when: training.from === training.to ? dayMonth(training.to) : `${dayMonth(training.from)}–${dayMonth(training.to)}` }) : T.training
  const t = training
  const rows: CompareRow[] = [
    { label: T.rowHits, training: t?.flickHits ?? null, match: match.flickHits, max: 1, format: pct },
    { label: T.rowCovers, training: t?.covers ?? null, match: match.covers, max: 1.2, format: pct },
    { label: T.rowShort, training: t?.short ?? null, match: match.short, max: 1, format: pct },
    { label: T.rowPast, training: t?.past ?? null, match: match.past, max: 1, format: pct },
    { label: T.rowMoving, training: t?.moving ?? null, match: match.moving, max: 1, format: pct },
    { label: T.rowCorrections, training: t?.corrections ?? null, match: match.corrections, max: 4, format: (v) => decimal(v) },
    { label: T.rowTime, training: t?.movement ?? null, match: match.movement, max: 800, format: (v) => `${whole(v)} ms` },
  ]
  const lanes = [
    ...(t && t.curve.length > 1 ? [{ side: "training" as const, name: trainingLabel, curve: t.curve }] : []),
    ...(match.curve.length > 1 ? [{ side: "match" as const, name: matchLabel, curve: match.curve }] : []),
  ]

  return (
    <>
      <Section title={T.title} icon={Crosshair} description={T.description}>
        <div className="space-y-12">
          <div className="space-y-4">
            {matches.length > 1 && (
              <div role="group" aria-label={T.pick} className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                {matches.map((m) => (
                  <Choice key={m.id} size="sm" on={m.id === match.id} onClick={() => setPicked(m.id)} className="shrink-0 tabular-nums">
                    {m.id === "all" ? fill(T.all, { n: m.matches }) : nameOf(m)}
                  </Choice>
                ))}
              </div>
            )}
            <p className="text-[13px] tabular-nums text-muted">
              {match.id === "all"
                ? fill(T.allMeta, { n: match.matches, from: dayMonth(match.from), to: dayMonth(match.to), flicks: match.flicks })
                : `${nameOf(match)} · ${fill(T.matchMeta, { fights: match.fights, flicks: match.flicks, shots: match.shots })}`}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{T.replay}</h3>
              <p className="text-[13px] leading-[1.5] text-muted">{T.replayHint}</p>
            </div>
            {paths.length ? <FlickReplay key={match.id} flicks={paths} side="match" curve={match.curve} /> : <EmptyState>{T.noReplay}</EmptyState>}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{T.compare}</h3>
            <CompareRows rows={rows} labels={[trainingLabel, matchLabel]} />
            {!t && <p className="text-[13px] text-muted">{T.noTraining}</p>}
          </div>

          {lanes.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{T.race}</h3>
                <p className="text-[13px] leading-[1.5] text-muted">{T.raceHint}</p>
              </div>
              <FlickRace key={match.id} lanes={lanes} />
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{T.faces}</h3>
            <TargetFaces training={t?.each ?? null} match={match.each.length ? match.each : null} />
          </div>

          <Fold summary={T.how}>
            <div className="space-y-3">
              <p>{T.howTraining}</p>
              <p>{T.howMatch}</p>
              <p>{T.howLimits}</p>
            </div>
          </Fold>
        </div>
      </Section>

      <Section title={T.only} icon={Swords} description={T.onlyHint}>
        <p className="mb-4 text-[13px] tabular-nums text-muted">{match.id === "all" ? T.allMatches : nameOf(match)}</p>
        <MatchOnly match={match} />
      </Section>
    </>
  )
}
