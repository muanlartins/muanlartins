"use client"

import { Pause, Play } from "lucide-react"
import { useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

/**
 * The voice lines' player: one audio for the whole page, so a line stops the one before. `FalaBotao` plays a line in
 * one language; `SequenciaBotao` plays several in a row (a conversation). Both show which is playing.
 */

let audio: HTMLAudioElement | null = null
let playing: string | null = null
let queue: string[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function stop() {
  queue = []
  audio?.pause()
  playing = null
  emit()
}

function play(srcs: string[], key: string) {
  if (playing === key) return stop()
  stop()
  audio ??= new Audio()
  queue = [...srcs]
  playing = key
  const next = () => {
    const src = queue.shift()
    if (!src || !audio) {
      playing = null
      return emit()
    }
    audio.src = src
    audio.play().catch(() => {
      playing = null
      emit()
    })
  }
  audio.onended = next
  next()
  emit()
}

function usePlaying() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => playing,
    () => null,
  )
}

const chip = "cut-sm inline-flex h-7 items-center gap-1 px-2 text-[12px] font-medium tabular-nums transition-colors"

/** Plays one line in one language ("PT", "EN"). */
export function FalaBotao({ src, lang, label }: { src: string; lang: "pt" | "en"; label: string }) {
  const now = usePlaying() === src
  const Icon = now ? Pause : Play
  return (
    <button
      type="button"
      onClick={() => play([src], src)}
      aria-label={`${now ? "Parar" : "Ouvir"} ${label} em ${lang === "pt" ? "português" : "inglês"}`}
      aria-pressed={now}
      className={cn(chip, now ? "bg-klein text-paper" : "bg-klein/10 text-klein hover:bg-klein/20")}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {lang.toUpperCase()}
    </button>
  )
}

/** A line's two buttons, side by side. */
export function FalaBotoes({ pt, en, label, className }: { pt: string; en: string; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1", className)}>
      <FalaBotao src={pt} lang="pt" label={label} />
      <FalaBotao src={en} lang="en" label={label} />
    </span>
  )
}

/** Plays a run of lines one after the other: a conversation, whole, in one language. */
export function SequenciaBotao({ srcs, label, lang }: { srcs: string[]; label: string; lang: "pt" | "en" }) {
  const key = `${lang}:${srcs.join("|")}`
  const now = usePlaying() === key
  const Icon = now ? Pause : Play
  return (
    <button
      type="button"
      onClick={() => play(srcs, key)}
      aria-pressed={now}
      className={cn(chip, "h-8 px-3 text-[13px]", now ? "bg-klein text-paper" : "bg-klein/10 text-klein hover:bg-klein/20")}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {now ? "Parar" : label}
    </button>
  )
}
