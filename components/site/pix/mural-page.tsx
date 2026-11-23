"use client"

import { Download, Music } from "lucide-react"
import Script from "next/script"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { Audience } from "@/components/site/pix/audience"
import { GiftSubs, PresentView, TreeView } from "@/components/site/pix/christmas"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { GoalBar, timeLeft } from "@/components/site/pix/goal-bar"
import { BadgeChips } from "@/components/site/profile/badges"
import { Badge, ButtonLink, Card, EmptyState, ErrorLine, Section, Skeleton, TabPanel, Tabs, buttonClass } from "@/components/site/ui"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { mural as muralCopy, STYLES } from "@/content/pix"
import { firstDayOf, lastDayOf, loadMural, PIX_API, reais, type Goal, type Mural, type MuralPix, type PlannedGoal, type PresentKit, type SongTimes } from "@/lib/pix"
import { loadFans, loadSigmas, type SavedFan, type Sigma, type SigmaStats } from "@/lib/profile"
import { LOCALE, localize, PIX_SLUG } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(muralCopy)
const LANG = LOCALE === "pt" ? "pt-BR" : "en"
const THIS_YEAR = new Date().getFullYear()
/** "21/11", with the year only when it isn't this one (brand/voz.md, "Dates"). */
const dayMonth = (date: Date, timeZone?: string) =>
  date.toLocaleDateString(LANG, { day: "2-digit", month: "2-digit", ...(date.getFullYear() !== THIS_YEAR ? { year: "numeric" } : {}), timeZone })
const day = (iso: string) => dayMonth(new Date(iso))
/** The same from a Brasília day ("YYYY-MM-DD"). */
const dayOf = (date: string) => dayMonth(new Date(`${date}T12:00:00Z`), "UTC")
const eyebrow = "eyebrow text-klein"

interface Look {
  fans: Record<string, SavedFan> | null
  S: Sigma | null
  sigmas: Record<string, SigmaStats>
  /** presente.js, loaded when there's a Christmas goal. */
  P: PresentKit | null
}

/**
 * Each Pix, every one drawn the same way (an anonymous one too, with "?" on its stand and Anônimo for a name): the
 * sender's fan (or initial), name, value, badges, day, message and song. In a Christmas goal (`tree`), the present it hung.
 */
function Supporters({ list, look: { fans, S, sigmas, P }, tree }: { list: MuralPix[]; look: Look; tree?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {list.map((p) => (
        <li key={p.em} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <FanSpot fans={fans} login={p.login} name={p.nome} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <strong className="text-[17px] font-medium break-words text-ink">
                {p.login ? <ViewerName login={p.login}>{p.nome || p.login}</ViewerName> : p.nome || text.anonymous}
              </strong>
              <span className="flex items-center gap-2 text-[17px] font-medium text-klein tabular-nums">
                {tree && P && <PresentView kit={P} present={P.normalizar(p.presente, p.em)} className="h-6 w-6" />}R$ {reais(p.centavos)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {S && p.login && sigmas[p.login] && <BadgeChips badges={S.medalhas(sigmas[p.login], LOCALE)} streak={sigmas[p.login].sequencia} />}
              <span className="text-[13px] text-muted tabular-nums">{day(p.em)}</span>
            </div>
            {p.mensagem && <Message words={p.mensagem} />}
            {p.musica && <Song song={p.musica} name={p.nome} />}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A Pix's message; a long one (a minute's recording, written out) folds after five lines. */
function Message({ words }: { words: string }) {
  const [open, setOpen] = useState(false)
  const long = words.length > 320
  return (
    <div className="pt-1">
      <p className={cn("text-[15px] leading-[1.6] break-words text-ink", long && !open && "line-clamp-5")}>{words}</p>
      {long && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cn(buttonClass({ variant: "quiet", size: "sm" }), "mt-1")}>
          {open ? text.messageLess : text.messageMore}
        </button>
      )}
    </div>
  )
}

/** The lyrics as sections of lines, each non-blank line with its time when the API has them (and they match the lines). */
function lyricSections(lyrics: string, times?: SongTimes) {
  const lines = lyrics.split("\n").map((l) => l.trim())
  const count = lines.filter(Boolean).length
  const timed = Array.isArray(times) && times.length === count
  const sections: { k: number; text: string; at: number | null }[][] = [[]]
  let k = 0
  for (const line of lines) {
    if (!line) {
      if (sections.at(-1)!.length) sections.push([])
      continue
    }
    const t = timed ? times[k] : null
    sections.at(-1)!.push({ k, text: line, at: Array.isArray(t) ? t[0] : null })
    k++
  }
  return { sections: sections.filter((s) => s.length), timed: timed && times.some(Boolean) }
}

/** A Pix's song, once it played on the live: to listen to, download and read; the lyrics follow the player, Spotify-style, when they're timed. */
function Song({ song, name }: { song: NonNullable<MuralPix["musica"]>; name: string }) {
  const style = STYLES.find((s) => s.id === song.estilo)?.name
  const audio = useRef<HTMLAudioElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(-1)
  const { sections, timed } = useMemo(() => lyricSections(song.letra ?? "", song.tempos), [song.letra, song.tempos])

  // The line being sung: the last one started (a little early, as karaoke does), followed every frame while it plays.
  useEffect(() => {
    const a = audio.current
    if (!a || !timed) return
    const starts = sections.flat().filter((l) => l.at !== null) as { k: number; at: number }[]
    let frame = 0
    const follow = () => {
      const t = a.currentTime + 0.15
      let k = -1
      for (const l of starts) if (l.at <= t) k = l.k
      setCurrent(k)
    }
    const tick = () => {
      follow()
      if (!a.paused) frame = requestAnimationFrame(tick)
    }
    const play = () => {
      setOpen(true)
      cancelAnimationFrame(frame)
      tick()
    }
    a.addEventListener("play", play)
    a.addEventListener("seeked", follow)
    a.addEventListener("pause", follow)
    return () => {
      cancelAnimationFrame(frame)
      a.removeEventListener("play", play)
      a.removeEventListener("seeked", follow)
      a.removeEventListener("pause", follow)
    }
  }, [sections, timed])

  // The lit line stays in view, a third down the box (the box scrolls, not the page).
  useEffect(() => {
    const b = box.current
    const line = b?.querySelector<HTMLElement>(`[data-k="${current}"]`)
    if (b && line && open) b.scrollTo({ top: line.offsetTop - b.clientHeight / 3, behavior: "smooth" })
  }, [current, open])

  const playFrom = (at: number | null) => {
    const a = audio.current
    if (!a || at === null) return
    a.currentTime = at
    void a.play()
  }

  return (
    <div className="space-y-2 pt-2">
      <p className="flex items-start gap-1.5 text-[15px] font-medium break-words text-klein">
        <Music aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0" />
        <span>
          {style}
          {song.sobre && ` · ${song.sobre}`}
        </span>
      </p>
      <audio ref={audio} controls preload="metadata" src={song.url} className="h-10 w-full max-w-[26rem]" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <a href={song.url} download={`${name || text.anonymous} - muanlartins.mp3`} className={buttonClass({ variant: "quiet", size: "sm" })}>
          <Download aria-hidden className="h-4 w-4" />
          {text.songDownload}
        </a>
      </div>
      {song.letra && (
        <details className="text-[15px]" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary className={cn(buttonClass({ variant: "quiet", size: "sm" }), "cursor-pointer")}>{text.songLyrics}</summary>
          {timed ? (
            <div ref={box} className="relative mt-2 max-h-72 max-w-[32rem] space-y-4 overflow-y-auto pr-2 leading-[1.6]">
              {sections.map((section) => (
                <div key={section[0].k}>
                  {section.map((l) => (
                    <p
                      key={l.k}
                      data-k={l.k}
                      onClick={() => playFrom(l.at)}
                      className={cn(
                        "transition-colors duration-300",
                        l.at !== null && "cursor-pointer hover:text-klein",
                        l.k === current ? "font-medium text-ink" : current >= 0 && l.k < current ? "text-muted/70" : "text-muted",
                      )}
                    >
                      {l.text}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 leading-[1.6] whitespace-pre-line text-ink">{song.letra}</p>
          )}
        </details>
      )}
    </div>
  )
}

function GoalCard({ goal, current, look }: { goal: Goal; current?: boolean; look: Look }) {
  const reached = goal.arrecadado >= goal.alvo
  const last = lastDayOf(goal)
  const left = current ? timeLeft(goal, !reached) : null
  const natal = goal.tema === "natal"
  return (
    <Card className="space-y-0 p-0">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{goal.titulo || text.goalNow}</h3>
            {reached && <Badge tone="win">{text.reached}</Badge>}
            {!reached && !current && <Badge tone="soft">{text.missed}</Badge>}
          </div>
          <p className="text-[13px] text-muted tabular-nums">
            {dayOf(firstDayOf(goal))}
            {last ? ` – ${dayOf(last)}` : ` · ${text.noEnd}`}
          </p>
        </div>
        {natal && look.P && <TreeView kit={look.P} goal={goal} />}
        <GoalBar goal={goal} of={text.of} large={current} />
        {current && (!reached || left) && (
          <p className="text-[15px] text-muted tabular-nums">
            {!reached && `${text.toGo} R$ ${reais(goal.alvo - goal.arrecadado)}`}
            {!reached && left && " · "}
            {left}
          </p>
        )}
        {goal.arrecadado > goal.alvo && (
          <p className="text-[15px] font-medium text-klein tabular-nums">
            + R$ {reais(goal.arrecadado - goal.alvo)} {text.extra}
          </p>
        )}
        {natal && <GiftSubs goal={goal} />}
      </div>
      <div className="space-y-4 border-t border-line p-5 sm:p-6">
        <p className={eyebrow}>
          {text.supporters}
          {goal.apoiadores.length > 0 && <span className="text-muted"> · {text.pixCount.replace("{n}", String(goal.apoiadores.length))}</span>}
        </p>
        {goal.apoiadores.length ? <Supporters list={goal.apoiadores} look={look} tree={natal} /> : <EmptyState>{text.noneYet}</EmptyState>}
      </div>
    </Card>
  )
}

/** A goal set ahead of time: its name, target and days. */
function NextGoal({ goal }: { goal: PlannedGoal }) {
  const last = lastDayOf(goal)
  return (
    <Card className="space-y-1">
      <p className={eyebrow}>{text.next}</p>
      <p className="text-xl font-medium tracking-[-0.02em] text-ink">{goal.titulo}</p>
      <p className="text-[15px] text-muted tabular-nums">
        R$ {reais(goal.alvo)} · {dayOf(firstDayOf(goal))}
        {last && ` – ${dayOf(last)}`}
      </p>
    </Card>
  )
}

/** The Pix tab while the mural loads: a goal card's shape, its bar and a few of its rows. */
function PixTabSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <Card className="space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-4 border-t border-line pt-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-[112px] w-[84px] shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** The Pix tab: the goal on screen, the one scheduled, the ones before, and the named Pix of no goal. */
function PixTab({ mural, look }: { mural: Mural; look: Look }) {
  const nothing = !mural.meta && !mural.proxima && !mural.metas.length && !mural.pix.length
  return (
    <div className="space-y-16">
      {nothing ? (
        <EmptyState>{text.empty}</EmptyState>
      ) : (
        <Section title={text.goalNow}>
          <div className="space-y-4">
            {mural.meta ? <GoalCard goal={mural.meta} current look={look} /> : <EmptyState>{text.noGoal}</EmptyState>}
            {mural.proxima && <NextGoal goal={mural.proxima} />}
          </div>
        </Section>
      )}

      {mural.metas.length > 0 && (
        <Section title={text.goalsBefore}>
          <div className="space-y-4">
            {mural.metas.map((g) => (
              <GoalCard key={g.desde} goal={g} look={look} />
            ))}
          </div>
        </Section>
      )}

      {mural.pix.length > 0 && (
        <Section title={text.outside}>
          <Card>
            <Supporters list={mural.pix} look={look} />
          </Card>
        </Section>
      )}

      <p className="max-w-[38rem] text-[13px] leading-[1.6] text-muted">{text.privacy}</p>
    </div>
  )
}

type Tab = "pix" | "audience"
const TABS: { id: Tab; label: string }[] = [
  { id: "pix", label: text.tabPix },
  { id: "audience", label: text.tabAudience },
]

/** /mural: the Pix, goal by goal, and the audience, each in its tab (the crowd's is /mural#torcida, the old #audiencia still opens it). */
export function MuralPage() {
  const [tab, setTab] = useState<Tab>("pix")
  const [mural, setMural] = useState<Mural | null>(null)
  const [failed, setFailed] = useState(false)
  const [fans, setFans] = useState<Record<string, SavedFan> | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
  const [sigmas, setSigmas] = useState<Record<string, SigmaStats>>({})
  const [P, setP] = useState<PresentKit | null>(null)
  const look = { fans, S, sigmas, P }
  const christmas = !!mural && [mural.meta, ...mural.metas].some((g) => g?.tema === "natal")

  useEffect(() => {
    const fromHash = () => setTab([text.audienceHash, text.audienceHashOld].includes(location.hash.slice(1)) ? "audience" : "pix")
    fromHash()
    addEventListener("hashchange", fromHash)
    return () => removeEventListener("hashchange", fromHash)
  }, [])

  const load = useCallback(() => {
    loadMural()
      .then((m) => {
        setMural(m)
        const all = [...(m.meta ? [m.meta] : []), ...m.metas].flatMap((g) => g.apoiadores).concat(m.pix)
        const logins = all.flatMap((p) => (p.login ? [p.login] : []))
        // Without the profile API, every signed-in sender still gets the fan their login gives them.
        if (logins.length) {
          loadFans(logins).then(setFans, () => setFans({}))
          loadSigmas(logins).then(setSigmas, () => {})
        } else setFans({})
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    if (PIX_API) load()
  }, [load])
  const retry = () => {
    setFailed(false)
    load()
  }

  function choose(next: Tab) {
    setTab(next)
    history.replaceState(null, "", next === "audience" ? `#${text.audienceHash}` : location.pathname + location.search)
  }

  return (
    <div>
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      {christmas && <Script src="/stream/presente.js" onReady={() => setP(window.Presente ?? null)} />}
      <PageIntro title={text.title} description={text.description}>
        {PIX_API && <ButtonLink href={`/${PIX_SLUG}`}>{text.send}</ButtonLink>}
      </PageIntro>

      <div className="mt-12 space-y-10">
        <Tabs label={text.title} items={TABS} value={tab} onChange={choose} idPrefix="mural" />

        <TabPanel idPrefix="mural" id={tab}>
          {tab === "audience" ? (
            <Audience S={S} />
          ) : !PIX_API ? (
            <p className="text-[15px] text-muted">{text.soon}</p>
          ) : mural ? (
            <PixTab mural={mural} look={look} />
          ) : failed ? (
            <ErrorLine onRetry={retry}>{text.loadError}</ErrorLine>
          ) : (
            <PixTabSkeleton />
          )}
        </TabPanel>
      </div>
    </div>
  )
}
