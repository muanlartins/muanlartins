import { AimLab } from "@/components/site/aim/aim-lab"
import { VoltaicSection } from "@/components/site/aim/voltaic-section"
import { VoltaicStrip } from "@/components/site/aim/voltaic-strip"
import { PageIntro } from "@/components/site/page-intro"
import { EmptyState } from "@/components/site/ui"
import { summarizeMira, summarizeRanked, type MiraDay, type MiraRankedDay } from "@/lib/mira"
import { dayOf } from "@/lib/ranked"
import { localize } from "@/lib/site"
import { summarizeVoltaic, type VoltaicDay } from "@/lib/voltaic"

const T = localize({
  empty: {
    pt: "O treino entra aqui a partir do primeiro dia: a rotina da Voltaic no Aimlabs, o benchmark de domingo e a mira das minhas partidas.",
    en: "Training shows up here from the first day on: Voltaic's Aimlabs routine, Sunday's benchmark and my matches' aim.",
  },
  creditsVoltaic: { pt: "Benchmark e rotina da", en: "Benchmark and routine by" },
  creditsAimlabs: { pt: ", jogados no", en: ", played in" },
  creditsData: {
    pt: ". Os números saem do próprio Aimlabs e dos replays do Valorant, no meu PC; os replays são lidos com o",
    en: ". The numbers come straight from Aimlabs and from Valorant's replays, on my PC; the replays are read with",
  },
})

const link = "underline decoration-line-strong underline-offset-2 hover:text-klein"

/**
 * Valorant's aim page: "o treino está chegando no jogo?" (Luan, 2026-11-20). Where the training stands with Voltaic,
 * in one card; then the aim tool front and centre (lib/mira.ts): a match's flicks replayed, the training beside it,
 * where the first shots landed, and what only a match has; then Voltaic's benchmark, one view at a time.
 */
export function AimPage({
  title,
  description,
  days,
  mira,
  ranked,
  credits,
}: {
  title: string
  description: string
  days: VoltaicDay[]
  mira: MiraDay[]
  ranked: MiraRankedDay[]
  credits: string
}) {
  const summary = summarizeVoltaic(days)
  const training = summarizeMira(mira)
  const matches = summarizeRanked(ranked)
  const today = dayOf(new Date().toISOString())
  const nothing = summary.days.length === 0 && !training && !matches.length

  return (
    <>
      <PageIntro title={title} description={description} />
      <div className="mt-12 space-y-16">
        {nothing ? (
          <EmptyState>{T.empty}</EmptyState>
        ) : (
          <>
            {summary.days.length > 0 && <VoltaicStrip summary={summary} today={today} />}
            <AimLab training={training} matches={matches} />
            {summary.days.length > 0 && <VoltaicSection summary={summary} today={today} />}
          </>
        )}
      </div>
      <div className="mt-16 space-y-2 text-[13px] leading-[1.6] text-muted">
        <p>
          {T.creditsVoltaic}{" "}
          <a href="https://voltaic.gg" target="_blank" rel="noreferrer" className={link}>
            Voltaic
          </a>
          {T.creditsAimlabs}{" "}
          <a href="https://aimlabs.com" target="_blank" rel="noreferrer" className={link}>
            Aimlabs
          </a>
          {T.creditsData}{" "}
          <a href="https://github.com/yakisoba0728/vrfkit" target="_blank" rel="noreferrer" className={link}>
            vrfkit
          </a>
          .
        </p>
        <p>{credits}</p>
      </div>
    </>
  )
}
