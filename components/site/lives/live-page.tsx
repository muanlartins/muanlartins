import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { LanguageNotice } from "@/components/site/language-badge"
import { LiveViewer } from "@/components/site/lives/live-viewer"
import { PageIntro } from "@/components/site/page-intro"
import { longDate } from "@/components/site/ranked/format"
import { BallBackdrop } from "@/components/site/roadmap/ball-backdrop"
import { gamePath, type Game } from "@/lib/game"
import { seconds, type Line, type Live } from "@/lib/lives"
import type { Match, Session } from "@/lib/ranked"
import { LOCALE, localize } from "@/lib/site"

const T = localize({
  all: { pt: "Todas as lives", en: "All streams" },
  match: { pt: "Partida", en: "Match" },
})

/** One live: the video, its chapters with the day's ranked matches, and what was said. */
export function LivePage({
  game,
  live,
  lines,
  sessions,
}: {
  game: Game
  live: Live
  lines: Line[]
  sessions: Session[]
}) {
  const matches = new Map<string, Match>(sessions.flatMap((session) => session.matches.map((match) => [match.id, match])))
  let played = 0
  const chapters = live.chapters.map((chapter) => {
    const match = chapter.match ? matches.get(chapter.match) : undefined
    const label = chapter.title ? localize(chapter.title) : `${T.match} ${++played}${match ? ` · ${match.mode}` : ""}`
    return { at: seconds(chapter.at), label, match }
  })
  const title = `${localize(game.lives!.title)} · ${longDate(live.date)}`

  return (
    <>
      <BallBackdrop />
      <Link
        href={gamePath(game, "lives")}
        className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-klein"
      >
        <ArrowLeft className="h-4 w-4" />
        {T.all}
      </Link>
      <PageIntro title={longDate(live.date)} description={localize(live.summary)}>
        {LOCALE !== "pt" && <LanguageNotice language="pt" />}
      </PageIntro>

      <LiveViewer video={live.video} title={title} chapters={chapters} lines={lines} />
    </>
  )
}
