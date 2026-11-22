import { useEffect, useState, type RefObject } from "react"
import type { Sheets } from "@/components/site/celeste/tecnicas/demo-canvas"
import { demoFile } from "@/lib/celeste-demo"

const loaded = new Map<string, Promise<HTMLImageElement>>()

function load(src: string) {
  let image = loaded.get(src)
  if (!image) {
    const element = new Image()
    element.src = src
    image = element.decode().then(() => element)
    // A failed one is asked for again on a retry.
    image.catch(() => loaded.delete(src))
    loaded.set(src, image)
  }
  return image
}

/**
 * A demonstration's pictures, fetched as it comes near the window: only the take on screen and its ghost, since a
 * take is about 250 KB. Until they're in, the take before stays up.
 */
export function useSheets(root: RefObject<HTMLElement | null>, demo: string, take: string, ghost?: string) {
  const [near, setNear] = useState(false)
  const [sheets, setSheets] = useState<Sheets>()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!root.current) return
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setNear(true)
        seen.disconnect()
      },
      { rootMargin: "400px" },
    )
    seen.observe(root.current)
    return () => seen.disconnect()
  }, [root])

  useEffect(() => {
    if (!near) return
    let gone = false
    Promise.all([load(demoFile(demo, `${take}-cena.webp`)), ghost ? load(demoFile(demo, `${ghost}-ela.webp`)) : undefined])
      .then(([scene, alone]) => {
        if (gone) return
        setSheets({ scene, ghost: ghost && alone ? { id: ghost, image: alone } : undefined })
        setFailed(false)
      })
      .catch(() => {
        if (!gone) setFailed(true)
      })
    return () => {
      gone = true
    }
  }, [near, demo, take, ghost, attempt])

  return { sheets, failed, retry: () => setAttempt((n) => n + 1) }
}
