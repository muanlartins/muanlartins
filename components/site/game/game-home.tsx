import { LanguageBadge } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { PageList } from "@/components/site/game/page-list"
import { RoadmapProgress, ShowroomStage } from "@/components/site/game/game-home-client"
import { Ladder } from "@/components/site/game/ladder"
import { Range } from "@/components/site/game/range"
import { CollectionGlimpse } from "@/components/site/inventory/collection-glimpse"
import { divisionOf, longDate, tierOf, type RankInfo } from "@/components/site/ranked/format"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { slotsOf, slotText } from "@/lib/agenda"
import { fundamentals, gamePath, type Game } from "@/lib/game"
import type { Live } from "@/lib/lives"
import { MODES, summarize, type Mode, type Session } from "@/lib/ranked"
import { entries } from "@/lib/roadmap"
import { localize } from "@/lib/site"
import { summarizeValorant, tierId, type ValorantSession } from "@/lib/valorant"
import { catalog } from "@/lib/valorant-catalog-file"
import { seed } from "@/lib/valorant-inventory"
import { rankById, summarizeVoltaic, type VoltaicDay } from "@/lib/voltaic"

const T = localize({
  explore: { pt: "Por aqui", en: "In here" },
  videos: { pt: "vídeos", en: "videos" },
  topics: { pt: "tópicos", en: "topics" },
  points: { pt: "pts", en: "pts" },
  noRank: { pt: "Nenhuma partida publicada ainda.", en: "No matches published yet." },
  latestLive: { pt: "Última", en: "Latest" },
  drag: { pt: "Arraste para girar", en: "Drag to spin" },
  live: { pt: "Ao vivo", en: "Live" },
  soon: { pt: "Primeiros tópicos em breve", en: "First topics soon" },
  energy: { pt: "de energia", en: "energy" },
  of: { pt: "de", en: "of" },
  collected: { pt: "skins na coleção", en: "skins collected" },
  unranked: { pt: "Sem rank", en: "Unranked" },
  trained: { pt: "dias de treino", en: "days trained" },
  noAim: { pt: "O primeiro treino entra aqui.", en: "The first training shows up here." },
})

/**
 * A game's home: what it's about, the game's own moment (Rocket League's car
 * on a turntable, Valorant's range), Luan's rank on the ladder while the game
 * has no ranked record, and a card for each of its pages with a glimpse of
 * what's in it, and for its lives on the channel with when they are.
 */
export function GameHome({
  game,
  sessions,
  lives,
  ranks,
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
  ranks: RankInfo[]
}) {
  const paragraphs = localize(game.intro).split(/\n\s*\n/)
  const roadmap = fundamentals(game)
  const topics = entries(roadmap)
  const slots = slotsOf(game.id)
  const videos = topics.filter(({ topic }) => topic.video).length

  // The rank in the mode played last.
  const latest = sessions
    .flatMap((session) => session.matches)
    .filter((match) => (MODES as readonly string[]).includes(match.mode))
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  const mode = latest?.mode as Mode | undefined
  const standing = mode && summarize(sessions, mode).standing
  // Valorant's rank: the latest match's, or Luan's by hand before the first.
  const valorantRank = summarizeValorant(valorant).rank
  const valorantTier = tierId(valorantRank?.tier)
  const ladderAt = valorantTier ? valorantTier.replace(/-\d$/, "") : game.rank
  const valorantInfo = valorantTier && roadmap.ranks.find((rank) => valorantTier.startsWith(rank.id))
  const aim = game.aim ? summarizeVoltaic(voltaic) : undefined
  const aimLatest = aim?.benchmarks.at(-1)
  const aimRank = rankById(aimLatest?.rank)

  return (
    <>
      <PageIntro title={localize(game.title)} description={localize(game.description)} />

      {game.id === "rocket-league" && (
        <div className="relative -mx-6 mt-6 h-64 sm:mx-0 sm:h-80">
          <ShowroomStage />
          <p className="pointer-events-none absolute bottom-1 right-6 text-[12px] text-muted sm:right-0">{T.drag}</p>
        </div>
      )}
      {game.id === "valorant" && (
        <div className="-mx-6 mt-8 sm:mx-0">
          <Range />
        </div>
      )}

      <div className="mt-10 max-w-[38rem] space-y-5 text-[17px] leading-[1.7] text-ink">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {ladderAt && <Ladder ranks={roadmap.ranks} current={ladderAt} className="mt-12" />}

      <section className="mt-16">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{T.explore}</h2>
        <div className="mt-4">
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
                  <span className="space-y-1.5">
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
                      glimpse: standing ? (
                        <RankLine tier={standing.tier} ranks={ranks} mode={mode!} division={divisionOf(standing)} mmr={standing.mmr} />
                      ) : valorantInfo && valorantRank ? (
                        <span className="flex items-center gap-2 text-[14px] text-ink">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/ranks/valorant/${valorantTier}.webp`} alt="" className="h-7 w-7 object-contain" />
                          <span className="font-medium">
                            {localize(valorantInfo.name)} {valorantTier!.match(/-(\d)$/)?.[1]}
                          </span>
                          <span className="tabular-nums text-muted">· {valorantRank.rr} RR</span>
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
                        <span className="flex items-center gap-2 text-[14px] text-ink">
                          <svg viewBox="0 0 20 20" aria-hidden className="h-6 w-6 shrink-0">
                            <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill={aimRank?.color ?? "var(--color-muted)"} />
                          </svg>
                          <span className="font-medium" style={{ color: aimRank?.color }}>
                            {aimRank?.name ?? T.unranked}
                          </span>
                          <span className="tabular-nums text-muted">
                            · {aimLatest.energy} {T.energy}
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
              ...(lives[0] || slots.length > 0
                ? [
                    {
                      href: channelPath("lives"),
                      icon: "lives" as const,
                      title: localize(channel.lives.title),
                      summary: localize(channel.lives.description),
                      badge: <LanguageBadge language="pt" />,
                      glimpse: (
                        <span className="space-y-0.5">
                          {slots.map((slot) => (
                            <span key={slot.start} className="block text-[14px] font-medium text-ink">
                              {slotText(slot)}
                            </span>
                          ))}
                          {lives[0] && (
                            <span className="block text-[12px] text-muted">
                              {T.latestLive}: {longDate(lives[0].date)}
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
        </div>
      </section>

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{localize(game.credits)}</p>
    </>
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
