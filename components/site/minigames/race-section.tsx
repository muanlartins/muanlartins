"use client"

import { ArrowRight, Crown, Dices, Lock, Play, RotateCcw, Trophy, Users } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useEffect, useRef, useState } from "react"
import { Marble, MarbleDot, marbleKit, marbleSkin, type MarbleKit } from "@/components/site/minigames/marble"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { shortDate } from "@/components/site/ranked/format"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { channel } from "@/content/channel"
import { demoRaceUrl, loadRaces, RACE_ASPECT, raceUrl, type Race, type Races } from "@/lib/corrida"
import { loadFans, type Choice, type Sigma, type Torcedor } from "@/lib/profile"
import { LOCALE, localize, profileSlug } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const text = localize(channel.minijogos.race)
const heading = "text-[13px] font-medium uppercase tracking-[0.12em] text-klein"
const panel = "rounded-xl border border-line bg-paper/70"
const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")
// The finishes, from the duel's tiers (bolinha.js): Platina up glows, Diamante up leaves a trail, Campeão up sparkles.
const FINISHES = ["bronze", "silver", "gold", "platinum", "diamond", "champion", "grand-champion", "supersonic-legend"] as const
// The rules' version the player draws (public/stream/corrida-motor.js's VERSAO): an older race can't be replayed.
const RULES = 2

/**
 * The marble race on /canal/minijogos: the live's own overlay replaying the latest race (or sample people before any),
 * their marble as the race draws it, made from their fan, the ranking and the latest races, each replayable.
 */
export function RaceSection({ T, S, login, fan, sigma }: { T: Torcedor | null; S: Sigma | null; login: string; fan: Record<string, unknown> | null; sigma: number }) {
  const [kit, setKit] = useState<MarbleKit | null>(null)
  const [races, setRaces] = useState<Races | null | undefined>(undefined)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)
  const [replay, setReplay] = useState<Race | null>(null)
  const player = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRaces()
      .then((r) => {
        setRaces(r)
        const logins = [...r.ranking.map((x) => x.login), ...r.ultimas.flatMap((x) => x.logins)]
        if (logins.length) loadFans(logins).then(setFans, () => setFans({}))
        else setFans({})
      })
      .catch(() => setRaces(null))
  }, [])

  const name = (l: string, n: string) => (l === CHANNEL ? n : <ViewerName login={l}>{n}</ViewerName>)
  const skinOf = (l: string) => marbleSkin(kit, (T ? T.normalizar(fans?.[l] ?? null, l) : {}) as unknown as Record<string, unknown>)
  const latest = races?.ultimas.find((r) => r.versao === RULES) ?? null
  const shown = replay ?? latest
  const src = shown ? raceUrl(shown) : demoRaceUrl()
  const rank = S ? S.ranque(login === CHANNEL ? S.RL.at(-1)![0] : sigma) : null
  const tier = rank ? rank.id.replace(/-\d$/, "") : "bronze"
  const unlocked = Math.max(0, FINISHES.indexOf(tier as (typeof FINISHES)[number]))
  const finishName = (id: string) => (S ? S.ranque(S.RL.find(([, r]) => r.replace(/-\d$/, "") === id)?.[0] ?? 0, LOCALE).nome.replace(/ (I|II|III)$/, "") : id)
  const effects = (id: string) => {
    const k = FINISHES.indexOf(id as (typeof FINISHES)[number])
    return [k >= 3 && text.finish.glow, k >= 4 && text.finish.trail, k >= 5 && text.finish.sparks, k >= 7 && text.finish.colours].filter(Boolean).join(", ") || text.finish.plain
  }

  function watch(r: Race) {
    setReplay(r)
    player.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <section id="corrida" className="scroll-mt-24 space-y-6 border-t border-line pt-10">
      <Script src="/stream/bolinha.js" onReady={() => setKit(marbleKit())} />
      <div className="space-y-3">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink sm:text-3xl">{text.title}</h2>
        <ul className="flex flex-wrap gap-2">
          {[
            [Users, text.rules.everyone],
            [Dices, text.rules.track],
            [RotateCcw, text.rules.falls],
            [Trophy, text.rules.record],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Users
            return (
              <li key={label as string} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/70 px-3 py-1 text-[13px] text-ink">
                <I aria-hidden className="h-3.5 w-3.5 text-klein" />
                {label as string}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="overflow-hidden rounded-xl bg-navy text-white">
        <div ref={player} className="scroll-mt-24 p-3">
          <div className="overflow-hidden rounded-md" style={{ aspectRatio: RACE_ASPECT }}>
            <iframe key={src} src={src} title={text.title} className="h-full w-full border-0" />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/60">
            <span>{shown ? text.player.replay.replace("{n}", String(shown.logins.length)).replace("{d}", shortDate(shown.em)) : text.player.demo}</span>
            {replay && (
              <button type="button" onClick={() => setReplay(null)} className="font-medium text-[#ffd166] hover:underline">
                {text.player.back}
              </button>
            )}
          </div>
        </div>
        <div className="grid items-center gap-5 border-t border-white/10 p-5 sm:grid-cols-[auto_1fr]">
          <div className="grid place-items-center">{T && <Marble kit={kit} fan={fan ?? (T.padrao(login || "eu") as unknown as Record<string, unknown>)} rankId={rank?.id} size={132} />}</div>
          <div className="space-y-3">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#ffd166]">{text.yours.title}</p>
              <p className="mt-1 text-[14px] leading-snug text-white/80">{text.yours.text}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/50">{text.finish.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {FINISHES.map((id, k) => (
                  <span
                    key={id}
                    title={`${finishName(id)}: ${effects(id)}`}
                    className={cn("relative grid h-7 w-7 place-items-center rounded-full ring-2", k === unlocked ? "ring-[#ffd166]" : "ring-transparent", k > unlocked && "opacity-40")}
                    style={{ background: ["#c98a52", "#c3cad6", "#f2c14e", "#7fd8d2", "#7aa2ff", "#b48cff", "#ff6b6b", "conic-gradient(#ff6b6b, #f2c14e, #7fd8d2, #7aa2ff, #b48cff, #ff6b6b)"][k], boxShadow: k >= 3 ? "0 0 8px rgb(255 255 255 / 0.35)" : undefined }}
                  >
                    {k > unlocked && <Lock aria-hidden className="h-3 w-3 text-navy" />}
                  </span>
                ))}
              </div>
              <p className="text-[12px] text-white/60">
                {finishName(FINISHES[unlocked])}: {effects(FINISHES[unlocked])}.
              </p>
            </div>
            <Link href={`/${profileSlug()}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#ffd166] hover:underline">
              {text.yours.edit}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {races === undefined ? null : !races || !races.total ? (
        <p className="text-[14px] text-muted">{text.none}</p>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={heading}>{text.ranking}</h3>
              <p className="text-[13px] text-muted">{text.total.replace("{n}", number(races.total))}</p>
            </div>
            <div className={cn(panel, "overflow-hidden")}>
              <div className="flex items-end justify-center gap-3 bg-klein/[0.05] px-4 pt-6 sm:gap-6">
                {[1, 0, 2]
                  .filter((i) => races.ranking[i])
                  .map((i) => {
                    const r = races.ranking[i]
                    return (
                      <div key={r.login} className="flex w-28 flex-col items-center text-center sm:w-36">
                        {i === 0 && <Crown aria-hidden className="mb-1 h-5 w-5 text-[#d9a520]" />}
                        <FanSpot T={T} fans={fans} login={r.login} name={r.nome} />
                        <p className="mt-1 flex max-w-full items-center gap-1.5 truncate text-[14px] font-medium text-ink">
                          <MarbleDot skin={skinOf(r.login)} size={14} />
                          {name(r.login, r.nome)}
                        </p>
                        <p className="text-[12px] text-muted tabular-nums">
                          {number(r.vitorias)} {text.wins} · {number(r.podios)} {text.podiums}
                        </p>
                        <div className={cn("mt-2 grid w-full place-items-center rounded-t-md bg-klein text-xl font-medium text-paper", i === 0 ? "h-16" : i === 1 ? "h-11" : "h-8")}>{i + 1}</div>
                      </div>
                    )
                  })}
              </div>
              {races.ranking.length > 3 && (
                <ol className="divide-y divide-line">
                  {races.ranking.slice(3, 20).map((r, k) => (
                    <li key={r.login} className={cn("flex items-center gap-3 px-4 py-2", r.login === login && "bg-klein/[0.06]")}>
                      <span className="w-6 shrink-0 text-right text-[14px] font-medium text-muted tabular-nums">{k + 4}</span>
                      <MarbleDot skin={skinOf(r.login)} size={22} />
                      <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{name(r.login, r.nome)}</p>
                      <p className="shrink-0 text-right text-[13px] text-muted tabular-nums">
                        <span className="text-[16px] font-medium text-klein">{number(r.vitorias)}</span> {text.wins} · {number(r.podios)} {text.podiums} · {number(r.corridas)} {text.races}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={heading}>{text.latest}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {races.ultimas.slice(0, 10).map((r) => (
                <li key={r.id} className={cn(panel, "overflow-hidden", shown?.id === r.id && replay && "border-klein")}>
                  <ol className="space-y-1 bg-navy px-4 py-3 text-[14px] text-white">
                    {r.ordem.slice(0, 3).map((i, k) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className={cn("w-5 text-right font-semibold tabular-nums", k === 0 ? "text-[#ffd166]" : "text-white/50")}>{k + 1}º</span>
                        <MarbleDot skin={skinOf(r.logins[i])} size={16} />
                        <span className={cn("truncate", k === 0 ? "font-medium" : "text-white/80")}>{name(r.logins[i], r.nomes[i])}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex items-center justify-between gap-2 px-4 py-2 text-[12px] text-muted">
                    <span>
                      {r.segundos} s · {text.of.replace("{n}", String(r.logins.length))} · {shortDate(r.em)}
                    </span>
                    {r.versao === RULES ? (
                      <button type="button" onClick={() => watch(r)} className="inline-flex items-center gap-1 rounded-md bg-klein px-2.5 py-1 font-medium text-paper hover:opacity-90">
                        <Play aria-hidden className="h-3.5 w-3.5" />
                        {text.watch}
                      </button>
                    ) : (
                      <span>{text.old}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
