import { Rotate3d } from "lucide-react"
import { ButtonLink } from "@/components/site/ui"
import { rlrHref } from "@/lib/ranked"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  open: { pt: "Assistir no RLR", en: "Watch in RLR" },
  hint: { pt: "O replay da partida em 3D no RLR, numa aba nova", en: "The match's replay in 3D in RLR, in a new tab" },
})

/** "Assistir no RLR" (brand/voz.md: a replay is watched): a match's replay in RLR, the replay player, in a new tab (RLR is an app of its own, not a page of the
 * site). Shown on the ranked record's rows and on a live's chapters. */
export function RlrLink({ replay, className }: { replay: string; className?: string }) {
  return (
    <ButtonLink
      href={rlrHref(replay)}
      external
      variant="quiet"
      size="sm"
      title={T.hint}
      icon={<Rotate3d aria-hidden className="h-4 w-4 shrink-0" />}
      className={cn("min-h-6 whitespace-nowrap", className)}
    >
      {T.open}
    </ButtonLink>
  )
}
