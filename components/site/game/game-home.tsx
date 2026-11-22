import { LanguageBadge } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { PageList } from "@/components/site/game/page-list"
import { RoadmapProgress, MomentStage } from "@/components/site/game/game-home-client"
import { GameNextLine } from "@/components/site/game/game-next-line"
import { Ladder } from "@/components/site/game/ladder"
import { Range } from "@/components/site/game/range"
import { RankSwitch } from "@/components/site/game/rank-switch"
import { CollectionGlimpse } from "@/components/site/inventory/collection-glimpse"
import { decimal, divisionOf, type RankInfo } from "@/components/site/ranked/format"
import { EmptyState, Section } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { dayMonth, hasGame } from "@/lib/agenda"
import { buildAgenda } from "@/lib/agenda-build"
import { channelPath } from "@/lib/channel"
import { fundamentals, gamePath, type Game } from "@/lib/game"
import type { Live } from "@/lib/lives"
import { MODES, summarize, type Mode, type Session } from "@/lib/ranked"
import type { Rank } from "@/lib/roadmap"
import { entries } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import { summarizeValorant, tierId, type ValorantSession } from "@/lib/valorant"
import { catalog } from "@/lib/valorant-catalog-file"
import { seed } from "@/lib/valorant-inventory"
import { rankById, summarizeVoltaic, type VoltaicDay } from "@/lib/voltaic"

const T = localize({
  explore: { pt: "Por aqui", en: "In here" },
  rank: { pt: "Meu rank", en: "My rank" },
  videos: { pt: "vídeos", en: "videos" },
  topics: { pt: "tópicos", en: "topics" },
  points: { pt: "pontos", en: "points" },
  mode: { pt: "Modo", en: "Mode" },
  lastWith: { pt: "última partida de {agent}", en: "last match as {agent}" },
  noRank: { pt: "Nenhuma partida publicada ainda.", en: "No matches published yet." },
  latestLive: { pt: "Última", en: "Latest" },
  live: { pt: "Ao vivo", en: "Live" },
  soon: { pt: "Primeiros tópicos em breve", en: "First topics soon" },
  energy: { pt: "de energia", en: "energy" },
  of: { pt: "de", en: "of" },
  collected: { pt: "skins na coleção", en: "skins collected" },
  unranked: { pt: "Sem rank", en: "Unranked" },
  trained: { pt: "dias de treino", en: "days trained" },
  noAim: { pt: "O primeiro treino entra aqui.", en: "The first training shows up here." },
})

/** Luan's rank in a line and on the ladder: the tier's id there, its emblem, its name with the level ("Platina 1") and the rest. */
interface Standing {
  /** The fundamentals' rank id ("platinum"), which the ladder marks. */
  rank: string
  /** The emblem of the tier and level ("/ranks/platinum-1.webp"). */
  icon?: string
  name: string
  /** "div. 2 · 641 pontos", "55 RR". */
  detail?: string
  /** After it on the home, what it came from: "última partida de Sova" (the agent behind Valorant's pages). */
  note?: string
}

/** Rocket League's, one per mode, from the ranked sessions, and the mode played last, which the home opens on. */
function rocketLeagueStandings(sessions: Session[], ranks: Rank[]) {
  const latest = sessions
    .flatMap((session) => session.matches)
    .filter((match) => (MODES as readonly string[]).includes(match.mode))
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  const modes = MODES.map((id: Mode) => {
    const standing = summarize(sessions, id).standing
    if (!standing) return { id, standing: undefined }
    const [, tier, level] = /^(.*?)(?:-(\d))?$/.exec(standing.tier)!
    const rank = ranks.find((each) => each.id === tier)
    const mine: Standing = {
      rank: tier,
      icon: `/ranks/${standing.tier}.webp`,
      name: tier === "unranked" ? T.unranked : [rank ? localize(rank.name) : tier, level].filter(Boolean).join(" "),
      detail: [divisionOf(standing), standing.mmr != null && `${decimal(standing.mmr, 0)} ${T.points}`].filter(Boolean).join(" · "),
    }
    return { id, standing: mine }
  })
  return { modes, latest: (latest?.mode as Mode | undefined) ?? "3v3" }
}

/** Valorant's: the latest ranked match's, or Luan's by hand (`rank` on the game) before the first. */
function valorantStanding(sessions: ValorantSession[], ranks: Rank[], byHand?: string): Standing | undefined {
  const summary = summarizeValorant(sessions)
  const latest = summary.rank
  const tier = tierId(latest?.tier)
  const rank = tier && ranks.find((rank) => tier.startsWith(rank.id))
  const agent = summary.matches.at(-1)?.agent
  if (latest && tier && rank) {
    return {
      rank: rank.id,
      icon: `/ranks/valorant/${tier}.webp`,
      name: [localize(rank.name), tier.match(/-(\d)$/)?.[1]].filter(Boolean).join(" "),
      detail: `${latest.rr} RR`,
      note: agent && T.lastWith.replace("{agent}", agent),
    }
  }
  const mine = byHand && ranks.find((rank) => rank.id === byHand)
  return mine ? { rank: mine.id, icon: mine.icons?.[0], name: localize(mine.name) } : undefined
}

/**
 * A game's home, the same for every game from the game kit (brand/interface.md, "The game kit"): what it's about, the
 * game's own moment (Rocket League's scene, Valorant's range), Luan's rank on the game's ladder, and a row for each
 * of its pages with a glimpse of what's in it, and for its lives on the channel with when they are. What differs is
 * the game's own: the moment, the marker, the emblems, the backdrop behind (the game's layout).
 */
export async function GameHome({
  game,
  sessions,
  lives,
  valorant = [],
  voltaic = [],
}: {
  game: Game
  sessions: Session[]
  /** Valorant's published sessions, when it's Valorant's home. */
  valorant?: ValorantSession[]
  /** The aim training's days (content/voltaic/), when the game has an aim page. */
  voltaic?: VoltaicDay[]
  /** The game's lives on the channel, newest first. */
  lives: Live[]
  /** The record's ranks (the ranked page's); the home names ranks from the fundamentals' own. */
  ranks?: RankInfo[]
}) {
  const paragraphs = localize(game.intro).split(/\n\s*\n/)
  const roadmap = fundamentals(game)
  const topics = entries(roadmap)
  const agenda = await buildAgenda()
  const scheduled = agenda ? hasGame(agenda, game.id) : false
  const videos = topics.filter(({ topic }) => topic.video).length

  const standing = game.id === "valorant" ? valorantStanding(valorant, roadmap.ranks, game.rank) : undefined
  const byMode = game.id === "rocket-league" ? rocketLeagueStandings(sessions, roadmap.ranks) : undefined
  const rankedModes = byMode?.modes.filter((each) => each.standing) ?? []
  const aim = game.aim ? summarizeVoltaic(voltaic) : undefined
  const aimLatest = aim?.benchmarks.at(-1)
  const aimRank = rankById(aimLatest?.rank)

  return (
    <>
      <PageIntro title={localize(game.title)} description={localize(game.description)} />

      {game.id === "rocket-league" && (
        <div className="relative -mx-6 mt-12 h-72 sm:mx-0 sm:h-80">
          <MomentStage />
        </div>
      )}
      {game.id === "valorant" && (
        <div className="-mx-6 mt-12 sm:mx-0">
          <Range />
        </div>
      )}

      <div className="mt-12 max-w-[38rem] space-y-5 text-[17px] leading-[1.6] text-ink">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {standing && (
        <Section title={T.rank} description={[standing.name, standing.detail, standing.note].filter(Boolean).join(" · ")} className="mt-16">
          <Ladder game={game.id} ranks={roadmap.ranks} current={standing.rank} />
        </Section>
      )}

      {byMode && rankedModes.length > 0 && (
        <Section title={T.rank} className="mt-16">
          <RankSwitch
            label={T.mode}
            initial={byMode.latest}
            modes={byMode.modes.map(({ id, standing: mine }) => ({
              id,
              content: mine ? (
                <>
                  <p className="mb-6 text-[15px] tabular-nums text-muted">{[mine.name, mine.detail].filter(Boolean).join(" · ")}</p>
                  <Ladder game={game.id} ranks={roadmap.ranks} current={mine.rank} />
                </>
              ) : (
                <EmptyState>{T.noRank}</EmptyState>
              ),
            }))}
          />
        </Section>
      )}

      <Section title={T.explore} className="mt-16">
        <PageList
          game={game.id}
          pages={[
            {
              href: gamePath(game, "fundamentals"),
              icon: "fundamentals",
              title: localize(roadmap.title),
              summary: localize(roadmap.description),
              badge: roadmap.language && <LanguageBadge language={roadmap.language} />,
              glimpse: (
                <span className="block space-y-1.5">
                  <span className="block text-[13px] tabular-nums text-muted">
                    {topics.length > 0 ? `${topics.length} ${T.topics} · ${videos} ${T.videos}` : T.soon}
                  </span>
                  <RoadmapProgress roadmap={roadmap.id} topics={topics.map(({ topic }) => topic.id)} />
                </span>
              ),
            },
            ...(game.ranked
              ? [
                  {
                    href: gamePath(game, "ranked"),
                    icon: "ranked" as const,
                    title: localize(game.ranked.title),
                    summary: localize(game.ranked.description),
                    glimpse: rankedModes.length ? (
                        <span className="flex gap-4">
                          {rankedModes.map(({ id, standing: mine }) => (
                            <span key={id} className="flex flex-col items-center gap-1 text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mine!.icon} alt="" className="h-8 w-8 object-contain" />
                              <span className="text-[13px] font-medium text-ink">{id}</span>
                              <span className="text-[12px] leading-[1.3] text-muted">{mine!.name}</span>
                            </span>
                          ))}
                        </span>
                      ) : standing?.detail ? (
                        <span className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {standing.icon && <img src={standing.icon} alt="" className="h-8 w-8 shrink-0 object-contain" />}
                          <span className="block">
                            <span className="block text-[15px] font-medium text-ink">{standing.name}</span>
                            <span className="block text-[13px] tabular-nums text-muted">{standing.detail}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-[13px] text-muted">{T.noRank}</span>
                      ),
                  },
                ]
              : []),
            ...(game.aim && aim
              ? [
                  {
                    href: gamePath(game, "aim"),
                    icon: "aim" as const,
                    title: localize(game.aim.title),
                    summary: localize(game.aim.description),
                    glimpse: aimLatest ? (
                      <span className="flex items-center gap-2.5">
                        <svg viewBox="0 0 20 20" aria-hidden className="h-7 w-7 shrink-0">
                          <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill={aimRank?.color ?? "var(--color-muted)"} />
                        </svg>
                        <span className="block">
                          <span className="block text-[15px] font-medium text-ink">{aimRank?.name ?? T.unranked}</span>
                          <span className="block text-[13px] tabular-nums text-muted">
                            {aimLatest.energy} {T.energy}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted">{aim.days.length ? `${aim.days.length} ${T.trained}` : T.noAim}</span>
                    ),
                  },
                ]
              : []),
            ...(game.inventory
              ? [
                  {
                    href: gamePath(game, "inventory"),
                    icon: "inventory" as const,
                    title: localize(game.inventory.title),
                    summary: localize(game.inventory.description),
                    glimpse: <CollectionGlimpse weapons={catalog().armas.map((weapon) => weapon.id)} start={seed()} of={T.of} collected={T.collected} />,
                  },
                ]
              : []),
            ...(lives[0] || scheduled
              ? [
                  {
                    href: channelPath("lives"),
                    icon: "lives" as const,
                    title: localize(channel.lives.title),
                    summary: localize(channel.lives.description),
                    badge: <LanguageBadge language="pt" />,
                    glimpse: (
                      <span className="block space-y-0.5">
                        <GameNextLine game={game.id} className="text-[15px] font-medium text-ink" />
                        {lives[0] && (
                          <span className="block text-[13px] text-muted">
                            {T.latestLive}: {dayMonth(lives[0].date)}
                          </span>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),
            ...game.links.map((link) => ({
              href: link.href!,
              icon: "link" as const,
              title: localize(link.name),
              summary: localize(link.summary),
              away: true,
              badge: link.language && <LanguageBadge language={link.language} />,
            })),
          ]}
        />
      </Section>

      <p className="mt-16 max-w-[38rem] text-[13px] leading-[1.6] text-muted">{localize(game.credits)}</p>
    </>
  )
}
