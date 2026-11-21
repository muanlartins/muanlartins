"use client"

import { Crown, Play } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { ClassArt, type DuelKit } from "@/components/site/minigames/class-art"
import { fill, Name, when } from "@/components/site/minigames/shared"
import { Badge, Button, cardClass, Dialog, EmptyState, Section, Skeleton } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { bestFights, PLAYER_ASPECT, readFights, replayUrl, type Fight, type FightReading, type Highlight } from "@/lib/duelo"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(channel.minijogos)
const T = text.fights
// The two sides' rings, as the live draws them (duelo.html's --esquerda / --direita): canvas colours, not tokens.
const RINGS = ["#85a7ff", "#ffb547"]
/** How many of the latest fights the page lists. */
const LATEST = 6

type Fan = { cor: string; detalhe: string; roupa: string }

export const className = (id: string) => (text.yours.classes as Record<string, { name: string }>)[id]?.name ?? id

/** How it ended: "nocaute em 38 s", "no tempo". */
const how = (f: Fight) => (f.motivo === "nocaute" ? fill(T.knockout, { s: f.segundos }) : f.motivo === "tempo" ? T.time : T.draw)

/** Why a fight is among the best, in a line with its number. */
function whyLine(why: Highlight, f: Fight, r: FightReading | null) {
  const line = T.why[why].line
  if (why === "virada") return fill(line, { p: Math.round((r?.behind ?? 0) * 100) })
  if (why === "detalhe") return fill(line, { p: Math.max(1, Math.round((r?.left ?? 0) * 100)) })
  if (why === "disputada") return fill(line, { n: r?.leads ?? 0 })
  return fill(line, { s: f.segundos })
}

/**
 * A fight as a card: the two balls as the live drew them (class, weapon, their fan's colours), the winner crowned,
 * how it ended and its replay. `why` puts the reason it's among the best on top.
 */
export function FightCard({
  fight: f,
  kit,
  fanOf,
  playable,
  onWatch,
  why,
}: {
  fight: Fight
  kit: DuelKit | null
  fanOf: (login: string) => Fan
  playable: boolean
  onWatch: (f: Fight) => void
  why?: { title: string; line: string }
}) {
  return (
    <li className={cn(cardClass, "flex flex-col overflow-hidden")}>
      {why && (
        <div className="px-4 pt-4 pb-3">
          <p className="eyebrow text-klein">{why.title}</p>
          <p className="mt-1 text-[15px] font-medium text-ink">{why.line}</p>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 bg-navy px-3 py-3 text-paper">
        {([0, 1] as const).map((i) => (
          <div key={i} className={cn("flex min-w-0 flex-col items-center text-center", i === 1 && "col-start-3")}>
            <ClassArt kit={kit} classe={f.classes[i]} material={f.materiais[i] ?? "bronze"} fan={fanOf(f.logins[i])} size={44} ring={RINGS[i]} />
            <p className={cn("mt-1 flex max-w-full items-center gap-1 text-[15px] font-medium", f.vencedor === i ? "text-ouro" : "text-paper/75")}>
              {f.vencedor === i && <Crown aria-label={T.won} className="h-3.5 w-3.5 shrink-0" />}
              <Name login={f.logins[i]} className="truncate">
                {f.nomes[i]}
              </Name>
            </p>
            <p className="max-w-full truncate text-[12px] text-paper/60">
              {className(f.classes[i])}
              {f.sorteadas[i] ? "" : ` · ${T.picked}`}
            </p>
          </div>
        ))}
        <span aria-hidden className="col-start-2 row-start-1 text-[13px] font-semibold text-paper/45">
          ×
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-2.5 text-[13px] text-muted">
        <span>
          {how(f)} · {when(f.em)}
        </span>
        {playable ? (
          <Button size="sm" onClick={() => onWatch(f)} icon={<Play aria-hidden className="h-4 w-4" />}>
            {T.watch}
          </Button>
        ) : (
          <span>{T.old}</span>
        )}
      </div>
    </li>
  )
}

/** A fight's replay in a dialog: the live's own box playing the very fight again, over and over. */
export function DuelReplay({ fight, onClose }: { fight: Fight | null; onClose: () => void }) {
  return (
    <Dialog open={!!fight} onClose={onClose} closeLabel={T.close} title={fight ? fill(T.replayTitle, { a: fight.nomes[0], b: fight.nomes[1] }) : ""} className="w-[min(26rem,calc(100vw-2rem))]">
      {fight && (
        <>
          <div className="cut bg-navy p-3">
            <div className="mx-auto max-w-[20rem]" style={{ aspectRatio: PLAYER_ASPECT }}>
              <iframe src={replayUrl(fight)} title={fill(T.replayTitle, { a: fight.nomes[0], b: fight.nomes[1] })} className="h-full w-full border-0" />
            </div>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            {className(fight.classes[0])} × {className(fight.classes[1])} · {how(fight)} · {when(fight.em)}
          </p>
        </>
      )}
    </Dialog>
  )
}

function CardsSkeleton({ n }: { n: number }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: n }, (_, i) => (
        <li key={i}>
          <Skeleton className="cut h-[150px]" />
        </li>
      ))}
    </ul>
  )
}

/**
 * The fights: the best among those the Σ API keeps (each with why, from the engine played again in the browser) and
 * the latest few, each with its replay in a dialog.
 */
export function FightsSection({
  fights,
  failed,
  kit,
  versao,
  fanOf,
}: {
  fights: Fight[] | null
  failed: boolean
  kit: DuelKit | null
  versao: number | null
  fanOf: (login: string) => Fan
}) {
  const [readings, setReadings] = useState<Record<string, FightReading> | null>(null)
  const [replay, setReplay] = useState<Fight | null>(null)

  useEffect(() => {
    if (!fights || versao === null) return
    let live = true
    readFights(fights, versao).then(
      (r) => live && setReadings(r),
      () => live && setReadings({}),
    )
    return () => {
      live = false
    }
  }, [fights, versao])

  const best = useMemo(() => (fights && readings ? bestFights(fights, readings) : null), [fights, readings])
  const playable = (f: Fight) => versao !== null && f.versao === versao

  return (
    <Section id="lutas" title={T.title} description={T.description}>
      {failed ? (
        <EmptyState>{text.ranking.unavailable}</EmptyState>
      ) : !fights ? (
        <CardsSkeleton n={4} />
      ) : !fights.length ? (
        <EmptyState>{T.empty}</EmptyState>
      ) : (
        <div className="space-y-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{T.best}</h3>
              <p className="text-[13px] text-muted">{fill(T.among, { n: fights.length })}</p>
            </div>
            {!best ? (
              <CardsSkeleton n={4} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {best.map(({ why, fight, reading }) => (
                  <FightCard key={fight.id} fight={fight} kit={kit} fanOf={fanOf} playable={playable(fight)} onWatch={setReplay} why={{ title: T.why[why].title, line: whyLine(why, fight, reading) }} />
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-medium tracking-[-0.02em] text-ink">{T.latest}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {fights.slice(0, LATEST).map((f) => (
                <FightCard key={f.id} fight={f} kit={kit} fanOf={fanOf} playable={playable(f)} onWatch={setReplay} />
              ))}
            </ul>
          </div>
        </div>
      )}
      <DuelReplay fight={replay} onClose={() => setReplay(null)} />
    </Section>
  )
}

/** A fight in a line, from one side's point of view (their record): the result, the other, their classes, its replay. */
export function FightRow({ fight: f, login, playable, onWatch, labels }: { fight: Fight; login: string; playable: boolean; onWatch: (f: Fight) => void; labels: { won: string; lost: string } }) {
  const i = Math.max(0, f.logins.indexOf(login))
  const won = f.vencedor === i
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
      <Badge tone={won ? "win" : "loss"}>{won ? labels.won : labels.lost}</Badge>
      <span className="min-w-0 flex-1 text-[15px] text-ink">
        {className(f.classes[i])} × {className(f.classes[1 - i])}{" "}
        <span className="text-muted">
          ·{" "}
          <Name login={f.logins[1 - i]} className="font-medium">
            {f.nomes[1 - i]}
          </Name>
        </span>
      </span>
      <span className="text-[13px] text-muted">
        {how(f)} · {when(f.em)}
      </span>
      {playable && (
        <Button size="sm" variant="secondary" onClick={() => onWatch(f)} icon={<Play aria-hidden className="h-4 w-4" />}>
          {T.watch}
        </Button>
      )}
    </li>
  )
}
