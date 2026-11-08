import { ArrowUpRight } from "lucide-react"
import { LanguageBadge } from "@/components/site/language-badge"
import { PageIntro } from "@/components/site/page-intro"
import { channel } from "@/content/channel"
import { slotsOf, slotText } from "@/lib/agenda"
import { fundamentals, gamePath, type Game } from "@/lib/game"
import { localize, type L10n } from "@/lib/site"

const T = localize({
  fundamentals: { pt: "Fundamentos", en: "Fundamentals" },
  live: { pt: "Ao vivo", en: "Live" },
})

/**
 * The content page: each game with its pages one click away (its fundamentals, its ranked record, its links
 * elsewhere) and when it's live, so nobody has to go through a game's home to reach them.
 */
export function GameList({ page, games }: { page: { title: L10n; description: L10n }; games: Game[] }) {
  return (
    <>
      <PageIntro title={localize(page.title)} description={localize(page.description)} />

      <ul className="mt-16 divide-y divide-line border-y border-line">
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
              {slotsOf(game.id).map((slot) => (
                <p key={slot.start} className="text-[13px] text-muted">
                  {T.live}: {slotText(slot)} ({localize(channel.lives.agenda.zone)})
                </p>
              ))}
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
                    className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-[14px] text-ink transition-colors hover:border-klein hover:text-klein"
                  >
                    {page.label}
                    {"away" in page && <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />}
                  </a>
                ))}
              </nav>
            </li>
          )
        })}
      </ul>
    </>
  )
}
