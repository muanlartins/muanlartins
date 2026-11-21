"use client"

import { ArrowRight, ArrowUpRight, Flag, Gift, Lightbulb, Pencil, Play, QrCode, Shuffle, Sigma as SigmaIcon, Swords, Trash2, UsersRound, Volleyball } from "lucide-react"
import Link from "next/link"
import Script from "next/script"
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import { GameIcon } from "@/components/site/game/game-icon"
import { ClassArt, duelKit, type DuelKit } from "@/components/site/minigames/class-art"
import { Marble, marbleKit, type MarbleKit } from "@/components/site/minigames/marble"
import { MedalGrid } from "@/components/site/profile/badges"
import { loadShowcase, LoadoutTiles, type Showcase as Loadout } from "@/components/site/viewer/loadout-showcase"
import { rowClass, Showcase, ShowcaseList, ShowcasesSkeleton } from "@/components/site/viewer/showcase"
import { dateBR, number, ViewerCard } from "@/components/site/viewer/viewer-card"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { Badge, Button, Dialog, EmptyState, ErrorLine } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { channelPath, livePath } from "@/lib/channel"
import { loadRacer, loadRaces, RACE_ASPECT, raceUrl, type Race, type Racer } from "@/lib/corrida"
import { loadDuelist, PLAYER_ASPECT, replayUrl, type Duelist, type Fight } from "@/lib/duelo"
import { loadMural, type Mural, type MuralPix } from "@/lib/pix"
import { keptMe, keptMeRaw, keptToken, loadMine, onMeChange, type Sigma, type Torcedor } from "@/lib/profile"
import { LOCALE, localize, PIX_SLUG, profileSlug, sectionPath } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"
import { forgetLook, isLogin, loadLook, loadPerson, loadViewerData, takeDownImage, type ImageKind, type Look, type Person, type ViewerData } from "@/lib/viewer"

const text = localize(channel.viewer)
const minigames = localize(channel.minijogos)
const reais = (centavos: number) => {
  const value = centavos / 100
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`
}
/** A count line in the singular where the number is 1: "1 vitórias em 4 duelos" → "1 vitória em 4 duelos". */
const one = (line: string) => line.replace(/(^|[^\d.,])1 ([a-zà-ú]+)s( dedicados)?\b/g, (_, before, word, adjective) => `${before}1 ${word}${adjective ? " dedicado" : ""}`)
/** How many rows a list shows before "Ver todos". */
const FIRST = 5

/** What a showcase's data is: loading, failed, or here (possibly empty). */
type Slot<T> = { state: "loading" } | { state: "error" } | { state: "ok"; value: T }
const loading = { state: "loading" } as const
const failed = { state: "error" } as const
const ok = <T,>(value: T): Slot<T> => ({ state: "ok", value })

/**
 * The showcases, in their order. A list on purpose: a viewer could one day reorder theirs, or hide one, and the page
 * would only read the order from their profile. `wide` spans both columns; two halves in a row sit side by side.
 */
const SHOWCASES = [
  { id: "sigma", wide: true },
  { id: "lives", wide: false },
  { id: "duelos", wide: false },
  { id: "corridas", wide: false },
  { id: "pix", wide: false },
  { id: "ideias", wide: false },
  { id: "partidas", wide: false },
  { id: "loadout", wide: true },
] as const
type ShowcaseId = (typeof SHOWCASES)[number]["id"]

/** The showcases shown, in order, each wide or half: a half with no half after it takes the whole row. */
function arrange(shown: ShowcaseId[]) {
  const wide = (id: ShowcaseId) => SHOWCASES.find((s) => s.id === id)!.wide
  const out: { id: ShowcaseId; wide: boolean }[] = []
  for (let i = 0; i < shown.length; i++) {
    const id = shown[i]
    const next = shown[i + 1]
    if (wide(id)) out.push({ id, wide: true })
    else if (next && !wide(next)) {
      out.push({ id, wide: false }, { id: next, wide: false })
      i++
    } else out.push({ id, wide: true })
  }
  return out
}

/** Their Pix on the mural, newest first, with the goal each came in; and the gift subs they won. */
function pixOf(mural: Mural, login: string) {
  const goals = [...(mural.meta ? [mural.meta] : []), ...mural.metas]
  const pix: (MuralPix & { goal: string | null })[] = [
    ...goals.flatMap((goal) => goal.apoiadores.filter((p) => p.login === login).map((p) => ({ ...p, goal: goal.titulo }))),
    ...mural.pix.filter((p) => p.login === login).map((p) => ({ ...p, goal: null })),
  ]
  const subs = goals.flatMap((goal) => (goal.sorteios ?? []).filter((s) => s.login === login).map((s) => ({ ...s, goal: goal.titulo })))
  return { pix: pix.sort((a, b) => (a.em < b.em ? 1 : -1)), subs }
}

/** A list's first rows, and the rest behind "Ver todos". */
function useMore(total: number) {
  const [open, setOpen] = useState(false)
  const shown = open ? total : Math.min(total, FIRST)
  const toggle =
    total > FIRST ? (
      <Button variant="quiet" size="sm" onClick={() => setOpen(!open)}>
        {open ? text.less : text.more.replace("{n}", number(total))}
      </Button>
    ) : null
  return { shown, toggle }
}

const linkTo = (href: string, label: string) => (
  <Link href={href} className="inline-flex items-center gap-1.5 text-[15px] font-medium text-klein hover:underline">
    {label}
    <ArrowRight aria-hidden className="h-4 w-4" />
  </Link>
)

/** Who this browser says is signed in, read without asking the API (null on the server and before hydration). */
function useKeptLogin() {
  const raw = useSyncExternalStore(onMeChange, keptMeRaw, () => null)
  return raw ? (keptMe(raw)?.login ?? null) : null
}

/**
 * Someone's page, as a profile in Steam's manner: their card on top (their name the page's h1), then their showcases in
 * a grid, each the same component: Σ and medals, what happened to them in the lives, duels, races, Pix, ideas, matches
 * with me and their dream loadout. An empty showcase hides on others' pages and, on your own, says how to fill it.
 * Everything is read in the browser, so it follows the lives without a release, and the same page draws a login the
 * build didn't know (the 404 page hands it over).
 */
export function ViewerPage({ login: given }: { login: string }) {
  const login = given.toLowerCase()
  const [T, setT] = useState<Torcedor | null>(null)
  const [S, setS] = useState<Sigma | null>(null)
  const [kit, setKit] = useState<DuelKit | null>(null)
  const [mkit, setMkit] = useState<MarbleKit | null>(null)
  const [look, setLook] = useState<Look | null | undefined>(undefined)
  const [person, setPerson] = useState<Slot<Person>>(loading)
  const [duels, setDuels] = useState<Slot<Duelist>>(loading)
  const [races, setRaces] = useState<Slot<Racer>>(loading)
  const [mural, setMural] = useState<Slot<Mural>>(loading)
  const [loadout, setLoadout] = useState<Slot<Loadout | null>>(loading)
  const [data, setData] = useState<ViewerData | null>(null)
  // The latest races in full (their seeds), to replay the ones they ran.
  const [recent, setRecent] = useState<Record<string, Race>>({})
  const [replay, setReplay] = useState<{ title: string; src: string; aspect: string; width: number } | null>(null)
  // Signed in: their own page, or the channel (Luan can take a picture down).
  const kept = useKeptLogin()
  const [signedIn, setSignedIn] = useState<string | null>(null)
  const me = signedIn ?? kept
  const mine = me === login
  const [moderator, setModerator] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<ImageKind | null>(null)

  // Each source's load, and its retry (which shows the loading state again first).
  const fetchPerson = useCallback(() => loadPerson(login).then((p) => setPerson(p ? ok(p) : failed)), [login])
  const fetchDuels = useCallback(() => loadDuelist(login).then((d) => setDuels(ok(d)), () => setDuels(failed)), [login])
  const fetchRaces = useCallback(() => loadRacer(login).then((r) => setRaces(ok(r)), () => setRaces(failed)), [login])
  const fetchMural = useCallback(() => loadMural().then((m) => setMural(ok(m)), () => setMural(failed)), [])
  const fetchLoadout = useCallback(() => loadShowcase(login).then((l) => setLoadout(ok(l)), () => setLoadout(failed)), [login])
  const retry = {
    person: () => (setPerson(loading), fetchPerson()),
    duels: () => (setDuels(loading), fetchDuels()),
    races: () => (setRaces(loading), fetchRaces()),
    mural: () => (setMural(loading), fetchMural()),
    loadout: () => (setLoadout(loading), fetchLoadout()),
  }

  useEffect(() => {
    if (!isLogin(login)) return
    loadLook(login).then(setLook)
    fetchPerson()
    fetchDuels()
    fetchRaces()
    fetchMural()
    fetchLoadout()
    loadViewerData().then(setData)
    loadRaces()
      .then((r) => setRecent(Object.fromEntries(r.ultimas.filter((x) => x.versao === 2).map((x) => [x.id, x]))))
      .catch(() => {})
    const token = keptToken()
    if (token) {
      loadMine(token)
        .then((me) => {
          setSignedIn(me.login)
          if (me.login === CHANNEL && login !== CHANNEL) setModerator(token)
        })
        .catch(() => {})
    }
  }, [login, fetchPerson, fetchDuels, fetchRaces, fetchMural, fetchLoadout])

  const theirs = useMemo(() => (mural.state === "ok" ? pixOf(mural.value, login) : { pix: [], subs: [] }), [mural, login])

  if (!isLogin(login)) return <p className="text-[17px] text-muted">{text.notFound}</p>

  async function takeDown(kind: ImageKind) {
    if (!moderator) return
    if (confirming !== kind) return setConfirming(kind)
    setConfirming(null)
    const imagens = await takeDownImage(moderator, login, kind).catch(() => undefined)
    if (imagens === undefined) return
    forgetLook(login)
    setLook((l) => (l ? { ...l, imagens } : l))
  }

  const stats = person.state === "ok" ? person.value.stats : null
  const ideas = data?.ideias[login] ?? []
  const matches = data?.partidas[login] ?? []
  const fan = T ? T.normalizar(look?.aparencia ?? null, login) : null
  const settled = [person, duels, races, mural, loadout].every((s) => s.state !== "loading") && data !== null && look !== undefined

  // What each showcase has: "error" and content show to everyone; "empty" only on your own page.
  const what: Record<ShowcaseId, "error" | "empty" | "full"> = {
    sigma: login === CHANNEL ? "empty" : person.state === "error" ? "error" : stats ? "full" : "empty",
    lives: person.state === "ok" && person.value.dedicatorias.length > 0 ? "full" : theirs.subs.length ? "full" : "empty",
    duelos: duels.state === "error" ? "error" : duels.state === "ok" && duels.value.partidas > 0 ? "full" : "empty",
    corridas: races.state === "error" ? "error" : races.state === "ok" && races.value.corridas > 0 ? "full" : "empty",
    pix: mural.state === "error" ? "error" : theirs.pix.length ? "full" : "empty",
    ideias: ideas.length ? "full" : "empty",
    partidas: matches.length ? "full" : "empty",
    loadout: loadout.state === "error" ? "error" : loadout.state === "ok" && loadout.value ? "full" : "empty",
  }
  // The channel's own page has no Σ of its own, nor dedications to itself.
  const shown = SHOWCASES.map((s) => s.id).filter((id) => what[id] !== "empty" || (mine && !(login === CHANNEL && (id === "sigma" || id === "lives"))))

  const action = "cut-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium transition-colors"
  const actions = (
    <>
      {mine && (
        <Link href={`/${profileSlug()}#cartao`} className={cn(action, "bg-paper text-navy hover:bg-paper/85")}>
          <Pencil aria-hidden className="h-4 w-4" />
          {text.edit}
        </Link>
      )}
      {login !== CHANNEL && (
        <a href={`https://www.twitch.tv/${login}`} target="_blank" rel="noreferrer" className={cn(action, "bg-paper/10 text-paper ring-1 ring-paper/20 ring-inset hover:bg-paper/20")}>
          {text.twitch}
          <ArrowUpRight aria-hidden className="h-4 w-4" />
        </a>
      )}
      {moderator &&
        (["banner", "foto"] as const)
          .filter((kind) => look?.imagens?.[kind])
          .map((kind) => (
            <button key={kind} type="button" onClick={() => takeDown(kind)} className={cn(action, "bg-loss/85 text-paper hover:bg-loss")}>
              <Trash2 aria-hidden className="h-4 w-4" />
              {confirming === kind ? text.takeDownConfirm : text.takeDown.replace("{what}", kind === "banner" ? text.banner : text.photo)}
            </button>
          ))}
    </>
  )

  const showcase = (id: ShowcaseId, wide: boolean): ReactNode => {
    const state = what[id]
    const errorLine = (retry: () => void) => <ErrorLine onRetry={retry}>{text.loadError}</ErrorLine>
    switch (id) {
      case "sigma": {
        const rank = S && stats ? S.ranque(stats.sigma, LOCALE) : null
        return (
          <Showcase
            key={id}
            id={id}
            wide={wide}
            title={text.stats.title}
            icon={<SigmaIcon />}
            meta={rank && stats ? (rank.ate === null ? text.stats.top : text.stats.toNext.replace("{n}", number(rank.ate - stats.sigma)).replace("{rank}", rank.proximo ?? "")) : undefined}
          >
            {state === "error" ? errorLine(retry.person) : !stats ? <EmptyState>{text.stats.none}</EmptyState> : S && <MedalGrid badges={S.medalhas(stats, LOCALE).filter((b) => b.id !== "doado")} />}
          </Showcase>
        )
      }
      case "lives":
        return <LivesShowcase key={id} wide={wide} person={person.state === "ok" ? person.value : null} subs={theirs.subs} />
      case "duelos":
        return (
          <DuelShowcase
            key={id}
            wide={wide}
            login={login}
            duels={duels.state === "ok" && state === "full" ? duels.value : null}
            error={state === "error" ? errorLine(retry.duels) : null}
            pick={mine ? linkTo(`${channelPath("minijogos")}#duelo`, text.duel.pick) : null}
            look={look}
            kit={kit}
            S={S}
            stats={stats}
            fan={fan}
            onReplay={setReplay}
          />
        )
      case "corridas":
        return (
          <RaceShowcase
            key={id}
            wide={wide}
            races={races.state === "ok" && state === "full" ? races.value : null}
            error={state === "error" ? errorLine(retry.races) : null}
            recent={recent}
            fan={fan}
            mkit={mkit}
            rankId={S && stats ? S.ranque(stats.sigma).id : undefined}
            onReplay={setReplay}
          />
        )
      case "pix":
        return (
          <PixShowcase
            key={id}
            wide={wide}
            pix={state === "full" ? theirs.pix : []}
            error={state === "error" ? errorLine(retry.mural) : null}
            send={mine ? linkTo(`/${PIX_SLUG}`, text.pix.send) : null}
          />
        )
      case "ideias":
        return (
          <Showcase key={id} id={id} wide={wide} title={text.ideas.title} icon={<Lightbulb />} meta={ideas.length ? number(ideas.length) : undefined}>
            {state === "full" ? (
              <ShowcaseList>
                {ideas.map((idea) => (
                  <li key={idea.id}>
                    <Link href={`${channelPath("roadmap")}#${idea.id}`} className="block px-4 py-3 transition-colors hover:bg-paper">
                      <span className="block text-[13px] text-muted">
                        {idea.as === "report" ? text.ideas.report : text.ideas.idea} · {idea.shipped && idea.date ? dateBR(idea.date) : text.ideas.soon}
                      </span>
                      <span className="mt-0.5 block text-[15px] font-medium text-klein">{idea.about ?? idea.title}</span>
                    </Link>
                  </li>
                ))}
              </ShowcaseList>
            ) : (
              <EmptyState>{text.ideas.none}</EmptyState>
            )}
          </Showcase>
        )
      case "partidas":
        return <MatchesShowcase key={id} wide={wide} matches={matches} />
      case "loadout": {
        const value = loadout.state === "ok" ? loadout.value : null
        return (
          <Showcase
            key={id}
            id={id}
            wide={wide}
            title={text.loadout.title}
            icon={<GameIcon game="valorant" size={20} />}
            meta={value ? text.loadout.count.replace("{n}", number(value.picked.length)).replace("{t}", number(value.total)) : undefined}
            footer={
              state === "error"
                ? undefined
                : linkTo(
                    `${sectionPath("content")}/valorant/inventory${mine ? "#montar" : login === CHANNEL ? "" : `?de=${login}`}`,
                    mine ? (value ? text.loadout.edit : text.loadout.build) : text.loadout.see,
                  )
            }
          >
            {state === "error" ? errorLine(retry.loadout) : value ? <LoadoutTiles picked={value.picked} /> : <EmptyState>{text.loadout.none}</EmptyState>}
          </Showcase>
        )
      }
    }
  }

  return (
    <div>
      <Script src="/stream/torcedor.js" onReady={() => setT(window.Torcedor ?? null)} />
      <Script src="/stream/sigma.js" onReady={() => setS(window.Sigma ?? null)} />
      <Script src="/stream/duelo-motor.js" onReady={() => setKit(duelKit())} />
      <Script src="/stream/duelo-arte.js" onReady={() => setKit(duelKit())} />
      <Script src="/stream/bolinha.js" onReady={() => setMkit(marbleKit())} />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/stream/torcedor.css" precedence="default" />

      <ViewerCard login={login} look={look} stats={stats} primeira={person.state === "ok" ? person.value.primeira : undefined} T={T} S={S} actions={actions} heading />
      {mine && <p className="mt-3 text-[13px] text-muted">{text.mine}</p>}

      <div className="mt-12">
        {!settled ? (
          <ShowcasesSkeleton />
        ) : shown.length ? (
          <div className="grid gap-6 sm:grid-cols-2">{arrange(shown).map(({ id, wide }) => showcase(id, wide))}</div>
        ) : (
          <EmptyState>{text.empty}</EmptyState>
        )}
      </div>

      <Dialog open={Boolean(replay)} onClose={() => setReplay(null)} title={replay?.title ?? ""} closeLabel={text.duel.close} width={replay?.width ?? 36}>
        {replay && (
          <div className="mx-auto overflow-hidden bg-navy" style={{ aspectRatio: replay.aspect }}>
            <iframe key={replay.src} src={replay.src} title={replay.title} className="h-full w-full border-0" />
          </div>
        )}
      </Dialog>
    </div>
  )
}

/** Plays a replay or opens a match's moment: a square button with the play sign, its label for whoever can't see it. */
function PlayButton({ label, onClick, href }: { label: string; onClick?: () => void; href?: string }) {
  const cls = "cut-sm ml-auto grid h-8 w-8 shrink-0 place-items-center text-klein transition-colors hover:bg-klein hover:text-paper"
  const icon = <Play aria-hidden className="h-4 w-4" />
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {icon}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {icon}
    </button>
  )
}

type OnReplay = (replay: { title: string; src: string; aspect: string; width: number }) => void

/** What happened to them in the lives: the goals (in Valorant, the wins) the stand dedicated to them and the gift subs they won. */
function LivesShowcase({ wide, person, subs }: { wide: boolean; person: Person | null; subs: { em: string; goal: string }[] }) {
  const dedications = person?.dedicatorias ?? []
  const goals = dedications.filter((d) => d.tipo === "gol").length
  const rows = [...subs.map((s) => ({ kind: "sub" as const, em: s.em, s })), ...dedications.map((d) => ({ kind: "dedication" as const, em: d.em, d }))].sort((a, b) => (a.em < b.em ? 1 : -1))
  const { shown, toggle } = useMore(rows.length)
  return (
    <Showcase id="lives" wide={wide} title={text.lives.title} icon={<Volleyball />} meta={goals ? one(text.lives.goals.replace("{n}", number(goals))) : undefined}>
      {rows.length ? (
        <ShowcaseList>
          {rows.slice(0, shown).map((row) =>
            row.kind === "sub" ? (
              <li key={`sub-${row.em}`} className={rowClass}>
                <Gift aria-hidden className="h-4 w-4 text-klein" />
                <span className="font-medium text-ink">{text.lives.sub}</span>
                <span className="text-muted">{text.lives.subGoal.replace("{goal}", row.s.goal)}</span>
                <span className="ml-auto text-[13px] text-muted tabular-nums">{dateBR(row.em)}</span>
              </li>
            ) : (
              <li key={row.d.id} className={rowClass}>
                {row.d.jogo ? <GameIcon game={row.d.jogo} size={16} /> : <Volleyball aria-hidden className="h-4 w-4 text-klein" />}
                <span className="font-medium text-ink">{row.d.tipo === "gol" ? text.lives.goal : text.lives.win}</span>
                {row.d.detalhe && <span className="text-muted tabular-nums">{row.d.tipo === "gol" ? `${row.d.detalhe} km/h` : row.d.detalhe.replace(/-/g, "–")}</span>}
                <span className="ml-auto text-[13px] text-muted tabular-nums">{dateBR(row.em)}</span>
              </li>
            ),
          )}
        </ShowcaseList>
      ) : (
        <EmptyState>{text.lives.none}</EmptyState>
      )}
      {toggle}
    </Showcase>
  )
}

/** Their ball, their record and their latest fights, each with its replay. */
function DuelShowcase({
  wide,
  login,
  duels,
  error,
  pick,
  look,
  kit,
  S,
  stats,
  fan,
  onReplay,
}: {
  wide: boolean
  login: string
  duels: Duelist | null
  error: ReactNode
  pick: ReactNode
  look: Look | null | undefined
  kit: DuelKit | null
  S: Sigma | null
  stats: Person["stats"]
  fan: ReturnType<Torcedor["normalizar"]> | null
  onReplay: OnReplay
}) {
  const fights = duels?.lutas ?? []
  const { shown, toggle } = useMore(fights.length)
  const classe = look?.duelo?.classe
  return (
    <Showcase id="duelos" wide={wide} title={text.duel.title} icon={<Swords />} footer={pick || undefined}>
      {error ? (
        error
      ) : !duels ? (
        <EmptyState>{text.duel.none}</EmptyState>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <span className="cut-sm grid h-16 w-16 shrink-0 place-items-center bg-navy">
              {classe ? (
                <ClassArt
                  kit={kit}
                  classe={classe}
                  material={look?.duelo?.material ?? (S && stats ? S.ranque(stats.sigma).id.replace(/-\d$/, "") : "bronze")}
                  fan={fan ?? { cor: "#85a7ff", detalhe: "#002fa7", roupa: "lisa" }}
                  size={56}
                />
              ) : (
                <Shuffle aria-hidden className="h-6 w-6 text-paper/70" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-muted">{text.duel.ball}</p>
              <p className="text-[17px] font-medium text-ink">{classe ? ((minigames.yours.classes as Record<string, { name: string }>)[classe]?.name ?? classe) : text.duel.random}</p>
              <p className="text-[13px] text-muted tabular-nums">
                {[one(text.duel.record.replace("{w}", number(duels.vitorias)).replace("{n}", number(duels.partidas))), duels.posicao ? text.duel.position.replace("{p}", String(duels.posicao)) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <ShowcaseList>
            {fights.slice(0, shown).map((f) => (
              <FightRow key={f.id} fight={f} login={login} onReplay={onReplay} />
            ))}
          </ShowcaseList>
          {toggle}
        </>
      )}
    </Showcase>
  )
}

function FightRow({ fight: f, login, onReplay }: { fight: Fight; login: string; onReplay: OnReplay }) {
  const side = f.logins[0] === login ? 0 : 1
  const other = 1 - side
  const won = f.vencedor === side
  return (
    <li className={cn(rowClass, "flex-nowrap")}>
      <Badge tone={won ? "win" : "loss"} className="shrink-0">
        {won ? text.duel.won : text.duel.lost}
      </Badge>
      <span className="sr-only">{text.duel.against}</span>
      <span className="min-w-0 truncate">
        {f.logins[other] === CHANNEL ? <span className="text-ink">{f.nomes[other]}</span> : <ViewerName login={f.logins[other]} className="text-ink">{f.nomes[other]}</ViewerName>}
      </span>
      <span className="shrink-0 text-[13px] text-muted tabular-nums">· {dateBR(f.em)}</span>
      <PlayButton
        label={`${text.duel.replay}: ${text.duel.replayOf.replace("{name}", f.nomes[other])}`}
        onClick={() => onReplay({ title: text.duel.replayOf.replace("{name}", f.nomes[other]), src: replayUrl(f), aspect: PLAYER_ASPECT, width: 24 })}
      />
    </li>
  )
}

/** Their marble, their record and their latest races, each with its replay when the site still has its seed. */
function RaceShowcase({
  wide,
  races,
  error,
  recent,
  fan,
  mkit,
  rankId,
  onReplay,
}: {
  wide: boolean
  races: Racer | null
  error: ReactNode
  recent: Record<string, Race>
  fan: ReturnType<Torcedor["normalizar"]> | null
  mkit: MarbleKit | null
  rankId?: string
  onReplay: OnReplay
}) {
  const latest = races?.ultimas ?? []
  const { shown, toggle } = useMore(latest.length)
  return (
    <Showcase id="corridas" wide={wide} title={text.race.title} icon={<Flag />}>
      {error ? (
        error
      ) : !races ? (
        <EmptyState>{text.race.none}</EmptyState>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-navy">
              {fan && <Marble kit={mkit} fan={fan as unknown as Record<string, unknown>} rankId={rankId} size={56} />}
            </span>
            <p className="text-[13px] text-muted tabular-nums">
              {[
                one(text.race.record.replace("{w}", number(races.vitorias)).replace("{p}", number(races.podios)).replace("{n}", number(races.corridas))),
                races.melhor ? text.race.best.replace("{b}", String(races.melhor)) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <ShowcaseList>
            {latest.slice(0, shown).map((r) => (
              <li key={r.id} className={rowClass}>
                <span className={cn("font-medium tabular-nums", r.lugar === 1 ? "text-win" : r.lugar <= 3 ? "text-klein" : "text-ink")}>{text.race.place.replace("{l}", String(r.lugar)).replace("{n}", String(r.de))}</span>
                <span className="text-[13px] text-muted tabular-nums">· {dateBR(r.em)}</span>
                {recent[r.id] && (
                  <PlayButton
                    label={`${text.duel.replay}: ${text.race.replayOf.replace("{date}", dateBR(r.em))}`}
                    onClick={() => onReplay({ title: text.race.replayOf.replace("{date}", dateBR(r.em)), src: raceUrl(recent[r.id]), aspect: RACE_ASPECT, width: 44 })}
                  />
                )}
              </li>
            ))}
          </ShowcaseList>
          {toggle}
        </>
      )}
    </Showcase>
  )
}

/** Their Pix on the mural: the goal, the day, the value and their message. */
function PixShowcase({ wide, pix, error, send }: { wide: boolean; pix: (MuralPix & { goal: string | null })[]; error: ReactNode; send: ReactNode }) {
  const { shown, toggle } = useMore(pix.length)
  return (
    <Showcase
      id="pix"
      wide={wide}
      title={text.pix.title}
      icon={<QrCode />}
      meta={pix.length ? reais(pix.reduce((sum, p) => sum + p.centavos, 0)) : undefined}
      footer={send || undefined}
    >
      {error ? (
        error
      ) : !pix.length ? (
        <EmptyState>{text.pix.none}</EmptyState>
      ) : (
        <ShowcaseList>
          {pix.slice(0, shown).map((p) => (
            <li key={p.em} className="px-4 py-3">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] text-muted">
                <span>
                  {p.goal ?? text.pix.outside} · {dateBR(p.em)}
                </span>
                <span className="text-[15px] font-medium text-klein tabular-nums">{reais(p.centavos)}</span>
              </p>
              {p.mensagem && <p className="mt-1 break-words text-[15px] text-ink">{p.mensagem}</p>}
            </li>
          ))}
        </ShowcaseList>
      )}
      {toggle}
    </Showcase>
  )
}

/** The matches they played with me, each linked to its moment in the live when it was on one. */
function MatchesShowcase({ wide, matches }: { wide: boolean; matches: ViewerData["partidas"][string] }) {
  const wins = matches.filter((m) => m.result === "win").length
  const { shown, toggle } = useMore(matches.length)
  return (
    <Showcase
      id="partidas"
      wide={wide}
      title={text.matches.title}
      icon={matches[0] ? <GameIcon game={matches[0].game} size={20} /> : <UsersRound />}
      meta={matches.length ? one(text.matches.summary.replace("{n}", number(matches.length)).replace("{w}", number(wins))) : undefined}
    >
      {matches.length ? (
        <ShowcaseList>
          {matches.slice(0, shown).map((m) => (
            <li key={`${m.game}-${m.id}`} className={rowClass}>
              <GameIcon game={m.game} size={16} />
              <Badge tone={m.result === "win" ? "win" : m.result === "loss" ? "loss" : "soft"}>
                {m.result === "win" ? text.matches.win : m.result === "loss" ? text.matches.loss : text.matches.draw}
              </Badge>
              {m.score && <span className="text-ink tabular-nums">{m.score.join("–")}</span>}
              <span className="text-[13px] text-muted">
                {m.label} · {dateBR(m.date)}
              </span>
              {m.live && <PlayButton label={`${text.matches.watch}: ${m.label} · ${dateBR(m.date)}`} href={`${livePath(m.live.date)}#t=${m.live.at}`} />}
            </li>
          ))}
        </ShowcaseList>
      ) : (
        <EmptyState>{text.matches.none}</EmptyState>
      )}
      {toggle}
    </Showcase>
  )
}

