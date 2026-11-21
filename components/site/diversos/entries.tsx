import { ArrowRight, ArrowUpRight, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { DiversosNext } from "@/components/site/diversos/diversos-next"
import { buttonClass, CardLink } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { diversos, diversosPath } from "@/lib/diversos"
import { localize } from "@/lib/site"

const MAIN = games.map((game) => game.id)
const NEXT = `${localize(channel.games.next)}: `
const names = new Intl.ListFormat("pt-BR").format(diversos.games.map((game) => game.name))

/** "Jogos diversos" in the content page's list of games (game-list.tsx): its line, its next live, each game a click away. */
export function DiversosRow() {
  return (
    <li className="space-y-3 py-8">
      <Link href={diversosPath()} className="group flex items-start justify-between gap-6">
        <span className="space-y-2">
          <span className="flex items-center gap-3 text-2xl font-medium tracking-[-0.02em] text-klein">{diversos.page.title}</span>
          <span className="block max-w-[34rem] text-[15px] leading-[1.6] text-ink">{diversos.page.description}</span>
        </span>
        <ArrowUpRight aria-hidden className="mt-1.5 h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-klein" />
      </Link>
      <DiversosNext main={MAIN} prefix={NEXT} suffix={` (${localize(channel.lives.agenda.zone)})`} className="block text-[13px] text-muted" />
      {diversos.games.length > 0 && (
        <nav aria-label={diversos.page.title} className="flex flex-wrap gap-2 pt-1">
          {diversos.games.map((game) => (
            <Link key={game.id} href={diversosPath(game)} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {game.name}
            </Link>
          ))}
        </nav>
      )}
    </li>
  )
}

/** "Jogos diversos" as the channel home's third game card (channel-home.tsx, "Jogos"): the next live of any of them. */
export function DiversosCard() {
  return (
    <CardLink href={diversosPath()} className="group flex items-center gap-4 px-5 py-4 sm:col-span-2">
      <span className="cut-sm grid h-11 w-11 shrink-0 place-items-center bg-klein/[0.08] text-klein">
        <Gamepad2 aria-hidden className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-medium tracking-[-0.02em] text-klein">{diversos.page.title}</span>
        <DiversosNext main={MAIN} prefix={NEXT} fallback={names} className="block text-[13px] text-muted" />
      </span>
      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-klein" />
    </CardLink>
  )
}
