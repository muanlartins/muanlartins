"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { DOCS, sectionNumber } from "./labels"

export interface TocItem {
  id: string
  title: string
}

/** How far below the top of the window a section counts as the one being read: under the header and the phone's bar. */
const READING_LINE = 140

/** The section being read: the last one whose top has passed the reading line, or none before the first. */
function useReading(ids: string[]) {
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      let found: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= READING_LINE) found = id
      }
      // At the very end, the last section is the one being read even when it's too short to reach the line.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2 && ids.length) found = ids[ids.length - 1]
      setCurrent(found)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    addEventListener("scroll", onScroll, { passive: true })
    addEventListener("resize", onScroll)
    return () => {
      removeEventListener("scroll", onScroll)
      removeEventListener("resize", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [ids])
  return current
}

/**
 * The page's index. From 1280 px it sits in the right margin and follows the reading down, the section being read
 * marked; narrower, it's a bar that sticks under the header saying where you are, and opens into the whole list.
 */
export function DocToc({ items }: { items: TocItem[] }) {
  const key = items.map((item) => item.id).join(" ")
  const ids = useMemo(() => key.split(" "), [key])
  const current = useReading(ids)
  const [open, setOpen] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const index = items.findIndex((item) => item.id === current)

  // The phone's list closes on Escape and on a tap outside it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onDown = (e: PointerEvent) => bar.current && !bar.current.contains(e.target as Node) && setOpen(false)
    addEventListener("keydown", onKey)
    addEventListener("pointerdown", onDown)
    return () => {
      removeEventListener("keydown", onKey)
      removeEventListener("pointerdown", onDown)
    }
  }, [open])

  if (items.length < 2) return null

  return (
    <>
      <aside className="absolute left-full top-0 ml-16 hidden h-full w-48 xl:block">
        <nav aria-label={DOCS.onThisPage} className="sticky top-32">
          <p className="eyebrow mb-4 text-muted">{DOCS.onThisPage}</p>
          <ol className="space-y-0.5 border-l border-line">
            {items.map((item, i) => {
              const on = item.id === current
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={on ? "location" : undefined}
                    className={cn(
                      "-ml-px flex gap-2.5 border-l-2 py-1 pl-4 text-[13px] leading-[1.45] transition-colors",
                      on ? "border-klein font-medium text-klein" : "border-transparent text-muted hover:text-ink",
                    )}
                  >
                    <span className="shrink-0 tabular-nums">{sectionNumber(i + 1)}</span>
                    <span>{item.title}</span>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
      </aside>

      <div ref={bar} className="sticky top-16 z-30 -mx-6 mt-8 xl:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="doc-toc-list"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 border-b border-line bg-ground/90 px-6 py-3 text-left backdrop-blur-xl"
        >
          <span className="eyebrow shrink-0 text-muted">{DOCS.onThisPage}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-klein">
            {index >= 0 ? (
              <>
                <span className="tabular-nums">{sectionNumber(index + 1)}</span> · {items[index].title}
              </>
            ) : (
              <span className="font-normal text-muted">{DOCS.sections.replace("{n}", String(items.length))}</span>
            )}
          </span>
          <ChevronDown aria-hidden className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
        </button>
        <div className={cn("absolute inset-x-6 top-full pt-2 drop-shadow-[0_8px_24px_rgba(0,20,71,0.16)]", !open && "hidden")}>
          <nav id="doc-toc-list" aria-label={DOCS.onThisPage} className="cut bg-paper p-2">
            <ol>
              {items.map((item, i) => {
                const on = item.id === current
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => setOpen(false)}
                      aria-current={on ? "location" : undefined}
                      className={cn("flex gap-3 px-3 py-2 text-[15px]", on ? "bg-klein/[0.08] font-medium text-klein" : "text-ink hover:text-klein")}
                    >
                      <span className="w-6 shrink-0 tabular-nums text-muted">{sectionNumber(i + 1)}</span>
                      {item.title}
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>
      </div>
    </>
  )
}
