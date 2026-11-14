// node --test infra/comum/agenda.test.mjs: the lives' calendar (agenda.mjs). CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { dia, dias, daVez, duracao, ics, instante, limpar, ocorrencias, planoTwitch, proxima } from "./agenda.mjs"

const GAMES = {
  "rocket-league": { name: "Rocket League", category: "30921", title: "Ranqueadas de Rocket League" },
  valorant: { name: "Valorant", category: "516575", title: "Aprendendo Valorant" },
}
const RL = { start: "14:30", end: "16:30", game: "rocket-league" }
const VAL = { start: "21:00", end: "23:00", game: "valorant" }
const AGENDA = limpar({
  dates: {
    "2026-11-13": { lives: [RL] },
    "2026-11-16": { lives: [VAL] },
    "2026-11-17": { lives: [RL] },
    "2026-11-19": { lives: [RL] },
    "2026-11-20": { lives: [RL] },
    "2026-11-23": { lives: [VAL] },
    // Not planned: nothing.
    "2026-11-24": { lives: [] },
    // Sunday: two lives, one with its run of the show.
    "2026-11-15": {
      note: "Domingo com os viewers",
      lives: [
        { start: "19:00", end: "21:00", game: "rocket-league" },
        { start: "15:00", end: "17:00", game: "valorant", title: "Inhouse com os viewers", plan: [{ at: "15:00", text: "Montar os times" }, { text: "  Jogar  " }, { text: "" }] },
      ],
    },
    // Wednesday: a day off, with its note.
    "2026-11-18": { note: "Folga: médico", lives: [] },
  },
  games: GAMES,
})
// Friday 2026-11-13, 18:00 in Brasília.
const SEXTA = new Date("2026-11-13T21:00:00Z")

test("limpar keeps the shape and drops what doesn't fit", () => {
  const a = limpar(
    {
      timeZone: "Europe/Paris",
      slots: [{ days: [1], start: "21:00", end: "23:00", game: "valorant" }],
      dates: {
        "2026-11-21": { note: " ", lives: [{ start: "25:00", end: "23:00", game: "valorant" }] },
        "2026-02-30": { lives: [] },
        "2026-11-01": { lives: [] },
        "2026-11-20": { note: "  x  ", lives: [{ start: "10:00", end: "11:00", game: "minecraft" }, { start: "12:00", end: "13:00", game: "valorant", plan: [{ at: "9", text: "a" }] }] },
      },
      games: { ...GAMES, "Bad Id": { name: "x", category: "1" }, semcat: { name: "y" } },
    },
    "2026-11-13",
  )
  assert.equal(a.timeZone, "America/Sao_Paulo")
  assert.equal("slots" in a, false)
  assert.deepEqual(a.dates, { "2026-11-20": { note: "x", lives: [{ start: "12:00", end: "13:00", game: "valorant", plan: [{ text: "a" }] }] } })
  assert.deepEqual(Object.keys(a.games), ["rocket-league", "valorant"])
  assert.equal(limpar(null), null)
  assert.equal(limpar([]), null)
})

test("times are Brasília's, and a live past midnight ends the next day", () => {
  assert.equal(instante("2026-11-16", "21:00").toISOString(), "2026-11-17T00:00:00.000Z")
  assert.equal(duracao("23:00", "01:00"), 120)
  assert.equal(duracao("14:30", "16:30"), 120)
})

test("the days: what's planned, and nothing where nothing is", () => {
  assert.deepEqual(dia(AGENDA, "2026-11-16"), { data: "2026-11-16", nota: "", lives: [VAL] })
  assert.deepEqual(dia(AGENDA, "2026-11-14"), { data: "2026-11-14", nota: "", lives: [] })
  assert.equal("2026-11-24" in AGENDA.dates, false)
  assert.deepEqual(
    dias(AGENDA, SEXTA, 7).map((d) => [d.data, d.nota, d.lives.map((o) => `${o.start} ${o.jogo}`)]),
    [
      ["2026-11-13", "", ["14:30 rocket-league"]],
      ["2026-11-14", "", []],
      ["2026-11-15", "Domingo com os viewers", ["15:00 valorant", "19:00 rocket-league"]],
      ["2026-11-16", "", ["21:00 valorant"]],
      ["2026-11-17", "", ["14:30 rocket-league"]],
      ["2026-11-18", "Folga: médico", []],
      ["2026-11-19", "", ["14:30 rocket-league"]],
    ],
  )
  const domingo = ocorrencias(AGENDA, SEXTA, 7).find((o) => o.data === "2026-11-15")
  assert.equal(domingo.titulo, "Inhouse com os viewers")
  assert.deepEqual(domingo.roteiro, [{ at: "15:00", text: "Montar os times" }, { text: "Jogar" }])
  assert.equal(ocorrencias(AGENDA, SEXTA, 7)[0].titulo, "Ranqueadas de Rocket League")
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

test("the calendar file has one event per live, with the run of the show", () => {
  const texto = ics(AGENDA, { nome: "Live do muanlartins", url: "https://muanlartins.com.br/canal/agenda", agora: SEXTA })
  assert.match(texto, /DTSTART;TZID=America\/Sao_Paulo:20261115T150000\r\n/)
  assert.match(texto, /SUMMARY:Live do muanlartins: Valorant\r\n/)
  assert.match(texto, /DESCRIPTION:Inhouse com os viewers\\n· 15h · Montar os times\\n· Jogar\\nDomingo com os viewers\\nhttps/)
  assert.doesNotMatch(texto, /20261118T210000/)
  assert.doesNotMatch(texto, /RRULE/)
  assert.match(texto, /DTSTART;TZID=America\/Sao_Paulo:20261123T210000\r\n/)
})

const segmento = (id, inicio, fim, titulo, categoria, extra = {}) => ({
  id,
  start_time: inicio,
  end_time: fim,
  title: titulo,
  canceled_until: null,
  category: { id: categoria, name: "" },
  is_recurring: false,
  ...extra,
})

test("the plan for Twitch: single segments for eight weeks, recurring series removed", () => {
  const serie = (semana) => btoa(JSON.stringify({ segmentID: "serie-seg", isoYear: 2026, isoWeek: semana }))
  const segs = [
    // The old recurring series, two weeks of it: removed once.
    segmento(serie(47), "2026-11-17T00:00:00Z", "2026-11-17T02:00:00Z", "Aprendendo Valorant", "516575", { is_recurring: true }),
    segmento(serie(48), "2026-11-24T00:00:00Z", "2026-11-24T02:00:00Z", "Aprendendo Valorant", "516575", { is_recurring: true }),
    // Sunday's Valorant, right: kept.
    segmento("dom", "2026-11-15T18:00:00Z", "2026-11-15T20:00:00Z", "Inhouse com os viewers", "516575"),
    // Wednesday's, on the day off: removed.
    segmento("qua", "2026-11-19T00:00:00Z", "2026-11-19T02:00:00Z", "Aprendendo Valorant", "516575"),
    // Earlier today, over: left alone.
    segmento("hoje", "2026-11-13T17:30:00Z", "2026-11-13T19:30:00Z", "Ranqueadas de Rocket League", "30921"),
  ]
  const plano = planoTwitch(AGENDA, segs, SEXTA)
  assert.deepEqual(plano.remove.map((r) => r.id), [serie(47), "qua"])
  assert.deepEqual(plano.mantem, ["2026-11-15 15:00–17:00 Valorant"])
  const criadas = plano.cria.map((c) => c.corpo)
  assert.ok(criadas.every((c) => !c.is_recurring && Date.parse(c.start_time) > +SEXTA))
  assert.deepEqual(criadas[0], {
    start_time: "2026-11-15T22:00:00.000Z",
    timezone: "America/Sao_Paulo",
    duration: "120",
    is_recurring: false,
    category_id: "30921",
    title: "Ranqueadas de Rocket League",
  })
  // Every live from now on, but the one kept.
  assert.equal(criadas.length + plano.mantem.length, ocorrencias(AGENDA, SEXTA, 56).filter((o) => Date.parse(o.inicio) > +SEXTA).length)
  assert.ok(!criadas.some((c) => c.start_time === "2026-11-19T00:00:00.000Z"))
})
