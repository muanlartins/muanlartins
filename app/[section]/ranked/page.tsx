import { notFound } from "next/navigation"
import { RankedPage } from "@/components/site/ranked/ranked-page"
import { ranked } from "@/content/ranked"
import rocketLeague from "@/content/rocket-league"
import { sessions } from "@/lib/matches"
import { sectionMetadata } from "@/lib/metadata"
import { localize, sectionFromSlug, sectionPath } from "@/lib/site"

/** The ranked record at /conteudo/ranked, rebuilt each time the dock publishes a session. */

export const dynamicParams = false

export function generateStaticParams() {
  return [{ section: sectionPath("content").slice(1) }]
}

export function generateMetadata() {
  return sectionMetadata("content", { title: ranked.name, description: ranked.summary }, `/${ranked.id}`)
}

export default async function Page({ params }: PageProps<"/[section]/ranked">) {
  if (sectionFromSlug((await params).section) !== "content") notFound()
  // The roadmap's ranks, for each emblem's name and colour.
  const ranks = rocketLeague.ranks.map((rank) => ({ id: rank.id, name: localize(rank.name), color: rank.color }))
  return (
    <RankedPage
      title={localize(ranked.name)}
      description={localize(ranked.summary)}
      sessions={sessions()}
      ranks={ranks}
    />
  )
}
