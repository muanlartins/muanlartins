import { ArrowRight, Medal } from "lucide-react"
import Link from "next/link"
import { CodeChip, Callout, DefList, DocPage, DocSection, docsLinks } from "@/components/site/docs"
import { cardClass } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { commands } from "@/lib/commands"
import { isArchived } from "@/lib/game"
import { sigmaRules } from "@/lib/sigma-rules"
import { localize, MURAL_SLUG, profileSlug } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize(channel)
const S = T.sigma
const number = new Intl.NumberFormat("pt-BR")

/** A link inside a definition, to where the thing is. */
function To({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 font-medium text-klein underline decoration-line underline-offset-4 hover:decoration-klein">
      {children}
      <ArrowRight aria-hidden className="h-3.5 w-3.5" />
    </Link>
  )
}

/**
 * /canal/sigma, a documentation page: Σ, the site's points. How they come (comandos.json's `sigma`, the same list the
 * commands page had), the ranks they make (public/stream/sigma.js, read at build time), what they're for (they lock
 * nothing: Luan, 2026-11-23) and where to see your own. Linked from the commands page and, for the profile's area, from
 * /perfil.
 */
export function SigmaPage() {
  const { ganhos } = commands().sigma
  const { tiers, valorantGold } = sigmaRules()
  const toc = [
    { id: "como-ganhar", title: S.earn.title },
    { id: "ranks", title: S.ranks.title },
    { id: "pra-que-servem", title: S.uses.title },
    { id: "onde-ver", title: S.where.title },
  ]
  const term = (text: string) => <span className="text-[15px] font-medium text-ink">{text}</span>

  return (
    <DocPage
      trail={[{ label: T.title, href: channelPath() }]}
      title={S.title}
      description={S.description}
      meta={[
        { label: S.meta.ways, value: ganhos.length },
        { label: S.meta.ranks, value: tiers.length },
      ]}
      toc={toc}
      more={docsLinks(channelPath("sigma"))}
    >
      <DocSection id="como-ganhar" n={1} title={S.earn.title}>
        <DefList
          termWidth="5rem"
          side
          head={[S.earn.head.amount, S.earn.head.how]}
          items={ganhos.map((g) => ({ key: g.como, term: <span className="text-[17px] font-semibold tabular-nums text-klein">{g.quanto}</span>, detail: g.como }))}
        />
        <Callout className="mt-6">
          {S.earn.twitch}{" "}
          <Link href={`${channelPath("comandos")}#recompensas`} className="font-medium text-klein underline underline-offset-4">
            {S.earn.rewards}
          </Link>
        </Callout>
      </DocSection>

      <DocSection id="ranks" n={2} title={S.ranks.title} description={S.ranks.text}>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiers.map((tier) => (
            <li key={tier.id} className={cn(cardClass, "flex flex-col items-start gap-3 p-5")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tier.emblem} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
              <span>
                <span className="block text-[15px] font-medium text-ink">{tier.name}</span>
                <span className="block text-[13px] tabular-nums text-muted">
                  {S.ranks.from} {number.format(tier.from)}&nbsp;Σ
                </span>
              </span>
            </li>
          ))}
        </ol>
        {/* Valorant's scene's ranks, not while the game is archived (lib/game.ts). */}
        {valorantGold != null && !isArchived("valorant") && <p className="mt-4 max-w-[38rem] text-[13px] leading-[1.5] text-muted">{S.ranks.valorant.replace("{n}", number.format(valorantGold)).replace(" Σ", "\u00a0Σ")}</p>}
      </DocSection>

      <DocSection id="pra-que-servem" n={3} title={S.uses.title}>
        <DefList
          items={[
            { key: "rank", term: term(S.uses.rank.term), detail: S.uses.rank.text },
            { key: "stand", term: term(S.uses.stand.term), detail: S.uses.stand.text },
            {
              key: "ranking",
              term: term(S.uses.ranking.term),
              detail: (
                <>
                  {S.uses.ranking.text} <To href={`/${MURAL_SLUG}#torcida`}>{S.where.mural.term}</To>
                </>
              ),
            },
            {
              key: "games",
              term: term(S.uses.games.term),
              detail: (
                <>
                  {S.uses.games.text} <To href={channelPath("minijogos")}>{T.minijogos.title}</To>
                </>
              ),
            },
            { key: "dedication", term: term(S.uses.dedication.term), detail: S.uses.dedication.text },
            { key: "discord", term: term(S.uses.discord.term), detail: S.uses.discord.text },
          ]}
        />
        <Callout className="mt-6">
          {S.uses.free} <To href={`/${profileSlug()}`}>{T.comandos.profile.cta}</To>
        </Callout>
      </DocSection>

      <DocSection id="onde-ver" n={4} title={S.where.title}>
        <DefList
          items={[
            {
              key: "chat",
              term: (
                <span className="flex flex-wrap gap-1.5">
                  <CodeChip>!sigma</CodeChip>
                  <CodeChip>!sigma @alguém</CodeChip>
                </span>
              ),
              detail: S.where.chat,
            },
            {
              key: "profile",
              term: (
                <Link href={`/${profileSlug()}`} className="text-[15px] font-medium text-klein underline decoration-line underline-offset-4 hover:decoration-klein">
                  {S.where.profile.term}
                </Link>
              ),
              detail: S.where.profile.text,
            },
            { key: "page", term: term(S.where.page.term), detail: S.where.page.text },
            {
              key: "mural",
              term: (
                <Link href={`/${MURAL_SLUG}#torcida`} className="text-[15px] font-medium text-klein underline decoration-line underline-offset-4 hover:decoration-klein">
                  {S.where.mural.term}
                </Link>
              ),
              detail: S.where.mural.text,
            },
          ]}
        />
        <Callout icon={Medal} className="mt-6">
          {S.where.medals}
        </Callout>
      </DocSection>
    </DocPage>
  )
}
