import { useEffect, useRef } from "react"
import { Play } from "lucide-react"
import type {
  LifelineEvent,
  LifelineEventEffect,
  LifelineEventImage,
  LifelineEventSegment,
} from "./types"

function getEventContent(
  event: LifelineEvent,
): string | LifelineEventSegment[] {
  if (typeof event === "object" && !Array.isArray(event) && "text" in event) {
    return event.text
  }

  return event
}

export function getLifelineEventImage(
  event: LifelineEvent,
): LifelineEventImage | undefined {
  if (typeof event === "object" && !Array.isArray(event) && "image" in event) {
    return event.image
  }

  return undefined
}

export function getLifelineEventEffect(
  event: LifelineEvent,
): LifelineEventEffect | undefined {
  if (typeof event === "object" && !Array.isArray(event) && "effect" in event) {
    return event.effect
  }

  return undefined
}

export function LifelineEventText({
  event,
  className,
}: {
  event: LifelineEvent
  className?: string
}) {
  const content = getEventContent(event)

  if (typeof content === "string") {
    return <span className={className}>{content}</span>
  }

  return (
    <span className={className}>
      {content.map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 text-klein underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:decoration-klein"
          >
            {segment.value}
          </a>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </span>
  )
}

/** Always-visible media embedded in the timeline (image.inline). A clip is still, with a play mark, until `playing`. */
export function LifelineEventMedia({
  media,
  className,
  playing = false,
}: {
  media: LifelineEventImage
  className?: string
  playing?: boolean
}) {
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const clip = video.current
    if (!clip) return
    if (playing) clip.play().catch(() => {}) // refused or cut short by leaving: the still stays
    else clip.pause()
  }, [playing])

  if (media.video) {
    return (
      <>
        <video
          ref={video}
          src={media.video}
          poster={media.src}
          muted
          loop
          playsInline
          preload="none"
          aria-label={media.alt}
          className={className}
        />
        {!playing && (
          <span aria-hidden className="cut-sm pointer-events-none absolute bottom-2 left-2 grid h-7 w-7 place-items-center bg-paper text-klein">
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          </span>
        )}
      </>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={media.src} alt={media.alt} loading="lazy" className={className} />
  )
}

export function getLifelineEventKey(event: LifelineEvent, index: number) {
  const content = getEventContent(event)

  if (typeof content === "string") return `${index}-${content}`

  return `${index}-${content.map((segment) => segment.value).join("")}`
}
