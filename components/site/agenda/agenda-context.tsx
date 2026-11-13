"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { AGENDA_URL, type Agenda } from "@/lib/agenda"

interface State {
  agenda: Agenda | null
  /** The browser has the API's answer (or gave up asking). */
  fresh: boolean
  /** The editor's, after saving. */
  replace: (agenda: Agenda) => void
  want: () => void
}

const Context = createContext<State>({ agenda: null, fresh: false, replace: () => {}, want: () => {} })

/**
 * The agenda for every page: the build's (`lib/agenda-build.ts`) at first, then the API's, asked in the browser once
 * a component reads it (so pages without it don't ask), and a change Luan makes shows without a release.
 */
export function AgendaProvider({ initial, children }: { initial: Agenda | null; children: ReactNode }) {
  const [agenda, setAgenda] = useState(initial)
  const [fresh, setFresh] = useState(false)
  const [wanted, setWanted] = useState(false)
  const want = useCallback(() => setWanted(true), [])

  useEffect(() => {
    if (!wanted) return
    let live = true
    fetch(AGENDA_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => live && setAgenda((body.agenda as Agenda) ?? null))
      .catch(() => {})
      .finally(() => live && setFresh(true))
    return () => {
      live = false
    }
  }, [wanted])

  return <Context.Provider value={{ agenda, fresh, replace: setAgenda, want }}>{children}</Context.Provider>
}

/** The agenda (null while unknown or when there's none) and whether it's the API's answer yet. */
export function useAgenda() {
  const state = useContext(Context)
  const { want } = state
  useEffect(want, [want])
  return state
}
