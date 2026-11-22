import { fill, pct } from "@/components/site/aim/format"
import { Legend, Mark, type Side } from "@/components/site/aim/marks"
import { EmptyState } from "@/components/site/ui"
import { clickOf, type MiraFlick } from "@/lib/mira"
import { localize } from "@/lib/site"

const T = localize({
  training: { pt: "Treino", en: "Training" },
  match: { pt: "Partida", en: "Match" },
  label: {
    pt: "Onde o primeiro tiro de cada flick caiu, em tamanhos de alvo do centro: {n} flicks, {hits} acertaram",
    en: "Where each flick's first shot landed, in target sizes from the centre: {n} flicks, {hits} hit",
  },
  hit: { pt: "Acertou", en: "Hit" },
  head: { pt: "Na cabeça", en: "In the head" },
  noTraining: {
    pt: "Os flicks do treino entram aqui um a um a partir do próximo benchmark.",
    en: "The training's flicks show up here one by one from the next benchmark on.",
  },
  noMatch: { pt: "Essa partida foi medida antes dos flicks um a um.", en: "This match was measured before the flicks were kept one by one." },
  headHit: { pt: "acertou a cabeça", en: "hit the head" },
  bodyHit: { pt: "acertou o corpo ou as pernas", en: "hit the body or the legs" },
  hitShort: { pt: "acertou", en: "hit" },
  missed: { pt: "errou", en: "missed" },
  scale: { pt: "Cada anel é um tamanho de alvo do centro.", en: "Each ring is one target size from the centre." },
})

/** The face's frame, in target radii (x right, y down): room for the body under the head. */
const X = 5
const TOP = -4
const BOTTOM = 7

/**
 * Where each flick's click landed around the target, side by side for the training and the match: in target sizes
 * from its centre (a click at 1 is on the target's edge), so Aimlabs' spheres and a Valorant head compare. The match
 * draws the head with the shoulders under it, its hits in the head in Klein; clicks off the frame sit on its edge.
 */
export function TargetFaces({ training, match }: { training: MiraFlick[] | null; match: MiraFlick[] | null }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Face side="training" flicks={training} />
        <Face side="match" flicks={match} />
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Legend side="training" /> <Legend side="training" hollow /> {T.training}: {T.hitShort} · {T.missed}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Legend side="match" tone="klein" /> {T.headHit}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Legend side="match" /> {T.bodyHit}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Legend side="match" hollow /> {T.missed}
        </span>
      </p>
      <p className="text-[13px] text-muted">{T.scale}</p>
    </div>
  )
}

function Face({ side, flicks }: { side: Side; flicks: MiraFlick[] | null }) {
  const title = side === "training" ? T.training : T.match
  if (!flicks?.length) {
    return (
      <figure className="space-y-2">
        <figcaption className="text-[15px] font-medium text-ink">{title}</figcaption>
        <EmptyState className="grid aspect-[10/11] place-items-center px-4 text-center text-[13px]">{side === "training" ? T.noTraining : T.noMatch}</EmptyState>
      </figure>
    )
  }
  const hits = flicks.filter((f) => f.acertou).length
  const heads = flicks.filter((f) => f.osso === "cabeca").length
  const points = flicks.map((f) => {
    const [x, y] = clickOf(f)
    const px = x / f.raio
    const py = y / f.raio
    const inside = Math.abs(px) <= X - 0.3 && py >= TOP + 0.3 && py <= BOTTOM - 0.3
    return { f, x: Math.max(-X + 0.3, Math.min(X - 0.3, px)), y: Math.max(TOP + 0.3, Math.min(BOTTOM - 0.3, py)), inside }
  })
  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[15px] font-medium text-ink">{title}</span>
        <span className="text-[13px] tabular-nums text-muted">
          {T.hit} <span className="font-semibold text-ink">{pct(hits / flicks.length)}</span>
          {side === "match" && (
            <>
              {" · "}
              {T.head} <span className="font-semibold text-ink">{pct(heads / flicks.length)}</span>
            </>
          )}
        </span>
      </figcaption>
      <div className="cut cut-edge relative border border-line bg-paper/70">
        <svg viewBox={`${-X} ${TOP} ${2 * X} ${BOTTOM - TOP}`} className="block h-auto w-full" role="img" aria-label={fill(T.label, { n: flicks.length, hits })}>
          {[2, 3].map((r) => (
            <circle key={r} cx={0} cy={0} r={r} fill="none" className="stroke-line" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          ))}
          {side === "match" && (
            <g className="fill-klein/[0.07]">
              <polygon points="-1.25,1.55 1.25,1.55 3.1,2.5 3.5,8 -3.5,8 -3.1,2.5" />
              <polygon points="-0.42,0.8 0.42,0.8 0.42,1.7 -0.42,1.7" />
            </g>
          )}
          <circle cx={0} cy={0} r={1} className="fill-klein/10 stroke-klein" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          {points.map(({ f, x, y, inside }, i) => (
            <Mark
              key={i}
              side={side}
              x={x}
              y={y}
              r={inside ? 0.26 : 0.16}
              hollow={!f.acertou}
              tone={side === "match" && f.osso === "cabeca" ? "klein" : undefined}
              className={inside ? undefined : "opacity-40"}
            />
          ))}
        </svg>
      </div>
    </figure>
  )
}
