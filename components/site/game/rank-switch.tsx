"use client"

import { useState, type ReactNode } from "react"
import { TabPanel, Tabs } from "@/components/site/ui"

/** My rank on a game's home when the game has modes: a tab per mode, as on its ranked page, opening on the one played last. */
export function RankSwitch({ label, modes, initial }: { label: string; modes: { id: string; content: ReactNode }[]; initial: string }) {
  const [picked, setPicked] = useState(initial)
  const mode = modes.find((each) => each.id === picked) ?? modes[0]
  return (
    <>
      <Tabs label={label} idPrefix="rank" items={modes.map((each) => ({ id: each.id, label: each.id }))} value={mode.id} onChange={setPicked} />
      <TabPanel idPrefix="rank" id={mode.id} className="mt-5">
        {mode.content}
      </TabPanel>
    </>
  )
}
