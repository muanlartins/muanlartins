"use client"

import Script from "next/script"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { Audience } from "@/components/site/pix/audience"
import { GiftSubs, PresentView, TreeView } from "@/components/site/pix/christmas"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { GoalBar, timeLeft } from "@/components/site/pix/goal-bar"
import { BadgeChips } from "@/components/site/profile/badges"
import { mural as muralCopy, STYLES } from "@/content/pix"
import { firstDayOf, lastDayOf, loadMural, PIX_API, reais, type Goal, type Mural, type MuralPix, type PlannedGoal, type PresentKit, type SongTimes } from "@/lib/pix"
import { loadFans, loadSigmas, type Choice, type Sigma, type SigmaStats, type Torcedor } from "@/lib/profile"
import { LOCALE, localize, PIX_SLUG } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(muralCopy)
const LANG = LOCALE === "pt" ? "pt-BR" : "en"
const day = (iso: string) => new Date(iso).toLocaleDateString(LANG, { day: "2-digit", month: "2-digit", year: "numeric" })
const heading = "text-[13px] font-medium uppercase tracking-[0.12em] text-klein"

interface Look {
  T: Torcedor | null
  fans: Record<string, Choice> | null
  S: Sigma | null
  sigmas: Record<string, SigmaStats>
  /** presente.js, loaded when there's a Christmas goal. */
  P: PresentKit | null
}

/**
 * Each Pix: the sender's fan (or initial), name, value, badges, day and message; an anonymous one, a short line with its
 * value and day. In a Christmas goal (`tree`), the present it hung by its value.
 */
function Supporters({ list, look: { T, fans, S, sigmas, P }, tree }: { list: MuralPix[]; look: Look; tree?: boolean }) {
  return (
    <ul className="space-y-3">
      {list.map((p) => (
        <li key={p.em} className={cn("flex gap-4 rounded-md border border-line bg-paper/70 p-3", !p.nome && !p.mensagem && !p.login && "items-center py-2")}>
          <FanSpot T={T} fans={fans} login={p.login} name={p.nome} size={!p.nome && !p.mensagem && !p.login ? "sm" : "md"} />
          <div className="min-w-0 flex-1 space-y-2 py-1 pr-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <strong className="text-[16px] font-medium break-words text-ink">
                {p.login ? <ViewerName login={p.login}>{p.nome || p.login}</ViewerName> : p.nome || text.anonymous}
              </strong>
              <span className="flex items-center gap-2 text-[17px] font-medium text-klein tabular-nums">
                {tree && P && <PresentView kit={P} present={P.normalizar(p.presente, p.em)} className="h-6 w-6" />}R$ {reais(p.centavos)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {S && p.login && sigmas[p.login] && <BadgeChips badges={S.medalhas(sigmas[p.login], LOCALE)} streak={sigmas[p.login].sequencia} />}
              <span className="text-[12px] text-muted tabular-nums">{day(p.em)}</span>
            </div>
            {p.mensagem && <p className="text-[15px] leading-[1.55] break-words text-ink">{p.mensagem}</p>}
            {p.musica && <Song song={p.musica} name={p.nome} />}
          </div>
        </li>
      ))}
    </ul>
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
    <div className="space-y-2 pt-1">
      <p className="text-[14px] font-medium break-words text-klein">
        ♪ {style}
        {song.sobre && ` · ${song.sobre}`}
      </p>
      <audio ref={audio} controls preload="metadata" src={song.url} className="h-9 w-full max-w-[26rem]" />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
        <a href={song.url} download={`${name || text.anonymous} - muanlartins.mp3`} className="text-muted underline underline-offset-2 hover:text-klein">
          {text.songDownload}
        </a>
      </div>
      {song.letra && (
        <details className="text-[14px]" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary className="cursor-pointer text-muted hover:text-klein">{text.songLyrics}</summary>
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

/** "14/11/2026" from a Brasília day ("YYYY-MM-DD"). */
const dayOf = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(LANG, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })

function GoalCard({ goal, current, look }: { goal: Goal; current?: boolean; look: Look }) {
  const reached = goal.arrecadado >= goal.alvo
  const last = lastDayOf(goal)
  const left = current ? timeLeft(goal, !reached) : null
  const natal = goal.tema === "natal"
  return (
    <section className={cn("rounded-md border", current ? "border-klein/50 bg-paper/80" : "border-line bg-paper/60")}>
      <div className="space-y-4 px-4 pt-5 pb-5 sm:px-6 sm:pt-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className={cn("font-medium tracking-[-0.02em] text-ink", current ? "text-3xl" : "text-xl")}>{goal.titulo || text.goalNow}</h3>
            {reached && <span className="rounded-full bg-klein px-2.5 py-0.5 text-[12px] font-medium text-paper">✓ {text.reached}</span>}
            {!reached && !current && <span className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-medium text-muted">{text.missed}</span>}
          </div>
          <p className="text-[13px] text-muted tabular-nums">
            {dayOf(firstDayOf(goal))}
            {last ? ` – ${dayOf(last)}` : ` · ${text.noEnd}`}
          </p>
        </div>
        {natal && look.P && <TreeView kit={look.P} goal={goal} />}
        <GoalBar goal={goal} of={text.of} large={current} />
        {current && (!reached || left) && (
          <p className="text-[14px] text-muted tabular-nums">
            {!reached && `${text.toGo} R$ ${reais(goal.alvo - goal.arrecadado)}`}
            {!reached && left && " · "}
            {left}
          </p>
        )}
        {goal.arrecadado > goal.alvo && (
          <p className="text-[14px] font-medium text-klein tabular-nums">
            + R$ {reais(goal.arrecadado - goal.alvo)} {text.extra}
          </p>
        )}
        {natal && <GiftSubs goal={goal} />}
      </div>
      <div className="space-y-3 border-t border-line px-4 pt-5 pb-5 sm:px-6">
        <p className={heading}>{text.supporters}</p>
        {goal.apoiadores.length ? <Supporters list={goal.apoiadores} look={look} tree={natal} /> : <p className="text-[15px] text-muted">{text.noneYet}</p>}
      </div>
    </section>
  )
}

/** A goal set ahead of time: its name, target and days. */
function NextGoal({ goal }: { goal: PlannedGoal }) {
  const last = lastDayOf(goal)
  return (
    <section className="rounded-md border border-dashed border-klein/40 px-4 py-4 sm:px-6">
      <p className={heading}>{text.next}</p>
      <p className="mt-1 text-xl font-medium tracking-[-0.02em] text-ink">{goal.titulo}</p>
      <p className="mt-1 text-[14px] text-muted tabular-nums">
        R$ {reais(goal.alvo)} · {dayOf(firstDayOf(goal))}
        {last && ` – ${dayOf(last)}`}
      </p>
    </section>
  )
}

/** The Pix tab: the goal on screen, the one scheduled, the ones before, and the named Pix of no goal. */
function PixTab({ mural, look }: { mural: Mural; look: Look }) {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h2 className={heading}>{text.goalNow}</h2>
        {mural.meta ? <GoalCard goal={mural.meta} current look={look} /> : <p className="text-[15px] text-muted">{text.noGoal}</p>}
        {mural.proxima && <NextGoal goal={mural.proxima} />}
      </div>

      {mural.metas.length > 0 && (
        <div className="space-y-4">
          <h2 className={heading}>{text.goalsBefore}</h2>
          {mural.metas.map((g) => (
            <GoalCard key={g.desde} goal={g} look={look} />
          ))}
        </div>
      )}

      {mural.pix.length > 0 && (
        <div className="space-y-4">
          <h2 className={heading}>{text.outside}</h2>
          <Supporters list={mural.pix} look={look} />
        </div>
      )}

      <p className="max-w-[38rem] text-[13px] text-muted">{text.privacy}</p>
    </div>
  )
}

type Tab = "pix" | "audience"
const TABS: { id: Tab; label: string }[] = [
  { id: "pix", label: text.tabPix },
  { id: "audience", label: text.tabAudience },
]

/** /mural: the Pix, goal by goal, and the audience, each in its tab (the audience's is /mural#audiencia). */
export function MuralPage() {
  const [tab, setTab] = useState<Tab>("pix")
  const [mural, setMural] = useState<Mural | null>(null)
  const [T, setT] = useState<Torcedor | null>(null)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
  const [sigmas, setSigmas] = useState<Record<string, SigmaStats>>({})
  const [P, setP] = useState<PresentKit | null>(null)
  const buttons = useRef<Record<Tab, HTMLButtonElement | null>>({ pix: null, audience: null })
  const look = { T, fans, S, sigmas, P }
  const christmas = !!mural && [mural.meta, ...mural.metas].some((g) => g?.tema === "natal")

  useEffect(() => {
    const fromHash = () => setTab(location.hash.slice(1) === text.audienceHash ? "audience" : "pix")
    fromHash()
    addEventListener("hashchange", fromHash)
    return () => removeEventListener("hashchange", fromHash)
  }, [])

  useEffect(() => {
    if (!PIX_API) return
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
      .catch(() => {})
  }, [])

  function choose(next: Tab) {
    setTab(next)
    history.replaceState(null, "", next === "audience" ? `#${text.audienceHash}` : location.pathname + location.search)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id
    choose(next)
    buttons.current[next]?.focus()
  }

  return (
    <div className="space-y-10">
      {/* The same drawing as the stream's crowd; React hoists the stylesheet into the head. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      {christmas && <Script src="/stream/presente.js" onReady={() => setP(window.Presente ?? null)} />}
      <PageIntro title={text.title} description={text.description}>
        {PIX_API && (
          <a href={`/${PIX_SLUG}`} className="inline-block rounded-sm bg-klein px-5 py-3 text-[17px] font-medium text-paper transition-opacity hover:opacity-90">
            {text.send}
          </a>
        )}
      </PageIntro>

      <div className="space-y-8">
        <div role="tablist" aria-label={text.title} onKeyDown={onKey} className="flex gap-7 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                buttons.current[t.id] = el
              }}
              type="button"
              role="tab"
              id={`aba-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`painel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => choose(t.id)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-[18px] font-medium tracking-[-0.01em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-klein",
                tab === t.id ? "border-klein text-klein" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`painel-${tab}`} aria-labelledby={`aba-${tab}`}>
          {tab === "audience" ? (
            <Audience T={T} S={S} />
          ) : !PIX_API ? (
            <p className="text-[15px] text-muted">{text.soon}</p>
          ) : (
            mural && <PixTab mural={mural} look={look} />
          )}
        </div>
      </div>
    </div>
  )
}
