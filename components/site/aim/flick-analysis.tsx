import { FirstMoveChart } from "@/components/site/aim/first-move-chart"
import { FlickCurve } from "@/components/site/aim/flick-curve"
import { longDate } from "@/components/site/ranked/format"
import { ninetyAt, type MiraSummary } from "@/lib/mira"
import { LOCALE, localize } from "@/lib/site"

const T = localize({
  lead: {
    pt: "Nos flicks, o primeiro movimento leva a mira a {covers} do caminho: eu paro antes do alvo em {short} das vezes e passo dele em {past}.",
    en: "In my flicks, the first movement takes the crosshair {covers} of the way: I stop short of the target {short} of the time and go past it {past}.",
  },
  moving: {
    pt: "Clicando com a mira ainda andando, acerto {moving}; com ela parada, {still}.",
    en: "Clicking with the crosshair still moving, I hit {moving}; with it still, {still}.",
  },
  short: { pt: "Paro antes do alvo", en: "Stop short" },
  shortNote: { pt: "o primeiro movimento termina antes e eu corrijo", en: "the first movement ends early and I correct" },
  past: { pt: "Passo do alvo", en: "Go past it" },
  pastNote: { pt: "a mira passa do alvo antes do clique", en: "the crosshair passes the target before the click" },
  corrections: { pt: "Correções por flick", en: "Corrections per flick" },
  correctionsNote: { pt: "movimentos depois do primeiro", en: "movements after the first one" },
  clickMoving: { pt: "Clico em movimento", en: "Click while moving" },
  clickMovingNote: { pt: "acerto {moving} assim, {still} parado", en: "{moving} hits that way, {still} still" },
  shake: { pt: "Tremedeira", en: "Shake" },
  shakeNote: { pt: "do tamanho do alvo, nos 150 ms antes do clique", en: "of the target's size, in the 150 ms before the click" },
  curve: { pt: "O flick típico", en: "The typical flick" },
  curveHint: {
    pt: "Quanto do caminho até o alvo a mira já fez, a cada 50 ms, no flick do meio. Chego a 90% em {ninety} ms; os últimos 10% levam mais {rest} ms até o clique.",
    en: "How much of the way to the target the crosshair has done, every 50 ms, in the middle flick. I reach 90% in {ninety} ms; the last 10% take another {rest} ms to the click.",
  },
  first: { pt: "Onde o primeiro movimento termina", en: "Where the first movement ends" },
  firstHint: {
    pt: "Cada coluna é uma faixa de 5% do caminho até o centro do alvo. À esquerda da linha, o primeiro movimento parou antes do centro; à direita, passou dele. Perto da linha ainda é dentro do alvo.",
    en: "Each column is a 5% bin of the way to the target's centre. Left of the line, the first movement stopped short of the centre; right of it, past it. Close to the line is still on the target.",
  },
  why: { pt: "Por que errei", en: "Why I missed" },
  whyShort: { pt: "Curto", en: "Short" },
  whyPast: { pt: "Passou", en: "Past" },
  whySide: { pt: "De lado", en: "To the side" },
  whyNote: { pt: "dos {n} erros em flicks: onde a mira estava no clique, ao longo do flick", en: "of the {n} misses in flicks: where the crosshair was at the click, along the flick" },
  tasks: { pt: "Por cenário", en: "By scenario" },
  scenario: { pt: "Cenário", en: "Scenario" },
  flicks: { pt: "Flicks", en: "Flicks" },
  accuracy: { pt: "Acerto", en: "Hits" },
  timing: { pt: "Reação {reaction} ms · flick {movement} ms até o clique", en: "Reaction {reaction} ms · flick {movement} ms to the click" },
  method: {
    pt: "Lido dos replays do próprio Aimlabs nos cenários de clique ({plays} partidas, {flicks} flicks, {when}): o caminho da mira desde o tiro anterior até o clique, contra o alvo se mexendo. É flick quando a mira precisou andar mais de três vezes o tamanho do alvo.",
    en: "Read from Aimlabs' own replays of the click scenarios ({plays} plays, {flicks} flicks, {when}): the crosshair's path from the shot before to the click, against the moving target. It's a flick when the crosshair had to travel more than three times the target's size.",
  },
  span: { pt: "de {from} a {to}", en: "{from} to {to}" },
  on: { pt: "em {day}", en: "on {day}" },
})

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ""))
const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`)
const decimal = (v: number) => v.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en", { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const shortName = (name: string) => name.replace(/^VT /, "").replace(/ S\d+$/, "")

/**
 * How the aim moves, from Aimlabs' replays (scripts/mira.py, lib/mira.ts): the flicks stopping short or going past,
 * the corrections, clicking while moving and its cost, the shake before the click, the typical flick as a curve, why
 * the misses missed and the same by scenario.
 */
export function FlickAnalysis({ summary }: { summary: MiraSummary }) {
  const s = summary
  const misses = s.misses.curto + s.misses.passou + s.misses.lado
  const values = { covers: pct(s.covers), short: pct(s.short), past: pct(s.past), moving: pct(s.hitMoving), still: pct(s.hitStill) }
  const ninety = Math.round(ninetyAt(s.curve))
  const firstTotal = s.firstMove.reduce((a, b) => a + b, 0)
  const when = s.from === s.to ? fill(T.on, { day: longDate(s.to) }) : fill(T.span, { from: longDate(s.from), to: longDate(s.to) })
  return (
    <div className="space-y-8">
      <div className="max-w-[42rem] space-y-2 text-[16px] leading-[1.6] text-ink">
        <p>{fill(T.lead, values)}</p>
        {s.hitMoving !== null && s.hitStill !== null && <p>{fill(T.moving, values)}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label={T.short} value={pct(s.short)} note={T.shortNote} />
        <Tile label={T.past} value={pct(s.past)} note={T.pastNote} />
        <Tile label={T.corrections} value={decimal(s.corrections)} note={T.correctionsNote} />
        <Tile label={T.clickMoving} value={pct(s.moving)} note={s.hitMoving !== null ? fill(T.clickMovingNote, values) : undefined} />
        {s.shake !== null && <Tile label={T.shake} value={pct(s.shake)} note={T.shakeNote} />}
      </dl>
      <p className="text-[13px] tabular-nums text-muted">{fill(T.timing, { reaction: Math.round(s.reaction), movement: Math.round(s.movement) })}</p>

      <div className="space-y-2">
        <h3 className="text-[15px] font-medium text-ink">{T.curve}</h3>
        {ninety > 0 && <p className="max-w-[42rem] text-[13px] leading-[1.5] text-muted">{fill(T.curveHint, { ninety, rest: Math.max(0, Math.round(s.movement - ninety)) })}</p>}
        <FlickCurve values={s.curve} />
      </div>

      {firstTotal > 0 && (
        <div className="space-y-2">
          <h3 className="text-[15px] font-medium text-ink">{T.first}</h3>
          <p className="max-w-[42rem] text-[13px] leading-[1.5] text-muted">{T.firstHint}</p>
          <FirstMoveChart counts={s.firstMove} />
        </div>
      )}

      {misses > 0 && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-medium text-ink">{T.why}</h3>
          <dl className="grid max-w-[32rem] grid-cols-3 gap-3">
            <Tile label={T.whyShort} value={pct(s.misses.curto / misses)} />
            <Tile label={T.whyPast} value={pct(s.misses.passou / misses)} />
            <Tile label={T.whySide} value={pct(s.misses.lado / misses)} />
          </dl>
          <p className="text-[13px] text-muted">{fill(T.whyNote, { n: misses })}</p>
        </div>
      )}

      {s.tasks.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-medium text-ink">{T.tasks}</h3>
          <div className="overflow-x-auto rounded-md border border-line bg-paper/70">
            <table className="w-full min-w-[34rem] text-left text-[14px] tabular-nums">
              <thead className="text-[12px] text-muted">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">{T.scenario}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.flicks}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.accuracy}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.short}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.past}</th>
                  <th className="px-3 py-2 text-right font-medium">{T.clickMoving}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.tasks.map((t) => (
                  <tr key={t.name}>
                    <td className="px-3 py-2 font-medium text-ink">{shortName(t.name)}</td>
                    <td className="px-3 py-2 text-right text-muted">{t.flicks}</td>
                    <td className="px-3 py-2 text-right text-ink">{pct(t.accuracy)}</td>
                    <td className="px-3 py-2 text-right text-ink">{pct(t.short)}</td>
                    <td className="px-3 py-2 text-right text-ink">{pct(t.past)}</td>
                    <td className="px-3 py-2 text-right text-ink">{pct(t.moving)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="max-w-[42rem] text-[12px] leading-[1.6] text-muted">
        {fill(T.method, { plays: s.plays, flicks: s.flicks, when })}
      </p>
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
