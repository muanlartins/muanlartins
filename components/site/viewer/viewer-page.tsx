"use client"

import { ArrowRight, ArrowUpRight, Flame, Gift, Lightbulb, Play, Trophy, X } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { GameIcon } from "@/components/site/game/game-icon"
import { BadgeGrid } from "@/components/site/profile/badges"
import { dateBR, number, ViewerCard } from "@/components/site/viewer/viewer-card"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { channel } from "@/content/channel"
import { channelPath, livePath } from "@/lib/channel"
import { loadDuelist, replayUrl, type Duelist, type Fight } from "@/lib/duelo"
import { loadMural, type Mural, type MuralPix } from "@/lib/pix"
import { keptToken, loadMine, type Sigma, type Torcedor } from "@/lib/profile"
import { localize, profileSlug } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"
import { isLogin, loadLook, loadPerson, loadViewerData, type Look, type Person, type ViewerData } from "@/lib/viewer"

const text = localize(channel.viewer)
const reais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function Section({ title, icon, aside, children }: { title: string; icon: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] text-klein">
          {icon}
          {title}
        </h2>
        {aside && <p className="text-[14px] text-muted tabular-nums">{aside}</p>}
      </div>
      {children}
    </section>
  )
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-paper/60 px-4 py-3">
      <p className="flex items-center gap-1.5 text-2xl font-medium tracking-[-0.02em] text-klein tabular-nums">
        {icon}
        {value}
      </p>
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  )
}

/** Their Pix on the mural, newest first, with the goal each came in; and the gift subs they won. */
function pixOf(mural: Mural | null, login: string) {
  if (!mural) return { pix: [], subs: [] }
  const goals = [...(mural.meta ? [mural.meta] : []), ...mural.metas]
  const pix: (MuralPix & { goal: string | null })[] = [
    ...goals.flatMap((goal) => goal.apoiadores.filter((p) => p.login === login).map((p) => ({ ...p, goal: goal.titulo }))),
    ...mural.pix.filter((p) => p.login === login).map((p) => ({ ...p, goal: null })),
  ]
  const subs = goals.flatMap((goal) => (goal.sorteios ?? []).filter((s) => s.login === login).map((s) => ({ ...s, goal: goal.titulo })))
  return { pix: pix.sort((a, b) => (a.em < b.em ? 1 : -1)), subs }
}

/**
 * Someone's page: their card, their Σ and badges, the goals dedicated to them, their duels, their Pix, their ideas on the
 * roadmap and the matches they played with Luan. Everything is read in the browser, so it follows the lives without a
 * release, and the same page draws a login the build didn't know (the 404 page hands it over).
 */
export function ViewerPage({ login: given }: { login: string }) {
  const login = given.toLowerCase()
  const [T, setT] = useState<Torcedor | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
  const [look, setLook] = useState<Look | null | undefined>(undefined)
  const [person, setPerson] = useState<Person | null | undefined>(undefined)
  const [duels, setDuels] = useState<Duelist | null>(null)
  const [mural, setMural] = useState<Mural | null>(null)
  const [data, setData] = useState<ViewerData | null>(null)
  const [mine, setMine] = useState(false)
  const [replay, setReplay] = useState<Fight | null>(null)

  useEffect(() => {
    if (!isLogin(login)) return
    loadLook(login).then(setLook)
    loadPerson(login).then(setPerson)
    loadDuelist(login).then(setDuels).catch(() => setDuels(null))
    loadMural().then(setMural).catch(() => setMural(null))
    loadViewerData().then(setData)
    const token = keptToken()
    if (token) {
      loadMine(token)
        .then((me) => setMine(me.login === login))
        .catch(() => {})
    }
  }, [login])

  const { pix, subs } = useMemo(() => pixOf(mural, login), [mural, login])
  const ideas = data?.ideias[login] ?? []
  const matches = data?.partidas[login] ?? []
  const stats = person?.stats ?? null
  const dedications = person?.dedicatorias ?? []
  const wins = matches.filter((m) => m.result === "win").length

  if (!isLogin(login)) return <p className="text-muted">{text.notFound}</p>

  return (
    <div className="space-y-10">
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-end">
        <ViewerCard login={login} look={look} stats={stats} primeira={person?.primeira} T={T} S={S} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
          {mine && (
            <>
              <span className="text-muted">{text.mine}</span>
              <Link href={`/${profileSlug()}`} className="inline-flex items-center gap-1.5 font-medium text-klein hover:underline">
                {text.edit}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </>
          )}
          {login !== CHANNEL && (
            <a href={`https://www.twitch.tv/${login}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-klein">
              {text.twitch}
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {login !== CHANNEL && (
        <Section title={text.stats.title} icon={<Trophy aria-hidden className="h-4 w-4" />}>
          {person === undefined ? (
            <p className="text-[14px] text-muted">{text.loading}</p>
          ) : !stats ? (
            <p className="max-w-[40rem] text-[14px] text-muted">{text.stats.none}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={number(stats.sigma)} label={text.stats.sigma} />
                <Stat value={number(Math.floor(stats.minutos / 60))} label={text.stats.hours} />
                <Stat value={number(stats.lives)} label={text.stats.lives} />
                <Stat
                  value={number(stats.sequencia)}
                  label={`${text.stats.streak} · ${text.stats.record.replace("{n}", number(stats.recorde))}`}
                  icon={<Flame aria-hidden className={cn("h-6 w-6", stats.sequencia ? "text-[#ff7a1a]" : "text-muted")} />}
                />
              </div>
              {/* What they sent by Pix is theirs alone: its badge stays on their /perfil. */}
              {S && <BadgeGrid badges={S.medalhas(stats).filter((b) => b.id !== "doado")} />}
            </>
          )}
        </Section>
      )}

      {dedications.length > 0 && (
        <Section title={text.dedications.title} icon={<span aria-hidden>⚽</span>} aside={number(dedications.length)}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dedications.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-md border border-line bg-paper/60 px-4 py-3 text-[14px]">
                {d.jogo && <GameIcon game={d.jogo} size={14} />}
                <span className="font-medium text-ink">{d.tipo === "gol" ? text.dedications.goal : text.dedications.win}</span>
                {d.detalhe && <span className="text-muted tabular-nums">{d.tipo === "gol" ? `${d.detalhe} km/h` : d.detalhe}</span>}
                <span className="ml-auto text-muted tabular-nums">{dateBR(d.em)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {duels && duels.partidas > 0 && (
        <Section
          title={text.duel.title}
          icon={<span aria-hidden>🗡️</span>}
          aside={[
            text.duel.record.replace("{w}", number(duels.vitorias)).replace("{n}", number(duels.partidas)),
            duels.posicao ? text.duel.position.replace("{p}", String(duels.posicao)) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {replay && (
            <div className="max-w-[720px] space-y-2">
              <div className="overflow-hidden rounded-md bg-navy" style={{ aspectRatio: "660 / 390" }}>
                <iframe key={replay.id} src={replayUrl(replay)} title={text.duel.title} className="h-full w-full border-0" />
              </div>
              <button type="button" onClick={() => setReplay(null)} className="inline-flex items-center gap-1 text-[14px] font-medium text-klein hover:underline">
                <X aria-hidden className="h-4 w-4" />
                {text.duel.close}
              </button>
            </div>
          )}
          <ul className="divide-y divide-line rounded-md border border-line bg-paper/60">
            {duels.lutas.slice(0, 10).map((f) => {
              const side = f.logins[0] === login ? 0 : 1
              const other = 1 - side
              const won = f.vencedor === side
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[14px]">
                  <span className={cn("font-medium", won ? "text-win" : "text-loss")}>{won ? text.duel.won : text.duel.lost}</span>
                  <span className="text-muted">{text.duel.against}</span>
                  {f.logins[other] === CHANNEL ? <span className="text-ink">{f.nomes[other]}</span> : <ViewerName login={f.logins[other]} className="text-ink">{f.nomes[other]}</ViewerName>}
                  <span className="text-muted">· {dateBR(f.em)}</span>
                  <button type="button" onClick={() => setReplay(f)} className="ml-auto inline-flex items-center gap-1 font-medium text-klein hover:underline">
                    <Play aria-hidden className="h-3.5 w-3.5" />
                    {text.duel.replay}
                  </button>
                </li>
              )
            })}
          </ul>
          {mine && (
            <Link href={channelPath("minijogos")} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline">
              {text.duel.pick}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          )}
        </Section>
      )}

      {(pix.length > 0 || subs.length > 0) && (
        <Section title={text.pix.title} icon={<Gift aria-hidden className="h-4 w-4" />} aside={pix.length ? reais(pix.reduce((sum, p) => sum + p.centavos, 0)) : undefined}>
          <ul className="space-y-2">
            {subs.map((s) => (
              <li key={`sub-${s.em}`} className="rounded-md border border-klein/40 bg-klein/[0.06] px-4 py-3 text-[14px] text-ink">
                🎁 {text.pix.sub.replace("{goal}", s.goal)} · <span className="text-muted">{dateBR(s.em)}</span>
              </li>
            ))}
            {pix.map((p) => (
              <li key={p.em} className="rounded-md border border-line bg-paper/60 px-4 py-3">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] text-muted">
                  <span>
                    {p.goal ?? text.pix.outside} · {dateBR(p.em)}
                  </span>
                  <span className="font-medium text-klein tabular-nums">{reais(p.centavos)}</span>
                </p>
                {p.mensagem && <p className="mt-1 break-words text-[15px] text-ink">{p.mensagem}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {ideas.length > 0 && (
        <Section title={text.ideas.title} icon={<Lightbulb aria-hidden className="h-4 w-4" />} aside={number(ideas.length)}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <Link
                  href={`${channelPath("roadmap")}#${idea.id}`}
                  className="block h-full rounded-md border border-line bg-paper/60 px-4 py-3 transition-colors hover:border-klein"
                >
                  <span className="text-[12px] uppercase tracking-[0.1em] text-muted">
                    {idea.as === "report" ? text.ideas.report : text.ideas.idea} · {idea.shipped && idea.date ? dateBR(idea.date) : text.ideas.soon}
                  </span>
                  <span className="mt-1 block text-[15px] font-medium text-klein">{idea.about ?? idea.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {matches.length > 0 && (
        <Section
          title={text.matches.title}
          icon={<GameIcon game={matches[0].game} size={14} />}
          aside={text.matches.summary.replace("{n}", number(matches.length)).replace("{w}", number(wins))}
        >
          <ul className="divide-y divide-line rounded-md border border-line bg-paper/60">
            {matches.slice(0, 30).map((m) => (
              <li key={`${m.game}-${m.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[14px]">
                <GameIcon game={m.game} size={13} />
                <span className={cn("font-medium", m.result === "win" ? "text-win" : m.result === "loss" ? "text-loss" : "text-muted")}>
                  {m.result === "win" ? text.matches.win : m.result === "loss" ? text.matches.loss : text.matches.draw}
                </span>
                {m.score && <span className="text-ink tabular-nums">{m.score.join("–")}</span>}
                <span className="text-muted">
                  {m.label} · {dateBR(m.date)}
                </span>
                {m.live && (
                  <Link href={`${livePath(m.live.date)}#t=${m.live.at}`} className="ml-auto inline-flex items-center gap-1 font-medium text-klein hover:underline">
                    <Play aria-hidden className="h-3.5 w-3.5" />
                    {text.matches.watch}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
