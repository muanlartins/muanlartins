"use client"

import { useSyncExternalStore } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { type RankInfo } from "@/components/site/ranked/format"
import { RankedRecord } from "@/components/site/ranked/record"
import { BallBackdrop } from "@/components/site/roadmap/ball-backdrop"
import { MODES, type Mode, type Session } from "@/lib/ranked"
import { rocketLeagueView } from "@/lib/ranked-view"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  modes: { pt: "Modo", en: "Mode" },
  empty: {
    pt: "Nenhuma partida ranqueada de {mode} publicada ainda.",
    en: "No ranked {mode} matches published yet.",
  },
})

// The selected mode lives in the URL's hash (#3v3), so a link can open a tab.
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}
const readHash = () => decodeURIComponent(window.location.hash.slice(1))

/** Rocket League's ranked record, one tab per mode, drawn by the record every game shares (record.tsx). */
export function RankedPage({
  title,
  description,
  sessions,
  ranks,
  moments,
  credits,
}: {
  title: string
  description: string
  sessions: Session[]
  ranks: RankInfo[]
  /** Matches a live has a chapter for: where to watch them. */
  moments: Record<string, { date: string; at: number }>
  /** Whose game and art it is (the game's `credits`). */
  credits: string
}) {
  const hash = useSyncExternalStore(subscribe, readHash, () => "")
  // Without a hash, the mode of the latest match.
  const latest = sessions
    .flatMap((session) => session.matches)
    .filter((match) => (MODES as readonly string[]).includes(match.mode))
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  const mode: Mode = (MODES as readonly string[]).includes(hash) ? (hash as Mode) : ((latest?.mode as Mode) ?? "3v3")

  function choose(next: Mode) {
    history.replaceState(null, "", `#${next}`)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  }

  const counts = Object.fromEntries(
    MODES.map((m) => [m, sessions.reduce((n, s) => n + s.matches.filter((match) => match.mode === m).length, 0)]),
  )
  const view = rocketLeagueView(sessions, mode, ranks, moments)

  return (
    <>
      <BallBackdrop />
      <PageIntro title={title} description={description} />

      <div role="tablist" aria-label={T.modes} className="mt-12 flex gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={m === mode}
            onClick={() => choose(m)}
            className={cn(
              "rounded-md border px-4 py-2 text-[15px] font-medium tabular-nums transition-colors",
              m === mode ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein",
            )}
          >
            {m}
            <span className={cn("ml-2 text-[12px]", m === mode ? "text-klein-claro" : "text-muted")}>{counts[m]}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-10">
        {view.matches.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-5 py-6 text-[14px] text-muted">{T.empty.replace("{mode}", mode)}</p>
        ) : (
          <RankedRecord key={mode} view={view} />
        )}
      </div>

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{credits}</p>
    </>
  )
}
