import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import { LanguageBadge } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { RoadmapProgress, ShowroomStage } from "@/components/site/game/game-home-client"
import { divisionOf, tierOf, type RankInfo } from "@/components/site/ranked/format"
import { gamePath, type Game } from "@/lib/game"
import { MODES, summarize, type Mode, type Session } from "@/lib/ranked"
import { entries } from "@/lib/roadmap"
import { LINKS, UI, localize } from "@/lib/site"

const T = localize({
  channel: { pt: "Onde acompanhar", en: "Where to follow" },
  explore: { pt: "Por aqui", en: "In here" },
  videos: { pt: "vídeos", en: "videos" },
  topics: { pt: "tópicos", en: "topics" },
  points: { pt: "pts", en: "pts" },
  noRank: { pt: "Nenhuma partida publicada ainda.", en: "No matches published yet." },
  drag: { pt: "Arraste para girar", en: "Drag to spin" },
})

/** Where the channel lives: the profiles that carry it. */
const CHANNEL = LINKS.filter((link) => link.label === "YouTube" || link.label === "Twitch")

/**
 * A game's home: what it's about, the car on a turntable, where to follow,
 * and a card for each of its pages with a glimpse of what's in it.
 */
export function GameHome({ game, sessions, ranks }: { game: Game; sessions: Session[]; ranks: RankInfo[] }) {
  const paragraphs = localize(game.intro).split(/\n\s*\n/)
  const topics = entries(game.roadmap)
  const videos = topics.filter(({ topic }) => topic.video).length

  // The rank in the mode played last.
  const latest = sessions
    .flatMap((session) => session.matches)
    .filter((match) => (MODES as readonly string[]).includes(match.mode))
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  const mode = latest?.mode as Mode | undefined
  const standing = mode && summarize(sessions, mode).standing

  return (
    <>
      <PageIntro title={localize(game.title)} description={localize(game.description)} />

      <div className="relative -mx-6 mt-6 h-64 sm:mx-0 sm:h-80">
        <ShowroomStage />
        <p className="pointer-events-none absolute bottom-1 right-6 text-[12px] text-muted sm:right-0">{T.drag}</p>
      </div>

      <div className="mt-10 max-w-[38rem] space-y-5 text-[17px] leading-[1.7] text-ink">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{T.channel}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {CHANNEL.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 rounded-md border border-line bg-paper/70 px-4 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-klein hover:text-klein"
            >
              {link.label}
              <ArrowUpRight className="h-4 w-4 text-muted transition-colors group-hover:text-klein" />
            </a>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{T.explore}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card href={gamePath(game, "fundamentals")} title={localize(game.roadmap.title)} summary={localize(game.roadmap.description)}>
            <p className="text-[13px] tabular-nums text-muted">
              {topics.length} {T.topics} · {videos} {T.videos}
            </p>
            <RoadmapProgress roadmap={game.roadmap.id} topics={topics.map(({ topic }) => topic.id)} />
          </Card>

          {game.ranked && (
            <Card href={gamePath(game, "ranked")} title={localize(game.ranked.title)} summary={localize(game.ranked.description)}>
              {standing ? (
                <RankLine tier={standing.tier} ranks={ranks} mode={mode!} division={divisionOf(standing)} mmr={standing.mmr} />
              ) : (
                <p className="text-[13px] text-muted">{T.noRank}</p>
              )}
            </Card>
          )}

          {game.links.map((link) => (
            <Card key={link.id} href={link.href!} title={localize(link.name)} summary={localize(link.summary)} away language={link.language} />
          ))}
        </div>
      </section>

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{UI.credits}</p>
    </>
  )
}

function Card({
  href,
  title,
  summary,
  away,
  language,
  children,
}: {
  href: string
  title: string
  summary: string
  away?: boolean
  language?: Game["roadmap"]["language"]
  children?: ReactNode
}) {
  return (
    <a
      href={href}
      {...(away && href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
      className="group flex flex-col gap-3 rounded-md border border-line bg-paper/70 px-5 py-4 backdrop-blur-sm transition-colors hover:border-klein"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="flex items-center gap-2 text-xl font-medium text-klein tracking-[-0.02em]">
          {title}
          {language && <LanguageBadge language={language} />}
        </h3>
        {away && <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-klein" />}
      </div>
      <p className="text-[14px] leading-[1.6] text-ink">{summary}</p>
      {children && <div className="mt-auto space-y-2 pt-1">{children}</div>}
    </a>
  )
}

function RankLine({
  tier,
  ranks,
  mode,
  division,
  mmr,
}: {
  tier: string
  ranks: RankInfo[]
  mode: Mode
  division?: string
  mmr?: number | null
}) {
  const info = tierOf(tier, ranks)
  return (
    <p className="flex items-center gap-2 text-[14px] text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={info.icon} alt="" className="h-7 w-7 object-contain" />
      <span>
        <span className="font-medium">{info.name}</span>
        {division && <span className="text-muted"> · {division}</span>}
        {mmr != null && (
          <span className="tabular-nums text-muted">
            {" "}
            · {mmr} {T.points}
          </span>
        )}
        <span className="text-muted"> · {mode}</span>
      </span>
    </p>
  )
}
