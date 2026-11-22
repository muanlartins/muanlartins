import { EPIC_NOTICE, RIOT_NOTICE } from "@/content/notices"
import { localize } from "@/lib/site"

/**
 * Epic's and Riot's notices under a page that shows their games without being one of the games' pages: the channel's
 * pages (rank emblems as the Σ ranks, agents, the lives' and the roadmap's pictures), the mural, the profile and the
 * viewers' pages. The games' pages carry theirs in `credits`, the pages with the cards in `GameArtCredits`.
 */
export function GameNotices() {
  return (
    <p className="mt-16 text-[12px] leading-[1.6] text-muted">
      {localize(EPIC_NOTICE)} {localize(RIOT_NOTICE)}
    </p>
  )
}
