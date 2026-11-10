"use client"

import Script from "next/script"
import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { Audience } from "@/components/site/pix/audience"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { GoalBar } from "@/components/site/pix/goal-bar"
import { BadgeChips } from "@/components/site/profile/badges"
import { mural as muralCopy } from "@/content/pix"
import { loadMural, PIX_API, reais, type Goal, type Mural, type MuralPix } from "@/lib/pix"
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
}

/** Each Pix: the sender's fan (or initial), name, value, badges, day and message; an anonymous one, a short line with its value and day. */
function Supporters({ list, look: { T, fans, S, sigmas } }: { list: MuralPix[]; look: Look }) {
  return (
    <ul className="space-y-3">
      {list.map((p) => (
        <li key={p.em} className={cn("flex gap-4 rounded-md border border-line bg-paper/70 p-3", !p.nome && !p.mensagem && !p.login && "items-center py-2")}>
          <FanSpot T={T} fans={fans} login={p.login} name={p.nome} size={!p.nome && !p.mensagem && !p.login ? "sm" : "md"} />
          <div className="min-w-0 flex-1 space-y-2 py-1 pr-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <strong className="text-[16px] font-medium break-words text-ink">{p.nome || text.anonymous}</strong>
              <span className="text-[17px] font-medium text-klein tabular-nums">R$ {reais(p.centavos)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {S && p.login && sigmas[p.login] && <BadgeChips badges={S.medalhas(sigmas[p.login], LOCALE)} streak={sigmas[p.login].sequencia} />}
              <span className="text-[12px] text-muted tabular-nums">{day(p.em)}</span>
            </div>
            {p.mensagem && <p className="text-[15px] leading-[1.55] break-words text-ink">{p.mensagem}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function GoalCard({ goal, current, look }: { goal: Goal; current?: boolean; look: Look }) {
  const reached = goal.arrecadado >= goal.alvo
  return (
    <section className={cn("rounded-md border", current ? "border-klein/50 bg-paper/80" : "border-line bg-paper/60")}>
      <div className="space-y-4 px-4 pt-5 pb-5 sm:px-6 sm:pt-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className={cn("font-medium tracking-[-0.02em] text-ink", current ? "text-3xl" : "text-xl")}>{goal.titulo || text.goalNow}</h3>
            {reached && <span className="rounded-full bg-klein px-2.5 py-0.5 text-[12px] font-medium text-paper">✓ {text.reached}</span>}
          </div>
          <p className="text-[13px] text-muted tabular-nums">
            {day(goal.desde)}
            {goal.ate && ` – ${day(goal.ate)}`}
          </p>
        </div>
        <GoalBar goal={goal} of={text.of} large={current} />
        {current && !reached && (
          <p className="text-[14px] text-muted tabular-nums">
            {text.toGo} R$ {reais(goal.alvo - goal.arrecadado)}
          </p>
        )}
      </div>
      <div className="space-y-3 border-t border-line px-4 pt-5 pb-5 sm:px-6">
        <p className={heading}>{text.supporters}</p>
        {goal.apoiadores.length ? <Supporters list={goal.apoiadores} look={look} /> : <p className="text-[15px] text-muted">{text.noneYet}</p>}
      </div>
    </section>
  )
}

/** The Pix tab: the goal on screen, the ones before, and the named Pix of no goal. */
function PixTab({ mural, look }: { mural: Mural; look: Look }) {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h2 className={heading}>{text.goalNow}</h2>
        {mural.meta ? <GoalCard goal={mural.meta} current look={look} /> : <p className="text-[15px] text-muted">{text.noGoal}</p>}
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
  const buttons = useRef<Record<Tab, HTMLButtonElement | null>>({ pix: null, audience: null })
  const look = { T, fans, S, sigmas }

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
