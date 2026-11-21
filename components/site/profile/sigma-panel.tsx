import { ChevronDown, Flame } from "lucide-react"
import type { ReactNode } from "react"
import { MedalGrid } from "@/components/site/profile/badges"
import { Card, EmptyState, Skeleton } from "@/components/site/ui"
import { profile } from "@/content/profile"
import type { Sigma, SigmaStats } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"

const text = localize(profile.sigma)
const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")

/** How Σ come, folded: the explanation is for whoever asks. */
export function SigmaHow({ S }: { S: Sigma }) {
  const unlock = S.ranque(S.COR_LIVRE, LOCALE)
  return (
    <details className="group text-[15px]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-medium text-klein [&::-webkit-details-marker]:hidden">
        {text.how}
        <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-2 max-w-[38rem] leading-[1.6] text-muted">{text.howText.replace("{rank}", unlock.nome).replace("{n}", number(S.COR_LIVRE))}</p>
    </details>
  )
}

/**
 * The viewer's Σ on /perfil: their total as a Rocket League rank with the way to the next, their run of lives in a
 * row, and their medals (the Pix one too, which only they see). `signIn` is what to show signed out.
 */
export function SigmaPanel({ S, stats, signIn }: { S: Sigma | null; stats: SigmaStats | null | undefined; signIn?: ReactNode }) {
  return (
    <div className="space-y-6">
      <p className="max-w-[38rem] text-[15px] leading-[1.6] text-ink">{text.what}</p>
      {signIn ? (
        signIn
      ) : stats === undefined || !S ? (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      ) : !stats ? (
        <EmptyState>{text.none}</EmptyState>
      ) : (
        <Ranked S={S} stats={stats} />
      )}
      {S && <SigmaHow S={S} />}
    </div>
  )
}

function Ranked({ S, stats }: { S: Sigma; stats: SigmaStats }) {
  const total = stats.sigma
  const rank = S.ranque(total, LOCALE)
  const share = rank.ate === null ? 1 : (total - rank.desde) / (rank.ate - rank.desde)
  return (
    <>
      <div className="grid gap-3">
        <Card className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rank.emblema} alt="" className="h-14 w-14 shrink-0 object-contain" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xl font-semibold tracking-[-0.02em] text-klein tabular-nums">{number(total)} Σ</span>
              <span className="text-[15px] text-ink">{rank.nome}</span>
            </p>
            <div className="h-1.5 bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
              <div className="h-full bg-klein" style={{ width: `${Math.max(2, share * 100)}%` }} />
            </div>
            <p className="text-[13px] text-muted tabular-nums">
              {rank.ate === null ? text.top : text.toNext.replace("{n}", number(rank.ate - total)).replace("{rank}", rank.proximo ?? "")}
            </p>
          </div>
        </Card>
        {/* The run, on a dark island like the card's chip: the flame in gold. */}
        <div className="cut flex items-center gap-4 bg-navy px-5 py-4 text-paper">
          <Flame aria-hidden className={stats.sequencia ? "h-8 w-8 shrink-0 text-ouro" : "h-8 w-8 shrink-0 text-paper/40"} />
          <div>
            <p className="text-[15px]">
              <strong className="text-xl font-semibold tabular-nums">{number(stats.sequencia)}</strong> {text.streakNow}
            </p>
            <p className="text-[13px] text-paper/70">{stats.sequencia ? text.streakKeep : text.streakStart}</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <p className="eyebrow text-muted">{text.medals}</p>
        <MedalGrid badges={S.medalhas(stats, LOCALE)} rows />
      </div>
    </>
  )
}
