import { FanView } from "@/components/site/profile/fan-view"
import type { Choice, Torcedor } from "@/lib/profile"
import { cn } from "@/lib/utils"

const SIZES = {
  md: { box: "h-[112px] w-[84px]", fan: "h-[78px] w-[52px]", initial: "h-12 w-12 text-[20px]" },
  sm: { box: "h-[68px] w-[52px]", fan: "h-[45px] w-[30px]", initial: "h-8 w-8 text-[14px]" },
}

/**
 * Someone standing on a strip of the stand, the stream crowd's Klein floor: their fan when they signed in with
 * Twitch (by login: the one they built, or the one their login gives them), their initial otherwise.
 */
export function FanSpot({
  T,
  fans,
  login,
  name,
  size = "md",
}: {
  T: Torcedor | null
  fans: Record<string, Choice> | null
  login?: string
  name: string
  size?: keyof typeof SIZES
}) {
  const s = SIZES[size]
  return (
    <div className={cn("relative shrink-0 rounded-sm bg-klein/[0.07]", s.box)} aria-hidden>
      <div
        className="absolute inset-x-0 bottom-0 h-2 rounded-b-sm bg-klein"
        style={{ clipPath: "polygon(5px 0, calc(100% - 5px) 0, 100% 100%, 0 100%)" }}
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        {login && T && fans ? (
          <FanView T={T} fan={T.normalizar(fans[login] ?? null, login)} className={s.fan} />
        ) : (
          <span className={cn("mb-1 grid place-items-center rounded-full bg-klein/15 font-medium text-klein", s.initial)}>
            {(name || "?").trim().charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}
