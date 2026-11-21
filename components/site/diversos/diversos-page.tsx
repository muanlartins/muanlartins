import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { DiversosNext } from "@/components/site/diversos/diversos-next"
import { DiversosSign, GameCover } from "@/components/site/diversos/game-cover"
import { PageIntro } from "@/components/site/page-intro"
import { longDate, shortDate, weekday } from "@/components/site/ranked/format"
import { Card, CardLink, EmptyState, Section } from "@/components/site/ui"
import { games } from "@/content/projects"
import { livePath } from "@/lib/channel"
import { diversos, diversosPath, hours, lineOf, playedOf, progressOf, type Goal, type GoalItem, type OtherGame } from "@/lib/diversos"
import type { Live } from "@/lib/lives"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const MAIN = games.map((game) => game.id)
const number = (n: number) => n.toLocaleString("pt-BR")

const T = {
  next: "Próxima live",
  noLives: "Nenhuma live ainda",
  lives: (n: number) => (n === 1 ? "1 live" : `${n} lives`),
  last: (date: string) => `última em ${shortDate(date)}`,
  goal: "Meta",
  of: (done: number, total: number) => `${done} de ${total}`,
  doneOf: (done: number, total: number) => `${done} de ${total} ${done === 1 ? "feito" : "feitos"}`,
  livesTitle: "Lives",
  mine: (name: string) => `Minhas lives de ${name}.`,
  livesEmpty: (name: string) => `Nenhuma live de ${name} ainda. Quando tiver, ela entra aqui com o vídeo.`,
  notes: "Notas",
  played: "Horas",
  lastLive: "Última live",
  none: "–",
  done: "Feito: ",
  missing: "Falta: ",
  doneIn: (date: string) => `na live de ${shortDate(date)}`,
  doneOn: (date: string) => `em ${shortDate(date)}`,
  strawberries: "Morangos",
  deaths: "Mortes",
  inGame: "No jogo",
  fromSave: (date: string) => `Morangos, mortes, tempo e meta lidos do save do jogo em ${shortDate(date)}.`,
  empty: "Nenhum jogo aqui ainda. Cada jogo novo das lives entra nesta lista.",
  credits: "Cada jogo e a sua capa são de quem fez o jogo. As capas vêm da Twitch, e o site não é oficial.",
}

type Played = ReturnType<typeof playedOf>

/** /conteudo/diversos: every other game, each a card with its lives, hours and goal. */
export function DiversosPage({ played }: { played: Map<string, Played> }) {
  return (
    <>
      <PageIntro title={diversos.page.title} description={diversos.page.description} />

      <div className="mt-12 space-y-4">
        <DiversosNext main={MAIN} prefix={`${T.next}: `} className="block text-[15px] text-muted" />
        {diversos.games.length === 0 ? (
          <EmptyState>{T.empty}</EmptyState>
        ) : (
          <ul className="space-y-4">
            {diversos.games.map((game) => (
              <li key={game.id}>
                <GameCard game={game} played={played.get(game.id)!} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{T.credits}</p>
    </>
  )
}

function GameCard({ game, played }: { game: OtherGame; played: Played }) {
  const last = played.lives[0]?.live.date
  const meta = played.lives.length ? [T.lives(played.lives.length), hours(played.seconds), T.last(last!)].join(" · ") : T.noLives
  const line = lineOf(game)
  return (
    <CardLink href={diversosPath(game)} className="group flex gap-4 sm:gap-5">
      <GameCover game={game} className="w-20 sm:w-24" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{game.name}</h2>
          <ArrowRight aria-hidden className="mt-1.5 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-klein" />
        </div>
        {line && <p className="max-w-[34rem] text-[15px] leading-[1.6] text-ink">{line}</p>}
        <p className="text-[13px] text-muted">
          {meta}
          <DiversosNext main={MAIN} categoryId={game.categoryId} name={game.category} prefix={` · ${T.next}: `} className="inline-block" />
        </p>
        {game.goal && <GoalBar goal={game.goal} />}
      </div>
    </CardLink>
  )
}

/** How much of a goal is done, as a bar: on a card with its name, on its page (under its title) with the share. */
function GoalBar({ goal, large = false }: { goal: Goal; large?: boolean }) {
  const { done, total } = progressOf(goal)
  const share = total ? done / total : 0
  return (
    <span className="block space-y-1.5 pt-1">
      <span className="flex items-baseline justify-between gap-3">
        {large ? (
          <span className="text-[15px] tabular-nums text-ink">{T.doneOf(done, total)}</span>
        ) : (
          <span className="text-[13px] text-ink">
            <span className="eyebrow mr-2 text-muted">{T.goal}</span>
            <span className="font-medium">{goal.title}</span>
          </span>
        )}
        <span className="text-[13px] tabular-nums text-muted">{large ? `${Math.round(share * 100)}%` : T.of(done, total)}</span>
      </span>
      <span aria-hidden className={`block bg-klein/10 ${large ? "h-2" : "h-1.5"}`}>
        <span className="block h-full bg-klein" style={{ width: `${share * 100}%` }} />
      </span>
    </span>
  )
}

/** /conteudo/diversos/<game>: its numbers, its goal's checklist, its lives and notes. */
export function DiversosGamePage({ game, played }: { game: OtherGame; played: Played }) {
  const last = played.lives[0]?.live.date
  const line = lineOf(game)
  const description = line ?? T.mine(game.name)
  const totals = game.save?.totals
  const stats = [
    { label: T.livesTitle, value: String(played.lives.length) },
    { label: T.played, value: played.seconds ? hours(played.seconds) : T.none },
    { label: T.lastLive, value: last ? shortDate(last) : T.none },
    // From the game's own save, when it's read (scripts/celeste.py).
    ...(totals
      ? [
          { label: T.strawberries, value: number(totals.strawberries) },
          { label: T.deaths, value: number(totals.deaths) },
          { label: T.inGame, value: hours(totals.seconds) },
        ]
      : []),
  ]
  return (
    <>
      <PageIntro title={game.name} description={description} />

      <div className="mt-12 space-y-16">
        <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <GameCover game={game} className="w-20 sm:w-28" />
          <div className="min-w-0 flex-1 space-y-4">
            <dl className="grid grid-cols-3 gap-x-3 gap-y-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="eyebrow text-muted">{stat.label}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] text-klein">{stat.value}</dd>
                </div>
              ))}
            </dl>
            {game.save?.read && <p className="text-[13px] text-muted">{T.fromSave(game.save.read)}</p>}
            <DiversosNext main={MAIN} categoryId={game.categoryId} name={game.category} prefix={`${T.next}: `} className="block text-[13px] text-muted" />
          </div>
        </Card>

        {game.goal && (
          <Section title={`${T.goal}: ${game.goal.title}`}>
            <GoalBar goal={game.goal} large />
            <div className="mt-8 space-y-6">
              {game.goal.groups.map((group, index) => (
                <div key={group.title ?? index}>
                  {group.title && (
                    <h3 className="mb-2.5 flex items-baseline justify-between gap-3 text-[15px] font-medium text-ink">
                      {group.title}
                      <span className="text-[13px] font-normal tabular-nums text-muted">
                        {group.items.filter((item) => item.done).length}/{group.items.length}
                      </span>
                    </h3>
                  )}
                  <ul className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <li key={item.text}>
                        <GoalChip item={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title={T.livesTitle}>
          {played.lives.length === 0 ? (
            <EmptyState>{T.livesEmpty(game.name)}</EmptyState>
          ) : (
            <ul className="space-y-4">
              {played.lives.map(({ live, seconds }) => (
                <li key={live.date}>
                  <LiveRow live={live} meta={[weekday(live.date), hours(seconds)].join(" · ")} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {game.notes && game.notes.length > 0 && (
          <Section title={T.notes}>
            <div className="max-w-[38rem] space-y-4 text-[15px] leading-[1.6] text-ink">
              {game.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </Section>
        )}
      </div>

      <p className="mt-16 text-[12px] leading-[1.6] text-muted">{T.credits}</p>
    </>
  )
}

/** One thing of a goal, as a square chip: Klein once done (a link to the live it was done in, when known). */
function GoalChip({ item }: { item: GoalItem }) {
  const inner = (
    <>
      <span aria-hidden className={cn("grid h-3.5 w-3.5 shrink-0 place-items-center border", item.done ? "border-paper/80" : "border-line-strong")}>
        {item.done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </span>
      <span className="sr-only">{item.done ? T.done : T.missing}</span>
      {item.text}
    </>
  )
  const className = cn("inline-flex items-center gap-1.5 px-2 py-1 text-[14px]", item.done ? "bg-klein text-paper" : "bg-klein/[0.06] text-ink")
  if (!item.live) {
    return (
      <span className={className} title={item.date ? `Feito ${T.doneOn(item.date)}` : undefined}>
        {inner}
        {item.date && <span className="sr-only">, {T.doneOn(item.date)}</span>}
      </span>
    )
  }
  return (
    <Link href={livePath(item.live)} title={`Feito ${T.doneIn(item.live)}`} className={cn(className, "transition-colors hover:bg-navy")}>
      {inner}
      <span className="sr-only">, {T.doneIn(item.live)}</span>
    </Link>
  )
}

/** A live in a row: its thumbnail, its date, the time played and its summary. */
function LiveRow({ live, meta }: { live: Live; meta: string }) {
  return (
    <CardLink href={livePath(live.date)} className="flex flex-col gap-4 p-3 sm:flex-row sm:items-center">
      {live.video ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://i.ytimg.com/vi/${live.video}/mqdefault.jpg`} alt="" className="cut-sm aspect-video w-full shrink-0 bg-klein object-cover sm:w-48" />
      ) : (
        <DiversosSign className="cut-sm aspect-video w-full shrink-0 sm:w-48" />
      )}
      <div className="space-y-1.5 px-2 pb-2 sm:px-0 sm:pb-0">
        <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{longDate(live.date)}</h3>
        <p className="text-[13px] text-muted first-letter:uppercase">{meta}</p>
        <p className="text-[15px] leading-[1.6] text-ink">{localize(live.summary)}</p>
      </div>
    </CardLink>
  )
}
