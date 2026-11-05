import { Flame } from "lucide-react"
import { BadgeGrid } from "@/components/site/profile/badges"
import { profile } from "@/content/profile"
import type { Sigma, SigmaStats } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile.sigma)
const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")

/**
 * The viewer's Σ: what it is, and once signed in, their total as a Rocket League rank with the way to the
 * next one, their run of lives in a row, and their badges.
 */
export function SigmaPanel({ S, login, stats }: { S: Sigma; login: string; stats: SigmaStats | null | undefined }) {
  const total = stats?.sigma ?? 0
  const rank = S.ranque(total, LOCALE)
  const share = rank.ate === null ? 1 : (total - rank.desde) / (rank.ate - rank.desde)

  return (
    <section className="rounded-md border border-line bg-paper/70 px-5 py-5">
      <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-klein">{text.title}</h2>
      <p className="mt-2 max-w-[40rem] text-[14px] leading-[1.6] text-ink">{text.what}</p>

      {!login ? (
        <p className="mt-4 text-[14px] text-muted">{text.signIn}</p>
      ) : stats === undefined ? null : !stats ? (
        <p className="mt-4 text-[14px] text-muted">{text.none}</p>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rank.emblema} alt="" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-2xl font-medium tracking-[-0.02em] text-klein tabular-nums">{number(total)} Σ</p>
              <p className="text-[15px] text-ink">{rank.nome}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-klein" style={{ width: `${Math.max(2, share * 100)}%` }} />
            </div>
            <p className="text-[13px] text-muted tabular-nums">
              {rank.ate === null ? text.top : `${number(rank.ate - total)} Σ ${text.toNext} ${rank.proximo}`}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-line bg-paper/60 px-4 py-3">
            <Flame className={cn("h-8 w-8 shrink-0", stats.sequencia ? "text-[#ff7a1a]" : "text-muted")} strokeWidth={2} />
            <div>
              <p className="text-[15px] text-ink">
                <strong className="text-xl font-medium tabular-nums">{number(stats.sequencia)}</strong> {text.streakNow}
              </p>
              <p className="text-[13px] text-muted">{stats.sequencia ? text.streakKeep : text.streakStart}</p>
            </div>
          </div>
          <h3 className="pt-2 text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{text.badges}</h3>
          <BadgeGrid badges={S.medalhas(stats, LOCALE)} />
        </div>
      )}
    </section>
  )
}
