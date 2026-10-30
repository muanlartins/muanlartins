import { signed } from "@/components/site/ranked/format"
import type { Match } from "@/lib/ranked"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  W: { pt: "V", en: "W" },
  L: { pt: "D", en: "L" },
})

/** A match at a glance, for a row: win or loss, score, points won or lost, the total after, my goals · assists · saves. */
export function MatchResult({ match }: { match: Match }) {
  const win = match.result === "win"
  return (
    <>
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[13px] font-semibold",
          win ? "bg-klein text-paper" : "border border-zinc-300 text-muted",
        )}
      >
        {win ? T.W : T.L}
      </span>
      <span className="w-12 font-medium text-ink">{match.score ? `${match.score[0]}–${match.score[1]}` : "–"}</span>
      <span className="w-10 text-right text-ink">{match.points != null ? signed(match.points) : ""}</span>
      <span className="w-12 text-right text-muted">{match.mmr ?? ""}</span>
      {match.me && (
        <span className="whitespace-nowrap text-muted">
          {match.me.goals} · {match.me.assists} · {match.me.saves}
        </span>
      )}
    </>
  )
}
