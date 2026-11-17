// The ball duel's balance (public/stream/duelo-motor.js): thousands of fights between every pair of classes, on
// every core, to see how often each class wins and how long fights last, and to tune each class's `forca` until
// every class wins about half its fights (47–53%) and the median fight lasts about 40 s. Pairings: no worse than
// 30–70% (ten classes with real abilities make a few counters, flagged "!" outside 35–65%; the class's own numbers
// fix those, as the Adaga's and the Arco's flatter growth did, not forca). What counts for a viewer is the class's
// whole rate: the other side is drawn. CPU-heavy for a couple of minutes: never while Luan is live.
//
//   node scripts/duelo-balanco.mjs              the matchups with the engine's numbers as they are
//   node scripts/duelo-balanco.mjs --ajustar    tune `forca` first (prints the new numbers to put in CLASSES)
//   --lutas N   fights per ordered pair (400; sides swap on the same seeds, so spawn luck cancels out)
//   --alvo S    the median length to aim for (40)

import { createRequire } from "node:module"
import { cpus } from "node:os"
import { Worker, isMainThread, parentPort } from "node:worker_threads"

// Loaded as a plain script in this realm (it sets globalThis.Duelo): in a vm context of its own it runs ~7× slower.
function carregar() {
  createRequire(import.meta.url)("../public/stream/duelo-motor.js")
  return globalThis.Duelo
}

if (!isMainThread) {
  const Duelo = carregar()
  parentPort.on("message", ({ tarefas, ajustes }) => {
    const resultados = tarefas.map(([semente, a, b]) => {
      const l = Duelo.simular(semente, a, b, ajustes)
      const m = l.metricas
      return {
        a, b,
        vencedor: l.fim.vencedor,
        motivo: l.fim.motivo,
        t: l.fim.t,
        aparadas: m.aparadas,
        acertos: m.acertos[0] + m.acertos[1],
        primeiro: m.primeiro,
        viradas: m.viradas,
        meio: m.meio,
      }
    })
    parentPort.postMessage(resultados)
  })
} else {
  const args = process.argv.slice(2)
  const valor = (nome, padrao) => (args.includes(nome) ? Number(args[args.indexOf(nome) + 1]) : padrao)
  const LUTAS = valor("--lutas", 400)
  const ALVO = valor("--alvo", 40)
  const Duelo = carregar()
  const IDS = Duelo.IDS

  const trabalhadores = Array.from({ length: Math.max(1, cpus().length) }, () => new Worker(new URL(import.meta.url)))
  const rodar = (tarefas, ajustes) => {
    const fatias = trabalhadores.map((_, i) => tarefas.filter((_, j) => j % trabalhadores.length === i))
    return Promise.all(
      trabalhadores.map(
        (w, i) =>
          new Promise((ok) => {
            w.once("message", ok)
            w.postMessage({ tarefas: fatias[i], ajustes })
          }),
      ),
    ).then((partes) => partes.flat())
  }

  // Every ordered pair (a on the left, b on the right) on the same seeds, so each pairing is played from both sides.
  const tarefas = (n) => {
    const lista = []
    for (const a of IDS) for (const b of IDS) for (let s = 0; s < n; s++) lista.push([0x51ed + s * 2654435761 >>> 0, a, b])
    return lista
  }

  const mediana = (xs) => [...xs].sort((x, y) => x - y)[xs.length >> 1]
  function resumir(res) {
    const vitorias = Object.fromEntries(IDS.map((id) => [id, [0, 0]]))
    const par = {}
    for (const r of res) {
      if (r.a === r.b) continue
      const vencedor = r.vencedor === 0 ? r.a : r.b
      vitorias[r.a][1]++
      vitorias[r.b][1]++
      vitorias[vencedor][0]++
      const chave = [r.a, r.b].sort().join("×")
      par[chave] ??= { [r.a]: 0, [r.b]: 0, n: 0 }
      par[chave][vencedor]++
      par[chave].n++
    }
    const espelho = res.filter((r) => r.a === r.b)
    const lutas = res.filter((r) => r.a !== r.b)
    const comPrimeiro = lutas.filter((r) => r.primeiro !== null)
    const atras = lutas.filter((r) => r.meio !== null && Math.abs(r.meio) >= 30)
    return {
      taxa: Object.fromEntries(IDS.map((id) => [id, vitorias[id][0] / vitorias[id][1]])),
      par,
      mediana: mediana(res.map((r) => r.t)),
      p10: [...res.map((r) => r.t)].sort((x, y) => x - y)[Math.floor(res.length * 0.1)],
      p90: [...res.map((r) => r.t)].sort((x, y) => x - y)[Math.floor(res.length * 0.9)],
      tempo: res.filter((r) => r.motivo !== "nocaute").length / res.length,
      aparadas: res.reduce((s, r) => s + r.aparadas, 0) / res.length,
      acertosPorSegundo: res.reduce((s, r) => s + r.acertos, 0) / res.reduce((s, r) => s + r.t, 0),
      viradas: lutas.filter((r) => r.viradas >= 1).length / lutas.length,
      primeiroVence: comPrimeiro.filter((r) => r.primeiro === r.vencedor).length / comPrimeiro.length,
      virada30: atras.filter((r) => (r.meio > 0 ? 1 : 0) === r.vencedor).length / (atras.length || 1),
      espelho: espelho.filter((r) => r.vencedor === 0).length / (espelho.length || 1),
      n: res.length,
    }
  }

  const pct = (x) => `${(x * 100).toFixed(1)}%`
  function imprimir(r, forca) {
    console.log(`\n${r.n} lutas · mediana ${r.mediana.toFixed(1)} s (10%: ${r.p10.toFixed(1)}, 90%: ${r.p90.toFixed(1)}) · no tempo ${pct(r.tempo)} · ${r.aparadas.toFixed(1)} aparadas por luta · ${r.acertosPorSegundo.toFixed(2)} acertos/s`)
    console.log(`virou ao menos uma vez ${pct(r.viradas)} · quem acerta primeiro vence ${pct(r.primeiroVence)} · 30+ atrás aos 20 s e venceu ${pct(r.virada30)} · espelho, esquerda vence ${pct(r.espelho)}`)
    console.log("\nclasse     vitórias  forca")
    for (const id of IDS) console.log(`${id.padEnd(10)} ${pct(r.taxa[id]).padStart(7)}   ${forca[id].toFixed(3)}`)
    console.log("\nconfrontos (vitórias da classe da linha)")
    console.log("".padEnd(9) + IDS.map((id) => id.slice(0, 7).padStart(8)).join(""))
    for (const a of IDS) {
      const linha = IDS.map((b) => {
        if (a === b) return "     —   "
        const p = r.par[[a, b].sort().join("×")]
        const x = p[a] / p.n
        return `${(x * 100).toFixed(0).padStart(6)}%${x < 0.3 || x > 0.7 ? "!!" : x < 0.35 || x > 0.65 ? "! " : "  "}`
      })
      console.log(a.padEnd(9) + linha.join(""))
    }
  }

  const forca = Object.fromEntries(IDS.map((id) => [id, Duelo.CLASSES[id].forca]))
  const comoAjustes = () => Object.fromEntries(IDS.map((id) => [id, { forca: forca[id] }]))

  if (args.includes("--ajustar")) {
    // Each pass: every class's forca moves against its distance from 50%, and all of them together toward the
    // median length. Few fights per pass at first, more at the end.
    // A class that kills in few hits (the Espada) flips between needing one hit more or less with a small change,
    // so the steps shrink and the answer is the average of the last passes, not the last one.
    const PASSOS = 16
    const ultimos = []
    for (let passo = 1; passo <= PASSOS; passo++) {
      const n = passo <= 5 ? 60 : passo <= 10 ? 150 : 300
      const r = resumir(await rodar(tarefas(n), comoAjustes()))
      const ritmo = Math.pow(r.mediana / ALVO, 0.6)
      const ganho = passo <= 5 ? 1.4 : passo <= 10 ? 0.9 : 0.5
      for (const id of IDS) forca[id] *= Math.exp(ganho * (0.5 - r.taxa[id])) * ritmo
      if (passo > PASSOS - 6) ultimos.push({ ...forca })
      console.log(`passo ${passo}: mediana ${r.mediana.toFixed(1)} s, ` + IDS.map((id) => `${id} ${pct(r.taxa[id])}`).join(", "))
    }
    for (const id of IDS) forca[id] = ultimos.reduce((s, f) => s + f[id], 0) / ultimos.length
  }

  const final = resumir(await rodar(tarefas(LUTAS), comoAjustes()))
  imprimir(final, forca)
  if (args.includes("--ajustar")) console.log("\nforca para CLASSES:\n" + IDS.map((id) => `  ${id}: ${forca[id].toFixed(2)}`).join("\n"))
  for (const w of trabalhadores) w.terminate()
}
