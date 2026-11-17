"use client"

import { Trophy } from "lucide-react"
import { useEffect, useState } from "react"
import { FanSpot } from "@/components/site/pix/fan-spot"
import { shortDate } from "@/components/site/ranked/format"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { channel } from "@/content/channel"
import { loadRaces, type Races } from "@/lib/corrida"
import { loadFans, type Choice, type Torcedor } from "@/lib/profile"
import { LOCALE, localize } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"

const text = localize(channel.minijogos.race)
const heading = "text-[13px] font-medium uppercase tracking-[0.12em] text-klein"
const number = (n: number) => n.toLocaleString(LOCALE === "pt" ? "pt-BR" : "en")
const MEDALS = ["🥇", "🥈", "🥉"]

/** The marble race on /canal/minijogos: what it is, its ranking and the latest races with their podiums. */
export function RaceSection({ T }: { T: Torcedor | null }) {
  const [races, setRaces] = useState<Races | null | undefined>(undefined)
  const [fans, setFans] = useState<Record<string, Choice> | null>(null)

  useEffect(() => {
    loadRaces()
      .then((r) => {
        setRaces(r)
        if (r.ranking.length) loadFans(r.ranking.map((x) => x.login)).then(setFans, () => setFans({}))
      })
      .catch(() => setRaces(null))
  }, [])

  const name = (login: string, nome: string) => (login === CHANNEL ? nome : <ViewerName login={login}>{nome}</ViewerName>)

  return (
    <section className="space-y-6 border-t border-line pt-10">
      <div className="space-y-3">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink sm:text-3xl">{text.title}</h2>
        <p className="max-w-[40rem] text-[16px] leading-[1.6] text-ink">{text.lead}</p>
        <p className="max-w-[40rem] text-[16px] leading-[1.6] text-muted">{text.fair}</p>
      </div>

      {races === undefined ? null : !races || !races.total ? (
        <p className="text-[14px] text-muted">{text.none}</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className={heading}>{text.ranking}</h3>
            <ol className="divide-y divide-line overflow-hidden rounded-md border border-line bg-paper/70">
              {races.ranking.slice(0, 20).map((r, i) => (
                <li key={r.login} className="flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4">
                  <span className="w-6 shrink-0 text-right text-[15px] font-medium text-muted tabular-nums">{i + 1}</span>
                  <FanSpot T={T} fans={fans} login={r.login} name={r.nome} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{name(r.login, r.nome)}</p>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-lg leading-tight font-medium text-klein">
                      {number(r.vitorias)} <span className="text-[13px] font-normal text-muted">{text.wins}</span>
                    </p>
                    <p className="text-[12px] text-muted">
                      {number(r.podios)} {text.podiums} · {number(r.corridas)} {text.races}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-4">
            <h3 className={heading}>{text.latest}</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-paper/70">
              {races.ultimas.slice(0, 12).map((race) => (
                <li key={race.id} className="space-y-1 px-4 py-3 text-[14px]">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {race.ordem.slice(0, 3).map((i, k) => (
                      <span key={i} className="inline-flex items-center gap-1 text-ink">
                        <span aria-hidden>{MEDALS[k]}</span>
                        {name(race.logins[i], race.nomes[i])}
                      </span>
                    ))}
                  </p>
                  <p className="flex items-center gap-1.5 text-[12px] text-muted">
                    <Trophy aria-hidden className="h-3.5 w-3.5" />
                    {race.segundos} s · {text.of.replace("{n}", String(race.logins.length))} · {shortDate(race.em)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
