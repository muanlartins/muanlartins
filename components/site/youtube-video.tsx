"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { ComingSoon } from "@/components/site/coming-soon"
import { LOCALE, UI, type Locale } from "@/lib/site"

/**
 * A YouTube video that costs nothing until it's played: the thumbnail
 * stands in for the player, and the iframe only loads on click. A video
 * in the other `language` asks YouTube for captions in this site's.
 */
export function YouTubeVideo({ id, title, language = LOCALE }: { id: string; title: string; language?: Locale }) {
  const [playing, setPlaying] = useState(false)
  const frame = "relative aspect-video w-full overflow-hidden rounded-md bg-klein"

  if (!id) return <ComingSoon label={UI.videoSoon} />

  if (playing) {
    const params = new URLSearchParams({ autoplay: "1", rel: "0", hl: LOCALE })
    if (language !== LOCALE) {
      params.set("cc_load_policy", "1")
      params.set("cc_lang_pref", LOCALE)
    }
    return (
      <div className={frame}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`${UI.playVideo}: ${title}`}
      className={`${frame} group block cursor-pointer`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
      />
      <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-klein text-paper shadow-lg transition-transform group-hover:scale-105">
        <Play className="ml-1 h-6 w-6 fill-current" />
      </span>
    </button>
  )
}
