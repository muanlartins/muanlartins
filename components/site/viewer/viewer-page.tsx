"use client"

import { ArrowRight, ArrowUpRight, Clock, Flag, Flame, Shuffle, Gift, Lightbulb, Pencil, Play, Sigma as SigmaIcon, Swords, Trash2, Trophy, Tv, Volleyball, X } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { GameIcon } from "@/components/site/game/game-icon"
import { amount, LEVELS, Medal } from "@/components/site/profile/badges"
import { dateBR, number, ViewerCard } from "@/components/site/viewer/viewer-card"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { loadShowcase, LoadoutTiles, type Showcase } from "@/components/site/viewer/loadout-showcase"
import { channel } from "@/content/channel"
import { profile } from "@/content/profile"
import { channelPath, livePath } from "@/lib/channel"
import { ClassArt, duelKit, type DuelKit } from "@/components/site/minigames/class-art"
import { Marble, marbleKit, type MarbleKit } from "@/components/site/minigames/marble"
import { loadRacer, loadRaces, RACE_ASPECT, raceUrl, type Race, type Racer } from "@/lib/corrida"
import { loadDuelist, PLAYER_ASPECT, replayUrl, type Duelist, type Fight } from "@/lib/duelo"
import { loadMural, type Mural, type MuralPix } from "@/lib/pix"
import { keptToken, loadMine, type Badge, type Sigma, type Torcedor } from "@/lib/profile"
import { localize, profileSlug, sectionPath } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"
import { forgetLook, isLogin, loadLook, loadPerson, loadViewerData, takeDownImage, type ImageKind, type Look, type Person, type ViewerData } from "@/lib/viewer"

const text = localize(channel.viewer)
const medalText = localize(profile.sigma)
const minigames = localize(channel.minijogos)
const reais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/** A showcase on their page, Steam-style: a panel with its title bar. */
function Section({ title, icon, aside, children }: { title: string; icon: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-paper/70">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-klein/[0.045] px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.12em] text-klein">
          {icon}
          {title}
        </h2>
        {aside && <p className="text-[13px] text-muted tabular-nums">{aside}</p>}
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  )
}

function Stat({ value, label, icon, tint }: { value: string; label: string; icon: ReactNode; tint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-paper/70 px-3.5 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `${tint}1f`, color: tint }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-medium leading-tight tracking-[-0.02em] text-ink tabular-nums">{value}</p>
        <p className="text-[12px] leading-tight text-muted">{label}</p>
      </div>
    </div>
  )
}

/** The badges as a showcase: each medal with its level as pips and the way to the next. */
function MedalShowcase({ badges }: { badges: Badge[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {badges.map((b) => {
        const color = b.nivel ? LEVELS[b.nivel - 1] : undefined
        return (
          <li key={b.id} className="flex flex-col items-center gap-2 rounded-lg border border-line bg-paper/60 px-3 pb-3 pt-4 text-center">
            <Medal badge={b} />
            <p className="text-[13px] font-medium text-ink">{b.nome}</p>
            <p className="text-lg font-medium leading-none text-klein tabular-nums">{amount(b.id, b.valor)}</p>
            <div className="flex gap-1" aria-label={`${b.nivel}/${b.niveis}`}>
              {Array.from({ length: b.niveis }, (_, i) => (
                <span key={i} className="h-1.5 w-3 rounded-full" style={{ background: i < b.nivel ? color : "var(--color-line)" }} />
              ))}
            </div>
            <p className="text-[11px] text-muted tabular-nums">{b.proximo === null ? medalText.maxed : `${medalText.toGo} ${amount(b.id, b.proximo)}`}</p>
          </li>
        )
      })}
    </ul>
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
  const [races, setRaces] = useState<Racer | null>(null)
  // The latest races in full (their seeds), to replay the ones they ran.
  const [recent, setRecent] = useState<Record<string, Race>>({})
  const [raceReplay, setRaceReplay] = useState<Race | null>(null)
  const [kit, setKit] = useState<DuelKit | null>(null)
  const [mkit, setMkit] = useState<MarbleKit | null>(null)
  const [mural, setMural] = useState<Mural | null>(null)
  const [loadout, setLoadout] = useState<Showcase | null | undefined>(undefined)
  const [data, setData] = useState<ViewerData | null>(null)
  const [mine, setMine] = useState(false)
  // Signed in as the channel on someone else's page: Luan can take a picture down.
  const [moderator, setModerator] = useState<string | null>(null)
  const [replay, setReplay] = useState<Fight | null>(null)

  useEffect(() => {
    if (!isLogin(login)) return
    loadLook(login).then(setLook)
    loadPerson(login).then(setPerson)
    loadDuelist(login).then(setDuels).catch(() => setDuels(null))
    loadRacer(login).then(setRaces).catch(() => setRaces(null))
    loadRaces()
      .then((r) => setRecent(Object.fromEntries(r.ultimas.filter((x) => x.versao === 2).map((x) => [x.id, x]))))
      .catch(() => {})
    loadMural().then(setMural).catch(() => setMural(null))
    loadShowcase(login).then(setLoadout).catch(() => setLoadout(null))
    loadViewerData().then(setData)
    const token = keptToken()
    if (token) {
      loadMine(token)
        .then((me) => {
          setMine(me.login === login)
          if (me.login === CHANNEL && login !== CHANNEL) setModerator(token)
        })
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

  async function takeDown(kind: ImageKind) {
    if (!moderator || !confirm(text.takeDown.replace("{what}", kind === "banner" ? text.banner : text.photo) + "?")) return
    const imagens = await takeDownImage(moderator, login, kind).catch(() => undefined)
    if (imagens === undefined) return
    forgetLook(login)
    setLook((l) => (l ? { ...l, imagens } : l))
  }

  const button = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
  const actions = (
    <>
      {mine && (
        <Link href={`/${profileSlug()}#cartao`} className={cn(button, "bg-white text-navy hover:bg-white/85")}>
          <Pencil aria-hidden className="h-3.5 w-3.5" />
          {text.edit}
        </Link>
      )}
      {login !== CHANNEL && (
        <a href={`https://www.twitch.tv/${login}`} target="_blank" rel="noreferrer" className={cn(button, "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20")}>
          {text.twitch}
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </a>
      )}
      {moderator &&
        (["banner", "foto"] as const)
          .filter((kind) => look?.imagens?.[kind])
          .map((kind) => (
            <button key={kind} type="button" onClick={() => takeDown(kind)} className={cn(button, "bg-[#b42318]/80 text-white hover:bg-[#b42318]")}>
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
              {text.takeDown.replace("{what}", kind === "banner" ? text.banner : text.photo)}
            </button>
          ))}
    </>
  )

  return (
    <div className="space-y-8">
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      <Script src="/stream/duelo-motor.js" onReady={() => setKit(duelKit())} />
      <Script src="/stream/duelo-arte.js" onReady={() => setKit(duelKit())} />
      <Script src="/stream/bolinha.js" onReady={() => setMkit(marbleKit())} />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />

      <ViewerCard login={login} look={look} stats={stats} primeira={person?.primeira} T={T} S={S} actions={actions} />
      {mine && <p className="-mt-6 text-[13px] text-muted">{text.mine}</p>}

      {login !== CHANNEL && (
        <Section title={text.stats.title} icon={<Trophy aria-hidden className="h-4 w-4" />}>
          {person === undefined ? (
            <p className="text-[14px] text-muted">{text.loading}</p>
          ) : !stats ? (
            <p className="max-w-[40rem] text-[14px] text-muted">{text.stats.none}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={number(stats.sigma)} label={text.stats.sigma} icon={<SigmaIcon aria-hidden className="h-5 w-5" />} tint="#002fa7" />
                <Stat value={`${number(Math.floor(stats.minutos / 60))} h`} label={text.stats.hours} icon={<Clock aria-hidden className="h-5 w-5" />} tint="#2fb0bb" />
                <Stat value={number(stats.lives)} label={text.stats.lives} icon={<Tv aria-hidden className="h-5 w-5" />} tint="#9b5cf6" />
                <Stat
                  value={number(stats.sequencia)}
                  label={`${text.stats.streak} · ${text.stats.record.replace("{n}", number(stats.recorde))}`}
                  icon={<Flame aria-hidden className="h-5 w-5" />}
                  tint={stats.sequencia ? "#e0620a" : "#8e9aa8"}
                />
              </div>
              {/* What they sent by Pix is theirs alone: its badge stays on their /perfil. */}
              {S && <MedalShowcase badges={S.medalhas(stats).filter((b) => b.id !== "doado")} />}
            </>
          )}
        </Section>
      )}

      {/* Their dream loadout from the inventory's builder; on their own page without one, the way to build it. */}
      {(loadout || (mine && loadout === null)) && (
        <Section
          title={text.loadout.title}
          icon={<GameIcon game="valorant" size={14} />}
          aside={loadout ? text.loadout.count.replace("{n}", number(loadout.picked.length)).replace("{t}", number(loadout.total)) : undefined}
        >
          {loadout ? <LoadoutTiles picked={loadout.picked} /> : <p className="max-w-[40rem] text-[14px] text-muted">{text.loadout.none}</p>}
          <Link
            href={`${sectionPath("content")}/valorant/inventory${mine ? "#montar" : login === CHANNEL ? "" : `?de=${login}`}`}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline"
          >
            {mine ? (loadout ? text.loadout.edit : text.loadout.build) : text.loadout.see}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Section>
      )}

      {dedications.length > 0 && (
        <Section title={text.dedications.title} icon={<Volleyball aria-hidden className="h-4 w-4" />} aside={number(dedications.length)}>
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
          icon={<Swords aria-hidden className="h-4 w-4" />}
          aside={[
            text.duel.record.replace("{w}", number(duels.vitorias)).replace("{n}", number(duels.partidas)),
            duels.posicao ? text.duel.position.replace("{p}", String(duels.posicao)) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          <div className="flex items-center gap-3 rounded-lg bg-navy p-2 pr-4 text-white">
            {look?.duelo?.classe ? (
              <ClassArt kit={kit} classe={look.duelo.classe} material={look.duelo.material ?? (S && stats ? S.ranque(stats.sigma).id.replace(/-\d$/, "") : "bronze")} fan={T ? T.normalizar(look?.aparencia ?? null, login) : { cor: "#85a7ff", detalhe: "#002fa7", roupa: "lisa" }} size={64} />
            ) : (
              <span className="grid h-16 w-16 place-items-center">
                <Shuffle aria-hidden className="h-6 w-6 text-white/70" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[12px] uppercase tracking-[0.1em] text-white/50">{text.duel.ball}</p>
              <p className="text-[16px] font-medium">{look?.duelo?.classe ? (minigames.yours.classes as Record<string, { name: string }>)[look.duelo.classe]?.name ?? look.duelo.classe : minigames.yours.random}</p>
            </div>
          </div>
          {replay && (
            <div className="space-y-2">
              <div className="mx-auto max-w-[20rem] overflow-hidden rounded-md bg-navy" style={{ aspectRatio: PLAYER_ASPECT }}>
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

      {races && races.corridas > 0 && (
        <Section
          title={text.race.title}
          icon={<Flag aria-hidden className="h-4 w-4" />}
          aside={[
            text.race.record.replace("{w}", number(races.vitorias)).replace("{p}", number(races.podios)).replace("{n}", number(races.corridas)),
            races.melhor ? text.race.best.replace("{b}", String(races.melhor)) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-[104px] w-[104px] shrink-0 place-items-center rounded-full bg-navy">
              {T && <Marble kit={mkit} fan={T.normalizar(look?.aparencia ?? null, login) as unknown as Record<string, unknown>} rankId={S && stats ? S.ranque(stats.sigma).id : undefined} size={92} />}
            </div>
            <ul className="flex flex-1 flex-wrap gap-2">
              {races.ultimas.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-md border border-line bg-paper/60 px-3 py-2 text-[14px]">
                  <span className={cn("font-medium tabular-nums", r.lugar === 1 ? "text-win" : r.lugar <= 3 ? "text-klein" : "text-ink")}>
                    {text.race.place.replace("{l}", String(r.lugar)).replace("{n}", String(r.de))}
                  </span>
                  <span className="text-muted">· {dateBR(r.em)}</span>
                  {recent[r.id] && (
                    <button type="button" onClick={() => setRaceReplay(recent[r.id])} aria-label={text.duel.replay} className="text-klein hover:opacity-70">
                      <Play aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {raceReplay && (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-md bg-navy" style={{ aspectRatio: RACE_ASPECT }}>
                <iframe key={raceReplay.id} src={raceUrl(raceReplay)} title={text.race.title} className="h-full w-full border-0" />
              </div>
              <button type="button" onClick={() => setRaceReplay(null)} className="inline-flex items-center gap-1 text-[14px] font-medium text-klein hover:underline">
                <X aria-hidden className="h-4 w-4" />
                {text.duel.close}
              </button>
            </div>
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
