"use client"

import Script from "next/script"
import { useEffect, useState } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { GoalBar } from "@/components/site/pix/goal-bar"
import { FanView } from "@/components/site/profile/fan-view"
import { mural as muralCopy } from "@/content/pix"
import { loadMural, PIX_API, reais, type Goal, type Mural, type MuralPix } from "@/lib/pix"
import { loadFans, type Choice, type Torcedor } from "@/lib/profile"
import { LOCALE, localize, PIX_SLUG } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(muralCopy)
const LANG = LOCALE === "pt" ? "pt-BR" : "en"
const day = (iso: string) => new Date(iso).toLocaleDateString(LANG, { day: "2-digit", month: "2-digit", year: "numeric" })
const heading = "text-[13px] font-medium uppercase tracking-[0.12em] text-klein"

/** Who sent it: their fan from the stream's crowd when they signed in with Twitch, their initial otherwise. */
function Face({ p, T, fans }: { p: MuralPix; T: Torcedor | null; fans: Record<string, Choice> | null }) {
  if (p.login && T && fans) {
    return <FanView T={T} fan={T.normalizar(fans[p.login] ?? null, p.login)} className="h-[66px] w-11" />
  }
  return (
    <span className="mt-1 grid h-11 w-11 place-items-center rounded-full bg-klein/10 text-[18px] font-medium text-klein">
      {(p.nome || "?").trim().charAt(0).toUpperCase()}
    </span>
  )
}

function Supporters({ list, T, fans }: { list: MuralPix[]; T: Torcedor | null; fans: Record<string, Choice> | null }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {list.map((p) => (
        <li key={p.em} className="flex gap-3 rounded-md border border-line bg-paper/70 px-3 py-3">
          {/* Wider than the fan: a flag or a cap reaches past its sides. */}
          <div className="flex w-16 shrink-0 justify-center">
            <Face p={p} T={T} fans={fans} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
              <strong className="font-medium break-words text-ink">{p.nome || text.anonymous}</strong>
              <span className="text-klein tabular-nums">R$ {reais(p.centavos)}</span>
            </p>
            <p className="text-[12px] text-muted">{day(p.em)}</p>
            {p.mensagem && <p className="text-[14px] leading-[1.55] break-words text-ink">{p.mensagem}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function GoalCard({ goal, current, T, fans }: { goal: Goal; current?: boolean; T: Torcedor | null; fans: Record<string, Choice> | null }) {
  const reached = goal.arrecadado >= goal.alvo
  const unnamed = goal.pix - goal.apoiadores.length
  return (
    <section className={cn("space-y-5 rounded-md border px-4 py-5 sm:px-6", current ? "border-klein bg-klein/[0.04]" : "border-line bg-paper/70")}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className={cn("font-medium tracking-[-0.02em] text-ink", current ? "text-3xl" : "text-xl")}>{goal.titulo || text.goalNow}</h3>
          {reached && <span className="rounded-full bg-klein px-2.5 py-0.5 text-[12px] font-medium text-paper">✓ {text.reached}</span>}
        </div>
        <p className="text-[13px] text-muted">
          {day(goal.desde)}
          {goal.ate && ` – ${day(goal.ate)}`}
        </p>
      </div>
      <GoalBar goal={goal} of={text.of} large={current} />
      <div className="space-y-3">
        <p className={heading}>{text.supporters}</p>
        {goal.apoiadores.length ? (
          <Supporters list={goal.apoiadores} T={T} fans={fans} />
        ) : (
          <p className="text-[15px] text-muted">{text.noneYet}</p>
        )}
        {unnamed > 0 && (
          <p className="text-[14px] text-muted">
            + {unnamed} {text.others}
          </p>
        )}
      </div>
    </section>
  )
}

/** /mural: the goal on screen, the ones before, and the named Pix of no goal. */
export function MuralPage() {
  const [mural, setMural] = useState<Mural | null>(null)
  const [T, setT] = useState<Torcedor | null>(null)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)

  useEffect(() => {
    if (!PIX_API) return
    loadMural()
      .then((m) => {
        setMural(m)
        const all = [...(m.meta ? [m.meta] : []), ...m.metas].flatMap((g) => g.apoiadores).concat(m.pix)
        const logins = all.flatMap((p) => (p.login ? [p.login] : []))
        // Without the profile API, every signed-in sender still gets the fan their login gives them.
        if (logins.length) loadFans(logins).then(setFans, () => setFans({}))
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-10">
      {/* The same drawing as the stream's crowd; React hoists the stylesheet into the head. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <PageIntro title={text.title} description={text.description}>
        {PIX_API && (
          <a href={`/${PIX_SLUG}`} className="inline-block rounded-sm bg-klein px-5 py-3 text-[17px] font-medium text-paper transition-opacity hover:opacity-90">
            {text.send}
          </a>
        )}
      </PageIntro>

      {!PIX_API ? (
        <p className="text-[15px] text-muted">{text.soon}</p>
      ) : (
        mural && (
          <>
            <div className="space-y-4">
              <h2 className={heading}>{text.goalNow}</h2>
              {mural.meta ? <GoalCard goal={mural.meta} current T={T} fans={fans} /> : <p className="text-[15px] text-muted">{text.noGoal}</p>}
            </div>

            {mural.metas.length > 0 && (
              <div className="space-y-4">
                <h2 className={heading}>{text.goalsBefore}</h2>
                {mural.metas.map((g) => (
                  <GoalCard key={g.desde} goal={g} T={T} fans={fans} />
                ))}
              </div>
            )}

            {mural.pix.length > 0 && (
              <div className="space-y-4">
                <h2 className={heading}>{text.outside}</h2>
                <Supporters list={mural.pix} T={T} fans={fans} />
              </div>
            )}

            <p className="max-w-[38rem] text-[13px] text-muted">{text.privacy}</p>
          </>
        )
      )}
    </div>
  )
}
