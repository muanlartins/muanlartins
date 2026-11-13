// node --test infra/comum/agenda.test.mjs: the lives' calendar (agenda.mjs). CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { daVez, duracao, ics, instante, limpar, ocorrencias, planoTwitch, proxima } from "./agenda.mjs"

const GAMES = {
  "rocket-league": { name: "Rocket League", category: "30921", title: "Ranqueadas de Rocket League" },
  valorant: { name: "VALORANT", category: "516575", title: "Aprendendo Valorant" },
}
const AGENDA = limpar({
  slots: [
    { days: [2, 4, 5], start: "14:30", end: "16:30", game: "rocket-league" },
    { days: [3, 1], start: "21:00", end: "23:00", game: "valorant" },
  ],
  extras: [{ date: "2026-11-15", start: "15:00", end: "17:00", game: "valorant", title: "Domingo com os viewers" }],
  off: [{ date: "2026-11-18", start: "21:00" }],
  games: GAMES,
})
// Friday 2026-11-13, 18:00 in Brasília.
const SEXTA = new Date("2026-11-13T21:00:00Z")

test("limpar keeps the shape and drops what doesn't fit", () => {
  const a = limpar(
    {
      timeZone: "Europe/Paris",
      slots: [
        { days: [9, 1, 1], start: "21:00", end: "23:00", game: "valorant", title: "   " },
        { days: [2], start: "25:00", end: "23:00", game: "valorant" },
        { days: [2], start: "10:00", end: "12:00", game: "minecraft" },
      ],
      extras: [{ date: "2026-02-30", start: "10:00", end: "11:00", game: "valorant" }, { date: "2026-11-01", start: "10:00", end: "11:00", game: "valorant" }],
      off: [{ date: "2026-11-20", start: "14:30" }, { date: "2026-11-20", start: "14:30" }, { date: "2026-11-01", start: "14:30" }],
      games: { ...GAMES, "Bad Id": { name: "x", category: "1" }, semcat: { name: "y" } },
    },
    "2026-11-13",
  )
  assert.equal(a.timeZone, "America/Sao_Paulo")
  assert.deepEqual(a.slots, [{ days: [1], start: "21:00", end: "23:00", game: "valorant" }])
  assert.deepEqual(a.extras, [])
  assert.deepEqual(a.off, [{ date: "2026-11-20", start: "14:30" }])
  assert.deepEqual(Object.keys(a.games), ["rocket-league", "valorant"])
  assert.equal(limpar(null), null)
  assert.equal(limpar([]), null)
})

test("times are Brasília's, and a live past midnight ends the next day", () => {
  assert.equal(instante("2026-11-16", "21:00").toISOString(), "2026-11-17T00:00:00.000Z")
  assert.equal(duracao("23:00", "01:00"), 120)
  assert.equal(duracao("14:30", "16:30"), 120)
})

test("the next seven days: weekly lives, extras and days off", () => {
  const dias = ocorrencias(AGENDA, SEXTA, 7)
  assert.deepEqual(
    dias.map((o) => [o.data, o.start, o.jogo, o.avulsa, o.folga]),
    [
      ["2026-11-13", "14:30", "rocket-league", false, false],
      ["2026-11-15", "15:00", "valorant", true, false],
      ["2026-11-16", "21:00", "valorant", false, false],
      ["2026-11-17", "14:30", "rocket-league", false, false],
      ["2026-11-18", "21:00", "valorant", false, true],
      ["2026-11-19", "14:30", "rocket-league", false, false],
    ],
  )
  assert.equal(dias[1].titulo, "Domingo com os viewers")
  assert.equal(dias[2].titulo, "Aprendendo Valorant")
  assert.equal(dias[2].categoria, "516575")
})

test("the next live skips days off and the one already over", () => {
  assert.equal(proxima(AGENDA, SEXTA).data, "2026-11-15")
  assert.equal(proxima(AGENDA, new Date("2026-11-18T12:00:00Z")).data, "2026-11-19")
  // On air at 15:00 on Friday.
  assert.equal(proxima(AGENDA, new Date("2026-11-13T18:00:00Z")).data, "2026-11-13")
  // The live of the moment: on air, or within 90 minutes.
  assert.equal(daVez(AGENDA, new Date("2026-11-16T22:45:00Z"))?.data, "2026-11-16")
  assert.equal(daVez(AGENDA, new Date("2026-11-16T22:00:00Z")), null)
})

test("the calendar file has the days off as exceptions and the extras as events", () => {
  const texto = ics(AGENDA, { nome: "Live do muanlartins", url: "https://muanlartins.com.br/canal/agenda", agora: SEXTA })
  assert.match(texto, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE\r\n/)
  assert.match(texto, /EXDATE;TZID=America\/Sao_Paulo:20261118T210000\r\n/)
  assert.match(texto, /DTSTART;TZID=America\/Sao_Paulo:20261115T150000\r\n/)
  assert.match(texto, /SUMMARY:Live do muanlartins: VALORANT\r\n/)
  assert.match(texto, /DESCRIPTION:Domingo com os viewers\\nhttps/)
  // Each weekly live from this week on.
  assert.match(texto, /DTSTART;TZID=America\/Sao_Paulo:20261110T143000\r\n/)
  assert.equal(texto.split("BEGIN:VEVENT").length - 1, 3)
})

const segmento = (semana, inicio, fim, titulo, categoria, extra = {}) => ({
  id: btoa(JSON.stringify({ segmentID: `serie-${semana}`, isoYear: 2026, isoWeek: Number(inicio.slice(8, 10)) })),
  start_time: inicio,
  end_time: fim,
  title: titulo,
  canceled_until: null,
  category: { id: categoria, name: "" },
  is_recurring: true,
  ...extra,
})

test("the plan for Twitch: keeps what matches, removes what changed, creates what's missing", () => {
  const segs = [
    // Monday's Valorant, right.
    segmento("seg", "2026-11-17T00:00:00Z", "2026-11-17T02:00:00Z", "Aprendendo Valorant", "516575"),
    segmento("seg", "2026-11-24T00:00:00Z", "2026-11-24T02:00:00Z", "Aprendendo Valorant", "516575"),
    // Wednesday's Valorant: its next one is the day off.
    segmento("qua", "2026-11-19T00:00:00Z", "2026-11-19T02:00:00Z", "Aprendendo Valorant", "516575"),
    // Tuesday's Rocket League, with an old title.
    segmento("ter", "2026-11-17T17:30:00Z", "2026-11-17T19:30:00Z", "Rocket League", "30921"),
    // A single segment the agenda doesn't have.
    { ...segmento("x", "2026-11-14T18:00:00Z", "2026-11-14T20:00:00Z", "Teste", "30921"), id: "avulso-1", is_recurring: false },
  ]
  const plano = planoTwitch(AGENDA, segs, SEXTA)
  assert.deepEqual(plano.mantem.sort(), ["toda qua 21:00–23:00 VALORANT", "toda seg 21:00–23:00 VALORANT"])
  assert.deepEqual(plano.remove.map((r) => r.id).sort(), ["avulso-1", segs[3].id].sort())
  assert.deepEqual(plano.cancela, [{ id: segs[2].id, rotulo: "2026-11-18 qua 21:00–23:00 VALORANT" }])
  assert.deepEqual(
    plano.cria.map((c) => [c.corpo.start_time, c.corpo.is_recurring, c.corpo.title]),
    [
      ["2026-11-17T17:30:00.000Z", true, "Ranqueadas de Rocket League"],
      ["2026-11-19T17:30:00.000Z", true, "Ranqueadas de Rocket League"],
      ["2026-11-20T17:30:00.000Z", true, "Ranqueadas de Rocket League"],
      ["2026-11-15T18:00:00.000Z", false, "Domingo com os viewers"],
    ],
  )
})

test("Twitch cancels only a series' next occurrence: later days off wait", () => {
  const agenda = { ...AGENDA, off: [{ date: "2026-11-23", start: "21:00" }] }
  const segs = [
    segmento("seg", "2026-11-17T00:00:00Z", "2026-11-17T02:00:00Z", "Aprendendo Valorant", "516575", { canceled_until: "2026-11-17T02:00:00Z" }),
    segmento("seg", "2026-11-24T00:00:00Z", "2026-11-24T02:00:00Z", "Aprendendo Valorant", "516575"),
  ]
  const plano = planoTwitch(agenda, segs, SEXTA)
  assert.deepEqual(plano.retoma, [{ id: segs[0].id, rotulo: "2026-11-16 seg 21:00–23:00 VALORANT" }])
  assert.deepEqual(plano.pendentes, ["2026-11-23 seg 21:00–23:00 VALORANT"])
})
