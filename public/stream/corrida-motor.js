// The marble race's engine (Lucca's idea, lucca_3098; Luan's rules, 2026-11-17), in 3D since 2026-11-17 (Luan: "a grande
// graça do Marbles run é o fato de ser 3D e todas as confusões que podem acontecer nos diferentes mapas"): one marble
// for each viewer in the chat runs down a course of obstacles, and the order they cross the line is the race. No DOM:
// the overlay (corrida.html) draws it with three.js, the site replays it, and Node runs it in the Σ API and the tests
// (scripts/corrida-motor.test.mjs). Plain script, no build: sets Corrida on the page (window) or the context it runs in.
//
// Deterministic: a race is only its seed and how many run, so the same two numbers give the same race anywhere. Fixed
// steps of 1/120 s, randomness only from the seeded generator, and only + − × ÷ and sqrt in the physics (the turning
// obstacles use the duel's own sine, a polynomial), which every JavaScript engine computes alike. Nobody is stronger:
// the start's slots are drawn from the seed, and the course does the rest.
//
// The world: x runs along the course (it only goes forwards and down), y is up, z across. The marbles are spheres; the
// course is boxes (floors, walls, gates, the turning arms of a mill, the pushers on a bridge) and capsules (pegs,
// bumpers), each module built from the seed: the start's gate, ramps, a field of pegs, mills, a funnel, steps, a bridge
// with no rails and pushers, a valley with bumpers, a jump. A marble that falls off waits a moment and drops back in at
// the start of the module it fell from; one stuck gets a nudge, so every race ends. A change to the numbers or the
// rules is a new VERSAO, so a race recorded before still says which rules it ran under.

;(() => {
  const VERSAO = 2
  const HZ = 120
  const DT = 1 / HZ
  const RAIO = 0.5
  const GRAVIDADE = 19
  // The air and rolling: speed lost per second, and along a surface each step touching it.
  const ARRASTO = 0.22
  const ATRITO = 0.0008
  const VELOCIDADE_MAX = 16
  const QUIQUE = 0.25
  const QUIQUE_BOLAS = 0.55
  // Below this speed into a surface, no bounce (a marble resting on the floor doesn't jitter).
  const QUIQUE_MIN = 0.6
  // The start's gate stays this long (the overlay's countdown), so the pack settles against it and leaves together.
  const PORTAO = 3 * HZ
  // Fallen off: this long out of the race before dropping back in.
  const ESPERA = Math.round(1.2 * HZ)
  // Barely moving for this long: a nudge (a jam in the funnel, a dip before a jump).
  const PARADO = Math.round(1.5 * HZ)
  // The race: about 45 s for the leaders. Once the first crosses, the rest have FECHA to; whoever hasn't by then (or by
  // the limit) is placed by how far they got.
  const LIMITE = 110 * HZ
  const FECHA = 30 * HZ
  // Past the line by this much, a marble leaves the course (the overlay fades it out).
  const SAIDA = 14
  // Broadphase: the course's pieces by slices of x this wide.
  const FATIA = 3
  const TAU = 6.283185307179586

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

  // The duel's sine: a Taylor polynomial after folding into [−π/2, π/2], the same in every engine (Math.sin isn't).
  function seno(x) {
    x -= TAU * Math.round(x / TAU)
    if (x > TAU / 4) x = TAU / 2 - x
    else if (x < -TAU / 4) x = -TAU / 2 - x
    const x2 = x * x
    return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800 + x2 * (1 / 6227020800 + x2 * (-1 / 1307674368000))))))))
  }
  const cosseno = (x) => seno(x + TAU / 4)

  // --- The course ---------------------------------------------------------------------------------------------------

  const norma = (x, y, z) => Math.sqrt(x * x + y * y + z * z)

  /**
   * A box: its centre, its axes (u along it, v up from it, w across), half its size along each, and its role for the
   * overlay (piso, parede, portao, braco, empurrador). u from a direction, v from a hint of up.
   */
  function caixa(papel, cx, cy, cz, dx, dy, dz, ux, uy, uz, hx, hy, hz, quique = QUIQUE) {
    const n = norma(dx, dy, dz)
    dx /= n
    dy /= n
    dz /= n
    // w = d × up, v = w × d
    let wx = dy * uz - dz * uy
    let wy = dz * ux - dx * uz
    let wz = dx * uy - dy * ux
    const m = norma(wx, wy, wz)
    wx /= m
    wy /= m
    wz /= m
    const vx = wy * dz - wz * dy
    const vy = wz * dx - wx * dz
    const vz = wx * dy - wy * dx
    return { t: "caixa", papel, cx, cy, cz, ux: dx, uy: dy, uz: dz, vx, vy, vz, wx, wy, wz, hx, hy, hz, quique, svx: 0, svy: 0, svz: 0 }
  }

  /** A capsule standing from a to b (pegs and bumpers). */
  function capsula(papel, ax, ay, az, bx, by, bz, r, quique) {
    return { t: "capsula", papel, ax, ay, az, bx, by, bz, r, quique }
  }

  /**
   * The course for a seed: its pieces, its modules (each with where a fallen marble drops back in and how low it may
   * go), the start's slots, the finish line. The course goes forwards: each module starts where the one before ended.
   */
  function pista(semente, quantos) {
    const sorte = gerador(semente ^ 0x9e3779b9)
    const entre = (a, b) => a + (b - a) * sorte()
    const pecas = []
    const modulos = []
    let x = 0
    let y = 0
    let largura = 0

    // A floor from (x0, y0) to (x1, y1) along the course's middle (z), its top surface through them, and its walls.
    // Narrower than the floor before: walls slanting in over its end, or the ones by the sides hit the new walls' ends
    // head on and stay there.
    function estreitar(larg) {
      if (largura <= larg + 0.2) return
      for (const lado of [-1, 1]) {
        const de = lado * (largura / 2 + 0.15)
        const ate = lado * (larg / 2 + 0.15)
        const comprimento = 2.6
        const len = Math.sqrt(comprimento * comprimento + (ate - de) * (ate - de))
        pecas.push(caixa("parede", x - comprimento / 2, y + 0.6, (de + ate) / 2, comprimento, 0, ate - de, 0, 1, 0, len / 2, 1.05, 0.15))
      }
    }

    function piso(x0, y0, x1, y1, larg, { z = 0, paredes = 1.1, rolar = 0 } = {}) {
      if (paredes && x0 === x) estreitar(larg)
      const dx = x1 - x0
      const dy = y1 - y0
      const len = Math.sqrt(dx * dx + dy * dy)
      // Up: perpendicular to the slope, leaned across by `rolar` (a valley's sides).
      const ux = -dy / len
      const uy = dx / len
      const f = caixa("piso", 0, 0, 0, dx, dy, 0, ux, uy, rolar, len / 2 + 0.08, 0.3, larg / 2)
      f.cx = (x0 + x1) / 2 - f.vx * 0.3
      f.cy = (y0 + y1) / 2 - f.vy * 0.3
      f.cz = z - f.vz * 0.3
      pecas.push(f)
      if (paredes) {
        for (const lado of [-1, 1]) {
          const p = caixa("parede", 0, 0, 0, dx, dy, 0, ux, uy, 0, len / 2 + 0.08, paredes / 2 + 0.3, 0.15)
          p.cx = (x0 + x1) / 2 + p.vx * (paredes / 2 - 0.3)
          p.cy = (y0 + y1) / 2 + p.vy * (paredes / 2 - 0.3)
          p.cz = z + lado * (larg / 2 + 0.15)
          pecas.push(p)
        }
      }
      return f
    }
    const modulo = (tipo, fn) => {
      const inicio = { x, y, largura }
      const de = pecas.length
      fn()
      const minimo = Math.min(inicio.y, y)
      modulos.push({ tipo, x0: inicio.x, x1: x, y0: inicio.y, y1: y, volta: { x: inicio.x + 1.2, y: inicio.y + 1.4 }, chao: minimo, largura: inicio.largura || largura, de, ate: pecas.length })
      for (let k = de; k < pecas.length; k++) pecas[k].mod = modulos.length - 1
    }
    const rampa = (comprimento, inclinacao, larg, opcoes) => {
      const f = piso(x, y, x + comprimento, y - comprimento * inclinacao, larg, opcoes)
      x += comprimento
      y -= comprimento * inclinacao
      largura = larg
      return f
    }

    // The start: a pen on a gentle slope, the marbles in rows, a gate across its front that drops after a moment.
    const colunas = Math.max(4, Math.min(8, Math.ceil(Math.sqrt(quantos * 1.6))))
    const filas = Math.ceil(quantos / colunas)
    const vagas = []
    modulo("largada", () => {
      const larg = colunas * 1.15 + 0.8
      const comprimento = filas * 1.15 + 1.6
      const x0 = x
      const y0 = y
      rampa(comprimento, 0.08, larg, { paredes: 1.6 })
      // The back wall.
      pecas.push(caixa("parede", x0 - 0.15, y0 + 0.5, 0, 0, 1, 0, -1, 0, 0, 0.8 + 0.3, 0.15, larg / 2))
      const portao = caixa("portao", x + 0.15, y + 0.75, 0, 0, 1, 0, -1, 0, 0, 0.75, 0.15, larg / 2 + 0.3)
      portao.ate = PORTAO
      pecas.push(portao)
      for (let f = 0; f < filas; f++) {
        for (let c = 0; c < colunas && vagas.length < quantos; c++) {
          const vx = x - 0.9 - f * 1.15
          vagas.push({ x: vx, y: y0 - (vx - x0) * 0.08 + RAIO + 0.05, z: (c - (colunas - 1) / 2) * 1.15 })
        }
      }
      // A steep drop to spread the pack.
      rampa(entre(6, 8), 0.42, larg + 1, { paredes: 1.4 })
    })

    const TIPOS = [
      ["rampa", 2],
      ["pinos", 3],
      ["moinho", 3],
      ["funil", 1.5],
      ["degraus", 2],
      ["ponte", 1.8],
      ["vale", 2],
      ["salto", 1.5],
    ]
    const total = TIPOS.reduce((s, [, p]) => s + p, 0)
    let anterior = ""
    const MODULOS = 11
    for (let n = 0; n < MODULOS; n++) {
      let escolha = sorte() * total
      let tipo = TIPOS.find(([, p]) => (escolha -= p) < 0)[0]
      if (tipo === anterior) tipo = tipo === "rampa" ? "pinos" : "rampa"
      anterior = tipo
      modulo(tipo, () => {
        if (tipo === "rampa") {
          rampa(entre(9, 14), entre(0.14, 0.26), entre(6, 8.5))
        } else if (tipo === "pinos") {
          // A field of pegs on a wide board: each marble bounces its own way through.
          const larg = entre(9, 11)
          const comprimento = entre(14, 18)
          const inclinacao = entre(0.3, 0.38)
          const x0 = x
          const y0 = y
          rampa(comprimento, inclinacao, larg)
          const passo = entre(2.2, 2.5)
          for (let f = 0, px = x0 + 2; px < x0 + comprimento - 1.5; f++, px += passo * 0.86) {
            // Never closer to a wall than a marble can pass, or one wedges between them.
            for (let pz = -larg / 2 + 1.45 + (f % 2) * (passo / 2); pz <= larg / 2 - 1.45; pz += passo) {
              const chao = y0 - (px - x0) * inclinacao
              pecas.push(capsula("pino", px, chao - 0.2, pz, px, chao + 1.1, pz, 0.17, 0.55))
            }
          }
        } else if (tipo === "moinho") {
          // Arms turning over the floor: they sweep marbles forwards, back, into the walls.
          const larg = entre(7.5, 9)
          const comprimento = entre(13, 17)
          const inclinacao = entre(0.2, 0.26)
          const x0 = x
          const y0 = y
          const f = rampa(comprimento, inclinacao, larg)
          const n = 1 + Math.floor(sorte() * 2)
          for (let k = 0; k < n; k++) {
            const px = x0 + comprimento * ((k + 0.5) / n)
            const py = y0 - (px - x0) * inclinacao
            // Short of the walls by a marble and a bit, so one can slip round its tip.
            const braco = caixa("braco", px, py, 0, 1, 0, 0, 0, 1, 0, larg * 0.36, 0.45, 0.16, 0.5)
            braco.gira = { px: px + f.vx * 0.5, py: py + f.vy * 0.5, pz: 0, ex: f.vx, ey: f.vy, ax: f.ux, ay: f.uy, w: (sorte() < 0.5 ? -1 : 1) * entre(1.1, 1.9), fase: sorte() * TAU }
            pecas.push(braco)
          }
        } else if (tipo === "funil") {
          // The floor narrows to a gap a little wider than a marble, between two walls: they queue, jam, burst through.
          const larg = entre(8.5, 10)
          const comprimento = entre(7, 9)
          const inclinacao = entre(0.16, 0.22)
          const x0 = x
          const y0 = y
          rampa(comprimento, inclinacao, larg, { paredes: 1.2 })
          // Room for two abreast, barely: a queue forms, but no arch of marbles holds for good.
          const vao = entre(2.25, 2.6)
          for (const lado of [-1, 1]) {
            const za = lado * (larg / 2)
            const zb = lado * (vao / 2 + 0.15)
            const dz = zb - za
            const dx = comprimento
            const len = Math.sqrt(dx * dx + dz * dz)
            const mx = x0 + comprimento * 0.5
            const mz = (za + zb) / 2
            const my = y0 - (mx - x0) * inclinacao + 0.55
            pecas.push(caixa("parede", mx, my, mz, dx, -dx * inclinacao, dz, 0, 1, 0, len / 2, 0.85, 0.15))
          }
          largura = vao
          rampa(entre(3, 4), 0.3, vao, { paredes: 1 })
          rampa(entre(3, 5), 0.18, entre(7, 8))
        } else if (tipo === "degraus") {
          const larg = entre(7, 9)
          const n = 3 + Math.floor(sorte() * 3)
          for (let k = 0; k < n; k++) {
            rampa(entre(2.2, 3.2), entre(0.05, 0.12), larg, { paredes: 1.4 })
            y -= entre(0.8, 1.5)
          }
          rampa(entre(4, 6), 0.15, larg)
        } else if (tipo === "ponte") {
          // A narrow bridge with no rails, and pushers sliding across it: whoever is in the way goes over the edge.
          rampa(entre(4, 5), 0.2, entre(6, 7.5))
          const larg = entre(3, 3.6)
          const comprimento = entre(10, 13)
          const inclinacao = entre(0.12, 0.16)
          const x0 = x
          const y0 = y
          // The way in narrows to the bridge.
          for (const lado of [-1, 1]) {
            pecas.push(caixa("parede", x0 - 1.3, y0 + 0.5, lado * (larg / 2 + 1.4), 2.6, 0, -lado * 2.2, 0, 1, 0, 1.7, 0.8, 0.15))
          }
          largura = larg
          // A curb lower than a marble's middle: it keeps a rolling marble on, not a pushed one.
          rampa(comprimento, inclinacao, larg, { paredes: 0.42 })
          const n = 1 + Math.floor(sorte() * 2)
          for (let k = 0; k < n; k++) {
            const px = x0 + comprimento * ((k + 0.6) / (n + 0.4))
            const py = y0 - (px - x0) * inclinacao + 0.45
            const e = caixa("empurrador", px, py, 0, 1, -inclinacao, 0, 0, 1, 0, 0.7, 0.45, 0.6, 0.4)
            e.move = { cx: px, cy: py, cz: 0, dz: larg / 2 + 0.9, periodo: entre(3.6, 5), fase: sorte() }
            pecas.push(e)
          }
          rampa(entre(3, 4), 0.2, entre(6, 7.5))
        } else if (tipo === "vale") {
          // The floor dips to a gutter in the middle, sides tilted up: they swing side to side among bumpers.
          const larg = entre(8, 9.5)
          const comprimento = entre(13, 17)
          const inclinacao = entre(0.15, 0.2)
          const x0 = x
          const meia = larg / 2
          const subida = entre(0.9, 1.4)
          estreitar(larg)
          // The gutter lower than where they come in, its edges level with it: they drop in, never hit a step up.
          y -= subida
          const yv = y
          const lado = Math.sqrt(meia * meia + subida * subida)
          for (const s of [-1, 1]) {
            const f = caixa("piso", 0, 0, 0, comprimento, -comprimento * inclinacao, 0, 0, meia, -s * subida, comprimento / 2 + 0.08, 0.3, lado / 2 + 0.1)
            f.cx = x0 + comprimento / 2 - f.vx * 0.3
            f.cy = yv - (comprimento / 2) * inclinacao + subida / 2 - f.vy * 0.3
            f.cz = (s * meia) / 2 - f.vz * 0.3
            pecas.push(f)
            const p = caixa("parede", x0 + comprimento / 2, yv - (comprimento / 2) * inclinacao + subida + 0.4, s * (meia + 0.15), comprimento, -comprimento * inclinacao, 0, 0, 1, 0, comprimento / 2 + 0.08, 0.9, 0.15)
            pecas.push(p)
          }
          const n = 2 + Math.floor(sorte() * 3)
          for (let k = 0; k < n; k++) {
            const px = x0 + comprimento * ((k + 0.5 + (sorte() - 0.5) * 0.4) / n)
            // Off the gutter's line, or a marble running down it hits one dead centre and the valley holds it there.
            const pz = (sorte() < 0.5 ? -1 : 1) * entre(1.4, meia - 1.3)
            const chao = yv - (px - x0) * inclinacao + (Math.abs(pz) / meia) * subida
            pecas.push(capsula("para-choque", px, chao - 0.3, pz, px, chao + 1, pz, 0.55, 0.85))
          }
          x += comprimento
          y -= comprimento * inclinacao
          largura = larg
        } else if (tipo === "salto") {
          // A run-up, a kicker, a gap and a landing lower down: the slow ones drop in the gap and wait.
          const larg = entre(6.5, 8)
          rampa(entre(7, 9), entre(0.3, 0.36), larg)
          const x0 = x
          const y0 = y
          piso(x0, y0, x0 + 1.4, y0 + 0.35, larg)
          x += 1.4
          y += 0.35
          x += entre(1.2, 1.8)
          y -= entre(1.2, 1.8)
          // The landing: wide and walled high.
          rampa(entre(6, 8), 0.2, larg + 2, { paredes: 1.8 })
        }
      })
    }

    // The line, then a run-out into a wall where they pile up.
    let chegada = 0
    modulo("chegada", () => {
      rampa(8, 0.16, 8)
      chegada = x
      rampa(SAIDA + 6, 0.04, 9, { paredes: 1.4 })
      pecas.push(caixa("parede", x + 0.15, y + 0.8, 0, 0, 1, 0, -1, 0, 0, 1.1, 0.15, 4.8))
    })
    return { semente, pecas, modulos, vagas, chegada, fim: x }
  }

  // --- The pieces in slices of x, and the moving ones' poses ------------------------------------------------------

  function alcance(p) {
    if (p.t === "capsula") return [Math.min(p.ax, p.bx) - p.r, Math.max(p.ax, p.bx) + p.r]
    // A box's reach along x: |u.x|·hx + |v.x|·hy + |w.x|·hz, more for a turning arm's sweep or a pusher's.
    let r = Math.abs(p.ux) * p.hx + Math.abs(p.vx) * p.hy + Math.abs(p.wx) * p.hz
    if (p.gira) r = p.hx + p.hz + 0.5
    return [p.cx - r, p.cx + r]
  }

  function fatiar(p) {
    const x0 = -20
    const n = Math.ceil((p.fim - x0) / FATIA) + 2
    const fatias = Array.from({ length: n }, () => [])
    p.pecas.forEach((peca, k) => {
      const [a, b] = alcance(peca)
      const i0 = Math.max(0, Math.floor((a - RAIO - x0) / FATIA))
      const i1 = Math.min(n - 1, Math.floor((b + RAIO - x0) / FATIA))
      for (let i = i0; i <= i1; i++) fatias[i].push(k)
    })
    return { x0, fatias }
  }

  /** The moving pieces where they are at tick `tique` (and how fast their surface goes, for the bounce). */
  function mover(p, tique) {
    const t = tique * DT
    for (const peca of p.pecas) {
      if (peca.gira) {
        // Turning in the floor's plane about its up (e) through the pivot: u = a·cos + z·sin.
        const g = peca.gira
        const ang = g.fase + g.w * t
        const c = cosseno(ang)
        const s = seno(ang)
        // The floor's own across is z, so the arm's length turns from along the floor (a) to across it.
        peca.ux = g.ax * c
        peca.uy = g.ay * c
        peca.uz = s
        // v stays the floor's up; w = u × v.
        peca.vx = g.ex
        peca.vy = g.ey
        peca.vz = 0
        peca.wx = peca.uy * peca.vz - peca.uz * peca.vy
        peca.wy = peca.uz * peca.vx - peca.ux * peca.vz
        peca.wz = peca.ux * peca.vy - peca.uy * peca.vx
        peca.cx = g.px
        peca.cy = g.py
        peca.cz = g.pz
        peca.w = g.w
      } else if (peca.move) {
        // A triangle wave across the bridge: steady speed, turning at each side.
        const m = peca.move
        const fase = (t / m.periodo + m.fase) % 1
        const k = fase < 0.5 ? fase * 4 - 1 : 3 - fase * 4
        peca.cz = m.cz + k * m.dz
        peca.svz = ((fase < 0.5 ? 4 : -4) * m.dz) / m.periodo
      }
    }
  }

  // --- A race -------------------------------------------------------------------------------------------------------

  /** A race for a seed and how many run: the course, the marbles in their slots, nobody across yet. */
  function criar(semente, quantos) {
    const p = pista(semente, quantos)
    const sorte = gerador(semente ^ 0x85ebca6b)
    // The slots, shuffled by the seed.
    const ordemVagas = p.vagas.map((_, i) => i)
    for (let i = ordemVagas.length - 1; i > 0; i--) {
      const j = Math.floor(sorte() * (i + 1))
      ;[ordemVagas[i], ordemVagas[j]] = [ordemVagas[j], ordemVagas[i]]
    }
    const bolas = []
    for (let i = 0; i < quantos; i++) {
      const v = p.vagas[ordemVagas[i]]
      bolas.push({ i, x: v.x, y: v.y, z: v.z, vx: 0, vy: 0, vz: 0, chegou: null, fora: false, espera: 0, parado: 0, presa: 0, quedas: 0, modulo: 0 })
    }
    const c = { versao: VERSAO, semente, quantos, pista: p, fatias: fatiar(p), bolas, ordemX: bolas.map((b) => b.i), tique: 0, ordem: [], fim: false }
    mover(p, 0)
    return c
  }

  // The bounce off a surface: out along n by `fundo`, the speed into it turned back (less for a slow touch), a little
  // grip along it; (sx, sy, sz) is the surface's own speed.
  function quicar(b, nx, ny, nz, fundo, quique, sx, sy, sz) {
    b.x += nx * fundo
    b.y += ny * fundo
    b.z += nz * fundo
    let rx = b.vx - sx
    let ry = b.vy - sy
    let rz = b.vz - sz
    const vn = rx * nx + ry * ny + rz * nz
    if (vn < 0) {
      const e = vn > -QUIQUE_MIN ? 0 : quique
      rx -= (1 + e) * vn * nx
      ry -= (1 + e) * vn * ny
      rz -= (1 + e) * vn * nz
      const tn = rx * nx + ry * ny + rz * nz
      rx -= (rx - tn * nx) * ATRITO
      ry -= (ry - tn * ny) * ATRITO
      rz -= (rz - tn * nz) * ATRITO
    }
    b.vx = rx + sx
    b.vy = ry + sy
    b.vz = rz + sz
  }

  function contraCaixa(b, p, tique) {
    if (p.ate !== undefined && tique >= p.ate) return
    const dx = b.x - p.cx
    const dy = b.y - p.cy
    const dz = b.z - p.cz
    const lu = dx * p.ux + dy * p.uy + dz * p.uz
    const lv = dx * p.vx + dy * p.vy + dz * p.vz
    const lw = dx * p.wx + dy * p.wy + dz * p.wz
    if (lu > p.hx + RAIO || lu < -p.hx - RAIO || lv > p.hy + RAIO || lv < -p.hy - RAIO || lw > p.hz + RAIO || lw < -p.hz - RAIO) return
    const qu = lu > p.hx ? p.hx : lu < -p.hx ? -p.hx : lu
    const qv = lv > p.hy ? p.hy : lv < -p.hy ? -p.hy : lv
    const qw = lw > p.hz ? p.hz : lw < -p.hz ? -p.hz : lw
    const qx = p.cx + qu * p.ux + qv * p.vx + qw * p.wx
    const qy = p.cy + qu * p.uy + qv * p.vy + qw * p.wy
    const qz = p.cz + qu * p.uz + qv * p.vz + qw * p.wz
    let nx = b.x - qx
    let ny = b.y - qy
    let nz = b.z - qz
    const d2 = nx * nx + ny * ny + nz * nz
    if (d2 >= RAIO * RAIO) return
    let fundo
    if (d2 > 1e-12) {
      const d = Math.sqrt(d2)
      nx /= d
      ny /= d
      nz /= d
      fundo = RAIO - d
    } else {
      // The centre inside the box: out through the nearest face.
      const fu = p.hx - Math.abs(lu)
      const fv = p.hy - Math.abs(lv)
      const fw = p.hz - Math.abs(lw)
      if (fv <= fu && fv <= fw) {
        const s = lv < 0 ? -1 : 1
        nx = p.vx * s
        ny = p.vy * s
        nz = p.vz * s
        fundo = fv + RAIO
      } else if (fu <= fw) {
        const s = lu < 0 ? -1 : 1
        nx = p.ux * s
        ny = p.uy * s
        nz = p.uz * s
        fundo = fu + RAIO
      } else {
        const s = lw < 0 ? -1 : 1
        nx = p.wx * s
        ny = p.wy * s
        nz = p.wz * s
        fundo = fw + RAIO
      }
    }
    let sx = p.svx
    let sy = p.svy
    let sz = p.svz
    if (p.gira) {
      // The arm's surface speed at the contact: ω × (q − pivot). u turning from a towards z is a turn about −e.
      const g = p.gira
      const ox = -g.w * g.ex
      const oy = -g.w * g.ey
      const rx = qx - g.px
      const ry = qy - g.py
      const rz = qz - g.pz
      sx = oy * rz
      sy = -ox * rz
      sz = ox * ry - oy * rx
    }
    quicar(b, nx, ny, nz, fundo, p.quique, sx, sy, sz)
  }

  function contraCapsula(b, p) {
    const abx = p.bx - p.ax
    const aby = p.by - p.ay
    const abz = p.bz - p.az
    const l2 = abx * abx + aby * aby + abz * abz
    let t = ((b.x - p.ax) * abx + (b.y - p.ay) * aby + (b.z - p.az) * abz) / l2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    let nx = b.x - (p.ax + abx * t)
    let ny = b.y - (p.ay + aby * t)
    let nz = b.z - (p.az + abz * t)
    const d2 = nx * nx + ny * ny + nz * nz
    const r = RAIO + p.r
    if (d2 >= r * r || d2 < 1e-12) return
    const d = Math.sqrt(d2)
    nx /= d
    ny /= d
    nz /= d
    quicar(b, nx, ny, nz, r - d, p.quique, 0, 0, 0)
  }

  // Marble on marble, along x in order: each pair closer than a diameter pushed apart, the speed between them traded.
  function entreBolas(c) {
    const o = c.ordemX
    const bolas = c.bolas
    // Insertion sort: from one step to the next the order barely changes.
    for (let i = 1; i < o.length; i++) {
      const k = o[i]
      const x = bolas[k].x
      let j = i - 1
      while (j >= 0 && (bolas[o[j]].x > x || (bolas[o[j]].x === x && o[j] > k))) {
        o[j + 1] = o[j]
        j--
      }
      o[j + 1] = k
    }
    const D = RAIO * 2
    for (let i = 0; i < o.length; i++) {
      const a = bolas[o[i]]
      if (a.fora || a.espera) continue
      for (let j = i + 1; j < o.length; j++) {
        const b = bolas[o[j]]
        if (b.x - a.x >= D) break
        if (b.fora || b.espera) continue
        let nx = b.x - a.x
        let ny = b.y - a.y
        let nz = b.z - a.z
        const d2 = nx * nx + ny * ny + nz * nz
        if (d2 >= D * D) continue
        let d = Math.sqrt(d2)
        if (d < 1e-9) {
          nx = 0
          ny = 1
          nz = 0
          d = 0
        } else {
          nx /= d
          ny /= d
          nz /= d
        }
        const fundo = (D - d) / 2
        a.x -= nx * fundo
        a.y -= ny * fundo
        a.z -= nz * fundo
        b.x += nx * fundo
        b.y += ny * fundo
        b.z += nz * fundo
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz
        if (vn < 0) {
          const j2 = (-(1 + QUIQUE_BOLAS) * vn) / 2
          a.vx -= j2 * nx
          a.vy -= j2 * ny
          a.vz -= j2 * nz
          b.vx += j2 * nx
          b.vy += j2 * ny
          b.vz += j2 * nz
        }
      }
    }
  }

  /** The module a marble is over, by its x (the course only goes forwards). */
  function moduloEm(p, x, desde) {
    let m = Math.max(0, Math.min(desde, p.modulos.length - 1))
    while (m > 0 && x < p.modulos[m].x0) m--
    while (m < p.modulos.length - 1 && x >= p.modulos[m].x1) m++
    return m
  }

  /** One step of 1/120 s. */
  function passo(c) {
    if (c.fim) return
    const p = c.pista
    c.tique++
    mover(p, c.tique)
    const { x0, fatias } = c.fatias
    const perda = 1 - ARRASTO * DT
    for (const b of c.bolas) {
      if (b.fora) continue
      if (b.espera) {
        // Fallen: out of the race a moment, then back in at the start of the module it fell from.
        if (--b.espera === 0) {
          const m = p.modulos[b.modulo]
          const larg = Math.max(1, m.largura - 2)
          b.x = m.volta.x
          b.y = m.volta.y
          b.z = (((b.i * 7 + b.quedas * 3) % 5) / 4 - 0.5) * larg
          b.vx = 2
          b.vy = 0
          b.vz = 0
        }
        continue
      }
      b.vy -= GRAVIDADE * DT
      b.vx *= perda
      b.vy *= perda
      b.vz *= perda
      const v2 = b.vx * b.vx + b.vy * b.vy + b.vz * b.vz
      if (v2 > VELOCIDADE_MAX * VELOCIDADE_MAX) {
        const k = VELOCIDADE_MAX / Math.sqrt(v2)
        b.vx *= k
        b.vy *= k
        b.vz *= k
      }
      b.x += b.vx * DT
      b.y += b.vy * DT
      b.z += b.vz * DT
      const f = Math.floor((b.x - x0) / FATIA)
      const lista = fatias[f < 0 ? 0 : f >= fatias.length ? fatias.length - 1 : f]
      for (let k = 0; k < lista.length; k++) {
        const peca = p.pecas[lista[k]]
        if (peca.t === "caixa") contraCaixa(b, peca, c.tique)
        else contraCapsula(b, peca)
      }
    }
    entreBolas(c)
    for (const b of c.bolas) {
      if (b.fora || b.espera) continue
      b.modulo = moduloEm(p, b.x, b.modulo)
      // Off the course: below its module's lowest floor.
      if (b.y < p.modulos[b.modulo].chao - 5) {
        b.espera = ESPERA
        b.quedas++
        b.parado = 0
        continue
      }
      if (b.chegou === null && b.x >= p.chegada) {
        b.chegou = c.tique
        c.ordem.push(b.i)
      }
      if (b.chegou !== null && b.x > p.chegada + SAIDA - 2) b.fora = true
      // Stuck: a nudge forwards and up.
      if (b.vx * b.vx + b.vy * b.vy + b.vz * b.vz < 0.16) {
        if (++b.parado > PARADO) {
          b.vx += 3.5
          b.vy += 4
          // And to a side, so a marble stuck dead against something goes round it.
          b.vz += (b.i + b.quedas + c.tique) % 2 ? 2 : -2
          b.parado = 0
          // Still there after a few: lifted out of the jam, a little ahead.
          if (++b.presa >= 3) {
            b.y += 1.2
            b.x += 0.8
            b.presa = 0
          }
        }
      } else {
        b.parado = 0
        if (b.vx * b.vx + b.vy * b.vy + b.vz * b.vz > 4) b.presa = 0
      }
    }
    const primeiro = c.ordem.length ? c.bolas[c.ordem[0]].chegou : null
    if (c.ordem.length === c.bolas.length || c.tique >= LIMITE || (primeiro !== null && c.tique >= primeiro + FECHA)) {
      // The time's up: the rest by how far they got.
      const resto = c.bolas
        .filter((b) => b.chegou === null)
        .sort((a, b) => progresso(c, b) - progresso(c, a) || a.i - b.i)
        .map((b) => b.i)
      c.ordem.push(...resto)
      c.fim = true
    }
  }

  /** How far along a marble is (a fallen one counts from where it drops back in). */
  function progresso(c, b) {
    return b.espera ? c.pista.modulos[b.modulo].volta.x : b.x
  }

  /** A whole race at once (the API checking a result, the tests): the order they crossed and when. */
  function simular(semente, quantos) {
    const c = criar(semente, quantos)
    while (!c.fim) passo(c)
    return { ordem: c.ordem, tiques: c.tique, chegadas: c.bolas.map((b) => b.chegou), quedas: c.bolas.map((b) => b.quedas) }
  }

  const Corrida = { VERSAO, HZ, DT, RAIO, LIMITE, FECHA, SAIDA, PORTAO, ESPERA, gerador, seno, cosseno, pista, criar, passo, simular, progresso, mover }
  globalThis.Corrida = Corrida
  if (typeof module !== "undefined") module.exports = Corrida
})()
