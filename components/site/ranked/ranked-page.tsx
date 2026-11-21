"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { RankedRecord } from "@/components/site/ranked/record"
import { BallBackdrop } from "@/components/site/roadmap/ball-backdrop"
import { EmptyState, TabPanel, Tabs } from "@/components/site/ui"
import type { RecordView } from "@/lib/ranked-view"
import { localize } from "@/lib/site"

const T = localize({ modes: { pt: "Modo", en: "Mode" } })

/** One of a game's ranked modes (Rocket League's 1v1, 2v2, 3v3; Valorant has one), already drawn up by
 * lib/ranked-view.ts. */
export interface RankedMode {
  id: string
  label: string
  view: RecordView
}

// The selected mode lives in the URL's hash (#3v3), so a link can open a tab.
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}
const readHash = () => decodeURIComponent(window.location.hash.slice(1))

/**
 * Every game's ranked page: the title, a tab per mode when the game has more than one, and the record every game
 * shares (record.tsx). What's a game's own comes in its view; before its first match a mode says what will fill it,
 * with `before` under the line (Valorant: the ladder with where I am).
 */
export function RankedPage({
  game,
  title,
  description,
  credits,
  modes,
  before,
}: {
  game: string
  title: string
  description: string
  credits: string
  modes: RankedMode[]
  before?: ReactNode
}) {
  const hash = useSyncExternalStore(subscribe, readHash, () => "")
  // Without a hash, the mode of the latest match.
  const latest = modes.reduce<RankedMode | undefined>((best, mode) => ((mode.view.matches.at(-1)?.at ?? "") > (best?.view.matches.at(-1)?.at ?? "") ? mode : best), undefined)
  const mode = modes.find((each) => each.id === hash) ?? latest ?? modes[0]

  function choose(next: string) {
    history.replaceState(null, "", `#${next}`)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  }

  const record = mode.view.matches.length ? (
    <RankedRecord key={mode.id} view={mode.view} />
  ) : (
    <div className="space-y-8">
      <EmptyState>{mode.view.empty}</EmptyState>
      {before}
    </div>
  )

  return (
    <>
      {game === "rocket-league" && <BallBackdrop />}
      <PageIntro title={title} description={description} />

      {modes.length > 1 ? (
        <div className="mt-12">
          <Tabs label={T.modes} idPrefix="modo" items={modes.map((each) => ({ id: each.id, label: each.label, count: each.view.matches.length }))} value={mode.id} onChange={choose} />
          <TabPanel idPrefix="modo" id={mode.id} className="mt-10">
            {record}
          </TabPanel>
        </div>
      ) : (
        <div className="mt-12">{record}</div>
      )}

      <p className="mt-16 text-[13px] leading-[1.6] text-muted">{credits}</p>
    </>
  )
}
