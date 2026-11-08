import { notFound } from "next/navigation"
import { BackstagePage } from "@/components/site/channel/backstage-page"
import { GameHome } from "@/components/site/game/game-home"
import { LivePage } from "@/components/site/lives/live-page"
import { LivesPage } from "@/components/site/lives/lives-page"
import { fullDate } from "@/components/site/ranked/format"
import { RankedPage } from "@/components/site/ranked/ranked-page"
import { RoadmapPage } from "@/components/site/roadmap/roadmap-page"
import { TopicPage } from "@/components/site/roadmap/topic-page"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { channelPath, type ChannelPage } from "@/lib/channel"
import { fundamentals, GAME_PAGES, type GamePage } from "@/lib/game"
import { matchMoments } from "@/lib/lives"
import { lives, transcript } from "@/lib/lives-files"
import { sessions } from "@/lib/matches"
import { sectionMetadata } from "@/lib/metadata"
import { editionSlug, entries, findTopic, type Roadmap } from "@/lib/roadmap"
import { localize, sectionFromSlug, sectionPath } from "@/lib/site"

/**
 * Pages under a section. In the content section, a game at
 * /conteudo/<project>: its home, its roadmap at /fundamentals (an older
 * edition at /fundamentals/v<n>), its ranked record at /ranked, and each
 * topic, of any edition, at /<topic>. In the channel, its lives
 * at /canal/lives, each at /canal/lives/<date>, and its backstage at
 * /canal/backstage. One route for all, so a roadmap with no topics yet still
 * builds.
 */

export const dynamicParams = false

export function generateStaticParams() {
  const content = sectionPath("content").slice(1)
  const inGames = games.flatMap((game) => {
    // Every edition's topics share the game's URLs, so an id can't repeat across them.
    const topics = game.roadmaps.flatMap((roadmap) => entries(roadmap).map(({ topic }) => topic.id))
    const taken = topics.find((id) => (GAME_PAGES as readonly string[]).includes(id))
    if (taken) throw new Error(`Topic "${taken}" has the id of one of ${game.id}'s pages; rename it.`)
    const twice = topics.find((id, index) => topics.indexOf(id) !== index)
    if (twice) throw new Error(`Topic "${twice}" is in two of ${game.id}'s editions; give the new one another id.`)
    const pages: string[] = ["fundamentals", ...(game.ranked ? ["ranked"] : [])]
    return [
      { section: content, project: game.id, topic: [] },
      ...[...pages, ...topics].map((id) => ({ section: content, project: game.id, topic: [id] })),
      ...game.roadmaps.slice(1).map((roadmap) => ({ section: content, project: game.id, topic: ["fundamentals", editionSlug(roadmap)] })),
    ]
  })
  const section = sectionPath("channel").slice(1)
  const inChannel = [
    { section, project: "lives", topic: [] },
    ...lives().map((live) => ({ section, project: "lives", topic: [live.date] })),
    { section, project: "backstage", topic: [] },
  ]
  return [...inGames, ...inChannel]
}

type Props = PageProps<"/[section]/[project]/[[...topic]]">

type Found =
  | { channel: ChannelPage; live?: ReturnType<typeof lives>[number] }
  | { game: (typeof games)[number]; page?: GamePage; roadmap?: Roadmap; entry?: NonNullable<ReturnType<typeof findTopic>> }

async function find(params: Props["params"]): Promise<Found | undefined> {
  const { section, project, topic: [id, ...rest] = [] } = await params
  if (sectionFromSlug(section) === "channel") {
    if (project === "backstage" && !id) return { channel: "backstage" }
    if (project !== "lives" || rest.length > 0) return undefined
    if (!id) return { channel: "lives" }
    const live = lives().find((live) => live.date === id)
    return live && { channel: "lives", live }
  }
  const game = games.find((game) => game.id === project)
  if (sectionFromSlug(section) !== "content" || !game) return undefined
  if (id === "fundamentals" && rest.length === 1) {
    const roadmap = game.roadmaps.slice(1).find((roadmap) => editionSlug(roadmap) === rest[0])
    return roadmap && { game, page: "fundamentals", roadmap }
  }
  if (rest.length > 0) return undefined
  if (!id) return { game }
  if ((GAME_PAGES as readonly string[]).includes(id)) {
    if (id === "ranked" && !game.ranked) return undefined
    return { game, page: id as GamePage, roadmap: id === "fundamentals" ? fundamentals(game) : undefined }
  }
  for (const roadmap of game.roadmaps) {
    const entry = findTopic(roadmap, id)
    if (entry) return { game, roadmap, entry }
  }
}

export async function generateMetadata({ params }: Props) {
  const found = await find(params)
  if (!found) return {}
  if ("channel" in found) {
    const { live } = found
    if (live) {
      const title = `${localize(channel.lives.title)} · ${fullDate(live.date)}`
      return sectionMetadata("channel", { title, description: live.summary }, `/lives/${live.date}`)
    }
    return sectionMetadata("channel", channel[found.channel], `/${found.channel}`)
  }
  const { game, page, roadmap, entry } = found
  if (page === "fundamentals" && roadmap) {
    const latest = roadmap === fundamentals(game)
    return sectionMetadata("content", roadmap, `/${game.id}/fundamentals${latest ? "" : `/${editionSlug(roadmap)}`}`)
  }
  if (page === "ranked" && game.ranked) {
    const title = `${localize(game.ranked.title)} · ${localize(game.title)}`
    return sectionMetadata("content", { title, description: game.ranked.description }, `/${game.id}/ranked`)
  }
  if (entry && roadmap) {
    return sectionMetadata(
      "content",
      { title: `${entry.title} · ${localize(roadmap.title)}`, description: entry.path },
      `/${game.id}/${entry.topic.id}`,
    )
  }
  return sectionMetadata("content", game, `/${game.id}`)
}

export default async function SectionSubpage({ params }: Props) {
  const found = await find(params)
  if (!found) notFound()
  if ("channel" in found) {
    if (found.live) return <LivePage live={found.live} lines={transcript(found.live.date)} sessions={sessions()} />
    if (found.channel === "lives") return <LivesPage lives={lives()} sessions={sessions()} />
    return <BackstagePage />
  }
  const { game, page, roadmap, entry } = found
  if (entry && roadmap) return <TopicPage game={game} roadmap={roadmap} id={entry.topic.id} />
  if (page === "fundamentals" && roadmap) return <RoadmapPage game={game} roadmap={roadmap} />
  // The roadmap's ranks, for each emblem's name and colour.
  const ranks = fundamentals(game).ranks.map((rank) => ({ id: rank.id, name: localize(rank.name), color: rank.color }))
  if (page === "ranked" && game.ranked) {
    return (
      <RankedPage
        title={localize(game.ranked.title)}
        description={localize(game.ranked.description)}
        sessions={sessions()}
        ranks={ranks}
        moments={matchMoments(lives().filter((live) => live.game === game.id))}
        livesPath={channelPath("lives")}
        credits={localize(game.credits)}
      />
    )
  }
  return <GameHome game={game} sessions={game.ranked ? sessions() : []} lives={lives().filter((live) => live.game === game.id)} ranks={ranks} />
}
