// node --test infra/sigma/pareamento.test.mjs: the viewers' matches (pareamento.mjs). CI's zip leaves this file out.

import assert from "node:assert/strict"
import { test } from "node:test"
import { acaoDoDock, chave, comandoDoChat, CORES, desfazer, formatos, ITEM, limparNome, MAX_INSCRITOS, mudar, publico, SIGMA_VITORIA, sortear, vencer } from "./pareamento.mjs"

const DONO = "muanlartins"
const AGORA = new Date("2026-11-28T23:00:00Z")
const pessoas = (n) => Array.from({ length: n }, (_, i) => ({ login: `p${i + 1}`, nome: `P${i + 1}` }))
const resumo = (n) => formatos(n).map((o) => `${o.tam}v${o.tam}${o.luan ? "+L" : ""}:${o.times}${o.sobram ? `-${o.sobram}` : ""}`)

/** The Σ table in memory: the one item, written only on the version read, and each login's Σ. */
function tabela() {
  const t = { item: null, sigma: new Map(), escritas: 0 }
  t.ler = async () => (t.item ? structuredClone(t.item) : null)
  t.gravar = async (estado, antes) => {
    if ((t.item?.versao ?? null) !== antes) return false
    t.item = structuredClone({ ...estado, login: ITEM })
    t.escritas++
    return true
  }
  t.somar = async (logins, n) => logins.forEach((l) => t.sigma.set(l, (t.sigma.get(l) ?? 0) + n))
  return t
}
const chat = (t, comando, login, extra = {}) => comandoDoChat(t, comando, { login, nome: login.toUpperCase(), ...extra }, DONO, AGORA)
const dock = (t, corpo, semente = 7) => acaoDoDock(t, corpo, DONO, AGORA, () => semente)

test("the formats: Luan plays when one more closes the teams, otherwise he narrates", () => {
  assert.deepEqual(resumo(1), ["1v1+L:2"])
  assert.deepEqual(resumo(2), ["1v1:2"])
  assert.deepEqual(resumo(3), ["2v2+L:2", "1v1+L:4"])
  assert.deepEqual(resumo(4), ["2v2:2", "1v1:4"])
  assert.deepEqual(resumo(5), ["3v3+L:2", "2v2+L:3", "1v1+L:6"])
  assert.deepEqual(resumo(6), ["3v3:2", "2v2:3", "1v1:6"])
  // Eight: the brackets Luan named, 2v2 or 1v1, before a 3v3 bracket with a bye.
  assert.deepEqual(resumo(8), ["2v2:4", "1v1:8", "3v3+L:3"])
  assert.equal(formatos(8)[0].partidas, 3)
  assert.equal(formatos(8)[0].tipo, "torneio")
  assert.equal(formatos(6)[0].tipo, "partida")
  assert.deepEqual(formatos(0), [])
})

test("a list too long for a bracket draws a bracket's worth and leaves the rest", () => {
  assert.deepEqual(resumo(30), ["3v3:8-6", "2v2:8-14", "1v1:8-22"])
  // Everyone playing comes before a bracket without byes.
  assert.deepEqual(resumo(20), ["3v3+L:7", "2v2:8-4", "1v1:8-12"])
  const f = formatos(30).find((o) => o.tam === 2)
  assert.equal(f.jogadores, 16)
})

test("the bracket: the first drawn meet the byes, and every match but the byes waits for a winner", () => {
  const c = chave(6)
  assert.deepEqual(c.filter((p) => p.rodada === 0).map((p) => [p.a, p.b]), [[0, null], [3, 4], [1, null], [2, 5]])
  assert.deepEqual(c.filter((p) => p.bye).map((p) => p.vencedor), [0, 1])
  assert.deepEqual(c.filter((p) => p.rodada === 1).map((p) => [p.a, p.b]), [[0, null], [1, null]])
  assert.equal(c.filter((p) => !p.bye).length, 5)
  assert.deepEqual(chave(2), [{ id: "0-0", rodada: 0, a: 0, b: 1, vencedor: null, bye: false }])
})

test("a draw: everyone drawn once, teams in the order drawn, Luan in only when he plays", () => {
  const f = formatos(5)[0]
  const s = sortear(pessoas(5), f, 42, DONO, AGORA)
  assert.equal(s.ordem.length, 6)
  assert.ok(s.ordem.includes(DONO))
  assert.deepEqual([...s.ordem].sort(), [...pessoas(5).map((p) => p.login), DONO].sort())
  assert.deepEqual(s.times.flatMap((t) => t.logins), s.ordem)
  assert.equal(s.nomes[DONO], "Luan")
  for (const t of s.times) {
    assert.notEqual(t.capitao, DONO)
    assert.equal(t.nome, `Time ${s.nomes[t.capitao]}`)
  }
  assert.deepEqual(s.times.map((t) => t.cor), ["azul", "laranja"])
  // The same seed, the same draw.
  assert.deepEqual(sortear(pessoas(5), f, 42, DONO, AGORA).ordem, s.ordem)
  const sem = sortear(pessoas(4), formatos(4)[0], 42, DONO, AGORA)
  assert.ok(!sem.ordem.includes(DONO))
  // 1v1: each team is the person, named as they are.
  const um = sortear(pessoas(2), formatos(2)[0], 1, DONO, AGORA)
  assert.deepEqual(um.times.map((t) => t.nome).sort(), ["P1", "P2"])
})

test("winners go up the bracket, the final's is the champion, and a wrong click can be taken back", () => {
  let s = sortear(pessoas(8), formatos(8)[1], 3, DONO, AGORA) // 1v1, eight
  assert.equal(vencer(s, "1-0", "a").erro, "Essa partida ainda não tem os dois times.")
  const r = vencer(s, "0-0", "b")
  assert.deepEqual(r.ganhadores, s.times[s.partidas[0].b].logins)
  s = r.sorteio
  assert.equal(vencer(s, "0-0", "a").erro, "Essa partida já tem vencedor.")
  assert.equal(s.partidas.find((p) => p.id === "1-0").a, s.partidas[0].b)
  s = vencer(s, "0-1", "a").sorteio
  s = vencer(s, "1-0", "a").sorteio
  assert.match(desfazer(s, "0-0").erro, /seguinte/)
  const volta = desfazer(s, "1-0")
  assert.equal(volta.sorteio.partidas.find((p) => p.id === "2-0").a, null)
  for (const id of ["0-2", "0-3", "1-1", "2-0"]) s = vencer(s, id, "a").sorteio
  assert.notEqual(s.campeao, null)
  assert.equal(s.campeao, s.partidas.find((p) => p.id === "2-0").vencedor)
})

test("names from the chat: one line, no @, short", () => {
  assert.equal(limparNome("  @@Os   Brabos\n do RL  "), "Os Brabos do RL")
  assert.equal(limparNome("x".repeat(40)).length, 24)
  assert.equal(limparNome("   "), "")
})

test("!jogar and !sair: the list, once each, the bot's line with the count", async () => {
  const t = tabela()
  assert.equal(await chat(t, "jogar", "ana"), "ANA entrou no sorteio. Na lista: 1.")
  assert.equal(await comandoDoChat(t, "jogar", { login: "bia", nome: "Bia" }, DONO, AGORA), "Bia entrou no sorteio. Na lista: 2.")
  assert.equal(await chat(t, "jogar", "ana"), "ANA já está no sorteio. Na lista: 2.")
  assert.equal(await chat(t, "jogar", DONO), "Eu entro quando precisar pra fechar os times.")
  assert.equal(await chat(t, "sair", "ana"), "ANA saiu do sorteio. Na lista: 1.")
  assert.equal(await chat(t, "sair", "ana"), "ANA não estava no sorteio.")
  assert.equal(await comandoDoChat(t, "jogar", { login: "não vale" }, DONO, AGORA), "Não deu pra saber quem mandou. Tenta de novo.")
  // A name that isn't theirs (someone else's display name) shows as their login.
  assert.equal(await comandoDoChat(t, "jogar", { login: "caio", nome: "Outro" }, DONO, AGORA), "caio entrou no sorteio. Na lista: 2.")
})

test("two !jogar at the same moment both land", async () => {
  const t = tabela()
  const ler = t.ler
  let pausa = true
  // Both read the empty list before either writes.
  const lidos = []
  t.ler = async () => {
    const v = await ler()
    if (pausa) {
      lidos.push(v)
      if (lidos.length < 2) await new Promise((r) => setTimeout(r, 5))
      else pausa = false
    }
    return v
  }
  await Promise.all([chat(t, "jogar", "ana"), chat(t, "jogar", "bia")])
  assert.deepEqual(t.item.inscritos.map((i) => i.login).sort(), ["ana", "bia"])
})

test("a new day starts with an empty list", async () => {
  const t = tabela()
  await chat(t, "jogar", "ana")
  const amanha = new Date(AGORA.getTime() + 24 * 3600_000)
  assert.equal(publico(t.item, amanha).inscritos.length, 0)
  assert.equal(publico(t.item, AGORA).inscritos.length, 1)
})

test("the list has a ceiling", async () => {
  const t = tabela()
  for (let i = 0; i < MAX_INSCRITOS; i++) await chat(t, "jogar", `p${i}`)
  assert.match(await chat(t, "jogar", "mais1"), /cheia/)
})

test("the dock draws: the drawn leave the list, a draw on screen must end before the next", async () => {
  const t = tabela()
  for (const p of pessoas(5)) await chat(t, "jogar", p.login)
  const [st, corpo] = await dock(t, { acao: "sortear", formato: { tam: 3 } })
  assert.equal(st, 200)
  assert.equal(corpo.sorteio.formato.luan, true)
  assert.equal(corpo.inscritos.length, 0)
  assert.equal(corpo.sorteio.ordem.length, 6)
  await chat(t, "jogar", "nova")
  assert.deepEqual((await dock(t, { acao: "sortear", formato: { tam: 1 } }))[1], { erro: "Ainda tem um sorteio na tela: encerra ele antes." })
  const [, fim] = await dock(t, { acao: "encerrar" })
  assert.equal(fim.sorteio, null)
  assert.equal(t.item.anteriores.length, 1)
  assert.deepEqual(fim.inscritos.map((i) => i.login), ["nova"])
})

test("a format the list doesn't allow is refused", async () => {
  const t = tabela()
  for (const p of pessoas(4)) await chat(t, "jogar", p.login)
  const [st, corpo] = await dock(t, { acao: "sortear", formato: { tam: 3 } })
  assert.equal(st, 400)
  assert.match(corpo.erro, /formato/)
})

test("a redraw, before any match, from the same list minus whoever left", async () => {
  const t = tabela()
  for (const p of pessoas(5)) await chat(t, "jogar", p.login)
  await dock(t, { acao: "sortear", formato: { tam: 3 } })
  // 3v3 doesn't close with four, so the suggestion for four: 2v2, Luan narrating.
  const [st, corpo] = await dock(t, { acao: "refazer", tirar: ["p1"], formato: { tam: 3 } }, 9)
  assert.equal(st, 200)
  assert.deepEqual([corpo.sorteio.formato.tam, corpo.sorteio.formato.luan], [2, false])
  assert.ok(!corpo.sorteio.ordem.includes("p1"))
  assert.equal(corpo.inscritos.length, 0)
  // Three of those: the team size stays when it still closes (2v2, now with Luan in).
  const [, outro] = await dock(t, { acao: "refazer", tirar: ["p2"], formato: { tam: 2 } }, 11)
  assert.deepEqual([outro.sorteio.formato.tam, outro.sorteio.formato.luan], [2, true])
  assert.equal(outro.sorteio.inscritos.length, 3)
  assert.equal((await dock(t, { acao: "refazer", tirar: ["p3", "p4", "p5"], formato: { tam: 2 } }))[1].erro, "Sobrou gente de menos pra sortear.")
  await dock(t, { acao: "vencer", partida: "0-0", lado: "a" })
  assert.match((await dock(t, { acao: "refazer", formato: { tam: 2 } }))[1].erro, /decidida/)
})

test("a win gives the winners Σ (never Luan), taking it back takes them back", async () => {
  const t = tabela()
  for (const p of pessoas(3)) await chat(t, "jogar", p.login)
  const [, d] = await dock(t, { acao: "sortear", formato: { tam: 2 } }, 5)
  const vencedores = d.sorteio.times[0].logins
  const [st, depois] = await dock(t, { acao: "vencer", partida: "0-0", lado: "a" })
  assert.equal(st, 200)
  assert.equal(depois.sorteio.campeao, 0)
  for (const l of vencedores) assert.equal(t.sigma.get(l), l === DONO ? undefined : SIGMA_VITORIA)
  assert.ok(!t.sigma.has(DONO))
  // Over: the chat can't rename it any more, but Luan can still take the win back.
  await dock(t, { acao: "desfazer", partida: "0-0" })
  for (const l of vencedores) if (l !== DONO) assert.equal(t.sigma.get(l), 0)
})

test("!time and !cor: only each team's first drawn, filtered names, colours not taken", async () => {
  const t = tabela()
  for (const p of pessoas(4)) await chat(t, "jogar", p.login)
  assert.equal(await chat(t, "time", "p1", { texto: "Os Brabos" }), "Nenhum time sorteado agora.")
  const [, d] = await dock(t, { acao: "sortear", formato: { tam: 2 } })
  const [a, b] = d.sorteio.times
  const outro = a.logins.find((l) => l !== a.capitao)
  assert.equal(await chat(t, "time", outro, { texto: "X" }), "Quem escolhe o nome é o primeiro sorteado de cada time.")
  assert.equal(await chat(t, "time", a.capitao, { texto: "" }), "Pra dar nome ao seu time: !time e o nome.")
  assert.equal(await chat(t, "time", a.capitao, { texto: "Os Brabos" }), `Agora o time de ${a.capitao.toUpperCase()} é “Os Brabos”.`)
  assert.equal(await chat(t, "time", a.capitao, { texto: "Bando de viado" }), "Esse nome não passou no filtro. Tenta outro.")
  assert.equal(t.item.sorteio.times[0].nome, "Os Brabos")
  assert.equal(await chat(t, "cor", b.capitao, { texto: "AZUL" }), `Azul já é do Os Brabos. Livres: ${CORES.slice(1).map((c) => c.nome).join(", ")}.`)
  assert.equal(await chat(t, "cor", b.capitao, { texto: "Verde" }), `${b.nome} agora joga de verde.`)
  assert.equal(t.item.sorteio.times[1].cor, "verde")
  assert.match(await chat(t, "cor", b.capitao, { texto: "dourado" }), /^Pra escolher a cor do seu time: !cor e uma destas: laranja, verde, roxo/)
  // Luan names any team from the dock.
  const [st, r] = await dock(t, { acao: "nomear", time: 1, nome: "Visitantes" })
  assert.equal(st, 200)
  assert.equal(r.sorteio.times[1].nome, "Visitantes")
})

test("the dock adds and takes people by hand", async () => {
  const t = tabela()
  await dock(t, { acao: "adicionar", login: "@Zeca", nome: "Zeca" })
  assert.deepEqual(t.item.inscritos.map((i) => [i.login, i.nome]), [["zeca", "Zeca"]])
  assert.equal((await dock(t, { acao: "adicionar", login: DONO }))[0], 400)
  await dock(t, { acao: "tirar", login: "zeca" })
  assert.equal(t.item.inscritos.length, 0)
  assert.equal((await dock(t, { acao: "explodir" }))[0], 400)
})

test("mudar gives up after too many clashes rather than looping", async () => {
  const t = tabela()
  t.gravar = async () => false
  await assert.rejects(mudar(t, (e) => ({ estado: { ...e, inscritos: [{ login: "a" }] } })), /muitas escritas/)
})
