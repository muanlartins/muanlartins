"use client"

import { Check, ChevronDown, Copy, Eraser, Eye, LoaderCircle, Plus, RefreshCw, RotateCcw, Search, Trash2, TriangleAlert, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { TwitchIcon } from "@/components/site/brand-icons"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { Calendar, CALENDAR_WEEKS, showDay } from "@/components/site/agenda/calendar"
import { AgendaGameIcon } from "@/components/site/agenda/week"
import { gameName, useNow } from "@/components/site/lives/agenda"
import { Button, cardClass, Field, Input, Select, Skeleton } from "@/components/site/ui"
import { dataEm, diaDaSemana, limpar, somaDias } from "@/infra/comum/agenda.mjs"
import { AGENDA_URL, dayMonth, longDay, weekdayOf, type Agenda, type PlannedDay, type PlannedLive } from "@/lib/agenda"
import { MissingScope, SCHEDULE_SCOPE, searchCategories, syncTwitch, type Category, type SyncReport, type TwitchUser } from "@/lib/agenda-twitch"
import { channelPath } from "@/lib/channel"
import { signIn } from "@/lib/profile"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize({
  intro: {
    pt: "Escolhe um dia pra planejar: as lives, o plano de cada uma e uma nota. Dia sem nada é dia sem live.",
    en: "Pick a day to plan it: its streams, each one's plan and a note. A day with nothing has no stream.",
  },
  how: { pt: "Como funciona", en: "How it works" },
  howSave: {
    pt: "Salvar muda o site na hora e o calendário da Twitch junto (as próximas 8 semanas, uma live por vez). O que mudar direto na Twitch some no próximo salvar.",
    en: "Saving changes the site at once and Twitch's calendar too (the next 8 weeks, one stream each). Changes made on Twitch are undone by the next save.",
  },
  howTitle: {
    pt: "O título de cada live vai pro calendário da Twitch, pros eventos do Discord, pra esta agenda e pro !agenda do chat. E 1h30 antes da live o dock Anúncios põe ele, com a categoria, como título da live na Twitch, uma vez só: se você trocar na Twitch depois, fica o seu.",
    en: "Each stream's title goes to Twitch's calendar, the Discord events, this schedule and the chat's !agenda. And 90 minutes before the stream the Anúncios dock sets it, with the category, as the stream's Twitch title, once: change it on Twitch afterwards and yours stays.",
  },
  howDefault: {
    pt: "Live sem título usa o título padrão do jogo, em Jogos, no fim da página.",
    en: "A stream with no title uses its game's default title, in Games at the end of the page.",
  },
  connect: { pt: "Entrar com a Twitch", en: "Sign in with Twitch" },
  connectNote: { pt: "Pra salvar no calendário da Twitch também. Sem isso, salvar muda só o site.", en: "To save to Twitch's calendar too. Without it, saving changes only the site." },
  localApi: { pt: "API local: salvar não mexe no calendário da Twitch.", en: "Local API: saving leaves Twitch's calendar alone." },
  note: { pt: "Nota do dia", en: "The day's note" },
  notePlaceholder: { pt: "Folga, viagem, fim de semana de torneio…", en: "Day off, a trip, a tournament weekend…" },
  noteHint: { pt: "Opcional. Sozinha, diz por que não tem live.", en: "Optional. On its own, it says why there's no stream." },
  addLive: { pt: "Adicionar live", en: "Add a stream" },
  clear: { pt: "Limpar o dia", en: "Clear the day" },
  otherGame: { pt: "Outro jogo…", en: "Another game…" },
  repeat: { pt: "Repetir em", en: "Repeat on" },
  repeated: { pt: "Copiado pra", en: "Copied to" },
  noLives: { pt: "Sem live neste dia.", en: "No stream this day." },
  start: { pt: "Começa", en: "Starts" },
  end: { pt: "Termina", en: "Ends" },
  game: { pt: "Jogo", en: "Game" },
  title: { pt: "Título da live", en: "The stream's title" },
  titleHint: { pt: "Vira o título da live na Twitch 1h30 antes. Em branco, vale o do jogo.", en: "Becomes the stream's Twitch title 90 minutes before. Blank, the game's applies." },
  plan: { pt: "Plano da live", en: "The stream's plan" },
  planText: { pt: "O que vai rolar", en: "What's on" },
  planTime: { pt: "Horário (opcional)", en: "Time (optional)" },
  addItem: { pt: "Adicionar passo", en: "Add a step" },
  games: { pt: "Jogos", en: "Games" },
  gamesHint: {
    pt: "Cada jogo é uma categoria da Twitch. O título padrão vale pras lives dele que ficarem sem título.",
    en: "Each game is a Twitch category. The default title applies to its streams left without one.",
  },
  searchGame: { pt: "Buscar categoria na Twitch", en: "Search a Twitch category" },
  defaultTitle: { pt: "Título padrão", en: "Default title" },
  inUse: { pt: "em uso", en: "in use" },
  sameTimes: { pt: "Começo e fim iguais. Muda um dos dois.", en: "Same start and end. Change one of them." },
  pastMidnight: { pt: "Termina no dia seguinte.", en: "Ends the next day." },
  remove: { pt: "Tirar", en: "Remove" },
  cancel: { pt: "Cancelar", en: "Cancel" },
  save: { pt: "Salvar", en: "Save" },
  discard: { pt: "Desfazer", en: "Discard" },
  preview: { pt: "Ver como visitante", en: "See it as a visitor" },
  saved: { pt: "Salvo. O site já mostra.", en: "Saved. The site shows it already." },
  resync: { pt: "Sincronizar a Twitch", en: "Sync Twitch" },
  syncing: { pt: "Atualizando a Twitch…", en: "Updating Twitch…" },
  twitchDone: { pt: "Twitch atualizada", en: "Twitch updated" },
  twitchSame: { pt: "A Twitch já estava igual.", en: "Twitch already matched." },
  created: { pt: "criadas", en: "created" },
  removed: { pt: "tiradas", en: "removed" },
  details: { pt: "Detalhes", en: "Details" },
  signInAgain: { pt: "A Twitch pediu pra você entrar de novo.", en: "Twitch asked you to sign in again." },
  notSaved: { pt: "Não deu pra salvar ({why}). Tenta de novo.", en: "Couldn't save ({why}). Try again." },
  twitchFailed: {
    pt: "Não deu pra atualizar o calendário da Twitch ({why}). O site já está certo: tenta “Sincronizar a Twitch”.",
    en: "Couldn't update Twitch's calendar ({why}). The site is right already: try “Sync Twitch”.",
  },
})

// A local stand-in of the API (NEXT_PUBLIC_PROFILE_API on localhost) never touches the real Twitch calendar.
const LOCAL_API = /^http:\/\/(localhost|127\.)/.test(AGENDA_URL)

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
  const [page, setPage] = useState(0)
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
      setStatus({ kind: "error", message: error instanceof MissingScope ? T.signInAgain : T.twitchFailed.replace("{why}", String(error)) })
    }
  }

  // Opening the editor moves Twitch's eight weeks on, quietly when nothing changes.
  useEffect(() => {
    if (synced.current || !canSync || !fresh || !agenda) return
    synced.current = true
    sync(agenda, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSync, fresh, agenda])

  if (!draft || !now) return <EditorSkeleton />

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
      return setStatus({
        kind: "error",
        message: response?.status === 401 || response?.status === 403 ? T.signInAgain : T.notSaved.replace("{why}", body?.erro ?? `HTTP ${response?.status ?? "?"}`),
      })
    }
    const { agenda: saved } = await response.json()
    replace(saved)
    setEdited(null)
    await sync(saved, true)
  }

  return (
    <section>
      <p className="max-w-[38rem] text-[15px] leading-[1.6] text-ink">{T.intro}</p>
      <details className="group mt-3 max-w-[38rem]">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-klein [&::-webkit-details-marker]:hidden">
          {T.how}
          <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-[1.6] text-ink marker:text-klein">
          <li>{T.howSave}</li>
          <li>{T.howTitle}</li>
          <li>{T.howDefault}</li>
        </ul>
      </details>
      {LOCAL_API && <p className="mt-4 text-[15px] font-medium text-klein">{T.localApi}</p>}
      {!canSync && !LOCAL_API && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button size="sm" onClick={() => signIn(null, channelPath("agenda"), SCHEDULE_SCOPE)} icon={<TwitchIcon className="h-4 w-4" />}>
            {T.connect}
          </Button>
          <span className="text-[13px] text-muted">{T.connectNote}</span>
        </div>
      )}

      <div className="mt-12">
        <Calendar
          agenda={draft}
          today={today}
          page={page}
          onPage={setPage}
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
        onShow={(date) => {
          setSelected(date)
          setPage(Math.floor((Date.parse(date) - Date.parse(somaDias(today, 1 - diaDaSemana(today)))) / 86_400_000 / 7 / CALENDAR_WEEKS))
        }}
      />

      <Fold title={T.games} hint={T.gamesHint}>
        <Games agenda={draft} token={token} onChange={(games) => set({ games })} />
      </Fold>

      <div className="sticky bottom-4 z-10 mt-10 drop-shadow-[0_8px_24px_rgb(0_20_71_/_0.16)]">
        <div className={cn(cardClass, "flex flex-wrap items-center gap-x-5 gap-y-2 bg-paper/95 p-3 backdrop-blur-sm")}>
          <Button onClick={save} disabled={!dirty || problems || busy} icon={busy ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" />}>
            {T.save}
          </Button>
          {dirty && !busy && (
            <Button variant="quiet" size="sm" onClick={() => (setEdited(null), setCopied(""))} icon={<RotateCcw aria-hidden className="h-4 w-4" />}>
              {T.discard}
            </Button>
          )}
          {!dirty && !busy && canSync && agenda && (
            <Button variant="quiet" size="sm" onClick={() => sync(agenda, false)} icon={<RefreshCw aria-hidden className="h-4 w-4" />}>
              {T.resync}
            </Button>
          )}
          <Button variant="quiet" size="sm" onClick={onPreview} icon={<Eye aria-hidden className="h-4 w-4" />}>
            {T.preview}
          </Button>
          <Report status={status} />
        </div>
      </div>
    </section>
  )
}

/** The editor while the agenda loads: the calendar's shape and the day's. */
function EditorSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="h-5 w-full max-w-[38rem]" />
      <Skeleton className="mt-12 h-7 w-56" />
      <div className="mt-7 grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="h-16 sm:h-24" />
        ))}
      </div>
      <Skeleton className="cut mt-8 h-48" />
    </div>
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
  onShow,
}: {
  agenda: Agenda
  token: string
  date: string
  day: PlannedDay
  copied: string
  onChange: (day: PlannedDay, games?: Agenda["games"]) => void
  onClear: () => void
  onRepeat: () => void
  /** Picks a day (and the calendar's page with it). */
  onShow: (date: string) => void
}) {
  const gameIds = Object.keys(agenda.games)
  const nextWeek = somaDias(date, 7)
  const empty = !day.lives.length && !day.note
  const setLive = (index: number, live: PlannedLive | null, games?: Agenda["games"]) =>
    onChange({ ...day, lives: live ? day.lives.map((l, i) => (i === index ? live : l)) : day.lives.filter((_, i) => i !== index) }, games)
  const last = day.lives.at(-1)

  return (
    <section id="dia" aria-labelledby="dia-titulo" className={cn(cardClass, "mt-8 scroll-mt-20 border-klein p-4 sm:p-6")}>
      <h3 id="dia-titulo" className="text-xl font-medium tracking-[-0.02em] text-ink first-letter:uppercase">
        {longDay(date)}
      </h3>

      <Field label={T.note} hint={T.noteHint} className="mt-4">
        <Input value={day.note ?? ""} maxLength={100} placeholder={T.notePlaceholder} onChange={(e) => onChange({ ...day, note: e.target.value || undefined })} />
      </Field>

      <div className="mt-6 space-y-4">
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
        {!day.lives.length && <p className="text-[15px] text-muted">{T.noLives}</p>}
        {!gameIds.length && <GameSearch agenda={agenda} token={token} onPick={(id, games) => onChange({ ...day, lives: [{ start: "15:00", end: "17:00", game: id }] }, games)} />}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={!gameIds.length}
          icon={<Plus aria-hidden className="h-4 w-4" />}
          onClick={() => {
            const start = last && last.end < "22:00" ? last.end : "15:00"
            const end = `${String((Number(start.slice(0, 2)) + 2) % 24).padStart(2, "0")}${start.slice(2)}`
            onChange({ ...day, lives: [...day.lives, { start, end, game: last?.game ?? gameIds[0] }] })
          }}
        >
          {T.addLive}
        </Button>
        {!empty && (
          <Button variant="quiet" size="sm" onClick={onRepeat} icon={<Copy aria-hidden className="h-4 w-4" />}>
            {T.repeat} {weekdayOf(nextWeek)}., {dayMonth(nextWeek)}
          </Button>
        )}
        {!empty && (
          <Button variant="quiet" size="sm" onClick={onClear} icon={<Eraser aria-hidden className="h-4 w-4" />}>
            {T.clear}
          </Button>
        )}
        {copied && (
          <button type="button" onClick={() => onShow(copied)} className="inline-flex items-center gap-1.5 text-[13px] text-win underline-offset-4 hover:underline">
            <Check aria-hidden className="h-3.5 w-3.5" />
            {T.repeated} {dayMonth(copied)}
          </button>
        )}
      </div>
    </section>
  )
}

const OTHER = "__outro__"

/** A small square icon button (remove, cancel, search) with its name for screen readers. */
function IconButton({ label, onClick, type = "button", children }: { label: string; onClick?: () => void; type?: "button" | "submit"; children: ReactNode }) {
  return (
    <button type={type} onClick={onClick} aria-label={label} title={label} className="cut-sm grid h-9 w-9 shrink-0 place-items-center text-muted transition-colors hover:bg-klein/10 hover:text-klein">
      {children}
    </button>
  )
}

/** A live on the day: times, game (any Twitch category with "Outro jogo…"), title and its plan. */
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
    <div className="border-l-4 border-klein bg-paper/80 p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={T.start} className="w-[8rem]">
          <Input type="time" step={300} value={live.start} onChange={(e) => e.target.value && onChange({ ...live, start: e.target.value })} className="tabular-nums" />
        </Field>
        <Field label={T.end} className="w-[8rem]">
          <Input type="time" step={300} value={live.end} onChange={(e) => e.target.value && onChange({ ...live, end: e.target.value })} className="tabular-nums" />
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <AgendaGameIcon game={live.game} size={14} />
              {T.game}
            </span>
          }
          className="min-w-[11rem] flex-1"
        >
          <Select value={picking ? OTHER : live.game} onChange={(e) => (e.target.value === OTHER ? setPicking(true) : (setPicking(false), onChange({ ...live, game: e.target.value })))}>
            {Object.keys(agenda.games).map((id) => (
              <option key={id} value={id}>
                {gameName(agenda, id)}
              </option>
            ))}
            <option value={OTHER}>{T.otherGame}</option>
          </Select>
        </Field>
        <IconButton label={T.remove} onClick={onRemove}>
          <Trash2 aria-hidden className="h-4 w-4" />
        </IconButton>
      </div>
      {live.start === live.end && <p className="mt-2 text-[13px] text-loss">{T.sameTimes}</p>}
      {overnight && <p className="mt-2 text-[13px] text-muted">{T.pastMidnight}</p>}
      {picking && (
        <div className="mt-3">
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
        </div>
      )}
      <Field label={T.title} hint={T.titleHint} className="mt-4">
        <Input value={live.title ?? ""} maxLength={140} placeholder={game?.title ?? ""} onChange={(e) => onChange({ ...live, title: e.target.value || undefined })} className="font-medium" />
      </Field>
      <div className="mt-4">
        <p className="text-[13px] font-medium text-muted">{T.plan}</p>
        {plan.length > 0 && (
          <ol className="mt-1.5 space-y-2">
            {plan.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <Input
                  type="time"
                  step={300}
                  value={item.at ?? ""}
                  aria-label={T.planTime}
                  title={T.planTime}
                  onChange={(e) => setPlan(plan.map((p, i) => (i === index ? { ...p, at: e.target.value || undefined } : p)))}
                  boxClassName="w-[6.5rem] shrink-0 sm:w-[7.5rem]"
                  className="px-2 tabular-nums"
                />
                <Input
                  value={item.text}
                  maxLength={120}
                  placeholder={T.planText}
                  aria-label={T.planText}
                  onChange={(e) => setPlan(plan.map((p, i) => (i === index ? { ...p, text: e.target.value } : p)))}
                  boxClassName="min-w-0 flex-1"
                />
                <IconButton label={T.remove} onClick={() => setPlan(plan.filter((_, i) => i !== index))}>
                  <X aria-hidden className="h-4 w-4" />
                </IconButton>
              </li>
            ))}
          </ol>
        )}
        <Button variant="quiet" size="sm" onClick={() => setPlan([...plan, { text: "" }])} icon={<Plus aria-hidden className="h-4 w-4" />} className="mt-2">
          {T.addItem}
        </Button>
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
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
        className="flex items-center gap-2"
      >
        <Input value={query} autoFocus={autoFocus} onChange={(e) => setQuery(e.target.value)} placeholder={T.searchGame} aria-label={T.searchGame} boxClassName="min-w-0 flex-1" />
        <Button type="submit" variant="secondary" aria-label={T.searchGame} title={T.searchGame} className="px-2.5">
          {searching ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : <Search aria-hidden className="h-4 w-4" />}
        </Button>
        {onCancel && (
          <IconButton label={T.cancel} onClick={onCancel}>
            <X aria-hidden className="h-4 w-4" />
          </IconButton>
        )}
      </form>
      {found && (
        <div className="flex flex-wrap gap-2">
          {found.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => pick(category)}
              className="cut-sm cut-edge relative flex items-center gap-2 border border-line-strong bg-paper/60 p-1.5 pr-3 text-[15px] text-ink transition-colors hover:border-klein hover:text-klein"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.box} alt="" width={26} height={36} />
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
    <details className={cn(cardClass, "group mt-8 p-5 open:bg-paper/85")}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-xl font-medium tracking-[-0.02em] text-ink">{title}</span>
          <span className="mt-1 block text-[13px] text-muted">{hint}</span>
        </span>
        <ChevronDown aria-hidden className="mt-1 h-5 w-5 shrink-0 text-klein transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-5 space-y-3">{children}</div>
    </details>
  )
}

/** The games: each one's default title; add one from Twitch's categories, remove one nothing uses. */
function Games({ agenda, token, onChange }: { agenda: Agenda; token: string; onChange: (games: Agenda["games"]) => void }) {
  const used = new Set(Object.values(agenda.dates).flatMap((d) => d.lives.map((l) => l.game)))
  return (
    <>
      {Object.entries(agenda.games).map(([id, game]) => (
        <div key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex w-full items-center gap-2 text-[15px] font-medium text-ink sm:w-40 sm:shrink-0">
            <AgendaGameIcon game={id} size={16} />
            {gameName(agenda, id)}
          </span>
          <Input
            value={game.title}
            maxLength={140}
            aria-label={`${T.defaultTitle}: ${game.name}`}
            placeholder={T.defaultTitle}
            onChange={(e) => onChange({ ...agenda.games, [id]: { ...game, title: e.target.value } })}
            boxClassName="min-w-0 flex-1"
          />
          {used.has(id) ? (
            <span className="min-w-9 text-center text-[12px] whitespace-nowrap text-muted">{T.inUse}</span>
          ) : (
            <IconButton label={T.remove} onClick={() => onChange(Object.fromEntries(Object.entries(agenda.games).filter(([other]) => other !== id)))}>
              <Trash2 aria-hidden className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      ))}
      <div className="pt-2">
        <GameSearch agenda={agenda} token={token} onPick={(_, games) => games && onChange(games)} />
      </div>
    </>
  )
}

function Report({ status }: { status: Status }) {
  if (status.kind === "idle" || status.kind === "saving") return null
  if (status.kind === "error") {
    return (
      <p role="alert" className="flex w-full items-start gap-1.5 text-[13px] text-loss">
        <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {status.message}
      </p>
    )
  }
  if (status.kind === "syncing") return <p className="w-full truncate text-[13px] text-muted">{status.line}</p>
  const { report, saved } = status
  const created = report?.done.filter((line) => line.startsWith("criou")) ?? []
  const removed = report?.done.filter((line) => line.startsWith("removeu")) ?? []
  return (
    <div role="status" className="w-full text-[13px]">
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
