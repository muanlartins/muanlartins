"use client"

import { useEffect, useRef, useState } from "react"
import { Play } from "lucide-react"
import { ComingSoon } from "@/components/site/coming-soon"
import { LOCALE, UI, type Locale } from "@/lib/site"

/** A jump to a second of the video; `n` counts the jumps, so the same second twice still jumps. */
export interface Seek {
  at: number
  n: number
}

const EMBED = "https://www.youtube-nocookie.com"

/**
 * A YouTube video that costs nothing until it's played: the thumbnail
 * stands in for the player, and the iframe only loads on click. A video
 * in the other `language` asks YouTube for captions in this site's.
 * `start` is where playing begins; `seek` jumps there, starting the
 * player if it isn't yet.
 */
export function YouTubeVideo({
  id,
  title,
  language = LOCALE,
  start = 0,
  seek,
}: {
  id: string
  title: string
  language?: Locale
  start?: number
  seek?: Seek
}) {
  const [playing, setPlaying] = useState(false)
  const [from, setFrom] = useState(start)
  const [seen, setSeen] = useState({ start, seek })
  const frameRef = useRef<HTMLIFrameElement>(null)
  const frame = "relative aspect-video w-full overflow-hidden rounded-md bg-klein"

  // A new start moves where the thumbnail plays from; a jump before the player exists loads it at that second.
  if (start !== seen.start || seek !== seen.seek) {
    setSeen({ start, seek })
    if (!playing && start !== seen.start) setFrom(start)
    if (!playing && seek && seek !== seen.seek) {
      setFrom(seek.at)
      setPlaying(true)
    }
  }

  // Once it exists, the player takes commands by message (YouTube's iframe API, without its script).
  useEffect(() => {
    const player = frameRef.current?.contentWindow
    if (!seek || !player) return
    for (const [func, args] of [["seekTo", [seek.at, true]], ["playVideo", []]] as const) {
      player.postMessage(JSON.stringify({ event: "command", func, args }), EMBED)
    }
  }, [seek])

  if (!id) return <ComingSoon label={UI.videoSoon} />

  if (playing) {
    const params = new URLSearchParams({ autoplay: "1", rel: "0", hl: LOCALE, enablejsapi: "1", origin: window.location.origin })
    if (from) params.set("start", String(Math.floor(from)))
    if (language !== LOCALE) {
      params.set("cc_load_policy", "1")
      params.set("cc_lang_pref", LOCALE)
    }
    return (
      <div className={frame}>
        <iframe
          ref={frameRef}
          src={`${EMBED}/embed/${id}?${params}`}
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
