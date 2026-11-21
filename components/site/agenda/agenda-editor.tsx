"use client"

import { Check, Copy, Eraser, Eye, LoaderCircle, Plus, RefreshCw, RotateCcw, Search, Trash2, TriangleAlert, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { Calendar, showDay } from "@/components/site/agenda/calendar"
import { gameName, useNow } from "@/components/site/lives/agenda"
import { dataEm, limpar, somaDias } from "@/infra/comum/agenda.mjs"
import { AGENDA_URL, dayMonth, longDay, weekdayOf, type Agenda, type PlannedDay, type PlannedLive } from "@/lib/agenda"
import { MissingScope, SCHEDULE_SCOPE, searchCategories, syncTwitch, type Category, type SyncReport, type TwitchUser } from "@/lib/agenda-twitch"
import { channelPath } from "@/lib/channel"
import { signIn } from "@/lib/profile"
import { localize } from "@/lib/site"

const T = localize({
  intro: {
    pt: "Clique num dia para planejar: as lives, o roteiro de cada uma e uma nota. Dia sem nada é dia sem live. Salvar muda o site na hora e o calendário da Twitch junto, e o título e a categoria de cada live também abrem a live na Twitch.",
    en: "Click a day to plan it: its streams, each one's run of the show and a note. A day with nothing has no stream. Saving changes the site at once and Twitch's calendar too, and each stream's title and category also open it on Twitch.",
  },
  connect: { pt: "Conectar o calendário da Twitch", en: "Connect Twitch's calendar" },
  connectNote: { pt: "Sem isso, salvar muda só o site.", en: "Without it, saving changes only the site." },
  localApi: { pt: "API local: salvar não mexe no calendário da Twitch.", en: "Local API: saving leaves Twitch's calendar alone." },
  note: { pt: "Nota do dia (opcional): folga, viagem, fim de semana de torneio…", en: "The day's note (optional)" },
  addLive: { pt: "Adicionar live", en: "Add a stream" },
  clear: { pt: "Limpar o dia", en: "Clear the day" },
  otherGame: { pt: "Outro jogo…", en: "Another game…" },
  repeat: { pt: "Repetir em", en: "Repeat on" },
  repeated: { pt: "Copiado para", en: "Copied to" },
  noLives: { pt: "Sem live neste dia.", en: "No stream this day." },
  title: { pt: "Título (padrão do jogo)", en: "Title (the game's default)" },
  plan: { pt: "Roteiro", en: "Run of the show" },
  planText: { pt: "O que vai rolar", en: "What's on" },
  planTime: { pt: "Horário (opcional)", en: "Time (optional)" },
  addItem: { pt: "Adicionar tópico", en: "Add a step" },
  games: { pt: "Jogos", en: "Games" },
  gamesHint: { pt: "Cada jogo é uma categoria da Twitch, com o título padrão das lives dele.", en: "Each game is a Twitch category, with its streams' default title." },
  searchGame: { pt: "Buscar categoria na Twitch", en: "Search a Twitch category" },
  defaultTitle: { pt: "Título padrão", en: "Default title" },
  inUse: { pt: "em uso", en: "in use" },
  sameTimes: { pt: "Início e fim iguais.", en: "Same start and end." },
  pastMidnight: { pt: "termina no dia seguinte", en: "ends the next day" },
  remove: { pt: "Remover", en: "Remove" },
  save: { pt: "Salvar", en: "Save" },
  discard: { pt: "Desfazer", en: "Discard" },
  preview: { pt: "Ver como visitante", en: "See it as a visitor" },
  saved: { pt: "Salvo no site.", en: "Saved on the site." },
  resync: { pt: "Sincronizar a Twitch", en: "Sync Twitch" },
  syncing: { pt: "Atualizando a Twitch…", en: "Updating Twitch…" },
  twitchDone: { pt: "Twitch atualizada", en: "Twitch updated" },
  twitchSame: { pt: "A Twitch já estava igual.", en: "Twitch already matched." },
  created: { pt: "criadas", en: "created" },
  removed: { pt: "removidas", en: "removed" },
  details: { pt: "detalhes", en: "details" },
  signInAgain: { pt: "A Twitch pediu para entrar de novo.", en: "Twitch asked to sign in again." },
})

// A local stand-in of the API (NEXT_PUBLIC_PROFILE_API on localhost) never touches the real Twitch calendar.
const LOCAL_API = /^http:\/\/(localhost|127\.)/.test(AGENDA_URL)

const field = "rounded-sm border border-line bg-paper px-2.5 py-1.5 text-[15px] text-ink"
const EMPTY: Agenda = { timeZone: "America/Sao_Paulo", dates: {}, games: {} }

/** What saving would send: the shape the API keeps. */
const cleaned = (agenda: Agenda, today: string) => limpar(agenda, today) as Agenda

const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "jogo"

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "syncing"; line: string }
  | { kind: "done"; saved: boolean; report: SyncReport | null }
  | { kind: "error"; message: string }

/**
 * The agenda's editor, for the channel's account (signed in with Twitch, which the profile API checks): the month as a
 * calendar, a day picked to plan (its lives with time, game, title and run of the show, and a note), and the games
 * (any Twitch category, picked right on a live with "Outro jogo…"). Saving puts it in the API, then on Twitch's calendar
 * (`lib/agenda-twitch.ts`) when the sign-in carries `channel:manage:schedule`; opening it brings Twitch up to date too.
 */
export function AgendaEditor({ token, me, onPreview }: { token: string; me: TwitchUser; onPreview: () => void }) {
  const { agenda, fresh, replace } = useAgenda()
  const now = useNow()
  // What's being edited, over the API's agenda; null when nothing changed.
  const [edited, setEdited] = useState<Agenda | null>(null)
  const [month, setMonth] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState("")
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const synced = useRef(false)

  const canSync = me.scopes.includes(SCHEDULE_SCOPE) && !LOCAL_API
  const draft = edited ?? (fresh ? (agenda ?? EMPTY) : null)
  const today = now ? dataEm(now) : ""
  const base = useMemo(() => (agenda && today ? JSON.stringify(cleaned(agenda, today)) : ""), [agenda, today])
  const next = useMemo(() => (draft && today ? cleaned(draft, today) : null), [draft, today])
  const dirty = Boolean(next && JSON.stringify(next) !== base)
  const problems = draft ? Object.values(draft.dates).some((d) => d.lives.some((l) => l.start === l.end)) : false
  const busy = status.kind === "saving" || status.kind === "syncing"

  async function sync(saved: Agenda, after: boolean) {
    if (!canSync) return setStatus({ kind: "done", saved: after, report: null })
    setStatus({ kind: "syncing", line: T.syncing })
    try {
      const report = await syncTwitch(saved, token, (line) => setStatus({ kind: "syncing", line }))
      setStatus(after || report.done.length ? { kind: "done", saved: after, report } : { kind: "idle" })
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof MissingScope ? T.signInAgain : String(error) })
    }
  }

  // Opening the editor moves Twitch's eight weeks on, quietly when nothing changes.
  useEffect(() => {
    if (synced.current || !canSync || !fresh || !agenda) return
    synced.current = true
    sync(agenda, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync, fresh, agenda])

  if (!draft || !now) return <LoaderCircle className="h-5 w-5 animate-spin text-muted" />

  const picked = selected ?? today
  const set = (patch: Partial<Agenda>) => setEdited({ ...draft, ...patch })
  const planOf = (date: string): PlannedDay => draft.dates[date] ?? { lives: [] }
  /** A day changed (a day with nothing left is no longer planned), with the games when one was just added. */
  const setDay = (date: string, day: PlannedDay | null, games?: Agenda["games"]) => {
    const dates = { ...draft.dates }
    if (day && (day.lives.length || day.note)) dates[date] = day
    else delete dates[date]
    set({ dates, ...(games ? { games } : {}) })
    setCopied("")
  }

  async function save() {
    if (!next) return
    setStatus({ kind: "saving" })
    const response = await fetch(AGENDA_URL, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => null)
    if (!response?.ok) {
      const body = await response?.json().catch(() => null)
      return setStatus({ kind: "error", message: response?.status === 401 || response?.status === 403 ? T.signInAgain : (body?.erro ?? `HTTP ${response?.status ?? "?"}`) })
    }
    const { agenda: saved } = await response.json()
    replace(saved)
    setEdited(null)
    await sync(saved, true)
  }

  return (
    <section>
      <p className="max-w-[40rem] text-[15px] leading-[1.6] text-muted">{T.intro}</p>
      {LOCAL_API && <p className="mt-3 text-[14px] font-medium text-klein">{T.localApi}</p>}
      {!canSync && !LOCAL_API && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-[14px]">
          <button onClick={() => signIn(null, channelPath("agenda"), SCHEDULE_SCOPE)} className="rounded-sm bg-[#9146ff] px-3 py-1.5 font-medium text-white hover:opacity-90">
            {T.connect}
          </button>
          <span className="text-muted">{T.connectNote}</span>
        </p>
      )}

      <div className="mt-8">
        <Calendar
          agenda={draft}
          today={today}
          month={month ?? today.slice(0, 7)}
          onMonth={setMonth}
          selected={picked}
          onSelect={(date) => (setSelected(date), setCopied(""), showDay())}
        />
      </div>

      <DayEditor
        agenda={draft}
        token={token}
        date={picked}
        day={planOf(picked)}
        copied={copied}
        onChange={(day, games) => setDay(picked, day, games)}
        onClear={() => setDay(picked, null)}
        onRepeat={() => {
          const target = somaDias(picked, 7)
          setDay(target, structuredClone(planOf(picked)))
          setCopied(target)
        }}
      />

      <Fold title={T.games} hint={T.gamesHint}>
        <Games agenda={draft} token={token} onChange={(games) => set({ games })} />
      </Fold>

      <div className="sticky bottom-4 z-10 mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-paper/95 p-3 backdrop-blur-sm">
        <button
          onClick={save}
          disabled={!dirty || problems || busy}
          className="inline-flex items-center gap-2 rounded-md bg-klein px-4 py-2 text-[15px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {T.save}
        </button>
        {dirty && !busy && (
          <button onClick={() => (setEdited(null), setCopied(""))} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-klein">
            <RotateCcw className="h-3.5 w-3.5" />
            {T.discard}
          </button>
        )}
        {!dirty && !busy && canSync && agenda && (
          <button onClick={() => sync(agenda, false)} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-klein">
            <RefreshCw className="h-3.5 w-3.5" />
            {T.resync}
          </button>
        )}
        <button onClick={onPreview} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-klein">
          <Eye className="h-3.5 w-3.5" />
          {T.preview}
        </button>
        <Report status={status} />
      </div>
    </section>
  )
}

/** The day picked: its note, its lives, and what can be done with it. */
function DayEditor({
  agenda,
  token,
  date,
  day,
  copied,
  onChange,
  onClear,
  onRepeat,
}: {
  agenda: Agenda
  token: string
  date: string
  day: PlannedDay
  copied: string
  onChange: (day: PlannedDay, games?: Agenda["games"]) => void
  onClear: () => void
  onRepeat: () => void
}) {
  const gameIds = Object.keys(agenda.games)
  const nextWeek = somaDias(date, 7)
  const empty = !day.lives.length && !day.note
  const setLive = (index: number, live: PlannedLive | null, games?: Agenda["games"]) =>
    onChange({ ...day, lives: live ? day.lives.map((l, i) => (i === index ? live : l)) : day.lives.filter((_, i) => i !== index) }, games)
  const last = day.lives.at(-1)

  return (
    <section id="dia" className="mt-8 scroll-mt-20 rounded-md border border-klein/40 bg-paper/80 p-4 sm:p-5">
      <h3 className="text-[19px] font-medium text-ink first-letter:uppercase">{longDay(date)}</h3>

      <input
        value={day.note ?? ""}
        maxLength={100}
        placeholder={T.note}
        aria-label={T.note}
        onChange={(e) => onChange({ ...day, note: e.target.value || undefined })}
        className={`${field} mt-3 w-full`}
      />

      <div className="mt-4 space-y-3">
        {day.lives.map((live, index) => (
          <LiveCard
            key={index}
            live={live}
            agenda={agenda}
            token={token}
            onChange={(l, games) => setLive(index, l, games)}
            onRemove={() => setLive(index, null)}
          />
        ))}
        {!day.lives.length && <p className="text-[14px] text-muted">{T.noLives}</p>}
        {!gameIds.length && <GameSearch agenda={agenda} token={token} onPick={(id, games) => onChange({ ...day, lives: [{ start: "15:00", end: "17:00", game: id }] }, games)} />}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <AddButton
          disabled={!gameIds.length}
          onClick={() => {
            const start = last && last.end < "22:00" ? last.end : "15:00"
            const end = `${String((Number(start.slice(0, 2)) + 2) % 24).padStart(2, "0")}${start.slice(2)}`
            onChange({ ...day, lives: [...day.lives, { start, end, game: last?.game ?? gameIds[0] }] })
          }}
        >
          {T.addLive}
        </AddButton>
        {!empty && (
          <button onClick={onRepeat} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-klein">
            <Copy className="h-4 w-4" />
            {T.repeat} <span className="capitalize">{weekdayOf(nextWeek)}</span> {dayMonth(nextWeek)}
          </button>
        )}
        {!empty && (
          <button onClick={onClear} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-klein">
            <Eraser className="h-4 w-4" />
            {T.clear}
          </button>
        )}
        {copied && (
          <span className="text-[13px] text-klein">
            {T.repeated} {dayMonth(copied)} ✓
          </span>
        )}
      </div>
    </section>
  )
}

const OTHER = "__outro__"

/** A live on the day: times, game (any Twitch category with "Outro jogo…"), title and its run of the show. */
function LiveCard({
  live,
  agenda,
  token,
  onChange,
  onRemove,
}: {
  live: PlannedLive
  agenda: Agenda
  token: string
  onChange: (live: PlannedLive, games?: Agenda["games"]) => void
  onRemove: () => void
}) {
  const [picking, setPicking] = useState(false)
  const game = agenda.games[live.game]
  const plan = live.plan ?? []
  const setPlan = (items: NonNullable<PlannedLive["plan"]>) => onChange({ ...live, plan: items.length ? items : undefined })
  const overnight = live.end < live.start
  return (
    <div className="space-y-3 rounded-md border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5">
          <input type="time" step={300} value={live.start} onChange={(e) => e.target.value && onChange({ ...live, start: e.target.value })} className={field} />
          –
          <input type="time" step={300} value={live.end} onChange={(e) => e.target.value && onChange({ ...live, end: e.target.value })} className={field} />
        </span>
        <select
          value={picking ? OTHER : live.game}
          onChange={(e) => (e.target.value === OTHER ? setPicking(true) : (setPicking(false), onChange({ ...live, game: e.target.value })))}
          className={field}
        >
          {Object.keys(agenda.games).map((id) => (
            <option key={id} value={id}>
              {gameName(agenda, id)}
            </option>
          ))}
          <option value={OTHER}>{T.otherGame}</option>
        </select>
        <button onClick={onRemove} aria-label={T.remove} title={T.remove} className="ml-auto rounded-sm p-2 text-muted hover:text-klein">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {picking && (
        <GameSearch
          agenda={agenda}
          token={token}
          autoFocus
          onPick={(id, games) => {
            setPicking(false)
            onChange({ ...live, game: id }, games)
          }}
          onCancel={() => setPicking(false)}
        />
      )}
      {live.start === live.end && <p className="text-[13px] text-red-600">{T.sameTimes}</p>}
      {overnight && <p className="text-[13px] text-muted">{T.pastMidnight}</p>}
      <input
        value={live.title ?? ""}
        maxLength={140}
        placeholder={game?.title ?? T.title}
        aria-label={T.title}
        onChange={(e) => onChange({ ...live, title: e.target.value || undefined })}
        className={`${field} w-full text-[16px] font-medium`}
      />
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">{T.plan}</p>
        <ol className="mt-2 space-y-1.5">
          {plan.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <input
                type="time"
                step={300}
                value={item.at ?? ""}
                aria-label={T.planTime}
                title={T.planTime}
                onChange={(e) => setPlan(plan.map((p, i) => (i === index ? { ...p, at: e.target.value || undefined } : p)))}
                className={`${field} w-[5.75rem] shrink-0 px-1.5 text-[14px] sm:w-[7.25rem]`}
              />
              <input
                value={item.text}
                maxLength={120}
                placeholder={T.planText}
                aria-label={T.planText}
                onChange={(e) => setPlan(plan.map((p, i) => (i === index ? { ...p, text: e.target.value } : p)))}
                className={`${field} min-w-0 flex-1 text-[14px]`}
              />
              <button onClick={() => setPlan(plan.filter((_, i) => i !== index))} aria-label={T.remove} className="rounded-sm p-1.5 text-muted hover:text-klein">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
        <button onClick={() => setPlan([...plan, { text: "" }])} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-klein hover:underline">
          <Plus className="h-3.5 w-3.5" />
          {T.addItem}
        </button>
      </div>
    </div>
  )
}

/**
 * Twitch's categories for a search: picking one gives its id in the agenda's games, adding it with its name as the
 * default title when it's new (`onPick(id, games)`, the games only when they changed).
 */
function GameSearch({
  agenda,
  token,
  autoFocus,
  onPick,
  onCancel,
}: {
  agenda: Agenda
  token: string
  autoFocus?: boolean
  onPick: (id: string, games?: Agenda["games"]) => void
  onCancel?: () => void
}) {
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<Category[] | null>(null)
  const [searching, setSearching] = useState(false)

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setFound(await searchCategories(token, query.trim()).catch(() => []))
    setSearching(false)
  }

  function pick(category: Category) {
    const known = Object.entries(agenda.games).find(([, g]) => g.category === category.id)
    if (known) return onPick(known[0])
    const base = slug(category.name).slice(0, 29)
    let id = base
    for (let n = 2; agenda.games[id]; n++) id = `${base}-${n}`
    onPick(id, { ...agenda.games, [id]: { name: category.name, category: category.id, title: category.name } })
  }

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
        className="flex items-center gap-2"
      >
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={T.searchGame}
          aria-label={T.searchGame}
          className={`${field} min-w-0 flex-1`}
        />
        <button type="submit" aria-label={T.searchGame} className="rounded-sm border border-line p-2 text-muted hover:border-klein hover:text-klein">
          {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} aria-label={T.remove} className="rounded-sm p-2 text-muted hover:text-klein">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      {found && (
        <div className="flex flex-wrap gap-2">
          {found.map((category) => (
            <button key={category.id} onClick={() => pick(category)} className="flex items-center gap-2 rounded-sm border border-line p-1.5 pr-3 text-[14px] text-ink hover:border-klein">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.box} alt="" width={26} height={36} className="rounded-[2px]" />
              {category.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Fold({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <details className="mt-6 rounded-md border border-line bg-paper/60 p-4 open:bg-paper/80">
      <summary className="cursor-pointer">
        <span className="text-[17px] font-medium text-ink">{title}</span>
        <span className="ml-2 text-[13px] text-muted">{hint}</span>
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  )
}

function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-klein hover:underline disabled:opacity-40">
      <Plus className="h-4 w-4" />
      {children}
    </button>
  )
}

/** The games: each one's default title; add one from Twitch's categories, remove one nothing uses. */
function Games({ agenda, token, onChange }: { agenda: Agenda; token: string; onChange: (games: Agenda["games"]) => void }) {
  const used = new Set(Object.values(agenda.dates).flatMap((d) => d.lives.map((l) => l.game)))
  return (
    <>
      {Object.entries(agenda.games).map(([id, game]) => (
        <div key={id} className="flex flex-wrap items-center gap-2">
          <span className="w-full text-[15px] font-medium text-ink sm:w-36 sm:shrink-0">{gameName(agenda, id)}</span>
          <input
            value={game.title}
            maxLength={140}
            aria-label={`${T.defaultTitle}: ${game.name}`}
            placeholder={T.defaultTitle}
            onChange={(e) => onChange({ ...agenda.games, [id]: { ...game, title: e.target.value } })}
            className={`${field} min-w-0 flex-1`}
          />
          {used.has(id) ? (
            <span className="whitespace-nowrap px-1 text-[12px] text-muted">{T.inUse}</span>
          ) : (
            <button
              onClick={() => onChange(Object.fromEntries(Object.entries(agenda.games).filter(([other]) => other !== id)))}
              aria-label={T.remove}
              title={T.remove}
              className="rounded-sm p-2 text-muted hover:text-klein"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <GameSearch agenda={agenda} token={token} onPick={(_, games) => games && onChange(games)} />
    </>
  )
}

function Report({ status }: { status: Status }) {
  if (status.kind === "idle" || status.kind === "saving") return null
  if (status.kind === "error") {
    return (
      <p className="flex w-full items-start gap-1.5 text-[13px] text-red-600">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {status.message}
      </p>
    )
  }
  if (status.kind === "syncing") return <p className="w-full truncate text-[13px] text-muted">{status.line}</p>
  const { report, saved } = status
  const created = report?.done.filter((line) => line.startsWith("criou")) ?? []
  const removed = report?.done.filter((line) => line.startsWith("removeu")) ?? []
  return (
    <div className="w-full text-[13px]">
      <p className="text-ink">
        {saved && `${T.saved} `}
        {report && (report.done.length ? `${T.twitchDone}: ${created.length} ${T.created}, ${removed.length} ${T.removed}.` : T.twitchSame)}
      </p>
      {report && report.done.length > 0 && (
        <details className="mt-1 text-muted">
          <summary className="cursor-pointer">{T.details}</summary>
          <ul className="mt-1 max-h-40 list-inside list-disc overflow-auto">
            {report.done.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
