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

/** Each voice's card: a thing it's known for, not a likeness. */
const LOOK: Record<string, [LucideIcon, string]> = {
  propria: [Mic, "#002fa7"],
  antonio: [AudioLines, "#5b6b8c"],
  francisca: [AudioWaveform, "#8a5fa8"],
  galvao: [Trophy, "#1f9d55"],
  bob: [Shell, "#d9a400"],
  patrick: [Star, "#e8618c"],
  lula: [Music, "#2f9e98"],
  madruga: [Receipt, "#9a7440"],
  chaves: [Sandwich, "#c8742a"],
  silvio: [Plane, "#2b6fd6"],
  faustao: [Tv, "#d64545"],
  picapau: [Bird, "#c62f28"],
  goku: [Zap, "#ef8a17"],
  cid: [BookOpen, "#55557a"],
  datena: [Siren, "#b8322a"],
}

/** The voices as cards: a tap picks one and plays its sample (public/pix/vozes/<id>.mp3); a second tap stops it. */
export function VoicePicker({ voices, value, onChange }: { voices: Voice[]; value: string; onChange: (id: string) => void }) {
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
    <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {voices.map((v) => {
        const [Icon, color] = LOOK[v.id] ?? [AudioLines, "#002fa7"]
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
              "relative flex flex-col items-center gap-2 rounded-md border px-2 pt-3 pb-2.5 text-center transition-colors",
              on ? "border-klein bg-klein/[0.07] ring-1 ring-klein" : "border-line bg-paper/70 hover:border-klein/60",
            )}
          >
            <span
              className={cn("relative grid h-14 w-14 place-items-center overflow-hidden rounded-full transition-transform", sounding && "scale-105")}
              style={{ background: `${color}26`, color }}
            >
              {v.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- a static export: no image optimizer
                <img src={`/pix/vozes/${v.id}.webp`} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon className="h-7 w-7" strokeWidth={1.8} />
              )}
              {sounding && <span className="absolute inset-0 animate-ping rounded-full border-2" style={{ borderColor: color }} />}
            </span>
            <span className="text-[14px] leading-tight font-medium text-ink">{v.name}</span>
            {v.note && <span className="-mt-1.5 text-[12px] leading-tight text-muted">{localize(v.note)}</span>}
            {sounding && <Volume2 aria-hidden className="absolute top-1.5 right-1.5 h-4 w-4 animate-pulse text-klein" />}
          </button>
        )
      })}
    </div>
  )
}
