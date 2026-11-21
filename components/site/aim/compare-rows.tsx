import { Legend, Mark } from "@/components/site/aim/marks"

export type CompareRow = {
  label: string
  /** The training's value and the match's, on the row's own scale (0 to max); null when one has none. */
  training: number | null
  match: number | null
  max: number
  /** Each value as written. */
  format: (v: number) => string
}

/**
 * The training and the match on one line per measure: a track from 0 to the measure's end, the training's circle and
 * the match's diamond on it, joined, and both values written beside it, so nothing hides behind a hover.
 */
export function CompareRows({ rows, labels }: { rows: CompareRow[]; labels: [string, string] }) {
  return (
    <div className="space-y-3">
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Legend side="training" /> {labels[0]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Legend side="match" /> {labels[1]}
        </span>
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((row) => {
          const at = (v: number) => Math.min(100, Math.max(0, (v / row.max) * 100))
          const both = row.training !== null && row.match !== null
          return (
            <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_7.5rem]">
              <span className="text-[15px] text-ink">{row.label}</span>
              <span className="text-right text-[15px] tabular-nums text-ink sm:order-3">
                {row.training !== null && (
                  <span className="text-muted">
                    <span className="sr-only">{labels[0]}: </span>
                    {row.format(row.training)}
                  </span>
                )}
                {both && <span className="text-muted"> · </span>}
                {row.match !== null && (
                  <span className="font-semibold">
                    <span className="sr-only">{labels[1]}: </span>
                    {row.format(row.match)}
                  </span>
                )}
              </span>
              <span aria-hidden className="relative col-span-2 h-5 sm:order-2 sm:col-span-1">
                <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-line" />
                {both && (
                  <span
                    className="absolute top-1/2 h-1 -translate-y-1/2 bg-klein/35"
                    style={{ left: `${Math.min(at(row.training!), at(row.match!))}%`, width: `${Math.abs(at(row.training!) - at(row.match!))}%` }}
                  />
                )}
                {row.training !== null && <Dot left={at(row.training)} side="training" />}
                {row.match !== null && <Dot left={at(row.match)} side="match" />}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Dot({ left, side }: { left: number; side: "training" | "match" }) {
  return (
    <svg width={16} height={16} viewBox="-8 -8 16 16" className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible" style={{ left: `${left}%` }}>
      <Mark side={side} x={0} y={0} r={5.5} />
    </svg>
  )
}
