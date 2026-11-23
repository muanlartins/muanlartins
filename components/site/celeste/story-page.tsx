import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { storyPages, type StoryPage } from "@/components/site/celeste/historia"
import { MountainBackdrop } from "@/components/site/celeste/mountain-backdrop"
import { DocPage, DocSection, type DocMeta } from "@/components/site/docs"
import { shortDate } from "@/components/site/ranked/format"
import { CHAPTERS, CREDITS } from "@/content/celeste"
import { livePath } from "@/lib/channel"
import { celestePath, save } from "@/lib/celeste"
import { hours } from "@/lib/diversos"
import type { Live } from "@/lib/lives"
import { UI } from "@/lib/site"

const T = {
  story: "A história",
  finished: "Terminei",
  deaths: "Mortes",
  time: "Tempo",
  berries: "Morangos",
  around: "Outras páginas da história",
}

const number = (n: number) => n.toLocaleString("pt-BR")

export const storyPath = (page: StoryPage) => `${celestePath()}/${page.slug}`

/**
 * A page of Celeste's story (components/site/celeste/historia): the game's, or a chapter's with his numbers there from
 * the save (the day he finished it, linked to that live, its deaths, time and strawberries). Each section the save
 * doesn't allow yet (`needs`) is left out, so the page grows as he finds the chapter's secrets.
 */
export function StoryPageView({ page, lives }: { page: StoryPage; lives: Live[] }) {
  const { lede, meta, sections } = page.story()
  const shown = sections.filter((section) => !section.needs || save.done[section.needs])
  const pages = storyPages()
  const index = pages.findIndex((each) => each.slug === page.slug)
  const [previous, next] = [pages[index - 1], pages[index + 1]]

  return (
    <>
      <MountainBackdrop />
      <DocPage
        trail={[{ label: "Celeste", href: celestePath() }]}
        here={T.story}
        title={page.title}
        description={lede}
        meta={page.area === undefined ? (meta ?? []) : chapterMeta(page.area, lives)}
        toc={shown.map(({ id, title }) => ({ id, title }))}
      >
        {shown.map((section, n) => (
          <DocSection key={section.id} id={section.id} n={n + 1} title={section.title} description={section.description}>
            {section.body}
          </DocSection>
        ))}

        <nav aria-label={T.around} className="mt-24 grid grid-cols-2 gap-6 border-t border-line pt-3">
          {previous ? <Neighbour page={previous} label={UI.previous} /> : <span />}
          {next && <Neighbour page={next} label={UI.next} forward />}
        </nav>
        <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{CREDITS}</p>
      </DocPage>
    </>
  )
}

/** His numbers in the chapter, from the save: the day he finished it (that live's page when it's on the site), deaths, time, strawberries. */
function chapterMeta(area: number, lives: Live[]): DocMeta[] {
  const chapter = CHAPTERS.find((each) => each.id === area)!
  const fact = save.done[`${area}/A`]
  const side = save.sides[`${area}/A`]
  const live = fact?.live && lives.find((each) => each.date === fact.live)
  const meta: DocMeta[] = []
  if (fact?.date) {
    const day = shortDate(fact.date)
    meta.push({ label: T.finished, value: live ? <Link href={livePath(live.date)} className="text-klein hover:underline">{day}</Link> : day })
  }
  if (side) {
    meta.push({ label: T.deaths, value: number(side.deaths) }, { label: T.time, value: hours(side.seconds) })
    if (chapter.red) meta.push({ label: T.berries, value: `${side.red}/${chapter.red}` })
  }
  return meta
}

function Neighbour({ page, label, forward = false }: { page: StoryPage; label: string; forward?: boolean }) {
  const Arrow = forward ? ArrowRight : ArrowLeft
  return (
    <Link href={storyPath(page)} className={`group block py-3 ${forward ? "text-right" : ""}`}>
      <span className={`eyebrow flex items-center gap-1.5 text-muted ${forward ? "justify-end" : ""}`}>
        {!forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
        {label}
        {forward && <Arrow aria-hidden className="h-3.5 w-3.5" />}
      </span>
      <span className="mt-1 block text-[15px] font-medium text-ink transition-colors group-hover:text-klein">{page.title}</span>
    </Link>
  )
}
