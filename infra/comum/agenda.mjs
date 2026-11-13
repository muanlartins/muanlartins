// The lives' calendar, the one source of truth for when the lives are (since 2026-11-13). Luan edits it on the site
// (/canal/agenda, signed in with the channel's Twitch), the profile API keeps it (GET and PUT /agenda) and everything
// else reads it from there: the site's agenda, the subscribable calendar (GET /agenda.ics), the stream's credits and
// the Anúncios dock (the live's Twitch title and game, the Instagram story). The editor mirrors it on Twitch's own
// calendar with planoTwitch. Pure functions, shared by the API (Node) and the site (the browser).
//
// The agenda, in the channel's time zone (FUSO):
//   slots   every week: { days: [1…7] (ISO, 1 = Monday), start: "HH:MM", end: "HH:MM", game, title? }
//   extras  one day only: { date: "YYYY-MM-DD", start, end, game, title? }
//   off     a weekly live that won't happen that day: { date, start } (the slot's start)
//   games   each game: { name (its Twitch category's name), category (Twitch's id), title (the live's default title) }
// An end at or before the start runs past midnight. A live's title is its own, else its game's.

export const FUSO = "America/Sao_Paulo"

export const LIMITES = { jogos: 20, slots: 21, extras: 60, off: 200, titulo: 140, nome: 60 }

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/
const JOGO = /^[a-z0-9-]{1,32}$/
const CATEGORIA = /^\d{1,12}$/

const DIAS = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

const linha = (s, max) => [...String(s ?? "").replace(/\s+/g, " ").trim()].slice(0, max).join("").trim()
const dataValida = (d) => typeof d === "string" && DATA.test(d) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d
const minutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

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
 * games is dropped. With `hoje` ("YYYY-MM-DD"), extras and days off before it go too. Null when it isn't an object.
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
  const live = (s) => s && typeof s === "object" && HORA.test(s.start) && HORA.test(s.end) && s.start !== s.end && games[s.game]
  const lista = (l) => (Array.isArray(l) ? l : [])

  const slots = lista(a.slots)
    .filter(live)
    .map((s) => ({
      days: [...new Set(lista(s.days).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort(),
      start: s.start,
      end: s.end,
      game: s.game,
      ...titulo(s.title),
    }))
    .filter((s) => s.days.length)
    .slice(0, LIMITES.slots)
  const extras = lista(a.extras)
    .filter((e) => live(e) && dataValida(e.date) && (!hoje || e.date >= hoje))
    .map((e) => ({ date: e.date, start: e.start, end: e.end, game: e.game, ...titulo(e.title) }))
    .sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start))
    .slice(0, LIMITES.extras)
  const vistos = new Set()
  const off = lista(a.off)
    .filter((o) => o && dataValida(o.date) && HORA.test(o.start) && (!hoje || o.date >= hoje))
    .map((o) => ({ date: o.date, start: o.start }))
    .filter((o) => !vistos.has(o.date + o.start) && vistos.add(o.date + o.start))
    .sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start))
    .slice(0, LIMITES.off)
  return { timeZone: FUSO, slots, extras, off, games }
}

/**
 * Each live from the date `de` falls on (in the agenda's zone) through `dias` days: weekly ones, days off marked
 * `folga` (still listed, so a day can say there's no live), and extras marked `avulsa`, earliest first. Instants are
 * ISO strings, so this goes out of the API as it is.
 */
export function ocorrencias(agenda, de = new Date(), dias = 7) {
  const fuso = agenda?.timeZone || FUSO
  const games = agenda?.games || {}
  const primeiro = dataEm(de, fuso)
  const folga = new Set((agenda?.off || []).map((o) => o.date + o.start))
  const todas = []
  const montar = (data, s, extra) => {
    const inicio = instante(data, s.start, fuso)
    const fim = new Date(+inicio + duracao(s.start, s.end) * 60_000)
    const g = games[s.game] || {}
    todas.push({
      data,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      start: s.start,
      end: s.end,
      jogo: s.game,
      nome: g.name || s.game,
      categoria: g.category || null,
      titulo: s.title || g.title || g.name || s.game,
      avulsa: extra,
      folga: !extra && folga.has(data + s.start),
    })
  }
  for (let n = 0; n < dias; n++) {
    const data = somaDias(primeiro, n)
    const dia = diaDaSemana(data)
    for (const s of agenda?.slots || []) if (s.days.includes(dia)) montar(data, s, false)
    for (const e of agenda?.extras || []) if (e.date === data) montar(data, e, true)
  }
  return todas.sort((a, b) => a.inicio.localeCompare(b.inicio))
}

/** The live on air at `agora` or the next one (days off skipped), within two weeks; null without one. */
export function proxima(agenda, agora = new Date()) {
  return ocorrencias(agenda, agora, 15).find((o) => !o.folga && Date.parse(o.fim) > +agora) ?? null
}

/** The live a moment belongs to: on air, or starting within `antes` minutes. For the stream's title, game and story. */
export function daVez(agenda, agora = new Date(), antes = 90) {
  const o = proxima(agenda, agora)
  return o && Date.parse(o.inicio) - antes * 60_000 <= +agora ? o : null
}

const ICS_DIAS = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"]

/**
 * The agenda as an iCalendar a calendar app subscribes to: each weekly live from this week on, its days off as
 * exceptions, and each extra. `nome` names the calendar and goes before each event's game: "Live do muanlartins:
 * Valorant"; the description is the live's title and `url`.
 */
export function ics(agenda, { nome, url, agora = new Date() }) {
  const fuso = agenda?.timeZone || FUSO
  const games = agenda?.games || {}
  const hoje = dataEm(agora, fuso)
  const escape = (t) => String(t).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n")
  const quando = (data, hhmm) => `${data.replaceAll("-", "")}T${hhmm.replace(":", "")}00`
  const stamp = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")
  const evento = (uid, data, s, extra) => {
    const g = games[s.game] || {}
    const fimData = minutos(s.end) <= minutos(s.start) ? somaDias(data, 1) : data
    return [
      "BEGIN:VEVENT",
      `UID:${uid}@muanlartins.com.br`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${fuso}:${quando(data, s.start)}`,
      `DTEND;TZID=${fuso}:${quando(fimData, s.end)}`,
      ...extra,
      `SUMMARY:${escape(`${nome}: ${g.name || s.game}`)}`,
      `DESCRIPTION:${escape(`${s.title || g.title || g.name || s.game}\n${url}`)}`,
      `URL:${url}`,
      `LOCATION:${url}`,
      "END:VEVENT",
    ]
  }
  const semanais = (agenda?.slots || []).flatMap((s) => {
    // This week's first day of the slot, so a subscriber sees nothing before the agenda was this.
    let data = somaDias(hoje, -6)
    while (!s.days.includes(diaDaSemana(data))) data = somaDias(data, 1)
    const folgas = (agenda?.off || []).filter((o) => o.start === s.start && s.days.includes(diaDaSemana(o.date)) && o.date >= data)
    return evento(`semana-${s.days.join("")}-${s.start.replace(":", "")}-${s.game}`, data, s, [
      `RRULE:FREQ=WEEKLY;BYDAY=${s.days.map((d) => ICS_DIAS[d]).join(",")}`,
      ...(folgas.length ? [`EXDATE;TZID=${fuso}:${folgas.map((o) => quando(o.date, o.start)).join(",")}`] : []),
    ])
  })
  const avulsas = (agenda?.extras || []).flatMap((e) => evento(`avulsa-${e.date}-${e.start.replace(":", "")}`, e.date, e, []))
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
    ...semanais,
    ...avulsas,
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

/**
 * What to change on Twitch's calendar (GET /helix/schedule's segments, a few weeks of them) so it shows the agenda:
 *   cria     bodies for POST /schedule/segment (each weekly live's weekday as its own recurring segment, each extra
 *            as a single one), with a label
 *   remove   recurring series and single segments the agenda doesn't have: { id, rotulo } for DELETE
 *   cancela, retoma   { id, rotulo } for PATCH is_canceled: a day off, or one taken back
 *   pendentes  days off Twitch can't take yet: it cancels only a series' next occurrence
 *   mantem   labels of what's already right
 * A segment is its weekday (or date), start, length, category and title; a change to any is a remove and a create.
 * Run it again after creating, for the days off of what was just created.
 */
export function planoTwitch(agenda, segmentos, agora = new Date()) {
  const fuso = agenda.timeZone || FUSO
  const games = agenda.games || {}
  const tituloDe = (s) => linha(s.title || games[s.game]?.title || games[s.game]?.name || s.game, LIMITES.titulo)
  const plano = { cria: [], remove: [], cancela: [], retoma: [], pendentes: [], mantem: [] }

  // Weekly: one recurring segment per weekday of each slot.
  const querSemana = new Map()
  for (const s of agenda.slots || []) {
    for (const dia of s.days) {
      const chave = [dia, s.start, duracao(s.start, s.end), games[s.game]?.category, tituloDe(s)].join("|")
      querSemana.set(chave, { dia, s, rotulo: `${DIAS[dia]} ${s.start}–${s.end} ${games[s.game]?.name ?? s.game}` })
    }
  }
  const series = new Map()
  for (const seg of segmentos.filter((x) => x.is_recurring)) {
    const id = serie(seg.id)
    if (!series.has(id)) series.set(id, [])
    series.get(id).push(seg)
  }
  const chaveDe = (seg) => {
    const inicio = new Date(seg.start_time)
    const minutosSeg = Math.round((Date.parse(seg.end_time) - +inicio) / 60_000)
    return [diaDaSemana(dataEm(inicio, fuso)), horaEm(inicio, fuso), minutosSeg, seg.category?.id, linha(seg.title, LIMITES.titulo)].join("|")
  }
  const temSemana = new Map()
  for (const segs of series.values()) {
    segs.sort((a, b) => a.start_time.localeCompare(b.start_time))
    const chave = chaveDe(segs[0])
    if (querSemana.has(chave) && !temSemana.has(chave)) temSemana.set(chave, segs)
    else plano.remove.push({ id: segs[0].id, rotulo: `toda ${DIAS[Number(chave.split("|")[0])]} ${horaEm(new Date(segs[0].start_time), fuso)} ${segs[0].title}` })
  }
  for (const [chave, quer] of querSemana) {
    const segs = temSemana.get(chave)
    if (!segs) {
      // The first time it happens from tomorrow on: Twitch refuses a start in the past.
      let data = somaDias(dataEm(agora, fuso), 1)
      while (diaDaSemana(data) !== quer.dia) data = somaDias(data, 1)
      plano.cria.push({
        rotulo: `toda ${quer.rotulo}`,
        corpo: {
          start_time: instante(data, quer.s.start, fuso).toISOString(),
          timezone: fuso,
          duration: String(duracao(quer.s.start, quer.s.end)),
          is_recurring: true,
          category_id: games[quer.s.game]?.category,
          title: tituloDe(quer.s),
        },
      })
      continue
    }
    plano.mantem.push(`toda ${quer.rotulo}`)
    // Days off: Twitch cancels (or takes back) only the series' next occurrence.
    const folga = new Set((agenda.off || []).map((o) => o.date + o.start))
    const futuras = segs.filter((seg) => Date.parse(seg.start_time) > +agora)
    futuras.forEach((seg, n) => {
      const inicio = new Date(seg.start_time)
      const data = dataEm(inicio, fuso)
      const quero = folga.has(data + horaEm(inicio, fuso))
      if (quero === Boolean(seg.canceled_until)) return
      const rotulo = `${data} ${quer.rotulo}`
      if (n > 0) plano.pendentes.push(rotulo)
      else plano[quero ? "cancela" : "retoma"].push({ id: seg.id, rotulo })
    })
  }

  // Extras: single segments, from now on.
  const querAvulsa = new Map()
  for (const e of agenda.extras || []) {
    const inicio = instante(e.date, e.start, fuso)
    const minutosE = duracao(e.start, e.end)
    if (+inicio + minutosE * 60_000 <= +agora) continue
    const chave = [inicio.toISOString(), minutosE, games[e.game]?.category, tituloDe(e)].join("|")
    querAvulsa.set(chave, { e, inicio, minutosE, rotulo: `${e.date} ${e.start}–${e.end} ${games[e.game]?.name ?? e.game}` })
  }
  const temAvulsa = new Set()
  for (const seg of segmentos.filter((x) => !x.is_recurring && Date.parse(x.end_time) > +agora)) {
    const minutosSeg = Math.round((Date.parse(seg.end_time) - Date.parse(seg.start_time)) / 60_000)
    const chave = [new Date(seg.start_time).toISOString(), minutosSeg, seg.category?.id, linha(seg.title, LIMITES.titulo)].join("|")
    if (querAvulsa.has(chave) && !temAvulsa.has(chave)) temAvulsa.add(chave)
    else plano.remove.push({ id: seg.id, rotulo: `${dataEm(new Date(seg.start_time), fuso)} ${horaEm(new Date(seg.start_time), fuso)} ${seg.title}` })
  }
  for (const [chave, quer] of querAvulsa) {
    if (temAvulsa.has(chave)) {
      plano.mantem.push(quer.rotulo)
      continue
    }
    // Twitch refuses a start in the past: an extra already under way is left off.
    if (+quer.inicio <= +agora) continue
    plano.cria.push({
      rotulo: quer.rotulo,
      corpo: {
        start_time: quer.inicio.toISOString(),
        timezone: fuso,
        duration: String(quer.minutosE),
        is_recurring: false,
        category_id: games[quer.e.game]?.category,
        title: tituloDe(quer.e),
      },
    })
  }
  return plano
}
