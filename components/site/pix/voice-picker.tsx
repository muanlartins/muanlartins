"use client"

import {
  AudioLines,
  AudioWaveform,
  Bird,
  BookOpen,
  Mic,
  Music,
  Plane,
  Receipt,
  Sandwich,
  Shell,
  Siren,
  Star,
  Trophy,
  Tv,
  Volume2,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { VOICES } from "@/content/pix"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

type Voice = (typeof VOICES)[number]

/** Each voice's card: a thing it's known for, not a likeness, in Klein like the rest of the form. */
const ICON: Record<string, LucideIcon> = {
  propria: Mic,
  antonio: AudioLines,
  francisca: AudioWaveform,
  galvao: Trophy,
  bob: Shell,
  patrick: Star,
  lula: Music,
  madruga: Receipt,
  chaves: Sandwich,
  silvio: Plane,
  faustao: Tv,
  picapau: Bird,
  goku: Zap,
  cid: BookOpen,
  datena: Siren,
}

/** The voices as cards: picking one plays its sample (public/pix/vozes/<id>.mp3); picking it again stops it. */
export function VoicePicker({ voices, value, onChange, label }: { voices: Voice[]; value: string; onChange: (id: string) => void; label: string }) {
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => audio.current?.pause(), [])

  function pick(v: Voice) {
    onChange(v.id)
    audio.current?.pause()
    if (v.id === "propria" || playing === v.id) {
      setPlaying(null)
      return
    }
    const a = new Audio(`/pix/vozes/${v.id}.mp3`)
    a.onended = () => setPlaying((p) => (p === v.id ? null : p))
    audio.current = a
    setPlaying(v.id)
    a.play().catch(() => setPlaying(null))
  }

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {voices.map((v) => {
        const Icon = ICON[v.id] ?? AudioLines
        const on = v.id === value
        const sounding = playing === v.id
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => pick(v)}
            className={cn(
              "cut-sm cut-edge relative flex flex-col items-center gap-2 border px-2 pt-3 pb-2.5 text-center transition-colors",
              on ? "border-klein bg-klein/[0.08]" : "border-line-strong bg-paper/60 hover:border-klein",
            )}
          >
            <span className={cn("relative grid h-12 w-12 place-items-center overflow-hidden rounded-full transition-colors", on ? "bg-klein text-paper" : "bg-klein/10 text-klein")}>
              {v.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- a static export: no image optimizer
                <img src={`/pix/vozes/${v.id}.webp`} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon aria-hidden className="h-6 w-6" strokeWidth={1.8} />
              )}
            </span>
            <span className="text-[14px] leading-tight font-medium text-ink">{v.name}</span>
            {v.note && <span className="-mt-1.5 text-[13px] leading-tight text-muted">{localize(v.note)}</span>}
            {sounding && <Volume2 aria-hidden className="absolute top-2 right-2 h-4 w-4 text-klein motion-safe:animate-pulse" />}
          </button>
        )
      })}
    </div>
  )
}
