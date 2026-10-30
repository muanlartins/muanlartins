import { notFound } from "next/navigation"
import { GameHome } from "@/components/site/game/game-home"
import { LivePage } from "@/components/site/lives/live-page"
import { LivesPage } from "@/components/site/lives/lives-page"
import { fullDate } from "@/components/site/ranked/format"
import { RankedPage } from "@/components/site/ranked/ranked-page"
import { RoadmapPage } from "@/components/site/roadmap/roadmap-page"
import { TopicPage } from "@/components/site/roadmap/topic-page"
import { games } from "@/content/projects"
import { GAME_PAGES, gamePath, type GamePage } from "@/lib/game"
import { matchMoments } from "@/lib/lives"
import { lives, transcript } from "@/lib/lives-files"
import { sessions } from "@/lib/matches"
import { sectionMetadata } from "@/lib/metadata"
import { entries, findTopic } from "@/lib/roadmap"
import { localize, sectionFromSlug, sectionPath } from "@/lib/site"

/**
 * A game at /conteudo/<project>: its home, its roadmap at /fundamentals,
 * its ranked record at /ranked, its lives at /lives and each at
 * /lives/<date>, and each topic at /<topic>. One route for all, so a
 * roadmap with no topics yet still builds.
 */

export const dynamicParams = false

export function generateStaticParams() {
  const section = sectionPath("content").slice(1)
  return games.flatMap((game) => {
    const topics = entries(game.roadmap).map(({ topic }) => topic.id)
    const taken = topics.find((id) => (GAME_PAGES as readonly string[]).includes(id))
    if (taken) throw new Error(`Topic "${taken}" has the id of one of ${game.id}'s pages; rename it.`)
    const pages: string[] = ["fundamentals", ...(game.ranked ? ["ranked"] : []), ...(game.lives ? ["lives"] : [])]
    const days = game.lives ? lives().map((live) => ["lives", live.date]) : []
    return [
      { section, project: game.id, topic: [] },
      ...[...pages, ...topics].map((id) => ({ section, project: game.id, topic: [id] })),
      ...days.map((topic) => ({ section, project: game.id, topic })),
    ]
  })
}

type Props = PageProps<"/[section]/[project]/[[...topic]]">

async function find(params: Props["params"]) {
  const { section, project, topic: [id, ...rest] = [] } = await params
  const game = games.find((game) => game.id === project)
  if (sectionFromSlug(section) !== "content" || !game) return undefined
  if (id === "lives" && game.lives && rest.length === 1) {
    const live = lives().find((live) => live.date === rest[0])
    return live && { game, live }
  }
  if (rest.length > 0) return undefined
  if (!id) return { game }
  if ((GAME_PAGES as readonly string[]).includes(id)) {
    if ((id === "ranked" && !game.ranked) || (id === "lives" && !game.lives)) return undefined
    return { game, page: id as GamePage }
  }
  const entry = findTopic(game.roadmap, id)
  return entry && { game, entry }
}

export async function generateMetadata({ params }: Props) {
  const found = await find(params)
  if (!found) return {}
  const { game, page, entry, live } = found
  if (page === "fundamentals") return sectionMetadata("content", game.roadmap, `/${game.id}/fundamentals`)
  if (live && game.lives) {
    const title = `${localize(game.lives.title)} · ${fullDate(live.date)} · ${localize(game.title)}`
    return sectionMetadata("content", { title, description: live.summary }, `/${game.id}/lives/${live.date}`)
  }
  if (page === "lives" && game.lives) {
    const title = `${localize(game.lives.title)} · ${localize(game.title)}`
    return sectionMetadata("content", { title, description: game.lives.description }, `/${game.id}/lives`)
  }
  if (page === "ranked" && game.ranked) {
    const title = `${localize(game.ranked.title)} · ${localize(game.title)}`
    return sectionMetadata("content", { title, description: game.ranked.description }, `/${game.id}/ranked`)
  }
  if (entry) {
    return sectionMetadata(
      "content",
      { title: `${entry.title} · ${localize(game.roadmap.title)}`, description: entry.path },
      `/${game.id}/${entry.topic.id}`,
    )
  }
  return sectionMetadata("content", game, `/${game.id}`)
}

export default async function ProjectPage({ params }: Props) {
  const found = await find(params)
  if (!found) notFound()
  const { game, page, entry, live } = found
  if (entry) return <TopicPage roadmap={game.roadmap} id={entry.topic.id} />
  if (page === "fundamentals") return <RoadmapPage roadmap={game.roadmap} />
  if (live) return <LivePage game={game} live={live} lines={transcript(live.date)} sessions={sessions()} />
  if (page === "lives" && game.lives) return <LivesPage game={game} lives={lives()} sessions={sessions()} />
  // The roadmap's ranks, for each emblem's name and colour.
  const ranks = game.roadmap.ranks.map((rank) => ({ id: rank.id, name: localize(rank.name), color: rank.color }))
  if (page === "ranked" && game.ranked) {
    return (
      <RankedPage
        title={localize(game.ranked.title)}
        description={localize(game.ranked.description)}
        sessions={sessions()}
        ranks={ranks}
        moments={game.lives ? matchMoments(lives()) : {}}
        livesPath={gamePath(game, "lives")}
      />
    )
  }
  return <GameHome game={game} sessions={game.ranked ? sessions() : []} lives={game.lives ? lives() : []} ranks={ranks} />
}
