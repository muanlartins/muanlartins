"use client"

import { CalendarOff, Check, LoaderCircle, Plus, RefreshCw, Search, Trash2, TriangleAlert } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useAgenda } from "@/components/site/agenda/agenda-context"
import { gameName, useNow } from "@/components/site/lives/agenda"
import { dataEm, diaDaSemana, limpar } from "@/infra/comum/agenda.mjs"
import { AGENDA_URL, clock, dayMonth, occurrences, weekdayOf, WEEKDAYS, type Agenda, type Extra, type Slot } from "@/lib/agenda"
import { MissingScope, SCHEDULE_SCOPE, searchCategories, syncTwitch, whoIs, type Category, type TwitchUser } from "@/lib/agenda-twitch"
import { channelPath } from "@/lib/channel"
import { keptToken, signIn } from "@/lib/profile"
import { localize } from "@/lib/site"
import { CHANNEL } from "@/lib/twitch"

const T = localize({
  edit: { pt: "Editar a agenda (conta do canal)", en: "Edit the schedule (the channel's account)" },
  title: { pt: "Editar a agenda", en: "Edit the schedule" },
  intro: {
    pt: "O que você salvar aqui aparece no site na hora e vai para o calendário da Twitch junto. O título e a categoria de cada live também abrem a live na Twitch.",
    en: "What you save here shows on the site at once and goes to Twitch's calendar too. Each stream's title and category also open it on Twitch.",
  },
  notChannel: { pt: "Só a conta do canal edita a agenda.", en: "Only the channel's account edits the schedule." },
  connect: { pt: "Conectar o calendário da Twitch", en: "Connect Twitch's calendar" },
  connectNote: {
    pt: "Sem isso, salvar muda só o site.",
    en: "Without it, saving changes only the site.",
  },
  weekly: { pt: "Toda semana", en: "Every week" },
  weeklyHint: { pt: "Um horário para cada jogo; fim de semana também.", en: "A slot per game; weekends too." },
  addSlot: { pt: "Adicionar horário", en: "Add a slot" },
  extras: { pt: "Lives avulsas", en: "One-off streams" },
  extrasHint: { pt: "Uma live num dia só, fora da semana (um sábado, um especial).", en: "A stream on one day only, outside the week." },
  addExtra: { pt: "Adicionar live avulsa", en: "Add a one-off stream" },
  off: { pt: "Folgas", en: "Days off" },
  offHint: { pt: "Marque a live que não vai ter. Próximas três semanas.", en: "Mark a stream that won't happen. Next three weeks." },
  noWeekly: { pt: "Nenhuma live semanal nessas semanas.", en: "No weekly stream in these weeks." },
  games: { pt: "Jogos", en: "Games" },
  gamesHint: {
    pt: "A categoria da Twitch de cada jogo e o título padrão das lives dele.",
    en: "Each game's Twitch category and its streams' default title.",
  },
  searchGame: { pt: "Buscar categoria na Twitch", en: "Search a Twitch category" },
  titlePlaceholder: { pt: "Título (padrão do jogo)", en: "Title (the game's default)" },
  defaultTitle: { pt: "Título padrão", en: "Default title" },
  noDays: { pt: "Escolha pelo menos um dia.", en: "Pick at least one day." },
  sameTimes: { pt: "Início e fim iguais.", en: "Same start and end." },
  inUse: { pt: "em uso", en: "in use" },
  remove: { pt: "Remover", en: "Remove" },
  save: { pt: "Salvar", en: "Save" },
  discard: { pt: "Desfazer", en: "Discard" },
  saved: { pt: "Salvo no site.", en: "Saved on the site." },
  resync: { pt: "Sincronizar a Twitch de novo", en: "Sync Twitch again" },
  twitchDone: { pt: "Twitch atualizada", en: "Twitch updated" },
  twitchSame: { pt: "A Twitch já estava igual.", en: "Twitch already matched." },
  waiting: {
    pt: "A Twitch só cancela a próxima live de cada horário. Estas folgas entram lá quando chegar a vez (é só sincronizar de novo naquela semana):",
    en: "Twitch cancels only each slot's next stream. These days off go there when their turn comes (sync again that week):",
  },
  signInAgain: { pt: "A Twitch pediu para entrar de novo.", en: "Twitch asked to sign in again." },
  pastMidnight: { pt: "termina no dia seguinte", en: "ends the next day" },
})

const field = "rounded-sm border border-line bg-paper px-2.5 py-1.5 text-[15px] text-ink"
const EMPTY: Agenda = { timeZone: "America/Sao_Paulo", slots: [], extras: [], off: [], games: {} }

/** What saving would send: the shape the API keeps, without days off that no slot has anymore. */
function cleaned(agenda: Agenda, today: string): Agenda {
  const clean = limpar(agenda, today) as Agenda
  clean.off = clean.off.filter((o) => clean.slots.some((s) => s.start === o.start && s.days.includes(diaDaSemana(o.date))))
  return clean
}

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
  | { kind: "syncing"; lines: string[] }
  | { kind: "done"; lines: string[]; waiting: string[]; twitch: boolean }
  | { kind: "error"; message: string }

/**
 * The agenda's editor, for the channel's account only (signed in with Twitch, which the profile API checks): weekly
 * slots (days, times, game, title), one-off streams, days off and the games. Saving puts it in the API, then on
 * Twitch's calendar (`lib/agenda-twitch.ts`) when the sign-in carries `channel:manage:schedule`.
 */
export function AgendaEditor() {
  const { agenda, fresh, replace } = useAgenda()
  const now = useNow()
  // Null while prerendering; nothing is drawn until Twitch says who it is anyway.
  const [token] = useState(keptToken)
  const [me, setMe] = useState<TwitchUser | null | undefined>(undefined)
  // What's being edited, over the API's agenda; null when nothing changed.
  const [edited, setEdited] = useState<Agenda | null>(null)
  const [status, setStatus] = useState<Status>({ kind: "idle" })

  useEffect(() => {
    let live = true
    ;(token ? whoIs(token) : Promise.resolve(null)).then((found) => live && setMe(found))
    return () => {
      live = false
    }
  }, [token])

  const channel = me?.login === CHANNEL
  const draft = edited ?? (fresh ? (agenda ?? EMPTY) : null)

  const today = now ? dataEm(now) : ""
  const base = useMemo(() => (agenda && today ? JSON.stringify(cleaned(agenda, today)) : ""), [agenda, today])
  const next = useMemo(() => (draft && today ? cleaned(draft, today) : null), [draft, today])
  const dirty = Boolean(next && JSON.stringify(next) !== base)
  const problems = draft ? [...draft.slots, ...draft.extras].some((s) => s.start === s.end || ("days" in s && !s.days.length)) : false
  const busy = status.kind === "saving" || status.kind === "syncing"

  if (me === undefined) return null
  if (!channel) {
    return (
      <div className="mt-16 border-t border-line pt-4 text-[13px] text-muted">
        {me ? (
          T.notChannel
        ) : (
          <button onClick={() => signIn(null, channelPath("agenda"), SCHEDULE_SCOPE)} className="underline underline-offset-2 hover:text-klein">
            {T.edit}
          </button>
        )}
      </div>
    )
  }

  const canSync = me!.scopes.includes(SCHEDULE_SCOPE)
  const set = (patch: Partial<Agenda>) => draft && setEdited({ ...draft, ...patch })
  const gameIds = draft ? Object.keys(draft.games) : []

  async function sync(saved: Agenda) {
    if (!canSync || !token) return setStatus({ kind: "done", lines: [], waiting: [], twitch: false })
    const lines: string[] = []
    setStatus({ kind: "syncing", lines })
    try {
      const report = await syncTwitch(saved, token, (line) => setStatus({ kind: "syncing", lines: [...lines, line] }))
      setStatus({ kind: "done", lines: report.done, waiting: report.waiting, twitch: true })
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof MissingScope ? T.signInAgain : String(error) })
    }
  }

  async function save() {
    if (!next || !token) return
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
    await sync(saved)
  }

  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{T.title}</h2>
      <p className="mt-2 max-w-[38rem] text-[15px] leading-[1.6] text-muted">{T.intro}</p>
      {!canSync && (
        <p className="mt-4 flex flex-wrap items-center gap-3 text-[14px]">
          <button onClick={() => signIn(null, channelPath("agenda"), SCHEDULE_SCOPE)} className="rounded-sm bg-[#9146ff] px-3 py-1.5 font-medium text-white hover:opacity-90">
            {T.connect}
          </button>
          <span className="text-muted">{T.connectNote}</span>
        </p>
      )}

      {!draft || !now ? (
        <LoaderCircle className="mt-8 h-5 w-5 animate-spin text-muted" />
      ) : (
        <>
          <Group title={T.weekly} hint={T.weeklyHint}>
            {draft.slots.map((slot, index) => (
              <SlotRow
                key={index}
                slot={slot}
                agenda={draft}
                onChange={(patch) => set({ slots: draft.slots.map((s, i) => (i === index ? { ...s, ...patch } : s)) })}
                onRemove={() => set({ slots: draft.slots.filter((_, i) => i !== index) })}
              />
            ))}
            <AddButton disabled={!gameIds.length} onClick={() => set({ slots: [...draft.slots, { days: [6], start: "15:00", end: "17:00", game: gameIds[0] }] })}>
              {T.addSlot}
            </AddButton>
          </Group>

          <Group title={T.extras} hint={T.extrasHint}>
            {draft.extras.map((extra, index) => (
              <SlotRow
                key={index}
                slot={extra}
                agenda={draft}
                today={today}
                onChange={(patch) => set({ extras: draft.extras.map((e, i) => (i === index ? { ...e, ...patch } : e)) })}
                onRemove={() => set({ extras: draft.extras.filter((_, i) => i !== index) })}
              />
            ))}
            <AddButton
              disabled={!gameIds.length}
              onClick={() => set({ extras: [...draft.extras, { date: nextSaturday(today), start: "15:00", end: "17:00", game: gameIds[0] }] })}
            >
              {T.addExtra}
            </AddButton>
          </Group>

          <Group title={T.off} hint={T.offHint}>
            <DaysOff agenda={draft} now={now} onChange={(off) => set({ off })} />
          </Group>

          <Group title={T.games} hint={T.gamesHint}>
            <Games agenda={draft} token={token!} onChange={(games) => set({ games })} />
          </Group>

          <div className="sticky bottom-4 mt-10 flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper/95 p-3 backdrop-blur-sm">
            <button
              onClick={save}
              disabled={!dirty || problems || busy}
              className="inline-flex items-center gap-2 rounded-md bg-klein px-4 py-2 text-[15px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {T.save}
            </button>
            {dirty && !busy && (
              <button onClick={() => setEdited(null)} className="text-[14px] text-muted underline underline-offset-2 hover:text-klein">
                {T.discard}
              </button>
            )}
            {!dirty && !busy && canSync && agenda && (
              <button onClick={() => sync(agenda)} className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-klein">
                <RefreshCw className="h-3.5 w-3.5" />
                {T.resync}
              </button>
            )}
            <Report status={status} />
          </div>
        </>
      )}
    </section>
  )
}

function nextSaturday(today: string) {
  const day = new Date(`${today}T12:00:00Z`)
  do day.setUTCDate(day.getUTCDate() + 1)
  while (day.getUTCDay() !== 6)
  return day.toISOString().slice(0, 10)
}

function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="mt-10">
      <h3 className="text-[17px] font-medium text-ink">{title}</h3>
      <p className="mt-0.5 text-[13px] text-muted">{hint}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
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

/** A weekly slot (with its days) or a one-off stream (with its date): times, game and title. */
function SlotRow({
  slot,
  agenda,
  today,
  onChange,
  onRemove,
}: {
  slot: Slot | Extra
  agenda: Agenda
  today?: string
  onChange: (patch: Partial<Slot> & Partial<Extra>) => void
  onRemove: () => void
}) {
  const weekly = "days" in slot
  const game = agenda.games[slot.game]
  const overnight = slot.end <= slot.start && slot.end !== slot.start
  return (
    <div className="space-y-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        {weekly ? (
          <div className="flex gap-1">
            {WEEKDAYS.map((name, index) => {
              const day = index + 1
              const on = slot.days.includes(day)
              return (
                <button
                  key={name}
                  onClick={() => onChange({ days: on ? slot.days.filter((d) => d !== day) : [...slot.days, day].sort() })}
                  aria-pressed={on}
                  className={`w-10 rounded-sm py-1 text-[13px] font-medium capitalize ${on ? "bg-klein text-paper" : "border border-line text-muted hover:border-klein"}`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        ) : (
          <input type="date" value={slot.date} min={today} onChange={(e) => e.target.value && onChange({ date: e.target.value })} className={field} />
        )}
        <span className="flex items-center gap-1.5">
          <input type="time" step={300} value={slot.start} onChange={(e) => e.target.value && onChange({ start: e.target.value })} className={field} />
          –
          <input type="time" step={300} value={slot.end} onChange={(e) => e.target.value && onChange({ end: e.target.value })} className={field} />
        </span>
        <select value={slot.game} onChange={(e) => onChange({ game: e.target.value })} className={field}>
          {Object.keys(agenda.games).map((id) => (
            <option key={id} value={id}>
              {gameName(agenda, id)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={slot.title ?? ""}
          maxLength={140}
          placeholder={game?.title ?? T.titlePlaceholder}
          aria-label={T.titlePlaceholder}
          onChange={(e) => onChange({ title: e.target.value || undefined })}
          className={`${field} min-w-0 flex-1`}
        />
        <button onClick={onRemove} aria-label={T.remove} title={T.remove} className="rounded-sm p-2 text-muted hover:text-klein">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {weekly && !slot.days.length && <p className="text-[13px] text-red-600">{T.noDays}</p>}
      {slot.start === slot.end && <p className="text-[13px] text-red-600">{T.sameTimes}</p>}
      {overnight && <p className="text-[13px] text-muted">{T.pastMidnight}</p>}
    </div>
  )
}

/** The next three weeks' weekly streams, each one a switch for a day off. */
function DaysOff({ agenda, now, onChange }: { agenda: Agenda; now: Date; onChange: (off: Agenda["off"]) => void }) {
  const lives = occurrences(agenda, now, 21).filter((live) => !live.avulsa && Date.parse(live.fim) > +now)
  if (!lives.length) return <p className="text-[14px] text-muted">{T.noWeekly}</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {lives.map((live) => (
        <button
          key={live.inicio}
          aria-pressed={live.folga}
          onClick={() =>
            onChange(live.folga ? agenda.off.filter((o) => !(o.date === live.data && o.start === live.start)) : [...agenda.off, { date: live.data, start: live.start }])
          }
          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[13px] tabular-nums ${
            live.folga ? "border border-dashed border-zinc-400 text-muted line-through" : "border border-line text-ink hover:border-klein"
          }`}
        >
          {live.folga && <CalendarOff className="h-3.5 w-3.5 no-underline" />}
          <span className="capitalize">{weekdayOf(live.data)}</span> {dayMonth(live.data)}, {clock(live.start)} · {gameName(agenda, live.jogo)}
        </button>
      ))}
    </div>
  )
}

/** The games: each one's default title; add one from Twitch's categories, remove one no stream uses. */
function Games({ agenda, token, onChange }: { agenda: Agenda; token: string; onChange: (games: Agenda["games"]) => void }) {
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<Category[] | null>(null)
  const [searching, setSearching] = useState(false)
  const used = new Set([...agenda.slots, ...agenda.extras].map((s) => s.game))

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setFound(await searchCategories(token, query.trim()).catch(() => []))
    setSearching(false)
  }

  function add(category: Category) {
    if (Object.values(agenda.games).some((g) => g.category === category.id)) return setFound(null)
    const base = slug(category.name).slice(0, 29)
    let id = base
    for (let n = 2; agenda.games[id]; n++) id = `${base}-${n}`
    onChange({ ...agenda.games, [id]: { name: category.name, category: category.id, title: category.name } })
    setFound(null)
    setQuery("")
  }

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
      <form
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
        className="flex items-center gap-2"
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T.searchGame} className={`${field} min-w-0 flex-1`} />
        <button type="submit" aria-label={T.searchGame} className="rounded-sm border border-line p-2 text-muted hover:border-klein hover:text-klein">
          {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </form>
      {found && (
        <div className="flex flex-wrap gap-2">
          {found.map((category) => (
            <button key={category.id} onClick={() => add(category)} className="flex items-center gap-2 rounded-sm border border-line p-1.5 pr-3 text-[14px] text-ink hover:border-klein">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.box} alt="" width={26} height={36} className="rounded-[2px]" />
              {category.name}
            </button>
          ))}
        </div>
      )}
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
  if (status.kind === "syncing") return <p className="w-full text-[13px] text-muted">{status.lines.at(-1)}</p>
  return (
    <div className="w-full space-y-1 text-[13px]">
      <p className="text-ink">
        {T.saved} {status.twitch && (status.lines.length ? `${T.twitchDone}:` : T.twitchSame)}
      </p>
      {status.lines.length > 0 && (
        <ul className="list-inside list-disc text-muted">
          {status.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {status.waiting.length > 0 && (
        <>
          <p className="text-muted">{T.waiting}</p>
          <ul className="list-inside list-disc text-muted">
            {status.waiting.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
