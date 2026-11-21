"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { AGENDA_URL, type Agenda } from "@/lib/agenda"

interface State {
  agenda: Agenda | null
  /** The browser has the API's answer (or gave up asking). */
  fresh: boolean
  /** The last ask failed (the build's agenda, if any, is still there). */
  failed: boolean
  /** The editor's, after saving. */
  replace: (agenda: Agenda) => void
  want: () => void
  /** Asks the API again, after a failure. */
  retry: () => void
}

const Context = createContext<State>({ agenda: null, fresh: false, failed: false, replace: () => {}, want: () => {}, retry: () => {} })

/**
 * The agenda for every page: the build's (`lib/agenda-build.ts`) at first, then the API's, asked in the browser once
 * a component reads it (so pages without it don't ask), and a change Luan makes shows without a release.
 */
export function AgendaProvider({ initial, children }: { initial: Agenda | null; children: ReactNode }) {
  const [agenda, setAgenda] = useState(initial)
  const [fresh, setFresh] = useState(false)
  const [failed, setFailed] = useState(false)
  const [wanted, setWanted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const want = useCallback(() => setWanted(true), [])
  const retry = useCallback(() => {
    setFresh(false)
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!wanted) return
    let live = true
    fetch(AGENDA_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => live && setAgenda((body.agenda as Agenda) ?? null))
      .catch(() => live && setFailed(true))
      .finally(() => live && setFresh(true))
    return () => {
      live = false
    }
  }, [wanted, attempt])

  return <Context.Provider value={{ agenda, fresh, failed, replace: setAgenda, want, retry }}>{children}</Context.Provider>
}

/** The agenda (null while unknown or when there's none) and whether it's the API's answer yet. */
export function useAgenda() {
  const state = useContext(Context)
  const { want } = state
  useEffect(want, [want])
  return state
}
