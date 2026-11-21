import { ArrowUpRight } from "lucide-react"
import { LanguageBadge } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { channel } from "@/content/channel"
import { GameNext } from "@/components/site/agenda/game-next"
import { DiversosRow } from "@/components/site/diversos/entries"
import { buttonClass } from "@/components/site/ui"
import { fundamentals, gamePath, type Game } from "@/lib/game"
import { localize, type L10n } from "@/lib/site"

const T = localize({
  fundamentals: { pt: "Fundamentos", en: "Fundamentals" },
})

/**
 * The content page: each game with its pages one click away (its fundamentals, its ranked record, its aim
 * training, its links
 * elsewhere) and when it's live, so nobody has to go through a game's home to reach them. Then the other games
 * ("Jogos diversos"), each one a click away.
 */
export function GameList({ page, games }: { page: { title: L10n; description: L10n }; games: Game[] }) {
  return (
    <>
      <PageIntro title={localize(page.title)} description={localize(page.description)} />

      <ul className="mt-12 divide-y divide-line border-y border-line">
        {games.map((game) => {
          const pages = [
            { label: T.fundamentals, href: gamePath(game, "fundamentals") },
            ...(game.ranked
              ? [
                  {
                    label: localize(game.ranked.title),
                    href: gamePath(game, "ranked"),
                  },
                ]
              : []),
            ...(game.aim ? [{ label: localize(game.aim.title), href: gamePath(game, "aim") }] : []),
            ...game.links.flatMap((link) => (link.href ? [{ label: localize(link.name), href: link.href, away: true }] : [])),
          ]
          return (
            <li key={game.id} className="space-y-3 py-8">
              <a href={gamePath(game)} className="group flex items-start justify-between gap-6">
                <span className="space-y-2">
                  <span className="flex items-center gap-3 text-2xl font-medium tracking-[-0.02em] text-klein">
                    {localize(game.title)}
                    <LanguageBadge language={fundamentals(game).language} />
                  </span>
                  <span className="block max-w-[34rem] text-[15px] leading-[1.6] text-ink">{localize(game.description)}</span>
                </span>
                <ArrowUpRight className="mt-1.5 h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-klein" />
              </a>
              <GameNext game={game.id} as="p" className="text-[13px] text-muted" prefix={`${localize(channel.games.next)}: `} suffix={` (${localize(channel.lives.agenda.zone)})`} />
              <nav className="flex flex-wrap gap-2 pt-1">
                {pages.map((page) => (
                  <a
                    key={page.href}
                    href={page.href}
                    {...("away" in page &&
                      page.href.startsWith("http") && {
                        target: "_blank",
                        rel: "noreferrer",
                      })}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    {page.label}
                    {"away" in page && <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />}
                  </a>
                ))}
              </nav>
            </li>
          )
        })}
        <DiversosRow />
      </ul>
    </>
  )
}
