import { FlickCurve } from "@/components/site/aim/flick-curve"
import { longDate } from "@/components/site/ranked/format"
import type { MiraSummary, RankedSummary } from "@/lib/mira"
import { LOCALE, localize } from "@/lib/site"

// Copy drafted for Luan to revise.
const T = localize({
  lead: {
    pt: "Nas partidas, o primeiro movimento leva a mira a {covers} do caminho até a cabeça, e eu corrijo {corrections} vezes por flick.",
    en: "In matches, the first movement takes the crosshair {covers} of the way to the head, and I correct {corrections} times per flick.",
  },
  leadBoth: {
    pt: "No treino, o primeiro movimento leva a mira a {coversTrain} do caminho, e eu corrijo {correctionsTrain} vezes por flick; nas partidas, {covers} e {corrections}.",
    en: "In training, the first movement takes the crosshair {coversTrain} of the way and I correct {correctionsTrain} times per flick; in matches, {covers} and {corrections}.",
  },
  measure: { pt: "Medida", en: "Measure" },
  training: { pt: "Treino", en: "Training" },
  trainingNote: { pt: "Aimlabs", en: "Aimlabs" },
  matches: { pt: "Partidas", en: "Matches" },
  matchesNote: { pt: "Valorant", en: "Valorant" },
  covers: { pt: "O primeiro movimento cobre", en: "The first movement covers" },
  short: { pt: "Paro antes do alvo", en: "Stop short" },
  past: { pt: "Passo do alvo", en: "Go past it" },
  corrections: { pt: "Correções por flick", en: "Corrections per flick" },
  clickMoving: { pt: "Clico com a mira andando", en: "Click with the crosshair moving" },
  shake: { pt: "Tremedeira", en: "Shake" },
  movement: { pt: "Do começo do flick ao clique", en: "From the flick's start to the click" },
  curve: { pt: "O flick típico, no treino e nas partidas", en: "The typical flick, in training and in matches" },
  curveHint: {
    pt: "Quanto do caminho até o alvo a mira já fez, a cada 50 ms, no flick do meio de cada um.",
    en: "How much of the way to the target the crosshair has done, every 50 ms, in each one's middle flick.",
  },
  onlyMatches: { pt: "O que só a partida tem", en: "What only a match has" },
  accuracy: { pt: "Tiros que acertaram", en: "Shots that hit" },
  accuracyNote: { pt: "de {shots} disparados, sprays inclusos", en: "of {shots} fired, sprays included" },
  head: { pt: "Na cabeça", en: "In the head" },
  headNote: { pt: "dos {hits} acertos", en: "of the {hits} hits" },
  walking: { pt: "Primeiro tiro andando", en: "First shot walking" },
  walkingNote: { pt: "acerto {walking} assim, {standing} parado", en: "{walking} hits that way, {standing} standing" },
  height: { pt: "Mira antes do duelo", en: "Crosshair before the fight" },
  heightNote: { pt: "da cabeça; metade das vezes entre {low} e {high}", en: "from the head; half the time between {low} and {high}" },
  above: { pt: "{v} acima", en: "{v} above" },
  below: { pt: "{v} abaixo", en: "{v} below" },
  perMatch: { pt: "Por partida", en: "By match" },
  day: { pt: "Dia", en: "Day" },
  map: { pt: "Mapa", en: "Map" },
  agent: { pt: "Agente", en: "Agent" },
  flicks: { pt: "Flicks", en: "Flicks" },
  hits: { pt: "Acerto", en: "Hits" },
  method: {
    pt: "Lido dos replays das partidas ({matches} partidas, {flicks} flicks, {when}) e medido pela mesma conta do treino: o flick é o primeiro tiro de cada duelo, o alvo é a cabeça do inimigo mais perto da mira, como ele estava na minha tela. O replay não tem as paredes, então não sabe quem eu via: a medida é do movimento, não da visão.",
    en: "Read from the matches' replays ({matches} matches, {flicks} flicks, {when}) and measured the same way as the training: the flick is each fight's first shot, the target the head of the enemy nearest the crosshair, as it was on my screen. The replay has no walls, so it can't say whom I saw: this measures the movement, not the sight.",
  },
  span: { pt: "de {from} a {to}", en: "{from} to {to}" },
  on: { pt: "em {day}", en: "on {day}" },
})

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""))
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "–" : `${Math.round(v * 100)}%`)
const number = (v: number, digits = 1) => v.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en", { maximumFractionDigits: digits, minimumFractionDigits: digits })
const degrees = (v: number) => `${number(Math.abs(v))}°`
const side = (v: number) => fill(v >= 0 ? T.above : T.below, { v: degrees(v) })
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${degrees(v)}`
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })

/**
 * The training beside the matches (lib/mira.ts: Aimlabs' replays and Valorant's, measured by the same function): each
 * measure in two columns, the two typical flicks on one chart, what only a match has (the shots that hit, the head, the
 * first shot walking, where the crosshair waited) and each match.
 */
export function RankedComparison({ ranked, training }: { ranked: RankedSummary; training: MiraSummary | null }) {
  const r = ranked
  const t = training
  const hits = r.bones.cabeca + r.bones.corpo + r.bones.perna
  const values = {
    covers: pct(r.covers),
    corrections: number(r.corrections),
    coversTrain: pct(t?.covers),
    correctionsTrain: t ? number(t.corrections) : "–",
  }
  const when = r.from === r.to ? fill(T.on, { day: longDate(r.to) }) : fill(T.span, { from: longDate(r.from), to: longDate(r.to) })
  const rows: [string, string | null, string][] = [
    [T.covers, t ? pct(t.covers) : null, pct(r.covers)],
    [T.short, t ? pct(t.short) : null, pct(r.short)],
    [T.past, t ? pct(t.past) : null, pct(r.past)],
    [T.corrections, t ? number(t.corrections) : null, number(r.corrections)],
    [T.clickMoving, t ? pct(t.moving) : null, pct(r.moving)],
    [T.shake, t ? pct(t.shake) : null, pct(r.shake)],
    [T.movement, t ? `${Math.round(t.movement)} ms` : null, `${Math.round(r.movement)} ms`],
  ]
  return (
    <div className="space-y-8">
      <p className="max-w-[42rem] text-[16px] leading-[1.6] text-ink">{fill(t ? T.leadBoth : T.lead, values)}</p>

      <div className="overflow-x-auto rounded-md border border-line bg-paper/70">
        <table className="w-full text-left text-[14px] tabular-nums">
          <thead className="text-[12px] text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">{T.measure}</th>
              {t && (
                <th className="px-3 py-2 text-right font-medium">
                  {T.training} <span className="block font-normal text-muted sm:ml-1 sm:inline">{T.trainingNote}</span>
                </th>
              )}
              <th className="px-3 py-2 text-right font-medium">
                {T.matches} <span className="block font-normal text-muted sm:ml-1 sm:inline">{T.matchesNote}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, train, match]) => (
              <tr key={label}>
                <td className="px-3 py-2 text-ink">{label}</td>
                {t && <td className="whitespace-nowrap px-3 py-2 text-right text-ink">{train}</td>}
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-ink">{match}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.curve.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-[15px] font-medium text-ink">{T.curve}</h3>
          <p className="max-w-[42rem] text-[13px] leading-[1.5] text-muted">{T.curveHint}</p>
          {t && t.curve.length > 1 && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="w-5 border-t-2 border-[#1d4fd1]" />
                {T.training}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-5 border-t-2 border-dashed border-navy" />
                {T.matches}
              </span>
            </div>
          )}
          {t && t.curve.length > 1 ? <FlickCurve values={t.curve} compare={r.curve} labels={[T.training, T.matches]} /> : <FlickCurve values={r.curve} />}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-[15px] font-medium text-ink">{T.onlyMatches}</h3>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label={T.accuracy} value={pct(r.accuracy)} note={fill(T.accuracyNote, { shots: r.shots })} />
          <Tile label={T.head} value={pct(hits ? r.bones.cabeca / hits : null)} note={fill(T.headNote, { hits })} />
          <Tile
            label={T.walking}
            value={pct(r.walking)}
            note={r.hitWalking !== null && r.hitStanding !== null ? fill(T.walkingNote, { walking: pct(r.hitWalking), standing: pct(r.hitStanding) }) : undefined}
          />
          {r.height !== null && (
            <Tile
              label={T.height}
              value={side(r.height)}
              note={r.heightRange ? fill(T.heightNote, { low: signed(r.heightRange[0]), high: signed(r.heightRange[1]) }) : undefined}
            />
          )}
        </dl>
      </div>

      {r.matches.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-medium text-ink">{T.perMatch}</h3>
          <div className="overflow-x-auto rounded-md border border-line bg-paper/70">
            <table className="w-full min-w-[34rem] text-left text-[14px] tabular-nums">
              <thead className="text-[12px] text-muted">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">{T.day}</th>
                  <th className="px-3 py-2 font-medium">{T.map}</th>
                  <th className="px-3 py-2 font-medium">{T.agent}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.flicks}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.hits}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.short}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.corrections}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...r.matches].reverse().map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-muted">{longDate(dayOf(m.at))}</td>
                    <td className="px-3 py-2 font-medium text-ink">{m.map}</td>
                    <td className="px-3 py-2 text-ink">{m.agent}</td>
                    <td className="px-3 py-2 text-right text-muted">{m.flicks}</td>
                    <td className="px-3 py-2 text-right text-ink">{pct(m.acertos / Math.max(1, m.tiros))}</td>
                    <td className="px-3 py-2 text-right text-ink">{pct(m.curto)}</td>
                    <td className="px-3 py-2 text-right text-ink">{number(m.correcoes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="max-w-[42rem] text-[12px] leading-[1.6] text-muted">{fill(T.method, { matches: r.matches.length, flicks: r.flicks, when })}</p>
    </div>
  )
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-line px-4 py-3">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{value}</dd>
      {note && <dd className="text-[12px] leading-[1.4] text-muted">{note}</dd>}
    </div>
  )
}
