"use client"

import { Search } from "lucide-react"
import { useDeferredValue, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { MatchResult } from "@/components/site/ranked/match-result"
import { YouTubeVideo, type Seek } from "@/components/site/youtube-video"
import { clock, type Line } from "@/lib/lives"
import type { Match } from "@/lib/ranked"
import { localize } from "@/lib/site"

const T = localize({
  chapters: { pt: "Capítulos", en: "Chapters" },
  chaptersHint: { pt: "Clique para ir até o momento.", en: "Click to jump there." },
  transcript: { pt: "Transcrição", en: "Transcript" },
  transcriptHint: {
    pt: "Gerada automaticamente a partir do áudio da live, então tem erros. Clique numa fala para ir até ela.",
    en: "Generated automatically from the stream's audio, in Portuguese, so it has mistakes. Click a line to jump there.",
  },
  search: { pt: "Buscar na live", en: "Search the stream" },
  found: { pt: "{n} de {total} falas", en: "{n} of {total} lines" },
  none: { pt: "Nada encontrado.", en: "Nothing found." },
})

export interface ViewerChapter {
  at: number
  label: string
  match?: Match
}

// A link can open the video at a second: #t=1980, as the ranked page's "on stream" links do.
const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}
const readStart = () => Number(/^#t=(\d+)$/.exec(window.location.hash)?.[1] ?? 0)

/** Folds case and accents, so "acao" finds "ação". */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

export function LiveViewer({
  video,
  title,
  chapters,
  lines,
}: {
  video: string
  title: string
  chapters: ViewerChapter[]
  lines: Line[]
}) {
  const start = useSyncExternalStore(subscribe, readStart, () => 0)
  const [seek, setSeek] = useState<Seek>()
  const playerRef = useRef<HTMLDivElement>(null)

  function jump(at: number) {
    setSeek((last) => ({ at, n: (last?.n ?? 0) + 1 }))
    history.replaceState(null, "", `#t=${at}`)
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="mt-12 space-y-16">
      <div ref={playerRef} className="scroll-mt-24">
        <YouTubeVideo id={video} title={title} language="pt" start={start} seek={seek} />
      </div>

      {chapters.length > 0 && (
        <Section title={T.chapters} hint={T.chaptersHint}>
          <ul className="divide-y divide-line/60 border-y border-line">
            {chapters.map((chapter) => (
              <li key={chapter.at}>
                <button
                  type="button"
                  onClick={() => jump(chapter.at)}
                  className="group grid w-full grid-cols-[4rem_1fr] items-center gap-x-4 gap-y-2 py-3 text-left text-[14px] tabular-nums transition-colors hover:bg-paper/60 sm:grid-cols-[4rem_9rem_1fr]"
                >
                  <span className="text-muted transition-colors group-hover:text-klein">{clock(chapter.at)}</span>
                  <span className="font-medium text-ink">{chapter.label}</span>
                  {chapter.match && (
                    <span className="col-start-2 flex items-center gap-x-3 sm:col-start-auto sm:gap-x-4">
                      <MatchResult match={chapter.match} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {lines.length > 0 && (
        <Section title={T.transcript} hint={T.transcriptHint}>
          <Transcript lines={lines} jump={jump} />
        </Section>
      )}
    </div>
  )
}

function Transcript({ lines, jump }: { lines: Line[]; jump: (at: number) => void }) {
  const [query, setQuery] = useState("")
  const deferred = fold(useDeferredValue(query).trim())
  const shown = deferred ? lines.filter(([, text]) => fold(text).includes(deferred)) : lines

  return (
    <>
      <label className="flex items-center gap-2 rounded-md border border-line bg-paper/70 px-3 py-2 focus-within:border-klein">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={T.search}
          aria-label={T.search}
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
      </label>
      {deferred && (
        <p className="mt-2 text-[13px] text-muted">
          {shown.length ? T.found.replace("{n}", String(shown.length)).replace("{total}", String(lines.length)) : T.none}
        </p>
      )}
      <ol className="mt-4 max-h-[32rem] overflow-y-auto border-y border-line">
        {shown.map(([at, text]) => (
          <li key={`${at}-${text}`}>
            <button
              type="button"
              onClick={() => jump(at)}
              className="group flex w-full gap-4 px-1 py-1.5 text-left text-[14px] leading-[1.5] transition-colors hover:bg-paper/60"
            >
              <span className="w-16 shrink-0 tabular-nums text-muted transition-colors group-hover:text-klein">{clock(at)}</span>
              <span className="text-ink">
                <Highlight text={text} query={deferred} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </>
  )
}

/** The text with each match of the (folded) query marked. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return text
  const folded = fold(text)
  const parts: ReactNode[] = []
  let from = 0
  for (let at = folded.indexOf(query); at !== -1; at = folded.indexOf(query, at + query.length)) {
    parts.push(text.slice(from, at), <mark key={at} className="rounded-sm bg-klein-claro/50 text-ink">{text.slice(at, at + query.length)}</mark>)
    from = at + query.length
  }
  parts.push(text.slice(from))
  return parts
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}
