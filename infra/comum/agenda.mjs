// The lives' calendar, the one source of truth for when the lives are (since 2026-11-13). Luan plans it by hand, day
// by day, on the site (/canal/agenda, signed in with the channel's Twitch), the profile API keeps it (GET and PUT /agenda) and
// everything else reads it from there: the site's calendar, the subscribable calendar (GET /agenda.ics), the stream's
// credits and the Anúncios dock (the live's Twitch title and game, the Instagram story). The editor mirrors it on
// Twitch's own calendar with planoTwitch. Pure functions, shared by the API (Node) and the site (the browser).
//
// The agenda, in the channel's time zone (FUSO):
//   dates   the days planned: { "YYYY-MM-DD": { note?, lives: [{ start: "HH:MM", end: "HH:MM", game, title?,
//           plan?: [{ at?: "HH:MM", text }] }] } }. A day not in it has no live; a day with only a note says why.
//   games   each game: { name, category (Twitch's id), title (a live's default title) }
// An end at or before the start runs past midnight. A live's title is its own, else its game's.

export const FUSO = "America/Sao_Paulo"

export const LIMITES = { jogos: 20, datas: 120, lives: 6, roteiro: 12, titulo: 140, nome: 60, nota: 100, item: 120 }

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/
const JOGO = /^[a-z0-9-]{1,32}$/
const CATEGORIA = /^\d{1,12}$/

const linha = (s, max) => [...String(s ?? "").replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()
const dataValida = (d) => typeof d === "string" && DATA.test(d) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d
const minutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
const lista = (l) => (Array.isArray(l) ? l : [])

/** How long a live lasts, in minutes; an end at or before the start is the next day's. */
export const duracao = (start, end) => ((minutos(end) - minutos(start) + 1439) % 1440) + 1

/** "YYYY-MM-DD" plus n days. */
export function somaDias(data, n) {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** The ISO weekday of a date: 1 Monday … 7 Sunday. */
export const diaDaSemana = (data) => ((new Date(`${data}T12:00:00Z`).getUTCDay() + 6) % 7) + 1

/** The date an instant falls on in a time zone, "YYYY-MM-DD". */
export const dataEm = (instante, fuso = FUSO) => new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(instante)

/** The wall-clock "HH:MM" of an instant in a time zone. */
export const horaEm = (instante, fuso = FUSO) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: fuso, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(instante)

/** The instant a wall-clock time falls on in a time zone (zones without a change that day; Brasília has none). */
export function instante(data, hhmm, fuso = FUSO) {
  const palpite = Date.parse(`${data}T${hhmm}:00Z`)
  const visto = Date.parse(`${dataEm(new Date(palpite), fuso)}T${horaEm(new Date(palpite), fuso)}:00Z`)
  return new Date(palpite - (visto - palpite))
}

/**
 * The agenda as the API keeps it: only known fields of the right shape, within limits; a live whose game isn't in
 * games is dropped. With `hoje` ("YYYY-MM-DD"), days planned before it go. Null when it isn't an object.
 */
export function limpar(a, hoje) {
  if (!a || typeof a !== "object" || Array.isArray(a)) return null
  const games = {}
  const dados = a.games && typeof a.games === "object" && !Array.isArray(a.games) ? Object.entries(a.games) : []
  for (const [id, g] of dados.slice(0, LIMITES.jogos)) {
    if (!JOGO.test(id) || !g || !CATEGORIA.test(String(g.category ?? ""))) continue
    const name = linha(g.name, LIMITES.nome)
    if (!name) continue
    games[id] = { name, category: String(g.category), title: linha(g.title, LIMITES.titulo) || name }
  }
  const titulo = (t) => {
    const s = linha(t, LIMITES.titulo)
    return s ? { title: s } : {}
  }
  const horario = (s) => s && typeof s === "object" && HORA.test(s.start) && HORA.test(s.end) && s.start !== s.end && games[s.game]

  const dates = {}
  const datas = a.dates && typeof a.dates === "object" && !Array.isArray(a.dates) ? Object.keys(a.dates).sort() : []
  for (const data of datas.filter((d) => dataValida(d) && (!hoje || d >= hoje)).slice(0, LIMITES.datas)) {
    const d = a.dates[data]
    if (!d || typeof d !== "object") continue
    const lives = lista(d.lives)
      .filter(horario)
      .map((l) => {
        const plan = lista(l.plan)
          .filter((p) => p && typeof p === "object")
          .map((p) => ({ ...(HORA.test(p.at) ? { at: p.at } : {}), text: linha(p.text, LIMITES.item) }))
          .filter((p) => p.text)
          .slice(0, LIMITES.roteiro)
        return { start: l.start, end: l.end, game: l.game, ...titulo(l.title), ...(plan.length ? { plan } : {}) }
      })
      .sort((x, y) => x.start.localeCompare(y.start))
      .slice(0, LIMITES.lives)
    const note = linha(d.note, LIMITES.nota)
    // A day with nothing is a day not planned.
    if (lives.length || note) dates[data] = { ...(note ? { note } : {}), lives }
  }
  return { timeZone: FUSO, dates, games }
}

/** A day as it stands: { data, nota, lives } (none when it isn't planned). Lives as the agenda has them. */
export function dia(agenda, data) {
  const d = agenda?.dates?.[data]
  return { data, nota: d?.note || "", lives: d?.lives || [] }
}

/** One live of a day with its instants (ISO strings), its game's name and category, and its title. */
function ocorrencia(agenda, d, l) {
  const fuso = agenda?.timeZone || FUSO
  const g = agenda?.games?.[l.game] || {}
  const inicio = instante(d.data, l.start, fuso)
  return {
    data: d.data,
    inicio: inicio.toISOString(),
    fim: new Date(+inicio + duracao(l.start, l.end) * 60_000).toISOString(),
    start: l.start,
    end: l.end,
    jogo: l.game,
    nome: g.name || l.game,
    categoria: g.category || null,
    titulo: l.title || g.title || g.name || l.game,
    roteiro: l.plan || [],
  }
}

/** The days from the date `de` falls on (in the agenda's zone) through `n` days: { data, nota, lives }. */
export function dias(agenda, de = new Date(), n = 7) {
  const primeiro = dataEm(de, agenda?.timeZone || FUSO)
  return Array.from({ length: n }, (_, i) => {
    const d = dia(agenda, somaDias(primeiro, i))
    return { ...d, lives: d.lives.map((l) => ocorrencia(agenda, d, l)) }
  })
}

/** Every live of those days, earliest first. Instants are ISO strings, so this goes out of the API as it is. */
export function ocorrencias(agenda, de = new Date(), n = 7) {
  return dias(agenda, de, n)
    .flatMap((d) => d.lives)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

/** The live on air at `agora` or the next one, within two weeks; null without one. */
export function proxima(agenda, agora = new Date()) {
  return ocorrencias(agenda, new Date(+agora - 86_400_000), 16).find((o) => Date.parse(o.fim) > +agora) ?? null
}

/** The live a moment belongs to: on air, or starting within `antes` minutes. For the stream's title, game and story. */
export function daVez(agenda, agora = new Date(), antes = 90) {
  const o = proxima(agenda, agora)
  return o && Date.parse(o.inicio) - antes * 60_000 <= +agora ? o : null
}

/** "15:00" → "15h", "14:30" → "14h30". */
const hora = (hhmm) => hhmm.replace(":", "h").replace(/h00$/, "h")

/** A live's run of the show as lines: "15h · inhouse com os viewers". */
export const roteiroEmLinhas = (roteiro) => roteiro.map((p) => (p.at ? `${hora(p.at)} · ${p.text}` : p.text))

const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

/**
 * The agenda as one line of chat, for the chat bot's !agenda (the profile API's GET /agenda.txt): the live on air
 * or the next one, with its game and title, then the one after it; `url` (the agenda's page) when none is planned
 * in the next two weeks. Brasília's times, said once.
 */
export function noChat(agenda, { url, agora = new Date() }) {
  const hoje = dataEm(agora, agenda?.timeZone || FUSO)
  const quando = (o) =>
    `${o.data === hoje ? "hoje" : o.data === somaDias(hoje, 1) ? "amanhã" : `${SEMANA[diaDaSemana(o.data) - 1]} ${o.data.slice(8)}/${o.data.slice(5, 7)}`} às ${hora(o.start)}`
  const qual = (o) => (o.titulo === o.nome ? o.nome : `${o.nome}, ${o.titulo}`)
  const [esta, depois] = ocorrencias(agenda, new Date(+agora - 86_400_000), 16).filter((o) => Date.parse(o.fim) > +agora)
  if (!esta) return `Nenhuma live marcada nas próximas duas semanas. A agenda: ${url}`
  const agoraNoAr = Date.parse(esta.inicio) <= +agora
  return [
    agoraNoAr ? `Ao vivo agora, até as ${hora(esta.end)}: ${qual(esta)}.` : `Próxima live ${quando(esta)} (horário de Brasília): ${qual(esta)}.`,
    depois && `Depois, ${quando(depois)}: ${depois.nome}.`,
  ]
    .filter(Boolean)
    .join(" ")
}

/**
 * The agenda as an iCalendar a calendar app subscribes to: each live from a week ago to eight weeks ahead, one event
 * each (apps fetch the file again every few hours). `nome` names the calendar and goes before each event's game:
 * "Live do muanlartins: Valorant"; the description is the live's title, its run of the show, the day's note and `url`.
 */
export function ics(agenda, { nome, url, agora = new Date() }) {
  const fuso = agenda?.timeZone || FUSO
  const escape = (t) => String(t).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n")
  const quando = (data, hhmm) => `${data.replaceAll("-", "")}T${hhmm.replace(":", "")}00`
  const stamp = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")
  const eventos = dias(agenda, new Date(+agora - 7 * 86_400_000), 63).flatMap((d) =>
    d.lives.flatMap((o) => {
      const fimData = minutos(o.end) <= minutos(o.start) ? somaDias(o.data, 1) : o.data
      const descricao = [o.titulo, ...roteiroEmLinhas(o.roteiro).map((l) => `· ${l}`), d.nota, url].filter(Boolean).join("\n")
      return [
        "BEGIN:VEVENT",
        `UID:live-${o.data}-${o.start.replace(":", "")}-${o.jogo}@muanlartins.com.br`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=${fuso}:${quando(o.data, o.start)}`,
        `DTEND;TZID=${fuso}:${quando(fimData, o.end)}`,
        `SUMMARY:${escape(`${nome}: ${o.nome}`)}`,
        `DESCRIPTION:${escape(descricao)}`,
        `URL:${url}`,
        `LOCATION:${url}`,
        "END:VEVENT",
      ]
    }),
  )
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//muanlartins//agenda//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(nome)}`,
    `X-WR-TIMEZONE:${fuso}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    // Brasília has kept UTC−3 all year since 2019.
    "BEGIN:VTIMEZONE",
    `TZID:${fuso}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...eventos,
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}

// --- Twitch's calendar ---------------------------------------------------------------------------------------------

/** A recurring segment's own id: Twitch's segment ids carry it with the week (base64 of {"segmentID", "isoWeek"…}). */
function serie(id) {
  try {
    return JSON.parse(atob(id)).segmentID || id
  } catch {
    return id
  }
}

/** How many weeks ahead Twitch's calendar shows: every save (and opening the editor) moves the window on. */
export const SEMANAS_TWITCH = 8

/**
 * What to change on Twitch's calendar (GET /helix/schedule's segments) so it shows the agenda's lives of the next
 * eight weeks, each as a single segment (recurring series, from before the agenda was planned by day, go):
 *   cria    bodies for POST /schedule/segment, with a label
 *   remove  { id, rotulo } for DELETE: recurring series (all of them) and future segments the agenda doesn't have
 *   mantem  labels of what's already right
 * A segment is its start, length, category and title; a change to any is a remove and a create. A segment on air is
 * left alone.
 */
export function planoTwitch(agenda, segmentos, agora = new Date(), semanas = SEMANAS_TWITCH) {
  const fuso = agenda.timeZone || FUSO
  const plano = { cria: [], remove: [], mantem: [] }
  const rotulo = (o) => `${o.data} ${o.start}–${o.end} ${o.nome}`
  const chave = (inicio, minutosSeg, categoria, titulo) => [new Date(inicio).toISOString(), minutosSeg, categoria, linha(titulo, LIMITES.titulo)].join("|")

  const quer = new Map()
  for (const o of ocorrencias(agenda, agora, semanas * 7)) {
    // Twitch refuses a start in the past.
    if (Date.parse(o.inicio) <= +agora) continue
    quer.set(chave(o.inicio, duracao(o.start, o.end), o.categoria, o.titulo), o)
  }

  const series = new Set()
  const tem = new Set()
  for (const seg of segmentos) {
    const inicio = new Date(seg.start_time)
    const quando = `${dataEm(inicio, fuso)} ${horaEm(inicio, fuso)} ${seg.title}`
    if (seg.is_recurring) {
      const id = serie(seg.id)
      if (!series.has(id)) plano.remove.push({ id: seg.id, rotulo: `toda semana: ${quando}` })
      series.add(id)
      continue
    }
    if (+inicio <= +agora) continue
    const minutosSeg = Math.round((Date.parse(seg.end_time) - +inicio) / 60_000)
    const k = chave(seg.start_time, minutosSeg, seg.category?.id ?? null, seg.title)
    if (quer.has(k) && !tem.has(k) && !seg.canceled_until) tem.add(k)
    else plano.remove.push({ id: seg.id, rotulo: quando })
  }
  for (const [k, o] of quer) {
    if (tem.has(k)) {
      plano.mantem.push(rotulo(o))
      continue
    }
    plano.cria.push({
      rotulo: rotulo(o),
      corpo: {
        start_time: o.inicio,
        timezone: fuso,
        duration: String(duracao(o.start, o.end)),
        is_recurring: false,
        ...(o.categoria ? { category_id: o.categoria } : {}),
        title: linha(o.titulo, LIMITES.titulo),
      },
    })
  }
  return plano
}
