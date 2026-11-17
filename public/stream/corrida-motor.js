// The marble race's engine (Lucca's idea, lucca_3098; Luan's rules, 2026-11-17): one marble for each viewer in the
// chat rolls down a long tube seen from the side, over ramps, steps, jumps, pegs and funnels, and the order they cross
// the line is the race. No DOM: the overlay (corrida.html) draws it with a camera that follows the leaders, and Node
// runs it in tests (scripts/corrida-motor.test.mjs). Plain script, no build: sets Corrida on the page (window) or the
// context it runs in.
//
// Deterministic: a race is only its seed and how many run, so the same two numbers give the same race anywhere (the
// site can show it again). Fixed steps of 1/120 s, randomness only from the seeded generator, and only + − × ÷ and
// sqrt in the physics, which every JavaScript engine computes alike (the track's slopes are ratios, not angles).
// Nobody is stronger: the start's slots are drawn from the seed, and luck does the rest. The tube is wide enough for
// FAIXAS marbles side by side (lanes in depth: a marble only bumps the ones in its lane, and passes the others), and on
// each stretch of the track each marble rolls a little freer or stickier, drawn from the seed too; without the two,
// marbles alike roll at the same speed in single file and the race is over at the start (measured 2026-11-17: the
// leader after 5 s won 98% of races; with them, 38% of races of 8 or more). A change to the numbers or the rules is a
// new VERSAO, so a race recorded before still says which rules it ran under.
//
// Units are the overlay's pixels at scale 1; y grows downwards, so the track goes right and down.

;(() => {
  const VERSAO = 1
  const HZ = 120
  const DT = 1 / HZ
  const RAIO = 9
  // The tube's height: the ceiling runs this far above the floor, so nobody flies out of the picture.
  const ALTURA = 150
  const GRAVIDADE = 1500
  // Rolling and the air: speed lost per second, which caps a marble's speed on each slope (≈ 450 px/s on the steep).
  const ARRASTO = 0.62
  const VELOCIDADE_MAX = 1100
  // How much a hit gives back: the track and pegs, and marble on marble.
  const QUIQUE = 0.35
  const QUIQUE_BOLAS = 0.55
  // Along the floor, a touch of grip each contact.
  const ATRITO = 0.003
  // Lanes in depth, and each stretch's luck: a marble's drag there is times 1 ± this.
  const FAIXAS = 4
  const SORTE = 0.5
  // A marble barely moving for this long gets a nudge forward (a jam in a funnel), so a race always ends.
  const PARADO = 1.4 * HZ
  // The race: about 35 s for the leaders; whoever hasn't crossed by the limit is placed by how far they got.
  const COMPRIMENTO = 8000
  const LIMITE = 70 * HZ
  // Past the line by this much, a marble leaves the tube (the overlay fades it out), so the finished never pile up
  // back over the line.
  const SAIDA = 240
  // Broadphase: the track's pieces by columns this wide.
  const COLUNA = 120

  // mulberry32: small, good enough, and the same in every engine.
  function gerador(semente) {
    let a = semente >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /**
   * The track for a seed: the floor and the ceiling as polylines, the pegs, the start and the finish line. Built from
   * sections drawn one after the other; the floor never climbs, so nobody can get stuck in a dip.
   */
  function pista(semente) {
    const sorte = gerador(semente ^ 0x9e3779b9)
    const entre = (a, b) => a + (b - a) * sorte()
    const chao = [[0, 0]]
    const teto = [[0, -ALTURA]]
    const pinos = []
    const secoes = []
    let x = 0
    let y = 0
    const ir = (dx, dy, alturaTeto = ALTURA) => {
      x += dx
      y += dy
      chao.push([x, y])
      teto.push([x, y - alturaTeto])
    }
    // The start: a gentle ramp where they wait in a heap, then a steep drop to spread them out.
    ir(300, 300 * 0.06)
    ir(220, 220 * 0.32)
    secoes.push({ tipo: "largada", ate: x })
    const TIPOS = [
      ["rampa", 3],
      ["degraus", 2],
      ["salto", 2],
      ["pinos", 3],
      ["funil", 1.4],
    ]
    const total = TIPOS.reduce((s, [, p]) => s + p, 0)
    let anterior = ""
    while (x < COMPRIMENTO) {
      let escolha = sorte() * total
      let tipo = TIPOS.find(([, p]) => (escolha -= p) < 0)[0]
      if (tipo === anterior && tipo !== "rampa") tipo = "rampa"
      anterior = tipo
      const inicio = x
      if (tipo === "rampa") {
        ir(entre(320, 620), 0)
        chao[chao.length - 1][1] = y = chao[chao.length - 2][1] + (x - chao[chao.length - 2][0]) * entre(0.1, 0.26)
        teto[teto.length - 1][1] = y - ALTURA
      } else if (tipo === "degraus") {
        const n = 3 + Math.floor(sorte() * 3)
        for (let i = 0; i < n; i++) {
          ir(entre(70, 120), entre(4, 10))
          ir(0, entre(28, 56))
        }
        ir(entre(120, 200), entre(14, 30))
      } else if (tipo === "salto") {
        // A run-up, a lip, and a long way down: the fast fly, the slow tumble down the face.
        ir(entre(260, 360), entre(50, 80))
        ir(entre(40, 60), 2)
        ir(0, 12)
        const queda = entre(70, 110)
        ir(entre(150, 230), queda)
        ir(entre(120, 180), entre(10, 24))
      } else if (tipo === "pinos") {
        // A lip throws them into a field of pegs over the ramp: whoever flies hits them, whoever rolls goes under.
        ir(entre(50, 80), 4)
        ir(0, entre(22, 36))
        const comprimento = entre(420, 640)
        const inclinacao = entre(0.12, 0.2)
        const x0 = x
        const y0 = y
        ir(comprimento, comprimento * inclinacao)
        const n = 5 + Math.floor(sorte() * 5)
        for (let i = 0; i < n; i++) {
          const px = x0 + comprimento * (0.06 + 0.86 * ((i + sorte() * 0.7) / n))
          const chaoAli = y0 + (px - x0) * inclinacao
          // Never low enough to stop one rolling (its top is a diameter up): pegs that dip into the floor would make
          // a dip in front of them, where a slow marble stays.
          pinos.push({ x: px, y: chaoAli - entre(RAIO * 2 + 14, ALTURA - 26), r: 7 })
        }
      } else if (tipo === "funil") {
        // The ceiling comes down to a gap a little wider than two marbles, and goes back up.
        ir(entre(140, 200), entre(20, 34), ALTURA)
        ir(entre(90, 130), entre(14, 24), RAIO * 2 * 1.45)
        ir(entre(50, 80), entre(10, 16), RAIO * 2 * 1.45)
        ir(entre(90, 130), entre(16, 26), ALTURA)
      }
      secoes.push({ tipo, de: inicio, ate: x })
    }
    // The line, then a run-out into a wall where they pile up.
    const chegada = x + 40
    ir(520, 520 * 0.03)
    const fim = x
    chao.push([x, y - ALTURA])
    teto.push([x, y - ALTURA])
    return { semente, chao, teto, pinos, secoes, chegada, fim }
  }

  // The track's pieces as segments, and which columns each one touches.
  function pecas(p) {
    const segmentos = []
    for (const linha of [p.chao, p.teto]) {
      for (let i = 1; i < linha.length; i++) {
        const [ax, ay] = linha[i - 1]
        const [bx, by] = linha[i]
        if (ax === bx && ay === by) continue
        segmentos.push([ax, ay, bx, by])
      }
    }
    const colunas = []
    const marcar = (lista, item, x0, x1) => {
      for (let c = Math.floor((x0 - RAIO * 2) / COLUNA); c <= Math.floor((x1 + RAIO * 2) / COLUNA); c++) {
        if (c < 0) continue
        ;(colunas[c] ??= { segmentos: [], pinos: [] })[lista].push(item)
      }
    }
    for (const s of segmentos) marcar("segmentos", s, Math.min(s[0], s[2]), Math.max(s[0], s[2]))
    for (const pino of p.pinos) marcar("pinos", pino, pino.x - pino.r, pino.x + pino.r)
    return colunas
  }

  /** The floor's height at x (the lower one where it drops straight down). */
  function chaoEm(p, x) {
    const c = p.chao
    if (x <= c[0][0]) return c[0][1]
    for (let i = c.length - 1; i > 0; i--) {
      const [ax, ay] = c[i - 1]
      const [bx, by] = c[i]
      if (x >= ax && x <= bx) return bx === ax ? Math.max(ay, by) : ay + ((by - ay) * (x - ax)) / (bx - ax)
    }
    return c[c.length - 1][1]
  }

  /**
   * A race for `quantos` marbles. Marble i is whoever the overlay put i-th; their start slots are drawn from the seed,
   * so the order of that list gives nobody an edge.
   */
  function criar(semente, quantos) {
    const p = pista(semente)
    const sorte = gerador(semente ^ 0x85ebca6b)
    const vagas = Array.from({ length: quantos }, (_, i) => i)
    for (let i = vagas.length - 1; i > 0; i--) {
      const j = Math.floor(sorte() * (i + 1))
      ;[vagas[i], vagas[j]] = [vagas[j], vagas[i]]
    }
    // The heap at the start, one in each lane: columns back from the drop, rows up the tube.
    const porColuna = Math.floor((ALTURA - RAIO * 2) / (RAIO * 2.1))
    const sorteTrechos = gerador(semente ^ 0xc2b2ae35)
    const bolas = vagas.map((vaga, i) => {
      const naFaixa = Math.floor(vaga / FAIXAS)
      const coluna = Math.floor(naFaixa / porColuna)
      const linha = naFaixa % porColuna
      const x = 280 - coluna * RAIO * 2.15 - (linha % 2) * RAIO * 0.5
      return {
        i,
        x,
        y: chaoEm(p, x) - RAIO - linha * RAIO * 2.1,
        vx: 0,
        vy: 0,
        giro: 0,
        parado: 0,
        chegou: null,
        fora: false,
        faixa: vaga % FAIXAS,
        // Its luck on each stretch (the start's included), and the stretch it's on.
        ritmo: p.secoes.map(() => 1 + SORTE * (2 * sorteTrechos() - 1)),
        trecho: 0,
      }
    })
    return { versao: VERSAO, semente, quantos, pista: p, colunas: pecas(p), bolas, tique: 0, ordem: [], fim: false }
  }

  function contraSegmento(b, s) {
    const [ax, ay, bx, by] = s
    const dx = bx - ax
    const dy = by - ay
    const l2 = dx * dx + dy * dy
    let t = ((b.x - ax) * dx + (b.y - ay) * dy) / l2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const cx = ax + dx * t
    const cy = ay + dy * t
    let nx = b.x - cx
    let ny = b.y - cy
    const d2 = nx * nx + ny * ny
    if (d2 >= RAIO * RAIO) return
    let d = Math.sqrt(d2)
    if (d < 1e-6) {
      // Right on the line: out along its normal, the side the marble came from.
      const l = Math.sqrt(l2)
      nx = -dy / l
      ny = dx / l
      d = 0
    } else {
      nx /= d
      ny /= d
    }
    empurrar(b, nx, ny, RAIO - d, QUIQUE)
  }

  function contraPino(b, pino) {
    let nx = b.x - pino.x
    let ny = b.y - pino.y
    const alcance = RAIO + pino.r
    const d2 = nx * nx + ny * ny
    if (d2 >= alcance * alcance || d2 < 1e-9) return
    const d = Math.sqrt(d2)
    nx /= d
    ny /= d
    empurrar(b, nx, ny, alcance - d, QUIQUE)
  }

  function empurrar(b, nx, ny, sobra, quique) {
    b.x += nx * sobra
    b.y += ny * sobra
    const vn = b.vx * nx + b.vy * ny
    if (vn >= 0) return
    const tx = b.vx - vn * nx
    const ty = b.vy - vn * ny
    const devolve = -vn * quique
    b.vx = tx * (1 - ATRITO) + nx * devolve
    b.vy = ty * (1 - ATRITO) + ny * devolve
  }

  function entreBolas(bolas) {
    // Sweep along x: only neighbours closer than a diameter can touch.
    const ordem = bolas.slice().sort((a, b) => a.x - b.x || a.i - b.i)
    const D = RAIO * 2
    for (let i = 0; i < ordem.length; i++) {
      const a = ordem[i]
      for (let j = i + 1; j < ordem.length; j++) {
        const b = ordem[j]
        if (b.x - a.x >= D) break
        if (a.faixa !== b.faixa) continue
        let nx = b.x - a.x
        let ny = b.y - a.y
        const d2 = nx * nx + ny * ny
        if (d2 >= D * D) continue
        let d = Math.sqrt(d2)
        if (d < 1e-6) {
          nx = 1
          ny = 0
          d = 0
        } else {
          nx /= d
          ny /= d
        }
        const sobra = (D - d) / 2
        a.x -= nx * sobra
        a.y -= ny * sobra
        b.x += nx * sobra
        b.y += ny * sobra
        const vr = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
        if (vr < 0) {
          const j2 = (-(1 + QUIQUE_BOLAS) * vr) / 2
          a.vx -= j2 * nx
          a.vy -= j2 * ny
          b.vx += j2 * nx
          b.vy += j2 * ny
        }
      }
    }
  }

  /** One step of 1/120 s. */
  function passo(c) {
    if (c.fim) return c
    const p = c.pista
    const dentro = c.bolas.filter((b) => !b.fora)
    for (const b of dentro) {
      while (b.trecho < p.secoes.length - 1 && b.x > p.secoes[b.trecho].ate) b.trecho++
      const perde = 1 - ARRASTO * b.ritmo[b.trecho] * DT
      b.vy += GRAVIDADE * DT
      b.vx *= perde
      b.vy *= perde
      const v2 = b.vx * b.vx + b.vy * b.vy
      if (v2 > VELOCIDADE_MAX * VELOCIDADE_MAX) {
        const k = VELOCIDADE_MAX / Math.sqrt(v2)
        b.vx *= k
        b.vy *= k
      }
      b.x += b.vx * DT
      b.y += b.vy * DT
    }
    entreBolas(dentro)
    // Twice against the track, so a marble pushed by another into the floor ends up on it.
    for (let volta = 0; volta < 2; volta++) {
      for (const b of dentro) {
        const coluna = c.colunas[Math.floor(b.x / COLUNA)]
        if (!coluna) continue
        for (const s of coluna.segmentos) contraSegmento(b, s)
        for (const pino of coluna.pinos) contraPino(b, pino)
      }
    }
    c.tique++
    for (const b of dentro) {
      b.giro += (b.vx * DT) / RAIO
      // Through the floor somehow (a squeeze in a pile): back on top of it.
      const chao = chaoEm(p, b.x)
      if (b.y > chao + RAIO * 3) {
        b.y = chao - RAIO
        b.vy = 0
      }
      if (b.x < RAIO) {
        b.x = RAIO
        if (b.vx < 0) b.vx = 0
      }
      if (b.chegou !== null && b.x >= p.chegada + SAIDA) b.fora = true
      if (b.chegou === null) {
        if (b.x >= p.chegada) {
          b.chegou = c.tique
          c.ordem.push(b.i)
        } else if (b.vx * b.vx + b.vy * b.vy < 20 * 20) {
          if (++b.parado > PARADO) {
            b.vx += 220
            b.vy -= 420
            b.parado = 0
          }
        } else b.parado = 0
      }
    }
    if (c.ordem.length === c.bolas.length || c.tique >= LIMITE) {
      // Whoever didn't cross, by how far they got.
      const faltam = c.bolas.filter((b) => b.chegou === null).sort((a, b) => b.x - a.x || a.i - b.i)
      for (const b of faltam) c.ordem.push(b.i)
      c.fim = true
    }
    return c
  }

  /** A whole race at once: the order they crossed (marble indices) and how many steps it took. */
  function simular(semente, quantos) {
    const c = criar(semente, quantos)
    while (!c.fim) passo(c)
    return { ordem: c.ordem, tiques: c.tique, chegadas: c.bolas.map((b) => b.chegou) }
  }

  const Corrida = { VERSAO, HZ, DT, RAIO, ALTURA, FAIXAS, LIMITE, SAIDA, pista, chaoEm, criar, passo, simular }
  ;(typeof window !== "undefined" ? window : globalThis).Corrida = Corrida
})()
