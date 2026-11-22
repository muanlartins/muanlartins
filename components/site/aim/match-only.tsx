import { decimal, fill, median, pct, quantile } from "@/components/site/aim/format"
import { BarList, Card } from "@/components/site/ui"
import { startOf, type MatchView } from "@/lib/mira"
import { localize } from "@/lib/site"

const T = localize({
  placement: { pt: "Onde a mira esperou", en: "Where the crosshair waited" },
  placementLine: {
    pt: "{median} da cabeça, metade das vezes entre {low} e {high}",
    en: "{median} from the head, half the time between {low} and {high}",
  },
  placementNote: { pt: "Antes de cada duelo, do lado da cabeça do inimigo mais perto: cada ponto é um flick.", en: "Before each fight, beside the nearest enemy's head: each dot is a flick." },
  placementNoteOld: { pt: "Antes de cada duelo, do lado da cabeça do inimigo mais perto.", en: "Before each fight, beside the nearest enemy's head." },
  above: { pt: "{v} acima", en: "{v} above" },
  below: { pt: "{v} abaixo", en: "{v} below" },
  level: { pt: "na altura", en: "level" },
  headShort: { pt: "cabeça", en: "head" },
  up: { pt: "acima", en: "above" },
  down: { pt: "abaixo", en: "below" },
  label: { pt: "Altura da mira antes de cada duelo, em graus da cabeça: {values}", en: "The crosshair's height before each fight, in degrees from the head: {values}" },
  bones: { pt: "Onde os tiros acertaram", en: "Where the shots hit" },
  bonesLine: { pt: "{hits} de {shots} tiros acertaram ({pct}), sprays inclusos", en: "{hits} of {shots} shots hit ({pct}), sprays included" },
  head: { pt: "Cabeça", en: "Head" },
  body: { pt: "Corpo", en: "Body" },
  legs: { pt: "Pernas", en: "Legs" },
  walking: { pt: "O primeiro tiro andando", en: "The first shot walking" },
  walkingLine: { pt: "Em {pct} dos duelos eu atirei andando.", en: "In {pct} of the fights I shot walking." },
  still: { pt: "Parado, acertou", en: "Still, hit" },
  moving: { pt: "Andando, acertou", en: "Walking, hit" },
})

/** Degrees off the head as words: "0,3° abaixo", "1,3° acima", "na altura". `y` is down-positive. */
function side(y: number) {
  if (Math.abs(y) < 0.05) return T.level
  return fill(y > 0 ? T.below : T.above, { v: `${decimal(Math.abs(y))}°` })
}

/** The frame of the placement's picture, in degrees from the head (down positive). */
const TOP = -3
const BOTTOM = 5

/**
 * What only a match has: where the crosshair waited before each fight (above or below the head, each flick a dot
 * beside a head drawn to scale, the middle half shaded), where the hits landed (head, body, legs, as Riot counts them)
 * and the first shot walking against standing.
 */
export function MatchOnly({ match }: { match: MatchView }) {
  const starts = match.each.map((f) => startOf(f)[1])
  const fromFlicks = starts.length >= 4
  // The flicks' own starts when the file has them; else the match's numbers (above positive there).
  const mid = fromFlicks ? median(starts) : match.height === null ? null : -match.height
  const low = fromFlicks ? quantile(starts, 0.25) : match.heightRange ? -match.heightRange[1] : null
  const high = fromFlicks ? quantile(starts, 0.75) : match.heightRange ? -match.heightRange[0] : null
  const head = median(match.each.map((f) => f.raio)) ?? match.target
  const hits = match.bones.cabeca + match.bones.corpo + match.bones.perna

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {mid !== null && (
        <Card className="space-y-3 sm:row-span-2">
          <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{T.placement}</h3>
          <p className="text-[15px] leading-[1.5] text-ink">
            {low !== null && high !== null ? fill(T.placementLine, { median: side(mid), low: side(high), high: side(low) }) : side(mid)}
          </p>
          <Placement starts={fromFlicks ? starts : []} mid={mid} low={low} high={high} head={head} />
          <p className="text-[13px] leading-[1.5] text-muted">{fromFlicks ? T.placementNote : T.placementNoteOld}</p>
        </Card>
      )}
      {hits > 0 && (
        <Card className="space-y-3">
          <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{T.bones}</h3>
          <BarList
            track
            max={hits}
            bars={[
              { id: "cabeca", label: T.head, value: match.bones.cabeca, display: `${match.bones.cabeca} · ${pct(match.bones.cabeca / hits)}` },
              { id: "corpo", label: T.body, value: match.bones.corpo, display: `${match.bones.corpo} · ${pct(match.bones.corpo / hits)}` },
              { id: "perna", label: T.legs, value: match.bones.perna, display: `${match.bones.perna} · ${pct(match.bones.perna / hits)}` },
            ]}
          />
          <p className="text-[13px] leading-[1.5] text-muted">{fill(T.bonesLine, { hits, shots: match.shots, pct: pct(hits / Math.max(1, match.shots)) })}</p>
        </Card>
      )}
      {match.walking !== null && (
        <Card className="space-y-3">
          <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{T.walking}</h3>
          <p className="text-[15px] leading-[1.5] text-ink">{fill(T.walkingLine, { pct: pct(match.walking) })}</p>
          {(match.hitStanding !== null || match.hitWalking !== null) && (
            <BarList
              track
              max={1}
              bars={[
                { id: "still", label: T.still, value: match.hitStanding ?? 0, display: pct(match.hitStanding), faint: match.hitStanding === null },
                { id: "moving", label: T.moving, value: match.hitWalking ?? 0, display: pct(match.hitWalking), faint: match.hitWalking === null },
              ]}
            />
          )}
        </Card>
      )}
    </div>
  )
}

/**
 * The placement as a picture: a head to scale (its radius in degrees) on the left, each flick's height before the
 * fight as a dot in the strip beside it, the middle half shaded and the median a line, the head's height dashed.
 */
function Placement({ starts, mid, low, high, head }: { starts: number[]; mid: number; low: number | null; high: number | null; head: number }) {
  const W = 320
  const H = 240
  const y = (deg: number) => 16 + ((Math.min(BOTTOM, Math.max(TOP, deg)) - TOP) / (BOTTOM - TOP)) * (H - 32)
  const s = (H - 32) / (BOTTOM - TOP)
  const hx = 72
  const r = head * s
  const strip = { from: 128, to: W - 12 }
  const at = (pts: [number, number][]) => pts.map(([px, py]) => `${hx + px * r},${y(0) + py * r}`).join(" ")
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={fill(T.label, { values: starts.length ? starts.map((v) => side(v)).join(", ") : side(mid) })}>
        {low !== null && high !== null && <rect x={strip.from - 8} y={y(low)} width={strip.to - strip.from + 16} height={Math.max(2, y(high) - y(low))} className="fill-klein/15" />}
        <line x1={8} x2={W - 4} y1={y(0)} y2={y(0)} className="stroke-ink/40" strokeWidth={1} strokeDasharray="4 4" />
        <polygon points={at([[-1.25, 1.55], [1.25, 1.55], [3.1, 2.5], [3.5, 40], [-3.5, 40], [-3.1, 2.5]])} className="fill-klein/[0.08]" />
        <circle cx={hx} cy={y(0)} r={Math.max(2, r)} className="fill-klein/15 stroke-klein" strokeWidth={1.5} />
        {starts.map((v, i) => (
          <circle
            key={i}
            cx={strip.from + ((i * 0.618034) % 1) * (strip.to - strip.from)}
            cy={y(v)}
            r={4}
            className={v < TOP || v > BOTTOM ? "fill-navy/40" : "fill-navy"}
          />
        ))}
        <line x1={strip.from - 8} x2={strip.to + 8} y1={y(mid)} y2={y(mid)} className="stroke-klein" strokeWidth={2.5} />
      </svg>
      <span className="pointer-events-none absolute left-2 top-0 text-[12px] text-muted">{T.up}</span>
      <span className="pointer-events-none absolute bottom-0 left-2 text-[12px] text-muted">{T.down}</span>
      <span className="pointer-events-none absolute left-0 w-[16%] text-right text-[12px] text-muted" style={{ top: `calc(${(y(0) / H) * 100}% - 9px)` }}>
        {T.headShort}
      </span>
    </div>
  )
}
