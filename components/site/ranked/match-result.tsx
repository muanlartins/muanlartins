import { number, signed } from "@/components/site/ranked/format"
import type { Match } from "@/lib/ranked"
import type { Result } from "@/lib/ranked-view"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  W: { pt: "V", en: "W" },
  L: { pt: "D", en: "L" },
  E: { pt: "E", en: "D" },
  win: { pt: "Vitória", en: "Win" },
  loss: { pt: "Derrota", en: "Loss" },
  draw: { pt: "Empate", en: "Draw" },
})

/** A result's letter, V, D or E (a draw), and its word, for whoever reads the page aloud. */
export const resultLetter = (result: Result) => (result === "win" ? T.W : result === "loss" ? T.L : T.E)
export const resultWord = (result: Result) => (result === "win" ? T.win : result === "loss" ? T.loss : T.draw)

/** A result as a square chip in its colour (brand/README.md: wins and losses are `win` and `loss`). */
export function ResultLetter({ result, className }: { result: Result; className?: string }) {
  return (
    <span
      title={resultWord(result)}
      className={cn(
        "grid shrink-0 place-items-center font-semibold",
        result === "win" ? "bg-win text-paper" : result === "loss" ? "bg-loss text-paper" : "bg-zinc-300 text-ink",
        className,
      )}
    >
      <span aria-hidden>{resultLetter(result)}</span>
      <span className="sr-only">{resultWord(result)}</span>
    </span>
  )
}

/** A match at a glance, for a row (a live's chapters): win or loss, score, points won or lost, the total after, my
 * goals · assists · saves. */
export function MatchResult({ match }: { match: Match }) {
  return (
    <>
      <ResultLetter result={match.result} className="h-7 w-7 text-[13px]" />
      <span className="w-12 font-medium text-ink">{match.score ? `${match.score[0]}–${match.score[1]}` : "–"}</span>
      <span className="w-10 text-right text-ink">{match.points != null ? signed(match.points) : ""}</span>
      <span className="w-12 text-right text-muted">{match.mmr != null ? number(match.mmr) : ""}</span>
      {match.me && (
        <span className="whitespace-nowrap text-muted">
          {match.me.goals} · {match.me.assists} · {match.me.saves}
        </span>
      )}
    </>
  )
}
