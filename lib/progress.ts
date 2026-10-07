"use client"

import { useMemo, useSyncExternalStore } from "react"

/**
 * A visitor's progress through a roadmap, kept in their browser: no account,
 * so it stays on that device. Unmarked topics are "not started".
 */
export type Status = "practicing" | "done"
export type Progress = Partial<Record<string, Status>>

/** Fired on every change made on this page, with the progress before and after it. */
export const CHANGE = "roadmap-progress"
export type Change = { roadmap: string; before: Progress; after: Progress }

function key(roadmap: string) {
  return `progress:${roadmap}`
}

function read(roadmap: string) {
  try {
    return localStorage.getItem(key(roadmap)) ?? "{}"
  } catch {
    return "{}"
  }
}

function parse(raw: string): Progress {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE, onChange)
  }
}

export function useProgress(roadmap: string) {
  const raw = useSyncExternalStore(subscribe, () => read(roadmap), () => "{}")
  const progress = useMemo(() => parse(raw), [raw])

  function save(next: Progress) {
    try {
      localStorage.setItem(key(roadmap), JSON.stringify(next))
    } catch {}
    window.dispatchEvent(new CustomEvent<Change>(CHANGE, { detail: { roadmap, before: progress, after: next } }))
  }

  function setStatus(topic: string, status: Status | undefined) {
    const next = { ...progress }
    if (status) next[topic] = status
    else delete next[topic]
    save(next)
  }

  return { progress, setStatus, clear: () => save({}) }
}

/** How much of each rank's topics are done, 0 to 1; ranks progress independently. */
export function rankFills(ranks: { topics: string[] }[], progress: Progress) {
  return ranks.map(({ topics }) => (topics.length ? topics.filter((topic) => progress[topic] === "done").length / topics.length : 0))
}

/** Which of a rank's `divisions` (I, II, III…) a fill reaches: each one is an equal share of its topics. */
export function divisionOf(fill: number, divisions: number) {
  return Math.min(divisions - 1, Math.floor(fill * divisions))
}

/** A visitor's rank: the lowest one not finished yet (ranks.length once all are). */
export function currentRank(fills: number[]) {
  const index = fills.findIndex((fill) => fill < 1)
  return index === -1 ? fills.length : index
}
