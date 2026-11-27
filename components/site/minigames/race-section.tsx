"use client"

import { ArrowRight, Play } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import type { Quem } from "@/components/site/fan/estudio"
import { Marble, MarbleDot, type MarbleKit } from "@/components/site/minigames/marble"
import { fill, Name, number, when } from "@/components/site/minigames/shared"
import { Button, cardClass, Dialog, EmptyState, Fold, Section, Skeleton } from "@/components/site/ui"
import { shortDate } from "@/components/site/ranked/format"
import { channel } from "@/content/channel"
import { demoRaceUrl, RACE_ASPECT, raceUrl, type Race, type Races } from "@/lib/corrida"
import { MATERIALS } from "@/lib/duelo"
import type { Sigma } from "@/lib/profile"
import { padrao2D } from "@/lib/torcedor2d"
import { LOCALE, localize, profileSlug } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const text = localize(channel.minijogos)
const R = text.race
// The finishes, the duel's weapon materials (bolinha.js): Platina up glows, Diamante up leaves a trail, Campeão up sparkles.
const FINISHES = MATERIALS.map((m) => m.id)
// The rules' version the player draws (public/stream/corrida-motor.js's VERSAO): an older race can't be replayed.
const RULES = 3
/** How many of the latest races the page lists. */
const LATEST = 4

/**
 * The marble race on /canal/minijogos: the live's own overlay replaying the latest race (or sample people before any),
 * their marble as the race draws it, made from their fan, and the latest races, each replayable in a dialog. The
 * ranking is the page's Ranking section.
 */
export function RaceSection({
  S,
  kit,
  races,
  login,
  fan,
  sigma,
  skinOf,
  whoOf,
}: {
  S: Sigma | null
  kit: MarbleKit | null
  races: Races | null | "error"
  login: string
  fan: Record<string, unknown> | null
  sigma: number
  skinOf: (login: string) => string | null
  whoOf: (login: string) => Quem
}) {
  const [replay, setReplay] = useState<Race | null>(null)
  const list = races && races !== "error" ? races : null
  const latest = list?.ultimas.find((r) => r.versao === RULES) ?? null
  const rank = S ? S.ranque(login === CHANNEL ? S.RL.at(-1)![0] : sigma) : null
  const tier = rank ? rank.id.replace(/-\d$/, "") : "bronze"
  const unlocked = Math.max(0, FINISHES.indexOf(tier as (typeof FINISHES)[number]))
  const finishName = (id: string) => (S ? S.ranque(S.RL.find(([, r]) => r.replace(/-\d$/, "") === id)?.[0] ?? 0, LOCALE).nome.replace(/ (I|II|III)$/, "") : id)
  const effects = (id: string) => {
    const k = FINISHES.indexOf(id as (typeof FINISHES)[number])
    return [k >= 3 && R.finish.glow, k >= 4 && R.finish.trail, k >= 5 && R.finish.sparks, k >= 7 && R.finish.colours].filter(Boolean).join(", ") || R.finish.plain
  }

  return (
    <Section id="corrida" title={R.title} description={R.short}>
      <div className="space-y-6">
        <Fold summary={text.how}>
          <ul className="list-disc space-y-1.5 pl-5">
            {R.how.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Fold>

        <div className="cut bg-navy text-paper">
          <div className="p-3">
            <div className="overflow-hidden" style={{ aspectRatio: RACE_ASPECT }}>
              <iframe key={latest?.id ?? "demo"} src={latest ? raceUrl(latest) : demoRaceUrl()} title={R.title} className="h-full w-full border-0" />
            </div>
            <p className="mt-2 text-[13px] text-paper/70">{latest ? fill(R.player.replay, { n: latest.logins.length, d: shortDate(latest.em) }) : R.player.demo}</p>
          </div>
          <div className="grid items-center gap-5 border-t border-paper/10 p-5 sm:grid-cols-[auto_1fr]">
            <div className="grid min-h-[132px] place-items-center"><Marble kit={kit} fan={fan ?? (padrao2D(login || "eu") as unknown as Record<string, unknown>)} who={login ? whoOf(login) : null} rankId={rank?.id} size={132} /></div>
            <div className="space-y-3">
              <div>
                <p className="eyebrow text-ouro">{R.yours.title}</p>
                <p className="mt-1 text-[15px] leading-snug text-paper/80">{R.yours.text}</p>
              </div>
              <div className="space-y-1.5">
                <p className="eyebrow text-paper/60">{R.finish.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {MATERIALS.map((m, k) => (
                    <span
                      key={m.id}
                      title={`${finishName(m.id)}: ${effects(m.id)}`}
                      className={cn("relative grid h-7 w-7 place-items-center rounded-full ring-2", k === unlocked ? "ring-ouro" : "ring-transparent")}
                      // Rocket League's tiers' colours, the race's own data (bolinha.js); the top one changes colour.
                      style={{ background: "arco" in m ? `conic-gradient(${MATERIALS.slice(2, 7).map((x) => x.cor).join(", ")}, ${MATERIALS[2].cor})` : m.cor }}
                    >
                    </span>
                  ))}
                </div>
                <p className="text-[13px] text-paper/70">
                  {finishName(FINISHES[unlocked])}: {effects(FINISHES[unlocked])}.
                </p>
              </div>
              <Link href={`/${profileSlug()}`} className="inline-flex items-center gap-1 text-[15px] font-medium text-ouro underline-offset-4 hover:underline">
                {R.yours.edit}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{R.latest}</h3>
          {races === "error" ? (
            <EmptyState>{R.unavailable}</EmptyState>
          ) : !list ? (
            <Skeleton className="cut h-[140px]" />
          ) : !list.ultimas.length ? (
            <EmptyState>{R.none}</EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.ultimas.slice(0, LATEST).map((r) => (
                <li key={r.id} className={cn(cardClass, "overflow-hidden")}>
                  <ol className="space-y-1 bg-navy px-4 py-3 text-[15px] text-paper">
                    {r.ordem.slice(0, 3).map((i, k) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className={cn("w-6 text-right font-semibold tabular-nums", k === 0 ? "text-ouro" : "text-paper/55")}>{k + 1}º</span>
                        <MarbleDot skin={skinOf(r.logins[i])} who={whoOf(r.logins[i])} kit={kit} size={16} />
                        <Name login={r.logins[i]} className={cn("truncate", k === 0 ? "font-medium" : "text-paper/80")}>
                          {r.nomes[i]}
                        </Name>
                      </li>
                    ))}
                  </ol>
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-[13px] text-muted">
                    <span>
                      {r.segundos} s · {fill(R.of, { n: r.logins.length })} · {when(r.em)}
                    </span>
                    {r.versao === RULES ? (
                      <Button size="sm" onClick={() => setReplay(r)} icon={<Play aria-hidden className="h-4 w-4" />}>
                        {text.fights.watch}
                      </Button>
                    ) : (
                      <span>{R.old}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={!!replay} onClose={() => setReplay(null)} closeLabel={text.fights.close} title={replay ? fill(R.replayTitle, { d: shortDate(replay.em) }) : ""} width={48}>
        {replay && (
          <>
            <div className="cut bg-navy p-3">
              <div className="overflow-hidden" style={{ aspectRatio: RACE_ASPECT }}>
                <iframe src={raceUrl(replay)} title={fill(R.replayTitle, { d: shortDate(replay.em) })} className="h-full w-full border-0" />
              </div>
            </div>
            <p className="mt-3 text-[13px] text-muted">
              {replay.segundos} s · {fill(R.of, { n: number(replay.logins.length) })} · {when(replay.em)}
            </p>
          </>
        )}
      </Dialog>
    </Section>
  )
}
